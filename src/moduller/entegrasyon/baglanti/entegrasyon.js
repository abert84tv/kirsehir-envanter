// ── dış servis anahtarları (SQL-entegrasyon.sql) — anahtar tarayıcıya geri gelmez
export async function entegrasyonListesi() { return cagir('entegrasyon_listesi', { p_token: tokenOku() }); }
export async function entegrasyonKaydet(ad, deger) { return cagir('entegrasyon_kaydet', { p_token: tokenOku(), p_ad: ad, p_deger: deger || '' }); }
