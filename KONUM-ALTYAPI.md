# Ekip konumu altyapısı (araç takip + zimmetli cihaz)

Durum (2026-10-07): **veritabanı, işlevler ve Ayarlar ekranı hazır; Arvento'dan veri henüz akmıyor** (hesap/API erişimi yok).
Veri gelince İş kartında ekipler "X km uzakta · araç takip · 3 dk önce" olarak görünür. Harita gösterimi sıradaki adım.

## Model
- Her ekibe bir ya da birden fazla **konum cihazı** bağlanır: `arvento` (araç takip sistemi) veya `tablet` (ekibe zimmetli tablet/telefon).
- Yalnız **son konum** saklanır (`konum_son`, cihaz başına tek satır). Geçmiş tutulmaz.
- Ekibin konumu = ekibe bağlı cihazların **en yenisi**. 30 dakikadan eskiyse ekranda "(eski)" yazar, yeşil değil gri görünür.

## Zimmetli tablet / telefon (hazır, çalışır)
1. Cihazda **ekibe bağlı bir hesapla** giriş yapılır (Ayarlar › Kullanıcılar'da hesabın "ekip" alanı dolu olmalı).
2. Ayarlar › Veri › "Ekip konumu — bu cihaz" › **Konumu paylaş**.
3. Uygulama **açık ve ekran uyanıkken** dakikada bir konum gider. Tarayıcı arka planda konum vermez: cihaz ekran uyanık, uygulama ön planda tutulmalı
   (araç şarjında, ekran uyku süresi uzun, uygulama açık). Konum izni verilmeli.
4. Personelin bilgilendirilmesi gerekir (KVKK).

## Araç takip — Arvento (altyapı hazır, veri gelmesi bekleniyor)
Programa konum yazmanın iki yolu var; ikisi de aynı `konum_yaz` işlevini kullanır:

**A) Arvento ya da araya konan bir betik konumu programa iter**
```
POST https://lcnsganomudmxigaqmgd.supabase.co/rest/v1/rpc/konum_yaz
apikey: <yayın anahtarı (supabase-baglanti.js içindeki sb_publishable_…)>
Content-Type: application/json

{ "p_anahtar": "<Ayarlar › Entegrasyon › Konum yazma anahtarı>",
  "p_noktalar": [ { "kod": "40 ABC 123", "lat": 39.15, "lon": 34.16, "zaman": "2026-10-07T12:00:00Z", "hiz": 42 } ] }
```
`kod` = cihazın "kodu" ya da **plakası** (Ayarlar'daki cihaz kaydıyla eşleşir). Eşleşmeyen satır sessizce atlanır; dönüş yazılan satır sayısıdır.

**B) Program Arvento'dan çeker** (Arvento'nun API dokümanı ve hesabı gelince yazılacak)
Kullanıcı adı ve şifre Ayarlar › Entegrasyon'da sunucuya kaydedilir (`arvento_kullanici`, `arvento_sifre`; tarayıcıya geri gelmez).
Zamanlanmış bir sunucu işlevi (dakikada bir) Arvento'dan araç konumlarını alıp `konum_yaz`'a iletir. **Bu işlev henüz yazılmadı** —
Arvento'nun hangi arayüzü sunduğunu (REST/SOAP, kimlik doğrulama, istek sınırı) bilmeden yazmak tahmine dayalı olurdu.

### Arvento'dan istenecekler
- Web servis / API erişimi (kullanıcı adı, şifre ya da anahtar) ve dokümanı
- Araç plaka listesi ve her aracın hangi ekibe bağlı olduğu
- Konum güncelleme sıklığı ve istek sınırları
- Çoğu firma API'yi ayrıca açar ve bazıları ücretlendirir; kurumun bilgi işlem birimi ya da tedarikçi firma üzerinden istenir.

## Kurulum sırası (Arvento gelince)
1. Ayarlar › Entegrasyon › "Konum yazma anahtarı"nı kaydedin (en az 16 karakter, rastgele).
2. "Ekip konumu — cihazlar" › **Cihaz ekle**: tür "Araç takip", ekip, plaka.
3. Veriyi ileten tarafa adres ve anahtarı verin (yukarıdaki A) ya da B için işlev yazdırın.
4. Cihaz satırında "son konum: X dk önce" görününce çalışıyor demektir.

SQL: `src/moduller/konum/sql/SQL-konum.sql` (uygulandı 2026-10-07). Tablolar RLS kapalı, işlevler SECURITY DEFINER.
