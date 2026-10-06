  olcCihaz() {
    const w = (typeof window !== 'undefined' && window.innerWidth) || 1440;
    return w < 820 ? 'phone' : 'desktop';
  }
  cihazUygula(mode) {
    const m = mode || this.state.deviceMode;
    this.setState({ device: m === 'auto' ? this.olcCihaz() : m });
  }
  componentWillUnmount() {
    if (this._rs) window.removeEventListener('resize', this._rs);
    if (this._esc) window.removeEventListener('keydown', this._esc);
    if (this._msg) window.removeEventListener('message', this._msg);
    if (this._katSaat) clearInterval(this._katSaat);
    if (this._olcKat) { window.removeEventListener('resize', this._olcKat); window.removeEventListener('orientationchange', this._olcKat); }
  }
  componentDidMount() {
    let dm = 'auto';
    try { dm = localStorage.getItem('ks-device-mode') || 'auto'; } catch (e) { /* depolama kapalı */ }
    this.setState({ deviceMode: dm, device: dm === 'auto' ? this.olcCihaz() : dm, users: this.usersOku() });
    try {
      const yv = JSON.parse(localStorage.getItem('ks-yerlesim-veri') || 'null');
      if (yv && typeof yv === 'object') this.setState({ yerlesimVeri: yv });
      const ht = JSON.parse(localStorage.getItem('ks-hatlar') || 'null');
      if (ht && typeof ht === 'object') this.setState({ hatlar: ht }, () => setTimeout(() => this.hatlariYolla(), 900));
      const ek = JSON.parse(localStorage.getItem('ks-ek-koyler') || 'null');
      if (ek && typeof ek === 'object') this.setState({ ekKoyler: ek });
    } catch (e) { /* depolama kapalı */ }
    // Son bilinen saat farkı: çevrimdışı açılışta da doğru damga üretilsin
    this._saatFarki = (() => {
      const v = parseInt(localStorage.getItem('ks-saat-farki') || '0', 10);
      return isNaN(v) ? 0 : v;
    })();
    // Cihaz deposu (IndexedDB) ve çevrimdışı çalışma için servis çalışanı
    this._depoYuk = import('./cihaz-depo.js').then(d => {
      this._depo = d; d.kaliciIste(); this.bekleyenEkYenile(); return d;
    }).catch(() => null);
    // Sunucudan son alınan veride gönderilmemiş tesis değişikliği varsa veriYenile onu ezmesin
    this._anlikYuk = this._depoYuk.then(d => d ? d.anlikOku('anlik') : null).then(an => {
      this._anlikBekleyen = an && an.v ? (an.v.assets || []).filter(a => a && a.dbId != null && a.sync === 'pending') : [];
    }).catch(() => { this._anlikBekleyen = []; });
    try {
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('/sw.js').catch(() => {});
    } catch (e) { /* desteklenmiyor */ }
    this._sbYuk = import('./supabase-baglanti.js').then(M => { this._sb = M; this.setState({ sbHazir: true }); return M; });
    this._sbYuk.catch(() => { /* bağlantı dosyası yüklenemedi — program cihazdaki kopyayla çalışır */ });
    // Kayıtlı oturum anahtarı varsa sunucuda doğrulanır ve giriş ekranı hiç
    // gösterilmeden doğrudan içeri girilir — "Beni hatırla" işaretli her
    // girişte token zaten yazılıyor (bkz. supabase-baglanti.js giris()),
    // eksik olan yalnızca açılışta bunu kullanmaktı.
    (async () => {
      try {
        const M = await this._sbYuk;
        if (M) await this.anahtarlaGir(M);
      } catch (e) { /* token geçersiz ya da bağlantı yok — giriş ekranı gösterilir */ }
      this.setState({ oturumKontrol: false });
    })();
    this._rs = () => { if (this.state.deviceMode === 'auto') this.cihazUygula('auto'); };
    window.addEventListener('resize', this._rs);
    // Telefon katmanları: üst çubuğun alt kenarı ve alt menünün yüksekliği CSS
    // değişkenine yazılır; açılan paneller bu değerlere yaslanır, üst üste binmez.
    this._olcKat = () => {
      const r = document.documentElement;
      const b = document.getElementById('tel-bas');
      const n = document.getElementById('tel-nav');
      // Eleman yoksa varsayılan (58/60) korunur — 0 yazmak panelleri çakıştırır
      if (b) { const bv = Math.round(b.getBoundingClientRect().bottom); if (bv > 0 && this._katB !== bv) { this._katB = bv; r.style.setProperty('--tel-bas', bv + 'px'); } }
      if (n) { const nv = Math.round(n.getBoundingClientRect().height); if (nv > 0 && this._katN !== nv) { this._katN = nv; r.style.setProperty('--tel-nav', nv + 'px'); } }
    };
    this._olcKat();
    requestAnimationFrame(this._olcKat);
    this._katSaat = setInterval(this._olcKat, 1500);
    window.addEventListener('resize', this._olcKat);
    window.addEventListener('orientationchange', this._olcKat);
    // Bağlantı gelince çevrimdışı kuyruk kendiliğinden boşalır; dakikada bir de denenir
    // Bağlantı kendiliğinden izlenir: kopunca "çevrimdışı"na geçer, gelince bekleyen
    // her şey (tesis, not, arıza, ambar, modül, fotoğraf) sırayla gönderilir. Üst
    // şeritten elle çevrimdışına alınmışsa kendiliğinden çıkılmaz.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) this.setState({ offline: true });
    this._agGitti = () => {
      if (this.state.offline) return;
      this.setState({ offline: true });
      this.duyur('İnternet kesildi — çalışmaya devam edin, kayıtlar telefonda saklanıyor.', 5000, 'bilgi');
    };
    this._agGeldi = () => {
      if (this._elleCevrimdisi) return;
      if (this.state.offline) { this.setState({ offline: false }); this.duyur('İnternet geldi — bekleyen kayıtlar gönderiliyor.', 4500, 'iyi'); }
      setTimeout(() => this.senkron(true), 1500);
    };
    window.addEventListener('online', this._agGeldi);
    window.addEventListener('offline', this._agGitti);
    this._gorunur = () => { if (!document.hidden) this.senkron(true); };
    document.addEventListener('visibilitychange', this._gorunur);
    this._kuyrukSaat = setInterval(() => { this.senkron(true); this.planliKontrol(); this.aracBelgeUyari(); this.isEmriTamamla(); }, 60000);
    // Ses kilidi: tarayıcı sesi ilk dokunuşa kadar kapalı tutar; her dokunuşta ses bağlamı uyandırılır
    this._sesAc = () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._ac = this._ac || new AC();
        const k = () => { if (this._ac.state === 'running' && !this.state.sesAcik) this.setState({ sesAcik: true }); };
        if (this._ac.state === 'suspended') this._ac.resume().then(k).catch(() => {}); else k();
      } catch (e) { /* ses yok */ }
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, this._sesAc, { passive: true }));
    this._uyariTekrar = setInterval(() => { if (this.state.basvuruUyari) this.uyariSesi(); }, 6000);
    this._basvuruSaat = setInterval(() => { if (this.state.session && !document.hidden) this.basvuruYenile(); }, 30000);
    // Tarayıcı bildirimi izni, ilk dokunuşta bir kez istenir (izin yalnız kullanıcı hareketiyle sorulabilir)
    this._izinIste = () => { try { if (typeof Notification !== 'undefined' && Notification.permission === 'default' && this.state.session) Notification.requestPermission(); } catch (e) { /* desteklenmiyor */ } document.removeEventListener('pointerdown', this._izinIste); };
    document.addEventListener('pointerdown', this._izinIste);
    setTimeout(() => this.aracBelgeUyari(), 9000);
    // Başka kullanıcının yaptığı değişiklik (silme dahil) bu cihazda otomatik
    // görünsün diye — sessiz, yalnızca oturum açıkken. Düzenleme formu açıkken
    // veriYenile ekranı altından değiştirmesin diye o an atlanır.
    this._veriSaat = setInterval(() => {
      if (this.state.session && !this.state.scenario) this.veriYenile(true);
      if (this.state.session && this.state.tab === 'telemetri') this.telemetriYenile(true);
    }, 30000);
    // Esc: açık form ve panelleri kapatır
    this._esc = e => {
      if (e.key !== 'Escape') return;
      if (this.state.hatTam) return this.setState({ hatTam: false });
      if (this.state.alanForm) return this.setState({ alanForm: null });
      if (this.state.card) return this.setState({ card: null });
      if (this.state.userForm) return this.setState({ userForm: null });
      if (this.state.panel && this.state.panel !== 'yok') this.setState({ panel: 'yok', faultForm: null });
    };
    window.addEventListener('keydown', this._esc);
    try {
      const raw = localStorage.getItem(SES_KEY);
      if (raw) {
        const sv = JSON.parse(raw);
        if (sv && sv.user) this.setState({ loginUser: sv.user, loginPw: sv.pw || '', remember: true });
      }
    } catch (e) { /* depolama kapalı veya bozuk kayıt */ }
    import('./koyler.js').then(k => { this._yer = k.YERLESIM; this.forceUpdate(); }).catch(() => {});
    Promise.all([import('./kirsehir-data.js'), import('./envanter.js')]).then(([m, env]) => {
      const { assets, faults } = env.buildAssets(m);
      // Cihazda bekleyen (sunucuya yazılmamış) kayıtlar listenin başına döner
      const yerel = this.yerelTesisOku();
      const kod = new Set(assets.map(x => String(x.code || '').toUpperCase()));
      const bekleyen = yerel.filter(x => !kod.has(String(x.code || '').toUpperCase()));
      // Çevrimdışı açılışta cihazdaki son sunucu kopyası zaten yüklendi: örnek veriyle ezilmez
      this.setState(this._anlikUygulandi
        ? { data: m, center: { lat: 39.16, lon: 34.12 } }
        : { data: m, assets: [...bekleyen, ...assets], faults, center: { lat: 39.16, lon: 34.12 } },
        () => { this.fotoNiyetGeriYukle(); this.kodDenetle(); this.ekKoyYenile(); });
    });
    this._msg = e => {
      const d = e.data || {};
      if (d.ks === 'ready') this.pushMap();
      if (d.ks === 'hatKatman') {
        try { localStorage.setItem('ks-hat-katman', d.on ? '1' : '0'); } catch (e) { /* depolama kapalı */ }
        this.setState({ hatKatman: !!d.on });
      }
      if (d.ks === 'coordMode') { this.setState({ picked: null }); return; }
      // Haritadaki arıza noktasına dokunuldu: arıza açılır
      if (d.ks === 'arizaAc') {
        const f = (this.state.faults || []).find(x => x.id === d.id);
        if (f) this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, photos: [], ...f } });
        return;
      }
      if (d.ks === 'konum') { this.setState({ benimKonum: { lat: d.lat, lon: d.lon, t: Date.now() } }); this.say(`Konumunuz alındı — ${d.lat.toFixed(5)}, ${d.lon.toFixed(5)} · cihaz GPS ±${d.acc} m.`); return; }
      if (d.ks === 'konumYok') {
        this.say(d.kod === 1
          ? 'Konum izni verilmemiş. Tarayıcı ayarlarından bu siteye konum iznini açın; sonra GİT düğmesine yeniden basın.'
          : 'Konum alınamadı — açık alana çıkıp yeniden deneyin. Harita şimdilik Kırşehir merkezine getirildi.', true);
        setTimeout(() => this.setState({ toast: null }), 8000);
        return;
      }
      if (d.ks === 'coord') {
        // Sihirbaz "haritadan seç" bekliyorsa çift tıklanan nokta yeni tesisin konumu olur
        const z = this.state.naSz;
        if (z && z.haritada && this.state.newAsset) {
          this.setState(st => ({
            newAsset: { ...st.newAsset, lat: d.lat, lon: d.lon, coordAcc: null, district: this.enYakinIlce(d.lat, d.lon) || st.newAsset.district },
            naSz: { ...st.naSz, haritada: false, onay: false, yol: 'harita' }
          }));
          this.toMap({ ks: 'go', lat: d.lat, lon: d.lon, label: 'Yeni tesis konumu · haritadan seçildi' });
          return;
        }
        this.setState({ picked: { lat: d.lat, lon: d.lon } }); return;
      }
      if (d.ks === 'picked') {
        this.vSave(d.name, d.lat, d.lon, true);
        const p = this.state.pick;
        this.setState({ pick: null, vFix: null });
        this.flyTo(d.lat, d.lon, 15);
        this.toMap({ ks: 'go', lat: d.lat, lon: d.lon, label: `${d.name}${p && p.district ? ' · ' + p.district : ''}` });
        this.say(`${d.name} köyünün konumu kaydedildi (${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}). Bu köy bundan sonra internetsiz de bulunur.`, true);
        setTimeout(() => this.setState({ toast: null }), 6000);
        return;
      }
      if (d.ks === 'select') {
        this.setState({ selected: d.id, detailTab: 'bilgi', panel: 'detay' });
        const a = this.state.assets.find(x => x.id === d.id);
        if (a && a.dbId) this.fotoYenile(a.dbId);
      }
      if (d.ks === 'hatHazir') { this.hatGonder(); return; }
      // Profil sayfası açıldı — mevcut tesisleri gönder ki haritada görünsün
      if (d.ks === 'profilHazir') { this.profilTesis(); return; }
      if (d.ks === 'profilAktar') { this.profilAktar(d); return; }
      if (d.ks === 'hatlar' && Array.isArray(d.hatlar)) {
        const id = d.id || this.state.selected;
        if (id) this.hatKaydet(id, d.hatlar);
        return;
      }
      if (d.ks === 'base') this.setState({ mapBase: d.base });
      if (d.ks === 'route') {
        this.setState({ route: d });
        this.say(`${d.code} · ${d.km} km · ${d.min} dk${d.approx ? ' (kuş uçuşu tahmin)' : ' karayolu'}`);
      }
    };
    addEventListener('message', this._msg);
  }
  componentDidUpdate(prevProps, prev) {
    // Telefon kabuğu yeni geldiyse katman ölçüsünü beklemeden tazele
    if (this._olcKat) requestAnimationFrame(this._olcKat);
    // Ayarlar'dan çıkıldığında bölüm seçimi sıfırlanır ki bir dahaki
    // girişte kullanıcı yine listeyi görsün
    // runtime bazı çağrılarda prevState vermiyor (bkz. aşağıdaki not) — burada
    // erken kullanıldığı için ayrıca korunması gerekiyor, aşağıdaki genel
    // "if (!prev) return" bu satırdan sonra geliyor.
    if (prev && prev.tab === 'ayarlar' && this.state.tab !== 'ayarlar' && this.state.ayarBolum)
      this.setState({ ayarBolum: null });
    // runtime prevState vermeyebilir — kendi anlık görüntümüzle karşılaştırırız
    const s = this.state;
    // Bekleyen arızalar cihazda saklanır (arizaBekleyenYaz)
    if (this._arizaRef !== s.faults) { this._arizaRef = s.faults; this.arizaBekleyenYaz(); }
    if (this._entAyar !== s.ayarBolum) { this._entAyar = s.ayarBolum; if (s.ayarBolum === 'entegrasyon' && s.tab === 'ayarlar') this.entegrasyonYenile(); }
    if (this._slaRef !== s.faults) { this._slaRef = s.faults; this.slaTara(); }
    try { document.documentElement.classList.toggle('ks-koyu', s.theme === 'dark'); } catch (e) { /* belge yok */ }
    // Tam ekran harita yalnız harita ve hat kesiti ekranlarında; başka sayfaya geçince çubuklar geri gelir
    if (s.telTam && s.tab !== 'harita' && s.tab !== 'profil') { try { document.documentElement.classList.remove('ks-tam'); } catch (e) { /* belge yok */ } this.setState({ telTam: false }); }
    if (this._telTab !== s.tab) { this._telTab = s.tab; if (s.tab === 'telemetri') this.telemetriYenile(true); }
    // Sunucudan alınan son veri cihaza da yazılır: internetsiz açılışta oradan gelir
    if (s.session && s.sunucu && s.sonEsitleme
        && (this._snapA !== s.assets || this._snapF !== s.faults || this._snapN !== s.notes || this._snapI !== s.isEmirleri)) {
      this._snapA = s.assets; this._snapF = s.faults; this._snapN = s.notes; this._snapI = s.isEmirleri;
      clearTimeout(this._snapT);
      this._snapT = setTimeout(() => this.anlikKaydet(), 2500);
    }
    if (s.session) {
      const imza = JSON.stringify([s.mapBase, s.theme, s.navMode, s.filter, s.hatKatman,
        s.bildirimKanal, s.bildirimEsik, s.conv.sys, s.conv.zone, s.tab, s.detailTab,
        s.ayarBolum, s.deviceMode, s.envQ, s.envTur, s.envIlce, s.envAktiflik, s.envDurum,
        s.session.user]);
      if (this._prefImza !== imza) { this._prefImza = imza; this.prefYaz(); }
    }
    if (!prev) return;
    if (prev.theme !== this.state.theme || prev.filter !== this.state.filter) this.pushMap();
    // Hat Kesiti ve hat çizim pencereleri açıkken tema değişirse onlara da haber verilir
    if (prev.theme !== this.state.theme) {
      const dark = this.state.theme === 'dark';
      const pw = this.profilWin(); if (pw) try { pw.postMessage({ ks: 'theme', dark }, '*'); } catch (e) { /* çerçeve yok */ }
      const hw = this.hatWin(); if (hw) try { hw.postMessage({ ks: 'theme', dark }, '*'); } catch (e) { /* çerçeve yok */ }
    }
    // hat sekmesi: kayıt ya da sekme değişince çizim sayfasına yeni kayıt gönderilir
    if (this.state.hatTam && (!prev.hatTam || prev.selected !== this.state.selected)) {
      setTimeout(() => this.hatGonder(), 260);
    }
    if (this.state.detailTab === 'hat'
      && (prev.detailTab !== 'hat' || prev.selected !== this.state.selected)) {
      setTimeout(() => this.hatGonder(), 120);
    }
    // Çevrimdışıdan çıkıldı: bekleyen modül verisi sunucuya gider
    if (prev.offline && !this.state.offline) setTimeout(() => this.senkron(true), 1200);
    // Profil haritası: sekme açılınca ve kayıt listesi değişince tesisler yenilenir
    if (this.state.tab === 'profil'
      && (prev.tab !== 'profil' || prev.assets !== this.state.assets)) {
      setTimeout(() => this.profilTesis(), prev.tab !== 'profil' ? 260 : 0);
    }
    // harita dışına çıkınca konum onay şeridi ve işaretleme modu kapanır
    if (prev.tab !== this.state.tab && this.state.tab !== 'harita' && (this.state.vFix || this.state.pick)) {
      if (this.state.pick) this.toMap({ ks: 'pick', name: null });
      this.setState({ vFix: null, pick: null });
    }
  }
  componentWillUnmount() {
    removeEventListener('message', this._msg);
    if (this._agGeldi) window.removeEventListener('online', this._agGeldi);
    if (this._agGitti) window.removeEventListener('offline', this._agGitti);
    if (this._gorunur) document.removeEventListener('visibilitychange', this._gorunur);
    clearInterval(this._kuyrukSaat); clearInterval(this._basvuruSaat); clearInterval(this._uyariTekrar);
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, this._sesAc));
    clearInterval(this._veriSaat);
    clearTimeout(this._t); clearTimeout(this._f); clearTimeout(this._d);
  }
  // Açıklama metinleri (ks-bilgi) varsayılan gizlidir; "?" düğmesiyle açılır
  yardimDegistir(v) {
    const ac = typeof v === 'boolean' ? v : !this.state.yardim;
    try { localStorage.setItem('ks-yardim', ac ? '1' : '0'); } catch (e) { /* depolama kapalı */ }
    try { document.documentElement.classList.toggle('ks-yardim', ac); } catch (e) { /* belge yok */ }
    this.setState({ yardim: ac });
  }
  tl(n) { return (Math.round(n) || 0).toLocaleString('tr-TR') + ' ₺'; }
  // ISO zamanı programın kullandığı gg.aa.yyyy ss:dd biçimine çevirir
  damgaCevir(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return this.damga();
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear()
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  // Bir tarihin kaç gün önce olduğunu döndürür (gg.aa.yyyy biçiminden)
  gunGecti(damga) {
    const p = String(damga || '').split(' ')[0].split('.');
    if (p.length !== 3) return null;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  // konum kaynağı etiketi tek yerden üretilir — liste ve şerit aynı metni kullanır
  // ── kayıt geçmişi: her değişiklik kim, ne zaman, nereden diye yazılır
  // Kayıt damgası. Cihaz saati yanlış ayarlıysa süre uyumu ölçümü bozulur;
  // bu yüzden girişte sunucu saatiyle arasındaki fark ölçülür ve buradan
  // düzeltilir. Çevrimdışı açılışta son bilinen fark kullanılır.
  // "GG.AA.YYYY SS:DD" → milisaniye (okunamazsa 0)
  damgaMs(str) {
    const m = String(str || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return 0;
    const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
    return isNaN(d) ? 0 : d.getTime();
  }
  // Küçük çizgi grafik (kıvılcım) — şablonda {{ }} delikli SVG tarayıcıda boş istek/
  // uyarı ürettiği için eleman burada kurulur
  kivilcim(arr, renk, w, h) {
    const W = w || 96, H = h || 34;
    const mn = Math.min(...arr), mx = Math.max(...arr), r = (mx - mn) || 1;
    const pts = arr.map((v, i) => (i * W / Math.max(1, arr.length - 1)).toFixed(1) + ',' + (H - 3 - (v - mn) / r * (H - 8)).toFixed(1)).join(' ');
    return React.createElement('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', flex: 'none' }, 'aria-hidden': true },
      React.createElement('polyline', { points: pts, fill: 'none', stroke: renk, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1, className: 'ks-ciz' }));
  }
  damga() {
    const d = new Date(Date.now() + (this._saatFarki || 0));
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // "DD.MM.YYYY" ya da "DD.MM.YYYY HH:MM" damgasını Date'e çevirir — arıza
  // (f.opened), ambar hareketi (h.damga) ve deneme (t.date) hep bu biçimde.
  // Okunamayan damga null döner, raporlarda sessizce dışarıda bırakılır.
  tarihParse(str) {
    const p = String(str || '').split(' ')[0].split('.');
    if (p.length !== 3) return null;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    return isNaN(d) ? null : d;
  }
  // Esnek raporlama aralığı — Bugün/Hafta/Ay/Yıl/Tümü/Özel (madde 37).
  // bit her zaman ÜST SINIR HARİÇ (bir sonraki günün 00:00'ı) döner.
  zamanAraligi(mod, ozelBas, ozelBit) {
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const yarin = new Date(bugun.getTime() + 86400000);
    if (mod === 'bugun') return { bas: bugun, bit: yarin, ad: 'Bugün' };
    if (mod === 'hafta') {
      const gun = (bugun.getDay() + 6) % 7; // Pazartesi = 0
      const bas = new Date(bugun.getTime() - gun * 86400000);
      return { bas, bit: yarin, ad: 'Bu hafta' };
    }
    if (mod === 'ay') return { bas: new Date(bugun.getFullYear(), bugun.getMonth(), 1), bit: yarin, ad: 'Bu ay' };
    if (mod === 'yil') return { bas: new Date(bugun.getFullYear(), 0, 1), bit: yarin, ad: 'Bu yıl' };
    if (mod === 'ozel') {
      const bas = this.tarihParse((ozelBas || '').split('-').reverse().join('.')) || new Date(2000, 0, 1);
      const bitH = this.tarihParse((ozelBit || '').split('-').reverse().join('.'));
      const bit = bitH ? new Date(bitH.getTime() + 86400000) : yarin;
      return { bas, bit, ad: 'Özel aralık' };
    }
    return { bas: new Date(2000, 0, 1), bit: yarin, ad: 'Tümü' };
  }
  // Sunucu saatiyle cihaz saati arasındaki farkı ölçer.
  // Bir dakikadan küçük fark yok sayılır — her açılışta uyarı vermenin anlamı yok.
  async saatEsitle() {
    const M = this._sb;
    if (!M || !this.state.sunucu || this.state.offline) return;
    const t0 = Date.now();
    const r = await M.sunucuSaati();
    if (!r || !r.ok || !r.data || !r.data.ms) return;
    // Gidiş dönüş süresinin yarısı yol payı olarak düşülür
    const gecikme = (Date.now() - t0) / 2;
    const fark = Math.round(Number(r.data.ms) + gecikme - Date.now());
    this._saatFarki = Math.abs(fark) < 60000 ? 0 : fark;
    try { localStorage.setItem('ks-saat-farki', String(this._saatFarki)); } catch (e) { /* depolama kapalı */ }
    if (this._saatFarki) {
      const dk = Math.round(Math.abs(this._saatFarki) / 60000);
      this.denetimYaz('ayar', 'Cihaz saati düzeltildi',
        'Sunucuyla fark ' + dk + ' dakika (' + (fark > 0 ? 'cihaz geride' : 'cihaz ileride') + ')', 'Saat');
      this.duyur('Bu cihazın saati sunucudan ' + dk + ' dakika '
        + (fark > 0 ? 'geride' : 'ileride') + '. Kayıt zamanları düzeltiliyor — '
        + 'cihazın saatini elle de düzeltmeniz iyi olur.', 9000, 'kotu');
    }
  }
  async fetchJson(url, opts, ms) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), ms || 7000);
    try {
      const r = await fetch(url, { ...(opts || {}), signal: ac.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(to); }
  }
  distKm(a) {
    const R = 6371, t = Math.PI / 180;
    const dLat = (a.lat - STD_LOC.lat) * t, dLon = (a.lon - STD_LOC.lon) * t;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(STD_LOC.lat * t) * Math.cos(a.lat * t) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  // Medya kaynağı şablon deliğiyle verilemez: tarayıcı hole çözülmeden
  // literal metni indirmeye çalışır. Bu yüzden eleman burada kuruluyor.
  imgEl(url, alt) {
    return React.createElement('img', {
      src: url, alt: alt || '', loading: 'lazy',
      style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
    });
  }
  // Fotoğrafı cihaza indir: telefonda galeriye, bilgisayarda İndirilenler'e
  async medyaIndir(url, ad) {
    try {
      const c = await fetch(url, { mode: 'cors' });
      if (!c.ok) throw new Error('yok');
      const blob = await c.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = ad;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      this.say(`${ad} cihaza indirildi.`);
    } catch (e) {
      // Bazı tarayıcılar indirmeyi engeller; dosyayı yeni sekmede açıp
      // kullanıcının kendi kaydetmesine bırakıyoruz
      window.open(url, '_blank', 'noopener');
      this.say('Fotoğraf yeni sekmede açıldı — üzerine basılı tutup “Görseli kaydet” ile cihazınıza alabilirsiniz.', true);
      setTimeout(() => this.setState({ toast: null }), 8000);
    }
  }
  audioEl(url, yuksek) {
    return React.createElement('audio', {
      src: url, controls: true, preload: 'metadata',
      style: { width: '100%', height: yuksek ? 40 : 34, display: 'block' }
    });
  }
  mesafeM(a, b) {
    return Math.hypot((a.lon - b.lon) * Math.cos(a.lat * Math.PI / 180) * 111320, (a.lat - b.lat) * 110540);
  }
  prefOku(u) {
    try {
      const p = JSON.parse(localStorage.getItem('ks-pref-' + u.user) || '{}');
      const out = {};
      if (p.mapBase) out.mapBase = p.mapBase;
      const cihazTema = (() => { try { return localStorage.getItem('ks-tema'); } catch (e) { return null; } })();
      out.theme = (cihazTema === 'dark' || cihazTema === 'light') ? cihazTema
        : (p.theme === 'dark' ? 'dark' : 'light');
      try { localStorage.setItem('ks-tema', out.theme); } catch (e) { /* depolama kapalı */ }
      if (typeof p.navMode === 'boolean') out.navMode = p.navMode;
      // Süzgeç olduğu gibi geri gelir — hepsi kapalı bırakıldıysa kapalı açılır
      if (p.filter && typeof p.filter === 'object') {
        out.filter = {
          kuyu: p.filter.kuyu !== false, depo: p.filter.depo !== false,
          ag: p.filter.ag !== false, ges: p.filter.ges !== false,
          pasif: p.filter.pasif !== false,
          // ISU katmanları: eski kayıtta yoksa "Tümü" ile birlikte açık gelir
          kaynak: 'kaynak' in p.filter ? p.filter.kaynak !== false : true,
          memba: 'memba' in p.filter ? p.filter.memba !== false : true
        };
      }
      if (typeof p.hatKatman === 'boolean') out.hatKatman = p.hatKatman;
      if (p.bildirimKanal) out.bildirimKanal = p.bildirimKanal;
      if (p.bildirimEsik) out.bildirimEsik = p.bildirimEsik;
      if (p.convSys || p.convZone) out.conv = { ...this.state.conv, sys: p.convSys || this.state.conv.sys, zone: p.convZone || this.state.conv.zone };
      // Her giriş Envanter > Harita ekranında başlar: bırakılan sayfa geri
      // getirilmez, yoksa kullanıcı Ayarlar'da kaldıysa orada açılıyordu.
      if (p.envQ) out.envQ = p.envQ;
      if (p.envTur) out.envTur = p.envTur;
      if (p.envIlce) out.envIlce = p.envIlce;
      if (p.envAktiflik) out.envAktiflik = p.envAktiflik;
      if (p.envDurum) out.envDurum = p.envDurum;
      if (p.deviceMode) out.deviceMode = p.deviceMode;
      if (p.detailTab) out.detailTab = p.detailTab;
      return out;
    } catch (e) { return {}; }
  }
  // geri yüklenen tercihleri haritaya da uygula
  prefUygula() {
    const s = this.state;
    this.toMap({ ks: 'setBase', base: s.mapBase });
    this.toMap({ ks: 'navMode', on: s.navMode });
    this.pushMap();
  }
  // Tema seçimi hem kullanıcı tercihine hem cihaza yazılır; oturum
  // kapanınca da, tercih dosyası okunamasa da seçim korunur.
  temaSec(t) {
    try { localStorage.setItem('ks-tema', t); } catch (e) { /* depolama kapalı */ }
    this.setState({ theme: t }, () => this.pushMap());
  }
  prefYaz() {
    const s = this.state;
    if (!s.session) return;
    try {
      const f = {
        kuyu: s.filter.kuyu !== false, depo: s.filter.depo !== false,
        ag: s.filter.ag !== false, ges: s.filter.ges !== false,
        pasif: s.filter.pasif !== false,
        kaynak: s.filter.kaynak !== false, memba: s.filter.memba !== false
      };
      localStorage.setItem('ks-pref-' + s.session.user, JSON.stringify({
        mapBase: s.mapBase, theme: s.theme, navMode: s.navMode, filter: f,
        hatKatman: s.hatKatman,
        bildirimKanal: s.bildirimKanal, bildirimEsik: s.bildirimEsik,
        convSys: s.conv.sys, convZone: s.conv.zone, tab: s.tab, detailTab: s.detailTab,
        ayarBolum: s.ayarBolum, deviceMode: s.deviceMode,
        envQ: s.envQ, envTur: s.envTur, envIlce: s.envIlce,
        envAktiflik: s.envAktiflik, envDurum: s.envDurum
      }));
    } catch (e) { /* depolama kapalı */ }
  }
  // Kısa bildirim. Ayrı bir kutu yok — hepsi aynı sağ üst kartta çıkar.
  say(text, keep) {
    this.duyur(text, keep ? 9000 : 3800, 'bilgi');
  }
  // Göz yormayan bildirim: ekranın üstünde çıkar, süresi dolunca kendiliğinden kalkar
  duyur(text, ms, tur, git) {
    clearTimeout(this._d);
    // Başarı/bilgi bildirimlerinde yalnız ilk cümle (uzun açıklamalar "?" ile
    // yardım açıkken görünür); hata ve uyarılar tam kalır
    if (!this.state.yardim && (!tur || tur === 'iyi' || tur === 'bilgi')) {
      const s = String(text || ''), i = s.search(/[.!?…]\s/);
      if (i >= 12) text = s.slice(0, i + 1);
    }
    this.setState({ duyuru: { text, tur: tur || 'bilgi', git: typeof git === 'function' ? git : null } });
    this._d = setTimeout(() => this.setState({ duyuru: null }), ms || 5000);
  }
  dosyaIndir(ad, icerik, tur) {
    const blob = new Blob([icerik], { type: tur });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = ad;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  // Lucide çizgi ikonları
  ikon(ad, boyut) {
    const P = {
      gps: ['M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
      pin: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', 'M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4'],
      gunes: ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
      ay: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9'],
      indir: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
      cop: ['M3 6h18', 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6'],
      sol: ['m15 18-6-6 6-6'],
      sag: ['m9 18 6-6-6-6'],
      kapat: ['M18 6 6 18', 'm6 6 12 12'],
      uyari: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
      buyut: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
      kalem: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z'],
      donustur: ['M8 3 4 7l4 4', 'M4 7h16', 'm16 21 4-4-4-4', 'M20 17H4'],
      yenile: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
      cikis: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
      ariza: ['M7 18v-6a5 5 0 0 1 10 0v6', 'M5 21a1 1 0 0 0 1-1v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1a1 1 0 0 0 1 1', 'M12 2v1', 'M2 12h1', 'M21 12h1', 'M5.6 4.6 6.3 5.3', 'M18.4 4.6l-.7.7'],
      kamera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7'],
      // Sol menü sayfaları
      isler:['M13 2 4 14h6l-1 8 9-12h-6z'],
      kaynaklar: ['M3 7l9-4 9 4-9 4-9-4z', 'M3 7v10l9 4 9-4V7', 'M12 11v10'],
      envanter: ['M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z', 'M12 6.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8'],
      kesit: ['M3 17l5-6 4 3 4-7 5 6', 'M3 21h18'],
      ozet: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
      ayarlar: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', 'M12 2v3', 'M12 19v3', 'M4.2 4.2l2.1 2.1', 'M17.7 17.7l2.1 2.1', 'M2 12h3', 'M19 12h3', 'M4.2 19.8l2.1-2.1', 'M17.7 6.3l2.1-2.1']
    };
    const b = boyut || 16;
    return React.createElement('svg', {
      width: b, height: b, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      style: { display: 'block', flex: 'none' }, 'aria-hidden': true
    }, (P[ad] || []).map((p, i) => React.createElement('path', { key: i, d: p })));
  }
  th() {
    const dark = this.state.theme === 'dark';
    return dark ? {
      bg: '#121214', surf: '#1c1c1e', surf2: '#2a2a2d', fg: '#f5f5f7',
      mut: 'rgba(235,235,245,.62)', rule: 'rgba(255,255,255,.13)',
      acc: '#0a84ff', sel: '#2c2c2e', pend: '#3a2a10',
      ph1: '#2c2c2e', ph2: '#3a3a3c', mapSat: '.5', mapBri: '.6', themeMark: '☾', dark: true
    } : {
      bg: 'var(--color-bg)', surf: '#ffffff', surf2: 'var(--color-neutral-200)', fg: 'var(--color-text)',
      mut: 'var(--color-neutral-600)', rule: 'var(--color-divider)',
      acc: 'var(--color-accent)', sel: 'var(--color-accent-100)', pend: 'var(--color-bekle-100)',
      ph1: '#e4e4e9', ph2: '#d5d5da', mapSat: '.78', mapBri: '1', themeMark: '☀', dark: false
    };
  }

  proj(lat, lon) {
    const z = this.state.zoom, c = this.state.center || { lat: 39.16, lon: 34.12 };
    const k = Math.pow(1.7, z - 11);
    return { x: 50 + ((lon - c.lon) / ((BBOX.e - BBOX.w) / k)) * 100, y: 50 - ((lat - c.lat) / ((BBOX.n - BBOX.s) / k)) * 100 };
  }