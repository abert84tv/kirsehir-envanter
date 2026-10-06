      saltOkur: !!me && !sayfaTam,
      saltOkurNot: 'Bu sayfada yalnızca görüntüleme yetkiniz var — kayıt ekleme, düzenleme ve silme düğmeleri kapalı. Yetki değişikliği için yöneticinize başvurun.',
      ui, role: me ? `${me.name} · ${me.roleLabel}` : '', query: s.query, offline: s.offline,
      isDesktop: s.device === 'desktop' && !!s.session, isPhone: s.device === 'phone' && !!s.session,
      setBase: {
        street: seg(s.mapBase === 'street', () => this.setState({ mapBase: 'street' }, () => this.toMap({ ks: 'setBase', base: 'street' }))),
        sat: seg(s.mapBase === 'sat', () => this.setState({ mapBase: 'sat' }, () => this.toMap({ ks: 'setBase', base: 'sat' }))),
        hyb: seg(s.mapBase === 'hyb', () => this.setState({ mapBase: 'hyb' }, () => this.toMap({ ks: 'setBase', base: 'hyb' })))
      },
      setTheme: {
        light: seg(!dark, () => this.temaSec('light')),
        dark: seg(dark, () => this.temaSec('dark'))
      },
      setNet: {
        on: seg(!s.offline, () => this.setState({ offline: false })),
        off: seg(s.offline, () => this.setState({ offline: true }))
      },
      setNav: {
        on: seg(s.navMode, () => this.setState({ navMode: true }, () => this.toMap({ ks: 'navMode', on: true }))),
        off: seg(!s.navMode, () => this.setState({ navMode: false }, () => this.toMap({ ks: 'navMode', on: false })))
      },
      navKapali: !s.navMode,
      ikonlar: {
        gps: this.ikon('gps', 18), gpsBuyuk: this.ikon('gps', 26),
        pin: this.ikon('pin', 16), pinBuyuk: this.ikon('pin', 22),
        tema: this.ikon(dark ? 'gunes' : 'ay', 17),
        indir: this.ikon('indir', 15), indirKucuk: this.ikon('indir', 13),
        cop: this.ikon('cop', 15), copKucuk: this.ikon('cop', 13),
        sol: this.ikon('sol', 24), sag: this.ikon('sag', 24),
        kapat: this.ikon('kapat', 16), kapatBuyuk: this.ikon('kapat', 20),
        uyari: this.ikon('uyari', 20), buyut: this.ikon('buyut', 15),
        kalem: this.ikon('kalem', 14), kalemOrta: this.ikon('kalem', 16), uyariKucuk: this.ikon('uyari', 16), kamera: this.ikon('kamera', 16),
        yenile: this.ikon('yenile', 14),
        cikis: this.ikon('cikis', 14), cikisBuyuk: this.ikon('cikis', 16),
        ariza: this.ikon('ariza', 20), arizaBuyuk: this.ikon('ariza', 24),
        donustur: this.ikon('donustur', 18)
      },