// ── kullanıcılar
export async function kullaniciListesi() {
  return cagir('kullanici_listesi', { p_token: tokenOku() });
}
export async function kullaniciEkle(k) {
  return cagir('kullanici_ekle', {
    p_token: tokenOku(), p_ad: k.name, p_kullanici_ad: k.user, p_rol: k.role,
    p_sifre: k.pw, p_unvan: k.unvan || null, p_tel: k.tel || null, p_bolge: k.bolge || null
  });
}
export async function kullaniciGuncelle(k) {
  return cagir('kullanici_guncelle', {
    p_token: tokenOku(), p_id: k.id, p_ad: k.name, p_kullanici_ad: k.user, p_rol: k.role,
    p_unvan: k.unvan || null, p_tel: k.tel || null, p_bolge: k.bolge || null
  });
}
export async function sifreSifirla(id, sifre) {
  return cagir('sifre_sifirla', { p_token: tokenOku(), p_id: id, p_sifre: sifre });
}
export async function hesapDurum(id, aktif) {
  return cagir('hesap_durum', { p_token: tokenOku(), p_id: id, p_aktif: aktif });
}
export async function kullaniciSil(id) {
  return cagir('kullanici_sil', { p_token: tokenOku(), p_id: id });
}
