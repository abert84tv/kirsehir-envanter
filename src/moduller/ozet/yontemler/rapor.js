  // ── Envanter raporları: Genel rapor, İlçe raporu, Köy karnesi (PDF = yazdırma penceresi) ve çok sayfalı Excel.
  // Yalnız envanteri anlatır: tesis, köy, ilçe, hizmet durumu, hat uzunluğu, baca/vana, veri eksikleri.
  // Arıza / ekip / malzeme bölümleri yalnız Arıza modülü açıkken (Genel rapor'un sonunda) çıkar.
  // PDF raporlarda "Deneme…" köylerindeki test kayıtları hesaba katılmaz (altta kaç kayıt dışarıda kaldığı yazar);
  // Excel tam veri dışa aktarımıdır, hepsini içerir.
  raporKacis(x) { return String(x === undefined || x === null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  raporKm(m) { return (m / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km'; }
  raporHatAd(t) { return ({ terfi: 'Terfi hattı', isale: 'İsale hattı', sebeke: 'Şebeke hattı', ag: 'AG enerji hattı', og: 'OG enerji hattı', dc: 'GES DC hattı' })[t] || 'Hat'; }
  // Veri: tesisler, hat parçaları (bağlı oldukları tesisle), köy ve ilçe özetleri
  raporVeri(testHaric) {
    const s = this.state;
    const test = a => /^deneme/i.test(String(a.village || '').trim());
    const tum = (s.assets || []).filter(a => a);
    const assets = testHaric ? tum.filter(a => !test(a)) : tum;
    const hatlar = [];
    for (const a of assets) {
      for (const h of ((s.hatlar || {})[a.id] || [])) {
        if (!h || (h.noktalar || []).length < 2) continue;
        hatlar.push({ a, h, uz: this.hatUzunluk(h.noktalar) });
      }
    }
    const koyAd = a => (a.village || '').trim() || '(köy yazılmamış)';
    const ilceAd = a => (a.district || '').trim() || '(ilçe yok)';
    const harita = new Map();
    const kayit = a => {
      const k = ilceAd(a) + '|' + koyAd(a);
      let o = harita.get(k);
      if (!o) { o = { key: k, ilce: ilceAd(a), koy: koyAd(a), n: 0, kuyu: 0, depo: 0, ag: 0, ges: 0, baca: 0, vana: 0, aktif: 0, pasif: 0, hat: 0, oto: 0, tesisler: [], hatlar: [] }; harita.set(k, o); }
      return o;
    };
    for (const a of assets) {
      const o = kayit(a);
      o.n++; o[a.type] = (o[a.type] || 0) + 1;
      if (aktifMi(a)) o.aktif++; else o.pasif++;
      if (a.d && a.d.koyOtomatik) o.oto++;
      o.tesisler.push(a);
    }
    for (const x of hatlar) { const o = kayit(x.a); o.hat += x.uz; o.hatlar.push(x); }
    const koyler = [...harita.values()].sort((x, y) => x.ilce.localeCompare(y.ilce, 'tr') || x.koy.localeCompare(y.koy, 'tr'));
    const ilceler = new Map();
    for (const o of koyler) {
      const i = ilceler.get(o.ilce) || { ilce: o.ilce, koyler: [], n: 0, kuyu: 0, depo: 0, ag: 0, ges: 0, baca: 0, vana: 0, aktif: 0, pasif: 0, hat: 0 };
      i.koyler.push(o);
      for (const k of ['n', 'kuyu', 'depo', 'ag', 'ges', 'baca', 'vana', 'aktif', 'pasif', 'hat']) i[k] += o[k];
      ilceler.set(o.ilce, i);
    }
    return {
      assets, hatlar, koyler, ilceler: [...ilceler.values()].sort((x, y) => y.n - x.n),
      testSay: tum.length - assets.length, hatToplam: hatlar.reduce((t, x) => t + x.uz, 0)
    };
  }
  raporStil() {
    return '@page{size:A4;margin:14mm}body{font:11px/1.5 Archivo,system-ui,sans-serif;color:#201e1d;margin:0}' +
      'h1{font-size:19px;margin:0 0 4px}h2{font-size:11px;letter-spacing:-.01em;color:#0058b8;margin:18px 0 6px;border-bottom:1px solid #201e1d;padding-bottom:5px}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:4px}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ccc;font-size:10px;vertical-align:top}' +
      'th{background:#eee;font-size:8.5px;letter-spacing:-.01em;text-transform:uppercase}td.s,th.s{text-align:right}' +
      '.k{color:#666;font-size:10px}.kutu{display:flex;gap:8px;margin:10px 0}.kutu div{flex:1;border:1px solid #ccc;border-radius:6px;padding:7px 9px}' +
      '.kutu b{display:block;font-size:17px}.kutu span{color:#666;font-size:9px;text-transform:uppercase}.ay{page-break-before:always}' +
      '.lej{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0;font-size:9px;color:#444}.lej i{display:inline-block;width:14px;height:0;border-top:3px solid;vertical-align:middle;margin-right:4px}' +
      'svg{width:100%;height:auto;border:1px solid #ccc;border-radius:6px;background:#fafafa}';
  }
  raporTablo(bas, satirlar, toplam, sag) {
    const e = x => this.raporKacis(x);
    sag = sag || [];
    const th = bas.map((b, i) => '<th' + (sag.includes(i) ? ' class="s"' : '') + '>' + e(b) + '</th>').join('');
    const tr = satirlar.map(r => '<tr>' + r.map((c, i) => '<td' + (sag.includes(i) ? ' class="s"' : '') + '>' + e(c) + '</td>').join('') + '</tr>').join('');
    const tp = toplam ? '<tr>' + toplam.map((c, i) => '<th' + (sag.includes(i) ? ' class="s"' : '') + '>' + e(c) + '</th>').join('') + '</tr>' : '';
    return '<table><tr>' + th + '</tr>' + tr + tp + '</table>';
  }
  raporPencere(baslik, govde) {
    const w = window.open('', '_blank');
    if (!w) { this.duyur('Tarayıcı yeni sekmeyi engelledi — açılır pencere iznini verip yeniden deneyin.', 8000); return false; }
    w.document.write('<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>' + this.raporKacis(baslik) + '</title><style>' + this.raporStil() + '</style></head><body>' + govde + '</body></html>');
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* engelli */ } }, 600);
    this.duyur('Yazdırma penceresi açıldı — “Hedef: PDF olarak kaydet”i seçin.', 7000);
    return true;
  }
  raporAltNot(v) {
    return '<div class="k" style="margin-top:14px">Hat uzunlukları çizilen güzergâhın harita üzerinden hesabıdır (kuş uçuşu parçalar toplamı); proje uzunluğundan küçük farklar olabilir.' +
      (v.testSay ? ' ' + v.testSay + ' deneme/test kaydı bu rapora dahil edilmedi.' : '') + '</div>';
  }
  // 1) Genel envanter raporu
  raporGenel() {
    const s = this.state, e = x => this.raporKacis(x);
    const v = this.raporVeri(true);
    const arizaOn = (this.props.arizaModulu ?? true) && s.modul.ariza !== false;
    const topAk = v.assets.filter(a => aktifMi(a)).length;
    const turler = ['kuyu', 'depo', 'ag', 'ges', 'baca', 'vana'].map(t => {
      const hep = v.assets.filter(a => a.type === t), ak = hep.filter(a => aktifMi(a)).length;
      return { t, n: hep.length, ak };
    }).filter(x => x.n);
    const satirT = turler.map(x => [TYPES[x.t].kind, x.ak, x.n - x.ak, x.n, Math.round(x.ak / x.n * 100) + '%']);
    const satirI = v.ilceler.map(i => [i.ilce, i.koyler.length, i.kuyu, i.depo, i.baca, i.vana, i.hat ? this.raporKm(i.hat) : '—', i.aktif, i.pasif]);
    // hat dağılımı: çapa göre ve türe göre
    const capHarita = {}, turHarita = {};
    for (const x of v.hatlar) {
      const c = x.h.cap ? 'Ø' + x.h.cap + ' mm' : 'Çap girilmemiş';
      (capHarita[c] = capHarita[c] || { n: 0, uz: 0 }); capHarita[c].n++; capHarita[c].uz += x.uz;
      const t = this.raporHatAd(x.h.tur);
      (turHarita[t] = turHarita[t] || { n: 0, uz: 0 }); turHarita[t].n++; turHarita[t].uz += x.uz;
    }
    const sirala = h => Object.keys(h).sort((a, b) => h[b].uz - h[a].uz).map(k => [k, h[k].n, this.raporKm(h[k].uz)]);
    // veri durumu
    const say = f => v.assets.filter(f).length;
    const veri = [
      ['Köyü yazılmamış kayıt', say(a => !(a.village || '').trim())],
      ['Köyü otomatik yazılmış (doğrulanmamış)', say(a => a.d && a.d.koyOtomatik)],
      ['Konumu yaklaşık (saha ölçümü bekliyor)', say(a => a.coordApprox)],
      ['Fotoğrafı olmayan kayıt', say(a => !a.photos)],
      ['Pasif (hizmet dışı) kayıt', say(a => !aktifMi(a))]
    ];
    let govde = '<h1>Kırşehir su altyapısı — envanter raporu</h1><div class="k">' + e(this.damga()) + '</div>' +
      '<div class="kutu"><div><b>' + v.assets.length + '</b><span>kayıt</span></div><div><b>' + topAk + '</b><span>aktif</span></div><div><b>' + (v.assets.length - topAk) +
      '</b><span>pasif</span></div><div><b>' + this.raporKm(v.hatToplam) + '</b><span>hat</span></div><div><b>' + say(a => a.type === 'baca') + '</b><span>baca</span></div><div><b>' + say(a => a.type === 'vana') + '</b><span>vana</span></div></div>' +
      '<h2>Tür bazında aktif / pasif</h2>' + this.raporTablo(['Tür', 'Aktif', 'Pasif', 'Toplam', 'Aktif oranı'], satirT,
        ['Toplam', topAk, v.assets.length - topAk, v.assets.length, v.assets.length ? Math.round(topAk / v.assets.length * 100) + '%' : '—'], [1, 2, 3, 4]) +
      '<h2>İlçe dağılımı</h2>' + this.raporTablo(['İlçe', 'Köy', 'Kuyu', 'Depo', 'Baca', 'Vana', 'Hat', 'Aktif', 'Pasif'], satirI, null, [1, 2, 3, 4, 5, 6, 7, 8]);
    if (v.hatlar.length) {
      govde += '<h2>Şebeke hatları</h2><div class="k">' + v.hatlar.length + ' hat parçası · toplam ' + e(this.raporKm(v.hatToplam)) + '</div>' +
        this.raporTablo(['Çap', 'Parça', 'Uzunluk'], sirala(capHarita), null, [1, 2]) +
        this.raporTablo(['Hat türü', 'Parça', 'Uzunluk'], sirala(turHarita), null, [1, 2]);
    }
    govde += '<h2>Veri durumu</h2>' + this.raporTablo(['Konu', 'Kayıt'], veri, null, [1]);
    if (arizaOn && (s.faults || []).length) govde += this.raporArizaBolumu();
    govde += this.raporAltNot(v);
    this.raporPencere('Kırşehir envanter raporu', govde);
  }
  // Arıza / ekip / malzeme bölümü (yalnız Arıza modülü açıkken)
  raporArizaBolumu() {
    const s = this.state, e = x => this.raporKacis(x);
    const acik = s.faults.filter(f => !KAPALI_DURUM.includes(f.status));
    const satirF = acik.map(f => {
      const a = s.assets.find(x => x.id === f.assetId) || {};
      return [f.no, a.code || '—', f.type, f.priority, STATUS_LABEL[f.status], f.crew];
    });
    const ekipler = {};
    for (const f of s.faults) {
      const ad = (f.crew || '').trim() || 'Ekip atanmadı';
      const o = (ekipler[ad] = ekipler[ad] || { n: 0, acik: 0, cozulen: 0, tutar: 0 });
      o.n++; if (f.status === 'cozuldu') o.cozulen++; else o.acik++;
      o.tutar += Number(f.maliyet) || 0;
    }
    const ad = Object.keys(ekipler).sort((x, y) => ekipler[y].n - ekipler[x].n);
    const satirE = ad.map(n => [n, ekipler[n].n, ekipler[n].acik, ekipler[n].cozulen, this.tl(ekipler[n].tutar)]);
    return '<h2>Açık arızalar</h2>' + (acik.length ? this.raporTablo(['No', 'Tesis', 'Arıza', 'Öncelik', 'Durum', 'Ekip'], satirF) : '<div class="k">Açık arıza kaydı yok.</div>') +
      '<h2>Ekip bazında arıza ve maliyet</h2>' + this.raporTablo(['Ekip', 'Arıza', 'Açık', 'Çözülen', 'Maliyet'], satirE, null, [1, 2, 3, 4]);
  }
  // 2) İlçe raporu: her ilçe ayrı sayfa; içinde köy tablosu
  raporIlce() {
    const e = x => this.raporKacis(x);
    const v = this.raporVeri(true);
    if (!v.assets.length) return this.say('Rapora girecek kayıt yok.');
    let govde = '<h1>Kırşehir su altyapısı — ilçe raporu</h1><div class="k">' + e(this.damga()) + ' · ' + v.ilceler.length + ' ilçe · ' + v.koyler.length + ' köy/yerleşim · ' + v.assets.length + ' kayıt · hat ' + e(this.raporKm(v.hatToplam)) + '</div>';
    v.ilceler.slice().sort((x, y) => x.ilce.localeCompare(y.ilce, 'tr')).forEach((i, sira) => {
      govde += '<div' + (sira ? ' class="ay"' : '') + '><h2>' + e(i.ilce) + ' ilçesi</h2>' +
        '<div class="kutu"><div><b>' + i.koyler.length + '</b><span>köy</span></div><div><b>' + i.n + '</b><span>kayıt</span></div><div><b>' + i.kuyu + '</b><span>kuyu</span></div><div><b>' + i.depo + '</b><span>depo</span></div><div><b>' + this.raporKm(i.hat) + '</b><span>hat</span></div><div><b>' + i.baca + ' / ' + i.vana + '</b><span>baca / vana</span></div></div>' +
        this.raporTablo(['Köy', 'Kuyu', 'Depo', 'Baca', 'Vana', 'Hat', 'Aktif', 'Pasif', 'Not'],
          i.koyler.slice().sort((x, y) => x.koy.localeCompare(y.koy, 'tr')).map(k => [k.koy, k.kuyu, k.depo, k.baca, k.vana, k.hat ? this.raporKm(k.hat) : '—', k.aktif, k.pasif,
            k.oto ? k.oto + ' kayıtta köy otomatik yazıldı' : '']),
          ['Toplam', i.kuyu, i.depo, i.baca, i.vana, this.raporKm(i.hat), i.aktif, i.pasif, ''], [1, 2, 3, 4, 5, 6, 7]) + '</div>';
    });
    govde += this.raporAltNot(v);
    this.raporPencere('Kırşehir ilçe raporu', govde);
  }
  // Köy listesi (karne seçici): "Köy · İlçe (N kayıt)"
  raporKoyListe() {
    return this.raporVeri(true).koyler.map(k => ({ v: k.key, l: k.koy + ' · ' + k.ilce + ' (' + k.n + ' kayıt' + (k.hat ? ', ' + this.raporKm(k.hat) + ' hat' : '') + ')' }));
  }
  // 3) Köy karnesi: tek köyün tek raporu (özet, şema, tesisler, hatlar)
  raporKoy(anahtar) {
    const e = x => this.raporKacis(x);
    const v = this.raporVeri(true);
    const k = v.koyler.find(x => x.key === anahtar);
    if (!k) return this.say('Önce bir köy seçin.', true);
    const GRUP = ['#1b6ef3', '#e03131', '#2f9e44', '#f08c00', '#7048e8', '#0c8599', '#c2255c', '#5c940d', '#e8590c', '#495057'];
    const grupRenk = g => { if (!g) return '#201e1d'; if (/^ana boru$/i.test(g)) return '#201e1d'; const m = /(\d+)\s*$/.exec(g); let i = 0; if (m) i = parseInt(m[1], 10) - 1; else for (const c of g) i = (i * 31 + c.charCodeAt(0)) >>> 0; return GRUP[((i % GRUP.length) + GRUP.length) % GRUP.length]; };
    // Şema: tesis noktaları ve hat çizgileri (karo yok, vektör — yazdırmada net)
    const nok = [];
    for (const a of k.tesisler) if (isFinite(a.lat) && isFinite(a.lon)) nok.push([a.lat, a.lon]);
    for (const x of k.hatlar) for (const p of x.h.noktalar) nok.push([+p[0], +p[1]]);
    let svg = '';
    if (nok.length) {
      const W = 640, H = 380, P = 26;
      const mnLa = Math.min(...nok.map(p => p[0])), mxLa = Math.max(...nok.map(p => p[0]));
      const mnLo = Math.min(...nok.map(p => p[1])), mxLo = Math.max(...nok.map(p => p[1]));
      const kos = Math.cos((mnLa + mxLa) / 2 * Math.PI / 180);
      const gen = Math.max((mxLo - mnLo) * kos, 1e-5), yuk = Math.max(mxLa - mnLa, 1e-5);
      const olc = Math.min((W - 2 * P) / gen, (H - 2 * P) / yuk);
      const ox = (W - gen * olc) / 2, oy = (H - yuk * olc) / 2;
      const X = lo => (ox + (lo - mnLo) * kos * olc).toFixed(1), Y = la => (oy + (mxLa - la) * olc).toFixed(1);
      svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
      for (const x of k.hatlar) svg += '<polyline fill="none" stroke="' + grupRenk(x.h.grup) + '" stroke-width="2.2" stroke-linejoin="round" points="' + x.h.noktalar.map(p => X(+p[1]) + ',' + Y(+p[0])).join(' ') + '"/>';
      for (const a of k.tesisler) {
        if (!isFinite(a.lat) || !isFinite(a.lon)) continue;
        const cx = X(a.lon), cy = Y(a.lat), etiket = e(a.type === 'baca' || a.type === 'vana' ? ((a.d || {}).ad || a.code) : a.code);
        if (a.type === 'baca') svg += '<rect x="' + (cx - 7) + '" y="' + (cy - 4.5) + '" width="14" height="9" rx="1.5" fill="#fff" stroke="#0e8a7d" stroke-width="1.6"/>';
        else if (a.type === 'vana') svg += '<path d="M' + (cx - 6) + ' ' + (cy - 5) + 'L' + (cx + 6) + ' ' + (cy + 5) + 'L' + (cx + 6) + ' ' + (cy - 5) + 'L' + (cx - 6) + ' ' + (cy + 5) + 'Z" fill="#fff" stroke="#d6336c" stroke-width="1.6"/>';
        else if (a.type === 'depo') svg += '<rect x="' + (cx - 7) + '" y="' + (cy - 7) + '" width="14" height="14" rx="3" fill="#b45309" stroke="#fff" stroke-width="1.5"/>';
        else svg += '<circle cx="' + cx + '" cy="' + cy + '" r="6.5" fill="#0071e3" stroke="#fff" stroke-width="1.5"/>';
        svg += '<text x="' + (+cx + 9) + '" y="' + (+cy - 7) + '" font-size="8.5" fill="#201e1d" stroke="#fff" stroke-width="2.6" paint-order="stroke">' + etiket + '</text>';
      }
      svg += '</svg>';
    }
    const gruplar = [...new Set(k.hatlar.map(x => x.h.grup || ''))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    const lej = '<div class="lej">' + gruplar.map(g => '<span><i style="border-color:' + grupRenk(g) + '"></i>' + e(g || 'Hat') + '</span>').join('') +
      '<span>● kuyu</span><span>■ depo</span><span>▭ baca</span><span>⧓ vana</span></div>';
    // Tesis tablosu: dolu alanlar "Ayrıntı" sütununda (tür alanlarının etiketleriyle)
    const alanlar = t => ((ALANLAR[t] || []).reduce((l, g) => l.concat(g[1]), []));
    const ayr = a => alanlar(a.type).map(([key, ad, birim]) => { const val = key === 'year' ? a.year : (a.d || {})[key]; return val !== undefined && val !== null && String(val).trim() !== '' && val !== false ? ad + ': ' + val + (birim ? ' ' + birim : '') : ''; }).filter(Boolean).join(' · ');
    const kodSira = (x, y) => x.type.localeCompare(y.type) || x.code.localeCompare(y.code, 'tr', { numeric: true });
    const satirTs = k.tesisler.slice().sort(kodSira).map(a => [a.code, TYPES[a.type].label, aktifAd(a), a.year || '', (a.coordApprox ? 'yaklaşık' : 'ölçülü') + (a.lat != null ? ' · ' + (+a.lat).toFixed(5) + ', ' + (+a.lon).toFixed(5) : ''), a.photos || 0, ayr(a)]);
    const satirH = k.hatlar.map(x => [x.a.code, x.h.grup || '—', this.raporHatAd(x.h.tur), x.h.cap ? 'Ø' + x.h.cap : '—', x.h.malzeme || '—', Math.round(x.uz).toLocaleString('tr-TR') + ' m']);
    const say = f => k.tesisler.filter(f).length;
    const eksik = [
      say(a => !a.photos) ? say(a => !a.photos) + ' kayıtta fotoğraf yok' : '',
      say(a => a.coordApprox) ? say(a => a.coordApprox) + ' kayıtta konum yaklaşık' : '',
      k.oto ? k.oto + ' kayıtta köy adı otomatik yazılmış' : '',
      k.hatlar.some(x => !x.h.cap) ? 'Çapı girilmemiş hat parçası var' : '',
      k.hatlar.length && !k.hatlar.some(x => x.h.malzeme) ? 'Hat malzemesi girilmemiş' : ''
    ].filter(Boolean);
    const govde = '<h1>' + e(k.koy) + ' — köy karnesi</h1><div class="k">' + e(k.ilce) + ' ilçesi · ' + e(this.damga()) + '</div>' +
      '<div class="kutu"><div><b>' + k.n + '</b><span>kayıt</span></div><div><b>' + k.aktif + '</b><span>aktif</span></div><div><b>' + k.pasif + '</b><span>pasif</span></div>' +
      '<div><b>' + this.raporKm(k.hat) + '</b><span>hat</span></div><div><b>' + k.baca + '</b><span>baca</span></div><div><b>' + k.vana + '</b><span>vana</span></div></div>' +
      (svg ? '<h2>Şema</h2>' + svg + lej : '') +
      '<h2>Tesisler</h2>' + this.raporTablo(['Kod', 'Tür', 'Durum', 'Yıl', 'Konum', 'Foto', 'Ayrıntı'], satirTs, null, [5]) +
      (satirH.length ? '<h2>Hatlar</h2>' + this.raporTablo(['Tesis', 'Grup', 'Tür', 'Çap', 'Malzeme', 'Uzunluk'], satirH, ['Toplam', '', '', '', '', this.raporKm(k.hat)], [5]) : '') +
      '<h2>Eksik / dikkat</h2>' + (eksik.length ? '<ul style="margin:4px 0 0 16px;padding:0">' + eksik.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>' : '<div class="k">Eksik bilgi görünmüyor.</div>') +
      this.raporAltNot(v);
    this.raporPencere(k.koy + ' köy karnesi', govde);
  }
  // Özet sayfasındaki Rapor paneli
  raporPanelAc() { this.setState({ raporPanel: this.state.raporPanel === false }); }
  raporKoySec(v) { this.setState({ raporKoy: v }); }
  // Excel: tesisler, hatlar, köy özeti, ilçe özeti (çok sayfalı .xlsx; yüklenemezse eski CSV)
  async excelVer() {
    const s = this.state;
    const list = s.assets.filter(a => s.filter[a.type]);
    if (!list.length) return this.say('Aktarılacak kayıt yok — tür süzgeçlerini açın.');
    const arizaOn = (this.props.arizaModulu ?? true) && s.modul.ariza !== false;
    const v = this.raporVeri(false);
    const hatKm = {};
    for (const x of v.hatlar) hatKm[x.a.id] = (hatKm[x.a.id] || 0) + x.uz;
    // Alan anahtarlarının okunur adları (ALANLAR etiketleri)
    const etiket = {};
    for (const t of Object.keys(ALANLAR)) for (const g of ALANLAR[t]) for (const f of g[1]) if (!etiket[f[0]]) etiket[f[0]] = f[1] + (f[2] ? ' (' + f[2] + ')' : '');
    const dKeys = [];
    for (const a of list) for (const k of Object.keys(a.d || {})) if (dKeys.indexOf(k) < 0) dKeys.push(k);
    const bas = ['Kod', 'Tür', 'Durum', 'İlçe', 'Köy', 'Yapım yılı', 'Enlem', 'Boylam', 'Konum', 'Son bakım', 'Fotoğraf', 'Hat (m)']
      .concat(arizaOn ? ['Açık arıza'] : []).concat(dKeys.map(k => etiket[k] || k));
    const num = x => { const n = Number(String(x).replace(',', '.')); return x !== '' && x != null && isFinite(n) ? n : (x == null ? '' : x); };
    const satirlar = list.map(a => [a.code, TYPES[a.type].kind, aktifAd(a), a.district || '', a.village || '', num(a.year || ''), Number(a.lat), Number(a.lon),
      a.coordApprox ? 'yaklaşık' : 'ölçülü', (a.d || {}).bakim || '', a.photos || 0, Math.round(hatKm[a.id] || 0)]
      .concat(arizaOn ? [s.faults.filter(f => f.assetId === a.id && !KAPALI_DURUM.includes(f.status)).length] : [])
      .concat(dKeys.map(k => { const x = (a.d || {})[k]; return typeof x === 'boolean' ? (x ? 'Evet' : 'Hayır') : num(x); })));
    const hatS = [['Tesis kodu', 'Tesis türü', 'İlçe', 'Köy', 'Grup', 'Hat türü', 'Çap (mm)', 'Malzeme', 'Uzunluk (m)', 'Nokta', 'Açıklama']]
      .concat(v.hatlar.map(x => [x.a.code, TYPES[x.a.type].label, x.a.district || '', x.a.village || '', x.h.grup || '', this.raporHatAd(x.h.tur), x.h.cap || '', x.h.malzeme || '', Math.round(x.uz), x.h.noktalar.length, x.h.aciklama || '']));
    const koyS = [['İlçe', 'Köy', 'Kayıt', 'Kuyu', 'Depo', 'AG', 'GES', 'Baca', 'Vana', 'Aktif', 'Pasif', 'Hat (m)']]
      .concat(v.koyler.map(k => [k.ilce, k.koy, k.n, k.kuyu, k.depo, k.ag, k.ges, k.baca, k.vana, k.aktif, k.pasif, Math.round(k.hat)]));
    const ilceS = [['İlçe', 'Köy', 'Kayıt', 'Kuyu', 'Depo', 'AG', 'GES', 'Baca', 'Vana', 'Aktif', 'Pasif', 'Hat (m)']]
      .concat(v.ilceler.map(i => [i.ilce, i.koyler.length, i.n, i.kuyu, i.depo, i.ag, i.ges, i.baca, i.vana, i.aktif, i.pasif, Math.round(i.hat)]));
    const gun = new Date().toISOString().slice(0, 10);
    try {
      if (!window.XLSX) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = './vendor/xlsx.mini.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('Excel kitaplığı yüklenemedi')); document.head.appendChild(sc); });
      const X = window.XLSX, wb = X.utils.book_new();
      const ekle = (ad, aoa, genislik) => { const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = genislik.map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, ad); };
      ekle('Tesisler', [bas].concat(satirlar), bas.map((b, i) => i < 2 ? 14 : (i === 4 || i === 3 ? 18 : 12)));
      ekle('Hatlar', hatS, [14, 12, 14, 18, 12, 14, 10, 12, 12, 8, 30]);
      ekle('Köy özeti', koyS, [14, 22, 8, 8, 8, 8, 8, 8, 8, 8, 8, 10]);
      ekle('İlçe özeti', ilceS, [14, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 10]);
      X.writeFile(wb, 'kirsehir-envanter-' + gun + '.xlsx');
      this.duyur(list.length + ' kayıt, ' + v.hatlar.length + ' hat parçası Excel dosyasına yazıldı (Tesisler, Hatlar, Köy özeti, İlçe özeti).', 6000, 'iyi');
    } catch (err) {
      // Yedek: eski tek sayfa CSV (Türkçe Excel'de çift tıklamayla açılır)
      const csv = a => a.map(r => r.map(x => this.csvKac(x)).join(';')).join('\r\n');
      this.dosyaIndir('kirsehir-envanter-' + gun + '.csv', '﻿' + csv([bas].concat(satirlar.map(r => r.map(x => typeof x === 'number' ? String(x).replace('.', ',') : x)))), 'text/csv;charset=utf-8');
      this.duyur(list.length + ' kayıt CSV olarak indirildi (Excel dosyası oluşturulamadı: ' + ((err && err.message) || err) + ').', 7000, 'kotu');
    }
  }
