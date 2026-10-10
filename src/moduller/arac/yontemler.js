  aracYaz(a, mesaj) {
    this.modulYaz('arac', a);
    this.setState({ arac: a, aracForm: null, aracGorev: null },
      () => { if (mesaj) this.duyur(mesaj, 6500, 'iyi', () => this.setState({ tab: 'arac' })); });
  }
  aracHareketYaz(a, kayit) {
    return { ...a, hareket: [kayit, ...(a.hareket || [])].slice(0, 400) };
  }
  // Araç kartını ekler ya da günceller
  aracKaydet(g) {
    if (!g) return;
    const ad = (g.ad || '').trim();
    if (!ad) return this.duyur('Araç adı girin.', 4000, 'kotu');
    const tur = ARAC_TUR[g.tur] ? g.tur : 'kamyonet';
    if (ARAC_TUR[tur].plaka && !(g.plaka || '').trim()) return this.duyur('Plaka girin — bu tür plakalı araç.', 5000, 'kotu');
    const a = this.state.arac || { list: [], hareket: [] };
    const list = [...(a.list || [])];
    const kart = {
      id: g.id || 'ar' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ad, tur, plaka: (g.plaka || '').trim().toLocaleUpperCase('tr'),
      yil: (g.yil || '').trim(), sayac: String(parseFloat(String(g.sayac || '').replace(',', '.')) || 0),
      muayene: g.muayene || '', sigorta: g.sigorta || '',
      marka: (g.marka || '').trim(), model: (g.model || '').trim(),
      durum: g.durum || 'musait', ekip: g.ekip || '', surucu: (g.surucu || '').trim(), is: g.is || ''
    };
    const i = list.findIndex(x => x.id === kart.id);
    if (i < 0) list.unshift(kart); else list[i] = { ...list[i], ...kart };
    this.denetimYaz('kayit', i < 0 ? 'Araç eklendi' : 'Araç bilgisi güncellendi',
      ARAC_TUR[tur].ad + (kart.plaka ? ' · ' + kart.plaka : ''), kart.ad);
    this.aracYaz({ ...a, list }, kart.ad + (i < 0 ? ' listeye eklendi.' : ' güncellendi.'));
  }
  aracSil(id) {
    const a = this.state.arac || { list: [], hareket: [] };
    const kart = (a.list || []).find(x => x.id === id);
    if (!kart) return;
    if (!window.confirm(kart.ad + ' listeden kalkacak. Görev dökümü kalır. Onaylıyor musunuz?')) return;
    this.denetimYaz('veri', 'Araç listeden kaldırıldı', ARAC_TUR[kart.tur].ad, kart.ad);
    this.aracYaz({ ...a, list: (a.list || []).filter(x => x.id !== id) }, kart.ad + ' listeden kaldırıldı.');
  }
  // Araç günlük kaydı — bakım/arıza/muayene/görev günleri, form kapanmadan eklenir (Faz 2)
  aracGunEkle() {
    const af = this.state.aracForm;
    if (!af || !af.id) return;
    const t = this.state.aracGunTaslak || {};
    if (!t.tarih) return this.duyur('Tarih seçin.', 4000, 'kotu');
    if (!GUN_TUR_ARAC[t.tur]) return this.duyur('Kayıt türü seçin.', 4000, 'kotu');
    const kayit = { id: 'gn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      tarih: t.tarih, tur: t.tur, saat: (t.saat || '').trim(), not: (t.not || '').trim() };
    const a = this.state.arac || { list: [], hareket: [] };
    const list = (a.list || []).map(v => v.id !== af.id ? v
      : { ...v, gunler: [kayit, ...(v.gunler || [])].sort((x, y) => y.tarih.localeCompare(x.tarih)) });
    const guncel = list.find(v => v.id === af.id);
    this.modulYaz('arac', { ...a, list });
    this.denetimYaz('veri', 'Araç gün kaydı eklendi', GUN_TUR_ARAC[t.tur] + ' · ' + t.tarih, af.ad);
    this.setState({ arac: { ...a, list }, aracForm: { ...af, gunler: guncel.gunler },
      aracGunTaslak: { tarih: '', tur: 'bakim', saat: '', not: '' } });
  }
  aracGunSil(gunId) {
    const af = this.state.aracForm;
    if (!af || !af.id) return;
    const a = this.state.arac || { list: [], hareket: [] };
    const list = (a.list || []).map(v => v.id !== af.id ? v
      : { ...v, gunler: (v.gunler || []).filter(g => g.id !== gunId) });
    const guncel = list.find(v => v.id === af.id);
    this.modulYaz('arac', { ...a, list });
    this.setState({ arac: { ...a, list }, aracForm: { ...af, gunler: guncel.gunler } });
  }
  // Araç son konumu — canlı takip (Arvento vb.) API'si bağlanana kadar elle
  // girilir; altyapı hazır, gerçek sağlayıcı anahtarı geldiğinde sunucu
  // tarafında (Edge Function) aynı alanı dolduran bir iş eklenir (madde 7-9).
  aracKonumKaydet(taslak) {
    const af = this.state.aracForm;
    if (!af || !af.id || !taslak) return;
    const lat = parseFloat(String(taslak.lat || '').replace(',', '.'));
    const lon = parseFloat(String(taslak.lon || '').replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lon)) return this.duyur('Enlem ve boylam girin.', 4500, 'kotu');
    const sonKonum = { lat, lon, zaman: this.damga(), not: (taslak.not || '').trim(), kaynak: 'elle' };
    const a = this.state.arac || { list: [], hareket: [] };
    const list = (a.list || []).map(v => v.id === af.id ? { ...v, sonKonum } : v);
    this.modulYaz('arac', { ...a, list });
    this.denetimYaz('kayit', 'Araç konumu girildi', lat.toFixed(5) + ', ' + lon.toFixed(5), af.ad);
    this.setState({ arac: { ...a, list }, aracForm: { ...af, sonKonum },
      aracKonumTaslak: { lat: '', lon: '', not: '' } });
    this.duyur(af.ad + ' konumu kaydedildi.', 5000, 'iyi');
  }
  // Görev ver / teslim al: sayaç okuması her iki uçta da kayda geçer
  aracGorevIsle(g) {
    if (!g) return;
    const a = this.state.arac || { list: [], hareket: [] };
    const list = [...(a.list || [])];
    const i = list.findIndex(x => x.id === g.id);
    if (i < 0) return;
    const kart = list[i], birim = ARAC_TUR[kart.tur].birim;
    const okuma = parseFloat(String(g.sayac || '').replace(',', '.'));
    if (g.mod !== 'durum' && !isFinite(okuma)) return this.duyur('Sayaç okumasını girin (' + birim + ').', 5000, 'kotu');
    if (g.mod !== 'durum' && okuma < (parseFloat(kart.sayac) || 0))
      return this.duyur('Sayaç geriye gidemez — kayıtlı değer ' + kart.sayac + ' ' + birim + '.', 6000, 'kotu');

    let ne = '', detay = '', yeni = { ...kart };
    if (g.mod === 'ver') {
      if (!g.ekip) return this.duyur('Ekip seçin.', 4000, 'kotu');
      yeni = { ...kart, durum: 'gorevde', ekip: g.ekip, surucu: (g.surucu || '').trim(), is: g.is || '', sayac: String(okuma) };
      ne = 'Görev verildi';
      detay = g.ekip + (yeni.surucu ? ' · ' + yeni.surucu : '') + (g.is ? ' · ' + g.is : '')
        + ' · çıkış ' + okuma + ' ' + birim;
    } else if (g.mod === 'al') {
      const fark = okuma - (parseFloat(kart.sayac) || 0);
      yeni = { ...kart, durum: 'musait', ekip: '', surucu: '', is: '', sayac: String(okuma) };
      ne = 'Görevden döndü';
      detay = (kart.ekip || 'ekip yazılmamış') + (kart.is ? ' · ' + kart.is : '')
        + ' · dönüş ' + okuma + ' ' + birim + ' · bu görevde ' + (Math.round(fark * 10) / 10) + ' ' + birim;
    } else {
      const d = ARAC_DURUM[g.durum] ? g.durum : 'musait';
      yeni = { ...kart, durum: d, ...(d === 'musait' ? { ekip: '', surucu: '', is: '' } : {}) };
      ne = 'Durum değişti';
      detay = ARAC_DURUM[d] + ((g.not || '').trim() ? ' · ' + g.not.trim() : '');
    }
    list[i] = yeni;
    const kayit = {
      id: 'ag' + Date.now() + Math.random().toString(36).slice(2, 5), damga: this.damga(),
      aracId: kart.id, arac: kart.ad, plaka: kart.plaka, ne, detay,
      kim: (this.state.session && this.state.session.name) || ''
    };
    this.denetimYaz('kayit', 'Araç · ' + ne, detay, kart.plaka || kart.ad);
    this.aracYaz(this.aracHareketYaz({ ...a, list }, kayit), kart.ad + ' · ' + ne + ' — ' + detay);
  }
  // Muayene ve sigortası yaklaşan / geçen araçlar için günde bir kez uyarı
  aracBelgeUyari() {
    const me = this.state.session;
    if (!me || !['yonetici', 'mudur', 'muhendis', 'operator', 'sef'].includes(me.role)) return;
    const liste = ((this.state.arac || {}).list || []);
    if (!liste.length) return;
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const iso = (bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0'));
    try { if (localStorage.getItem('ks-belge-uyari') === iso) return; } catch (e) { /* depolama kapalı */ }
    const kalan = d => { if (!d) return null; const x = new Date(d + 'T00:00:00'); return isNaN(x) ? null : Math.round((x - bugun) / 86400000); };
    const gecen = [], yakin = [];
    for (const v of liste) for (const [ad, d] of [['muayene', v.muayene], ['sigorta', v.sigorta]]) {
      const k = kalan(d);
      if (k == null) continue;
      const adi = (v.plaka || v.ad) + ' ' + ad;
      if (k < 0) gecen.push(adi); else if (k <= 30) yakin.push(adi + ' (' + k + ' gün)');
    }
    if (!gecen.length && !yakin.length) return;
    try { localStorage.setItem('ks-belge-uyari', iso); } catch (e) { /* depolama kapalı */ }
    this.duyur((gecen.length ? 'Süresi geçen: ' + gecen.slice(0, 3).join(', ') + (gecen.length > 3 ? '…' : '') + '. ' : '')
      + (yakin.length ? 'Yaklaşan: ' + yakin.slice(0, 3).join(', ') + (yakin.length > 3 ? '…' : '') : ''), 14000, gecen.length ? 'kotu' : 'bilgi',
      () => this.setState({ tab: 'arac' }));
  }
  // Saha: araç arızalandı ya da kaza oldu — araç "arızalı" olur, iş ekipten alınıp merkeze devredilir
  // (bekleme olarak işaretlenir: aradaki süre SLA'dan düşer)
  aracOlay(f, tur) {
    if (!f) return;
    const kaza = tur === 'kaza';
    const a = this.state.arac || { list: [], hareket: [] };
    const v = (a.list || []).find(x => x.ekip === f.crew && x.durum === 'gorevde');
    const neden = (kaza ? 'Kaza' : 'Araç arızası') + ' — iş devri gerekiyor';
    const simdi = this.damga();
    if (v) {
      const list = (a.list || []).map(x => x.id === v.id ? { ...x, durum: 'arizali', ekip: '', surucu: '', is: '' } : x);
      const kayit = {
        id: 'ag' + Date.now() + Math.random().toString(36).slice(2, 5), damga: simdi, aracId: v.id, arac: v.ad, plaka: v.plaka,
        ne: kaza ? 'Kaza bildirimi' : 'Arıza bildirimi', detay: (f.no || '') + ' görevinde · ' + f.crew,
        kim: (this.state.session && this.state.session.name) || ''
      };
      this.denetimYaz('kayit', 'Araç · ' + kayit.ne, kayit.detay, v.plaka || v.ad);
      this.aracYaz(this.aracHareketYaz({ ...a, list }, kayit), null);
    }
    this.sahaDurum(f, 'bekleme', {
      crew: ATANMADI, ek: { ...(f.ek || {}), beklemeNeden: neden, oncekiDurum: 'atandi' }, ekBekleyen: true,
      note: ((f.note || f.desc || '') + '\n' + (kaza ? 'KAZA' : 'ARAÇ ARIZASI') + ' · ' + simdi + ' · ' + f.crew + (v ? ' · ' + (v.plaka || v.ad) : '') + ' — iş merkeze devredildi.').trim()
    });
    this.setState({ olaySheet: null, sahaAktifId: null });
    this.duyur('İş merkeze devredildi — yeniden atama için bekliyor. Süre SLA’dan düşülür.', 8000, 'iyi');
  }