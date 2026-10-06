  // ── Personel havuzu ──────────────────────────────────────────
  personelYaz(liste, mesaj) {
    this.modulYaz('personel', liste);
    this.setState({ personel: liste, personelForm: null }, () => {
      if (mesaj) this.duyur(mesaj, 6000, 'iyi', () => this.setState({ tab: 'ayarlar', ayarBolum: 'ekip' }));
    });
  }
  personelBul(id) { return (this.state.personel || []).find(p => p.id === id) || null; }
  personelKaydet(g) {
    if (!g) return;
    const ad = (g.ad || '').trim();
    if (!ad) return this.duyur('Ad soyad girin.', 4500, 'kotu');
    const liste = (this.state.personel || []).map(p => ({ ...p }));
    const ayni = liste.find(p => p.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr') && p.id !== g.id);
    if (ayni) return this.duyur(ad + ' havuzda zaten var. Aynı adda ikinci kişi varsa ayırt edici bir şey ekleyin.', 7000, 'kotu');
    const kart = {
      id: g.id || 'ps' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ad, meslek: meslekEsle(g.meslek), tel: (g.tel || '').trim(), not: (g.not || '').trim(),
      durum: PERSONEL_DURUM[g.durum] ? g.durum : 'aktif',
      donus: g.donus || '',
      kullanici: (g.kullanici || '').trim(),
      araclar: Array.isArray(g.araclar) ? g.araclar.filter(k => ARAC_TUR[k]) : [],
      gunler: Array.isArray(g.gunler) ? g.gunler : []
    };
    // Bir kullanıcı hesabı yalnız tek kişiye bağlanabilir
    if (kart.kullanici) {
      const cakisan = liste.find(p => p.kullanici === kart.kullanici && p.id !== kart.id);
      if (cakisan) return this.duyur(kart.kullanici + ' hesabı ' + cakisan.ad
        + ' kişisine bağlı. Önce oradan kaldırın.', 8000, 'kotu');
    }
    const i = liste.findIndex(p => p.id === kart.id);
    if (i < 0) liste.push(kart); else liste[i] = kart;
    this.denetimYaz('ayar', i < 0 ? 'Personel eklendi' : 'Personel güncellendi',
      kart.meslek + (kart.tel ? ' · ' + kart.tel : ''), ad);
    this.personelYaz(liste, ad + (i < 0 ? ' havuza eklendi' : ' güncellendi') + ' · ' + kart.meslek + '.');
  }
  personelSil(id) {
    const p = this.personelBul(id);
    if (!p) return;
    const ekipler = (this.state.ekipler || []).filter(e => (e.uyeIdler || []).includes(id) || e.sefId === id);
    if (ekipler.length) {
      return this.duyur(p.ad + ' silinemez — ' + ekipler.map(e => e.ad).join(', ')
        + ' ekibinde görünüyor. Önce ekipten çıkarın.', 8000, 'kotu');
    }
    if (!window.confirm(p.ad + ' havuzdan silinecek. Onaylıyor musunuz?')) return;
    this.denetimYaz('veri', 'Personel silindi', p.meslek, p.ad);
    this.personelYaz((this.state.personel || []).filter(x => x.id !== id), p.ad + ' havuzdan silindi.');
  }
  // Günlük izin/mesai kaydı — personelForm açıkken alt bölümde eklenir/silinir,
  // panel kapanmaz (Faz 2, madde 6). Kayıt personel kartının kendi içinde tutulur.
  personelGunEkle() {
    const pf = this.state.personelForm;
    if (!pf || !pf.id) return;
    const t = this.state.personelGunTaslak || {};
    if (!t.tarih) return this.duyur('Tarih seçin.', 4000, 'kotu');
    if (!GUN_TUR_PERSONEL[t.tur]) return this.duyur('Kayıt türü seçin.', 4000, 'kotu');
    const kayit = { id: 'gn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      tarih: t.tarih, tur: t.tur, saat: (t.saat || '').trim(), not: (t.not || '').trim() };
    const liste = (this.state.personel || []).map(p => p.id !== pf.id ? p
      : { ...p, gunler: [kayit, ...(p.gunler || [])].sort((a, b) => b.tarih.localeCompare(a.tarih)) });
    const guncel = liste.find(p => p.id === pf.id);
    this.modulYaz('personel', liste);
    this.denetimYaz('veri', 'Personel gün kaydı eklendi', GUN_TUR_PERSONEL[t.tur] + ' · ' + t.tarih, pf.ad);
    this.setState({ personel: liste, personelForm: { ...pf, gunler: guncel.gunler },
      personelGunTaslak: { tarih: '', tur: 'izin', saat: '', not: '' } });
  }
  personelGunSil(gunId) {
    const pf = this.state.personelForm;
    if (!pf || !pf.id) return;
    const liste = (this.state.personel || []).map(p => p.id !== pf.id ? p
      : { ...p, gunler: (p.gunler || []).filter(g => g.id !== gunId) });
    const guncel = liste.find(p => p.id === pf.id);
    this.modulYaz('personel', liste);
    this.setState({ personel: liste, personelForm: { ...pf, gunler: guncel.gunler } });
  }
  // Nöbet takvimi: gün → ekip
  nobetYaz(gun, ekipAdi) {
    const y = { ...(this.state.nobet || {}) };
    if (ekipAdi) y[gun] = ekipAdi; else delete y[gun];
    const g = GUNLER.find(x => x.k === gun);
    this.denetimYaz('ayar', 'Nöbet takvimi değişti',
      (g ? g.ad : gun) + ' → ' + (ekipAdi || 'nöbetçi kaldırıldı'), 'Ekipler');
    this.modulYaz('nobet', y);
    this.setState({ nobet: y });
  }
  // Bugünün nöbetçi ekibi — arıza formunda öneri olarak kullanılır
  bugunNobetci() {
    return (this.state.nobet || {})[new Date().getDay()] || '';
  }
  // Ekibin görevde olan kişileri (izinli/raporlu düşülür)
  ekipCalisanlar(ekipAdi) {
    const e = this.ekipBul(ekipAdi);
    if (!e) return { calisan: [], yok: [] };
    const kisiler = (e.uyeIdler || []).map(id => this.personelBul(id)).filter(Boolean);
    return {
      calisan: kisiler.filter(p => !PERSONEL_YOK.includes(p.durum)),
      yok: kisiler.filter(p => PERSONEL_YOK.includes(p.durum))
    };
  }
  // ── Ekip yönetimi ────────────────────────────────────────────
  ekipListe() { return (this.state.ekipler || []).map(e => e.ad); }
  ekipBul(ad) { return (this.state.ekipler || []).find(e => e.ad === ad) || null; }
  ekipKaydetHam(liste, mesaj, tur) {
    this.modulYaz('ekip', liste);
    this.setState({ ekipler: liste, ekipForm: null }, () => {
      if (mesaj) this.duyur(mesaj, 6500, tur || 'iyi', () => this.setState({ tab: 'ayarlar', ayarBolum: 'ekip' }));
    });
  }
  // Ekip ekle / güncelle. Ad değişirse arıza, zimmet ve araç kayıtları da taşınır.
  ekipKaydet(g) {
    if (!g) return;
    const ad = (g.ad || '').trim();
    if (!ad) return this.duyur('Ekip adı girin — örnek “Ekip 5 — Akpınar”.', 5000, 'kotu');
    if (ad === ATANMADI) return this.duyur('“Atanmadı” ekip adı olarak kullanılamaz — bu, ekip atanmamış kayıtların karşılığı.', 6500, 'kotu');
    const liste = (this.state.ekipler || []).map(e => ({ ...e }));
    const eski = g.eskiAd || '';
    const cakisma = liste.find(e => e.ad === ad && e.ad !== eski);
    if (cakisma) return this.duyur('Bu adda ekip zaten var.', 4500, 'kotu');
    const uyeIdler = (Array.isArray(g.uyeIdler) ? g.uyeIdler : []).filter(id => this.personelBul(id));
    // Yetkinlik: elle işaretlenenler + üyelerin mesleğinden gelenler
    const meslekten = uyeIdler
      .map(id => meslekYetkinlik((this.personelBul(id) || {}).meslek))
      .filter(Boolean);
    const kart = {
      ad, vardiya: g.vardiya || 'Gündüz', tel: (g.tel || '').trim(),
      sefTel: (g.sefTel || '').trim(),
      sefId: uyeIdler.includes(g.sefId) ? g.sefId : '',
      // Boş dizi = tüm il. Birden çok ilçe seçilebilir.
      bolgeler: (Array.isArray(g.bolgeler) ? g.bolgeler : []).filter(Boolean),
      not: (g.not || '').trim(),
      yetkinlik: [...new Set([...(Array.isArray(g.yetkinlik) ? g.yetkinlik : []), ...meslekten])],
      uyeIdler
    };
    const i = eski ? liste.findIndex(e => e.ad === eski) : -1;
    if (i < 0) {
      liste.push(kart);
      this.denetimYaz('ayar', 'Ekip eklendi',
        kart.vardiya + ' · ' + (kart.yetkinlik.join(', ') || 'yetkinlik girilmedi')
        + ' · ' + kart.uyeIdler.length + ' kişi', ad);
      return this.ekipKaydetHam(liste, ad + ' eklendi. Arıza formunda ekip listesinde görünür.');
    }
    liste[i] = kart;
    let tasima = '';
    if (eski !== ad) {
      const fa = (this.state.faults || []).map(f => f.crew === eski ? { ...f, crew: ad } : f);
      const sayi = (this.state.faults || []).filter(f => f.crew === eski).length;
      const A = this.state.arac || { list: [], hareket: [] };
      const aList = (A.list || []).map(v => v.ekip === eski ? { ...v, ekip: ad } : v);
      const amb = this.state.ambar || {};
      const zim = { ...(amb.zimmet || {}) };
      if (zim[eski]) { zim[ad] = zim[eski]; delete zim[eski]; }
      this.setState({ faults: fa, arac: { ...A, list: aList }, ambar: { ...amb, zimmet: zim } });
      this.modulYaz('arac', { ...A, list: aList });
      this.modulYaz('ambar', { ...amb, zimmet: zim });
      tasima = ' Eski ad ' + sayi + ' arıza kaydında güncellendi, zimmet ve araç ataması taşındı.';
      this.denetimYaz('ayar', 'Ekip adı değişti', eski + ' → ' + ad + ' · ' + sayi + ' kayıt güncellendi', ad);
    } else {
      this.denetimYaz('ayar', 'Ekip güncellendi',
        kart.vardiya + ' · ' + (kart.yetkinlik.join(', ') || 'yetkinlik girilmedi')
        + ' · ' + kart.uyeIdler.length + ' kişi', ad);
    }
    this.ekipKaydetHam(liste, ad + ' güncellendi.' + tasima);
  }
  ekipSil(ad) {
    const acik = (this.state.faults || []).filter(f => f.crew === ad && !KAPALI_DURUM.includes(f.status)).length;
    const zim = Object.keys(((this.state.ambar || {}).zimmet || {})[ad] || {}).length;
    const arac = ((this.state.arac || {}).list || []).filter(v => v.ekip === ad).length;
    if (acik || zim || arac) {
      return this.duyur(ad + ' silinemez: ' + [
        acik ? acik + ' açık iş' : '', zim ? zim + ' zimmetli kalem' : '', arac ? arac + ' araç' : ''
      ].filter(Boolean).join(', ') + ' üzerinde. Önce bunları başka ekibe aktarın.', 9000, 'kotu');
    }
    if (!window.confirm(ad + ' listeden kalkacak.\n\nGeçmiş arıza kayıtlarında adı olduğu gibi kalır — istatistik bozulmaz. Onaylıyor musunuz?')) return;
    this.denetimYaz('veri', 'Ekip listeden kaldırıldı', '', ad);
    this.ekipKaydetHam((this.state.ekipler || []).filter(e => e.ad !== ad),
      ad + ' listeden kaldırıldı. Geçmiş kayıtlarda adı duruyor.');
  }
  // Tek alan değişikliği: vardiya, telefon, yetkinlik — kayıt üzerinden
  ekipAyar(ad, yama) {
    const liste = (this.state.ekipler || []).map(e => e.ad === ad ? { ...e, ...yama } : e);
    const y = liste.find(e => e.ad === ad);
    if (!y) return;
    this.denetimYaz('ayar', 'Ekip bilgisi değişti', ad + ' · '
      + (yama.vardiya ? 'vardiya ' + yama.vardiya
        : (yama.tel != null ? 'telefon güncellendi'
          : 'yetkinlik ' + ((yama.yetkinlik || []).join(', ') || 'boş'))), ad);
    this.modulYaz('ekip', liste);
    this.setState({ ekipler: liste }, () => this.duyur(ad + ' · ' + (y.vardiya || '—') + ' · '
      + ((y.tel || '').trim() || 'telefon girilmedi') + ' · '
      + ((y.yetkinlik || []).join(', ') || 'yetkinlik girilmedi')
      + '. Arıza formunda ekip seçilirken görünür.', 5000, 'iyi',
      () => this.setState({ tab: 'ayarlar', ayarBolum: 'ekip' })));
  }