  // Arıza kaydını sunucuya yazar. 2026.10.01'e kadar arızalar hiç sunucuya
  // gitmiyordu (arizaKaydet tanımlıydı ama çağrılmıyordu): kayıt yalnız
  // ekranda duruyor, ilk veri yenilemesinde sunucudaki boş listeyle
  // eziliyordu. Artık her yeni/değişen arıza "pending" işaretlenir, cihazda
  // saklanır (ks-ariza-bekleyen) ve sırayla gönderilir. Yeni kayıt numarasını
  // sunucudaki sayaçtan alır (ARZ-yıl-sıra): cihazda üretilen "AR-1xx"
  // numaraları iki cihazda çakışıyordu.
  async arizaGonder(id) {
    const M = this._sb;
    if (!M || !M.tokenOku() || this.state.offline || !this.state.sunucu) return null;
    const f = (this.state.faults || []).find(x => x.id === id);
    if (!f || f.sync !== 'pending') return null;
    const a = f.assetId ? (this.state.assets || []).find(x => x.id === f.assetId) : null;
    // Tesis henüz sunucuda değilse önce tesis kuyruğu gider; tesissiz
    // (şebeke) arızada ilçe gerekir
    if (f.assetId && (!a || a.dbId == null)) return null;
    if (!f.assetId && !f.ilce) return null;
    let no = f.no;
    if (!f.dbId && !/^ARZ-\d{4}-\d+$/.test(no || '')) {
      const n = await M.numaraAl('ariza');
      if (!n.ok) return null;
      no = n.data;
      // Alınan numara hemen kayda işlenir: yazma başarısız olursa yeniden
      // denemede aynı numara kullanılır, sayaçtan boşa numara harcanmaz
      await new Promise(res => this.setState(st => ({
        faults: (st.faults || []).map(x => x.id === id ? { ...x, no } : x)
      }), res));
    }
    const malT = (f.malzeme || []).reduce((t, mz) => t + (Number(mz.tutar) || 0) * (Number(mz.adet) || 1), 0);
    const saat = parseFloat(String(f.hours || '').replace(',', '.')) || 0;
    const isc = parseFloat(String(f.iscilik || '').replace(',', '.')) || saat * 320;
    const r = await M.arizaKaydet({
      dbId: f.dbId || null, no, tesisDbId: a ? a.dbId : null, type: f.type, priority: f.priority || 'Normal',
      status: f.status || 'acik', crew: f.crew && f.crew !== ATANMADI ? f.crew : null,
      desc: f.note || f.desc || null, malzeme: f.malzeme || [], maliyet: malT + isc || null,
      grup: arizaGrubu(f, a), koy: a ? null : f.koy, ilce: a ? null : f.ilce,
      nokta: f.nokta || null, noktaDogruluk: f.noktaDogruluk ?? null
    });
    if (!r.ok) {
      if (!r.cevrimdisi) this.duyur((f.no || 'Arıza') + ' sunucuya yazılamadı: ' + (r.err || 'bilinmeyen hata') + ' Kayıt cihazda bekliyor.', 9000, 'kotu');
      return null;
    }
    const dbId = f.dbId || Number(r.data);
    const yeniId = f.dbId ? f.id : 'f' + dbId;
    // Cihazdaki geçici numara (AR-1xx) ile açılan iz satırları sunucu numarasına bağlansın
    if (!f.dbId && f.no && f.no !== no) this.denetimYaz('ariza', 'Arıza numarası verildi', f.no + ' → ' + no, no);
    const yeni = { ...f, id: yeniId, dbId, no, tesisDbId: a ? a.dbId : null, grup: arizaGrubu(f, a), sync: 'synced' };
    const ff = this.state.faultForm;
    // Talep, arızaya cihaz numarasıyla bağlanmıştı — sunucu numarasına çevrilir
    const tl = (this.state.talepler || []);
    const talepDegis = no !== f.no && tl.some(t => t.arizaNo === f.no);
    if (talepDegis) {
      const yeniTl = tl.map(t => t.arizaNo === f.no ? { ...t, arizaNo: no } : t);
      this.modulYaz('talep', yeniTl.slice(0, 1000));
    }
    await new Promise(res => this.setState(st => ({
      faults: (st.faults || []).map(x => x.id === id ? yeni : x),
      faultForm: ff && ff.id === id ? { ...ff, id: yeniId, dbId, no, sync: 'synced' } : st.faultForm,
      ...(talepDegis ? { talepler: (st.talepler || []).map(t => t.arizaNo === f.no ? { ...t, arizaNo: no } : t) } : {})
    }), res));
    this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults });
    // SLA / bekleme / ana arıza / planlı zaman bilgisi
    if (f.ek && (f.ekBekleyen || !f.dbId)) this.arizaEkGonder(yeniId);
    // Cihazda bekleyen fotoğraf/ses dosyaları artık kayda bağlanabilir
    (async () => {
      const d = await this._depoYuk;
      if (d) { await d.medyaRefDegis(id, yeniId); this.medyaGonder(yeniId); }
    })();
    // Çevrimdışıyken çözülen arızanın bağlı iş emri şimdi kapanır
    if (yeni.status === 'cozuldu') {
      this.talepArizaKapandi(yeni);
      const ie = this.isEmriBul(dbId);
      if (ie && ie.status !== 'kapatildi') setTimeout(() => this.isEmriKapatVer(ie, yeni), 500);
    }
    // "Kaydedince iş emri aç ve ekibe ata" işaretliyse (telefon sade ekran)
    if (f.iseEmri === true && !f.dbId) {
      this.setState(st => ({ faults: (st.faults || []).map(x => x.id === yeniId ? { ...x, iseEmri: false } : x) }));
      this.isEmriAcSade(yeni, { crew: f.crew, araclar: f.aracSec || [] });
    }
    // Kayıtla birlikte seçilen fotoğraf ve sesli notlar arıza kimliği belli
    // olunca yüklenir — arıza kanıtı sayılsınlar diye
    const md = (this._arizaMedya || {})[id];
    if (md) {
      delete this._arizaMedya[id];
      if ((md.photos || []).length) {
        this.arizaFotoGonder(md.photos, a ? a.dbId : null, a ? a.code : no, dbId).then(n => {
          if (n) this.duyur(`${n} arıza fotoğrafı ${no} kaydına yüklendi.`, 5000, 'iyi');
        });
      }
      if ((md.sesler || []).length) {
        (async () => {
          let n = 0;
          for (const sn of md.sesler) {
            const sec = (sn.sure || '0:00').split(':').reduce((t, v) => t * 60 + (+v || 0), 0);
            const r = await M.sesYukle(sn.blob, a ? a.dbId : null, a ? a.code : no, sec, 'Arıza sesli notu · ' + (ASAMA_AD[sn.asama] || ASAMA_AD.once), dbId);
            if (r && r.ok) n++;
          }
          if (n) { this.arizaFotoYenile(dbId); this.duyur(n + ' sesli not ' + no + ' kaydına yüklendi.', 5000, 'iyi'); }
        })();
      }
    }
    return yeni;
  }
  async arizaKuyrukGonder() {
    if (this._arizaGonderiyor) return 0;
    const bekleyen = (this.state.faults || []).filter(f => f.sync === 'pending').map(f => f.id);
    if (!bekleyen.length) return 0;
    this._arizaGonderiyor = true;
    let n = 0;
    try {
      for (const id of bekleyen) { if (await this.arizaGonder(id)) n++; }
    } finally { this._arizaGonderiyor = false; }
    return n;
  }
  // Gönderilmemiş arızalar cihazda saklanır: sayfa kapanıp açılsa da kaybolmaz.
  // (Seçilen fotoğraf dosyaları saklanamaz — tarayıcı izin vermez.)
  arizaBekleyenYaz() {
    const b = (this.state.faults || []).filter(f => f.sync === 'pending' || f.ekBekleyen)
      .map(f => ({ ...f, photos: (f.photos || []).filter(p => !p.file), sesler: [] }));
    try { localStorage.setItem('ks-ariza-bekleyen', JSON.stringify(b)); } catch (e) { /* depolama kapalı */ }
  }