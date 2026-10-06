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
