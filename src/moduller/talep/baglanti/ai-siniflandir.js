// Başvuru metnini yapay zekâyla sınıflandırır (sunucu işlevi "talep-siniflandir").
// Anahtar işlevde durur; kurulmamışsa { ok:false, anahtarYok:true } döner.
export async function aiSiniflandir(metin) {
  try {
    const r = await fetch(URL_ + '/functions/v1/talep-siniflandir', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenOku(), metin: String(metin || '').slice(0, 2000) })
    });
    const j = await r.json().catch(() => null);
    if (!j) return { ok: false, err: 'Yapay zekâ yanıtı okunamadı (' + r.status + ').' };
    return j.ok ? { ok: true, data: j } : { ok: false, err: j.err || 'Sınıflandırılamadı.', anahtarYok: !!j.anahtarYok };
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Bağlantı yok.' }; }
}
