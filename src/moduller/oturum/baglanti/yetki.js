export async function yetkiListesi() { return cagir('yetki_listesi', { p_token: tokenOku() }); }
export async function yetkiKaydet(id, sayfaYetki, yetkiIstisna) {
  return cagir('yetki_kaydet', {
    p_token: tokenOku(), p_id: id,
    p_sayfa_yetki: sayfaYetki || {}, p_yetki_istisna: yetkiIstisna || {}
  });
}
export async function vekaletAta(hedefId, ver) { return cagir('vekalet_ata', { p_token: tokenOku(), p_hedef: hedefId, p_ver: !!ver }); }
