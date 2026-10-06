// ── web başvuruları (SQL-basvuru.sql)
export async function basvuruListesi() { return cagir('basvuru_listesi', { p_token: tokenOku() }); }
export async function basvuruGuncelle(id, durum, sonuc, talepNo) {
  return cagir('basvuru_guncelle', { p_token: tokenOku(), p_id: id, p_durum: durum, p_sonuc: sonuc || null, p_talep_no: talepNo || null });
}
export async function basvuruEngelle(id) { return cagir('basvuru_engelle', { p_token: tokenOku(), p_id: id }); }
