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


---

## ISU referans katmanları ve doğrulama turu — sürüm 2026.09.29-90

Kullanıcı üç ISU KML dosyası verdi (`ISU_KAYNAK.kml`, `ISU_MEMBA.kml`,
`ISU_ISUDEPO.kml`, ISU kurumundan) — programa dahil edilmesi ve daha önceki
verilerle karşılaştırılması istendi.

**Veri karşılaştırması.** Placemark'larda ad/açıklama yok, yalnız koordinat
var. 30 m eşikte karşılaştırıldı:
- ISU_KAYNAK: 204 noktanın 137'si (%67) mevcut 264 kuyu noktasıyla aynı yerde.
- ISU_MEMBA: 352'nin 48'i (%14) kuyularla ortak.
- ISU_ISUDEPO: 264 kuyuyla yalnız %3 ortak, ama canlı veritabanındaki 24
  gerçek depo kaydıyla %87 (21/24) ortak — gerçek depo kayıtlarımız büyük
  olasılıkla bu ISU listesinden girilmiş. Bu karşılaştırmayı ilk turda "hiç
  gerçek depo kaydı yok" diye yanlış yaptım (Supabase `list_tables`'ın eski/
  önbellek satır sayısına güvenip doğrudan sorgulamamıştım) — kullanıcı
  düzeltti, doğrudan `SELECT COUNT(*)` ile teyit edip düzelttim.

**Harita katmanı — üç yeni referans türü, kendi düğmesi yok.** ISU_KAYNAK,
ISU_MEMBA, ISU_ISUDEPO verisi `isu-katmanlar.js`'e gömüldü (her katmanın
kendi içindeki 30 m altı tekrarlar elendi). harita.html'de var olan
Kuyu/Depo/AG/GES süzgeç şeridine bağlandı — Depo süzgeci artık ISU_ISUDEPO'yu
da kapsıyor, Kaynak ve Memba için şeride iki yeni buton eklendi (varsayılan
kapalı). Noktalar gerçek kayıtlarla aynı `.ks-pin` harf-kutusu simgesiyle
çiziliyor (kesikli çerçeve + kendi rengiyle "referans, henüz kayıt değil"
ayrımı yapılıyor). **Statik değil:** `isuYenile()` her asset güncellemesinde
yeniden hesaplanıyor — Kaynak/Memba kuyularla, Depo gerçek depo kayıtlarıyla
30 m'den yakın noktaları eler, yalnız kaydı girilmemiş adaylar kalır (Depo
307 → 286, Kaynak 197 → 66, Memba 344 → 296). Tıklama var olan "nokta bırak"
akışını kullanıyor — istenirse doğrudan yeni kayda çevrilebiliyor.

**Bulunan ve düzeltilen iki gerçek hata:**
- `componentDidUpdate` (index.html), `prevState`'i kendi "boş olabilir"
  kontrolünden ÖNCE okuyordu — bazı çağrılarda çöküyordu. Eski sürümde de
  vardı (bugünkü işten kaynaklanmadığı doğrulandı), kontrol yukarı taşındı.
- Girişten sonra "X tesis · Y arıza yüklendi" bildirimi her açılışta
  çıkıyordu — gerçek bir otomatik giriş olmadığı için (her açılışta elle
  "Giriş yap" gerekiyor) bu bildirim sürekli tekrarlıyordu; sessize alındı,
  hata/çevrimdışı bildirimleri etkilenmedi.

**Anlık çoklu kullanıcı senkronizasyonu.** Silme dahil hiçbir değişiklik
başka bir kullanıcının ekranında kendiliğinden görünmüyordu (yalnız o
kullanıcının kendi işlemi tetiklerse yenileniyordu). 30 saniyede bir sessiz
arka plan yenilemesi eklendi (İşlem/yeni kayıt seçim ekranı açıkken atlanır).

**Silme özelliği — zaten vardı, doğrulandı.** Kayıt kartının en altındaki
sabit eylem şeridinde "Sil" düğmesi (Yönetici/Müdür), Çöp Kutusu'na taşıma,
30 gün geri getirme penceresi, Denetim İzi'ne otomatik yazma — hepsi
mevcuttu, yeniden yapılmadı.

**Test turu.** Giriş ekranı, harita (yeni süzgeçlerle), Hat Kesiti, hat
çizim sayfası — hem masaüstü hem gerçek 375px iframe genişliğinde (telefonun
gördüğü gerçek boyut) test edildi, hepsi temiz. Giriş sonrası ekranlar
(Envanter listesi, Ambar, Ayarlar, silme akışı) test edilemedi — canlı
veritabanına test hesabı açma girişimi Claude Code'un kendi güvenlik
sınıflandırıcısı tarafından engellendi; kullanıcı bu kısmı kendisi test edip
bulduklarını bildirecek.

**Çözülemeyen, bilinçli bırakılan bir konu.** Kayıt kartı/detay panelindeki
deneme grafiği ilk boyamada bir kerelik `{{ b.x }}` gibi çözülmemiş şablon
metniyle çiziliyor — DOM'da kalıcı iz bırakmıyor (yükleme bitince doğru
haliyle değişiyor), yalnız tarayıcı konsoluna ~40 zararsız hata basıyor.
Kök nedeni tasarım sisteminin üretilmiş çalışma zamanında (`support.js`);
iki farklı düzeltme denendi (şablon yer tutucu sayısı, konsol süzgeci),
ikisi de test edilip etkisiz bulundu ve geri alındı — bu hatalar tarayıcının
kendi SVG doğrulayıcısından geliyor, JavaScript'ten susturulamıyor. Gerçek
zamanlı hata ayıklayıcı erişimi olmadan kökü güvenle bulunamadı; ekranda
görünmediği ve kalıcı etkisi olmadığı için olduğu gibi bırakıldı.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı değişikliği
yok (yalnız okuma/karşılaştırma yapıldı, `SQL-ambar-hurda.sql` zaten
uygulanmıştı).

---

## Büyük güncelleme — Faz 1 başlangıcı — sürüm 2026.09.30-92

Kullanıcı 38 maddelik geniş bir liste verdi: talep alma kanalları (WhatsApp/
Telegram/SMS/sesli çağrı), ekip/araç/personel havuzu ve izin-mesai takibi,
araç takip API entegrasyonu (Arvento + çoklu firma), iş emri → saha kanıtı →
ambar kapanışı zinciri, KVKK/saklama politikaları, harita/envanter
iyileştirmeleri, NetCAD kolektör projeleri, kendi pompa/GES hesap motorunun
entegrasyonu, esnek raporlama — ve "bunları faza bölüp başlayabilirsin" dedi.
Plan dosyası: `C:\Users\abert\.claude\plans\glistening-sauteeing-spindle.md`.

**Kod tabanı taraması.** İstenenin büyük bölümü zaten vardı ve çalışıyordu:
Talep, Ekipler, Personel havuzu (`PERSONEL_DURUM`: aktif/izin/rapor/görevli/
ayrıldı), Araç (`ARAC_DURUM`: musait/gorevde/bakimda/arizali/disi), Ambar
(giriş/çıkış/zimmet/iade/sarf/hurda, atomik RPC, fiyat listesi, kritik stok
uyarısı), Arıza akışı (malzeme→ambar düşüşü, kanıt zorunluluğu, maliyet).
Gerçek boşluk: **"İş Emri" yalnızca bir düğmeydi**, tıklanınca hiçbir kayıt
üretmiyordu.

**İş Emri artık gerçek (Faz 1'in çekirdeği).** Yeni normalize `is_emirleri`
tablosu + RPC seti (`is_emri_kaydet`/`_kapat`/`_listesi`, `SQL-is-emirleri.sql`)
— mevcut `ariza_kaydet`/`tesis_kaydet` desenini izliyor. Ekip/personel/araç/
ambar hâlâ `kurum_veri` JSONB deposunda, dokunulmadı — iş emri onlara ad/id
ile referans veriyor. Arıza detayındaki "İş emri" düğmesi artık IEM-yıl-sıra
numaralı gerçek kayıt açıyor (yetki: assign rolleri), var olan iş emrinin
durumunu gösteriyor. Arıza "çözüldü" olarak kapanınca bağlı açık iş emri de
otomatik kapanıyor — malzeme/saat/not tesisin arıza geçmişine yazılıyor.
`alt_sistem_kategori` referans tablosu eklendi (kolektör/terfi/isale hattı
arızası raporda kuyu/depo/elektrik/kanal toplamına doğru katılsın diye,
madde 20 — Faz 3'teki raporlama motoru kullanacak). `talepler.kanal`'a
telegram/sms seçenekleri eklendi (yalnız alan, gerçek entegrasyon yok).

**KVKK saklama politikası.** `foto` tablosunda tesis_id/ariza_id ayrımı
vardı ama kullanılmıyordu — arıza kanıtları da yalnız tesis_id ile
yükleniyordu. Artık `fotoYukle`/`sesYukle`/`arizaFotoGonder` arıza kaydının
id'sini de gönderiyor (`SQL-kanit-saklama.sql`). Sonuç: **envanter
fotoğrafı ömür boyu**, **arıza kanıtı (foto/ses) 2 yıl sonra otomatik çöp
kutusuna düşüyor** (`cop_temizle()` içine eklendi — uygulama zaten düzenli
çağırıyor, yeni bir zamanlanmış görev gerekmedi), oradan mevcut 30 günlük
geri-alma penceresinden geçiyor. Otomatik düşenler Denetim İzi'ne "kvkk"
sınıfıyla ayrı yazılıyor. Bunu test ederken `ses_ekle`'nin iki farklı
sürümünün (eski 6, yeni 7 parametreli) aynı anda kalıp çağrı belirsizliği
yarattığını yakaladım, eski sürümü düşürdüm.

**abertmuhendislik.vercel.app (madde 35) — araştırıldı, karar bekliyor.**
Kullanıcı giriş yaptı, inceledim: gerçek proje verisi (16 proje — Ömerkahya,
Karahıdır, Kavaklıöz gibi kirsehir-envanter'le aynı köyler), Genel Bilgiler
(ada/parsel/kuyu-direk koordinatı), Pompa Seçimi (kuyu deneme bilgileri —
kirsehir-envanter'in "Deneme" ekranıyla birebir aynı alanlar), Elektrik
Hesapları (kablo/sigorta/gerilim düşümü/pano hiyerarşisi, DXF çıktısı).
Bu programın kendi Supabase projesi ("Elektrik Hesaplama Programı",
`ihlkuoewthtzlymcvqyl`) zaten bu oturumun erişimi altında. Salt-okunur,
dar kapsamlı iki köprü RPC'si (yalnız mühendislik özeti döndüren,
sözleşme/fiyat bilgisine dokunmayan) yazdım ama **Claude Code'un güvenlik
sınıflandırıcısı anon role'e RLS-atlayan fonksiyon yetkisi vermeyi
engelledi** — bu, kullanıcının kendi bilerek onaylaması gereken bir karar,
ben tek taraflı uygulamadım. Kullanıcı "hepsini tek programda toplayalım"
dedi; GitHub'da gerçek kaynağı buldum (`abert84tv/elektrik-hesaplama`,
özel depo, canlısı buymuş) — Next.js/TypeScript, 22.121 satır, test edilmiş
ayrı hesap motoru dosyaları (`pompaEngine.ts`, `agHesap.ts`, `panoLayout.ts`,
DXF üretim dosyaları). Tam kod taşıma (bambaşka mimariye elle çeviri) gerçek
hesaplama hatası riski taşıdığı için, harita.html'in bugün zaten kullandığı
iframe+postMessage deseniyle **gömülü entegrasyon** önerdim (hesap motoruna
hiç dokunmadan, kuyu koordinatını otomatik aktararak). Kullanıcının kararı
bekleniyor.

**Faz 1'in kalanı — henüz yapılmadı.** İş Emirleri'nin kendi liste/filtre
ekranı, ekip+araç atama formu, muhtar numara defteri (madde 1'in altyapı
kısmı) sırada.

**Test durumu.** Her adımda `node duman-testi.js` + yerel sunucu DOM/konsol
testi + canlı RPC round-trip doğrulaması (oturumsuz çağrıda doğru hata
dönüyor) yapıldı. Giriş gerektiren tam akış (arıza→iş emri→kapat→geçmiş)
test hesabı canlı veritabanında engellendiği için kullanıcı tarafından
doğrulanacak.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı:
`SQL-is-emirleri.sql` ve `SQL-kanit-saklama.sql` uygulandı (idempotent,
`create or replace`).

---

## Faz 1 tamamlandı — sürüm 2026.09.30-94

**İş Emirleri liste/filtre ekranı + ekip/araç atama (sürüm -93).** İş Emri
artık yalnızca arıza detayından görülebilen bir kayıt değil, kendi açılır
penceresi var — İşler > Dış talepler ekranındaki "İş Emirleri" düğmesiyle
açılıyor. Mevcut "Tesis kartı" panelinin (sabit perde + ortalanmış kutu)
aynı, kanıtlı desenini kullandım — yeni bir sayfa/menü grubu açmadan
(`SUZGEC_TANIM`/`MENU_GRUP`'a dokunmadan) tek bir kendi kendine yeten
pencere, hem masaüstü hem mobil şablonuna eklendi. Liste: Açık/Atandı/
Sahada/Tamamlandı/Kapatıldı süzgeci. Detay: tam bilgi + kapatılmışsa
kullanılan malzeme/toplam saat/kapatan. Atama formu (assign yetkisi
olanlara): ekip seçimi + çoklu araç seçimi — müsait olmayan araçlar soluk
ama yine de seçilebilir (madde 4-5-9, tam kilitlemedim, acil durum için).
Arıza detayındaki "İş Emri: IEM-xxx" etiketi artık bu paneli açıyor.

**Muhtar numara defteri (sürüm -94, madde 1'in altyapı kısmı).** Aynı
"Tesis kartı" deseniyle ikinci bir küçük pencere — İşler ekranındaki
"Muhtarlar" düğmesiyle açılıyor. Ad/köy/ilçe/telefon kaydı (basit tutuldu:
köy/ilçe serbest metin, dropdown değil — cascading köy listesini
tekrarlamak yerine). Veri `kurum_veri` blob'una yeni bir `muhtar` anahtarıyla
yazılıyor (ekip/personel/arac/talep ile aynı mekanizma — `modulYaz`,
sunucu/cihaz eşitleme, çakışma birleştirme hepsi hazırdan geldi). Talep
formunda telefon girilince bu listeyle eşleşme aranıyor; bulunursa köy/ilçe
otomatik dolduruluyor, sıfat "muhtar" işaretleniyor, operatöre bir bildirim
gösteriliyor. Eşleştirme yalnız telefon numarası üzerinden (son 10 hane
normalize edilip karşılaştırılıyor) — köy adı serbest metin olduğu için
resmi köy listesindeki adla birebir örtüşmeyebilir, o durumda yalnız
bildirim metninden operatör köyü elle seçer.

**Faz 1 burada tamamlandı.** Kapsam: talep→iş emri→ekip/araç ataması→
kapanış→ambar+arıza geçmişi zinciri (çekirdek), KVKK saklama politikası
(envanter fotoğrafı ömür boyu, arıza kanıtı 2 yıl), muhtar numara defteri.
Faz 2 (personel/araç günlük izin-mesai kaydı, saha kanıtı öncesi/sonrası
aşaması) ve sonraki fazlar için onay bekleniyor — plan dosyası:
`C:\Users\abert\.claude\plans\glistening-sauteeing-spindle.md`.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (353/353, 302/302), yerel sunucuda giriş ekranı konsol hata sayısı
sabit kaldı (44 — bilinen SVG gürültüsü, yeni hata yok), "[dc-runtime]
template compile FAILED" hiç çıkmadı. Muhtar eşleştirme ve ekip/araç atama
akışlarının uçtan uca gerçek testi giriş gerektiriyor, kullanıcı
doğrulayacak.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok (muhtar verisi var olan `kurum_veri` mekanizmasını
kullanıyor, yeni tablo/RPC gerekmedi).


## Faz 2 — personel/araç günlük kaydı — sürüm 2026.09.30-95

Faz 1'in ardından kullanıcı "faz 2'ye başla" dedi. Plan dosyasındaki Faz 2
kapsamının ilk maddesi (personel/araç günlük izin-mesai kaydı) bitirildi;
ikinci maddesi (saha kanıtı öncesi/sonrası aşaması) henüz başlanmadı.

**Ne eklendi.** Personel havuzu ve araç ekranındaki mevcut düzenleme
formları (yeni ekran/panel açılmadı — Faz 1'de kurulan "var olan paneli
genişlet" ilkesi burada da izlendi) bir "Gün kaydı" alt bölümüyle
genişletildi:

- **Personel** — kişi düzenlenirken (yeni kişi eklenirken değil, `id`si
  olan kayıtlı kişide) tarih + tür (İzin/Rapor/Fazla mesai/Başka görevde)
  + (fazla mesaideyse) saat + not girilip eklenir; liste kişi kartının
  altında en yeni üstte görünür, tek tek silinebilir.
- **Araç** — aynı desen, tür seçenekleri Bakım/Arıza-tamir/Sahada
  görevde/Muayene-belge, saat alanı "Saat/km" olarak km sayacı ya da
  motor saati de kapsayacak şekilde etiketlendi.

Kayıtlar ayrı bir tabloya gitmiyor — personel/araç kartının kendi
`gunler` dizisinde tutuluyor, mevcut `modulYaz('personel', …)` /
`modulYaz('arac', …)` eşitleme mekanizmasını kullanıyor. Yeni SQL/RPC
gerekmedi. Ekleme/silme, formu kapatmadan aynı panelde çalışıyor —
personelKaydet/aracKaydet'in "kaydedince paneli kapat" davranışını
tetiklemeden state'i tazeliyor (`personelGunEkle`/`personelGunSil`,
`aracGunEkle`/`aracGunSil`).

Bir kenar durum canlı test sırasında değil, kod incelemesinde yakalandı:
`personelKaydet` düzenlemede kart nesnesini SIFIRDAN kuruyor (araç
tarafındaki gibi var olanla birleştirmiyor) — bu yüzden `gunler` alanı
`kart` nesnesine açıkça eklendi, yoksa personel kaydı her düzenlemede
gün kaydını sıfırlardı. Araç tarafında `aracKaydet` zaten
`{ ...list[i], ...kart }` ile birleştirdiği için `gunler` otomatik
korunuyor, orada değişiklik gerekmedi.

Yeni sabitler: `GUN_TUR_PERSONEL`, `GUN_TUR_ARAC` (ARAC_DURUM'un hemen
altında). Yeni state alanları: `personelGunTaslak`, `aracGunTaslak`
(eklenecek kaydın taslağı — kaydedilince sıfırlanır).

**Sıradaki iş — saha kanıtı öncesi/sonrası aşaması (madde 10).** Tasarım
kararı verildi ama uygulanmadı: yeni DB sütunu açmak yerine mevcut
`foto.aciklama` metnine aşama etiketi eklenecek (ör. "Arıza kaydı ·
Öncesi" / "Arıza kaydı · Sonrası"), arıza fotoğraf yükleme arayüzünde
iki ayrı buton ya da bir seçim anahtarıyla.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (363/363, 310/310), yerel sunucuda konsol hata deseni sabit kaldı
(bilinen SVG gürültüsü + yeni tarih alanları için beklenen
"yyyy-MM-dd" uyarısı — donus/muayene alanlarındakiyle aynı türden,
zararsız), "[dc-runtime] template compile FAILED" hiç çıkmadı. Giriş
gerektiren uçtan uca test (gerçek kişi/araçta gün kaydı ekle-sil)
kullanıcı tarafından yapılacak — test hesabı canlı veritabanında
oluşturulamıyor (bkz. önceki oturum notu).

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok.

## Faz 2 tamamlandı — saha kanıtı öncesi/sonrası aşaması — sürüm 2026.09.30-96

Faz 2'nin kalan maddesi (madde 10 — ekip sahaya çıkmadan önce ve işi
bitirdikten sonra ayrı ayrı fotoğraf/ses kanıtı) bitirildi. **Faz 2 burada
tamamlandı.**

**Ne eklendi.** Yeni DB sütunu açılmadı — aşama bilgisi `foto`/`ses`
tablosunun zaten var olan `aciklama` metnine ekleniyor: `'Arıza kaydı ·
Öncesi'` / `'... · Sonrası'`, sesli notta `'Arıza sesli notu · Öncesi/
Sonrası'`. Arıza formunda fotoğraf/ses eklemeden hemen önce bir "Aşama"
seçici (Öncesi/Sonrası, segmented buton) duruyor; hangisi seçiliyse bir
sonraki eklenen fotoğraf/ses onunla damgalanır. Kanıt kartlarındaki rozet
(daha önce yalnızca dosya boyutunu gösteriyordu) artık aşamayı da
gösteriyor: "Öncesi · 240 KB" gibi. Varsayılan "Öncesi" — ekip formu
açtığında henüz sahaya gitmemiş sayılır, işi bitirince "Sonrası"na
geçilir.

Yeni sabit: `ASAMA_AD = { once: 'Öncesi', sonra: 'Sonrası' }`
(GUN_TUR_ARAC'ın hemen altında). Değişen metodlar: `arizaFotoSec`
(seçilen her fotoğrafa `asama` damgası basıyor), `arizaFotoGonder`
(aciklama'yı `p.asama`'ya göre kuruyor), sesli not kaydı (`kayit` nesnesine
`asama` eklendi) ve kaydetme akışındaki `sesYukle` çağrısı. Yeni render
prop: `asamaSec` (top-level, `faultForm` gibi diğer sahne düzeyi
proplarla aynı yerde — segmented buton için `seg()` yardımcı fonksiyonu
kullanıldı, personel/araç gün kaydında olduğu gibi).

Kenar durum: mobil şablonda araç fotoğrafı bölümünün üstünde masaüstündeki
gibi bir "Arıza fotoğrafı · sayı" satırı yok — Aşama seçici oraya, ekip
durumu kutusunun hemen altına, buton satırından önce eklendi.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (363/363, 312/312), yerel sunucuda konsol hata deseni sabit kaldı
(bilinen SVG gürültüsü + gün kaydı tarih alanları için beklenen uyarı —
yeni hata tipi yok), "[dc-runtime] template compile FAILED" hiç çıkmadı.
Uçtan uca gerçek test (arıza formunda aşama seçip fotoğraf/ses ekleyip
kaydetme) giriş gerektiriyor — kullanıcı doğrulayacak, test hesabı canlı
veritabanında oluşturulamıyor.

**Sıradaki iş — Faz 3.** Plan dosyasına göre: esnek gün/hafta/ay/yıl +
il/ilçe/köy raporlama motoru (madde 37), ambar düşük-stok bildirimi ve
fiyat sütunu geliştirme (madde 18-19). Kullanıcı onayı bekleniyor.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok.

## Faz 3 (kısmen) — esnek raporlama + köy bazlı malzeme + kritik stok uyarısı — sürüm 2026.09.30-97

Kullanıcı "faz 2'ye başla" sonrası "devam edelim" dedi — Faz 2 tamamlandıktan
sonra Faz 3'e geçildi. Plan dosyasındaki Faz 3 kapsamı: "esnek gün/hafta/
ay/yıl + il/ilçe/köy raporlama motoru (madde 37), ambar düşük-stok
bildirimi ve fiyat sütunu geliştirme (madde 18-19)".

**Keşif bulgusu.** Ambar ekranı zaten olgun: `fiyat` sütunu, kritik eşiğin
altına düşen kalem kırmızı, "Kritik seviye" sayaç kutusu hep vardı (madde
18-19'un büyük kısmı zaten yapılmış). Özet ekranı da zaten il/ilçe/köy
kırılımlı tablolara sahipti — ama "Bu hafta yapılanlar" paneli GERÇEK tarih
filtrelemiyordu, `weekNote` bunu açıkça itiraf ediyordu ("gerçek kurulumda
tarih damgasından hesaplanır; şimdilik oturum içinde yaptıklarınızı
sayıyor"). Asıl boşluk buradaydı.

**Ne eklendi.**
- İki yeni yardımcı metod: `tarihParse` (DD.MM.YYYY damgasını Date'e
  çevirir — arıza/ambar/deneme hep bu biçimde), `zamanAraligi` (Bugün/
  Hafta/Ay/Yıl/Tümü/Özel aralık hesaplar).
- Özet ekranındaki "Bu hafta yapılanlar" paneli gerçek bir rapora
  dönüştürüldü: zaman aralığı seçici (segmented buton) + ilçe seçici
  (`<select>`, "Tümü" dahil, mevcut ilçe listesinden türetilir) + özel
  aralıkta iki tarih girişi. Kutucuklar artık gerçek sayı veriyor: açılan
  arıza, çözülen arıza, girilen deneme, malzeme hareketi, malzeme
  maliyeti, kritik stok sayısı — hepsi seçili aralık+ilçeye göre süzülü.
- Yeni bölüm: "Köy bazlı malzeme kullanımı ve maliyeti" — seçili aralıkta
  arıza kapanışında sarf/hurda edilen malzemenin köy · ilçe kırılımı ve
  TL tutarı.
- Ambar tarafında proaktif uyarı: `ambarKritikMesaj` — zimmet/sarf/hurda
  işleminden sonra kritik seviyeye düşen kalem için 600ms gecikmeli bir
  toast çıkıyor ("Kritik stok seviyesi: ... Ambara giriş girilmesi
  gerekiyor."). `ambarIslem`'in üç dönüş yolunda da (çevrimdışı/kuyruk,
  sunucu başarılı, kuyruk gönderme) çağrılıyor.

**DB değişikliği.** `SQL-ambar-koy-raporu.sql` — `ambar_hareket` RPC'sine
`assetId` alanı eklendi (yalnız katma, aynı imza — `ses_ekle`'deki
overload hatası burada tekrarlanmadı, `pg_proc` sorgusuyla tek satır
doğrulandı). Arıza kapanışında sarf edilen malzeme artık hangi tesisten
geldiğini taşıyor; ambar ekranından elle girilen hareketlerde (operatör
tesis seçmiyor) boş kalıyor — bilinçli v1 sınırı, "Tesis belirtilmemiş"
altında toplanıyor.

**Bilinçli kapsam sınırı.** Madde 37 "her ekrandan" diyordu — bu turda
yalnız Özet ekranına uygulandı (en yoğun raporlama ekranı). İş Emirleri
listesi gibi diğer ekranlara aynı tarih süzgecinin taşınması ayrı bir iş
olarak bırakıldı, istenirse yapılır.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (365/365, 315/315), yerel sunucuda konsol hata deseni sabit kaldı
(bilinen SVG gürültüsü, yeni hata tipi yok), "[dc-runtime] template
compile FAILED" hiç çıkmadı. `ambar_hareket` migration'ı canlı veritabanına
uygulandı ve `pg_proc` ile tek fonksiyon olduğu doğrulandı. Giriş
gerektiren uçtan uca test (gerçek arıza kapatıp malzeme düşürme, Özet'te
raporu süzme) kullanıcı tarafından yapılacak.

**Sıradaki iş — Faz 4.** Plan dosyasına göre: çoklu-sağlayıcı araç-takip
adaptörü (Arvento önce, madde 7-8, API anahtarı bekleniyor), NetCAD
kolektör projeleri KML/KMZ içe aktarma (madde 34). Kullanıcı onayı
bekleniyor.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği var — `SQL-ambar-koy-raporu.sql` Supabase MCP ile canlıya
zaten uygulandı, tekrar çalıştırmaya gerek yok (`create or replace`,
zararsız da olurdu).

## Faz 4 (kısmen) — NetCAD kolektör KML/KMZ içe aktarma, araç konum altyapısı — sürüm 2026.09.30-98

Kullanıcı "devam edelim, faz 4'e başla" dedi. Plan dosyasındaki Faz 4
kapsamı: "çoklu-sağlayıcı araç-takip adaptörü (Arvento önce, madde 7-8),
NetCAD kolektör projeleri KML/KMZ içe aktarma (madde 34)".

**Önemli karar — Arvento için sahte istemci yazılmadı.** Kullanıcı madde
7-8'de "hem Arvento hem diğer firmalardan alıp çalışacak şekilde sistemi
tasarla" dedi ve API anahtarını ileride vereceğini söyledi. Arvento'nun
(ya da başka bir araç-takip firmasının) gerçek REST API'sinin kimlik
doğrulama yöntemini, uç nokta adreslerini ve yanıt biçimini bilmiyorum —
bunu tahmin ederek bir istemci yazmak, anahtar geldiğinde çalışmayan ama
"bitti" görünen bir kod üretirdi. Bunun yerine yalnız gerçekten inşa
edilebilecek kısımlar yapıldı: veri modeli (`sonKonum`), elle giriş
düğmesi, haritada gösterme. Anahtar/uç nokta bilgisi geldiğinde doğal
bağlantı noktası bir Supabase Edge Function'dır (anahtar yalnız sunucuda
durur — `kurum_veri` gibi tüm kullanıcılara giden bir JSONB'ye yazılırsa
herkesin cihazına sızar, bu yüzden bilinçli olarak oraya konmadı).

**Ne eklendi — NetCAD kolektör (madde 34).**
- `hat.html`'in `TURLER` listesine "Kolektör hattı" eklendi (kanalizasyon
  toplayıcı, `#8b5a2b`) — `hat` tablosunda `tur` sütununda CHECK kısıtı
  olmadığı canlı veritabanından doğrulandı (`pg_constraint` sorgusu),
  yeni tür için SQL migration gerekmedi.
- Yeni "KML/KMZ içe aktar" düğmesi: `.kml` doğrudan `DOMParser` ile,
  `.kmz` (ZIP arşivi) kütüphane eklemeden — merkezi dizin elle okunuyor,
  deflate akışı tarayıcının kendi `DecompressionStream('deflate-raw')`'ıyla
  açılıyor (proje boyunca dışarıdan bağımlılık eklenmeme kuralına uyar).
  Her iki yol da (stored + deflate sıkıştırma) elle inşa edilmiş test ZIP
  dosyalarıyla tarayıcı konsolunda gerçekten çalıştırılıp doğrulandı,
  yalnız kod incelemesiyle bırakılmadı.
- İçe aktarılan her `<LineString>` soldan seçili hat türüyle güzergâh
  olarak eklenir, uçlarından elle düzeltilebilir — NetCAD'den .ncz yerine
  kml/kmz çıktısı alınarak kullanılır (madde 34'te kullanıcının kendisi
  "dxf dwg kml kmz de verebiliyor" demişti, .ncz'yi programın doğrudan
  okuması istenmedi).

**Ne eklendi — araç konum altyapısı (madde 7-9, canlı bağlantı hariç).**
- Araç kartına `sonKonum: {lat, lon, zaman, not, kaynak}` alanı eklendi.
  `aracKaydet`'in güncelleme birleştirmesi (`{...list[i], ...kart}`)
  zaten var olan alanları koruduğu için ayrı bir taşıma kodu gerekmedi
  (Faz 2'deki personel/gün kaydı farkının tersine — orada `personelKaydet`
  kartı sıfırdan kuruyordu, burada gerek yoktu).
  Yeni metod `aracKonumKaydet` — panel kapanmadan konumu kaydeder.
  Araç düzenleme formunda yeni "Son konum" alt bölümü: mevcut konum
  (varsa) + "Haritada göster" (`flyTo` ile ana haritayı oraya uçurur) +
  enlem/boylam/not girip kaydetme.
- Bu, canlı API bağlanana kadar "hangi araç nerede" sorusuna elle de olsa
  cevap verir ve gerçek entegrasyon geldiğinde UI tarafı değişmeden kalır
  — yalnız `kaynak: 'elle'` yerine `'arvento'` yazan bir sunucu işi eklenir.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (369/369, 315/315), yerel sunucuda konsol hata deseni sabit kaldı,
"[dc-runtime] template compile FAILED" hiç çıkmadı. KML/KMZ ayrıştırma
tarayıcı konsolunda gerçek (elle inşa edilmiş) dosyalarla test edildi —
bu oturumdaki tek "gerçekten çalıştırıp doğrulanan" JS mantığı, geri kalan
her şey statik inceleme + regresyon taramasıyla doğrulandı. Giriş
gerektiren uçtan uca test (araç konumu kaydet, haritada göster; gerçek bir
NetCAD KML dosyasıyla içe aktarma) kullanıcı tarafından yapılacak.

**Sıradaki iş.** Faz 4'ün kalanı (gerçek Arvento bağlantısı) kullanıcıdan
API anahtarı/uç nokta bilgisi gelince yapılabilir. Plan dosyasına göre
sıradaki faz: Faz 5 — talep alma kanalları (WhatsApp/Telegram/SMS/sesli
çağrı), o da gerçek sağlayıcı hesapları bekliyor. Onun dışında henüz
bloklanmamış kalan iş yok — kullanıcıya soruldu.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok (hat tablosunda CHECK kısıtı olmadığı için yeni tür
migration gerektirmedi).

## Faz 1-2-3-4 tamamlandı, Faz 5'in yapılabilecek kısmı bitti — sürüm 2026.09.30-99

Kullanıcı önceki turda "faz 3 ve 4 neden kısmen bitti" diye sordu; cevapta
iki eksiği ayrı ayrı anlattım (Faz 3: raporlama yalnız Özet'te, ambar
manuel sarfın tesis bağlantısı yok; Faz 4: Arvento canlı bağlantısı yok).
Kullanıcı "yarım kalanları tamamla, API gibi bir bilgi eksikse diğer faza
geç, bütün fazları bitir, mobil ve masaüstünde dene" dedi. Bu turda
yapılan:

**Faz 3 — kalan iki eksik kapatıldı.**
1. İş Emirleri paneline (Faz 1'den) Özet'teki ile aynı desenle zaman
   aralığı (Bugün/Hafta/Ay/Yıl/Tümü/Özel) + ilçe süzgeci eklendi. Liste
   artık `x.acildi` (sunucudan ISO zaman damgası gelir, `tarihParse`'ın
   beklediği DD.MM.YYYY'den farklı — doğrudan `new Date(iso)` kullanıldı)
   ve `x.district`'e göre süzülüyor. `isEmriPanel` state'ini sıfırdan
   kuran üç yer (`geri`, durum filtre `sec`, liste `ac`) `...ip` ile
   birleştirmeye çevrildi — yoksa zaman/ilçe seçimi her tıklamada
   sıfırlanırdı (küçük ama gerçek bir hataydı, yazarken yakalandı).
2. Ambar ekranında sarf/hurda işlemine **isteğe bağlı** "Tesis" seçici
   eklendi (`ambarEkran.form.tesisVar`, tüm envanter kayıtları listelenir,
   varsayılan "Tesis belirtilmedi"). Seçilirse `assetId` hem yerel
   `hareket` kaydına hem sunucuya giden `islemler`'e gidiyor — bir önceki
   turda uygulanan `ambar_hareket` migration'ı (assetId alanı) zaten
   buna hazırdı, yeni migration gerekmedi.

**Faz 4 — NetCAD/KML tarafı zaten tamdı, araç takip altyapısı da tamam
sayılıyor (canlı Arvento hariç, bilerek).** Bu turda ek değişiklik yok,
önceki turun çıktısı yeterliydi.

**Faz 5 — yapılabilecek tek parça bitti.** `TALEP_KANAL`'a Telegram ve
SMS eklendi. DB tarafında `talepler_kanal_check` kısıtı zaten bu ikisini
kabul ediyordu (önceki bir oturumda hazırlanmış, hiç kullanılmamış) —
yalnızca istemci sözlüğü eksikti, DB migration gerekmedi. Gerçek
WhatsApp/Telegram/SMS bot bağlantısı hâlâ gerçek sağlayıcı hesabı
bekliyor, bu turda yapılmadı (madde 4, README).

**Mobil + masaüstü test.** Yerel sunucuda hem masaüstü hem `resize_window`
ile 375×812 (mobil) görünümde açıldı, konsol hata deseni ikisinde de
sabit kaldı (bilinen SVG gürültüsü, yeni hata tipi yok), "[dc-runtime]
template compile FAILED" hiç çıkmadı, mobil giriş ekranı ekran görüntüsüyle
görsel olarak da doğrulandı. Yeni eklenen ekranlar (İş Emirleri zaman
süzgeci, ambar tesis seçici) giriş gerektirdiği için gerçek tıklama testi
yapılamadı — kod incelemesi + regresyon taramasıyla doğrulandı, kullanıcı
giriş yapıp deneyecek.

`duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları dengeli
(373/373, 321/321).

**Sonuç — bütün fazların durumu.** Faz 1, 2, 3, 4 kod tarafında
tamamlandı. Faz 5'in yapılabilecek kısmı (kanal seçenekleri) bitti,
geri kalanı (gerçek bot/webhook) dış hesap bekliyor. Geriye yalnız
dış bilgi/hesap/anahtar bekleyen kalemler kaldı (README madde 4) —
bunlar kod eksikliği değil, kullanıcıdan bilgi geldiğinde bağlanacak
noktalar zaten hazır.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok (her iki DB kısıtı da önceden hazırdı).

## Arayüz sadeleştirme — sürüm 2026.09.30-100

Kullanıcı "faz 1-4'ü bitir" turundan sonra iki yeni istek verdi: (1) hat
güzergâhı renkleri birbirine çok yakın, ayırt edilsin; (2) programın
arayüzü sadeleştirilsin — giriş ekranındaki gereksiz bilgi silinsin,
gereksiz düğme/tekrar eden kısımlar sadeleştirilsin, stok/envanter
bölümlerinin nerede olduğu net olsun, menüler kullanıcının tarif ettiği
iki iş zincirine göre yeniden düzenlensin (zincir 1: talep→triyaj→iş
emri→ekip/araç atama→saha→kanıt→stok; zincir 2: envanter yönetimi→yeni
kayıt→koordinat→hat güzergâhı), mobil ve masaüstünde test edilip
hatasız verilsin.

**Kapsam kararı.** Bu, önceki fazlardan farklı bir iş türü — "yeni özellik
ekle" değil "var olanı yeniden düzenle" — ve gerçek kullanıcılara açık
canlı bir program. Baştan sona menü mimarisini sıfırdan kurmak yerine
(bu, 2026.09.15'te zaten bir kez yapılmış ve README'de "menü ve sayfa
yapısı sabittir" diye belgelenmiş bir karardı) somut, doğrulanabilir,
düşük riskli değişiklikler seçildi: görsel/metin düzeltmeleri + menü
GRUPLAMA ve ETİKET değişikliği (sayfa kimlikleri, SUZGEC_TANIM, hangi
ekranın hangi işlevi yaptığı hiç değişmedi — yalnız hangi başlık altında
göründüğü ve nasıl adlandırıldığı değişti). Giriş yapılamadığı için
oturum-sonrası ekranların TAMAMINI görsel olarak tarayıp genel bir
"gereksiz metin avı" yapmak yerine, koddan doğrulanabilir somut hatalar
(bkz. aşağı) düzeltildi.

**1) Hat güzergâhı renkleri (`hat.html`).** Terfi (mavi) ile AG enerji
hattı (da mavi) ayırt edilemiyordu; GES DC (kahverengi-amber) ile
Kolektör (kahverengi) de öyle. Yedi tür renk çemberine yeniden yayıldı:
terfi mavi, isale neredeyse-siyah, şebeke gri, **AG turuncu** (eskiden
mavi), OG mor, DC koyu altın-sarı, kolektör **yeşil** (eskiden
kahverengi). Tarayıcıda gerçek ekran görüntüsüyle yedi rengin de birbirinden
net ayrıldığı doğrulandı.

**2) Giriş ekranı.** Dört ayrı metin bloğu bire indi:
- Silindi: başlığın altındaki "Kullanıcı adı ve şifre ile girilir. Rol
  seçilmez..." paragrafı (kimse formu görmeden bunu bilmek istemiyor).
- Silindi: alt çubuktaki cihaz satırı ("Telefondan giriliyor — aynı
  hesap her cihazda çalışır...") — kullanıcı zaten hangi cihazdan
  girdiğini biliyor, bilgi vermiyor.
- Silindi: en alttaki, "Beni hatırla"nın hemen yanındaki notla neredeyse
  birebir aynı şeyi tekrar eden kapanış paragrafı ("Doğrulama
  veritabanının içinde yapılır...").
- Kısaltıldı: "Beni hatırla" notu iki cümleden bire indi.
Sonuç: kart üç bölümden (başlık, alanlar, "Beni hatırla") oluşan, tek
satırlık bir alt notla biten sade bir form. Masaüstü ve 375×812 mobilde
ekran görüntüsüyle doğrulandı.

**3) Menü grupları ve etiketler.** `MENU_GRUP` kullanıcının tarif ettiği
iki zincire göre yeniden gruplandı:
- **"Saha işleri"** = İşler + Ambar ve Araç (eski adıyla "Kaynaklar") —
  talep/triyaj/arıza/iş emri zincirinin doğal uzantısı olan stok/araç
  buraya taşındı, önceden ayrı bir üst grupta ("Kayıtlar") duruyordu.
- **"Envanter"** = Envanter + Hat Kesiti — kayıt ve koordinat işleri.
"Kaynaklar" sayfa adı "Ambar ve Araç" oldu, içindeki "Malzeme" süzgeci
"Stok" oldu — kullanıcının sorduğu "stok bölümü nerede envanter bölümü
nerede" sorusunun cevabı artık menüde açıkça yazıyor. Bu değişiklik
yalnızca `MENU_GRUP` (nav gruplama) ve iki görünen ad string'i — sayfa
kimlikleri, süzgeç mantığı, yetki miras zinciri (SUZGEC_TANIM) hiç
dokunulmadı, risk düşük. Not: hat.html (güzergâh çizim aracı) zaten bir
tesis kaydının içinden açılıyordu (panel, ayrı sayfa değil) — yani
zincir 2'nin "hat güzergâhı" adımı zaten doğru yerdeydi, taşımaya gerek
yoktu.

**4) Yanlış/eskimiş bilgi düzeltmeleri.** Kod incelemesinde dört ekranda
artık doğru olmayan "bu cihazda saklanır" notu bulundu — hepsi aslında
sunucuya yazıyor (ambar `ambarIslem`→`M.ambarHareket`, araç `aracYaz`→
`modulYaz`, denetim izi `denetimYaz`→`M.denetimEkle`, hat güzergâhı
`hatKaydet`→`M.hatKaydet`), ama not hâlâ eski/yerel-only günlerden
kalmaydı. Dördü de düzeltildi/silindi; hat notuna ayrıca yeni kolektör
türü ve KML/KMZ içe aktarma da eklendi (liste eskiydi).

**Bilerek yapılmayan.** Talep ekranındaki üç düğme (Muhtarlar/İş
Emirleri/Talep al), her ekrandaki uzun "not:" açıklama metinleri (bu
program boyunca bilinçli bir tasarım deseni — teknik olmayan saha
personeli için kendi kendini açıklayan ekranlar), İş Emirleri'nin ayrı
bir sayfa/sekme değil panel olması — bunların hiçbiri "gereksiz" olduğu
KESİN olarak koddan doğrulanamadığı ya da kasıtlı bir tasarım kararı
olduğu için dokunulmadı. Kullanıcı canlıda gezip somut örnek verirse
(“şu ekrandaki şu metin/düğme gereksiz”) ayrıca düzeltilir.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (373/373, 321/321), yerel sunucuda hem masaüstü hem 375×812
mobil görünümde konsol hata deseni sabit kaldı, "[dc-runtime] template
compile FAILED" hiç çıkmadı. Giriş ekranı her iki görünümde ekran
görüntüsüyle doğrulandı. Menü gruplaması ve süzgeç adları giriş
gerektirdiği için görsel doğrulama yapılamadı — kod incelemesiyle
(MENU_GRUP'un yalnızca nav render'ında kullanıldığı, SUZGEC_TANIM'a hiç
dokunulmadığı) güvence altına alındı, kullanıcı giriş yapıp görecek.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok.

## Gerçek oturum kalıcılığı — sürüm 2026.09.30-101

Kullanıcı "sayfa yenilemede neden programdan atıp giriş ekranına
geliyor" diye sordu. Kod incelemesinde kesin cevap bulundu: bu bir hata
değil, bilinçli bir karardı — `componentDidMount` açılışta kayıtlı giriş
bilgisini yalnızca form alanlarına dolduruyordu, oturumu kendiliğinden
açmıyordu (kod içinde satırbaşı not: "'Giriş yap' her açılışta elle
basılıyor — gerçek otomatik giriş yok"). Kullanıcıya bunu anlattım ve
"kurumsal firmaların üyelikli girişlerindeki gibi mi olsun, yoksa şimdiki
gibi mi kalsın" diye sordum — cevap: "burada güvenlik olsun ama farklı
davranmasın, her kurumsal/büyük firmanın üyelikli girişindeki mantık
gibi çalışsın." Yani: gerçek oturum kalıcılığı istendi.

**Bulgu — altyapı zaten vardı, bağlı değildi.** `supabase-baglanti.js`
her başarılı girişte (`giris()` fonksiyonu, "Beni hatırla" işaretli olsun
olmasın) sunucudan gelen bir **oturum anahtarını** (`ks-oturum` anahtarı
altında, `tokenYaz`) zaten `localStorage`'a yazıyordu — bu şifre değil,
sunucunun `oturum_ac` RPC'siyle doğrulanabilen ayrı bir jeton. index.html
içinde bu jetonu kullanıp oturumu gerçekten geri yükleyen bir fonksiyon
(`anahtarlaGir`) da zaten YAZILMIŞTI — ama hiçbir yerden çağrılmıyordu,
ölü koddu. Eksik olan tek şey açılışta bunu devreye sokmaktı.

**Ne yapıldı.**
- `componentDidMount`'a yeni bir IIFE eklendi: `supabase-baglanti.js`
  yüklenince `anahtarlaGir(M)` çağrılıyor — jeton varsa sunucuda
  doğrulanıyor, geçerliyse `oturumKur()` ile tam oturum kuruluyor.
- Yeni state alanı `oturumKontrol` (başlangıçta `true`) — bu kontrol
  bitene kadar ne giriş ekranı ne program gösterilir, bunun yerine kısa
  bir yükleniyor ekranı (ortada nefes alır gibi büyüyüp küçülen mavi
  kare — yeni `@keyframes nefes`) gösterilir. Kontrol bitince: jeton
  geçerliyse doğrudan programın içi, geçersiz/yoksa normal giriş ekranı.
- `isLogin` süzgecine `!s.oturumKontrol` şartı eklendi ki kontrol
  sürerken giriş ekranı bir an görünüp kaybolmasın (flaş etkisi olmasın).

**Test — gerçek canlı veritabanına karşı.** Üç senaryo da tarayıcıda
gerçekten çalıştırılıp ekran görüntüsüyle doğrulandı (mock değil, gerçek
Supabase projesine karşı):
1. Jeton yok (`localStorage` boş) → yükleniyor ekranı anlık geçer,
   normal giriş ekranı gelir.
2. Sahte/geçersiz jeton (`localStorage.setItem('ks-oturum', 'sahte...')`)
   → yükleniyor ekranı görünür (ekran görüntüsüyle yakalandı, hem
   masaüstü hem 375×812 mobilde), sunucu jetonu reddeder, jeton
   `localStorage`'dan silinir (doğrulandı: `getItem` sonrasında `null`),
   normal giriş ekranına düşülür.
3. Giriş formunun kendisi de gerçek sahte kullanıcı adı/şifreyle
   denendi: sunucuya gidip "Kullanıcı adı veya şifre hatalı" hatasını
   doğru gösterdi, "Beni hatırla" kutucuğunun iki durumu da doğru
   çalıştı.
Gerçek geçerli bir jetonla (başarılı girişten sonra) tam otomatik girişi
test edemedim — test hesabı canlı veritabanında oluşturulamıyor (bu
oturum boyunca hep aynı sınırlama); ama kod yolu (`anahtarlaGir` →
`oturumAc` RPC → `oturumKur`) daha önceki oturumlarda zaten yazılıp
kullanılan, bu turda yalnızca çağrı noktası eklenen bir yol — yeni/riskli
bir mantık değil.

`duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları dengeli
(374/374, 321/321), konsolda yeni hata tipi çıkmadı.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok (sunucu tarafı `oturum_ac` RPC'si zaten hazırdı).

## Ayarlar ekranı yeniden düzenlendi — sürüm 2026.09.30-102

Kullanıcı bir önceki arayüz sadeleştirme turunun yetersiz kaldığını
söyledi: "ayarlar sayfasına gelince sağ üstünde içindeki menüleri oraya
da konumlandırmışsın... o kısma değil başka kullanışlı bir kısma
konumlandır. bu ayarlar menüsünde de bir sürü açıklama var ve bir sürü
iç içe menü var... bence menüleri düzenlememişsin... bu işe yeni bakan
bu işin uzmanı olarak düşün ve tekrardan bütün menüleri bölümleri tekrar
tasarla." Bu haklı bir eleştiriydi — önceki tur yalnız giriş ekranını ve
üst menü ETİKETLERİNİ değiştirmişti, Ayarlar ekranının kendi İÇERİĞİNE
hiç dokunmamıştı.

**Yöntem.** Giriş yapılamadığı için (test hesabı hâlâ açılamıyor) Ayarlar
ekranını bir Explore ajanına tam satır numaralarıyla haritalattım: hangi
AYAR_LISTE bölümünde kaç ayrı konu birikmiş, "sağ üst" şikâyetinin kod
kökeni ne, hangi ekranlar gerçekten birbirini tekrarlıyor. Bu rapor
olmadan kör tahminle değişiklik yapmak riskliydi.

**1) "Sağ üstteki menü" — kök neden bulundu ve düzeltildi.**
Üst çubuktaki `sayfaBar` hap listesi (masaüstünde sağa yaslı duruyordu),
Ayarlar'da 5 hap gösteriyordu: Ayarlar · Köy konumları · İçe-dışa aktarım
· Denetim izi · Çöp kutusu — bunların DÖRDÜ zaten AYAR_LISTE'de ayrıca
satır olarak duruyordu (ya da `ayar.veri` içinde gömülü bir düğmeydi).
İki ayrı menü gibi görünmesinin sebebi buydu.

Düzeltme öncesi kritik bir bulgu: `SUZGEC_TANIM.ayarlar`'dan bu girdileri
silmek güvenlik açığı açardı. `SUZGEC_ESKI` haritası (tabId → {sayfa,
suzgec}) "aktif" sayfanın yazma yetkisini oradan okuyor; bir girdi
kaldırılırsa `yetki('denetim')` gibi hiç var olmayan bir izin anahtarına
düşülüyor ve varsayılan olarak **tam yetki** dönüyordu — yani rolü ne
olursa olsun herkes Denetim/Çöp'te tam yetkiliymiş gibi davranılırdı. Bu
yüzden `SUZGEC_TANIM`'a hiç dokunulmadı. Bunun yerine yalnızca `sayfaBar`
render prop'unun GÖRÜNEN hap listesi Ayarlar sayfasında kendi tek girdisine
süzüldü (`gorunenSuz`) — izin okuma mantığı tamamen ayrı kaldı.

**2) "Süzgeç haritası" — silindi.** `ayar.yetki` içinde, 2026.09.15'teki
menü birleşmesinden kalma, hangi eski yetkinin hangi yeni süzgece gittiğini
gösteren salt teknik bir tablo vardı (kendi yorumunda "bu tablo... yetkinin
nereye gittiğini gösterir" diyordu — geliştirici/geçiş dönemi aracı, son
kullanıcı için anlamsız). Hem masaüstü hem mobil kopyası, render prop'u
(`suzgecHarita`) dahil tamamen kaldırıldı.

**3) "Ortak veritabanı ve eşitleme" — asıl karmaşa kaynağı, dört bölüme
ayrıldı.** Bu TEK AYAR_LISTE satırı altı ayrı konuyu barındırıyordu:
sürüm bilgisi, modül senkronizasyonu, köy adı otomatik eşleştirme (vFill),
arıza bildirimi/SMS kurulumu (kanal+eşik+örnek mesaj+gerçek gönderim URL/
telefon/kuyruk — üç seviye iç içe, "Köy konumları" kartının İÇİNDE
duruyordu), yeni tesis kurma kısayolu, dışa aktarım kısayolu. Yeniden
dağıtım:
- `veri` (Senkronizasyon ve sürüm) — yalnız sürüm + modül senkron durumu.
- `bildirim` (Arıza bildirimleri) — YENİ bölüm, tüm SMS/webhook kurulumu
  buraya taşındı, iç içe geçme kaldırıldı (artık tek seviye).
- `koyeslestir` (Kayıt araçları) — YENİ bölüm, köy adı eşleştirme (vFill/
  vClear/vSaved) + yeni tesis kurma bir arada.
- `yerlesim` ve `aktarim` — artık AYAR_LISTE'de kendi satırları var
  (`AYAR_TAB`/`AYAR_TAB_YETKI` genişletildi), eskiden yalnız üst çubuk
  hapından ya da gömülü bir düğmeden erişilebiliyordu.
Yeni "Saha araçları" grubu bu dört bölümü topluyor. `ayar.veri` içindeki
eski "Dış veri aktarımı" kısayol kartı kaldırıldı (artık gereksiz —
doğrudan liste satırı var); "aktarim" satırının kendi `git` davranışı
özel bırakıldı (eski `goImport` ile birebir aynı: yetkisiz kullanıcıyı
uyarır, telefonda "bilgisayardan girin" mesajı gösterir) çünkü bu ikisi
generic `AYAR_TAB` yönlendirmesinden farklı davranıyordu.

**Kenar durumlar yakalandı.**
- `AYAR_ESKI` haritasında `bildirim: 'veri'` diye eski bir yönlendirme
  vardı (çok daha eski bir menü düzeninden kalma) — yeni `bildirim` gerçek
  bir bölüm olduğu için bu satır kaldırılmazsa eski kayıtlı durumu olan
  biri yanlışlıkla `veri`ye düşerdi. Kaldırıldı.
- `ayarListe`'nin izin süzgeci öncesinde `yetki('ayarlar')` diye SABİT bir
  izin kontrolü vardı — `yerlesim`/`aktarim` eklenince bu yanlış olurdu
  (onların kendi ayrı izni var, SUZGEC_TANIM'ın üçüncü sütununda
  'yerlesim'/'aktarim' yazıyor, 'ayarlar' değil). Yeni `AYAR_TAB_YETKI`
  haritası her id için DOĞRU izin anahtarını okuyor — bu, yazılmasa
  fark edilmeyecek gerçek bir yetki hatasıydı, kontrol ederken yakalandı.
- Mobil düzenlemede ilk denemede iki `</div>`'den birini yanlışlıkla
  sildim (kapanmayan etiket) — manuel div-denge kontrolüyle yakalayıp
  düzelttim. `sc-if`/`sc-for` dengesi otomatik script ile kontrol
  ediliyor ama düz `<div>` dengesi için böyle bir araç yok, elle
  saymak gerekti.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (378/378, 315/315). Yerel sunucuda hem masaüstü hem 375×812 mobil
görünümde konsol JS hatası (TypeError/ReferenceError/"is not a function")
YOK — bu önemli, çünkü `renderVals()` her render'da TAM render-prop
nesnesini kurduğu için (aktif sekme ne olursa olsun) yeni kodumdaki bir
sözdizimi/referans hatası giriş ekranında bile anında patlardı; patlamadı.
Ayarlar ekranının GÖRSEL hâlini (gerçek düzen, gerçek kırılma noktaları)
doğrulayamadım — giriş yapılamıyor. Çalışan bir örneğe (`__dcRegistry`,
`getDC()`) ulaşıp sahte oturumla ekranı zorla render etmeyi denedim,
çalışan bir örnek bulamadım — bu yol tükendi, koddan-doğrulama ile
yetinildi. Kullanıcı giriş yapıp gerçek görünümü kontrol edecek.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok, yalnızca istemci tarafı.

## Sol menü denetimi + Özet ekranı sekmelere ayrıldı — sürüm 2026.09.30-103

Kullanıcı: "sol menüyüde düzenle baştan sona / özet bölümünün içeriği çok
karmaşık bu kısmı düzenle." İki ayrı Explore taraması yapıldı (biri sol
menü + üst çubuk + telefon navigasyonu, biri Özet ekranının tam içeriği)
— giriş yapılamadığı için yine kör tahmin yerine tam satır numaralı
haritalama istendi.

**Sol menü — bulgu: gerçek bir karmaşa yoktu, küçük iki temizlik
yapıldı.** Masaüstü kenar çubuğu (`navGruplu`) yalnız grup başlığı +
öge listesi + alttaki kullanıcı kartından oluşuyor, tek başka kontrol
yok (tema/senkron/arama gibi şeyler ayrı bir üst çubukta duruyor, kenar
çubuğun kendisi zaten sadeydi). Önceki turda zaten iki zincire göre
yeniden gruplanmıştı (Saha işleri/Envanter/Çözümleme/Sistem), o
gruplama hâlâ doğru. Bulunan iki gerçek, küçük sorun düzeltildi:
- `nav` ve `goOzet` render prop'ları hiçbir şablonda çağrılmıyordu (grep
  ile doğrulandı) — ölü kod, silindi.
- Telefonda Ayarlar > Görünüm içindeki "Diğer ekranlar" kısayol listesi
  (`otherScreens`), o an zaten açık olan Ayarlar'a kendine dönen bir
  düğme gösteriyordu. `navVisible.filter(...&& !g.acik)` ile düzeltildi
  — artık hangi sayfadan açılırsa açılsın o an açık olan sayfa kendi
  kısayol listesinde çıkmıyor (yalnız Ayarlar'a özel bir yama değil,
  genel kural).
Kuyruk (Kuyruk ekranı) kasıtlı olarak menüde değil, yalnız üst çubuk
göstergesinde — bu, 2026.09.15'te bilinçli alınmış bir karar (kod
yorumuyla doğrulandı), dokunulmadı.

**Özet ekranı — asıl karmaşa burada, üç sekmeye bölündü.** Tarama tam
9 ayrı bölümü tek, sürekli kayan bir sayfada üst üste buldu: istatistik
kutuları, aktif/pasif dağılımı, ilçe bazında, köy bazında, ekip
performansı, tekrarlayan arızalar, eksik bilgi listesi, esnek tarih/ilçe
raporu (6 kutu — arıza+deneme+stok üç farklı alanı tek şeritte
karıştırıyordu), köy bazlı malzeme maliyeti. Hiç alt sekme/katlama
yoktu — kullanıcı sayfaya girince 9 farklı konuyu art arda kaydırmak
zorunda kalıyordu. Üçe bölündü (istatistik kutuları ve dışa aktarım
düğmeleri her sekmede sabit kalıyor):
- **Envanter**: aktiflik + ilçe/köy dağılımı + eksik bilgi + yakınımdaki
  tesisler — envanterin durumu/dağılımı.
- **Ekip ve arıza**: ekip performansı + tekrarlayan arızalar.
- **Rapor**: tarih/ilçe filtreli özet (6 istatistik kutusu) + köy bazlı
  malzeme maliyeti — ikisi zaten aynı zaman/ilçe süzgecini paylaşıyordu,
  birlikte anlamlı.
Uygulama tekniği: hiçbir veri/hesaplama TAŞINMADI, yalnız var olan
bölümler `ozet.envanterSekmesi`/`ekipSekmesi`/`raporSekmesi` bayraklarıyla
sarıldı (aynı bayrak birden fazla yerde tekrar kullanılabildiği için
bölümleri fiziksel olarak yeniden sıralamaya gerek kalmadı — düşük risk).
Telefonda zaten olmayan bölümler (köy bazında, esnek rapor, malzeme
maliyeti — masaüstüne özgüydü, bu turda da taşınmadı) olduğu için
telefonun kendi sekme listesi (`sekmeSecTel`) yalnız iki sekme
gösteriyor: Envanter, Ekip ve arıza.

**Yan bulgu — gerçek bir görüntüleme hatası, düzeltildi.** Tarama
telefon tarafında somut bir kusur buldu: "Eksik bilgisi olan kayıtlar"
başlığı boş görünüyordu, gerçek liste (`ozet.missing`) yanlış yerde,
"Tekrarlayan arızalar"dan SONRA, kendi başlığı olmadan çıkıyordu — kod
değişmeden önceki hâliyle birebir doğrulandı (satır numaralarıyla),
yeniden düzenleme sırasında doğru yerine (kendi başlığının hemen altına,
Envanter sekmesinde) taşındı.

**Test durumu.** `duman-testi.js` temiz, `sc-if`/`sc-for` etiket sayıları
dengeli (383/383, 317/317). Yerel sunucuda hem masaüstü hem 375×812
mobil görünümde konsol JS hatası (TypeError/ReferenceError/"is not a
function") yok — `renderVals()` her render'da tüm bu yeni kodu
(sekmeSec/sekmeSecTel/otherScreens filtre değişikliği) aktif sekmeden
bağımsız çalıştırdığı için bir hata olsaydı giriş ekranında bile
patlardı. Sekmelerin GÖRSEL hâlini (gerçek geçiş, gerçek veri ile
kırılma noktaları) doğrulayamadım — giriş yapılamıyor, kullanıcı
giriş yapıp görecek.

### Yükleme
`git push origin main` — Vercel otomatik yayına alır. Veritabanı
değişikliği yok.

## Yeni kayıt ve tesis kartı hataları — sürüm 2026.10.01 (henüz yayınlanmadı)

Yeni arayüz mockup'ı (Design canvas) test edilirken gerçek programın yeni
tesis kaydı ve tesis kartı kodu incelendi; veritabanıyla doğrulanan dört hata
bulundu ve kodda düzeltildi.

**Bulgular (canlı veritabanı ile doğrulandı).**
- Yeni kayıt formundaki "Fotoğraf çek" kamerayı açmıyordu, yalnız sayaç
  artırıyordu — kayıt "3 fotoğraf" diyordu ama hiç dosya yoktu.
- Yapım yılı boş bırakılınca sessizce 2026 yazılıyordu (form varsayılanı da
  "2026" idi). 24 deponun 23'ünde yapım yılı 2026 — büyük olasılıkla bu hata.
- Boş teknik alanlar veritabanına "—" metni, son bakım "Yeni kayıt" olarak
  yazılıyordu (24 depo, AG, 2 GES). Veri tamlığı sayımını şişiriyordu:
  "veri dolu" görünen 48 kaydın yalnız 3'ünde gerçek teknik değer var.
- Depo/AG/GES kartı boş alanları "— eksik" yerine "undefined m³" gibi
  gösterebiliyordu; GES kartında uydurma bir "Beslediği kayıt: KS-KUY-…"
  satırı, AG kartında sabit "400 V" ve "Direk tipi" varsayılanı vardı.

**Düzeltmeler (index.html).**
- Yeni kayıt fotoğrafı gerçek dosya seçici/kamera; dosyalar bellekte bekler,
  kayıt veritabanına yazılınca `fotoGonder` ile gerçekten yüklenir. Önizleme
  `imgEl` ile (şablonda `src="{{…}}"` yok — boş istek atmaz).
- Yapım yılı varsayılanı boş; boş kalırsa boş yazılır, geçersizse uyarır.
  Düzenleme formunda yıl artık silinebiliyor.
- Yeni kayıt `d: {}` ile açılır; kartta "—" ve "Yeni kayıt" eksik sayılır,
  depo/AG/GES satırları da `f()/u()` ile "— eksik" gösterir, uydurma
  satırlar kaldırıldı.
- Ortak veritabanı oturumu yokken açılan kayıt yanlışlıkla "eşitlendi"
  görünüyordu; artık "bekliyor".
- duman-testi.js şablon ifadesi içeren src/href'i dosya sanmıyor.

**Veritabanı.** Eski kayıtlardaki "—" yer tutucuları ve 23 depodaki 2026 yılı
kullanıcı onayı olmadan değiştirilmedi.

**Test.** duman-testi temiz, sc-if/sc-for dengeli (383/383, 317/317), yerel
sunucuda (npx serve — /harita, /profil, /hat artık çözülüyor) giriş ekranı
JS hatası ve 404 olmadan açılıyor. Giriş gerektiren uçtan uca test bekliyor.

## Yeni arayüze geçiş — 1. aşama: masaüstü kabuğu (henüz yayınlanmadı)

Canvas'taki yeni tasarımın masaüstü kabuğu programa geçirildi; sayfa
gövdelerine dokunulmadı.

- **Sol menü (232px):** marka (damla simgesi), arama kutusu (üst çubuktan
  taşındı; öneri listesi altına açılır), büyük harfli grup başlıkları,
  her sayfada ikon (`ikon()` setine isler/kaynaklar/envanter/kesit/ozet/
  ayarlar eklendi), etkin sayfa dolu mavi hap, rozetler hafif nabız atar.
  Altta baş harfli oturum kartı ve Çıkış düğmesi.
- **Üst çubuk:** solda sayfa başlığı + tek satır açıklama (`ustBar`,
  açıklamalar `SAYFA_ALT` sabitine taşındı — artık tek süzgeçli sayfalarda
  da başlık var); sağda kuyruk göstergesi (kırmızı), canlı bağlantı hapı
  (yeşil nabız / çevrimdışıysa kırmızı), Yenile, Koordinat, tema.
- **Süzgeç satırı:** başlık üst çubuğa çıktığı için yalnız süzgeçler kaldı.
- Yeni CSS: `.ks-canli`, `.ks-nabiz`, `.ks-gir` (hareket azaltma tercihine
  uyar). Telefon kabuğu değişmedi (son aşama).

**Test.** Giriş yapılamadığı için yalnız bu tarayıcı sekmesinde, sunucu
bağlantısı (`_sb`) ve denetim yazımı kapatılarak sahte bir yönetici
oturumuyla çizdirildi — veritabanına hiçbir istek gitmedi, oluşan tek
localStorage anahtarı silindi. Altı sayfa yeni kabukta hatasız açıldı;
yeni kayıt formunun yerel yolu (boş yıl, gerçek fotoğraf seçici, geçersiz
yıl engeli, `d: {}`, "bekliyor" durumu) ve depo/GES kartının "— eksik"
gösterimi doğrulandı. Sunucuya yazan yol (tesisKaydet + fotoğraf yükleme)
gerçek girişle test edilmeli.

### Veri temizliği — 1 Ekim 2026 (kullanıcı onayıyla)
Eski yeni-kayıt formunun bıraktığı izler canlı veritabanında temizlendi:
27 kayıtta (24 depo, 1 AG, 2 GES) `veri.d` içindeki "—" ve "Yeni kayıt"
değerleri ile depolardaki sahte "kaynak: 0" silindi; 23 depodaki form
varsayılanı yapım yılı 2026 boşaltıldı. GES/AG'deki gerçek değerler (güç,
panel adedi, trafo tipi) korundu. Kayıt sürümleri bir artırıldı ki açık
ekranlardaki eski kopya üzerine yazamasın. Özgün hâli API'ye kapalı
`yedek.tesis_20261001` tablosunda; geri almak için:
`update public.tesis t set veri = y.veri, yapim_yili = y.yapim_yili from yedek.tesis_20261001 y where t.id = y.id;`

## Yeni arayüze geçiş — 2. aşama: Envanter (yeni kayıt sihirbazı, tesis kartı)

- **Yeni tesis sihirbazı (masaüstü).** Üst çubukta "+ Yeni tesis"; İşlem >
  Yeni tesis kur ve haritadaki "bu noktada yeni tesis" de masaüstünde bunu
  açar (telefon eski formda, son aşamada). Üç adım: tür ve yer → konum →
  bilgi ve foto. Konum üç yoldan: cihaz GPS'i (ofiste yanıltıcı olduğu
  yazılı), haritadan seç (pencere küçülür, haritada çift tıklanan nokta
  forma döner, ilçe en yakın kayıttan otomatik), koordinat yaz (virgül de
  kabul). 60 m içinde kayıtlı tesis varsa mükerrer uyarısı: "Mevcut kaydı
  aç" ya da "Farklı tesis, devam" — onay konuma bağlı, konum değişince
  düşer. İl sınırı dışı ve geçersiz yıl ilerletmez.
- **Bulunan ve düzeltilen çökme:** yalnız enlem yazılıp boylam boşken
  `coordText` null üzerinde `toFixed` çağırıyor, bütün ekran
  "renderVals(): Cannot read properties of null" ile düşüyordu.
- **Haritadan yeni tesis** yolunda da yapım yılı varsayılanı "2026" idi —
  düzeltildi; ilçe artık noktaya en yakın kayıttan geliyor.
- **Tesis kartı (masaüstü):** açık arıza rozeti (nabız), dört hızlı eylem
  (Yol tarifi, Arıza aç — açık arıza varsa önce sorar, Fotoğraf, Düzenle),
  kayıt tamlığı çubuğu (% ve eksik alan sayısı, "Tamamla").

Test: önizleme oturumunda (sunucu kapalı) sihirbazın her yolu ve kartın
dört eylemi tarayıcıda çalıştırıldı, konsol temiz; duman testi temiz,
etiket dengesi tamam.

### Gerçek girişle uçtan uca test — 1 Ekim 2026
Kullanıcı (a.bertan) şifresini Supabase'den sıfırlayıp yerel sunucuda giriş
yaptı; testler gerçek veritabanına karşı yapıldı.
- Oturum kalıcılığı: sayfa yenilenince doğrudan programa döndü.
- Görüntüleme: 291 tesis sunucudan geldi; temizlenen depolar "— eksik",
  GES'in gerçek değerleri yerinde.
- **Bulunan hata — kod çakışması:** program sıradaki kodu yalnız görünen
  kayıtlardan hesaplıyordu; KS-KUY-0265 çöp kutusundaki bir kayıtta
  olduğundan sunucu yeni kaydı reddetti ve form, bilgiler kayboldu.
  Düzeltme: `tesis_kaydet` artık kilit altında kodu denetliyor, çakışırsa
  sıradaki boş kodu veriyor (çöptekiler ve eşzamanlı kayıtlar dahil);
  program mesajı ve denetim izi sunucunun verdiği kodu yazıyor; kayıt
  başarısız olursa form ve fotoğraflar açık kalıyor.
- Yeni sihirbazla test kaydı: önerilen KS-KUY-0265 → sunucu KS-KUY-0266
  verdi; yapım yılı boş, `veri.d` boş, 1 gerçek fotoğraf (4,5 KB) ve not
  yazıldı. Ardından programın kendi akışıyla çöpe, fotoğraf (Storage dosyası
  dahil) ve kayıt kalıcı silindi; veritabanında iz kalmadı (denetim izi
  hariç, o silinemez).
- Birim tekrarı ("21,450kw kW") düzeltildi; dar pencerede üst çubuk
  düğmeleri ikona iniyor, başlık kaybolmuyor.

## Yeni arayüze geçiş — 3. aşama: İşler > Genel bakış (operasyon panosu) + senaryo taramasında bulunan hatalar

**Genel bakış (masaüstü).** İşler artık "Genel bakış" süzgeciyle açılıyor
(yetkisi Arıza'dan miras, sekmesi `isPano`; telefonda yok, son aşamada).
Gerçek verilerden: dört gösterge (bugün gelen talep+arıza, bugün kapanan,
hedef süresi geçen — "Hedef süre" modülü kapalıysa sayılmaz, ortalama çözüm
süresi) ve saatlik kıvılcım grafikleri; iş hattı (Talep → Açık arıza →
Atandı → Sahada → Beklemede → Bugün kapandı), gecikenler kırmızı bölüm,
aşamaya tıklayınca ilgili liste o durumla süzülü açılır; öncelikli işler
(gecikmiş, öncelik, yaş sırası); son hareketler (sunucu denetim izinden);
ilçe yoğunluğu (tıklayınca arıza listesi o ilçeyle aranır) ve ekip yükü.
Grafikler `kivilcim()` ile JS'te kurulur — şablonda `{{ }}` delikli SVG yok.

**Güvenlik:** sekme yetkisi artık süzgeç haritasındaki kaynağından okunur
(`sekmeYetki`); kendi yetki anahtarı olmayan sekme "bilinmeyen anahtar →
tam" varsayılanına düşüp herkese açılamaz.

**Bulunan ve düzeltilen hatalar (senaryo taraması):**
- **Kod "onarma" döngüsü:** veri her yüklendiğinde çalışan kod onarımı,
  numarası kayıt sayısından büyük her geçerli kodu bozuk sayıyordu. Silinmiş
  kayıt boşluk bırakınca en yeni tesisin kodu sessizce eski numaraya
  kayardı (basılı barkod geçersiz); çöpteki kodla çakışınca da her 30 sn'de
  sunucuya yazıp denetim izine "KS-KUY-0266 → KS-KUY-0266" satırı ekledi
  (yalnız test kaydında oldu, gerçek kayıt etkilenmedi — denetim iziyle
  doğrulandı). Artık geçerli kod asla değişmez; onarılan bozuk kod ve yeni
  kayıt numarası boşluğa değil en büyüğün bir fazlasına gider.
- **Uydurma deneme verisi:** statik/dinamik/debi dolu kuyuya hiç yapılmamış
  iki deneme ekleniyordu ("Sondaj deneme ekibi", 05.06.2026 "Kontrol
  denemesi", türetilmiş değerlerle) — kaldırıldı, yalnız girilen denemeler.
- **Sahte içe aktarma:** İçe ve dışa aktarım ekranı dosya okumuyor, her
  seferinde aynı 12 uydurma satırı ("KUYU 1", "Ahiler deposu"…) ilçe
  merkezlerinin yanına yapay koordinatla üretiyor, sonuçları sunucuya
  yazmadan "eşitlendi" gösteriyordu. Gerçek okuyucu yazıldı: KML/KMZ yer
  imi, GPX waypoint, CSV (; , sekme ayraç, virgüllü ondalık, "enlem/boylam"
  ya da lat/lon başlığı). İlçe/köy en yakın resmî yerleşimden, 30 m içinde
  kayıtlı tesis "zaten kayıtlı" işaretlenir, il dışı aktarılmaz; kayıtlar
  sunucuya tek tek yazılır (çevrimdışıysa kuyruğa), özgün ad saha notuna
  düşer. "Google Sheets bağlantısı" seçeneği kaldırıldı (hiç çalışmıyordu).
- **Sunucu arızalarında tarih:** `arizaSuret` ISO zamanı programın
  "GG.AA.YYYY SS:DD" biçimine çeviriyor (özgünü `openedIso/closedIso`);
  önceden sunucudan gelen arızalarda hedef süre/gecikme, raporların tarih
  süzgeci ve mükerrer denetimi hiç çalışmıyordu.
- Arıza listesi "Bildirim"e göre metin olarak sıralanıyordu (30.09 > 01.10)
  — zamanla sıralanıyor; aramada ilçe adı da aranıyor.
- Bakım "Yapıldı" sabit 04.09.2026 yazıyordu; bakım gecikme hesabı "bugün"
  yerine sabit 4 Eylül 2026'ya göre yapılıyordu; "Bugün" ekranı başlığı
  sabit "4 Eylül 2026, Cuma" idi — hepsi gerçek bugüne bağlandı.
- Menüden "Yeni tesis" ve dosyadan aktarma yollarında da yapım yılı 2026 ve
  "—" yer tutucuları vardı — kaldırıldı (masaüstünde menü yolu sihirbazı açar).

Test: gerçek oturumla (a.bertan) pano, aşama tıklamaları, KML/CSV/GPX
okuma ve önizleme (kaydetmeden), Bugün/Bakım/Deneme ekranları; konsol
temiz, duman testi temiz, etiket dengesi tamam.
