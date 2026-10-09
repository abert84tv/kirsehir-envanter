  csvKac(v) {
    const x = String(v === undefined || v === null ? '' : v).replace(/"/g, '""');
    return /[";\n]/.test(x) ? '"' + x + '"' : x;
  }
  // Excel: noktalı virgül ayırıcı + BOM — Türkçe Excel'de çift tıklamayla doğru açılır
  excelVer() {
    const s = this.state;
    const list = s.assets.filter(a => s.filter[a.type]);
    if (!list.length) return this.say('Aktarılacak kayıt yok — tür süzgeçlerini açın.');
    const dKeys = [];
    for (const a of list) for (const k of Object.keys(a.d || {})) if (dKeys.indexOf(k) < 0) dKeys.push(k);
    const bas = ['Kod', 'Tür', 'Durum', 'Köy', 'İlçe', 'Yapım yılı', 'Enlem', 'Boylam', 'Son bakım',
      'Fotoğraf', 'Açık arıza'];
    const out = [bas.concat(dKeys).map(x => this.csvKac(x)).join(';')];
    for (const a of list) {
      const acik = s.faults.filter(f => f.assetId === a.id && !KAPALI_DURUM.includes(f.status)).length;
      out.push([a.code, TYPES[a.type].kind, aktifAd(a), a.village || '', a.district || '', a.year || '',
        String(a.lat).replace('.', ','), String(a.lon).replace('.', ','), (a.d || {}).bakim || '',
        a.photos || 0, acik]
        .concat(dKeys.map(k => (a.d || {})[k])).map(x => this.csvKac(x)).join(';'));
    }
    this.dosyaIndir('kirsehir-envanter-' + new Date().toISOString().slice(0, 10) + '.csv',
      '\ufeff' + out.join('\r\n'), 'text/csv;charset=utf-8');
    this.duyur(list.length + ' kayıt CSV olarak indirildi — Excel’de doğrudan açılır.', 6000, 'iyi');
  }
  pdfVer() {
    const s = this.state;
    const esc = x => String(x === undefined || x === null ? '' : x)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const byD = {};
    for (const a of s.assets) {
      const o = (byD[a.district] = byD[a.district] || { n: 0, kuyu: 0, depo: 0, aktif: 0, pasif: 0 });
      o.n++;
      if (aktifMi(a)) o.aktif++; else o.pasif++;
      if (a.type === 'kuyu') o.kuyu++;
      if (a.type === 'depo') o.depo++;
    }
    const acik = s.faults.filter(f => !KAPALI_DURUM.includes(f.status));
    const w = window.open('', '_blank');
    if (!w) return this.duyur('Tarayıcı yeni sekmeyi engelledi — açılır pencere iznini verip yeniden deneyin.', 8000);
    const satirD = Object.keys(byD).sort((x, y) => byD[y].n - byD[x].n)
      .map(n => '<tr><td>' + esc(n) + '</td><td>' + byD[n].n + '</td><td>' + byD[n].kuyu +
        '</td><td>' + byD[n].depo + '</td><td>' + byD[n].aktif + '</td><td>' + byD[n].pasif +
        '</td></tr>').join('');
    const satirT = ['kuyu', 'depo', 'ag', 'ges'].map(t => {
      const hep = s.assets.filter(a => a.type === t);
      const ak = hep.filter(a => aktifMi(a)).length;
      return '<tr><td>' + esc(TYPES[t].kind) + '</td><td>' + ak + '</td><td>' + (hep.length - ak) +
        '</td><td>' + hep.length + '</td><td>' + (hep.length ? Math.round(ak / hep.length * 100) + '%' : '—') + '</td></tr>';
    }).join('');
    const topAk = s.assets.filter(a => aktifMi(a)).length;
    const satirF = acik.map(f => {
      const a = s.assets.find(x => x.id === f.assetId) || {};
      return '<tr><td>' + esc(f.no) + '</td><td>' + esc(a.code || '—') + '</td><td>' + esc(f.type) +
        '</td><td>' + esc(f.priority) + '</td><td>' + esc(STATUS_LABEL[f.status]) + '</td><td>' + esc(f.crew) + '</td></tr>';
    }).join('');
    // Ekip kırılımı: açık / çözülen arıza sayısı ve harcanan malzeme + işçilik
    const ekipler = {};
    for (const f of s.faults) {
      const ad = (f.crew || '').trim() || 'Ekip atanmadı';
      const o = (ekipler[ad] = ekipler[ad] || { n: 0, acik: 0, cozulen: 0, tutar: 0 });
      o.n++;
      if (f.status === 'cozuldu') o.cozulen++; else o.acik++;
      o.tutar += Number(f.maliyet) || 0;
    }
    const ekipAd = Object.keys(ekipler).sort((x, y) => ekipler[y].n - ekipler[x].n);
    const toplamTutar = ekipAd.reduce((t, n) => t + ekipler[n].tutar, 0);
    const satirE = ekipAd.map(n => {
      const o = ekipler[n];
      return '<tr><td>' + esc(n) + '</td><td>' + o.n + '</td><td>' + o.acik + '</td><td>' + o.cozulen +
        '</td><td>' + this.tl(o.tutar) + '</td><td>' + (o.n ? this.tl(o.tutar / o.n) : '—') + '</td></tr>';
    }).join('');
    // Malzeme kırılımı: hangi parça kaç arızada, kaç adet, ne tutar
    const malz = {};
    for (const f of s.faults) {
      for (const mz of (f.malzeme || [])) {
        const ad = (mz.ad || '').trim();
        if (!ad) continue;
        const o = (malz[ad] = malz[ad] || { adet: 0, birim: mz.birim || '', tutar: 0, kayit: 0 });
        o.adet += Number(mz.adet) || 0;
        o.tutar += (Number(mz.tutar) || 0) * (Number(mz.adet) || 1);
        o.kayit++;
      }
    }
    const malzAd = Object.keys(malz).sort((x, y) => malz[y].tutar - malz[x].tutar);
    const malzToplam = malzAd.reduce((t, n) => t + malz[n].tutar, 0);
    const satirMz = malzAd.map(n => '<tr><td>' + esc(n) + '</td><td>' + malz[n].kayit + '</td><td>' +
      malz[n].adet + ' ' + esc(malz[n].birim) + '</td><td>' + this.tl(malz[n].tutar) + '</td></tr>').join('');
    w.document.write('<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">' +
      '<title>Kırşehir envanter özeti</title><style>' +
      '@page{size:A4;margin:14mm}body{font:11px/1.5 Archivo,system-ui,sans-serif;color:#201e1d;margin:0}' +
      'h1{font-size:19px;margin:0 0 4px}h2{font-size:10px;letter-spacing:-.01em;' +
      'color:#ec3013;margin:18px 0 6px;border-bottom:1px solid #201e1d;padding-bottom:5px}' +
      'table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px 6px;' +
      'border-bottom:1px solid #ccc;font-size:10px}th{background:#eee;font-size:8.5px;letter-spacing:-.01em;' +
      'text-transform:uppercase}.k{color:#666;font-size:10px}</style></head><body>' +
      '<h1>Kırşehir su ve elektrik tesisleri — envanter özeti</h1>' +
      '<div class="k">' + esc(this.damga()) + ' · ' + s.assets.length + ' kayıt · ' + topAk + ' aktif · ' + (s.assets.length - topAk) + ' pasif · ' + acik.length +
      ' açık arıza</div>' +
      '<h2>Tür bazında aktif / pasif</h2><table><tr><th>Tür</th><th>Aktif</th><th>Pasif</th><th>Toplam</th><th>Aktif oranı</th></tr>' +
      satirT + '<tr><th>Toplam</th><th>' + topAk + '</th><th>' + (s.assets.length - topAk) +
      '</th><th>' + s.assets.length + '</th><th>' +
      (s.assets.length ? Math.round(topAk / s.assets.length * 100) + '%' : '—') + '</th></tr></table>' +
      '<h2>İlçe dağılımı</h2><table><tr><th>İlçe</th><th>Kayıt</th><th>Kuyu</th><th>Depo</th><th>Aktif</th><th>Pasif</th></tr>' +
      satirD + '</table>' +
      '<h2>Açık arızalar</h2>' + (acik.length
        ? '<table><tr><th>No</th><th>Tesis</th><th>Arıza</th><th>Öncelik</th><th>Durum</th><th>Ekip</th></tr>' + satirF + '</table>'
        : '<div class="k">Açık arıza kaydı yok.</div>') +
      '<h2>Ekip bazında arıza ve maliyet</h2>' + (ekipAd.length
        ? '<table><tr><th>Ekip</th><th>Arıza</th><th>Açık</th><th>Çözülen</th><th>Maliyet</th><th>Arıza başına</th></tr>' +
          satirE + '<tr><th>Toplam</th><th>' + s.faults.length + '</th><th>' + acik.length + '</th><th>' +
          (s.faults.length - acik.length) + '</th><th>' + this.tl(toplamTutar) + '</th><th>' +
          (s.faults.length ? this.tl(toplamTutar / s.faults.length) : '—') + '</th></tr></table>'
        : '<div class="k">Arıza kaydı yok.</div>') +
      '<h2>Malzeme kırılımı</h2>' + (malzAd.length
        ? '<table><tr><th>Malzeme</th><th>Kaç arızada</th><th>Toplam</th><th>Tutar</th></tr>' + satirMz +
          '<tr><th>Toplam</th><th></th><th></th><th>' + this.tl(malzToplam) + '</th></tr></table>' +
          '<div class="k">Tutarlar programdaki birim fiyat listesinden hesaplanır; gerçek fatura tutarları farklı olabilir.</div>'
        : '<div class="k">Arıza kayıtlarında malzeme girilmemiş.</div>') +
      '</body></html>');
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* engelli */ } }, 500);
    this.duyur('Yazdırma penceresi açıldı — “Hedef: PDF olarak kaydet”i seçin.', 7000);
  }
  rows(sel) {
    const d = sel.d, s = this.state;
    const gridE = tmForward(sel.lat, sel.lon, this.cm(s.conv.zone), ELL.grs80);
    const coord = [
      ['Sağa (ITRF96-3°)', gridE[0].toFixed(2) + ' m'],
      ['Yukarı (ITRF96-3°)', gridE[1].toFixed(2) + ' m'],
      ['WGS84', `${sel.lat.toFixed(5)}, ${sel.lon.toFixed(5)}`],
      ['Koordinat kaynağı', sel.coordSource || (sel.coordApprox ? 'Yaklaşık — saha ölçümü bekliyor' : 'Saha GPS')]
    ];
    // Eski yeni-kayıt formu boş alanlara "—" ve bakıma "Yeni kayıt" yazıyordu;
    // bunlar gerçek değer değil, eksik sayılır.
    const bos = v => v === '' || v === undefined || v === null || v === '—' || v === 'Yeni kayıt';
    const f = v => bos(v) ? '—' : v;
    // Değer harfle bitiyorsa (ör. "21,450kw") birim zaten yazılmış — tekrar eklenmez
    const u = (v, unit) => bos(v) ? '—' : (/[A-Za-zÇĞİÖŞÜçğıöşü²³]$/.test(String(v).trim()) ? v : v + ' ' + unit);
    const var_ = v => v === true || v === 'true' || v === 'Var' ? 'Var' : (v === false || v === 'false' || v === 'Yok' ? 'Yok' : '—');
    const hd = t => [t, '', 2];
    let out;
    if (sel.type === 'kuyu') out = [
      ['Yapım (sondaj) yılı', f(sel.year), 1], ['Kuyu derinliği', u(d.derinlik, 'm')], ['Pompa derinliği', u(d.pompaD, 'm')],
      ['Kuyu çapı', u(d.cap, 'mm')], ['Statik seviye', u(d.statik, 'm')], ['Dinamik seviye', u(d.dinamik, 'm')],
      ['Debi', u(d.debi, 'L/s')], ['Kolon borusu', d.kolon ? `${d.kolon} · Ø${d.kolonCap}` : '—'], ['RF haberleşme', f(d.rf)],
      hd('Belge ve sondaj'),
      ['DSİ ruhsat / izin no', f(d.ruhsat)], ['Sondaj firması', f(d.sondajFirma)], ['Sondaj tarihi', f(d.sondajTarih)],
      ['Kuyu başı kotu', f(d.kot)], ['Kuyu logu', f(d.kuyuLog)], ['Filtre aralıkları', f(d.filtre)],
      ['Çakıl zarfı / şap', f(d.cakil)],
      hd('Su kalitesi'),
      ['Su analizi', f(d.suAnaliz)], ['Analiz tarihi', f(d.suAnalizTarih)], ['Klor ölçümü', f(d.klorDeger)],
      hd('Pompa ve elektrik'),
      ['Pompa markası', f(d.pompaMarka)], ['Pompa modeli', f(d.pompaModel)], ['Kademe', f(d.kademe)],
      ['Pompa gücü', u(d.motor, 'kW')], ['Motor seri no', f(d.motorSeri)],
      ['Montaj derinliği', u(d.pompaD, 'm')], ['Montaj tarihi', f(d.montajTarih)],
      ['Motor kablosu', u(d.kablo, 'mm²')], ['Kalkış tipi', f(d.kalkis)],
      ['Termik ayar değeri', f(d.termik)], ['Ölçülen akım', f(d.akim)],
      ['İşletme saati', f(d.isletmeSaat)], ['Sayaç değeri', f(d.sayac)],
      ['Yedek pompa', f(d.yedekPompa)], ['Pompa hesabı', f(d.pompaHesap)],
      hd('Konum'),
      ...coord, ['Son bakım', f(d.bakim)], ['Kayıt kaynağı', sel.source || 'Elle girildi'],
      ['Haritadaki özgün adı', sel.kmlName ? 'KML yer imi no ' + sel.kmlName : '—']
    ];
    else if (sel.type === 'depo') out = [
      ['Yapım yılı', f(sel.year), 1], ['Hacim', u(d.hacim, 'm³')], ['Besleyen kaynak sayısı', f(d.kaynak || '')],
      ['Malzeme', f(d.malzeme)], ['RF modülü', var_(d.rfMod)],
      hd('Klorlama ve seviye'),
      ['Klorlama cihazı', f(d.klorCihaz)], ['Seviye sensörü / telemetri', f(d.seviyeSensor)],
      hd('Terfi hattı ve şebeke'),
      ['Terfi hattı uzunluğu', f(d.terfiUzunluk)], ['Terfi hattı çapı', f(d.terfiCap)],
      ['Hizmet ettiği yerleşim', f(d.hizmetKoy)], ['Hizmet ettiği nüfus', f(d.nufus)],
      ['Abone sayısı', f(d.abone)],
      hd('Bakım ve güvenlik'),
      ['Son temizlik', f(d.temizlik)], ['Kapak ve güvenlik', f(d.kapak)],
      hd('Konum'),
      ...coord, ['Son bakım', f(d.bakim)]
    ];
    else if (sel.type === 'ag') out = [
      ['Kurulum (yapım) yılı', f(sel.year), 1], ['Pano tipi', f(d.pano)],
      ['Trafo tipi', f(d.trafoTipi)], ['Besleyen trafo', u(d.trafo, 'kVA')],
      ['Ana sigorta', u(d.sigorta, 'A')], ['Branş sigortası', u(d.brans, 'A')], ['Kalkış tipi', f(d.kalkis)],
      ['Kompanzasyon', var_(d.klor)],
      ...coord, ['Son bakım', f(d.bakim)]
    ];
    else out = [
      ['Devreye alma (yapım) yılı', f(sel.year), 1], ['Kurulu güç', u(d.guc, 'kW')], ['Panel adedi', f(d.panelAdet)],
      ['İnverter', f(d.inverter)], ['Bağlantı tipi', f(d.baglanti)],
      ...coord, ['Son bakım', f(d.bakim)]
    ];
    return out;
  }