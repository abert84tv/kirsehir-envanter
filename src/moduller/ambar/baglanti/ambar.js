// Ambar aritmetiği sunucuda: cihaz yeni bakiyeyi değil hareketi gönderir
export async function ambarHareket(islemler) {
  return cagir('ambar_hareket', { p_token: tokenOku(), p_islemler: islemler || [] });
}