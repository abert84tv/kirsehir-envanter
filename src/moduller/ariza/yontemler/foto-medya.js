  // ── sesli not: gerçek mikrofon kaydı, cihazda çalınır, kayıtla birlikte yüklenir
  async sesKayit() {
    const ff = this.state.faultForm;
    if (!ff) return;
    if (this._rec && this._rec.state === 'recording') {
      this._rec.stop();
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      this.say('Bu tarayıcı ses kaydını desteklemiyor. Telefonda Chrome veya Safari kullanın.', true);
      setTimeout(() => this.setState({ toast: null }), 8000);
      return;
    }
    let akis;
    try {
      akis = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      this.say('Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon iznini açın, sonra yeniden deneyin.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    const tur = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(akis, tur ? { mimeType: tur } : undefined);
    const parca = [];
    const bas = Date.now();
    rec.ondataavailable = e => { if (e.data && e.data.size) parca.push(e.data); };
    rec.onstop = () => {
      akis.getTracks().forEach(t => t.stop());
      this._rec = null;
      const sn = Math.max(1, Math.round((Date.now() - bas) / 1000));
      const blob = new Blob(parca, { type: tur || 'audio/webm' });
      if (!blob.size) { this.setState(st => ({ faultForm: { ...st.faultForm, kayitta: false } })); return this.say('Ses kaydedilemedi — mikrofon boş geldi.'); }
      const kayit = {
        blob, url: URL.createObjectURL(blob),
        sure: `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}`,
        kb: Math.round(blob.size / 1024),
        durum: this.state.offline ? 'Cihazda' : 'Hazır',
        asama: this.state.faultForm.fotoAsama === 'sonra' ? 'sonra' : 'once'
      };
      this.setState(st => ({ faultForm: { ...st.faultForm, kayitta: false, kayitBas: null, sesler: [...(st.faultForm.sesler || []), kayit] } }));
      this.say(`Sesli not alındı · ${kayit.sure} · ${kayit.kb} KB. Oynat düğmesiyle dinleyebilirsiniz; arıza kaydını kaydettiğinizde yüklenir.`, true);
      setTimeout(() => this.setState({ toast: null }), 8000);
    };
    this._rec = rec;
    rec.start();
    this.setState({ faultForm: { ...this.state.faultForm, kayitta: true, kayitBas: bas } });
  }
  // ── arıza fotoğrafı: kayıt açılana kadar cihazda bekler, kayıtla birlikte yüklenir
  arizaFotoSec(kamera) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.multiple = !kamera;
    if (kamera) inp.capture = 'environment';
    inp.style.display = 'none';
    inp.onchange = () => {
      const list = [...(inp.files || [])];
      inp.remove();
      if (!list.length) return;
      const ff0 = this.state.faultForm;
      const asama = ff0.fotoAsama === 'sonra' ? 'sonra' : 'once';
      const ek = list.map(f => ({
        file: f, url: URL.createObjectURL(f),
        kb: Math.round(f.size / 1024),
        state: this.state.offline ? 'Cihazda' : 'Hazır',
        asama
      }));
      const ff = this.state.faultForm;
      this.setState({ faultForm: { ...ff, photos: [...(ff.photos || []), ...ek] } });
      this.say(`${ek.length} fotoğraf eklendi (${ASAMA_AD[asama]}) — arıza kaydını kaydettiğinizde yüklenir.`);
    };
    document.body.appendChild(inp);
    inp.click();
  }
  async arizaFotoGonder(photos, tesisDbId, kod, arizaDbId) {
    const M = this._sb;
    const gercek = (photos || []).filter(p => p.file);
    if (!M || !M.tokenOku() || (!tesisDbId && !arizaDbId) || !gercek.length) return 0;
    let ok = 0;
    for (const p of gercek) {
      // arizaDbId verilince "arıza kanıtı" sayılır — saklama süresi min 2 yıl,
      // envanter fotoğrafından ayrı işler (bkz. cop_temizle, KVKK politikası).
      // Aşama (öncesi/sonrası) yeni sütun açmadan aciklama metnine eklenir.
      const r = await M.fotoYukle(p.file, tesisDbId, kod, 'Arıza kaydı · ' + (ASAMA_AD[p.asama] || ASAMA_AD.once), arizaDbId);
      if (r.ok) { ok++; p.yuklendi = true; }
      try { URL.revokeObjectURL(p.url); } catch (e) {}
    }
    if (ok) { if (tesisDbId) this.fotoYenile(tesisDbId); if (arizaDbId) this.arizaFotoYenile(arizaDbId); }
    return ok;
  }
  // Arızaya bağlı fotoğraflar — tesissiz arıza dahil (fotolar['a' + id])
  async arizaFotoYenile(arizaDbId) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !arizaDbId || !M.arizaFotoListesi) return;
    const [r, sn] = await Promise.all([M.arizaFotoListesi(arizaDbId), M.arizaSesListesi ? M.arizaSesListesi(arizaDbId) : Promise.resolve({ ok: false })]);
    this.setState(st => ({
      fotolar: r.ok ? { ...st.fotolar, ['a' + arizaDbId]: r.data } : st.fotolar,
      kayitliSesler: sn.ok ? { ...st.kayitliSesler, ['a' + arizaDbId]: sn.data } : st.kayitliSesler
    }));
  }
  // Saha fotoğrafı: öncesi/sonrası. Arıza sunucudaysa hemen yüklenir, değilse
  // kayıt yazılınca (arizaGonder) yüklenmek üzere bekler.
  sahaFoto(f, asama) {
    if (!f) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment'; inp.style.display = 'none';
    inp.onchange = () => {
      const list = [...(inp.files || [])];
      inp.remove();
      if (!list.length) return;
      const ek = list.map(file => ({ file, url: URL.createObjectURL(file), kb: Math.round(file.size / 1024), asama }));
      const sf = { ...(this.state.sahaFoto || {}) };
      const k = sf[f.id] || { once: 0, sonra: 0 };
      sf[f.id] = { ...k, [asama]: k[asama] + ek.length };
      this.setState({ sahaFoto: sf });
      const a = (this.state.assets || []).find(x => x.id === f.assetId);
      const beklet = async (liste) => {
        // Önce telefonun deposuna (sayfa kapansa da kalır); depolama kapalıysa bellekte tutulur
        const kalici = await this.medyaBirak('ariza', f.id, a ? a.code : f.no, { photos: liste });
        if (!kalici) {
          this._arizaMedya = this._arizaMedya || {};
          const md = this._arizaMedya[f.id] || { photos: [], sesler: [] };
          md.photos = [...md.photos, ...liste];
          this._arizaMedya[f.id] = md;
          this.setState(st => ({ faults: (st.faults || []).map(x => x.id === f.id ? { ...x, sync: 'pending' } : x) }));
        }
        this.duyur(`${ASAMA_AD[asama]} fotoğrafı telefonda — internet gelince yüklenecek.`, 5000);
      };
      if (f.dbId && !this.state.offline && this._sb) {
        this.arizaFotoGonder(ek, a ? a.dbId : null, a ? a.code : f.no, f.dbId).then(n => {
          if (n === ek.length) return this.duyur(`${ASAMA_AD[asama]} fotoğrafı ${f.no} kaydına yüklendi.`, 5000, 'iyi');
          beklet(ek.filter(p => !p.yuklendi));
        });
      } else {
        beklet(ek);
      }
    };
    document.body.appendChild(inp);
    inp.click();
  }
  // Çevrimdışı çekilen fotoğraf ve sesler IndexedDB'de durur; sayfa kapansa da
  // kaybolmaz, internet gelince ve kayıt sunucuya yazılınca kendiliğinden yüklenir.
  // Depolama kapalıysa false döner (çağıran bellekteki eski yola düşer).
  async medyaBirak(hedef, ref, kod, ek) {
    const d = await this._depoYuk;
    if (!d) return false;
    let tamam = true;
    for (const p of (ek.photos || [])) {
      if (!p.file) continue;
      const id = await d.medyaEkle({ hedef, ref, kod, tur: 'foto', blob: p.file, ad: p.file.name || '', asama: p.asama || 'once', kb: p.kb || 0 });
      if (id == null || id === true) tamam = false; else p.idbId = id;
    }
    for (const sn of (ek.sesler || [])) {
      if (!sn.blob) continue;
      const id = await d.medyaEkle({ hedef, ref, kod, tur: 'ses', blob: sn.blob, sure: sn.sure || '0:00', asama: sn.asama || 'once' });
      if (id == null || id === true) tamam = false; else sn.idbId = id;
    }
    this.bekleyenEkYenile();
    return tamam;
  }
  // Tek arızanın cihazda bekleyen dosyalarını yükler (arıza sunucuya yazılmışsa)
  async medyaGonder(ref) {
    const d = await this._depoYuk, M = this._sb;
    if (!d || !M || !M.tokenOku() || this.state.offline) return 0;
    const f = (this.state.faults || []).find(x => x.id === ref);
    if (!f || !f.dbId) return 0;
    const a = f.assetId ? (this.state.assets || []).find(x => x.id === f.assetId) : null;
    const tesisDbId = a ? a.dbId : null, kod = a ? a.code : f.no;
    this._medyaUcta = this._medyaUcta || new Set();
    const liste = (await d.medyaListe()).filter(x => x.hedef === 'ariza' && x.ref === ref && !this._medyaUcta.has(x.id));
    let foto = 0, ses = 0;
    for (const m of liste) {
      this._medyaUcta.add(m.id);
      try {
        let r;
        if (m.tur === 'foto') r = await M.fotoYukle(m.blob, tesisDbId, kod, 'Arıza kaydı · ' + (ASAMA_AD[m.asama] || ASAMA_AD.once), f.dbId);
        else {
          const sec = String(m.sure || '0:00').split(':').reduce((tt, v) => tt * 60 + (+v || 0), 0);
          r = await M.sesYukle(m.blob, tesisDbId, kod, sec, 'Arıza sesli notu · ' + (ASAMA_AD[m.asama] || ASAMA_AD.once), f.dbId);
        }
        if (r && r.ok) { await d.medyaSil(m.id); m.tur === 'foto' ? foto++ : ses++; }
        else if (r && r.cevrimdisi) break;
      } catch (e) { break; } finally { this._medyaUcta.delete(m.id); }
    }
    this.bekleyenEkYenile();
    if (foto || ses) {
      this.arizaFotoYenile(f.dbId);
      this.duyur((foto ? foto + ' fotoğraf' : '') + (foto && ses ? ' ve ' : '') + (ses ? ses + ' sesli not' : '') + ' ' + f.no + ' kaydına yüklendi.', 5000, 'iyi');
    }
    return foto + ses;
  }
  // Bağlantı gelince: bekleyen bütün arıza ve tesis dosyaları
  async medyaKuyrukGonder() {
    const d = await this._depoYuk, M = this._sb;
    if (!d || !M || !M.tokenOku() || this.state.offline) return;
    const liste = await d.medyaListe();
    if (!liste.length) { this.bekleyenEkYenile(); return; }
    for (const ref of [...new Set(liste.filter(x => x.hedef === 'ariza').map(x => x.ref))]) await this.medyaGonder(ref);
    // tesis fotoğrafları: kayıt kodundan sunucudaki tesis bulunur
    const tes = liste.filter(x => x.hedef === 'tesis');
    const kodlar = [...new Set(tes.map(x => x.kod))];
    this._medyaUcta = this._medyaUcta || new Set();
    for (const kod of kodlar) {
      const a = (this.state.assets || []).find(x => x.dbId != null && String(x.code).toUpperCase() === String(kod).toUpperCase());
      if (!a) continue;
      let n = 0;
      for (const m of tes.filter(x => x.kod === kod && !this._medyaUcta.has(x.id))) {
        this._medyaUcta.add(m.id);
        try {
          const r = await M.fotoYukle(m.blob, a.dbId, a.code);
          if (r && r.ok) { await d.medyaSil(m.id); n++; } else if (r && r.cevrimdisi) break;
        } catch (e) { break; } finally { this._medyaUcta.delete(m.id); }
      }
      if (n) { this.fotoYenile(a.dbId); this.duyur(n + ' fotoğraf ' + a.code + ' kaydına yüklendi.', 5000, 'iyi'); }
    }
    this.bekleyenEkYenile();
  }