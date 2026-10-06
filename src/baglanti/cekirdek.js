// Supabase bağlantısı — programın veritabanıyla konuştuğu tek yer.
// Çevrimdışıyken her çağrı {ok:false, cevrimdisi:true} döner; program o zaman
// cihazdaki kopyayı kullanır, kimseye hata göstermez.

const URL_ = 'https://lcnsganomudmxigaqmgd.supabase.co';
const ANON = 'sb_publishable_U2WQsXUNkYAQ2aQ-f6npRA_Uhz8Yktc';
const TOKEN_KEY = 'ks-oturum';

let sb = null, yukleniyor = null;

async function istemci() {
  if (sb) return sb;
  if (!yukleniyor) {
    // Kütüphane projeyle birlikte ./vendor içinde durur; böylece internet
    // yokken de yüklenir (service worker önbelleğe alır).
    yukleniyor = new Promise((res, rej) => {
      if (window.supabase && window.supabase.createClient) return res(window.supabase);
      const s = document.createElement('script');
      s.src = new URL('./vendor/supabase.js', import.meta.url).href;
      s.onload = () => (window.supabase && window.supabase.createClient) ? res(window.supabase) : rej(new Error('yok'));
      s.onerror = () => rej(new Error('yüklenemedi'));
      document.head.appendChild(s);
    })
      .then(m => { sb = m.createClient(URL_, ANON, { auth: { persistSession: false } }); return sb; })
      .catch(() => { yukleniyor = null; return null; });
  }
  return yukleniyor;
}

export function tokenOku() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch (e) { return null; }
}
export function tokenYaz(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* depolama kapalı */ }
}

// Tek giriş noktası: fonksiyon çağırır, hatayı Türkçeleştirir, çevrimdışıyı ayırır
async function cagir(ad, arg) {
  const c = await istemci();
  if (!c) return { ok: false, cevrimdisi: true, err: 'Bağlantı kurulamadı.' };
  try {
    const { data, error } = await c.rpc(ad, arg);
    if (error) {
      const ag = /fetch|network|failed to fetch/i.test(error.message || '');
      return { ok: false, cevrimdisi: ag, err: temizle(error.message) };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, cevrimdisi: true, err: 'Bağlantı kesildi.' };
  }
}

function temizle(msg) {
  if (!msg) return 'Bilinmeyen hata.';
  // Postgres "raise exception" metinleri zaten Türkçe; teknik ön ekleri atıyoruz
  const m = String(msg).replace(/^.*?(?:ERROR|error):\s*/i, '');
  if (/duplicate key.*kullanici_ad/i.test(m)) return 'Bu kullanıcı adı başkasında var.';
  if (/kullanici_ad_bicim/i.test(m)) return 'Kullanıcı adı en az 3 karakter; küçük harf, sayı, nokta ve alt çizgi kullanın.';
  return m;
}

const tek = r => (Array.isArray(r) ? r[0] || null : r);
