  // Köy kontrolü: otomatik yazılan köyleri doğrulama / düzeltme / geri alma (sunucuya yazar)
  async koyYaz(a, village, koyOtomatik) {
    const M = this._sb;
    const d = { ...(a.d || {}), koyOtomatik: koyOtomatik || '' };
    const yeni = { ...a, village, d, villageAuto: undefined };
    this.setState(st => ({ assets: st.assets.map(x => x.id === a.id ? yeni : x) }));
    let r; try { r = await M.tesisKaydet(yeni); } catch (e) { r = { ok: false, cevrimdisi: true }; }
    if (!(r && r.ok)) { this.setState(st => ({ assets: st.assets.map(x => x.id === a.id ? a : x) })); this.duyur(a.code + ' kaydedilemedi: ' + ((r && r.err) || 'bağlantı yok'), 7000, 'kotu'); return false; }
    return true;
  }
  koyKayitlar() { return (this.state.assets || []).filter(a => a.d && a.d.koyOtomatik); }
  async koyDogru(a) {
    if (await this.koyYaz(a, a.village, '')) { this.iz(a.id, 'Köy doğrulandı', a.village); await this.veriYenile(true); }
  }
  async koyGeriAl(a) {
    if (await this.koyYaz(a, '', '')) { this.iz(a.id, 'Otomatik köy geri alındı', a.village + ' → (boş)'); await this.veriYenile(true); }
  }
  async koyTumDogru() {
    const L = this.koyKayitlar();
    if (!L.length || !window.confirm(L.length + ' kaydın köy adı doğru kabul edilsin mi? (“otomatik” işareti kalkar.)')) return;
    for (const a of L) await this.koyYaz(a, a.village, '');
    await this.veriYenile(true); this.duyur(L.length + ' kayıt doğrulandı.', 5000, 'iyi');
  }
  async koyTumGeriAl() {
    const L = this.koyKayitlar();
    if (!L.length || !window.confirm(L.length + ' kayıttaki otomatik köy adı silinsin mi? Köyler eskisi gibi boş döner (elle doğrulananlara dokunulmaz).')) return;
    let n = 0; for (const a of L) if (await this.koyYaz(a, '', '')) n++;
    await this.veriYenile(true);
    this.denetimYaz('veri', 'Otomatik köy adları geri alındı', n + ' kayıt', 'Kayıt araçları');
    this.duyur(n + ' kayıttaki otomatik köy adı geri alındı.', 6000, 'iyi');
  }
  // Kaydı haritada açar ve “Köy ve ilçe düzelt” formunu doldurur
  koyDuzeltAc(a) {
    this.flyTo(a.lat, a.lon, 16);
    this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita', koyForm: { village: a.village || '', district: a.district || '' } });
  }
