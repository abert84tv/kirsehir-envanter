  // Telefon saha akışı: işin durumunu değiştirir (sahaya vardım / kapat).
  // Arıza formunu açmadan aynı kuyruktan sunucuya gider.
  sahaDurum(f, yeni, ek) {
    if (!f) return;
    const kapanis = yeni === 'cozuldu' || yeni === 'kontrol';
    const g = { ...f, ...(ek || {}), status: yeni, sync: 'pending' };
    if (kapanis && ek && ek.notEk) {
      g.note = ((f.note || '') + (f.note ? '\n' : '') + 'SAHA · ' + this.damga() + ' · ' + ek.notEk).trim();
      delete g.notEk;
    }
    this.setState(st => ({ faults: (st.faults || []).map(x => x.id === f.id ? g : x), sahaKapanis: null }));
    // Sahaya varınca arıza noktası kendiliğinden alınır (izin yoksa uyarır)
    // (yalnız telefonda: masaüstü bilgisayarın konumu arızanın yeri değildir)
    if (yeni === 'sahada' && !f.nokta && this.state.device === 'phone') setTimeout(() => this.arizaNoktaAl(g, true), 300);
    const a = (this.state.assets || []).find(x => x.id === f.assetId);
    this.denetimYaz('ariza', 'Saha: ' + (STATUS_LABEL[yeni] || yeni), (f.no || '') + ' · ' + (f.type || '')
      + ((g.malzeme || []).length && kapanis ? ' · ' + g.malzeme.map(m => m.ad + ' × ' + m.adet).join(', ') : ''), a ? a.code : '');
    setTimeout(() => this.arizaKuyrukGonder(), 0);
    if (yeni === 'cozuldu') setTimeout(() => this.anaCozum(g), 400);
    if (yeni === 'cozuldu') {
      // Seçilen malzeme ekip zimmetinden düşülür (kullanıcı adet seçerek onayladı)
      if (this.state.modul.ambar !== false && (g.malzeme || []).length && g.crew && g.crew !== ATANMADI) {
        setTimeout(() => this.arizaStokDus(g), 0);
      }
      if (g.dbId) {
        const ie = this.isEmriBul(g.dbId);
        if (ie && ie.status !== 'kapatildi') setTimeout(() => this.isEmriKapatVer(ie, g), 300);
      }
    }
  }
  // Arıza noktası: ekibin cihaz konumu arızanın kendi koordinatı olarak
  // kaydedilir (boru hattı arızası tesisin yerinde değildir). "Sahaya
  // vardım"da kendiliğinden alınır, istenirse yeniden alınır. Köy raporları
  // bu noktanın en yakın köyünü kullanır.
  arizaNoktaAl(f, sessiz) {
    if (!f) return;
    if (!navigator.geolocation) { if (!sessiz) this.duyur('Bu cihaz konum vermiyor.', 4000, 'kotu'); return; }
    if (!sessiz) this.say('Arıza noktası alınıyor — açık alanda birkaç saniye bekleyin…');
    navigator.geolocation.getCurrentPosition(p => {
      const nokta = { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6) };
      const dog = Math.round(p.coords.accuracy || 0);
      if (nokta.lat < 38.5 || nokta.lat > 40.1 || nokta.lon < 33 || nokta.lon > 35.1) {
        return this.duyur('Alınan konum il sınırı dışında (' + nokta.lat + ', ' + nokta.lon + ') — kaydedilmedi.', 7000, 'kotu');
      }
      const ek = { nokta, noktaDogruluk: dog, noktaZaman: new Date().toISOString() };
      const yeniKayit = !f.id;
      this.setState(st => ({
        faults: yeniKayit ? st.faults : (st.faults || []).map(x => x.id === f.id ? { ...x, ...ek, sync: 'pending' } : x),
        faultForm: st.faultForm && (yeniKayit ? !st.faultForm.id : st.faultForm.id === f.id) ? { ...st.faultForm, ...ek } : st.faultForm,
        benimKonum: { lat: nokta.lat, lon: nokta.lon, t: Date.now() }
      }));
      if (!yeniKayit) setTimeout(() => this.arizaKuyrukGonder(), 0);
      const k = this.yakinKoy(nokta);
      this.duyur('Arıza noktası ' + (yeniKayit ? 'forma eklendi' : 'kaydedildi') + ' · ±' + dog + ' m'
        + (k ? ' · ' + k.ad + ' köyüne ' + (k.m < 1000 ? Math.round(k.m) + ' m' : (k.m / 1000).toFixed(1) + ' km') : '')
        + (dog > 50 ? '. Doğruluk düşük — açık alanda yeniden alabilirsiniz.' : '.'), 6000, dog > 50 ? 'kotu' : 'iyi');
    }, e => {
      if (!sessiz || (e && e.code === 1)) this.duyur(e && e.code === 1 ? 'Konum izni verilmemiş — tarayıcı ayarlarından bu siteye konum iznini açın.' : 'Konum alınamadı — açık alanda yeniden deneyin.', 7000, 'kotu');
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }
  // Arıza formunun grup/tür, yer (tesis ya da köy) ve arıza noktası alanları —
  // telefonun sade ekranı ve ayrıntılı form ortak kullanır
  arizaFormYer(ff, ffAsset) {
    const s = this.state, m = s.data, ui = this.th();
    const yaz = y => this.setState({ faultForm: { ...this.state.faultForm, ...y } });
    const g = arizaGrubu(ff, ffAsset);
    const liste = ARIZA_GRUP[g].turler.includes(ff.type) || !ff.type ? ARIZA_GRUP[g].turler : [ff.type, ...ARIZA_GRUP[g].turler];
    const yerModu = ff.yerModu || (ff.assetId ? 'tesis' : (ARIZA_GRUP[g].sebeke ? 'koy' : 'tesis'));
    const dIlce = m ? m.DISTRICTS.find(x => x.name === ff.ilce) : null;
    const koyler = dIlce ? [...new Set([...(m.VILLAGES[dIlce.id] || []), ...(((s.ekKoyler || {})[dIlce.id] || []).map(x => x.ad))])].sort((x, y) => x.localeCompare(y, 'tr')) : [];
    const n = ff.nokta;
    const nk = n ? this.yakinKoy(n) : null;
    const kmY = v => v < 1000 ? Math.round(v) + ' m' : (v / 1000).toFixed(1).replace('.', ',') + ' km';
    return {
      grup: g, gruplar: Object.keys(ARIZA_GRUP).map(k => ({ v: k, l: ARIZA_GRUP[k].ad })),
      onGrup: e => {
        const v = e.target.value;
        const G = ARIZA_GRUP[v];
        yaz({ grup: v, type: G.turler[0],
          // şebeke grubunda tesis yerine köy; tesisin türü uymuyorsa tesis bırakılır
          ...(G.sebeke && !ff.id ? { yerModu: 'koy' } : {}),
          ...(!G.sebeke && !ff.id ? { yerModu: 'tesis' } : {}),
          ...(ffAsset && G.tesis && G.tesis !== ffAsset.type && !ff.id ? { assetId: null } : {}) });
      },
      turSecenek: liste, tur: ff.type || '', onTur: e => yaz({ type: e.target.value }),
      yerModu, tesisModu: yerModu === 'tesis', koyModu: yerModu === 'koy',
      modSec: !ff.id ? [['tesis', 'Tesiste'], ['koy', 'Şebekede (köyde)']].map(([k, l]) => ({
        l, bg: yerModu === k ? 'var(--color-accent)' : 'transparent', fg: yerModu === k ? '#fff' : ui.fg,
        sec: () => yaz(k === 'koy' ? { yerModu: 'koy', assetId: null, tesisSec: false } : { yerModu: 'tesis' })
      })) : [],
      modSecVar: !ff.id,
      ilceler: [{ v: '', l: 'İlçe seçin…' }, ...(m ? m.DISTRICTS.map(d => ({ v: d.name, l: d.name })) : [])],
      ilce: ff.ilce || '', onIlce: e => yaz({ ilce: e.target.value, koy: '' }),
      koyler: [{ v: '', l: ff.ilce ? 'Köy seçin…' : 'Önce ilçe' }, ...koyler.map(k => ({ v: k, l: k }))],
      koy: ff.koy || '', onKoy: e => yaz({ koy: e.target.value }),
      koyYazi: !ff.assetId && ff.koy ? ff.koy + ' · ' + (ff.ilce || '') : '',
      noktaVar: !!n, noktaYok: !n,
      noktaYazi: n ? 'Kayıtlı · ±' + (ff.noktaDogruluk ?? '?') + ' m' + (nk ? ' · ' + nk.ad + ' köyüne ' + kmY(nk.m) : '') : '',
      noktaAlt: n ? n.lat.toFixed(5) + ', ' + n.lon.toFixed(5) + (ff.noktaKim ? ' · ' + ff.noktaKim : '')
        : (ff.id ? '“Sahaya vardım”da kendiliğinden alınır' : 'Arızanın başındaysanız şimdi kaydedin'),
      noktaAl: () => this.arizaNoktaAl(this.state.faultForm),
      noktaL: n ? 'Yeniden al' : 'Buradayım — kaydet',
      noktaHarita: () => { if (n) { this.flyTo(n.lat, n.lon, 17); this.setState({ panel: 'yok', tab: 'harita' }); } }
    };
  }
  // Raporlarda arızanın köyü: girilen köy > tesisin köyü > arıza noktasına
  // en yakın köy > tesise en yakın köy
  arizaKoy(f, a) {
    if (!f) return { ad: '', ilce: '', kaynak: '' };
    a = a || (f.assetId ? (this.state.assets || []).find(x => x.id === f.assetId) : null);
    const ilce = (a && a.district) || f.district || f.ilce || '';
    if (f.koy) return { ad: f.koy, ilce, kaynak: 'girilen' };
    if (a && a.village) return { ad: a.village, ilce, kaynak: 'tesis' };
    const n = f.nokta ? this.yakinKoy(f.nokta) : null;
    if (n) return { ad: n.ad, ilce, kaynak: 'nokta' };
    const t = a ? this.yakinKoy(a) : null;
    if (t) return { ad: t.ad, ilce, kaynak: 'tesis-yakın' };
    return { ad: '', ilce, kaynak: '' };
  }