#!/usr/bin/env node
// Modül bilgisi ve bağımlılık çözümlemesi.
//
//   node modul-bilgi.js              modül tablosu (dosya, yöntem, görünüm özelliği sayısı)
//   node modul-bilgi.js --bagimlilik her modülün başka hangi modüllerin yöntem/özelliklerini kullandığı
//   node modul-bilgi.js <modül>      tek modül ayrıntısı: neyi tanımlar, kim kullanır
//
// Bir modülü kaldırmak ya da taşımak istediğinizde "kim kullanır" listesi, dokunmanız gereken yerlerdir.

const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const MODULLER = path.join(KOK, 'src', 'moduller');

function dosyalar(d) {
  const cikti = [];
  for (const ad of fs.readdirSync(d)) {
    const p = path.join(d, ad);
    if (fs.statSync(p).isDirectory()) cikti.push(...dosyalar(p)); else cikti.push(p);
  }
  return cikti;
}
const oku = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const moduller = fs.readdirSync(MODULLER).filter(a => fs.statSync(path.join(MODULLER, a)).isDirectory()).sort();
const bilgi = {};
for (const m of moduller) {
  const tum = dosyalar(path.join(MODULLER, m));
  const js = tum.filter(f => f.endsWith('.js') && !f.includes(path.sep + 'baglanti' + path.sep));
  const baglanti = tum.filter(f => f.includes(path.sep + 'baglanti' + path.sep));
  const html = tum.filter(f => f.endsWith('.html'));
  const yontem = new Set(), ozellik = new Set();
  for (const f of js) {
    const rel = path.relative(path.join(MODULLER, m), f).split(path.sep);
    const metin = oku(f);
    if (rel[0] === 'yontemler.js' || rel[0] === 'yontemler')
      for (const s of metin.split('\n')) { const x = s.match(/^  (?:static |async |get |set )*([A-Za-z_$][\w$]*)\(.*\) \{/); if (x) yontem.add(x[1]); }
    if (rel[0] === 'gorunum.js' || rel[0] === 'gorunum')
      for (const s of metin.split('\n')) { const x = s.match(/^      ([A-Za-z_$][\w$]*)\s*[:(,]/); if (x) ozellik.add(x[1]); }
  }
  const baglantiIslev = new Set();
  for (const f of baglanti)
    for (const s of oku(f).split('\n')) { const x = s.match(/^export (?:async )?function ([A-Za-z_$][\w$]*)/); if (x) baglantiIslev.add(x[1]); }
  bilgi[m] = { tum, js, html, yontem, ozellik, baglantiIslev, metin: [...js, ...html].map(oku).join('\n') };
}

// ad -> tanımlayan modül (yalnız tek modülde tanımlı adlar)
const sahip = new Map();
for (const m of moduller) for (const a of [...bilgi[m].yontem, ...bilgi[m].ozellik]) sahip.set(a, sahip.has(a) ? null : m);

function kullanimlar(m) {
  const sayac = {};
  const metin = bilgi[m].metin;
  for (const [ad, s] of sahip) {
    if (!s || s === m) continue;
    const kisa = ad.length < 4;                 // 'ui', 'tl'... gürültü
    if (kisa) continue;
    const re = bilgi[s].yontem.has(ad) ? new RegExp('this\\.' + ad + '\\b', 'g') : new RegExp('\\{\\{[^}]*\\b' + ad + '\\b', 'g');
    const n = (metin.match(re) || []).length;
    if (n) { sayac[s] = (sayac[s] || 0) + n; (sayac['_' + s] = sayac['_' + s] || []).push(ad); }
  }
  return sayac;
}

const arg = process.argv[2];
if (!arg) {
  console.log('modül'.padEnd(13) + 'dosya yöntem özellik html  bağlantı-işlevi');
  for (const m of moduller) {
    const b = bilgi[m];
    console.log(m.padEnd(13) + String(b.tum.length).padStart(5) + String(b.yontem.size).padStart(7) + String(b.ozellik.size).padStart(8) + String(b.html.length).padStart(5) + String(b.baglantiIslev.size).padStart(9));
  }
} else if (arg === '--bagimlilik') {
  for (const m of moduller) {
    const k = kullanimlar(m);
    const s = Object.keys(k).filter(x => x[0] !== '_').sort((a, b) => k[b] - k[a]);
    console.log(m.padEnd(13) + (s.length ? s.map(x => x + '(' + k[x] + ')').join(' ') : '— bağımsız'));
  }
} else {
  const m = arg;
  if (!bilgi[m]) { console.error('Böyle bir modül yok: ' + m + '. Modüller: ' + moduller.join(', ')); process.exit(1); }
  const b = bilgi[m];
  console.log('Modül: ' + m);
  const mj = path.join(MODULLER, m, 'modul.json');
  if (fs.existsSync(mj)) { const j = JSON.parse(oku(mj)); console.log('Açıklama: ' + (j.aciklama || '')); if (j.modulAnahtari) console.log('Açma/kapama anahtarı: s.modul.' + j.modulAnahtari); }
  console.log('Yöntemler (' + b.yontem.size + '): ' + [...b.yontem].join(', '));
  console.log('Görünüm özellikleri (' + b.ozellik.size + '): ' + [...b.ozellik].join(', '));
  console.log('Veritabanı bağlantı işlevleri (' + b.baglantiIslev.size + '): ' + [...b.baglantiIslev].join(', '));
  const kul = kullanimlar(m);
  console.log('Bu modül şunları kullanır: ' + (Object.keys(kul).filter(x => x[0] !== '_').map(x => x + ' [' + kul['_' + x].slice(0, 6).join(', ') + (kul['_' + x].length > 6 ? ', …' : '') + ']').join(' · ') || 'yalnız çekirdek'));
  const kimler = [];
  for (const o of moduller) {
    if (o === m) continue;
    const k = kullanimlar(o);
    if (k[m]) kimler.push(o + ' [' + k['_' + m].slice(0, 6).join(', ') + (k['_' + m].length > 6 ? ', …' : '') + ']');
  }
  console.log('Bu modülü kullananlar: ' + (kimler.join(' · ') || 'yok'));
}
