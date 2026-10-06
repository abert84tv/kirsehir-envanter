#!/usr/bin/env node
// Modül ekleme / çıkarma aracı.
//
//   node yeni-modul.js <ad> "<açıklama>" [--sayfa]   yeni modül iskeleti kurar ve kabuğa bağlar
//   node yeni-modul.js --kaldir <ad> [--zorla]       modülü kabuktan ve diskten kaldırır
//
// <ad>: küçük harf ve tire (ör. rapor, is-emri). --sayfa: masaüstü + telefon sayfa şablonu ve görünüm özelliği de üretir.
// Sonra: node build.js && node duman-testi.js
// "Elle yapılacaklar" çıktısını okuyun (menü girdisi, "tab" anahtarı, yetki) — bunlar bilinçli olarak otomatik değildir.

const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const SRC = path.join(KOK, 'src');
const MOD = path.join(SRC, 'moduller');
const KABUK = path.join(SRC, 'kabuk.html');
const BAGLANTI = path.join(SRC, 'baglanti', 'kabuk.js');
const oku = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const yaz = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const bitir = (m, kod = 1) => { console.error(m); process.exit(kod); };

const arg = process.argv.slice(2);
const bayrak = b => arg.includes(b);
const konum = arg.filter(a => !a.startsWith('--'));

// ---- kaldır
if (bayrak('--kaldir')) {
  const ad = konum[0];
  if (!ad || !fs.existsSync(path.join(MOD, ad))) bitir('Kaldırılacak modül bulunamadı: ' + (ad || '(ad verilmedi)'));
  if (ad === 'cekirdek') bitir('Çekirdek kaldırılamaz.');
  if (!bayrak('--zorla')) {
    const { execFileSync } = require('child_process');
    const cikti = execFileSync(process.execPath, [path.join(KOK, 'modul-bilgi.js'), ad]).toString();
    const kul = (cikti.match(/Bu modülü kullananlar: (.*)/) || [])[1] || '';
    if (kul && kul !== 'yok') bitir(`"${ad}" başka modüller tarafından kullanılıyor, kaldırılırsa onlar bozulur:\n  ${kul}\nÖnce o kullanımları temizleyin ya da bilerek devam etmek için --zorla ekleyin.`);
  }
  const temizle = dosya => {
    const t = oku(dosya).split('\n').filter(s => !new RegExp('@dahil moduller/' + ad.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '/').test(s));
    fs.writeFileSync(dosya, t.join('\n'));
  };
  temizle(KABUK); temizle(BAGLANTI);
  fs.rmSync(path.join(MOD, ad), { recursive: true, force: true });
  console.log(`"${ad}" kaldırıldı (kabuktaki dahil satırları ve klasör). Şimdi: node build.js && node duman-testi.js`);
  console.log('Elle kalanlar: menü/SUZGEC_TANIM girdisi, cekirdek "tab" anahtarı, yetki (PERMS) ve başka modüllerdeki kalıntı çağrılar (duman-testi/tarayıcıda hata verir).');
  process.exit(0);
}

// ---- ekle
const ad = konum[0];
const aciklama = konum[1] || 'Açıklama ekleyin';
if (!ad || !/^[a-z][a-z0-9-]*$/.test(ad)) bitir('Kullanım: node yeni-modul.js <ad> "<açıklama>" [--sayfa]   (ad: küçük harf/rakam/tire)');
if (fs.existsSync(path.join(MOD, ad))) bitir('Bu modül zaten var: ' + ad);
const c = camel(ad);
const sayfa = bayrak('--sayfa');
const kok = path.join(MOD, ad);

yaz(path.join(kok, 'modul.json'), JSON.stringify({ ad, aciklama, ...(sayfa ? { sayfalar: [ad] } : {}) }, null, 2) + '\n');
yaz(path.join(kok, 'yontemler.js'),
  `  // ${ad} modülü — sınıf yöntemleri (iki boşluk girintili; yöntem sırası önemsiz)\n  ${c}Baslat() {\n    // örnek: this.setState({ ... });\n  }`);
yaz(path.join(kok, 'gorunum.js'),
  sayfa ? `      // ${ad} modülü — görünüm özellikleri (renderVals dönüş nesnesine eklenir; her özellik virgülle biter)\n      ${c}Ekran: { baslik: '${ad}' },`
        : `      // ${ad} modülü — görünüm özellikleri (renderVals dönüş nesnesine eklenir; her özellik virgülle biter)\n      ${c}Bilgi: { ad: '${ad}' },`);

const sayfaHtml = yuzey => `<sc-if value="{{ tab.${c} }}" hint-placeholder-val="{{ false }}">
<div class="scroll" style="flex:1;overflow:auto;min-height:0;background:{{ ui.bg }}">
<div style="padding:${yuzey === 'telefon' ? '14px' : '16px 20px'};border-bottom:1px solid {{ ui.rule }};background:{{ ui.surf }}">
<h2 style="font:600 19px/1 var(--font-heading);letter-spacing:-.022em;margin:0">{{ ${c}Ekran.baslik }}</h2>
</div>
</div>
</sc-if>`;
if (sayfa) {
  yaz(path.join(kok, 'masaustu', `tab-${ad}.html`), sayfaHtml('masaustu'));
  yaz(path.join(kok, 'telefon', `tab-${ad}.html`), sayfaHtml('telefon'));
}

// kabuğa bağla: ilgili listelerin sonuna ekle
let kabuk = oku(KABUK).split('\n');
const sonIndeks = re => { let k = -1; kabuk.forEach((s, i) => { if (re.test(s)) k = i; }); return k; };
const ekleSonra = (re, satir) => { const k = sonIndeks(re); if (k < 0) bitir('Kabukta bağlanacak yer bulunamadı: ' + re); kabuk.splice(k + 1, 0, satir); };
ekleSonra(/^\/\/@dahil moduller\/[^/]+\/yontemler\.js$/, `//@dahil moduller/${ad}/yontemler.js`);
ekleSonra(/^\/\/@dahil moduller\/[^/]+\/gorunum\.js$/, `//@dahil moduller/${ad}/gorunum.js`);
if (sayfa) {
  ekleSonra(/^<!--@dahil moduller\/[^/]+\/masaustu\/tab-[^/]+\.html-->$/, `<!--@dahil moduller/${ad}/masaustu/tab-${ad}.html-->`);
  ekleSonra(/^<!--@dahil moduller\/[^/]+\/telefon\/tab-[^/]+\.html-->$/, `<!--@dahil moduller/${ad}/telefon/tab-${ad}.html-->`);
}
fs.writeFileSync(KABUK, kabuk.join('\n'));

console.log(`"${ad}" modülü kuruldu: src/moduller/${ad}/ (kabuğa bağlandı). Sonra: node build.js && node duman-testi.js`);
console.log('\nElle yapılacaklar:');
if (sayfa) {
  console.log(`  1) Görünen sayfa için cekirdek "tab" özelliğine anahtar ekleyin: ${c}: tabId === '${c}'   (src/moduller/cekirdek/gorunum/ altında "tab:" bloğu)`);
  console.log(`  2) Menüde görünmesi için SUZGEC_TANIM'a girdi ekleyin (src/sabitler/10-sayfa-suzgec.js) ve SAYFALAR/yetki tablosuna ('${c}')`);
} else {
  console.log('  (sayfa üretilmedi — yalnız mantık/görünüm modeli.) Sayfa isterseniz: node yeni-modul.js ' + ad + ' --sayfa değil, mevcut modül klasörüne masaustu/ ve telefon/ şablonu ekleyip kabuğa bağlayın.');
}
console.log("  3) Sunucu tarafı gerekiyorsa: sql/ klasörüne SQL (Supabase'e uygulayın), baglanti/ klasörüne işlev ve src/baglanti/kabuk.js'e dahil satırı.");
console.log('  4) Açma/kapama anahtarı istiyorsanız modul.json "modulAnahtari" ve Ayarlar > Modüller listesi (src/moduller/ayarlar/gorunum/).');
