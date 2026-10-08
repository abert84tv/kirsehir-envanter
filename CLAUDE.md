# Çalışma kuralları (bulut ve masaüstü oturumları için)

Kullanıcı Türkçe yazar; kısa, Türkçe cevap ver.

## Yapı (modüler, 2026-10-07'den beri)
- `index.html` ve `supabase-baglanti.js` **üretilen** dosyalardır — elle düzenleme. Değişiklik `src/` altında yapılır.
- Modüller: `src/moduller/<ad>/` (masaüstü/telefon şablonları, yontemler, gorunum, baglanti, sql, islev, modul.json); kabuk `src/kabuk.html`, sabitler `src/sabitler/NN-*.js`. Kılavuz: `src/README.md`.
- Her değişiklikten sonra: `node build.js && node duman-testi.js`. Commit'e hem `src/` hem üretilen dosyalar girer.
- Sürüm artırma: `src/sabitler/11-genel.js` SURUM + `sw.js` SURUM → build.
- Yeni modül: `node yeni-modul.js <ad> "<açıklama>" [--sayfa]`; kaldırma `--kaldir`; bağımlılık: `node modul-bilgi.js --bagimlilik`.
- Masaüstü ve telefon şablonları ayrı parçalardır — her özellik ikisine de uygulanır (`esdeger-kontrol.js` denetler).
- `main`'e push Vercel'e otomatik yayınlanır.

## Kullanıcıyla çalışma biçimi
- Menü/sayfa sadeleştirmesi kullanıcıyla **konuşarak** yapılır: önce tartış, kararları onaylat, sonra yap; soruları tek tek sor.
- Alınmış kararlar ve sıradaki işler: `SADELESTIRME-RAPORU.md`, `DURUM.md`, `KONUM-ALTYAPI.md`.

## Güvenlik
- Veri uydurma; gerçek veriyi silme/değiştirme öncesi kullanıcıya sor.
- Kullanıcının şifresini girme; gizli anahtarları diske veya depoya yazma.
- Bu depoda yalnız Kırşehir Envanter işi yapılır; elektrik-hesaplama ayrı depodur, karıştırma.
