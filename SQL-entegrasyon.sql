-- Kırşehir Envanter — Ayarlar > Entegrasyon (2026.10.05)
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Önkoşul: oturum_sahibi.
--
-- Dış servis anahtarları (şimdilik yapay zekâ sınıflandırma anahtarı) sunucuda
-- saklanır. Tarayıcıya hiçbir zaman geri gönderilmez: program yalnız
-- "kayıtlı mı" ve son 4 karakteri görür. Yazma yalnız yönetici hesabıyla.
-- Anahtarı yalnızca Edge Function (service role) okur.

create table if not exists entegrasyon (
  ad text primary key check (ad in ('anthropic_api_anahtari')),
  deger text not null,
  guncelleme timestamptz not null default now(),
  guncelleyen_k bigint
);
alter table entegrasyon enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='entegrasyon' and policyname='entegrasyon_kapali') then
    create policy entegrasyon_kapali on entegrasyon for all using (false) with check (false);
  end if;
end $$;

create or replace function entegrasyon_listesi(p_token uuid)
returns table(ad text, dolu boolean, son4 text, guncelleme timestamptz, guncelleyen text)
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.rol::text not in ('yonetici','mudur') then
    raise exception 'Entegrasyon ayarlarını yalnızca yönetici ve müdür görür.';
  end if;
  return query
    select e.ad, true, right(e.deger, 4), e.guncelleme, kim(e.guncelleyen_k)
      from entegrasyon e;
end;
$$;

create or replace function entegrasyon_kaydet(p_token uuid, p_ad text, p_deger text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; d text := trim(coalesce(p_deger,''));
begin
  k := oturum_sahibi(p_token);
  if k.rol::text <> 'yonetici' then
    raise exception 'Entegrasyon anahtarını yalnızca yönetici değiştirir.';
  end if;
  if p_ad not in ('anthropic_api_anahtari') then raise exception 'Bilinmeyen entegrasyon.'; end if;
  if d = '' then
    delete from entegrasyon where ad = p_ad;
    return true;
  end if;
  if p_ad = 'anthropic_api_anahtari' and (d !~ '^sk-ant-' or length(d) < 30) then
    raise exception 'Bu bir Anthropic API anahtarına benzemiyor (sk-ant- ile başlamalı).';
  end if;
  insert into entegrasyon (ad, deger, guncelleyen_k) values (p_ad, d, k.id)
  on conflict (ad) do update set deger = excluded.deger, guncelleme = now(), guncelleyen_k = k.id;
  return true;
end;
$$;
