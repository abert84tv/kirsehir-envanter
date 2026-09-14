# Kurulum — adım adım

Proje: `lcnsganomudmxigaqmgd`
API adresi: `https://lcnsganomudmxigaqmgd.supabase.co`
Publishable key: `sb_publishable_U2WQsXUNkYAQ2aQ-f6npRA_Uhz8Yktc`

Bu iki değer gizli değildir, tarayıcıda görünür. Gizli olan **service_role** anahtarıdır — onu kimseyle paylaşmayın, bana da göndermeyin.

---

## Adım 1 — Veritabanını kur (5 dakika)

1. Supabase panelinde sol menüden **SQL Editor** açın.
2. **New query** deyin.
3. `supabase/sema.sql` dosyasının tamamını yapıştırıp **Run** deyin.
4. Yeni bir sorgu açın, `supabase/kuyular-seed.sql` dosyasını yapıştırıp **Run** deyin.

Sonuç: 264 kuyu kaydı veritabanında. Sol menüden **Table Editor → tesis** ile görebilirsiniz.

Kurulan yapı:
- `tesis` — bütün tesisler (kuyu, depo, AG, GES). Teknik alanlar `veri` sütununda JSON olarak; tür başına farklı alan seti olduğu için tek tabloda toplanır.
- `deneme` — kuyu ölçümleri. Özgül debi veritabanında kendiliğinden hesaplanır.
- `ariza` — arıza kayıtları, malzeme listesi ve maliyet dahil.
- `saha_notu`, `foto` — not ve fotoğraflar.
- `gecmis` — denetim izi. **Kimse silemez, kimse değiştiremez** — RLS bunu engelliyor.
- `tercih` — kişisel ayarlar. Cihaza değil hesaba bağlı, telefonda ve bilgisayarda aynı.
- `profil` — kullanıcı ve rolü.

Silme kalıcı değil: `silindi` sütununa tarih yazılır, 30 gün sonra `cop_temizle()` kalıcı siler. O fonksiyonu günlük çalıştırmak için **Database → Cron** bölümünden bir görev kurun.

---

## Adım 2 — İlk kullanıcıyı aç

1. **Authentication → Users → Add user**.
2. E-posta ve şifre girin (kendi e-postanız).
3. Kullanıcı listesinde çıkan **UUID**'yi kopyalayın.
4. SQL Editor'de çalıştırın:

```sql
insert into profil (id, ad, kullanici, rol)
values ('BURAYA_UUID', 'A. Bertan', 'a.bertan', 'yonetici');
```

Diğer personeli sonra aynı yolla eklersiniz; rol olarak `mudur`, `muhendis`, `sef`, `personel` yazılır.

Not: giriş artık kullanıcı adıyla değil e-postayla olacak. Kullanıcı adıyla girişi tercih ederseniz söyleyin, ona göre ayarlarım — `a.bertan@kirsehir.local` gibi sahte bir e-posta alan adı kullanmak en pratiği.

---

## Adım 3 — Fotoğraf deposu (Cloudflare R2)

1. Cloudflare panelinde **R2 → Create bucket**, adı `kirsehir-envanter`.
2. **Settings → CORS policy** kısmına ekleyin (yayın adresinizi sonra düzeltiriz):

```json
[{ "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "PUT"], "AllowedHeaders": ["*"] }]
```

3. **Manage R2 API Tokens → Create token** (Object Read & Write). Çıkan **Access Key** ve **Secret**'ı bana **göndermeyin** — bunlar Supabase Edge Function'ın ortam değişkenine girecek, tarayıcıya hiç inmeyecek.

Bu adımı program çalışmaya başladıktan sonra da yapabiliriz.

---

## Adım 4 — Yayına alma (Vercel)

1. GitHub'da `kirsehir-envanter` adında boş bir depo açın.
2. Ben proje dosyalarını hazırlayıp size vereceğim; depoya yüklersiniz.
3. Vercel'de **Add New → Project → Import Git Repository** ile o depoyu seçin.
4. Ortam değişkenleri olarak şunları girin:
   - `VITE_SUPABASE_URL` = `https://lcnsganomudmxigaqmgd.supabase.co`
   - `VITE_SUPABASE_KEY` = `sb_publishable_U2WQsXUNkYAQ2aQ-f6npRA_Uhz8Yktc`
5. **Deploy**.

Birkaç dakikada `kirsehir-envanter.vercel.app` benzeri bir adres verir. Telefondan o adrese girip **Ana ekrana ekle** derseniz uygulama gibi çalışır — ayrı kurulum, mağaza, APK gerekmez.

---

## Sıra

Şu an **Adım 1 ve 2**'yi yapın. Bittiğinde söyleyin; ben Adım 4'ün dosyalarını hazırlayayım. Adım 3'ü sona bırakıyoruz.

## Karışma riski

Yok. Supabase'de her proje ayrı veritabanıdır — mevcut projenizin tabloları bu projeden görünmez, etkilenmez. Vercel ve GitHub tarafında da her proje ayrı durur.
