// ── oturum
export async function giris(kullaniciAd, sifre, cihaz) {
  // Parametreler daima gönderilir: biri eksik kalırsa sunucu başka imzalı bir
  // fonksiyon arar ve "fonksiyon bulunamadı" hatası döner.
  if (!kullaniciAd || !sifre) return { ok: false, err: 'Kullanıcı adı ve şifre girilmeden giriş yapılamaz.' };
  const r = await cagir('giris', { p_ad: String(kullaniciAd), p_sifre: String(sifre), p_cihaz: cihaz || null });
  if (!r.ok) return r;
  const k = tek(r.data);
  if (!k) return { ok: false, err: 'Kullanıcı adı veya şifre hatalı.' };
  tokenYaz(k.token);
  return { ok: true, data: k };
}
