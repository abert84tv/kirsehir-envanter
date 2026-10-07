  // ── İş kartı (tek sayfa): başvuru / talep → arıza + ekip, eski Talep ekranına gitmeden
  isKartiAc(tur, id) {
    const kay = tur === 'b' ? (this.state.basvurular || []).find(x => x.id === id) : (this.state.talepler || []).find(x => x.id === id);
    if (!kay) return;
    const metin = [kay.konu === 'Telegram bildirimi' ? '' : kay.konu, kay.aciklama].filter(Boolean).join('. ');
    const sn = this.talepSiniflandir(metin, { ilce: kay.ilce });
    const grup = ARIZA_GRUP[kay.grup] ? kay.grup : (ARIZA_GRUP[sn.grup] ? sn.grup : 'su');
    const G = ARIZA_GRUP[grup];
    const ariza = kay.tur && G.turler.includes(kay.tur) ? kay.tur : (G.turler.includes(sn.tur) ? sn.tur : G.turler[0]);
    const koy = kay.koy && kay.koy !== 'Belirtilmedi' ? kay.koy : (sn.koy || '');
    this.konumYenile();
    this.setState({
      tab: 'isKarti',
      isKarti: {
        tur, id, grup, ariza, oncelik: (tur === 't' && kay.oncelik) || sn.oncelik || 'Normal',
        ilce: kay.ilce || sn.ilce || '', koy, assetId: null, tesisQ: '', ekip: '', zaman: 'hemen', planli: '', not: '',
        gerekce: sn.gerekce || []
      }
    });
  }
  // Bildirimin konumu (varsa) ya da köyün yerleşim listesindeki noktası
  isKartiNokta(kay) {
    if (kay && kay.lat != null && kay.lon != null) return { lat: +kay.lat, lon: +kay.lon };
    const k = this.state.isKarti;
    const ad = k && k.koy ? k.koy : (kay && kay.koy);
    if (!ad || ad === 'Belirtilmedi') return null;
    const nk = nkey(ad), ik = nkey((k && k.ilce) || (kay && kay.ilce) || '');
    const yerler = this._yer || [];
    const r = yerler.find(x => nkey(x[0]) === nk && (!ik || !x[4] || nkey(x[4]) === ik)) || yerler.find(x => nkey(x[0]) === nk);
    return r ? { lat: r[1], lon: r[2] } : null;
  }
  // Ata: arıza oluşturulur (varsa ekip + araç + iş emri ile). Kayıt mevcut kaydetme akışından geçer.
  async isKartiAta() {
    const k = this.state.isKarti;
    if (!k || k.bekle) return;
    const G = ARIZA_GRUP[k.grup] || ARIZA_GRUP.su;
    const sebeke = !!G.sebeke;
    if (sebeke && !(k.koy || '').trim()) return this.duyur('Arızanın köyünü yazın.', 4500, 'kotu');
    if (sebeke && !k.ilce) return this.duyur('İlçeyi seçin.', 4500, 'kotu');
    if (!sebeke && !k.assetId) return this.duyur('Arızanın olduğu tesisi seçin.', 4500, 'kotu');
    let t = k.tur === 't' ? (this.state.talepler || []).find(x => x.id === k.id) : null;
    if (k.tur === 'b') {
      const b = (this.state.basvurular || []).find(x => x.id === k.id);
      if (!b) return;
      this.setState({ isKarti: { ...k, bekle: true } });
      await this.basvuruAktar(b);
      t = (this.state.talepler || []).find(x => x.takip === b.takip);
      if (!t) return this.setState({ isKarti: { ...this.state.isKarti, bekle: false } });
    }
    const ekip = k.ekip || '';
    const ekipAyar = (this.state.ekipler || []).find(e => e.ad === ekip);
    const araclar = ekip ? ((this.state.arac && this.state.arac.list) || []).filter(v => v.ekip === ekip).map(v => v.id) : [];
    const ff = {
      assetId: sebeke ? null : k.assetId, type: k.ariza, grup: k.grup, yerModu: sebeke ? 'koy' : 'tesis',
      ilce: sebeke ? k.ilce : '', koy: sebeke ? k.koy : '',
      priority: k.oncelik, status: ekip ? 'atandi' : 'acik', crew: ekip || ATANMADI,
      note: t.no + ' · ' + (TALEP_SIFAT[t.sifat] || '') + ' ' + t.ad + (t.tel ? ' (' + t.tel + ')' : '') + ' · ' + (TALEP_KANAL[t.kanal] || '')
        + '\n' + (t.aciklama || '') + (k.not ? '\n' + k.not : ''),
      malzeme: [], sesler: [], iscilik: '', isaret: null, id: null, photos: [], hours: '', talepId: t.id, talepKoy: t.koy,
      iseEmri: !!ekip && !!ekipAyar, aracSec: araclar,
      ...(k.zaman === 'ileri' && k.planli ? { ek: { planli: new Date(k.planli).toISOString() }, ekBekleyen: true } : {})
    };
    this.setState({ faultForm: ff, isKarti: null }, () => {
      this.renderVals().saveFault();
      // Kaydetme akışı yeni arızada Arıza sekmesine geçer; panoda kalınır
      setTimeout(() => this.setState({ tab: 'isPanosu', panel: 'yok', faultForm: null }), 60);
    });
  }
  // Arıza değil: talebi nedenle kapatır
  isKartiKapat(t) {
    const neden = (window.prompt('Neden arıza değil? (örn. bilgi verildi, başka kurumun görevi)') || '').trim();
    if (!neden) return;
    this.talepDurum(t.id, 'red', neden);
    this.setState({ tab: 'isPanosu', isKarti: null });
  }
