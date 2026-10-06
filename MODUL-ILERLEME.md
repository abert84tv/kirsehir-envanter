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
- [x] **Faz 3** — her modülde `modul.json`; `modul-bilgi.js` (tablo/bağımlılık); duman-testi: modul.json + yetim dosya denetimi (2026-10-07)
- [x] **Faz 4** — `yeni-modul.js` (ekle/`--kaldir`, kullanılıyorsa reddeder) + `src/README.md` kılavuzu; ekle→kaldır döngüsü index.html'i bayt bayt aynı bıraktığı doğrulandı (2026-10-07)
- [ ] **Faz 5** — DURUM.md / README güncellemesi, son tam doğrulama, kullanıcıya rapor

## SIRADAKİ ADIM
**Faz 5 (son):** (1) Tarayıcıda uçtan uca tarama: localhost:5176 — masaüstü (geniş) ve telefon (resize_window mobile) düzeninde bütün sekmeleri sırayla aç (`logic.setState({tab})`), `renderVals()` hatasız, konsolda hata yok; yöntem/anahtar karşılaştırması (index.html'in src/'den önceki sürümüyle: `git show 55a060d:index.html`);
(2) canlı (kirsehir-envanter.vercel.app) = yerel `index.html` bayt eşitliği ve Vercel "success";
(3) `DURUM.md` ve kök `README.md`'ye "kod yapısı" bölümü (`src/README.md`'ye yönlendir; yeni sürüm artırma yolu: `src/sabitler/11-genel.js` SURUM + `sw.js` SURUM, sonra `node build.js`);
(4) hafızadaki `modular-yapi-gorevi.md` durumunu "tamamlandı" yap; kullanıcıya özet rapor yaz;
(5) zamanlanmış görevi kapat: `update_scheduled_task` taskId `kirsehir-modul-donusumu-devam`, enabled=false.

## Notlar
- Dahil işaretleri: `<!--@dahil yol-->` (HTML), `//@dahil yol` (JS), `/*@dahil yol*/` (CSS); yol `src/`'ye göre.
- Yöntem ve görünüm özelliklerinin **sırası** önemsizdir (anahtar tekrarı yok). `componentWillUnmount` iki kez tanımlı: sonraki geçerli (orijinalden miras, korunuyor).
- Görünüm özellikleri dosya sonunda virgülle bitmelidir (derleme sırası değişebilir).
- Orijinal tek parça `index.html`: commit `e1d861a` (Faz 0'dan hemen önce, 2026-10-07) ve öncesi.
- Sürüm artırma (DURUM/yayın): `src/sabitler/11-genel.js` içindeki SURUM + `sw.js` SURUM → `node build.js`.
