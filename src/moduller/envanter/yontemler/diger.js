  // Mükerrer kayıt: aynı tesiste açık kayıt ya da son yedi günde aynı türden
  // kapanmış kayıt varsa yeni kayıt açılmadan önce sorulur.
  mukerrerBul(f) {
    if (!f || !f.assetId) return [];
    const gun = t => {
      const p = String(t || '').split(' ')[0].split('.');
      if (p.length !== 3) return 0;
      const d = new Date(+p[2], +p[1] - 1, +p[0]);
      return isNaN(d) ? 0 : d.getTime();
    };
    const simdi = Date.now();
    return (this.state.faults || []).filter(x => x.assetId === f.assetId && x.id !== f.id).filter(x => {
      if (!KAPALI_DURUM.includes(x.status)) return true;
      const t = gun(x.opened);
      return t && simdi - t < 7 * 86400000 && x.type === f.type;
    });
  }
  // Deneme karşılaştırma grafiği: ekranda ve yazdırma kartında aynı hesap
  denemeGrafik(a) {
    if (!a) return { show: false, bars: [], poly: '', maxLabel: '', minLabel: '' };
    const key = d => { const p = String(d || '').split('.'); return p.length === 3 ? +p[2] * 10000 + +p[1] * 100 + +p[0] : 0; };
    const ts = this.testsFor(a).slice().sort((x, y) => key(x.date) - key(y.date));
    if (ts.length < 2) return { show: false, bars: [], poly: '', maxLabel: '', minLabel: '' };
    const vals = ts.map(t => ({
      year: (String(t.date || '').split('.')[2] || '').slice(-4),
      q: parseFloat(t.debi) || 0,
      oz: parseFloat(t.ozgul) || 0
    }));
    const maxQ = Math.max(...vals.map(v => v.q)) || 1;
    const maxO = Math.max(...vals.map(v => v.oz)) || 1;
    const w = 600, yh = 150, pad = 26, bw = Math.min(46, (w - pad * 2) / vals.length - 12);
    const step = (w - pad * 2) / vals.length;
    const ozY = v => yh - 22 - Math.max(2, (v.oz / maxO) * (yh - 40));
    return {
      show: true,
      bars: vals.map((v, i) => {
        const bh = Math.max(2, (v.q / maxQ) * (yh - 40));
        return {
          x: pad + i * step + (step - bw) / 2, y: yh - 22 - bh, w: bw, h: bh,
          label: v.year, val: v.q.toFixed(1),
          lx: pad + i * step + step / 2, ly: yh - 7, vy: yh - 27 - bh,
          ox: pad + i * step + step / 2, oy: ozY(v)
        };
      }),
      poly: vals.map((v, i) => `${pad + i * step + step / 2},${ozY(v)}`).join(' '),
      maxLabel: 'Debi ekseni üst sınır: ' + maxQ.toFixed(1) + ' l/s',
      minLabel: 'Kırmızı çizgi: özgül debi (üst sınır ' + maxO.toFixed(2) + ' l/s/m)'
    };
  }
  // Her tür kendi içinde sayılır: yeni depo son deponun bir üstünü alır, kuyu sayısı karışmaz
  // Aktif / pasif: kayıt silinmez, hizmetten düşer. Raporlarda ayrı sayılır.
  aktiflikDegistir(a) {
    if (!a) return;
    if (!this.yazabilir(a)) return this.kilitUyar(a);
    const yeniDurum = aktifMi(a) ? 'pasif' : 'aktif';
    const yeni = { ...a, status: yeniDurum, sync: this.state.offline ? 'pending' : a.sync };
    this.setState(st => ({ assets: st.assets.map(x => x.id === a.id ? yeni : x) }),
      () => this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults }));
    this.iz(a.id, yeniDurum === 'pasif' ? 'Pasife alındı' : 'Aktife alındı',
      yeniDurum === 'pasif' ? 'Tesis hizmet dışı olarak işaretlendi.' : 'Tesis yeniden hizmete alındı.');
    if (a.dbId && this._sb && this._sb.tokenOku() && !this.state.offline) {
      this._sb.tesisKaydet(yeni).then(r => {
        if (!r.ok && r.cevrimdisi) return this.tesisBekle(yeni.id);
        if (!r.ok) return this.say(r.err || 'Durum sunucuya yazılamadı.', true);
        this.veriYenile(true);
      });
    }
    this.duyur(a.code + (yeniDurum === 'pasif'
      ? ' pasife alındı — envanterde ve raporlarda pasif sayılır, haritada soluk çıkar. Kayıt ve geçmişi silinmez.'
      : ' yeniden aktif — hizmette sayılır.'), 6000, 'iyi');
  }
  // kaydın bütün alanlarında ara; bulunan alanın adını döndürür
  alanAra(a, qn) {
    const ADLAR = {
      pompaMarka: 'Pompa markası', pompaModel: 'Pompa modeli', motorSeri: 'Motor seri no',
      kalkis: 'Kalkış tipi', kolon: 'Kolon borusu', pano: 'Pano tipi', trafoTipi: 'Trafo tipi',
      malzeme: 'Malzeme', kuyuLog: 'Kuyu logu', filtre: 'Filtre aralıkları', cakil: 'Çakıl zarfı',
      suAnaliz: 'Su analizi', sondajFirma: 'Sondaj firması', ruhsat: 'DSİ ruhsat',
      klorCihaz: 'Klorlama cihazı', seviyeSensor: 'Seviye sensörü', kapak: 'Kapak durumu',
      yedekPompa: 'Yedek pompa', inverter: 'İnvertör', baglanti: 'Bağlantı', rf: 'RF haberleşme',
      kot: 'Kuyu başı kotu', terfiCap: 'Terfi hattı çapı', sigorta: 'Sigorta', brans: 'Branşman'
    };
    for (const k in ADLAR) {
      const v = a.d && a.d[k];
      if (v && norm(String(v)).includes(qn)) return `${ADLAR[k]}: ${v}`;
    }
    const f = this.state.faults.find(x => x.assetId === a.id && (norm(x.type).includes(qn) || norm(x.no).includes(qn)));
    if (f) return `Arıza: ${f.no} · ${f.type}`;
    const n = this.state.notes[a.id];
    if (n && norm(n).includes(qn)) return 'Notta geçiyor';
    return null;
  }
  missingOf(a) {
    const req = a.type === 'kuyu'
      ? [['ruhsat', 'DSİ ruhsat'], ['sondajFirma', 'Sondaj firması'], ['kot', 'Kuyu başı kotu'],
         ['kuyuLog', 'Kuyu logu'], ['filtre', 'Filtre aralıkları'], ['suAnaliz', 'Su analizi'],
         ['pompaMarka', 'Pompa markası'], ['motorSeri', 'Motor seri no'], ['akim', 'Ölçülen akım']]
      : a.type === 'depo'
        ? [['klorCihaz', 'Klorlama cihazı'], ['seviyeSensor', 'Seviye sensörü'], ['terfiUzunluk', 'Terfi hattı'],
           ['abone', 'Abone sayısı'], ['temizlik', 'Son temizlik'], ['kapak', 'Kapak / güvenlik']]
        : [];
    const base = [];
    if (!a.village) base.push('Köy / yerleşim');
    if (!a.year) base.push('Yapım yılı');
    return base.concat(req.filter(([k]) => !a.d[k]).map(([, l]) => l));
  }
  // Yalnız gerçekten girilmiş denemeler. 2026.10.01'e kadar statik/dinamik/debi
  // dolu her kuyuya hiç yapılmamış iki deneme ("Sondaj deneme ekibi" ve
  // 05.06.2026 "Kontrol denemesi", türetilmiş değerlerle) uyduruluyordu.
  testsFor(a) {
    if (a.type !== 'kuyu') return [];
    const added = this.state.tests[a.id] || [];
    const ts = d => { const p = String(d || '').split('.'); return p.length === 3 ? +p[2] * 10000 + +p[1] * 100 + +p[0] : 0; };
    return [...added].sort((x, y) => ts(y.date) - ts(x.date));
  }
  // Masaüstü yeni tesis sihirbazı (3 adım: tür ve yer → konum → bilgi ve foto)
  naAc() {
    const m = this.state.data;
    this._naTemizle();
    this.setState({
      scenario: null,
      newAsset: { type: 'kuyu', district: (m && m.DISTRICTS[0].name) || '', village: '', year: '', note: '', lat: null, lon: null, photos: 0, fotoUrl: [] },
      naSz: { adim: 1, yol: 'gps', onay: false }
    });
  }
  naKapat() {
    this._naTemizle();
    this.setState({ naSz: null, newAsset: null });
  }
  _naTemizle() {
    (this._naUrls || []).forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { /* zaten bırakıldı */ } });
    this._naUrls = [];
    this._naFiles = [];
  }