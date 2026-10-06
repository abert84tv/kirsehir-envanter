# src/ — kaynak klasörü

`index.html` **elle düzenlenmez**; `node build.js` ile bu klasörden üretilir (Vercel de yayında aynısını çalıştırır).

```
src/
  kabuk.html                 iskelet: <head>, ana yerleşim, "dahil" işaretleri
  stil/ana.css               tüm CSS
  sabitler/NN-konu.js        sabitler ve yardımcı işlevler (SIRA ÖNEMLİ — numara sırasıyla yüklenir)
  moduller/<ad>/
    masaustu/*.html          masaüstü şablon parçaları (sayfa / panel başına)
    telefon/*.html           telefon şablon parçaları
    yontemler.js             sınıf yöntemleri (iş mantığı)
    gorunum.js               görünüm modeli özellikleri (renderVals dönüş nesnesine eklenir)
    durum.js, render-hazirlik.js   (yalnız cekirdek)
```

Dahil işaretleri (kendi satırında): `<!--@dahil yol-->` HTML, `//@dahil yol` JS, `/*@dahil yol*/` CSS. Yol `src/`'ye göredir.

## Çalışma
- Değiştir → `node build.js` → `node duman-testi.js` → tarayıcıda dene → commit (hem `src/` hem üretilen `index.html`).
- `node build.js --kontrol`: `index.html` güncel mi (duman-testi bunu da çalıştırır).

## Özellik eklerken
1. Şablon: `moduller/<ad>/masaustu/` ve `telefon/` içine parça; `kabuk.html`'e (ya da bir üst parçaya) dahil satırı.
2. Mantık: `yontemler.js`'e yöntem. Görünüm: `gorunum.js`'e özellik (**sonu virgülle bitmeli**).
3. Yeni dosya yarattıysanız ilgili `@dahil` satırını ekleyin.

Ayrıntılı ilerleme: `../MODUL-ILERLEME.md`.
