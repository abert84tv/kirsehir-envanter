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