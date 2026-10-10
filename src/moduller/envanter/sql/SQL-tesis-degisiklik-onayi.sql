-- 2026-10-10 — Tesis ekleme / silme ÖNERİSİ ve iki aşamalı onay (saha şefi → mühendis → müdür)
-- Uygulandı: tesis_degisiklik_onayi_sef_ekip_suzgeci_cop_yetkisi (Supabase migration)
--
-- 1) Saha şefi (yetki "tesisOner" verilmiş olan; örn. elektrik ekibi şefi) tesisi kendisi ekleyip silemez, ÖNERİR.
--    Öneri → ilgili ilçenin mühendisine ya da bütün ilçelere bakan (bölgesi boş) mühendislere gider (operatör yok)
--    → mühendis ön onayı → müdür son onayı → tesis eklenir / çöp kutusuna taşınır.
--    Müdür gerekirse ön onay aşamasında doğrudan karara bağlar; ön onayı veren aynı kişi son onayı veremez; açan kendi önerisini onaylayamaz.
-- 2) Saha şefi yalnız KENDİ ekibinin arıza / iş emri / arıza-ek kayıtlarını görür (ariza_listesi, is_emri_listesi, ariza_ek_listesi).
-- 3) cop_temizle(uuid): yalnız silme yetkisi olanlar (yönetici, müdür) çalıştırır; diğerleri için boş döner.
--    Jetonsuz cop_temizle() kaldırıldı (anonim çağrıyla çöp kutusunu boşaltabiliyordu).

create or replace function rol_yetkisi(k kullanicilar, p_yetki text)
returns boolean
language sql stable as $$
  select coalesce(
    case when p_yetki in ('sil', 'admin', 'gor') then null
         when k.rol::text = 'yonetici' then (case when (k.yetki_istisna ->> p_yetki)::boolean is true then true end)
         else (k.yetki_istisna ->> p_yetki)::boolean end,
    case p_yetki
      when 'assign' then k.rol::text = 'operator'
      when 'talepYonet' then k.rol::text = 'operator'
      when 'onOnay' then k.rol::text = 'operator'
      when 'close' then k.rol::text in ('yonetici', 'mudur')
      when 'create' then k.rol::text in ('yonetici', 'mudur', 'muhendis')
      when 'sil' then k.rol::text in ('yonetici', 'mudur')
      when 'tesisOner' then false
      when 'stokSiparis' then k.rol::text = 'operator'
      when 'stokSiparisOnay' then k.rol::text in ('yonetici', 'mudur')
      when 'stokKatalog' then k.rol::text in ('yonetici', 'mudur')
      else k.rol::text = 'yonetici' end)
$$;

create table if not exists tesis_degisiklik (
  id bigserial primary key,
  tur text not null check (tur in ('ekle', 'sil')),
  durum text not null default 'muhendis' check (durum in ('muhendis', 'mudur', 'onaylandi', 'reddedildi', 'iptal')),
  tesis_id bigint,
  ilce text not null,
  koy text,
  tesis_tur text,
  lat double precision,
  lon double precision,
  yapim_yili integer,
  veri jsonb not null default '{}'::jsonb,
  aciklama text,
  acan_k bigint not null,
  acildi timestamptz not null default now(),
  muhendis_k bigint,
  muhendis_zaman timestamptz,
  mudur_k bigint,
  mudur_zaman timestamptz,
  red_neden text,
  sonuc_tesis_id bigint,
  sonuc_kod text
);
alter table tesis_degisiklik enable row level security;
revoke all on tesis_degisiklik from anon, authenticated;

create or replace function tesis_degisiklik_ac(
  p_token uuid, p_tur text, p_tesis_id bigint, p_ilce text, p_koy text, p_tesis_tur text,
  p_lat double precision, p_lon double precision, p_yapim_yili integer, p_veri jsonb, p_aciklama text)
returns bigint
language plpgsql security definer set search_path to 'public' as $f$
declare k kullanicilar; t tesis; yeni bigint; il text := p_ilce;
begin
  if p_tur = 'sil' and p_tesis_id is not null then
    select * into t from tesis x where x.id = p_tesis_id and x.silindi is null;
    if not found then raise exception 'Kayıt bulunamadı — başkası silmiş olabilir.'; end if;
    il := t.ilce;
  end if;
  k := yazma_denetle(p_token, il);
  if not (rol_yetkisi(k, 'tesisOner') or rol_yetkisi(k, 'create')) then
    raise exception 'Tesis ekleme/silme önerme yetkiniz yok. Yetkiyi yöneticiniz Ayarlar › Yetkiler’den verebilir.';
  end if;
  if p_tur not in ('ekle', 'sil') then raise exception 'Öneri türü geçersiz.'; end if;
  if p_tur = 'ekle' then
    if p_lat is null or p_lon is null then raise exception 'Konum gerekli.'; end if;
    if nullif(trim(coalesce(il, '')), '') is null then raise exception 'İlçe gerekli.'; end if;
    perform p_tesis_tur::tesis_turu;
    insert into tesis_degisiklik (tur, ilce, koy, tesis_tur, lat, lon, yapim_yili, veri, aciklama, acan_k)
    values ('ekle', il, p_koy, p_tesis_tur, p_lat, p_lon, p_yapim_yili, coalesce(p_veri, '{}'::jsonb), p_aciklama, k.id)
    returning id into yeni;
  else
    if p_tesis_id is null then raise exception 'Silinecek kayıt seçilmedi.'; end if;
    if exists (select 1 from tesis_degisiklik d where d.tur = 'sil' and d.tesis_id = p_tesis_id and d.durum in ('muhendis', 'mudur')) then
      raise exception 'Bu kayıt için silme önerisi zaten onay bekliyor.';
    end if;
    insert into tesis_degisiklik (tur, tesis_id, ilce, koy, tesis_tur, lat, lon, aciklama, acan_k)
    values ('sil', p_tesis_id, t.ilce, t.koy, t.tur::text, t.lat, t.lon, p_aciklama, k.id)
    returning id into yeni;
  end if;
  insert into denetim (sinif, ne, detay, kapsam, kim, rol, nereden, cevrimdisi)
  values ('veri', 'Tesis ' || case p_tur when 'ekle' then 'ekleme' else 'silme' end || ' önerisi açıldı',
          coalesce(p_koy, '') || ' · ' || il, 'öneri #' || yeni, k.ad, k.rol::text, 'program', false);
  return yeni;
end
$f$;

create or replace function tesis_degisiklik_listesi(p_token uuid)
returns table(id bigint, tur text, durum text, tesis_id bigint, tesis_kod text, ilce text, koy text, tesis_tur text,
              lat double precision, lon double precision, yapim_yili integer, aciklama text,
              acan text, acan_id bigint, acildi timestamptz, muhendis text, muhendis_zaman timestamptz,
              mudur text, mudur_zaman timestamptz, red_neden text, sonuc_kod text, benim_sira boolean)
language plpgsql security definer set search_path to 'public' as $f$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select d.id, d.tur, d.durum, d.tesis_id, coalesce(t.kod, d.sonuc_kod), d.ilce, d.koy, d.tesis_tur,
           d.lat, d.lon, d.yapim_yili, d.aciklama,
           kim(d.acan_k), d.acan_k, d.acildi, case when d.muhendis_k is null then null else kim(d.muhendis_k) end, d.muhendis_zaman,
           case when d.mudur_k is null then null else kim(d.mudur_k) end, d.mudur_zaman, d.red_neden, d.sonuc_kod,
           ((d.durum = 'muhendis' and d.acan_k <> k.id and (rol_yetkisi(k, 'close') or (k.rol::text = 'muhendis' and yazabilir(k, d.ilce))))
            or (d.durum = 'mudur' and d.acan_k <> k.id and d.muhendis_k is distinct from k.id and rol_yetkisi(k, 'close')))
      from tesis_degisiklik d left join tesis t on t.id = d.tesis_id
     where (d.durum in ('muhendis', 'mudur') or d.acildi > now() - interval '30 days')
       and (d.acan_k = k.id
            or k.rol::text in ('yonetici', 'mudur')
            or (k.rol::text = 'muhendis' and yazabilir(k, d.ilce)))
     order by (d.durum in ('muhendis', 'mudur')) desc, d.acildi desc;
end
$f$;

create or replace function tesis_degisiklik_karar(p_token uuid, p_id bigint, p_karar text, p_neden text default null)
returns text
language plpgsql security definer set search_path to 'public' as $f$
declare k kullanicilar; d tesis_degisiklik; ust boolean; yeni bigint; v_kod text; v_on text; v_no int;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı kayıt değiştiremez.'; end if;
  select * into d from tesis_degisiklik x where x.id = p_id for update;
  if not found then raise exception 'Öneri bulunamadı.'; end if;
  if d.durum not in ('muhendis', 'mudur') then raise exception 'Bu öneri zaten sonuçlanmış.'; end if;
  if p_karar = 'iptal' then
    if d.acan_k <> k.id and not rol_yetkisi(k, 'sil') then raise exception 'Öneriyi yalnızca açan geri çekebilir.'; end if;
    update tesis_degisiklik x set durum = 'iptal' where x.id = p_id;
    return 'iptal';
  end if;
  ust := rol_yetkisi(k, 'close');
  if d.acan_k = k.id then raise exception 'Kendi önerinizi kendiniz onaylayamazsınız.'; end if;
  if d.durum = 'muhendis' then
    if not (ust or (k.rol::text = 'muhendis' and yazabilir(k, d.ilce))) then
      raise exception 'Bu öneriyi yalnızca % ilçesinin mühendisi, bütün ilçelere bakan mühendis ya da müdür karara bağlar.', d.ilce;
    end if;
  else
    if not ust then raise exception 'Son onay yalnızca müdürde (ya da vekilinde).'; end if;
    if d.muhendis_k = k.id then raise exception 'Ön onayı veren kişi son onayı veremez.'; end if;
  end if;
  if p_karar = 'red' then
    update tesis_degisiklik x set durum = 'reddedildi', red_neden = nullif(trim(coalesce(p_neden, '')), ''),
           muhendis_k = case when d.durum = 'muhendis' then k.id else x.muhendis_k end,
           mudur_k = case when d.durum = 'mudur' then k.id else x.mudur_k end,
           mudur_zaman = case when d.durum = 'mudur' then now() else x.mudur_zaman end
     where x.id = p_id;
    insert into denetim (sinif, ne, detay, kapsam, kim, rol, nereden, cevrimdisi)
    values ('veri', 'Tesis önerisi reddedildi', coalesce(d.koy, '') || ' · ' || d.ilce, 'öneri #' || p_id, k.ad, k.rol::text, 'program', false);
    return 'reddedildi';
  end if;
  if p_karar = 'iade' then
    if d.durum <> 'mudur' then raise exception 'İade yalnız son onay aşamasında yapılır.'; end if;
    update tesis_degisiklik x set durum = 'muhendis', muhendis_k = null, muhendis_zaman = null,
           red_neden = nullif(trim(coalesce(p_neden, '')), '') where x.id = p_id;
    return 'iade';
  end if;
  if p_karar <> 'onay' then raise exception 'Karar geçersiz.'; end if;
  if d.durum = 'muhendis' and not ust then
    update tesis_degisiklik x set durum = 'mudur', muhendis_k = k.id, muhendis_zaman = now(), red_neden = null where x.id = p_id;
    return 'mudur';
  end if;
  -- son onay: öneriyi uygula
  if d.tur = 'ekle' then
    perform pg_advisory_xact_lock(hashtext('tesis_kod'));
    v_on := 'KS-' || case d.tesis_tur when 'kuyu' then 'KUY' when 'depo' then 'DEP' when 'ag' then 'AGP' when 'ges' then 'GES' else upper(left(d.tesis_tur, 3)) end || '-';
    select coalesce(max((substring(t.kod from '([0-9]+)$'))::int), 0) + 1 into v_no
      from tesis t where t.kod like v_on || '%' and t.kod ~ '[0-9]+$';
    v_kod := v_on || lpad(v_no::text, 4, '0');
    insert into tesis (kod, tur, durum, ilce, koy, lat, lon, yapim_yili, veri, olusturan_k, guncelleyen_k, kaynak)
    values (v_kod, d.tesis_tur::tesis_turu, 'aktif', d.ilce, d.koy, d.lat, d.lon, d.yapim_yili, d.veri, d.acan_k, k.id, 'Saha önerisi (onaylı)')
    returning tesis.id into yeni;
  else
    update tesis t set silindi = now(), silen_k = k.id where t.id = d.tesis_id and t.silindi is null;
    if not found then raise exception 'Kayıt zaten silinmiş.'; end if;
    yeni := d.tesis_id;
    select t.kod into v_kod from tesis t where t.id = d.tesis_id;
  end if;
  update tesis_degisiklik x set durum = 'onaylandi', mudur_k = k.id, mudur_zaman = now(),
         sonuc_tesis_id = yeni, sonuc_kod = v_kod, red_neden = null where x.id = p_id;
  insert into denetim (sinif, ne, detay, kapsam, kim, rol, nereden, cevrimdisi)
  values ('veri', 'Tesis ' || case d.tur when 'ekle' then 'ekleme' else 'silme' end || ' önerisi onaylandı',
          v_kod || ' · ' || coalesce(d.koy, '') || ' · ' || d.ilce, 'öneri #' || p_id, k.ad, k.rol::text, 'program', false);
  return 'onaylandi';
end
$f$;

grant execute on function tesis_degisiklik_ac(uuid, text, bigint, text, text, text, double precision, double precision, integer, jsonb, text) to anon, authenticated;
grant execute on function tesis_degisiklik_listesi(uuid) to anon, authenticated;
grant execute on function tesis_degisiklik_karar(uuid, bigint, text, text) to anon, authenticated;

-- 2) Saha şefi yalnız kendi ekibinin işlerini görür (ekibi tanımsız şef eski davranışta kalır)
create or replace function ariza_listesi(p_token uuid)
returns table(id bigint, no text, tesis_id bigint, tesis_kod text, ilce text, tur text, oncelik ariza_oncelik, durum ariza_durum, ekip text, aciklama text, malzeme jsonb, maliyet numeric, acan text, acildi timestamptz, kapatan text, kapandi timestamptz, yazilabilir boolean, grup text, koy text, tesis_koy text, lat double precision, lon double precision, konum_zaman timestamptz, konum_dogruluk numeric, konum_kim text)
language plpgsql security definer set search_path to 'public' as $f$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select a.id, a.no, a.tesis_id, t.kod, coalesce(t.ilce, a.ilce), a.tur, a.oncelik, a.durum, a.ekip,
           a.aciklama, a.malzeme, a.maliyet,
           kim(a.acan_k), a.acildi, kim(a.kapatan_k), a.kapandi,
           yazabilir(k, coalesce(t.ilce, a.ilce)),
           a.grup, a.koy, t.koy, a.lat, a.lon, a.konum_zaman, a.konum_dogruluk, kim(a.konum_k)
      from ariza a left join tesis t on t.id = a.tesis_id
     where (k.rol::text <> 'sef' or coalesce(k.ekip, '') = '' or a.ekip = k.ekip)
     order by a.acildi desc;
end
$f$;

create or replace function ariza_ek_listesi(p_token uuid)
returns table(ariza_id bigint, sla_gun integer, sla_iptal boolean, sla_not text, bekleme_bas timestamptz, bekleme_dk integer, bekleme_neden text, ana_ariza_id bigint, planli_zaman timestamptz)
language plpgsql security definer set search_path to 'public' as $f$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select e.ariza_id, e.sla_gun, e.sla_iptal, e.sla_not, e.bekleme_bas, e.bekleme_dk,
           e.bekleme_neden, e.ana_ariza_id, e.planli_zaman
      from ariza_ek e join ariza a on a.id = e.ariza_id
     where (k.rol::text <> 'sef' or coalesce(k.ekip, '') = '' or a.ekip = k.ekip);
end
$f$;

create or replace function is_emri_listesi(p_token uuid)
returns table(id bigint, no text, talep_id text, ariza_id bigint, tesis_id bigint, tesis_kod text, ilce text, tur text, alt_sistem text, oncelik text, aciklama text, ekip text, araclar jsonb, durum text, planlanan_malzeme jsonb, kullanilan_malzeme jsonb, toplam_saat numeric, acan text, acildi timestamptz, atayan text, atandi_zaman timestamptz, kapatan text, kapandi timestamptz, surum integer, koy text)
language plpgsql security definer set search_path to 'public' as $f$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select e.id, e.no, e.talep_id, e.ariza_id, e.tesis_id, t.kod, coalesce(t.ilce, a.ilce),
           e.tur, e.alt_sistem, e.oncelik, e.aciklama, e.ekip, e.araclar, e.durum,
           e.planlanan_malzeme, e.kullanilan_malzeme, e.toplam_saat,
           kim(e.acan_k), e.acildi, kim(e.atayan_k), e.atandi_zaman,
           kim(e.kapatan_k), e.kapandi, e.surum, coalesce(a.koy, t.koy)
      from is_emirleri e
      left join tesis t on t.id = e.tesis_id
      left join ariza a on a.id = e.ariza_id
     where (k.rol::text <> 'sef' or coalesce(k.ekip, '') = '' or e.ekip = k.ekip)
     order by e.acildi desc;
end
$f$;

-- 3) Çöp temizleme: yalnız silme yetkisi olan (yönetici, müdür) çalıştırır
drop function if exists cop_temizle();
do $do$
declare d text;
begin
  select pg_get_functiondef('cop_temizle(uuid)'::regprocedure) into d;
  if position('k := oturum_sahibi(p_token);' in d) = 0 then raise exception 'cop_temizle gövdesi beklenenden farklı'; end if;
  execute replace(d, 'k := oturum_sahibi(p_token);', E'k := oturum_sahibi(p_token);\n  if not rol_yetkisi(k, ''sil'') then return; end if;');
end
$do$;

-- 4) Veri okuma süzgeci (uygulandı: veri_okuma_rol_suzgeci): veri_oku / veri_hepsi / veri_hepsi_surumlu
--    şef ve izleyici için talep, muhtar ve sipariş listelerini (vatandaş adı/telefonu dahil) boş döndürür;
--    izleyici için ambar da boştur. Şef kendi ekibinin zimmetini görmek için ambarı okuyabilir.
-- 5) Ekip konumu (uygulandı: konum_okuma_sef_ekip_suzgeci): konum_ekip_listesi şef için yalnız kendi ekibini döndürür;
--    konum_cihaz_listesi (plaka, harici kod) yalnız yönetici, müdür ve operatöre.
