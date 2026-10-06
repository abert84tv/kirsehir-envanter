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
- [ ] **Faz 1** — kalan büyük parçaları ince böl (aşağıdaki liste)
- [ ] **Faz 2** — SQL dosyaları ve `supabase-baglanti.js` sarmalayıcılarını modüllere taşı
- [ ] **Faz 3** — modül bildirimi (`modul.json`: ad, bağımlılık, açıklama) + duman-testinde modül başına kontrol
- [ ] **Faz 4** — `node yeni-modul.js <ad>` iskelet üretici + `src/README.md` "özellik ekle / çıkar" kılavuzu
- [ ] **Faz 5** — DURUM.md / README güncellemesi, son tam doğrulama, kullanıcıya rapor

## SIRADAKİ ADIM
**Faz 1 başlıyor.** Sıra: (a) `src/kabuk.html`'de kalan şablon gövdeleri (yan menü, başlık, ortak katmanlar) → `moduller/cekirdek/`;
(b) `moduller/cekirdek/render-hazirlik.js` (~520 satır yerel değişken) — modül konusuna göre parçalara ayır;
(c) büyük `gorunum.js` dosyalarını (`ariza` faultForm ~560 satır, `ambar` ambarEkran ~350, `envanter`, `ozet`) özellik başına dosyaya böl;
(d) `componentDidMount` (199 satır) ve `veriYenile` içindeki modül-özel kısımları modüllerin kendi "başlat" yöntemine taşı.

## Notlar
- Dahil işaretleri: `<!--@dahil yol-->` (HTML), `//@dahil yol` (JS), `/*@dahil yol*/` (CSS); yol `src/`'ye göre.
- Yöntem ve görünüm özelliklerinin **sırası** önemsizdir (anahtar tekrarı yok). `componentWillUnmount` iki kez tanımlı: sonraki geçerli (orijinalden miras, korunuyor).
- Görünüm özellikleri dosya sonunda virgülle bitmelidir (derleme sırası değişebilir).
- Orijinal tek parça dosya git geçmişinde: commit `55a060d..` öncesi `index.html`.
