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
const CIKTI = path.join(KOK, 'index.html');
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

function uret() {
  return genislet(oku(path.join(SRC, 'kabuk.html')), 'kabuk.html', []);
}

const kontrol = process.argv.includes('--kontrol');
let cikti;
try { cikti = uret(); } catch (e) { console.error('Derleme hatası: ' + e.message); process.exit(2); }

if (kontrol) {
  const mevcut = fs.existsSync(CIKTI) ? oku(CIKTI) : '';
  if (mevcut !== cikti) {
    console.error('index.html güncel değil — "node build.js" çalıştırın (src/ içinde değişiklik var ama index.html yeniden üretilmemiş).');
    process.exit(1);
  }
  console.log('index.html güncel (' + cikti.split('\n').length + ' satır).');
} else {
  const mevcut = fs.existsSync(CIKTI) ? oku(CIKTI) : null;
  if (mevcut === cikti) console.log('index.html zaten güncel (' + cikti.split('\n').length + ' satır).');
  else { fs.writeFileSync(CIKTI, cikti); console.log('index.html üretildi (' + cikti.split('\n').length + ' satır).'); }
}
