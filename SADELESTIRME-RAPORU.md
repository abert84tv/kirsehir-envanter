# Sadeleştirme raporu — karmaşık / yoğun bölümler (2026-10-07)

## 1. Neye baktım
Şablonları (masaüstü + telefon) sayarak, canlı veriyle her ekranı açıp yüksekliğini ve kontrol (düğme/giriş) sayısını ölçerek.
Toplam: **1.079 düğme/giriş kutusu**, **652 koşullu blok**, 115 açıklama paragrafı (bunlar "?" yardımı kapalıyken zaten gizli).

### En yoğun ekranlar (masaüstü, canlı veriyle)
| Ekran | Yükseklik* | Kontrol | Not |
|---|---|---|---|
| Envanter listesi | ~23.800 px | 5 | 291 satırlık tek liste |
| Özet | ~8.000 px | 33 | 3 sekme, 9 tablo/liste |
| Bakım | ~7.300 px | 120 | 291 tesisin "kaydı yok" satırları listeleniyor |
| Ayarlar › Ekipler | ~5.200 px | 35 | ekip + personel + nöbet bir arada |
| Arıza formu | ~3.800 px | 39 (telefon ayrıntılı: 74) | SLA, ana arıza, planlı zaman, 10 durum |
| Ayarlar › KVKK | ~3.500 px | 45 | |
| Ambar | ~2.400 px | 35 | stok + hareket + zimmet + sipariş + katalog |
| Tesis kartı | ~2.550 px | 20 | kuyu için 35 alan; 291 tesisin 288'inde eksik bilgi var |
| Ayarlar listesi | ~2.200 px | 13 | 13 bölüm |
\* görünür ekran ~700-800 px; 3.000 px ≈ 4 ekran kaydırma.

### Yapısal sayılar
- Arıza durumu: **10** · rol: **5** × yetki **10** + sayfa yetkisi + kişi istisnası · modül anahtarı: **8** (+ hedef süre/kanıt/merkez onayı)
- Menü: **5** üst grup, ~**16** alt görünüm, **13** ayar bölümü; üst çubukta 6+ düğme
- Kod: iki ayrı şablon (masaüstü ≈ 4.300, telefon ≈ 3.900 satır), `renderVals` tek fonksiyon (≈ 5.800 satır), arıza formu tek özellik (558 satır)

## 2. Kök nedenler
1. **Her ekran her şeyi gösteriyor:** boş alanlar ("— eksik" × 30), nadir ayarlar, hiç verisi olmayan sayfalar (Telemetri boş, Bakım'da 291 "kaydı yok").
2. **Herkes aynı menüyü ve aynı ekranı görüyor:** saha personeli, operatör ve müdürün işi farklı; açılış ve menü rolden bağımsız.
3. **Çok seçenek:** arıza 10 durum; yetki üç katman (rol + sayfa + kişi istisnası); modül açma/kapama kombinasyonları.
4. **Aynı iş iki yerde:** masaüstü/telefon ayrı şablon; telefonda "sade" arıza ekranı var, masaüstünde yok.

## 3. Öneriler (kolaydan zora)
| # | Değişiklik | Kazanç | Risk |
|---|---|---|---|
| A | **Tesis kartı:** yalnız dolu alanlar + 6 temel alan; "+28 boş alan" ile açılır; düzenleme formunda gruplar katlanır | ~2.550 → ~700 px | düşük |
| B | **Bakım:** yalnız gecikmiş + yaklaşan; "kaydı yok" tek satır özet | ~7.300 → ~800 px | düşük |
| C | **Veri yoksa menüden gizle:** Telemetri (cihaz yoksa), Aktarım (telefon) | menü kısalır | düşük |
| D | **Envanter listesi:** sayfalama/sanal kaydırma, varsayılan kısa sütun seti | 23.800 → 1 sayfa | düşük |
| E | **Role göre açılış ve menü:** saha → Bana atanan/Harita; operatör → Gelen/Açık; müdür → Genel bakış/Özet | her kullanıcı kendi 3-4 ekranını görür | düşük-orta |
| F | **Özet:** tek ana ekran (6 sayı + "dikkat gerektirenler"); ilçe/rapor ayrıntıları "Ayrıntı" altında | ~8.000 → ~1.500 px | orta |
| G | **Arıza formu iki katman (masaüstü de):** "ne oldu / kim-ne zaman / kapanış"; SLA, ana arıza, planlı zaman "Gelişmiş"te; görünür durum 10 → 6 (Bilgi bekliyor/Yönlendirildi/Kontrolde "Beklemede + neden" olur) | form ~3.800 → ~1.200 px | orta (iş akışı değişir) |
| H | **Ayarlar 13 → 5 bölüm:** Kullanıcılar ve yetki · Ekipler · Görünüm · Bildirim ve entegrasyon · Veri ve gizlilik; ekip ayarı kartlara; yetkide 5 hazır rol paketi, istisna "gelişmiş" | ~5.200 → ~2.000 px | orta |
| I | **Ambar 3 göreve:** Stok · Giriş/Çıkış · Sipariş; katalog yönetimi ayrı | ekran başına ~12 kontrol | orta |
| J | **Kod tarafı:** ortak bileşenler (kart, satır, başlık, rozet) masaüstü+telefon paylaşsın; `renderVals` konuya göre parçalansın (her `setState`'te 5.800 satır hesaplanıyor) | bakım kolaylığı, hız | yüksek (görünüm değişmeden yapılabilir ama uzun) |

## 4. Önerilen sıra
1. **A, B, C, D** — düşük risk, hemen görünen sonuç; her biri tek başına geri alınabilir.
2. **E** — rol bazlı menü/açılış.
3. **F, G, H** — iş akışını etkilediği için önce karar gerekir (aşağıdaki sorular).
4. **I, J** — ihtiyaç doğdukça.
Her adımda: önce/sonra ekran görüntüsü, masaüstü/telefon eşdeğerlik kontrolü, ayrı commit.

## 5. Karar gerektirenler
- Merkez onayı ("Kontrolde" adımı) kullanılıyor mu? (şu an varsayılan kapalı; kullanılmıyorsa durum sayısı rahatça düşer)
- Telemetri ve Aktarım modülleri bu yıl kullanılacak mı? Kullanılmayacaksa menüden tamamen kaldırılabilir.
- Operatör/saha/müdür için hangi 3-4 ekran en sık kullanılıyor? (gerçek veri için 2 haftalık anonim sayfa-açılış sayacı eklenebilir)

## 6. Sınırlar
Sayıları bir tarayıcıda canlı veriyle ölçtüm; gerçek kullanıcıların hangi ekranı ne sıklıkla açtığını bilmiyorum. Telefon ölçümleri yalnız şablon sayımına dayanıyor (ekran yüksekliği ölçülmedi).
