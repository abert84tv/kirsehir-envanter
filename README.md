# Devir paketi — Kırşehir Su ve Elektrik Tesisleri Envanteri

Bu paket, çalışmayı **Claude Code** tarafında sürdürmek için hazırlandı. Amaç:
programı yeniden tasarlamak değil, çalışan bu sürümü gerçek bir kod deposunda
sürdürülebilir hâle getirmek.

Çalışan sürüm: **2026.09.14-89**. Sürüm damgası `yayin/index.html` içindeki
`const SURUM` satırında ve programın Ayarlar > Veri > "Program sürümü"
kartında görünür.

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
| `yayin/` | Yayına alınan programın tamamı — GitHub'a yüklenen klasör |
| `yayin/index.html` | Ana program: bütün ekranlar, iş kuralları, yetki, eşitleme |
| `yayin/harita.html` | Harita penceresi (Leaflet), ana pencereyle postMessage ile konuşur |
| `yayin/envanter.js`, `koyler.js`, `kuyular.js`, `kirsehir-data.js` | Gömülü gerçek veri: 264 kuyu noktası, 1043 yerleşim, 260 köy-ilçe ataması, nüfus |
| `yayin/supabase-baglanti.js` | Sunucu katmanı: oturum, `kurum_veri`, `denetim`, numara sayacı, sunucu saati |
| `yayin/SQL-*.sql` | Veritabanı kurulum betikleri (sırası aşağıda) |
| `yayin/_ds/` | Bağlı tasarım sistemi (Modernist) — token ve bileşen kaynağı |
| `DURUM.md` | Durum raporu + bütün oturum kayıtları (ana referans) |
| `KURULUM.md` | Supabase / R2 / SMS kurulum adımları |
| `YAYIN.md` | Yayınlama (GitHub + Vercel) notları |
| `vercel.json` | Yayın ayarı |

Paketteki HTML dosyaları maket değil, **çalışan programdır**. Tarayıcıda
`yayin/index.html` açılınca çalışır; derleme adımı yoktur.

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

Daha önce çalıştırılanlar tekrar edilmez. Son oturumlarda şema değişikliği
olmadı — mevcut kurulum güncel programla uyumludur.

## 5. Yayınlama

GitHub'a `yayin/` klasörünün tamamı yüklenir; Vercel (veya GitHub Pages) kök
dizin olarak bu klasörü gösterir. Yükleme sonrası tarayıcıda bir kez sert
yenileme (Ctrl+F5) gerekir — eski kopya önbellekte kalırsa sürüm damgası
2026.09.14-89 görünmez ve düzeltmeler uygulanmamış gibi durur. Program içinde
Ayarlar > Veri > "Programı tazele" aynı işi yapar.

## 6. Claude Code'da sıradaki işler

`DURUM.md` sonundaki bekleyen maddeler:

1. Telefonda haritaya **uzun basışla nokta bırakma** — masaüstündeki çift
   tıklama karşılığı; kart "yeni kayıt / köy konumu olarak işaretle / bu noktaya
   git" seçeneklerini vermeli.
2. **Hat kesitinde çift tıkla** nokta ekleme.
3. **Koyu tema ince ayarı** — gerçek siyah üzerine kurulu palette kontrast ve
   harita karo kısma değerleri gözden geçirilecek.
4. **Yetki tablosunun sadeleştirilmesi** — on yetki kalemi altı sayfa/süzgeç
   yapısına göre yeniden yazılacak (`SUZGEC_TANIM` haritası hazır).
5. Kurulum bekleyenleri: Cloudflare R2 fotoğraf deposu, SMS/WhatsApp operatör
   aboneliği ve `supabase-islev-mesaj-gonder.ts` Edge Function yayını, HGM
   ortofoto lisansı, gerçek personel hesapları.
6. Veri eksikleri: depo / AG panosu / GES gerçek kayıtları, malzeme birim
   fiyatları, hayvan varlığı ekstresi, 264 kuyunun teknik alanları.

Yapı kararı: menü ve sayfa yapısı (Envanter, İşler, Kaynaklar, Özet, Hat
Kesiti, Ayarlar) **sabittir**. Kapanan modüller sayfa değil süzgeç düşürür.
Yeni iş bu yapının üstüne oturur.

## 7. Modernist tasarım sistemi

Görsel dil `yayin/_ds/` altındaki Modernist sistemine bağlıdır: tek yazı tipi
Archivo, keskin köşe, güçlü ayraç, tek vurgu rengi. Program arayüzü bunun
üzerine Apple benzeri sakin bir katman koyar: ana renk mavi `#0071e3`, zemin
`#f5f5f7`, yazı `#1d1d1f`, saç teli ayraçlar, yuvarlatılmış köşeler; kırmızı
yalnız acil öncelik, hata/uyarı kutuları ve çevrimdışı şeridinde. Yeni ekran
eklerken bu palet ve 42px dokunma yüksekliği kuralı korunmalı.
