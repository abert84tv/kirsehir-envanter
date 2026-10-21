# SQL dosyaları — modül dizini

SQL dosyaları ilgili modülün klasöründe durur: `src/moduller/<modül>/sql/`. Edge function kaynakları `src/moduller/<modül>/islev/` altındadır.
Dosya adları değişmedi (dosyalar birbirine adıyla "Ön koşul" olarak atıf yapar). Çoğu dosya Supabase SQL Editor'de bir kez çalıştırılır; canlı veritabanında hepsi uygulanmıştır.

## Yeni tablo kuralı (Supabase, 30 Ekim 2026 değişikliği)

Supabase 30 Ekim 2026'dan sonra `public` şemasındaki **yeni** tablolara Veri API (PostgREST) yetkisini otomatik vermeyecek; mevcut tablolar etkilenmez.
Bu projede tablolara doğrudan erişim zaten kapalıdır (v200: `anon`/`authenticated` yetkisi yok, program yalnız RPC + Storage kullanır). Bu yüzden:
- Yeni tabloya `anon` / `authenticated` GRANT **verilmez**; erişim `security definer` RPC işleviyle olur (işlev sahibi tabloya erişir).
- Bir Edge Function tabloyu `service_role` ile doğrudan kullanacaksa (ör. `sb.from('denetim')`) tablo SQL'ine şu satır eklenir:
  `grant select, insert, update, delete on public.<tablo> to service_role;`
- Her yeni tabloda `alter table <tablo> enable row level security;` kalır (politikasız = doğrudan erişim kapalı).
- Sıfırdan kurulum / önizleme dalı gerekirse tablolar bu dosyalardan yeniden kurulacağı için GRANT satırları dosyada açıkça yazılı olmalıdır.

| Modül | Dosya | Not |
|---|---|---|
| envanter | `src/moduller/envanter/sql/SQL-tesis-degisiklik-onayi.sql` | tesis ekleme/silme önerisi ve iki aşamalı onay (şef → mühendis → müdür); şef ekip süzgeci; çöp temizleme yetkisi; veri okuma ve ekip konumu süzgeçleri — uygulandı 2026-10-10 |
| envanter | `src/moduller/envanter/sql/SQL-baca-vana-turleri-2026-10-15.sql` | tesis türlerine `baca`, `vana`; `tesis_kod_siradaki` güncellemesi — uygulandı 2026-10-15 |
| harita | `src/moduller/harita/sql/SQL-hat-grup-2026-10-15.sql` | `hat.grup` sütunu; `hat_listesi` ve `hat_kaydet` grup alanını taşır — uygulandı 2026-10-15 |
| aktarim | `src/moduller/aktarim/sql/SQL-baca-vana-cizgiye-oturt-2026-10-15.sql` | 59 baca/vana konumu en yakın boru çizgisine oturtuldu — uygulandı 2026-10-15 |
| aktarim | `src/moduller/aktarim/sql/SQL-gulveren-celebiusagi-sebeke-2026-10-15.sql` | Gülveren ve Çelebiuşağı şebekesi: 2 depo + 35 hat + 33 baca/vana (tek seferlik veri aktarımı) |
| aktarim | `src/moduller/aktarim/sql/SQL-esrefli-sebeke-2026-10-15.sql` | Eşrefli şebekesi: 18 hat + 18 baca + 4 vana (tek seferlik veri aktarımı) |
| ambar | `src/moduller/ambar/sql/SQL-ambar-hurda.sql` | hurda hareket türü |
| ambar | `src/moduller/ambar/sql/SQL-ambar-yetki.sql` | stok yetkileri (görevler ayrılığı): `stok_izin` + `ambar_hareket` yetki denetimi — uygulandı 2026-10-10; 8) sil rolü, foto/yerleşim/denetim korumaları |
| oturum | `src/moduller/oturum/sql/SQL-rol-operator.sql` | altı rol: rol türüne `operator` eklendi; rol listeli işlevler (ariza_ek_kaydet, basvuru_engelle, is_emri_kapat, is_emri_yetkili, veri_yaz/_surumlu, yetkim_var) ve `stok_izin` güncellendi — uygulandı 2026-10-10; 8) sil rolü, foto/yerleşim/denetim korumaları |
| ambar | `src/moduller/ambar/sql/SQL-ambar-katalog-siparis.sql` | katalog ve sipariş |
| ambar | `src/moduller/ambar/sql/SQL-ambar-koy-raporu.sql` | tesis/köy bazlı rapor |
| ariza | `src/moduller/ariza/sql/SQL-ariza-nokta-koy.sql` | arıza noktası ve köy |
| ariza | `src/moduller/ariza/sql/SQL-ariza-sla.sql` | SLA/bekleme/ana arıza/planlı zaman |
| ariza | `src/moduller/ariza/sql/SQL-ariza-sunucu-duzeltme.sql` | arıza sunucu düzeltmeleri |
| ariza | `src/moduller/ariza/sql/SQL-kanit-saklama.sql` | kanıt saklama politikası (2 yıl) |
| basvuru | `src/moduller/basvuru/sql/SQL-basvuru-telegram-uyari.sql` | Telegram uyarı/durum tetikleyicileri |
| basvuru | `src/moduller/basvuru/sql/SQL-basvuru.sql` | vatandas_basvuru (web formu) |
| cekirdek | `src/moduller/cekirdek/sql/SQL-guvenlik-duzeltme-2026-10-06.sql` | RLS/görünüm/işlev güvenlik düzeltmeleri (2026-10-06) |
| cekirdek | `src/moduller/cekirdek/sql/SQL-yeni-moduller.sql` | ilk taslak tablolar (çoğu kullanılmıyor) |
| denetim | `src/moduller/denetim/sql/SQL-cop-kutusu.sql` | çöp kutusu + cop_temizle |
| denetim | `src/moduller/denetim/sql/SQL-cop-temizle-duzelt.sql` | cop_temizle düzeltmesi |
| entegrasyon | `src/moduller/entegrasyon/sql/SQL-entegrasyon.sql` | dış servis anahtarları (anahtar tarayıcıya dönmez) |
| esitleme | `src/moduller/esitleme/sql/SQL-moduller-sunucu.sql` | kurum_veri (ekip, personel, ambar... toptan yazılan modül verisi) |
| esitleme | `src/moduller/esitleme/sql/SQL-veri-butunlugu.sql` | sürümlü yazma, numara sayacı, atomik ambar |
| is-emri | `src/moduller/is-emri/sql/SQL-is-emirleri.sql` | is_emirleri tablosu + RPC |
| is-emri | `src/moduller/is-emri/sql/SQL-is-emri-kapat-duzelt.sql` | is_emri_kapat hata düzeltmesi (2026-10-06) |
| telemetri | `src/moduller/telemetri/sql/SQL-telemetri.sql` | telemetri tabloları/RPC |

## Edge function kaynakları

| Modül | Kaynak | Canlı işlev |
|---|---|---|
| basvuru | `src/moduller/basvuru/islev/telegram.ts` | `telegram-basvuru` |
| talep | `src/moduller/talep/islev/talep-siniflandir.ts` | `talep-siniflandir` |
| bildirim | `src/moduller/bildirim/islev/mesaj-gonder.ts` | `mesaj-gonder` (2026-10-13'te yayınlandı; Netgsm secrets kullanıcı girer; yalnız operatör/müdür/yönetici gönderir) |

| konum | `src/moduller/konum/sql/SQL-konum.sql` | ekip konumu: konum_cihaz/konum_son, konum_yaz (Arvento), konum_gonder (zimmetli cihaz) — ayrıntı KONUM-ALTYAPI.md |
| cekirdek | `src/moduller/cekirdek/sql/SQL-guvenlik-sertlestirme-2026-10-13.sql` | güvenlik sertleştirmesi: doğrudan tablo erişimi kapatıldı, istemcinin çağırmadığı işlevler kapatıldı, oturum temizliği, FK indeksleri, Storage silme koruması, öneri fotoğrafı işlevleri (belge) |
| oturum | `src/moduller/oturum/sql/SQL-yetki-testi.sql` | kalıcı yetki testi: geçici kullanıcılarla rol × yetki tablosu, yasak çağrılar, geçersiz jeton, doğrudan tablo erişimi; sonunda hep geri alır (beklenen: `YETKI-TESTI TAMAM`) |
| oturum | `src/moduller/oturum/sql/SQL-yetki-tarama.sql` | yeni işlev eklenince çalıştırılan yetki taraması (oturum denetimi olmayan, anonimin çağırabildiği işlevleri listeler) |
| ariza | `src/moduller/ariza/sql/SQL-ariza-kapanis-sunucuda.sql` | arıza son onayla kapanınca zimmet düşümü ve talep/başvuru kapanışı sunucuda (`ariza_kapanis_isle`, dışarıya kapalı) — uygulandı 2026-10-10 |
| oturum | (migration kullanici_listesi_sef_ekip) | `kullanici_listesi`: saha şefi ve izleyici yalnız kendi satırını görür (diğer roller hepsini; telefon/son giriş yine yalnız yönetici ve müdürde) — uygulandı 2026-10-13 |
| aktarim | `src/moduller/aktarim/sql/SQL-koy-ata-2026-10-16.sql` | köyü boş 94 tesise en yakın köy yazıldı (≤5 km, ilçe değişmedi, `d.koyOtomatik` işaretli) — uygulandı 2026-10-16 |
