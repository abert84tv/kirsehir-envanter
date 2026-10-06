# Modüler yapıya geçiş — ilerleme kaydı

> **Bu dosya kesintisiz devam içindir.** Oturum kotası dolsa da, yeni oturum (ya da zamanlanmış görev)
> bu dosyayı okuyup **"SIRADAKİ ADIM"**dan devam eder. Her adım bitince bu dosya güncellenir ve commit edilir.
> Çalışma kuralı: her adım kendi içinde çalışır durumda biter (derleme + `node duman-testi.js` temiz), sonra commit/push.

## Amaç
`index.html` (20 bin satır, tek parça) → özellik başına klasör (`src/moduller/<ad>/`): şablon (masaüstü + telefon),
mantık (yöntemler), görünüm modeli. `node build.js` bunları birleştirip **aynı** `index.html`'i üretir; Vercel de her yayında
`node build.js` çalıştırır. Kullanıcıya görünen davranış değişmez.

## Doğrulama yöntemi (her adımda)
1. `node build.js` → `node duman-testi.js` ("Hepsi temiz.").
2. Taşıma saf metin taşımadır: eski ve yeni `index.html`'in **satır çoklukları** karşılaştırılır
   (`dogrula` betiği geçici; fark yalnızca bilinen boş satırlar/virgül olmalı).
3. Tarayıcıda (localhost:5176): `Object.getOwnPropertyNames(Component.prototype)` ve `renderVals()` anahtarları eskiyle aynı olmalı;
   `tab` değiştirip `renderVals()` hatasız çalışmalı.

## Durum
- [x] **Faz 0** — tek parça → `src/` (74 parça, 21 modül klasörü), `build.js`, duman-testi entegrasyonu, Vercel `buildCommand`. (2026-10-07)
- [x] **Faz 1** — kabuk 233 satır; render hazırlığı/görünüm/yöntemler alt konulara bölündü; `componentDidMount` 10 `baslat*` yöntemine ayrıldı (2026-10-07)
- [ ] **Faz 2** — SQL dosyaları ve `supabase-baglanti.js` sarmalayıcılarını modüllere taşı
- [ ] **Faz 3** — modül bildirimi (`modul.json`: ad, bağımlılık, açıklama) + duman-testinde modül başına kontrol
- [ ] **Faz 4** — `node yeni-modul.js <ad>` iskelet üretici + `src/README.md` "özellik ekle / çıkar" kılavuzu
- [ ] **Faz 5** — DURUM.md / README güncellemesi, son tam doğrulama, kullanıcıya rapor

## SIRADAKİ ADIM
**Faz 2:** (a) `build.js`'e ikinci hedef ekle: `src/baglanti/kabuk.js` → `supabase-baglanti.js` (ES modül; `export` işlevleri modül başına parça: telemetri, basvuru, entegrasyon, ariza, is-emri, ambar... — sıra/`import`'lar korunsun, çıktı bayt bayt aynı olsun);
(b) `SQL-*.sql` dosyalarını `src/moduller/<ad>/sql/` altına `git mv` ile taşı, kökte `SQL-INDEKS.md` (hangi dosya hangi modül, hangi sırayla uygulandı) yaz, KURULUM.md/OKU.md/README.md içindeki yolları güncelle;
(c) `supabase-islev-*.ts` edge function kaynaklarını `src/moduller/<ad>/islev/` altına taşı (telegram→basvuru, talep-siniflandir→talep, mesaj-gonder→bildirim); `duman-testi.js` ve dokümanlardaki yolları güncelle;
(d) Faz 2'yi işaretle, Faz 3'e geç.

## Notlar
- Dahil işaretleri: `<!--@dahil yol-->` (HTML), `//@dahil yol` (JS), `/*@dahil yol*/` (CSS); yol `src/`'ye göre.
- Yöntem ve görünüm özelliklerinin **sırası** önemsizdir (anahtar tekrarı yok). `componentWillUnmount` iki kez tanımlı: sonraki geçerli (orijinalden miras, korunuyor).
- Görünüm özellikleri dosya sonunda virgülle bitmelidir (derleme sırası değişebilir).
- Orijinal tek parça dosya git geçmişinde: commit `55a060d..` öncesi `index.html`.
