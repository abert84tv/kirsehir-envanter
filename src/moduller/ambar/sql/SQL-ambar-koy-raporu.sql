-- Kırşehir Envanter — ambar hareketine tesis (kuyu/depo) referansı eklenmesi
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zarar
-- vermez (create or replace). Ön koşul: SQL-ambar-hurda.sql çalıştırılmış
-- olmalı.
--
-- Ne değişti: arıza kapanışında ekip zimmetinden düşülen malzemenin hangi
-- tesisten (dolayısıyla hangi köy/ilçeden) kaynaklandığı artık hareket
-- satırında saklanıyor — köy/ilçe bazlı malzeme kullanımı ve maliyet raporu
-- için (madde 18, Faz 3). Yalnızca arıza kapanışından gelen sarf işleminde
-- dolu olur; ambar ekranından elle girilen hareketlerde (operatör bir tesis
-- seçmiyor) boş kalır — bu bilinçli bir v1 sadeleştirmesi.

-- p_islemler: [{ tur, malzeme, adet, birim, ambar, ekip, not, id, damga, assetId }]
--   tur: giris | cikis | zimmet | iade | sarf | hurda
create or replace function ambar_hareket(p_token uuid, p_islemler jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  k kullanicilar; a jsonb; sur bigint; i jsonb;
  tur text; mal text; amb text; ekp text; adet numeric; varlikId text;
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
    varlikId := i->>'assetId';
    if mal is null or adet = 0 then continue; end if;

    eldeS := coalesce((a #>> array['stok', amb, mal])::numeric, 0);
    eldeZ := coalesce((a #>> array['zimmet', ekp, mal])::numeric, 0);

    -- Bakiye yetmiyorsa bu hareket reddedilir, diğerleri işlenmeye devam eder
    if tur in ('cikis', 'zimmet') and adet > eldeS then
      red := red || jsonb_build_array(jsonb_build_object(
        'malzeme', mal, 'neden', 'ambar mevcudu ' || eldeS));
      continue;
    end if;
    if tur in ('iade', 'sarf', 'hurda') and adet > eldeZ then
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
    elsif tur = 'hurda' then
      a := jsonb_set(a, array['zimmet', ekp, mal], to_jsonb(eldeZ - adet), true);
    else
      continue;
    end if;

    -- Sıfıra düşen kalem listeden çıkar, ekran temiz kalır
    if tur in ('cikis', 'zimmet') and eldeS - adet <= 0 then
      a := a #- array['stok', amb, mal];
    end if;
    if tur in ('iade', 'sarf', 'hurda') and eldeZ - adet <= 0 then
      a := a #- array['zimmet', ekp, mal];
    end if;

    hareket := jsonb_build_object(
      'id', coalesce(i->>'id', 'h' || extract(epoch from clock_timestamp())::bigint || yapilan),
      'damga', to_char(now() at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI'),
      'tur', tur, 'malzeme', mal, 'adet', adet,
      'birim', coalesce(i->>'birim', 'adet'),
      'ambar', amb, 'ekip', ekp, 'kim', k.ad,
      'not', coalesce(i->>'not', ''),
      'assetId', varlikId);
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
