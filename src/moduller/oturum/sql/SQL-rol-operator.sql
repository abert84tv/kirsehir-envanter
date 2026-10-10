-- Altı rol: yonetici · mudur · muhendis · operator (YENİ) · sef (Saha Şefi) · personel (Saha Personeli)
-- 1) rol türüne 'operator' eklendi (ayrı işlemde): alter type rol add value if not exists 'operator';
-- 2) Rol listeleri içeren işlevler güncellenir (bu dosya, 1'den SONRA çalıştırılır).
--   Operatör: talepleri alır, işleri ve ekipleri atar (iş emri), ambardan ekibe malzeme verir, sipariş listesini yönetir.
--   Saha Şefi: sahadaki ekibi yönetir, işi/iş emrini kapatır, kullanılan malzemeyi düşer. Ekip ataması artık operatörde.
--   Mühendis: envanter, malzeme kataloğu ve sipariş; ekip ataması ve ambar günlük işlemleri yok.

do $do$
declare d text; r record;
begin
  for r in select * from (values
    ('ariza_ek_kaydet', $q$k.rol::text in ('yonetici','mudur','muhendis','sef')$q$, $q$k.rol::text in ('yonetici','mudur','muhendis','operator','sef')$q$),
    ('ariza_ek_kaydet', 'mühendis ya da şef değiştirir', 'mühendis, operatör ya da şef değiştirir'),
    ('basvuru_engelle', $q$k.rol::text not in ('yonetici','mudur','muhendis','sef')$q$, $q$k.rol::text not in ('yonetici','mudur','operator')$q$),
    ('basvuru_engelle', 'yönetici, müdür, mühendis ya da şef olmalısınız', 'yönetici, müdür ya da operatör olmalısınız'),
    ('is_emri_kapat', $q$k.rol::text not in ('yonetici','mudur','muhendis','sef')$q$, $q$k.rol::text not in ('yonetici','mudur','sef','operator')$q$),
    ('is_emri_yetkili', $q$k.rol not in ('yonetici','mudur','muhendis','sef')$q$, $q$k.rol not in ('yonetici','mudur','operator')$q$),
    ('veri_yaz', $q$k.rol not in ('yonetici', 'mudur', 'muhendis', 'sef')$q$, $q$k.rol not in ('yonetici', 'mudur', 'muhendis')$q$),
    ('veri_yaz', 'yönetici, müdür, mühendis ve şef değiştirebilir', 'yönetici, müdür ve mühendis değiştirebilir'),
    ('veri_yaz', $q$  if p_anahtar in ('ambar', 'arac', 'talep', 'muhtar', 'siparis') and k.rol::text = 'izleyici' then$q$,
      $q$  if p_anahtar = 'siparis' and k.rol::text not in ('yonetici', 'mudur', 'muhendis', 'operator') then
    raise exception 'Sipariş listesini yalnızca yönetici, müdür, mühendis ve operatör değiştirebilir.';
  end if;
  if p_anahtar in ('ambar', 'arac', 'talep', 'muhtar', 'siparis') and k.rol::text = 'izleyici' then$q$),
    ('veri_yaz_surumlu', $q$k.rol not in ('yonetici', 'mudur', 'muhendis', 'sef')$q$, $q$k.rol not in ('yonetici', 'mudur', 'muhendis')$q$),
    ('veri_yaz_surumlu', 'yönetici, müdür, mühendis ve şef değiştirebilir', 'yönetici, müdür ve mühendis değiştirebilir'),
    ('veri_yaz_surumlu', $q$  if p_anahtar in ('ambar', 'arac', 'talep', 'muhtar', 'siparis') and k.rol::text = 'izleyici' then$q$,
      $q$  if p_anahtar = 'siparis' and k.rol::text not in ('yonetici', 'mudur', 'muhendis', 'operator') then
    raise exception 'Sipariş listesini yalnızca yönetici, müdür, mühendis ve operatör değiştirebilir.';
  end if;
  if p_anahtar in ('ambar', 'arac', 'talep', 'muhtar', 'siparis') and k.rol::text = 'izleyici' then$q$),
    ('yetkim_var', $q$('yonetici','mudur','muhendis','sef','personel')$q$, $q$('yonetici','mudur','muhendis','operator','sef','personel')$q$),
    ('yetkim_var', $q$benim_rolum() in ('yonetici','mudur','muhendis','sef')$q$, $q$benim_rolum() in ('yonetici','mudur','muhendis','operator','sef')$q$),
    ('yetkim_var', $q$when 'atama'     then benim_rolum() in ('yonetici','mudur','sef')$q$, $q$when 'atama'     then benim_rolum() in ('yonetici','mudur','operator')$q$)
  ) as t(fn, eski, yeni)
  loop
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = r.fn and p.prokind = 'f';
    if d is null then raise exception 'İşlev bulunamadı: %', r.fn; end if;
    if position(r.eski in d) = 0 then raise exception '% içinde bulunamadı: %', r.fn, r.eski; end if;
    execute replace(d, r.eski, r.yeni);
  end loop;
end
$do$;

-- Stok yetkileri (SQL-ambar-yetki.sql'in güncel hâli): Operatör ambar günlük işlerini yapar
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
        when 'giris' then k.rol::text = 'operator'
        when 'iade' then k.rol::text = 'operator'
        when 'zimmet' then k.rol::text = 'operator'
        when 'sarf' then k.rol::text in ('mudur', 'operator', 'sef', 'personel')
        when 'hurda' then k.rol::text = 'mudur'
        when 'cikis' then k.rol::text = 'mudur'
        else false end)
  end
  and not (p_tur = 'sarf' and k.rol::text = 'personel' and coalesce(k.ekip, '') <> '' and coalesce(p_ekip, '') <> k.ekip)
$$;

-- 3) Son onay ve kapatma Mühendis'te (görevler ayrılığı: atayan operatör ≠ yapan saha şefi ≠ onaylayan mühendis). Uygulandı 2026-10-10.
do $do$
declare d text; r record;
begin
  for r in select * from (values
    ('is_emri_kapat', $q$k.rol::text not in ('yonetici','mudur','sef','operator')$q$, $q$k.rol::text not in ('yonetici','mudur','muhendis')$q$),
    ('is_emri_kapat', 'İş emri kapatma yetkiniz yok.', 'İş emrini yalnızca mühendis, müdür ya da yönetici kapatır (saha işi onaya gönderir).'),
    ('yetkim_var', $q$when 'close'     then benim_rolum() in ('yonetici','mudur','sef')$q$, $q$when 'close'     then benim_rolum() in ('yonetici','mudur','muhendis')$q$)
  ) as t(fn, eski, yeni)
  loop
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = r.fn and p.prokind = 'f';
    if d is null then raise exception 'İşlev bulunamadı: %', r.fn; end if;
    if position(r.eski in d) = 0 then raise exception '% içinde bulunamadı: %', r.fn, r.eski; end if;
    execute replace(d, r.eski, r.yeni);
  end loop;
end
$do$;

-- 4) Mühendis arıza/iş emri/stok işlerinden çıkarıldı (iş yerinde arıza mühendisi yok); yetki Ayarlar › Yetkiler'den kişiye verilebilir.
--    rol_yetkisi(k, perm): rol varsayılanı + kullanicilar.yetki_istisna (istemcideki yetkiVar ile aynı). Uygulandı 2026-10-10 (rol_yetkisi_istisna_destekli).
--    Kullanan işlevler: is_emri_yetkili (assign), is_emri_kapat (close), basvuru_engelle (talepYonet), ariza_ek_kaydet (assign/close/şef),
--    veri_yaz / veri_yaz_surumlu (stokKatalog, stokSiparis). Varsayılanlar: assign/talepYonet → müdür, operatör · close/stokKatalog → müdür · stokSiparis → müdür, operatör.
