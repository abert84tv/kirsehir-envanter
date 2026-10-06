-- Kırşehir Envanter — arıza noktası, köy ve iş grubu (2026.10.01)
-- Canlı veritabanına "ariza_nokta_koy_grup" göçü olarak uygulandı.
-- Ön koşul: SQL-ariza-sunucu-duzeltme.sql
--
-- Arıza bir tesiste olmayabilir (boru hattı, vana, abone bağlantısı): köy ve
-- ilçeyle kaydedilir. Ekip arıza noktasına varınca cihaz konumu arızanın
-- kendi koordinatı olarak yazılır (lat/lon, doğruluk, ne zaman, kim). Köy
-- raporları bu noktayı kullanır. Tesissiz arızaya fotoğraf/ses eklenebilir.

alter table ariza alter column tesis_id drop not null;
alter table ariza
  add column if not exists grup text,
  add column if not exists koy text,
  add column if not exists ilce text,
  add column if not exists lat double precision,
  add column if not exists lon double precision,
  add column if not exists konum_zaman timestamptz,
  add column if not exists konum_dogruluk numeric,
  add column if not exists konum_k bigint references kullanicilar(id);
alter table ariza drop constraint if exists ariza_yer_var;
alter table ariza add constraint ariza_yer_var check (tesis_id is not null or ilce is not null);

drop function if exists public.ariza_kaydet(uuid, bigint, text, bigint, text, ariza_oncelik, ariza_durum, text, text, jsonb, numeric);
create function public.ariza_kaydet(
  p_token uuid, p_id bigint, p_no text, p_tesis_id bigint, p_tur text,
  p_oncelik ariza_oncelik, p_durum ariza_durum, p_ekip text, p_aciklama text,
  p_malzeme jsonb default '[]'::jsonb, p_maliyet numeric default null,
  p_grup text default null, p_koy text default null, p_ilce text default null,
  p_lat double precision default null, p_lon double precision default null,
  p_konum_dogruluk numeric default null)
 returns bigint language plpgsql security definer set search_path to 'public'
as $function$
declare k kullanicilar; il text; yeni bigint; kapali boolean := p_durum::text in ('cozuldu', 'iptal');
  konumVar boolean := p_lat is not null and p_lon is not null;
begin
  if p_tesis_id is not null then
    select t.ilce into il from tesis t where t.id = p_tesis_id;
    if not found then raise exception 'Tesis bulunamadı (%).', p_tesis_id; end if;
  else
    il := nullif(trim(p_ilce), '');
    if il is null then raise exception 'Tesis seçilmediyse ilçe (ve köy) girilmeli.'; end if;
  end if;
  if konumVar and (p_lat not between 38.5 and 40.1 or p_lon not between 33.0 and 35.1) then
    raise exception 'Arıza noktası il sınırı dışında görünüyor (% , %).', p_lat, p_lon;
  end if;
  k := yazma_denetle(p_token, il);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı arıza kaydı yazamaz.'; end if;
  if p_id is null then
    insert into ariza (no, tesis_id, tur, oncelik, durum, ekip, aciklama, malzeme, maliyet, acan_k,
                       kapatan_k, kapandi, grup, koy, ilce, lat, lon, konum_zaman, konum_dogruluk, konum_k)
    values (p_no, p_tesis_id, p_tur, p_oncelik, p_durum, p_ekip, p_aciklama,
            coalesce(p_malzeme, '[]'::jsonb), p_maliyet, k.id,
            case when kapali then k.id end, case when kapali then now() end,
            p_grup, nullif(trim(p_koy), ''), il,
            p_lat, p_lon, case when konumVar then now() end, p_konum_dogruluk, case when konumVar then k.id end)
    returning ariza.id into yeni;
    if not kapali and p_tesis_id is not null then
      update tesis t set durum = 'ariza' where t.id = p_tesis_id and t.durum = 'aktif';
    end if;
    return yeni;
  end if;
  update ariza a
     set tesis_id = p_tesis_id, tur = p_tur, oncelik = p_oncelik, durum = p_durum, ekip = p_ekip,
         aciklama = p_aciklama, malzeme = coalesce(p_malzeme, a.malzeme), maliyet = p_maliyet,
         grup = coalesce(p_grup, a.grup), koy = coalesce(nullif(trim(p_koy), ''), a.koy), ilce = il,
         kapatan_k = case when kapali then coalesce(a.kapatan_k, k.id) else null end,
         kapandi   = case when kapali then coalesce(a.kapandi, now()) else null end,
         lat = case when konumVar then p_lat else a.lat end,
         lon = case when konumVar then p_lon else a.lon end,
         konum_zaman = case when konumVar and (a.lat is distinct from p_lat or a.lon is distinct from p_lon) then now() else a.konum_zaman end,
         konum_dogruluk = case when konumVar then p_konum_dogruluk else a.konum_dogruluk end,
         konum_k = case when konumVar and (a.lat is distinct from p_lat or a.lon is distinct from p_lon) then k.id else a.konum_k end
   where a.id = p_id;
  if not found then raise exception 'Arıza kaydı bulunamadı (%).', p_id; end if;
  if p_tesis_id is not null then
    if kapali then
      if not exists (select 1 from ariza a2 where a2.tesis_id = p_tesis_id and a2.durum::text not in ('cozuldu', 'iptal'))
      then update tesis t set durum = 'aktif' where t.id = p_tesis_id and t.durum = 'ariza'; end if;
    else
      update tesis t set durum = 'ariza' where t.id = p_tesis_id and t.durum = 'aktif';
    end if;
  end if;
  return p_id;
end;
$function$;

drop function if exists public.ariza_listesi(uuid);
create function public.ariza_listesi(p_token uuid)
 returns table(id bigint, no text, tesis_id bigint, tesis_kod text, ilce text, tur text,
   oncelik ariza_oncelik, durum ariza_durum, ekip text, aciklama text, malzeme jsonb,
   maliyet numeric, acan text, acildi timestamptz, kapatan text, kapandi timestamptz,
   yazilabilir boolean, grup text, koy text, tesis_koy text, lat double precision,
   lon double precision, konum_zaman timestamptz, konum_dogruluk numeric, konum_kim text)
 language plpgsql security definer set search_path to 'public'
as $function$
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
     order by a.acildi desc;
end;
$function$;

create or replace function public.foto_ekle(p_token uuid, p_tesis_id bigint, p_adres text, p_boyut integer default null, p_aciklama text default null, p_ariza_id bigint default null)
 returns bigint language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare k kullanicilar; il text; yeni bigint;
begin
  if p_tesis_id is not null then select t.ilce into il from tesis t where t.id = p_tesis_id;
  elsif p_ariza_id is not null then select coalesce(t.ilce, a.ilce) into il from ariza a left join tesis t on t.id = a.tesis_id where a.id = p_ariza_id;
  end if;
  k := yazma_denetle(p_token, il);
  insert into foto (tesis_id, ariza_id, adres, boyut, aciklama, ilce, yukleyen_k, tur)
  values (p_tesis_id, p_ariza_id, p_adres, p_boyut, p_aciklama, il, k.id, 'foto')
  returning foto.id into yeni;
  if p_tesis_id is not null then
    update tesis t
       set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}',
                  to_jsonb((select count(*) from foto f2
                             where f2.tesis_id = p_tesis_id and coalesce(f2.tur,'foto') = 'foto' and f2.silindi is null)))
     where t.id = p_tesis_id;
  end if;
  return yeni;
end;
$function$;

create or replace function public.ses_ekle(p_token uuid, p_tesis_id bigint, p_adres text, p_boyut integer default null, p_sure integer default null, p_aciklama text default null, p_ariza_id bigint default null)
 returns bigint language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare k kullanicilar; il text; yeni bigint;
begin
  if p_tesis_id is not null then select t.ilce into il from tesis t where t.id = p_tesis_id;
  elsif p_ariza_id is not null then select coalesce(t.ilce, a.ilce) into il from ariza a left join tesis t on t.id = a.tesis_id where a.id = p_ariza_id;
  end if;
  k := yazma_denetle(p_token, il);
  insert into foto (tesis_id, ariza_id, adres, boyut, sure, aciklama, ilce, yukleyen_k, tur)
  values (p_tesis_id, p_ariza_id, p_adres, p_boyut, p_sure, p_aciklama, il, k.id, 'ses')
  returning foto.id into yeni;
  return yeni;
end;
$function$;

create or replace function public.ariza_foto_listesi(p_token uuid, p_ariza_id bigint)
 returns table(id bigint, tesis_id bigint, ariza_id bigint, adres text, aciklama text, boyut integer, yukleyen text, yuklendi timestamptz, yazilabilir boolean)
 language plpgsql security definer set search_path to 'public'
as $function$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  return query
    select f.id, f.tesis_id, f.ariza_id, f.adres, f.aciklama, f.boyut,
           kim(f.yukleyen_k), f.yuklendi, yazabilir(k, f.ilce)
      from foto f
     where f.silindi is null and f.ariza_id = p_ariza_id and coalesce(f.tur, 'foto') = 'foto'
     order by f.yuklendi desc;
end;
$function$;

grant execute on function public.ariza_kaydet(uuid, bigint, text, bigint, text, ariza_oncelik, ariza_durum, text, text, jsonb, numeric, text, text, text, double precision, double precision, numeric) to anon, authenticated;
grant execute on function public.ariza_listesi(uuid) to anon, authenticated;
grant execute on function public.ariza_foto_listesi(uuid, bigint) to anon, authenticated;

-- 2026.10.05 (göç ariza_ses_listesi_isemri_koy)
-- Arızaya bağlı sesli notlar (tesissiz arıza dahil) ve iş emri listesinde
-- tesissiz arızanın ilçe/köyü.
create or replace function public.ariza_ses_listesi(p_token uuid, p_ariza_id bigint)
 returns table(id bigint, tesis_id bigint, ariza_id bigint, adres text, aciklama text, boyut integer, sure integer, yukleyen text, yuklendi timestamptz, yazilabilir boolean)
 language plpgsql security definer set search_path to 'public'
as $function$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  return query
    select f.id, f.tesis_id, f.ariza_id, f.adres, f.aciklama, f.boyut, f.sure,
           kim(f.yukleyen_k), f.yuklendi, yazabilir(k, f.ilce)
      from foto f
     where f.silindi is null and f.ariza_id = p_ariza_id and f.tur = 'ses'
     order by f.yuklendi desc;
end;
$function$;
grant execute on function public.ariza_ses_listesi(uuid, bigint) to anon, authenticated;

drop function if exists public.is_emri_listesi(uuid);
create function public.is_emri_listesi(p_token uuid)
 returns table(id bigint, no text, talep_id text, ariza_id bigint, tesis_id bigint, tesis_kod text, ilce text,
   tur text, alt_sistem text, oncelik text, aciklama text, ekip text, araclar jsonb, durum text,
   planlanan_malzeme jsonb, kullanilan_malzeme jsonb, toplam_saat numeric, acan text, acildi timestamptz,
   atayan text, atandi_zaman timestamptz, kapatan text, kapandi timestamptz, surum integer, koy text)
 language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform oturum_sahibi(p_token);
  return query
    select e.id, e.no, e.talep_id, e.ariza_id, e.tesis_id, t.kod, coalesce(t.ilce, a.ilce),
           e.tur, e.alt_sistem, e.oncelik, e.aciklama, e.ekip, e.araclar, e.durum,
           e.planlanan_malzeme, e.kullanilan_malzeme, e.toplam_saat,
           kim(e.acan_k), e.acildi, kim(e.atayan_k), e.atandi_zaman,
           kim(e.kapatan_k), e.kapandi, e.surum, coalesce(a.koy, t.koy)
      from is_emirleri e
      left join tesis t on t.id = e.tesis_id
      left join ariza a on a.id = e.ariza_id
     order by e.acildi desc;
end;
$function$;
grant execute on function public.is_emri_listesi(uuid) to anon, authenticated;
