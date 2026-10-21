-- 2026-10-21 — service_role yetkisi (UYGULANMADI: onay bekliyor; 30 Ekim 2026'dan önce uygulanmalı)
--
-- Supabase 30 Ekim 2026'dan sonra `public` şemasındaki yeni tablolara Veri API yetkisini (service_role dahil) otomatik vermeyecek.
-- Edge Function'lar (mesaj-gonder, telegram-basvuru, talep-siniflandir) tabloya service_role ile eriştiği için, yeni tabloda
-- bu yetki yoksa "permission denied" alırlar. anon / authenticated bilerek yetkisiz kalır (SQL-guvenlik-sertlestirme-2026-10-13.sql).
-- Tek seferlik: sonradan her tabloya ayrı GRANT yazma zorunluluğunu kaldırır.

-- Var olan tablo ve sıralar (zaten yetkili; sıfırdan kurulumda eksik kalmasın diye idempotent)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Bundan sonra postgres rolüyle (SQL Editor / migration) oluşturulan tablo ve sıralar service_role'e otomatik yetkilenir
alter default privileges for role postgres in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public grant usage, select on sequences to service_role;
