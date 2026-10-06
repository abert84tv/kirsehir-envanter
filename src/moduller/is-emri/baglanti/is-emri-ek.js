// ── iş emrine ek ekip ve sıralı alt işler (SQL: is_emri_ek)
export async function isEmriEkListesi() { return cagir('is_emri_ek_listesi', { p_token: tokenOku() }); }
export async function isEmriEkKaydet(id, ekipler, altIsler) {
  return cagir('is_emri_ek_kaydet', { p_token: tokenOku(), p_id: id, p_ekipler: ekipler || [], p_alt: altIsler || [] });
}
