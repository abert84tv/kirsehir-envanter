-- 2026-10-10 — Arıza son onayla kapanırken zimmet düşümü ve talep/başvuru kapanışı SUNUCUDA yapılır
-- (uygulandı: ariza_kapanis_sunucuda). Önceden bu iki adım kapanışı yapan kişinin tarayıcısında çalışıyordu;
-- bağlantı kopsa ya da sekme kapansa iş kapanmış görünür, stok düşmeden kalabilirdi.
--
-- ariza_kapanis_isle: arıza ilk kez “cozuldu” olduğunda ariza_kaydet'in sonunda çağrılır. Hata verse bile kapanışı engellemez.
--  1) ariza.malzeme listesi, arızanın ekibinin zimmetinden “sarf” olarak düşülür (ambar_hareket: yetki ve bakiye denetimi orada).
--     Aynı işin (not = '<no> kapanışı', aynı ekip ve malzeme) önceki düşümü varsa ikinci kez düşülmez.
--  2) kurum_veri 'talep': arizaNo'su bu arıza olan ve “arizaya” durumundaki talepler “cozuldu” olur;
--     başvuruyla (takip kodu) bağlıysa vatandas_basvuru da “cozuldu” olur (Telegram'dan geleni bot mesajı haberdar eder).

create or replace function ariza_kapanis_isle(p_token uuid, p_ariza_id bigint)
returns void
language plpgsql security definer set search_path to 'public' as $f$
declare a ariza; ekip text; ops jsonb := '[]'::jsonb; m jsonb; v_not text; mal text; adet numeric; mevcut jsonb; takipler text[];
begin
  select * into a from ariza x where x.id = p_ariza_id;
  if not found then return; end if;
  ekip := nullif(nullif(a.ekip, 'Atanmadı'), '');
  v_not := a.no || ' kapanışı';
  if ekip is not null and jsonb_typeof(coalesce(a.malzeme, '[]'::jsonb)) = 'array' then
    select veri->'hareket' into mevcut from kurum_veri where anahtar = 'ambar';
    for m in select * from jsonb_array_elements(a.malzeme) loop
      mal := m->>'ad'; adet := abs(coalesce((m->>'adet')::numeric, 1));
      if mal is null or adet = 0 then continue; end if;
      if mevcut is not null and exists (select 1 from jsonb_array_elements(mevcut) h
          where h->>'tur' = 'sarf' and h->>'not' = v_not and h->>'ekip' = ekip and h->>'malzeme' = mal) then continue; end if;
      ops := ops || jsonb_build_array(jsonb_build_object('tur', 'sarf', 'malzeme', mal, 'adet', adet, 'birim', coalesce(m->>'birim', 'adet'),
                                                        'ekip', ekip, 'ambar', '', 'not', v_not,
                                                        'assetId', case when a.tesis_id is not null then 't' || a.tesis_id end));
    end loop;
    if jsonb_array_length(ops) > 0 then
      begin perform ambar_hareket(p_token, ops); exception when others then null; end;
    end if;
  end if;
  begin
    select array_agg(x->>'takip') filter (where coalesce(x->>'takip', '') <> '') into takipler
      from kurum_veri k, jsonb_array_elements(case when jsonb_typeof(k.veri) = 'array' then k.veri else '[]'::jsonb end) x
     where k.anahtar = 'talep' and x->>'arizaNo' = a.no and x->>'durum' = 'arizaya';
    update kurum_veri k
       set veri = (select coalesce(jsonb_agg(case when x->>'arizaNo' = a.no and x->>'durum' = 'arizaya'
                                                  then x || jsonb_build_object('durum', 'cozuldu', 'sonuc', coalesce(nullif(x->>'sonuc', ''), 'Arıza giderildi.')) else x end), '[]'::jsonb)
                     from jsonb_array_elements(k.veri) x),
           surum = k.surum + 1, guncelleme = now()
     where k.anahtar = 'talep' and jsonb_typeof(k.veri) = 'array'
       and exists (select 1 from jsonb_array_elements(k.veri) y where y->>'arizaNo' = a.no and y->>'durum' = 'arizaya');
    if takipler is not null then
      update vatandas_basvuru b set durum = 'cozuldu', sonuc = coalesce(nullif(b.sonuc, ''), 'Arıza giderildi.'), guncelleme = now()
       where b.takip = any(takipler) and b.durum <> 'cozuldu';
    end if;
  exception when others then null;
  end;
end
$f$;
