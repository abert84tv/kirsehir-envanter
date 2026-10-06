  hatWin() {
    const f = document.querySelector('iframe[title^="Hat güzergâhları"]');
    return f && f.contentWindow;
  }
  // Hat çizim sayfasına seçili kaydı ve kayıtlı güzergâhları gönderir
  hatGonder() {
    const w = this.hatWin();
    const a = this.state.assets.find(x => x.id === this.state.selected);
    if (!w || !a) return;
    try {
      w.postMessage({ ks: 'theme', dark: this.state.theme === 'dark' }, '*');
      w.postMessage({
        ks: 'hat',
        tesis: { id: a.id, kod: a.code, lat: a.lat, lon: a.lon },
        hatlar: (this.state.hatlar || {})[a.id] || [],
        yazma: this.yazabilir(a)
      }, '*');
    } catch (e) { /* çerçeve henüz yüklenmedi */ }
  }
  hatKaydet(assetId, liste) {
    const a0 = (this.state.assets || []).find(x => x.id === assetId);
    this.denetimYaz('kayit', (liste && liste.length ? 'Hat kaydedildi' : 'Hat silindi'),
      (liste || []).length + ' güzergâh', a0 ? a0.code : assetId);
    const tablo = { ...(this.state.hatlar || {}) };
    if (liste && liste.length) tablo[assetId] = liste; else delete tablo[assetId];
    try { localStorage.setItem('ks-hatlar', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    this.setState({ hatlar: tablo }, () => this.hatlariYolla());
    // Sunucuya da yazılır: hat tesisin kendisiyle birlikte bütün cihazlarda görünür
    const M = this._sb;
    const a = (this.state.assets || []).find(x => x.id === assetId);
    if (!M || !M.hatKaydet || !M.tokenOku() || !a || !a.dbId || this.state.offline) { if (a && a.dbId) this.hatBekleyenEkle(assetId); return; }
    M.hatKaydet(a.dbId, (liste || []).map(x => ({
      tur: x.tur, noktalar: x.noktalar,
      // Boru çapı ve malzemesi açıklama alanına "Ø110 mm · PE100 · not" biçiminde yazılır
      aciklama: [x.cap ? 'Ø' + x.cap + ' mm' : '', x.malzeme || '', x.aciklama || ''].filter(Boolean).join(' · ') || null
    }))).then(r => {
      if (r.ok) { this.hatBekleyenCikar(assetId); return; }
      if (r.cevrimdisi) this.hatBekleyenEkle(assetId);
      this.duyur(r.cevrimdisi
        ? 'Hat cihaza kaydedildi — bağlantı gelince sunucuya yazılır.'
        : 'Hat sunucuya yazılamadı: ' + r.err, 7000, r.cevrimdisi ? 'bilgi' : 'kotu');
    });
  }
  // Çevrimdışıyken çizilen hatlar bağlantı gelince sunucuya gönderilir
  hatBekleyenOku() { try { const v = JSON.parse(localStorage.getItem('ks-hat-bekleyen') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  hatBekleyenYaz(l) { try { localStorage.setItem('ks-hat-bekleyen', JSON.stringify([...new Set(l)])); } catch (e) { /* depolama kapalı */ } }
  hatBekleyenEkle(id) { this.hatBekleyenYaz([...this.hatBekleyenOku(), id]); }
  hatBekleyenCikar(id) { this.hatBekleyenYaz(this.hatBekleyenOku().filter(x => x !== id)); }
  async hatBekleyenGonder() {
    const M = this._sb;
    if (!M || !M.hatKaydet || !M.tokenOku() || this.state.offline) return;
    for (const id of this.hatBekleyenOku()) {
      const a = (this.state.assets || []).find(x => x.id === id);
      if (!a || !a.dbId) continue;
      const liste = (this.state.hatlar || {})[id] || [];
      const r = await M.hatKaydet(a.dbId, liste.map(x => ({ tur: x.tur, noktalar: x.noktalar,
        aciklama: [x.cap ? 'Ø' + x.cap + ' mm' : '', x.malzeme || '', x.aciklama || ''].filter(Boolean).join(' · ') || null })));
      if (r.ok) this.hatBekleyenCikar(id); else if (r.cevrimdisi) break;
    }
  }
  // Hat güzergâhları sunucudan gelir; sunucuda karşılığı olmayan kayıtların
  // hatları cihaz kopyasında kalır
  async hatYenile() {
    const M = this._sb;
    if (!M || !M.hatListesi || !M.tokenOku()) return;
    let r;
    try { r = await M.hatListesi(); } catch (e) { return; }
    if (!r.ok || !Array.isArray(r.data)) return;
    const kimlik = {};
    (this.state.assets || []).forEach(a => { if (a.dbId != null) kimlik[a.dbId] = a.id; });
    const tablo = {};
    for (const x of r.data) {
      const id = kimlik[x.tesis_id];
      if (!id) continue;
      (tablo[id] = tablo[id] || []).push({
        id: 'h' + x.id, dbId: x.id, tur: x.tur,
        noktalar: (x.noktalar || []).map(p => [+p[0], +p[1]]),
        ...(() => {
          const m = /^Ø(\d+) mm(?: · ([^·]+?))?(?: · (.*))?$/.exec(String(x.aciklama || ''));
          return m ? { cap: +m[1], malzeme: (m[2] || '').trim(), aciklama: m[3] || '' } : { aciklama: x.aciklama || '' };
        })()
      });
    }
    const sunucudakiKayit = new Set((this.state.assets || []).filter(a => a.dbId != null).map(a => a.id));
    const yerel = this.state.hatlar || {};
    for (const k in yerel) if (!sunucudakiKayit.has(k)) tablo[k] = yerel[k];
    // Gönderilmemiş (çevrimdışı çizilmiş) hatlar sunucudaki eski hâliyle ezilmez
    for (const id of this.hatBekleyenOku()) if (yerel[id]) tablo[id] = yerel[id];
    try { localStorage.setItem('ks-hatlar', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    this.setState({ hatlar: tablo }, () => {
      this.hatlariYolla();
      this.toMap({ ks: 'hatKatman', on: this.state.hatKatman !== false });
      if (this.state.detailTab === 'hat' || this.state.hatTam) this.hatGonder();
    });
  }
  // Hatlar ana haritada da görünür: kayıt kodu ve uzunluğu ile
  hatlariYolla() {
    const tablo = this.state.hatlar || {};
    const kod = {};
    (this.state.assets || []).forEach(a => { kod[a.id] = a.code; });
    const duz = [];
    for (const id in tablo) {
      for (const x of (tablo[id] || [])) {
        if (!x || !(x.noktalar || []).length) continue;
        duz.push({ tur: x.tur, noktalar: x.noktalar, kod: kod[id] || '' });
      }
    }
    this.toMap({ ks: 'hatlar', hatlar: duz });
  }
  hatUzunluk(noktalar) {
    const rd = d => d * Math.PI / 180;
    let t = 0;
    for (let i = 1; i < (noktalar || []).length; i++) {
      const a = noktalar[i - 1], b = noktalar[i];
      const dLat = rd(b[0] - a[0]), dLon = rd(b[1] - a[1]);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dLon / 2) ** 2;
      t += 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(x)));
    }
    return t;
  }
  hatMetin(m) { return m >= 1000 ? (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km' : Math.round(m) + ' m'; }