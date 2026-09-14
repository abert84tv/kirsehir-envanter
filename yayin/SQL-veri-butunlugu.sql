-- Kırşehir Envanter — veri bütünlüğü düzeltmeleri
-- İkinci denetimin dört bulgusunun karşılığı.
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zarar vermez.
-- Ön koşul: SQL-moduller-sunucu.sql çalıştırılmış olmalı.
--
-- Kural: karar tek yerde verilir, o yer sunucudur.
--   1. Çakışma denetimi — yazma, okuduğu sürümü de gönderir.
--   2. Ambar aritmetiği sunucuda — cihaz yeni bakiyeyi değil, farkı gönderir.
--   3. Numara veritabanı sırasından alınır.
--   4. Sunucu saati tek zaman referansı.

-- ══════════ 1. SÜRÜMLE OKUMA ══════════
-- Program artık veriyi sürümüyle birlikte okur: { "ekip": {"veri":[...], "surum":7}, ... }
create or replace function veri_hepsi_surumlu(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; v jsonb;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  select coalesce(jsonb_object_agg(anahtar,
           jsonb_build_object('veri', veri, 'surum', surum)), '{}'::jsonb)
    into v from kurum_veri;
  return v;
end;
$$;

-- ══════════ 2. ÇAKIŞMA DENETİMLİ YAZMA ══════════
-- p_surum: programın okuduğu sürüm. Sunucudaki sürüm bundan farklıysa yazma
-- yapılmaz; sunucudaki güncel veri sürümüyle geri döner ve program kendi
-- değişikliğini onun üstüne uygulayıp yeniden yazar. Böylece iki kişinin
-- aynı listeyi düzenlemesi kimsenin verisini silmez.
create or replace function veri_yaz_surumlu(
  p_token uuid, p_anahtar text, p_veri jsonb, p_surum bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; mevcut bigint; guncel jsonb; yeni bigint;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;

  if p_anahtar not in ('ekip', 'personel', 'nobet', 'ambar', 'arac', 'talep') then
    raise exception 'Tanımsız veri anahtarı: %', p_anahtar;
  end if;
  if p_anahtar in ('ekip', 'personel', 'nobet') and k.rol not in ('yonetici', 'mudur') then
    raise exception 'Ekip ve personel düzenini yalnızca müdür ve yönetici değiştirebilir.';
  end if;
  if p_anahtar in ('ambar', 'arac', 'talep') and k.rol = 'izleyici' then
    raise exception 'İzleyici hesabı kayıt değiştiremez.';
  end if;

  -- Satır kilitlenir: iki yazma sıraya girer, ikisi de görülür
  select surum, veri into mevcut, guncel
    from kurum_veri where anahtar = p_anahtar for update;

  if mevcut is not null and p_surum is not null and p_surum <> mevcut then
    return jsonb_build_object('ok', false, 'cakisma', true,
      'surum', mevcut, 'veri', guncel,
      'mesaj', 'Bu listeyi başkası değiştirdi.');
  end if;

  insert into kurum_veri (anahtar, veri, surum, guncelleyen, guncelleme)
  values (p_anahtar, coalesce(p_veri, '[]'::jsonb), 1, k.ad, now())
  on conflict (anahtar) do update
    set veri = coalesce(p_veri, '[]'::jsonb),
        surum = kurum_veri.surum + 1,
        guncelleyen = k.ad, guncelleme = now()
  returning surum into yeni;

  return jsonb_build_object('ok', true, 'anahtar', p_anahtar, 'surum', yeni);
end;
$$;

-- ══════════ 3. AMBAR ARİTMETİĞİ SUNUCUDA ══════════
-- Cihaz yeni bakiyeyi hesaplamaz; yapılacak hareketi gönderir. Toplama
-- çıkarma burada, satır kilidi altında yapılır — aynı anda gelen iki düşüş
-- sıraya girer, ikisi de tutar. Yetersiz bakiye reddedilir, kalanı işlenir.
--
-- p_islemler: [{ tur, malzeme, adet, birim, ambar, ekip, not, id, damga }]
--   tur: giris | cikis | zimmet | iade | sarf
create or replace function ambar_hareket(p_token uuid, p_islemler jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  k kullanicilar; a jsonb; sur bigint; i jsonb;
  tur text; mal text; amb text; ekp text; adet numeric;
  eldeS numeric; eldeZ numeric; hareket jsonb; red jsonb := '[]'::jsonb;
  yapilan integer := 0; yeni bigint;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  if k.rol = 'izleyici' then raise exception 'İzleyici hesabı ambar hareketi yapamaz.'; end if;

  select veri, surum into a, sur from kurum_veri where anahtar = 'ambar' for update;
  if a is null then
    a := jsonb_build_object('stok', '{}'::jsonb, 'zimmet', '{}'::jsonb, 'hareket', '[]'::jsonb);
  end if;
  a := jsonb_set(a, '{stok}', coalesce(a->'stok', '{}'::jsonb), true);
  a := jsonb_set(a, '{zimmet}', coalesce(a->'zimmet', '{}'::jsonb), true);
  a := jsonb_set(a, '{hareket}', coalesce(a->'hareket', '[]'::jsonb), true);

  for i in select * from jsonb_array_elements(coalesce(p_islemler, '[]'::jsonb))
  loop
    tur  := i->>'tur';
    mal  := i->>'malzeme';
    amb  := coalesce(i->>'ambar', '');
    ekp  := coalesce(i->>'ekip', '');
    adet := abs(coalesce((i->>'adet')::numeric, 0));
    if mal is null or adet = 0 then continue; end if;

    eldeS := coalesce((a #>> array['stok', amb, mal])::numeric, 0);
    eldeZ := coalesce((a #>> array['zimmet', ekp, mal])::numeric, 0);

    -- Bakiye yetmiyorsa bu hareket reddedilir, diğerleri işlenmeye devam eder
    if tur in ('cikis', 'zimmet') and adet > eldeS then
      red := red || jsonb_build_array(jsonb_build_object(
        'malzeme', mal, 'neden', 'ambar mevcudu ' || eldeS));
      continue;
    end if;
    if tur in ('iade', 'sarf') and adet > eldeZ then
      red := red || jsonb_build_array(jsonb_build_object(
        'malzeme', mal, 'neden', 'zimmette ' || eldeZ));
      continue;
    end if;

    if tur = 'giris' then
      a := jsonb_set(a, array['stok', amb], coalesce(a #> array['stok', amb], '{}'::jsonb), true);
      a := jsonb_set(a, array['stok', amb, mal], to_jsonb(eldeS + adet), true);
    elsif tur = 'cikis' then
      a := jsonb_set(a, array['stok', amb, mal], to_jsonb(eldeS - adet), true);
    elsif tur = 'zimmet' then
      a := jsonb_set(a, array['stok', amb, mal], to_jsonb(eldeS - adet), true);
      a := jsonb_set(a, array['zimmet', ekp], coalesce(a #> array['zimmet', ekp], '{}'::jsonb), true);
      a := jsonb_set(a, array['zimmet', ekp, mal], to_jsonb(eldeZ + adet), true);
    elsif tur = 'iade' then
      a := jsonb_set(a, array['zimmet', ekp, mal], to_jsonb(eldeZ - adet), true);
      a := jsonb_set(a, array['stok', amb], coalesce(a #> array['stok', amb], '{}'::jsonb), true);
      a := jsonb_set(a, array['stok', amb, mal], to_jsonb(eldeS + adet), true);
    elsif tur = 'sarf' then
      a := jsonb_set(a, array['zimmet', ekp, mal], to_jsonb(eldeZ - adet), true);
    else
      continue;
    end if;

    -- Sıfıra düşen kalem listeden çıkar, ekran temiz kalır
    if tur in ('cikis', 'zimmet') and eldeS - adet <= 0 then
      a := a #- array['stok', amb, mal];
    end if;
    if tur in ('iade', 'sarf') and eldeZ - adet <= 0 then
      a := a #- array['zimmet', ekp, mal];
    end if;

    hareket := jsonb_build_object(
      'id', coalesce(i->>'id', 'h' || extract(epoch from clock_timestamp())::bigint || yapilan),
      'damga', to_char(now() at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      'tur', tur, 'malzeme', mal, 'adet', adet,
      'birim', coalesce(i->>'birim', 'adet'),
      'ambar', amb, 'ekip', ekp, 'kim', k.ad,
      'not', coalesce(i->>'not', ''));
    a := jsonb_set(a, '{hareket}',
      (jsonb_build_array(hareket) || (a->'hareket')), true);
    yapilan := yapilan + 1;
  end loop;

  -- Hareket dökümü son 400 satırla sınırlı
  if jsonb_array_length(a->'hareket') > 400 then
    a := jsonb_set(a, '{hareket}',
      (select coalesce(jsonb_agg(x), '[]'::jsonb)
         from (select x from jsonb_array_elements(a->'hareket') x limit 400) t), true);
  end if;

  insert into kurum_veri (anahtar, veri, surum, guncelleyen, guncelleme)
  values ('ambar', a, 1, k.ad, now())
  on conflict (anahtar) do update
    set veri = a, surum = kurum_veri.surum + 1, guncelleyen = k.ad, guncelleme = now()
  returning surum into yeni;

  return jsonb_build_object('ok', true, 'yapilan', yapilan, 'red', red,
    'veri', a, 'surum', yeni);
end;
$$;

-- ══════════ 4. NUMARA SIRASI ══════════
-- Numara veritabanından alınır: iki cihaz aynı numarayı üretemez.
create table if not exists numara_sayaci (
  tur   text not null,
  yil   integer not null,
  deger integer not null default 0,
  primary key (tur, yil)
);
alter table numara_sayaci enable row level security;

create or replace function numara_al(p_token uuid, p_tur text)
returns text
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; y integer; n integer; onek text;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;

  onek := case p_tur when 'talep' then 'TLP' when 'ariza' then 'ARZ'
                     when 'isemri' then 'IEM' else null end;
  if onek is null then raise exception 'Tanımsız numara türü: %', p_tur; end if;

  y := extract(year from now())::integer;
  insert into numara_sayaci (tur, yil, deger) values (p_tur, y, 1)
  on conflict (tur, yil) do update set deger = numara_sayaci.deger + 1
  returning deger into n;

  return onek || '-' || y || '-' || lpad(n::text, 3, '0');
end;
$$;

-- Çevrimdışı verilmiş geçici numaraların toplu karşılığı
create or replace function numara_toplu(p_token uuid, p_tur text, p_adet integer)
returns text[]
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; c integer; out text[] := '{}';
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  for c in 1 .. least(greatest(coalesce(p_adet, 0), 0), 200) loop
    out := out || numara_al(p_token, p_tur);
  end loop;
  return out;
end;
$$;

-- ══════════ 5. SUNUCU SAATİ ══════════
-- Program açılışta bunu okur, cihaz saatiyle arasındaki farkı hesaplar ve
-- bütün kayıt damgalarını düzeltir. Yanlış ayarlı bir tablet süre uyumu
-- ölçümünü artık bozmaz.
create or replace function sunucu_saati()
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'iso', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'damga', to_char(now() at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
    'ms', (extract(epoch from now()) * 1000)::bigint);
$$;

-- ══════════ 6. ÇAĞRI YETKİSİ ══════════
revoke all on function veri_hepsi_surumlu(uuid) from public, anon, authenticated;
revoke all on function veri_yaz_surumlu(uuid, text, jsonb, bigint) from public, anon, authenticated;
revoke all on function ambar_hareket(uuid, jsonb) from public, anon, authenticated;
revoke all on function numara_al(uuid, text) from public, anon, authenticated;
revoke all on function numara_toplu(uuid, text, integer) from public, anon, authenticated;
revoke all on function sunucu_saati() from public, anon, authenticated;

grant execute on function veri_hepsi_surumlu(uuid) to anon, authenticated;
grant execute on function veri_yaz_surumlu(uuid, text, jsonb, bigint) to anon, authenticated;
grant execute on function ambar_hareket(uuid, jsonb) to anon, authenticated;
grant execute on function numara_al(uuid, text) to anon, authenticated;
grant execute on function numara_toplu(uuid, text, integer) to anon, authenticated;
grant execute on function sunucu_saati() to anon, authenticated;
