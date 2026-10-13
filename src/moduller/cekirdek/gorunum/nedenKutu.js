      // Sayfa içi “neden” kutusu (nedenSor ile açılır)
      nedenKutu: (() => {
        const k = s.nedenKutu;
        if (!k) return { var: false, baslik: '', ipucu: '', deger: '', hata: '', hataVar: false, onDeger: () => {}, tamam: () => {}, iptal: () => {} };
        const kapat = () => { this._nedenDevam = null; this.setState({ nedenKutu: null }); };
        return {
          var: true, baslik: k.baslik, ipucu: k.ipucu, deger: k.deger, hata: k.hata, hataVar: !!k.hata,
          onDeger: e => this.setState({ nedenKutu: { ...this.state.nedenKutu, deger: e.target.value, hata: '' } }),
          tamam: () => {
            const m = String((this.state.nedenKutu || {}).deger || '').trim();
            if (k.zorunlu && !m) return this.setState({ nedenKutu: { ...this.state.nedenKutu, hata: 'Bir neden yazın.' } });
            const fn = this._nedenDevam; this._nedenDevam = null;
            this.setState({ nedenKutu: null }, () => { if (fn) fn(m); });
          },
          iptal: kapat
        };
      })(),
