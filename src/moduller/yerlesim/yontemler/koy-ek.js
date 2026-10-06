  // Resmî köy listesi (kirsehir-data.js) + kullanıcının elle eklediği köy/mahalleler
  koyList(m, d) {
    if (!m || !d) return [];
    const temel = m.VILLAGES[d.id] || [];
    const ek = (this.state.ekKoyler || {})[d.id] || [];
    const gor = new Set(temel.map(x => nkey(x)));
    const out = temel.slice();
    for (const r of ek) { const k = nkey(r.ad); if (!k || gor.has(k)) continue; gor.add(k); out.push(r.ad); }
    return out.sort((a, b) => a.localeCompare(b, 'tr'));
  }
  ekKoyKoord(dId, ad) {
    const r = ((this.state.ekKoyler || {})[dId] || []).find(x => nkey(x.ad) === nkey(ad));
    return r && r.lat != null && r.lon != null ? r : null;
  }
  ekKoyYaz(v) {
    try { localStorage.setItem('ks-ek-koyler', JSON.stringify(v)); } catch (e) { /* depolama kapalı */ }
    this.setState({ ekKoyler: v });
  }
  ekKoyEkle() {
    const g = this.state.koyEkleForm || {};
    const m = this.state.data;
    const ad = String(g.ad || '').replace(/\s+/g, ' ').trim();
    if (!g.ilce) return this.duyur('İlçe seçin.', 5000, 'kotu');
    if (!ad) return this.duyur('Köy ya da mahalle adını yazın.', 5000, 'kotu');
    const d = m && m.DISTRICTS.find(x => x.id === g.ilce);
    if (this.koyList(m, d).some(x => nkey(x) === nkey(ad) || nkey(x) === nkey(this.yerlesimAdSadelestir(ad)))) {
      return this.duyur(ad + ' bu ilçede zaten listede.', 5000, 'kotu');
    }
    const say = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isFinite(n) ? n : null; };
    const lat = say(g.lat), lon = say(g.lon);
    if ((lat == null) !== (lon == null)) return this.duyur('Koordinat verilecekse enlem ve boylam birlikte yazılmalı.', 6000, 'kotu');
    const ek = { ...(this.state.ekKoyler || {}) };
    ek[g.ilce] = [...(ek[g.ilce] || []), { ad, lat, lon }];
    this.ekKoyYaz(ek);
    const M = this._sb;
    if (d && M && M.yerlesimEkEkle && M.tokenOku() && !this.state.offline) {
      M.yerlesimEkEkle(d.name, ad, lat, lon).then(r => {
        if (r.ok) this.ekKoyYenile();
        else if (!r.cevrimdisi) this.duyur('Yerleşim sunucuya yazılamadı: ' + r.err, 7000, 'kotu');
      });
    }
    this.setState({ koyEkleForm: { ilce: g.ilce, ad: '', lat: '', lon: '' } });
    this.duyur(ad + ' · ' + (d ? d.name : '') + ' eklendi — yeni kayıt formundaki köy listesinde ve aramada çıkar.'
      + (lat != null ? ' Konum girildiği için yeni kayıtta koordinat buradan gelir.' : ' Koordinat girilmedi — konumu sahada GPS ile alın.'), 7000, 'iyi',
      () => this.setState({ tab: 'yerlesim' }));
  }
  ekKoySil(dId, i) {
    const kayit = ((this.state.ekKoyler || {})[dId] || [])[i];
    const ek = { ...(this.state.ekKoyler || {}) };
    ek[dId] = (ek[dId] || []).filter((_, k) => k !== i);
    if (!ek[dId].length) delete ek[dId];
    this.ekKoyYaz(ek);
    const M = this._sb;
    if (kayit && kayit.id != null && M && M.yerlesimEkSil && M.tokenOku() && !this.state.offline) {
      M.yerlesimEkSil(kayit.id).then(r => {
        if (r.ok) this.ekKoyYenile();
        else if (!r.cevrimdisi) this.duyur('Sunucudan silinemedi: ' + r.err, 7000, 'kotu');
      });
    }
    this.duyur('Yerleşim elle eklenenler listesinden çıkarıldı. Bu köye kayıtlı tesisler etkilenmez.', 5000);
  }
  // Elle eklenen köy / mahalle listesi sunucudan gelir: bir cihazda eklenen
  // yerleşim ötekilerde de çıkar
  async ekKoyYenile() {
    const M = this._sb;
    const m = this.state.data;
    if (!M || !M.yerlesimEkListesi || !M.tokenOku() || !m) return;
    let r;
    try { r = await M.yerlesimEkListesi(); } catch (e) { return; }
    if (!r.ok || !Array.isArray(r.data)) return;
    const tablo = {};
    for (const y of r.data) {
      const d = m.DISTRICTS.find(x => x.id === y.ilce || nkey(x.name) === nkey(y.ilce));
      if (!d) continue;
      (tablo[d.id] = tablo[d.id] || []).push({ id: y.id, ad: y.ad, lat: y.lat, lon: y.lon });
    }
    try { localStorage.setItem('ks-ek-koyler', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    this.setState({ ekKoyler: tablo });
  }