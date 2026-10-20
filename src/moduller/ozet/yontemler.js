//@dahil moduller/ozet/yontemler/rapor.js
  csvKac(v) {
    const x = String(v === undefined || v === null ? '' : v).replace(/"/g, '""');
    return /[";\n]/.test(x) ? '"' + x + '"' : x;
  }
  // Excel ve PDF raporları: yontemler/rapor.js (Genel rapor, İlçe raporu, Köy karnesi, çok sayfalı Excel)
  pdfVer() { this.raporGenel(); }
  rows(sel) {
    const d = sel.d, s = this.state;
    const gridE = tmForward(sel.lat, sel.lon, this.cm(s.conv.zone), ELL.grs80);
    const coord = [
      ['Sağa (ITRF96-3°)', gridE[0].toFixed(2) + ' m'],
      ['Yukarı (ITRF96-3°)', gridE[1].toFixed(2) + ' m'],
      ['WGS84', `${sel.lat.toFixed(5)}, ${sel.lon.toFixed(5)}`],
      ['Koordinat kaynağı', sel.coordSource || (sel.coordApprox ? 'Yaklaşık — saha ölçümü bekliyor' : 'Saha GPS')],
      ...(d.koyOtomatik ? [['Köy bilgisi', 'otomatik yazıldı (' + d.koyOtomatik + ') — yanlışsa Köy ve ilçe düzelt']] : [])
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
  // Özet haritası çerçevesine kayıtları, süzgeci, zemini ve temayı gönderir
  ozetHaritaGonder() {
    const f = document.getElementById('ks-ozet-harita');
    if (!f || !f.contentWindow) return;
    const s = this.state;
    const noktalar = (s.assets || []).filter(a => a.lat != null && a.lon != null).map(a => ({ id: a.id, code: a.code, type: a.type, lat: a.lat, lon: a.lon, village: a.village || '', district: a.district || '', pasif: !aktifMi(a) }));
    try { f.contentWindow.postMessage({ ks: 'ozetVeri', noktalar, gizli: s.ozetGizli || [], zemin: s.ozetZemin || 'hyb', dark: this.th().dark, renk: turRenk(this.th().dark) }, '*'); } catch (e) { /* çerçeve yok */ }
  }
