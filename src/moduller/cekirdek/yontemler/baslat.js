  baslatDurum() {
    let dm = 'auto';
    try { dm = localStorage.getItem('ks-device-mode') || 'auto'; } catch (e) { /* depolama kapalı */ }
    this.setState({ deviceMode: dm, device: dm === 'auto' ? this.olcCihaz() : dm, users: this.usersOku() });
    try {
      const yv = JSON.parse(localStorage.getItem('ks-yerlesim-veri') || 'null');
      if (yv && typeof yv === 'object') this.setState({ yerlesimVeri: yv });
      const ht = JSON.parse(localStorage.getItem('ks-hatlar') || 'null');
      if (ht && typeof ht === 'object') this.setState({ hatlar: ht }, () => setTimeout(() => this.hatlariYolla(), 900));
      const ek = JSON.parse(localStorage.getItem('ks-ek-koyler') || 'null');
      if (ek && typeof ek === 'object') this.setState({ ekKoyler: ek });
    } catch (e) { /* depolama kapalı */ }
  }
  baslatKatmanOlcu() {
    this._rs = () => { if (this.state.deviceMode === 'auto') this.cihazUygula('auto'); };
    window.addEventListener('resize', this._rs);
    // Telefon katmanları: üst çubuğun alt kenarı ve alt menünün yüksekliği CSS
    // değişkenine yazılır; açılan paneller bu değerlere yaslanır, üst üste binmez.
    this._olcKat = () => {
      const r = document.documentElement;
      const b = document.getElementById('tel-bas');
      const n = document.getElementById('tel-nav');
      // Boyut değişimi ResizeObserver ile yakalanır; öğe yeniden çizilip değiştiyse yeni öğe izlenir (aşağıdaki seyrek yoklama bunu fark eder)
      if (typeof ResizeObserver === 'function') {
        if (!this._katRO) this._katRO = new ResizeObserver(() => this._olcKat());
        if (b && this._katIzB !== b) { if (this._katIzB) this._katRO.unobserve(this._katIzB); this._katRO.observe(b); this._katIzB = b; }
        if (n && this._katIzN !== n) { if (this._katIzN) this._katRO.unobserve(this._katIzN); this._katRO.observe(n); this._katIzN = n; }
      }
      // Eleman yoksa varsayılan (58/60) korunur — 0 yazmak panelleri çakıştırır
      if (b) { const bv = Math.round(b.getBoundingClientRect().bottom); if (bv > 0 && this._katB !== bv) { this._katB = bv; r.style.setProperty('--tel-bas', bv + 'px'); } }
      if (n) { const nv = Math.round(n.getBoundingClientRect().height); if (nv > 0 && this._katN !== nv) { this._katN = nv; r.style.setProperty('--tel-nav', nv + 'px'); } }
    };
    this._olcKat();
    requestAnimationFrame(this._olcKat);
    // ResizeObserver yoksa (eski tarayıcı) 1,5 sn; varsa yalnız yeni öğeyi izlemeye almak için 5 sn'de bir, sekme görünürken
    this._katSaat = setInterval(() => { if (!document.hidden) this._olcKat(); }, typeof ResizeObserver === 'function' ? 5000 : 1500);
    window.addEventListener('resize', this._olcKat);
    window.addEventListener('orientationchange', this._olcKat);
  }
  baslatEsc() {
    // Esc: açık form ve panelleri kapatır
    this._esc = e => {
      if (e.key !== 'Escape') return;
      if (this.state.hatTam) return this.setState({ hatTam: false });
      if (this.state.alanForm) return this.setState({ alanForm: null });
      if (this.state.card) return this.setState({ card: null });
      if (this.state.userForm) return this.setState({ userForm: null });
      if (this.state.panel && this.state.panel !== 'yok') this.setState({ panel: 'yok', faultForm: null });
    };
    window.addEventListener('keydown', this._esc);
  }
  // Sunucudan gelen veri ekrandakiyle aynıysa yeniden çizdirme (30 sn'lik yenilemede boşuna sekiz kez çiziliyordu)
  ayniMi(a, b) {
    if (a === b) return true;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }
