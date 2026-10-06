#!/usr/bin/env node
// Masaüstü ↔ telefon eşdeğerlik kontrolü.
//
// Masaüstü ve telefon şablonları ayrı parçalardır; bir özelliğin (düğme, giriş kutusu...) yalnız bir tarafa
// eklenip ötekine unutulması bu yüzden mümkün. Bu araç, her iki tarafta kullanılan EYLEM bağlarını
// (onClick/onChange/onInput/... = "{{ ... }}") karşılaştırır ve yalnız bir tarafta bulunanları listeler.
//
//   node esdeger-kontrol.js            özet + yeni farklar (varsa çıkış kodu 1)
//   node esdeger-kontrol.js --tum      bütün farklar (bilinenler dahil), modüle göre
//   node esdeger-kontrol.js --yaz      şu anki farkları "bilinen" listesine yazar (bilerek farklı olduğuna karar verdiklerinizi)
//
// Bilinen fark listesi: src/esdeger-bilinen.json  { "<yuzey>:<baglama>": "<neden>" }
//   yuzey = "masaustu" (yalnız masaüstünde var) | "telefon" (yalnız telefonda var)
// Bir fark gerçekten eksik özellikse listeye YAZMAYIN — öteki tarafa ekleyin.

const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const SRC = path.join(KOK, 'src');
const BILINEN = path.join(SRC, 'esdeger-bilinen.json');
const ISARET = /^<!--@dahil (.+?)-->$/;
const oku = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// Bir yüzeyin metnini üretir; dahil edilen parçalar açılır, dosya sınırları işaretlenir.
function ac(yuzey) {
  const cikti = [];
  const kabuk = oku(path.join(SRC, 'kabuk.html')).split('\n');
  let bolge = 'ortak';
  const isle = (satirlar, kaynak, taraf) => {
    for (const s of satirlar) {
      const m = s.match(ISARET);
      if (m) {
        const yol = m[1].trim();
        const dosya = path.join(SRC, yol);
        if (!fs.existsSync(dosya)) continue;
        const t = yol.includes('/masaustu/') ? 'masaustu' : yol.includes('/telefon/') ? 'telefon' : taraf;
        if (t !== 'ortak' && t !== yuzey) continue;
        cikti.push('\u0001' + yol + '\u0001');
        isle(oku(dosya).split('\n'), yol, t);
        cikti.push('\u0001' + kaynak + '\u0001');
      } else if (taraf === 'ortak' || taraf === yuzey) cikti.push(s);
    }
  };
  // kabuk satırlarını bölgeye göre işle
  for (const s of kabuk) {
    if (s.startsWith('<!-- ══════════════ MASAÜSTÜ')) bolge = 'masaustu';
    else if (s.startsWith('<!-- ══════════════ TELEFON')) bolge = 'telefon';
    else if (s.startsWith('<!-- ══════════════ ALAN DÜZENLEME')) bolge = 'ortak';
    isle([s], 'kabuk.html', bolge);
  }
  return cikti.join('\n');
}

// Eylem bağlarını çıkarır; sc-for takma adları listenin adına çevrilir (w.go -> faultForm.workflow[].go)
function eylemler(metin) {
  const sonuc = new Map();             // bağ -> Set(dosya)
  const takma = [];                    // sc-for yığını [{ad, liste}]
  let dosya = 'kabuk.html';
  const yigin = ['kabuk.html'];
  const re = /\u0001([^\u0001]+)\u0001|<(\/?)sc-for\b([^>]*)>|\b(on[A-Z]\w*)="\{\{\s*([^}]*?)\s*\}\}"/g;
  let m;
  while ((m = re.exec(metin))) {
    if (m[1]) {
      if (yigin.length > 1 && yigin[yigin.length - 2] === m[1]) yigin.pop(); else yigin.push(m[1]);
      dosya = yigin[yigin.length - 1];
    } else if (m[3] !== undefined) {
      if (m[2]) takma.pop();
      else {
        const l = m[3].match(/list="\{\{\s*([^}]*?)\s*\}\}"/), a = m[3].match(/\bas="([^"]+)"/);
        takma.push({ ad: a ? a[1] : null, liste: l ? l[1] : '?' });
      }
    } else {
      let b = m[5];
      for (let i = takma.length - 1; i >= 0; i--) {
        const t = takma[i];
        if (t.ad && (b === t.ad || b.startsWith(t.ad + '.'))) { b = t.liste + '[]' + b.slice(t.ad.length); break; }
      }
      if (!sonuc.has(b)) sonuc.set(b, new Set());
      sonuc.get(b).add(dosya);
    }
  }
  return sonuc;
}

const masa = eylemler(ac('masaustu'));
const tel = eylemler(ac('telefon'));
const modulDe = dosyalar => {
  const d = [...dosyalar][0] || '';
  const x = d.match(/^moduller\/([^/]+)\//);
  return x ? x[1] : 'kabuk';
};
const farklar = {};   // anahtar -> {modul, dosyalar}
for (const [b, d] of masa) if (!tel.has(b)) farklar['masaustu:' + b] = { modul: modulDe(d), dosyalar: [...d] };
for (const [b, d] of tel) if (!masa.has(b)) farklar['telefon:' + b] = { modul: modulDe(d), dosyalar: [...d] };

const bilinen = fs.existsSync(BILINEN) ? JSON.parse(oku(BILINEN)) : {};
const arg = process.argv.slice(2);

// Başlangıç sınıflaması (2026-10-07): ilk taramada bulunan farklar nedenleriyle yazıldı.
const NEDENLER = [
  [/^masaustu:(imp\.|goSettings|r\.types)/, "tasarım: toplu aktarım yalnız bilgisayarda (telefonda Ayarlar'a yönlendirir)"],
  [/^telefon:(faultForm\.sade|saha\.|faultForm\.sadeyeDon)/, 'tasarım: telefonda sade saha ekranı (masaüstünde ayrıntılı arıza formu aynı işi yapar)'],
  [/^masaustu:(arzKontrol|envKontrol)\.h\./, 'tasarım: masaüstü tablo başlığından sıralama (telefonda açılır sıralama: onSira/yonTik)'],
  [/^telefon:(arzKontrol|envKontrol)\.(onSira|yonTik|temizle)/, 'tasarım: telefonda açılır sıralama (masaüstünde tablo başlığı)'],
  [/^masaustu:naSz\.|^masaustu:naAc$/, 'tasarım: masaüstü yeni tesis sihirbazı (telefonda İşlem > senaryolar akışı)'],
  [/^telefon:(telSuz|telMenu|navPhone|menuSayfa|otherScreens)/, 'tasarım: telefon gezinmesi (alt çubuk, açılır menü, süzgeç/araç şeridi)'],
  [/^masaustu:(toggleTheme|toggleYardim|esitle\.tik|panelKapat|closeDetail)/, 'tasarım: masaüstü üst çubuk/sağ panel düğmeleri (telefonda menü ve tam ekran paneller)'],
  [/^masaustu:faultForm\.onIscilik/, 'EKSİK ADAYI: işçilik girişi telefondaki ayrıntılı arıza formunda yok'],
  [/^masaustu:faultForm\.haritada/, 'EKSİK ADAYI: arıza kartında "Haritada göster" telefonda yok'],
  [/^masaustu:isListesi\./, 'EKSİK ADAYI: günlük iş listesi satırından kayda gitme — telefonda saha ekranı farklı çalışıyor, eşdeğerini doğrulayın'],
  [/^masaustu:ozet\.(onIlce|onOzel|zamanSec|sekmeSec)/, 'EKSİK ADAYI: Özet ilçe/zaman aralığı süzgeci telefonda yok (telefon yalnız sekme seçer)'],
  [/^masaustu:ekipPano\.(aracDefteri|ekipDuzenle)/, 'EKSİK ADAYI: ekip panosu kısayolları (araç defteri, ekip düzenle) telefonda yok'],
  [/^masaustu:detail\.fotoSekme/, 'EKSİK ADAYI: tesis kartında "Fotoğraf" kısayol düğmesi telefonda yok'],
  [/^telefon:telSuz\./, 'tasarım: telefon süzgeç/araç şeridi'],
];
const neden = k => { for (const [re, n] of NEDENLER) if (re.test(k)) return n; return 'başlangıç: incelenmedi (bilerek farklı olabilir; gerçek eksikse öteki tarafa ekleyin ve satırı silin)'; };

if (arg.includes('--yaz')) {
  const yeni = {};
  for (const k of Object.keys(farklar).sort()) yeni[k] = bilinen[k] || neden(k);
  fs.writeFileSync(BILINEN, JSON.stringify(yeni, null, 2) + '\n');
  console.log(Object.keys(yeni).length + ' fark bilinen listesine yazıldı: src/esdeger-bilinen.json');
  process.exit(0);
}

const yeniFark = Object.keys(farklar).filter(k => !(k in bilinen));
const eskimis = Object.keys(bilinen).filter(k => !(k in farklar));

if (arg.includes('--tum')) {
  const grup = {};
  for (const [k, v] of Object.entries(farklar)) (grup[v.modul] = grup[v.modul] || []).push(k + (k in bilinen ? '' : '   <-- YENİ'));
  for (const m of Object.keys(grup).sort()) { console.log('\n' + m); for (const s of grup[m].sort()) console.log('  ' + s); }
  console.log('\nToplam fark: ' + Object.keys(farklar).length + ' (bilinen ' + (Object.keys(farklar).length - yeniFark.length) + ', yeni ' + yeniFark.length + ')');
  process.exit(0);
}

console.log(`Eylem bağı: masaüstü ${masa.size}, telefon ${tel.size}; yalnız bir tarafta olan ${Object.keys(farklar).length} (bilinen ${Object.keys(farklar).length - yeniFark.length}).`);
const adaylar = Object.keys(bilinen).filter(k => k in farklar && String(bilinen[k]).startsWith('EKSİK ADAYI'));
if (adaylar.length) console.log(`İnceleme bekleyen eksik adayı: ${adaylar.length} (bilgi; ayrıntı: node esdeger-kontrol.js --adaylar)`);
if (arg.includes('--adaylar')) { for (const k of adaylar) console.log('  ' + k + ' — ' + bilinen[k]); process.exit(0); }
if (eskimis.length) console.log(`Not: bilinen listesindeki ${eskimis.length} kayıt artık fark değil (düzeltilmiş) — src/esdeger-bilinen.json'dan silebilirsiniz: ${eskimis.slice(0, 5).join(', ')}${eskimis.length > 5 ? ' …' : ''}`);
if (yeniFark.length) {
  console.error('\nYENİ masaüstü/telefon farkı — özellik yalnız bir tarafa eklenmiş olabilir:');
  for (const k of yeniFark) { const v = farklar[k]; console.error(`  ${k}   [${v.modul}: ${v.dosyalar.join(', ')}]`); }
  console.error('\nÖteki tarafa ekleyin; bilerek farklıysa: node esdeger-kontrol.js --yaz (ve nedenini src/esdeger-bilinen.json\'a yazın).');
  process.exit(1);
}
