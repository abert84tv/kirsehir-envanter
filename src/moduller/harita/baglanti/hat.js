// ── hat güzergâhları · elle eklenen yerleşim · sayfa yetkileri (duzeltme-03.sql)
export async function hatListesi() { return cagir('hat_listesi', { p_token: tokenOku() }); }
export async function hatKaydet(tesisDbId, hatlar) {
  return cagir('hat_kaydet', { p_token: tokenOku(), p_tesis_id: tesisDbId, p_hatlar: hatlar || [] });
}
export async function hatSil(id) { return cagir('hat_sil', { p_token: tokenOku(), p_id: id }); }
