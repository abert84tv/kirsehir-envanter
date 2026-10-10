  // ── Tesis ekleme / silme önerisi: saha şefi önerir → ilçe (ya da bütün ilçelere bakan) mühendis ön onayı → müdür son onayı.
  // Sunucu (tesis_degisiklik_*) her adımı yetkiye göre denetler; operatör bu zincirde yoktur.
  async tesisOneriYenile() {
    const M = this._sb;
    if (!M || !M.tokenOku() || !M.tesisDegisiklikListesi) return;
    const r = await M.tesisDegisiklikListesi();
    if (r && r.ok) this.setState({ tesisOneriler: r.data || [] });
  }
  async tesisEkleOner(n) {
    const M = this._sb;
    if (!M || !M.tokenOku() || this.state.offline) return this.say('Öneri göndermek için bağlantı gerekir — çevrimiçi olunca yeniden deneyin.', true);
    const eskiForm = { newAsset: n, naSz: this.state.naSz, scenario: this.state.scenario, tab: this.state.tab };
    const dosya = (this._naFiles || []).length;
    const r = await M.tesisDegisiklikAc({
      tur: 'ekle', tesisTur: n.type, ilce: n.district, koy: n.village, lat: n.lat, lon: n.lon,
      yil: parseInt(n.year, 10) || null, veri: { d: {}, photos: 0 }, aciklama: (n.note || '').trim()
    });
    if (!r.ok) { this.say(r.err + ' Form açık kaldı.', true); return; }
    this._naTemizle();
    this.setState({ scenario: null, newAsset: null, naSz: null, tab: 'harita' });
    this.denetimYaz('kayit', 'Yeni tesis önerildi', (TYPES[n.type] ? TYPES[n.type].kind : n.type) + ' · ' + n.village + ' · ' + n.district, '');
    this.tesisOneriYenile();
    this.say('Öneri gönderildi — ' + n.district + ' mühendisinin onayına gitti; sonra müdür onaylayınca kayıt açılır.'
      + (dosya ? ' Fotoğraflar öneriye eklenmez; kayıt açılınca kartından yükleyin.' : ''), true);
    setTimeout(() => this.setState({ toast: null }), 9000);
  }
  async tesisSilOner(a) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !a.dbId || this.state.offline) return this.say('Silme önerisi için bağlantı gerekir.', true);
    const neden = window.prompt(a.code + ' için silme önerisi — nedenini kısaca yazın:', '');
    if (neden === null) return;
    if (!neden.trim()) return this.say('Silme nedenini yazın — onaylayanlar görecek.', true);
    const r = await M.tesisDegisiklikAc({ tur: 'sil', tesisId: a.dbId, aciklama: neden.trim() });
    if (!r.ok) return this.say(r.err, true);
    this.denetimYaz('kayit', 'Tesis silme önerildi', TYPES[a.type].kind + ' · ' + this.yer(a), a.code);
    this.setState({ selected: null, panel: 'yok' });
    this.tesisOneriYenile();
    this.say(a.code + ' için silme önerisi mühendis onayına gönderildi. Onaylanmadan kayıt silinmez.', true);
    setTimeout(() => this.setState({ toast: null }), 8000);
  }
  async tesisOneriKarar(o, karar) {
    const M = this._sb;
    if (!M || !M.tokenOku()) return;
    let neden = '';
    if (karar === 'red') {
      neden = window.prompt('Reddetme nedeni (öneren görecek):', '');
      if (neden === null) return;
    }
    const r = await M.tesisDegisiklikKarar(o.id, karar, neden);
    if (!r.ok) { this.say(r.err, true); return; }
    const ad = (o.tur === 'sil' ? 'Silme' : 'Ekleme') + ' önerisi';
    const ne = { mudur: 'ön onaylandı, müdür onayına gitti', onaylandi: 'onaylandı ve uygulandı', reddedildi: 'reddedildi', iptal: 'geri çekildi', iade: 'mühendise iade edildi' }[r.data] || String(r.data);
    this.denetimYaz('veri', ad + ' ' + ne, (o.tesis_kod || '') + ' · ' + (o.koy || '') + ' · ' + o.ilce, '');
    this.say(ad + ' ' + ne + '.', true);
    setTimeout(() => this.setState({ toast: null }), 6000);
    this.tesisOneriYenile();
    if (r.data === 'onaylandi') this.veriYenile(true);
  }
