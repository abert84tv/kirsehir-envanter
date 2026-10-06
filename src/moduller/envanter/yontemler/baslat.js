  baslatVeri() {
    import('./koyler.js').then(k => { this._yer = k.YERLESIM; this.forceUpdate(); }).catch(() => {});
    Promise.all([import('./kirsehir-data.js'), import('./envanter.js')]).then(([m, env]) => {
      const { assets, faults } = env.buildAssets(m);
      // Cihazda bekleyen (sunucuya yazılmamış) kayıtlar listenin başına döner
      const yerel = this.yerelTesisOku();
      const kod = new Set(assets.map(x => String(x.code || '').toUpperCase()));
      const bekleyen = yerel.filter(x => !kod.has(String(x.code || '').toUpperCase()));
      // Çevrimdışı açılışta cihazdaki son sunucu kopyası zaten yüklendi: örnek veriyle ezilmez
      this.setState(this._anlikUygulandi
        ? { data: m, center: { lat: 39.16, lon: 34.12 } }
        : { data: m, assets: [...bekleyen, ...assets], faults, center: { lat: 39.16, lon: 34.12 } },
        () => { this.fotoNiyetGeriYukle(); this.kodDenetle(); this.ekKoyYenile(); });
    });
  }