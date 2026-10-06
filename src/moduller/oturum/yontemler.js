  forget(quiet) {
    try { localStorage.removeItem(SES_KEY); } catch (e) { /* depolama kapalı */ }
    // Sunucu oturumu da düşer: aksi halde anahtar cihazda kalır ve
    // sayfa yenilenince bir sonraki kişiyi kendiliğinden içeri alır
    const M = this._sb;
    if (M) { M.cikis(); M.tokenYaz(null); }
    try { localStorage.removeItem('ks-oturum-profil'); } catch (e) { /* depolama kapalı */ }
    this.setState({
      session: null, autoLogin: false, remember: false,
      loginUser: '', loginPw: '', loginErr: '', tab: 'harita',
      panel: 'donusum', faultForm: null, selected: null, scenario: null, newAsset: null
    });
    this._bekleyenHat = null;
    if (!quiet) this.say('Bu cihazda kayıtlı giriş silindi — programı bir daha açtığınızda kullanıcı adı ve şifre istenir.');
    return true;
  }
  // ── kullanıcı listesi bu cihazda saklanır; Supabase bağlanınca kullanicilar tablosuna gider
  // Sayfa yetkileri kullanıcı adına göre ayrı anahtarda durur: sunucu listesi yenilenince silinmesin
  yetkiTablo() {
    if (this._yetki) return this._yetki;
    try {
      const v = JSON.parse(localStorage.getItem('ks-sayfa-yetki') || 'null');
      this._yetki = v && typeof v === 'object' ? v : {};
    } catch (e) { this._yetki = {}; }
    return this._yetki;
  }
  userSuret(u) {
    const y = this.yetkiTablo()[u.user];
    const ist = this.istisnaTablo()[u.user];
    return { ...u, sayfalar: y || u.sayfalar || null, istisna: ist || u.istisna || null, roleLabel: ROLE_LABEL[u.role] || u.role,
      desc: (ROLE_ORDER.find(r => r[0] === u.role) || [])[2], aktif: u.aktif !== false };
  }
  // Sayfa yetkisi kullanıcı kaydında durur: yok = menüde çıkmaz, gor = açar ama kaydedemez, tam = serbest
  sayfaYetkiYaz(uid, sid, v) {
    const hedef = this.state.users.find(x => x.id === uid);
    const yeniYetki = { ...((hedef && hedef.sayfalar) || {}), [sid]: v };
    const tablo = { ...this.yetkiTablo() };
    if (hedef) tablo[hedef.user] = yeniYetki;
    this._yetki = tablo;
    try { localStorage.setItem('ks-sayfa-yetki', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    const list = this.state.users.map(u => u.id === uid ? { ...u, sayfalar: yeniYetki } : u);
    this.usersKaydet(list);
    const u = list.find(x => x.id === uid);
    const me = this.state.session;
    if (me && me.id === uid) this.setState({ session: { ...me, sayfalar: u.sayfalar } });
    const ad = SUZGEC_ESKI_AD[sid] || (SAYFALAR.find(x => x[0] === sid) || [, sid])[1];
    const ne = v === 'yok' ? 'menüsünden kaldırıldı' : (v === 'gor' ? 'yalnızca görüntüleme oldu' : 'tam yetkili oldu');
    const sunucuya = this.yetkiGonder(u, yeniYetki, (u && u.istisna) || {});
    this.duyur(`${u ? u.name : ''} · ${ad} sayfası ${ne}.`
      + (sunucuya ? ' Yetki sunucuya yazıldı — bütün cihazlarda geçerli.' : ' Yetki bu cihazda saklanır.'), 5000, 'iyi');
  }
  // Rol paketi varsayılan; kişi kaydındaki istisna yalnızca farkı taşır
  yetkiVar(u, k) {
    if (!u) return false;
    const rolVar = (CAN[k] || []).includes(u.role);
    if (ISTISNA_DISI.includes(k) || u.role === 'yonetici') return rolVar;
    const ist = (u.istisna || {})[k];
    return ist === undefined || ist === null ? rolVar : !!ist;
  }
  istisnaYaz(uid, k, deger) {
    if (ISTISNA_DISI.includes(k)) return;
    const hedef = this.state.users.find(x => x.id === uid);
    if (!hedef) return;
    if (hedef.role === 'yonetici') {
      return this.duyur('Yönetici rolünün yetkileri kısıtlanamaz — sistem yönetimsiz kalmasın diye bu rol istisna kabul etmiyor.', 6000, 'kotu');
    }
    const rolVar = (CAN[k] || []).includes(hedef.role);
    const ist = { ...(hedef.istisna || {}) };
    if (deger === rolVar) delete ist[k]; else ist[k] = deger;
    const tablo = { ...this.istisnaTablo() };
    tablo[hedef.user] = ist;
    this._istisna = tablo;
    try { localStorage.setItem('ks-yetki-istisna', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    const list = this.state.users.map(u => u.id === uid ? { ...u, istisna: ist } : u);
    this.usersKaydet(list);
    const me = this.state.session;
    if (me && me.id === uid) this.setState({ session: { ...me, istisna: ist } });
    const ad = (PERMS.find(p => p[0] === k) || [, k])[1];
    this.yetkiGonder(hedef, hedef.sayfalar || {}, ist);
    this.duyur(hedef.name + ' · ' + ad + ' → ' + (deger ? 'verildi' : 'kaldırıldı')
      + (deger === rolVar ? ' (rol paketiyle aynı, istisna silindi)' : ' (rolden farklı, istisna olarak işlendi)'), 6000, 'iyi');
  }
  istisnaTablo() {
    if (this._istisna) return this._istisna;
    try {
      const v = JSON.parse(localStorage.getItem('ks-yetki-istisna') || 'null');
      this._istisna = v && typeof v === 'object' ? v : {};
    } catch (e) { this._istisna = {}; }
    return this._istisna;
  }
  usersOku() {
    try {
      const list = JSON.parse(localStorage.getItem('ks-users') || 'null');
      if (Array.isArray(list) && list.length) return list.map(u => this.userSuret(u));
    } catch (e) { /* depolama kapalı veya bozuk kayıt */ }
    return [];
  }
  // ── veritabanı bağlantısı
  async anahtarlaGir(M) {
    if (!M.tokenOku()) return;
    // İnternet yoksa ya da sunucu 7 sn içinde yanıt vermezse (köyde zayıf çekim)
    // oturum cihazdaki kopyadan açılır; giriş ekranında beklenmez.
    let r;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) r = { ok: false, cevrimdisi: true };
    else r = await Promise.race([M.oturumAc(), new Promise(res => setTimeout(() => res({ ok: false, cevrimdisi: true }), 7000))]);
    if (!r.ok) {
      if (!r.cevrimdisi) { M.tokenYaz(null); return; }
      return this.cevrimdisiAc();
    }
    const u = M.suret(r.data);
    if (u.mustChange) return this.setState({ pwForm: { user: u.user, yeni: '', tekrar: '', err: '' } });
    this.oturumKur(u, true);
  }
  // Çevrimdışı açılış: son başarılı girişin profili ve sunucudan son alınan veri cihazdan okunur
  async cevrimdisiAc() {
    let u = null;
    try { u = JSON.parse(localStorage.getItem('ks-oturum-profil') || 'null'); } catch (e) { /* bozuk kayıt */ }
    if (!u || !u.user || u.mustChange) return;
    const d = await this._depoYuk;
    const an = d ? await d.anlikOku('anlik') : null;
    const v = an && an.v && an.v.user === u.user ? an.v : null;
    this._yerelOturum = true;
    if (v) {
      this._anlikUygulandi = true;
      const bekF = (this.state.faults || []).filter(f => f.sync === 'pending');
      const faults = [...bekF.filter(f => !f.dbId),
        ...(v.faults || []).map(x => bekF.find(y => y.dbId && y.dbId === x.dbId) || x)];
      const kod = new Set((v.assets || []).map(x => String(x.code || '').toUpperCase()));
      const yerel = this.yerelTesisOku().filter(x => !kod.has(String(x.code || '').toUpperCase()));
      await new Promise(res => this.setState({
        assets: [...yerel, ...(v.assets || [])], faults, notes: { ...this.state.notes, ...(v.notes || {}) },
        isEmirleri: v.isEmirleri || [], sonEsitleme: v.zaman || this.damga()
      }, res));
    }
    this.oturumKur(u, true, true);
    this.duyur(v ? 'İnternet yok — telefondaki son kayıtlarla açıldı. Yaptığınız her şey saklanır, internet gelince kendiliğinden gider.'
      : 'İnternet yok — telefonda kayıtlı veri bulunamadı. Bir kez internetle girip veriyi yükleyin.', 7000, v ? 'bilgi' : 'kotu');
  }
  oturumKur(u, sunucudan, yerel) {
    this._prefYuklendi = true;
    if (sunucudan && !yerel) { try { localStorage.setItem('ks-oturum-profil', JSON.stringify(u)); } catch (e) { /* depolama kapalı */ } }
    this.setState({
      session: u, role: ROLE_LABEL[u.role] || u.role, autoLogin: !!sunucudan,
      loginUser: u.user, loginErr: '', pwForm: null,
      sunucu: !!sunucudan, tab: 'harita', ...(yerel ? { offline: true } : {}), ...this.prefOku(u)
    }, () => {
      this.denetimYaz('oturum', 'Giriş yapıldı',
        (ROLE_LABEL[u.role] || u.role) + ' · ' + (sunucudan ? 'ortak veritabanı' : 'cihaz kopyası'), u.user);
      this.prefUygula();
      if (sunucudan && !yerel) {
        this.usersYenile();
        // "Giriş yap" her açılışta elle basılıyor (gerçek otomatik giriş yok —
        // bkz. componentDidMount, yalnız alanları dolduruyor). Bu yüzden
        // "X tesis yüklendi" bildirimi her açılışta tekrarlıyordu; sessiz
        // yapıldı. Bağlantı/yükleme hatası olursa doLogin zaten loginErr ile
        // ekranda gösteriyor, burada ayrıca uyarmaya gerek yok.
        this.veriYenile(true);
        // Önce bekleyen değişiklikler gider, sonra sunucudan okunur:
        // tersi olursa cihazdaki yeni kayıt eski sunucu verisiyle ezilir.
        this.modulGirisEsitle();
      }
    });
  }
  // Çevrimdışı açılan oturum internet gelince sunucuda doğrulanır
  async oturumDogrula() {
    const M = this._sb;
    const r = await Promise.race([M.oturumAc(), new Promise(res => setTimeout(() => res({ ok: false, cevrimdisi: true }), 8000))]);
    if (r.ok) {
      this._yerelOturum = false;
      const u = M.suret(r.data);
      try { localStorage.setItem('ks-oturum-profil', JSON.stringify(u)); } catch (e) { /* depolama kapalı */ }
      this.usersYenile();
      this.modulGirisEsitle();
      await this.veriYenile(true);
      return true;
    }
    if (!r.cevrimdisi) {
      M.tokenYaz(null);
      try { localStorage.removeItem('ks-oturum-profil'); } catch (e) { /* depolama kapalı */ }
      this._yerelOturum = false;
      this.setState({
        session: null, autoLogin: false, panel: 'yok', faultForm: null, selected: null, tab: 'harita',
        loginErr: 'Oturum süresi dolmuş — şifrenizi girin. Telefondaki bekleyen kayıtlar korunuyor, girişten sonra gönderilir.'
      });
    }
    return false;
  }
  // Yazma yetkisi: kural sunucuda; buradaki denetim yalnızca ekranı doğru göstermek için
  yazabilir(a) {
    const me = this.state.session;
    if (!me) return false;
    if (!this.state.sunucu) return true;
    if (me.role === 'yonetici' || me.role === 'mudur') return true;
    if (!me.bolge) return true;
    if (!a) return true;
    return (a.district || '').toLowerCase() === me.bolge.toLowerCase();
  }
  kilitUyar(a) {
    const me = this.state.session;
    this.say(`${a.code} ${a.district} ilçesinde. Sizin sorumluluk bölgeniz ${me && me.bolge ? me.bolge : '—'} — kaydı görebilirsiniz ama değiştiremezsiniz. Değişiklik için ilçe sorumlusuna veya müdüre başvurun.`, true);
    setTimeout(() => this.setState({ toast: null }), 8000);
  }
  async usersYenile() {
    const M = this._sb;
    if (!M) return;
    const r = await M.kullaniciListesi();
    if (!r.ok || !Array.isArray(r.data)) return;
    this.usersKaydet(r.data.map(M.suret));
    this.yetkiYenile();
  }
  // Sayfa yetkileri ve yetki istisnaları kullanıcı kaydıyla birlikte sunucuda
  // durur: bir cihazda verilen yetki bütün cihazlarda geçerli
  async yetkiYenile() {
    const M = this._sb;
    if (!M || !M.yetkiListesi || !M.tokenOku()) return;
    let r;
    try { r = await M.yetkiListesi(); } catch (e) { return; }
    if (!r.ok || !Array.isArray(r.data)) return;
    const y = {}, ist = {};
    for (const k of r.data) {
      const sy = k.sayfa_yetki, yi = k.yetki_istisna;
      if (sy && typeof sy === 'object' && Object.keys(sy).length) y[k.kullanici_ad] = sy;
      if (yi && typeof yi === 'object' && Object.keys(yi).length) ist[k.kullanici_ad] = yi;
    }
    this._yetki = y; this._istisna = ist;
    try {
      localStorage.setItem('ks-sayfa-yetki', JSON.stringify(y));
      localStorage.setItem('ks-yetki-istisna', JSON.stringify(ist));
    } catch (e) { /* depolama kapalı */ }
    const list = (this.state.users || []).map(u => this.userSuret(u));
    this.setState({ users: list });
    const me = this.state.session;
    if (!me) return;
    const g = list.find(x => x.user === me.user);
    if (g) this.setState({ session: { ...me, sayfalar: g.sayfalar, istisna: g.istisna } });
  }
  // Yetki değişikliğini sunucuya yazar (yalnızca yönetici yazabilir)
  yetkiGonder(u, sayfalar, istisna) {
    const M = this._sb;
    if (!u || !u.dbId || !M || !M.yetkiKaydet || !M.tokenOku() || this.state.offline) return false;
    M.yetkiKaydet(u.dbId, sayfalar || {}, istisna || {}).then(r => {
      if (!r.ok && !r.cevrimdisi) this.duyur('Yetki sunucuya yazılamadı: ' + r.err, 8000, 'kotu');
    });
    return true;
  }
  // Yönetici işlemleri internet ister: çevrimdışı eklenen hesap eşitlenirken çakışır
  async yonetIsle(isim, fn) {
    const M = this._sb;
    if (!M) return this.say('Kullanıcı işlemleri internet bağlantısı gerektirir.');
    const r = await fn(M);
    if (!r.ok) return this.say(r.cevrimdisi ? 'Bağlantı yok — kullanıcı işlemleri internet gerektirir.' : r.err, true);
    await this.usersYenile();
    if (isim) this.say(isim, true);
    setTimeout(() => this.setState({ toast: null }), 7000);
    return r;
  }
  usersKaydet(list) {
    const n = list.map(u => this.userSuret(u));
    try {
      localStorage.setItem('ks-users', JSON.stringify(n.map(u => ({
        id: u.id, name: u.name, user: u.user, role: u.role, crew: u.crew || null,
        pw: u.pw, tel: u.tel || '', unvan: u.unvan || '', bolge: u.bolge || '',
        aktif: u.aktif !== false, mustChange: !!u.mustChange, eklendi: u.eklendi || null,
        sayfalar: u.sayfalar || null, istisna: u.istisna || null
      }))));
    } catch (e) { /* depolama kapalı */ }
    this.setState({ users: n });
    return n;
  }
  async pwDegistir() {
    const f = this.state.pwForm;
    if (!f) return;
    if ((f.yeni || '').length < 4) return this.setState({ pwForm: { ...f, err: 'Şifre en az 4 karakter olmalı.' } });
    if (f.yeni !== f.tekrar) return this.setState({ pwForm: { ...f, err: 'İki şifre aynı değil.' } });
    const M = this._sb;
    if (M && M.tokenOku()) {
      const r = await M.sifreDegistir(f.yeni);
      if (!r.ok) return this.setState({ pwForm: { ...f, err: r.cevrimdisi ? 'Bağlantı yok — şifre değiştirmek internet gerektirir.' : r.err } });
      const o = await M.oturumAc();
      if (o.ok) {
        this.girisKaydet(f.user, f.yeni);
        this.oturumKur(M.suret(o.data), true);
        return this.say('Şifreniz değiştirildi.');
      }
    }
    const list = this.usersKaydet(this.state.users.map(u =>
      u.user === f.user ? { ...u, pw: f.yeni, mustChange: false } : u));
    const u = list.find(x => x.user === f.user);
    this.girisKaydet(u.user, f.yeni);
    this._prefYuklendi = true;
    this.setState({ pwForm: null, session: u, role: u.roleLabel, tab: 'harita', loginPw: '', loginUser: u.user, ...this.prefOku(u) },
      () => { this.prefUygula(); this.say('Şifreniz değiştirildi.'); });
  }
  // Kayıtlı giriş tek yerden yazılır: sunucudan da, cihazdan da giriliyor olsa
  // "Beni hatırla" aynı şekilde davranır.
  girisKaydet(user, pw) {
    try {
      if (this.state.remember && user && pw) localStorage.setItem(SES_KEY, JSON.stringify({ user, pw }));
      else localStorage.removeItem(SES_KEY);
    } catch (e) { /* depolama kapalı */ }
  }
  async doLogin() {
    const name = this.state.loginUser.trim().toLowerCase();
    // Bağlantı dosyası hâlâ yükleniyorsa bekle: yoksa giriş cihazdaki
    // kopyadan doğrulanır ve oturum veritabanına bağlanmadan açılır.
    if (!this._sb && this._sbYuk) {
      this.setState({ loginErr: 'Veritabanına bağlanılıyor…' });
      try { await this._sbYuk; } catch (e) { /* bağlantı kurulamadı */ }
    }
    const M = this._sb;
    if (M) {
      const r = await M.giris(name, this.state.loginPw, this.state.device === 'phone' ? 'Telefon' : 'Bilgisayar');
      if (r.ok) {
        const u = M.suret(r.data);
        if (u.mustChange) return this.setState({ pwForm: { user: u.user, yeni: '', tekrar: '', err: '' }, loginPw: '', loginErr: '' });
        this.girisKaydet(u.user, this.state.loginPw);
        return this.oturumKur(u, true);
      }
      // sunucu cevap verdi ve reddettiyse cihazdaki listeye düşmeyiz
      if (!r.cevrimdisi) {
        const kurulum = /crypt|does not exist|function .* does not/i.test(r.err || '');
        return this.setState({ loginErr: kurulum
          ? 'Veritabanı kurulumu tamamlanmamış: şifre doğrulama fonksiyonu çalışmıyor. supabase/duzeltme-02.sql dosyasını SQL Editor’de çalıştırın.'
          : r.err });
      }
    }
    return this.yerelGiris(name);
  }
  yerelGiris(name) {
    const list = this.state.users;
    const u = list.find(x => x.user === name);
    if (!u) return this.setState({ loginErr: 'Böyle bir kullanıcı adı yok.' });
    if (u.aktif === false) return this.setState({ loginErr: 'Bu hesap kapatıldı — yöneticiye başvurun.' });
    const pw = this.state.loginPw;
    if (pw !== u.pw) return this.setState({ loginErr: 'Şifre hatalı.' });
    if (u.mustChange) return this.setState({ pwForm: { user: u.user, yeni: '', tekrar: '', err: '' }, loginPw: '', loginErr: '' });
    this.girisKaydet(u.user, pw);
    this._prefYuklendi = true;
    this.setState({ session: u, role: u.roleLabel, tab: 'harita', loginPw: '', loginErr: '', ...this.prefOku(u) }, () => this.prefUygula());
  }