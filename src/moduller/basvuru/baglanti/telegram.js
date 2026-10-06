// Telegram botunu bu projedeki işleve bağlar (webhook kurulumu; yalnız yönetici)
export async function telegramKod() {
  try {
    const r = await fetch(URL_ + '/functions/v1/telegram-basvuru', {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ islem: 'kod', token: tokenOku() })
    });
    return (await r.json().catch(() => null)) || { ok: false, err: 'Yanıt okunamadı (' + r.status + ').' };
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Bağlantı yok.' }; }
}
export async function telegramKaldir() {
  try {
    const r = await fetch(URL_ + '/functions/v1/telegram-basvuru', {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ islem: 'kaldir', token: tokenOku() })
    });
    return (await r.json().catch(() => null)) || { ok: false, err: 'Yanıt okunamadı (' + r.status + ').' };
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Bağlantı yok.' }; }
}
export async function telegramKur() {
  try {
    const r = await fetch(URL_ + '/functions/v1/telegram-basvuru', {
      method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ islem: 'kur', token: tokenOku() })
    });
    return (await r.json().catch(() => null)) || { ok: false, err: 'Yanıt okunamadı (' + r.status + ').' };
  } catch (e) { return { ok: false, cevrimdisi: true, err: 'Bağlantı yok.' }; }
}
