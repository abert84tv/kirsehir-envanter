  // Açıklama metinleri (ks-bilgi) varsayılan gizlidir; "?" düğmesiyle açılır
  yardimDegistir(v) {
    const ac = typeof v === 'boolean' ? v : !this.state.yardim;
    try { localStorage.setItem('ks-yardim', ac ? '1' : '0'); } catch (e) { /* depolama kapalı */ }
    try { document.documentElement.classList.toggle('ks-yardim', ac); } catch (e) { /* belge yok */ }
    this.setState({ yardim: ac });
  }
  prefOku(u) {
    try {
      const p = JSON.parse(localStorage.getItem('ks-pref-' + u.user) || '{}');
      const out = {};
      if (p.mapBase) out.mapBase = p.mapBase;
      const cihazTema = (() => { try { return localStorage.getItem('ks-tema'); } catch (e) { return null; } })();
      out.theme = (cihazTema === 'dark' || cihazTema === 'light') ? cihazTema
        : (p.theme === 'dark' ? 'dark' : 'light');
      try { localStorage.setItem('ks-tema', out.theme); } catch (e) { /* depolama kapalı */ }
      if (typeof p.navMode === 'boolean') out.navMode = p.navMode;
      // Süzgeç olduğu gibi geri gelir — hepsi kapalı bırakıldıysa kapalı açılır
      if (p.filter && typeof p.filter === 'object') {
        out.filter = {
          kuyu: p.filter.kuyu !== false, depo: p.filter.depo !== false,
          ag: p.filter.ag !== false, ges: p.filter.ges !== false,
          pasif: p.filter.pasif !== false,
          // ISU katmanları: eski kayıtta yoksa "Tümü" ile birlikte açık gelir
          kaynak: 'kaynak' in p.filter ? p.filter.kaynak !== false : true,
          memba: 'memba' in p.filter ? p.filter.memba !== false : true
        };
      }
      if (typeof p.hatKatman === 'boolean') out.hatKatman = p.hatKatman;
      if (p.bildirimKanal) out.bildirimKanal = p.bildirimKanal;
      if (p.bildirimEsik) out.bildirimEsik = p.bildirimEsik;
      if (p.convSys || p.convZone) out.conv = { ...this.state.conv, sys: p.convSys || this.state.conv.sys, zone: p.convZone || this.state.conv.zone };
      // Her giriş Envanter > Harita ekranında başlar: bırakılan sayfa geri
      // getirilmez, yoksa kullanıcı Ayarlar'da kaldıysa orada açılıyordu.
      if (p.envQ) out.envQ = p.envQ;
      if (p.envTur) out.envTur = p.envTur;
      if (p.envIlce) out.envIlce = p.envIlce;
      if (p.envAktiflik) out.envAktiflik = p.envAktiflik;
      if (p.envDurum) out.envDurum = p.envDurum;
      if (p.deviceMode) out.deviceMode = p.deviceMode;
      if (p.detailTab) out.detailTab = p.detailTab;
      return out;
    } catch (e) { return {}; }
  }
  // geri yüklenen tercihleri haritaya da uygula
  prefUygula() {
    const s = this.state;
    this.toMap({ ks: 'setBase', base: s.mapBase });
    this.toMap({ ks: 'navMode', on: s.navMode });
    this.pushMap();
  }
  // Tema seçimi hem kullanıcı tercihine hem cihaza yazılır; oturum
  // kapanınca da, tercih dosyası okunamasa da seçim korunur.
  temaSec(t) {
    try { localStorage.setItem('ks-tema', t); } catch (e) { /* depolama kapalı */ }
    this.setState({ theme: t }, () => this.pushMap());
  }
  prefYaz() {
    const s = this.state;
    if (!s.session) return;
    try {
      const f = {
        kuyu: s.filter.kuyu !== false, depo: s.filter.depo !== false,
        ag: s.filter.ag !== false, ges: s.filter.ges !== false,
        pasif: s.filter.pasif !== false,
        kaynak: s.filter.kaynak !== false, memba: s.filter.memba !== false
      };
      localStorage.setItem('ks-pref-' + s.session.user, JSON.stringify({
        mapBase: s.mapBase, theme: s.theme, navMode: s.navMode, filter: f,
        hatKatman: s.hatKatman,
        bildirimKanal: s.bildirimKanal, bildirimEsik: s.bildirimEsik,
        convSys: s.conv.sys, convZone: s.conv.zone, tab: s.tab, detailTab: s.detailTab,
        ayarBolum: s.ayarBolum, deviceMode: s.deviceMode,
        envQ: s.envQ, envTur: s.envTur, envIlce: s.envIlce,
        envAktiflik: s.envAktiflik, envDurum: s.envDurum
      }));
    } catch (e) { /* depolama kapalı */ }
  }