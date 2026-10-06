  yer(a) { return (a.village || 'Köy girilmedi') + ' · ' + a.district; }
  // Bulunan köy koordinatları cihazda kalır — bir kez bulunan köy bir daha sorulmaz
  vCache() {
    if (this._vc) return this._vc;
    try { this._vc = JSON.parse(localStorage.getItem(VKEY) || '{}'); } catch (e) { this._vc = {}; }
    return this._vc;
  }
  vSave(name, lat, lon, manual) {
    const c = this.vCache();
    const old = c[norm(name)];
    // elle işaretlenmiş bir konumun üstüne servis/ortalama değeri yazılmaz
    if (old && old.manual !== false && !manual) return;
    c[norm(name)] = { name, lat: +lat, lon: +lon, manual: manual === undefined ? true : !!manual };
    try { localStorage.setItem(VKEY, JSON.stringify(c)); } catch (e) { /* depolama dolu */ }
    this.forceUpdate();
  }
  vSrc(v) { return v && v.manual === true ? 'sizin işaretlediğiniz konum' : (v && v.manual === false ? 'servisten' : 'kayıtlı konum'); }
  vDelete(key) {
    const c = this.vCache();
    delete c[key];
    try { localStorage.setItem(VKEY, JSON.stringify(c)); } catch (e) { /* yok */ }
    this.forceUpdate();
  }
  // Tek köyün yerini bul: üç ayrı servis sırayla denenir
  // programa gömülü HGM yerleşim listesinden ara — internet gerekmez
  yerBul(name, near) {
    const list = this._yer;
    if (!list) return null;
    const q = norm(name);
    let hits = list.filter(r => norm(r[0]) === q);
    if (!hits.length) hits = list.filter(r => norm(r[0]).indexOf(q) === 0);
    if (!hits.length) return null;
    if (hits.length > 1 && near) {
      hits = hits.slice().sort((a, b) =>
        (Math.abs(a[1] - near.lat) + Math.abs(a[2] - near.lon)) -
        (Math.abs(b[1] - near.lat) + Math.abs(b[2] - near.lon)));
    }
    const h = hits[0];
    return { name: h[0], lat: h[1], lon: h[2], tip: h[3], from: 'HGM yerleşim listesi' };
  }
  async findVillage(name, district, near) {
    const c = this.vCache()[norm(name)];
    if (c) return { ...c, from: 'cihaz belleği' };
    const gomulu = this.yerBul(name, near);
    if (gomulu) { this.vSave(gomulu.name, gomulu.lat, gomulu.lon, false); return gomulu; }
    const inKs = p => p.lat > 38.6 && p.lat < 39.95 && p.lon > 33.2 && p.lon < 34.95;
    const tries = [
      async () => {
        const j = await this.fetchJson(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(name + ' ' + district + ' Kırşehir')}&limit=8&lang=tr`);
        for (const f of (j.features || [])) {
          const p = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
          const nm = norm((f.properties || {}).name || '');
          if (inKs(p) && nm === norm(name)) return { ...p, from: 'Photon' };
        }
        return null;
      },
      async () => {
        const j = await this.fetchJson(
          `https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(name + ', ' + district + ', Kırşehir, Türkiye')}`);
        for (const f of (j || [])) {
          const p = { lat: +f.lat, lon: +f.lon };
          const first = norm(String(f.display_name || '').split(',')[0]);
          if (inKs(p) && first === norm(name)) return { ...p, from: 'Nominatim' };
        }
        return null;
      },
      async () => {
        const nodes = await this.osmNodes();
        const hit = nodes.find(n => norm(n.name) === norm(name)) || nodes.find(n => norm(n.name).includes(norm(name)));
        return hit ? { lat: hit.lat, lon: hit.lon, from: 'Overpass' } : null;
      }
    ];
    for (const t of tries) {
      try { const hit = await t(); if (hit) { this.vSave(name, hit.lat, hit.lon); return hit; } }
      catch (e) { /* sıradaki servisi dene */ }
    }
    return null;
  }
  async osmNodes() {
    if (this._osm) return this._osm;
    if (this._osmReq) return this._osmReq;
    const q = '[out:json][timeout:40];node["place"~"village|hamlet|town|isolated_dwelling"](38.60,33.20,39.95,34.95);out qt;';
    const urls = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.openstreetmap.ru/api/interpreter'];
    this._osmReq = (async () => {
      for (const url of urls) {
        try {
          const j = await this.fetchJson(url, {
            method: 'POST', body: 'data=' + encodeURIComponent(q),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }, 12000);
          const nodes = (j.elements || []).filter(n => n.tags && n.tags.name)
            .map(n => ({ name: n.tags.name, lat: n.lat, lon: n.lon }));
          if (nodes.length) {
            this._osm = nodes;
            this._osmReq = null;
            const c = this.vCache();
            // elle işaretlenmiş veya daha önce kaydedilmiş konumlara dokunulmaz
            for (const n of nodes) {
              const k = norm(n.name);
              if (!c[k] || c[k].manual === false) c[k] = { name: n.name, lat: n.lat, lon: n.lon, manual: false };
            }
            try { localStorage.setItem(VKEY, JSON.stringify(c)); } catch (e) { /* dolu */ }
            return nodes;
          }
        } catch (e) { /* sıradaki sunucu */ }
      }
      this._osmReq = null;
      throw new Error('köy servisi yanıt vermedi');
    })();
    return this._osmReq;
  }
  // köy aramasında ilçe merkezine gitmek yerine gerçek yeri bul
  async gotoVillage(name, d) {
    this.setState({ query: '' });
    // Elle işaretlenmiş konum her şeyin üstündedir — kullanıcının kararı kazanır
    const saved = this.vCache()[norm(name)];
    if (saved) {
      this.flyTo(saved.lat, saved.lon, 15);
      this.toMap({ ks: 'go', lat: saved.lat, lon: saved.lon, label: `${name} · ${d.name}` });
      // Konum daha önce onaylanmış ya da elle işaretlenmişse soru sorulmaz
      this.setState({ vFix: this.vOnayli(name) ? null : {
        name, district: d.name, lat: saved.lat, lon: saved.lon,
        from: this.vSrc(saved)
      } });
      return;
    }
    // gömülü HGM listesi: internet gerekmez, kayıt ortalamasından daha kesindir
    const g = this.yerBul(name, { lat: d.lat, lon: d.lon });
    if (g) {
      this.vSave(g.name, g.lat, g.lon, false);
      this.flyTo(g.lat, g.lon, 15);
      this.toMap({ ks: 'go', lat: g.lat, lon: g.lon, label: `${name} · ${d.name}` });
      this.setState({ vFix: this.vOnayli(name) ? null : { name, district: d.name, from: 'HGM yerleşim listesi', lat: g.lat, lon: g.lon } });
      return;
    }
    const own = this.state.assets.filter(a => a.village === name);
    if (own.length) {
      const lat = own.reduce((t, a) => t + a.lat, 0) / own.length;
      const lon = own.reduce((t, a) => t + a.lon, 0) / own.length;
      this.flyTo(lat, lon, own.length > 1 ? 14 : 15);
      this.setState({ vFix: this.vOnayli(name) ? null : { name, district: d.name, from: `${own.length} kaydın ortası`, lat, lon } });
      return;
    }
    this.setState({ seeking: name });
    this.say(`${name} köyünde kayıt yok — yeri aranıyor…`, true);
    const hit = await this.findVillage(name, d.name);
    this.setState({ seeking: null });
    if (hit) {
      this.flyTo(hit.lat, hit.lon, 15);
      this.toMap({ ks: 'go', lat: hit.lat, lon: hit.lon, label: `${name} · ${d.name}` });
      this.setState({ vFix: this.vOnayli(name) ? null : { name, district: d.name, from: hit.from, lat: hit.lat, lon: hit.lon } });
    } else {
      // haritayı rastgele bir yere GÖTÜRMEYİZ — yanlış yere gitmek, hiç gitmemekten kötüdür
      // İnternete gerek yok: kullanıcı köyü haritada bir kez işaretler, konum kalıcı olarak saklanır
      this.setState({ pick: { name, district: d.name } });
      this.toMap({ ks: 'pick', name });
      this.say(`${name} köyünün yeri kayıtlı değil. Haritada köyün merkezine bir kez dokunun — konum kaydedilir ve bundan sonra bu köy aranınca doğrudan oraya gidilir.`, true);
      setTimeout(() => this.setState({ toast: null }), 8000);
    }
  }
  async fillVillages() {
    if (this.state.vFill === 'loading') return;
    this.setState({ vFill: 'loading' });
    this.say('OpenStreetMap’ten Kırşehir köy noktaları çekiliyor…');
    try {
      // gömülü HGM listesi varsa internete hiç çıkmayız
      const nodes = this._yer
        ? this._yer.filter(r => r[3] === 'YKOY' || r[3] === 'BCK').map(r => ({ name: r[0], lat: r[1], lon: r[2], district: r[4] }))
        : (await this.osmNodes()).slice();
      if (!nodes.length) throw new Error('nokta yok');
      const R = 6371, t = Math.PI / 180;
      const d2 = (a, b) => {
        const dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(x));
      };
      let n = 0, far = 0;
      const notes = { ...this.state.notes };
      const assets = this.state.assets.map(a => {
        if (a.village) return a;
        let best = null, bd = Infinity;
        for (const v of nodes) { const dd = d2(a, v); if (dd < bd) { bd = dd; best = v; } }
        if (!best) return a;
        n++;
        if (bd > 4) far++;
        notes[a.id] = (notes[a.id] ? notes[a.id] + '\n' : '')
          + `Köy adı HGM yerleşim listesinden otomatik dolduruldu: ${best.name}${best.district ? ' · ' + best.district : ''}, kuyudan ${bd.toFixed(1)} km. ${bd > 4 ? 'UZAK — kontrol edin.' : 'Yakın eşleşme.'}`;
        return { ...a, village: best.name, district: best.district || a.district, villageAuto: +bd.toFixed(1) };
      });
      this.setState({ assets, notes, vFill: 'done' });
      this.say(`${n} kayda köy adı yazıldı (${nodes.length} yerleşim noktası tarandı); ${far} tanesi 4 km’den uzak eşleşti, kontrol edin.`, true);
      setTimeout(() => this.setState({ toast: null }), 7000);
    } catch (err) {
      this.setState({ vFill: 'error' });
      this.say('Köy konum servisine ulaşılamadı — internet bağlantınızı kontrol edip tekrar deneyin.', true);
      setTimeout(() => this.setState({ toast: null }), 6000);
    }
  }
  // ── kişisel ayarlar: her kullanıcının son kullandığı görünüm bu cihazda saklanır
  // Köyün konumu onaylanmış mı? vSave(…, true) onay ve elle işaretlemede
  // manual alanını doldurur; dolu olan köy için soru şeridi bir daha çıkmaz.
  vOnayli(name) {
    const e = this.vCache()[norm(name)];
    return !!(e && e.manual);
  }