  baslatMesajlar() {
    this._msg = e => {
      const d = e.data || {};
      if (d.ks === 'ready') this.pushMap();
      if (d.ks === 'ozetHaritaHazir') { this.ozetHaritaGonder(); return; }
      if (d.ks === 'ozetZemin' && ['street', 'sat', 'hyb'].includes(d.zemin)) { try { localStorage.setItem('ks-ozet-zemin', d.zemin); } catch (e) { /* depolama kapalı */ } this.setState({ ozetZemin: d.zemin }); return; }
      // Özet haritasında bir noktaya basıldı: kaydın kartı haritada açılır
      if (d.ks === 'ozetSec') {
        const a = (this.state.assets || []).find(x => x.id === d.id);
        if (a) { this.flyTo(a.lat, a.lon, 16); this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }); if (a.dbId) this.fotoYenile(a.dbId); }
        return;
      }
      if (d.ks === 'hatKatman') {
        try { localStorage.setItem('ks-hat-katman', d.on ? '1' : '0'); } catch (e) { /* depolama kapalı */ }
        this.setState({ hatKatman: !!d.on });
      }
      if (d.ks === 'coordMode') { this.setState({ picked: null }); return; }
      // Haritadaki arıza noktasına dokunuldu: arıza açılır
      if (d.ks === 'arizaAc') {
        const f = (this.state.faults || []).find(x => x.id === d.id);
        if (f) this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, photos: [], ...f } });
        return;
      }
      if (d.ks === 'konum') { this.setState({ benimKonum: { lat: d.lat, lon: d.lon, t: Date.now() } }); this.say(`Konumunuz alındı — ${d.lat.toFixed(5)}, ${d.lon.toFixed(5)} · cihaz GPS ±${d.acc} m.`); return; }
      if (d.ks === 'konumYok') {
        this.say(d.kod === 1
          ? 'Konum izni verilmemiş. Tarayıcı ayarlarından bu siteye konum iznini açın; sonra GİT düğmesine yeniden basın.'
          : 'Konum alınamadı — açık alana çıkıp yeniden deneyin. Harita şimdilik Kırşehir merkezine getirildi.', true);
        setTimeout(() => this.setState({ toast: null }), 8000);
        return;
      }
      if (d.ks === 'coord') {
        // Sihirbaz "haritadan seç" bekliyorsa çift tıklanan nokta yeni tesisin konumu olur
        const z = this.state.naSz;
        if (z && z.haritada && this.state.newAsset) {
          this.setState(st => ({
            newAsset: { ...st.newAsset, lat: d.lat, lon: d.lon, coordAcc: null, district: this.enYakinIlce(d.lat, d.lon) || st.newAsset.district },
            naSz: { ...st.naSz, haritada: false, onay: false, yol: 'harita' }
          }));
          this.toMap({ ks: 'go', lat: d.lat, lon: d.lon, label: 'Yeni tesis konumu · haritadan seçildi' });
          return;
        }
        this.setState({ picked: { lat: d.lat, lon: d.lon } }); return;
      }
      if (d.ks === 'picked') {
        this.vSave(d.name, d.lat, d.lon, true);
        const p = this.state.pick;
        this.setState({ pick: null, vFix: null });
        this.flyTo(d.lat, d.lon, 15);
        this.toMap({ ks: 'go', lat: d.lat, lon: d.lon, label: `${d.name}${p && p.district ? ' · ' + p.district : ''}` });
        this.say(`${d.name} köyünün konumu kaydedildi (${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}). Bu köy bundan sonra internetsiz de bulunur.`, true);
        setTimeout(() => this.setState({ toast: null }), 6000);
        return;
      }
      if (d.ks === 'select') {
        this.setState({ selected: d.id, detailTab: 'bilgi', panel: 'detay' });
        const a = this.state.assets.find(x => x.id === d.id);
        if (a && a.dbId) this.fotoYenile(a.dbId);
      }
      if (d.ks === 'hatHazir') { this.hatGonder(); return; }
      // Profil sayfası açıldı — mevcut tesisleri gönder ki haritada görünsün
      if (d.ks === 'profilHazir') { this.profilTesis(); return; }
      if (d.ks === 'profilAktar') { this.profilAktar(d); return; }
      if (d.ks === 'hatlar' && Array.isArray(d.hatlar)) {
        const id = d.id || this.state.selected;
        if (id) this.hatKaydet(id, d.hatlar);
        return;
      }
      if (d.ks === 'base') this.setState({ mapBase: d.base });
      if (d.ks === 'route') {
        this.setState({ route: d });
        this.say(`${d.code} · ${d.km} km · ${d.min} dk${d.approx ? ' (kuş uçuşu tahmin)' : ' karayolu'}`);
      }
    };
    addEventListener('message', this._msg);
  }