// Paylaşılan harita yardımcıları — harita.html ve profil.html ortak kullanır.
// Buradaki kod üç ayrı dosyada elle kopyalanmış hâldeydi; biri düzelince
// diğerleri unutuluyordu (bkz. 2026.09.15 koyu tema/uzun basış oturumu).

// Nokta ekleme: masaüstünde çift tıklama, telefonda 550 ms basılı tutma —
// parmak 14 px'den fazla kayarsa iptal olur, harita gezinmeye açık kalır.
// map.doubleClickZoom.disable() çağırmak ve çift tıklama dinleyicisini
// kurmak çağıranın işi; bu yalnızca dokunma (touch) tarafını kurar.
//   map    — Leaflet harita nesnesi
//   aktifMi — () => boolean; false dönerse basılı tutma yok sayılır
//   onNokta — (latlng) => void; 550 ms dolunca çağrılır
function ksUzunBasisKur(map, aktifMi, onNokta) {
  let t = null, x0 = 0, y0 = 0, ll = null;
  const iptal = () => { if (t) { clearTimeout(t); t = null; } };
  const el = map.getContainer();
  el.addEventListener('touchstart', ev => {
    if (ev.touches.length !== 1 || !aktifMi()) return iptal();
    const tt = ev.touches[0];
    x0 = tt.clientX; y0 = tt.clientY;
    const r = el.getBoundingClientRect();
    ll = map.containerPointToLatLng([x0 - r.left, y0 - r.top]);
    iptal();
    t = setTimeout(() => {
      t = null;
      if (ll) {
        onNokta(ll);
        if (navigator.vibrate) try { navigator.vibrate(18); } catch (e) { /* titreşim yok */ }
      }
    }, 550);
  }, { passive: true });
  el.addEventListener('touchmove', ev => {
    if (!t || !ev.touches.length) return;
    const tt = ev.touches[0];
    if (Math.abs(tt.clientX - x0) > 14 || Math.abs(tt.clientY - y0) > 14) iptal();
  }, { passive: true });
  el.addEventListener('touchend', iptal, { passive: true });
  el.addEventListener('touchcancel', iptal, { passive: true });
}


// ── Ortak harita işareti (bkz. harita-ortak.css .ksp) ──
const KSP_SVG = {
  kuyu: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg>',
  depo: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 12c2-2 4 2 6 0s4 2 6 0 3 1 4 0"/></svg>',
  ag: '<svg viewBox="0 0 24 24"><path d="M13 2 5 14h6l-1 8 8-12h-6z"/></svg>',
  ges: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  baca: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/></svg>',
  vana: '<svg viewBox="0 0 24 24"><path d="M4 6v12l8-6zM20 6v12l-8-6z"/></svg>',
  kaynak: '<svg viewBox="0 0 24 24"><path d="M12 3v9M8.5 8.5 12 12l3.5-3.5"/><path d="M4 17c3-3 5 3 8 0s5 3 8 0"/></svg>',
  memba: '<svg viewBox="0 0 24 24"><path d="M3 10h11a4 4 0 1 1 0 8h-2"/><path d="M6 7 3 10l3 3"/></svg>'
};
// tur: kuyu | depo | ag | ges | baca | vana | kaynak | memba; o: { ref, pend, fault, pasif, etiket }
function ksPin(tur, o) {
  o = o || {};
  const cls = 'ksp ' + tur + (o.ref ? ' ref' : '') + (o.pasif ? ' pasif' : (o.pend ? ' pend' : '')) + (o.fault && !o.pasif ? ' fault' : '');
  // Baca dikdörtgen çizilir ve çizimdeki adını (P1…) taşır
  const baca = tur === 'baca', ad = baca && o.etiket ? String(o.etiket).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) : '';
  const boy = baca ? [38, 22] : [28, 28];
  return L.divIcon({ className: '', iconSize: boy, iconAnchor: [boy[0] / 2, boy[1] / 2], html: '<div class="' + cls + '">' + (ad ? '<b>' + ad + '</b>' : (KSP_SVG[tur] || '')) + '</div>' });
}

// Uzaktan bakınca işaretler küçük renkli noktaya iner (yakınlaşınca simgeli hâli açılır)
function ksPinZoom(map, esik) {
  esik = esik || 12;
  const uygula = () => map.getContainer().classList.toggle('ksz-ince', map.getZoom() < esik);
  map.on('zoomend', uygula); uygula();
}

// Katman menüsündeki "Kayıt türleri" bölümü (Tümü, Kuyu, Depo … Pasifler, ISU): eskiden sayfanın üstünde süzgeç çubuğuydu.
// Seçim uygulamada durur; düğmeye basınca ana uygulamaya { ks:'suzgec', id } gider, güncel süzgeç geri 'filter' ile gelir.
const KS_TURLER = [['all', 'Tümü'], ['kuyu', 'Kuyu'], ['depo', 'Depo'], ['ag', 'AG'], ['ges', 'GES'], ['baca', 'Baca'], ['vana', 'Vana'], ['pasif', 'Pasifler'], ['kaynak', 'ISU Kaynak'], ['memba', 'ISU Memba']];
function ksTurMenu(kap) {
  if (!kap) return { guncelle() {} };
  const dugme = {};
  for (const [id, ad] of KS_TURLER) {
    const b = document.createElement('button');
    b.className = 'arac kal' + (id === 'all' ? ' k-tumu' : '');
    b.textContent = ad;
    b.onclick = e => { e.stopPropagation(); try { parent.postMessage({ ks: 'suzgec', id }, '*'); } catch (err) { /* çerçeve yok */ } };
    kap.appendChild(b); dugme[id] = b;
  }
  const tur = ['kuyu', 'depo', 'ag', 'ges', 'baca', 'vana', 'kaynak', 'memba'];
  function guncelle(f) {
    f = f || {};
    for (const [id] of KS_TURLER) {
      const ac = id === 'all' ? tur.every(t => f[t]) : id === 'pasif' ? f.pasif !== false : !!f[id];
      dugme[id].classList.toggle('on', ac);
    }
  }
  return { guncelle };
}

// Katman menüsü (Sokak / Uydu / Uydu + ad): simgeye basınca açılır, seçim yapınca ya da başka yere basınca kapanır.
//   sec(kind) — seçilen zemin için çağrılır; dönen nesnenin isaret(kind) işlevi seçili zemini işaretler.
function ksKatmanKur(sec) {
  const k = document.getElementById('katman');
  if (!k) return { isaret() {}, kapat() {} };
  const kapat = () => k.classList.remove('acik');
  const isaret = kind => k.querySelectorAll('.k-menu button[data-z]').forEach(b => b.classList.toggle('on', b.dataset.z === kind));
  document.getElementById('katman-dugme').addEventListener('click', e => {
    e.stopPropagation();
    k.classList.toggle('acik');
  });
  k.querySelectorAll('.k-menu button[data-z]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); kapat(); sec(b.dataset.z); }));
  // Harita menüsü seçenekleri: bir seçeneğe basınca menü kapanır (açma-kapama anahtarları — etiketler, hatlar — açık kalır)
  k.querySelectorAll('.k-menu button.arac').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (!b.classList.contains('kal')) kapat(); }));
  document.addEventListener('pointerdown', e => { if (!k.contains(e.target)) kapat(); });
  addEventListener('blur', kapat);
  return { isaret, kapat };
}
