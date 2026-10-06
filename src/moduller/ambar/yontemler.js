  ambarMevcut(malzeme, ambar) {
    return Number((((this.state.ambar || {}).stok || {})[ambar] || {})[malzeme]) || 0;
  }
  ambarZimmet(malzeme, ekip) {
    return Number((((this.state.ambar || {}).zimmet || {})[ekip] || {})[malzeme]) || 0;
  }
  // Bütün ekiplerdeki zimmet. Ekip listesine değil zimmet tablosuna bakar:
  // adı değişmiş ya da silinmiş ekibin üstündeki malzeme de sayılır.
  ambarZimmetToplam(malzeme, ambarObj) {
    const z = (ambarObj || this.state.ambar || {}).zimmet || {};
    return Object.keys(z).reduce((t, c) => t + (Number((z[c] || {})[malzeme]) || 0), 0);
  }
  ambarToplam(malzeme, ambarObj) {
    const st = (ambarObj || this.state.ambar || {}).stok || {};
    return Object.keys(st).reduce((t, A) => t + (Number((st[A] || {})[malzeme]) || 0), 0);
  }
  katalog() {
    const k = this.state.malzemeKatalog;
    return Array.isArray(k) && k.length ? k : katalogBaslangic();
  }
  katalogBul(ad) { return this.katalog().find(k => k.ad === ad) || null; }
  // Bir kalemin ambar durumu. Kritik: ambara girilmiş (ya da zimmette)
  // kalemin ambar mevcudu eşiğe inmiş ya da son 30 günün hızıyla 7 günden
  // az yetecek. Hiç girilmemiş kalem "azaldı" sayılmaz, ambarda yok demektir.
  ambarDurum(ad) {
    const k = this.katalogBul(ad) || {};
    const toplam = this.ambarToplam(ad);
    const zim = this.ambarZimmetToplam(ad);
    const esik = Number(k.esik) || KRITIK_ESIK[k.birim] || 2;
    const tuk = this.ambarTuketim(ad);
    const kacGun = tuk.ort > 0 ? toplam / tuk.ort : null;
    // Son 30 günde çıkışı olup tamamen biten kalem de kritiktir (tükendi)
    const girilmis = toplam + zim > 0 || tuk.toplam > 0;
    const kritik = girilmis && (toplam <= esik || (kacGun != null && kacGun < 7));
    return { toplam, zim, esik, tuk, kacGun, girilmis, kritik };
  }
  // Eski kodun beklediği [ad, fiyat, birim] dizisi — arıza malzeme listesi,
  // maliyet ve raporlar bunu kullanır
  stokKalem() {
    return this.katalog().filter(k => !k.pasif && stoktaMi(k)).map(k => [k.ad, Number(k.fiyat) || 0, k.birim, k.kod, k.kat, k.esik]);
  }
  // Son 30 günün net ambar çıkışı (zimmet + çıkış − iade). Sunucu her
  // hareketi gün gün "gun" altında toplar. Sistem 30 günden yeniyse ortalama
  // geçen gün sayısına bölünür, yoksa ilk haftalarda tüketim olduğundan az
  // görünürdü.
  ambarTuketim(malzeme) {
    const g = (this.state.ambar || {}).gun || {};
    const gunler = Object.keys(g).sort();
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const anahtar = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const seri = [];
    let toplam = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(bugun.getTime() - i * 86400000);
      const v = Number((g[anahtar(d)] || {})[malzeme]) || 0;
      toplam += v;
      if (i < 14) seri.push(Math.max(0, v));
    }
    toplam = Math.max(0, toplam);
    let gunSayi = 30;
    if (gunler.length) {
      const ilk = new Date(gunler[0] + 'T00:00:00');
      const gecen = Math.floor((bugun - ilk) / 86400000) + 1;
      if (gecen > 0 && gecen < 30) gunSayi = gecen;
    }
    // İlk hafta tek bir büyük zimmet ortalamayı şişirmesin: en az 7 güne böl
    gunSayi = Math.max(7, gunSayi);
    return { toplam, ort: toplam / gunSayi, seri };
  }
  // Malzeme kataloğu: yeni kalem ya da düzenleme
  malzemeKaydet(f) {
    if (!f) return;
    const ad = String(f.ad || '').trim().replace(/\s+/g, ' ');
    if (ad.length < 2) return this.duyur('Malzeme adını yazın.', 4000, 'kotu');
    // "18.500,50" ve "18.500" Türkçe yazımdır (nokta binlik ayırıcı); "18500.5" de kabul
    const fh = String(f.fiyat ?? '').trim().replace(/\s|₺/g, '');
    const fiyat = parseFloat(fh.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(fh)
      ? fh.replace(/\./g, '').replace(',', '.') : fh);
    if (f.fiyat !== '' && f.fiyat != null && (!isFinite(fiyat) || fiyat < 0)) return this.duyur('Fiyat sayı olmalı.', 4000, 'kotu');
    const esik = parseFloat(String(f.esik || '').replace(',', '.'));
    if (f.esik !== '' && f.esik != null && (!isFinite(esik) || esik < 0)) return this.duyur('Kritik eşik sayı olmalı.', 4000, 'kotu');
    const liste = this.katalog().map(k => ({ ...k }));
    const ayni = liste.find(k => sadeMetin(k.ad) === sadeMetin(ad) && k.kod !== f.kod);
    if (ayni) return this.duyur('“' + ayni.ad + '” zaten katalogda (' + ayni.kod + ').', 6000, 'kotu');
    const eski = f.kod ? liste.find(k => k.kod === f.kod) : null;
    if (eski && eski.ad !== ad && this.malzemeHareketli(eski.ad)) {
      return this.duyur('“' + eski.ad + '” için ambar hareketi var; adı değiştirilemez (mevcut ve zimmet ada göre tutulur). Yeni ad için yeni malzeme tanımlayın.', 9000, 'kotu');
    }
    const kayit = {
      kod: eski ? eski.kod : this.malzemeKodSira(liste),
      ad, kat: MALZEME_KAT[f.kat] ? f.kat : 'sarf',
      birim: MALZEME_BIRIM.includes(f.birim) ? f.birim : 'adet',
      fiyat: isFinite(fiyat) ? Math.round(fiyat * 100) / 100 : 0,
      esik: isFinite(esik) ? esik : (KRITIK_ESIK[f.birim] || 2),
      pasif: false
    };
    if (eski) {
      if (eski.birim !== kayit.birim && this.malzemeHareketli(eski.ad)) {
        return this.duyur('Hareketi olan malzemenin birimi değiştirilemez — miktarlar yanlış okunur.', 7000, 'kotu');
      }
      Object.assign(eski, kayit);
    } else liste.push(kayit);
    this.modulYaz('malzeme', liste);
    this.denetimYaz('ambar', eski ? 'Malzeme düzenlendi' : 'Malzeme tanımlandı',
      kayit.kod + ' · ' + kayit.ad + ' · ' + this.tl(kayit.fiyat) + ' / ' + kayit.birim, 'Katalog');
    this.setState({ malzemeKatalog: liste, malzemeForm: null, ambarKart: kayit.ad },
      () => this.duyur(kayit.kod + ' · ' + kayit.ad + (eski ? ' güncellendi.' : ' kataloğa eklendi.'), 5000, 'iyi'));
  }
  malzemeHareketli(ad) {
    const a = this.state.ambar || {};
    return this.ambarToplam(ad) > 0 || this.ambarZimmetToplam(ad) > 0
      || (a.hareket || []).some(h => h.malzeme === ad)
      || (this.state.ambarKuyruk || []).some(h => h.malzeme === ad);
  }
  malzemeKodSira(liste) {
    const n = liste.map(k => +(String(k.kod).match(/^MLZ-(\d+)$/) || [])[1] || 0);
    return 'MLZ-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(4, '0');
  }
  // Pasife alınan kalem listelerden düşer ama silinmez: eski hareket ve
  // raporlar onu adıyla göstermeye devam eder.
  malzemePasif(kod, pasif) {
    const liste = this.katalog().map(k => ({ ...k }));
    const k = liste.find(x => x.kod === kod);
    if (!k) return;
    if (pasif && (this.ambarToplam(k.ad) > 0 || this.ambarZimmetToplam(k.ad) > 0)) {
      return this.duyur(k.ad + ' ambarda ya da zimmette duruyor — önce çıkış/iade yapın.', 7000, 'kotu');
    }
    k.pasif = !!pasif;
    this.modulYaz('malzeme', liste);
    this.denetimYaz('ambar', pasif ? 'Malzeme pasife alındı' : 'Malzeme yeniden etkin', k.kod + ' · ' + k.ad, 'Katalog');
    this.setState({ malzemeKatalog: liste, ambarKart: pasif ? null : k.ad },
      () => this.duyur(k.ad + (pasif ? ' pasife alındı; listelerde görünmez, eski kayıtlar korunur.' : ' yeniden etkin.'), 6000, 'iyi'));
  }
  // Sipariş listesi — tükenmek üzere olan kalemler buraya eklenir, ambar
  // girişi yapılınca kendiliğinden düşer
  siparisYaz(liste, mesaj) {
    this.modulYaz('siparis', liste);
    this.setState({ siparis: liste }, () => { if (mesaj) this.duyur(mesaj, 4500, 'iyi'); });
  }
  siparisOneri(ad) {
    const k = this.katalogBul(ad);
    const t = this.ambarTuketim(ad);
    const toplam = this.ambarToplam(ad);
    // 30 günlük ihtiyaç, yoksa kritik eşiğin iki katı
    const hedef = t.ort > 0 ? Math.ceil(t.ort * 30) : Math.ceil(((k && k.esik) || 2) * 2);
    return Math.max(1, hedef - toplam);
  }
  siparisEkle(ad) {
    const liste = this.state.siparis || [];
    const var_ = liste.find(x => x.malzeme === ad);
    if (var_) return this.siparisYaz(liste.filter(x => x.id !== var_.id), ad + ' sipariş listesinden çıkarıldı.');
    const k = this.katalogBul(ad);
    this.siparisYaz([...liste, {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), malzeme: ad,
      adet: this.siparisOneri(ad), birim: k ? k.birim : 'adet',
      ekleyen: (this.state.session && this.state.session.name) || '', damga: this.damga()
    }], ad + ' sipariş listesine eklendi.');
  }
  // Miktar kutusu her tuşta sunucuya yazmasın: ekran hemen güncellenir,
  // yazma yazmayı bitirdikten bir süre sonra tek sefer yapılır
  siparisAdet(id, deger) {
    const ham = String(deger).replace(',', '.');
    const n = parseFloat(ham);
    const liste = (this.state.siparis || []).map(x => x.id === id
      ? { ...x, adet: ham === '' ? '' : (isFinite(n) && n > 0 ? n : x.adet) } : x);
    this.setState({ siparis: liste });
    clearTimeout(this._sipZaman);
    this._sipZaman = setTimeout(() => {
      const temiz = (this.state.siparis || []).map(x => x.adet === '' ? { ...x, adet: 1 } : x);
      this.siparisYaz(temiz);
    }, 900);
  }
  siparisMetin() {
    const liste = this.state.siparis || [];
    return 'Malzeme sipariş listesi — ' + this.damga() + '\n'
      + liste.map((x, i) => {
        const k = this.katalogBul(x.malzeme);
        return (i + 1) + '. ' + (k ? k.kod + ' ' : '') + x.malzeme + ' — ' + x.adet + ' ' + x.birim;
      }).join('\n');
  }
  siparisKopyala() {
    const t = this.siparisMetin();
    const bitti = () => this.duyur('Sipariş listesi panoya kopyalandı — e-posta ya da yazışmaya yapıştırabilirsiniz.', 5000, 'iyi');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(bitti, () => this.duyur('Kopyalanamadı — tarayıcı izin vermedi.', 5000, 'kotu'));
    } catch (e) { /* aşağıda bildirilir */ }
    this.duyur('Kopyalanamadı — tarayıcı izin vermedi.', 5000, 'kotu');
  }
  // Stoğu azaltan hareketten sonra kritik eşiğin altındaki kalemler için
  // uyarı verir (madde 19). ambarObj işlemin uygulandığı güncel veri —
  // this.state.ambar setState sonrası hemen güncel olmayabileceği için
  // çağıran yer elindeki güncel nesneyi (yerelVeri ya da sunucu yanıtı) verir.
  ambarKritikMesaj(islemler, ambarObj) {
    const dusuren = ['zimmet', 'sarf', 'hurda'];
    const dus = [...new Set((islemler || []).filter(i => dusuren.includes(i.tur)).map(i => i.malzeme))];
    if (!dus.length || !ambarObj) return;
    const kritikler = [];
    // (Önceden burada ekran koduna ait SAHA_EKIP kullanılıyordu; metotta
    // tanımsız olduğu için uyarı hiç çıkmıyor, işlem sonu hata veriyordu.)
    for (const ad of dus) {
      const kalem = this.katalogBul(ad);
      if (!kalem) continue;
      const toplam = this.ambarToplam(ad, ambarObj);
      const zim = this.ambarZimmetToplam(ad, ambarObj);
      const esik = Number(kalem.esik) || KRITIK_ESIK[kalem.birim] || 2;
      if (toplam + zim > 0 && toplam <= esik) kritikler.push(ad + ' ' + toplam + ' ' + kalem.birim);
    }
    if (kritikler.length) {
      // Satın alma uyarısı: kritik kalem sipariş listesine kendiliğinden eklenir
      const liste = [...(this.state.siparis || [])];
      const eklenen = [];
      for (const ad of dus) {
        const kalem = this.katalogBul(ad);
        if (!kalem || liste.some(x => x.malzeme === ad)) continue;
        const toplam = this.ambarToplam(ad, ambarObj);
        const esik = Number(kalem.esik) || KRITIK_ESIK[kalem.birim] || 2;
        if (!(toplam <= esik && toplam + this.ambarZimmetToplam(ad, ambarObj) > 0)) continue;
        liste.push({ id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), malzeme: ad, adet: this.siparisOneri(ad),
          birim: kalem.birim, ekleyen: 'Otomatik (kritik stok)', damga: this.damga(), otomatik: true });
        eklenen.push(ad);
      }
      if (eklenen.length) this.siparisYaz(liste);
      setTimeout(() => this.duyur('Kritik stok seviyesi: ' + kritikler.join(', ')
        + (eklenen.length ? '. Satın alma için sipariş listesine eklendi.' : '. Ambara giriş girilmesi gerekiyor.'), 9000, 'kotu',
        () => this.setState({ tab: 'ambar' })), 600);
    }
  }
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
        this.duyur('Bakiye yetmediği için işlenmeyen kalem var: '
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