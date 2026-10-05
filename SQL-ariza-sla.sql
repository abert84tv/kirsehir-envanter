-- Kırşehir Envanter — Arıza SLA, bekleme, ana arıza ve planlı iş (2026.10.05)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Önkoşul: oturum_sahibi,
-- yazma_denetle, ariza tablosu.
--
-- ariza tablosuna dokunmadan, arıza başına ek bilgiyi ayrı tabloda tutar:
--   * SLA: arıza başına hedef gün sayısı (boşsa önceliğe göre varsayılan) ya da
--     SLA dışı işareti — yalnızca yönetici, müdür, mühendis, şef değiştirir.
--   * Bekleme: dış kurum / malzeme / hava beklerken geçen süre SLA'dan düşülür.
--   * Ana arıza: aynı kök nedene bağlı ihbarlar bir ana arızaya bağlanır.
--   * Planlı zaman: ileri tarihli iş.

create table if not exists ariza_ek (
  ariza_id bigint primary key references ariza(id) on delete cascade,
  sla_gun integer check (sla_gun between 0 and 365),
  sla_iptal boolean not null default false,
  sla_not text,
  bekleme_bas timestamptz,
  bekleme_dk integer not null default 0 check (bekleme_dk >= 0),
  bekleme_neden text,
  ana_ariza_id bigint references ariza(id) on delete set null,
  planli_zaman timestamptz,
  guncelleme timestamptz not null default now(),
  guncelleyen_k bigint
);
create index if not exists ariza_ek_ana on ariza_ek (ana_ariza_id) where ana_ariza_id is not null;
alter table ariza_ek enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='ariza_ek' and policyname='ariza_ek_kapali') then
    create policy ariza_ek_kapali on ariza_ek for all using (false) with check (false);
  end if;
end $$;

create or replace function ariza_ek_listesi(p_token uuid)
returns table(
  ariza_id bigint, sla_gun integer, sla_iptal boolean, sla_not text, bekleme_bas timestamptz,
  bekleme_dk integer, bekleme_neden text, ana_ariza_id bigint, planli_zaman timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  perform oturum_sahibi(p_token);
  return query
    select e.ariza_id, e.sla_gun, e.sla_iptal, e.sla_not, e.bekleme_bas, e.bekleme_dk,
           e.bekleme_neden, e.ana_ariza_id, e.planli_zaman
      from ariza_ek e;
end;
$$;

create or replace function ariza_ek_kaydet(
  p_token uuid, p_ariza_id bigint, p_sla_gun integer, p_sla_iptal boolean, p_sla_not text,
  p_bekleme_bas timestamptz, p_bekleme_dk integer, p_bekleme_neden text,
  p_ana_id bigint, p_planli timestamptz)
returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; il text; eski ariza_ek; yetkili boolean; var_mi boolean;
begin
  select coalesce(t.ilce, a.ilce) into il from ariza a left join tesis t on t.id = a.tesis_id where a.id = p_ariza_id;
  if not found then raise exception 'Arıza kaydı bulunamadı.'; end if;
  k := yazma_denetle(p_token, il);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı arıza kaydı yazamaz.'; end if;
  yetkili := k.rol::text in ('yonetici','mudur','muhendis','sef');
  select * into eski from ariza_ek where ariza_ek.ariza_id = p_ariza_id;
  var_mi := found;
  -- SLA süresini ve SLA dışı işaretini yalnızca yetkili roller değiştirir
  if (var_mi and (p_sla_gun is distinct from eski.sla_gun or coalesce(p_sla_iptal,false) is distinct from eski.sla_iptal))
     or (not var_mi and (p_sla_gun is not null or coalesce(p_sla_iptal,false))) then
    if not yetkili then
      raise exception 'SLA süresini yalnızca yönetici, müdür, mühendis ya da şef değiştirir.';
    end if;
  end if;
  if p_ana_id is not null and p_ana_id = p_ariza_id then raise exception 'Arıza kendisine bağlanamaz.'; end if;
  insert into ariza_ek (ariza_id, sla_gun, sla_iptal, sla_not, bekleme_bas, bekleme_dk, bekleme_neden,
                        ana_ariza_id, planli_zaman, guncelleyen_k)
  values (p_ariza_id, p_sla_gun, coalesce(p_sla_iptal,false), nullif(trim(coalesce(p_sla_not,'')),''),
          p_bekleme_bas, greatest(coalesce(p_bekleme_dk,0),0), nullif(trim(coalesce(p_bekleme_neden,'')),''),
          p_ana_id, p_planli, k.id)
  on conflict (ariza_id) do update
    set sla_gun = excluded.sla_gun, sla_iptal = excluded.sla_iptal, sla_not = excluded.sla_not,
        bekleme_bas = excluded.bekleme_bas, bekleme_dk = excluded.bekleme_dk,
        bekleme_neden = excluded.bekleme_neden, ana_ariza_id = excluded.ana_ariza_id,
        planli_zaman = excluded.planli_zaman, guncelleme = now(), guncelleyen_k = k.id;
  return true;
end;
$$;
