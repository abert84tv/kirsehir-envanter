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
