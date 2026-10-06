  tl(n) { return (Math.round(n) || 0).toLocaleString('tr-TR') + ' ₺'; }
  async fetchJson(url, opts, ms) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), ms || 7000);
    try {
      const r = await fetch(url, { ...(opts || {}), signal: ac.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(to); }
  }
  distKm(a) {
    const R = 6371, t = Math.PI / 180;
    const dLat = (a.lat - STD_LOC.lat) * t, dLon = (a.lon - STD_LOC.lon) * t;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(STD_LOC.lat * t) * Math.cos(a.lat * t) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  // Medya kaynağı şablon deliğiyle verilemez: tarayıcı hole çözülmeden
  // literal metni indirmeye çalışır. Bu yüzden eleman burada kuruluyor.
  imgEl(url, alt) {
    return React.createElement('img', {
      src: url, alt: alt || '', loading: 'lazy',
      style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
    });
  }
  // Fotoğrafı cihaza indir: telefonda galeriye, bilgisayarda İndirilenler'e
  async medyaIndir(url, ad) {
    try {
      const c = await fetch(url, { mode: 'cors' });
      if (!c.ok) throw new Error('yok');
      const blob = await c.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = ad;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      this.say(`${ad} cihaza indirildi.`);
    } catch (e) {
      // Bazı tarayıcılar indirmeyi engeller; dosyayı yeni sekmede açıp
      // kullanıcının kendi kaydetmesine bırakıyoruz
      window.open(url, '_blank', 'noopener');
      this.say('Fotoğraf yeni sekmede açıldı — üzerine basılı tutup “Görseli kaydet” ile cihazınıza alabilirsiniz.', true);
      setTimeout(() => this.setState({ toast: null }), 8000);
    }
  }
  audioEl(url, yuksek) {
    return React.createElement('audio', {
      src: url, controls: true, preload: 'metadata',
      style: { width: '100%', height: yuksek ? 40 : 34, display: 'block' }
    });
  }
  mesafeM(a, b) {
    return Math.hypot((a.lon - b.lon) * Math.cos(a.lat * Math.PI / 180) * 111320, (a.lat - b.lat) * 110540);
  }
  // Kısa bildirim. Ayrı bir kutu yok — hepsi aynı sağ üst kartta çıkar.
  say(text, keep) {
    this.duyur(text, keep ? 9000 : 3800, 'bilgi');
  }
  // Göz yormayan bildirim: ekranın üstünde çıkar, süresi dolunca kendiliğinden kalkar
  duyur(text, ms, tur, git) {
    clearTimeout(this._d);
    // Başarı/bilgi bildirimlerinde yalnız ilk cümle (uzun açıklamalar "?" ile
    // yardım açıkken görünür); hata ve uyarılar tam kalır
    if (!this.state.yardim && (!tur || tur === 'iyi' || tur === 'bilgi')) {
      const s = String(text || ''), i = s.search(/[.!?…]\s/);
      if (i >= 12) text = s.slice(0, i + 1);
    }
    this.setState({ duyuru: { text, tur: tur || 'bilgi', git: typeof git === 'function' ? git : null } });
    this._d = setTimeout(() => this.setState({ duyuru: null }), ms || 5000);
  }
  dosyaIndir(ad, icerik, tur) {
    const blob = new Blob([icerik], { type: tur });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = ad;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  // Lucide çizgi ikonları
  ikon(ad, boyut) {
    const P = {
      gps: ['M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
      pin: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', 'M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4'],
      gunes: ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
      ay: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9'],
      indir: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
      cop: ['M3 6h18', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6'],
      sol: ['m15 18-6-6 6-6'],
      sag: ['m9 18 6-6-6-6'],
      kapat: ['M18 6 6 18', 'm6 6 12 12'],
      uyari: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
      buyut: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
      kalem: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z'],
      donustur: ['M8 3 4 7l4 4', 'M4 7h16', 'm16 21 4-4-4-4', 'M20 17H4'],
      yenile: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
      cikis: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
      ariza: ['M7 18v-6a5 5 0 0 1 10 0v6', 'M5 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1a1 1 0 0 0 1 1', 'M12 2v1', 'M2 12h1', 'M21 12h1', 'M5.6 4.6 6.3 5.3', 'M18.4 4.6l-.7.7'],
      kamera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7'],
      // Sol menü sayfaları
      isler:['M13 2 4 14h6l-1 8 9-12h-6z'],
      kaynaklar: ['M3 7l9-4 9 4-9 4-9-4z', 'M3 7v10l9 4 9-4V7', 'M12 11v10'],
      envanter: ['M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z', 'M12 6.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8'],
      kesit: ['M3 17l5-6 4 3 4-7 5 6', 'M3 21h18'],
      ozet: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
      ayarlar: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', 'M12 2v3', 'M12 19v3', 'M4.2 4.2l2.1 2.1', 'M17.7 17.7l2.1 2.1', 'M2 12h3', 'M19 12h3', 'M4.2 19.8l2.1-2.1', 'M17.7 6.3l2.1-2.1']
    };
    const b = boyut || 16;
    return React.createElement('svg', {
      width: b, height: b, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      style: { display: 'block', flex: 'none' }, 'aria-hidden': true
    }, (P[ad] || []).map((p, i) => React.createElement('path', { key: i, d: p })));
  }
  th() {
    const dark = this.state.theme === 'dark';
    return dark ? {
      bg: '#121214', surf: '#1c1c1e', surf2: '#2a2a2d', fg: '#f5f5f7',
      mut: 'rgba(235,235,245,.62)', rule: 'rgba(255,255,255,.13)',
      acc: '#0a84ff', sel: '#2c2c2e', pend: '#3a2a10',
      ph1: '#2c2c2e', ph2: '#3a3a3c', mapSat: '.5', mapBri: '.6', themeMark: '☾', dark: true
    } : {
      bg: 'var(--color-bg)', surf: '#ffffff', surf2: 'var(--color-neutral-200)', fg: 'var(--color-text)',
      mut: 'var(--color-neutral-600)', rule: 'var(--color-divider)',
      acc: 'var(--color-accent)', sel: 'var(--color-accent-100)', pend: 'var(--color-bekle-100)',
      ph1: '#e4e4e9', ph2: '#d5d5da', mapSat: '.78', mapBri: '1', themeMark: '☀', dark: false
    };
  }

  proj(lat, lon) {
    const z = this.state.zoom, c = this.state.center || { lat: 39.16, lon: 34.12 };
    const k = Math.pow(1.7, z - 11);
    return { x: 50 + ((lon - c.lon) / ((BBOX.e - BBOX.w) / k)) * 100, y: 50 - ((lat - c.lat) / ((BBOX.n - BBOX.s) / k)) * 100 };
  }