    const s = this.state, ui = this.th(), dark = ui.dark;
    const m = s.data;
    const arizaOn = (this.props.arizaModulu ?? true) && s.modul.ariza !== false;
    const bakimOn = s.modul.bakim !== false;
    // Hedef süre arıza modülünün içinde yaşar: arıza kapalıysa süre de yoktur
    const sureOn = arizaOn && s.modul.sure === true;
    // Kanıt ve merkez onayı da arıza modülünün içinde yaşar
    const kanitOn = arizaOn && s.modul.kanit !== false;
    const onayOn = arizaOn && s.modul.onay === true;
    const ambarOn = s.modul.ambar !== false;
    const aracOn = s.modul.arac !== false;
    const talepOn = s.modul.talep !== false;
    // Ekip listesi artık durumdan gelir (Ayarlar > Ekipler'den düzenlenir)
    const SAHA_EKIP = (s.ekipler || []).map(e => e.ad);
    const CREWS = [ATANMADI, ...SAHA_EKIP];
    // Malzeme listesi artık katalogdan gelir (Ambar > Malzeme tanımla).
    // MALZEME: arıza formundaki seçenekler (hizmetler dâhil), STOK_KALEM:
    // ambarda tutulanlar — ikisi de [ad, fiyat, birim, …] dizisi.
    const MALZEME = this.katalog().filter(k => !k.pasif).map(k => [k.ad, Number(k.fiyat) || 0, k.birim]);
    const STOK_KALEM = this.stokKalem();
    const ekipAyarBul = ad => (s.ekipler || []).find(e => e.ad === ad) || null;
    const nobetciEkip = (s.nobet || {})[new Date().getDay()] || '';
    const yerlesimOn = this.props.yerlesimSekmesi ?? true;
    const me = s.session;
    const can = k => this.yetkiVar(me, k);
    // Yönetici kilitlenemez; diğerlerinde kullanıcı kaydındaki sayfa yetkisi geçerli
    const yetki = id => {
      if (!me) return 'yok';
      if (me.role === 'yonetici') return 'tam';
      const v = (me.sayfalar || {})[id];
      return v === 'yok' || v === 'gor' ? v : 'tam';
    };
    // Süzgeç yetkisi: birleşmeden sonra yetki sayfa değil süzgeç düzeyinde
    // ölçülür. Bugün her eski sayfa tek süzgece karşılık geldiği için sonuç
    // aynı — bu adım altyapıyı kurar, görünürde bir şey değiştirmez.
    const suzgecYetki = (sayfa, sid) => {
      const t = (SUZGEC_TANIM[sayfa] || SUZGEC_GOSTERGE).find(x => x[0] === sid);
      return t ? yetki(t[2]) : 'yok';
    };
    // Bir sayfanın kullanıcıya görünen süzgeçleri
    const suzgecler = sayfa => (SUZGEC_TANIM[sayfa] || [])
      .filter(x => yetki(x[2]) !== 'yok')
      .map(([sid, ad, eski, hedef]) => ({ id: sid, ad, eski, hedef: hedef || eski, yetki: yetki(eski) }));
    // Bir süzgeci bile görünmeyen sayfa menüde çıkmaz
    const sayfaGorunur = sayfa => (SUZGEC_TANIM[sayfa] || []).some(x => yetki(x[2]) !== 'yok');
    // Sekmenin yetkisi süzgeç haritasındaki kaynağından okunur: kendi yetki
    // anahtarı olmayan bir sekme (ör. isPano) bilinmeyen anahtar → "tam"
    // varsayılanına düşüp herkese açılmasın.
    const sekmeYetki = id => { const g = SUZGEC_ESKI[id]; return g ? suzgecYetki(g.sayfa, g.suzgec) : yetki(id); };
    let tabId = s.tab;
    if (sekmeYetki(tabId) === 'yok') tabId = SAYFALAR.map(x => x[0]).find(id => yetki(id) !== 'yok') || 'harita';
    // Aktif sayfanın yetkisi süzgeç haritasından okunur; haritada karşılığı
    // olmayan sayfa (yerleşim, kuyruk) eski yola düşer.
    const aktif = SUZGEC_ESKI[tabId];
    const sayfaTam = (aktif ? suzgecYetki(aktif.sayfa, aktif.suzgec) : yetki(tabId)) === 'tam';
    const canWrite = can('write') && sayfaTam;
    const canAssign = can('assign');
    const canCreateFault = canWrite && arizaOn;
    if (tabId === 'isPano' && !(arizaOn || talepOn)) tabId = 'harita';
    if (tabId === 'isPanosu' && !(arizaOn || talepOn)) tabId = 'harita';
    if (tabId === 'ariza' && !arizaOn) tabId = 'harita';
    if (tabId === 'bakim' && !bakimOn) tabId = 'harita';
    if (tabId === 'ambar' && !ambarOn) tabId = 'harita';
    if (tabId === 'arac' && !aracOn) tabId = 'harita';
    if (tabId === 'talep' && !talepOn) tabId = 'harita';
    if (tabId === 'yerlesim' && !yerlesimOn) tabId = 'harita';
    // aktarım ekranı yalnızca bilgisayarda çizilir; telefonda boş gri sayfa çıkıyordu
    if (tabId === 'aktarim' && s.device === 'phone') tabId = 'ayarlar';
    const myFaults = me && me.role === 'personel' ? s.faults.filter(f => f.crew === me.crew) : s.faults;
    const vis = s.assets.filter(a => s.filter[a.type] && (s.filter.pasif !== false || aktifMi(a)));
    const sel = s.assets.find(a => a.id === s.selected);
    const pendA = s.assets.filter(a => a.sync === 'pending');
    const pendF = s.faults.filter(f => f.sync === 'pending');
    const bekleyenSay = pendA.length + pendF.length + (s.ambarKuyruk || []).length + Object.keys(s.modulKuyruk || {}).length
      + ((s.bekleyenEk || {}).not || 0) + ((s.bekleyenEk || {}).medya || 0);
    const openF = s.faults.filter(f => !KAPALI_DURUM.includes(f.status));
