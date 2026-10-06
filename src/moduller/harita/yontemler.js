  mapWin() {
    const f = document.querySelector('iframe[title^="Kırşehir haritası"]');
    return f && f.contentWindow;
  }
  hatWin() {
    const f = document.querySelector('iframe[title^="Hat güzergâhları"]');
    return f && f.contentWindow;
  }
  // Hat çizim sayfasına seçili kaydı ve kayıtlı güzergâhları gönderir
  hatGonder() {
    const w = this.hatWin();
    const a = this.state.assets.find(x => x.id === this.state.selected);
    if (!w || !a) return;
    try {
      w.postMessage({ ks: 'theme', dark: this.state.theme === 'dark' }, '*');
      w.postMessage({
        ks: 'hat',
        tesis: { id: a.id, kod: a.code, lat: a.lat, lon: a.lon },
        hatlar: (this.state.hatlar || {})[a.id] || [],
        yazma: this.yazabilir(a)
      }, '*');
    } catch (e) { /* çerçeve henüz yüklenmedi */ }
  }
  hatKaydet(assetId, liste) {
    const a0 = (this.state.assets || []).find(x => x.id === assetId);
    this.denetimYaz('kayit', (liste && liste.length ? 'Hat kaydedildi' : 'Hat silindi'),
      (liste || []).length + ' güzergâh', a0 ? a0.code : assetId);
    const tablo = { ...(this.state.hatlar || {}) };
    if (liste && liste.length) tablo[assetId] = liste; else delete tablo[assetId];
    try { localStorage.setItem('ks-hatlar', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    this.setState({ hatlar: tablo }, () => this.hatlariYolla());
    // Sunucuya da yazılır: hat tesisin kendisiyle birlikte bütün cihazlarda görünür
    const M = this._sb;
    const a = (this.state.assets || []).find(x => x.id === assetId);
    if (!M || !M.hatKaydet || !M.tokenOku() || !a || !a.dbId || this.state.offline) { if (a && a.dbId) this.hatBekleyenEkle(assetId); return; }
    M.hatKaydet(a.dbId, (liste || []).map(x => ({
      tur: x.tur, noktalar: x.noktalar,
      // Boru çapı ve malzemesi açıklama alanına "Ø110 mm · PE100 · not" biçiminde yazılır
      aciklama: [x.cap ? 'Ø' + x.cap + ' mm' : '', x.malzeme || '', x.aciklama || ''].filter(Boolean).join(' · ') || null
    }))).then(r => {
      if (r.ok) { this.hatBekleyenCikar(assetId); return; }
      if (r.cevrimdisi) this.hatBekleyenEkle(assetId);
      this.duyur(r.cevrimdisi
        ? 'Hat cihaza kaydedildi — bağlantı gelince sunucuya yazılır.'
        : 'Hat sunucuya yazılamadı: ' + r.err, 7000, r.cevrimdisi ? 'bilgi' : 'kotu');
    });
  }
  // Çevrimdışıyken çizilen hatlar bağlantı gelince sunucuya gönderilir
  hatBekleyenOku() { try { const v = JSON.parse(localStorage.getItem('ks-hat-bekleyen') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  hatBekleyenYaz(l) { try { localStorage.setItem('ks-hat-bekleyen', JSON.stringify([...new Set(l)])); } catch (e) { /* depolama kapalı */ } }
  hatBekleyenEkle(id) { this.hatBekleyenYaz([...this.hatBekleyenOku(), id]); }
  hatBekleyenCikar(id) { this.hatBekleyenYaz(this.hatBekleyenOku().filter(x => x !== id)); }
  async hatBekleyenGonder() {
    const M = this._sb;
    if (!M || !M.hatKaydet || !M.tokenOku() || this.state.offline) return;
    for (const id of this.hatBekleyenOku()) {
      const a = (this.state.assets || []).find(x => x.id === id);
      if (!a || !a.dbId) continue;
      const liste = (this.state.hatlar || {})[id] || [];
      const r = await M.hatKaydet(a.dbId, liste.map(x => ({ tur: x.tur, noktalar: x.noktalar,
        aciklama: [x.cap ? 'Ø' + x.cap + ' mm' : '', x.malzeme || '', x.aciklama || ''].filter(Boolean).join(' · ') || null })));
      if (r.ok) this.hatBekleyenCikar(id); else if (r.cevrimdisi) break;
    }
  }
  // Hat güzergâhları sunucudan gelir; sunucuda karşılığı olmayan kayıtların
  // hatları cihaz kopyasında kalır
  async hatYenile() {
    const M = this._sb;
    if (!M || !M.hatListesi || !M.tokenOku()) return;
    let r;
    try { r = await M.hatListesi(); } catch (e) { return; }
    if (!r.ok || !Array.isArray(r.data)) return;
    const kimlik = {};
    (this.state.assets || []).forEach(a => { if (a.dbId != null) kimlik[a.dbId] = a.id; });
    const tablo = {};
    for (const x of r.data) {
      const id = kimlik[x.tesis_id];
      if (!id) continue;
      (tablo[id] = tablo[id] || []).push({
        id: 'h' + x.id, dbId: x.id, tur: x.tur,
        noktalar: (x.noktalar || []).map(p => [+p[0], +p[1]]),
        ...(() => {
          const m = /^Ø(\d+) mm(?: · ([^·]+?))?(?: · (.*))?$/.exec(String(x.aciklama || ''));
          return m ? { cap: +m[1], malzeme: (m[2] || '').trim(), aciklama: m[3] || '' } : { aciklama: x.aciklama || '' };
        })()
      });
    }
    const sunucudakiKayit = new Set((this.state.assets || []).filter(a => a.dbId != null).map(a => a.id));
    const yerel = this.state.hatlar || {};
    for (const k in yerel) if (!sunucudakiKayit.has(k)) tablo[k] = yerel[k];
    // Gönderilmemiş (çevrimdışı çizilmiş) hatlar sunucudaki eski hâliyle ezilmez
    for (const id of this.hatBekleyenOku()) if (yerel[id]) tablo[id] = yerel[id];
    try { localStorage.setItem('ks-hatlar', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    this.setState({ hatlar: tablo }, () => {
      this.hatlariYolla();
      this.toMap({ ks: 'hatKatman', on: this.state.hatKatman !== false });
      if (this.state.detailTab === 'hat' || this.state.hatTam) this.hatGonder();
    });
  }
  // Hatlar ana haritada da görünür: kayıt kodu ve uzunluğu ile
  hatlariYolla() {
    const tablo = this.state.hatlar || {};
    const kod = {};
    (this.state.assets || []).forEach(a => { kod[a.id] = a.code; });
    const duz = [];
    for (const id in tablo) {
      for (const x of (tablo[id] || [])) {
        if (!x || !(x.noktalar || []).length) continue;
        duz.push({ tur: x.tur, noktalar: x.noktalar, kod: kod[id] || '' });
      }
    }
    this.toMap({ ks: 'hatlar', hatlar: duz });
  }
  hatUzunluk(noktalar) {
    const rd = d => d * Math.PI / 180;
    let t = 0;
    for (let i = 1; i < (noktalar || []).length; i++) {
      const a = noktalar[i - 1], b = noktalar[i];
      const dLat = rd(b[0] - a[0]), dLon = rd(b[1] - a[1]);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dLon / 2) ** 2;
      t += 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(x)));
    }
    return t;
  }
  hatMetin(m) { return m >= 1000 ? (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km' : Math.round(m) + ' m'; }
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