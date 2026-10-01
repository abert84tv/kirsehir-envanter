-- Kırşehir Envanter — arıza kayıtları ve modül yazma düzeltmesi (2026.10.01)
-- Canlı veritabanına üç göç olarak uygulandı:
--   ariza_durum_tam_liste, ariza_kaydet_kapanis_iptal, izleyici_rol_karsilastirma
--
-- 1) "rol" enum'unda 'izleyici' değeri yok. veri_yaz, veri_yaz_surumlu,
--    ambar_hareket'teki  k.rol = 'izleyici'  karşılaştırması her çağrıda
--    "invalid input value for enum rol" hatası veriyordu: ekip, personel,
--    nöbet, ambar, araç ve talep verisi sunucuya hiç yazılamamıştı.
--    Karşılaştırma metin olarak yapılır: k.rol::text = 'izleyici'.
-- 2) Program 10 arıza durumu kullanıyor; enum'da 4'ü vardı.
-- 3) ariza_kaydet: "iptal" de kapanış sayılır; yeniden açılan kaydın kapanış
--    damgası silinir; kapanmamış kayıt tesisi "arızalı" yapar.

alter type ariza_durum add value if not exists 'bilgi';
alter type ariza_durum add value if not exists 'bekleme';
alter type ariza_durum add value if not exists 'yonlendirildi';
alter type ariza_durum add value if not exists 'kontrol';
alter type ariza_durum add value if not exists 'yeniden';
alter type ariza_durum add value if not exists 'iptal';
-- (enum değerleri ayrı işlemde eklenmeli — aşağıdakini ayrı çalıştırın)

create or replace function public.ariza_kaydet(p_token uuid, p_id bigint, p_no text, p_tesis_id bigint, p_tur text, p_oncelik ariza_oncelik, p_durum ariza_durum, p_ekip text, p_aciklama text, p_malzeme jsonb default '[]'::jsonb, p_maliyet numeric default null::numeric)
 returns bigint language plpgsql security definer set search_path to 'public'
as $function$
declare k kullanicilar; il text; yeni bigint; kapali boolean := p_durum::text in ('cozuldu', 'iptal');
begin
  select t.ilce into il from tesis t where t.id = p_tesis_id;
  if il is null and not exists (select 1 from tesis t where t.id = p_tesis_id) then
    raise exception 'Tesis bulunamadı (%).', p_tesis_id;
  end if;
  k := yazma_denetle(p_token, il);
  if k.rol::text = 'izleyici' then raise exception 'İzleyici hesabı arıza kaydı yazamaz.'; end if;
  if p_id is null then
    insert into ariza (no, tesis_id, tur, oncelik, durum, ekip, aciklama, malzeme, maliyet, acan_k, kapatan_k, kapandi)
    values (p_no, p_tesis_id, p_tur, p_oncelik, p_durum, p_ekip, p_aciklama, coalesce(p_malzeme, '[]'::jsonb), p_maliyet, k.id,
            case when kapali then k.id end, case when kapali then now() end)
    returning ariza.id into yeni;
    if not kapali then update tesis t set durum = 'ariza' where t.id = p_tesis_id and t.durum = 'aktif'; end if;
    return yeni;
  end if;
  update ariza a
     set tur = p_tur, oncelik = p_oncelik, durum = p_durum, ekip = p_ekip,
         aciklama = p_aciklama, malzeme = coalesce(p_malzeme, a.malzeme), maliyet = p_maliyet,
         kapatan_k = case when kapali then coalesce(a.kapatan_k, k.id) else null end,
         kapandi   = case when kapali then coalesce(a.kapandi, now()) else null end
   where a.id = p_id;
  if not found then raise exception 'Arıza kaydı bulunamadı (%).', p_id; end if;
  if kapali then
    if not exists (select 1 from ariza a2 where a2.tesis_id = p_tesis_id and a2.durum::text not in ('cozuldu', 'iptal'))
    then update tesis t set durum = 'aktif' where t.id = p_tesis_id and t.durum = 'ariza'; end if;
  else
    update tesis t set durum = 'ariza' where t.id = p_tesis_id and t.durum = 'aktif';
  end if;
  return p_id;
end;
$function$;

-- veri_yaz, veri_yaz_surumlu, ambar_hareket: tanımlardaki
--   k.rol = 'izleyici'   →   k.rol::text = 'izleyici'
do $$
declare f text; d text;
begin
  foreach f in array array['public.veri_yaz(uuid,text,jsonb)', 'public.veri_yaz_surumlu(uuid,text,jsonb,bigint)', 'public.ambar_hareket(uuid,jsonb)']
  loop
    d := replace(pg_get_functiondef(f::regprocedure), 'k.rol = ''izleyici''', 'k.rol::text = ''izleyici''');
    execute d;
  end loop;
end $$;
