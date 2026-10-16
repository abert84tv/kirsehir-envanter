// Ortak harita katmanları — Envanter haritası (harita.html) ve Hat Kesiti (profil.html)
// BİREBİR aynı verileri aynı biçimde gösterir: zemin (sokak/uydu/uydu+ad), kayıt işaretleri,
// ISU referans noktaları, hat güzergâhları, arıza noktaları, süzgeç ve etiketler.
// İki sayfa yalnızca "tıklayınca ne olsun" kısmında ayrışır (o.tikla).
//
// Performans (2026.10.06): yalnız ekrandaki işaretler çizilir. Uzaktan (zoom < 12)
// canvas üzerinde küçük renkli noktalar; yakında en çok 260 simgeli işaret; etiketler 14'ten sonra.
import * as DATA from './kirsehir-data.js';
import { buildAssets, TYPES } from './envanter.js';
import { ISU_KAYNAK, ISU_MEMBA, ISU_ISUDEPO } from './isu-katmanlar.js';

export const HAT_REN = { terfi: '#0071e3', isale: '#201e1d', sebeke: '#6c6763', ag: '#1b6ef3', og: '#7b3fbf', dc: '#c08a00' };
export const HAT_AD = { terfi: 'Terfi hattı', isale: 'İsale hattı', sebeke: 'Şebeke hattı', ag: 'AG enerji hattı', og: 'OG enerji hattı', dc: 'GES DC hattı' };
// Hat grupları (Hat 1, Hat 2 … ya da proje adı): her grup kendi rengiyle çizilir.
// "Hat N" için N'inci renk (Hat 1 mavi, Hat 2 kırmızı …), başka adlar için addan türetilen renk.
const GRUP_PALET = ['#1b6ef3', '#e03131', '#2f9e44', '#f08c00', '#7048e8', '#0c8599', '#c2255c', '#5c940d', '#e8590c', '#495057'];
export function grupRenk(ad) {
  if (!ad) return null;
  if (/^ana boru$/i.test(ad)) return '#201e1d';
  const m = /(\d+)\s*$/.exec(ad);
  let i = 0;
  if (m) i = parseInt(m[1], 10) - 1;
  else for (const c of ad) i = (i * 31 + c.charCodeAt(0)) >>> 0;
  return GRUP_PALET[((i % GRUP_PALET.length) + GRUP_PALET.length) % GRUP_PALET.length];
}
// Geçerli konum: null / boş / sayı olmayan değer harita çizimini tümden bozar (Leaflet projeksiyonu
// null enlemde hata verir ve zoom sonrası bütün katmanlar çizilmez) — bu yüzden sıkı denetlenir.
export function konumGecerli(lat, lon) {
  const sayi = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);
  return sayi(lat) && sayi(lon) && Math.abs(+lat) <= 90 && Math.abs(+lon) <= 180;
}
// Hızlı 32 bit özet (FNV-1a): "veri değişti mi" denetimi için
function ozet(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + s.length;
}
export function hatMesafe(a, b) {
  const rd = x => x * Math.PI / 180;
  const dLat = rd(b[0] - a[0]), dLon = rd(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(s)));
}
export const hatKm = v => v >= 1000 ? (v / 1000).toFixed(v < 10000 ? 2 : 1) + ' km' : Math.round(v) + ' m';

const KAPALI = ['cozuldu', 'iptal'];
const HAT_KEY = 'ks-hat-katman';
const HAT_GIZLI_KEY = 'ks-hat-gizli';
const ISU_ESIK_M = 30;
const DOM_ZOOM = 12, DOM_SINIR = 260, ETIKET_ZOOM = 14;
const TUR_RENK = { kuyu: '#0071e3', depo: '#b45309', ag: '#7b3fbf', ges: '#c08a00', baca: '#0e8a7d', vana: '#d6336c', kaynak: '#0891b2', memba: '#15803d' };
// Kaynak/Memba/Depo referans noktaları: gerçek kayıtla (30 m) çakışanlar elenir
const ISU_KATMAN = {
  kaynak: { veri: ISU_KAYNAK, suzgec: 'kaynak', ad: 'ISU Kaynak noktası (referans)', eslesir: ['kuyu'] },
  memba: { veri: ISU_MEMBA, suzgec: 'memba', ad: 'ISU Memba noktası (referans)', eslesir: ['kuyu'] },
  depo: { veri: ISU_ISUDEPO, suzgec: 'depo', ad: 'ISU Depo noktası (referans)', eslesir: ['depo'] }
};

// o: { tikla(oge), arizaAc(f), hatTikla(h) }  — oge: { kind:'a'|'isu', tur, lat, lon, a?, isu? }
export function katmanKur(map, o) {
  o = Object.assign({ tikla() {}, arizaAc() {}, etiketTikla: null, hata: null }, o || {});
  let { assets, faults } = buildAssets(DATA);
  let openFaults = new Set(faults.filter(f => !KAPALI.includes(f.status)).map(f => f.assetId));
  let sonFilter = null, wantLabels = true, hatVeri = [], hatAcik = true, base = 'street';
  let hatGizli = new Set();
  try { hatAcik = localStorage.getItem(HAT_KEY) !== '0'; } catch (e) { /* depolama kapalı */ }
  try { hatGizli = new Set(JSON.parse(localStorage.getItem(HAT_GIZLI_KEY) || '[]')); } catch (e) { /* depolama kapalı */ }

  // ── zeminler
  // Harita yarım zoom basamağıyla (14,5 gibi) çalışır; Leaflet yarım basamakta bir üst karo seviyesini alır ve
  // ekranı kaplayan karo sayısı yaklaşık iki katına çıkar. Uydu karoları (büyük dosyalar) yarım basamakta
  // bir alt seviyeden alınır: karo sayısı ~yarıya iner, görüntü çok az yumuşar.
  const SatKaro = L.TileLayer.extend({
    _setView(c, z, a, b) {
      L.TileLayer.prototype._setView.call(this, c, Math.floor(z), a, b);
      this._setZoomTransforms(c, z);
    }
  });
  // updateWhenIdle:false — telefonda Leaflet varsayılanı karoları yalnız kaydırma bitince yükler; kaydırırken de yüklensin
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap katkıcıları', maxZoom: 21, maxNativeZoom: 19, className: 'ks-tiles', updateWhenZooming: false, updateWhenIdle: false, updateInterval: 100, keepBuffer: 1
  });
  const sat = new SatKaro('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Uydu görüntüsü: Esri, Maxar, Earthstar Geographics', maxZoom: 21, maxNativeZoom: 18, className: 'ks-sat', updateWhenZooming: false, updateWhenIdle: false, updateInterval: 100, keepBuffer: 1
  });
  const satLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Yer adları: Esri', maxZoom: 21, maxNativeZoom: 17, pane: 'shadowPane', updateWhenIdle: false, updateInterval: 100
  });
  street.addTo(map);
  function setBase(kind) {
    base = kind;
    street.remove(); sat.remove(); satLabels.remove();
    if (kind === 'street') street.addTo(map);
    else { sat.addTo(map); if (kind === 'hyb') satLabels.addTo(map); }
  }

  // ── hat güzergâhları
  const hatLayer = L.layerGroup().addTo(map);
  // Gizleme anahtarları: "kod|*" köyün (projenin) bütün hatları, "kod|Hat 1" tek hat grubu
  const hatGizliMi = h => hatGizli.has((h.kod || '') + '|*') || hatGizli.has((h.kod || '') + '|' + (h.grup || 'Hat'));
  // Uzaktan ince çizgi (yüzlerce hat birbirine karışmasın), yaklaştıkça kalınlaşır
  const hatKova = () => { const z = map.getZoom(); return z < 12 ? 0 : (z < 14 ? 1 : 2); };
  let sonKova = -1;
  function cizHatlar() {
    hatLayer.clearLayers();
    sonKova = hatKova();
    if (!hatAcik) return;
    const kal = [{ w: 2.5, halo: 0 }, { w: 3.5, halo: 6 }, { w: 4.5, halo: 8 }][sonKova];
    for (const h of hatVeri) {
      if (hatGizliMi(h)) continue;
      try {
        const p = (h.noktalar || []).filter(x => x && konumGecerli(x[0], x[1])).map(x => [+x[0], +x[1]]);
        if (p.length < 2) continue;
        let uz = 0;
        for (let i = 1; i < p.length; i++) uz += hatMesafe(p[i - 1], p[i]);
        const renk = grupRenk(h.grup) || HAT_REN[h.tur] || '#201e1d';
        if (kal.halo) L.polyline(p, { color: '#fff', weight: kal.halo, opacity: .65, interactive: false }).addTo(hatLayer);
        const yazi = (h.koy ? h.koy + ' · ' : '') + (h.grup ? h.grup + ' · ' : '') + (HAT_AD[h.tur] || h.tur) + (h.kod ? ' · ' + h.kod : '') + (h.cap ? ' · Ø' + h.cap : '') + ' · ' + hatKm(uz);
        // Tooltip ilk üzerine gelişte kurulur: yüzlerce hat için baştan yüzlerce tooltip nesnesi üretilmez
        L.polyline(p, { color: renk, weight: kal.w, opacity: .95, smoothFactor: 1.5 })
          .once('mouseover', function (ev) { this.bindTooltip(yazi, { sticky: true }).openTooltip(ev.latlng); })
          .addTo(hatLayer);
      } catch (e) { if (typeof o.hata === 'function') o.hata('Hat çizilemedi: ' + (e && e.message || e)); }
    }
  }
  map.on('zoomend', () => { if (hatKova() !== sonKova) cizHatlar(); });
  cizHatlar();

  // ── görünüm yöneticisi
  const goruntuKatman = L.layerGroup().addTo(map);
  const noktaLayer = L.layerGroup().addTo(map);
  let ogeler = [], canli = new Map(), ogeImza = '', gz = null;

  function ogeAcik() {
    const f = sonFilter;
    for (const g of ogeler) {
      g.on = g.kind === 'a'
        ? (!f || (!!f[g.tur] && (f.pasif !== false || g.a.status !== 'pasif')))
        : (!!f && !!f[g.isu.suzgec]);
    }
  }
  function ogeleriKur() {
    // İmza gerçek bir özettir (eskiden yalnız uzunluktu: konumun son hanesi ya da adı değişince işaret eski yerinde kalıyordu)
    const imza = assets.length + '|' + ozet(assets.map(a => [a.id, a.type, a.status, a.sync, a.lat, a.lon, a.code, a.village, a.district, a.d && a.d.ad].join('~')).join('|') + '#' + [...openFaults].join(','));
    if (imza === ogeImza) { ogeAcik(); gorunumGuncelle(); return; }
    ogeImza = '';
    ogeler = [];
    for (const a of assets) ogeler.push({ key: 'a' + a.id, kind: 'a', tur: a.type, lat: a.lat, lon: a.lon, a });
    for (const [ad, isu] of Object.entries(ISU_KATMAN)) {
      const gercekler = assets.filter(a => isu.eslesir.includes(a.type)).map(a => [a.lat, a.lon]);
      for (const [lat, lon] of isu.veri) {
        if (gercekler.some(g => hatMesafe([lat, lon], g) < ISU_ESIK_M)) continue;
        ogeler.push({ key: 'i' + ad + lat + ',' + lon, kind: 'isu', tur: ad, lat, lon, isu });
      }
    }
    goruntuKatman.clearLayers(); canli.clear();
    ogeAcik();
    gorunumGuncelle();
    ogeImza = imza;
  }
  // Etiket iki satır: kod ve altında köy · ilçe (köyü yazılmamış kayıtta yalnız ilçe)
  const kacis = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const etiketHtml = a => '<span class="ks-l1">' + kacis(a.code) + '</span><span class="ks-l2">' + kacis(a.village ? a.village + ' · ' + (a.district || '') : (a.district || '')) + '</span>';
  function isaretYap(g, mod) {
    const a = g.a;
    const pasif = g.kind === 'a' && a.status === 'pasif', pend = g.kind === 'a' && a.sync === 'pending';
    const fault = g.kind === 'a' && openFaults.has(a.id);
    let mk;
    if (mod === 'n') {
      mk = L.circleMarker([g.lat, g.lon], {
        radius: g.kind === 'a' ? 5 : 3, weight: fault ? 2.5 : 1.5, color: fault ? '#d70015' : '#fff',
        fillColor: TUR_RENK[g.tur] || '#0071e3', fillOpacity: pasif ? .35 : .95
      });
    } else {
      mk = L.marker([g.lat, g.lon], { icon: ksPin(g.tur, { ref: g.kind === 'isu', pasif, pend, fault, etiket: g.kind === 'a' && a.d ? a.d.ad : '' }), keyboard: false });
    }
    if (g.kind === 'a') {
      if (mod === 'e') {
        mk.bindTooltip(etiketHtml(a), { permanent: true, direction: 'right', className: 'ks-lbl', offset: [18, 0], interactive: true });
        const tt = mk.getTooltip();
        if (tt) tt.on('click', () => o.tikla(g));
      } else if (mod === 'd') mk.bindTooltip(etiketHtml(a), { direction: 'right', className: 'ks-lbl', offset: [18, 0] });
    } else {
      mk.bindTooltip(g.isu.ad, { direction: 'top' });
    }
    mk.on('click', () => o.tikla(g));
    return mk;
  }
  function gorunumGuncelle() {
    const z = map.getZoom(), dom = z >= DOM_ZOOM;
    let mod = dom ? (wantLabels && z >= ETIKET_ZOOM ? 'e' : 'd') : 'n';
    const b = map.getBounds().pad(dom ? .15 : .3), mrk = map.getCenter();
    let ad = [];
    for (const g of ogeler) {
      if (!g.on || (g.kind === 'isu' && !dom)) continue;
      if (b.contains([g.lat, g.lon])) ad.push(g);
    }
    if (dom && ad.length > DOM_SINIR) {
      ad.forEach(g => { g._d = (g.lat - mrk.lat) ** 2 + (g.lon - mrk.lng) ** 2; });
      ad.sort((x, y) => x._d - y._d);
      ad.length = DOM_SINIR;
    }
    // Kalıcı etiket yüzlerce DOM düğümü demek: 80'den fazla işaret varsa etiketler üzerine gelince açılır
    if (mod === 'e' && ad.length > 80) mod = 'd';
    const hedef = new Set(ad.map(g => g.key));
    for (const [k, c] of canli) {
      if (!hedef.has(k) || c.mod !== mod) { goruntuKatman.removeLayer(c.mk); canli.delete(k); }
    }
    for (const g of ad) {
      if (canli.has(g.key)) continue;
      try {
        const mk = isaretYap(g, mod);
        mk.addTo(goruntuKatman);
        canli.set(g.key, { mk, mod });
      } catch (e) { if (typeof o.hata === 'function') o.hata('İşaret çizilemedi (' + (g.a ? g.a.code : g.key) + '): ' + (e && e.message || e)); }
    }
  }
  function plan() { clearTimeout(gz); gz = setTimeout(gorunumGuncelle, 100); }
  map.on('moveend zoomend', plan);

  function veriYaz() {
    // Arıza noktaları: ekibin sahada kaydettiği koordinat; açık arızalar kırmızı
    noktaLayer.clearLayers();
    for (const f of faults) {
      if (!f || !f.nokta || !konumGecerli(f.nokta.lat, f.nokta.lon) || KAPALI.includes(f.status)) continue;
      const yer = f.koy ? f.koy + (f.district ? ' · ' + f.district : '') : (f.district || '');
      L.circleMarker([f.nokta.lat, f.nokta.lon], { radius: 9, color: '#fff', weight: 2.5, fillColor: '#d70015', fillOpacity: .95 })
        .bindPopup(`<b>${f.no || 'Arıza'}</b><br>${f.type || ''}<br>${yer}` +
          `<br><i>Arıza noktası${f.noktaDogruluk != null ? ' · ±' + f.noktaDogruluk + ' m' : ''}</i>`)
        .on('click', () => o.arizaAc(f))
        .addTo(noktaLayer);
    }
    ogeleriKur();
  }
  veriYaz();

  return {
    TYPES,
    setBase, base: () => base,
    setData(a, f) {
      if (Array.isArray(a)) assets = a.filter(x => x && konumGecerli(x.lat, x.lon)).map(x => (typeof x.lat === 'number' && typeof x.lon === 'number') ? x : { ...x, lat: +x.lat, lon: +x.lon });
      if (Array.isArray(f)) { faults = f; openFaults = new Set(faults.filter(x => !KAPALI.includes(x.status)).map(x => x.assetId)); }
      veriYaz();
    },
    setFilter(f) { sonFilter = f; ogeAcik(); gorunumGuncelle(); },
    setHat(l) { hatVeri = Array.isArray(l) ? l : []; cizHatlar(); },
    hatKatman(on) {
      hatAcik = !!on;
      try { localStorage.setItem(HAT_KEY, hatAcik ? '1' : '0'); } catch (e) { /* depolama kapalı */ }
      cizHatlar();
    },
    hatAcik: () => hatAcik,
    // Hat projeleri (köy/tesis başına): { kod, ad, n, uz, bbox, acik, gruplar:[{ad, renk, n, uz, acik}] }
    hatProjeleri() {
      const pr = new Map();
      for (const h of hatVeri) {
        const p = (h.noktalar || []).filter(x => x && konumGecerli(x[0], x[1])).map(x => [+x[0], +x[1]]);
        if (p.length < 2) continue;
        let uz = 0; for (let i = 1; i < p.length; i++) uz += hatMesafe(p[i - 1], p[i]);
        const kod = h.kod || '?';
        const x = pr.get(kod) || { kod, ad: h.koy || kod, n: 0, uz: 0, s: 90, w: 180, nn: -90, e: -180, gr: new Map() };
        for (const q of p) { x.s = Math.min(x.s, q[0]); x.nn = Math.max(x.nn, q[0]); x.w = Math.min(x.w, q[1]); x.e = Math.max(x.e, q[1]); }
        x.n++; x.uz += uz;
        const gk = h.grup || 'Hat';
        const g = x.gr.get(gk) || { ad: gk, renk: grupRenk(h.grup) || HAT_REN[h.tur] || '#201e1d', n: 0, uz: 0, acik: !hatGizli.has(kod + '|' + gk) };
        g.n++; g.uz += uz; x.gr.set(gk, g);
        pr.set(kod, x);
      }
      const dogal = (a, b) => String(a.ad).localeCompare(String(b.ad), 'tr', { numeric: true });
      return [...pr.values()].map(x => ({ kod: x.kod, ad: x.ad, n: x.n, uz: x.uz, bbox: [[x.s, x.w], [x.nn, x.e]],
        acik: !hatGizli.has(x.kod + '|*'), gruplar: [...x.gr.values()].sort(dogal) })).sort(dogal);
    },
    hatGizleYaz() { try { localStorage.setItem(HAT_GIZLI_KEY, JSON.stringify([...hatGizli])); } catch (e) { /* depolama kapalı */ } cizHatlar(); },
    projeAc(kod, on) { if (on) hatGizli.delete(kod + '|*'); else hatGizli.add(kod + '|*'); this.hatGizleYaz(); },
    grupAc(kod, ad, on) { if (on) hatGizli.delete(kod + '|' + ad); else hatGizli.add(kod + '|' + ad); this.hatGizleYaz(); },
    setEtiket(on) { wantLabels = !!on; gorunumGuncelle(); },
    etiket: () => wantLabels,
    assets: () => assets,
    bounds: () => L.latLngBounds(assets.map(a => [a.lat, a.lon])),
    durum: () => ({ canli: canli.size, oge: ogeler.length })
  };
}
