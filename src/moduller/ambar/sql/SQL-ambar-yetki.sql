-- Stok / ambar yetkileri (görevler ayrılığı) — ekrandaki kuralla (stokIzin) birebir aynı.
-- Rol varsayılanı + kişiye özel istisna (kullanicilar.yetki_istisna) + Stok sayfa yetkisi (sayfa_yetki.ambar: gor/yok işlem yaptırmaz).
--   stokGiris   mal alımı girişi          : yönetici, mühendis, şef
--   stokZimmet  ekibe ver / iade al       : yönetici, mühendis, şef
--   stokSarf    sahada kullanılanı düş    : yönetici, müdür, mühendis, şef, personel (personel yalnız kendi ekibi; arıza kapanışı da bunu kullanır)
--   stokDuzelt  hurda ve ambar düzeltmesi : yönetici, müdür
-- Yönetici istisna kabul etmez. Yetkisiz kalem “red” listesine yazılır (diğer kalemler işlenir).

create or replace function stok_izin(k kullanicilar, p_tur text, p_ekip text)
returns boolean
language sql stable as $$
  select case
    when k.rol::text = 'yonetici' then true
    when coalesce(k.sayfa_yetki->>'ambar', 'tam') in ('gor', 'yok') then false
    else coalesce(
      (k.yetki_istisna ->> (case p_tur
          when 'giris' then 'stokGiris' when 'iade' then 'stokZimmet' when 'zimmet' then 'stokZimmet'
          when 'sarf' then 'stokSarf' when 'hurda' then 'stokDuzelt' when 'cikis' then 'stokDuzelt' end))::boolean,
      case p_tur
        when 'giris' then k.rol::text in ('muhendis', 'sef')
        when 'iade' then k.rol::text in ('muhendis', 'sef')
        when 'zimmet' then k.rol::text in ('muhendis', 'sef')
        when 'sarf' then k.rol::text in ('mudur', 'muhendis', 'sef', 'personel')
        when 'hurda' then k.rol::text = 'mudur'
        when 'cikis' then k.rol::text = 'mudur'
        else false end)
  end
  and not (p_tur = 'sarf' and k.rol::text = 'personel' and coalesce(k.ekip, '') <> '' and coalesce(p_ekip, '') <> k.ekip)
$$;

-- ambar_hareket: her kalemden önce yetki denetimi (SQL-ambar-hareket tanımının aynısı + stok_izin kontrolü)
create or replace function ambar_hareket(p_token uuid, p_islemler jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
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

    -- görevler ayrılığı: bu kullanıcı bu işlemi yapabilir mi?
    if not stok_izin(k, tur, ekp) then
      red := red || jsonb_build_array(jsonb_build_object('malzeme', mal, 'neden', 'bu işlem için yetkiniz yok'));
      continue;
    end if;

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
$$;
