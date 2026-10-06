-- Kırşehir Envanter — yeni modüllerin tabloları
-- Ambar, ekip, araç, dış talep ve denetim izi
-- Supabase > SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zarar vermez.
--
-- ÖNEMLİ: bu dosya yalnızca tabloları kurar. Program şu an bu verileri
-- cihazda (tarayıcıda) saklıyor; sunucuya yazma bir sonraki sürümde
-- açılacak. Tabloları şimdiden kurmanız sorun çıkarmaz, boş dururlar.

-- ─────────────────────────────────────────────────────────────
-- 1. EKİPLER — vardiya ve yetkinlik
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ekipler (
  ad          text primary key,
  vardiya     text not null default 'Gündüz',
  yetkinlik   text[] not null default '{}',
  guncelleyen text,
  guncelleme  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. AMBAR — mevcut, zimmet ve hareket dökümü
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ambar_stok (
  id          bigserial primary key,
  ambar       text not null,
  malzeme     text not null,
  birim       text not null default 'adet',
  miktar      numeric not null default 0,
  guncelleme  timestamptz not null default now(),
  unique (ambar, malzeme)
);

create table if not exists public.ambar_zimmet (
  id          bigserial primary key,
  ekip        text not null,
  malzeme     text not null,
  birim       text not null default 'adet',
  miktar      numeric not null default 0,
  guncelleme  timestamptz not null default now(),
  unique (ekip, malzeme)
);

create table if not exists public.ambar_hareket (
  id        bigserial primary key,
  tur       text not null check (tur in ('giris','cikis','zimmet','iade','sarf')),
  malzeme   text not null,
  adet      numeric not null,
  birim     text not null default 'adet',
  ambar     text,
  ekip      text,
  ariza_no  text,
  not_      text,
  kim       text,
  olusma    timestamptz not null default now()
);
create index if not exists ambar_hareket_zaman on public.ambar_hareket (olusma desc);

-- ─────────────────────────────────────────────────────────────
-- 3. ARAÇ VE EKİPMAN
-- ─────────────────────────────────────────────────────────────
create table if not exists public.araclar (
  id         text primary key,
  ad         text not null,
  tur        text not null,
  plaka      text,
  yil        text,
  sayac      numeric not null default 0,
  muayene    date,
  durum      text not null default 'musait'
             check (durum in ('musait','gorevde','bakimda','arizali','disi')),
  ekip       text,
  surucu     text,
  is_        text,
  guncelleme timestamptz not null default now()
);

create table if not exists public.arac_hareket (
  id       bigserial primary key,
  arac_id  text references public.araclar (id) on delete set null,
  arac     text not null,
  plaka    text,
  ne       text not null,
  detay    text,
  kim      text,
  olusma   timestamptz not null default now()
);
create index if not exists arac_hareket_zaman on public.arac_hareket (olusma desc);

-- ─────────────────────────────────────────────────────────────
-- 4. DIŞ TALEPLER — muhtar / vatandaş bildirimleri
-- ─────────────────────────────────────────────────────────────
create table if not exists public.talepler (
  id         text primary key,
  no         text not null unique,
  ad         text not null,
  tel        text,
  sifat      text not null default 'vatandas'
             check (sifat in ('muhtar','vatandas','kurum','personel')),
  kanal      text not null default 'telefon'
             check (kanal in ('telefon','whatsapp','dilekce','sahsen','eposta','cimer')),
  ilce       text,
  koy        text not null,
  konu       text not null,
  oncelik    text not null default 'Normal',
  aciklama   text not null,
  durum      text not null default 'yeni'
             check (durum in ('yeni','incelemede','arizaya','cozuldu','red')),
  sonuc      text,
  ariza_no   text,
  alan       text,
  acilis     timestamptz not null default now(),
  guncelleme timestamptz not null default now()
);
create index if not exists talepler_durum on public.talepler (durum, acilis desc);
create index if not exists talepler_koy on public.talepler (koy);

-- ─────────────────────────────────────────────────────────────
-- 5. DENETİM İZİ — silinemez işlem kaydı
-- ─────────────────────────────────────────────────────────────
create table if not exists public.denetim (
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
create index if not exists denetim_zaman on public.denetim (olusma desc);
create index if not exists denetim_kim on public.denetim (kim);

-- Denetim izi değiştirilemez ve silinemez: yalnızca ekleme serbest
create or replace function public.denetim_kilit() returns trigger
language plpgsql as $$
begin
  raise exception 'Denetim izi değiştirilemez ve silinemez.';
end;
$$;

drop trigger if exists denetim_degistirilemez on public.denetim;
create trigger denetim_degistirilemez
  before update or delete on public.denetim
  for each row execute function public.denetim_kilit();

-- ─────────────────────────────────────────────────────────────
-- 6. ERİŞİM KURALLARI (RLS)
-- Giriş yapmış her kullanıcı okur ve yazar; denetim izinde
-- yalnızca ekleme serbesttir (yukarıdaki tetikleyici de korur).
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['ekipler','ambar_stok','ambar_zimmet','ambar_hareket',
                           'araclar','arac_hareket','talepler','denetim']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_oku', t);
    execute format('drop policy if exists %I on public.%I', t || '_yaz', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['ekipler','ambar_stok','ambar_zimmet','ambar_hareket',
                           'araclar','arac_hareket','talepler']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_yaz', t);
  end loop;
end $$;

create policy denetim_oku on public.denetim
  for select to authenticated using (true);
create policy denetim_yaz on public.denetim
  for insert to authenticated with check (true);
