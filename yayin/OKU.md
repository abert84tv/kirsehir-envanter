# Bu turda yüklenecek dosyalar

```
index.html
supabase-baglanti.js
```

Diğerleri (`harita.html`, `kirsehir-data.js`, `support.js`, `_ds/`)
değişmedi — daha önce yüklediyseniz tekrar yüklemeyin.

Yükleme: depo → **Add file → Upload files** → iki dosyayı sürükleyin
(aynı isimde oldukları için üzerine yazar) → **Commit changes**.
Vercel 1-2 dakikada yayınlar, sonra adreste **Ctrl+Shift+R**.

## ÖNEMLİ — önce SQL

`SQL-cop-kutusu.sql` dosyasını **Supabase > SQL Editor**'de bir kez
çalıştırın (içeriğini kopyala-yapıştır → Run). Bu dosya depoya
yüklenmez, yalnızca Supabase'de çalıştırılır.

Program SQL çalıştırılmadan da açılır; çöp kutusu boş görünür ve geri
getirmeye basınca "cop-kutusu.sql dosyasını çalıştırmanız gerekiyor"
uyarısı verir.

## Ne değişti

### Çöp kutusu artık gerçekten çalışıyor

Önceden: fotoğraf silmek kalıcıydı, dönüşü yoktu. Kayıt silmek
sunucuda "silindi" damgası vuruyordu ama ekranda hiçbir yerde
görünmüyordu, geri getirilemiyordu. "30 gün sonra kalıcı silinir"
yazısı yalnızca yazıydı.

Şimdi:

- **Fotoğraf ve sesli not silmek geri alınabilir.** Silinen dosya
  depodan kalkmıyor, çöp kutusuna düşüyor, 30 gün orada bekliyor.
  Kayıttaki fotoğraf sayacı da doğru güncelleniyor.
- **Çöp kutusu sunucuya bağlı.** Ayarlar > Çöp kutusu'nda silinen
  kayıtlar ve fotoğraflar, kim sildi, ne zaman sildi ve kaç gün kaldığı
  ile birlikte listeleniyor. "Geri getir" gerçekten geri getiriyor —
  kayıt bütün alanları, fotoğrafları, denemeleri ve geçmişi ile dönüyor.
- **30 gün gerçekten işliyor.** Program her veri yenilemesinde süresi
  dolanları kalıcı siliyor, fotoğraf dosyaları depodan da kalkıyor,
  ekranda "30 günü dolan N kayıt ve M fotoğraf kalıcı silindi" bildirimi
  çıkıyor.
- **"Kalıcı sil" düğmesi geldi.** Süreyi beklemeden kesin silmek için;
  yalnızca Yönetici ve Müdür görüyor. Onay soruyor, onaylanınca kayıt,
  fotoğrafları, denemeleri ve notları veritabanından tamamen kalkıyor.
- Bölüm sekmesindeki sayı çöp kutusundaki öğe sayısını gösteriyor.
- Masaüstü ve mobilde aynı — ikisinde de geri getirme ve kalıcı silme
  var.

### Kayıt kartı alan düzenleme

"Kaydı düzenle" düğmesi önceden yalnızca mesaj veriyordu, hiçbir alanı
yazmıyordu. Artık gerçek form açılıyor, masaüstü ve mobilde tek ve aynı
form: kuyu 35 alan, depo 14, AG 9, GES 6 alan; başlıklı gruplar hâlinde.
Rakam alanlarında telefon sayı klavyesi açılıyor, Var/Yok alanları iki
düğmeli seçim. Boş bırakılan alan "— eksik" kalıyor ve Özet'teki eksik
listesinde duruyor. Kaydedince Geçmiş sekmesine satır düşüyor, bağlantı
varsa hemen veritabanına gidiyor, çevrimdışıysa kuyruğa giriyor. Esc ve
sağ üstteki X kapatıyor.

### Nüfus dosyası olduğu gibi okunuyor

Yerleşim ekranındaki yükleme, ilettiğiniz "kırşehir Belde_Köy Nüfusu"
dosyasını elle düzeltmeden alıyor: başlık satırı tanınıyor (sütun sırası
önemli değil), Türkçe (ANSI) kodlama çözülüyor, ilçe adı grubun ilk
satırından alt satırlara taşınıyor, "Köy / Belde / Mahallesi" ekleri ve
küçük yazım farkları resmî listeyle eşleştiriliyor. 252 satırın tamamı
oturdu. Yaklaşık eşleşenler Kaynak sütununda işaretli. Büyük/Küçük,
Aşağı/Yukarı, Dere/Tepe gibi ayırt edici ek taşıyan adlar birbirine
eşleşmiyor.

### Diğer

- Masaüstünde kuyu / depo / AG / GES kartının sağ üst köşesine kapatma
  (X) düğmesi geldi; Esc de kapatıyor.
- Mobil Ayarlar'a masaüstündeki dört bölüm sekmesi geldi (Harita ve
  görünüm · Veri ve bildirim · Yetkiler ve kullanıcılar · Çöp kutusu).
  Bölüm seçimi iki sürüm arasında ortak.
- Mobile eklenenler: bildirim şeridi, fotoğraf büyütme ve indirme, A4
  tesis kartı, çakışma çözümü ekranı, konum işaretleme ve doğrulama
  şeritleri, Yerleşim listesinde büyükbaş / küçükbaş ve kaynak satırı.

## Telefonda hâlâ eksik olanlar (sıradaki iş)

Arıza formunun koordinat, fotoğraf sayısı, malzeme adedi ve işçilik /
maliyet alanları; Deneme karşılaştırma grafiği; Bakım ekranının hedef
tarih, periyot, GİT ve "kaydı olmayanlar" bölümü; Özet'in köy listesi ve
"bu hafta" bölümü; dış veri aktarımı ekranı ve koordinat dönüştürücü
paneli. Köy / ilçe adının kart düzenleme formuna alınması da bekliyor.
