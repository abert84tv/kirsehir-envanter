-- Kırşehir Envanter — Vatandaş / muhtar başvuru sayfası (2026.10.05)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Önkoşul: oturum_sahibi, kim.
--
-- Ne ekliyor: oturum açmadan doldurulan herkese açık başvuru formu (/bildirim)
-- için tablo ve işlevler. Başvuru "takip kodu" (BSV-XXXXXX) alır; vatandaş
-- bu kodla durumunu görür. İşletme tarafında Gelen ekranında "Web başvuruları"
-- olarak listelenir, talebe aktarılır, durum değişince takip sayfası da güncellenir.
-- Kötüye kullanıma karşı: gizli alan (bot tuzağı), IP başına saatte 5,
-- telefon başına günde 5 başvuru, aynı kişinin aynı başvurusu tekrar sayılmaz,
-- kara liste (basvuru_engel).

create table if not exists vatandas_basvuru (
  id bigint generated always as identity primary key,
  takip text unique not null,
  ad text not null,
  tel text,
  sifat text not null default 'vatandas' check (sifat in ('vatandas','muhtar')),
  ilce text,
  koy text not null,
  konu text not null,
  aciklama text not null,
  lat double precision,
  lon double precision,
  kanal text not null default 'web',
  kvkk_onay boolean not null default false,
  durum text not null default 'yeni'
    check (durum in ('yeni','incelemede','arizaya','cozuldu','red','spam')),
  sonuc text,
  talep_no text,
  ip_ozet text,
  olusma timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index if not exists vatandas_basvuru_ip on vatandas_basvuru (ip_ozet, olusma);
create index if not exists vatandas_basvuru_tel on vatandas_basvuru (tel, olusma);

create table if not exists basvuru_engel (
  deger text primary key,
  neden text,
  olusma timestamptz not null default now()
);

alter table vatandas_basvuru enable row level security;
alter table basvuru_engel enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='vatandas_basvuru' and policyname='vatandas_basvuru_kapali') then
    create policy vatandas_basvuru_kapali on vatandas_basvuru for all using (false) with check (false);
    create policy basvuru_engel_kapali on basvuru_engel for all using (false) with check (false);
  end if;
end $$;

-- ── herkese açık: başvuru ekle ──
create or replace function basvuru_ekle(
  p_ad text, p_tel text, p_sifat text, p_ilce text, p_koy text, p_konu text,
  p_aciklama text, p_lat double precision, p_lon double precision,
  p_kvkk boolean, p_bal text default '')
returns text
language plpgsql security definer set search_path = public as $$
declare
  ip text; ipo text; v_tel text; kod text; n int; son text;
  alf text := 'ABCDEFGHJKLMNPRSTUVYZ23456789'; i int;
  v_ad text := trim(coalesce(p_ad,'')); v_koy text := trim(coalesce(p_koy,''));
  v_konu text := trim(coalesce(p_konu,'')); v_acik text := trim(coalesce(p_aciklama,''));
begin
  -- gizli alanı bir bot doldurur: sessizce sahte kod dönülür, kayıt yazılmaz
  if coalesce(p_bal,'') <> '' then return 'BSV-' || upper(substr(md5(random()::text),1,6)); end if;
  if not coalesce(p_kvkk,false) then raise exception 'Aydınlatma metnini onaylamadan başvuru alınamaz.'; end if;
  if length(v_ad) < 3 or length(v_ad) > 80 then raise exception 'Adınızı ve soyadınızı yazın.'; end if;
  if length(v_koy) < 2 or length(v_koy) > 80 then raise exception 'Köy ya da mahalle adını yazın.'; end if;
  if length(v_konu) < 2 or length(v_konu) > 80 then raise exception 'Konuyu seçin.'; end if;
  if length(v_acik) < 10 then raise exception 'Sorunu bir iki cümleyle anlatın.'; end if;
  if length(v_acik) > 1500 then raise exception 'Açıklama en çok 1500 karakter olabilir.'; end if;
  v_tel := regexp_replace(coalesce(p_tel,''), '[^0-9]', '', 'g');
  if v_tel <> '' and (length(v_tel) < 10 or length(v_tel) > 13) then raise exception 'Telefon numarası geçersiz.'; end if;
  if p_lat is not null and (p_lat < 38.3 or p_lat > 40.2 or p_lon is null or p_lon < 32.8 or p_lon > 35.3) then
    p_lat := null; p_lon := null;
  end if;

  begin
    ip := split_part(coalesce(nullif(current_setting('request.headers', true),'')::json ->> 'x-forwarded-for', 'yok'), ',', 1);
  exception when others then ip := 'yok'; end;
  ipo := md5('ks-basvuru|' || trim(ip));

  if exists (select 1 from basvuru_engel e where e.deger = ipo or (v_tel <> '' and e.deger = v_tel)) then
    raise exception 'Bu başvuru kabul edilemedi.';
  end if;
  select count(*) into n from vatandas_basvuru b where b.ip_ozet = ipo and b.olusma > now() - interval '1 hour';
  if n >= 5 then raise exception 'Kısa sürede çok fazla başvuru gönderildi. Lütfen biraz sonra yeniden deneyin.'; end if;
  if v_tel <> '' then
    select count(*) into n from vatandas_basvuru b where b.tel = v_tel and b.olusma > now() - interval '24 hours';
    if n >= 5 then raise exception 'Bu telefon numarasıyla bugün çok fazla başvuru yapıldı.'; end if;
  end if;
  select count(*) into n from vatandas_basvuru b where b.olusma > now() - interval '10 minutes';
  if n >= 150 then raise exception 'Sistem şu an çok yoğun. Lütfen biraz sonra yeniden deneyin.'; end if;

  -- aynı kişinin aynı başvurusu iki saat içinde tekrar gelirse yenisi açılmaz
  select b.takip into son from vatandas_basvuru b
   where b.ip_ozet = ipo and lower(b.koy) = lower(v_koy) and b.konu = v_konu and b.aciklama = v_acik
     and b.olusma > now() - interval '2 hours' limit 1;
  if son is not null then return son; end if;

  loop
    kod := 'BSV-';
    for i in 1..6 loop kod := kod || substr(alf, 1 + floor(random() * length(alf))::int, 1); end loop;
    exit when not exists (select 1 from vatandas_basvuru b where b.takip = kod);
  end loop;

  insert into vatandas_basvuru (takip, ad, tel, sifat, ilce, koy, konu, aciklama, lat, lon, kvkk_onay, ip_ozet)
  values (kod, v_ad, nullif(v_tel,''), case when p_sifat = 'muhtar' then 'muhtar' else 'vatandas' end,
          nullif(trim(coalesce(p_ilce,'')),''), v_koy, v_konu, v_acik, p_lat, p_lon, true, ipo);
  return kod;
end;
$$;

-- ── herkese açık: takip kodu ile durum ──
create or replace function basvuru_durum(p_takip text)
returns table(takip text, durum text, konu text, koy text, olusma timestamptz, guncelleme timestamptz, sonuc text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select b.takip, b.durum, b.konu, b.koy, b.olusma, b.guncelleme, b.sonuc
      from vatandas_basvuru b
     where b.takip = upper(trim(coalesce(p_takip,''))) and b.durum <> 'spam';
end;
$$;

-- ── personel: liste, durum güncelle, engelle ──
create or replace function basvuru_listesi(p_token uuid)
returns table(
  id bigint, takip text, ad text, tel text, sifat text, ilce text, koy text, konu text, aciklama text,
  lat double precision, lon double precision, durum text, sonuc text, talep_no text,
  olusma timestamptz, guncelleme timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select b.id, b.takip, b.ad, b.tel, b.sifat, b.ilce, b.koy, b.konu, b.aciklama, b.lat, b.lon,
           b.durum, b.sonuc, b.talep_no, b.olusma, b.guncelleme
      from vatandas_basvuru b
     where b.durum <> 'spam' and (b.durum = 'yeni' or b.olusma > now() - interval '90 days')
     order by (b.durum = 'yeni') desc, b.olusma desc
     limit 400;
end;
$$;

create or replace function basvuru_guncelle(p_token uuid, p_id bigint, p_durum text, p_sonuc text, p_talep_no text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı başvuruyu değiştiremez.'; end if;
  if p_durum not in ('yeni','incelemede','arizaya','cozuldu','red') then raise exception 'Geçersiz durum.'; end if;
  update vatandas_basvuru
     set durum = p_durum, sonuc = coalesce(nullif(trim(coalesce(p_sonuc,'')),''), sonuc),
         talep_no = coalesce(nullif(p_talep_no,''), talep_no), guncelleme = now()
   where id = p_id;
  return found;
end;
$$;

create or replace function basvuru_engelle(p_token uuid, p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; b vatandas_basvuru;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text not in ('yonetici','mudur','muhendis','sef') then
    raise exception 'Başvuruyu engellemek için yönetici, müdür, mühendis ya da şef olmalısınız.';
  end if;
  select * into b from vatandas_basvuru where id = p_id;
  if not found then return false; end if;
  if b.ip_ozet is not null and b.ip_ozet <> md5('ks-basvuru|yok') then
    insert into basvuru_engel (deger, neden) values (b.ip_ozet, 'başvuru ' || b.takip) on conflict do nothing;
  end if;
  if b.tel is not null then
    insert into basvuru_engel (deger, neden) values (b.tel, 'başvuru ' || b.takip) on conflict do nothing;
  end if;
  update vatandas_basvuru set durum = 'spam', guncelleme = now() where id = p_id;
  return true;
end;
$$;
