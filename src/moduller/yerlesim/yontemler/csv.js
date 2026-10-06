  yerlesimBul(ilceAd, koyAd) {
    const kayit = this.state.yerlesimVeri || {};
    const k = nkey(koyAd);
    if (!k) return null;
    const bilesik = nkey(ilceAd) + '|' + k;
    if (kayit[bilesik]) return kayit[bilesik];
    if (kayit[k]) return kayit[k];
    const hepsi = Object.values(kayit);
    for (const v of hepsi) if (nkey(v.ad) === k) return v;
    const ik = nkey(ilceAd);
    let en = null, enUz = 3, cok = false;
    for (const v of hepsi) {
      if (ik && v.ilce && nkey(v.ilce) !== ik) continue;
      const vk = nkey(v.ad);
      if (!ayirtEsit(k, vk)) continue;
      const u = benzerlik(k, vk);
      if (u > 2) continue;
      if (u === 2 && (onEk(k, vk) < 3 || Math.min(k.length, vk.length) < 7)) continue;
      if (u < enUz) { en = v; enUz = u; cok = false; }
      else if (u === enUz && en && v !== en) cok = true;
    }
    return cok || !en ? null : { ...en, yaklasik: en.ad };
  }
  yerlesimCsvCoz(buf) {
    const bytes = new Uint8Array(buf);
    let metin = '';
    try { metin = new TextDecoder('utf-8').decode(bytes); } catch (e) { metin = ''; }
    if (!metin || metin.indexOf('\ufffd') >= 0) {
      for (const enc of ['windows-1254', 'iso-8859-9', 'windows-1252']) {
        try {
          const alt = new TextDecoder(enc).decode(bytes);
          if (alt && alt.indexOf('\ufffd') < 0) { metin = alt; break; }
          if (!metin) metin = alt;
        } catch (e) { /* kodlama desteklenmiyor */ }
      }
    }
    return String(metin || '').replace(/^\ufeff/, '');
  }
  yerlesimSutunlar(bas) {
    const t = s => String(s || '').toLowerCase()
      .replace(/\u0131/g, 'i').replace(/\u0130/g, 'i').replace(/[\u00e7]/g, 'c').replace(/[\u011f]/g, 'g')
      .replace(/[\u00f6]/g, 'o').replace(/[\u015f]/g, 's').replace(/[\u00fc]/g, 'u')
      .replace(/[^a-z]/g, '');
    const idx = { ad: -1, ilce: -1, nufus: -1, yil: -1, buyukbas: -1, kucukbas: -1 };
    bas.forEach((h, i) => {
      const k = t(h);
      if (!k) return;
      if (idx.buyukbas < 0 && /buyukbas|sigir|bugu/.test(k)) idx.buyukbas = i;
      else if (idx.kucukbas < 0 && /kucukbas|koyun|keci/.test(k)) idx.kucukbas = i;
      else if (idx.yil < 0 && /^yil|yili$|nufusyil/.test(k)) idx.yil = i;
      else if (idx.nufus < 0 && /nufus/.test(k)) idx.nufus = i;
      else if (idx.ilce < 0 && /ilce/.test(k)) idx.ilce = i;
      else if (idx.ad < 0 && /koy|yerlesim|belde|mahalle|ad$|adi/.test(k)) idx.ad = i;
    });
    return idx;
  }
  yerlesimAdSadelestir(ad) {
    return String(ad || '').trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*[\(\[].*?[\)\]]\s*$/, '')
      .replace(/\s+(k\u00f6y\u00fc|k\u00f6y|beldesi|belde|mahallesi|mah\.?|mh\.?)$/i, '')
      .trim();
  }
  yerlesimCsvIsle(buf, dosyaAd) {
    const metin = this.yerlesimCsvCoz(buf);
    const satir = metin.split(/\r?\n/).filter(x => x.replace(/[;,\t"\s]/g, ''));
    if (satir.length < 2) return this.duyur('Dosya bo\u015f g\u00f6r\u00fcn\u00fcyor \u2014 ba\u015fl\u0131k sat\u0131r\u0131 ve en az bir veri sat\u0131r\u0131 gerekli.', 7000, 'kotu');
    const say = ['\t', ';', ',']
      .map(d => ({ d, n: (satir[0].split(d).length - 1) }))
      .sort((a, b) => b.n - a.n)[0];
    const ayr = say.n > 0 ? say.d : ';';
    const boel = r => {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '"') { if (q && r[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === ayr && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(x => x.trim());
    };
    let idx = this.yerlesimSutunlar(boel(satir[0]));
    let bas = 1;
    if (idx.ad < 0) { idx = { ad: 0, ilce: 1, nufus: 2, yil: 3, buyukbas: 4, kucukbas: 5 }; bas = 0; }
    const nrm = a => nkey(a);
    void nrm;
    const sayi = x => {
      const v = parseInt(String(x == null ? '' : x).replace(/[^0-9]/g, ''), 10);
      return isFinite(v) ? v : null;
    };
    const al = (c, i) => i >= 0 && i < c.length ? c[i] : '';
    const yeni = { ...(this.state.yerlesimVeri || {}) };
    let n = 0, atlanan = 0, sonIlce = '', sonYil = '';
    for (const r of satir.slice(bas)) {
      const c = boel(r);
      const ilceHam = al(c, idx.ilce);
      const yilHam = al(c, idx.yil);
      if (ilceHam) sonIlce = ilceHam;
      if (yilHam) sonYil = yilHam;
      const adHam = this.yerlesimAdSadelestir(al(c, idx.ad));
      if (!adHam || /^(toplam|genel toplam|ara toplam)$/i.test(adHam)) { atlanan++; continue; }
      const k = idx.ilce >= 0 && sonIlce ? nkey(sonIlce) + '|' + nkey(adHam) : nkey(adHam);
      if (!k) { atlanan++; continue; }
      const eski = yeni[k] || {};
      const bb = idx.buyukbas >= 0 ? sayi(al(c, idx.buyukbas)) : null;
      const kb = idx.kucukbas >= 0 ? sayi(al(c, idx.kucukbas)) : null;
      const nf = idx.nufus >= 0 ? sayi(al(c, idx.nufus)) : null;
      yeni[k] = {
        ad: adHam,
        ilce: this.yerlesimAdSadelestir(sonIlce) || eski.ilce || '',
        nufus: nf != null ? nf : (eski.nufus != null ? eski.nufus : null),
        yil: (sonYil || eski.yil || '').toString().trim(),
        buyukbas: bb != null ? bb : (eski.buyukbas != null ? eski.buyukbas : null),
        kucukbas: kb != null ? kb : (eski.kucukbas != null ? eski.kucukbas : null)
      };
      n++;
    }
    if (!n) return this.duyur('Dosyada okunabilir yerle\u015fim sat\u0131r\u0131 bulunamad\u0131. Ba\u015fl\u0131k sat\u0131r\u0131nda K\u00f6y / \u0130l\u00e7e / N\u00fcfus s\u00fctunlar\u0131 olmal\u0131.', 9000, 'kotu');
    try { localStorage.setItem('ks-yerlesim-veri', JSON.stringify(yeni)); } catch (e) { /* depolama kapal\u0131 */ }
    this.setState({ yerlesimVeri: yeni });
    const nufuslu = Object.values(yeni).filter(x => x.nufus != null).length;
    const hayvanli = Object.values(yeni).filter(x => x.buyukbas != null || x.kucukbas != null).length;
    this.duyur(`${dosyaAd ? dosyaAd + ' \u2014 ' : ''}${n} sat\u0131r okundu \u00b7 ${nufuslu} yerle\u015fimde n\u00fcfus, ${hayvanli} yerle\u015fimde hayvan say\u0131s\u0131${atlanan ? ' \u00b7 ' + atlanan + ' sat\u0131r atland\u0131' : ''}.`, 8000, 'iyi');
  }