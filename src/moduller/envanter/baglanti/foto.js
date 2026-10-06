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
