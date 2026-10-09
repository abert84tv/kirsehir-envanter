  olcCihaz() {
    const w = (typeof window !== 'undefined' && window.innerWidth) || 1440;
    return w < 820 ? 'phone' : 'desktop';
  }
  cihazUygula(mode) {
    const m = mode || this.state.deviceMode;
    this.setState({ device: m === 'auto' ? this.olcCihaz() : m });
  }
  componentWillUnmount() {
    if (this._rs) window.removeEventListener('resize', this._rs);
    if (this._esc) window.removeEventListener('keydown', this._esc);
    if (this._msg) window.removeEventListener('message', this._msg);
    if (this._katSaat) clearInterval(this._katSaat);
    if (this._olcKat) { window.removeEventListener('resize', this._olcKat); window.removeEventListener('orientationchange', this._olcKat); }
  }
  componentDidMount() {
    this.baslatDurum();
    this.baslatBaglanti();
    this.baslatKatmanOlcu();
    this.baslatAg();
    this.baslatBasvuruUyari();
    this.baslatPeriyodik();
    this.baslatEsc();
    this.baslatOturumKaydi();
    this.baslatVeri();
    this.baslatMesajlar();
  }
  componentDidUpdate(prevProps, prev) {
    // Telefon kabuğu yeni geldiyse katman ölçüsünü beklemeden tazele
    if (this._olcKat) requestAnimationFrame(this._olcKat);
    // Ayarlar'dan çıkıldığında bölüm seçimi sıfırlanır ki bir dahaki
    // girişte kullanıcı yine listeyi görsün
    // runtime bazı çağrılarda prevState vermiyor (bkz. aşağıdaki not) — burada
    // erken kullanıldığı için ayrıca korunması gerekiyor, aşağıdaki genel
    // "if (!prev) return" bu satırdan sonra geliyor.
    if (prev && prev.tab === 'ayarlar' && this.state.tab !== 'ayarlar' && this.state.ayarBolum)
      this.setState({ ayarBolum: null });
    // runtime prevState vermeyebilir — kendi anlık görüntümüzle karşılaştırırız
    const s = this.state;
    // Bekleyen arızalar cihazda saklanır (arizaBekleyenYaz)
    if (this._arizaRef !== s.faults) { this._arizaRef = s.faults; this.arizaBekleyenYaz(); }
    if (this._entAyar !== s.ayarBolum) { this._entAyar = s.ayarBolum; if (['uyari', 'yapayzeka', 'konum'].includes(ayarBolumu(s.ayarBolum)) && s.tab === 'ayarlar') this.entegrasyonYenile(); }
    // Alarm (ses tekrarı, sekme başlığı) iş panosu açılınca susar; işlerin kendisi panoda yanıp söner
    if (s.tab === 'isPanosu' && s.basvuruUyari) this.setState({ basvuruUyari: null });
    if (this._slaRef !== s.faults) { this._slaRef = s.faults; this.slaTara(); }
    try { document.documentElement.classList.toggle('ks-koyu', s.theme === 'dark'); } catch (e) { /* belge yok */ }
    // Tam ekran harita yalnız harita ve hat kesiti ekranlarında; başka sayfaya geçince çubuklar geri gelir
    if (s.telTam && s.tab !== 'harita' && s.tab !== 'profil') { try { document.documentElement.classList.remove('ks-tam'); } catch (e) { /* belge yok */ } this.setState({ telTam: false }); }
    if (this._telTab !== s.tab) { this._telTab = s.tab; if (s.tab === 'telemetri') this.telemetriYenile(true); }
    // Sunucudan alınan son veri cihaza da yazılır: internetsiz açılışta oradan gelir
    if (s.session && s.sunucu && s.sonEsitleme
        && (this._snapA !== s.assets || this._snapF !== s.faults || this._snapN !== s.notes || this._snapI !== s.isEmirleri)) {
      this._snapA = s.assets; this._snapF = s.faults; this._snapN = s.notes; this._snapI = s.isEmirleri;
      clearTimeout(this._snapT);
      this._snapT = setTimeout(() => this.anlikKaydet(), 2500);
    }
    if (s.session) {
      const imza = JSON.stringify([s.mapBase, s.theme, s.navMode, s.filter, s.hatKatman,
        s.bildirimKanal, s.bildirimEsik, s.conv.sys, s.conv.zone, s.tab, s.detailTab,
        s.ayarBolum, s.deviceMode, s.envQ, s.envTur, s.envIlce, s.envAktiflik, s.envDurum,
        s.session.user]);
      if (this._prefImza !== imza) { this._prefImza = imza; this.prefYaz(); }
    }
    if (!prev) return;
    if (prev.theme !== this.state.theme || prev.filter !== this.state.filter) this.pushMap();
    // Hat Kesiti ve hat çizim pencereleri açıkken tema değişirse onlara da haber verilir
    if (prev.theme !== this.state.theme) {
      const dark = this.state.theme === 'dark';
      const pw = this.profilWin(); if (pw) try { pw.postMessage({ ks: 'theme', dark }, '*'); } catch (e) { /* çerçeve yok */ }
      const hw = this.hatWin(); if (hw) try { hw.postMessage({ ks: 'theme', dark }, '*'); } catch (e) { /* çerçeve yok */ }
    }
    // hat sekmesi: kayıt ya da sekme değişince çizim sayfasına yeni kayıt gönderilir
    if (this.state.hatTam && (!prev.hatTam || prev.selected !== this.state.selected)) {
      setTimeout(() => this.hatGonder(), 260);
    }
    if (this.state.detailTab === 'hat'
      && (prev.detailTab !== 'hat' || prev.selected !== this.state.selected)) {
      setTimeout(() => this.hatGonder(), 120);
    }
    // Çevrimdışıdan çıkıldı: bekleyen modül verisi sunucuya gider
    if (prev.offline && !this.state.offline) setTimeout(() => this.senkron(true), 1200);
    // Profil haritası: sekme açılınca ve kayıt listesi değişince tesisler yenilenir
    if (this.state.tab === 'profil'
      && (prev.tab !== 'profil' || prev.assets !== this.state.assets)) {
      setTimeout(() => this.profilTesis(), prev.tab !== 'profil' ? 260 : 0);
    }
    // harita dışına çıkınca konum onay şeridi ve işaretleme modu kapanır
    if (prev.tab !== this.state.tab && this.state.tab !== 'harita' && (this.state.vFix || this.state.pick)) {
      if (this.state.pick) this.toMap({ ks: 'pick', name: null });
      this.setState({ vFix: null, pick: null });
    }
  }
  componentWillUnmount() {
    removeEventListener('message', this._msg);
    if (this._agGeldi) window.removeEventListener('online', this._agGeldi);
    if (this._agGitti) window.removeEventListener('offline', this._agGitti);
    if (this._gorunur) document.removeEventListener('visibilitychange', this._gorunur);
    clearInterval(this._kuyrukSaat); clearInterval(this._basvuruSaat); clearInterval(this._uyariTekrar);
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, this._sesAc));
    clearInterval(this._veriSaat);
    clearTimeout(this._t); clearTimeout(this._f); clearTimeout(this._d);
  }