export async function numaraAl(tur) {
  return cagir('numara_al', { p_token: tokenOku(), p_tur: tur });
}
export async function numaraToplu(tur, adet) {
  return cagir('numara_toplu', { p_token: tokenOku(), p_tur: tur, p_adet: adet });
}
export async function sunucuSaati() {
  return cagir('sunucu_saati', {});
}
