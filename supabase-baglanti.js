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
    yukleniyor = import('https://esm.sh/@supabase/supabase-js@2')
      .then(m => { sb = m.createClient(URL_, ANON, { auth: { persistSession: false } }); return sb; })
      .catch(() => null);
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

// ── oturum
export async function giris(kullaniciAd, sifre, cihaz) {
  const r = await cagir('giris', { p_ad: kullaniciAd, p_sifre: sifre, p_cihaz: cihaz || null });
  if (!r.ok) return r;
  const k = tek(r.data);
  if (!k) return { ok: false, err: 'Kullanıcı adı veya şifre hatalı.' };
  tokenYaz(k.token);
  return { ok: true, data: k };
}

export async function oturumAc(token) {
  const t = token || tokenOku();
  if (!t) return { ok: false, err: 'Kayıtlı oturum yok.' };
  const r = await cagir('oturum_ac', { p_token: t });
  if (!r.ok) return r;
  const k = tek(r.data);
  if (!k) { tokenYaz(null); return { ok: false, err: 'Oturum geçersiz.' }; }
  return { ok: true, data: { ...k, token: t } };
}

export async function cikis() {
  const t = tokenOku();
  if (t) await cagir('cikis', { p_token: t });
  tokenYaz(null);
  return { ok: true };
}

export async function sifreDegistir(yeni) {
  return cagir('sifre_degistir', { p_token: tokenOku(), p_yeni: yeni });
}

// ── kullanıcılar
export async function kullaniciListesi() {
  return cagir('kullanici_listesi', { p_token: tokenOku() });
}
export async function kullaniciEkle(k) {
  return cagir('kullanici_ekle', {
    p_token: tokenOku(), p_ad: k.name, p_kullanici_ad: k.user, p_rol: k.role,
    p_sifre: k.pw, p_unvan: k.unvan || null, p_tel: k.tel || null, p_bolge: k.bolge || null
  });
}
export async function kullaniciGuncelle(k) {
  return cagir('kullanici_guncelle', {
    p_token: tokenOku(), p_id: k.id, p_ad: k.name, p_kullanici_ad: k.user, p_rol: k.role,
    p_unvan: k.unvan || null, p_tel: k.tel || null, p_bolge: k.bolge || null
  });
}
export async function sifreSifirla(id, sifre) {
  return cagir('sifre_sifirla', { p_token: tokenOku(), p_id: id, p_sifre: sifre });
}
export async function hesapDurum(id, aktif) {
  return cagir('hesap_durum', { p_token: tokenOku(), p_id: id, p_aktif: aktif });
}
export async function kullaniciSil(id) {
  return cagir('kullanici_sil', { p_token: tokenOku(), p_id: id });
}

// Veritabanı satırını programın kullandığı biçime çevirir
export function suret(r) {
  return {
    id: 'db' + r.id, dbId: r.id, name: r.ad, user: r.kullanici_ad, role: r.rol,
    unvan: r.unvan || '', tel: r.tel || '', bolge: r.bolge || '', ekip: r.ekip || null,
    crew: r.ekip || null, aktif: r.aktif !== false, mustChange: !!r.ilk_giris,
    eklendi: r.eklendi || null, sonGiris: r.son_giris || null
  };
}
