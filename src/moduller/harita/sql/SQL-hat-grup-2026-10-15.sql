-- Hat grupları: her hat parçası bir gruba ("Hat 1", "Hat 2", "Ana boru" ya da proje adı) bağlanır;
-- harita grubu kendi rengiyle çizer, katman menüsünden grup grup açılıp kapanır.
-- Uygulandı 2026-10-15 (Supabase migration "hat_grup_sutunu").
alter table hat add column if not exists grup text;

drop function if exists public.hat_listesi(uuid);
create function public.hat_listesi(p_token uuid)
 returns table(id bigint, tesis_id bigint, tur hat_turu, noktalar jsonb, aciklama text, olusturan text, olusturuldu timestamp with time zone, grup text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform oturum_sahibi(p_token);
  return query select h.id, h.tesis_id, h.tur, h.noktalar, h.aciklama, kim(h.olusturan_k), h.olusturuldu, h.grup
    from hat h order by h.tesis_id, h.id;
end;
$function$;

create or replace function public.hat_kaydet(p_token uuid, p_tesis_id bigint, p_hatlar jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare t tesis; k kullanicilar; r jsonb; n int := 0;
begin
  select * into t from tesis where id = p_tesis_id;
  if t.id is null then raise exception 'Tesis bulunamadı.'; end if;
  k := yazma_denetle(p_token, t.ilce);
  if not rol_yetkisi(k, 'create') then raise exception 'Hat çizimini yalnızca mühendis, müdür ve yönetici yapar.'; end if;
  delete from hat where tesis_id = p_tesis_id;
  for r in select * from jsonb_array_elements(coalesce(p_hatlar, '[]'::jsonb)) loop
    insert into hat (tesis_id, tur, noktalar, aciklama, grup, olusturan_k, guncelleyen_k, guncellendi)
    values (p_tesis_id, (r->>'tur')::hat_turu, r->'noktalar', r->>'aciklama', nullif(trim(r->>'grup'), ''), k.id, k.id, now());
    n := n + 1;
  end loop;
  return n;
end;
$function$;

-- Eşrefli (KS-DEP-0013) hatlarının grubu açıklamadan atandı
update hat set grup = case
  when aciklama like '%Hat 1 ve Hat 2 ortak ana boru%' then 'Ana boru'
  when aciklama like '%· Hat 1 ·%' then 'Hat 1'
  when aciklama like '%· Hat 2 ·%' then 'Hat 2' end
where tesis_id = (select id from tesis where kod = 'KS-DEP-0013') and grup is null;
