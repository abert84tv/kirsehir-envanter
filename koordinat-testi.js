// Koordinat dönüşümü denetimi — Netcad 8.6 çıktısıyla (2026-10-13, Kırşehir'in 5 noktası; ED50: DMA Europe-West -87 -98 -121) karşılaştırır.
// Kullanım: node koordinat-testi.js   (fark 2 cm'yi aşarsa hata verir)
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/src/sabitler/01-koordinat.js', 'utf8').replace(/^const /gm, 'var ').replace(/^function (\w+)/gm, 'var $1 = function $1'));
const ITRF = [[539079.596, 4364148.812], [596492.203, 4361150.622], [637269.260, 4363128.389], [592293.537, 4306206.993], [590601.891, 4396194.423]];
const UTM6 = [[539063.964, 4362403.157], [596453.606, 4359406.166], [637214.352, 4361383.142], [592256.619, 4304484.515], [590565.651, 4394435.950]];
const ED3 = [[539114.646, 4364325.758], [596527.611, 4361327.559], [637304.922, 4363305.350], [592328.932, 4306383.581], [590637.255, 4396371.577]];
const ED6 = [[539099.000, 4362580.028], [596489.000, 4359583.028], [637250.000, 4361560.028], [592292.000, 4304661.028], [590601.000, 4394613.028]];
const SINIR = 0.02;
let enBuyuk = 0, hata = 0;
const kontrol = (ad, i, a, b) => { const d = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])); enBuyuk = Math.max(enBuyuk, d); if (d > SINIR) { hata++; console.log('✗ A' + (i + 1), ad, 'fark', d.toFixed(3), 'm'); } };
ITRF.forEach(([E, N], i) => {
  const [la, lo] = tmInverse(E, N, 33, ELL.grs80);
  kontrol('ITRF96-3° → WGS84 6°', i, tmForward(la, lo, 33, ELL.grs80, 0.9996), UTM6[i]);
  kontrol('ITRF96-3° → ED50 3°', i, wgsToEd50Grid(la, lo, 33), ED3[i]);
  kontrol('ITRF96-3° → ED50 6°', i, wgsToEd50Grid(la, lo, 33, 0.9996), ED6[i]);
  const [l2, o2] = ed50GridToWgs(ED3[i][0], ED3[i][1], 33); kontrol('ED50 3° → ITRF96-3°', i, tmForward(l2, o2, 33, ELL.grs80), ITRF[i]);
  const [l3, o3] = ed50GridToWgs(ED6[i][0], ED6[i][1], 33, 0.9996); kontrol('ED50 6° → ITRF96-3°', i, tmForward(l3, o3, 33, ELL.grs80), ITRF[i]);
  const [l4, o4] = tmInverse(UTM6[i][0], UTM6[i][1], 33, ELL.grs80, 0.9996); kontrol('WGS84 6° → ITRF96-3°', i, tmForward(l4, o4, 33, ELL.grs80), ITRF[i]);
});
console.log(hata ? hata + ' sapma' : 'Koordinat dönüşümü Netcad ile uyumlu', '(en büyük fark ' + (enBuyuk * 1000).toFixed(1) + ' mm)');
process.exit(hata ? 1 : 0);
