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
// Tesis ekleme/silme önerisi (saha şefi → mühendis → müdür)
export async function tesisDegisiklikListesi() { return cagir('tesis_degisiklik_listesi', { p_token: tokenOku() }); }
export async function tesisDegisiklikAc(o) {
  return cagir('tesis_degisiklik_ac', {
    p_token: tokenOku(), p_tur: o.tur, p_tesis_id: o.tesisId || null, p_ilce: o.ilce || null, p_koy: o.koy || null,
    p_tesis_tur: o.tesisTur || null, p_lat: o.lat ?? null, p_lon: o.lon ?? null, p_yapim_yili: o.yil || null,
    p_veri: o.veri || {}, p_aciklama: o.aciklama || null
  });
}
export async function tesisDegisiklikKarar(id, karar, neden) {
  return cagir('tesis_degisiklik_karar', { p_token: tokenOku(), p_id: id, p_karar: karar, p_neden: neden || null });
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
