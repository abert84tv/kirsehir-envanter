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
- [x] **Faz 2** — `supabase-baglanti.js` src/baglanti/ + modül parçalarından derleniyor; SQL `src/moduller/<m>/sql/`, edge function `islev/` altında; `SQL-INDEKS.md` (2026-10-07)
- [ ] **Faz 3** — modül bildirimi (`modul.json`: ad, bağımlılık, açıklama) + duman-testinde modül başına kontrol
- [ ] **Faz 4** — `node yeni-modul.js <ad>` iskelet üretici + `src/README.md` "özellik ekle / çıkar" kılavuzu
- [ ] **Faz 5** — DURUM.md / README güncellemesi, son tam doğrulama, kullanıcıya rapor

## SIRADAKİ ADIM
**Faz 3:** her modül klasörüne `modul.json` yaz (ad, açıklama, sahip olduğu sekme/panel anahtarları, bağımlı olduğu modüller, `kapatilabilir` + `s.modul.<anahtar>` anahtarı varsa onu);
`duman-testi.js`'e kontrol ekle: (1) her `src/moduller/*` klasöründe `modul.json` var ve geçerli JSON; (2) `modul.json`'daki bağımlılıklar gerçek klasör; (3) `src/` altındaki hiçbir dosya "yetim" değil — her dosya `kabuk.html`/`baglanti/kabuk.js`'den
(dolaylı) dahil edilmiş ya da `sql/`/`islev/`/`modul.json`/README; (4) dahil işaretleri dosya sonunda boş satır bırakmıyor.
Sonra Faz 4 (`yeni-modul.js` iskelet üretici + `src/README.md` kılavuzu), Faz 5 (son doğrulama + rapor + zamanlanmış görevi kapat).

## Notlar
- Dahil işaretleri: `<!--@dahil yol-->` (HTML), `//@dahil yol` (JS), `/*@dahil yol*/` (CSS); yol `src/`'ye göre.
- Yöntem ve görünüm özelliklerinin **sırası** önemsizdir (anahtar tekrarı yok). `componentWillUnmount` iki kez tanımlı: sonraki geçerli (orijinalden miras, korunuyor).
- Görünüm özellikleri dosya sonunda virgülle bitmelidir (derleme sırası değişebilir).
- Orijinal tek parça dosya git geçmişinde: commit `55a060d..` öncesi `index.html`.
