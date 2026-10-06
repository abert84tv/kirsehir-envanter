export async function yerlesimEkListesi() { return cagir('yerlesim_ek_listesi', { p_token: tokenOku() }); }
export async function yerlesimEkEkle(ilce, ad, lat, lon) {
  return cagir('yerlesim_ek_ekle', {
    p_token: tokenOku(), p_ilce: ilce, p_ad: ad,
    p_lat: lat == null ? null : lat, p_lon: lon == null ? null : lon
  });
}
export async function yerlesimEkSil(id) { return cagir('yerlesim_ek_sil', { p_token: tokenOku(), p_id: id }); }
