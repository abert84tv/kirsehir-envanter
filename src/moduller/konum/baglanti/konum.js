
// ── ekip konumu: araç takip (Arvento) + zimmetli cihaz (SQL: konum.sql). Yalnız son konum tutulur.
export async function konumEkipListesi() { return cagir('konum_ekip_listesi', { p_token: tokenOku() }); }
export async function konumCihazListesi() { return cagir('konum_cihaz_listesi', { p_token: tokenOku() }); }
export async function konumCihazKaydet(c) {
  return cagir('konum_cihaz_kaydet', {
    p_token: tokenOku(), p_id: c.id || null, p_ad: c.ad, p_tur: c.tur, p_ekip: c.ekip || null,
    p_plaka: c.plaka || null, p_harici_kod: c.kod || null, p_aktif: c.aktif !== false
  });
}
export async function konumCihazSil(id) { return cagir('konum_cihaz_sil', { p_token: tokenOku(), p_id: id }); }
export async function konumGonder(lat, lon, dogruluk) {
  return cagir('konum_gonder', { p_token: tokenOku(), p_lat: lat, p_lon: lon, p_dogruluk: dogruluk ?? null });
}
export const KONUM_YAZ_ADRES = URL_ + '/rest/v1/rpc/konum_yaz';
