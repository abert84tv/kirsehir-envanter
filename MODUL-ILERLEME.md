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
**Faz 1 (devam):** tamamlananlar — (a) `kabuk.html` 233 satıra indi (yan menü, üst çubuk, katmanlar, giriş ekranları, telefon sheet/ortak katmanlar modüllere çıkarıldı);
(b) `render-hazirlik.js` 9 konu parçasına bölündü (`moduller/*/hazirlik-*.js`, SIRA önemli: dosyadaki dahil sırası korunmalı);
(c) `gorunum.js` dosyaları özellik başına `gorunum/<ad>.js` parçalarına bölündü.
**Kalan:** (d) `yontemler.js` dosyalarını alt konuya göre böl (ariza: foto-medya / sla / esitleme / saha; cekirdek: yasam-dongusu / tema-tercih / zaman / yardimcilar;
esitleme: modul-esitleme / senkron / not-kuyruk; yerlesim: koy-ek / csv; ambar: stok / siparis / hareket) — yöntem sırası önemsizdir ama `componentWillUnmount` iki tanımlıdır (sonraki geçerli; ikisini de aynı dosyada, sırayı koruyarak tut);
(e) `componentDidMount` (199 satır) içindeki modül-özel başlatmaları ilgili modülün `...Baslat()` yöntemine taşı (davranış aynı kalmalı: çağrı sırasını koru);
(f) Faz 1'i işaretle ve Faz 2'ye geç.

## Notlar
- Dahil işaretleri: `<!--@dahil yol-->` (HTML), `//@dahil yol` (JS), `/*@dahil yol*/` (CSS); yol `src/`'ye göre.
- Yöntem ve görünüm özelliklerinin **sırası** önemsizdir (anahtar tekrarı yok). `componentWillUnmount` iki kez tanımlı: sonraki geçerli (orijinalden miras, korunuyor).
- Görünüm özellikleri dosya sonunda virgülle bitmelidir (derleme sırası değişebilir).
- Orijinal tek parça dosya git geçmişinde: commit `55a060d..` öncesi `index.html`.
