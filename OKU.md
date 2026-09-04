# Bu turda yüklenecek dosyalar

Depoda **yalnızca bu iki dosya** değişti. Diğerlerine dokunmayın.

```
index.html      ← ana program
harita.html     ← harita katmanı (GPS düzeltmesi)
```

Yükleme: depo ana sayfası → **Add file → Upload files** → iki dosyayı
sürükleyin (aynı isimde oldukları için üzerine yazarlar) → **Commit changes**.

Vercel 1-2 dakika içinde kendiliğinden yeniden yayınlar. Sonra adreste
**Ctrl+Shift+R** (telefonda sekmeyi kapatıp açın).

## Bu sürümde ne değişti

- Prototip başlık çubuğu, Masaüstü/Telefon düğmeleri ve sahte "09:41"
  saat şeridi kaldırıldı; program ekranı tam kaplıyor.
- Ekran düzeni otomatik: 820 px altı telefon, üstü bilgisayar. Elle
  değiştirme Ayarlar > Ekran düzeni'nde.
- Sayfanın altındaki geliştirme notları bölümü kaldırıldı.
- Kullanıcı yönetimi: Ayarlar > Yetkiler ve kullanıcılar. Kişi ekle,
  düzenle, şifre sıfırla, dondur, aktif et, sil. Yalnızca Yönetici.
- Yeni kişi ilk girişte kendi şifresini belirliyor.
- "Kayıtlı girişi sil" sol alttan Ayarlar'a taşındı.
- Mobil: 100dvh'ye geçildi — alt menü ve haritadaki nokta paneli artık
  ekranın dışında kalmıyor.
- GİT düğmesi cihaz GPS'ini kullanıyor; masaüstünde de eklendi.
  Konum yalnızca https adreslerde çalışır, telefon ilk basışta izin sorar.

## Sıradaki adım

Supabase bağlantısı. Veritabanı hazır; kullanıcı tablosu için
`supabase/kullanicilar.sql` dosyasını Supabase > SQL Editor'e bir kez
çalıştırmanız gerekiyor. Bağlantı kurulduğunda eklediğiniz kişiler her
cihazdan girebilir ve kayıtlar ortak veritabanına yazılır.
