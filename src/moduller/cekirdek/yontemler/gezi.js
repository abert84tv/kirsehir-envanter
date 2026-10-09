  // Gezinme geçmişi: bir sayfadan başka sayfaya geçince önceki sayfa yığına girer; “‹ Geri” düğmesi oradan döner.
  // Menüden (sol menü, alt çubuk) geçiş yığını sıfırlar — oradaki geçiş “yeni başlangıç”tır.
  // Aynı sayfanın sekmeleri arasında geçiş (Harita / Hat kesiti / Liste): geri düğmesi gerektirmez
  geziYanal() { this._geziIs = { m: 'yanal', t: Date.now() }; }
  geziMenu() { this._geziIs = { m: 'menu', t: Date.now() }; }
  geziIzle() {
    const s = this.state;
    if (this._geziTab === undefined) { this._geziTab = s.tab; return; }
    if (this._geziTab === s.tab) return;
    const onceki = this._geziTab; this._geziTab = s.tab;
    const is = this._geziIs; this._geziIs = null;
    const taze = is && Date.now() - is.t < 1500;
    if (taze && (is.m === 'geri' || is.m === 'yanal')) return;
    if (taze && is.m === 'menu') { if ((s.gezi || []).length) this.setState({ gezi: [] }); return; }
    // iş kartı kendi geri düğmesine sahiptir; geçici ekranlar yığına girmez
    if (['isKarti', 'giris'].includes(onceki)) return;
    const g = s.gezi || [];
    if (g.length && g[g.length - 1].tab === onceki) return;
    this.setState({ gezi: [...g, { tab: onceki, ad: sayfaAdi(onceki) }].slice(-8) });
  }
  geziGeri() {
    const g = [...(this.state.gezi || [])];
    const e = g.pop();
    if (!e) return;
    this._geziIs = { m: 'geri', t: Date.now() };
    // Listeden geri dönerken Özet'ten gelen süzgeç (ilçe, tür…) temizlenir; liste bir sonraki açılışta tam gelir
    const sifirla = this.state.tab === 'envanter' ? { envF: {}, envQ: '' } : {};
    this.setState({ ...sifirla, tab: e.tab, gezi: g, panel: e.tab === 'harita' ? this.state.panel : 'yok', isKarti: null, faultForm: null });
  }
