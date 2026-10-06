  profilWin() {
    const f = document.querySelector('iframe[title^="Mesafe ve yol profili"]');
    return f && f.contentWindow;
  }
  // Profil haritasında gösterilecek kayıtlar — yalnız konumu olanlar
  profilAssets() {
    return (this.state.assets || [])
      .filter(a => a && isFinite(a.lat) && isFinite(a.lon))
      .map(a => ({ id: a.id, code: a.code, type: a.type, lat: a.lat, lon: a.lon, status: a.status,
        pend: a.sync === 'pending', ariza: (this.state.faults || []).some(f => f.assetId === a.id && !KAPALI_DURUM.includes(f.status)) }));
  }
  // Profil ekranında bulunan nokta ve güzergâhı asıl kayda taşır.
  // Nokta seçiliyse yeni tesis formu koordinatı dolu açılır; hat seçiliyse
  // kayıt yazıldıktan sonra o kaydın hattı olarak bağlanır.
  profilAktar(d) {
    const HAT_AD = { terfi: 'Terfi hattı', isale: 'İsale hattı', sebeke: 'Şebeke hattı', enerji: 'Enerji hattı' };
    const hat = d.hat && Array.isArray(d.hat.noktalar) && d.hat.noktalar.length > 1 ? d.hat : null;
    const nokta = d.nokta && isFinite(d.nokta.lat) && isFinite(d.nokta.lon) ? d.nokta : null;
    if (!nokta && !hat) return this.say('Aktarılacak nokta ya da güzergâh gelmedi.');
    const hatKaydi = hat ? [{
      tur: hat.tur,
      noktalar: hat.noktalar,
      aciklama: (HAT_AD[hat.tur] || 'Hat') + ' · profil ekranında ölçüldü'
        + (d.km && d.km !== '—' ? ' · ' + d.km : '')
    }] : null;

    if (nokta) {
      const m = this.state.data;
      this._bekleyenHat = hatKaydi;
      this.setState({
        tab: 'islem', scenario: 'yeni',
        newAsset: {
          type: 'kuyu', district: (m && m.DISTRICTS[0].name) || '', village: '',
          year: String(new Date().getFullYear()), note: '', photos: 0,
          lat: nokta.lat, lon: nokta.lon
        }
      }, () => this.duyur('Profil noktası ' + nokta.sira + ' yeni kayıt formuna taşındı — koordinat hazır, köy ve tür seçip kaydedin.'
        + (hatKaydi ? ' Güzergâh, kayıt yazıldıktan sonra hattına eklenecek.' : ''), 7000, 'iyi',
        () => this.setState({ tab: 'islem' })));
      return;
    }

    // Yalnız hat: kayda bağlanma — çizimde ilk/son uç olarak seçilen tesis; yoksa ana programda seçili kayıt
    const bag = d.hat.bag || {};
    const sec = (this.state.assets || []).find(a => a.id === d.hat.hedefId)
      || (this.state.assets || []).find(a => a.id === this.state.selected);
    if (!sec) return this.say('Güzergâh bir kayda bağlanmadı. Çizerken ilk ya da son noktaya bir kuyu/depo işaretine dokunun, ya da önce bir kayıt seçin.');
    const uc = bag.ilk && bag.son && bag.ilk.kod !== bag.son.kod ? bag.ilk.kod + ' → ' + bag.son.kod : (bag.ilk ? bag.ilk.kod + ' ucundan' : bag.son ? bag.son.kod + ' ucuna' : '');
    const kayit = [{ ...hatKaydi[0], aciklama: (HAT_AD[hat.tur] || 'Hat') + (uc ? ' · ' + uc : ' · profil ekranında çizildi') + (d.km && d.km !== '—' ? ' · ' + d.km : '') }];
    this.hatKaydet(sec.id, [...((this.state.hatlar || {})[sec.id] || []), ...kayit]);
    this.setState({ tab: 'harita' }, () => this.duyur(sec.code + ' kaydına ' + (HAT_AD[hat.tur] || 'hat')
      + ' eklendi' + (uc ? ' (' + uc + ')' : '') + ' — haritada çizgi olarak görünür.', 6500, 'iyi',
      () => this.setState({ tab: 'harita', selected: sec.id, panel: 'detay', detailTab: 'hat' })));
  }
  profilTesis() {
    const w = this.profilWin();
    if (!w) return;
    try {
      w.postMessage({ ks: 'theme', dark: this.state.theme === 'dark' }, '*');
      const kod = {}; (this.state.assets || []).forEach(a => { kod[a.id] = a.code; });
      const hatlar = [];
      const tablo = this.state.hatlar || {};
      for (const id in tablo) for (const x of (tablo[id] || [])) if (x && (x.noktalar || []).length) hatlar.push({ tur: x.tur, noktalar: x.noktalar, kod: kod[id] || '' });
      w.postMessage({ ks: 'profil', assets: this.profilAssets(), hatlar }, '*');
      w.postMessage({ ks: 'assets', assets: this.state.assets, faults: this.state.faults }, '*');
      w.postMessage({ ks: 'arac', acik: !!this.state.telAracAcik }, '*');
      w.postMessage({ ks: 'filter', filter: this.state.filter }, '*');
      w.postMessage({ ks: 'setBase', base: this.state.mapBase }, '*');
      w.postMessage({ ks: 'hatKatman', on: this.state.hatKatman !== false }, '*');
    } catch (e) { /* çerçeve hazır değil */ }
  }