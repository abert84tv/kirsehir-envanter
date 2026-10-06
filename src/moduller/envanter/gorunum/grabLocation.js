      grabLocation: () => {
        // Köy/ilçe merkezi yalnızca GPS hiç alınamazsa kullanılan, dürüstçe
        // "yaklaşık" işaretlenen bir yedek — rastgele sapma eklenmez, çünkü
        // rastgelelik daha sonra düzeltilemez ve konumu daha "gerçek" gösterip
        // yanıltır.
        const yaklasikMerkez = () => {
          const na = this.state.newAsset;
          const d = m && m.DISTRICTS.find(x => x.name === na.district);
          const elle = d ? this.ekKoyKoord(d.id, na.village) : null;
          if (elle) return { lat: elle.lat, lon: elle.lon };
          const yer = na.village && this._yer ? this._yer.find(r => nkey(r[0]) === nkey(na.village)) : null;
          if (yer) return { lat: yer[1], lon: yer[2] };
          return { lat: d ? d.lat : STD_LOC.lat, lon: d ? d.lon : STD_LOC.lon };
        };
        if (!navigator.geolocation) {
          const { lat, lon } = yaklasikMerkez();
          this.setState({ newAsset: { ...this.state.newAsset, lat, lon, coordAcc: null } });
          this.toMap({ ks: 'go', lat, lon, label: 'Yeni tesis konumu · yaklaşık (cihazda GPS yok)' });
          return this.say('Bu cihazda GPS yok — köy/ilçe merkezi yaklaşık konum olarak kondu, sahada gerçek GPS ile düzeltin.', true);
        }
        this.say('Konum aranıyor…');
        navigator.geolocation.getCurrentPosition(
          p => {
            const lat = p.coords.latitude, lon = p.coords.longitude, acc = Math.round(p.coords.accuracy);
            this.setState({ newAsset: { ...this.state.newAsset, lat, lon, coordAcc: acc } });
            this.toMap({ ks: 'go', lat, lon, label: 'Yeni tesis konumu · cihaz GPS ±' + acc + ' m' });
            this.say('Konum alındı · cihaz GPS ±' + acc + ' m — haritada işaretlendi.');
          },
          err => {
            const { lat, lon } = yaklasikMerkez();
            this.setState({ newAsset: { ...this.state.newAsset, lat, lon, coordAcc: null } });
            this.toMap({ ks: 'go', lat, lon, label: 'Yeni tesis konumu · yaklaşık (GPS alınamadı)' });
            this.say('Konum alınamadı (' + (err.code === 1 ? 'izin verilmedi' : 'zaman aşımı ya da hata')
              + ') — köy/ilçe merkezi yaklaşık kondu, sahada gerçek GPS ile düzeltin.', true);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      },