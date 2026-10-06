  notKuyrukOku() {
    try { const v = JSON.parse(localStorage.getItem('ks-not-kuyruk') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  notKuyrukYaz(l) {
    try { localStorage.setItem('ks-not-kuyruk', JSON.stringify(l)); } catch (e) { /* depolama kapalı */ }
    this.bekleyenEkYenile();
  }
  async notKuyrukGonder() {
    const M = this._sb;
    const l = this.notKuyrukOku();
    if (!l.length || !M) return;
    const kalan = []; let n = 0;
    for (let i = 0; i < l.length; i++) {
      let r;
      try { r = await M.notEkle(l[i].dbId, l[i].metin); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) n++;
      else if (r && r.cevrimdisi) { kalan.push(...l.slice(i)); break; }
    }
    this.notKuyrukYaz(kalan);
    if (n) this.veriYenile(true);
  }