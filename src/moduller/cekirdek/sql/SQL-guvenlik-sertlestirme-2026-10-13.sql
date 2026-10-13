-- 2026-10-13 — Güvenlik sertleştirmesi (uygulandı: guvenlik_sertlestirme_tablolar_islevler, oturum_temizligi_indeksler)
--
-- BULGU: Supabase Auth'ta herkese açık kayıt (e-posta) AÇIK. Program Supabase Auth kullanmaz (kendi oturum jetonu var) ama
-- tablolarda "authenticated" rolüne verilmiş politikalar vardı (oku_tesis/oku_ariza/oku_foto/denetim_oku … USING true; ekipler, ambar_*,
-- araclar, talepler için ALL/true). Kayıt olan herhangi biri envanteri ve denetim izini okuyabilir, eski tablolara yazabilirdi.
-- Program tablolara doğrudan hiç erişmez (yalnız RPC + Storage), bu yüzden:
--   1) authenticated politikaları silindi (RLS açık kalır → doğrudan erişim reddedilir),
--   2) anon ve authenticated rollerinin public tablo/sıra yetkileri kaldırıldı (+ varsayılan yetkiler),
--   3) istemcinin çağırmadığı bütün işlevlerden çalıştırma yetkisi alındı (oturum_sahibi, yazma_denetle, rol_yetkisi, kim… iç yardımcılar).
-- Ayrıca Supabase panelinde Authentication › Sign In / Providers › Email › "Allow new users to sign up" kapatılmalıdır.

do $do$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
            where schemaname = 'public' and roles::text = '{authenticated}'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$do$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

do $do$
declare r record;
  izinli text[] := array[
    -- istemci (src/**/cagir) ve uç işlevlerin çağırdığı işlevler
    'ambar_hareket','ariza_ek_kaydet','ariza_ek_listesi','ariza_foto_listesi','ariza_kaydet','ariza_listesi','ariza_ses_listesi',
    'basvuru_engelle','basvuru_guncelle','basvuru_listesi','cikis','cop_listesi','cop_temizle','deneme_ekle','deneme_listesi','denetim_ekle',
    'denetim_listesi','denetim_toplu','ek_listesi','entegrasyon_kaydet','entegrasyon_listesi','foto_cop_listesi','foto_ekle','foto_geri_al',
    'foto_kalici_sil','foto_listesi','foto_sil','giris','hat_kaydet','hat_listesi','hat_sil','hesap_durum','is_emri_ek_kaydet','is_emri_ek_listesi',
    'is_emri_kapat','is_emri_kaydet','is_emri_listesi','konum_cihaz_kaydet','konum_cihaz_listesi','konum_cihaz_sil','konum_ekip_listesi',
    'konum_gonder','kullanici_ekle','kullanici_guncelle','kullanici_listesi','kullanici_sil','not_ekle','not_listesi','numara_al','numara_toplu',
    'oturum_ac','ses_ekle','sifre_degistir','sifre_sifirla','sunucu_saati','telemetri_alarm_listesi','telemetri_alarm_onayla',
    'telemetri_anahtar_yenile','telemetri_cihaz_kaydet','telemetri_cihaz_listesi','telemetri_cihaz_sil','telemetri_gecmis',
    'telemetri_kural_kaydet','telemetri_kural_listesi','telemetri_kural_sil','tesis_degisiklik_ac','tesis_degisiklik_karar',
    'tesis_degisiklik_listesi','tesis_geri_al','tesis_kalici_sil','tesis_kaydet','tesis_listesi','tesis_sil','vekalet_ata','veri_hepsi',
    'veri_hepsi_surumlu','veri_oku','veri_yaz','veri_yaz_surumlu','yerlesim_ek_ekle','yerlesim_ek_listesi','yerlesim_ek_sil','yetki_kaydet',
    'yetki_listesi',
    -- bilerek herkese açık (anahtarlı cihaz girişi ve vatandaş başvurusu)
    'konum_yaz','telemetri_yaz','basvuru_ekle','basvuru_durum'];
begin
  for r in select p.oid::regprocedure as f from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.proname <> all (izinli)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.f);
  end loop;
end
$do$;

-- Oturum temizliği: her girişte 90 günden eski oturumlar silinir, kullanıcı başına en çok 20 oturum tutulur
do $do$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'giris';
  if position('if k.sifre_ozet <> crypt(p_sifre, k.sifre_ozet) then return; end if;' in d) = 0 then raise exception 'giris gövdesi beklenenden farklı'; end if;
  d := replace(d, 'if k.sifre_ozet <> crypt(p_sifre, k.sifre_ozet) then return; end if;',
    E'if k.sifre_ozet <> crypt(p_sifre, k.sifre_ozet) then return; end if;\n  delete from oturum o where o.son_kullanim < now() - interval ''90 days'';\n  delete from oturum o where o.kullanici_id = k.id and o.token not in (select o2.token from oturum o2 where o2.kullanici_id = k.id order by o2.son_kullanim desc limit 19);');
  execute d;
end
$do$;

-- Yabancı anahtarlara indeks (32 eksik) ve yinelenen indeks
do $do$
declare r record; sira int := 0;
begin
  for r in
    select c.conrelid::regclass as tablo, a.attname as kolon, c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and array_length(c.conkey, 1) = 1 and c.connamespace = 'public'::regnamespace
       and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])
  loop
    sira := sira + 1;
    execute format('create index if not exists %I on %s (%I)', 'fk_' || left(r.conname, 50), r.tablo, r.kolon);
  end loop;
end
$do$;
drop index if exists tesis_kod_tekil;

-- Storage silme koruması (uygulandı: storage_silme_korumasi): "fotograflar" kovasında herkes (anonim dahil) dosya SİLEBİLİYORDU.
-- Artık yalnız sunucuda işaretlenmiş (foto_silinecek) dosya silinebilir: foto_kalici_sil, cop_temizle ve yüklemesi başarısız
-- olan dosya için foto_yukleme_iptal işaretler. Yükleme (INSERT) hâlâ herkese açık (programın kendi oturumu Supabase Auth değil);
-- kova 10 MB ve yalnız resim/ses türüyle sınırlı.
create table if not exists foto_silinecek (adres text primary key, eklendi timestamptz not null default now());  -- zaten vardı; yalnız referans
alter table foto_silinecek enable row level security;
create or replace function foto_silinebilir(p_ad text) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from foto_silinecek s where s.adres = p_ad) $$;
-- Storage politikaları (kova fotograflar): okuma ve yükleme açık, silme yalnız işaretli dosyaya
--   "fotograf oku"  SELECT  using (bucket_id = 'fotograflar')
--   "fotograf yaz"  INSERT  with check (bucket_id = 'fotograflar')
--   "fotograf sil"  DELETE  using (bucket_id = 'fotograflar' and foto_silinebilir(name))

-- Yükleme başarısız olursa istemci dosyayı silebilsin diye işaretleme
create or replace function foto_yukleme_iptal(p_token uuid, p_adres text) returns void language plpgsql security definer set search_path = public as
$$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı kayıt değiştiremez.'; end if;
  if coalesce(p_adres, '') <> '' then insert into foto_silinecek (adres) values (p_adres) on conflict do nothing; end if;
end
$$;

-- Tesis ekleme önerisine fotoğraf (uygulandı: tesis_onerisi_fotograf): yalnız öneriyi açan, sonuçlanmamış öneriye, en çok 6
create or replace function tesis_degisiklik_foto_ekle(p_token uuid, p_oneri_id bigint, p_adres text, p_boyut integer default null) returns integer
language plpgsql security definer set search_path = public as
$$
declare k kullanicilar; d tesis_degisiklik; say integer;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı kayıt değiştiremez.'; end if;
  select * into d from tesis_degisiklik x where x.id = p_oneri_id for update;
  if not found then raise exception 'Öneri bulunamadı.'; end if;
  if d.acan_k <> k.id then raise exception 'Öneriye yalnız onu açan fotoğraf ekler.'; end if;
  if d.durum not in ('muhendis', 'mudur') then raise exception 'Öneri sonuçlanmış; fotoğraf eklenemez.'; end if;
  if coalesce(p_adres, '') = '' then raise exception 'Fotoğraf adresi boş.'; end if;
  say := jsonb_array_length(coalesce(d.veri->'fotolar', '[]'::jsonb));
  if say >= 6 then raise exception 'Bir öneriye en çok 6 fotoğraf eklenir.'; end if;
  update tesis_degisiklik x set veri = jsonb_set(coalesce(x.veri, '{}'::jsonb), '{fotolar}',
    coalesce(x.veri->'fotolar', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('adres', p_adres, 'boyut', p_boyut))) where x.id = p_oneri_id;
  return say + 1;
end
$$;
-- Not: müdürün son onayında öneri fotoğrafları tesis kaydına işlenir (tesis_degisiklik_karar içinde). Bu dosya yalnız belgedir;
-- canlı sunucuda bu değişiklikler migration olarak uygulanmıştır.
