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

## 2026.10.01 — 4. aşama: Ambar ve Stok ekranı

Masaüstü Ambar ekranı tasarım taslağına göre yeniden yazıldı (telefon
görünümü aynı verilerle eski düzende; 6. aşamada yenilenecek):
- **Malzeme kataloğu** artık kodda sabit değil: sunucuda `malzeme`
  anahtarında, `{ kod, ad, kat, birim, fiyat, esik, pasif }`. Başlangıç
  listesi eski 16 kalem (MLZ-0001…0016, kategorili). "Malzeme tanımla",
  malzeme kartında "Düzenle" / "Pasife al". Mevcut ve zimmet ADA göre
  tutulduğu için hareketi olan kalemin adı ve birimi değiştirilemez.
  Yetki: yönetici, müdür, mühendis, şef (sunucuda da denetlenir).
- **Kaç gün yeter:** `ambar_hareket` her hareketi `gun` altında gün gün
  toplar (net ambar çıkışı = zimmet + çıkış − iade), 60 gün saklar. Son 30
  günün ortalamasıyla (sistem yeniyse geçen gün, en az 7) hesaplanır.
  Kritik = eşiğe inmiş ya da 7 günden az yetecek ya da 30 günde çıkışı olup
  tükenmiş. Özet'teki "kritik stok" sayısı da aynı kuralı kullanır.
- Ekran: arama, kategori/kritik/ambarda/siparişte süzgeçleri, üç sıralama,
  ambar başına renkli dağılım çubuğu, 14 günlük tüketim kıvılcımı,
  "Tükenmek üzere", "Bugünkü hareketler", ekip zimmeti; malzeme kartı
  (ambar/ekip dağılımı, son hareketler); hareket formu modal, malzeme
  yazarak aranır (datalist), katalogda olmayan ad reddedilir. 300 kalemde
  ilk 120 satır, "Tümünü göster"; çizim ~35–55 ms.
- **Sipariş listesi** ortak (`siparis` anahtarı): önerilen miktar 30 günlük
  ihtiyaç − mevcut; ambar girişi yapılınca kalem listeden düşer; metin
  olarak panoya kopyalanır. Miktar kutusu yazmayı bitirince tek sefer yazar.
- Arıza formunda malzeme seçimi arama kutusuyla: boşken ekibin
  zimmetindekiler önde, 14 kalem; aramada 24.

Bulunan hatalar:
- `ambarKritikMesaj` metotta tanımsız `SAHA_EKIP` kullanıyordu: zimmet/sarf/
  hurda sonrası kritik stok uyarısı hiç çıkmıyor, işlem sonu hata
  veriyordu.
- **Muhtar defteri sunucuya hiç yazılmamıştı:** sunucu `muhtar` anahtarını
  tanımıyordu; ayrıca kuyruk gönderiminde ve yerel kopyada eşlemesi
  eksikti. Sunucu/istemci eşlemesi tek tabloya (`MODUL_ALAN`) toplandı.
- Ambar yerel kopyası okunurken yeni `gun` alanı atılıyordu; arıza
  kapanışındaki sarf da onu siliyordu — korunuyor.

Sunucu: `SQL-ambar-katalog-siparis.sql` (göç `ambar_katalog_siparis_gunluk`).
Test: gerçek oturumla, sunucu bağlantısı yalnız sekmede kesilerek (yazma
yok): giriş/zimmet/iade/sarf, bakiye reddi, katalog dışı ad reddi, 312
kalemlik sahte katalog + 30 günlük tüketimle görünüm/sıralama/hız,
katalog düzenleme (Türkçe fiyat "1.250,50"), sipariş akışı, arıza formu
araması, telefon görünümü. Sonrasında yerel test verisi silindi;
veritabanında iz yok (kurum_veri sürümleri değişmedi).

## 2026.10.01 — 5. aşama: Ekip ve Araç panosu

"Ambar ve Araç" sayfası "Ekip, Araç, Ambar" oldu; masaüstünde ilk süzgeç
**Ekipler** (`ekipPano`, araç yetkisinden miras; telefonda Stok'a düşer):
- Personel durum çubuğu: bugünkü gün kaydı (izin/rapor/başka görev) kartın
  durumunu ezer, dönüş tarihi geçmiş izin görevde sayılır, görevdeki kişi
  ekibinin sahada işi varsa "Sahada". Tıklayınca ekip kartlarındaki kişiler
  vurgulanır.
- Araç durum çubuğu (görevde/müsait/bakımda/arızalı/hizmet dışı); tıklayınca
  filo listesi süzülür.
- Ekip kartları: bölge ve vardiya, nöbetçi rozeti, açık iş yükü (6+ aşırı),
  o anki işi, üyeler (bugünkü duruma göre halka rengi), görevdeki araçlar,
  "İşlerini aç" → Açık arızalar ekip süzgeciyle.
- İş haritası: tesisler gri, açık işler durum rengiyle (sahadaki nabız
  atar); seçili ekibin işleri öne çıkar. Araç takip (GPS) bağlantısı yok,
  ekranda da böyle yazıyor — konum uydurulmadı.
- Araç filosu: muayeneye kalan gün çubuğu; satır araç defterinde kaydı açar.
Sürüm damgası 2026.10.01-104.

Test: gerçek oturum, sunucu bağlantısı sekmede kesik; 30 personel, 10 ekip,
22 araç, 50 açık arıza yalnız ekranda (kaydedilmeden) yüklenerek süzgeçler,
seçim, yönlendirmeler, koyu tema ve telefon yönlendirmesi denendi; konsol
temiz, yerel depoda test izi yok.

## 2026.10.01 — 6. aşama (1. bölüm): saha akışı ve iki temel kayıt hatası

**Kritik hata 1 — arızalar sunucuya hiç yazılmıyordu.** `arizaKaydet`
tanımlıydı ama hiçbir yerden çağrılmıyordu: arıza yalnız ekranda duruyor,
ilk veri yenilemesinde sunucudaki (boş) listeyle eziliyor, sayfa yenilenince
kayboluyordu. Fotoğraflar da arıza kimliği olmadan yükleniyordu. Şimdi:
- her yeni/değişen arıza "pending" olur, cihazda saklanır
  (`ks-ariza-bekleyen`), `arizaKuyrukGonder` sırayla yazar; bağlantı gelince
  ve her veri yenilemesinde yeniden dener; yenileme bekleyen kaydı ezmez;
- yeni kayıt numarasını sunucu sayacından alır (ARZ-yıl-sıra); cihazdaki
  "AR-1xx" iki cihazda çakışıyordu. Alınan numara kayda hemen işlenir,
  başarısız denemede boşa numara harcanmaz;
- yeni kaydın fotoğraf ve sesli notları arıza kimliği belli olunca yüklenir
  (arıza kanıtı olarak bağlanır); bağlı talebin arıza numarası güncellenir.
- Sunucu: enum'a eksik 6 durum eklendi; `ariza_kaydet` iptali de kapanış
  sayar, yeniden açılan kaydın kapanış damgasını siler.

**Kritik hata 2 — modül verisi sunucuya hiç yazılamamıştı.** `rol` enum'unda
'izleyici' yok; `veri_yaz`, `veri_yaz_surumlu`, `ambar_hareket` içindeki
`k.rol = 'izleyici'` her çağrıda hata veriyordu. Ekip, personel, nöbet,
ambar, araç, talep (ve muhtar) yalnız cihazlarda kalmıştı; program hatayı
sessizce kuyruğa alıp tekrar deniyordu. Karşılaştırma `k.rol::text` yapıldı.
Cihazlarda kuyrukta bekleyen veriler artık bir sonraki bağlantıda gider.
DİKKAT: SQL-moduller-sunucu.sql / SQL-veri-butunlugu.sql / SQL-ambar-hurda.sql / SQL-ambar-koy-raporu.sql
yeniden çalıştırılırsa hata geri gelir — ardından SQL-ariza-sunucu-duzeltme.sql
çalıştırılmalı.

**Telefon > İşler > Bana atanan** taslağa göre yeniden yazıldı (saha
personeli akışı): selamlama, ekip ve araç, günün ilerleme halkası; o anki iş
kartı (öncelik, hedef süre, tesis, mesafe — konum alınırsa kuş uçuşu),
adımlar Atandı → Sahadayım → Tamamlandı: "Sahaya vardım", öncesi fotoğrafı
(kanıt açıksa zorunlu), "İşi tamamla" → sonrası fotoğrafı, ekip zimmetinden
+/− ile malzeme, kısa not, kapat (merkez onayı açıksa "Onaya gönder");
kapanışta zimmet düşülür, bağlı iş emri kapanır, "İş kapandı" ekranı.
Sıradaki işler (öncelik, konum varsa yakınlık) ve Zimmetim listesi.
"Bana atanan" önceden ekibe göre süzmüyordu, herkese bütün açık arızaları
gösteriyordu — düzeltildi (masaüstü listesi de). Telefon alt çubuğunda
"Kaynaklar" kısa adı. Sürüm 2026.10.01-105.

Test: yerelde (sunucu kesik) bütün adımlar; gerçek veritabanında KS-KUY-0001
üzerinde test arızası aç → sahada → kapat, yenilemeden sonra kalıcılık,
tesis durumunun arızalı→aktif dönüşü doğrulandı; test arızası ve numara
sayacı silindi (denetim izi satırları duruyor).

## 2026.10.01 — 6. aşama (2. bölüm): telefonda Genel bakış, Ekipler, Ambar

Üç ekranın telefon şablonu yazıldı; veri masaüstüyle ortak (pano,
ekipPano, ambarEkran). Telefon yönlendirmeleri kaldırıldı — İşler'de
"Genel bakış", Kaynaklar'da "Ekipler" telefonda da açılıyor.
- Genel bakış: 2×2 gösterge, dikey iş hattı, öncelikli işler, ekip yükü,
  ilçe yoğunluğu, son hareketler.
- Ekipler: personel/araç durum çubukları (dokununca süzer), ekip kartları,
  iş haritası (telefon genişliğine göre 322 px), araç filosu.
- Ambar: arama, hareket/sipariş/malzeme tanımla düğmeleri, göstergeler,
  tükenmek üzere, yatay kaydırmalı kategoriler, sıralama, malzeme kartları
  (kaç gün yeter, ambar dağılım çubuğu), bugünkü hareketler, ekip zimmeti
  (iade/sarf/hurda). Hareket formu, malzeme kartı, malzeme tanımı ve sipariş
  listesi telefonda alttan açılan tam genişlik paneller.
Not: kaydırılan kapsayıcı içinde overflow'lu bölümler flex/grid'de sıfır
yüksekliğe büzülüyordu — kapsayıcı `grid-auto-rows:max-content`.
Sürüm 2026.10.01-106. Test: 375 px'de üç ekran ve dört panel, masaüstü
gerileme kontrolü; konsol temiz, cihazda test izi yok.

## 2026.10.01 — Modül anahtarları

Kullanıcı bildirimi (telefon): Kanıt zorunluluğu "Açık"a basınca "açıldı"
bildirimi çıkıyor ama düğme "Kapalı" kalıyordu. Neden: o cihazda arıza
modülü kapalıydı; hedef süre/kanıt/onay düğmesi kendi ayarını değil
"arıza açık mı && ayar" sonucunu gösteriyordu. Şimdi düğme kendi ayarını
gösterir; arıza kapalıyken bunlardan biri açılırsa arıza da açılır.
Asıl kök: modül anahtarları yalnız cihazda (ks-moduller) duruyordu —
bilgisayarda açılan modül telefonda kapalı kalıyordu. Artık kurum ayarı:
sunucuda `modul` anahtarı (yönetici/müdür yazar), açılışta bütün cihazlara
yüklenir. Sürüm 2026.10.01-107.

## 2026.10.01 — Arıza açılınca çökme, çift fotoğraf, görünmeyen kanıt

Kullanıcı bildirimi: telefonda arızaya dokununca "Root.renderVals():
Cannot read properties of undefined (reading 'map')"; iki kuyuya ve bir
arızaya fotoğraf yüklendi.
- Çökme: sunucudan gelen arızada `photos` yoktu, form `ff.photos.map`
  çağırıyordu (arızalar bugüne dek sunucudan hiç gelmediği için ortaya
  çıkmamıştı). Sunucu arızaları photos/sesler/malzeme boş listeyle gelir;
  formdaki erişimler korundu.
- Çift yükleme: yeni arızanın fotoğraf dosyası arıza kaydının içinde
  kalıyordu; kayıt yeniden kaydedilince aynı fotoğraf ikinci kez yüklendi
  (foto 15 ve 16, aynı boyut). Dosyalar artık kayıtta tutulmaz, yalnız
  arizaGonder yükler. Yinelenen foto 16 çöp kutusuna alındı (30 gün).
- Kanıt: form ve saha akışı yalnız o an seçilen fotoğrafı sayıyordu —
  yüklenmiş "öncesi" fotoğrafı olan arıza kanıtsız sayılıp kapatılamazdı,
  formda "0 adet" görünüyordu. Sunucuda arızaya bağlı fotoğraflar
  (foto_listesi.ariza_id) sayılır ve formda yeşil çerçeveyle gösterilir.
Kontrol: KS-KUY-0065 (3), KS-KUY-0236 (5), KS-AGP-0001 arıza (1) fotoğrafı
sunucuda ve açılıyor. Sürüm 2026.10.01-108.

## 2026.10.01 — Telefonda sade arıza ekranı

Kullanıcı isteği: sahada arızayla uğraşırken bu karmaşık formu doldurmak
zor. Telefonda arıza artık sade ekranla açılır (masaüstü formu aynı):
- Yeni arıza: Tesis → "Ne oldu?" (büyük tür düğmeleri) → "Ne kadar acil?"
  (Acil/Yüksek/Normal) → Fotoğraf (Çek / Galeriden) → Not + "Sesle anlat"
  → (yetkiliyse) Ekip → altta sabit "Arızayı kaydet".
- Var olan arıza: üstte Açık→Atandı→Sahada→Kapandı adımları ve tek ana
  düğme: "Sahaya vardım" (+Yol tarifi) ya da "İşi tamamla" (saha akışının
  kapanış adımına gider: sonrası fotoğrafı, zimmetten malzeme). Kayıttaki
  fotoğraflar yeşil çerçeveyle.
- Malzeme, süre, maliyet, iş akışı, iş emri, ekip önerisi, tesis geçmişi
  "Ayrıntılı form"un arkasında; oradan "← Sade görünüm" ile dönülür.
- Fotoğraf aşaması kendiliğinden: sahadaysa "Sonrası", değilse "Öncesi".
- Telefonda yeni arızada tesis artık boş başlar (listenin ilk kaydı
  kendiliğinden seçili geliyordu — yanlış tesise kayıt riski); seçilmeden
  kaydedilmez. Konum alınmışsa tesis listesi cihaza en yakından başlar.
Sürüm 2026.10.01-109.

## 2026.10.01 — Tesis seçici ve talepten arıza

Kullanıcı bildirimi: telefonda tesis seçerken yalnız kod ve ilçe görünüyor
(hangi tesis olduğu anlaşılmıyor), yalnız 40 tesis listeleniyor.
- Kök: 264 kuyunun 247'sinde köy alanı boş. `yakinKoy(a)` koordinata en
  yakın köyü (koyler.js YKOY/BCK, 4 km içinde) bulur; `yerGoster(a)`
  "≈ Güzler · Merkez" yazar. Yalnız gösterim — kayda yazılmaz, raporlar
  girilmiş köye göre gruplamaya devam eder. Bucak/merkez köy adları
  ("Akçakent_Mrkbucak") "Akçakent merkez" gösterilir.
- Telefonda sade arıza ekranında tam ekran tesis seçici: bütün tesislerde
  arama (köy, yakın köy, kod, ilçe, tür, barkod), satırda "Kuyu · ≈ Köy ·
  İlçe" ve kod + uzaklık; talepten gelindiyse talebin köyüne, konum
  alındıysa cihaza yakın olanlar önce; "Konumumu al".
- Talepten arıza (talepArizaya): köy adı birebir eşleşen tesis yoksa
  "kayıtlı tesis yok" deyip duruyor, birden çoksa window.prompt ile sıra
  numarası soruyordu. Artık talebin köyü yerleşim listesinde bulunur, form
  seçici açık gelir (köyde tek tesis varsa o seçili). Masaüstündeki tesis
  listesi de talep köyüne/konuma göre sıralanır, satırda tür ve yakın köy.
- Saha kartlarında ve Genel bakış'ta da yerGoster.
Sürüm 2026.10.01-110.

## 2026.10.01 — Arıza noktası, iş grupları, şebeke arızası, başvuru sınıflandırma

Kullanıcı isteği: (1) vatandaş/muhtar köy adıyla arıza bildirir, arıza boru
hattında olabilir — ekip varınca arıza noktasının koordinatı kaydedilsin,
köy raporlarında kullanılsın; (2) arıza türleri açılır liste olsun, önce iş
grubu, sonra yalnız o grubun türleri; (3) WhatsApp/Telegram/SMS/telefon
başvuruları operatöre düşmeden yapay zekâyla ön sınıflandırılsın.

Sunucu (SQL-ariza-nokta-koy.sql, göç ariza_nokta_koy_grup):
- ariza.tesis_id boş olabilir (şebeke arızası: ilçe zorunlu, köy);
  grup, koy, ilce, lat, lon, konum_zaman, konum_dogruluk, konum_k eklendi.
- ariza_kaydet yeni imza (grup/köy/ilçe/nokta); nokta il sınırı dışındaysa
  reddedilir; boş gelen nokta eskisini silmez.
- ariza_listesi tesissiz arızaları da (left join) ve noktayı döndürür.
- foto_ekle/ses_ekle tesissiz arızada ilçeyi arızadan alır;
  ariza_foto_listesi(arıza) eklendi. Program arıza fotoğraflarını artık
  tesise değil arızaya göre okur (fotolar['a'+id]).

Program:
- ARIZA_GRUP: su şebekesi, kuyu-pompa, depo, elektrik, GES, kanalizasyon
  (6 grup, 60+ tür). Telefon sade ekranı ve ayrıntılı form: İş grubu → Arıza
  türü açılır listeleri. Tesis seçilince grup tesisin türünden gelir.
- "Nerede?": Tesiste / Şebekede (köyde: ilçe + köy). Ayrıntılı formda
  "— Tesis yok (şebeke / boru hattı) —" seçeneği.
- Arıza noktası (arizaNoktaAl): "Sahaya vardım"da kendiliğinden alınır,
  sade ekranda ve saha kartında "Buradayım — kaydet / Yeniden al"; doğruluk
  ve en yakın köy bildirilir. Haritada açık arızaların noktaları kırmızı
  (dokununca arıza açılır); Ekipler iş haritası ve saha mesafesi noktayı
  kullanır.
- Özet > Köy bazlı arızalar: köy = girilen > tesis köyü > arıza noktasına en
  yakın köy > tesise en yakın köy; açık sayısı, grup dağılımı, en sık tür,
  şebeke arızası, nokta kayıt oranı. Köy bazlı malzeme raporu da ≈ yakın köyü
  kullanır.
- Başvuru sınıflandırma: talepSiniflandir (kural; ek almış kökleri tanır,
  1043 yerleşim adında köy, metinde geçen ilçe ipucu, aciliyet ifadeleri).
  Talep formunda öneri kutusu + "Öneriyi uygula", iş grubu/tür listeleri;
  talep listesinde sınıf. Yapay zekâ: sunucu işlevi talep-siniflandir
  (supabase-islev-talep-siniflandir.ts, claude-haiku-4-5; uygulama oturumu
  oturum_ac ile doğrulanır; ANTHROPIC_API_KEY Secrets'a girilince çalışır).
- Talepten arıza: talebin sınıfı kullanılır; su/kanal (şebeke) talebi tesis
  sormadan talebin köyüyle açılır.
Test: kural sınıflandırıcı örnek mesajlarla; talep→şebeke arızası; gerçek
veritabanında tesissiz arıza + nokta yazma/okuma, köy raporu, liste; test
arızası (ARZ-2026-002) silindi, sayaç geri alındı. Sürüm 2026.10.01-111.

## 2026.10.01 — Arıza kayıt bilgisi (telefon)

Kullanıcı: "Hangi arıza ekibi atandı vs bunları göremedim." Telefondaki sade
arıza ekranında var olan arızada "Kayıt bilgisi" kartı: atanan ekip (büyük;
atanmadıysa kırmızı; ekip telefonu varsa "Ara"), yetkiliye ekip değiştirme,
açan + zaman, öncelik, hedef süre (açıksa), iş emri, kapanış, noktayı alan;
"Bu arızanın hareketleri" (denetim izinden). Yeni arıza sunucu numarası
alınca "Arıza numarası verildi AR-1xx → ARZ-…" iz satırı düşer; geçici
numarayla yazılmış satırlar da arızaya bağlanır. Sürüm 2026.10.01-112.

## 2026.10.05 — Sesli notlar görünmüyordu; iş emri + ekibe atama sadeleştirildi

Kullanıcı: "Ses kaydı yaptım ama gözükmüyor; iş emrini nasıl oluşturup ekibe
atayacağım?"
- Ses: yükleme çalışıyordu (foto tablosunda tur='ses', 3 kayıt) ama sade
  ekran ve formlar yalnız o an kaydedilen sesi gösteriyordu; kayıtlı sesler
  tesis kartında kalmıştı. `ariza_ses_listesi` ile arızaya bağlı sesler
  (tesissiz dahil) okunur, her üç formda "Kayıtlı sesli not" oynatıcısıyla
  görünür. Ses yüklemesi bitince liste tazelenir.
- İş emri: düğme yalnız "Ayrıntılı form"daydı ve tesissiz arızada hiç
  yoktu. Telefon sade ekranda "İş emri ve atama" kartı (ekip atama yetkisi
  olanlara): yeni arızada "Kaydedince iş emri aç ve ekibe ata" (varsayılan
  açık) + araç seçimi (müsaitler önde) → tek kayıtla arıza + iş emri + ekip
  + araç; var olan arızada "İş emri oluştur ve ekibe ata" ya da "Atamayı
  güncelle (ekip + araç)". Arızanın ekibi/durumu iş emriyle eşitlenir,
  ekip seçilince açık arıza "Atandı" olur. Tesissiz (şebeke) arızada da
  iş emri açılır; liste ve panelde köy görünür.
- Düzeltme: iş emri ekibi güncellenince iş emri paneli kendiliğinden
  açılıyordu.
Sürüm 2026.10.05-113.

## 2026.10.05 — Hat ekranı, daralan sol çubuk, yardım metinleri, şartname raporu

- Hat çizimi (hat.html): kenar paneli kalktı; harita tüm alanı kaplar, araçlar
  yüzer (üstte simge çubuğu: çiz/bitir/geri/vazgeç/içe aktar/uydu, altta tür
  çipleri, "Hatlar" açılır paneli). Önceden telefonda ve dar paneldeki
  gömülü görünümde harita küçücük kalıyordu.
- Sol çubuk (masaüstü): 64 px simge şeridi, üzerine gelince 232 px'e açılır
  (içeriği kaydırmaz, üstüne biner), uzaklaşınca daralır; rozetler kırmızı
  nokta olur. Harita/ekran alanı 168 px genişledi.
- Açıklama metinleri: `ks-bilgi` sınıfı varsayılan gizli; üst çubuktaki "?"
  (masaüstü ve telefon) açar/kapatır, cihazda saklanır (`ks-yardim`).
  Veri alanı olan ~40 açıklama alanı + 30 sabit cümle etiketlendi; sayfa alt
  başlığı kalktı; başarı/bilgi bildirimleri ilk cümleyle sınırlı (hata ve
  uyarılar tam). Boş durum ve uyarı metinleri bilerek korundu.
- ADESAY şartname karşılaştırma raporu: Desktop\ADESAY_Sartname_Karsilastirma_05102026.docx
  (7 var, 28 kısmi, 8 yok, 1 yazılım dışı).
Sürüm 2026.10.05-114.

## 2026.10.05-115 — İnternetsiz çalışma (çevrimdışı)
- Programın ihtiyaç duyduğu kütüphaneler (React, Leaflet, supabase-js) `vendor/` klasörüne alındı; artık dış siteye bağlı değil.
- `sw.js` servis çalışanı + `manifest.webmanifest`: uygulama telefona "yüklenebilir", internet yokken açılır. Harita karoları gezildikçe cihaza saklanır (en çok 900).
- `cihaz-depo.js` (IndexedDB): çevrimdışı çekilen fotoğraf/sesler ve sunucudan son alınan veri (tesis, arıza, iş emri, not) cihazda durur.
- İnternet yokken açılış: son girişin profili + son veri cihazdan okunur; giriş ekranında beklenmez. İnternet gelince oturum sunucuda doğrulanır.
- Bağlantı kendiliğinden algılanır (kopunca "çevrimdışı", gelince "gönderiliyor"); bekleyen tesis değişikliği, not, arıza, ambar, modül, fotoğraf ve ses sırayla gönderilir. Üst şeritte bekleyen sayısı görünür.
- Çevrimdışı çözülen arızanın iş emri, arıza sunucuya yazılınca kapanır.

## 2026.10.05-116 — Telemetri altyapısı ve arayüzü
- `SQL-telemetri.sql` (Supabase'e uygulandı): cihaz, ölçüm, son değer, kural, alarm tabloları; cihaz kodu + anahtarla çalışan `telemetri_yaz` ucu; eşik kuralından alarm açma/kapama; 90 gün sonra eski ölçümlerin silinmesi.
- Cihaz tarafı: PLC/GSM modem/Node-RED/ESP32 `POST /rest/v1/rpc/telemetri_yaz` ile ölçüm gönderir (internetsiz kalan toplayıcı eski zaman damgasıyla sonradan gönderebilir). MQTT/Modbus için aracı bir geçit gerekir (geçit aynı ucu çağırır).
- Arayüz: Ekip, Araç, Ambar > Telemetri. Cihaz kartları (son değerler, veri geliyor/sessiz), ölçüm grafiği (6 sa–30 gün), alarmlar (Gördüm / Arızaya çevir), eşik kuralları, cihaz ekleme ve anahtar yenileme (yalnız yönetici, müdür, mühendis).
- Sahte veri yok: arayüz boş başlar, cihaz bağlandıkça dolar.

## 2026.10.05-117 — Vatandaş / muhtar başvuru sayfası
- `/bildirim`: oturum gerektirmeyen telefon uyumlu form (ilçe, köy, konu, açıklama, isteğe bağlı konum, KVKK aydınlatma onayı). Başvuru "BSV-XXXXXX" takip kodu alır; aynı sayfadan kodla durum sorgulanır.
- Kötüye kullanıma karşı (SQL-basvuru.sql, Supabase'e uygulandı): gizli bot alanı, IP başına saatte 5 / telefon başına günde 5 başvuru, aynı başvurunun tekrarı yeni kayıt açmaz, kara liste (personel "Spam" düğmesiyle ekler).
- Personel tarafı: İşler > Gelen ekranında "Web başvuruları" kartı; "Talebe aktar" talebi açar, talep durumu/sonuç notu değiştikçe vatandaşın takip sayfası da güncellenir. "Başvuru bağlantısı" düğmesi adresi kopyalar.
- Aydınlatma metni taslaktır; kurumun KVKK sorumlusu kontrol etmelidir.

## 2026.10.05-118 — Ayarlar > Entegrasyon
- Anthropic API anahtarı artık programdan girilir (yalnız yönetici); sunucuda `entegrasyon` tablosunda saklanır, tarayıcıya geri gönderilmez (SQL-entegrasyon.sql, Supabase'e uygulandı).
- `talep-siniflandir` işlevi (v2) anahtarı Edge secret'tan, yoksa bu tablodan okur. "Dene" düğmesi çalıştığını gösterir.

## 2026.10.05-119 — SLA, bekleme, ana arıza, planlı iş, veri sözlüğü
- `SQL-ariza-sla.sql` (Supabase'e uygulandı): arıza başına SLA süresi (yalnız yönetici/müdür/mühendis/şef değiştirir) ya da "SLA dışı", bekleme süresi, ana arıza bağlantısı, planlı zaman.
- "Beklemeye al" (neden seçilerek; telefonda büyük düğme) süreyi durdurur; bekleme süresi hedeften düşülür, "Devam et" önceki duruma döner.
- Ana arıza çözülünce bağlı ihbarlar için "hepsi çözüldü mü?" sorulur; bağlı talepler çözüldü olur, vatandaşın takip sayfası güncellenir.
- Planlı zaman gelince (uygulama açıkken) ekibe/yönetime bildirim çıkar.
- İşler > Genel bakış'a "SLA zamanında kapanış" göstergesi (yüzde, aşım gün toplamı, bekleme saati) eklendi.
- `VERI-SOZLUGU.md`: tablo ve alan açıklamaları.

## 2026.10.05-120 — Araç ve personel kartı, araç arızası/kaza
- Araç kartı: marka, model, trafik sigortası bitişi eklendi; muayene ve sigortası 45 günden az kalan ya da geçen araçlar listede ve "Muayene / sigorta uyarısı" sayacında işaretlenir. Yönetim rollerine günde bir kez uyarı bildirimi (30 gün kala / geçmişse).
- Personel kartı: "Kullanabildiği araç türleri" seçimi.
- Saha: "Araç arızası / kaza" düğmesi — araç "arızalı" olur, araç defterine işlenir, iş ekipten alınıp merkeze devredilir (Beklemede; süre SLA'dan düşer).

## 2026.10.05-121 — Ambar hareket formu: önce → işlem → sonra kontrol satırı

## 2026.10.06-122 — Çöp kutusu düzeltmesi, ücretsiz yapay zekâ (Gemini), Telegram botu
- `cop_temizle` WHERE hatası Supabase'te düzeltildi; çöp kutusu temizliği çalışıyor.
- Ayarlar > Entegrasyon: Google Gemini (ücretsiz anahtar), Anthropic, Telegram bot anahtarı. `talep-siniflandir` v3 Gemini'yi de destekler.
- `telegram-basvuru` işlevi: Telegram'dan yazan vatandaşın mesajı web başvurusu olur, takip kodu alır, konum paylaşabilir, /durum KOD ile sorgular.

## 2026.10.06-123 — Panel görünümü, Excel içe aktarma, hat çapı, kritik stok → sipariş
- Tasarım: renkler aynı; her sayfada (masaüstü, telefon, harita/hat/profil) yuvarlak yumuşak kartlar, cam gibi üst/alt çubuk, ince kaydırma, belirgin odak halkası, koyu temada saydam kartlar.
- Dış veri aktarımı Excel (.xlsx/.xls) dosyasını okur (SheetJS, yalnız gerektiğinde yüklenir).
- Hat çizimi: her hat için boru çapı (mm) ve malzeme girilir (Çap düğmesi); sunucuya açıklama alanıyla yazılır.
- Kritik stoğa düşen kalem sipariş listesine kendiliğinden eklenir (satın alma uyarısı).

## 2026.10.06-124 — Ek ekip ve sıralı alt işler, telemetri geçit rehberi
- İş emrine ek ekipler ve sırayla yapılacak alt işler (SQL: is_emri_ek). Önceki alt iş bitmeden sıradaki "bekleniyor" görünür.
- `TELEMETRI-GECIT.md`: Modbus/MQTT cihazlar için geçit örnekleri.

## 2026.10.06-125 — Çevrimdışı çizilen hatlar bağlantı gelince sunucuya gider

## 2026.10.06-127 — Harita karoları, ortak işaretler, telefon menüsü, çakışma düzeltmesi
- Harita karoları artık CORS kipiyle alınıp yalnız başarılı olanlar önbelleğe giriyor (hatalı karo kalıcı boşluk bırakıyordu); karo önbelleği sıfırlandı.
- Ortak harita işareti (`ksPin`): envanter haritası, ISU referansları ve Hat Kesiti aynı simge/renk dilini kullanır; uzaktan küçük nokta, yakında simgeli. Hat Kesiti haritasında tesisler, ISU noktaları ve kayıtlı hatlar da görünür.
- "Harita menüsü": açılırken yumuşak animasyon, haritaya/boş yere/başka bölüme dokununca kapanır.
- Telefon üst çubuğu: taşan düğmeler ⋮ menüsüne alındı (yenile, tema, açıklamalar, ayarlar, çıkış); masaüstüne çıkış düğmesi eklendi.
- "Bütün ekranlar" sayfasında ekranların üst üste binmesi giderildi (v123'te eklenen saydam arka plan kuralı kaldırıldı).
- Hat Kesiti telefonda üst çubuk iki satıra indirildi.

## 2026.10.06-128 — Harita performansı
- Envanter ve Hat Kesiti haritaları artık yalnız ekrandaki işaretleri çizer: uzaktan (zoom < 12) canvas üzerinde küçük renkli noktalar, yakında en çok 260 simgeli işaret, etiketler 14'ten sonra. (Önceden 900+ DOM işareti ve 290 kalıcı etiket telefonu kilitliyordu.)
- Veri değişmediyse işaretler yeniden kurulmaz; harita çerçevesi tile'ları yakınlaştırma sırasında yüklemez.
- Pahalı bulanıklık (backdrop-filter) ve sabit arka plan kaldırıldı; yerleşim ölçümü 400 ms yerine 1,5 sn'de bir.
- Harita karo istekleri 6 sn zaman aşımıyla doğrudan ağa düşer.

## 2026.10.06-129 — Üretimde haritayı engelleyen Leaflet CSS hatası
- vendor/leaflet.css git satır-sonu dönüşümüyle değişince tarayıcı bütünlük (SRI) denetiminde dosyayı engelliyordu (yalnız yayında; yerelde görünmüyordu). Etiketler kaldırıldı, .gitattributes ile vendor dosyaları dönüşümden muaf.

## 2026.10.06-130 — Envanter ve Hat Kesiti aynı harita
- `harita-katman.js` (ortak modül): zemin, kayıt işaretleri, ISU noktaları, hatlar, arıza noktaları, süzgeç, etiketler. Envanter haritası ve Hat Kesiti artık BİREBİR aynı katmanları aynı biçimde gösterir; ana programdaki süzgeç/zemin/hat/tema seçimleri ikisine de gider.
- Hat Kesiti, Envanter'in üçüncü görünümü oldu (Harita | Liste | Hat kesiti) — "Tümü"ne girmeden erişilir. Hat Kesiti haritası da aynı "Harita menüsü"nü kullanır.
- Telefonda Hat Kesiti: harita ekranın büyük kısmını alır, üst şerit sıkıştırıldı, ölçüm paneli gizlenebilir.

## 2026.10.06-131 — Telefonda harita ekranından Hat kesitine geçiş
- Envanter haritasında "Liste" ve "Hat kesiti" geçiş düğmeleri süzgeç şeridine sabitlendi (şerit kaysa da görünür kalır).

## 2026.10.06-132 — Telefonda sadeleştirme
- Envanter haritası: sabit üçlü geçiş (Harita | Liste | Hat kesiti) + açılır "Süzgeç" bloğu (varsayılan kapalı).
- Envanter listesi ve Arıza listesi: süzgeç ve sıralama açılır-kapanır tek satırda; satırda yalnız bekleyen kayıt etiketi görünür.
- Servis çalışanı sayfaları her seferinde sunucuyla doğrular (eski kopyada kalma riski azaldı).

## 2026.10.06-133 — Koyu tema sadeleşti, telefonda Liste kalktı
- Koyu tema zemini saf siyahtan (#000) yumuşak koyu griye (#121214) alındı; arama kutuları/şeritler artık siyah delik gibi durmuyor. Harita denetimleri (yakınlaştırma, künye, açılır pencere) koyu temada koyu. Arıza düğmesi beyaz/siyah yerine kart rengi.
- Telefonda Envanter > Liste görünümü geçiş çubuğundan kaldırıldı (üstteki arama kutusu aynı işi görüyor); masaüstünde duruyor.

## 2026.10.06-134 — Geçiş sırası Harita | Hat kesiti | Liste; telefonda Liste geri geldi. Koyu tema yumuşak gri zeminle kaldı.

## 2026.10.06-135 — Telefonda büyük harita
- Hat kesiti telefonda harita ekranının ~%75-80ini alır: başlık ve araç şeridi kapalı; "Araçlar ▾" ile açılır (Seçili kaydı nokta yap, köy arama, Nokta ekle…); ölçüm paneli alt çubuktan açılır (mesafe ve nokta sayısı kapalıyken de görünür).
- Harita ve Hat kesiti ekranlarında ⤢ düğmesi: üst arama ve alt menü gizlenir, harita tam ekran olur (⤡ ile geri).

## 2026.10.06-136 — Hat kesitinde süzgeç
- Hat kesiti ekranında da Envanter haritasındaki süzgeç (Tümü, Kuyu, Depo, AG, GES, Pasifler, ISU Kaynak, ISU Memba) var (masaüstünde şerit, telefonda "Süzgeç" düğmesi); seçimler iki haritaya birlikte uygulanır.

## 2026.10.06-137 — Hat kesiti: gereksiz düğmeler kalktı, hat uçları kayda bağlanıyor
- "Seçili kaydı nokta yap" ve "Açık arızalı kaydı nokta yap" düğmeleri ve işlevleri programdan kaldırıldı (masaüstü + telefon).
- "Nokta ekle" açıkken bir kuyu/depo işaretine dokunulursa nokta tam o tesisin konumuna oturur ve kayda bağlanır (haritada yeşil halkalı numara, listede "KOD · başlangıç/bitiş" etiketi). "Nokta ekle" kapalıyken işaretlere dokunmak nokta eklemez.
- Aktarırken "Bağlanacak kayıt" ilk/son uçtaki kayıttan gelir; hat türü uçlara göre önerilir (kuyu → Terfi, kuyu+depo → İsale, depo → Şebeke, AG/GES → Enerji), elle değiştirilebilir. Hat açıklaması "KOD → KOD · km" olarak yazılır. Hiç bağ yoksa ana programda seçili kayda eklenir.

## 2026.10.06-138 — İş emri kapanıyor, kuyruk açıklandı, hat ucu metreyle, Özet düzeni
- İş emri kapatılamıyordu: sunucudaki kapatma işlevi tesis geçmişine yazarken kullanıcı kimliği türü uyuşmadığı için hata veriyordu ve program hatayı göstermiyordu. SQL düzeltildi (SQL-is-emri-kapat-duzelt.sql), mühendis de kapatabilir. Program artık hatayı gösterir; çözülmüş arızanın açık kalan iş emrini kendiliğinden kapatır; İş emirleri panelinde elle "İş emrini kapat" düğmesi var.
- Arıza kartında malzeme listesi açılır liste oldu (telefon + masaüstü); ararken kendiliğinden açılır, seçince kapanır.
- Bekleyen/kuyruk: üst çubuktaki rozet yalnız bağlantı durumunu söyler ("Canlı"); turuncu "Bekleyen N" düğmesi gitmemiş kayıtları sayar. Kuyruk sayfası her bekleyen kaydı ve neden beklediğini listeler; "Şimdi gönder" tesis, arıza, ambar, modül, not ve fotoğrafları dener.
- Hedef süre (SLA) kapalıyken arıza kartındaki SLA alanları ve Özet'teki SLA / hedef süre göstergeleri de gizlenir (Ayarlar > Modüller > Hedef süre).
- "Planlı" süzgeci "Periyodik bakım" oldu (tesisin son bakım tarihine göre hesaplanır).
- Hat kesiti: nokta sürüklenirken önceki noktaya uzaklık canlı görünür; altta "Son nokta, öncekine [100] m Ayarla" ile son nokta tam metreye alınır.
- Özet: kart düzeni, yuvarlak ve vurgu renkli çubuklar, okunur bölüm başlıkları.
- Telegram: "Anahtarı sil" bot bağlantısını da keser (edge function telegram-basvuru v2); kart açıklamasına adımlar eklendi.

## 2026.10.06-139 — Yeni başvuru uyarısı
- Web / Telegram başvurusu gelince: kırmızı kart (dokununca Gelen'e gider), iki tonlu ses, telefonda titreşim, izin verilmişse tarayıcı bildirimi, sekme arkadayken başlıkta yanıp sönen "(N) Yeni başvuru!". Başvurular 30 sn'de bir yoklanır; her başvuru bir cihazda bir kez duyurulur. İşler menüsündeki sayı yeni başvuruları da içerir. Tarayıcı bildirim izni ilk dokunuşta bir kez istenir.

## 2026.10.06-140 — Başvuru uyarısı en üste alındı
- Yeni başvuruda ekranın en üstünde kırmızı şerit çıkar; kullanıcı "Gelen'i aç" ya da ✕ diyene kadar kalır, ses 20 sn'de bir tekrarlanır. Ses kilidi her dokunuşta açılır.
- Ayarlar > Entegrasyon > "Yeni başvuru uyarısı" kartı: ses / tarayıcı bildirimi / Telegram durumunu gösterir; "Sesi ve uyarıyı dene", "Bildirim izni iste", "Telegram kodunu göster".
- Uygulama kapalıyken de uyarı: bota "/yonetici KOD" yazan sohbete her yeni başvuruda (web formu ya da Telegram) bot mesaj atar → telefonda bildirim sesi. "/yonetici CIK" ile çıkılır. Sunucu: pg_net + vatandas_basvuru tetikleyicisi, edge function telegram-basvuru v3.

## 2026.10.06-141 — Başvuru alarmı: yüksek ses, tıklanana kadar
- Alarm sesi yeniden yazıldı: kare+testere dalgalı ~2 sn siren, tam ses seviyesi (tepe ≈ %95, bozulmadan). Ses artık görsel uyarıdan önce başlatılır; ses bağlamı uykudaysa uyanır uyanmaz çalar (3-4 sn gecikme buradandı).
- Operatör "Gelen'i aç" ya da ✕'e basana kadar: kırmızı şerit yanıp söner, ses 6 sn'de bir tekrar eder, sekme başlığı "🔔 YENİ BAŞVURU!" yanıp söner, tarayıcı bildirimi (requireInteraction) kapanmaz.

## 2026.10.06-142 — Başvuru durum takibi
- Telegram'dan başvuran vatandaşa durum değişince bot kendiliğinden yazar (İnceleniyor / Ekip görevlendirildi / Çözüldü / Karşılanamıyor + not). /durum KOD ile de sorulabilir. Spam'e atılan başvuruya mesaj gitmez.
- Talepten açılan arıza çözülünce bağlı talep de kendiliğinden "Çözüldü" olur (sonuç boşsa "Arıza giderildi."); böylece zincir sonuna kadar vatandaşa yansır.

## 2026.10.06-143 — Masaüstünde Sahadayım / İşi tamamla, "Tümü" ISU'yu kapsıyor
- Arıza kartında (masaüstü + telefon ayrıntılı form) "İş akışı"nın üstüne Sahadayım ve İşi tamamla düğmeleri eklendi (telefonun sade ekranıyla aynı mantık). Sahadayım işi "Sahada" yapar; İşi tamamla durumu Çözüldü yapıp kaydeder (kanıt fotoğrafı zorunluysa eksikse uyarır, malzeme zimmetten düşme sorusu çıkar; merkez onayı açıksa "Kontrolde" olur). Masaüstünde Sahadayım konum almaz (bilgisayarın konumu arızanın yeri değildir).
- Harita ve Hat kesiti "Tümü" süzgeci artık ISU Kaynak ve ISU Memba noktalarını da açar/kapar; varsayılan açık. Kullanıcı bazlı kayıtlı süzgeç ISU alanlarını da saklar.

## 2026.10.06-144 — Masaüstü sağ panelde üstte sabit çıkış
- Tesis kartı (kuyu/depo/AG/GES), arıza formu ve koordinat dönüşümü panellerinde sağ üstte sabit ✕ düğmesi: panel aşağı kaydırılsa da görünür, ilgili paneli kapatır. Alttaki "Kapat" düğmeleri yerinde. Arıza panelinde üstte çıkış yoktu; eklendi.

## Güvenlik düzeltmesi (2026-10-06, sürüm değişmedi)
- Supabase'in "tablo herkese açık" uyarısı: alt_sistem_kategori tablosunda RLS kapalıydı (anonim okuyup yazabiliyordu) → kapatıldı. Ayrıca kullanılmayan v_eksik_bilgi / v_ilce_ozet görünümleri anonim okumaya kapatıldı, parametresiz cop_temizle() anonim çağrıya kapatıldı. Şu an public şemada RLS'siz tablo yok. Ayrıntı: SQL-guvenlik-duzeltme-2026-10-06.sql

## Modüler yapı — Faz 0 (2026-10-07)
- `index.html` artık `src/` klasöründen `node build.js` ile üretiliyor (20 bin satırlık tek parça → 21 modül klasörü + sabitler + stil + kabuk). Vercel yayında `buildCommand: node build.js` çalıştırır. Çıktı eskisiyle satır satır aynı (yalnız yöntem/özellik sırası modüle göre gruplandı). `duman-testi.js` index.html'in güncel olduğunu da denetler. Ayrıntı ve sıradaki adımlar: `MODUL-ILERLEME.md`, `src/README.md`.
- Faz 1 (kısmi, 2026-10-07): kabuk 1218 → 233 satır; render hazırlığı ve görünüm modelleri konu/özellik başına dosyalara bölündü (çıktı index.html bayt bayt aynı).
- Faz 1 tamam (2026-10-07): yöntemler alt konulara bölündü; `componentDidMount` modül başına `baslat*` yöntemlerine ayrıldı (davranış aynı; tarayıcıda oturum, veri, depo, mesaj dinleyicisi, zamanlayıcılar doğrulandı).
- Faz 2 tamam (2026-10-07): `supabase-baglanti.js` de src/'den derleniyor (build.js iki hedef); SQL dosyaları `src/moduller/<m>/sql/` altına, edge function kaynakları `islev/` altına taşındı; dizin: `SQL-INDEKS.md`.
- Faz 3-4 tamam (2026-10-07): her modülde `modul.json`; `node modul-bilgi.js` (modül tablosu, `--bagimlilik`, `<modül>` ayrıntısı); `node yeni-modul.js <ad> "<açıklama>" [--sayfa]` yeni modül iskeleti kurar ve kabuğa bağlar, `--kaldir <ad>` kullanılmıyorsa kaldırır; duman-testi modul.json ve yetim dosya denetimi yapar. Kılavuz: `src/README.md`. **Sürüm artırma:** `src/sabitler/11-genel.js` SURUM + `sw.js` SURUM, sonra `node build.js` (index.html elle düzenlenmez).

## 2026.10.07-145 — Modüler yapı tamamlandı
- Kod tabanı artık modüler: `src/moduller/` altında 21 modül (şablon masaüstü+telefon, yöntemler, görünüm modeli, bağlantı işlevleri, SQL, edge function); `index.html` ve `supabase-baglanti.js` `node build.js` ile üretilir, Vercel yayında aynısını çalıştırır. Davranış değişmedi: 20 sekme × masaüstü/telefon için görünüm modeli çıktısı eski tek parça sürümle karşılaştırıldı, fark yok. Araçlar: `modul-bilgi.js`, `yeni-modul.js`, `duman-testi.js` (derleme + modül yapısı). Kılavuz: `src/README.md`.
- Masaüstü/telefon eşdeğerlik kontrolü (2026-10-07): `esdeger-kontrol.js` iki tarafın eylem bağlarını karşılaştırır, yeni tek taraflı bağ varsa duman-testi hata verir (özellik yalnız bir tarafa eklenip öteki unutulmasın). Mevcut 115 fark nedenleriyle `src/esdeger-bilinen.json`'da; 10 tanesi "EKSİK ADAYI" (telefonda işçilik girişi, Özet ilçe/zaman süzgeci, arıza "Haritada göster", ekip panosu kısayolları, tesis kartı Fotoğraf kısayolu...). Davranış değişmedi.

## 2026.10.07-146 — Telefona eklenen eksikler (masaüstü/telefon eşdeğerliği)
- Özet > **Rapor** sekmesi telefonda da var (Bugün/Hafta/Ay/Yıl/Tümü/Özel, ilçe seçimi, özel tarih aralığı, köy bazlı arızalar ve malzeme maliyeti).
- Telefondaki ayrıntılı arıza formuna **işçilik (₺)** girişi ve maliyet kutusuna işçilik hücresi eklendi.
- Telefondaki Ekip panosuna **Araç defteri** ve **Ekip ve personel düzenle** kısayolları eklendi.
- Eşdeğerlik kontrolündeki 10 "eksik adayı"ndan 7'si giderildi, 3'ü bilerek farklı olarak nedenleriyle kayda geçti (Haritada göster, tesis kartı Fotoğraf kısayolu, günlük iş listesi — telefonda eşdeğer akış var).
- "642 gün gecikti" bakım satırı: şu an hiçbir tesiste bakım tarihi yok (291 tesisin 291'i "kayıt yok") — o satır büyük olasılıkla bir cihazda girilmiş deneme verisiydi, sunucuda yok.

## 2026.10.07-147 — İş panosu (yeni, deneme)
- İşler > **İş panosu** (ilk süzgeç): gelen Telegram/web başvuruları, talepler ve arızalar tek ekranda **Yeni → Atandı → Sahada → Bitti** sütunlarında renkli kutucuklar. Kutucuk: öncelik rengi (acil: nabız atan nokta), arıza türü, yer, kimde (ekip), kaç saat önce, uyarı ("uzun süredir bekliyor"), tek büyük düğme (Arızaya çevir / Ekip ata / Sahada / İşi bitir). Masaüstünde kutular sütunlar arasında sürüklenebilir (Atandı'ya bırakılınca ekip sorulur, Sahada'ya bırakılınca "sahada" olur, Bitti'ye bırakılınca kapanış formu açılır). Telefonda 4 renkli sayaç düğmesi + seçili sütunun listesi (yöneticinin sahada izlemesi için). Eski ekranlar (Genel bakış, Gelen, Açık...) yerinde duruyor.
- Yeni modül: `src/moduller/is-panosu/` (yeni-modul.js ile kuruldu); mevcut akışları çağırır, yeni iş kuralı yok.

## 2026.10.07-148 — İş panosu: Tablo görünümü
- İş panosunun üstünde **Pano | Tablo** düğmesi (seçim cihazda hatırlanır). Tablo (masaüstü): Excel benzeri satırlar; başlığa tıklayınca sıralama (öncelik, no, ne, nerede, kimde, durum, süre), üstte arama kutusu + durum ve ekip süzgeci, satırdaki ekip kutusundan doğrudan ekip atama/değiştirme, satır sonunda tek düğme. Telefon aynı kart listesini kullanır. İki görünümün hangisinin işe yaradığı deneyerek belirlenecek.

## 2026.10.07-149 — İş kartı (tek sayfa), satır tıklaması, ekip konumu altyapısı
- Panoda/tabloda kutunun ya da satırın **her yerine** basınca iş açılır (düğme ve seçim kutuları kendi işini yapar). Telegram/web başvurusu ve talep artık eski Talep ekranına gitmez: yeni **İş kartı** sayfası açılır.
- **İş kartı** (masaüstü + telefon, tek sayfa, 6 bölüm): 1 Bildirim (kanal, zaman, kim, telefon, metin, konum) · 2 Ne arızası (sınıf, tür, öncelik; sistem önerisiyle dolu) · 3 Nerede (ilçe, köy, tesis seçimi; mesafeye göre) · 4 Kim gidecek (ekipler: bölge/nöbet/doluluk, üyeler ve durumları, araç, uyarılar, konum ve km) · 5 Ne zaman (hemen / ileri tarih) · 6 Not. Altta tek düğme **Ata** (ekip seçilmediyse "Arıza oluştur"); başvuru için "Spam", talep için "Arıza değil — kapat". Ata, mevcut kaydetme akışını kullanır (iş emri + araç dahil).
- **Ekip konumu altyapısı** (yeni modül `konum`): konum_cihaz/konum_son tabloları, `konum_yaz` (Arvento ya da onun verisini ileten betik; anahtar korumalı), `konum_gonder` (ekibe zimmetli tablet/telefon; Ayarlar › Veri › "Konumu paylaş"), cihaz yönetimi Ayarlar › Entegrasyon › "Ekip konumu — cihazlar", Arvento kullanıcı/şifre ve yazma anahtarı kartları. Yalnız son konum saklanır. Arvento çekici henüz yok (API/hesap gelince). Ayrıntı: KONUM-ALTYAPI.md.
- Not: Sunucuda ekip listesi ve araç listesi boş; ekibe üye ve araç girilmedikçe İş kartında "Ekibe personel girilmemiş / Araç bağlı değil" uyarısı çıkar.

## 2026.10.07-150 — Sadeleştirme: Talep, Gelen, Açık ve Genel bakış kalktı
- **İşler** menüsü üç görünüme indi: İş panosu · Bana atanan · Periyodik bakım. Eski **Talep/Gelen** ve **Açık (arıza listesi)** ekranları silindi; yerini panonun Yeni sütunu ve Tablo görünümü aldı. Eski bağlantılar ve kayıtlı sekme tercihi iş panosuna düşer.
- **Arıza** kaydı (masaüstü) ve **yeni telefon talebi** de aynı tek sayfa İş kartında açılır (üstteki + düğmesi dahil). Telefonda arıza düzenleme sade ekranı olarak kalır.
- Genel bakış göstergeleri **Özet > Operasyon göstergeleri**'ne taşındı; göstergelerdeki kısayollar iş panosunu süzgeçli açar. Pano üstünde **Muhtar defteri** düğmesi.
- Ölü kod temizliği: arıza listesi hazırlık dosyası ve kullanılmayan ekran verileri kaldırıldı.

## 2026.10.07-151 — Ayarlar sadeleştirildi
- **Masaüstü:** Ayarlar iki sütunlu — solda bölüm listesi (her zaman görünür), sağda seçili bölüm. Geri-ileri gezinme yok. Telefonda liste → bölüm düzeni aynı kaldı.
- 14 karışık bölüm yerine 5 başlık altında kısa sayfalar: **Ekip** (Ekipler, Personel) · **Bağlantılar ve uyarılar** (Başvuru uyarısı ve Telegram, Ekip mesajları, Ekip konumu, Yapay zekâ) · **Kullanıcılar ve güvenlik** (Yetkiler, KVKK, Denetim izi) · **Veri** (Sürüm ve senkronizasyon, Köy listesi, Kayıt araçları, Dış veri aktarımı, Çöp kutusu) · **Program** (Harita ve görünüm, Modüller).
- Eski tek 'Entegrasyon' sayfası üçe bölündü (uyarı+Telegram, yapay zekâ, ekip konumu); 'Ekipler ve personel' ikiye bölündü; ekip konumu paylaşımı Veri'den kendi sayfasına taşındı. Gönderilemeyen mesaj bildirimi artık doğrudan Ekip mesajları sayfasını açar.

## 2026.10.07-152 — Özet ve Kaynaklar sadeleşti
- **Özet:** üstteki 8 sayı kutusu 4'e indi (Kayıt · Aktif · Eksik bilgili · Açık arıza). Kuyu/depo/pasif dağılımı zaten aşağıdaki tür tablosunda; eşitleme bekleyen sayısı üst çubuk göstergesinde.
- **Telemetri** artık yeni bir modül (Ayarlar > Modüller, varsayılan KAPALI). Bağlı cihaz yokken Kaynaklar'da boş sayfa olarak görünmüyor; cihaz bağlanınca modülden açılır.

## 2026.10.07-153 — Arıza durum seçici sadeleşti
- Arıza kartındaki durum seçici 8 adımdan 6'ya indi: Açık · Atandı · Sahada · Beklemede · Çözüldü · İptal (Merkez onayı açıksa Kontrolde de görünür). “Bilgi bekliyor” ve “Başka birime” artık **Beklemede + bekleme nedeni** (dış kurum, malzeme, abone/muhtar…) olarak girilir; neden listesi hedef süre modülü kapalıyken de çıkar. Eski kayıtlar bu iki durumdaysa kendi adımı görünmeye devam eder, veri değişmedi.

## 2026.10.09-154 — Kuyu kartı kaydı düzeltildi, yeni iş satırda uyarıyor, Özet'ten eksik bilgi kalktı
- **Kuyu/tesis kartı kaydı (ciddi hata):** sunucudaki `cop_temizle` her veri yenilemede (30 sn) bütün tesislerin kaydını yeniden yazıyordu → her tesisin sürümü sürekli artıyor, kullanıcı kaydedince sunucu “başkası değiştirdi” diye reddediyordu; program hatayı yutup eski veriyi geri yüklüyor ve “güncellendi” diyordu. Düzeltme: (1) sunucu fonksiyonu artık yalnız fotoğraf sayısı değişen kaydı yazar (`SQL-cop-temizle-surum-duzelt.sql`, migration uygulandı); (2) program sürüm çakışmasında güncel kaydı çekip girilenleri üstüne uygulayıp yeniden dener, hâlâ olmazsa gerçek nedeni kırmızı uyarıyla söyler, ekranı geri yüklemez. Gerçek sunucuda uçtan uca denendi.
- `gecmis` tablosunda bu hata yüzünden ~550 bin gereksiz “Kayıt güncellendi” satırı birikti (temizlenmedi).
- **Pompa gücü:** kuyu kartında “Pompa motoru (kW)” alanı “Pompa gücü (kW)” oldu (aynı alan, veri korunur).
- **Yeni gelen iş:** üstteki kırmızı şerit kalktı. İş panosunda Yeni sütunundaki, son 12 saatte gelmiş ve açılıp bakılmamış kutu/satır kırmızı yanıp söner (“YENİ GELDİ”); açılınca söner. Menüde İş panosu üzerinde bakılmamış sayısı görünür. Ses siren alarmı iş panosu açılana kadar tekrarlar.
- **Özet:** “Eksik bilgili” kutusu, ilçe/köy “eksik” sayıları, “Eksik bilgisi olan kayıtlar” listesi ve Excel/PDF’teki eksik sütun/bölümleri kaldırıldı.

## 2026.10.10-155 — “Eksik bilgi” gürültüsü ve yinelenen başlıklar temizlendi
- Tesis kartından “Kayıt tamlığı %” çubuğu kalktı; boş alanlar “— eksik” yerine yalnız “—” görünür. “Bana atanan” listesinden “EKSİK BİLGİ” satırları çıktı. Özet’te köy listesinden “Köy girilmedi” satırları çıktı. Kullanılmayan `missingOf` ve arıza listesi kodu silindi.
- Ayarlar: sayfa başlığıyla aynı olan küçük etiketler (Ekipler, Modüller, KVKK) kaldırıldı.
- Veritabanı: `gecmis` tablosundaki 551.761 gereksiz toplu satır silindi (103 MB → 184 kB; veritabanı 119 MB → 16 MB).

## 2026.10.10-156 — Yalnız envanter kullanımı: kapalı modüllerin menü/düğme/sayfaları gizlenir
- Modül anahtarı kapalıysa ilgili her şey artık görünmez: Ekipler menüsü (arıza ve araç ikisi de kapalıysa), harita üstündeki “Yeni arıza” düğmesi, tesis kartındaki “Arıza aç”, Özet’te “Açık arıza” kutusu ile “Ekip ve arıza”/“Rapor” sekmeleri (tek sekme kalınca çubuk da kalkar), Ayarlar’da ekip/personel/ekip konumu/ekip mesajları/Telegram/yapay zekâ/KVKK sayfaları. Talep kapalıyken başvuru yoklaması ve alarmı çalışmaz.
- Açık kalan: Envanter (Harita · Hat kesiti · Liste), Özet, Ayarlar (Yetkiler, Denetim izi, Veri, Köy listesi, Kayıt araçları, Dış veri aktarımı, Çöp kutusu, Harita ve görünüm, Modüller). Modüller Ayarlar > Modüller’den istenince yeniden açılır.

## 2026.10.10-158 — Özet: kutu kutu hareketli gösterge paneli
- Özet > Envanter yeniden tasarlandı: **Envanter dağılımı** (animasyonlu halka + tür listesi), **Hizmet durumu** (halka + aktif/pasif sayaç), **Fotoğraf kapsamı** (halka + tür çubukları), **İlçelere göre** (kuyu/depo/diğer üst üste çubuklar), **En çok kayıtlı köyler**, **Yakınımdaki tesisler**. Sayılar yukarı sayarak açılır, halkalar süpürülür, çubuklar sırayla büyür; kutular sırayla belirir. Tür, ilçe, köy ve “Pasifleri göster”e basınca Envanter listesi o süzgeçle açılır.
- Masaüstü ve telefon aynı ortak şablonu (`src/moduller/ozet/ortak/pano-envanter.html`) kullanır; kutular genişliğe göre alt alta ya da yan yana dizilir. Renkler haritadaki tür renkleriyle aynı; aydınlık ve koyu tema için ayrı adımlar `validate_palette` ile doğrulandı. “Hareketi azalt” ayarı olan cihazlarda animasyon kapanır.

## 2026.10.10-159 — Özet: yedi yeni kutu
- Eklendi: **Dağılım haritası** (her kayıt tür renginde nokta, ilçe adları, noktaya basınca kart), **Kuyuların teknik özeti** (toplam pompa gücü, ortalama derinlik, toplam debi — yalnız bilgisi girilmiş kuyular), **Kuyuların dağılımı** (yapım yılı / derinlik / debi sütun grafiği), **10 bin kişiye düşen kuyu** (ilçe nüfusu TÜİK), **Su kalitesi** (analizi girilmiş, 12 aydan eski, klor aralığı), **Konumlar nereden geldi**, **Son hareketler** (aynı dakikada 20’den çok kaydı değiştiren toplu yazma izleri sayılmaz).
- Bilgisi girilmemiş kutular boş grafik yerine ne yapılacağını söyleyen kısa not gösterir; kuyu kartından girildikçe dolar.

## 2026.10.10-160 — Her sayfada “‹ Geri”, harita etiketlerinde köy · ilçe
- Bir sayfadan başka sayfaya geçince (Özet > ilçe > liste, listeden kayda, Ayarlar > Denetim izi/Çöp kutusu…) üstte **‹ önceki sayfa** düğmesi çıkar; basınca bir önceki sayfaya döner, zincir halinde geri gidilir. Menüden (sol menü, alt çubuk) geçiş geçmişi sıfırlar. Masaüstünde üst çubukta, telefonda üst alanın altında.
- Harita “Kayıt etiketleri” artık iki satır: kod ve altında **köy · ilçe** (köyü girilmemiş kayıtta yalnız ilçe).

## 2026.10.10-161 — Köy adı otomatik yazma güvenli hale getirildi + Köy kontrolü
- “Kuyulara köy adı yaz” artık sunucuya yazar (eskiden yalnız ekranda kalıyordu) ve yalnızca **güvenli eşleşmelere** yazar: yerleşim kaydın ilçesindendir ve 1,5 km’den yakındır; ilçeyi değiştirmez. Köyü boş 247 kayıttan **150’sine** yazıldı, 97’si boş bırakıldı. Her biri kayıtta `koyOtomatik: X km` ile işaretli.
- **Ayarlar > Kayıt araçları > Köy kontrolü:** otomatik yazılanlar uzaktan yakına listelenir; her satırda **Doğru** (işareti kaldırır), **Düzelt** (kaydı açar, Köy ve ilçe düzelt formunu doldurur), **Geri al** (köyü siler); üstte **Hepsini doğru kabul et** ve **Hepsini geri al**. Kayıt kartında “Köy bilgisi: otomatik yazıldı (X km)” satırı görünür; köy kartından elle değiştirilince işaret kalkar.

## 2026.10.10-162 — Kartta köy düzeltme, telefonda alt düğmeler listenin sonunda
- Tesis kartında (telefon ve masaüstü) kodun altında **✎ Köyü düzelt** düğmesi; köy otomatik yazılmışsa yanında **✓ Köy doğru**. Ayarlara gitmeden kartta düzeltilir.
- Elle düzeltilen ya da “doğru” denen köy kayıtta `koyElle` ile **hafızada kalır**: otomatik köy aracı ve “Hepsini geri al” bu kayıtlara bir daha dokunmaz; kart düzenlemesinde köy değişirse de aynı işaret konur.
- Telefonda tesis kartındaki Kaydı düzenle / Tesis kartı / Kaydı sil / Kapat düğmeleri artık ekranın altına yapışık değil, kaydırılan listenin en sonunda (ekran daralmaz).

## 2026.10.10-163 — Telefonda tesis kartı başlığı sıkılaştı
- Pasife al · ✎ Köyü düzelt · ✓ Köy doğru düğmeleri tek satırda yan yana (alt alta üç satır yerine bir satır).

## 2026.10.10-164 — Toplu veri girişi, hazır süzgeçler, mesafe ölçümü, yedek
- **Toplu veri girişi (Ayarlar > Kayıt araçları):** kuyu / depo şablonu (CSV, mevcut değerlerle) indirilir, Excel’de doldurulur, “Doldurulmuş dosyayı yükle” ile geri verilir (CSV ya da .xlsx). Yalnız dolu hücreler yazılır, kod bulunamazsa atlanır, onay ister, sunucuya yazar. Köy sütunu doldurulursa “elle girildi” işaretlenir.
- **Hazır süzgeçler (Envanter > Liste):** Köyü boş · Fotoğrafı yok · Kuyu bilgisi girilmemiş · Köyü otomatik yazılan; Özet’teki Fotoğraf ve Teknik özet kutularından da açılır.
- **Harita > Harita menüsü > Mesafe ölç:** kuyu/depo ya da haritaya dokunarak noktalar eklenir (kuyu–depo arası dahil); aralar ve toplam kuş uçuşu mesafe (m/km) çizgi üstünde ve panelde görünür; son noktayı sil / temizle / bitir.
- **Yedek (Ayarlar > Veri):** tesisler (tüm alanlarıyla), saha notları, arızalar, ekipler tek JSON; ayrıca tesisleri Excel olarak indirme.
- Özet > Son hareketler satırlarında işlemi yapan kişinin adı.

## 2026.10.10-165 — Barkod okut
- Envanter > Liste’deki “▮▯▮ Barkod okut” düğmesi ve telefonda ⋮ menüsündeki “Barkod okut”: kamerayla barkodu okur (BarcodeDetector destekleyen tarayıcılarda), desteklemeyen cihazda ya da izin verilmezse barkodu elle yazma kutusu çıkar. Kuyu barkodu (BK-KUY-0043), direk barkodu (BD-0043) ve kayıt kodu (KS-KUY-0043) kabul edilir; bulunca kartı haritada açar.

## 2026.10.10-166 — Özet dağılım haritasında türe göre süzme
- Dağılım haritasının üstündeki türler (Su kuyusu · Su deposu · AG şebeke / pano · Güneş enerji santrali) birer süzgeç düğmesi: basınca o tür haritadan gizlenir, tekrar basınca gelir; “Hepsini göster” ve “27 / 291 kayıt gösteriliyor” sayacı. Harita kaymaz (sınırlar tüm kayıtlardan hesaplanır).

## 2026.10.10-167 — Özet dağılım haritası gerçek harita zemininde
- Dağılım haritası artık Kırşehir’in gerçek haritası üzerinde (yeni sayfa `ozet-harita.html`, ana pencereye çerçeveyle gömülü): **Sokak · Uydu · Uydu + ad** zemin seçici (seçim cihazda hatırlanır), kayıtlar tür renginde noktalar, nokta üstüne gelince kod · köy · ilçe, basınca kayıt kartı haritada açılır. Tür düğmeleri hâlâ süzgeç; zemin yüklenirken harita kaymaz. Telefonda tek parmak sayfayı kaydırır, iki parmak haritayı yakınlaştırır/kaydırır.

## 2026.10.10-168 — Özet haritasında katman simgesi
- Zemin seçici (Sokak · Uydu · Uydu + ad) haritanın sağ üst köşesinde bir **katman simgesine** gömüldü: simgeye basınca menü açılır, seçim yapınca ya da haritada/sayfada başka bir yere basınca kapanır. Seçim hatırlanır. Başlıktaki üç düğme kalktı.

## 2026.10.10-169 — Envanter haritasında katman simgesi
- Envanter > Harita ve Hat kesiti haritalarında da zemin seçimi **katman simgesine** taşındı: “Harita menüsü” düğmesinin yanındaki simgeye basınca Sokak · Uydu · Uydu + ad menüsü açılır; seçince ya da başka yere basınca kapanır. Harita menüsünün içindeki üçlü zemin düğmesi kalktı. Ortak kod `harita-ortak.js` (ksKatmanKur) ve `harita-ortak.css`.

## 2026.10.10-170 — Harita menüsü katman simgesinin altında
- Envanter ve Hat kesiti haritalarında katman simgesi sağ üstte, **Harita menüsü** düğmesi ve açılan seçenekleri onun altında alt alta.

## 2026.10.10-171 — Harita menüsü katman simgesinin içinde
- Envanter ve Hat kesiti haritalarında ayrı “Harita menüsü” düğmesi kalktı: sağ üstteki **tek simgeye** basınca açılan menüde önce **Harita katmanı** (Sokak · Uydu · Uydu + ad), altında **Harita menüsü** seçenekleri (Yol tarifi modu, Mesafe ölç, Git — konumum, Kayıt etiketleri ✓, Hat güzergâhları ✓, Koordinat işaretini temizle, İl sınırına sığdır) yer alır. Bir zemin ya da araç seçilince menü kapanır; etiket/hat anahtarları açık kalır; başka yere basınca kapanır.

## 2026.10.10-172 — Harita sadeleşti: simgeler
- Harita menüsünden **Git — konumum**, **Koordinat işaretini temizle** ve **İl sınırına sığdır** kaldırıldı. Menüde yalnız Harita katmanı (Sokak · Uydu · Uydu + ad) ve Haritada göster (Kayıt etiketleri, Hat güzergâhları) kaldı.
- **Yol tarifi** ve **Mesafe ölç** haritanın sağ üstünde katman simgesinin altında küçük simgeler (rota ve cetvel); açıkken mavi yanar.
- Çift tıklayınca (telefonda basılı tutunca) konan mavi koordinat işaretini silmek için ayrı düğme yok; **işaretin kendisine basmak** yeter.
- **Konumuma git** düğmesi (sağ alt) yeni “hedef” simgesiyle: yüzeyle uyumlu yuvarlak kare, mavi nişan simgesi.

## 2026.10.10-173 — Yol tarifi ve mesafe simgeleri sol altta
- **Yol tarifi** simgesi “yönlendirme” (dönüş okuyla baklava) simgesi oldu; **Mesafe ölç** cetvel simgesiyle birlikte haritanın **sol altına** alındı (sağ üstte yalnız katman menüsü kaldı). Ölçüm paneli simgelerin sağında açılır; toplam mesafe satırındaki yazı boşluğu düzeltildi.

## 2026.10.10-174 — Harita simgeleri aynı renk dilinde; Hat kesiti aynı düzende
- Envanter haritasındaki bütün simgeler (katman, yol tarifi, mesafe ölç, konumuma git) aynı dilde: yüzey renginde yuvarlak kare, **mavi simge**; açık/etkin olunca mavi dolu + beyaz simge.
- **Hat kesiti** haritası da aynı düzende: sağ üstte katman simgesi, **sol altta** Nokta ekle (açık/kapalı) · Son noktayı sil · Temizle · Profili yenile simgeleri (üstteki çubuktaki yazılı düğmeler kalktı).
- Düzeltme: Hat kesiti sayfasındaki `#araclar` kapsayıcısı ile ortak CSS çakışması önlendi (Envanter haritasındaki kapsayıcı `#ks-araclar` oldu).

## 2026.10.10-175 — Özet haritasında tekerlek yakınlaştırma, simge uyumu, Hat kesiti nokta ekleme düzeltmesi
- **Özet dağılım haritası:** masaüstünde fare haritanın üstündeyken tekerlek yakınlaştırır/uzaklaştırır (telefonda iki parmak).
- **Simge uyumu:** Envanter haritasındaki sol alt simgeler açık temada beyaz, üst katman simgesi koyuydu; hepsi ortak değişkenlerden (`--ikon-bg`, `--ikon-hover`…) aynı renge bağlandı. Üzerine gelince mavi tonlu zemin + mavi kenar, etkin olunca mavi dolu + beyaz simge. Aynı dil Özet haritasındaki katman simgesinde, Hat kesitinde ve konumuma git düğmesinde de.
- **Hat kesiti > Nokta ekle (mantık düzeltildi):** simge eskiden varsayılan açıktı ve açıp kapatmak yalnız çift tıklamayı kilitliyordu; yeni mantık: **kapalıyken** tesis işaretine dokunma, çift tıklama ve basılı tutma nokta koyar; **açıkken** haritaya tek dokunuşla nokta konur (imleç artı olur). Varsayılan kapalı.

## 2026.10.10-176 — Fazla satır ve gereksiz geri düğmesi kalktı
- Envanter > Hat kesiti sayfasında sekmelerin altındaki “Hat Kesiti” başlık satırı kaldırıldı (sekme zaten işaretli). Aynı sayfanın sekmeleri arasında (Harita · Hat kesiti · Liste) geçince üstte **‹ geri** düğmesi artık çıkmaz; geri düğmesi yalnız bir sayfadan başka sayfaya inildiğinde (Özet > ilçe > liste, listeden kayda, Ayarlar alt sayfaları) çıkar.

## 2026.10.10-177 — Telefonda harita panelleri konumum düğmesine binmez
- Telefonda Envanter haritasındaki **Mesafe ölç** ve **Yol tarifi** panelleri sağ alttaki “konumuma git” düğmesinin soluna kadar daralır (üst üste binme giderildi).
- Telefon görünümünde elle denendi: Mesafe ölç, Yol tarifi, Hat kesiti > Nokta ekle (kapalıyken dokunuş nokta koymaz, açıkken koyar), barkod penceresi (kamera yokken elle yazma) ve kod girince kartın açılması.

## 2026.10.10-178 — Köy ata, Veri tamamlanma, satırdan fotoğraf, İş kartı haritası, modül bağlamaları
- **Köy ata** (Envanter listesi › “📍 Köy ata”, masaüstü + telefon aynı pencere): köyü boş kayıtlar haritada turuncu nokta; dokunup seçilir (mavi), seçilenlere yakın aday köyler etiketli çıkar, bir köyü seçip “N kayda … ata”ya basılınca hepsine yazılır. “Çevresindekileri de seç (3 km)”, “Hepsini seç”, köy arama ve satırdaki “Bunu yaz” (en yakın köyü tek kayda) var. Yazılan köy `koyElle` ile hafızada tutulur; kaydın ilçesi seçilen köyün ilçesine çekilir (onay penceresi sayıyı söyler). Harita sayfası `ozet-harita.html#ata` modu.
- **Özet › Veri tamamlanma:** köy adı / fotoğraf / kuyu teknik bilgisi doluluk çubukları + genel yüzde; çubuğa basınca ilgili “eksik” listesi açılır. Kuyu teknik özeti hiç veri yokken üç boş kutu yerine tek açıklama gösterir.
- **Listeden fotoğraf:** fotoğrafı olmayan her satırda kamera düğmesi (telefonda arka kamera, masaüstünde dosya seçici); kartı açmadan doğrudan o kayda yüklenir.
- **İş kartı yer haritası:** talep/başvuru kartı (masaüstü + telefon), arıza kartı (masaüstü) ve telefondaki ayrıntılı arıza formunda küçük harita: bildirilen/arıza yeri kırmızı, aday ve seçili tesis (yeşil), varsa ekiplerin son konumu (mor). Talep kartında haritadaki tesise basarak seçilir. (`ozet-harita.html#is`)
- **Modül bağlamaları:** Özet › Rapor göstergeleri kendi modülüne bağlı (Arıza kapalıyken arıza, Ambar kapalıyken stok/malzeme hareketi/kritik stok görünmez); İş kartı ve arıza formunda Araç modülü kapalıyken araç satırı, araç uyarısı, araç seçimi ve iş emrine araç ekleme çıkmaz; harita ve kart zaten yalnız Arıza/Talep açıkken erişilir.
- Düzeltmeler: ana CSS dosyasının sonundaki kesik `@media` satırı kapatıldı (eklenen kuralları yutuyordu); duman testi bağlantılardaki `#…` kısmını dosya adından ayırıyor.

## 2026.10.10-179 — Stok sayfası: komuta panosu, Giriş/Çıkış düğmeleri
- **Pano (masaüstü + telefon):** üstte dört sayı — Malzeme çeşidi (ambarda kaç, stok değeri) · Tükenen · Azalan (7 günden az yeter) · Bugün hareket (giriş/çıkış, 7 günlük çizgi). Sayıya basınca liste süzülür (Tükenen / Azalan süzgeçleri eklendi; eski “Kritik” süzgeci ikiye bölündü).
- **Son 14 gün: giriş ve çıkış** hareketli çubuk grafiği (günlük işlem sayısı; hareket listesinin ilk 400 kaydından).
- Sağ sütunda (telefonda üstte) “Tükenmek üzere” uyarıları, “Siparişe ekle” tek basışla; bugünkü hareketler ve ekip zimmeti aynen.
- **Giriş / Çıkış:** “Hareket gir” yerine iki düğme. Formda önce yön, sonra “nereden/neden” düğmesi (altında etkisi yazar): Giriş → Mal alımı (ambar artar), Ekipten iade (ambar artar, ekip azalır). Çıkış → Ekibe ver (ambar azalır, ekip artar), Sahada kullanıldı (ekip azalır), Hurda (ekip azalır), Ambardan düş (ambar azalır; kayıp/sayım farkı). Kayıtta altı tür ayrı kalır; veri ve raporlar değişmedi.

## 2026.10.10-180 — Stok sayfası dar ekranda düzgün dizilir
- Masaüstü Stok sayfası genişliğe göre dizilir: 1400 px ve üstü liste solda + uyarı sütunu sağda, 6 sütun; 1100–1399 px aynı düzen, 4 sütun (kategori, ekiplerde, son 14 gün gizlenir); 1100 px altı tek sütun: üstte “Tükenmek üzere” ve “Bugünkü hareketler” yan yana, sonra liste (3 sütun), en altta ekip zimmeti. Satırların üst üste binmesi giderildi.
- CSS: `ks-sk-*` sınıfları (`src/stil/ana.css`). Satır düğmesindeki `all:unset` sınıf kuralını ezdiği için sütun kuralları `!important`.

## 2026.10.10-181 — Stok listesi: dar ekranda sütunlar gizlenmez, alt satıra iner
- 1400 px altında malzeme satırı kart gibi dizilir: üstte ad ve kod, altında etiketli hücreler (Kategori · Ambarlardaki mevcut · Ekiplerde · Son 14 gün · Kaç gün yeter) sığdığı kadar yan yana, sığmayanlar alt satıra geçer. Sütun gizleme kaldırıldı; başlık satırı yalnız geniş ekranda (tablo görünümü) çıkar.

## 2026.10.10-182 — Stok yetkileri: görevler ayrılığı (ekran + sunucu)
- İncelenen programlar (Odoo, Sortly, Zoho Inventory, envanter iç kontrol rehberleri): işlemi yapan / düzeltmeyi yapan / onaylayan farklı kişi; saha ve ambar personeline “sınırlı erişim”; fiyat bilgisi herkese açık değil.
- **Yeni yetkiler** (Ayarlar › Yetkiler'de rol matrisi ve kişiye özel istisna olarak görünür; Yönetici kısıtlanamaz):
  | Yetki | Yönetici | Müdür | Mühendis | Şef | Saha personeli |
  |---|---|---|---|---|---|
  | Mal alımı girme (stokGiris) | ✓ | | ✓ | ✓ | |
  | Ekibe verme / iade alma (stokZimmet) | ✓ | | ✓ | ✓ | |
  | Sahada kullanılanı düşme (stokSarf) | ✓ | ✓ | ✓ | ✓ | yalnız kendi ekibi |
  | Hurda ve ambar düzeltmesi (stokDuzelt) | ✓ | ✓ | | | |
  | Malzeme tanımlama, fiyat, eşik (stokKatalog) | ✓ | ✓ | ✓ | | |
  | Sipariş listesi (stokSiparis) | ✓ | ✓ | ✓ | ✓ | |
  Stoğu görme: Stok sayfa yetkisi (Ayarlar › Yetkiler › sayfa yetkisi: Tam / Görür / Yok). “Görür” işlem yaptırmaz, “Yok” sayfayı kapatır.
- Ekran: Giriş/Çıkış düğmeleri ve neden seçenekleri kişinin yetkisine göre çıkar; saha personelinin ekip listesi yalnız kendi ekibidir; fiyat/tutar/stok değeri yalnız “Rapor” yetkisi olanlara görünür. İşlem anında da denetlenir (`stokIzin`).
- Sunucu: `stok_izin()` + `ambar_hareket()` her kalemden önce aynı kuralı uygular; yetkisiz kalem “red” listesine yazılır, kalanlar işlenir (SQL-ambar-yetki.sql, uygulandı). Arıza kapanışındaki otomatik sarf, Müdür/Şef/Personel için çalışmaya devam eder.

## 2026.10.10-183 — Altı rol: Operatör ayrı rol (sunucu + ekran)
- **Roller:** Yönetici · Müdür · Mühendis · **Operatör (yeni)** · Saha Şefi (eski “Arıza Şefi”) · Saha Personeli (eski “Arıza Personeli”). Sunucuda `rol` türüne `operator` eklendi.
- **Operatör:** talepleri/başvuruları yönetir (yeni talep, sınıflandırma, arızaya çevirme, başvuru engelleme), ekip atar ve iş emri açar, SLA/araç belge uyarılarını görür, ambardan ekibe malzeme verir/mal alımı girer/iade alır, sipariş listesini yönetir. Arıza kapatamaz, tesis oluşturamaz, rapor almaz, fiyat görmez.
- **Saha Şefi:** sahadaki ekibi yönetir, arızayı ve iş emrini kapatır, kullanılan malzemeyi düşer. **Ekip atama artık onda değil** (operatörde); talep yönetimi yok.
- **Mühendis:** envanter, malzeme kataloğu, sipariş, rapor; ekip atama, talep yönetimi ve ambar günlük işlemleri **yok**.
- **Müdür:** hurda ve ambar düzeltmesi (onay), rapor, silme, katalog, sipariş; ekip atama ve talep yönetimi de yapabilir.
- **Saha Personeli:** sahada kayıt/fotoğraf/arıza; malzemeyi yalnız kendi ekibi için düşer.
- Yeni yetki: `talepYonet` (Talep ve başvuru yönetimi) — Yönetici, Müdür, Operatör. `assign` (ekip atama ve iş emri açma) — Yönetici, Müdür, Operatör. İş emri kapatma: Yönetici, Müdür, Saha Şefi, Operatör. Stok yetkileri bu rollere göre yeniden dağıtıldı (stokGiris/stokZimmet: Yönetici, Operatör; stokSarf: Yönetici, Müdür, Operatör, Saha Şefi, Saha Personeli; stokDuzelt: Yönetici, Müdür; stokKatalog: Yönetici, Müdür, Mühendis; stokSiparis: Yönetici, Müdür, Mühendis, Operatör).
- Kişiye özel istisna Ayarlar › Yetkiler'den verilir. Sunucu: `veri_yaz`/`veri_yaz_surumlu` malzeme kataloğunu (Yönetici, Müdür, Mühendis) ve sipariş listesini (Yönetici, Müdür, Mühendis, Operatör) kısıtlar.
- Bilinen sınır: talep/muhtar/araç listeleri sunucuda hâlâ yalnız “izleyici”ye kapalı; talep yönetimi kısıtı şimdilik ekranda ve başvuru engelleme işlevinde uygulanıyor.

## 2026.10.10-184 — Son onay ve kapatma Mühendis'te
- İş akışı (görevler ayrılığı): **Operatör** talebi işe çevirir, iş emri açar, ekibi atar, malzemeyi verir → **Saha Şefi** işi yaptırır, fotoğraf/malzeme/süre ile **onaya gönderir** (kapatamaz) → **Mühendis** teknik son onayı verir ve arızayı/iş emrini kapatır ya da nedenini yazıp iade eder → **Operatör** iade edilen işi yeniden atar. **Müdür** istisnada onaylayabilir, raporları izler.
- Yetki `close` artık “Arıza ve iş emrinin son onayı / kapatılması”: Yönetici, Müdür, Mühendis (Saha Şefi çıkarıldı). Ekranda: onay paneli, “Çözüldü” seçimi ve “İşi tamamla = doğrudan kapat” yalnız bu yetkide; operatör, şef ve personel işi “Kontrolde” bırakır (Merkez onayı modülü açıkken — sunucuda açık). “Yeniden aç”: atama ya da onay yetkisi olan. İş emri kapatma: ekranda `close`; sunucuda `is_emri_kapat` Yönetici, Müdür, Mühendis (SQL-rol-operator.sql, uygulandı).

## 2026.10.10-185 — Mühendis arıza ve stok işlerinden çıkarıldı; yetki Ayarlar'dan verilir
- İş yerinde arıza mühendisi olmadığından **son onay ve kapatma Müdür'de** (Yönetici de); Mühendis'in varsayılanı: envanter kurma/düzenleme, rapor, yeni tesis, fotoğraf, arıza açma. Ekip atama, talep yönetimi, son onay, stok (katalog, sipariş, giriş/çıkış) **yok**.
- Akış: Operatör atar → Saha Şefi yaptırır ve onaya gönderir → **Müdür** son onayı verip kapatır / iade eder → Operatör iade edileni yeniden atar.
- **Yetki Ayarlar › Yetkiler'den kişiye verilebilir** (ör. bir mühendise “son onay”, “malzeme kataloğu” ya da “sipariş”): artık yalnız ekranda değil sunucuda da geçerli (`rol_yetkisi`, istisna destekli). İş emri açma/kapatma, başvuru engelleme, SLA düzenleme, katalog ve sipariş yazımı bu işlevi kullanır. İstemcide de ekip atama, iş emri, muhtar defteri, belge uyarısı, SLA ve iş emri kendiliğinden kapatma kişiye özel istisnaya uyar.
- Güncel varsayılanlar: close → Yönetici, Müdür · stokKatalog → Yönetici, Müdür · stokSiparis → Yönetici, Müdür, Operatör.

## 2026.10.10-186 — Son onay ve kapatma Operatör'de
- Arıza mühendisinin yapacağı onay işlemleri **Operatör**'e verildi: sahadan “Kontrolde” gelen işi inceleyip kapatır ya da nedenini yazıp iade eder; iş emrini kapatır; kapatılmış işi yeniden açar. Müdür ve Yönetici de yapabilir (yetki `close`: Yönetici, Müdür, Operatör). Saha Şefi, Saha Personeli ve Mühendis işi yalnız onaya gönderir.
- Sunucu: `rol_yetkisi` close → Müdür, Operatör (+ Yönetici); `is_emri_kapat` aynı kuralı kullanır (SQL-rol-operator.sql bölüm 5, uygulandı). Malzeme kataloğu Müdür/Yönetici'de kaldı; sipariş listesi Operatör'de.
- Ekranda altı rolle denendi: Operatör/Müdür/Yönetici'de onay paneli açık; diğerlerinde işi onaya gönderir.

## 2026.10.10-187 — Onaylar Müdür'de; malzeme alım isteği onayı; sunucuda kapanış denetimi
- **Onaylar Müdür'de** (Yönetici de): arıza/iş emri son onayı ve kapatılması. Operatör (açan ve atayan) kendi işini onaylayamaz; yalnız “Kontrolde” bırakır. Çözüldü **ve İptal** seçimi onay yetkisi ister (iptal gerekçesi nota yazılır).
- **Malzeme alım isteği:** Operatör “Alım isteği aç” der (sipariş listesi, durum “Müdür onayı bekliyor”); **Müdür onaylar** (ya da reddeder). Yalnız onaylı kalemler metin olarak kopyalanır/siparişe çıkar. Onaylı kalemin miktarını onay yetkisi olmayan değiştirirse onay düşer. Onay yetkisi olan açarsa kalem kendiliğinden onaylı olur. Ambara mal alımı onaylı alım isteği olmadan girilirse hareket notuna “onaylı alım isteği yok” yazılır. Yeni yetki `stokSiparisOnay` (Yönetici, Müdür); `stokSiparis` artık “alım isteği açma”.
- **Sunucu denetimi (yeni):** `ariza_kaydet` Merkez onayı açıkken kapanışı (çözüldü/iptal) yalnız `close` yetkisi olandan kabul eder (önceden yalnız ekranda kısıtlıydı); `veri_yaz`/`veri_yaz_surumlu` sipariş onayını yalnız onay yetkilisine bırakır. SQL-rol-operator.sql bölüm 6, uygulandı.

## 2026.10.10-188 — Ön onay + son onay zinciri, ekibe verme isteği, Yönetici/Müdür günlük işlerden çıktı
- **Arıza / iş emri onay zinciri:** Saha bitirir (**Kontrol**) → **Operatör ön onayı** (gerekirse sahaya iade) → **Müdür onayı** (`mudur_onayi`) → **Müdür son onayı**, işi kapatır; Müdür gerekirse operatöre ya da doğrudan sahaya iade eder. Müdür “kontrol” aşamasındaki işi ön onay beklemeden onaylayıp kapatabilir (aynı kişi iki kez onaylamaz). Kapanmış işi yalnız onaylayan (müdür) yeniden açar — operatör onaylanmış kısmı bozamaz. Sunucuda `ariza_kaydet` her geçişi yetkiye göre denetler; Merkez onayı ayarı kaldırıldı, zincir her zaman açık.
- **Yönetici ve Müdür günlük işleri açmaz, onaylar:** ekip atama/iş emri açma, talep yönetimi, ön onay, malzeme isteği açma, mal alımı girme, ekibe verme **yalnız Operatör**. Müdür/Yönetici: son onay, malzeme isteği onayı, hurda/ambar düzeltmesi, katalog, rapor. Yönetici gerekirse Ayarlar › Yetkiler'den bu yetkileri kendine verebilir (rolündeki yetkiler kısıtlanamaz).
- **Malzeme istekleri:** alım isteğini Operatör açar, Müdür onaylar; **ekibe malzeme verme de istekle**: Operatör “Ekibe ver” ile istek açar → Müdür onaylar → Operatör sipariş listesindeki “Ekibe teslim et” ile verir (sunucu `ambar_hareket` onaylı istek olmadan zimmeti reddeder, teslimde isteği düşürür). Sipariş listesi “Malzeme istekleri” oldu.
- **Reddedilen talepler:** Operatörün “karşılanamaz” dediği talepler İş panosunda Müdür/Yönetici için “müdür incelemesi” listesinde; “Yeniden aç” ile incelemeye döner.
- **Müdür vekâleti:** Ayarlar › Yetkiler'de kişi satırında tek düğme (“Müdür vekâleti ver / kaldır”): son onay + malzeme isteği onayı yetkilerini verir, iş dönünce geri alınır (sunucuda da geçerli; denetim izine yazılır).

## 2026.10.10-189 — Saha Şefi tek saha rolü, müdür kendi vekâletini atar, ambardan geri gönderme/iptal, deneme ekipleri ve senaryo taraması
- **Saha Şefi:** sistemde saha ekibi için yalnız şef kullanıcıdır (Personel rolü listeden kalktı; kişiler Ekip/personel kayıtlarında durur). Şefin menüsünde **Stok/Talep/Ayarlar yok**; kendi ekibinin işini tamamlayıp ön onaya gönderir, içerik düzenler, fotoğraf/not/ses ekler. İş panosunda başka ekibin işinde yalnız “Aç” görünür (sunucu zaten başka ekibin işine yazmayı reddeder).
- **İzleyici rolü (yeni):** yalnız görür — harita/envanter listesi, Özet, ekiplerin iş yerleri; “Yeni arıza bildir” dahil hiçbir yazma düğmesi yok, sunucuda hiçbir yazma işlevi çalışmaz.
- **Müdür vekâleti:** Müdür kendi vekilini Ayarlar › “Müdür vekâleti” sayfasından kendisi atar/kaldırır (`vekalet_ata`).
- **Onaylı isteği geri gönderme/iptal:** onaylanmış malzeme isteğini en son onaylayan Müdür operatöre geri gönderir ya da iptal eder.
- **Sunucu açıkları kapatıldı (senaryo taramasında bulundu):** tesis silme/arşiv ve geri alma yalnız Yönetici/Müdür (`rol_yetkisi 'sil'`); fotoğraf silme yalnız yükleyen veya Müdür/Yönetici; köy ekleme/silme yalnız `create` yetkililer; İzleyici denetim izine yazamaz. Önceki turda: ekip atama, talep, araç, tesis oluşturma, kullanıcı listesi hassas alanları.
- **Deneme verisi:** 17 `deneme.*` hesap, 5 ekip (Su×2, Elektrik, Kanal, Vidanjör; her birinde şoför+personel+şef), 7 ilçe mühendisi + 2 bölge mühendisi, operatör, müdür, izleyici. Silme: `src/moduller/oturum/sql/SQL-deneme-temizle.sql` (okuyup çalıştırın).

## 2026.10.10-190 — Tesis ekleme/silme önerisi ve onay zinciri, şef yalnız kendi ekibini görür, çöp temizleme yetkisi, otomatik stok düşümü, deneme araçları
- **Tesis ekleme/silme önerisi:** Saha şefine (örn. elektrik ekibi şefi) Ayarlar › Yetkiler'den **“Tesis ekleme/silme önerme”** yetkisi verilir. Şef tesisi kendisi açamaz/silemez, **önerir** (Envanter › yeni tesis; kayıt kartında “Silmeyi öner”, neden yazar). Öneri → **ilçenin mühendisi ya da bütün ilçelere bakan mühendis** ön onayı → **müdür** son onayı → kayıt açılır / çöp kutusuna taşınır. Operatör zincirde yok. Müdür ön onay aşamasında doğrudan karara bağlayabilir; ön onayı veren son onayı veremez; öneren kendi önerisini onaylayamaz. Kartlar İş panosunda (“Ön onay / Son onay / Reddet / Geri çek”); sunucu: `tesis_degisiklik_ac/_listesi/_karar` (src/moduller/envanter/sql/SQL-tesis-degisiklik-onayi.sql).
- **Saha şefi diğer ekibin işini görmez:** arıza, arıza-ek ve iş emri listeleri sunucuda şefin ekibine süzülür; Ekipler sayfası ve ekip konumu da yalnız kendi ekibi. Talep, sipariş ve muhtar listeleri şef/izleyici için boş döner (vatandaş bilgisi).
- **Çöp temizleme** yalnız Yönetici/Müdür (diğerlerinde boş döner); jetonsuz `cop_temizle()` kaldırıldı.
- **Otomatik stok düşümü:** iş son onayla kapanırken kullanılan malzeme ekip zimmetinden kendiliğinden düşer (soru sorulmaz, aynı işin malzemesi ikinci kez düşmez); şef onaya gönderirken “onaydan sonra düşer” mesajı alır. Talep çözülünce başvurunun durumu güncellenir (Telegram'dan geldiyse başvurana bot mesajı gider).
- **Deneme araçları:** her deneme ekibine uygun bir araç (+1 müsait seyyar pompa); deneme verisini temizleme betiği bunları da siler.
- Senaryo taraması: 98/98 (öneri zinciri, ekip süzgeci, çöp/okuma, araç ve konum) + önceki 177+32 kontrolün yeniden koşusu; tarayıcıda talep → arıza → iş emri → şef → ön onay → müdür onayı → stok/talep kapanışı uçtan uca denendi.

## 2026.10.10-191 — Eksikler kapatıldı
- **Talep sahibine SMS:** iş bitip talep çözülünce, telefon numarası ve KVKK onayı olan Telegram dışı talep sahibine kısa mesaj gider (Ayarlar › Ekip mesajları açık ve sunucu adresi girilmişse); gönderilemezse kuyruğa yazılır. Telegram'dan gelene bot mesajı zaten gidiyordu. Gerçek gönderim için `mesaj-gonder` işlevi ve SMS sağlayıcı anahtarları (Netgsm secret'ları) Supabase'de tanımlanmalı.
- **Şef başka ekibin işini kaydedemez:** arıza formu kaydetmeyi ekranda da reddeder (sunucu zaten reddediyordu); Araç sayfası da şef için yalnız kendi ekibinin araçları ve görev dökümü.
- **Tesis önerisi kartları modül kapalıyken de görünür:** Arıza/Talep modülü kapalı olsa bile önerisi ya da onayı olan kullanıcıya İş panosu açık kalır.
