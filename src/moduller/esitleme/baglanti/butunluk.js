// ── veri bütünlüğü (SQL-veri-butunlugu.sql)
// Sürümlü okuma ve yazma: iki kişi aynı listeyi düzenlerse ikincisinin
// yazması reddedilir, program birleştirip yeniden yazar.
export async function veriHepsiSurumlu() {
  return cagir('veri_hepsi_surumlu', { p_token: tokenOku() });
}
export async function veriYazSurumlu(anahtar, veri, surum) {
  return cagir('veri_yaz_surumlu', {
    p_token: tokenOku(), p_anahtar: anahtar,
    p_veri: veri ?? null, p_surum: surum ?? null
  });
}