-- 2026-10-09 — cop_temizle: fotoğraf sayacı yalnızca DEĞİŞEN kayıtlarda güncellenir.
-- Hata: her çağrıda (program her 30 sn'de bir veriyi yenilerken çağırıyor) bütün tesislerin veri alanı
-- yeniden yazılıyor, "surum" ve değişiklik geçmişi (gecmis) şişiyordu. Kullanıcı bir kaydı düzenleyip
-- kaydettiğinde ekrandaki sürüm hep eskimiş oluyor, sunucu "başkası değiştirdi" diye reddediyor,
-- program da sessizce sunucudaki eski veriyi geri yüklüyordu (girilen alanlar kayboluyordu).
create or replace function public.cop_temizle(p_token uuid)
 returns table(silinen_tesis integer, silinen_foto integer, adresler text[])
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  delete from _gecen where id is not null;
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
  -- fotoğraf sayaçlarını tazele: yalnız sayısı gerçekten değişenler
  update tesis t
     set veri = jsonb_set(coalesce(t.veri,'{}'::jsonb), '{photos}', to_jsonb(c.n))
    from (select t2.id, (select count(*) from foto f2
                          where f2.tesis_id = t2.id and f2.silindi is null) as n
            from tesis t2 where t2.silindi is null) c
   where t.id = c.id
     and (t.veri->>'photos') is distinct from c.n::text;
  return query select t_say, f_say, adr;
end;
$function$;
