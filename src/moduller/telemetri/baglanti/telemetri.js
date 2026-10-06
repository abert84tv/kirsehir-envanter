// ── telemetri (SQL-telemetri.sql) — cihazlar adres + anahtarla doğrudan telemetri_yaz'a yazar
export const TELEMETRI_ADRES = URL_ + '/rest/v1/rpc/telemetri_yaz';
export const YAYIN_ANAHTARI = ANON;
export async function telemetriCihazlar() { return cagir('telemetri_cihaz_listesi', { p_token: tokenOku() }); }
export async function telemetriAlarmlar(gun) { return cagir('telemetri_alarm_listesi', { p_token: tokenOku(), p_gun: gun || 7 }); }
export async function telemetriKurallar() { return cagir('telemetri_kural_listesi', { p_token: tokenOku() }); }
export async function telemetriGecmis(cihazId, kanal, saat) {
  return cagir('telemetri_gecmis', { p_token: tokenOku(), p_cihaz_id: cihazId, p_kanal: kanal, p_saat: saat || 24 });
}
export async function telemetriCihazKaydet(c) {
  return cagir('telemetri_cihaz_kaydet', {
    p_token: tokenOku(), p_id: c.id || null, p_kod: c.kod, p_ad: c.ad, p_tesis_id: c.tesisId ?? null,
    p_tur: c.tur || 'genel', p_protokol: c.protokol || 'http', p_beklenen_dk: c.dk || 15, p_aktif: c.aktif !== false
  });
}
export async function telemetriAnahtarYenile(id) { return cagir('telemetri_anahtar_yenile', { p_token: tokenOku(), p_id: id }); }
export async function telemetriCihazSil(id) { return cagir('telemetri_cihaz_sil', { p_token: tokenOku(), p_id: id }); }
export async function telemetriKuralKaydet(k) {
  return cagir('telemetri_kural_kaydet', {
    p_token: tokenOku(), p_id: k.id || null, p_cihaz_id: k.cihazId, p_kanal: k.kanal, p_op: k.op,
    p_esik: k.esik, p_onem: k.onem || 'uyari', p_aciklama: k.aciklama || null, p_aktif: k.aktif !== false
  });
}
export async function telemetriKuralSil(id) { return cagir('telemetri_kural_sil', { p_token: tokenOku(), p_id: id }); }
export async function telemetriAlarmOnayla(id, arizaId) {
  return cagir('telemetri_alarm_onayla', { p_token: tokenOku(), p_id: id, p_ariza_id: arizaId || null });
}
