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

    // markers
    const markers = [];
    if (s.zoom <= 11.6) {
      const g = s.zoom <= 10 ? .34 : .17, cells = new Map();
      for (const a of vis) {
        const k = `${Math.floor(a.lat / g)}:${Math.floor(a.lon / g)}`;
        const c = cells.get(k) || { n: 0, lat: 0, lon: 0, pend: 0, items: [] };
        c.n++; c.lat += a.lat; c.lon += a.lon; c.items.push(a);
        if (a.sync === 'pending') c.pend++;
        cells.set(k, c);
      }
      for (const [, c] of cells) {
        const p = this.proj(c.lat / c.n, c.lon / c.n);
        if (p.x < -8 || p.x > 108 || p.y < -8 || p.y > 108) continue;
        const single = c.n === 1, a = c.items[0];
        markers.push({
          x: p.x.toFixed(2), y: p.y.toFixed(2), z: 3,
          label: single ? TYPES[a.type].glyph : String(c.n),
          size: single ? '26px' : (c.n > 9 ? '34px' : '30px'), fs: single ? '11px' : '12px',
          fill: single ? (c.pend ? 'var(--color-accent)' : ui.surf) : ui.fg,
          stroke: c.pend ? 'var(--color-accent)' : ui.fg,
          ink: single ? (c.pend ? '#fff' : ui.fg) : ui.bg,
          tap: single ? () => this.setState({ selected: a.id, detailTab: 'bilgi', panel: 'detay' })
            : () => this.setState({ zoom: 13, center: { lat: c.lat / c.n, lon: c.lon / c.n } })
        });
      }
    } else {
      for (const a of vis) {
        const p = this.proj(a.lat, a.lon);
        if (p.x < -8 || p.x > 108 || p.y < -8 || p.y > 108) continue;
        const pend = a.sync === 'pending', isSel = a.id === s.selected;
        const hasFault = openF.some(f => f.assetId === a.id);
        const pasif = !aktifMi(a);
        markers.push({
          x: p.x.toFixed(2), y: p.y.toFixed(2), z: isSel ? 5 : 3,
          label: TYPES[a.type].glyph, size: '28px', fs: '11px',
          kenar: pasif ? 'dashed' : 'solid', solgun: '1',
          fill: pasif ? '#3f4a5a' : (pend || hasFault ? 'var(--color-accent)' : (isSel ? ui.fg : ui.surf)),
          stroke: pasif ? '#eceaea' : (pend || hasFault ? 'var(--color-accent)' : ui.fg),
          ink: pasif ? '#fff' : (pend || hasFault ? '#fff' : (isSel ? ui.bg : ui.fg)),
          tap: () => this.setState({ selected: a.id, detailTab: 'bilgi', panel: 'detay' })
        });
      }
    }

    // search
    const q = s.query.trim(), qn = norm(q);
    // ── envanter / arıza: başlıktan sıralama, sütun filtreleri, kendi arama kutusu
    const okla = (st, k) => (st.k === k ? (st.dir > 0 ? ' ↑' : ' ↓') : '');
    const kar = (x, y) => (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'tr');
    const envSort = s.envSort || { k: 'code', dir: 1 };
    const envF = s.envF || {};
    const envQn = norm((s.envQ || '').trim());
    const envDurum = a => a.sync === 'pending' ? 'Bekliyor' : 'Eşitlendi';
    const envVal = (a, k) => k === 'type' ? TYPES[a.type].kind : k === 'place' ? this.yer(a)
      : k === 'year' ? (a.year || 0) : k === 'photos' ? (a.photos || 0)
      : k === 'status' ? envDurum(a) : k === 'aktiflik' ? aktifAd(a) : a.code;
    const envArar = (a, t) => norm(a.code).includes(t) || norm(a.village || '').includes(t)
      || norm(a.district || '').includes(t) || norm(TYPES[a.type].kind).includes(t) || !!this.alanAra(a, t);
    const envSatir = [...vis]
      .filter(a => (qn.length < 2 || envArar(a, qn))
        && (!envQn || envArar(a, envQn))
        && (!envF.tur || a.type === envF.tur)
        && (!envF.ilce || a.district === envF.ilce)
        && (!envF.durum || envDurum(a) === envF.durum)
        && (!envF.aktiflik || aktifAd(a) === envF.aktiflik))
      .sort((a, b) => kar(envVal(a, envSort.k), envVal(b, envSort.k)) * envSort.dir);
    const ENV_KOL = [['code', 'Kod'], ['type', 'Tür'], ['place', 'Köy / İlçe'], ['year', 'Yapım yılı'], ['photos', 'Fotoğraf'], ['aktiflik', 'Durum'], ['status', 'Eşitleme']];
    const envTik = k => () => this.setState(st => ({ envSort: { k, dir: (st.envSort && st.envSort.k === k) ? -st.envSort.dir : 1 } }));
    const envKontrol = {
      q: s.envQ || '',
      onQ: e => this.setState({ envQ: e.target.value }),
      sayi: envSatir.length + ' / ' + vis.length + ' kayıt',
      bosMu: envSatir.length === 0,
      suzuluyor: !!(envQn || envF.tur || envF.ilce || envF.durum || envF.aktiflik),
      bosNot: (envQn || envF.tur || envF.ilce || envF.durum || envF.aktiflik) ? 'Bu süzgeçle kayıt yok — süzgeci temizleyin.' : 'Henüz envanter kaydı yok.',
      temizle: () => this.setState({ envQ: '', envF: {}, envSort: { k: 'code', dir: 1 } }),
      h: ENV_KOL.reduce((o, kl) => (o[kl[0]] = { label: kl[1], ok: okla(envSort, kl[0]), tik: envTik(kl[0]) }, o), {}),
      siraOpts: ENV_KOL.map(kl => ({ v: kl[0], n: kl[1] })),
      siraVal: envSort.k,
      onSira: e => this.setState({ envSort: { k: e.target.value, dir: 1 } }),
      yon: envSort.dir > 0 ? 'A→Z' : 'Z→A',
      yonTik: () => this.setState(st => ({ envSort: { k: st.envSort.k, dir: -st.envSort.dir } })),
      turVal: envF.tur || '',
      onTur: e => this.setState(st => ({ envF: { ...st.envF, tur: e.target.value } })),
      turler: [{ v: '', n: 'Tür — tümü' }].concat(Object.keys(TYPES).map(k => ({ v: k, n: TYPES[k].kind }))),
      ilceVal: envF.ilce || '',
      onIlceF: e => this.setState(st => ({ envF: { ...st.envF, ilce: e.target.value } })),
      ilceler: [{ v: '', n: 'İlçe — tümü' }].concat(m ? m.DISTRICTS.map(d => ({ v: d.name, n: d.name })) : []),
      durumVal: envF.durum || '',
      onDurum: e => this.setState(st => ({ envF: { ...st.envF, durum: e.target.value } })),
      durumlar: [{ v: '', n: 'Eşitleme — tümü' }, { v: 'Bekliyor', n: 'Bekliyor' }, { v: 'Eşitlendi', n: 'Eşitlendi' }],
      aktiflikVal: envF.aktiflik || '',
      onAktiflik: e => this.setState(st => ({ envF: { ...st.envF, aktiflik: e.target.value } })),
      aktiflikler: [{ v: '', n: 'Durum — tümü' }, { v: 'Aktif', n: 'Aktif' }, { v: 'Pasif', n: 'Pasif' }, { v: 'Arızalı', n: 'Arızalı' }]
    };
    const arzSort = s.arzSort || { k: 'no', dir: 1 };
    const arzF = s.arzF || {};
    const arzQn = norm((s.arzQ || '').trim());
    const arzKod = f => { const a = f.assetId ? s.assets.find(x => x.id === f.assetId) : null; return (a ? a.code + ' ' + (a.village || '') : '') + ' ' + (f.koy || ''); };
    const ONC_SIRA = { 'Acil': 0, 'Yüksek': 1, 'Normal': 2, 'Düşük': 3 };
    const arzVal = (f, k) => k === 'assetCode' ? arzKod(f) : k === 'status' ? (STATUS_LABEL[f.status] || '')
      : k === 'priority' ? (ONC_SIRA[f.priority] === undefined ? 9 : ONC_SIRA[f.priority])
      // "GG.AA.YYYY" metin olarak sıralanınca 30.09 > 01.10 çıkıyordu — zamanla sıralanır
      : k === 'opened' ? this.damgaMs(f.opened)
      : String(f[k] || '');
    const arzArar = (f, t) => norm(f.no || '').includes(t) || norm(arzKod(f)).includes(t)
      || norm(f.type || '').includes(t) || norm(f.crew || '').includes(t) || norm(f.district || '').includes(t)
      || norm(f.note || '').includes(t) || norm(STATUS_LABEL[f.status] || '').includes(t);
    const arzSatir = [...myFaults]
      .filter(f => (!arzQn || arzArar(f, arzQn))
        && (!arzF.oncelik || f.priority === arzF.oncelik)
        && (!arzF.durum || f.status === arzF.durum)
        && (!arzF.ekip || f.crew === arzF.ekip))
      .sort((a, b) => kar(arzVal(a, arzSort.k), arzVal(b, arzSort.k)) * arzSort.dir);
    const ARZ_KOL = [['no', 'No'], ['assetCode', 'Kayıt'], ['type', 'Arıza türü'], ['priority', 'Öncelik'], ['status', 'Durum'], ['crew', 'Ekip'], ['opened', 'Bildirim']];
    const arzTik = k => () => this.setState(st => ({ arzSort: { k, dir: (st.arzSort && st.arzSort.k === k) ? -st.arzSort.dir : 1 } }));
    const arzKontrol = {
      sureVar: sureOn, kolonSayi: sureOn ? 8 : 7,
      q: s.arzQ || '',
      onQ: e => this.setState({ arzQ: e.target.value }),
      sayi: arzSatir.length + ' / ' + myFaults.length + ' kayıt',
      bosMu: arzSatir.length === 0,
      suzuluyor: !!(arzQn || arzF.oncelik || arzF.durum || arzF.ekip),
      bosNot: (arzQn || arzF.oncelik || arzF.durum || arzF.ekip) ? 'Bu süzgeçle arıza kaydı yok — süzgeci temizleyin.' : 'Açık arıza kaydı yok.',
      temizle: () => this.setState({ arzQ: '', arzF: {}, arzSort: { k: 'no', dir: 1 } }),
      h: ARZ_KOL.reduce((o, kl) => (o[kl[0]] = { label: kl[1], ok: okla(arzSort, kl[0]), tik: arzTik(kl[0]) }, o), {}),
      siraOpts: ARZ_KOL.map(kl => ({ v: kl[0], n: kl[1] })),
      siraVal: arzSort.k,
      onSira: e => this.setState({ arzSort: { k: e.target.value, dir: 1 } }),
      yon: arzSort.dir > 0 ? 'A→Z' : 'Z→A',
      yonTik: () => this.setState(st => ({ arzSort: { k: st.arzSort.k, dir: -st.arzSort.dir } })),
      oncelikVal: arzF.oncelik || '',
      onOncelik: e => this.setState(st => ({ arzF: { ...st.arzF, oncelik: e.target.value } })),
      oncelikler: [{ v: '', n: 'Öncelik — tümü' }].concat(['Acil', 'Yüksek', 'Normal', 'Düşük'].map(v => ({ v: v, n: v }))),
      durumVal: arzF.durum || '',
      onDurum: e => this.setState(st => ({ arzF: { ...st.arzF, durum: e.target.value } })),
      durumlar: [{ v: '', n: 'Durum — tümü' }].concat(Object.keys(STATUS_LABEL).map(k => ({ v: k, n: STATUS_LABEL[k] }))),
      ekipVal: arzF.ekip || '',
      onEkip: e => this.setState(st => ({ arzF: { ...st.arzF, ekip: e.target.value } })),
      ekipler: [{ v: '', n: 'Ekip — tümü' }].concat(CREWS.map(v => ({ v: v, n: v })))
    };
    // ITRF96 / TM sağa-yukarı: ondalıklı ve virgüllü de olur — "572799,55 4331744,74"
    const tm = (() => {
      if (!/\d/.test(q)) return null;
      const raw = q.replace(/[.\s]*(m|metre)\b/gi, ' ').trim();
      // virgül ondalık ayırıcı ise (rakam,rakam-rakam) noktaya çevir, ayırıcı virgülleri boşluk yap
      const cleaned = raw.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2').replace(/,/g, ' ');
      const nums = (cleaned.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      if (nums.length !== 2) return null;
      const [a, b] = nums;
      const isE = v => v >= 100000 && v < 1000000, isN = v => v >= 3500000 && v < 5000000;
      let E, N;
      if (isE(a) && isN(b)) { E = a; N = b; }
      else if (isE(b) && isN(a)) { E = b; N = a; }
      else return null;
      for (const z of [33, 36, 30, 39]) {
        const [la, lo] = tmInverse(E, N, z, ELL.grs80);
        if (la > 35 && la < 43 && lo > 25 && lo < 46) return { E, N, zone: z, lat: la, lon: lo };
      }
      return null;
    })();
    const cmatch = null;
    // WGS84 ondalık derece: "39.1462 34.1583" · "39,1462, 34,1583" · "34.1583 39.1462" · N/E harfleri olsa da olur
    const wgs = (() => {
      if (tm || !/\d/.test(q)) return null;
      const nums = (q.replace(/[NnSsEeWwKkGgDdBb°'"´]/g, ' ').match(/-?\d{1,3}[.,]\d+/g) || [])
        .map(x => parseFloat(x.replace(',', '.')));
      if (nums.length !== 2) return null;
      const [a, b] = nums;
      const ok = (la, lo) => la > 35 && la < 43 && lo > 25 && lo < 46;
      if (ok(a, b)) return { lat: a, lon: b, swapped: false };
      if (ok(b, a)) return { lat: b, lon: a, swapped: true };
      return null;
    })();
    let suggestions = [];
    if (tm) {
      const nr = s.assets.map(a => ({ a, km: 6371 * 2 * Math.asin(Math.sqrt(
        Math.sin((a.lat - tm.lat) * Math.PI / 360) ** 2 +
        Math.cos(tm.lat * Math.PI / 180) * Math.cos(a.lat * Math.PI / 180) *
        Math.sin((a.lon - tm.lon) * Math.PI / 360) ** 2)) }))
        .sort((x, y) => x.km - y.km)[0];
      suggestions = [{
        name: `${tm.E.toFixed(2)} · ${tm.N.toFixed(2)}`,
        kind: 'ITRF96 · ' + tm.zone + '° DİLİM',
        meta: `WGS84 ${tm.lat.toFixed(5)}, ${tm.lon.toFixed(5)}` + (nr ? ` · en yakın ${nr.a.code}, ${nr.km.toFixed(1)} km` : ''),
        go: () => {
          this.flyTo(tm.lat, tm.lon, 16);
          this.toMap({ ks: 'go', lat: tm.lat, lon: tm.lon, label: `ITRF96 ${tm.zone}° · aranan koordinat` });
          this.setState({ query: '', tab: 'harita' });
          this.say(`${tm.zone}° dilim → WGS84 ${tm.lat.toFixed(5)}, ${tm.lon.toFixed(5)}${nr ? ` — en yakın kayıt ${nr.a.code}, ${nr.km.toFixed(1)} km` : ''}`);
        }
      }];
      if (nr && nr.km < 0.3) suggestions.push({
        name: nr.a.code, kind: 'Kayıt', meta: `bu koordinatta · ${this.yer(nr.a)}`,
        go: () => { this.flyTo(nr.a.lat, nr.a.lon, 16); this.setState({ query: '', selected: nr.a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }); }
      });
    } else if (wgs) {
      const near = s.assets.map(a => ({ a, km: 6371 * 2 * Math.asin(Math.sqrt(
        Math.sin((a.lat - wgs.lat) * Math.PI / 360) ** 2 +
        Math.cos(wgs.lat * Math.PI / 180) * Math.cos(a.lat * Math.PI / 180) *
        Math.sin((a.lon - wgs.lon) * Math.PI / 360) ** 2)) }))
        .sort((x, y) => x.km - y.km)[0];
      suggestions = [{
        name: `${wgs.lat.toFixed(5)} , ${wgs.lon.toFixed(5)}`,
        kind: 'Koordinat',
        meta: (wgs.swapped ? 'boylam-enlem sırası düzeltildi · ' : '') +
          (near ? `en yakın kayıt ${near.a.code}, ${near.km.toFixed(1)} km` : 'haritaya git'),
        go: () => {
          this.flyTo(wgs.lat, wgs.lon, 16);
          this.toMap({ ks: 'go', lat: wgs.lat, lon: wgs.lon, label: 'Aranan koordinat' });
          this.setState({ query: '', tab: 'harita' });
          this.say(`Koordinata gidildi: ${wgs.lat.toFixed(5)}, ${wgs.lon.toFixed(5)}${near ? ` — en yakın kayıt ${near.a.code}, ${near.km.toFixed(1)} km` : ''}`);
        }
      }];
      if (near && near.km < 0.3) suggestions.push({
        name: near.a.code, kind: 'Kayıt', meta: `bu koordinatta · ${this.yer(near.a)}`,
        go: () => { this.flyTo(near.a.lat, near.a.lon, 16); this.setState({ query: '', selected: near.a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }); }
      });
    } else if (qn.length > 2 && s.assets.some(a => this.alanAra(a, qn))) {
      // tüm teknik alanlarda arama — pompa markası, arıza türü, kuyu logu, her şey
      const bulunan = s.assets.filter(a => this.alanAra(a, qn)).slice(0, 8);
      suggestions = bulunan.map(a => {
        const nerede = this.alanAra(a, qn);
        return {
          name: a.code, kind: TYPES[a.type].glyph,
          meta: `${nerede} · ${this.yer(a)}`,
          // Liste görünümündeysek listede kalınır: arama kutusuna kod yazılır,
          // kayıt tabloda süzülür. Haritadaysak haritada bulunur.
          go: () => {
            if (this.state.tab === 'envanter') {
              this.setState({ query: '', envQ: a.code, selected: a.id, detailTab: 'bilgi' });
              return;
            }
            this.flyTo(a.lat, a.lon, 16);
            this.setState({ query: '', selected: a.id, panel: 'detay', detailTab: 'bilgi' });
          }
        };
      });
    } else if (qn.length > 1 && m) {
      const vill = [];
      const gorulen = new Set();
      // "Eldelekliortaoba" ile "Eldelekli Ortaoba" aynı köydür — boşluk ve noktalama atılır
      const anahtar = x => norm(x).replace(/[^a-z0-9]/g, '');
      // gömülü HGM yerleşim listesi — koordinatı kesin bilinir, internet gerekmez
      for (const r of (this._yer || [])) {
        const nr = norm(r[0]);
        if (nr !== qn && nr.indexOf(qn) !== 0 && !nr.split(' ').some(w => w.indexOf(qn) === 0)) continue;
        if (r[3] === 'ILCE' || r[3] === 'IL') continue;
        gorulen.add(anahtar(r[0]));
        // r[4] varsa resmî ilçe adıdır; yoksa en yakın ilçe merkezine göre tahmin edilir
        const dd = (r[4] && m.DISTRICTS.find(x => x.name === r[4])) || m.DISTRICTS.slice().sort((a, b) =>
          (Math.abs(a.lat - r[1]) + Math.abs(a.lon - r[2])) - (Math.abs(b.lat - r[1]) + Math.abs(b.lon - r[2])))[0];
        const ak = anahtar(r[0]);
        vill.push({
          v: r[0], d: dd, hgm: { lat: r[1], lon: r[2] },
          n: s.assets.filter(a => anahtar(a.village || '') === ak).length
        });
      }
      for (const d of m.DISTRICTS) for (const v of this.koyList(m, d)) {
        if (norm(v).includes(qn) && !gorulen.has(anahtar(v))) {
          gorulen.add(anahtar(v));
          vill.push({ v, d, n: s.assets.filter(a => a.village === v).length });
        }
      }
      // kaydı olan köyler üste: bunların yeri kesin bilinir
      // koordinatı bilinen (HGM) kayıtlar önce — Enter her zaman kesin konuma gitsin
      vill.sort((x, y) =>
        ((y.hgm ? 1 : 0) - (x.hgm ? 1 : 0)) ||
        (y.n - x.n) ||
        (norm(x.v).indexOf(qn) - norm(y.v).indexOf(qn)) ||
        x.v.localeCompare(y.v, 'tr'));
      suggestions = vill.slice(0, 8).map(({ v, d, hgm, n }) => ({
        name: v, kind: 'Köy',
        meta: `${d.name} · ` + (n ? `${n} kayıt` : (hgm ? 'HGM listesi' : 'yeri haritadan bulunur')),
        go: hgm
          ? () => {
              this.vSave(v, hgm.lat, hgm.lon, false);
              this.flyTo(hgm.lat, hgm.lon, 15);
              this.toMap({ ks: 'go', lat: hgm.lat, lon: hgm.lon, label: `${v} · ${d.name}` });
              this.setState({ query: '', tab: 'harita', vFix: this.vOnayli(v) ? null : { name: v, district: d.name, from: 'HGM yerleşim listesi', lat: hgm.lat, lon: hgm.lon } });
            }
          : () => this.gotoVillage(v, d)
      })).concat(s.assets.filter(a => norm(a.code).includes(qn)).slice(0, 3).map(a => ({
        name: a.code, kind: 'Kayıt', meta: `${a.village} · ${TYPES[a.type].kind}`,
        go: () => {
          if (this.state.tab === 'envanter') {
            this.setState({ query: '', envQ: a.code, selected: a.id, detailTab: 'bilgi' });
            return;
          }
          this.flyTo(a.lat, a.lon);
          this.setState({ query: '', selected: a.id, panel: 'detay', detailTab: 'bilgi' });
        }
      })));
    }

    // settlements
    const settlements = [];
    if (m) {
      for (const d of m.DISTRICTS) {
        settlements.push({
          name: d.name + ' (ilçe)', district: '—', weight: '700',
          pop: fmt(d.pop), buyukbas: '—', kucukbas: '—',
          inv: String(s.assets.filter(a => a.district === d.name).length),
          src: d.pop ? `TÜİK ${d.popYear}` : 'veri bekleniyor',
          rowBg: dark ? ui.surf2 : 'var(--color-neutral-200)', numColor: ui.fg
        });
        const vs = this.koyList(m, d);
        for (const v of vs) {
          const y = this.yerlesimBul(d.name, v);
          settlements.push({
            name: v, district: d.name, weight: '400',
            pop: y && y.nufus != null ? fmt(y.nufus) : '—',
            buyukbas: y && y.buyukbas != null ? fmt(y.buyukbas) : '—',
            kucukbas: y && y.kucukbas != null ? fmt(y.kucukbas) : '—',
            inv: String(s.assets.filter(a => a.village === v).length),
            src: y ? ('Yüklenen dosya' + (y.yil ? ' · ' + y.yil : '') + (y.yaklasik ? ' · yaklaşık eşleşme: ' + y.yaklasik : '')) : 'veri yüklenmedi',
            rowBg: 'transparent', numColor: y ? ui.fg : ui.mut
          });
        }
        if (!vs.length) settlements.push({
          name: `${d.villageCount} köy — isim listesi içe aktarılacak`, district: d.name, weight: '400',
          pop: '—', buyukbas: '—', kucukbas: '—', inv: '—', src: 'İçişleri mülki idare envanteri',
          rowBg: 'transparent', numColor: ui.mut
        });
      }
    }

    // converter
    const ce = parseFloat(String(s.conv.e).replace(',', '.')), cn = parseFloat(String(s.conv.n).replace(',', '.')), cmv = this.cm(s.conv.zone);
    // derece-dakika-saniye (Google’ın gösterdiği biçim) → ondalık derece
    const dms = t => {
      const m = String(t || '').match(/(-?\d+(?:[.,]\d+)?)[°\s]+(\d+(?:[.,]\d+)?)['′\s]+(\d+(?:[.,]\d+)?)["″\s]*([NSEWnsew])?/);
      if (!m) return NaN;
      const v = Math.abs(+m[1].replace(',', '.')) + (+m[2].replace(',', '.')) / 60 + (+m[3].replace(',', '.')) / 3600;
      const neg = (+m[1].replace(',', '.')) < 0 || /[SWsw]/.test(m[4] || '');
      return neg ? -v : v;
    };
    const toDms = (v, ns) => {
      const s0 = v < 0 ? (ns ? 'S' : 'W') : (ns ? 'N' : 'E');
      const av = Math.abs(v), d = Math.floor(av), mn = Math.floor((av - d) * 60), sc = ((av - d) * 60 - mn) * 60;
      return `${d}°${String(mn).padStart(2, '0')}'${sc.toFixed(2)}"${s0}`;
    };
    let out = [], note = '', convLL = null;
    if (s.conv.sys === 'DMS') {
      const lat = dms(s.conv.e) || parseFloat(String(s.conv.e).replace(',', '.'));
      const lon = dms(s.conv.n) || parseFloat(String(s.conv.n).replace(',', '.'));
      if (isFinite(lat) && isFinite(lon)) {
        const [ei, ni] = tmForward(lat, lon, cmv, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cmv);
        convLL = [lat, lon];
        out = [
          { label: 'WGS84 ondalık derece', value: `${lat.toFixed(6)} , ${lon.toFixed(6)}` },
          { label: 'ITRF96-3° sağa / yukarı', value: `${ei.toFixed(2)} , ${ni.toFixed(2)}` },
          { label: 'ED50 3° sağa / yukarı', value: `${e50.toFixed(2)} , ${n50.toFixed(2)}` },
          { label: 'Derece-dakika-saniye', value: `${toDms(lat, true)} ${toDms(lon, false)}` }
        ];
        note = 'Google Maps’te bir noktaya sağ tıklayıp koordinatı kopyaladığınızda bu biçim gelir — olduğu gibi yapıştırın. Ondalık derece (39.146200, 34.158300) de kabul edilir.';
      } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Google’dan kopyaladığınız koordinatı yapıştırın: 39°08\'46.3"N ve 34°09\'29.9"E, ya da ondalık 39.146200 ve 34.158300.'; }
    } else if (isFinite(ce) && isFinite(cn)) {
      if (s.conv.sys === 'ITRF96') {
        const [lat, lon] = tmInverse(ce, cn, cmv, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cmv);
        convLL = [lat, lon];
        out = [{ label: 'WGS84 enlem / boylam', value: `${lat.toFixed(6)}° , ${lon.toFixed(6)}°` },
          { label: 'Derece-dakika-saniye (Google)', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          { label: 'ED50 3° sağa / yukarı', value: `${e50.toFixed(2)} , ${n50.toFixed(2)}` },
          { label: 'Orta meridyen', value: `${cmv}° D · k₀ = 1` }];
        note = 'ITRF96 → WGS84 yalnızca ters Transverse Mercator; datum hatası yok. ED50 çıktısı ülke geneli 3 parametreli Helmert ile (2–5 m artık hata).';
      } else {
        const [lat, lon] = ed50GridToWgs(ce, cn, cmv);
        const [ei, ni] = tmForward(lat, lon, cmv, ELL.grs80);
        convLL = [lat, lon];
        out = [{ label: 'ITRF96-3° sağa / yukarı', value: `${ei.toFixed(2)} , ${ni.toFixed(2)}` },
          { label: 'WGS84 enlem / boylam', value: `${lat.toFixed(6)}° , ${lon.toFixed(6)}°` },
          { label: 'Derece-dakika-saniye (Google)', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          { label: 'Kayma', value: `ΔX ${SHIFT[0]} · ΔY ${SHIFT[1]} · ΔZ ${SHIFT[2]} m` }];
        note = 'ED50 → ITRF96 gerçek datum dönüşümü: Hayford 1924 elipsoidinden GRS80’e Helmert kayması.';
      }
      if (!(convLL[0] > BBOX.s && convLL[0] < BBOX.n && convLL[1] > BBOX.w && convLL[1] < BBOX.e))
        note = 'Bu koordinat il sınırının dışına düşüyor — dilim 11 mi 12 mi? ' + note;
    } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Sağa ve yukarı değerlerini girin.'; }

    // fault form
    const ff = s.faultForm;
    const ffAsset = ff ? s.assets.find(a => a.id === ff.assetId) : null;
    const prios = ['Acil', 'Yüksek', 'Normal'];
    // Akış: sahanın elinde olmayan bekleyişler ayrı durumlarda; merkez onayı
    // açıkken kapanış Kontrolde adımından geçer.
    const wfSteps = [['acik', 'Açık'], ['atandi', 'Atandı'], ['sahada', 'Sahada'],
      ['bilgi', 'Bilgi bekliyor'], ['bekleme', 'Beklemede'], ['yonlendirildi', 'Başka birime'],
      ...(onayOn ? [['kontrol', 'Kontrolde']] : []),
      ['cozuldu', 'Çözüldü'], ['iptal', 'İptal']];

    // İşler: talep, arıza, bugün ve bakım tek sayfada dört süzgeç. Program
    // içeride eski sayfa kimliklerini kullanmaya devam eder — böylece
    // "arıza kaydına git" gibi bütün mevcut geçişler olduğu gibi çalışır.
    // Birleşmiş sayfalar. Menüde altı girdi var; her girdi bir süzgeç kümesi.
    // Program içeride eski sayfa kimliklerini kullanmayı sürdürür, böylece
    // "arıza kaydına git" gibi bütün mevcut geçişler olduğu gibi çalışır.
    const acikAriza = myFaults.filter(f => !KAPALI_DURUM.includes(f.status)).length;
    const acikTalep = (s.talepler || []).filter(t => !TALEP_KAPALI.includes(t.durum)).length;
    // Modül anahtarı kapalıysa o süzgeç hiç çıkmaz
    const modulKapi = { ariza: arizaOn, bakim: bakimOn, talep: talepOn, ambar: ambarOn, arac: aracOn, yerlesim: yerlesimOn,
      // "Bana atanan" arıza ve bakım işlerini listeler; ikisi de kapalıysa boş kalır
      // Genel bakış ve Ekipler telefonda da var (2026.10.01, 6. aşama)
      gunluk: arizaOn || bakimOn, isPano: arizaOn || talepOn };
    const suzgecSayi = { ariza: acikAriza, talep: acikTalep + (talepOn ? (s.basvurular || []).filter(b => b.durum === 'yeni').length : 0) };
    const gruplar = {};
    for (const sayfa in SUZGEC_TANIM) {
      const zs = suzgecler(sayfa).filter(z => modulKapi[z.hedef] !== false);
      gruplar[sayfa] = {
        id: sayfa, ad: zs.length === 1 ? zs[0].ad : (SUZGEC_SAYFA_AD[sayfa] || sayfa), suz: zs,
        acik: zs.some(z => z.hedef === tabId),
        badge: zs.reduce((t, z) => t + (suzgecSayi[z.hedef] || 0), 0)
      };
    }
    // Bir süzgeci bile görünmeyen sayfa menüde çıkmaz
    const navVisible = MENU_SIRA.map(id => gruplar[id]).filter(g => g && g.suz.length);
    const navItem = g => ({
      label: g.ad, go: () => this.setState({ tab: (g.suz[0] || {}).hedef || 'harita' }),
      // Etkin sayfa dolu mavi hap; ötekiler zeminsiz
      pill: g.acik ? 'var(--color-accent)' : 'transparent',
      hover: g.acik ? 'var(--color-accent)' : (dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.045)'),
      bg: g.acik ? ui.surf2 : 'transparent',
      fg: g.acik ? '#fff' : ui.fg,
      mark: g.acik ? 'var(--color-accent)' : 'transparent',
      dot: g.acik ? 'var(--color-accent)' : 'transparent',
      badgeBg: g.acik ? 'rgba(255,255,255,.24)' : 'var(--color-accent)',
      badgeFg: '#fff',
      // Hapsiz bağlamlar (telefon alt çubuğu, "Tümü" listesi)
      fgPlain: g.acik ? ui.acc : ui.mut,
      fgList: g.acik ? ui.acc : ui.fg,
      isaret: g.acik ? '✓' : '',
      ikon: this.ikon(g.id, 16),
      agirlik: g.acik ? 600 : 500,
      badge: g.badge > 0, badgeN: g.badge
    });
    const aktifGrup = navVisible.find(g => g.acik) || null;
    const seg = (on, act) => ({ bg: on ? 'var(--color-accent)' : 'transparent', fg: on ? '#fff' : ui.mut, pick: act });
    const canCreateAsset = can('create') && sayfaTam;
    const na = s.newAsset;

    // Kırmızı yalnız aciliyet ve hata için; gerisi nötr
    const priColor = p => p === 'Acil' ? 'var(--color-uyari)'
      : (p === 'Yüksek' ? (dark ? '#ff9f0a' : 'var(--color-bekle)') : ui.mut);
