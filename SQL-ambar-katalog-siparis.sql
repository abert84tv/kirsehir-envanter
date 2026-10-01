-- Kırşehir Envanter — malzeme kataloğu, sipariş listesi, muhtar defteri ve
-- ambarda günlük tüketim özeti (2026.10.01)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zarar
-- vermez (create or replace). Canlı veritabanına "ambar_katalog_siparis_gunluk"
-- adlı göç olarak uygulandı. Ön koşul: SQL-ambar-hurda.sql.
--
-- Ne değişti:
--  1) kurum_veri'ye üç yeni anahtar yazılabiliyor:
--     - muhtar  : muhtar numara defteri. Program bu anahtara zaten yazıyordu
--                 ama sunucu "Tanımsız veri anahtarı" diye reddediyordu —
--                 defter hiçbir zaman sunucuya ulaşmamıştı.
--     - malzeme : malzeme kataloğu [{ kod, ad, kat, birim, fiyat, esik, pasif }]
--                 Yalnız yönetici, müdür, mühendis ve şef değiştirebilir.
--     - siparis : ortak sipariş listesi [{ id, malzeme, adet, birim, ekleyen, damga }]
--  2) ambar_hareket her hareketi "gun" altında gün gün toplar:
--     gun: { "YYYY-MM-DD": { "<malzeme>": net ambar çıkışı } }
--     net çıkış = zimmet + çıkış − iade (sarf/hurda ambarı etkilemez).
--     Ambar ekranındaki "kaç gün yeter" son 30 günün bu özetinden hesaplanır.
--     400 satırlık hareket listesi günde 50+ işte bir haftayı ancak tutar;
--     özet 60 gün saklanır, daha eskisi atılır.

create or replace function public.veri_yaz(p_token uuid, p_anahtar text, p_veri jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare k kullanicilar; s bigint;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  if p_anahtar not in ('ekip', 'personel', 'nobet', 'ambar', 'arac', 'talep', 'muhtar', 'malzeme', 'siparis') then
    raise exception 'Tanımsız veri anahtarı: %', p_anahtar;
  end if;
  if p_anahtar in ('ekip', 'personel', 'nobet') and k.rol not in ('yonetici', 'mudur') then
    raise exception 'Ekip ve personel düzenini yalnızca müdür ve yönetici değiştirebilir.';
  end if;
  if p_anahtar = 'malzeme' and k.rol not in ('yonetici', 'mudur', 'muhendis', 'sef') then
    raise exception 'Malzeme kataloğunu yalnızca yönetici, müdür, mühendis ve şef değiştirebilir.';
  end if;
  if p_anahtar in ('ambar', 'arac', 'talep', 'muhtar', 'siparis') and k.rol::text = 'izleyici' then
    raise exception 'İzleyici hesabı kayıt değiştiremez.';
  end if;
  insert into kurum_veri (anahtar, veri, surum, guncelleyen, guncelleme)
  values (p_anahtar, coalesce(p_veri, '[]'::jsonb), 1, k.ad, now())
  on conflict (anahtar) do update
    set veri = coalesce(p_veri, '[]'::jsonb), surum = kurum_veri.surum + 1,
        guncelleyen = k.ad, guncelleme = now()
  returning surum into s;
  return jsonb_build_object('ok', true, 'anahtar', p_anahtar, 'surum', s);
end;
$function$;

create or replace function public.veri_yaz_surumlu(p_token uuid, p_anahtar text, p_veri jsonb, p_surum bigint)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare k kullanicilar; mevcut bigint; guncel jsonb; yeni bigint;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  if p_anahtar not in ('ekip', 'personel', 'nobet', 'ambar', 'arac', 'talep', 'muhtar', 'malzeme', 'siparis') then
    raise exception 'Tanımsız veri anahtarı: %', p_anahtar;
  end if;
  if p_anahtar in ('ekip', 'personel', 'nobet') and k.rol not in ('yonetici', 'mudur') then
    raise exception 'Ekip ve personel düzenini yalnızca müdür ve yönetici değiştirebilir.';
  end if;
  if p_anahtar = 'malzeme' and k.rol not in ('yonetici', 'mudur', 'muhendis', 'sef') then
    raise exception 'Malzeme kataloğunu yalnızca yönetici, müdür, mühendis ve şef değiştirebilir.';
  end if;
  if p_anahtar in ('ambar', 'arac', 'talep', 'muhtar', 'siparis') and k.rol::text = 'izleyici' then
    raise exception 'İzleyici hesabı kayıt değiştiremez.';
  end if;
  select surum, veri into mevcut, guncel from kurum_veri where anahtar = p_anahtar for update;
  if mevcut is not null and p_surum is not null and p_surum <> mevcut then
    return jsonb_build_object('ok', false, 'cakisma', true, 'surum', mevcut, 'veri', guncel,
      'mesaj', 'Bu listeyi başkası değiştirdi.');
  end if;
  insert into kurum_veri (anahtar, veri, surum, guncelleyen, guncelleme)
  values (p_anahtar, coalesce(p_veri, '[]'::jsonb), 1, k.ad, now())
  on conflict (anahtar) do update
    set veri = coalesce(p_veri, '[]'::jsonb), surum = kurum_veri.surum + 1,
        guncelleyen = k.ad, guncelleme = now()
  returning surum into yeni;
  return jsonb_build_object('ok', true, 'anahtar', p_anahtar, 'surum', yeni);
end;
$function$;

create or replace function public.ambar_hareket(p_token uuid, p_islemler jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  k kullanicilar; a jsonb; sur bigint; i jsonb;
  tur text; mal text; amb text; ekp text; adet numeric; varlikId text;
  eldeS numeric; eldeZ numeric; hareket jsonb; red jsonb := '[]'::jsonb;
  yapilan integer := 0; yeni bigint;
  bugun text := to_char(now() at time zone 'Europe/Istanbul', 'YYYY-MM-DD');
  sinir text := to_char((now() at time zone 'Europe/Istanbul') - interval '60 days', 'YYYY-MM-DD');
  fark numeric; eskiG numeric;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı ambar hareketi yapamaz.'; end if;

  select veri, surum into a, sur from kurum_veri where anahtar = 'ambar' for update;
  if a is null then
    a := jsonb_build_object('stok', '{}'::jsonb, 'zimmet', '{}'::jsonb, 'hareket', '[]'::jsonb);
  end if;
  a := jsonb_set(a, '{stok}', coalesce(a->'stok', '{}'::jsonb), true);
  a := jsonb_set(a, '{zimmet}', coalesce(a->'zimmet', '{}'::jsonb), true);
  a := jsonb_set(a, '{hareket}', coalesce(a->'hareket', '[]'::jsonb), true);
  a := jsonb_set(a, '{gun}', coalesce(a->'gun', '{}'::jsonb), true);

  for i in select * from jsonb_array_elements(coalesce(p_islemler, '[]'::jsonb))
  loop
    tur  := i->>'tur';
    mal  := i->>'malzeme';
    amb  := coalesce(i->>'ambar', '');
    ekp  := coalesce(i->>'ekip', '');
    adet := abs(coalesce((i->>'adet')::numeric, 0));
    varlikId := i->>'assetId';
    if mal is null or adet = 0 then continue; end if;

    eldeS := coalesce((a #>> array['stok', amb, mal])::numeric, 0);
    eldeZ := coalesce((a #>> array['zimmet', ekp, mal])::numeric, 0);

    if tur in ('cikis', 'zimmet') and adet > eldeS then
      red := red || jsonb_build_array(jsonb_build_object('malzeme', mal, 'neden', 'ambar mevcudu ' || eldeS));
      continue;
    end if;
    if tur in ('iade', 'sarf', 'hurda') and adet > eldeZ then
      red := red || jsonb_build_array(jsonb_build_object('malzeme', mal, 'neden', 'zimmette ' || eldeZ));
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
    elsif tur = 'hurda' then
      a := jsonb_set(a, array['zimmet', ekp, mal], to_jsonb(eldeZ - adet), true);
    else
      continue;
    end if;

    if tur in ('cikis', 'zimmet') and eldeS - adet <= 0 then
      a := a #- array['stok', amb, mal];
    end if;
    if tur in ('iade', 'sarf', 'hurda') and eldeZ - adet <= 0 then
      a := a #- array['zimmet', ekp, mal];
    end if;

    -- günlük net ambar çıkışı
    fark := case when tur in ('cikis', 'zimmet') then adet when tur = 'iade' then -adet else 0 end;
    if fark <> 0 then
      eskiG := coalesce((a #>> array['gun', bugun, mal])::numeric, 0);
      a := jsonb_set(a, array['gun', bugun], coalesce(a #> array['gun', bugun], '{}'::jsonb), true);
      a := jsonb_set(a, array['gun', bugun, mal], to_jsonb(eskiG + fark), true);
    end if;

    hareket := jsonb_build_object(
      'id', coalesce(i->>'id', 'h' || extract(epoch from clock_timestamp())::bigint || yapilan),
      'damga', to_char(now() at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      'tur', tur, 'malzeme', mal, 'adet', adet,
      'birim', coalesce(i->>'birim', 'adet'),
      'ambar', amb, 'ekip', ekp, 'kim', k.ad,
      'not', coalesce(i->>'not', ''),
      'assetId', varlikId);
    a := jsonb_set(a, '{hareket}', (jsonb_build_array(hareket) || (a->'hareket')), true);
    yapilan := yapilan + 1;
  end loop;

  if jsonb_array_length(a->'hareket') > 400 then
    a := jsonb_set(a, '{hareket}',
      (select coalesce(jsonb_agg(x), '[]'::jsonb)
         from (select x from jsonb_array_elements(a->'hareket') x limit 400) t), true);
  end if;
  -- 60 günden eski günlük özetler atılır
  a := jsonb_set(a, '{gun}',
    (select coalesce(jsonb_object_agg(g.key, g.value), '{}'::jsonb)
       from jsonb_each(a->'gun') g where g.key >= sinir), true);

  insert into kurum_veri (anahtar, veri, surum, guncelleyen, guncelleme)
  values ('ambar', a, 1, k.ad, now())
  on conflict (anahtar) do update
    set veri = a, surum = kurum_veri.surum + 1, guncelleyen = k.ad, guncelleme = now()
  returning surum into yeni;

  return jsonb_build_object('ok', true, 'yapilan', yapilan, 'red', red, 'veri', a, 'surum', yeni);
end;
$function$;
