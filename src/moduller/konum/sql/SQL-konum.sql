-- Ekip konumu altyapısı (2026-10-07)
--
-- İki kaynak, tek tablo:
--   * 'arvento' : araç takip sisteminden gelen konum (dış sistem konum_yaz() ile yazar ya da zamanlanmış çekici)
--   * 'tablet'  : ekibe zimmetli tablet/telefon — uygulama açıkken konum_gonder() ile oturum anahtarıyla yazar
-- Yalnız SON konum tutulur (geçmiş yok): KVKK açısından en hafif model; her cihaz için tek satır.
-- Tablolar RLS kapalı + işlevler SECURITY DEFINER (diğer modüllerle aynı desen).

create table if not exists konum_cihaz (
  id bigint generated always as identity primary key,
  ad text not null,
  tur text not null check (tur in ('arvento','tablet')),
  ekip text,                       -- kurum_veri 'ekip' içindeki ekip adı
  plaka text,
  harici_kod text,                 -- takip sistemindeki cihaz/araç kodu ('arvento'); tablette 'ekip:<ad>'
  aktif boolean not null default true,
  olusturuldu timestamptz not null default now(),
  unique (tur, harici_kod)
);
create table if not exists konum_son (
  cihaz_id bigint primary key references konum_cihaz(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  zaman timestamptz not null,
  hiz real,
  dogruluk real,
  guncelleme timestamptz not null default now()
);
alter table konum_cihaz enable row level security;
alter table konum_son enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='konum_cihaz' and policyname='konum_cihaz_kapali') then
    create policy konum_cihaz_kapali on konum_cihaz for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='konum_son' and policyname='konum_son_kapali') then
    create policy konum_son_kapali on konum_son for all using (false) with check (false);
  end if;
end $$;
revoke all on konum_cihaz, konum_son from anon, authenticated;

-- Entegrasyon anahtarları: araç takip hesabı ve dış sistemin yazma anahtarı
alter table entegrasyon drop constraint if exists entegrasyon_ad_check;
alter table entegrasyon add constraint entegrasyon_ad_check
  check (ad = any (array['anthropic_api_anahtari','gemini_api_anahtari','telegram_bot_anahtari','telegram_uyari_sohbet',
                         'arvento_kullanici','arvento_sifre','konum_yazma_anahtari']));

create or replace function entegrasyon_kaydet(p_token uuid, p_ad text, p_deger text)
returns boolean language plpgsql security definer set search_path = public as $$
declare k kullanicilar; d text := trim(coalesce(p_deger,''));
begin
  k := oturum_sahibi(p_token);
  if k.rol::text <> 'yonetici' then
    raise exception 'Entegrasyon anahtarını yalnızca yönetici değiştirir.';
  end if;
  if p_ad not in ('anthropic_api_anahtari','gemini_api_anahtari','telegram_bot_anahtari','arvento_kullanici','arvento_sifre','konum_yazma_anahtari') then
    raise exception 'Bilinmeyen entegrasyon.';
  end if;
  if d = '' then
    delete from entegrasyon where ad = p_ad;
    return true;
  end if;
  if p_ad = 'anthropic_api_anahtari' and (d !~ '^sk-ant-' or length(d) < 30) then
    raise exception 'Bu bir Anthropic API anahtarına benzemiyor (sk-ant- ile başlamalı).';
  end if;
  if p_ad = 'gemini_api_anahtari' and (d !~ '^AIza' or length(d) < 30) then
    raise exception 'Bu bir Google Gemini anahtarına benzemiyor (AIza ile başlamalı).';
  end if;
  if p_ad = 'telegram_bot_anahtari' and d !~ '^[0-9]{6,}:[A-Za-z0-9_-]{20,}$' then
    raise exception 'Bu bir Telegram bot anahtarına benzemiyor (123456:ABC… biçiminde).';
  end if;
  if p_ad = 'konum_yazma_anahtari' and length(d) < 16 then
    raise exception 'Konum yazma anahtarı en az 16 karakter olmalı (uzun rastgele bir metin).';
  end if;
  insert into entegrasyon (ad, deger, guncelleyen_k) values (p_ad, d, k.id)
  on conflict (ad) do update set deger = excluded.deger, guncelleme = now(), guncelleyen_k = k.id;
  return true;
end $$;

-- Cihaz listesi + son konum (oturumlu herkes okur; konum bilgisi operasyon için gerekli)
create or replace function konum_cihaz_listesi(p_token uuid)
returns table(id bigint, ad text, tur text, ekip text, plaka text, harici_kod text, aktif boolean,
              lat double precision, lon double precision, zaman timestamptz, hiz real)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select c.id, c.ad, c.tur, c.ekip, c.plaka, c.harici_kod, c.aktif, s.lat, s.lon, s.zaman, s.hiz
      from konum_cihaz c left join konum_son s on s.cihaz_id = c.id
     order by c.ekip nulls last, c.ad;
end $$;

-- Ekip başına en yeni konum (kaynağı ile): ekip seçimi ve harita bunu okur
create or replace function konum_ekip_listesi(p_token uuid)
returns table(ekip text, lat double precision, lon double precision, zaman timestamptz, tur text, plaka text)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select distinct on (c.ekip) c.ekip, s.lat, s.lon, s.zaman, c.tur, c.plaka
      from konum_cihaz c join konum_son s on s.cihaz_id = c.id
     where c.aktif and c.ekip is not null and c.ekip <> ''
     order by c.ekip, s.zaman desc;
end $$;

create or replace function konum_cihaz_kaydet(p_token uuid, p_id bigint, p_ad text, p_tur text, p_ekip text,
                                              p_plaka text, p_harici_kod text, p_aktif boolean)
returns bigint language plpgsql security definer set search_path = public as $$
declare k kullanicilar; yeni bigint;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text not in ('yonetici','mudur') then raise exception 'Konum cihazını yalnızca yönetici ve müdür düzenler.'; end if;
  if coalesce(trim(p_ad),'') = '' then raise exception 'Cihaz adı gerekli.'; end if;
  if p_tur not in ('arvento','tablet') then raise exception 'Cihaz türü arvento ya da tablet olmalı.'; end if;
  if p_id is null then
    insert into konum_cihaz (ad, tur, ekip, plaka, harici_kod, aktif)
    values (trim(p_ad), p_tur, nullif(trim(coalesce(p_ekip,'')),''), nullif(trim(coalesce(p_plaka,'')),''),
            nullif(trim(coalesce(p_harici_kod,'')),''), coalesce(p_aktif, true))
    returning konum_cihaz.id into yeni;
    return yeni;
  end if;
  update konum_cihaz set ad = trim(p_ad), tur = p_tur, ekip = nullif(trim(coalesce(p_ekip,'')),''),
         plaka = nullif(trim(coalesce(p_plaka,'')),''), harici_kod = nullif(trim(coalesce(p_harici_kod,'')),''),
         aktif = coalesce(p_aktif, aktif)
   where konum_cihaz.id = p_id;
  if not found then raise exception 'Cihaz bulunamadı.'; end if;
  return p_id;
end $$;

create or replace function konum_cihaz_sil(p_token uuid, p_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text not in ('yonetici','mudur') then raise exception 'Konum cihazını yalnızca yönetici ve müdür siler.'; end if;
  delete from konum_cihaz where konum_cihaz.id = p_id;
  return found;
end $$;

-- Zimmetli tablet/telefon: oturumdaki kullanıcının ekibine konum yazar (uygulama açıkken dakikada bir)
create or replace function konum_gonder(p_token uuid, p_lat double precision, p_lon double precision, p_dogruluk real default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare k kullanicilar; cid bigint;
begin
  k := oturum_sahibi(p_token);
  if coalesce(k.ekip,'') = '' then raise exception 'Hesabınız bir ekibe bağlı değil; konum yalnız ekip hesaplarından alınır.'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then
    raise exception 'Geçersiz konum.';
  end if;
  insert into konum_cihaz (ad, tur, ekip, harici_kod) values ('Zimmetli cihaz · ' || k.ekip, 'tablet', k.ekip, 'ekip:' || k.ekip)
  on conflict (tur, harici_kod) do update set ekip = excluded.ekip
  returning konum_cihaz.id into cid;
  insert into konum_son (cihaz_id, lat, lon, zaman, dogruluk) values (cid, p_lat, p_lon, now(), p_dogruluk)
  on conflict (cihaz_id) do update set lat = excluded.lat, lon = excluded.lon, zaman = excluded.zaman,
         dogruluk = excluded.dogruluk, guncelleme = now();
  return true;
end $$;

-- Araç takip sistemi (Arvento) ya da onun verisini ileten betik: toplu konum yazar.
-- Çağrı: POST /rest/v1/rpc/konum_yaz  {"p_anahtar":"<konum_yazma_anahtari>","p_noktalar":[{"kod":"58 ABC 123","lat":39.1,"lon":34.1,"zaman":"2026-10-07T12:00:00Z","hiz":42}]}
-- "kod": cihazın harici_kod'u ya da plakası. Eşleşmeyen satır atlanır; dönen sayı yazılan satır sayısıdır.
create or replace function konum_yaz(p_anahtar text, p_noktalar jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare dogru text; n integer := 0; x jsonb; cid bigint; z timestamptz;
begin
  select deger into dogru from entegrasyon where ad = 'konum_yazma_anahtari';
  if dogru is null or p_anahtar is distinct from dogru then raise exception 'Anahtar geçersiz.'; end if;
  if jsonb_typeof(p_noktalar) <> 'array' then raise exception 'p_noktalar bir dizi olmalı.'; end if;
  for x in select * from jsonb_array_elements(p_noktalar) loop
    select c.id into cid from konum_cihaz c
     where c.tur = 'arvento' and c.aktif and (c.harici_kod = x->>'kod' or c.plaka = x->>'kod') limit 1;
    if cid is null then continue; end if;
    if (x->>'lat') is null or (x->>'lon') is null then continue; end if;
    z := coalesce(nullif(x->>'zaman','')::timestamptz, now());
    insert into konum_son (cihaz_id, lat, lon, zaman, hiz)
    values (cid, (x->>'lat')::double precision, (x->>'lon')::double precision, z, nullif(x->>'hiz','')::real)
    on conflict (cihaz_id) do update set lat = excluded.lat, lon = excluded.lon, zaman = excluded.zaman,
           hiz = excluded.hiz, guncelleme = now()
     where konum_son.zaman <= excluded.zaman;
    n := n + 1;
  end loop;
  return n;
end $$;
