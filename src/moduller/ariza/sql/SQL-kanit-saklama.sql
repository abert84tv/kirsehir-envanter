-- Kırşehir Envanter — KVKK saklama politikası: envanter fotoğrafı ömür boyu,
-- arıza kanıtı (foto/ses) en az 2 yıl (2026.09.30)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Önkoşul: SQL-cop-kutusu.sql
-- (cop_temizle, foto_cop_listesi, foto_ekle, ses_ekle oradan geliyor).
--
-- Ne değişti: foto tablosunda tesis_id/ariza_id ayrımı zaten vardı ama
-- kullanılmıyordu — arıza kanıtları da yalnız tesis_id ile yükleniyordu,
-- envanter fotoğrafından ayırt edilemiyordu. Artık istemci (index.html)
-- arıza kanıtı yüklerken ariza_id'yi de gönderiyor; bu dosya sunucu
-- tarafını tamamlıyor: cop_temizle() her çalıştığında (uygulama zaten
-- düzenli çağırıyor — 30 saniyede bir sessiz tazeleme dahil) 2 yılı dolan
-- arıza kanıtlarını otomatik çöp kutusuna düşürüyor; envanter fotoğrafı
-- (ariza_id boş) hiç dokunulmuyor, yalnız elle silinene kadar durur.
-- Otomatik düşenler mevcut 30 günlük geri-alma penceresinden aynen geçer.

create or replace function cop_temizle(p_token uuid)
returns table(silinen_tesis integer, silinen_foto integer, adresler text[])
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; t_say int := 0; f_say int := 0; adr text[] := '{}'; otomatik int := 0;
begin
  k := oturum_sahibi(p_token);

  with d as (
    update foto f
       set silindi = now()
     where f.ariza_id is not null
       and f.silindi is null
       and coalesce(f.cekildi, f.yuklendi) < now() - interval '2 years'
    returning 1)
  select count(*) into otomatik from d;
  if otomatik > 0 then
    insert into denetim (sinif, ne, detay, kim, rol, nereden, cevrimdisi)
    values ('kvkk', 'Saklama süresi doldu', otomatik || ' arıza kanıtı (2 yıl) otomatik çöp kutusuna taşındı', k.ad, k.rol::text, 'program', false);
  end if;

  select coalesce(array_agg(f.adres), '{}') into adr
    from foto f where f.silindi is not null and f.silindi < now() - interval '30 days';
  with d as (
    delete from foto f
     where f.silindi is not null and f.silindi < now() - interval '30 days'
    returning 1)
  select count(*) into f_say from d;

  create temp table if not exists _gecen (id bigint) on commit drop;
  delete from _gecen;
  insert into _gecen
    select t.id from tesis t
     where t.silindi is not null and t.silindi < now() - interval '30 days';

  select coalesce(adr || array_agg(f.adres), adr) into adr
    from foto f where f.tesis_id in (select id from _gecen);

  delete from foto      f where f.tesis_id in (select id from _gecen);
  delete from deneme    d where d.tesis_id in (select id from _gecen);
  delete from saha_notu n where n.tesis_id in (select id from _gecen);
  delete from ariza     a where a.tesis_id in (select id from _gecen);
  with d as (delete from tesis t where t.id in (select id from _gecen) returning 1)
  select count(*) into t_say from d;

  update tesis t
     set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}',
                to_jsonb((select count(*) from foto f2
                           where f2.tesis_id = t.id and f2.silindi is null)))
   where t.silindi is null;

  return query select t_say, f_say, adr;
end;
$$;

create or replace function foto_cop_listesi(p_token uuid)
returns table(id bigint, tesis_id bigint, kod text, ilce text, koy text, adres text,
  tur text, boyut integer, silindi timestamptz, silen text, kalan_gun integer, yazilabilir boolean)
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select f.id, f.tesis_id, t.kod, t.ilce, t.koy, f.adres, coalesce(f.tur,'foto'), f.boyut,
           f.silindi,
           case when f.silen_k is null and f.ariza_id is not null
                then 'Otomatik — saklama süresi doldu (2 yıl)'
                else kim(f.silen_k) end,
           greatest(0, 30 - extract(day from now() - f.silindi)::int),
           yazabilir(k, t.ilce)
      from foto f left join tesis t on t.id = f.tesis_id
     where f.silindi is not null order by f.silindi desc;
end;
$$;

-- ses_ekle'ye p_ariza_id eklendi (foto_ekle'de zaten vardı, ses tarafında
-- unutulmuştu). Eski 6 parametreli sürüm düşürülüyor ki iki sürüm birden
-- kalıp "hangi fonksiyon" belirsizliği yaratmasın.
drop function if exists ses_ekle(uuid, bigint, text, integer, integer, text);
create or replace function ses_ekle(p_token uuid, p_tesis_id bigint, p_adres text,
  p_boyut integer default null, p_sure integer default null, p_aciklama text default null,
  p_ariza_id bigint default null)
returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare k kullanicilar; il text; yeni bigint;
begin
  select t.ilce into il from tesis t where t.id = p_tesis_id;
  k := yazma_denetle(p_token, il);
  insert into foto (tesis_id, ariza_id, adres, boyut, sure, aciklama, ilce, yukleyen_k, tur)
  values (p_tesis_id, p_ariza_id, p_adres, p_boyut, p_sure, p_aciklama, il, k.id, 'ses')
  returning foto.id into yeni;
  return yeni;
end;
$$;
