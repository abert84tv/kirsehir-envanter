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
export function hatMesafe(a, b) {
  const rd = x => x * Math.PI / 180;
  const dLat = rd(b[0] - a[0]), dLon = rd(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(s)));
}
export const hatKm = v => v >= 1000 ? (v / 1000).toFixed(v < 10000 ? 2 : 1) + ' km' : Math.round(v) + ' m';

const KAPALI = ['cozuldu', 'iptal'];
const HAT_KEY = 'ks-hat-katman';
const ISU_ESIK_M = 30;
const DOM_ZOOM = 12, DOM_SINIR = 260, ETIKET_ZOOM = 14;
const TUR_RENK = { kuyu: '#0071e3', depo: '#b45309', ag: '#7b3fbf', ges: '#c08a00', kaynak: '#0891b2', memba: '#15803d' };
// Kaynak/Memba/Depo referans noktaları: gerçek kayıtla (30 m) çakışanlar elenir
const ISU_KATMAN = {
  kaynak: { veri: ISU_KAYNAK, suzgec: 'kaynak', ad: 'ISU Kaynak noktası (referans)', eslesir: ['kuyu'] },
  memba: { veri: ISU_MEMBA, suzgec: 'memba', ad: 'ISU Memba noktası (referans)', eslesir: ['kuyu'] },
  depo: { veri: ISU_ISUDEPO, suzgec: 'depo', ad: 'ISU Depo noktası (referans)', eslesir: ['depo'] }
};

// o: { tikla(oge), arizaAc(f), hatTikla(h) }  — oge: { kind:'a'|'isu', tur, lat, lon, a?, isu? }
export function katmanKur(map, o) {
  o = Object.assign({ tikla() {}, arizaAc() {}, etiketTikla: null }, o || {});
  let { assets, faults } = buildAssets(DATA);
  let openFaults = new Set(faults.filter(f => !KAPALI.includes(f.status)).map(f => f.assetId));
  let sonFilter = null, wantLabels = true, hatVeri = [], hatAcik = true, base = 'street';
  try { hatAcik = localStorage.getItem(HAT_KEY) !== '0'; } catch (e) { /* depolama kapalı */ }

  // ── zeminler
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap katkıcıları', maxZoom: 19, className: 'ks-tiles', updateWhenZooming: false, keepBuffer: 1
  });
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Uydu görüntüsü: Esri, Maxar, Earthstar Geographics', maxZoom: 19, className: 'ks-sat', updateWhenZooming: false, keepBuffer: 1
  });
  const satLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Yer adları: Esri', maxZoom: 19, pane: 'shadowPane'
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
  function cizHatlar() {
    hatLayer.clearLayers();
    if (!hatAcik) return;
    for (const h of hatVeri) {
      const p = (h.noktalar || []).map(x => [+x[0], +x[1]]).filter(x => isFinite(x[0]) && isFinite(x[1]));
      if (p.length < 2) continue;
      let uz = 0;
      for (let i = 1; i < p.length; i++) uz += hatMesafe(p[i - 1], p[i]);
      const renk = HAT_REN[h.tur] || '#201e1d';
      L.polyline(p, { color: '#fff', weight: 8, opacity: .65, interactive: false }).addTo(hatLayer);
      L.polyline(p, { color: renk, weight: 4.5, opacity: .95 })
        .bindTooltip((HAT_AD[h.tur] || h.tur) + (h.kod ? ' · ' + h.kod : '') + ' · ' + hatKm(uz), { sticky: true })
        .addTo(hatLayer);
    }
  }
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
    const imza = assets.length + '|' + assets.map(a => a.id + a.type + a.status + a.sync + a.lat + a.lon).join(',').length + '|' + [...openFaults].join(',');
    if (imza === ogeImza) { ogeAcik(); gorunumGuncelle(); return; }
    ogeImza = imza;
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
  }
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
      mk = L.marker([g.lat, g.lon], { icon: ksPin(g.tur, { ref: g.kind === 'isu', pasif, pend, fault }), keyboard: false });
    }
    if (g.kind === 'a') {
      if (mod === 'e') {
        mk.bindTooltip(a.code, { permanent: true, direction: 'right', className: 'ks-lbl', offset: [18, 0], interactive: true });
        const tt = mk.getTooltip();
        if (tt) tt.on('click', () => o.tikla(g));
      } else if (mod === 'd') mk.bindTooltip(a.code, { direction: 'right', className: 'ks-lbl', offset: [18, 0] });
    } else {
      mk.bindTooltip(g.isu.ad, { direction: 'top' });
    }
    mk.on('click', () => o.tikla(g));
    return mk;
  }
  function gorunumGuncelle() {
    const z = map.getZoom(), dom = z >= DOM_ZOOM;
    const mod = dom ? (wantLabels && z >= ETIKET_ZOOM ? 'e' : 'd') : 'n';
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
    const hedef = new Set(ad.map(g => g.key));
    for (const [k, c] of canli) {
      if (!hedef.has(k) || c.mod !== mod) { goruntuKatman.removeLayer(c.mk); canli.delete(k); }
    }
    for (const g of ad) {
      if (canli.has(g.key)) continue;
      const mk = isaretYap(g, mod);
      mk.addTo(goruntuKatman);
      canli.set(g.key, { mk, mod });
    }
  }
  function plan() { clearTimeout(gz); gz = setTimeout(gorunumGuncelle, 100); }
  map.on('moveend zoomend', plan);

  function veriYaz() {
    // Arıza noktaları: ekibin sahada kaydettiği koordinat; açık arızalar kırmızı
    noktaLayer.clearLayers();
    for (const f of faults) {
      if (!f || !f.nokta || KAPALI.includes(f.status)) continue;
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
      if (Array.isArray(a)) assets = a;
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
    setEtiket(on) { wantLabels = !!on; gorunumGuncelle(); },
    etiket: () => wantLabels,
    assets: () => assets,
    bounds: () => L.latLngBounds(assets.map(a => [a.lat, a.lon])),
    durum: () => ({ canli: canli.size, oge: ogeler.length })
  };
}
