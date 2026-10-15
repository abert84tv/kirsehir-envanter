-- Yeni tesis türleri: Baca (BAC) ve Vana (VAN) — şebeke hatlarındaki baca ve ayrım vanaları
-- Supabase SQL Editor'de BÖLÜM 1'i çalıştırın, BİTİNCE BÖLÜM 2'yi ayrı çalıştırın
-- (ALTER TYPE ... ADD VALUE ile eklenen değer aynı işlemde kullanılamaz).

-- ── BÖLÜM 1 ──
alter type tesis_turu add value if not exists 'baca';
alter type tesis_turu add value if not exists 'vana';

-- ── BÖLÜM 2 ──
create or replace function public.tesis_kod_siradaki(p_token uuid, p_tur tesis_turu)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare on_ek text; n int;
begin
  perform oturum_sahibi(p_token);
  on_ek := 'KS-' || case p_tur
             when 'kuyu' then 'KUY' when 'depo' then 'DEP'
             when 'ag'   then 'AG'  when 'baca' then 'BAC'
             when 'vana' then 'VAN' else 'GES' end || '-';
  select coalesce(min(s.sira), 1) into n
    from (select generate_series(1, 1 + (select count(*) from tesis where tur = p_tur)) as sira) s
   where not exists (
     select 1 from tesis t
      where t.tur = p_tur
        and t.kod = on_ek || lpad(s.sira::text, 4, '0'));
  return on_ek || lpad(n::text, 4, '0');
end;
$function$;
