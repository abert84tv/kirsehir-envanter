-- YETKİ TARAMASI — yeni bir sunucu işlevi eklendikten sonra Supabase SQL Editor'de çalıştırın (yalnız okur, hiçbir şeyi değiştirmez).
-- Anonim kullanıcının çağırabildiği SECURITY DEFINER işlevlerden gövdesinde oturum/yetki denetimi OLMAYANLARı listeler.
-- Beklenen liste: yalnız bilerek herkese açık olanlar (basvuru_ekle, basvuru_durum, sunucu_saati, cikis, benim_rolum, konum_yaz/telemetri_yaz = anahtarlı cihaz girişi,
-- tetikleyiciler). Listede başka bir işlev çıkarsa ya içine oturum_sahibi/yazma_denetle ekleyin ya da
-- `revoke execute on function <ad>(<argümanlar>) from public, anon, authenticated;` ile dışarıya kapatın (içeriden çağrılan yardımcılar için).
-- Not: yonetici_mi, is_emri_yetkili, telemetri_yetki_denetle gibi yardımcı denetçiler bu taramada "denetimsiz" görünebilir; gövdelerine bakıp doğrulayın.
select p.proname as islev, pg_get_function_identity_arguments(p.oid) as argumanlar
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.prosecdef
   and p.proacl::text like '%anon=X%'
   and p.prosrc !~ 'oturum_sahibi|yazma_denetle|oturum_ac|giris|yetkim_var|yonetici_mi|is_emri_yetkili|telemetri_yetki_denetle'
 order by 1;
