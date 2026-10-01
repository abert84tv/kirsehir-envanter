// Kırşehir Envanter — "talep-siniflandir" sunucu işlevi (Supabase Edge Function)
//
// Vatandaş/muhtar başvurusunun metnini (WhatsApp, Telegram, SMS, telefon
// notu, sesli mesajın yazıya dökümü) yapay zekâyla ön sınıflandırır:
// iş grubu, arıza türü, aciliyet, metinde geçen köy. Operatör ekranına
// "Yapay zekâ önerisi" olarak gelir; operatör onaylar ya da değiştirir.
//
// KURULUM (bir kez):
//   Supabase > Edge Functions > Secrets: ANTHROPIC_API_KEY = (Anthropic
//   konsolundan alınan anahtar). Anahtar tarayıcıya hiç gelmez, yalnız bu
//   işlevde durur. Anahtar yoksa işlev {ok:false, anahtarYok:true} döner ve
//   program kurala dayalı öneriyle çalışmayı sürdürür.
//
// Güvenlik: yalnız programda oturum açmış kullanıcı çağırabilir (uygulama
// oturum anahtarı oturum_ac ile doğrulanır). Metin 2000 karakterle sınırlı.

const GRUPLAR: Record<string, string[]> = {
  su: ['Boru patlağı', 'Boru kaçağı / sızıntı', 'Su yok / kesinti', 'Basınç düşüklüğü', 'Vana arızası',
    'Vana kaçağı', 'Abone bağlantısı arızası', 'Sayaç arızası', 'Bulanık / kirli su', 'Çeşme / hidrant arızası', 'Donma', 'Diğer'],
  kuyu: ['Pompa çalışmıyor', 'Debi düşüklüğü', 'Motor aşırı akım', 'Motor yandı', 'Kolon borusu kaçağı',
    'Çekvalf arızası', 'Kuyu kumlanması', 'Seviye / şamandıra arızası', 'Kuyu başı kaçağı', 'RF haberleşme kesildi', 'Diğer'],
  depo: ['Depo kaçağı / çatlak', 'Taşma', 'Klorlama cihazı arızası', 'Klor yetersiz / fazla', 'Seviye sensörü arızası',
    'Giriş / çıkış vanası arızası', 'Kapak / güvenlik', 'Temizlik gerekiyor', 'RF modülü arızası', 'Diğer'],
  elektrik: ['Elektrik kesintisi', 'Sigorta attı', 'Kontaktör / röle arızası', 'Kablo arızası', 'Pano su aldı',
    'Termik attı', 'Faz kaybı', 'Trafo arızası', 'Topraklama sorunu', 'Kompanzasyon arızası', 'Diğer'],
  ges: ['İnverter arızası', 'Panel kırığı', 'Panel kirli', 'Üretim düşüklüğü', 'Bağlantı / şalt arızası', 'Kablo / konnektör arızası', 'Diğer'],
  kanal: ['Tıkanıklık', 'Taşma', 'Rögar kapağı kırık / yok', 'Koku', 'Hat çökmesi / göçük', 'Foseptik dolu', 'Diğer']
};
const GRUP_AD: Record<string, string> = {
  su: 'Su şebekesi / boru hattı', kuyu: 'Kuyu ve pompa', depo: 'Depo', elektrik: 'Elektrik / pano', ges: 'GES', kanal: 'Kanalizasyon'
};
const ILCELER = ['Merkez', 'Akçakent', 'Akpınar', 'Boztepe', 'Çiçekdağı', 'Kaman', 'Mucur'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const yanit = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return yanit({ ok: false, err: 'Yalnız POST.' }, 405);
  let govde: { token?: string; metin?: string };
  try { govde = await req.json(); } catch { return yanit({ ok: false, err: 'Geçersiz istek.' }, 400); }
  const metin = String(govde.metin || '').trim().slice(0, 2000);
  if (metin.length < 4) return yanit({ ok: false, err: 'Metin çok kısa.' }, 400);

  // Uygulama oturumu doğrulanır
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon || !govde.token) return yanit({ ok: false, err: 'Oturum doğrulanamadı.' }, 401);
  const o = await fetch(url + '/rest/v1/rpc/oturum_ac', {
    method: 'POST',
    headers: { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: govde.token })
  });
  const oj = o.ok ? await o.json() : null;
  if (!oj || (Array.isArray(oj) && !oj.length)) return yanit({ ok: false, err: 'Oturum geçersiz — çıkıp yeniden girin.' }, 401);

  const anahtar = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anahtar) return yanit({ ok: false, anahtarYok: true, err: 'Yapay zekâ anahtarı kurulmamış (Supabase > Edge Functions > Secrets: ANTHROPIC_API_KEY).' });

  const sistem = 'Kırşehir İl Özel İdaresi köy hizmetleri için gelen vatandaş/muhtar başvurularını sınıflandırırsın. '
    + 'Başvuru metni Türkçe, kısa, yazım hatalı ya da sesli mesaj dökümü olabilir. '
    + 'Yalnız aşağıdaki iş gruplarından ve türlerden seç; uydurma değer verme.\n'
    + Object.keys(GRUPLAR).map(g => `- ${g} (${GRUP_AD[g]}): ${GRUPLAR[g].join(' | ')}`).join('\n')
    + '\nAciliyet: Acil (köyün tamamı susuz, boru patlağı, sel, sağlık/okul etkileniyor), Yüksek (uzun süren kesinti, birden çok hane), Normal, Düşük (bilgi/istek).'
    + `\nİlçeler: ${ILCELER.join(', ')}. Köy adı metinde geçiyorsa olduğu gibi yaz, geçmiyorsa null.`
    + '\nYalnız şu JSON nesnesini döndür, başka hiçbir şey yazma: '
    + '{"grup": "...", "tur": "...", "oncelik": "Acil|Yüksek|Normal|Düşük", "koy": "..." | null, "ilce": "..." | null, "ozet": "en çok 12 kelimelik özet", "gerekce": "kısa gerekçe"}';

  let ai: Response;
  try {
    ai = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 300, system: sistem,
        messages: [{ role: 'user', content: 'Başvuru metni:\n"""\n' + metin + '\n"""' }]
      })
    });
  } catch (e) {
    return yanit({ ok: false, err: 'Yapay zekâ servisine ulaşılamadı.' }, 502);
  }
  if (!ai.ok) return yanit({ ok: false, err: 'Yapay zekâ servisi hata verdi (' + ai.status + ').' }, 502);
  const aj = await ai.json();
  const yazi = (aj.content || []).map((c: { text?: string }) => c.text || '').join('').trim();
  let sonuc: Record<string, unknown>;
  try { sonuc = JSON.parse(yazi.slice(yazi.indexOf('{'), yazi.lastIndexOf('}') + 1)); }
  catch { return yanit({ ok: false, err: 'Yapay zekâ yanıtı okunamadı.' }, 502); }
  // Liste dışı değerler atılır
  const grup = typeof sonuc.grup === 'string' && GRUPLAR[sonuc.grup] ? sonuc.grup : null;
  const tur = grup && typeof sonuc.tur === 'string' && GRUPLAR[grup].includes(sonuc.tur) ? sonuc.tur : (grup ? GRUPLAR[grup][0] : null);
  const oncelik = ['Acil', 'Yüksek', 'Normal', 'Düşük'].includes(String(sonuc.oncelik)) ? sonuc.oncelik : 'Normal';
  const ilce = ILCELER.includes(String(sonuc.ilce)) ? sonuc.ilce : null;
  return yanit({
    ok: true, grup, tur, oncelik, ilce,
    koy: typeof sonuc.koy === 'string' && sonuc.koy.trim() ? sonuc.koy.trim().slice(0, 60) : null,
    ozet: typeof sonuc.ozet === 'string' ? sonuc.ozet.slice(0, 160) : '',
    gerekce: typeof sonuc.gerekce === 'string' ? sonuc.gerekce.slice(0, 200) : ''
  });
});
