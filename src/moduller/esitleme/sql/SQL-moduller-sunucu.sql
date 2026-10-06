-- Kırşehir Envanter — yedi modülün sunucuya taşınması
-- Ambar, araç, dış talep, ekip, personel, nöbet ve denetim izi
--
-- Supabase > SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zarar vermez.
-- oturum.sql, kullanicilar.sql ve ortak-veri.sql önceden çalıştırılmış olmalı:
-- bu dosya onların oturum_sahibi() ve kullanicilar yapısını kullanır.
--
-- (Daha önce SQL-yeni-moduller.sql'i çalıştırdıysanız sorun değil — o dosyanın
-- kurduğu tablolar boş kalır, program bu dosyadaki yapıyı kullanır.)
--
-- Neden anahtarlı tek tablo: bu altı modülün her biri programda tek bir liste
-- olarak tutuluyor ve toptan yazılıyor. Ayrı ayrı tablo açmak yerine ortak bir
-- tablo hem az kod hem ileride yeni modül eklemeyi kolaylaştırır. Denetim izi
-- ayrı tutulur: satır satır eklenir ve hiç değiştirilmez.

-- ══════════ 1. ORTAK MODÜL VERİSİ ══════════
create table if not exists kurum_veri (
  anahtar     text primary key,
  veri        jsonb not null default '[]'::jsonb,
  surum       bigint not null default 1,
  guncelleyen text,
  guncelleme  timestamptz not null default now()
);

comment on table kurum_veri is
  'Modül listeleri: ekip, personel, nobet, ambar, arac, talep. Anahtar başına tek satır.';

alter table kurum_veri enable row level security;
-- Politika yok: tabloya doğrudan erişim kapalı, geçiş aşağıdaki fonksiyonlardan.

-- ══════════ 2. DENETİM İZİ ══════════
create table if not exists denetim (
  id         bigserial primary key,
  sinif      text not null,
  ne         text not null,
  detay      text,
  kapsam     text,
  kim        text,
  rol        text,
  nereden    text,
  cevrimdisi boolean not null default false,
  olusma     timestamptz not null default now()
);
create index if not exists denetim_zaman on denetim (olusma desc);
create index if not exists denetim_kim on denetim (kim);
create index if not exists denetim_sinif on denetim (sinif);

alter table denetim enable row level security;

-- Denetim izi değiştirilemez ve silinemez: yalnızca ekleme serbest
create or replace function denetim_kilit() returns trigger
language plpgsql as $$
begin
  raise exception 'Denetim izi değiştirilemez ve silinemez.';
end;
$$;

drop trigger if exists denetim_degistirilemez on denetim;
create trigger denetim_degistirilemez
  before update or delete on denetim
  for each row execute function denetim_kilit();

-- ══════════ 3. MODÜL VERİSİ — OKUMA ══════════

-- Tek anahtarı okur
create or replace function veri_oku(p_token uuid, p_anahtar text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; v jsonb;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  select veri into v from kurum_veri where anahtar = p_anahtar;
  return coalesce(v, '[]'::jsonb);
end;
$$;

-- Bütün modülleri tek çağrıda okur: { "ekip": [...], "personel": [...], ... }
create or replace function veri_hepsi(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; v jsonb;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  select coalesce(jsonb_object_agg(anahtar, veri), '{}'::jsonb) into v from kurum_veri;
  return v;
end;
$$;

-- ══════════ 4. MODÜL VERİSİ — YAZMA ══════════
create or replace function veri_yaz(p_token uuid, p_anahtar text, p_veri jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; s bigint;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;

  if p_anahtar not in ('ekip', 'personel', 'nobet', 'ambar', 'arac', 'talep') then
    raise exception 'Tanımsız veri anahtarı: %', p_anahtar;
  end if;

  -- Ekip, personel ve nöbet kurum düzeni sayılır: müdür ve yönetici belirler
  if p_anahtar in ('ekip', 'personel', 'nobet') and k.rol not in ('yonetici', 'mudur') then
    raise exception 'Ekip ve personel düzenini yalnızca müdür ve yönetici değiştirebilir.';
  end if;

  -- Ambar, araç ve talep saha işidir: izleyici dışında herkes yazabilir
  if p_anahtar in ('ambar', 'arac', 'talep') and k.rol = 'izleyici' then
    raise exception 'İzleyici hesabı kayıt değiştiremez.';
  end if;

  insert into kurum_veri (anahtar, veri, surum, guncelleyen, guncelleme)
  values (p_anahtar, coalesce(p_veri, '[]'::jsonb), 1, k.ad, now())
  on conflict (anahtar) do update
    set veri = coalesce(p_veri, '[]'::jsonb),
        surum = kurum_veri.surum + 1,
        guncelleyen = k.ad,
        guncelleme = now()
  returning surum into s;

  return jsonb_build_object('ok', true, 'anahtar', p_anahtar, 'surum', s);
end;
$$;

-- ══════════ 5. DENETİM İZİ — YAZMA VE OKUMA ══════════

-- Tek satır. Kim ve rol sunucuda belirlenir, programdan gelmez.
create or replace function denetim_ekle(
  p_token uuid, p_sinif text, p_ne text, p_detay text,
  p_kapsam text, p_nereden text, p_cevrimdisi boolean)
returns bigint
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; y bigint;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  insert into denetim (sinif, ne, detay, kapsam, kim, rol, nereden, cevrimdisi)
  values (coalesce(p_sinif, 'veri'), coalesce(p_ne, '—'), p_detay, p_kapsam,
          k.ad, k.rol::text, p_nereden, coalesce(p_cevrimdisi, false))
  returning id into y;
  return y;
end;
$$;

-- Çevrimdışı biriken satırları tek çağrıda yazar
create or replace function denetim_toplu(p_token uuid, p_satirlar jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare k kullanicilar; r jsonb; n integer := 0;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_satirlar, '[]'::jsonb))
  loop
    insert into denetim (sinif, ne, detay, kapsam, kim, rol, nereden, cevrimdisi, olusma)
    values (
      coalesce(r->>'sinif', 'veri'),
      coalesce(r->>'ne', '—'),
      r->>'detay',
      r->>'kapsam',
      coalesce(r->>'kim', k.ad),
      coalesce(r->>'rol', k.rol::text),
      r->>'nereden',
      coalesce((r->>'cevrimdisi')::boolean, false),
      coalesce((r->>'iso')::timestamptz, now())
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- En yeniden başlayarak liste
create or replace function denetim_listesi(p_token uuid, p_limit integer)
returns table (id bigint, sinif text, ne text, detay text, kapsam text,
               kim text, rol text, nereden text, cevrimdisi boolean, olusma timestamptz)
language plpgsql security definer set search_path = public as $$
declare k kullanicilar;
begin
  k := oturum_sahibi(p_token);
  if k.id is null then raise exception 'Oturum geçersiz — çıkıp yeniden girin.'; end if;
  return query
    select d.id, d.sinif, d.ne, d.detay, d.kapsam, d.kim, d.rol, d.nereden,
           d.cevrimdisi, d.olusma
    from denetim d
    order by d.olusma desc, d.id desc
    limit least(coalesce(p_limit, 500), 3000);
end;
$$;

-- ══════════ 6. ÇAĞRI YETKİSİ ══════════
revoke all on function veri_oku(uuid, text) from public, anon, authenticated;
revoke all on function veri_hepsi(uuid) from public, anon, authenticated;
revoke all on function veri_yaz(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function denetim_ekle(uuid, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function denetim_toplu(uuid, jsonb) from public, anon, authenticated;
revoke all on function denetim_listesi(uuid, integer) from public, anon, authenticated;

grant execute on function veri_oku(uuid, text) to anon, authenticated;
grant execute on function veri_hepsi(uuid) to anon, authenticated;
grant execute on function veri_yaz(uuid, text, jsonb) to anon, authenticated;
grant execute on function denetim_ekle(uuid, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function denetim_toplu(uuid, jsonb) to anon, authenticated;
grant execute on function denetim_listesi(uuid, integer) to anon, authenticated;

-- ══════════ 7. BAŞLANGIÇ SATIRLARI ══════════
insert into kurum_veri (anahtar, veri) values
  ('ekip', '[]'::jsonb), ('personel', '[]'::jsonb), ('nobet', '{}'::jsonb),
  ('ambar', '{}'::jsonb), ('arac', '{}'::jsonb), ('talep', '[]'::jsonb)
on conflict (anahtar) do nothing;
