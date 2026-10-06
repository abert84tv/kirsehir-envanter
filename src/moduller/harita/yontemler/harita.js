  mapWin() {
    const f = document.querySelector('iframe[title^="Kırşehir haritası"]');
    return f && f.contentWindow;
  }
  pushMap() {
    try { localStorage.setItem('ks-suzgec', JSON.stringify(this.state.filter)); } catch (e) { /* depolama kapalı */ }
    const pw = this.profilWin();
    if (pw) { try {
      pw.postMessage({ ks: 'filter', filter: this.state.filter }, '*');
      pw.postMessage({ ks: 'setBase', base: this.state.mapBase }, '*');
      pw.postMessage({ ks: 'hatKatman', on: this.state.hatKatman !== false }, '*');
    } catch (e) { /* çerçeve yok */ } }
    const w = this.mapWin(); if (!w) return;
    w.postMessage({ ks: 'hatKatman', on: this.state.hatKatman !== false }, '*');
    w.postMessage({ ks: 'theme', dark: this.state.theme === 'dark' }, '*');
    w.postMessage({ ks: 'filter', filter: this.state.filter }, '*');
    w.postMessage({ ks: 'setBase', base: this.state.mapBase }, '*');
    w.postMessage({ ks: 'navMode', on: this.state.navMode }, '*');
    setTimeout(() => this.hatlariYolla(), 60);
    // harita çerçevesi yenilenirse kendi listesine döner — kayıtları geri yolla
    if (this.state.sunucu && this.state.assets.length) {
      w.postMessage({ ks: 'assets', assets: this.state.assets, faults: this.state.faults }, '*');
    }
  }
  // Harita iletileri hem Envanter haritasına hem Hat Kesiti haritasına gider: ikisi aynı katmanları gösterir
  toMap(msg) {
    const w = this.mapWin(); if (w) w.postMessage(msg, '*');
    if (['assets', 'hatlar', 'hatKatman', 'filter', 'setBase', 'theme'].includes(msg && msg.ks)) {
      const p = this.profilWin(); if (p) { try { p.postMessage(msg, '*'); } catch (e) { /* çerçeve yok */ } }
    }
  }

  // Köy adı girilmemiş tesis için koordinata en yakın köy (4 km içinde).
  // Kuyuların çoğunda köy alanı boş: kod tek başına hangi tesis olduğunu
  // söylemiyordu. Yalnız gösterimde kullanılır, kayda yazılmaz; raporlar
  // yer() ile girilmiş köye göre gruplamaya devam eder.
  yakinKoy(a) {
    if (!a || !isFinite(a.lat) || !isFinite(a.lon) || !this._yer) return null;
    const anahtar = a.lat.toFixed(5) + ',' + a.lon.toFixed(5);
    this._yakinKoyOb = this._yakinKoyOb || {};
    if (anahtar in this._yakinKoyOb) return this._yakinKoyOb[anahtar];
    let en = null, ed = Infinity;
    for (const r of this._yer) {
      if (r[3] !== 'YKOY' && r[3] !== 'BCK') continue;
      const d = this.mesafeM({ lat: r[1], lon: r[2] }, a);
      if (d < ed) { ed = d; en = r; }
    }
    // Bucak merkezleri listede "Akçakent_Mrkbucak" gibi yazılı
    const ad = en ? String(en[0]).replace(/_?Mrk ?(bucak|köy)$/i, ' merkez').replace(/_/g, ' ').trim() : '';
    return (this._yakinKoyOb[anahtar] = en && ed < 4000 ? { ad, m: ed } : null);
  }
  // Ekranda gösterilecek yer: girilmiş köy, yoksa "≈ en yakın köy", yoksa ilçe
  yerGoster(a) {
    if (!a) return '';
    if (a.village) return a.village + ' · ' + a.district;
    const k = this.yakinKoy(a);
    return k ? '≈ ' + k.ad + ' · ' + a.district : a.district + ' (köy girilmedi)';
  }
  // Koordinata en yakın kayıtlı tesisin ilçesi; kayıt yoksa ilçe merkezi
  enYakinIlce(lat, lon) {
    let best = '', bd = Infinity;
    (this.state.assets || []).forEach(a => {
      if (!a || a.lat == null || !a.district) return;
      const d = this.mesafeM(a, { lat, lon });
      if (d < bd) { bd = d; best = a.district; }
    });
    if (best && bd < 15000) return best;
    const m = this.state.data;
    (m && m.DISTRICTS || []).forEach(d => {
      const dd = this.mesafeM(d, { lat, lon });
      if (dd < bd) { bd = dd; best = d.name; }
    });
    return best;
  }
  yolTarifiVer(a) {
    if (!a) return false;
    if (!this.state.navMode) {
      this.duyur('Yol tarifi modu kapalı — Ayarlar > Harita ve görünüm bölümünden açtığınızda güzergâh çizilir.', 7000);
      return false;
    }
    this.toMap({ ks: 'routeTo', id: a.id, code: a.code, village: a.village, lat: a.lat, lon: a.lon });
    // telefonda kayıt sayfası haritanın üstünde duruyor; güzergâh görünsün diye kapatılır
    this.setState({ tab: 'harita', panel: this.state.device === 'phone' ? 'yok' : this.state.panel });
    return true;
  }
  flyTo(lat, lon, zoom) {
    clearTimeout(this._f);
    this.setState({ center: { lat, lon }, zoom: zoom || 13, fly: { lat, lon }, tab: 'harita' });
    const w = this.mapWin();
    if (w) w.postMessage({ ks: 'fly', lat, lon, zoom: zoom || 13 }, '*');
    this._f = setTimeout(() => this.setState({ fly: null }), 2200);
  }