# Kırşehir Su ve Elektrik Tesisleri Envanteri — Durum Raporu
4 Eylül 2026 · programın bütünü gözden geçirildi

## 1. Ne var — çalışan yapı

### Giriş ve yetki
- Kullanıcı adı + şifre. Rol seçme düğmesi yok, yetki hesaptan gelir.
- Beş rol, yetki sırası: **Yönetici → Müdür → Mühendis → Arıza Şefi → Arıza Personeli**.
- Yönetici tek hesap: `a.bertan`. Şifre hesap bazında tutulur.
- On yetki kalemi: görüntüleme, fotoğraf, arıza açma, kayıt güncelleme, kayıt oluşturma, ekip atama, arıza kapatma, rapor, silme, yönetim.
- "Beni hatırla" — cihaza kaydeder, açılışta şifre sormaz. Çıkış ile kayıtlı girişi silme artık ayrı iki düğme.
- Özel saha cihazı yok; aynı hesap telefonda ve bilgisayarda çalışır.

### Veri — gerçek, çevrimdışı
| Ne | Kaynak | Adet |
|---|---|---|
| Kuyu noktaları | KUYU YERLERİ 2026 SON.kml | 264 |
| Yerleşim konumları | HGM Coğrafi Ad Dizini | 1043 |
| Resmî ilçe ataması | köy listesi (geojson) | 260 |
| İlçe merkezleri | HGM Yerleşim Noktası | 7 |

Köy araması internete çıkmıyor. Sıra: elle işaretlenen konum → gömülü HGM listesi → kayıt ortalaması.

### Ekranlar
Harita · Envanter · Arıza · İşlem · **Bugün** · **Bakım** · Özet · Yerleşim · Kuyruk · Ayarlar

- **Harita** — sokak / uydu / karma altlık, açılır kapanır araç menüsü, yol tarifi, GPS "GİT" düğmesi, kayıt etiketleri.
- **Envanter** — kayıt listesi, tür süzgeci, arama (kod, köy, koordinat).
- **Kayıt detayı** — Bilgi / Deneme / Arıza / Foto / Not sekmeleri.
- **Arıza** — tür, öncelik, ekip, süre, fotoğraf, iş akışı (açık→atandı→sahada→çözüldü), malzeme + maliyet, sesli not, fotoğraf işaretleme, konuma git, iş emri.
- **Bugün** — açık arızalar, geciken bakımlar, bilgisi eksik kayıtlar tek listede.
- **Bakım** — geciken / 30 gün içinde / kaydı olmayan. Kuyu 6 ay, diğerleri 12 ay. "Yapıldı" düğmesi tarihi bugüne çeker.
- **Özet** — ilçe dağılımı, en çok kayıtlı köyler, eksik bilgi listesi, bu hafta, yakınımdaki tesisler. Excel ve PDF çıktı.
- **İşlem** — dört senaryo: yeni tesis kur, mevcut tesise gir, bilgi güncelle, fotoğraf ekle.
- **Ayarlar** — roller ve yetkiler, modül anahtarları, arıza bildirimi (SMS/WhatsApp), koordinat dönüşümü, dış veri aktarımı.

### Kayıt alanları
- **Kuyu** — derinlik, pompa derinliği, çap, statik/dinamik seviye, debi, kolon borusu, RF; DSİ ruhsat, sondaj firması ve tarihi, kuyu başı kotu, kuyu logu, filtre aralıkları, çakıl zarfı; su analizi ve tarihi, klor ölçümü; pompa marka/model/kademe, motor seri no, montaj derinliği ve tarihi, motor kablosu, kalkış tipi, termik ayar, ölçülen akım, işletme saati, sayaç, yedek pompa.
- **Depo** — hacim, malzeme, kaynak sayısı, RF; klorlama cihazı, seviye sensörü/telemetri, terfi hattı uzunluğu ve çapı, hizmet ettiği yerleşim ve nüfus, abone sayısı, son temizlik, kapak ve güvenlik.
- **AG panosu** — pano tipi (sac/poliester), trafo tipi (direk tipi tek/çift direk), trafo gücü, sigorta, branşman.
- **GES** — güç, panel adedi, invertör, bağlantı.
- Doldurulmayan alan "— eksik" görünür, Özet ekranındaki listede birikir.

### Deneme (kuyu ölçümü)
Tarih, statik seviye, dinamik seviye, debi, özgül debi. Yıllara göre karşılaştırma grafiği: debi çubukları + özgül debi çizgisi.

### Koordinat
Üç sistem karşılıklı: ITRF96-3°, ED50 3°, WGS84 / Google DMS. Google'dan kopyalanan `39°08'46.3"N` biçimi doğrudan yapıştırılır.

### Çevrimdışı çalışma
Kayıt cihaza yazılır, kuyruğa girer, bağlantı gelince eşitlenir. Fotoğraf çevrimdışıysa cihazda bekler.

## 2. Ne eksik

### Kurulum işi (program hazır, altyapı bekliyor)
1. **Sunucu ve veritabanı** — Supabase. Şu an veriler tarayıcıda; kalıcı olması için gerçek veritabanı gerekiyor.
2. **Fotoğraf deposu** — Cloudflare R2 seçildi. Aylık 10 GB ücretsiz, çıkış ücreti yok.
3. **SMS / WhatsApp servisi** — arayüz hazır, operatör aboneliği gerekiyor.
4. **Uydu görüntüsü lisansı** — şu an Esri demo. Kurum adına HGM ortofotosu talep edilmeli.
5. **Kullanıcı hesapları** — gerçek personel adları ve şifreleri.

### Veri eksiği
- Köy nüfusu: **girildi** — ilettiğiniz “kırşehir Belde_Köy Nüfusu” dosyasındaki 252 köyün 2025 nüfusu programda. Yükleme başlık satırını okuyor, sütun sırasına bakmıyor, Türkçe (ANSI) kodlamayı çözüyor, ilçe adını grubun ilk satırından aşağı taşıyor ve “Köy” eki / yazım farklarını (Çuğun–Çoğun, Kargın–Karkın, Taşlıoluk–Taşoluk gibi) resmî listeyle eşleştiriyor — 252 satırın tamamı oturdu. Yaklaşık eşleşen 10 satır Kaynak sütununda “yaklaşık eşleşme: …” diye işaretli, denetlenebilir; Büyük/Küçük, Aşağı/Yukarı, Dere/Tepe gibi ayırt edici ek taşıyan adlar birbirine hiç eşleşmiyor.
- Hayvan varlığı (büyükbaş/küçükbaş) hâlâ yok — Tarım ve Orman Bakanlığı İBS ekstresi aynı ekrandan yüklenir, nüfusların üzerine yazmaz.
- Depo, AG panosu, GES kayıtları hâlâ örnek veri — gerçekleri girilmeli.
- Malzeme birim fiyatları tahmin — gerçek liste gerekiyor.
- 264 kuyunun teknik alanları boş; sahada tek tek doldurulacak.

## 3. Geliştirme önerileri

**Yakın vadeli, işi doğrudan kolaylaştıran**
- Barkod / QR — tesise etiket yapıştırıp telefonla okutma. Kayıt aramadan doğrudan açılır.
- Pompa hesap programı bağlantısı — kuyu ve direk barkodundan pompa değerlerinin otomatik işlenmesi.
- Kuyu-depo ilişkisi — hangi kuyu hangi depoyu besliyor; haritada hat olarak görünür.
- Terfi hattı çizimi — iki nokta arasına hat, uzunluk hesabı.

**Orta vadeli**
- Arıza tekrarı analizi — aynı kuyu yılda kaç kez arızalandı, hangi parça.
- Elektrik tüketimi takibi — sayaç okumalarından aylık tüketim, anormal artış uyarısı.
- Su kalitesi takvimi — analiz periyodu ve süresi geçen kuyular.
- Yıllık rapor — kurum içi sunum için otomatik özet.

**Uzun vadeli**
- Telemetri bağlantısı — RF modülü olan kuyulardan canlı seviye ve debi.
- Yükseklik verisi (SYM12) — terfi hattı basma yüksekliği hesabı.
- Diğer illere açılım — veri yapısı hazır, il seçimi eklemek yeterli.

## 4. Fazlalık
Programda kullanılmayan ya da gereksiz parça bulunmadı. Bu oturumda kaldırılanlar: il ve ilçe sınırı katmanları (istek üzerine), köy konumu doğruluk listesi (gömülü veri sonrası gereksizdi), LT/S cihaz ataması, eski Envanter v1 dosyası.


---

## Oturum kaydı — 7 Eylül 2026

Bu oturumda yapılanlar (hepsi mobil + masaüstü):

1. **Köy/ilçe düzenleme formunda** — kontrol edildi, hazırdı: form başında İlçe ve Köy/yerleşim seçimi; köy değişimi geçmişe yazılıyor ve harita güncelleniyor.
2. **Deneme karşılaştırma grafiği telefona geldi.** Masaüstünde zaten olan SVG grafik (debi çubukları + özgül debi çizgisi, `detail.chart`) telefon Deneme sekmesine de eklendi. Kısa süre iki grafik birlikte duruyordu; yeni yazılan ikinci uygulama kaldırıldı, tek grafik tanımı kaldı.
3. **Simgeler:** Yenile (döngü oku), Çıkış (kapıdan çıkış oku) ve haritadaki Yeni arıza düğmesi (siren) Lucide setinden güncellendi. Bildirim şeridindeki uyarı üçgeni ayrı kaldı.
4. **Envanter — sıralama, süzme, arama.** Masaüstünde sütun başlığına basınca sıralama (ikinci basış ters, ok işareti); başlık altı satırında Tür / İlçe / Durum süzgeçleri; sekmeye özel arama kutusu (kod, köy, ilçe, tür, tüm teknik alanlar). Telefonda arama + üç süzgeç + sıralama seçimi + A→Z / Z→A yön düğmesi. Kayıt sayacı, "Süzgeci temizle" ve duruma göre boş liste metni.
5. **Arıza — sıralama, süzme, arama.** No / Kayıt / Arıza türü / Öncelik / Durum / Ekip / Bildirim başlıklarından sıralama (öncelik Acil→Düşük mantıksal sırayla), Öncelik / Durum / Ekip süzgeçleri, arama no-kayıt-tür-ekip-not içinde. İki platformda boş süzgeç satırı.
6. **Çıkış düğmesi** masaüstü üst şeridin en sağına alındı.
7. **Harita açılışı** artık her zaman Kırşehir il sınırlarını kapsıyor (38.76–39.80 K, 33.28–34.66 D). Oturtma kap gerçekten ölçüldükten sonra tek seferlik çalışıyor (whenReady + rAF + resize + ResizeObserver); bir konuma uçma veya rota komutu geldiyse görünüm geri çekilmiyor. Araç çubuğundaki "sığdır" eskisi gibi kayıtlara odaklıyor.

### Yeni state anahtarları
`envQ`, `envSort`, `envF`, `arzQ`, `arzSort`, `arzF` — sıralama ve süzgeç durumu.

### Bekleyen
- `SQL-cop-kutusu.sql` Supabase'de bir kez çalıştırılmalı (çöp kutusu kolonları + otomatik temizleme).
- Backlog: Bakım bölümünde hedef tarih / GİT alanları, Özet bölümü ilçe listesi.

---

## Oturum kaydı — 9 Eylül 2026 (sürüm 2026.09.09-21)

ALİSAY raporundaki açık dört madde tek sürümde kapatıldı.

1. **Durum akışı genişledi.** Etiketli durumlar: Açık, Atandı, Sahada, Bilgi
   bekliyor, Beklemede, **Yönlendirildi (başka birime)**, Kontrolde,
   **Yeniden açıldı**, Çözüldü, İptal. Süzgeç ve listeler bütün durumları
   yazıyor; “kapalı” sayımı artık Çözüldü + İptal — iptal edilen kayıt açık iş
   sayılmıyor, hedef süre işlemiyor.
2. **Yeniden açma.** Kapanmış ya da iptal edilmiş kayıtta “Yeniden aç” düğmesi
   çıkıyor (ekip atama yetkisi olanlarda). Neden sorulur, kaydın notuna
   damgayla yazılır, durum “Yeniden açıldı” olur, tekrar sayacı artar —
   fotoğraf, malzeme ve maliyet kayıtta kalır.
3. **Mükerrer kayıt uyarısı.** Yeni arıza kaydedilirken aynı tesiste açık kayıt
   ya da son yedi günde aynı türden kapanmış kayıt varsa liste gösterilip
   sorulur: var olanı açar ya da yine de ayrı kayıt oluşturur.
4. **Ekip yönetimi.** Ayarlar > **Ekipler**: her ekip için vardiya (Gündüz /
   Vardiyalı / Nöbet / İzinli) ve yetkinlik (Elektrik / Mekanik / Sondaj /
   Kaynak), yanında canlı yük — açık, çözülen, gecikmiş iş sayısı ve yük
   çubuğu. Ekip adı sabit: kayıtlarda metin olarak durduğu için değişmiyor.
   Arıza formunda seçilen ekibin vardiyası, yetkinliği ve o an açık iş sayısı
   görünüyor; arıza türü ekibin yetkinliğiyle uyuşmazsa kırmızı uyarı yazıyor
   (atamayı engellemiyor).
5. **Tekrar arıza raporu.** Özet ekranına “Tekrarlayan arızalar” bölümü:
   aynı tesiste birden çok kaydı olanlar, kayıt sayısı, en sık arıza türü, son
   tarih ve açık kayıt sayısı; satıra basınca tesisin arıza sekmesi açılıyor.
   Arıza formunda da o tesisin geçmişi tek satır özetleniyor.
6. **Bildirim yeni tasarım.** Bildirimler masaüstünde sağ üstten, telefonda
   üstten geliyor; iOS bildirim kartı gibi: cam (blur) zemin, yuvarlak köşe,
   simge karesi, başlık + “şimdi” satırı, yaylı giriş animasyonu.

Vardiya ve yetkinlik ks-ekipler anahtarıyla cihazda saklanıyor. Sunucuda şema
değişikliği gerekmedi — yeni durumlar ve tekrar sayacı arıza kaydının kendi
alanlarında taşınıyor.

### Bekleyen
- Sonraki adım: ALİSAY’da olup bizde olmayan yapıları birlikte gözden geçirip
  hangilerinin alınacağına karar vermek.
- Bütün işler bittikten sonra arayüzün Apple yazılımlarındaki gibi baştan ele
  alınması (premium görünüm) — bildirim bu yönde ilk parça.

---

## Oturum kaydı — 10 Eylül 2026 (sürüm 2026.09.10-22)

Sırayla alınacak altı maddenin **birincisi** yapıldı.

**Ambar ve zimmet** — yeni menü sekmesi *Ambar*. Dört ambar (Merkez, Kaman,
Mucur, Çiçekdağı), stok kalemleri malzeme listesinden geliyor (gün birimli
hizmet kalemleri stok sayılmıyor). Beş hareket türü: ambar girişi, ambar
çıkışı, ekibe zimmet, zimmet iadesi, sahada sarf. Mevcudu eksiye düşüren
hareket kabul edilmiyor, uyarı çıkıyor. Ekran üç bölüm: stok mevcudu (ambar
dağılımı, ekiplerdeki miktar, toplam, tutar; kritik eşiğin altı kırmızı), ekip
zimmeti (her ekibin elindekiler, iade / sarf düğmeleri) ve son hareketler
dökümü (kim, ne zaman, hangi ambar / ekip, not).

Arızayla bağı: bir arıza “Çözüldü” olarak kaydedilirken kayıtta malzeme varsa
“ekip zimmetinden düşülsün mü?” diye soruyor; onaylanırsa her kalem için
sarf hareketi yazıyor ve zimmette olmayanları isim isim bildiriyor.

Modüler: Ayarlar > Modüller > **Ambar ve zimmet** kapatılırsa sekme kaybolur,
arıza kaydındaki malzeme listesi çalışmaya devam eder. Veriler `ks-ambar`
anahtarıyla cihazda tutuluyor; sunucuya taşınması sonraki adım.

**Bildirime dokunma** — bildirim artık tıklanabilir ve ilgili yere götürüyor:
yeni/güncellenen arıza o kaydı açıyor, kuyruk bildirimi Kuyruk sekmesine,
modül ve ekip değişikliği ilgili Ayarlar bölümüne, yerleşim eklemesi Yerleşim
sekmesine, çöp kutusu temizliği Ayarlar > Çöp kutusu'na.

### Sıradaki (kullanıcı onaylı sıra)
2. Sistem geneli denetim izi
3. Araç ve ekipman kaydı
4. Dış kanaldan talep alma (muhtar / vatandaş)
5. Gerçek SMS / WhatsApp gönderimi
6. KVKK ve saklama politikası

Arayüzün Apple tarzı yenilenmesi bu altı madde bittikten sonra.

---

## Oturum kaydı — 11 Eylül 2026 (sürüm 2026.09.11-33)

ALİSAY listesindeki altı madde ve ekip tarafındaki beş geliştirme bitti;
bu turda yedi modül ortak veritabanına taşındı.

### Sunucuya taşıma
Ekip, personel, nöbet, ambar, araç ve talep kayıtları artık `kurum_veri`
tablosunda anahtarlı olarak duruyor; denetim izi ayrı `denetim` tablosunda,
değiştirilemez ve silinemez (tetikleyiciyle kilitli). Erişim yalnızca
`veri_oku`, `veri_hepsi`, `veri_yaz`, `denetim_ekle`, `denetim_toplu` ve
`denetim_listesi` fonksiyonlarından; tablolara doğrudan erişim RLS ile kapalı.

Yetki: ekip, personel ve nöbet düzenini yalnızca müdür ve yönetici
değiştirebiliyor; ambar, araç ve talebi izleyici dışında herkes yazabiliyor.

Program tarafı: her yazma önce cihaza, sonra sunucuya gidiyor. Sunucu
yazması başarısızsa modül kuyruğa giriyor; bağlantı geri gelince
kendiliğinden gönderiliyor. Ayarlar > Veri ve bildirim bölümünde eşitleme
durumu, bekleyen modül listesi, “Kuyruğu gönder” ve “Sunucudan yeniden
yükle” var. Girişte bütün modüller tek çağrıyla okunuyor; sunucu boşsa
cihazdaki kopya korunuyor (ilk kurulumda veri kaybı olmasın).

### Bu turdan önce yapılanlar
- Ekipler bölümü personel havuzu + ekip kurma olarak yeniden düzenlendi:
  ad soyad, meslek, telefon havuzda; ekip kurarken oradan seçiliyor.
- Ekip bölgesi çok seçimli (Tüm il + yedi ilçe çipleri).
- Personel durumu: görevde / izinli / raporlu / başka görevde / ayrıldı,
  dönüş tarihiyle. İzinli şefe mesaj gitmiyor, ekipte kimse kalmazsa uyarı.
- Nöbet takvimi: haftanın günlerine ekip; arıza formunda nöbetçi önce.
- Arıza formunda “Önerilen ekipler” — nöbetçi, bölge, görevdeki kişi, yük.
- Personel kartı program hesabına bağlanabiliyor (bir hesap tek kişiye).
- Özet ekranına ekip performansı bölümü.

### Yükleme
- GitHub: `yayin` klasörünün tamamı.
- Supabase: `SQL-moduller-sunucu.sql` (bir kez). Daha önce çalıştırılmadıysa
  `SQL-cop-kutusu.sql` de gerekli.
- SMS/WhatsApp için `supabase-islev-mesaj-gonder.ts` Edge Function olarak
  yayınlanacak; operatör bilgileri Secrets kısmına girilecek.

### Menü sadeleştirmesi (sürüm 2026.09.11-35)
On üç sayfa dört başlık altında toplandı: Saha (harita, bugün, arıza, talep,
bakım), Kayıtlar (envanter, ambar, araç, yerleşim), Çözümleme (özet, profil),
Sistem (kuyruk, ayarlar). İçi boşalan başlık görünmüyor.

Telefonda alt çubuk on bir düğmeden beşe indi: dört sayfa + "Tümü". Tümü
başlıklı tam listeyi açıyor; gizli kalan sayfalardaki bekleyen sayısı
Tümü düğmesinde toplu gösteriliyor.

### Bekleyen
- Arayüzün Apple yazılımlarındaki gibi baştan ele alınması (premium görünüm).

---

## Veri bütünlüğü düzeltmeleri — sürüm 2026.09.11-37

İkinci denetimin dört bulgusu kapatıldı. Arayüzde hiçbir şey değişmedi.

**1. Çakışma denetimi.** Modül verisi artık sürümüyle okunuyor ve yazarken
okunan sürüm geri gönderiliyor. Sunucudaki sürüm değişmişse yazma
reddediliyor; program iki değişikliği birleştirip yeniden yazıyor. Ekip,
personel ve talep kayıt bazında (ad/id anahtarıyla), nöbet gün bazında
birleşiyor. Ambar ve araç sayı içerdiği için kör birleştirilmiyor:
sunucudaki doğru kabul ediliyor ve kullanıcıya işlemi yenilemesi söyleniyor.

**2. Ambar aritmetiği sunucuda.** Cihaz yeni bakiyeyi değil yapılacak
hareketi gönderiyor (`ambar_hareket`). Toplama çıkarma satır kilidi altında
sunucuda yapılıyor; iki eşzamanlı düşüş sıraya giriyor, ikisi de tutuyor.
Bakiye yetmeyen kalem reddediliyor, kalanı işleniyor. Çevrimdışı hareketler
`ks-ambar-kuyruk` içinde bekliyor. `ambarYaz` kaldırıldı — bakiye değiştiren
her işlem `ambarIslem` üzerinden geçiyor.

**3. Numara sunucudan.** `numara_sayaci` tablosu ve `numara_al`. Çevrimdışı
geçici numara veriliyor (TLP-2026-Gxxx-nnn, cihaza özgü üç harf ile),
eşitlenince `numara_toplu` ile kesin numaraya çevriliyor.

**4. Sunucu saati.** Girişte `sunucu_saati` okunup cihaz saatiyle fark
ölçülüyor; `damga()` bu farkı düzeltiyor. Bir dakikadan küçük fark yok
sayılıyor. Fark varsa kullanıcı uyarılıyor ve denetim izine yazılıyor.
Fark çevrimdışı açılış için saklanıyor.

Senaryo testi: birleştirme mantığı on bir durumda denendi, hepsi geçti.

### Yükleme
- GitHub: `yayin` klasörünün tamamı.
- Supabase: `SQL-veri-butunlugu.sql` (bir kez). Ön koşul:
  `SQL-moduller-sunucu.sql` daha önce çalıştırılmış olmalı.

## Yetki anahtarlarının süzgeçlere bağlanması — sürüm 2026.09.11-38

Menü birleşmesinin ön koşulu tamamlandı. Görünürde bir değişiklik yok.

`SUZGEC_TANIM` birleşmeden sonraki altı sayfayı ve içindeki süzgeçleri
tanımlıyor; her süzgeç bugünkü sayfa yetkisini üçüncü sütundan miras alıyor.
Yetki tablosu ve kullanıcı kayıtları hiç değişmedi — yalnızca yetkinin
nereye uygulandığı tanımlandı.

- isler: gelen←talep, acik←ariza, bugun←gunluk, planli←bakim
- envanter: liste←envanter, harita←harita
- kaynaklar: malzeme←ambar, arac←arac
- ozet: ozet←ozet, denetim←ayarlar, cop←ayarlar
- kesit: kesit←profil
- ayarlar: ayarlar←ayarlar, yerlesim←yerlesim, aktarim←aktarim
- üst çubuk göstergesi: kuyruk←kuyruk

`SUZGEC_ESKI` eski kimlikleri yeni sayfa+süzgeç çiftine çeviriyor.
`suzgecYetki`, `suzgecler` ve `sayfaGorunur` yardımcıları hazır;
`sayfaTam` artık süzgeç haritasından okuyor (bugün her eski sayfa tek
süzgece karşılık geldiği için sonuç birebir aynı).

Ayarlar > Yetki bölümüne süzgeç haritası tablosu eklendi: yönetici
birleşmeden önce kendi hesabı için hangi yetkinin nereye gideceğini görüyor.

Test: on dört sayfa kimliğinin hepsi haritada, uydurma kimlik yok, üç rol
senaryosunda yetkiler birebir devroldu. Arıza personeli 6 sayfadan 3'e,
ekip şefi 10'dan 4'e, izleyici 10'dan 5'e iniyor.

### Sıradaki iş
1. ~~Yetki anahtarlarının süzgeçlere bağlanması~~ — bitti.
2. Menü birleşmesi — on üçten altıya. Bakım, İşler sayfasında "Planlı"
   süzgeci olarak kalıyor (karmaşıklaşırsa ayrılır). Profil → Hat Kesiti.
3. Arayüz yenilemesi.

---

## İşler birleşmesi — sürüm 2026.09.11-40

Talep, Arıza, Bugün ve Bakım tek "İşler" sayfasında dört süzgeç oldu.
Menüde on üç yerine on sayfa var.

Yaklaşım: dört ekranın gövdesine dokunulmadı. Program içeride eski sayfa
kimliklerini (talep/ariza/gunluk/bakim) kullanmaya devam ediyor, böylece
"arıza kaydına git" gibi bütün mevcut geçişler olduğu gibi çalışıyor.
Değişen yalnızca sunum: dört ekranın üstüne süzgeç çubuğu kondu, menüde
tek İşler girdisi var.

- Menü girdisi dört ekrandan biri açıkken etkin görünüyor.
- Tıklanınca kullanıcının yetkili olduğu ilk süzgece gidiyor.
- Süzgeç listesi hem yetkiye hem modül anahtarına göre süzülüyor
  (arıza modülü kapalıysa Açık süzgeci yok).
- Menü rozeti açık arıza + açık talep sayısı; süzgeç düğmelerinde de
  kendi sayıları görünüyor.
- Telefon alt çubuğu: İşler, Harita, Envanter, Özet + Tümü.
- Bakım "Planlı" süzgeci olarak İşler içinde (kullanıcı kararı).

### Kalan birleşmeler
1. Envanter + Harita → tek sayfa, Liste/Harita düğmesi.
2. Ambar + Araç → Kaynaklar.
3. Özet + Denetim izi + Çöp kutusu sekmeleri.
4. Kuyruk sayfası → üst çubuk göstergesi.
5. Ayarlar sekiz bölümden üçe (Kurum / Veri / Program).
6. Profil → Hat Kesiti adlandırması.

Sonra: arayüz yenilemesi.


---

## Kalan birleşmeler — sürüm 2026.09.11-46

Menü on sayfadan **altıya** indi. Ekran gövdelerine dokunulmadı; program
içeride eski sayfa kimliklerini kullanmayı sürdürüyor, bütün mevcut geçişler
("arıza kaydına git", bildirime dokunma, derin bağlantılar) çalışıyor.

**Menü**
- Saha: İşler · Envanter
- Kayıtlar: Kaynaklar
- Çözümleme: Özet · Hat Kesiti
- Sistem: Ayarlar

**1. Envanter + Harita.** Tek sayfa, üstte Liste / Harita süzgeci. Harita
artık ayrı menü girdisi değil.

**2. Ambar + Araç → Kaynaklar.** Malzeme / Araç süzgeci. Modülü kapalı olan
süzgeç hiç çıkmıyor; ikisi de kapalıysa sayfa menüde görünmüyor.

**3. Özet + Denetim izi + Çöp kutusu.** Denetim izi ve çöp kutusu Ayarlar'dan
çıkıp Özet sayfasının süzgeci oldu. Yetkileri Ayarlar yetkisinden miras
alınıyor — Ayarlar yetkisi olmayan kullanıcı bu iki süzgeci görmüyor.

**4. Kuyruk sayfa olmaktan çıktı.** Bekleyen kayıt varsa üst çubukta kırmızı
"Kuyruk n" göstergesi çıkıyor (telefonda yalnız sayı), dokununca kuyruk
listesi açılıyor. Bekleyen yoksa gösterge yok.

**5. Ayarlar sekiz bölümden üçe indi.**
- **Kurum** — yetkiler ve kullanıcılar, ekipler, KVKK
- **Veri** — ortak veritabanı, eşitleme, bildirim
- **Program** — harita ve görünüm, modüller
Köy konumları ve İçe/dışa aktarım, Ayarlar sayfasının süzgeçleri oldu.
Eski bölüm kimlikleri (gorunum, modul, ekip, kvkk, bildirim…) yeni gruplara
kendiliğinden düşüyor, kayıtlı tercih bozulmuyor.

**6. Profil → Hat Kesiti.** Yalnız ad değişti; sayfa tek süzgeçli olduğu için
süzgeç çubuğu çıkmıyor.

**Süzgeç çubuğu** artık ortak: sayfa adı + açıklama + süzgeç düğmeleri, her
birleşmiş sayfanın üstünde, içerikten önce. İki süzgeçten azı olan sayfada
görünmüyor. Arıza ve talep süzgeçlerinde açık iş sayısı yazıyor.

**Telefon alt çubuğu:** İşler · Envanter · Kaynaklar · Özet · Tümü.

### Yükleme
- GitHub: `yayin` klasörünün tamamı.
- Supabase: `SQL-veri-butunlugu.sql` (bir kez, daha önce çalıştırılmadıysa).
  Ön koşul: `SQL-moduller-sunucu.sql`.

### Kalan tek iş
Arayüz yenilemesi. Menü ve sayfa yapısı artık sabit — yenileme bunun
üzerine oturacak.


---

## Arayüz yenilemesi — sürüm 2026.09.12-50

Kırmızı-keskin kurumsal düzen bırakıldı; program baştan sona Apple
yazılımlarının sakin, ferah diline geçti. Masaüstü ve telefon birlikte
değişti, hiçbir işlev kaldırılmadı.

**Bildirim tek yerde.** Alt köşedeki ve telefondaki alt kutu kalktı; bütün
bildirimler sağ üstteki tek kartta çıkıyor. Kart türüne göre renkleniyor:
mavi bilgi, yeşil olumlu, kırmızı uyarı ve arıza.

**Renk.** Ana renk artık kırmızı değil — sakin bir mavi (#0071e3). Kırmızı
yalnız üç yerde: acil öncelik, hata ve uyarı kutuları, çevrimdışı şeridi.
Zemin #f5f5f7, yazı #1d1d1f, ayraçlar saç teli inceliğinde. Koyu tema
gerçek siyah üzerine kuruldu.

**Yazı.** Archivo yerine cihazın kendi arayüz yazı tipi (SF Pro / Segoe UI /
Roboto). Bütün büyük harfli etiketler normal yazıma döndü — 759 yerde.
Küçük etiketler okunur boyuta çıkarıldı, kalınlıklar 700'den 600'e indi.

**Biçim.** 2px sert çizgiler 1px saç teline indi (600'den fazla kutu),
köşeler yuvarlandı, gölge yalnız yüzen ögelerde.

**Menü.** Sol sütun 250px'e genişledi, satır ayraçları kalktı, etkin sayfa
dolu mavi hap olarak duruyor. Telefon alt çubuğu iOS sekme çubuğu gibi:
ayraçsız, nokta göstergeli. "Tümü" listesi iOS gruplu liste biçiminde.

**Sayfa başlığı.** Her birleşmiş sayfanın üstünde büyük başlık + iOS bölmeli
süzgeç denetimi var. Gövdedeki tekrarlayan başlıklar kaldırıldı.

**Süzgeç hapları.** Harita ve envanterdeki tür süzgeçleri bitişik kutu
olmaktan çıkıp yuvarlak hap oldu; seçili olan dolu mavi.

### Yükleme
- GitHub: `yayin` klasörünün tamamı. Veritabanı değişikliği yok.


---

## Arayüz — ikinci tur, sürüm 2026.09.13-62

**Bildirim tek yerde.** Bütün bildirimler sağ üstteki tek kartta çıkıyor; kart
türüne göre renk alıyor (mavi bilgi, yeşil olumlu, kırmızı uyarı ve arıza).

**Harita çerçeveleri de yeni dile geçti.** Hat Kesiti, harita ve hat ekranları
ayrı birer belge olduğu için tasarım sisteminin kırmızı vurgusunu okumaya devam
ediyordu — bu yüzden “hat kesitinde envanterin üstüne gelince kırmızı yanıyor”.
Üç ekrana da ana penceredeki belirteçler eklendi: vurgu mavi, çizgiler saç
teli, köşeler yuvarlak. Haritada işaretin üstüne gelince mavi yanıyor;
envanter tablosunda satır aynı şekilde maviye dönüyor.

**Üst başlık küçüldü.** Başlık 19px, açıklama tek satır; süzgeçler başlığın
altına, sola yaslı geçti — Ayarlar / Köy konumları / İçe ve dışa aktarım artık
sayfa adıyla aynı hizada durmuyor.

**Envanter harita ile açılıyor.** Sayfanın ilk süzgeci Harita, ikincisi Liste.
Listede üstteki denetim şeridi kalktı: arama kutusu süzgeç satırının Kod
hücresine, kayıt sayacı sayfa başlığının sağına taşındı — bir satır kazandı.

**Telefon.** Harita açıkken başlık şeridi hiç çıkmıyor; tür süzgeçleri haritanın
üstünde yüzen beyaz haplar oldu (açık olan mavi yazıyor), soldaki ilk hap
sayfanın öbür görünümüne (Liste) geçiriyor. Harita böylece ekranın neredeyse
tamamını alıyor: yalnız arama çubuğu ve alt sekme çubuğu kalıyor.

**Menü sırası.** Saha: Envanter · İşler. Telefon alt çubuğu: Envanter · İşler ·
Kaynaklar · Özet · Tümü.

**Tek süzgeci kalan sayfa o süzgecin adını alıyor.** Arıza, bakım ve talep
modülleri kapatıldığında İşler sayfası kendiliğinden geriye kalan süzgecin adıyla
görünüyor (örneğin yalnız “Bana atanan”); dördü de kapalıysa sayfa menüden
düşüyor. Böylece boş bir “İşler” kabuğu kalmıyor.

**Sürüm ve önbellek.** Ayarlar > Veri'ye “Program sürümü” karti eklendi:
çalışan sürüm yazıyor, “Programı tazele” düğmesi önbelleği boşaltıp programı
sunucudan yeniden indiriyor. Telefonda kaldırılmış kayıtların görünmesinin
nedeni cihazdaki eski kopyadır — demo üretimi 9 Eylül'de programdan çıktı,
yeni kopya yalnızca gerçek KML kuyu noktalarıyla açılıyor. Cihazda sunucuya
yazılmamış kayıt varsa aynı kartta sayısıyla görünüyor ve tek düğmeyle
silinebiliyor.

**Haritada nokta bırakma** zaten çift tıklamaya bağlı: bilgisayarda haritaya
çift tıklayınca koordinat kartı açılıyor, kart “yeni kayıt”, “köy konumu olarak
işaretle” ve “bu noktaya git” seçeneklerini veriyor. Telefonda karşılığı uzun
basış. Tek dokunuş haritada gezinmeye bırakıldı.

### Yükleme
- GitHub: `yayin` klasörünün tamamı (index.html, harita.html, profil.html, hat.html).
- Veritabanı değişikliği yok.


---

## Devir — sürüm 2026.09.14-89 (14 Eylül 2026)

Çalışma Claude Code tarafında sürdürülecek. `design_handoff_kirsehir_envanter/`
klasöründe devir paketi hazır: README (yapı, localStorage anahtarları, SQL
sırası, yayın adımları, sıradaki işler) + `yayin/` klasörünün tamamı + durum,
kurulum ve yayın belgeleri.

Bu turda kapatılanlar:
- **Telefon katmanları kalıcı çözüldü.** Sabit piksel yerine canlı
  `--tel-bas` / `--tel-nav` CSS değişkenleri; açılan bütün paneller bunlara
  yaslanıyor, cihaz/çentik farkından bağımsız çakışma olmuyor.
- **Başlık satırı** telefonda 42px'te eşitlendi (arama, ↔ Koordinat, On, tema,
  kuyruk); filtre şeridi haritanın üstünden inip kendi bandına oturdu.
- **Masaüstü sayfa çubuğu** tek satıra indi (~190px → ~100px), bütün birleşik
  sayfalarda ortak.
- **Harita menüsü** (sağ üst üç çizgi) tek satıra döndü — `#tools button{all:unset}`
  kuralı `#menu`'nün flex düzenini siliyordu.
- **Tema kalıcılığı.** Cihaz damgası `ks-tema` ile kullanıcı tercih dosyası
  çakışıyordu; artık girişte cihazdaki son açık seçim kazanıyor, tercih dosyası
  yalnız cihazda kayıt yoksa devreye giriyor, her seçimde ikisi eşitleniyor.
- **Açılış sayfası** üç giriş yolunda da Envanter > Harita.

### Yükleme
GitHub: `yayin` klasörünün tamamı. Veritabanı değişikliği yok. Yükleme sonrası
bir kez sert yenileme (Ctrl+F5) gerekir.

### Kalan işler
Telefonda uzun basışla nokta bırakma · hat kesitinde çift tıkla nokta ekleme ·
koyu tema ince ayarı · yetki tablosunun sadeleştirilmesi.

---

## Son rötuşlar — sürüm 2026.09.13-71


- Envanter haritasındaki kayıt etiketleri yeni dile geçti: yuvarlak köşe,
  hafif gölge, üstüne gelince mavi. Mesafe etiketi de yuvarlak hap oldu.
- Sol menü 250px'ten 196px'e indi.
- Hat kesitinde uydu zeminine yer adları katmanı eklendi — uydu görüntüsü
  kendi başına il, ilçe ve köy adı taşımıyor, adlar ayrı saydam katmandan
  gelir. Uydudan sokağa dönünce katman da kalkıyor.
- Menüde altı sayfa çıkması doğrudur: birleşmeden sonra on üç sayfa altıya
  indi (Envanter, İşler, Kaynaklar, Özet, Hat Kesiti, Ayarlar). Kapanan
  modüller sayfa değil süzgeç düşürür.

### Yükleme
GitHub: `yayin` klasörünün tamamı. Veritabanı değişikliği yok.


---

## Telefon katmanları — sürüm 2026.09.13-76

- Telefonda bildirim kartı üst çubuğun üstüne biniyordu; artık arama
  çubuğunun altına iniyor (çentikli ekranlarda güvenli alan hesaba katıldı).
- Alttaki nokta seçme ve konum onay şeritleri güvenli alan kadar yükseltildi.
- Sol menü artık kaydırma gerektirmiyor: oturum kartı iki satıra indi
  (ayrıntısı fare ipucunda), satır aralıkları sıkıldı, genişlik 196px.

### Yükleme
GitHub: `yayin` klasörünün tamamı. Veritabanı değişikliği yok.


---

## Üç düzeltme — sürüm 2026.09.14-80

**Arama önerileri artık sayfayı itmiyor.** Köy ve kuyu önerileri akış içinde
duruyordu, liste açıldıkça altındaki her şey aşağı kayıyordu. Öneriler
arama kutusunun altına düşen yüzen bir listeye alındı — masaüstünde ve
telefonda aynı. Sayfa yerinden oynamıyor.

**Konum onayı bir kez sorulur.** "Bu konum doğru mu" şeridi dört ayrı yerden
açılıyordu; yalnız birine onay denetimi konmuştu. Artık tek bir denetim
(`vOnayli`) var: köyün konumu onaylanmış ya da elle işaretlenmişse hiçbir
yoldan bir daha sorulmuyor.

**Program bırakıldığı yerden açılıyor.** Giriş, sayfayı haritaya zorluyordu;
tercih okuması da Ayarlar sayfasını dışarıda bırakıyordu. Artık bırakılan
sayfa, Ayarlar bölümü, envanter süzgeçleri ve arama metni, ekran düzeni
seçimi, tema, harita zemini, katmanlar ve koordinat sistemi olduğu gibi geri
geliyor. Kullanıcı başına, cihaz başına saklanıyor; iki cihaz birbirinin
düzenini bozmuyor.

### Yükleme
GitHub: `yayin` klasörünün tamamı. Veritabanı değişikliği yok.
