-- ══════════════════════════════════════════════════════════════════
-- ÇÖP KUTUSU — kalıcı silme, 30 gün otomatik temizlik ve fotoğraf
-- Bu dosyayı Supabase > SQL Editor'de bir kez çalıştırın.
-- ortak-veri.sql ve fotograf.sql çalıştırılmış olmalı.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. FOTOĞRAF: silme artık yumuşak silme ────────────────────────
alter table foto add column if not exists silindi timestamptz;
alter table foto add column if not exists silen_k bigint references kullanicilar(id);
create index if not exists foto_silindi_idx on foto(silindi);

-- Listede yalnızca silinmemiş fotoğraflar görünür
create or replace function foto_listesi(p_token uuid, p_tesis_id bigint default null)
returns table (id bigint, tesis_id bigint, ariza_id bigint, adres text,
               aciklama text, boyut int, yukleyen text, yuklendi timestamptz,
               yazilabilir boolean)
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select f.id, f.tesis_id, f.ariza_id, f.adres, f.aciklama, f.boyut,
           kim(f.yukleyen_k), f.yuklendi, yazabilir(k, t.ilce)
      from foto f left join tesis t on t.id = f.tesis_id
     where f.silindi is null
       and (p_tesis_id is null or f.tesis_id = p_tesis_id)
     order by f.yuklendi desc;
end;
$$;

-- Sil: dosya Storage'da kalır, kayda damga vurulur (30 gün geri alınabilir)
create or replace function foto_sil(p_token uuid, p_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; il text; tid bigint;
begin
  select t.ilce, f.tesis_id into il, tid
    from foto f left join tesis t on t.id = f.tesis_id where f.id = p_id;
  k := yazma_denetle(p_token, il);
  update foto f set silindi = now(), silen_k = k.id where f.id = p_id;
  update tesis t
     set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}',
                to_jsonb((select count(*) from foto f2
                           where f2.tesis_id = tid and f2.silindi is null)))
   where t.id = tid;
  return null;   -- Storage'dan silme yok: dosya çöp kutusunda bekliyor
end;
$$;

create or replace function foto_geri_al(p_token uuid, p_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare il text; tid bigint;
begin
  select t.ilce, f.tesis_id into il, tid
    from foto f left join tesis t on t.id = f.tesis_id where f.id = p_id;
  perform yazma_denetle(p_token, il);
  update foto f set silindi = null, silen_k = null where f.id = p_id;
  update tesis t
     set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}',
                to_jsonb((select count(*) from foto f2
                           where f2.tesis_id = tid and f2.silindi is null)))
   where t.id = tid;
  return found;
end;
$$;

-- Kalıcı sil: kaydı düşürür, Storage adresini programa döndürür
create or replace function foto_kalici_sil(p_token uuid, p_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; il text; tid bigint; adr text;
begin
  select t.ilce, f.tesis_id, f.adres into il, tid, adr
    from foto f left join tesis t on t.id = f.tesis_id where f.id = p_id;
  k := yazma_denetle(p_token, il);
  if k.rol not in ('yonetici','mudur') then
    raise exception 'Kalıcı silme yetkisi yalnızca Yönetici ve Müdürde';
  end if;
  delete from foto f where f.id = p_id;
  update tesis t
     set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}',
                to_jsonb((select count(*) from foto f2
                           where f2.tesis_id = tid and f2.silindi is null)))
   where t.id = tid;
  return adr;
end;
$$;

-- ── 2. KAYIT: kalıcı silme ────────────────────────────────────────
create or replace function tesis_kalici_sil(p_token uuid, p_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; il text;
begin
  select t.ilce into il from tesis t where t.id = p_id;
  k := yazma_denetle(p_token, il);
  if k.rol not in ('yonetici','mudur') then
    raise exception 'Kalıcı silme yetkisi yalnızca Yönetici ve Müdürde';
  end if;
  delete from foto      f where f.tesis_id = p_id;
  delete from deneme    d where d.tesis_id = p_id;
  delete from saha_notu n where n.tesis_id = p_id;
  delete from ariza     a where a.tesis_id = p_id;
  delete from tesis     t where t.id = p_id;
  return found;
end;
$$;

-- ── 3. ÇÖP KUTUSU LİSTELERİ ───────────────────────────────────────
create or replace function foto_cop_listesi(p_token uuid)
returns table (id bigint, tesis_id bigint, kod text, ilce text, koy text, adres text,
               tur text, boyut int, silindi timestamptz, silen text, kalan_gun int,
               yazilabilir boolean)
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select f.id, f.tesis_id, t.kod, t.ilce, t.koy, f.adres, coalesce(f.tur,'foto'), f.boyut,
           f.silindi, kim(f.silen_k),
           greatest(0, 30 - extract(day from now() - f.silindi)::int),
           yazabilir(k, t.ilce)
      from foto f left join tesis t on t.id = f.tesis_id
     where f.silindi is not null order by f.silindi desc;
end;
$$;

-- Sesli notlar da aynı tabloda durur — silinmiş olanlar listeden düşer
create or replace function ek_listesi(p_token uuid, p_tesis_id bigint default null)
returns table (id bigint, tesis_id bigint, tur text, adres text, aciklama text,
               boyut int, sure int, yukleyen text, yuklendi timestamptz,
               yazilabilir boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  return query
    select f.id, f.tesis_id, coalesce(f.tur,'foto'), f.adres, f.aciklama,
           f.boyut, f.sure, kim(f.yukleyen_k), f.yuklendi, yazabilir(k, t.ilce)
      from foto f left join tesis t on t.id = f.tesis_id
     where f.silindi is null
       and (p_tesis_id is null or f.tesis_id = p_tesis_id)
     order by f.yuklendi desc;
end;
$$;

-- ── 4. 30 GÜN OTOMATİK TEMİZLİK ───────────────────────────────────
-- Program her veri yenilemesinde bunu çağırır; süresi geçen kayıtlar
-- ve fotoğraflar kalıcı silinir. Dönen adresler Storage'dan silinir.
create or replace function cop_temizle(p_token uuid)
returns table (silinen_tesis int, silinen_foto int, adresler text[])
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; t_say int := 0; f_say int := 0; adr text[] := '{}';
begin
  k := oturum_sahibi(p_token);

  -- süresi geçmiş fotoğraflar
  select coalesce(array_agg(f.adres), '{}') into adr
    from foto f where f.silindi is not null and f.silindi < now() - interval '30 days';
  with d as (
    delete from foto f
     where f.silindi is not null and f.silindi < now() - interval '30 days'
    returning 1)
  select count(*) into f_say from d;

  -- süresi geçmiş kayıtlar (bağlı satırlarıyla birlikte)
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

  -- fotoğraf sayaçlarını tazele
  update tesis t
     set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}',
                to_jsonb((select count(*) from foto f2
                           where f2.tesis_id = t.id and f2.silindi is null)))
   where t.silindi is null;

  return query select t_say, f_say, adr;
end;
$$;

-- ── 5. YETKİLER ───────────────────────────────────────────────────
grant execute on function foto_listesi(uuid, bigint)     to anon, authenticated;
grant execute on function ek_listesi(uuid, bigint)       to anon, authenticated;
grant execute on function foto_sil(uuid, bigint)         to anon, authenticated;
grant execute on function foto_geri_al(uuid, bigint)     to anon, authenticated;
grant execute on function foto_kalici_sil(uuid, bigint)  to anon, authenticated;
grant execute on function foto_cop_listesi(uuid)         to anon, authenticated;
grant execute on function tesis_kalici_sil(uuid, bigint) to anon, authenticated;
grant execute on function cop_temizle(uuid)              to anon, authenticated;
