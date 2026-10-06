-- Kırşehir Envanter — İş Emri çekirdeği (2026.09.30, "büyük güncelleme" Faz 1)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Önkoşul: SQL-veri-butunlugu.sql
-- ve SQL-cop-kutusu.sql çalıştırılmış olmalı (oturum_sahibi, yazma_denetle,
-- yazabilir, kim, numara_al fonksiyonları oradan geliyor).
--
-- Ne ekliyor: "İş Emri" bugüne kadar yalnızca bir düğme adıydı — tıklanınca
-- hiçbir kayıt üretmiyordu. Bu dosya gerçek, normalize bir is_emirleri
-- tablosu ve ona ait RPC setini açıyor. Talep/arıza → iş emri → ekip+araç
-- ataması → kapanış (malzeme + ambar düşüşü + tesis geçmişi) akışının
-- omurgası budur. Ekip/personel/araç/ambar hâlâ kurum_veri JSONB deposunda
-- (çalışan koda dokunulmadı) — iş emri onlara ad/id ile referans verir,
-- veritabanı düzeyinde FK kurmaz (kuramaz, blob içindeler).

create table if not exists is_emirleri (
  id bigint generated always as identity primary key,
  no text unique not null,
  talep_id text,                                        -- kurum_veri.talep içindeki kayıt id'si (serbest metin)
  ariza_id bigint references ariza(id) on delete set null,
  tesis_id bigint references tesis(id) on delete set null,
  tur text not null check (tur in ('elektrik','su','kanal')),
  alt_sistem text,                                       -- kuyu, depo, terfi, isale, sebeke, ag, og, kolektor...
  oncelik text not null default 'Normal' check (oncelik in ('Acil','Yüksek','Normal','Düşük')),
  aciklama text,
  ekip text,                                             -- kurum_veri.ekip içindeki ekip adı
  araclar jsonb not null default '[]'::jsonb,            -- [{id, plaka, ad}]
  durum text not null default 'acik'
    check (durum in ('acik','atandi','sahada','tamamlandi','kapatildi','iptal')),
  planlanan_malzeme jsonb not null default '[]'::jsonb,  -- [{malzeme, adet, birim}]
  kullanilan_malzeme jsonb not null default '[]'::jsonb,
  toplam_saat numeric,
  acan_k bigint references kullanicilar(id),
  acildi timestamptz not null default now(),
  atayan_k bigint references kullanicilar(id),
  atandi_zaman timestamptz,
  kapatan_k bigint references kullanicilar(id),
  kapandi timestamptz,
  surum integer not null default 1
);

alter table is_emirleri enable row level security;
-- Program yalnız RPC (SECURITY DEFINER) üzerinden yazıyor/okuyor; tabloya
-- doğrudan erişim kapalı — diğer tüm tablolarla aynı kural.
drop policy if exists is_emirleri_kapali on is_emirleri;
create policy is_emirleri_kapali on is_emirleri for all using (false) with check (false);

create index if not exists is_emirleri_tesis_idx on is_emirleri (tesis_id);
create index if not exists is_emirleri_ariza_idx on is_emirleri (ariza_id);
create index if not exists is_emirleri_durum_idx on is_emirleri (durum);

-- İş emri oluşturma/atama yetkisi: Yönetici, Müdür, Mühendis, Arıza Şefi
-- (mevcut "assign" — ekip atama — yetkisiyle aynı dağılım).
create or replace function is_emri_yetkili(p_token uuid)
returns kullanicilar
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol not in ('yonetici','mudur','muhendis','sef') then
    raise exception 'İş emri oluşturma/atama yetkiniz yok.';
  end if;
  return k;
end;
$$;

create or replace function is_emri_kaydet(
  p_token uuid, p_id bigint, p_no text, p_talep_id text, p_ariza_id bigint,
  p_tesis_id bigint, p_tur text, p_alt_sistem text, p_oncelik text,
  p_aciklama text, p_ekip text, p_araclar jsonb, p_durum text,
  p_planlanan_malzeme jsonb, p_surum integer default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; yeni bigint; mevcut is_emirleri;
begin
  k := is_emri_yetkili(p_token);

  if p_id is null then
    insert into is_emirleri (no, talep_id, ariza_id, tesis_id, tur, alt_sistem,
      oncelik, aciklama, ekip, araclar, durum, planlanan_malzeme, acan_k,
      atayan_k, atandi_zaman)
    values (p_no, p_talep_id, p_ariza_id, p_tesis_id, p_tur, p_alt_sistem,
      coalesce(p_oncelik,'Normal'), p_aciklama, p_ekip, coalesce(p_araclar,'[]'::jsonb),
      coalesce(p_durum,'acik'), coalesce(p_planlanan_malzeme,'[]'::jsonb), k.id,
      case when p_ekip is not null and p_ekip <> '' then k.id else null end,
      case when p_ekip is not null and p_ekip <> '' then now() else null end)
    returning is_emirleri.id into yeni;
    perform denetim_ekle(p_token, 'is_emri', 'İş emri açıldı', p_no, p_tesis_id::text, 'program', false);
    return yeni;
  end if;

  select * into mevcut from is_emirleri where id = p_id;
  if not found then raise exception 'İş emri bulunamadı — başkası silmiş olabilir.'; end if;
  if p_surum is not null and p_surum <> mevcut.surum then
    raise exception 'Bu iş emrini siz açtıktan sonra başka biri değiştirdi. Ekranı yenileyip yeniden girin.';
  end if;

  update is_emirleri set
    tur = p_tur, alt_sistem = p_alt_sistem, oncelik = coalesce(p_oncelik, oncelik),
    aciklama = p_aciklama, ekip = p_ekip, araclar = coalesce(p_araclar, araclar),
    durum = coalesce(p_durum, durum),
    planlanan_malzeme = coalesce(p_planlanan_malzeme, planlanan_malzeme),
    atayan_k = case when p_ekip is distinct from mevcut.ekip and p_ekip is not null and p_ekip <> ''
                    then k.id else atayan_k end,
    atandi_zaman = case when p_ekip is distinct from mevcut.ekip and p_ekip is not null and p_ekip <> ''
                    then now() else atandi_zaman end,
    surum = surum + 1
  where id = p_id;
  perform denetim_ekle(p_token, 'is_emri', 'İş emri güncellendi', mevcut.no, p_tesis_id::text, 'program', false);
  return p_id;
end;
$$;

create or replace function is_emri_kapat(
  p_token uuid, p_id bigint, p_kullanilan_malzeme jsonb, p_toplam_saat numeric,
  p_gecmis_detay text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; e is_emirleri;
begin
  k := oturum_sahibi(p_token);
  if k.rol not in ('yonetici','mudur','sef') then
    raise exception 'İş emri kapatma yetkiniz yok.';
  end if;
  select * into e from is_emirleri where id = p_id;
  if not found then raise exception 'İş emri bulunamadı.'; end if;
  if e.durum = 'kapatildi' then raise exception 'Bu iş emri zaten kapatılmış.'; end if;

  update is_emirleri set
    durum = 'kapatildi',
    kullanilan_malzeme = coalesce(p_kullanilan_malzeme, kullanilan_malzeme),
    toplam_saat = coalesce(p_toplam_saat, toplam_saat),
    kapatan_k = k.id, kapandi = now(), surum = surum + 1
  where id = p_id;

  -- Tesisi olan iş emirlerinde arıza geçmişine ayrıntılı iz düşer — kuyu/depo
  -- bilgi kartında "arıza geçmişi" olarak görünsün diye (madde 11-12).
  if e.tesis_id is not null then
    insert into gecmis (tesis_id, tesis_kod, ne, detay, kim, kim_ad, nereden)
    select e.tesis_id, t.kod, 'İş emri kapatıldı — ' || e.no,
      coalesce(p_gecmis_detay, '') ||
        case when e.ekip is not null then E'\nEkip: ' || e.ekip else '' end ||
        case when jsonb_array_length(coalesce(p_kullanilan_malzeme,'[]'::jsonb)) > 0
          then E'\nMalzeme: ' || (
            select string_agg((x->>'malzeme') || ' × ' || (x->>'adet'), ', ')
            from jsonb_array_elements(p_kullanilan_malzeme) x)
          else '' end ||
        case when p_toplam_saat is not null then E'\nSüre: ' || p_toplam_saat || ' saat' else '' end,
      k.id, k.ad, 'program'
    from tesis t where t.id = e.tesis_id;
  end if;

  perform denetim_ekle(p_token, 'is_emri', 'İş emri kapatıldı', e.no, e.tesis_id::text, 'program', false);
  return true;
end;
$$;

create or replace function is_emri_listesi(p_token uuid)
returns table(
  id bigint, no text, talep_id text, ariza_id bigint, tesis_id bigint,
  tesis_kod text, ilce text, tur text, alt_sistem text, oncelik text,
  aciklama text, ekip text, araclar jsonb, durum text,
  planlanan_malzeme jsonb, kullanilan_malzeme jsonb, toplam_saat numeric,
  acan text, acildi timestamptz, atayan text, atandi_zaman timestamptz,
  kapatan text, kapandi timestamptz, surum integer
)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select e.id, e.no, e.talep_id, e.ariza_id, e.tesis_id, t.kod, t.ilce,
           e.tur, e.alt_sistem, e.oncelik, e.aciklama, e.ekip, e.araclar, e.durum,
           e.planlanan_malzeme, e.kullanilan_malzeme, e.toplam_saat,
           kim(e.acan_k), e.acildi, kim(e.atayan_k), e.atandi_zaman,
           kim(e.kapatan_k), e.kapandi, e.surum
      from is_emirleri e
      left join tesis t on t.id = e.tesis_id
     order by e.acildi desc;
end;
$$;

-- alt_sistem → ana kategori eşlemesi (madde 20: kolektör/terfi/isale hattı
-- arızası köyün arıza kaydında ayrı görünsün, ama raporlarda kuyu/depo/
-- elektrik/kanal toplamına doğru şekilde katılsın). Faz 3'teki raporlama
-- motoru bu tabloyu okuyacak; şimdilik yalnız veri hazır.
create table if not exists alt_sistem_kategori (
  alt_sistem text primary key,
  kategori text not null check (kategori in ('kuyu','depo','elektrik','kanal'))
);
-- terfi/isale/sebeke hatları bağımsız tesis türü değil (TYPES yalnız kuyu/
-- depo/ag/ges tanıyor); su dağıtım hattı oldukları için "depo" kategorisine
-- katılıyor — başka bir eşleme istenirse yalnız bu tablo güncellenir.
insert into alt_sistem_kategori (alt_sistem, kategori) values
  ('terfi', 'depo'), ('isale', 'depo'), ('sebeke', 'depo'), ('kolektor', 'kanal'),
  ('ag', 'elektrik'), ('og', 'elektrik')
on conflict (alt_sistem) do nothing;
