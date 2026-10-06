# src/ — kaynak klasörü

`index.html` ve `supabase-baglanti.js` **elle düzenlenmez**; `node build.js` ile bu klasörden üretilir
(Vercel de her yayında `node build.js` çalıştırır; üretilen dosyalar yine de repoda tutulur ki yerelde doğrudan açılabilsin).

```
src/
  kabuk.html                 iskelet: <head>, ana yerleşim, tüm "dahil" satırları (modül listesi burada)
  stil/ana.css               tüm CSS
  sabitler/NN-konu.js        sabitler ve yardımcı işlevler (SIRA ÖNEMLİ: numara sırasıyla yüklenir; SURUM 11-genel.js'te)
  baglanti/kabuk.js          supabase-baglanti.js iskeleti (cekirdek.js + modül parçaları)
  moduller/<ad>/
    modul.json               ad, açıklama, sayfalar, bağımlılıklar, açma/kapama anahtarı
    masaustu/*.html          masaüstü şablon parçaları (sayfa / panel / katman başına)
    telefon/*.html           telefon şablon parçaları
    ortak/*.html             masaüstü+telefon aynı olanlar (giriş ekranı, alan düzenleme...)
    yontemler.js + yontemler/*.js   sınıf yöntemleri (iş mantığı); başlatma kancaları baslat.js'te
    gorunum.js + gorunum/*.js       görünüm modeli (renderVals dönüş nesnesinin özellikleri)
    baglanti/*.js            veritabanı çağrıları (supabase-baglanti.js'e girer)
    sql/*.sql                bu modülün SQL'i (Supabase'e uygulanır; dizin: ../../../SQL-INDEKS.md)
    islev/*.ts               edge function kaynakları
    hazirlik-*.js            (render öncesi yerel değişkenler — yalnız bazı modüllerde; SIRA kabuk zincirinde)
```

Dahil işaretleri (kendi satırında): `<!--@dahil yol-->` HTML, `//@dahil yol` JS, `/*@dahil yol*/` CSS. Yol `src/`'ye göredir; parçalar başka parçaları dahil edebilir.

## Günlük çalışma
```
node build.js              # src/ -> index.html + supabase-baglanti.js
node duman-testi.js        # derleme güncel mi, modül yapısı, sözdizimi, dosya referansları
node modul-bilgi.js        # modül tablosu          (--bagimlilik: kim kimi kullanıyor · <modül>: ayrıntı)
```
Değiştir → `node build.js` → `node duman-testi.js` → tarayıcıda dene → commit (`src/` **ve** üretilen dosyalar).

## Özellik EKLEMEK
- **Var olan modüle:** ilgili şablon parçasını (`masaustu/` **ve** `telefon/` — ikisi ayrı) düzenleyin; mantık `yontemler/`, görünüm `gorunum/`.
  Görünüm özellikleri **virgülle biter** (derleme sırası değişebilir). Yeni dosya yarattıysanız ilgili `@dahil` satırını ekleyin.
- **Yeni modül:** `node yeni-modul.js rapor "Rapor modülü" --sayfa` — iskeleti kurar, kabuğa bağlar; ekrana "Elle yapılacaklar" listesini yazar
  (menü girdisi `SUZGEC_TANIM`, `tab` anahtarı, yetki). Sunucu gerekiyorsa `sql/` + `baglanti/` ekleyin.

## Özellik ÇIKARMAK
- `node modul-bilgi.js <modül>` → "Bu modülü kullananlar" listesi dokunmanız gereken yerlerdir.
- `node yeni-modul.js --kaldir <modül>` → kullanılıyorsa reddeder (neden yazar); temizledikten sonra kabuktaki dahil satırlarını ve klasörü siler.
- Çekirdek ve esitleme/oturum/denetim gibi "yatay" modüller her yerden çağrılır; kaldırılamaz.

## Kurallar
- Taşıma/bölme **saf metin** işidir; davranış değişmez. Bir yöntemin/özelliğin adı tüm modüllerde **tekil** olmalıdır (aynı ad iki modülde olursa sonraki ezer).
- `componentWillUnmount` iki kez tanımlıdır (orijinalden miras; sonraki geçerli) — `cekirdek/yontemler/yasam-dongusu.js`.
- Şablon parçaları etiket dengesini bozmamalıdır (tek tek değil, derlenmiş bütün olarak çalışır).
- Canlı veritabanını değiştiren SQL: önce modülün `sql/` klasörüne yazılır, sonra uygulanır, `SQL-INDEKS.md` güncellenir.

İlerleme kaydı: `../MODUL-ILERLEME.md`.
