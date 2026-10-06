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
  // Resmî köy listesi (kirsehir-data.js) + kullanıcının elle eklediği köy/mahalleler
  koyList(m, d) {
    if (!m || !d) return [];
    const temel = m.VILLAGES[d.id] || [];
    const ek = (this.state.ekKoyler || {})[d.id] || [];
    const gor = new Set(temel.map(x => nkey(x)));
    const out = temel.slice();
    for (const r of ek) { const k = nkey(r.ad); if (!k || gor.has(k)) continue; gor.add(k); out.push(r.ad); }
    return out.sort((a, b) => a.localeCompare(b, 'tr'));
  }
  ekKoyKoord(dId, ad) {
    const r = ((this.state.ekKoyler || {})[dId] || []).find(x => nkey(x.ad) === nkey(ad));
    return r && r.lat != null && r.lon != null ? r : null;
  }
  ekKoyYaz(v) {
    try { localStorage.setItem('ks-ek-koyler', JSON.stringify(v)); } catch (e) { /* depolama kapalı */ }
    this.setState({ ekKoyler: v });
  }
  ekKoyEkle() {
    const g = this.state.koyEkleForm || {};
    const m = this.state.data;
    const ad = String(g.ad || '').replace(/\s+/g, ' ').trim();
    if (!g.ilce) return this.duyur('İlçe seçin.', 5000, 'kotu');
    if (!ad) return this.duyur('Köy ya da mahalle adını yazın.', 5000, 'kotu');
    const d = m && m.DISTRICTS.find(x => x.id === g.ilce);
    if (this.koyList(m, d).some(x => nkey(x) === nkey(ad) || nkey(x) === nkey(this.yerlesimAdSadelestir(ad)))) {
      return this.duyur(ad + ' bu ilçede zaten listede.', 5000, 'kotu');
    }
    const say = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isFinite(n) ? n : null; };
    const lat = say(g.lat), lon = say(g.lon);
    if ((lat == null) !== (lon == null)) return this.duyur('Koordinat verilecekse enlem ve boylam birlikte yazılmalı.', 6000, 'kotu');
    const ek = { ...(this.state.ekKoyler || {}) };
    ek[g.ilce] = [...(ek[g.ilce] || []), { ad, lat, lon }];
    this.ekKoyYaz(ek);
    const M = this._sb;
    if (d && M && M.yerlesimEkEkle && M.tokenOku() && !this.state.offline) {
      M.yerlesimEkEkle(d.name, ad, lat, lon).then(r => {
        if (r.ok) this.ekKoyYenile();
        else if (!r.cevrimdisi) this.duyur('Yerleşim sunucuya yazılamadı: ' + r.err, 7000, 'kotu');
      });
    }
    this.setState({ koyEkleForm: { ilce: g.ilce, ad: '', lat: '', lon: '' } });
    this.duyur(ad + ' · ' + (d ? d.name : '') + ' eklendi — yeni kayıt formundaki köy listesinde ve aramada çıkar.'
      + (lat != null ? ' Konum girildiği için yeni kayıtta koordinat buradan gelir.' : ' Koordinat girilmedi — konumu sahada GPS ile alın.'), 7000, 'iyi',
      () => this.setState({ tab: 'yerlesim' }));
  }
  ekKoySil(dId, i) {
    const kayit = ((this.state.ekKoyler || {})[dId] || [])[i];
    const ek = { ...(this.state.ekKoyler || {}) };
    ek[dId] = (ek[dId] || []).filter((_, k) => k !== i);
    if (!ek[dId].length) delete ek[dId];
    this.ekKoyYaz(ek);
    const M = this._sb;
    if (kayit && kayit.id != null && M && M.yerlesimEkSil && M.tokenOku() && !this.state.offline) {
      M.yerlesimEkSil(kayit.id).then(r => {
        if (r.ok) this.ekKoyYenile();
        else if (!r.cevrimdisi) this.duyur('Sunucudan silinemedi: ' + r.err, 7000, 'kotu');
      });
    }
    this.duyur('Yerleşim elle eklenenler listesinden çıkarıldı. Bu köye kayıtlı tesisler etkilenmez.', 5000);
  }
  // Elle eklenen köy / mahalle listesi sunucudan gelir: bir cihazda eklenen
  // yerleşim ötekilerde de çıkar
  async ekKoyYenile() {
    const M = this._sb;
    const m = this.state.data;
    if (!M || !M.yerlesimEkListesi || !M.tokenOku() || !m) return;
    let r;
    try { r = await M.yerlesimEkListesi(); } catch (e) { return; }
    if (!r.ok || !Array.isArray(r.data)) return;
    const tablo = {};
    for (const y of r.data) {
      const d = m.DISTRICTS.find(x => x.id === y.ilce || nkey(x.name) === nkey(y.ilce));
      if (!d) continue;
      (tablo[d.id] = tablo[d.id] || []).push({ id: y.id, ad: y.ad, lat: y.lat, lon: y.lon });
    }
    try { localStorage.setItem('ks-ek-koyler', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    this.setState({ ekKoyler: tablo });
  }
  yerlesimBul(ilceAd, koyAd) {
    const kayit = this.state.yerlesimVeri || {};
    const k = nkey(koyAd);
    if (!k) return null;
    const bilesik = nkey(ilceAd) + '|' + k;
    if (kayit[bilesik]) return kayit[bilesik];
    if (kayit[k]) return kayit[k];
    const hepsi = Object.values(kayit);
    for (const v of hepsi) if (nkey(v.ad) === k) return v;
    const ik = nkey(ilceAd);
    let en = null, enUz = 3, cok = false;
    for (const v of hepsi) {
      if (ik && v.ilce && nkey(v.ilce) !== ik) continue;
      const vk = nkey(v.ad);
      if (!ayirtEsit(k, vk)) continue;
      const u = benzerlik(k, vk);
      if (u > 2) continue;
      if (u === 2 && (onEk(k, vk) < 3 || Math.min(k.length, vk.length) < 7)) continue;
      if (u < enUz) { en = v; enUz = u; cok = false; }
      else if (u === enUz && en && v !== en) cok = true;
    }
    return cok || !en ? null : { ...en, yaklasik: en.ad };
  }
  yerlesimCsvCoz(buf) {
    const bytes = new Uint8Array(buf);
    let metin = '';
    try { metin = new TextDecoder('utf-8').decode(bytes); } catch (e) { metin = ''; }
    if (!metin || metin.indexOf('\ufffd') >= 0) {
      for (const enc of ['windows-1254', 'iso-8859-9', 'windows-1252']) {
        try {
          const alt = new TextDecoder(enc).decode(bytes);
          if (alt && alt.indexOf('\ufffd') < 0) { metin = alt; break; }
          if (!metin) metin = alt;
        } catch (e) { /* kodlama desteklenmiyor */ }
      }
    }
    return String(metin || '').replace(/^\ufeff/, '');
  }
  yerlesimSutunlar(bas) {
    const t = s => String(s || '').toLowerCase()
      .replace(/\u0131/g, 'i').replace(/\u0130/g, 'i').replace(/[\u00e7]/g, 'c').replace(/[\u011f]/g, 'g')
      .replace(/[\u00f6]/g, 'o').replace(/[\u015f]/g, 's').replace(/[\u00fc]/g, 'u')
      .replace(/[^a-z]/g, '');
    const idx = { ad: -1, ilce: -1, nufus: -1, yil: -1, buyukbas: -1, kucukbas: -1 };
    bas.forEach((h, i) => {
      const k = t(h);
      if (!k) return;
      if (idx.buyukbas < 0 && /buyukbas|sigir|bugu/.test(k)) idx.buyukbas = i;
      else if (idx.kucukbas < 0 && /kucukbas|koyun|keci/.test(k)) idx.kucukbas = i;
      else if (idx.yil < 0 && /^yil|yili$|nufusyil/.test(k)) idx.yil = i;
      else if (idx.nufus < 0 && /nufus/.test(k)) idx.nufus = i;
      else if (idx.ilce < 0 && /ilce/.test(k)) idx.ilce = i;
      else if (idx.ad < 0 && /koy|yerlesim|belde|mahalle|ad$|adi/.test(k)) idx.ad = i;
    });
    return idx;
  }
  yerlesimAdSadelestir(ad) {
    return String(ad || '').trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*[\(\[].*?[\)\]]\s*$/, '')
      .replace(/\s+(k\u00f6y\u00fc|k\u00f6y|beldesi|belde|mahallesi|mah\.?|mh\.?)$/i, '')
      .trim();
  }
  yerlesimCsvIsle(buf, dosyaAd) {
    const metin = this.yerlesimCsvCoz(buf);
    const satir = metin.split(/\r?\n/).filter(x => x.replace(/[;,\t"\s]/g, ''));
    if (satir.length < 2) return this.duyur('Dosya bo\u015f g\u00f6r\u00fcn\u00fcyor \u2014 ba\u015fl\u0131k sat\u0131r\u0131 ve en az bir veri sat\u0131r\u0131 gerekli.', 7000, 'kotu');
    const say = ['\t', ';', ',']
      .map(d => ({ d, n: (satir[0].split(d).length - 1) }))
      .sort((a, b) => b.n - a.n)[0];
    const ayr = say.n > 0 ? say.d : ';';
    const boel = r => {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '"') { if (q && r[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === ayr && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(x => x.trim());
    };
    let idx = this.yerlesimSutunlar(boel(satir[0]));
    let bas = 1;
    if (idx.ad < 0) { idx = { ad: 0, ilce: 1, nufus: 2, yil: 3, buyukbas: 4, kucukbas: 5 }; bas = 0; }
    const nrm = a => nkey(a);
    void nrm;
    const sayi = x => {
      const v = parseInt(String(x == null ? '' : x).replace(/[^0-9]/g, ''), 10);
      return isFinite(v) ? v : null;
    };
    const al = (c, i) => i >= 0 && i < c.length ? c[i] : '';
    const yeni = { ...(this.state.yerlesimVeri || {}) };
    let n = 0, atlanan = 0, sonIlce = '', sonYil = '';
    for (const r of satir.slice(bas)) {
      const c = boel(r);
      const ilceHam = al(c, idx.ilce);
      const yilHam = al(c, idx.yil);
      if (ilceHam) sonIlce = ilceHam;
      if (yilHam) sonYil = yilHam;
      const adHam = this.yerlesimAdSadelestir(al(c, idx.ad));
      if (!adHam || /^(toplam|genel toplam|ara toplam)$/i.test(adHam)) { atlanan++; continue; }
      const k = idx.ilce >= 0 && sonIlce ? nkey(sonIlce) + '|' + nkey(adHam) : nkey(adHam);
      if (!k) { atlanan++; continue; }
      const eski = yeni[k] || {};
      const bb = idx.buyukbas >= 0 ? sayi(al(c, idx.buyukbas)) : null;
      const kb = idx.kucukbas >= 0 ? sayi(al(c, idx.kucukbas)) : null;
      const nf = idx.nufus >= 0 ? sayi(al(c, idx.nufus)) : null;
      yeni[k] = {
        ad: adHam,
        ilce: this.yerlesimAdSadelestir(sonIlce) || eski.ilce || '',
        nufus: nf != null ? nf : (eski.nufus != null ? eski.nufus : null),
        yil: (sonYil || eski.yil || '').toString().trim(),
        buyukbas: bb != null ? bb : (eski.buyukbas != null ? eski.buyukbas : null),
        kucukbas: kb != null ? kb : (eski.kucukbas != null ? eski.kucukbas : null)
      };
      n++;
    }
    if (!n) return this.duyur('Dosyada okunabilir yerle\u015fim sat\u0131r\u0131 bulunamad\u0131. Ba\u015fl\u0131k sat\u0131r\u0131nda K\u00f6y / \u0130l\u00e7e / N\u00fcfus s\u00fctunlar\u0131 olmal\u0131.', 9000, 'kotu');
    try { localStorage.setItem('ks-yerlesim-veri', JSON.stringify(yeni)); } catch (e) { /* depolama kapal\u0131 */ }
    this.setState({ yerlesimVeri: yeni });
    const nufuslu = Object.values(yeni).filter(x => x.nufus != null).length;
    const hayvanli = Object.values(yeni).filter(x => x.buyukbas != null || x.kucukbas != null).length;
    this.duyur(`${dosyaAd ? dosyaAd + ' \u2014 ' : ''}${n} sat\u0131r okundu \u00b7 ${nufuslu} yerle\u015fimde n\u00fcfus, ${hayvanli} yerle\u015fimde hayvan say\u0131s\u0131${atlanan ? ' \u00b7 ' + atlanan + ' sat\u0131r atland\u0131' : ''}.`, 8000, 'iyi');
  }