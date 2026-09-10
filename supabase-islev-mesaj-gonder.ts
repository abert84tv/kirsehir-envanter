// Kırşehir Envanter — mesaj gönderme sunucu işlevi
//
// NEDEN SUNUCUDA: operatör anahtarı tarayıcıya konulamaz; koyulursa
// programı açan herkes anahtarı görür ve kurumun adına mesaj atabilir.
// Program bu işlevi çağırır, anahtar yalnızca burada durur.
//
// KURULUM (Supabase panelinde):
//   1) Edge Functions > Deploy new function > adı: mesaj-gonder
//      Bu dosyanın içeriğini yapıştırın.
//   2) Project Settings > Edge Functions > Secrets kısmına
//      kullandığınız servise göre anahtarları girin (aşağıda).
//   3) Programda: Ayarlar > Bildirim > "Sunucu bağlantısı" bölümüne
//      işlev adresini yazıp "Bağlantıyı dene"ye basın.
//
// GEREKLİ SECRETS — SMS için (Netgsm örneği, Türkiye'de yaygın):
//   SMS_SAGLAYICI = netgsm
//   NETGSM_KULLANICI = 850xxxxxxx
//   NETGSM_SIFRE     = ****
//   NETGSM_BASLIK    = KIRSEHIRIL     (onaylı mesaj başlığınız)
//
// GEREKLİ SECRETS — WhatsApp için (Meta Cloud API):
//   WA_TOKEN        = EAAG...
//   WA_TELEFON_ID   = 1234567890
//   WA_SABLON       = ariza_bildirimi     (onaylı şablon adı)
//
// Not: WhatsApp'ta kuruma onaylı şablon gerekir; serbest metin yalnızca
// kullanıcı son 24 saat içinde yazdıysa gider. Şablon onayı Meta'dan alınır.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const yanit = (govde: unknown, kod = 200) =>
  new Response(JSON.stringify(govde), {
    status: kod,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

// Türkiye numarasını 90XXXXXXXXXX biçimine getirir
function numaraDuzelt(tel: string): string | null {
  const r = String(tel || '').replace(/[^\d]/g, '');
  if (r.length === 10 && r.startsWith('5')) return '90' + r;
  if (r.length === 11 && r.startsWith('05')) return '90' + r.slice(1);
  if (r.length === 12 && r.startsWith('90')) return r;
  if (r.length === 13 && r.startsWith('090')) return r.slice(1);
  return null;
}

async function smsGonder(numaralar: string[], metin: string) {
  const saglayici = (Deno.env.get('SMS_SAGLAYICI') || 'netgsm').toLowerCase();
  if (saglayici === 'netgsm') {
    const kullanici = Deno.env.get('NETGSM_KULLANICI');
    const sifre = Deno.env.get('NETGSM_SIFRE');
    const baslik = Deno.env.get('NETGSM_BASLIK');
    if (!kullanici || !sifre || !baslik) {
      return { ok: false, hata: 'Netgsm bilgileri eksik — NETGSM_KULLANICI, NETGSM_SIFRE ve NETGSM_BASLIK secret olarak girilmeli.' };
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody><header><company dil="TR">Netgsm</company><usercode>${kullanici}</usercode>
<password>${sifre}</password><type>1:n</type><msgheader>${baslik}</msgheader></header>
<body><msg><![CDATA[${metin}]]></msg>${numaralar.map(n => `<no>${n}</no>`).join('')}</body></mainbody>`;
    const r = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml
    });
    const govde = (await r.text()).trim();
    // Netgsm başarıda "00 <görevno>", hatada iki haneli kod döner
    const kod = govde.split(' ')[0];
    const hatalar: Record<string, string> = {
      '20': 'Mesaj metni çok uzun ya da karakter hatası var.',
      '30': 'Kullanıcı adı, şifre yanlış ya da API erişimi kapalı.',
      '40': 'Mesaj başlığı (msgheader) sistemde onaylı değil.',
      '50': 'Abonelik IYS kontrollü, gönderim yapılamıyor.',
      '51': 'Aboneliğinizde IYS marka bilgisi eksik.',
      '70': 'Hatalı sorgu — parametrelerden biri eksik.'
    };
    if (kod === '00' || kod === '01' || kod === '02') return { ok: true, referans: govde };
    return { ok: false, hata: hatalar[kod] || ('Netgsm hata kodu: ' + govde) };
  }
  return { ok: false, hata: 'Tanımsız SMS sağlayıcı: ' + saglayici };
}

async function whatsappGonder(numaralar: string[], metin: string, sablonDegerler: string[]) {
  const token = Deno.env.get('WA_TOKEN');
  const telefonId = Deno.env.get('WA_TELEFON_ID');
  const sablon = Deno.env.get('WA_SABLON');
  if (!token || !telefonId) {
    return { ok: false, hata: 'WhatsApp bilgileri eksik — WA_TOKEN ve WA_TELEFON_ID secret olarak girilmeli.' };
  }
  const sonuc: { no: string; ok: boolean; hata?: string }[] = [];
  for (const no of numaralar) {
    const govde = sablon
      ? {
          messaging_product: 'whatsapp', to: no, type: 'template',
          template: {
            name: sablon, language: { code: 'tr' },
            components: [{
              type: 'body',
              parameters: (sablonDegerler.length ? sablonDegerler : [metin]).map(t => ({ type: 'text', text: t }))
            }]
          }
        }
      : { messaging_product: 'whatsapp', to: no, type: 'text', text: { body: metin } };
    const r = await fetch(`https://graph.facebook.com/v20.0/${telefonId}/messages`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(govde)
    });
    const c = await r.json().catch(() => ({}));
    if (r.ok) sonuc.push({ no, ok: true });
    else sonuc.push({ no, ok: false, hata: (c?.error?.message) || ('HTTP ' + r.status) });
  }
  const basarili = sonuc.filter(x => x.ok).length;
  if (!basarili) return { ok: false, hata: sonuc[0]?.hata || 'WhatsApp gönderilemedi.' };
  return { ok: true, referans: basarili + '/' + numaralar.length + ' gönderildi' };
}

Deno.serve(async (istek) => {
  if (istek.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (istek.method !== 'POST') return yanit({ ok: false, hata: 'Yalnızca POST.' }, 405);

  let g: any = {};
  try { g = await istek.json(); } catch { return yanit({ ok: false, hata: 'Gövde okunamadı.' }, 400); }

  // Oturum denetimi: program kendi jeton düzenini kullanıyor (Supabase Auth
  // değil), bu yüzden jeton oturum_ac işleviyle doğrulanır.
  const sb = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
  const jeton = String(g.token || '').trim();
  if (!jeton) return yanit({ ok: false, hata: 'Oturum jetonu gelmedi — programdan çıkıp yeniden girin.' }, 401);
  const { data: oturumSonuc, error: oturumHata } = await sb.rpc('oturum_ac', { p_token: jeton });
  const kullanici = Array.isArray(oturumSonuc) ? oturumSonuc[0] : oturumSonuc;
  if (oturumHata || !kullanici || kullanici.ok === false) {
    return yanit({ ok: false, hata: 'Oturum geçersiz ya da süresi dolmuş — çıkıp yeniden girin.' }, 401);
  }
  const kimAd = kullanici.ad || kullanici.kullanici_ad || 'bilinmiyor';

  const kanal = (g.kanal || 'SMS');
  const metin = String(g.metin || '').trim();
  const deneme = !!g.deneme;
  const hamNumaralar: string[] = Array.isArray(g.numaralar) ? g.numaralar : [];

  if (!metin) return yanit({ ok: false, hata: 'Mesaj metni boş.' }, 400);

  const numaralar = hamNumaralar.map(numaraDuzelt).filter(Boolean) as string[];
  const bozuk = hamNumaralar.length - numaralar.length;
  if (!numaralar.length) {
    return yanit({ ok: false, hata: 'Geçerli telefon numarası yok. Ayarlar > Ekipler bölümünde numaraları 0532... biçiminde girin.' }, 400);
  }

  // Bağlantı denemesi: gerçek mesaj atmadan yapılandırmayı sınar
  if (deneme) {
    const eksik: string[] = [];
    if (kanal !== 'WhatsApp' && !Deno.env.get('NETGSM_KULLANICI')) eksik.push('NETGSM_KULLANICI');
    if (kanal !== 'WhatsApp' && !Deno.env.get('NETGSM_SIFRE')) eksik.push('NETGSM_SIFRE');
    if (kanal !== 'WhatsApp' && !Deno.env.get('NETGSM_BASLIK')) eksik.push('NETGSM_BASLIK');
    if (kanal !== 'SMS' && !Deno.env.get('WA_TOKEN')) eksik.push('WA_TOKEN');
    if (kanal !== 'SMS' && !Deno.env.get('WA_TELEFON_ID')) eksik.push('WA_TELEFON_ID');
    return yanit({
      ok: eksik.length === 0,
      deneme: true,
      hata: eksik.length ? 'Sunucu ayarlarında eksik: ' + eksik.join(', ') : undefined,
      bilgi: eksik.length ? undefined
        : 'Bağlantı hazır. ' + numaralar.length + ' numara geçerli'
          + (bozuk ? ', ' + bozuk + ' numara okunamadı' : '') + '. Mesaj gönderilmedi.'
    });
  }

  let sonuc: { ok: boolean; hata?: string; referans?: string };
  if (kanal === 'WhatsApp') {
    sonuc = await whatsappGonder(numaralar, metin, Array.isArray(g.sablonDegerler) ? g.sablonDegerler : []);
  } else if (kanal === 'İkisi birlikte') {
    const a = await smsGonder(numaralar, metin);
    const b = await whatsappGonder(numaralar, metin, Array.isArray(g.sablonDegerler) ? g.sablonDegerler : []);
    sonuc = a.ok || b.ok
      ? { ok: true, referans: 'SMS: ' + (a.ok ? 'gitti' : a.hata) + ' · WhatsApp: ' + (b.ok ? 'gitti' : b.hata) }
      : { ok: false, hata: 'SMS: ' + a.hata + ' · WhatsApp: ' + b.hata };
  } else {
    sonuc = await smsGonder(numaralar, metin);
  }

  // Gönderim kaydı denetim izine yazılır (tablo varsa)
  try {
    await sb.from('denetim').insert({
      sinif: 'bildirim',
      ne: sonuc.ok ? 'Mesaj gönderildi' : 'Mesaj gönderilemedi',
      detay: kanal + ' · ' + numaralar.length + ' numara · ' + (sonuc.referans || sonuc.hata || ''),
      kapsam: String(g.kapsam || ''),
      kim: kimAd,
      nereden: 'Sunucu'
    });
  } catch { /* denetim tablosu kurulmamışsa gönderim yine yapılır */ }

  return yanit({
    ...sonuc,
    gonderilen: numaralar.length,
    okunamayan: bozuk
  }, sonuc.ok ? 200 : 502);
});
