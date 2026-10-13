const ELL = { grs80: { a: 6378137, f: 1 / 298.257222101 }, intl: { a: 6378388, f: 1 / 297 } };
// ED50 → WGS84/ITRF96 (ECEF'te 7 parametreli küçük açı dönüşümü, 2026-10-13): Netcad 8.6 çıktısına (Kırşehir'in beş noktası: Merkez, Kaman,
// Mucur, Çiçekdağı, Boztepe/Akpınar yöresi) en küçük karelerle uydurulmuştur. Netcad ED50_3 sonuçlarına artık ≤ 5 mm, bir noktayı dışarıda
// bırakarak tahmin hatası ≤ 13 mm (tüm ülke 3 parametreli kayma 4–5 m sapıyordu). Parametreler bu bölge için geçerlidir (il sınırı dışında kullanmayın).
// Sıra: dX dY dZ (m) · ölçek (boyutsuz) · rx ry rz (radyan); ED50 = WGS84 + fark(WGS84)
const ED50_P = [158.944123992, 107.343658818, 41.3531430016, 0.00000619703127998, -0.00000635171526592, 0.0000151946326845, -0.00000394598193027];
const ed50Fark = (x, y, z) => {
  const [dx, dy, dz, k, rx, ry, rz] = ED50_P;
  return [dx + k * x - ry * z + rz * y, dy + k * y + rx * z - rz * x, dz + k * z - rx * y + ry * x];
};
const D = Math.PI / 180;

// k0: orta meridyen ölçek katsayısı — 3° dilimde (TUREF/ITRF96, ED50 3°) 1, UTM 6° dilimde 0,9996
function tmForward(lat, lon, cm, ell, k0 = 1) {
  const { a, f } = ell, e2 = 2 * f - f * f, ep2 = e2 / (1 - e2);
  const p = lat * D, l = lon * D, l0 = cm * D;
  const N = a / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  const T = Math.tan(p) ** 2, C = ep2 * Math.cos(p) ** 2, A = (l - l0) * Math.cos(p);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * p
    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * p)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * p)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * p));
  return [500000 + k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120),
    k0 * (M + N * Math.tan(p) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720))];
}
function tmInverse(E, N0, cm, ell, k0 = 1) {
  const { a, f } = ell, e2 = 2 * f - f * f, ep2 = e2 / (1 - e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const x = (E - 500000) / k0, N = N0 / k0;
  const mu = N / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
  const C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2;
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2);
  const R1 = a * (1 - e2) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5;
  const Dd = x / N1;
  const lat = p1 - (N1 * Math.tan(p1) / R1) * (Dd * Dd / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Dd ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * Dd ** 6 / 720);
  const lon = cm * D + (Dd - (1 + 2 * T1 + C1) * Dd ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * Dd ** 5 / 120) / Math.cos(p1);
  return [lat / D, lon / D];
}
function geoToEcef(lat, lon, ell) {
  const { a, f } = ell, e2 = 2 * f - f * f, p = lat * D, l = lon * D;
  const N = a / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
  return [N * Math.cos(p) * Math.cos(l), N * Math.cos(p) * Math.sin(l), N * (1 - e2) * Math.sin(p)];
}
function ecefToGeo(x, y, z, ell) {
  const { a, f } = ell, e2 = 2 * f - f * f;
  const lon = Math.atan2(y, x), r = Math.hypot(x, y);
  let lat = Math.atan2(z, r * (1 - e2));
  for (let i = 0; i < 6; i++) {
    const N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    lat = Math.atan2(z + N * e2 * Math.sin(lat), r);
  }
  return [lat / D, lon / D];
}
// ED50 (Uluslararası 1924) ızgarası ↔ WGS84: k0 = 1 → ED50 3° dilim, k0 = 0,9996 → ED50 6° (UTM) dilim
const ed50GridToWgs = (E, N, cm, k0 = 1) => {
  const [la, lo] = tmInverse(E, N, cm, ELL.intl, k0);
  const [bx, by, bz] = geoToEcef(la, lo, ELL.intl);
  // ED50 = WGS84 + fark(WGS84): ters yönde yinelemeli çözülür (fark ~40 m, 3 yineleme mm altına iner)
  let x = bx, y = by, z = bz;
  for (let i = 0; i < 4; i++) { const d = ed50Fark(x, y, z); x = bx - d[0]; y = by - d[1]; z = bz - d[2]; }
  return ecefToGeo(x, y, z, ELL.grs80);
};
const wgsToEd50Geo = (lat, lon) => {
  const [x, y, z] = geoToEcef(lat, lon, ELL.grs80);
  const d = ed50Fark(x, y, z);
  return ecefToGeo(x + d[0], y + d[1], z + d[2], ELL.intl);
};
const wgsToEd50Grid = (lat, lon, cm, k0 = 1) => {
  const [la, lo] = wgsToEd50Geo(lat, lon);
  return tmForward(la, lo, cm, ELL.intl, k0);
};
