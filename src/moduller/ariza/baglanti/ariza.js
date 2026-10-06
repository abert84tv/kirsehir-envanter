export async function arizaKaydet(f) {
  return cagir('ariza_kaydet', {
    p_token: tokenOku(), p_id: f.dbId || null, p_no: f.no,
    p_tesis_id: f.tesisDbId, p_tur: f.type,
    p_oncelik: f.priority || 'Normal', p_durum: f.status || 'acik',
    p_ekip: f.crew || null, p_aciklama: f.desc || null,
    p_malzeme: f.malzeme || [], p_maliyet: f.maliyet ?? null,
    p_grup: f.grup || null, p_koy: f.koy || null, p_ilce: f.ilce || null,
    p_lat: f.nokta ? f.nokta.lat : null, p_lon: f.nokta ? f.nokta.lon : null,
    p_konum_dogruluk: f.noktaDogruluk ?? null
  });
}