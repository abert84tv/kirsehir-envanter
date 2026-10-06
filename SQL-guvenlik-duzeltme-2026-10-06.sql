-- Supabase güvenlik uyarısı (3 Ekim 2026): "rls_halka_acik_alanda_devre_disi" — alt_sistem_kategori tablosunda RLS kapalıydı.
-- Uygulandı 2026-10-06 (migrationlar: alt_sistem_kategori_rls, gorunumleri_kapat, cop_temizle_parametresiz_kapat).
alter table public.alt_sistem_kategori enable row level security;
create policy alt_sistem_kategori_kapali on public.alt_sistem_kategori for all using (false) with check (false);
revoke all on public.alt_sistem_kategori from anon, authenticated;
-- Kullanılmayan iki görünüm sahibinin yetkisiyle çalışıp anonim okumaya açıktı:
alter view public.v_eksik_bilgi set (security_invoker = on);
alter view public.v_ilce_ozet set (security_invoker = on);
revoke all on public.v_eksik_bilgi from anon, authenticated;
revoke all on public.v_ilce_ozet from anon, authenticated;
-- Oturum denetimi olmayan eski parametresiz sürüm anonim çağrılabiliyordu:
revoke execute on function public.cop_temizle() from anon, authenticated, public;
