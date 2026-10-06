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