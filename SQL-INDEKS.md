# SQL dosyaları — modül dizini

SQL dosyaları ilgili modülün klasöründe durur: `src/moduller/<modül>/sql/`. Edge function kaynakları `src/moduller/<modül>/islev/` altındadır.
Dosya adları değişmedi (dosyalar birbirine adıyla "Ön koşul" olarak atıf yapar). Çoğu dosya Supabase SQL Editor'de bir kez çalıştırılır; canlı veritabanında hepsi uygulanmıştır.

| Modül | Dosya | Not |
|---|---|---|
| ambar | `src/moduller/ambar/sql/SQL-ambar-hurda.sql` | hurda hareket türü |
| ambar | `src/moduller/ambar/sql/SQL-ambar-yetki.sql` | stok yetkileri (görevler ayrılığı): `stok_izin` + `ambar_hareket` yetki denetimi — uygulandı 2026-10-10 |
| oturum | `src/moduller/oturum/sql/SQL-rol-operator.sql` | altı rol: rol türüne `operator` eklendi; rol listeli işlevler (ariza_ek_kaydet, basvuru_engelle, is_emri_kapat, is_emri_yetkili, veri_yaz/_surumlu, yetkim_var) ve `stok_izin` güncellendi — uygulandı 2026-10-10 |
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
| bildirim | `src/moduller/bildirim/islev/mesaj-gonder.ts` | `mesaj-gonder` (varsa) |

| konum | `src/moduller/konum/sql/SQL-konum.sql` | ekip konumu: konum_cihaz/konum_son, konum_yaz (Arvento), konum_gonder (zimmetli cihaz) — ayrıntı KONUM-ALTYAPI.md |
