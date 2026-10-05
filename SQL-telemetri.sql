-- Kırşehir Envanter — Telemetri altyapısı (2026.10.05)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Önkoşul: oturum_sahibi ve kim
-- fonksiyonları (SQL-veri-butunlugu.sql). Tekrar çalıştırmak zararsızdır.
--
-- Ne ekliyor: kuyu, depo, terfi, şebeke gibi tesislere bağlı sensör / PLC /
-- veri toplayıcıdan (debi, seviye, basınç, akım, klor, pompa durumu …) gelen
-- ölçümleri kabul eden, son değeri ve geçmişi tutan, eşik kurallarından alarm
-- üreten bir altyapı. Cihaz tarafı yalnızca HTTPS POST yapar (PLC, GSM modem,
-- Node-RED, ESP32, MQTT köprüsü — hepsi yapabilir):
--
--   POST https://<proje>.supabase.co/rest/v1/rpc/telemetri_yaz
--   Başlıklar : apikey: <yayın anahtarı>   Content-Type: application/json
--   Gövde     : {"p_kod":"KUYU-12-PLC","p_anahtar":"<cihaz anahtarı>",
--                "p_olcumler":[{"kanal":"debi","deger":12.4,"birim":"l/s"},
--                              {"kanal":"seviye","deger":38.2,"birim":"m"}]}
--   (isteğe bağlı "zaman": "2026-10-05T14:30:00Z" — internetsiz kalan toplayıcı
--    biriktirdiği ölçümleri sonradan eski zaman damgasıyla gönderebilir)
--
-- Cihaz anahtarı veritabanında yalnızca özet (SHA-256) olarak durur; düz
-- hâli cihaz eklenirken ve "anahtarı yenile"de bir kez gösterilir.

create table if not exists telemetri_cihaz (
  id bigint generated always as identity primary key,
  kod text unique not null,
  ad text not null,
  tesis_id bigint references tesis(id) on delete set null,
  tur text not null default 'genel'
    check (tur in ('genel','kuyu','depo','terfi','sebeke','ges','ag')),
  protokol text not null default 'http'
    check (protokol in ('http','mqtt','modbus','diger')),
  anahtar_ozet text not null,
  beklenen_dk integer not null default 15 check (beklenen_dk between 1 and 1440),
  aktif boolean not null default true,
  son_gorulme timestamptz,
  olusma timestamptz not null default now(),
  olusturan_k bigint
);

create table if not exists telemetri_olcum (
  id bigint generated always as identity primary key,
  cihaz_id bigint not null references telemetri_cihaz(id) on delete cascade,
  kanal text not null,
  deger double precision not null,
  birim text,
  zaman timestamptz not null default now()
);
create index if not exists telemetri_olcum_cihaz_kanal on telemetri_olcum (cihaz_id, kanal, zaman desc);
create index if not exists telemetri_olcum_zaman on telemetri_olcum (zaman);

create table if not exists telemetri_son (
  cihaz_id bigint not null references telemetri_cihaz(id) on delete cascade,
  kanal text not null,
  deger double precision not null,
  birim text,
  zaman timestamptz not null,
  primary key (cihaz_id, kanal)
);

create table if not exists telemetri_kural (
  id bigint generated always as identity primary key,
  cihaz_id bigint not null references telemetri_cihaz(id) on delete cascade,
  kanal text not null,
  op text not null check (op in ('>','<','>=','<=')),
  esik double precision not null,
  onem text not null default 'uyari' check (onem in ('uyari','kritik')),
  aciklama text,
  aktif boolean not null default true,
  olusma timestamptz not null default now()
);

create table if not exists telemetri_alarm (
  id bigint generated always as identity primary key,
  kural_id bigint references telemetri_kural(id) on delete set null,
  cihaz_id bigint not null references telemetri_cihaz(id) on delete cascade,
  kanal text not null,
  deger double precision,
  esik double precision,
  op text,
  onem text not null default 'uyari',
  mesaj text,
  acildi timestamptz not null default now(),
  kapandi timestamptz,
  onay_k bigint,
  onay_zaman timestamptz,
  ariza_id bigint references ariza(id) on delete set null
);
create index if not exists telemetri_alarm_acik on telemetri_alarm (cihaz_id) where kapandi is null;

alter table telemetri_cihaz enable row level security;
alter table telemetri_olcum enable row level security;
alter table telemetri_son   enable row level security;
alter table telemetri_kural enable row level security;
alter table telemetri_alarm enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='telemetri_cihaz' and policyname='telemetri_cihaz_kapali') then
    create policy telemetri_cihaz_kapali on telemetri_cihaz for all using (false) with check (false);
    create policy telemetri_olcum_kapali on telemetri_olcum for all using (false) with check (false);
    create policy telemetri_son_kapali   on telemetri_son   for all using (false) with check (false);
    create policy telemetri_kural_kapali on telemetri_kural for all using (false) with check (false);
    create policy telemetri_alarm_kapali on telemetri_alarm for all using (false) with check (false);
  end if;
end $$;

-- ── cihaz tarafı: ölçüm yazma (oturum yok; cihaz kodu + anahtar ile) ──
create or replace function telemetri_yaz(p_kod text, p_anahtar text, p_olcumler jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c telemetri_cihaz; o jsonb; e record; dizi jsonb := '[]'::jsonb;
  kn text; v double precision; z timestamptz; bu text; n int := 0;
  r telemetri_kural; son double precision; ihlal boolean; acik bigint; dokunulan text[] := '{}';
begin
  select * into c from telemetri_cihaz where kod = p_kod and aktif;
  if not found or c.anahtar_ozet <> encode(extensions.digest(coalesce(p_anahtar,''),'sha256'),'hex') then
    raise exception 'Cihaz kodu ya da anahtarı geçersiz.';
  end if;
  if p_olcumler is null then raise exception 'Ölçüm listesi boş.'; end if;
  -- {"debi":12.4,"seviye":38} biçimi de kabul edilir
  if jsonb_typeof(p_olcumler) = 'object' then
    for e in select key, value from jsonb_each(p_olcumler) loop
      dizi := dizi || jsonb_build_array(jsonb_build_object('kanal', e.key, 'deger', e.value));
    end loop;
  elsif jsonb_typeof(p_olcumler) = 'array' then
    dizi := p_olcumler;
  else
    raise exception 'Ölçümler liste ya da nesne olmalı.';
  end if;
  if jsonb_array_length(dizi) > 500 then raise exception 'Tek istekte en çok 500 ölçüm gönderilebilir.'; end if;

  for o in select value from jsonb_array_elements(dizi) loop
    begin
      kn := left(trim(o->>'kanal'), 40);
      v := (o->>'deger')::double precision;
      continue when kn is null or kn = '' or v is null or v in ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision);
      z := coalesce((o->>'zaman')::timestamptz, now());
      if z > now() + interval '10 minutes' then z := now(); end if;
      continue when z < now() - interval '30 days';
      bu := left(o->>'birim', 12);
    exception when others then
      continue;
    end;
    insert into telemetri_olcum (cihaz_id, kanal, deger, birim, zaman) values (c.id, kn, v, bu, z);
    insert into telemetri_son (cihaz_id, kanal, deger, birim, zaman) values (c.id, kn, v, bu, z)
      on conflict (cihaz_id, kanal) do update
        set deger = excluded.deger, birim = coalesce(excluded.birim, telemetri_son.birim), zaman = excluded.zaman
        where excluded.zaman >= telemetri_son.zaman;
    if not (kn = any(dokunulan)) then dokunulan := dokunulan || kn; end if;
    n := n + 1;
  end loop;

  update telemetri_cihaz set son_gorulme = now() where id = c.id;

  -- eşik kuralları: son değere göre alarm açılır / kapanır
  for r in select * from telemetri_kural where cihaz_id = c.id and aktif and kanal = any(dokunulan) loop
    select s.deger into son from telemetri_son s where s.cihaz_id = c.id and s.kanal = r.kanal;
    continue when son is null;
    ihlal := case r.op when '>' then son > r.esik when '<' then son < r.esik
                       when '>=' then son >= r.esik else son <= r.esik end;
    select a.id into acik from telemetri_alarm a where a.kural_id = r.id and a.kapandi is null limit 1;
    if ihlal and acik is null then
      insert into telemetri_alarm (kural_id, cihaz_id, kanal, deger, esik, op, onem, mesaj)
      values (r.id, c.id, r.kanal, son, r.esik, r.op, r.onem,
              coalesce(nullif(r.aciklama,''), c.ad || ' · ' || r.kanal) || ': ' || son || ' ' || r.op || ' ' || r.esik);
    elsif not ihlal and acik is not null then
      update telemetri_alarm set kapandi = now() where id = acik;
    end if;
  end loop;

  -- 90 günden eski ölçümler seyrek olarak temizlenir
  if random() < 0.005 then delete from telemetri_olcum where zaman < now() - interval '90 days'; end if;

  return jsonb_build_object('ok', true, 'yazilan', n);
end;
$$;

-- ── program tarafı ──
create or replace function telemetri_yetki_denetle(p_token uuid)
returns kullanicilar
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text not in ('yonetici','mudur','muhendis') then
    raise exception 'Telemetri ayarını yalnızca yönetici, müdür ve mühendis değiştirir.';
  end if;
  return k;
end;
$$;

create or replace function telemetri_cihaz_listesi(p_token uuid)
returns table(
  id bigint, kod text, ad text, tesis_id bigint, tesis_kod text, ilce text, koy text,
  tur text, protokol text, beklenen_dk integer, aktif boolean, son_gorulme timestamptz,
  degerler jsonb, acik_alarm integer
)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select c.id, c.kod, c.ad, c.tesis_id, t.kod, t.ilce, t.koy, c.tur, c.protokol,
           c.beklenen_dk, c.aktif, c.son_gorulme,
           coalesce((select jsonb_agg(jsonb_build_object('kanal', s.kanal, 'deger', s.deger, 'birim', s.birim, 'zaman', s.zaman) order by s.kanal)
                       from telemetri_son s where s.cihaz_id = c.id), '[]'::jsonb),
           (select count(*)::int from telemetri_alarm a where a.cihaz_id = c.id and a.kapandi is null)
      from telemetri_cihaz c
      left join tesis t on t.id = c.tesis_id
     order by c.ad;
end;
$$;

create or replace function telemetri_cihaz_kaydet(
  p_token uuid, p_id bigint, p_kod text, p_ad text, p_tesis_id bigint,
  p_tur text, p_protokol text, p_beklenen_dk integer, p_aktif boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; anahtar text; yeni bigint;
begin
  k := telemetri_yetki_denetle(p_token);
  if coalesce(trim(p_kod),'') = '' or coalesce(trim(p_ad),'') = '' then
    raise exception 'Cihaz kodu ve adı gerekli.';
  end if;
  if p_id is null then
    anahtar := encode(extensions.gen_random_bytes(20), 'hex');
    insert into telemetri_cihaz (kod, ad, tesis_id, tur, protokol, anahtar_ozet, beklenen_dk, aktif, olusturan_k)
    values (trim(p_kod), trim(p_ad), p_tesis_id, coalesce(p_tur,'genel'), coalesce(p_protokol,'http'),
            encode(extensions.digest(anahtar,'sha256'),'hex'), coalesce(p_beklenen_dk,15), coalesce(p_aktif,true), k.id)
    returning id into yeni;
    return jsonb_build_object('id', yeni, 'anahtar', anahtar);
  end if;
  update telemetri_cihaz
     set kod = trim(p_kod), ad = trim(p_ad), tesis_id = p_tesis_id, tur = coalesce(p_tur,tur),
         protokol = coalesce(p_protokol,protokol), beklenen_dk = coalesce(p_beklenen_dk,beklenen_dk),
         aktif = coalesce(p_aktif,aktif)
   where id = p_id;
  if not found then raise exception 'Cihaz bulunamadı.'; end if;
  return jsonb_build_object('id', p_id);
exception when unique_violation then
  raise exception 'Bu cihaz kodu zaten kullanılıyor.';
end;
$$;

create or replace function telemetri_anahtar_yenile(p_token uuid, p_id bigint)
returns text
language plpgsql security definer set search_path = public as $$
declare anahtar text;
begin
  perform telemetri_yetki_denetle(p_token);
  anahtar := encode(extensions.gen_random_bytes(20), 'hex');
  update telemetri_cihaz set anahtar_ozet = encode(extensions.digest(anahtar,'sha256'),'hex') where id = p_id;
  if not found then raise exception 'Cihaz bulunamadı.'; end if;
  return anahtar;
end;
$$;

create or replace function telemetri_cihaz_sil(p_token uuid, p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform telemetri_yetki_denetle(p_token);
  delete from telemetri_cihaz where id = p_id;
  return true;
end;
$$;

create or replace function telemetri_gecmis(p_token uuid, p_cihaz_id bigint, p_kanal text, p_saat integer)
returns table(zaman timestamptz, deger double precision)
language plpgsql security definer set search_path = public as $$
declare sa int := least(greatest(coalesce(p_saat, 24), 1), 720); dk int;
begin
  perform oturum_sahibi(p_token);
  dk := greatest(1, (sa * 60) / 150);
  return query
    select date_bin(make_interval(mins => dk), o.zaman, timestamptz '2000-01-01') as z, avg(o.deger)
      from telemetri_olcum o
     where o.cihaz_id = p_cihaz_id and o.kanal = p_kanal and o.zaman > now() - make_interval(hours => sa)
     group by 1 order by 1;
end;
$$;

create or replace function telemetri_kural_listesi(p_token uuid)
returns table(id bigint, cihaz_id bigint, cihaz_ad text, kanal text, op text, esik double precision,
              onem text, aciklama text, aktif boolean)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select r.id, r.cihaz_id, c.ad, r.kanal, r.op, r.esik, r.onem, r.aciklama, r.aktif
      from telemetri_kural r join telemetri_cihaz c on c.id = r.cihaz_id
     order by c.ad, r.kanal, r.id;
end;
$$;

create or replace function telemetri_kural_kaydet(
  p_token uuid, p_id bigint, p_cihaz_id bigint, p_kanal text, p_op text,
  p_esik double precision, p_onem text, p_aciklama text, p_aktif boolean)
returns bigint
language plpgsql security definer set search_path = public as $$
declare yeni bigint;
begin
  perform telemetri_yetki_denetle(p_token);
  if coalesce(trim(p_kanal),'') = '' then raise exception 'Kanal adı gerekli.'; end if;
  if p_id is null then
    insert into telemetri_kural (cihaz_id, kanal, op, esik, onem, aciklama, aktif)
    values (p_cihaz_id, trim(p_kanal), p_op, p_esik, coalesce(p_onem,'uyari'), nullif(trim(coalesce(p_aciklama,'')),''), coalesce(p_aktif,true))
    returning id into yeni;
    return yeni;
  end if;
  update telemetri_kural
     set cihaz_id = p_cihaz_id, kanal = trim(p_kanal), op = p_op, esik = p_esik,
         onem = coalesce(p_onem,onem), aciklama = nullif(trim(coalesce(p_aciklama,'')),''), aktif = coalesce(p_aktif,aktif)
   where id = p_id;
  return p_id;
end;
$$;

create or replace function telemetri_kural_sil(p_token uuid, p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform telemetri_yetki_denetle(p_token);
  delete from telemetri_kural where id = p_id;
  return true;
end;
$$;

create or replace function telemetri_alarm_listesi(p_token uuid, p_gun integer default 7)
returns table(
  id bigint, cihaz_id bigint, cihaz_ad text, tesis_id bigint, tesis_kod text, kanal text,
  deger double precision, esik double precision, op text, onem text, mesaj text,
  acildi timestamptz, kapandi timestamptz, onay_ad text, onay_zaman timestamptz, ariza_id bigint
)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select a.id, a.cihaz_id, c.ad, c.tesis_id, t.kod, a.kanal, a.deger, a.esik, a.op, a.onem, a.mesaj,
           a.acildi, a.kapandi, kim(a.onay_k), a.onay_zaman, a.ariza_id
      from telemetri_alarm a
      join telemetri_cihaz c on c.id = a.cihaz_id
      left join tesis t on t.id = c.tesis_id
     where a.kapandi is null or a.acildi > now() - make_interval(days => least(greatest(coalesce(p_gun,7),1),90))
     order by (a.kapandi is null) desc, a.acildi desc
     limit 300;
end;
$$;

create or replace function telemetri_alarm_onayla(p_token uuid, p_id bigint, p_ariza_id bigint default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı alarmı onaylayamaz.'; end if;
  update telemetri_alarm
     set onay_k = coalesce(onay_k, k.id), onay_zaman = coalesce(onay_zaman, now()),
         ariza_id = coalesce(p_ariza_id, ariza_id)
   where id = p_id;
  return true;
end;
$$;
