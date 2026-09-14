#!/usr/bin/env node
// Duman testi — push öncesi çalıştırılır: node duman-testi.js
//
// Tarayıcı açmaz, sunucuya bağlanmaz; birkaç saniyede biter. Bugüne kadar
// canlıda fark edilen iki hatayı (vercel.json'ın var olmayan bir dosyaya
// yönlendirmesi, index.html'deki gömülü <script>'in sözdizimi hatası)
// tam olarak bu türden bir kontrol anında yakalardı — ikisi de haftalarca
// sürüm boyunca gözden kaçmıştı. Bu, bütün hataları yakalamaz; yalnızca
// "site hiç açılmaz" / "sayfa hiç çalışmaz" türünden temel bozuklukları
// push'tan önce eler.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
let hata = 0;
const basari = msg => console.log('  ✓ ' + msg);
const basarisiz = msg => { console.log('  ✗ ' + msg); hata++; };

function dosyaVarMi(rel) {
  return fs.existsSync(path.join(ROOT, rel.replace(/^\//, '')));
}

// 1) HTML dosyalarındaki gömülü <script> bloklarının sözdizimi
console.log('1) Gömülü <script> sözdizimi');
const htmlDosyalari = ['index.html', 'harita.html', 'profil.html', 'hat.html'];
for (const f of htmlDosyalari) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { basarisiz(f + ' bulunamadı'); continue; }
  const html = fs.readFileSync(p, 'utf8');
  // index.html'in gerçek mantığı düz <script> değil, <script type="text/x-dc"
  // data-dc-script ...> etiketinde duruyor — src= olan etiketler de eşleşir
  // ama içerikleri boştur, zararsız. Önceki naif regex (yalnız <script>)
  // index.html'de hiç eşleşmiyordu ve fark edilmeden "OK" basıyordu.
  const etiketler = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .map(m => ({ tip: /type="module"/.test(m[1]), kod: m[2].trim() }))
    .filter(x => x.kod);
  // type="module" olan bloklar import/export içerir — new Function bunu
  // ayrıştıramaz (modül değil, düz fonksiyon sözdizimi bekler). Bunlar için
  // geçici bir .mjs dosyasına yazıp `node --check` ile ayrıştırılıyor
  // (import'ları çözmez, yalnız sözdizimini kontrol eder).
  let tamam = true, modulSayisi = 0;
  etiketler.forEach((x, i) => {
    if (!x.tip) {
      try { new Function(x.kod); } catch (e) { tamam = false; basarisiz(f + ' — script bloğu ' + i + ': ' + e.message); }
      return;
    }
    modulSayisi++;
    const tmp = path.join(os.tmpdir(), 'duman-testi-' + process.pid + '-' + i + '.mjs');
    try {
      fs.writeFileSync(tmp, x.kod);
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      tamam = false;
      basarisiz(f + ' — script bloğu ' + i + ' (module): ' + (e.stderr ? e.stderr.toString().split('\n')[0] : e.message));
    } finally {
      try { fs.unlinkSync(tmp); } catch (e2) { /* önemli değil */ }
    }
  });
  if (tamam) basari(f + ' (' + etiketler.length + ' blok'
    + (modulSayisi ? ', ' + modulSayisi + ' tanesi type=module' : '') + ')');
}

// 2) HTML'lerin yerel dosya referansları (script src / link href) gerçekten var mı
console.log('2) Yerel dosya referansları (src/href)');
for (const f of htmlDosyalari) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
    .filter(r => !/^https?:\/\//.test(r) && !r.startsWith('#'));
  let tamam = true;
  for (const r of refs) {
    if (!dosyaVarMi(r)) { tamam = false; basarisiz(f + ' → "' + r + '" yok'); }
  }
  if (tamam) basari(f + ' (' + refs.length + ' referans)');
}

// 3) vercel.json rewrite hedefleri gerçekten var mı — kök adresin 404
//    vermesine yol açan hata buydu (2026.09.14)
console.log('3) vercel.json rewrite hedefleri');
const vercelPath = path.join(ROOT, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const cfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  for (const r of (cfg.rewrites || [])) {
    if (dosyaVarMi(r.destination)) basari(r.source + ' → ' + r.destination);
    else basarisiz(r.source + ' → ' + r.destination + ' (dosya yok!)');
  }
} else {
  basarisiz('vercel.json bulunamadı');
}

// 4) Üç harita dosyası da paylaşılan harita-ortak.css'i yüklüyor mu —
//    aksi hâlde koyu tema karo kısması sessizce üçe bölünüp tekrar
//    birbirinden kopabilir (2026.09.15 hatası)
console.log('4) Paylaşılan harita-ortak.css kullanımı');
for (const f of ['harita.html', 'profil.html', 'hat.html']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  if (html.includes('harita-ortak.css')) basari(f);
  else basarisiz(f + ' harita-ortak.css yüklemiyor');
}

console.log('');
if (hata) {
  console.log(hata + ' sorun bulundu — push etmeden önce düzeltin.');
  process.exit(1);
} else {
  console.log('Hepsi temiz.');
  process.exit(0);
}
