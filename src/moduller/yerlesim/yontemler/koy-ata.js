  // ── Köyü boş kayıtlara toplu köy atama (Envanter > “Köyü boş” > Köyleri ata)
  // Haritada kayıtlar seçilir, yakındaki aday köylerden biri (ya da arama) seçilir, “Ata” hepsine yazar.
  // Elle atanan köy “koyElle” ile hafızada tutulur: otomatik araç bir daha dokunmaz. Sunucuya yazılır.
  koyAtaDugumler() {
    if (this._koyAtaDg && this._koyAtaDgYer === this._yer) return this._koyAtaDg;
    this._koyAtaDgYer = this._yer;
    return (this._koyAtaDg = (this._yer || []).filter(r => r[3] === 'YKOY' || r[3] === 'BCK').map(r => ({
      ad: String(r[0]).replace(/_?Mrk ?(bucak|köy)$/i, ' merkez').replace(/_/g, ' ').trim(), lat: r[1], lon: r[2], ilce: r[4] || ''
    })));
  }
  // Kayda en yakın yerleşim (ilçe fark etmez; ilçe yazılan köyden alınır)
  koyAtaOneri(a) {
    const ob = this._koyAtaOb = this._koyAtaOb || {};
    if (this._koyAtaObYer !== this._yer) { this._koyAtaObYer = this._yer; for (const x of Object.keys(ob)) delete ob[x]; }
    const key = a.id + '|' + a.lat + '|' + a.lon;
    if (ob[key] !== undefined) return ob[key];
    let en = null, ed = Infinity;
    for (const v of this.koyAtaDugumler()) { const d = this.mesafeM(a, v); if (d < ed) { ed = d; en = v; } }
    return (ob[key] = en ? { ...en, km: ed / 1000 } : null);
  }
  koyAtaBosKayitlar() { return (this.state.assets || []).filter(a => !a.village && a.lat != null && a.dbId != null); }
  koyAtaAc() {
    if (!this._yer) return this.duyur('Yerleşim listesi yüklenemedi — sayfayı yenileyip tekrar deneyin.', 5000, 'kotu');
    this.setState({ koyAtaDurum: { sec: [], hedef: null, q: '' } });
  }
  koyAtaKapat() { this.setState({ koyAtaDurum: null }); }
  koyAtaGuncelle(y) { this.setState({ koyAtaDurum: { ...this.state.koyAtaDurum, ...y } }); }
  koyAtaSecTik(id, odakla) {
    const k = this.state.koyAtaDurum; if (!k) return;
    const sec = k.sec.includes(id) ? k.sec.filter(x => x !== id) : [...k.sec, id];
    if (odakla) this._koyAtaOdak = id;
    this.koyAtaGuncelle({ sec });
  }
  // Seçili kayıtların 3 km çevresindeki köyü boş kayıtları da seçer (aynı köyün kuyuları genelde bir arada)
  koyAtaCevre() {
    const k = this.state.koyAtaDurum; if (!k || !k.sec.length) return;
    const bos = this.koyAtaBosKayitlar(), ilk = bos.filter(a => k.sec.includes(a.id));
    const ek = bos.filter(a => !k.sec.includes(a.id) && ilk.some(b => this.mesafeM(a, b) <= 3000)).map(a => a.id);
    this.koyAtaGuncelle({ sec: [...k.sec, ...ek] });
    this.duyur(ek.length ? ek.length + ' kayıt daha seçildi.' : 'Çevrede başka köyü boş kayıt yok.', 2500, 'iyi');
  }
  // Seçili kayıtların merkezine en yakın aday köyler
  koyAtaAdaylar(secili) {
    if (!secili.length) return [];
    const m = { lat: secili.reduce((t, a) => t + a.lat, 0) / secili.length, lon: secili.reduce((t, a) => t + a.lon, 0) / secili.length };
    return this.koyAtaDugumler().map(v => ({ ...v, km: this.mesafeM(m, v) / 1000 })).sort((x, y) => x.km - y.km).slice(0, 7);
  }
  koyAtaHaritaGonder() {
    const f = document.getElementById('ks-koyata-harita'), k = this.state.koyAtaDurum;
    if (!f || !f.contentWindow || !k) return;
    const bos = this.koyAtaBosKayitlar(), secili = bos.filter(a => k.sec.includes(a.id));
    const koyler = this.koyAtaAdaylar(secili).map(v => ({ ad: v.ad, ilce: v.ilce, lat: v.lat, lon: v.lon, km: v.km.toFixed(1).replace('.', ','), hedef: !!(k.hedef && k.hedef.ad === v.ad && k.hedef.ilce === v.ilce) }));
    if (k.hedef && !koyler.some(v => v.hedef)) { const h = this.koyAtaDugumler().find(v => v.ad === k.hedef.ad && v.ilce === k.hedef.ilce); if (h) koyler.push({ ad: h.ad, ilce: h.ilce, lat: h.lat, lon: h.lon, hedef: true }); }
    const odak = this._koyAtaOdak ? bos.find(a => a.id === this._koyAtaOdak) : null; this._koyAtaOdak = null;
    const kayitlar = bos.map(a => { const o = this.koyAtaOneri(a); return { id: a.id, code: a.code, lat: a.lat, lon: a.lon, ilce: a.district || '', oneri: o ? o.ad : '', sec: k.sec.includes(a.id) }; });
    try { f.contentWindow.postMessage({ ks: 'koyAtaVeri', kayitlar, koyler, dark: this.th().dark, zemin: this.state.ozetZemin || 'hyb', odak: odak ? { lat: odak.lat, lon: odak.lon } : null }, '*'); } catch (e) { /* çerçeve yok */ }
  }
  // Seçili kayıtlara (ya da tek kayda) köy yazar
  async koyAtaUygula(idler, hedef) {
    const M = this._sb;
    if (!M || !M.tokenOku() || this.state.offline) return this.duyur('Köy yazmak için sunucu bağlantısı gerekir.', 5000, 'kotu');
    const L = (this.state.assets || []).filter(a => idler.includes(a.id) && !a.village && this.yazabilir(a));
    if (!L.length || !hedef) return;
    const ilceFark = hedef.ilce ? L.filter(a => a.district && a.district !== hedef.ilce).length : 0;
    if (L.length > 1 && !window.confirm(L.length + ' kayda “' + hedef.ad + '” köyü yazılsın mı?' + (ilceFark ? '\n(' + ilceFark + ' kaydın ilçesi de ' + hedef.ilce + ' olarak değişir.)' : '') + '\nYanlış olursa kaydın kartından düzeltebilirsiniz.')) return;
    this.koyAtaGuncelle({ yaziyor: true });
    let ok = 0, hata = '';
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      const d = { ...(a.d || {}), koyElle: true }; delete d.koyOtomatik;
      const yeni = { ...a, village: hedef.ad, district: hedef.ilce || a.district, d };
      let r; try { r = await M.tesisKaydet(yeni); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) { ok++; this.iz(a.id, 'Köy elle atandı', hedef.ad + ' · toplu köy atama'); }
      else { hata = (r && r.err) || 'bağlantı kesildi'; if (r && r.cevrimdisi) break; }
    }
    await this.veriYenile(true);
    if (this.state.koyAtaDurum) this.koyAtaGuncelle({ yaziyor: false, sec: this.state.koyAtaDurum.sec.filter(id => !L.some(a => a.id === id)), hedef: null, q: '' });
    this.denetimYaz('veri', 'Köy elle atandı', ok + ' kayıt → ' + hedef.ad, 'Köy ata');
    this.duyur(ok + ' kayda “' + hedef.ad + '” yazıldı' + (hata ? ' · durdu: ' + hata : '') + '.', 5000, hata ? 'kotu' : 'iyi');
  }
