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
  // Kod şeması: KS-<TÜR>-0001. Her tür kendi içinde sayılır ve daima
  // kullanılmayan EN KÜÇÜK sıra verilir; şemaya uymayan eski kodlar sayıyı şişirmez.
  // Şemaya uymayan kodları (tür başına 1..N aralığının dışındaki numaralar,
  // eski toplam-sayaç kalıntıları) boş sıralara çeker. Yalnızca boş numaralara
  // taşındığı için kod tekilliği bozulmaz.
  kodOnarPlan() {
    const plan = [];
    // Çöp kutusundaki kayıtlar veritabanında duruyor ve kodları hâlâ rezerve:
    // geri getirilebilsinler diye o numaralar boş sayılmaz.
    const copKod = new Set((this.state.cop || [])
      .filter(r => r.tur !== 'foto')
      .map(r => String(r.kod || '').trim().toUpperCase()));
    for (const t of ['kuyu', 'depo', 'ag', 'ges']) {
      const on = 'KS-' + TYPES[t].pre + '-';
      const ayni = (this.state.assets || []).filter(a => a.type === t);
      const dolu = new Set();
      for (const k of copKod) {
        if (!k.startsWith(on)) continue;
        const mc = k.slice(on.length).match(/^(\d{1,6})$/);
        if (mc) dolu.add(parseInt(mc[1], 10));
      }
      // Yalnız şemaya uymayan ya da aynı türde tekrarlanan kod "bozuk" sayılır.
      // 2026.10.01'e kadar numarası kayıt sayısından büyük her kod da bozuk
      // sayılıyordu: silinmiş kayıt boşluk bırakınca en yeni tesisin kodu
      // sessizce eski bir numaraya kayıyor (basılı barkod geçersizleşir), çöpteki
      // kodla çakışınca da her 30 sn'de sunucuya yazıp denetim izine satır
      // ekliyordu. Geçerli kod artık asla değiştirilmez.
      const bozuk = [];
      for (const a of ayni) {
        const kod = String(a.code || '').trim().toUpperCase();
        const m2 = kod.startsWith(on) ? kod.slice(on.length).match(/^(\d{1,6})$/) : null;
        const n = m2 ? parseInt(m2[1], 10) : 0;
        if (n >= 1 && !dolu.has(n)) dolu.add(n);
        else bozuk.push(a);
      }

      // Onarılan kod boşluğa değil sıranın sonuna gider: silinmiş bir tesisin
      // numarası başka tesise geçmesin (geçmiş ve etiketler karışmasın)
      let sira = dolu.size ? Math.max(...dolu) : 0;
      for (const a of bozuk) {
        sira++;
        dolu.add(sira);
        plan.push({ asset: a, eski: a.code, yeni: on + String(sira).padStart(4, '0') });
      }
    }
    return plan;
  }
  async kodOnarUygula(sessiz) {
    const plan = this.kodOnarPlan();
    if (!plan.length) return;
    if (!sessiz && !window.confirm(plan.length + ' kaydın kodu şemaya çekilecek. Barkod etiketleri de yeni koda göre üretilir — basılı etiketler varsa yenilenmesi gerekir. Onaylıyor musunuz?')) return;
    const M = this._sb;
    const sunucu = M && M.tokenOku() && !this.state.offline;
    let yazilan = 0, hata = '';
    for (const p of plan) {
      let yeni = { ...p.asset, code: p.yeni, barkod: 'BK-' + p.yeni.slice(3) };
      if (sunucu && p.asset.dbId) {
        // Kod veritabanında tekil: beklenmedik bir çakışmada (çöp kutusunda ya
        // da başka cihazda tutulan numara) sıradaki boş numara denenir.
        const on = p.yeni.slice(0, p.yeni.length - 4);
        let sira = parseInt(p.yeni.slice(-4), 10), r = null;
        for (let deneme = 0; deneme < 40; deneme++) {
          r = await M.tesisKaydet(yeni);
          if (r.ok) break;
          if (!/duplicate key|tesis_kod_key|unique/i.test(String(r.err || ''))) break;
          sira++;
          const kod = on + String(sira).padStart(4, '0');
          yeni = { ...p.asset, code: kod, barkod: 'BK-' + kod.slice(3) };
        }
        if (!r || !r.ok) { if (!hata) hata = (r && r.err) || 'Sunucuya yazılamadı.'; continue; }
        p.yeni = yeni.code;
      }
      this.setState(st => ({ assets: st.assets.map(x => x.id === p.asset.id ? yeni : x) }));
      this.iz(p.asset.id, 'Kod şemaya çekildi', p.eski + ' → ' + p.yeni);
      yazilan++;
    }
    this.yerelTesisYaz((this.state.assets || []).filter(x => x && !x.dbId));
    this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults });
    if (!yazilan && !hata) return;
    this.duyur(hata
      ? yazilan + ' kod düzeltildi, kalanlar yazılamadı: ' + hata
      : yazilan + ' kaydın kodu şemaya çekildi (' + plan.map(p => p.eski + ' → ' + p.yeni).slice(0, 4).join(', ')
        + (plan.length > 4 ? ' …' : '') + '). Barkod etiketleri yeni koda göre yenilendi.',
      9000, hata ? 'kotu' : 'iyi');
  }
  // Şemaya uymayan kod kalmasın: veri her yüklendiğinde bir kez denetlenir.
  // Sunucuya yazılmamış yerel kayıtlar kendiliğinden düzeltilir; sunucudaki
  // kayıtlar barkod bağı olduğu için onay ister (Ayarlar → Kod şemasını onar).
  kodDenetle() {
    if (this._kodOnarimda) return;
    const plan = this.kodOnarPlan();
    if (!plan.length) return;
    // Şemaya uymayan kod bırakılmaz: veri her yüklendiğinde kendiliğinden onarılır
    this._kodOnarimda = true;
    this.kodOnarUygula(true).finally(() => { this._kodOnarimda = false; });
  }
  kodSira(type, liste) {
    const on = 'KS-' + TYPES[type].pre + '-';
    const dolu = new Set();
    for (const a of (liste || [])) {
      const kod = String((a && a.code) || '').trim().toUpperCase();
      if (!kod.startsWith(on)) continue;
      const m2 = kod.slice(on.length).match(/^(\d{1,6})$/);
      if (m2) dolu.add(parseInt(m2[1], 10));
    }
    // Silinmiş bir tesisin numarası yeni tesise verilmez — sıradaki numara
    // en büyüğün bir fazlası (sunucu da çöp kutusuyla çakışmayı ayrıca çözer)
    return dolu.size ? Math.max(...dolu) + 1 : 1;
  }
  siradakiKod(type, ekListe) {
    const liste = (ekListe || []).concat(this.state.assets || []);
    return 'KS-' + TYPES[type].pre + '-' + String(this.kodSira(type, liste)).padStart(4, '0');
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
  // ── fotoğraf: dosya seçici gizli bir input; kamera ve galeri aynı düğmeden
  fotoSec(kamera) {
    const sel = this.state.assets.find(a => a.id === this.state.selected);
    if (!sel) return;
    if (!this.yazabilir(sel)) return this.kilitUyar(sel);
    if (!this._sb || !this._sb.tokenOku()) {
      this.say('Fotoğraf yüklemek için bir kez giriş yapmış olmanız gerekiyor.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    // Telefonda kamera açılırken tarayıcı sayfayı bellekten atabiliyor: dönüşte program
    // yeniden yükleniyor ve seçim kayboluyordu. Niyeti cihaza yazıyoruz — yeniden
    // yüklenirse fotoNiyetGeriYukle() aynı kaydın Foto sekmesini açar.
    try {
      localStorage.setItem(FOTO_NIYET, JSON.stringify({ id: sel.id, kod: sel.code, t: Date.now() }));
    } catch (e) { /* depolama kapalı */ }
    // Seçici her seferinde yeniden kurulmaz; aynı eleman kalır — bellek baskısı azalır
    let inp = this._fotoInput;
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.style.position = 'fixed';
      inp.style.left = '-9999px';
      inp.style.opacity = '0';
      document.body.appendChild(inp);
      this._fotoInput = inp;
    }
    inp.value = '';
    inp.accept = 'image/*';
    inp.multiple = !kamera;
    if (kamera) inp.setAttribute('capture', 'environment');   // telefonda arka kamerayı açar
    else inp.removeAttribute('capture');
    inp.onchange = () => {
      const list = [...(inp.files || [])];
      try { localStorage.removeItem(FOTO_NIYET); } catch (e) { /* yok */ }
      inp.value = '';
      if (list.length) this.fotoGonder(sel, list);
    };
    inp.click();
  }
  // İnternet yoksa (ya da kayıt henüz sunucuda değilse) fotoğraf telefonun deposunda bekler
  async fotoBeklet(sel, dosyalar) {
    const kalici = await this.medyaBirak('tesis', sel.id, sel.code, { photos: dosyalar.map(file => ({ file, kb: Math.round(file.size / 1024) })) });
    this.duyur(kalici
      ? dosyalar.length + ' fotoğraf telefonda — internet gelince ' + sel.code + ' kaydına yüklenecek.'
      : 'Fotoğraf telefonda saklanamadı — internet olan yerde yeniden çekin.', 6000, kalici ? 'bilgi' : 'kotu');
  }
  async fotoGonder(sel, list) {
    const M = this._sb;
    if (this.state.offline || !sel.dbId) return this.fotoBeklet(sel, list);
    this.setState({ fotoYuk: { toplam: list.length, biten: 0, kod: sel.code } });
    let ok = 0, kb = 0, hata = '';
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const r = await M.fotoYukle(f, sel.dbId, sel.code);
      if (r.ok) { ok++; kb += Math.round((r.data.boyut || 0) / 1024); }
      else if (r.cevrimdisi) { this.setState({ fotoYuk: null }); await this.fotoBeklet(sel, list.slice(i)); break; }
      else if (!hata) hata = r.err;
      this.setState({ fotoYuk: { toplam: list.length, biten: ok, kod: sel.code } });
    }
    this.setState({ fotoYuk: null });
    await this.fotoYenile(sel.dbId);
    this.veriYenile(true);
    if (!ok && !hata) return;
    if (!ok) {
      this.say(hata || 'Fotoğraf yüklenemedi.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    this.duyur(`${ok} fotoğraf ${sel.code} kaydına yüklendi · ${kb} KB.${hata ? ' ' + (list.length - ok) + ' tanesi yüklenemedi: ' + hata : ''}`, 6000, 'iyi');
  }
  async fotoYenile(dbId) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !dbId) return;
    const [f, sn] = await Promise.all([M.fotoListesi(dbId), M.sesListesi(dbId)]);
    this.setState(st => ({
      fotolar: f.ok ? { ...st.fotolar, [dbId]: f.data } : st.fotolar,
      kayitliSesler: sn.ok ? { ...st.kayitliSesler, [dbId]: sn.data } : st.kayitliSesler
    }));
  }
  fotoKaldir(f, sel) {
    if (!this.yazabilir(sel)) return this.kilitUyar(sel);
    this._sb.fotoSil(f.id).then(r => {
      if (!r.ok) return this.say(r.err, true);
      this.fotoYenile(sel.dbId);
      this.veriYenile(true);
      this.duyur('Fotoğraf çöp kutusuna taşındı — 30 gün içinde geri getirilebilir. Ayarlar > Çöp kutusu.', 6000);
    });
  }
  // Kamera açılırken telefon programı bellekten atarsa kullanıcı bıraktığı yere döner
  fotoNiyetGeriYukle() {
    if (this._niyetIsledi) return;
    let n = null;
    try { n = JSON.parse(localStorage.getItem(FOTO_NIYET) || 'null'); } catch (e) { /* yok */ }
    if (!n) return;
    try { localStorage.removeItem(FOTO_NIYET); } catch (e) { /* depolama kapalı */ }
    if (!n.t || Date.now() - n.t > 600000) return;
    const a = this.state.assets.find(x => x.id === n.id) || this.state.assets.find(x => x.code === n.kod);
    if (!a) return;
    this._niyetIsledi = true;
    this.setState({ selected: a.id, panel: 'detay', detailTab: 'medya', tab: 'harita' });
    if (a.dbId) this.fotoYenile(a.dbId);
    this.duyur(a.code + ' yeniden açıldı. Telefon, kamera açıkken programı bellekten attığı için çekilen kare programa ulaşmadı — “Galeriden seç” ile telefonun galerisinden ekleyin.', 14000);
  }
  cm = z => Number(z) * 3;