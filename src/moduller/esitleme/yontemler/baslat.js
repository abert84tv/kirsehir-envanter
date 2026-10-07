  baslatBaglanti() {
    // Son bilinen saat farkı: çevrimdışı açılışta da doğru damga üretilsin
    this._saatFarki = (() => {
      const v = parseInt(localStorage.getItem('ks-saat-farki') || '0', 10);
      return isNaN(v) ? 0 : v;
    })();
    // Cihaz deposu (IndexedDB) ve çevrimdışı çalışma için servis çalışanı
    this._depoYuk = import('./cihaz-depo.js').then(d => {
      this._depo = d; d.kaliciIste(); this.bekleyenEkYenile(); return d;
    }).catch(() => null);
    // Sunucudan son alınan veride gönderilmemiş tesis değişikliği varsa veriYenile onu ezmesin
    this._anlikYuk = this._depoYuk.then(d => d ? d.anlikOku('anlik') : null).then(an => {
      this._anlikBekleyen = an && an.v ? (an.v.assets || []).filter(a => a && a.dbId != null && a.sync === 'pending') : [];
    }).catch(() => { this._anlikBekleyen = []; });
    try {
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('/sw.js').catch(() => {});
    } catch (e) { /* desteklenmiyor */ }
    this._sbYuk = import('./supabase-baglanti.js').then(M => { this._sb = M; this.setState({ sbHazir: true }); return M; });
    this._sbYuk.catch(() => { /* bağlantı dosyası yüklenemedi — program cihazdaki kopyayla çalışır */ });
    // Kayıtlı oturum anahtarı varsa sunucuda doğrulanır ve giriş ekranı hiç
    // gösterilmeden doğrudan içeri girilir — "Beni hatırla" işaretli her
    // girişte token zaten yazılıyor (bkz. supabase-baglanti.js giris()),
    // eksik olan yalnızca açılışta bunu kullanmaktı.
    (async () => {
      try {
        const M = await this._sbYuk;
        if (M) await this.anahtarlaGir(M);
      } catch (e) { /* token geçersiz ya da bağlantı yok — giriş ekranı gösterilir */ }
      this.setState({ oturumKontrol: false });
    })();
  }
  baslatAg() {
    // Bağlantı gelince çevrimdışı kuyruk kendiliğinden boşalır; dakikada bir de denenir
    // Bağlantı kendiliğinden izlenir: kopunca "çevrimdışı"na geçer, gelince bekleyen
    // her şey (tesis, not, arıza, ambar, modül, fotoğraf) sırayla gönderilir. Üst
    // şeritten elle çevrimdışına alınmışsa kendiliğinden çıkılmaz.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) this.setState({ offline: true });
    this._agGitti = () => {
      if (this.state.offline) return;
      this.setState({ offline: true });
      this.duyur('İnternet kesildi — çalışmaya devam edin, kayıtlar telefonda saklanıyor.', 5000, 'bilgi');
    };
    this._agGeldi = () => {
      if (this._elleCevrimdisi) return;
      if (this.state.offline) { this.setState({ offline: false }); this.duyur('İnternet geldi — bekleyen kayıtlar gönderiliyor.', 4500, 'iyi'); }
      setTimeout(() => this.senkron(true), 1500);
    };
    window.addEventListener('online', this._agGeldi);
    window.addEventListener('offline', this._agGitti);
    this._gorunur = () => { if (!document.hidden) this.senkron(true); };
    document.addEventListener('visibilitychange', this._gorunur);
    this._kuyrukSaat = setInterval(() => { this.senkron(true); this.planliKontrol(); this.aracBelgeUyari(); this.isEmriTamamla(); this.konumGonderTik(); if (['isPanosu', 'isKarti'].includes(this.state.tab)) this.konumYenile(); }, 60000);
  }
  baslatPeriyodik() {
    setTimeout(() => this.aracBelgeUyari(), 9000);
    // Başka kullanıcının yaptığı değişiklik (silme dahil) bu cihazda otomatik
    // görünsün diye — sessiz, yalnızca oturum açıkken. Düzenleme formu açıkken
    // veriYenile ekranı altından değiştirmesin diye o an atlanır.
    this._veriSaat = setInterval(() => {
      if (this.state.session && !this.state.scenario) this.veriYenile(true);
      if (this.state.session && this.state.tab === 'telemetri') this.telemetriYenile(true);
    }, 30000);
  }