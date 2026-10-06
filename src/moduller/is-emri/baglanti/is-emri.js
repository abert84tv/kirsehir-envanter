export function isEmriSuret(r) {
  return {
    id: 'i' + r.id, dbId: r.id, no: r.no, talepId: r.talep_id,
    arizaDbId: r.ariza_id, tesisDbId: r.tesis_id, tesisKod: r.tesis_kod,
    district: r.ilce, koy: r.koy || '', type: r.tur, altSistem: r.alt_sistem,
    priority: r.oncelik, desc: r.aciklama || '', crew: r.ekip || '',
    araclar: r.araclar || [], status: r.durum,
    planlananMalzeme: r.planlanan_malzeme || [],
    kullanilanMalzeme: r.kullanilan_malzeme || [], toplamSaat: r.toplam_saat,
    acan: r.acan, acildi: r.acildi, atayan: r.atayan, atandiZaman: r.atandi_zaman,
    kapatan: r.kapatan, kapandi: r.kapandi, surum: r.surum, sync: 'synced'
  };
}
export async function isEmriListesi() { return cagir('is_emri_listesi', { p_token: tokenOku() }); }
export async function isEmriKaydet(g) {
  return cagir('is_emri_kaydet', {
    p_token: tokenOku(), p_id: g.dbId || null, p_no: g.no,
    p_talep_id: g.talepId || null, p_ariza_id: g.arizaDbId || null,
    p_tesis_id: g.tesisDbId || null, p_tur: g.type, p_alt_sistem: g.altSistem || null,
    p_oncelik: g.priority || 'Normal', p_aciklama: g.desc || null,
    p_ekip: g.crew || null, p_araclar: g.araclar || [], p_durum: g.status || null,
    p_planlanan_malzeme: g.planlananMalzeme || [], p_surum: g.surum || null
  });
}
export async function isEmriKapat(dbId, kullanilanMalzeme, toplamSaat, gecmisDetay) {
  return cagir('is_emri_kapat', {
    p_token: tokenOku(), p_id: dbId, p_kullanilan_malzeme: kullanilanMalzeme || [],
    p_toplam_saat: toplamSaat ?? null, p_gecmis_detay: gecmisDetay || null
  });
}