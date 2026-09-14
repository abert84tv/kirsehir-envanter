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
