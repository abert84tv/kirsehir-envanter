export async function oturumAc(token) {
  const t = token || tokenOku();
  if (!t) return { ok: false, err: 'Kayıtlı oturum yok.' };
  const r = await cagir('oturum_ac', { p_token: t });
  if (!r.ok) return r;
  const k = tek(r.data);
  if (!k) { tokenYaz(null); return { ok: false, err: 'Oturum geçersiz.' }; }
  return { ok: true, data: { ...k, token: t } };
}

export async function cikis() {
  const t = tokenOku();
  if (t) await cagir('cikis', { p_token: t });
  tokenYaz(null);
  return { ok: true };
}

export async function sifreDegistir(yeni) {
  return cagir('sifre_degistir', { p_token: tokenOku(), p_yeni: yeni });
}
