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
  // BAĞLAN / YENİLE düğmesi: neden bağlanamadığını her durumda söyler
  async baglan() {
    const M = this._sb;
    if (!M) {
      this.say('Veritabanı bağlantı dosyası yüklenemedi (supabase-baglanti.js). Dosyanın index.html ile aynı klasörde olduğundan emin olun.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    if (!M.tokenOku()) {
      // Bağlanmanın tek yolu veritabanından giriş: kullanıcıyı elle çıkışa
      // zorlamak yerine giriş ekranını burada açıyoruz.
      const me = this.state.session;
      this._bekleyenHat = null;
      this.setState({
        session: null, autoLogin: false, panel: 'yok', faultForm: null, selected: null,
        loginUser: me ? me.user : '', loginPw: '', remember: true,
        tab: 'harita', scenario: null, newAsset: null,
        loginErr: 'Ortak veritabanına bağlanmak için şifrenizi girin — giriş veritabanından doğrulanacak ve kayıtlar oradan gelecek.'
      });
      return;
    }
    this.say('Veritabanına bağlanılıyor…');
    await this.veriYenile();
  }
  // ── ortak veri: sunucu kaynağın kendisi olur, cihazdaki kopya yalnızca yedek
  // Sunucuya yazılmamış kayıtlar cihazda saklanır: sayfa yenilenince kaybolmasın
  yerelTesisYaz(liste) {
    try {
      if (liste && liste.length) localStorage.setItem('ks-yerel-tesis', JSON.stringify(liste));
      else localStorage.removeItem('ks-yerel-tesis');
    } catch (e) { /* depolama kapalı */ }
  }
  yerelTesisOku() {
    try {
      const v = JSON.parse(localStorage.getItem('ks-yerel-tesis') || 'null');
      // Damgasız eski kayıtlar okunur ama gönderilmez — kullanıcı görür,
      // program kendiliğinden veritabanına yazmaz.
      return Array.isArray(v) ? v.filter(x => x && x.code && x.type) : [];
    } catch (e) { return []; }
  }
  // Çevrimdışı kuyruk: sunucuya yazılmamış kayıtlar bağlantı gelince
  // kendiliğinden gönderilir — kullanıcı düğmeye basmak zorunda değil.
  async kuyrukGonder(sessiz) {
    const M = this._sb;
    if (!M || !M.tokenOku()) return 0;
    if (this.state.offline) return 0;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
    if (this._gonderiyor) return 0;
    // Sunucuda aynı kodda kayıt varsa cihazdaki kopya gönderilmez.
    const sunucuKod = new Set((this.state.assets || [])
      .filter(a => a && a.dbId != null).map(a => String(a.code || '').toUpperCase()));
    // Yalnızca kullanıcının elle açtığı kayıtlar gönderilir (elle: true).
    // Programın ürettiği başlangıç listesi asla veritabanına yazılmaz.
    const bekleyen = (this.state.assets || []).filter(a =>
      a && !a.dbId && a.elle === true && a.code && a.type
      && !sunucuKod.has(String(a.code).toUpperCase()));
    const duzenlenen = (this.state.assets || []).filter(a => a && a.dbId != null && a.sync === 'pending');
    if (!bekleyen.length && !duzenlenen.length) return 0;
    this._gonderiyor = true;
    let yazilan = 0, kilitli = 0, hata = '', kes = false;
    for (const a of bekleyen) {
      if (!this.yazabilir(a)) { kilitli++; continue; }
      let r;
      try { r = await M.tesisKaydet(a); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) {
        yazilan++;
        this.iz(a.id, 'Sunucuya yazıldı', 'Çevrimdışı kuyruktan kendiliğinden gönderildi.');
      } else if (r && r.cevrimdisi) {
        kes = true; break;
      } else if (!hata) {
        hata = (r && r.err) || 'Sunucuya yazılamadı.';
      }
    }
    // Çevrimdışıyken değiştirilen mevcut kayıtlar (alan, aktiflik) de aynı kuyruktan gider
    for (const a of kes ? [] : duzenlenen) {
      if (!this.yazabilir(a)) { kilitli++; continue; }
      let r;
      try { r = await M.tesisKaydet(a); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) {
        yazilan++;
        this.iz(a.id, 'Sunucuya yazıldı', 'Çevrimdışı yapılan değişiklik gönderildi.');
        this.setState(st => ({ assets: (st.assets || []).map(x => x.id === a.id ? { ...x, sync: 'synced' } : x) }));
      } else if (r && r.cevrimdisi) {
        break;
      } else {
        // Sunucu reddetti (başkası bu arada değiştirmiş olabilir): sonsuz denemeye girmez, kullanıcıya söylenir
        this.setState(st => ({ assets: (st.assets || []).map(x => x.id === a.id ? { ...x, sync: 'synced' } : x) }));
        this.duyur(a.code + ' değişikliği gönderilemedi: ' + ((r && r.err) || 'sunucu reddetti') + ' Sunucudaki güncel hâli yüklenecek.', 9000, 'kotu');
        yazilan++;
      }
    }
    if (yazilan) await this.veriYenile(true);
    this._gonderiyor = false;
    if (yazilan) {
      this.duyur(yazilan + ' bekleyen kayıt sunucuya yazıldı — kuyruk boşaltıldı.'
        + (kilitli ? ` ${kilitli} kayıt başka ilçede olduğu için gönderilemedi.` : ''), 6000, 'iyi',
        () => this.setState({ tab: 'kuyruk' }));
    } else if (hata && !sessiz) {
      this.duyur('Kuyruk gönderilemedi: ' + hata, 7000, 'kotu');
    }
    return yazilan;
  }
  // Bağlantı varken bekleyen her şeyi sırayla gönderir:
  // tesis değişiklikleri → notlar → arıza/ambar/modül → fotoğraf ve sesler
  async senkron(sessiz) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !this.state.session || this.state.offline) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (this._senkronda) return;
    this._senkronda = true;
    try {
      if (this._yerelOturum && !(await this.oturumDogrula())) return;
      await this.kuyrukGonder(sessiz);
      await this.notKuyrukGonder();
      this.modulKuyrukDene();
      this.basvuruEsitle();
      await this.hatBekleyenGonder();
      for (const f of (this.state.faults || [])) if (f.ekBekleyen && f.dbId && f.sync !== 'pending') await this.arizaEkGonder(f.id);
      await this.medyaKuyrukGonder();
    } finally { this._senkronda = false; }
  }
  // Sunucudan alınan son veri cihaza yazılır (çevrimdışı açılış için)
  anlikKaydet() {
    const s = this.state;
    if (!this._depo || !s.session) return;
    const varlik = (s.assets || []).filter(a => a && (a.dbId != null || a.elle === true));
    if (!varlik.length) return;
    try {
      const v = JSON.parse(JSON.stringify({
        user: s.session.user, assets: varlik,
        faults: (s.faults || []).map(f => ({ ...f, photos: (f.photos || []).filter(x => !x.file), sesler: [] })),
        notes: s.notes || {}, isEmirleri: s.isEmirleri || [], zaman: s.sonEsitleme
      }));
      this._depo.anlikYaz('anlik', v);
    } catch (e) { /* yazılamadı — bir sonraki değişiklikte yeniden denenir */ }
  }
  // Gönderilmeyi bekleyen kayıt sayısı (üst şerit rozeti için)
  bekleyenEkYenile() {
    const not = this.notKuyrukOku().length;
    const d = this._depo;
    (d ? d.medyaSay() : Promise.resolve(0)).then(medya => {
      const e = this.state.bekleyenEk || {};
      if (e.not !== not || e.medya !== medya) this.setState({ bekleyenEk: { not, medya } });
    });
  }
  notKuyrukOku() {
    try { const v = JSON.parse(localStorage.getItem('ks-not-kuyruk') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  notKuyrukYaz(l) {
    try { localStorage.setItem('ks-not-kuyruk', JSON.stringify(l)); } catch (e) { /* depolama kapalı */ }
    this.bekleyenEkYenile();
  }
  async notKuyrukGonder() {
    const M = this._sb;
    const l = this.notKuyrukOku();
    if (!l.length || !M) return;
    const kalan = []; let n = 0;
    for (let i = 0; i < l.length; i++) {
      let r;
      try { r = await M.notEkle(l[i].dbId, l[i].metin); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) n++;
      else if (r && r.cevrimdisi) { kalan.push(...l.slice(i)); break; }
    }
    this.notKuyrukYaz(kalan);
    if (n) this.veriYenile(true);
  }
  // Bağlantı koptuğu için gönderilemeyen tesis değişikliği: "bekliyor" işaretlenir
  tesisBekle(id) {
    this.setState(st => ({ assets: (st.assets || []).map(x => x.id === id ? { ...x, sync: 'pending' } : x) }));
  }
  async veriYenile(sessiz) {
    const M = this._sb;
    if (!M || !M.tokenOku()) return;
    if (this.state.offline && sessiz) return;
    if (this._anlikYuk) await this._anlikYuk;
    const [t, a, n, ekr] = await Promise.all([
      M.tesisListesi(), M.arizaListesi(),
      M.notListesi ? M.notListesi() : Promise.resolve({ ok: false }),
      M.arizaEkListesi ? M.arizaEkListesi() : Promise.resolve({ ok: false })
    ]);
    const ekHarita = new Map();
    if (ekr && ekr.ok) for (const e of (ekr.data || [])) ekHarita.set(e.ariza_id, {
      slaGun: e.sla_gun, slaIptal: !!e.sla_iptal, slaNot: e.sla_not || '', beklemeBas: e.bekleme_bas || null,
      beklemeDk: e.bekleme_dk || 0, beklemeNeden: e.bekleme_neden || '', anaId: e.ana_ariza_id || null, planli: e.planli_zaman || null
    });
    if (!t.ok) {
      if (!sessiz) this.say(t.cevrimdisi
        ? 'Bağlantı yok — cihazdaki son kopya gösteriliyor. İnternet gelince kendiliğinden güncellenir.'
        : t.err, true);
      return;
    }
    // Gönderilmemiş (çevrimdışı yapılmış) tesis değişiklikleri sunucudaki eski hâliyle ezilmez
    const yerelBek = new Map([...(this._anlikBekleyen || []),
      ...(this.state.assets || []).filter(x => x && x.dbId != null && x.sync === 'pending')].map(x => [x.dbId, x]));
    this._anlikBekleyen = [];
    const assets = (t.data || []).map(M.tesisSuret).map(x => yerelBek.get(x.dbId) ? { ...yerelBek.get(x.dbId), surum: x.surum } : x);
    // Sunucuya henüz yazılmamış (pending) arızalar korunur: yenisi listeye
    // eklenir, değiştirilmişi sunucudaki eski hâlinin yerine geçer
    const bekleyenF = (this.state.faults || []).filter(f => f.sync === 'pending');
    const faults = a.ok
      ? [...bekleyenF.filter(f => !f.dbId),
        ...(a.data || []).map(M.arizaSuret).map(x => ({ photos: [], sesler: [], ...x, ek: ekHarita.get(x.dbId) || null, malzeme: x.malzeme || [], note: x.desc, ilce: x.assetId ? null : x.district }))
          .map(x => bekleyenF.find(y => y.dbId === x.dbId) || x)]
      : this.state.faults;
    const kilitli = assets.filter(x => !x.yazilabilir).length;
    // Saha notları sunucudan geri okunur: her kaydın en son notu not alanında görünür
    let notes = this.state.notes;
    if (n && n.ok) {
      const kimlik = {};
      assets.forEach(x => { if (x.dbId != null) kimlik[x.dbId] = x.id; });
      const enYeni = {};
      for (const r of (n.data || [])) {
        const metin = String(r.metin || '');
        if (!metin || metin.startsWith('BAKIM ')) continue;
        const id = kimlik[r.tesis_id];
        if (!id) continue;
        const z = String(r.yazildi || '');
        if (!enYeni[id] || z >= enYeni[id].z) enYeni[id] = { z, metin };
      }
      notes = { ...this.state.notes };
      for (const k in enYeni) notes[k] = enYeni[k].metin;
    }
    // Sunucuya henüz ulaşmamış yerel kayıtlar korunur; yoksa yenileme sırasında
    // ekrandan kaybolup sonra geri gelmiş gibi görünüyordu.
    const sunucuKod = new Set(assets.map(x => String(x.code || '').toUpperCase()));
    const yerel = (this.state.assets || []).filter(x =>
      x && !x.dbId && !sunucuKod.has(String(x.code || '').toUpperCase()));
    const birlesik = yerel.length ? [...yerel, ...assets] : assets;
    this.yerelTesisYaz(yerel);
    this.setState({ assets: birlesik, faults, notes, sunucu: true, sonEsitleme: this.damga() },
      () => { this.fotoNiyetGeriYukle(); this.hatYenile(); this.ekKoyYenile(); });
    if (yerel.length) {
      if (!sessiz) this.duyur(yerel.length + ' kayıt henüz sunucuya yazılmadı — bağlantı varken kendiliğinden gönderilir.', 6000);
      if (!this._gonderiyor) setTimeout(() => this.kuyrukGonder(true), 500);
    }
    this.copYenile().then(() => this.kodDenetle());
    this.isEmriYenile();
    this.basvuruYenile();
    if (bekleyenF.length) setTimeout(() => this.arizaKuyrukGonder(), 300);
    if (assets.some(x => x.sync === 'pending')) setTimeout(() => this.kuyrukGonder(true), 600);
    // Haritanın işaretleri de yenilenir: kimlikler uyuşmazsa tıklama boşa gider
    this.toMap({ ks: 'assets', assets: birlesik, faults });
    if (!sessiz) {
      const me = this.state.session;
      const bolge = me && me.bolge ? me.bolge : null;
      this.duyur(kilitli && bolge
        ? `${assets.length} tesis · ${faults.length} arıza yüklendi — ${bolge} ilçesindeki ${assets.length - kilitli} kayıtta değişiklik yapabilirsiniz.`
        : `${assets.length} tesis · ${faults.length} arıza yüklendi.`, 4000);
    }
  }