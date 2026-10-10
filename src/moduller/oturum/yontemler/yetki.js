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
    if (ISTISNA_DISI.includes(k)) return rolVar;
    const ist = (u.istisna || {})[k];
    // Yönetici rolünün yetkisi kısıtlanamaz; günlük iş açma/atama rolünde yoktur, gerekirse kendine (ya da bir vekile) Yetkiler'den verilir
    if (u.role === 'yonetici') return rolVar || ist === true;
    return ist === undefined || ist === null ? rolVar : !!ist;
  }
  istisnaYaz(uid, k, deger) {
    if (ISTISNA_DISI.includes(k)) return;
    const hedef = this.state.users.find(x => x.id === uid);
    if (!hedef) return;
    const rolVar = (CAN[k] || []).includes(hedef.role);
    if (hedef.role === 'yonetici' && rolVar && !deger) {
      return this.duyur('Yönetici rolünün bu yetkisi kısıtlanamaz — sistem yönetimsiz kalmasın diye. Rolünde olmayan yetkiyi ise verebilirsiniz.', 6000, 'kotu');
    }
    const ist = { ...(hedef.istisna || {}) };
    if (deger === rolVar) delete ist[k]; else ist[k] = deger;
    const ad = (PERMS.find(p => p[0] === k) || [, k])[1];
    this.istisnaUygula(hedef, ist, hedef.name + ' · ' + ad + ' → ' + (deger ? 'verildi' : 'kaldırıldı')
      + (deger === rolVar ? ' (rol paketiyle aynı, istisna silindi)' : ' (rolden farklı, istisna olarak işlendi)'));
  }
  // Müdür vekâleti: müdür izindeyken onay yetkileri (son onay + malzeme isteği onayı) tek hamlede başka kişiye verilir / geri alınır
  vekaletYaz(uid, ver) {
    const hedef = this.state.users.find(x => x.id === uid);
    if (!hedef) return;
    const ist = { ...(hedef.istisna || {}) };
    for (const k of ['close', 'stokSiparisOnay']) {
      const rolVar = (CAN[k] || []).includes(hedef.role);
      if (ver === rolVar) delete ist[k]; else ist[k] = ver;
    }
    this.istisnaUygula(hedef, ist, hedef.name + (ver ? ' · müdür vekâleti verildi: arıza/iş emri son onayı ve malzeme isteği onayı. İş dönünce Yetkiler’den geri alın.' : ' · müdür vekâleti kaldırıldı.'));
  }
  istisnaUygula(hedef, ist, mesaj) {
    const uid = hedef.id;
    const tablo = { ...this.istisnaTablo() };
    tablo[hedef.user] = ist;
    this._istisna = tablo;
    try { localStorage.setItem('ks-yetki-istisna', JSON.stringify(tablo)); } catch (e) { /* depolama kapalı */ }
    const list = this.state.users.map(u => u.id === uid ? { ...u, istisna: ist } : u);
    this.usersKaydet(list);
    const me = this.state.session;
    if (me && me.id === uid) this.setState({ session: { ...me, istisna: ist } });
    this.yetkiGonder(hedef, hedef.sayfalar || {}, ist);
    this.denetimYaz('yetki', 'Yetki istisnası', mesaj, hedef.user || '');
    this.duyur(mesaj, 7000, 'iyi');
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