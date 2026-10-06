  baslatBasvuruUyari() {
    // Ses kilidi: tarayıcı sesi ilk dokunuşa kadar kapalı tutar; her dokunuşta ses bağlamı uyandırılır
    this._sesAc = () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._ac = this._ac || new AC();
        const k = () => { if (this._ac.state === 'running' && !this.state.sesAcik) this.setState({ sesAcik: true }); };
        if (this._ac.state === 'suspended') this._ac.resume().then(k).catch(() => {}); else k();
      } catch (e) { /* ses yok */ }
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, this._sesAc, { passive: true }));
    this._uyariTekrar = setInterval(() => { if (this.state.basvuruUyari) this.uyariSesi(); }, 6000);
    this._basvuruSaat = setInterval(() => { if (this.state.session && !document.hidden) this.basvuruYenile(); }, 30000);
    // Tarayıcı bildirimi izni, ilk dokunuşta bir kez istenir (izin yalnız kullanıcı hareketiyle sorulabilir)
    this._izinIste = () => { try { if (typeof Notification !== 'undefined' && Notification.permission === 'default' && this.state.session) Notification.requestPermission(); } catch (e) { /* desteklenmiyor */ } document.removeEventListener('pointerdown', this._izinIste); };
    document.addEventListener('pointerdown', this._izinIste);
  }