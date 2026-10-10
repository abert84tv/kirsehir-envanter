  // Tek hareket: giriş, çıkış, zimmet, iade, sarf. Eksi mevcuda düşürmez.
  ambarHareket(g) {
    if (!g || !g.malzeme) return this.duyur('Malzeme seçin.', 4000, 'kotu');
    const kalem = this.katalogBul(g.malzeme);
    // Elle yazılan ad katalogda yoksa stok açılmaz — yoksa her yazım
    // farkı ayrı bir malzeme gibi ambara girerdi
    if (!kalem || !stoktaMi(kalem)) return this.duyur('“' + g.malzeme + '” katalogda yok. Listeden seçin ya da önce “Malzeme tanımla” ile ekleyin.', 7000, 'kotu');
    if (kalem.pasif) return this.duyur(g.malzeme + ' pasif — önce malzeme kartından yeniden etkinleştirin.', 6000, 'kotu');
    const birim = kalem.birim;
    const n = Math.abs(parseFloat(String(g.adet || '').replace(',', '.')) || 0);
    if (!n) return this.duyur('Adet girin.', 4000, 'kotu');
    if (!this.stokIzin(g.tur, g.ekip)) return this.duyur('“' + (HAREKET_AD[g.tur] || g.tur) + '” işlemi için yetkiniz yok' + (g.tur === 'sarf' ? ' (saha personeli yalnız kendi ekibi için düşebilir)' : '') + '. Yetkiyi yöneticiniz Ayarlar › Yetkiler’den verebilir.', 7000, 'kotu');
    if (g.tur !== 'sarf' && g.tur !== 'hurda' && !g.ambar) return this.duyur('Ambar seçin.', 4000, 'kotu');
    if (['zimmet', 'iade', 'sarf', 'hurda'].includes(g.tur) && !g.ekip) return this.duyur('Ekip seçin.', 4000, 'kotu');
    const a = this.state.ambar || {};
    const stok = JSON.parse(JSON.stringify(a.stok || {}));
    const zim = JSON.parse(JSON.stringify(a.zimmet || {}));
    const S = (amb, m, d) => {
      stok[amb] = stok[amb] || {};
      stok[amb][m] = (Number(stok[amb][m]) || 0) + d;
      if (stok[amb][m] <= 0) delete stok[amb][m];
    };
    const Z = (ek, m, d) => {
      zim[ek] = zim[ek] || {};
      zim[ek][m] = (Number(zim[ek][m]) || 0) + d;
      if (zim[ek][m] <= 0) delete zim[ek][m];
    };
    const mevcut = this.ambarMevcut(g.malzeme, g.ambar);
    const elde = this.ambarZimmet(g.malzeme, g.ekip);
    if (g.tur === 'giris') S(g.ambar, g.malzeme, n);
    else if (g.tur === 'cikis') {
      if (n > mevcut) return this.duyur(g.ambar + ' mevcudu ' + mevcut + ' ' + birim + ' — bu kadar çıkış yapılamaz.', 6000, 'kotu');
      S(g.ambar, g.malzeme, -n);
    } else if (g.tur === 'zimmet') {
      if (n > mevcut) return this.duyur(g.ambar + ' mevcudu ' + mevcut + ' ' + birim + ' — önce ambara giriş yapın.', 6000, 'kotu');
      S(g.ambar, g.malzeme, -n); Z(g.ekip, g.malzeme, n);
    } else if (g.tur === 'iade') {
      if (n > elde) return this.duyur(g.ekip + ' zimmetinde ' + elde + ' ' + birim + ' var — fazlası iade edilemez.', 6000, 'kotu');
      Z(g.ekip, g.malzeme, -n); S(g.ambar, g.malzeme, n);
    } else if (g.tur === 'sarf') {
      if (n > elde) return this.duyur(g.ekip + ' zimmetinde ' + elde + ' ' + birim + ' var — sarf bundan fazla olamaz.', 6000, 'kotu');
      Z(g.ekip, g.malzeme, -n);
    } else if (g.tur === 'hurda') {
      if (n > elde) return this.duyur(g.ekip + ' zimmetinde ' + elde + ' ' + birim + ' var — hurdaya bundan fazlası çıkarılamaz.', 6000, 'kotu');
      Z(g.ekip, g.malzeme, -n);
    } else return this.duyur('Hareket türü seçin.', 4000, 'kotu');
    // sarf/hurda işlemine tesis bağlanırsa köy bazlı malzeme raporunda
    // "Tesis belirtilmemiş" yerine gerçek köy · ilçesinde görünür (madde 18)
    const tesisVar = ['sarf', 'hurda'].includes(g.tur) && g.assetId;
    const kayit = {
      id: 'h' + Date.now() + Math.random().toString(36).slice(2, 6), damga: this.damga(),
      tur: g.tur, malzeme: g.malzeme, adet: n, birim, ambar: g.ambar || '', ekip: g.ekip || '',
      kim: (this.state.session && this.state.session.name) || '', not: (g.not || '').trim(),
      assetId: tesisVar ? g.assetId : null
    };
    const tesisAd = tesisVar ? (((this.state.assets || []).find(x => x.id === g.assetId) || {}).code || '') : '';
    this.denetimYaz('ambar', HAREKET_AD[g.tur], g.malzeme + ' × ' + n + ' ' + birim
      + [g.ambar, g.ekip, tesisAd].filter(Boolean).map(x => ' · ' + x).join('')
      + (kayit.not ? ' · ' + kayit.not : ''), g.ambar || g.ekip);
    // Günlük tüketim özeti — sunucudaki ambar_hareket ile aynı kural
    const gun = JSON.parse(JSON.stringify(a.gun || {}));
    const fark = ['cikis', 'zimmet'].includes(g.tur) ? n : (g.tur === 'iade' ? -n : 0);
    if (fark) {
      const d = new Date(Date.now() + (this._saatFarki || 0));
      const gk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      gun[gk] = gun[gk] || {};
      gun[gk][g.malzeme] = (Number(gun[gk][g.malzeme]) || 0) + fark;
    }
    // Bakiye hesabı sunucuda yapılır; buradaki stok/zim yalnızca ekranın
    // hemen güncellenmesi için. Sunucudan gelen sonuç bunun üstüne yazar.
    this.ambarIslem([{
      id: kayit.id, tur: g.tur, malzeme: g.malzeme, adet: n, birim,
      ambar: g.ambar || '', ekip: g.ekip || '', not: kayit.not, assetId: kayit.assetId
    }], HAREKET_AD[g.tur] + ' · ' + g.malzeme + ' × ' + n + ' ' + birim
      + (g.ekip ? ' · ' + g.ekip : '') + (g.ambar ? ' · ' + g.ambar : ''),
      { stok, zimmet: zim, gun, hareket: [kayit, ...(a.hareket || [])].slice(0, 400) });
    this.setState({ ambarForm: null });
    // Siparişteki kalem ambara girince listeden düşer
    if (g.tur === 'giris') {
      const sp = (this.state.siparis || []).find(x => x.malzeme === g.malzeme);
      if (sp) setTimeout(() => this.siparisYaz((this.state.siparis || []).filter(x => x.id !== sp.id),
        g.malzeme + ' ambara girdi, sipariş listesinden düşüldü.'), 1800);
    }
  }
  // Kapanan arızada kullanılan malzemeyi ekip zimmetinden topluca düşer
  arizaStokDus(f) {
    const a = this.state.ambar || {};
    const stok = JSON.parse(JSON.stringify(a.stok || {}));
    const zim = JSON.parse(JSON.stringify(a.zimmet || {}));
    const hareket = [...(a.hareket || [])];
    const kim = (this.state.session && this.state.session.name) || '';
    let n = 0;
    const eksik = [];
    const islemler = [];
    for (const mz of (f.malzeme || [])) {
      const kalem = this.katalogBul(mz.ad);
      if (!kalem || !stoktaMi(kalem)) continue;
      const adet = Math.abs(Number(mz.adet) || 1);
      const elde = Number((zim[f.crew] || {})[mz.ad]) || 0;
      if (elde < adet) { eksik.push(mz.ad); continue; }
      zim[f.crew][mz.ad] = elde - adet;
      if (zim[f.crew][mz.ad] <= 0) delete zim[f.crew][mz.ad];
      const hid = 'h' + Date.now() + n;
      hareket.unshift({
        id: hid, damga: this.damga(), tur: 'sarf', malzeme: mz.ad,
        adet, birim: kalem.birim, ambar: '', ekip: f.crew, kim,
        not: (f.no || 'arıza') + ' kapanışı',
        assetId: f.assetId || null // köy/ilçe bazlı malzeme raporu için (madde 18)
      });
      islemler.push({ id: hid, tur: 'sarf', malzeme: mz.ad, adet, birim: kalem.birim,
        ambar: '', ekip: f.crew, not: (f.no || 'arıza') + ' kapanışı', assetId: f.assetId || null });
      n++;
    }
    if (n) this.denetimYaz('ambar', 'Arıza kapanışında sarf', n + ' kalem ' + f.crew
      + ' zimmetinden düşüldü' + (eksik.length ? ' · zimmette olmayan: ' + eksik.join(', ') : ''), f.no || '');
    if (!n && !eksik.length) return;
    this.ambarIslem(islemler,
      (n ? n + ' kalem ' + f.crew + ' zimmetinden düşüldü' : 'Zimmetten düşülecek kalem bulunamadı')
      + (eksik.length ? ' · zimmette olmayanlar: ' + eksik.join(', ') + '. Ambardan zimmet girip yeniden deneyin.' : '.'),
      { stok, zimmet: zim, gun: a.gun || {}, hareket: hareket.slice(0, 400) });
  }
  // Ambar hareketini sunucuya gönderir. Cihaz yeni bakiyeyi hesaplamaz;
  // yapılacak hareketi gönderir, toplama çıkarma sunucuda satır kilidi
  // altında yapılır. İki kişi aynı anda düşerse ikisi de tutar.
  // Çevrimdışıysa hareket kuyrukta bekler, bağlantı gelince gider.
  async ambarIslem(islemler, mesaj, yerelVeri) {
    // Ekranda hemen görünmesi için cihaz kopyası yine yazılır
    if (yerelVeri) {
      try { localStorage.setItem('ks-ambar', JSON.stringify(yerelVeri)); } catch (e) { /* depolama kapalı */ }
      this.setState({ ambar: yerelVeri });
    }
    const M = this._sb;
    if (!M || !this.state.sunucu || this.state.offline) {
      this.ambarKuyrukEkle(islemler);
      if (mesaj) this.duyur(mesaj + ' Bağlantı gelince ambar sunucuda da düşülecek.', 7000);
      if (yerelVeri) this.ambarKritikMesaj(islemler, yerelVeri);
      return;
    }
    const r = await M.ambarHareket(islemler);
    if (r && r.ok && r.data && r.data.ok) {
      this.modulSurumYaz('ambar', r.data.surum);
      this.modulDurumYaz('ambar', r.data.veri);
      const red = (r.data.red || []);
      if (red.length) {
        this.duyur('İşlenmeyen kalem var: '
          + red.map(x => x.malzeme + ' (' + x.neden + ')').join(', ')
          + '. Sunucudaki güncel durum yüklendi.', 11000, 'kotu');
      } else if (mesaj) {
        this.duyur(mesaj, 6000, 'iyi', () => this.setState({ tab: 'ambar' }));
      }
      this.ambarKritikMesaj(islemler, r.data.veri);
      return;
    }
    this.ambarKuyrukEkle(islemler);
    if (mesaj) this.duyur(mesaj + ' Sunucuya yazılamadı, kuyrukta bekliyor.', 8000, 'kotu');
    if (yerelVeri) this.ambarKritikMesaj(islemler, yerelVeri);
  }
  ambarKuyrukEkle(islemler) {
    const k = [...(this.state.ambarKuyruk || []), ...(islemler || [])];
    try { localStorage.setItem('ks-ambar-kuyruk', JSON.stringify(k)); } catch (e) { /* depolama kapalı */ }
    this.setState({ ambarKuyruk: k });
  }
  // Bekleyen ambar hareketlerini gönderir. Sunucu aritmetiği yaptığı için
  // bekleyen hareketler sırayla işlenir ve hiçbiri kaybolmaz.
  async ambarKuyrukGonder() {
    const bekleyen = this.state.ambarKuyruk || [];
    if (!bekleyen.length) return true;
    const M = this._sb;
    if (!M || !this.state.sunucu || this.state.offline) return false;
    const r = await M.ambarHareket(bekleyen);
    if (!(r && r.ok && r.data && r.data.ok)) return false;
    this.modulSurumYaz('ambar', r.data.surum);
    this.modulDurumYaz('ambar', r.data.veri);
    try { localStorage.setItem('ks-ambar-kuyruk', '[]'); } catch (e) { /* depolama kapalı */ }
    this.setState({ ambarKuyruk: [] });
    const red = (r.data.red || []);
    this.duyur(bekleyen.length + ' bekleyen ambar hareketi sunucuya işlendi'
      + (red.length ? ' · bakiye yetmeyen ' + red.length + ' kalem işlenmedi' : '') + '.',
      7000, red.length ? 'kotu' : 'iyi');
    this.ambarKritikMesaj(bekleyen, r.data.veri);
    return true;
  }