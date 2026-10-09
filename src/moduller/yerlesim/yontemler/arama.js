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
  // Köyü boş kayıtlara en yakın yerleşimin adını yazar — yalnızca güvenli eşleşmelere:
  // (1) yerleşim kaydın ilçesindendir (ilçesi bilinmeyenler de uygun sayılır) ve (2) 1,5 km’den yakındır.
  // Yazılan her köy kayda “koyOtomatik: X km” diye işlenir (Ayarlar > Kayıt araçları > Köy kontrolü’nden
  // doğrulanır, düzeltilir ya da toplu geri alınır). Sunucuya yazılır.
  async fillVillages() {
    if (this.state.vFill === 'loading') return;
    const M = this._sb;
    if (!M || !M.tokenOku() || this.state.offline) return this.say('Köy adı yazmak için sunucu bağlantısı gerekir.', true);
    const nodes = (this._yer || []).filter(r => r[3] === 'YKOY' || r[3] === 'BCK').map(r => ({ name: r[0], lat: r[1], lon: r[2], ilce: r[4] }));
    if (!nodes.length) return this.say('Yerleşim listesi yüklenemedi — sayfayı yenileyip tekrar deneyin.', true);
    const R = 6371, t = Math.PI / 180;
    const km = (a, b) => {
      const dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t;
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x));
    };
    const ESIK = 1.5;
    const bos = this.state.assets.filter(a => !a.village && a.dbId != null && a.lat != null);
    const adaylar = [];
    for (const a of bos) {
      if (!this.yazabilir(a)) continue;
      let best = null, bd = Infinity;
      for (const v of nodes) { if (v.ilce && v.ilce !== a.district) continue; const dd = km(a, v); if (dd < bd) { bd = dd; best = v; } }
      if (best && bd <= ESIK) adaylar.push({ a, ad: best.name, km: bd });
    }
    if (!adaylar.length) return this.say('Güvenle eşleşen kayıt bulunamadı (köyü boş ' + bos.length + ' kayıt var, hepsi 1,5 km’den uzak).', true);
    const kalan = bos.length - adaylar.length;
    if (!window.confirm(adaylar.length + ' kayda köy adı yazılacak (köyü boş ' + bos.length + ' kayıttan; ' + kalan + ' kayıt 1,5 km’den uzak ya da başka ilçeye yakın olduğu için boş kalacak).\n\n'
      + 'Her biri “otomatik yazıldı” diye işaretlenir. Yanlış olanı kaydın kartında “Köy ve ilçe düzelt” ile ya da Ayarlar › Kayıt araçları › Köy kontrolü’nden düzeltebilir, hepsini geri alabilirsiniz.\n\nDevam edilsin mi?')) return;
    this.setState({ vFill: 'loading' });
    let ok = 0, hata = '';
    for (let i = 0; i < adaylar.length; i++) {
      const { a, ad, km: k } = adaylar[i];
      const yeni = { ...a, village: ad, d: { ...(a.d || {}), koyOtomatik: k.toFixed(1) + ' km' } };
      let r; try { r = await M.tesisKaydet(yeni); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) { ok++; this.iz(a.id, 'Köy otomatik yazıldı', ad + ' · en yakın yerleşim, ' + k.toFixed(1) + ' km'); }
      else { hata = (r && r.err) || 'bağlantı kesildi'; if (r && r.cevrimdisi) break; }
      if ((i + 1) % 25 === 0) this.say((i + 1) + ' / ' + adaylar.length + ' kayıt yazıldı…', true);
    }
    await this.veriYenile(true);
    this.setState({ vFill: 'done' });
    this.denetimYaz('veri', 'Köy adı otomatik yazıldı', ok + ' kayıt (en yakın yerleşim, en çok 1,5 km)', 'Kayıt araçları');
    this.say(ok + ' kayda köy adı yazıldı' + (hata ? ' · durdu: ' + hata : '') + '. Köy kontrolü bölümünden gözden geçirin.', true);
    setTimeout(() => this.setState({ toast: null }), 9000);
  }
  // ── kişisel ayarlar: her kullanıcının son kullandığı görünüm bu cihazda saklanır
  // Köyün konumu onaylanmış mı? vSave(…, true) onay ve elle işaretlemede
  // manual alanını doldurur; dolu olan köy için soru şeridi bir daha çıkmaz.
  vOnayli(name) {
    const e = this.vCache()[norm(name)];
    return !!(e && e.manual);
  }