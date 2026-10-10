      saveNewAsset: this._yeniKaydet = () => {
        const n = this.state.newAsset;
        const naNot = (n.note || '').trim();
        if (!n.village) return this.say('Köy / yerleşim seçin.');
        if (n.lat == null || n.lon == null || !isFinite(n.lat) || !isFinite(n.lon)) return this.say('Konumu alın — GİT düğmesi.');
        const yilHam = String(n.year || '').trim();
        const yil = parseInt(yilHam, 10);
        if (yilHam && !(yil >= 1900 && yil <= new Date().getFullYear() + 1)) return this.say('Yapım yılı geçersiz — bilinmiyorsa boş bırakın.');
        // Ekleme yetkisi yok ama “tesis önerme” yetkisi var: kayıt açılmaz, mühendis ve müdür onayına öneri gider
        if (!can('create') && can('tesisOner')) return this.tesisEkleOner(n);
        const dosyalar = this._naFiles || [];
        this._naFiles = [];
        const sunucuVar = !!(this._sb && this._sb.tokenOku() && !s.offline);
        const asset = {
          id: 'na' + Date.now(), type: n.type, village: n.village, district: n.district,
          lat: n.lat, lon: n.lon, coordApprox: !n.coordAcc,
          code: this.siradakiKod(n.type),
          status: n.status === 'pasif' ? 'pasif' : 'aktif', sync: sunucuVar ? 'synced' : 'pending', photos: 0,
          year: yilHam ? yil : '',
          d: {}
        };
        // Elle açılan kayıt damgası: yalnızca bu damgayı taşıyanlar
        // çevrimdışı kuyruktan sunucuya gönderilir.
        asset.elle = true;
        const denetle = kod => this.denetimYaz('kayit', 'Yeni tesis kaydı açıldı',
          TYPES[asset.type].kind + ' · ' + asset.village + ' · ' + asset.district, kod);
        if (this._sb && this._sb.tokenOku() && !s.offline) {
          if (!this.yazabilir(asset)) return this.kilitUyar(asset);
          const eskiForm = { newAsset: n, naSz: s.naSz, scenario: s.scenario, tab: s.tab };
          this.setState({ scenario: null, newAsset: null, naSz: null, tab: 'harita' });
          this._sb.tesisKaydet(asset).then(async r => {
            if (!r.ok) {
              // Form ve fotoğraflar kaybolmasın: kullanıcı düzeltip yeniden kaydedebilir
              this._naFiles = dosyalar;
              this.setState({ ...eskiForm, naSz: eskiForm.naSz ? { ...eskiForm.naSz, adim: 3, haritada: false } : null });
              this.say((r.cevrimdisi
                ? 'Bağlantı kesildi — kayıt gönderilemedi. Çevrimdışı kipe geçip yeniden deneyin, kayıt cihazda beklesin.'
                : r.err) + ' Form açık kaldı, bilgileriniz kaybolmadı.', true);
              setTimeout(() => this.setState({ toast: null }), 12000);
              return;
            }
            await this.veriYenile(true);
            const yeni = this.state.assets.find(x => x.dbId === r.data);
            // Kod çakışırsa sunucu sıradaki boş kodu verir; mesaj ve iz gerçek kodu yazar
            asset.code = yeni ? yeni.code : asset.code;
            denetle(asset.code);
            if (naNot) {
              if (yeni) this.setState(st => ({ notes: { ...st.notes, [yeni.id]: naNot } }));
              if (yeni) this.iz(yeni.id, 'Saha notu eklendi', naNot.slice(0, 90));
              this._sb.notEkle(r.data, naNot);
            }
            this.setState({ selected: yeni ? yeni.id : null, panel: yeni ? 'detay' : 'yok', detailTab: 'bilgi' });
            if (yeni && this._bekleyenHat) { this.hatKaydet(yeni.id, this._bekleyenHat); this._bekleyenHat = null; }
            if (yeni) this.flyTo(yeni.lat, yeni.lon, 15);
            this.say(`${asset.code} veritabanına yazıldı — bütün ekiplerin ekranında görünüyor. Detay alanlarını şimdi doldurabilirsiniz.`, true);
            setTimeout(() => this.setState({ toast: null }), 8000);
            if (yeni && dosyalar.length) await this.fotoGonder(yeni, dosyalar);
            this._naTemizle();
          });
          return;
        }
        this.setState({
          assets: [asset, ...s.assets], scenario: null, newAsset: null, naSz: null,
          notes: naNot ? { ...s.notes, [asset.id]: naNot } : s.notes,
          selected: asset.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita',
          queue: [{ id: 'q' + Date.now(), title: asset.code + ' · yeni tesis', meta: `${asset.village} · ${TYPES[asset.type].kind}`, state: 'pending', dotPend: true }, ...s.queue]
        });
        denetle(asset.code);
        if (this._bekleyenHat) { this.hatKaydet(asset.id, this._bekleyenHat); this._bekleyenHat = null; }
        this.yerelTesisYaz([asset, ...this.yerelTesisOku().filter(x => x.code !== asset.code)]);
        this.flyTo(asset.lat, asset.lon, 15);
        if (naNot) this.iz(asset.id, 'Saha notu eklendi', naNot.slice(0, 90));
        this._naTemizle();
        this.say((s.offline ? 'Yeni tesis cihaza kaydedildi — bağlantı gelince kendiliğinden yüklenir.' : 'Yeni tesis cihaza kaydedildi — ortak veritabanı oturumu yok, bağlanınca gönderilir.')
          + (dosyalar.length ? ' Çektiğiniz ' + dosyalar.length + ' fotoğraf yüklenemedi; bağlantı gelince kayıt kartının Foto sekmesinden ekleyin.' : ''), !!dosyalar.length);
      },