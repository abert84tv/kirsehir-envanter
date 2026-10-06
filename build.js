#!/usr/bin/env node
// Kırşehir Envanter — derleme betiği
//
// src/kabuk.html içindeki "dahil" satırlarını ilgili dosyanın içeriğiyle değiştirir ve index.html'i üretir.
//   <!--@dahil yol-->     şablon (HTML) parçası
//   //@dahil yol          betik (JS) parçası
//   /*@dahil yol*/        stil (CSS) parçası
// Yollar src/ klasörüne göredir; parçalar başka parçaları da dahil edebilir.
//
// Kullanım:
//   node build.js            index.html'i üretir (Vercel de bunu çalıştırır)
//   node build.js --kontrol  index.html güncel mi bakar; değilse 1 ile çıkar (duman-testi bunu çağırır)
//
// Bağımlılık yok. Satır sonları LF'ye çevrilir, bu yüzden Windows/Linux çıktısı aynıdır.

const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const SRC = path.join(KOK, 'src');
const ISARET = /^(?:<!--@dahil (.+?)-->|\/\/@dahil (.+?)|\/\*@dahil (.+?)\*\/)$/;

const oku = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function genislet(metin, kaynak, yigin) {
  return metin.split('\n').map((satir, i) => {
    const m = satir.match(ISARET);
    if (!m) return satir;
    const yol = (m[1] || m[2] || m[3]).trim();
    const tam = path.join(SRC, yol);
    if (!fs.existsSync(tam)) throw new Error(`${kaynak}:${i + 1} — dahil edilen dosya yok: src/${yol}`);
    if (yigin.includes(yol)) throw new Error(`${kaynak}:${i + 1} — döngüsel dahil: ${[...yigin, yol].join(' -> ')}`);
    return genislet(oku(tam), yol, [...yigin, yol]);
  }).join('\n');
}

// Hedefler: [kaynak (src/'ye göre), çıktı (kökte)]
const HEDEFLER = [
  ['kabuk.html', 'index.html'],
  ['baglanti/kabuk.js', 'supabase-baglanti.js'],
];
function uret(kaynak) {
  return genislet(oku(path.join(SRC, kaynak)), kaynak, []);
}

const kontrol = process.argv.includes('--kontrol');
let hata = 0;
for (const [kaynak, cikti] of HEDEFLER) {
  const hedef = path.join(KOK, cikti);
  let metin;
  try { metin = uret(kaynak); } catch (e) { console.error('Derleme hatası: ' + e.message); process.exit(2); }
  const mevcut = fs.existsSync(hedef) ? oku(hedef) : null;
  const satir = metin.split(/\n/).length;
  if (kontrol) {
    if (mevcut !== metin) { console.error(cikti + ' güncel değil — "node build.js" çalıştırın (src/ içinde değişiklik var ama ' + cikti + ' yeniden üretilmemiş).'); hata = 1; }
    else console.log(cikti + ' güncel (' + satir + ' satır).');
  } else if (mevcut === metin) console.log(cikti + ' zaten güncel (' + satir + ' satır).');
  else { fs.writeFileSync(hedef, metin); console.log(cikti + ' üretildi (' + satir + ' satır).'); }
}
process.exit(hata);
