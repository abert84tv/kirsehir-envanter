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

// ── ortak veri: tesis, arıza, deneme, saha notu
const TUR_KOD = { kuyu: 'kuyu', depo: 'depo', ag: 'ag', ges: 'ges' };

// Veritabanı tesis satırı → programın kullandığı biçim
export function tesisSuret(r) {
  const v = r.veri || {};
  return {
    id: 't' + r.id, dbId: r.id, surum: r.surum,
    type: TUR_KOD[r.tur] || 'kuyu', code: r.kod, status: r.durum,
    district: r.ilce, village: r.koy || '',
    lat: r.lat, lon: r.lon, coordApprox: !!r.konum_yaklasik,
    coordSource: r.kaynak || '', source: r.kaynak || '',
    year: r.yapim_yili || '', barkod: r.barkod || '', direkBarkod: r.direk_barkod || '',
    photos: v.photos || 0, sync: 'synced', d: v.d || v || {},
    yazilabilir: r.yazilabilir !== false,
    olusturan: r.olusturan, olusturuldu: r.olusturuldu,
    guncelleyen: r.guncelleyen, guncellendi: r.guncellendi
  };
}

export function arizaSuret(r) {
  return {
    id: 'f' + r.id, dbId: r.id, no: r.no, assetId: 't' + r.tesis_id,
    tesisDbId: r.tesis_id, district: r.ilce, type: r.tur,
    priority: r.oncelik, status: r.durum, crew: r.ekip || '',
    desc: r.aciklama || '', malzeme: r.malzeme || [], maliyet: r.maliyet,
    reporter: r.acan, opened: r.acildi, closer: r.kapatan, closed: r.kapandi,
    sync: 'synced', yazilabilir: r.yazilabilir !== false
  };
}

export async function tesisListesi() { return cagir('tesis_listesi', { p_token: tokenOku() }); }
export async function arizaListesi() { return cagir('ariza_listesi', { p_token: tokenOku() }); }
export async function denemeListesi() { return cagir('deneme_listesi', { p_token: tokenOku() }); }
export async function notListesi() { return cagir('not_listesi', { p_token: tokenOku() }); }
export async function copListesi() { return cagir('cop_listesi', { p_token: tokenOku() }); }

export async function tesisKaydet(a) {
  return cagir('tesis_kaydet', {
    p_token: tokenOku(), p_id: a.dbId || null, p_kod: a.code,
    p_tur: a.type, p_durum: a.status || 'aktif',
    p_ilce: a.district, p_koy: a.village || null,
    p_lat: a.lat, p_lon: a.lon,
    p_yapim_yili: a.year ? parseInt(a.year, 10) || null : null,
    p_barkod: a.barkod || null, p_direk_barkod: a.direkBarkod || null,
    p_veri: { d: a.d || {}, photos: a.photos || 0 },
    p_surum: a.surum || null
  });
}
export async function tesisSil(dbId)    { return cagir('tesis_sil', { p_token: tokenOku(), p_id: dbId }); }
export async function tesisGeriAl(dbId) { return cagir('tesis_geri_al', { p_token: tokenOku(), p_id: dbId }); }

export async function arizaKaydet(f) {
  return cagir('ariza_kaydet', {
    p_token: tokenOku(), p_id: f.dbId || null, p_no: f.no,
    p_tesis_id: f.tesisDbId, p_tur: f.type,
    p_oncelik: f.priority || 'Normal', p_durum: f.status || 'acik',
    p_ekip: f.crew || null, p_aciklama: f.desc || null,
    p_malzeme: f.malzeme || [], p_maliyet: f.maliyet ?? null
  });
}
export async function denemeEkle(d) {
  return cagir('deneme_ekle', {
    p_token: tokenOku(), p_tesis_id: d.tesisDbId, p_tarih: d.tarih,
    p_statik: d.statik ?? null, p_dinamik: d.dinamik ?? null,
    p_debi: d.debi ?? null, p_sure: d.sure ?? null, p_not: d.not || null
  });
}
export async function notEkle(tesisDbId, metin) {
  return cagir('not_ekle', { p_token: tokenOku(), p_tesis_id: tesisDbId, p_metin: metin });
}

// ── fotoğraf
const BUCKET = 'fotograflar';

// Telefon kamerası 4-5 MB kare üretir; yüklemeden önce burada küçültülür.
// Uzun kenar 1600 px, JPEG %80 → tipik 150-250 KB, ekranda ve raporda fark edilmez.
export async function kucult(file, uzunKenar = 1600, kalite = 0.8) {
  const bitmap = await (window.createImageBitmap
    ? createImageBitmap(file)
    : new Promise((ok, no) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.onerror = no;
        img.src = URL.createObjectURL(file);
      }));
  const w = bitmap.width, h = bitmap.height;
  const o = Math.min(1, uzunKenar / Math.max(w, h));
  const cw = Math.round(w * o), ch = Math.round(h * o);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(bitmap, 0, 0, cw, ch);
  if (bitmap.close) bitmap.close();
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', kalite));
  return { blob, w: cw, h: ch, boyut: blob ? blob.size : 0 };
}

export function fotoAdres(anahtar) {
  return `${URL_}/storage/v1/object/public/${BUCKET}/${anahtar}`;
}

export async function fotoYukle(file, tesisDbId, kod, aciklama) {
  const c = await istemci();
  if (!c) return { ok: false, cevrimdisi: true, err: 'Bağlantı kurulamadı.' };
  let k;
  try { k = await kucult(file); } catch (e) { return { ok: false, err: 'Fotoğraf okunamadı — başka bir kare deneyin.' }; }
  if (!k.blob) return { ok: false, err: 'Fotoğraf dönüştürülemedi.' };
  const anahtar = `${kod || 'tesis'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  try {
    const { error } = await c.storage.from(BUCKET).upload(anahtar, k.blob, {
      contentType: 'image/jpeg', cacheControl: '31536000', upsert: false
    });
    if (error) {
      const ag = /fetch|network|failed/i.test(error.message || '');
      return { ok: false, cevrimdisi: ag, err: temizle(error.message) };
    }
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Yükleme kesildi.' }; }
  const r = await cagir('foto_ekle', {
    p_token: tokenOku(), p_tesis_id: tesisDbId, p_adres: anahtar,
    p_boyut: k.boyut, p_aciklama: aciklama || null, p_ariza_id: null
  });
  if (!r.ok) { try { await c.storage.from(BUCKET).remove([anahtar]); } catch (e) {} return r; }
  return { ok: true, data: { id: r.data, anahtar, url: fotoAdres(anahtar), boyut: k.boyut, w: k.w, h: k.h } };
}

// Sesli notlar fotoğraflarla aynı depoda; ayıran tek şey tur sütunu
export async function sesYukle(blob, tesisDbId, kod, saniye, aciklama) {
  const c = await istemci();
  if (!c) return { ok: false, cevrimdisi: true, err: 'Bağlantı kurulamadı.' };
  const uzanti = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
  const anahtar = `${kod || 'tesis'}/ses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${uzanti}`;
  try {
    const { error } = await c.storage.from(BUCKET).upload(anahtar, blob, {
      contentType: blob.type || 'audio/webm', cacheControl: '31536000', upsert: false
    });
    if (error) {
      const ag = /fetch|network|failed/i.test(error.message || '');
      return { ok: false, cevrimdisi: ag, err: temizle(error.message) };
    }
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Yükleme kesildi.' }; }
  const r = await cagir('ses_ekle', {
    p_token: tokenOku(), p_tesis_id: tesisDbId, p_adres: anahtar,
    p_boyut: blob.size, p_sure: saniye || null, p_aciklama: aciklama || null
  });
  if (!r.ok) { try { await c.storage.from(BUCKET).remove([anahtar]); } catch (e) {} return r; }
  return { ok: true, data: { id: r.data, anahtar, url: fotoAdres(anahtar) } };
}

export async function sesListesi(tesisDbId) {
  const r = await cagir('ek_listesi', { p_token: tokenOku(), p_tesis_id: tesisDbId ?? null });
  if (!r.ok) return r;
  return { ok: true, data: (r.data || []).filter(f => f.tur === 'ses').map(f => ({
    id: f.id, anahtar: f.adres, url: fotoAdres(f.adres), sure: f.sure,
    boyut: f.boyut, yukleyen: f.yukleyen, yuklendi: f.yuklendi,
    yazilabilir: f.yazilabilir !== false
  })) };
}

export async function fotoListesi(tesisDbId) {
  const r = await cagir('foto_listesi', { p_token: tokenOku(), p_tesis_id: tesisDbId ?? null });
  if (!r.ok) return r;
  return { ok: true, data: (r.data || []).map(f => ({
    id: f.id, tesisDbId: f.tesis_id, anahtar: f.adres, url: fotoAdres(f.adres),
    aciklama: f.aciklama || '', boyut: f.boyut, yukleyen: f.yukleyen,
    yuklendi: f.yuklendi, yazilabilir: f.yazilabilir !== false
  })) };
}

export async function fotoSil(id) {
  const r = await cagir('foto_sil', { p_token: tokenOku(), p_id: id });
  if (!r.ok) return r;
  const c = await istemci();
  if (c && r.data) { try { await c.storage.from(BUCKET).remove([r.data]); } catch (e) {} }
  return { ok: true };
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
