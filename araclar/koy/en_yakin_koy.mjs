// Köyü boş tesislere en yakın köyü bulur: node araclar/koy/en_yakin_koy.mjs _bos.json
import { readFileSync } from 'fs';
import { YERLESIM } from '../../koyler.js';
const bos = JSON.parse(readFileSync(new URL(process.argv[2], import.meta.url)));
const rd = x => x * Math.PI / 180;
const m = (a, b, c, d) => 2 * 6371008.8 * Math.asin(Math.sqrt(Math.sin(rd(c - a) / 2) ** 2 + Math.cos(rd(a)) * Math.cos(rd(c)) * Math.sin(rd(d - b) / 2) ** 2));
const dugum = YERLESIM.filter(r => r[3] === 'YKOY' || r[3] === 'BCK')
  .map(r => ({ ad: String(r[0]).replace(/_?Mrk ?(bucak|köy)$/i, ' merkez').replace(/_/g, ' ').trim(), lat: r[1], lon: r[2], ilce: r[4] || '' }));
const out = bos.map(([id, ilce, lat, lon]) => {
  const s = dugum.map(v => ({ ...v, km: m(lat, lon, v.lat, v.lon) / 1000 })).sort((x, y) => x.km - y.km);
  return { id, ilce, k: s[0].ad, kilce: s[0].ilce, km: +s[0].km.toFixed(2), ikinci: s[1].ad, km2: +s[1].km.toFixed(2) };
});
console.log(JSON.stringify(out));
