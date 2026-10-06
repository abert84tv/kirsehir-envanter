// ── arıza ek bilgisi: SLA, bekleme, ana arıza, planlı zaman (SQL-ariza-sla.sql)
export async function arizaEkListesi() { return cagir('ariza_ek_listesi', { p_token: tokenOku() }); }
export async function arizaEkKaydet(arizaDbId, ek) {
  return cagir('ariza_ek_kaydet', {
    p_token: tokenOku(), p_ariza_id: arizaDbId, p_sla_gun: ek.slaGun ?? null, p_sla_iptal: !!ek.slaIptal, p_sla_not: ek.slaNot || null,
    p_bekleme_bas: ek.beklemeBas || null, p_bekleme_dk: ek.beklemeDk || 0, p_bekleme_neden: ek.beklemeNeden || null,
    p_ana_id: ek.anaId || null, p_planli: ek.planli || null
  });
}
