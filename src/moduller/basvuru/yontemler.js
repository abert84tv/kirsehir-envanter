  // ── web başvuruları (bildirim.html): vatandaş / muhtar formundan gelenler
  async basvuruYenile() {
    const M = this._sb;
    if (!M || !M.tokenOku() || !M.basvuruListesi || this.state.offline) return;
    const r = await M.basvuruListesi();
    if (!r.ok) return;
    const liste = (r.data || []).map(x => ({
      id: x.id, takip: x.takip, ad: x.ad, tel: x.tel || '', sifat: x.sifat, ilce: x.ilce || '', koy: x.koy, konu: x.konu,
      aciklama: x.aciklama, lat: x.lat, lon: x.lon, durum: x.durum, sonuc: x.sonuc || '', talepNo: x.talep_no || '', zaman: x.olusma
    }));
    this.setState({ basvurular: liste }, () => this.basvuruEsitle());
    if (this.state.basvuruUyari && !liste.some(b => b.durum === 'yeni')) this.setState({ basvuruUyari: null });
    this.basvuruUyar(liste);
  }
  // Yeni web/Telegram başvurusu: kırmızı kart + ses + (izin varsa) tarayıcı bildirimi + sekme başlığı.
  // Her başvuru bir cihazda bir kez duyurulur; ilk açılışta yalnız son 2 saatlikler.
  basvuruUyar(liste) {
    let gor; try { gor = JSON.parse(localStorage.getItem('ks-basvuru-gorulen') || 'null'); } catch (e) { gor = null; }
    const ilk = !Array.isArray(gor); gor = Array.isArray(gor) ? gor : [];
    const yeniler = liste.filter(b => b.durum === 'yeni');
    const duyurulacak = yeniler.filter(b => !gor.includes(b.id) && !(ilk && Date.now() - Date.parse(b.zaman) > 2 * 3600 * 1000));
    try { localStorage.setItem('ks-basvuru-gorulen', JSON.stringify([...new Set([...gor, ...yeniler.map(b => b.id)])].slice(-300))); } catch (e) { /* depolama kapalı */ }
    const me = this.state.session;
    if (!me || me.role === 'izleyici' || !duyurulacak.length) return;
    const b = duyurulacak[0], fazla = duyurulacak.length - 1;
    const metin = (b.konu || 'Yeni başvuru') + ' · ' + b.koy + (b.ilce ? ' (' + b.ilce + ')' : '') + (fazla ? ' — ve ' + fazla + ' başvuru daha' : '');
    // Her şeyin üstünde duran kalıcı şerit: operatör tıklayana kadar kalır, ses 6 sn'de bir tekrarlanır
    this.uyariSesi();
    this.setState(st => ({ basvuruUyari: { n: (st.basvuruUyari ? st.basvuruUyari.n : 0) + duyurulacak.length, metin } }));
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const n = new Notification('Yeni başvuru — Kırşehir Envanter', { body: metin, tag: 'ks-basvuru', renotify: true, requireInteraction: true });
        n.onclick = () => { try { window.focus(); } catch (e) { /* odak yok */ } this.setState({ tab: 'talep' }); n.close(); };
      }
    } catch (e) { /* bildirim desteklenmiyor */ }
    // Sekme başlığı, kullanıcı geri dönene kadar yanıp söner
    if (typeof document !== 'undefined') {
      const ad = document.title && !/Yeni başvuru!/.test(document.title) ? document.title : 'Kırşehir Envanter'; let a = false;
      clearInterval(this._baslikSaat);
      this._baslikSaat = setInterval(() => {
        if (!this.state.basvuruUyari) { clearInterval(this._baslikSaat); document.title = ad; return; }
        a = !a; document.title = a ? '🔔 YENİ BAŞVURU!' : ad;
      }, 900);
    }
  }
  // Yüksek sesli alarm (dosya gerekmez): karışık kare+testere dalgası, tam ses, ~2 sn siren
  uyariSesi() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this._ac = this._ac || new AC();
      const c = this._ac;
      const cal = () => {
        const cikis = c.createDynamicsCompressor();   // tepeleri sıkıştırır: ortalama ses yükselir, bozulmaz
        cikis.threshold.value = -24; cikis.ratio.value = 12; cikis.attack.value = .003; cikis.release.value = .1;
        const ana = c.createGain(); ana.gain.value = 1.4; cikis.connect(ana); ana.connect(c.destination);
        const t0 = c.currentTime + .03;
        // 8 vuruş, iki ton arasında gidip gelir (siren)
        for (let k = 0; k < 8; k++) {
          const f = k % 2 ? 1319 : 988, b = t0 + k * .26;
          [['square', f, .55], ['sawtooth', f * 2, .25]].forEach(([tur, fr, v]) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = tur; o.frequency.value = fr; o.connect(g); g.connect(cikis);
            g.gain.setValueAtTime(0, b); g.gain.linearRampToValueAtTime(v, b + .01); g.gain.setValueAtTime(v, b + .21); g.gain.linearRampToValueAtTime(0, b + .25);
            o.start(b); o.stop(b + .26);
          });
        }
      };
      // Bağlam uykudaysa uyanır uyanmaz çalınır (önceki sürümde sesin geç gelmesi buradandı)
      if (c.state === 'running') cal();
      else if (c.state === 'suspended') c.resume().then(cal).catch(() => {});
    } catch (e) { /* ses çalınamadı (tarayıcı izni) */ }
    try { if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]); } catch (e) { /* titreşim yok */ }
  }
  // Talebin durumu değişince başvurunun takip sayfası da güncellenir
  async basvuruEsitle() {
    const M = this._sb;
    if (!M || !M.basvuruGuncelle || !M.tokenOku() || this.state.offline || this._basvuruEsit) return;
    const bl = this.state.basvurular || [];
    if (!bl.length) return;
    const isler = [];
    for (const t of (this.state.talepler || [])) {
      if (!t.takip) continue;
      const b = bl.find(x => x.takip === t.takip);
      if (!b) continue;
      const hedef = t.durum === 'yeni' ? 'incelemede' : t.durum;
      const no = t.noGecici ? '' : t.no;
      const sonucFark = !!t.sonuc && t.sonuc !== (b.sonuc || '');
      const noFark = !!no && b.talepNo !== no;
      if (b.durum !== hedef || sonucFark || noFark) isler.push({ b, hedef, t, no });
    }
    if (!isler.length) return;
    this._basvuruEsit = true;
    try {
      for (const i of isler) {
        const r = await M.basvuruGuncelle(i.b.id, i.hedef, i.t.sonuc || '', i.no);
        if (r && r.ok) {
          this.setState(st => ({ basvurular: (st.basvurular || []).map(x => x.id === i.b.id
            ? { ...x, durum: i.hedef, sonuc: i.t.sonuc || x.sonuc, talepNo: i.no || x.talepNo } : x) }));
        } else if (r && r.cevrimdisi) break;
      }
    } finally { this._basvuruEsit = false; }
  }
  async basvuruAktar(b) {
    const me = this.state.session;
    if (!me) return;
    this.talepKaydet({
      ad: b.ad, tel: b.tel, sifat: b.sifat === 'muhtar' ? 'muhtar' : 'vatandas', kanal: b.konu === 'Telegram bildirimi' ? 'telegram' : 'web', ilce: b.ilce, koy: b.koy,
      konu: b.konu, aciklama: b.aciklama + (b.lat != null ? '\n[Bildirimdeki konum: ' + b.lat + ', ' + b.lon + ']' : ''),
      kvkkOnay: true, takip: b.takip
    });
    // Kayıt gerçekten talep listesine girdiyse başvuru "incelemede" olur
    await new Promise(r => setTimeout(r, 1500));
    const t = (this.state.talepler || []).find(x => x.takip === b.takip);
    if (t) this.basvuruEsitle();
    else this.duyur('Talep oluşturulamadı — form uyarısını kontrol edin.', 5000, 'kotu');
  }
  async basvuruEngelle(b) {
    if (!window.confirm(b.takip + ' başvurusu spam sayılıp gönderen engellensin mi?\n\n(' + b.ad + ' · ' + (b.tel || 'telefon yok') + ')')) return;
    const r = await this._sb.basvuruEngelle(b.id);
    if (!r.ok) return this.duyur(r.err || 'Engellenemedi.', 6000, 'kotu');
    this.denetimYaz('talep', 'Web başvurusu engellendi', b.takip, '');
    this.basvuruYenile();
  }
//@dahil moduller/basvuru/yontemler/baslat.js