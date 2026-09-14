# Yayına alma — GitHub · Vercel · Supabase

Son güncelleme: bu turda yapılan tarama ve düzeltmelerden sonra.

## 1. GitHub'a konacak dosyalar

Yayına giden her şey `yayin/` klasöründedir. Depoya şunları koyun:

```
vercel.json
yayin/index.html               ← ana uygulama (masaüstü + mobil)
yayin/harita.html              ← ana harita çerçevesi
yayin/profil.html              ← mesafe ve yol profili
yayin/hat.html                 ← hat güzergâhı çizimi
yayin/support.js
yayin/supabase-baglanti.js
yayin/envanter.js
yayin/kirsehir-data.js
yayin/koyler.js
yayin/kuyular.js
yayin/_ds/                     ← klasörün tamamı (yazı tipleri, stil)
```

Depoya **konmayacaklar** (geliştirme dosyaları): `supabase/`, `uploads/`,
`screenshots/`, `DURUM.md`, `KURULUM.md`, `NOTLAR.md`, kök dizindeki eski
`Envanter Uygulaması v2.dc.html` ve kök dizindeki `*.js` kopyaları.
Kök kopyalar artık kullanılmıyor; yayın sürümü `yayin/` içindekilerdir.

## 2. Vercel

`vercel.json` bu turda güncellendi — kök adres artık uygulamayı açar:

```
/          → /yayin/index.html
/harita    → /yayin/harita.html
/profil    → /yayin/profil.html
/hat       → /yayin/hat.html
```

Adımlar:

1. vercel.com → **Add New → Project**
2. **Import Git Repository** → depoyu seçin
3. Framework Preset: **Other**
4. Build Command ve Output Directory: **boş bırakın**
5. **Deploy**

Deponuz Vercel'e bağlıysa `git push` yeterli — yeni sürüm kendiliğinden yayına
girer. Telefonda kullanım: adresi tarayıcıda açın → paylaş → **Ana Ekrana Ekle**.

## 3. Supabase'e eklenecekler

Veritabanı kurulumu şu sırayla çalıştırılır (daha önce çalıştırdıklarınızı
atlayın; hepsi tekrar çalıştırmaya dayanıklı yazıldı):

| Sıra | Dosya | Ne yapar |
|---|---|---|
| 1 | `supabase/sema.sql` | tesis, arıza, deneme, saha notu tabloları |
| 2 | `supabase/kullanicilar.sql` | kullanıcı tablosu, roller |
| 3 | `supabase/oturum.sql` | giriş, anahtarla oturum, kullanıcı yönetimi |
| 4 | `supabase/ortak-veri.sql` | listeleme ve yazma işlevleri, saha notu |
| 5 | `supabase/fotograf.sql` | fotoğraf kayıtları + depo kovası |
| 6 | `supabase/ses.sql` | sesli notlar |
| 7 | `supabase/cop-kutusu.sql` | 30 günlük çöp kutusu, geri getirme |
| 8 | `supabase/kuyular-seed.sql` | 264 kuyu noktası (bir kez) |
| 9 | `supabase/duzeltme-01.sql`, `duzeltme-02.sql` | önceki düzeltmeler |
| 10 | **`supabase/duzeltme-03.sql`** | **bu turda eklendi — aşağıya bakın** |

### duzeltme-03.sql neyi kurar

1. **Kod şeması.** `tesis.kod` tekilleştirildi (iki cihaz aynı kodu veremez) ve
   `tesis_kod_siradaki(token, tur)` işlevi eklendi: her tür kendi içinde ilk boş
   sırayı verir (KS-DEP-0001, KS-DEP-0002 …). Programdaki kod üretimi aynı kurala
   çekildi; ayrıca program veriyi her yüklediğinde şemaya uymayan kod kalmışsa
   kendiliğinden onarır ve barkodu yeniler (eski numaralandırmadan kalan
   KS-DEP-1165/1166/1167 gibi kodlar bu yolla düzelir).
2. **Hat güzergâhları.** `hat` tablosu + `hat_listesi` / `hat_kaydet` / `hat_sil`.
   Altı tür: terfi, isale, şebeke, AG, OG, GES DC.
3. **Elle eklenen köy / mahalle.** `yerlesim_ek` tablosu + listeleme, ekleme, silme.
4. **Yetkiler.** `kullanicilar` tablosuna `sayfa_yetki` ve `yetki_istisna` jsonb
   alanları, `yetki_listesi` / `yetki_kaydet` işlevleri ve son etkin yöneticiyi
   koruyan tetikleyici.

### Bağlantı bilgileri

Program Ayarlar → Veritabanı ekranından bağlanır:

```
https://lcnsganomudmxigaqmgd.supabase.co
sb_publishable_U2WQsXUNkYAQ2aQ-f6npRA_Uhz8Yktc
```

Bu iki değer yayın (publishable) anahtarıdır, tarayıcıda bulunması normaldir.
`service_role` anahtarı **hiçbir yere** konmaz.

### Sunucudaki demo kayıtların silinmesi (9 Eylül 2026)

Program artık yalnızca gerçek 264 KML kuyusuyla açılıyor, ama **sunucuda
kurulumdan kalan 148 örnek kayıt var** (93 depo, 25 AG, 30 GES).

Bunlar programın içinden silinir: **Ayarlar > Demo kayıt temizliği** (Yönetici ve
Müdür görür). Liste kuyu dışındaki bütün kayıtları gösterir ve her satırda
fotoğraf, hat, saha notu, arıza ya da geçmiş olup olmadığını yazar — dolu
görünenler sahada girilmiş olabilir, elle bakılmalı. "Boş olanları seç" yalnızca
hiçbir ek verisi olmayanları işaretler. Silme **çöp kutusuna taşır**, 30 gün
içinde geri getirilebilir.

SQL ile silmek gerekirse kapsam şudur — kuyulara dokunmaz:

```sql
-- ÖNCE YEDEK. Yalnızca depo, AG ve GES kayıtlarını siler.
delete from tesis where tur in ('depo','ag','ges');
```

Daha önce bu belgede geçen `delete from tesis where kod like 'KS-%'` komutu
**yanlıştır**: 264 gerçek KML kuyusunu da siler, kullanılmamalı.

### Sunucuya bağlanan üç veri (8 Eylül 2026)

`duzeltme-03.sql` çalıştırıldıktan sonra program şu üçünü artık sunucuda tutuyor
— cihazdaki kopya yalnızca çevrimdışı yedek:

- hat güzergâhları → `hat` tablosu
- elle eklenen köy / mahalle → `yerlesim_ek` tablosu
- sayfa yetkileri ve yetki istisnaları → `kullanicilar.sayfa_yetki` / `yetki_istisna`

Kritik olan yetki denetiminin sunucuda da yapılması: arayüz kapatılsa bile veriyi
koruyan katman `yazma_denetle` işlevidir.

Ayrıca çevrimdışı kuyruk kendiliğinden boşalıyor: sunucuya yazılmamış kayıtlar
bağlantı gelince, veri yenilendiğinde ve dakikada bir otomatik gönderiliyor.
