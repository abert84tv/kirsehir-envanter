  // periyodik bakım: kuyu 6 ay, depo 12 ay, elektrik tesisi 12 ay
  // Modül anahtarı kurum ayarıdır: sunucuya yazılır, bütün cihazlarda aynı
  // olur (önceden yalnız cihazda duruyordu — bilgisayarda açılan modül
  // telefonda kapalı kalıyordu). Hedef süre, kanıt ve merkez onayı arıza
  // modülünün içinde çalışır: arıza kapalıyken bunlardan biri açılırsa
  // arıza da açılır (önceden ayar kaydediliyor ama düğme "Kapalı" kalıyordu).
  modulAnahtar(ad, on) {
    const bagli = ['sure', 'kanit', 'onay'].includes(ad);
    const arizaDa = on && bagli && this.state.modul.ariza === false;
    const y = { ...this.state.modul, [ad]: !!on, ...(arizaDa ? { ariza: true } : {}) };
    this.denetimYaz('ayar', 'Modül ' + (on ? 'açıldı' : 'kapatıldı'), (MODUL_AD[ad] || ad) + (arizaDa ? ' · arıza modülü de açıldı' : ''), 'Modüller');
    try { localStorage.setItem('ks-moduller', JSON.stringify(y)); } catch (e) { /* depolama kapalı */ }
    this.modulYaz('modul', y);
    const geri = MODUL_AD[ad] || ad;
    this.setState({ modul: y }, () => this.duyur(
      geri + (on
        ? (arizaDa ? ' açıldı — çalışması için Arıza modülü de açıldı.' : (bagli ? ' açıldı.' : ' modülü açıldı — menüsü ve kayıt sekmesi geri geldi.'))
        : (bagli ? ' kapatıldı.' : ' modülü kapatıldı. Kayıtlar veritabanında duruyor, yeniden açtığınızda yerinde bulunur.'))
        + ' Ayar bütün cihazlarda geçerli.',
      6000, on ? 'iyi' : 'bilgi', () => this.setState({ tab: 'ayarlar', ayarBolum: 'modul' })));
  }
  // Ekip vardiyası / yetkinliği. Ad değişmez; kayıtlardaki ekip metni bozulmasın.
  // ── Modül deposu ─────────────────────────────────────────────
  // Yedi modül hem cihazda hem sunucuda durur. Cihaz kopyası her zaman
  // yazılır (çevrimdışı çalışsın), sunucuya yazma başarısız olursa kayıt
  // kuyruğa girer ve bağlantı gelince gönderilir.
  // Bir modülün kayıtlarını hangi alandan tanıdığımız. Birleştirme buna bakar.
  modulKimlik(anahtar) {
    return { ekip: 'ad', personel: 'id', talep: 'id', muhtar: 'id', malzeme: 'kod', siparis: 'id' }[anahtar] || null;
  }
  // Çakışma birleştirmesi: sunucudaki liste temel alınır, benim
  // kayıtlarım üstüne yazılır, sunucuda olup bende olmayanlar KORUNUR.
  // Böylece ben yazarken başkasının eklediği kayıt silinmez.
  modulBirlestir(anahtar, sunucu, benim) {
    const kim = this.modulKimlik(anahtar);
    if (kim && Array.isArray(sunucu) && Array.isArray(benim)) {
      const harita = new Map();
      for (const r of sunucu) if (r && r[kim] != null) harita.set(String(r[kim]), r);
      for (const r of benim) if (r && r[kim] != null) harita.set(String(r[kim]), r);
      return { veri: [...harita.values()], yontem: 'kayit' };
    }
    // ambar ve araç: içleri sayı ve bakiye — kör birleştirme yanlış sonuç verir,
    // sunucudaki doğru kabul edilir ve kullanıcıya işlemi yenilemesi söylenir
    if (anahtar === 'ambar' || anahtar === 'arac') return { veri: null, yontem: 'yok' };
    // nobet gibi anahtar–değer nesneleri: benim anahtarlarım kazanır, gerisi kalır
    if (sunucu && benim && typeof sunucu === 'object' && !Array.isArray(sunucu)
        && typeof benim === 'object' && !Array.isArray(benim)) {
      return { veri: { ...sunucu, ...benim }, yontem: 'anahtar' };
    }
    // ambar ve araç: sayı içerdikleri için kör birleştirme yapılmaz
    return { veri: null, yontem: 'yok' };
  }
  modulYaz(anahtar, veri) {
    try { localStorage.setItem('ks-' + anahtar, JSON.stringify(veri)); } catch (e) { /* depolama kapalı */ }
    const M = this._sb;
    if (!M || !this.state.sunucu || this.state.offline) {
      if (M && this.state.sunucu) this.modulKuyrukEkle(anahtar);
      return;
    }
    this.modulGonder(anahtar, veri, 0);
  }
  // Tek modülü sürümüyle gönderir. Çakışırsa birleştirip bir kez daha dener.
  modulGonder(anahtar, veri, deneme) {
    const M = this._sb;
    const surum = (this.state.modulSurum || {})[anahtar] ?? null;
    return M.veriYazSurumlu(anahtar, veri, surum).then(r => {
      if (r && r.ok && r.data && r.data.ok) {
        this.modulSurumYaz(anahtar, r.data.surum);
        const k = { ...(this.state.modulKuyruk || {}) };
        if (k[anahtar]) { delete k[anahtar]; this.modulKuyrukYaz(k); }
        return true;
      }
      // Çakışma: başkası aynı listeyi değiştirmiş
      if (r && r.ok && r.data && r.data.cakisma) {
        this.modulSurumYaz(anahtar, r.data.surum);
        const b = this.modulBirlestir(anahtar, r.data.veri, veri);
        if (b.veri && deneme < 2) {
          this.modulDurumYaz(anahtar, b.veri);
          this.denetimYaz('veri', 'Çakışma birleştirildi',
            MODUL_ADI[anahtar] + ' listesini başkası da değiştirmiş; iki değişiklik birleştirildi',
            'Eşitleme');
          this.duyur(MODUL_ADI[anahtar] + ' listesini bu arada başkası da değiştirmiş. '
            + 'İki değişiklik birleştirildi, kimsenin kaydı silinmedi.', 8000, 'iyi');
          return this.modulGonder(anahtar, b.veri, deneme + 1);
        }
        // Sayı içeren modüllerde kör birleştirme yapılmaz: sunucudaki doğru kabul edilir
        this.modulDurumYaz(anahtar, r.data.veri);
        this.duyur(MODUL_ADI[anahtar] + ' kaydını bu arada başkası değiştirdi. '
          + 'Sunucudaki güncel durum yüklendi — sayıların doğru kalması için '
          + 'işleminizi yeniden yapın.', 11000, 'kotu');
        return false;
      }
      // Yetki hatası kuyruğa girmez: tekrar denemek de aynı sonucu verir
      if (r && r.err && /yalnızca müdür|İzleyici hesabı/.test(r.err)) {
        this.duyur('Sunucuya yazılamadı: ' + r.err + ' Değişiklik bu cihazda kaldı.', 9000, 'kotu');
        return false;
      }
      this.modulKuyrukEkle(anahtar);
      return false;
    }).catch(() => { this.modulKuyrukEkle(anahtar); return false; });
  }
  modulSurumYaz(anahtar, surum) {
    const s = { ...(this.state.modulSurum || {}), [anahtar]: surum };
    try { localStorage.setItem('ks-modul-surum', JSON.stringify(s)); } catch (e) { /* depolama kapalı */ }
    this.setState({ modulSurum: s });
  }
  // Sunucudan gelen veriyi programın kendi alan adlarına yazar
  modulDurumYaz(anahtar, veri) {
    const alan = MODUL_ALAN[anahtar];
    if (!alan) return;
    try { localStorage.setItem('ks-' + anahtar, JSON.stringify(veri)); } catch (e) { /* depolama kapalı */ }
    this.setState({ [alan]: veri });
  }
  modulKuyrukYaz(k) {
    try { localStorage.setItem('ks-modul-kuyruk', JSON.stringify(k)); } catch (e) { /* depolama kapalı */ }
    this.setState({ modulKuyruk: k });
  }
  modulKuyrukEkle(anahtar) {
    const k = { ...(this.state.modulKuyruk || {}) };
    k[anahtar] = this.damga();
    this.modulKuyrukYaz(k);
  }
  // Sunucudan bütün modülleri okur — girişte ve elle yenilemede çağrılır
  async modulleriYukle(sessiz) {
    const M = this._sb;
    if (!M || !this.state.sunucu) return;
    const r = await M.veriHepsiSurumlu();
    if (!r || !r.ok || !r.data || typeof r.data !== 'object') {
      if (!sessiz) this.duyur('Modül verileri sunucudan okunamadı — cihazdaki kopya kullanılıyor.', 7000, 'kotu');
      return;
    }
    // Gelen biçim: { "ekip": { veri, surum }, ... } — sürüm yazmada geri gönderilir
    const d = {};
    const surumler = {};
    for (const a in r.data) {
      const x = r.data[a];
      if (x && typeof x === 'object' && 'veri' in x) { d[a] = x.veri; surumler[a] = x.surum; }
      else d[a] = x;
    }
    if (Object.keys(surumler).length) {
      try { localStorage.setItem('ks-modul-surum', JSON.stringify(surumler)); } catch (e) { /* depolama kapalı */ }
      this.setState({ modulSurum: surumler });
    }
    // Kuyrukta bekleyen anahtar sunucudan gelenle EZİLMEZ: cihazdaki
    // değişiklik daha yeni, önce o gönderilir.
    const bekleyen = this.state.modulKuyruk || {};
    const yama = {};
    if (!bekleyen.ekip && Array.isArray(d.ekip)) yama.ekipler = d.ekip;
    if (!bekleyen.personel && Array.isArray(d.personel)) yama.personel = d.personel;
    if (!bekleyen.nobet && d.nobet && typeof d.nobet === 'object' && !Array.isArray(d.nobet)) yama.nobet = d.nobet;
    if (!bekleyen.ambar && d.ambar && typeof d.ambar === 'object' && !Array.isArray(d.ambar)) yama.ambar = d.ambar;
    if (!bekleyen.arac && d.arac && typeof d.arac === 'object' && !Array.isArray(d.arac)) yama.arac = d.arac;
    if (!bekleyen.talep && Array.isArray(d.talep)) yama.talepler = d.talep;
    if (!bekleyen.muhtar && Array.isArray(d.muhtar)) yama.muhtarlar = d.muhtar;
    if (!bekleyen.malzeme && Array.isArray(d.malzeme)) yama.malzemeKatalog = d.malzeme;
    if (!bekleyen.siparis && Array.isArray(d.siparis)) yama.siparis = d.siparis;
    if (!bekleyen.modul && d.modul && typeof d.modul === 'object' && !Array.isArray(d.modul)) {
      yama.modul = { ...this.state.modul };
      for (const k in yama.modul) if (k in d.modul) yama.modul[k] = d.modul[k] !== false;
    }
    // Sunucu bomboşsa cihazdaki kopya korunur: ilk kurulumda veri kaybolmasın
    // (Sipariş listesi bundan muaf: boşalmış liste geçerli bir durumdur,
    // yoksa başka cihazda boşaltılan liste burada eski hâliyle kalırdı.)
    for (const k of Object.keys(yama)) {
      if (k === 'siparis') continue;
      const bos =Array.isArray(yama[k]) ? yama[k].length === 0 : Object.keys(yama[k]).length === 0;
      if (bos) delete yama[k];
    }
    if (Object.keys(yama).length) {
      // Cihaz kopyası da tazelenir, çevrimdışı açılışta aynı veri gelsin
      const eslesme = Object.fromEntries(Object.entries(MODUL_ALAN).map(([a, b]) => [b, a]));
      try {
        for (const k in yama) localStorage.setItem('ks-' + eslesme[k], JSON.stringify(yama[k]));
      } catch (e) { /* depolama kapalı */ }
      this.setState(yama);
    }
    const dl = await M.denetimListesi(600);
    if (dl && dl.ok && Array.isArray(dl.data)) {
      const sunucu = dl.data.map(x => ({
        id: 'dz' + x.id, iso: x.olusma, t: this.damgaCevir(x.olusma),
        sinif: x.sinif, ne: x.ne, detay: x.detay || '', kapsam: x.kapsam || '',
        kim: x.kim || '—', rol: x.rol || '', nereden: x.nereden || '',
        cevrimdisi: !!x.cevrimdisi, gonderildi: true
      }));
      // Gönderilmemiş yerel satırlar KORUNUR — yoksa çevrimdışı yapılan iş kaybolur
      const yerel = (this.state.denetim || []).filter(x => x.cevrimdisi && !x.gonderildi);
      if (sunucu.length || yerel.length) {
        const birlesik = [...yerel, ...sunucu]
          .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')))
          .slice(0, DENETIM_SINIR);
        try { localStorage.setItem('ks-denetim', JSON.stringify(birlesik)); } catch (e) { /* depolama kapalı */ }
        this.setState({ denetim: birlesik });
      }
    }
    if (!sessiz) {
      const say = Object.keys(yama).length;
      this.duyur(say
        ? say + ' modülün verisi sunucudan yüklendi — ekip, personel, ambar ve araç kayıtları ortak.'
        : 'Sunucuda henüz modül verisi yok. Girdiğiniz kayıtlar sunucuya yazılacak.', 6000, 'iyi');
    }
  }
  // Bekleyen modülleri sunucuya gönderir
  // Girişte: varsa kuyruk gönderilir, ardından sunucudan okunur
  async modulGirisEsitle() {
    // Saat farkı önce ölçülür: sonraki kayıtların damgası doğru olsun
    await this.saatEsitle();
    if (Object.keys(this.state.modulKuyruk || {}).length) await this.modulKuyrukGonder(true);
    await this.ambarKuyrukGonder();
    await this.modulleriYukle(true);
    await this.talepNoDuzelt();
  }
  // Bağlantı geri geldiğinde bekleyen modülleri kendiliğinden gönderir
  modulKuyrukDene() {
    if (!this._sb || !this.state.sunucu || this.state.offline) return;
    if ((this.state.ambarKuyruk || []).length) this.ambarKuyrukGonder();
    if ((this.state.faults || []).some(f => f.sync === 'pending')) this.arizaKuyrukGonder();
    if ((this.state.talepler || []).some(t => t.noGecici)) this.talepNoDuzelt();
    if (!Object.keys(this.state.modulKuyruk || {}).length) return;
    this.modulKuyrukGonder();
  }
  async modulKuyrukGonder(sessiz) {
    const M = this._sb;
    const kuyruk = { ...(this.state.modulKuyruk || {}) };
    const anahtarlar = Object.keys(kuyruk);
    if (!anahtarlar.length) {
      if ((this.state.ambarKuyruk || []).length) return this.ambarKuyrukGonder();
      if (!sessiz) this.duyur('Sunucuya gönderilecek bekleyen modül yok.', 4000);
      return;
    }
    if (!M || !this.state.sunucu) {
      if (!sessiz) this.duyur('Ortak veritabanına bağlı değilsiniz.', 5000, 'kotu');
      return;
    }
    const veri = Object.fromEntries(Object.entries(MODUL_ALAN).map(([a, alan]) => [a, this.state[alan]]));
    let giden = 0;
    const kalan = {};
    for (const a of anahtarlar) {
      const ok = await this.modulGonder(a, veri[a], 0);
      if (ok) giden++; else kalan[a] = kuyruk[a];
    }
    // Çevrimdışı biriken denetim satırları da gider
    const bekleyenIz = (this.state.denetim || []).filter(x => x.cevrimdisi && !x.gonderildi);
    if (bekleyenIz.length) {
      const r = await M.denetimToplu(bekleyenIz.map(x => ({
        sinif: x.sinif, ne: x.ne, detay: x.detay, kapsam: x.kapsam,
        kim: x.kim, rol: x.rol, nereden: x.nereden, cevrimdisi: true, iso: x.iso
      })));
      if (r && r.ok) {
        const im = new Set(bekleyenIz.map(x => x.id));
        this.setState({ denetim: (this.state.denetim || []).map(x => im.has(x.id) ? { ...x, gonderildi: true } : x) });
      }
    }
    this.modulKuyrukYaz(kalan);
    if (sessiz && !Object.keys(kalan).length && !bekleyenIz.length) return;
    this.duyur(giden + ' modül sunucuya yazıldı'
      + (Object.keys(kalan).length ? ', ' + Object.keys(kalan).length + ' hâlâ bekliyor.' : ', kuyruk boşaldı.')
      + (bekleyenIz.length ? ' ' + bekleyenIz.length + ' denetim satırı gönderildi.' : ''),
      7000, Object.keys(kalan).length ? 'kotu' : 'iyi');
  }