// Çevrimdışı çalışma: uygulama kabuğunu cihaza kaydeder, internet yokken oradan açar.
// Veritabanı (Supabase) istekleri buradan GEÇMEZ; kayıt kuyruğu uygulamanın kendi içindedir.
const SURUM = 'ks-2026.10.06-122';
const KABUK = SURUM + '-kabuk';
const HARITA = 'ks-harita-karo';
const KARO_LIMIT = 900;

const ON_YUKLE = [
  '/', '/harita', '/hat', '/profil',
  '/support.js', '/supabase-baglanti.js', '/kirsehir-data.js', '/envanter.js', '/koyler.js', '/cihaz-depo.js',
  '/kuyular.js', '/isu-katmanlar.js', '/harita-ortak.js', '/harita-ortak.css',
  '/_ds/modernist-803f2872-3d47-4f54-a490-6b99844264cd/styles.css',
  '/_ds/modernist-803f2872-3d47-4f54-a490-6b99844264cd/_ds_bundle.js',
  '/vendor/react.production.min.js', '/vendor/react-dom.production.min.js',
  '/vendor/supabase.js', '/vendor/leaflet.js', '/vendor/leaflet.css',
  '/vendor/images/layers.png', '/vendor/images/layers-2x.png', '/vendor/images/marker-icon.png',
  '/vendor/images/marker-icon-2x.png', '/vendor/images/marker-shadow.png',
  '/manifest.webmanifest', '/icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(KABUK);
    // biri inmese bile kurulum bozulmasın
    await Promise.all(ON_YUKLE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const ad of await caches.keys()) {
      if (ad !== KABUK && ad !== HARITA) await caches.delete(ad);
    }
    await self.clients.claim();
  })());
});

function zamanAsimli(istek, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('zaman aşımı')), ms);
    fetch(istek).then(r => { clearTimeout(t); res(r); }, e => { clearTimeout(t); rej(e); });
  });
}

// Önce ağ (güncel kalsın), olmazsa cihazdaki kopya
async function agOnce(istek, ms) {
  const c = await caches.open(KABUK);
  try {
    const r = await zamanAsimli(istek, ms);
    if (r && r.ok) c.put(istek, r.clone()).catch(() => {});
    return r;
  } catch (e) {
    let k = await c.match(istek, { ignoreSearch: true });
    // /harita.html ile /harita aynı sayfadır; önbellekte sade adla durur
    if (!k) {
      const u = new URL(istek.url);
      if (/\.html$/.test(u.pathname)) {
        const sade = u.pathname.replace(/\.html$/, '').replace(/^\/index$/, '/') || '/';
        k = await c.match(new URL(sade, u.origin).href, { ignoreSearch: true });
      }
    }
    if (k) return k;
    throw e;
  }
}

async function karo(istek) {
  const c = await caches.open(HARITA);
  const k = await c.match(istek);
  if (k) return k;
  try {
    const r = await fetch(istek);
    if (r && (r.ok || r.type === 'opaque')) {
      c.put(istek, r.clone()).then(async () => {
        const anahtarlar = await c.keys();
        if (anahtarlar.length > KARO_LIMIT) {
          for (const a of anahtarlar.slice(0, anahtarlar.length - KARO_LIMIT)) await c.delete(a);
        }
      }).catch(() => {});
    }
    return r;
  } catch (e) {
    return Response.error();
  }
}

async function ikincil(istek) {
  const c = await caches.open(KABUK);
  const k = await c.match(istek);
  const ag = fetch(istek).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(istek, r.clone()).catch(() => {}); return r; }).catch(() => null);
  return k || (await ag) || Response.error();
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
  // veritabanı, adres arama, yol tarifi vb.: kendi yolunda gitsin
  if (/supabase\.co$/.test(u.hostname)) return;
  if (/tile\.openstreetmap\.org$|arcgisonline\.com$/.test(u.hostname)) { e.respondWith(karo(r)); return; }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { e.respondWith(ikincil(r)); return; }
  if (u.origin !== self.location.origin) return;
  if (u.pathname === '/sw.js') return;
  // sayfalar ve yazılım dosyaları: önce ağ (3 sn), olmazsa cihazdaki kopya
  e.respondWith(agOnce(r, r.mode === 'navigate' ? 3000 : 4000).catch(() => Response.error()));
});

self.addEventListener('message', e => {
  if (e.data === 'guncelle') self.skipWaiting();
});
