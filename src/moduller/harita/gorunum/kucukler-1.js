      goToMyLocation: () => {
        // Harita cihaz GPS'ini ister (harita.html → konumBul); gerçek sonuç
        // {ks:'konum'} mesajıyla asenkron gelir ve gerçek doğrulukla bildirilir
        // (bkz. componentDidMount'taki mesaj dinleyicisi). Burada sabit bir
        // "±4 m" iddiası göstermek yanlıştı — sonuç gelene kadar bekletilir.
        this.toMap({ ks: 'go' });
        this.setState({ tab: 'harita' });
        this.say('Konumunuz aranıyor…');
      },
      routeToSel: () => {
        if (!sel) return;
        if (this.yolTarifiVer(sel)) this.say(`${sel.code} için karayolu güzergâhı hesaplanıyor…`);
      },
      // Kayıt detayındaki GİT kaydın kendi noktasına götürür; ana haritadaki GİT konumunuza
      goToSel: () => {
        if (!sel) return;
        this.flyTo(sel.lat, sel.lon, 17);
        this.setState({ tab: 'harita', panel: s.device === 'phone' ? 'yok' : s.panel });
        this.say(`${sel.code} · ${sel.lat.toFixed(5)}, ${sel.lon.toFixed(5)}`);
      },
      hatCiz: {
        on: !!(s.hatTam && sel),
        kod: sel ? sel.code : '',
        bilgi: sel ? `${this.yer(sel)} · çizdiğiniz hat kapatınca kayda işlenir ve ana haritada görünür` : '',
        kapat: () => this.setState({ hatTam: false }, () => { this.hatlariYolla(); this.pushMap(); })
      },