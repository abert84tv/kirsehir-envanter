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

// ── oturum
export async function giris(kullaniciAd, sifre, cihaz) {
  // Parametreler daima gönderilir: biri eksik kalırsa sunucu başka imzalı bir
  // fonksiyon arar ve "fonksiyon bulunamadı" hatası döner.
  if (!kullaniciAd || !sifre) return { ok: false, err: 'Kullanıcı adı ve şifre girilmeden giriş yapılamaz.' };
  const r = await cagir('giris', { p_ad: String(kullaniciAd), p_sifre: String(sifre), p_cihaz: cihaz || null });
  if (!r.ok) return r;
  const k = tek(r.data);
  if (!k) return { ok: false, err: 'Kullanıcı adı veya şifre hatalı.' };
  tokenYaz(k.token);
  return { ok: true, data: k };
}

// Başvuru metnini yapay zekâyla sınıflandırır (sunucu işlevi "talep-siniflandir").
// Anahtar işlevde durur; kurulmamışsa { ok:false, anahtarYok:true } döner.
export async function aiSiniflandir(metin) {
  try {
    const r = await fetch(URL_ + '/functions/v1/talep-siniflandir', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenOku(), metin: String(metin || '').slice(0, 2000) })
    });
    const j = await r.json().catch(() => null);
    if (!j) return { ok: false, err: 'Yapay zekâ yanıtı okunamadı (' + r.status + ').' };
    return j.ok ? { ok: true, data: j } : { ok: false, err: j.err || 'Sınıflandırılamadı.', anahtarYok: !!j.anahtarYok };
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Bağlantı yok.' }; }
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

function damgaBicim(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const i = n => String(n).padStart(2, '0');
  return `${i(d.getDate())}.${i(d.getMonth() + 1)}.${d.getFullYear()} ${i(d.getHours())}:${i(d.getMinutes())}`;
}

export function arizaSuret(r) {
  return {
    id: 'f' + r.id, dbId: r.id, no: r.no, assetId: r.tesis_id != null ? 't' + r.tesis_id : null,
    tesisDbId: r.tesis_id, district: r.ilce, type: r.tur,
    // Tesissiz arıza (boru hattı vb.) köy+ilçeyle durur; arıza noktası ekip
    // sahaya varınca kaydedilir
    grup: r.grup || null, koy: r.koy || null, tesisKoy: r.tesis_koy || null,
    nokta: r.lat != null && r.lon != null ? { lat: r.lat, lon: r.lon } : null,
    noktaZaman: r.konum_zaman || null, noktaDogruluk: r.konum_dogruluk ?? null, noktaKim: r.konum_kim || null,
    priority: r.oncelik, status: r.durum, crew: r.ekip || '',
    desc: r.aciklama || '', malzeme: r.malzeme || [], maliyet: r.maliyet,
    // Program tarihleri "GG.AA.YYYY SS:DD" bekler (hedef süre, raporlar, mükerrer
    // denetimi); sunucu ISO verir. Özgün damga hassas hesap için ayrıca tutulur.
    reporter: r.acan, opened: damgaBicim(r.acildi), closer: r.kapatan, closed: damgaBicim(r.kapandi),
    openedIso: r.acildi || null, closedIso: r.kapandi || null,
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
export async function tesisKaliciSil(dbId) { return cagir('tesis_kalici_sil', { p_token: tokenOku(), p_id: dbId }); }
export async function fotoGeriAl(id)    { return cagir('foto_geri_al', { p_token: tokenOku(), p_id: id }); }
export async function fotoCopListesi()  { return cagir('foto_cop_listesi', { p_token: tokenOku() }); }
// Kalıcı silme: kayıt düşer, dosya Storage'dan da kalkar
export async function fotoKaliciSil(id) {
  const r = await cagir('foto_kalici_sil', { p_token: tokenOku(), p_id: id });
  if (!r.ok) return r;
  const c = await istemci();
  if (c && r.data) { try { await c.storage.from(BUCKET).remove([r.data]); } catch (e) {} }
  return { ok: true };
}
// Süresi geçen çöp kutusu kayıtlarını temizler (30 gün)
export async function copTemizle() {
  const r = await cagir('cop_temizle', { p_token: tokenOku() });
  if (!r.ok) return r;
  const sat = Array.isArray(r.data) ? r.data[0] : r.data;
  const adr = (sat && sat.adresler) || [];
  if (adr.length) {
    const c = await istemci();
    if (c) { try { await c.storage.from(BUCKET).remove(adr); } catch (e) {} }
  }
  return { ok: true, data: { tesis: (sat && sat.silinen_tesis) || 0, foto: (sat && sat.silinen_foto) || 0 } };
}

export async function arizaKaydet(f) {
  return cagir('ariza_kaydet', {
    p_token: tokenOku(), p_id: f.dbId || null, p_no: f.no,
    p_tesis_id: f.tesisDbId, p_tur: f.type,
    p_oncelik: f.priority || 'Normal', p_durum: f.status || 'acik',
    p_ekip: f.crew || null, p_aciklama: f.desc || null,
    p_malzeme: f.malzeme || [], p_maliyet: f.maliyet ?? null,
    p_grup: f.grup || null, p_koy: f.koy || null, p_ilce: f.ilce || null,
    p_lat: f.nokta ? f.nokta.lat : null, p_lon: f.nokta ? f.nokta.lon : null,
    p_konum_dogruluk: f.noktaDogruluk ?? null
  });
}
export function isEmriSuret(r) {
  return {
    id: 'i' + r.id, dbId: r.id, no: r.no, talepId: r.talep_id,
    arizaDbId: r.ariza_id, tesisDbId: r.tesis_id, tesisKod: r.tesis_kod,
    district: r.ilce, koy: r.koy || '', type: r.tur, altSistem: r.alt_sistem,
    priority: r.oncelik, desc: r.aciklama || '', crew: r.ekip || '',
    araclar: r.araclar || [], status: r.durum,
    planlananMalzeme: r.planlanan_malzeme || [],
    kullanilanMalzeme: r.kullanilan_malzeme || [], toplamSaat: r.toplam_saat,
    acan: r.acan, acildi: r.acildi, atayan: r.atayan, atandiZaman: r.atandi_zaman,
    kapatan: r.kapatan, kapandi: r.kapandi, surum: r.surum, sync: 'synced'
  };
}
export async function isEmriListesi() { return cagir('is_emri_listesi', { p_token: tokenOku() }); }
export async function isEmriKaydet(g) {
  return cagir('is_emri_kaydet', {
    p_token: tokenOku(), p_id: g.dbId || null, p_no: g.no,
    p_talep_id: g.talepId || null, p_ariza_id: g.arizaDbId || null,
    p_tesis_id: g.tesisDbId || null, p_tur: g.type, p_alt_sistem: g.altSistem || null,
    p_oncelik: g.priority || 'Normal', p_aciklama: g.desc || null,
    p_ekip: g.crew || null, p_araclar: g.araclar || [], p_durum: g.status || null,
    p_planlanan_malzeme: g.planlananMalzeme || [], p_surum: g.surum || null
  });
}
export async function isEmriKapat(dbId, kullanilanMalzeme, toplamSaat, gecmisDetay) {
  return cagir('is_emri_kapat', {
    p_token: tokenOku(), p_id: dbId, p_kullanilan_malzeme: kullanilanMalzeme || [],
    p_toplam_saat: toplamSaat ?? null, p_gecmis_detay: gecmisDetay || null
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

// arizaDbId verilirse fotoğraf "arıza kanıtı" sayılır — saklama süresi
// (min. 2 yıl) buna göre işler; envanter fotoğrafı (arizaDbId yok) ömür
// boyu saklanır. bkz. cop_temizle() — KVKK saklama politikası, 2026.09.30.
export async function fotoYukle(file, tesisDbId, kod, aciklama, arizaDbId) {
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
    p_boyut: k.boyut, p_aciklama: aciklama || null, p_ariza_id: arizaDbId || null
  });
  if (!r.ok) { try { await c.storage.from(BUCKET).remove([anahtar]); } catch (e) {} return r; }
  return { ok: true, data: { id: r.data, anahtar, url: fotoAdres(anahtar), boyut: k.boyut, w: k.w, h: k.h } };
}

// Sesli notlar fotoğraflarla aynı depoda; ayıran tek şey tur sütunu
export async function sesYukle(blob, tesisDbId, kod, saniye, aciklama, arizaDbId) {
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
    p_boyut: blob.size, p_sure: saniye || null, p_aciklama: aciklama || null,
    p_ariza_id: arizaDbId || null
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

// Arızaya bağlı sesli notlar (tesissiz arıza dahil)
export async function arizaSesListesi(arizaDbId) {
  const r = await cagir('ariza_ses_listesi', { p_token: tokenOku(), p_ariza_id: arizaDbId });
  if (!r.ok) return r;
  return { ok: true, data: (r.data || []).map(f => ({
    id: f.id, tesisDbId: f.tesis_id, arizaDbId: f.ariza_id ?? null, anahtar: f.adres, url: fotoAdres(f.adres),
    sure: f.sure, boyut: f.boyut, yukleyen: f.yukleyen, yuklendi: f.yuklendi, yazilabilir: f.yazilabilir !== false
  })) };
}
// Arızaya bağlı fotoğraflar (tesissiz arıza dahil)
export async function arizaFotoListesi(arizaDbId) {
  const r = await cagir('ariza_foto_listesi', { p_token: tokenOku(), p_ariza_id: arizaDbId });
  if (!r.ok) return r;
  return { ok: true, data: (r.data || []).map(f => ({
    id: f.id, tesisDbId: f.tesis_id, arizaDbId: f.ariza_id ?? null, anahtar: f.adres, url: fotoAdres(f.adres),
    aciklama: f.aciklama || '', boyut: f.boyut, yukleyen: f.yukleyen,
    yuklendi: f.yuklendi, yazilabilir: f.yazilabilir !== false
  })) };
}
export async function fotoListesi(tesisDbId) {
  const r = await cagir('foto_listesi', { p_token: tokenOku(), p_tesis_id: tesisDbId ?? null });
  if (!r.ok) return r;
  return { ok: true, data: (r.data || []).map(f => ({
    id: f.id, tesisDbId: f.tesis_id, arizaDbId: f.ariza_id ?? null, anahtar: f.adres, url: fotoAdres(f.adres),
    aciklama: f.aciklama || '', boyut: f.boyut, yukleyen: f.yukleyen,
    yuklendi: f.yuklendi, yazilabilir: f.yazilabilir !== false
  })) };
}

// Sil: yumuşak silme — dosya Storage'da kalır, 30 gün çöp kutusunda bekler
export async function fotoSil(id) {
  return cagir('foto_sil', { p_token: tokenOku(), p_id: id });
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

// ── hat güzergâhları · elle eklenen yerleşim · sayfa yetkileri (duzeltme-03.sql)
export async function hatListesi() { return cagir('hat_listesi', { p_token: tokenOku() }); }
export async function hatKaydet(tesisDbId, hatlar) {
  return cagir('hat_kaydet', { p_token: tokenOku(), p_tesis_id: tesisDbId, p_hatlar: hatlar || [] });
}
export async function hatSil(id) { return cagir('hat_sil', { p_token: tokenOku(), p_id: id }); }

export async function yerlesimEkListesi() { return cagir('yerlesim_ek_listesi', { p_token: tokenOku() }); }
export async function yerlesimEkEkle(ilce, ad, lat, lon) {
  return cagir('yerlesim_ek_ekle', {
    p_token: tokenOku(), p_ilce: ilce, p_ad: ad,
    p_lat: lat == null ? null : lat, p_lon: lon == null ? null : lon
  });
}
export async function yerlesimEkSil(id) { return cagir('yerlesim_ek_sil', { p_token: tokenOku(), p_id: id }); }

export async function yetkiListesi() { return cagir('yetki_listesi', { p_token: tokenOku() }); }
export async function yetkiKaydet(id, sayfaYetki, yetkiIstisna) {
  return cagir('yetki_kaydet', {
    p_token: tokenOku(), p_id: id,
    p_sayfa_yetki: sayfaYetki || {}, p_yetki_istisna: yetkiIstisna || {}
  });
}

// ── modül verileri (SQL-moduller-sunucu.sql)
// Yedi modül ortak bir anahtarlı tabloda durur; her biri tek liste olarak
// toptan yazılır. Denetim izi ayrı: satır satır eklenir, değiştirilemez.
export async function veriHepsi() {
  return cagir('veri_hepsi', { p_token: tokenOku() });
}
export async function veriOku(anahtar) {
  return cagir('veri_oku', { p_token: tokenOku(), p_anahtar: anahtar });
}
export async function veriYaz(anahtar, veri) {
  return cagir('veri_yaz', { p_token: tokenOku(), p_anahtar: anahtar, p_veri: veri ?? null });
}
export async function denetimEkle(k) {
  return cagir('denetim_ekle', {
    p_token: tokenOku(), p_sinif: k.sinif, p_ne: k.ne, p_detay: k.detay || null,
    p_kapsam: k.kapsam || null, p_nereden: k.nereden || null, p_cevrimdisi: !!k.cevrimdisi
  });
}
export async function denetimToplu(satirlar) {
  return cagir('denetim_toplu', { p_token: tokenOku(), p_satirlar: satirlar || [] });
}
export async function denetimListesi(limit) {
  return cagir('denetim_listesi', { p_token: tokenOku(), p_limit: limit || 500 });
}

// ── veri bütünlüğü (SQL-veri-butunlugu.sql)
// Sürümlü okuma ve yazma: iki kişi aynı listeyi düzenlerse ikincisinin
// yazması reddedilir, program birleştirip yeniden yazar.
export async function veriHepsiSurumlu() {
  return cagir('veri_hepsi_surumlu', { p_token: tokenOku() });
}
export async function veriYazSurumlu(anahtar, veri, surum) {
  return cagir('veri_yaz_surumlu', {
    p_token: tokenOku(), p_anahtar: anahtar,
    p_veri: veri ?? null, p_surum: surum ?? null
  });
}
// Ambar aritmetiği sunucuda: cihaz yeni bakiyeyi değil hareketi gönderir
export async function ambarHareket(islemler) {
  return cagir('ambar_hareket', { p_token: tokenOku(), p_islemler: islemler || [] });
}
export async function numaraAl(tur) {
  return cagir('numara_al', { p_token: tokenOku(), p_tur: tur });
}
export async function numaraToplu(tur, adet) {
  return cagir('numara_toplu', { p_token: tokenOku(), p_tur: tur, p_adet: adet });
}
export async function sunucuSaati() {
  return cagir('sunucu_saati', {});
}

// ── telemetri (SQL-telemetri.sql) — cihazlar adres + anahtarla doğrudan telemetri_yaz'a yazar
export const TELEMETRI_ADRES = URL_ + '/rest/v1/rpc/telemetri_yaz';
export const YAYIN_ANAHTARI = ANON;
export async function telemetriCihazlar() { return cagir('telemetri_cihaz_listesi', { p_token: tokenOku() }); }
export async function telemetriAlarmlar(gun) { return cagir('telemetri_alarm_listesi', { p_token: tokenOku(), p_gun: gun || 7 }); }
export async function telemetriKurallar() { return cagir('telemetri_kural_listesi', { p_token: tokenOku() }); }
export async function telemetriGecmis(cihazId, kanal, saat) {
  return cagir('telemetri_gecmis', { p_token: tokenOku(), p_cihaz_id: cihazId, p_kanal: kanal, p_saat: saat || 24 });
}
export async function telemetriCihazKaydet(c) {
  return cagir('telemetri_cihaz_kaydet', {
    p_token: tokenOku(), p_id: c.id || null, p_kod: c.kod, p_ad: c.ad, p_tesis_id: c.tesisId ?? null,
    p_tur: c.tur || 'genel', p_protokol: c.protokol || 'http', p_beklenen_dk: c.dk || 15, p_aktif: c.aktif !== false
  });
}
export async function telemetriAnahtarYenile(id) { return cagir('telemetri_anahtar_yenile', { p_token: tokenOku(), p_id: id }); }
export async function telemetriCihazSil(id) { return cagir('telemetri_cihaz_sil', { p_token: tokenOku(), p_id: id }); }
export async function telemetriKuralKaydet(k) {
  return cagir('telemetri_kural_kaydet', {
    p_token: tokenOku(), p_id: k.id || null, p_cihaz_id: k.cihazId, p_kanal: k.kanal, p_op: k.op,
    p_esik: k.esik, p_onem: k.onem || 'uyari', p_aciklama: k.aciklama || null, p_aktif: k.aktif !== false
  });
}
export async function telemetriKuralSil(id) { return cagir('telemetri_kural_sil', { p_token: tokenOku(), p_id: id }); }
export async function telemetriAlarmOnayla(id, arizaId) {
  return cagir('telemetri_alarm_onayla', { p_token: tokenOku(), p_id: id, p_ariza_id: arizaId || null });
}

// ── web başvuruları (SQL-basvuru.sql)
export async function basvuruListesi() { return cagir('basvuru_listesi', { p_token: tokenOku() }); }
export async function basvuruGuncelle(id, durum, sonuc, talepNo) {
  return cagir('basvuru_guncelle', { p_token: tokenOku(), p_id: id, p_durum: durum, p_sonuc: sonuc || null, p_talep_no: talepNo || null });
}
export async function basvuruEngelle(id) { return cagir('basvuru_engelle', { p_token: tokenOku(), p_id: id }); }
