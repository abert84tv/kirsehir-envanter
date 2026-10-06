// Kırşehir Envanter — "telegram-basvuru" sunucu işlevi (Supabase Edge Function)
//
// Ücretsiz Telegram botu üzerinden gelen vatandaş/muhtar mesajlarını web başvurusu
// (vatandas_basvuru) olarak kaydeder, takip kodu döner. Konum paylaşılırsa başvuruya
// eklenir. "/durum BSV-XXXXXX" ile durum sorulur.
//
// KURULUM: @BotFather ile bot açın, anahtarı programda Ayarlar > Entegrasyon > Telegram'a
// yapıştırın, "Botu bağla" düğmesine basın (webhook bu işlev için kurulur).

const DURUM: Record<string, string> = {
  yeni: 'Alındı', incelemede: 'İnceleniyor', arizaya: 'Ekip görevlendirildi', cozuldu: 'Çözüldü', red: 'Karşılanamıyor'
};
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const yanit = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const KVKK = '\n\nMesajınızı göndererek adınızın ve konumunuzun yalnızca bu bildirimin çözümü için işlenmesini kabul etmiş olursunuz.';

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return yanit({ ok: false }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const servis = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const rest = (yol: string, init: RequestInit = {}) => fetch(url + '/rest/v1/' + yol, {
    ...init, headers: { apikey: servis, Authorization: 'Bearer ' + servis, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) }
  });
  const tr = await rest('entegrasyon?ad=eq.telegram_bot_anahtari&select=deger');
  const tj = tr.ok ? await tr.json() : [];
  const bot: string = tj[0] && tj[0].deger ? String(tj[0].deger) : '';
  const tg = (yontem: string, govde: unknown) => fetch('https://api.telegram.org/bot' + bot + '/' + yontem, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(govde)
  });
  let g: Record<string, any>;
  try { g = await req.json(); } catch { return yanit({ ok: false }, 400); }

  // Programdan çağrı: webhook kurulumu / kaldırma (yalnız yönetici)
  if (g.islem === 'kur' || g.islem === 'kaldir' || g.islem === 'kod') {
    if (!bot) return yanit({ ok: false, err: 'Önce bot anahtarını kaydedin.' });
    const o = await fetch(url + '/rest/v1/rpc/oturum_ac', {
      method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: g.token })
    });
    const oj = o.ok ? await o.json() : null;
    const k = Array.isArray(oj) ? oj[0] : oj;
    if (!k || String(k.rol) !== 'yonetici') return yanit({ ok: false, err: 'Yalnız yönetici bağlayabilir.' }, 403);
    const uyariKod = (await sha(bot + ':yonetici')).slice(0, 8).toUpperCase();
    if (g.islem === 'kod') return yanit({ ok: true, kod: uyariKod });
    if (g.islem === 'kaldir') {
      const kd = await (await tg('deleteWebhook', { drop_pending_updates: true })).json();
      return yanit({ ok: !!kd.ok, err: kd.ok ? '' : (kd.description || 'Webhook kaldırılamadı.') });
    }
    const me = await (await tg('getMe', {})).json();
    if (!me.ok) return yanit({ ok: false, err: 'Telegram anahtarı geçersiz.' });
    const wh = await (await tg('setWebhook', {
      url: url + '/functions/v1/telegram-basvuru', secret_token: await sha(bot), allowed_updates: ['message']
    })).json();
    return yanit({ ok: !!wh.ok, kod: uyariKod, kullanici: me.result && me.result.username, err: wh.ok ? '' : (wh.description || 'Webhook kurulamadı.') });
  }

  // Telegram webhook
  if (!bot) return yanit({ ok: false }, 404);
  if (req.headers.get('x-telegram-bot-api-secret-token') !== await sha(bot)) return yanit({ ok: false }, 401);
  const m = g.message;
  if (!m || !m.chat) return yanit({ ok: true });
  const sohbet = String(m.chat.id);
  const ref = 'tg:' + sohbet;
  const cevap = (metin: string) => tg('sendMessage', { chat_id: m.chat.id, text: metin });

  if (m.location) {
    const son = await (await rest('vatandas_basvuru?ip_ozet=eq.' + encodeURIComponent(ref) + '&order=olusma.desc&limit=1&select=id,takip,olusma')).json();
    if (Array.isArray(son) && son[0] && Date.now() - Date.parse(son[0].olusma) < 2 * 3600 * 1000) {
      await rest('vatandas_basvuru?id=eq.' + son[0].id, { method: 'PATCH', body: JSON.stringify({ lat: m.location.latitude, lon: m.location.longitude, guncelleme: new Date().toISOString() }) });
      await cevap('Konum ' + son[0].takip + ' bildirimine eklendi. Teşekkürler.');
    } else await cevap('Konumu önce sorunu yazdıktan sonra gönderin.');
    return yanit({ ok: true });
  }
  const metin = String(m.text || '').trim().slice(0, 1500);
  if (!metin) return yanit({ ok: true });
  // Yönetici uyarısı: /yonetici KOD → bu sohbete her yeni başvuruda Telegram mesajı gider; /yonetici CIK → kaydı siler
  if (metin.startsWith('/yonetici')) {
    const girilen = (metin.split(/\s+/)[1] || '').toUpperCase();
    const dogru = (await sha(bot + ':yonetici')).slice(0, 8).toUpperCase();
    const lr = await rest('entegrasyon?ad=eq.telegram_uyari_sohbet&select=deger');
    const lj = lr.ok ? await lr.json() : [];
    let liste: string[] = lj[0] && lj[0].deger ? String(lj[0].deger).split(',').filter(Boolean) : [];
    if (girilen === 'CIK') {
      liste = liste.filter(x => x !== sohbet);
      if (liste.length) await rest('entegrasyon?on_conflict=ad', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ ad: 'telegram_uyari_sohbet', deger: liste.join(',') }) });
      else await rest('entegrasyon?ad=eq.telegram_uyari_sohbet', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await cevap('Bu sohbet yönetici uyarılarından çıkarıldı.');
    } else if (girilen !== dogru) {
      await cevap('Kod hatalı. Kodu programda Ayarlar > Entegrasyon > Telegram kartında görürsünüz.');
    } else {
      if (!liste.includes(sohbet)) liste.push(sohbet);
      await rest('entegrasyon?on_conflict=ad', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ ad: 'telegram_uyari_sohbet', deger: liste.join(',') }) });
      await cevap('✅ Bu sohbet yönetici uyarısı olarak kaydedildi. Yeni başvuru gelince buraya mesaj düşecek (sesli bildirim).\nÇıkmak için: /yonetici CIK');
    }
    return yanit({ ok: true });
  }
  if (metin.startsWith('/start') || metin.startsWith('/yardim')) {
    await cevap('Kırşehir İl Özel İdaresi su ve kanal arıza bildirimi.\n\nSorunu yazın (köy adı ve ne olduğu), isterseniz konumunuzu da paylaşın. Size bir takip kodu vereceğim.\nDurum için: /durum BSV-XXXXXX' + KVKK);
    return yanit({ ok: true });
  }
  if (metin.startsWith('/durum')) {
    const kod = metin.split(/\s+/)[1] || '';
    const r = await (await rest('vatandas_basvuru?takip=eq.' + encodeURIComponent(kod.toUpperCase()) + '&select=durum,sonuc,konu,koy')).json();
    if (!Array.isArray(r) || !r[0]) await cevap('Bu kodla başvuru bulunamadı.');
    else await cevap(kod.toUpperCase() + ': ' + (DURUM[r[0].durum] || r[0].durum) + (r[0].sonuc ? '\nNot: ' + r[0].sonuc : ''));
    return yanit({ ok: true });
  }
  if (metin.length < 10) { await cevap('Lütfen sorunu biraz daha ayrıntılı yazın (köy adı ve ne olduğu).'); return yanit({ ok: true }); }
  const saat = new Date(Date.now() - 3600 * 1000).toISOString();
  const say = await (await rest('vatandas_basvuru?ip_ozet=eq.' + encodeURIComponent(ref) + '&olusma=gte.' + saat + '&select=id')).json();
  if (Array.isArray(say) && say.length >= 5) { await cevap('Kısa sürede çok fazla bildirim gönderdiniz. Lütfen biraz sonra yeniden deneyin.'); return yanit({ ok: true }); }
  const alf = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
  let kod = '';
  for (let d = 0; d < 5; d++) {
    kod = 'BSV-' + Array.from({ length: 6 }, () => alf[Math.floor(Math.random() * alf.length)]).join('');
    const v = await (await rest('vatandas_basvuru?takip=eq.' + kod + '&select=id')).json();
    if (!v.length) break;
  }
  const ad = [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || m.chat.username || 'Telegram kullanıcısı';
  const ek = await rest('vatandas_basvuru', { method: 'POST', body: JSON.stringify({
    takip: kod, ad: ad.slice(0, 80), sifat: 'vatandas', koy: 'Belirtilmedi', konu: 'Telegram bildirimi', aciklama: metin,
    kanal: 'telegram', kvkk_onay: true, ip_ozet: ref
  }) });
  if (!ek.ok) { await cevap('Bildirim şu an kaydedilemedi, lütfen biraz sonra yeniden deneyin.'); return yanit({ ok: false }); }
  await cevap('Bildiriminiz alındı ✅\nTakip kodunuz: ' + kod + '\nKonumunuzu paylaşırsanız ekibe yol gösterir. Durum için: /durum ' + kod + KVKK);
  return yanit({ ok: true });
});
