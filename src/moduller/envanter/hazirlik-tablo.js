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
    // Hazır süzgeçler: tek basışla “şunları doldurun” listeleri (saha ekibi için)
    const dBos = v => v === undefined || v === null || v === '' || v === '—' || v === 0 || v === '0';
    const TEKNIK_ALAN = ['derinlik', 'debi', 'motor', 'pompaD', 'statik', 'dinamik'];
    const HAZIR = {
      koybos: ['Köyü boş', a => !a.village],
      fotosuz: ['Fotoğrafı yok', a => !((a.photos || 0) > 0)],
      teknikbos: ['Kuyu bilgisi girilmemiş', a => a.type === 'kuyu' && !a.year && TEKNIK_ALAN.every(k => dBos((a.d || {})[k]))],
      koyoto: ['Köyü otomatik yazılan', a => !!(a.d && a.d.koyOtomatik)]
    };
    const envSatir = [...vis]
      .filter(a => (qn.length < 2 || envArar(a, qn))
        && (!envQn || envArar(a, envQn))
        && (!envF.tur || a.type === envF.tur)
        && (!envF.ilce || a.district === envF.ilce)
        && (!envF.durum || envDurum(a) === envF.durum)
        && (!envF.aktiflik || aktifAd(a) === envF.aktiflik)
        && (!envF.hazir || (HAZIR[envF.hazir] && HAZIR[envF.hazir][1](a))))
      .sort((a, b) => kar(envVal(a, envSort.k), envVal(b, envSort.k)) * envSort.dir);
    const ENV_KOL = [['code', 'Kod'], ['type', 'Tür'], ['place', 'Köy / İlçe'], ['year', 'Yapım yılı'], ['photos', 'Fotoğraf'], ['aktiflik', 'Durum'], ['status', 'Eşitleme']];
    const envTik = k => () => this.setState(st => ({ envSort: { k, dir: (st.envSort && st.envSort.k === k) ? -st.envSort.dir : 1 } }));
    const envKontrol = {
      q: s.envQ || '',
      onQ: e => this.setState({ envQ: e.target.value }),
      sayi: envSatir.length + ' / ' + vis.length + ' kayıt',
      bosMu: envSatir.length === 0,
      suzuluyor: !!(envQn || envF.tur || envF.ilce || envF.durum || envF.aktiflik || envF.hazir),
      bosNot: (envQn || envF.tur || envF.ilce || envF.durum || envF.aktiflik || envF.hazir) ? 'Bu süzgeçle kayıt yok — süzgeci temizleyin.' : 'Henüz envanter kaydı yok.',
      temizle: () => this.setState({ envQ: '', envF: {}, envSort: { k: 'code', dir: 1 } }),
      h: ENV_KOL.reduce((o, kl) => (o[kl[0]] = { label: kl[1], ok: okla(envSort, kl[0]), tik: envTik(kl[0]) }, o), {}),
      siraOpts: ENV_KOL.map(kl => ({ v: kl[0], n: kl[1] })),
      siraVal: envSort.k,
      onSira: e => this.setState({ envSort: { k: e.target.value, dir: 1 } }),
      yon: envSort.dir > 0 ? 'A→Z' : 'Z→A',
      yonTik: () => this.setState(st => ({ envSort: { k: st.envSort.k, dir: -st.envSort.dir } })),
      koyAtaVar: vis.some(a => !a.village && a.lat != null && a.dbId != null), koyAtaSayi: vis.filter(a => !a.village && a.lat != null && a.dbId != null).length, koyAta: () => this.koyAtaAc(),
      hazirlar: Object.entries(HAZIR).map(([k, [ad, fn]]) => {
        const n = vis.filter(fn).length, on = envF.hazir === k;
        return { ad, n, bg: on ? 'var(--color-accent)' : 'transparent', fg: on ? '#fff' : ui.fg, kenar: on ? 'var(--color-accent)' : ui.rule, pick: () => this.setState(st => ({ envF: { ...st.envF, hazir: on ? '' : k } })) };
      }).filter(x => x.n > 0 || envF.hazir),
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