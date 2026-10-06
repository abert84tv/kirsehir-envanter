  // İş emri: "İş emri" düğmesi artık gerçek, numaralı bir kayıt açıyor
  // (madde 3-5/9/12-14, 2026.09.30 — daha önce yalnızca bir toast gösteriyordu).
  isEmriTuru(tesisType, altSistem) {
    if (altSistem === 'kolektor') return 'kanal';
    if (tesisType === 'ag' || tesisType === 'ges') return 'elektrik';
    return 'su';
  }
  async isEmriYenile() {
    const M = this._sb;
    if (!M || !M.tokenOku()) return;
    const [r, er] = await Promise.all([M.isEmriListesi(), M.isEmriEkListesi ? M.isEmriEkListesi() : Promise.resolve({ ok: false })]);
    const ek = {};
    if (er && er.ok) for (const x of (er.data || [])) ek[x.is_emri_id] = { ekipler: Array.isArray(x.ek_ekipler) ? x.ek_ekipler : [], altIsler: Array.isArray(x.alt_isler) ? x.alt_isler : [] };
    if (r.ok) this.setState(st => ({ isEmirleri: (r.data || []).map(M.isEmriSuret), isEmriEk: er && er.ok ? ek : (st.isEmriEk || {}) }), () => this.isEmriTamamla());
  }
  // Bir iş emrine ek ekip ve sıralı alt işler (şartname 4.4)
  async isEmriEkYaz(dbId, ek) {
    const M = this._sb;
    this.setState(st => ({ isEmriEk: { ...(st.isEmriEk || {}), [dbId]: ek } }));
    if (!M || !M.isEmriEkKaydet || !M.tokenOku() || this.state.offline) return this.duyur('Bağlantı yok — değişiklik cihazda, sunucuya yazılamadı.', 6000, 'kotu');
    const r = await M.isEmriEkKaydet(dbId, ek.ekipler || [], ek.altIsler || []);
    if (!r.ok) this.duyur(r.err || 'Kaydedilemedi.', 6000, 'kotu');
  }
  isEmriBul(arizaDbId) {
    return (this.state.isEmirleri || []).find(x => x.arizaDbId === arizaDbId);
  }
  async isEmriAc(f, a) {
    const M = this._sb;
    if (!M || !M.tokenOku()) return this.say('İş emri için ortak veritabanına bağlı olmanız gerekir.', true);
    if (!f.dbId) return this.say('Önce arıza kaydını kaydedin — iş emri ondan sonra açılabilir.', true);
    if (this.isEmriBul(f.dbId)) return this.say('Bu arıza için zaten bir iş emri var.', true);
    this.say('İş emri hazırlanıyor…');
    const noR = await M.numaraAl('isemri');
    if (!noR.ok) return this.say(noR.err || 'İş emri numarası alınamadı.', true);
    const r = await M.isEmriKaydet({
      no: noR.data, arizaDbId: f.dbId, tesisDbId: a.dbId,
      type: this.isEmriTuru(a.type, null), priority: f.priority || 'Normal',
      desc: f.note || '', crew: f.crew && f.crew !== ATANMADI ? f.crew : null,
      araclar: [], status: f.crew && f.crew !== ATANMADI ? 'atandi' : 'acik',
      planlananMalzeme: (f.malzeme || []).map(mz => ({ malzeme: mz.ad, adet: mz.adet || 1, birim: mz.birim }))
    });
    if (!r.ok) return this.say(r.err || 'İş emri oluşturulamadı.', true);
    await this.isEmriYenile();
    this.denetimYaz('is_emri', 'İş emri oluşturuldu', noR.data + ' · ' + (f.crew || 'ekip atanmadı'), a.code);
    this.duyur(`${noR.data} iş emri oluşturuldu` +
      (f.crew && f.crew !== ATANMADI ? ` — ${f.crew} ekibine atandı.` : ' — ekip ataması bekliyor.'), 7000, 'iyi');
  }
  // Arıza için iş emri aç ve ekibe (varsa araçlara) ata — tek adım. Tesissiz
  // (şebeke) arızada da çalışır. Arızanın ekibi ve durumu da eşitlenir.
  async isEmriAcSade(f, o) {
    o = o || {};
    const M = this._sb;
    const rol = this.state.session && this.state.session.role;
    if (!CAN.assign.includes(rol)) return this.say('İş emrini yönetici, müdür, mühendis ya da şef açar.', true);
    if (!M || !M.tokenOku()) return this.say('İş emri için ortak veritabanına bağlı olmanız gerekir.', true);
    if (!f || !f.dbId) return this.say('Arıza henüz sunucuya yazılmadı — birkaç saniye sonra yeniden deneyin.', true);
    if (this.isEmriBul(f.dbId)) return this.say('Bu arıza için zaten bir iş emri var.', true);
    const crew = o.crew && o.crew !== ATANMADI ? o.crew : null;
    const a = f.assetId ? (this.state.assets || []).find(x => x.id === f.assetId) : null;
    const grup = arizaGrubu(f, a);
    const tur = { su: 'su', kuyu: 'su', depo: 'su', elektrik: 'elektrik', ges: 'elektrik', kanal: 'kanal' }[grup] || 'su';
    this.say('İş emri hazırlanıyor…');
    const noR = await M.numaraAl('isemri');
    if (!noR.ok) return this.say(noR.err || 'İş emri numarası alınamadı.', true);
    const havuz = (this.state.arac && this.state.arac.list) || [];
    const araclar = (o.araclar || []).map(id => { const v = havuz.find(x => x.id === id); return v ? { id: v.id, plaka: v.plaka, ad: v.ad } : { id }; });
    const r = await M.isEmriKaydet({
      no: noR.data, arizaDbId: f.dbId, tesisDbId: a && a.dbId != null ? a.dbId : null,
      type: tur, altSistem: grup, priority: f.priority || 'Normal',
      desc: f.note || f.desc || '', crew, araclar, status: crew ? 'atandi' : 'acik',
      planlananMalzeme: (f.malzeme || []).map(mz => ({ malzeme: mz.ad, adet: mz.adet || 1, birim: mz.birim }))
    });
    if (!r.ok) return this.say(r.err || 'İş emri oluşturulamadı.', true);
    await this.isEmriYenile();
    if (crew) this.arizaEkipYaz(f, crew);
    this.denetimYaz('is_emri', 'İş emri oluşturuldu', noR.data + ' · ' + (crew || 'ekip atanmadı') + (araclar.length ? ' · ' + araclar.length + ' araç' : ''), f.no || '');
    this.duyur(noR.data + ' iş emri oluşturuldu' + (crew ? ' — ' + crew + ' ekibine atandı' + (araclar.length ? ', ' + araclar.length + ' araç ayrıldı' : '') + '.' : ' — ekip ataması bekliyor.'), 8000, 'iyi');
  }
  // Talepten açılan arıza çözülünce talep de "Çözüldü" olur; başvurana (Telegram/web) durum kendiliğinden gider
  talepArizaKapandi(f) {
    if (!f || !f.no) return;
    const liste = [...(this.state.talepler || [])];
    const i = liste.findIndex(x => x.arizaNo === f.no && !['cozuldu', 'red'].includes(x.durum));
    if (i < 0) return;
    liste[i] = { ...liste[i], durum: 'cozuldu', sonuc: liste[i].sonuc || 'Arıza giderildi.', guncelleme: this.damga() };
    this.talepYaz(liste, f.no + ' çözüldü — ' + (liste[i].no || 'bağlı talep') + ' de çözüldü olarak işaretlendi.');
    setTimeout(() => this.basvuruEsitle(), 800);
  }
  async isEmriKapatVer(baglIsEmri, f, sessiz) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !baglIsEmri) return false;
    // Aynı iş emri iki yoldan (form + bağlantı gelince eşitleme) kapatılmasın
    this._ieKapaniyor = this._ieKapaniyor || new Set();
    if (this._ieKapaniyor.has(baglIsEmri.dbId)) return false;
    this._ieKapaniyor.add(baglIsEmri.dbId);
    try {
      const saat = parseFloat(String(f.hours || '').replace(',', '.')) || null;
      const r = await M.isEmriKapat(baglIsEmri.dbId,
        (f.malzeme || []).map(mz => ({ malzeme: mz.ad, adet: mz.adet || 1, birim: mz.birim })),
        saat, f.note || null);
      if (r.ok) {
        await this.isEmriYenile();
        this.denetimYaz('is_emri', 'İş emri kapatıldı', baglIsEmri.no, f.no || '');
        if (!sessiz) this.duyur(baglIsEmri.no + ' iş emri kapatıldı.', 5000, 'iyi');
        return true;
      }
      // Sessiz kalmaz: kapanmayan iş emrinin nedeni kullanıcıya söylenir
      if (!sessiz && !r.cevrimdisi) this.duyur(baglIsEmri.no + ' iş emri kapatılamadı: ' + (r.err || 'sunucu reddetti'), 10000, 'kotu');
      return false;
    } finally { this._ieKapaniyor.delete(baglIsEmri.dbId); }
  }
  // Arızası çözülmüş ama iş emri açık kalmış kayıtları (eski hata, çevrimdışı kapanış)
  // oturum başına bir kez kendiliğinden kapatır
  isEmriTamamla() {
    const rol = (this.state.session || {}).role;
    if (!CAN.assign.includes(rol) || this.state.offline) return;
    this._ieDenendi = this._ieDenendi || new Set();
    for (const ie of (this.state.isEmirleri || [])) {
      if (ie.status === 'kapatildi' || this._ieDenendi.has(ie.dbId)) continue;
      const f = (this.state.faults || []).find(x => x.dbId === ie.arizaDbId);
      if (f && f.status === 'cozuldu' && f.sync !== 'pending') {
        this._ieDenendi.add(ie.dbId);
        this.isEmriKapatVer(ie, f, true);
      }
    }
  }
  // İş emri panelindeki "İş emrini kapat" düğmesi
  async isEmriElleKapat(ie) {
    const f = (this.state.faults || []).find(x => x.dbId === ie.arizaDbId);
    const arizaAcik = !!f && !KAPALI_DURUM.includes(f.status);
    const kanitEksik = arizaAcik && this.state.modul.kanit !== false && !(f.photos || []).length;
    const ek = !arizaAcik ? ''
      : (kanitEksik ? '\n\nBağlı arıza ' + f.no + ' açık ama fotoğrafı yok; arıza çözüldü yapılmayacak, yalnızca iş emri kapanacak.'
        : '\n\nBağlı arıza ' + f.no + ' de “Çözüldü” olarak işaretlenecek.');
    if (!window.confirm(ie.no + ' iş emri kapatılsın mı?' + ek)) return;
    const ok = await this.isEmriKapatVer(ie, f || {});
    if (ok && arizaAcik && !kanitEksik) {
      this.setState(st => ({ faults: (st.faults || []).map(x => x.id === f.id ? { ...x, status: 'cozuldu', sync: 'pending', closed: this.damga(), closedIso: new Date().toISOString() } : x) }));
      setTimeout(() => this.arizaKuyrukGonder(), 0);
    }
  }
  // İş Emirleri panelindeki ekip+araç atama formu — madde 4/5/9.
  async isEmriAtaKaydet(secili, ekipForm) {
    const M = this._sb;
    if (!M || !M.tokenOku()) return this.say('Bağlantı gerekiyor.', true);
    const ekip = ekipForm.ekip ?? secili.crew ?? '';
    const araclarIds = ekipForm.araclar || (secili.araclar || []).map(x => x.id);
    const havuz = (this.state.arac && this.state.arac.list) || [];
    const araclarObj = araclarIds.map(id => {
      const a = havuz.find(x => x.id === id);
      return a ? { id: a.id, plaka: a.plaka, ad: a.ad } : { id };
    });
    const r = await M.isEmriKaydet({
      dbId: secili.dbId, no: secili.no, arizaDbId: secili.arizaDbId, tesisDbId: secili.tesisDbId,
      type: secili.type, altSistem: secili.altSistem, priority: secili.priority, desc: secili.desc,
      crew: ekip || null, araclar: araclarObj,
      status: ekip ? (secili.status === 'acik' ? 'atandi' : secili.status) : secili.status,
      planlananMalzeme: secili.planlananMalzeme, surum: secili.surum
    });
    if (!r.ok) return this.say(r.err || 'Kaydedilemedi.', true);
    await this.isEmriYenile();
    if (this.state.isEmriPanel) this.setState({ isEmriPanel: { ...this.state.isEmriPanel, ekipForm: null } });
    // Arızanın kendi ekibi de aynı olsun
    const af = (this.state.faults || []).find(x => x.dbId === secili.arizaDbId);
    if (af && ekip && af.crew !== ekip) this.arizaEkipYaz(af, ekip);
    this.denetimYaz('is_emri', 'İş emri ataması güncellendi', secili.no,
      (ekip || 'ekip yok') + (araclarObj.length ? ' · ' + araclarObj.length + ' araç' : ''));
    this.duyur(`${secili.no} ${ekip ? ekip + ' ekibine atandı.' : 'güncellendi.'}`, 6000, 'iyi');
  }