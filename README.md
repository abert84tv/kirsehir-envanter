# Devir paketi — Kırşehir Su ve Elektrik Tesisleri Envanteri

Bu paket, çalışmayı **Claude Code** tarafında sürdürmek için hazırlandı. Amaç:
programı yeniden tasarlamak değil, çalışan bu sürümü gerçek bir kod deposunda
sürdürülebilir hâle getirmek.

Çalışan sürüm: **2026.09.30-101**. Sürüm damgası `index.html` içindeki
`const SURUM` satırında ve programın Ayarlar > Veri > "Program sürümü"
kartında görünür.

**Depo düzeni bu paketten farklı:** bu GitHub deposunda (`abert84tv/kirsehir-envanter`)
yayına giden dosyalar `yayin/` alt klasörü olmadan doğrudan depo kökündedir —
Vercel'in `cleanUrls` ile kök dizini otomatik sunması buna dayanıyor. Aşağıdaki
tablo ve yollar buna göre güncellenmiştir; masaüstündeki devir paketi hâlâ
`yayin/` alt klasörlü orijinal düzeni kullanır.

## 1. Program ne yapıyor

Kırşehir'deki kırsal su ve elektrik tesislerinin (kuyu, depo, AG panosu, GES)
envanteri; saha arıza ve bakım takibi; ambar/zimmet, araç, personel ve nöbet
kayıtları; harita üzerinde konum ve hat yönetimi. Telefon ve masaüstü aynı
programdan çalışır; çevrimdışı kayıt tutar, bağlantı gelince eşitler.

Kapsamın tamamı, ekran ekran alan listeleri, veri kaynakları ve oturum oturum
değişiklik kaydı `DURUM.md` dosyasındadır. **Claude Code'da ilk okunacak dosya
budur.**

## 2. Paketin içeriği

| Yol | Ne |
|---|---|
| `index.html` | Ana program: bütün ekranlar, iş kuralları, yetki, eşitleme |
| `harita.html` | Harita penceresi (Leaflet), ana pencereyle postMessage ile konuşur |
| `profil.html` | Hat Kesiti — çok noktalı mesafe/yükseklik profili |
| `hat.html` | Hat güzergâhı (boru) çizim aracı |
| `harita-ortak.css`, `harita-ortak.js` | Üç harita dosyasının (harita/profil/hat) paylaştığı koyu tema karo kısması ve uzun-basış nokta ekleme mantığı — burada tek yerden değişir |
| `envanter.js`, `koyler.js`, `kuyular.js`, `kirsehir-data.js` | Gömülü gerçek veri: 264 kuyu noktası, 1043 yerleşim, 260 köy-ilçe ataması, nüfus |
| `isu-katmanlar.js` | ISU kurumundan alınan referans nokta katmanları (kaynak, memba, depo) — harita.html'de seçmeli katman |
| `supabase-baglanti.js` | Sunucu katmanı: oturum, `kurum_veri`, `denetim`, numara sayacı, sunucu saati |
| `SQL-*.sql` | Veritabanı kurulum betikleri (sırası aşağıda) |
| `_ds/` | Bağlı tasarım sistemi (Modernist) — token ve bileşen kaynağı |
| `DURUM.md` | Durum raporu + bütün oturum kayıtları (ana referans) |
| `KURULUM.md` | Supabase / R2 / SMS kurulum adımları |
| `YAYIN.md` | Yayınlama (GitHub + Vercel) notları — `yayin/` alt klasörünü anlatıyor, bu depoda geçerli değil |
| `vercel.json` | Yayın ayarı — kök dizin `cleanUrls` ile doğrudan sunulur |

Depodaki HTML dosyaları maket değil, **çalışan programdır**. Tarayıcıda
`index.html` açılınca çalışır; derleme adımı yoktur.

**Push'tan önce:** `node duman-testi.js` — tarayıcı açmadan, birkaç saniyede
biten hafif bir kontrol: gömülü script'lerin sözdizimi, yerel dosya
referanslarının (src/href) gerçekten var olması, `vercel.json` rewrite
hedeflerinin var olması, üç harita dosyasının `harita-ortak.css`'i yüklemesi.
Hiçbir CI/otomatik test yok — bu, en azından "site hiç açılmaz" türünden
hataları push'tan önce eler (bkz. `harita.html`/`profil.html`/`hat.html`
paylaşılan kod tekrarı ve `vercel.json` 404 hataları, 2026.09.14–15).

## 3. Teknik yapı

- Tek dosyalık uygulama: `index.html` içinde bir bileşen sınıfı (React sınıf
  bileşeni mantığı) + şablon. Derleyici, paket yöneticisi, npm bağımlılığı yok.
- Stil **satır içi**; ortak değerler tasarım sisteminin `var(--*)` token'larından
  gelir. Ayrı CSS sınıf katmanı yoktur.
- Harita ayrı belge (`harita.html`) ve `postMessage` ile yönetilir:
  `{ks:'theme'|'filter'|'setBase'|'pick'|'hatKatman'|'flyTo'}` gönderilir,
  haritadan `{ks:'route'|'base'|'hatlar'|...}` döner.
- Durum: tek büyük `state`; kalıcılık `localStorage` + Supabase.
- Sunucu erişimi yalnız RPC fonksiyonlarından (`veri_oku`, `veri_yaz`,
  `veri_hepsi`, `denetim_ekle`, `denetim_toplu`, `denetim_listesi`,
  `ambar_hareket`, `numara_al`, `numara_toplu`, `sunucu_saati`). Tablolara
  doğrudan erişim RLS ile kapalı, `denetim` tablosu tetikleyiciyle
  değiştirilemez.

### localStorage anahtarları
`ks-tema` (tema — cihaz düzeyi, tek doğru kaynak), `ks-pref-<kullanıcı>`
(kullanıcı tercihleri), `ks-ekipler`, `ks-ambar`, `ks-ambar-kuyruk`,
`ks-kuyruk` (eşitleme kuyruğu), oturum/token anahtarları.

**Tema kuralı (son oturumda düzeltildi):** tema iki yerde tutuluyordu ve
çakışıyordu. Artık girişte **cihazdaki `ks-tema` her zaman kazanır**; kullanıcı
tercih dosyasındaki `theme` yalnız cihazda kayıt yoksa devreye girer, her
seçimde ikisi eşitlenir. Bu davranış korunmalı — bozulursa "aydınlığa aldım,
tekrar girince koyu açılıyor" sorunu geri gelir.

### Açılış kuralı
Üç giriş yolunun hepsi (normal giriş, şifre değişimi sonrası, otomatik oturum)
`tab: 'harita'` ile başlar: ana sayfa **Envanter > Harita**. Bırakılan sayfa
geri getirilmez; tema, harita zemini, süzgeçler, katmanlar, koordinat sistemi
ve cihaz modu geri gelir.

### Telefon katman kuralı
Çakışan menü sorunu sabit piksel yerine iki canlı CSS değişkeniyle çözüldü:
`--tel-bas` (üst çubuğun gerçek alt kenarı) ve `--tel-nav` (alt menünün gerçek
yüksekliği). Değerler açılışta, boyut ve yön değişiminde ölçülüp yazılır; açılan
bütün paneller bu değişkenlere yaslanır. Yeni panel eklerken sabit `top`/`bottom`
piksel yazılmamalı, bu değişkenler kullanılmalı.

## 4. Veritabanı kurulum sırası

Supabase SQL düzenleyicisinde bir kez, bu sırayla:

1. `SQL-yeni-moduller.sql`
2. `SQL-cop-kutusu.sql`
3. `SQL-moduller-sunucu.sql`
4. `SQL-veri-butunlugu.sql`
5. `SQL-ambar-hurda.sql` — ambar hareketine "hurda" türü ekler (2026.09.15)
6. `SQL-is-emirleri.sql` — İş Emri tablosu + RPC seti (2026.09.30)
7. `SQL-kanit-saklama.sql` — arıza kanıtı 2 yıl / envanter fotoğrafı ömür
   boyu saklama politikası, KVKK (2026.09.30)
8. `SQL-ambar-koy-raporu.sql` — ambar hareketine tesis referansı ekler,
   köy/ilçe bazlı malzeme raporu için (2026.09.30)

Daha önce çalıştırılanlar tekrar edilmez; hepsi `create or replace` ile
yazıldığı için tekrar çalıştırmak da zarar vermez. 4'ü daha önce
çalıştırdıysanız yalnız 5-6-7'yi çalıştırmanız yeterli.

## 5. Yayınlama

Depo kökü doğrudan yayındır — `git push origin main` yeterli, Vercel bu
depoya bağlı, otomatik yayına alır (1-2 dakika). Yükleme sonrası tarayıcıda
bir kez sert yenileme (Ctrl+F5) gerekir — eski kopya önbellekte kalırsa
sürüm damgası 2026.09.30-101 görünmez ve düzeltmeler uygulanmamış gibi durur.
Program içinde Ayarlar > Veri > "Programı tazele" aynı işi yapar.

## 6. Claude Code'da sıradaki işler

2026.09.14 listesindeki dört madde (uzun basış, çift tık, koyu tema, yetki
sadeleştirme) 2026.09.15 oturumunda bitti. 2026.09.30'da "büyük güncelleme"
(38 maddelik istek listesi) başladı, fazlara bölündü — plan dosyası:
`C:\Users\abert\.claude\plans\glistening-sauteeing-spindle.md`, ayrıntılı
kayıt `DURUM.md`. Şu an en öncelikli, aktif bekleyenler:

1. **Gerçek oturum kalıcılığı (2026.09.30-101).** Sayfa yenilendiğinde ya
   da program yeniden açıldığında artık her seferinde giriş ekranına
   dönmüyor — kurumsal uygulamalardaki gibi kayıtlı oturum sunucuda
   doğrulanıyor ve geçerliyse doğrudan içeri giriliyor, giriş ekranı hiç
   görünmüyor. Bu, şifre değil bir **oturum anahtarı** (`ks-oturum`) ile
   çalışıyor — zaten her girişte yazılıyordu (`supabase-baglanti.js`),
   yalnızca açılışta kullanılmıyordu; eksik olan tek şey açılışta bunu
   devreye sokmaktı. Anahtar geçersiz/süresi dolmuşsa ya da yoksa kısa bir
   yükleniyor ekranından sonra normal giriş ekranına düşülüyor. Çıkış
   yapmak hem sunucudaki hem cihazdaki anahtarı siler — yenilemeyle geri
   gelmez.
2. **Arayüz sadeleştirme (2026.09.30-100).** Giriş ekranındaki dört
   açıklama bloğu bire indi (rol/cihaz açıklaması, "beni hatırla"nın
   çift anlatımı kaldırıldı). Hat güzergâhı renkleri artık birbirinden
   açıkça ayırt edilebiliyor (terfi/AG ikisi de maviydi, DC/kolektör
   ikisi de kahverengiydi — düzeltildi). Sol menü artık kullanıcının
   tarif ettiği iki iş zincirine göre gruplanıyor: **"Saha işleri"**
   (İşler + Ambar ve Araç — talep→triyaj→iş emri→atama→saha→kanıt→stok
   zinciri) ve **"Envanter"** (Envanter + Hat Kesiti — kayıt→koordinat→
   hat güzergâhı zinciri); "Kaynaklar" adı "Ambar ve Araç", "Malzeme"
   süzgeci "Stok" oldu — stokla envanterin nerede olduğu artık menüden
   belli. Ayrıca birkaç ekranda gerçeğe uymayan "bu cihazda saklanır"
   notu (ambar/araç/denetim/hat artık sunucuya yazıyor, not eskiydi)
   düzeltildi. Kapsam bilerek sınırlı tutuldu — ayrıntı DURUM.md'de.
3. **Faz 1-2-3-4 tamamlandı — yapılabilecek her şeyiyle.**
   Yalnızca gerçek dış bilgi/hesap gerektiren iki nokta bilerek açık
   bırakıldı, ayrıntı madde 6'da:
   - Faz 3'ün tamamlanan kısmı: Özet ekranındaki esnek rapora ek olarak
     **İş Emirleri panelinde de** aynı Bugün/Hafta/Ay/Yıl/Özel + ilçe
     süzgeci var artık; ambar ekranındaki sarf/hurda işlemine **isteğe
     bağlı tesis seçimi** eklendi (köy bazlı malzeme raporunda "Tesis
     belirtilmemiş" payını azaltır).
   - Faz 4'ün tamamlanan kısmı: NetCAD kolektör KML/KMZ içe aktarma tam
     çalışıyor (`hat.html`). Araç takip tarafında **altyapı tamam**
     (`sonKonum`, elle giriş, haritada gösterme) ama **canlı Arvento
     bağlantısı yazılmadı** — API anahtarı/uç nokta bilgisi olmadan
     tahmine dayalı bir istemci üretmek yanlış olur, bkz. madde 6.
   - Faz 5'in yapılabilecek kısmı da bitti: talep kanalına Telegram ve
     SMS seçeneği eklendi (`TALEP_KANAL`, DB tarafında zaten hazırdı).
     Kalan her şey (WhatsApp/Telegram/SMS bot webhook'ları, gerçek talep
     alma) sağlayıcı hesabı/anahtarı gerektiriyor — madde 6'da.
4. **abertmuhendislik.vercel.app entegrasyonu (madde 35) — kullanıcı kararı
   bekleniyor.** Gerçek kaynağı bulundu (`abert84tv/elektrik-hesaplama`,
   Next.js/TypeScript, 22.121 satır, test edilmiş hesap motorları). Tam kod
   taşıma yerine harita.html deseniyle (iframe+postMessage) gömülü
   entegrasyon önerildi — hesap motoruna dokunmadan. Karar bekleniyor.
5. **SVG grafik konsol gürültüsü** (2026.09.29) — kayıt kartı/detay
   panelindeki deneme grafiği ilk boyamada bir kerelik şablon metniyle
   çiziliyor; DOM'da kalıcı etkisi yok ama tarayıcı konsoluna ~40 zararsız
   hata basıyor. Kaynağı `support.js` — kökü bulmak gerçek bir hata
   ayıklayıcı/breakpoint erişimi ister, şu an elde yok.
6. **Gerçek dış hesap/anahtar bekleyen tek kalemler:** Arvento (ya da
   başka bir firma) araç-takip API anahtarı (madde 7-9'un canlı tarafı),
   WhatsApp Business / Telegram Bot / SMS gateway hesapları (madde 1,
   Faz 5'in bot tarafı), Cloudflare R2 fotoğraf deposu, HGM ortofoto
   lisansı, gerçek personel hesapları. Bunların hiçbiri kod eksikliği
   değil — hesap/anahtar geldiğinde bağlanacak yerler belli ve hazır
   (bkz. DURUM.md'deki ilgili oturum kayıtları).
7. Veri eksikleri: AG panosu / GES gerçek kayıtları (depo artık 24 gerçek
   kayıtla başladı), malzeme birim fiyatları, hayvan varlığı ekstresi, 264
   kuyunun teknik alanları.

Yapı kararı: sayfa kimlikleri (Envanter, İşler, Kaynaklar, Özet, Hat
Kesiti, Ayarlar) **sabittir** — yeni iş bunların üstüne oturur, kapanan
modüller sayfa değil süzgeç düşürür. Sol menüdeki grup başlıkları ve
etiketler (2026.09.30'da "Saha işleri" / "Envanter" olarak ikiye
ayrıldı) buna dahil değil, kullanılabilirlik için değişebilir.

## 7. Modernist tasarım sistemi

Görsel dil `yayin/_ds/` altındaki Modernist sistemine bağlıdır: tek yazı tipi
Archivo, keskin köşe, güçlü ayraç, tek vurgu rengi. Program arayüzü bunun
üzerine Apple benzeri sakin bir katman koyar: ana renk mavi `#0071e3`, zemin
`#f5f5f7`, yazı `#1d1d1f`, saç teli ayraçlar, yuvarlatılmış köşeler; kırmızı
yalnız acil öncelik, hata/uyarı kutuları ve çevrimdışı şeridinde. Yeni ekran
eklerken bu palet ve 42px dokunma yüksekliği kuralı korunmalı.
