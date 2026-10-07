  // konum modülü — ekip konumu: araç takip (Arvento) ve ekibe zimmetli tablet/telefon
  // Ekiplerin en yeni konumunu (kaynağıyla) sunucudan alır; İş kartı ve harita bunu kullanır
  async konumYenile() {
    const M = this._sb;
    if (!M || !M.konumEkipListesi || !M.tokenOku() || this.state.offline) return;
    const r = await M.konumEkipListesi();
    if (!r || !r.ok) return;
    const harita = {};
    for (const x of (r.data || [])) harita[x.ekip] = { lat: x.lat, lon: x.lon, zaman: x.zaman, kaynak: x.tur === 'arvento' ? 'arac' : 'cihaz', plaka: x.plaka || '' };
    this.setState({ ekipKonum: harita });
  }
  // Zimmetli cihaz: ekip hesabıyla girilmiş, "paylaş" açık ve uygulama açıkken konum dakikada bir gider
  konumGonderTik() {
    const me = this.state.session;
    if (!this.state.konumPaylasim || !me || !me.crew || this.state.offline || !this._sb || !this._sb.konumGonder) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(p => {
      this._sb.konumGonder(+p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6), Math.round(p.coords.accuracy || 0)).then(r => {
        if (r && r.ok) this.setState({ konumSon: Date.now(), konumHata: '' });
        else if (r && !r.cevrimdisi) this.setState({ konumHata: r.err || 'Konum gönderilemedi.' });
      });
    }, e => this.setState({ konumHata: e && e.code === 1 ? 'Konum izni verilmemiş — tarayıcı ayarlarından açın.' : 'Konum alınamadı.' }),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }
  konumPaylasimTog() {
    const yeni = !this.state.konumPaylasim;
    try { localStorage.setItem('ks-konum-paylas', yeni ? '1' : '0'); } catch (e) { /* depolama kapalı */ }
    this.setState({ konumPaylasim: yeni, konumHata: '' }, () => { if (yeni) this.konumGonderTik(); });
    this.denetimYaz('ayar', yeni ? 'Cihaz konum paylaşımı açıldı' : 'Cihaz konum paylaşımı kapatıldı', (this.state.session || {}).crew || '', '');
  }
  async konumCihazlariYenile() {
    const M = this._sb;
    if (!M || !M.konumCihazListesi || !M.tokenOku() || this.state.offline) return;
    const r = await M.konumCihazListesi();
    if (r && r.ok) this.setState({ konumCihazlar: (r.data || []).map(x => ({ id: x.id, ad: x.ad, tur: x.tur, ekip: x.ekip || '', plaka: x.plaka || '', kod: x.harici_kod || '', aktif: x.aktif, lat: x.lat, lon: x.lon, zaman: x.zaman })) });
  }
  async konumFormKaydet() {
    const f = this.state.konumForm;
    if (!f) return;
    const r = await this._sb.konumCihazKaydet(f);
    if (!r.ok) return this.duyur(r.err || 'Kaydedilemedi.', 6000, 'kotu');
    this.denetimYaz('ayar', f.id ? 'Konum cihazı güncellendi' : 'Konum cihazı eklendi', f.ad + ' · ' + (f.tur === 'arvento' ? 'araç takip' : 'zimmetli cihaz') + (f.ekip ? ' · ' + f.ekip : ''), '');
    this.setState({ konumForm: null });
    this.konumCihazlariYenile();
    this.duyur('Cihaz kaydedildi.', 4000, 'iyi');
  }
  async konumCihazSil(c) {
    if (!window.confirm(c.ad + ' silinsin mi? (son konumu da silinir)')) return;
    const r = await this._sb.konumCihazSil(c.id);
    if (!r.ok) return this.duyur(r.err || 'Silinemedi.', 6000, 'kotu');
    this.denetimYaz('ayar', 'Konum cihazı silindi', c.ad, '');
    this.konumCihazlariYenile();
    this.konumYenile();
  }
