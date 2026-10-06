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