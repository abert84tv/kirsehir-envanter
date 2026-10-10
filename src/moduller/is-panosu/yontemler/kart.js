  // ── İş kartı (tek sayfa): başvuru / talep → arıza + ekip, eski Talep ekranına gitmeden
  isKartiAc(tur, id) {
    this.panoGoruldu((tur === 'b' ? 'b' : 't') + id);
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
  // Yeni talep (telefonla gelen): bildiren elle girilir, aynı kartla arızaya çevrilip atanır
  isKartiYeni() {
    this.konumYenile();
    this.setState({
      tab: 'isKarti',
      isKarti: {
        tur: 'n', ad: '', tel: '', sifat: 'muhtar', kanal: 'telefon', aciklama: '', kvkk: false,
        grup: 'su', ariza: ARIZA_GRUP.su.turler[0], oncelik: 'Normal', ilce: '', koy: '', assetId: null, tesisQ: '',
        ekip: '', zaman: 'hemen', planli: '', not: '', gerekce: []
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
    if (k.tur === 'n') {
      if (!(k.ad || '').trim()) return this.duyur('Bildiren kişinin adını yazın.', 4500, 'kotu');
      if (!(k.aciklama || '').trim()) return this.duyur('Talebin ne olduğunu yazın.', 4500, 'kotu');
      if ((this.state.kvkk || {}).onayZorunlu && !k.kvkk) return this.duyur('Bildirene verisinin ne için kaydedildiği söylenmeli — onay kutusunu işaretleyin.', 6500, 'kotu');
      const marka = 'TEL-' + Date.now().toString(36);
      this.setState({ isKarti: { ...k, bekle: true } });
      this.talepKaydet({
        ad: k.ad, tel: k.tel, sifat: k.sifat, kanal: k.kanal, ilce: k.ilce, koy: (k.koy || 'Belirtilmedi'), konu: TALEP_KONU[0],
        oncelik: k.oncelik, aciklama: k.aciklama, kvkkOnay: true, grup: k.grup, tur: k.ariza, takip: marka
      });
      // Numara sunucudan alınırken kayıt kısa süre gecikir: oluşana kadar beklenir
      for (let i = 0; i < 30 && !t; i++) {
        await new Promise(r => setTimeout(r, 200));
        t = (this.state.talepler || []).find(x => x.takip === marka);
      }
      if (!t) return this.setState({ isKarti: { ...this.state.isKarti, bekle: false } }, () => this.duyur('Talep kaydedilemedi — formu kontrol edin.', 5000, 'kotu'));
    }
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
    const araclar = ekip && this.state.modul.arac !== false ? ((this.state.arac && this.state.arac.list) || []).filter(v => v.ekip === ekip).map(v => v.id) : [];
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
  // Kartlardaki yer haritası (ozet-harita.html#is): hedef nokta, aday/seçili tesis ve (varsa) ekiplerin son konumu
  isHaritaGonder() {
    const f = document.getElementById('ks-is-harita');
    if (!f || !f.contentWindow) return;
    const s = this.state, A = s.assets || [], k = s.isKarti, ff = s.faultForm;
    const kmYaz = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
    const ogeA = (a, ref) => ({ id: a.id, code: a.code, type: a.type, lat: a.lat, lon: a.lon, yer: this.yerGoster(a), km: ref ? kmYaz(this.mesafeM(ref, a)) : '' });
    let hedef = null, tesisler = [], secId = null, secilebilir = false;
    if (s.tab === 'isKarti' && k && k.tur !== 'a') {
      const ad = this._isAdaylar || { l: [], ref: null }, ref = ad.ref;
      tesisler = (ad.l || []).map(a => ogeA(a, ref)); secId = k.assetId || null; secilebilir = true;
      const sec = k.assetId ? A.find(x => x.id === k.assetId) : null;
      if (sec && !tesisler.some(t => t.id === sec.id)) tesisler.push(ogeA(sec, ref));
      if (!sec && ref) hedef = { lat: ref.lat, lon: ref.lon, ad: k.koy || 'Bildirilen yer' };
      else if (sec && ref) hedef = { lat: ref.lat, lon: ref.lon, ad: 'Bildirilen yer' };
    } else if (ff) {
      const a = ff.assetId ? A.find(x => x.id === ff.assetId) : null;
      if (a) { tesisler = [ogeA(a, null)]; secId = a.id; }
      else { const y = ff.koy ? this.yerBul(ff.koy) : null; if (y) hedef = { lat: y.lat, lon: y.lon, ad: ff.koy + ' · arıza yeri' }; }
    }
    const yas = iso => { const dk = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return dk < 2 ? 'şimdi' : dk < 60 ? dk + ' dk önce' : dk < 1440 ? Math.floor(dk / 60) + ' sa önce' : Math.floor(dk / 1440) + ' gün önce'; };
    const ekipler = Object.entries(s.ekipKonum || {}).filter(([, v]) => v && v.lat != null && v.lon != null).map(([ad, v]) => ({
      ad, lat: v.lat, lon: v.lon, taze: (Date.now() - Date.parse(v.zaman)) < 30 * 60000, not: (v.kaynak === 'arac' ? 'araç takip · ' : 'zimmetli cihaz · ') + yas(v.zaman)
    }));
    try { f.contentWindow.postMessage({ ks: 'isHaritaVeri', hedef, tesisler, secId, secilebilir, ekipler, dark: this.th().dark, zemin: s.ozetZemin || 'hyb', renk: turRenk(this.th().dark) }, '*'); } catch (e) { /* çerçeve yok */ }
  }

