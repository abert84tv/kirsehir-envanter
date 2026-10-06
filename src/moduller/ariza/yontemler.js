  // Arızanın ekibini eşitler (iş emri ataması sonrası): açıksa "atandı" olur
  arizaEkipYaz(f, crew) {
    if (!f) return;
    const yeniDurum = f.status === 'acik' || f.status === 'yeniden' ? 'atandi' : f.status;
    this.setState(st => ({
      faults: (st.faults || []).map(x => x.id === f.id ? { ...x, crew, status: yeniDurum, sync: 'pending' } : x),
      faultForm: st.faultForm && st.faultForm.id === f.id ? { ...st.faultForm, crew, status: yeniDurum } : st.faultForm
    }));
    setTimeout(() => this.arizaKuyrukGonder(), 0);
  }
  // Hedef süre: öncelik başına gün sayısı. Değerler bilinçli olarak geniş —
  // 252 köyde sınırlı personel varken kısa süre baskı yaratır, gerçeği
  // yansıtmaz. Süre yalnızca hangi işin önce yapılacağını gösterir.
  sureGun(oncelik) { return { 'Acil': 2, 'Yüksek': 5, 'Normal': 15, 'Düşük': 30 }[oncelik] || 15; }
  // Kapanmış kayıtta ve tarihi okunamayan kayıtta süre hesaplanmaz.
  // SLA: arıza başına süre yönetici tarafından değiştirilebilir ya da SLA dışı
  // sayılabilir; "Beklemede" (dış kurum, malzeme, hava) süresi hedeften düşülür.
  beklemeGun(f) {
    const ek = (f && f.ek) || {};
    const dk = (ek.beklemeDk || 0) + (ek.beklemeBas ? Math.max(0, (Date.now() - Date.parse(ek.beklemeBas)) / 60000) : 0);
    return dk / 1440;
  }
  sureDurum(f) {
    if (!f || KAPALI_DURUM.includes(f.status)) return null;
    if (f.ek && f.ek.slaIptal) return null;
    const p = String(f.opened || '').split(' ')[0].split('.');
    if (p.length !== 3) return null;
    const bas = new Date(+p[2], +p[1] - 1, +p[0]);
    if (isNaN(bas)) return null;
    const gun = f.ek && f.ek.slaGun != null ? f.ek.slaGun : this.sureGun(f.priority);
    const hedef = new Date(bas.getTime() + (gun + this.beklemeGun(f)) * 86400000);
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const kalan = Math.round((hedef - bugun) / 86400000);
    const iki = n => String(n).padStart(2, '0');
    return {
      gun, kalan,
      hedef: iki(hedef.getDate()) + '.' + iki(hedef.getMonth() + 1) + '.' + hedef.getFullYear(),
      gecikti: kalan < 0 && f.status !== 'bekleme', yaklasti: kalan >= 0 && kalan <= 2,
      etiket: f.status === 'bekleme' ? 'beklemede' : kalan < 0 ? Math.abs(kalan) + ' gün geçti' : (kalan === 0 ? 'bugün' : kalan + ' gün')
    };
  }
  // Kapanan arızalarda SLA başarı özeti (zamanında kapanış, aşım, bekleme)
  slaOzet() {
    const fs = this.state.faults || [];
    const kapali = fs.filter(f => f.status === 'cozuldu' && f.openedIso && f.closedIso);
    let zamaninda = 0, asim = 0, bekleme = 0, toplam = 0;
    for (const f of kapali) {
      const ek = f.ek || {};
      const sure = Date.parse(f.closedIso) - Date.parse(f.openedIso);
      const bek = (ek.beklemeDk || 0) * 60000;
      bekleme += bek; toplam += sure;
      if (ek.slaIptal) { zamaninda++; continue; }
      const hedef = (ek.slaGun != null ? ek.slaGun : this.sureGun(f.priority)) * 86400000;
      if (sure - bek <= hedef) zamaninda++; else asim += (sure - bek - hedef) / 86400000;
    }
    return {
      say: kapali.length, zamaninda, yuzde: kapali.length ? Math.round(zamaninda / kapali.length * 100) : null,
      asimGun: Math.round(asim * 10) / 10, beklemeSaat: Math.round(bekleme / 3600000), ortGun: kapali.length ? toplam / kapali.length / 86400000 : null
    };
  }
  // Durum "Beklemede"ye geçince başlangıç yazılır, çıkınca geçen süre toplanır
  slaTara() {
    const faults = this.state.faults || [];
    const onceki = this._durumHaritasi || (this._durumHaritasi = new Map());
    const yama = new Map();
    const simdi = new Date().toISOString();
    for (const f of faults) {
      const eski = onceki.get(f.id);
      onceki.set(f.id, f.status);
      if (eski === undefined || eski === f.status || f.sync !== 'pending') continue;
      const ek = { ...(f.ek || {}) };
      if (f.status === 'bekleme' && !ek.beklemeBas) { ek.beklemeBas = simdi; ek.oncekiDurum = eski; yama.set(f.id, ek); }
      else if (eski === 'bekleme' && f.status !== 'bekleme' && ek.beklemeBas) {
        ek.beklemeDk = (ek.beklemeDk || 0) + Math.max(0, Math.round((Date.parse(simdi) - Date.parse(ek.beklemeBas)) / 60000));
        ek.beklemeBas = null; yama.set(f.id, ek);
      }
    }
    if (yama.size) this.setState(st => ({ faults: (st.faults || []).map(x => yama.has(x.id) ? { ...x, ek: yama.get(x.id), ekBekleyen: true } : x) }));
  }
  // Arıza ek bilgisini (SLA, bekleme, ana arıza, planlı zaman) sunucuya yazar
  async arizaEkGonder(id) {
    const M = this._sb;
    const f = (this.state.faults || []).find(x => x.id === id);
    if (!M || !M.arizaEkKaydet || !f || !f.dbId || !f.ek || this.state.offline) return;
    const r = await M.arizaEkKaydet(f.dbId, f.ek);
    if (r.ok) this.setState(st => ({ faults: (st.faults || []).map(x => x.id === id ? { ...x, ekBekleyen: false } : x) }));
    else if (!r.cevrimdisi) {
      this.duyur((f.no || 'Arıza') + ' SLA/bekleme bilgisi yazılamadı: ' + (r.err || ''), 8000, 'kotu');
      this.setState(st => ({ faults: (st.faults || []).map(x => x.id === id ? { ...x, ekBekleyen: false } : x) }));
    }
  }
  // Ana arıza çözülünce ona bağlı ihbarlar da kapatılır; bağlı taleplerin vatandaş takip sayfası güncellenir
  anaCozum(f) {
    if (!f || f.status !== 'cozuldu' || !f.dbId) return;
    const cocuk = (this.state.faults || []).filter(x => x.ek && x.ek.anaId === f.dbId && !KAPALI_DURUM.includes(x.status));
    if (!cocuk.length) return;
    if (!window.confirm(f.no + ' ana arızasına bağlı ' + cocuk.length + ' ihbar var:\n\n'
      + cocuk.slice(0, 6).map(x => '• ' + x.no + ' · ' + (x.koy || x.tesisKoy || '')).join('\n')
      + '\n\nHepsi de “Çözüldü” yapılsın mı? (bildirenlere durum güncellenir)')) return;
    const ids = new Set(cocuk.map(x => x.id));
    this.setState(st => ({ faults: (st.faults || []).map(x => ids.has(x.id)
      ? { ...x, status: 'cozuldu', sync: 'pending', note: ((x.note || x.desc || '') + '\nAna arıza ' + f.no + ' ile birlikte çözüldü.').trim() } : x) }));
    let liste = [...(this.state.talepler || [])], degisti = false;
    for (const x of cocuk) {
      const i = liste.findIndex(tt => tt.arizaNo === x.no && tt.durum !== 'cozuldu');
      if (i >= 0) { liste[i] = { ...liste[i], durum: 'cozuldu', sonuc: liste[i].sonuc || ('Ana arıza ' + f.no + ' ile birlikte çözüldü.'), guncelleme: this.damga() }; degisti = true; }
    }
    if (degisti) this.talepYaz(liste, cocuk.length + ' bağlı ihbar çözüldü olarak işaretlendi.');
    else this.duyur(cocuk.length + ' bağlı ihbar çözüldü olarak işaretlendi.', 5000, 'iyi');
    setTimeout(() => this.arizaKuyrukGonder(), 0);
  }
  // Planlı işin zamanı gelince (uygulama açıkken) ekibe bildirim gösterilir
  planliKontrol() {
    const me = this.state.session;
    if (!me) return;
    let goruldu;
    try { goruldu = JSON.parse(localStorage.getItem('ks-planli-uyari') || '[]'); } catch (e) { goruldu = []; }
    const simdi = Date.now();
    const yonetim = ['yonetici', 'mudur', 'muhendis', 'sef'].includes(me.role);
    for (const f of (this.state.faults || [])) {
      const pz = f.ek && f.ek.planli ? Date.parse(f.ek.planli) : 0;
      if (!pz || pz > simdi || KAPALI_DURUM.includes(f.status)) continue;
      const anahtar = (f.dbId || f.id) + '@' + f.ek.planli;
      if (goruldu.includes(anahtar)) continue;
      if (!(yonetim || (me.crew && f.crew === me.crew))) continue;
      goruldu.push(anahtar);
      this.duyur('Planlı iş zamanı geldi: ' + (f.no || '') + ' · ' + (f.type || '') + (f.crew && f.crew !== ATANMADI ? ' · ' + f.crew : ''), 12000, 'bilgi',
        () => this.setState({ tab: 'ariza', panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, photos: [], ...f } }));
    }
    try { localStorage.setItem('ks-planli-uyari', JSON.stringify(goruldu.slice(-200))); } catch (e) { /* depolama kapalı */ }
  }
  // Ek bilgi değişikliği (SLA süresi, bekleme nedeni, ana arıza, planlı zaman)
  arizaEkDegis(f, yama) {
    if (!f) return;
    const ek = { ...(f.ek || {}), ...yama };
    if (f.id) this.setState(st => ({ faults: (st.faults || []).map(x => x.id === f.id ? { ...x, ek, ekBekleyen: true } : x),
      faultForm: st.faultForm && st.faultForm.id === f.id ? { ...st.faultForm, ek, ekBekleyen: true } : st.faultForm }));
    else this.setState(st => ({ faultForm: st.faultForm ? { ...st.faultForm, ek, ekBekleyen: true } : st.faultForm }));
    if (f.id && f.dbId) setTimeout(() => this.arizaEkGonder(f.id), 0);
  }
  // ── sesli not: gerçek mikrofon kaydı, cihazda çalınır, kayıtla birlikte yüklenir
  async sesKayit() {
    const ff = this.state.faultForm;
    if (!ff) return;
    if (this._rec && this._rec.state === 'recording') {
      this._rec.stop();
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      this.say('Bu tarayıcı ses kaydını desteklemiyor. Telefonda Chrome veya Safari kullanın.', true);
      setTimeout(() => this.setState({ toast: null }), 8000);
      return;
    }
    let akis;
    try {
      akis = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      this.say('Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon iznini açın, sonra yeniden deneyin.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    const tur = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(akis, tur ? { mimeType: tur } : undefined);
    const parca = [];
    const bas = Date.now();
    rec.ondataavailable = e => { if (e.data && e.data.size) parca.push(e.data); };
    rec.onstop = () => {
      akis.getTracks().forEach(t => t.stop());
      this._rec = null;
      const sn = Math.max(1, Math.round((Date.now() - bas) / 1000));
      const blob = new Blob(parca, { type: tur || 'audio/webm' });
      if (!blob.size) { this.setState(st => ({ faultForm: { ...st.faultForm, kayitta: false } })); return this.say('Ses kaydedilemedi — mikrofon boş geldi.'); }
      const kayit = {
        blob, url: URL.createObjectURL(blob),
        sure: `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}`,
        kb: Math.round(blob.size / 1024),
        durum: this.state.offline ? 'Cihazda' : 'Hazır',
        asama: this.state.faultForm.fotoAsama === 'sonra' ? 'sonra' : 'once'
      };
      this.setState(st => ({ faultForm: { ...st.faultForm, kayitta: false, kayitBas: null, sesler: [...(st.faultForm.sesler || []), kayit] } }));
      this.say(`Sesli not alındı · ${kayit.sure} · ${kayit.kb} KB. Oynat düğmesiyle dinleyebilirsiniz; arıza kaydını kaydettiğinizde yüklenir.`, true);
      setTimeout(() => this.setState({ toast: null }), 8000);
    };
    this._rec = rec;
    rec.start();
    this.setState({ faultForm: { ...this.state.faultForm, kayitta: true, kayitBas: bas } });
  }
  // ── arıza fotoğrafı: kayıt açılana kadar cihazda bekler, kayıtla birlikte yüklenir
  arizaFotoSec(kamera) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.multiple = !kamera;
    if (kamera) inp.capture = 'environment';
    inp.style.display = 'none';
    inp.onchange = () => {
      const list = [...(inp.files || [])];
      inp.remove();
      if (!list.length) return;
      const ff0 = this.state.faultForm;
      const asama = ff0.fotoAsama === 'sonra' ? 'sonra' : 'once';
      const ek = list.map(f => ({
        file: f, url: URL.createObjectURL(f),
        kb: Math.round(f.size / 1024),
        state: this.state.offline ? 'Cihazda' : 'Hazır',
        asama
      }));
      const ff = this.state.faultForm;
      this.setState({ faultForm: { ...ff, photos: [...(ff.photos || []), ...ek] } });
      this.say(`${ek.length} fotoğraf eklendi (${ASAMA_AD[asama]}) — arıza kaydını kaydettiğinizde yüklenir.`);
    };
    document.body.appendChild(inp);
    inp.click();
  }
  async arizaFotoGonder(photos, tesisDbId, kod, arizaDbId) {
    const M = this._sb;
    const gercek = (photos || []).filter(p => p.file);
    if (!M || !M.tokenOku() || (!tesisDbId && !arizaDbId) || !gercek.length) return 0;
    let ok = 0;
    for (const p of gercek) {
      // arizaDbId verilince "arıza kanıtı" sayılır — saklama süresi min 2 yıl,
      // envanter fotoğrafından ayrı işler (bkz. cop_temizle, KVKK politikası).
      // Aşama (öncesi/sonrası) yeni sütun açmadan aciklama metnine eklenir.
      const r = await M.fotoYukle(p.file, tesisDbId, kod, 'Arıza kaydı · ' + (ASAMA_AD[p.asama] || ASAMA_AD.once), arizaDbId);
      if (r.ok) { ok++; p.yuklendi = true; }
      try { URL.revokeObjectURL(p.url); } catch (e) {}
    }
    if (ok) { if (tesisDbId) this.fotoYenile(tesisDbId); if (arizaDbId) this.arizaFotoYenile(arizaDbId); }
    return ok;
  }
  // Arızaya bağlı fotoğraflar — tesissiz arıza dahil (fotolar['a' + id])
  async arizaFotoYenile(arizaDbId) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !arizaDbId || !M.arizaFotoListesi) return;
    const [r, sn] = await Promise.all([M.arizaFotoListesi(arizaDbId), M.arizaSesListesi ? M.arizaSesListesi(arizaDbId) : Promise.resolve({ ok: false })]);
    this.setState(st => ({
      fotolar: r.ok ? { ...st.fotolar, ['a' + arizaDbId]: r.data } : st.fotolar,
      kayitliSesler: sn.ok ? { ...st.kayitliSesler, ['a' + arizaDbId]: sn.data } : st.kayitliSesler
    }));
  }
  // Arıza kaydını sunucuya yazar. 2026.10.01'e kadar arızalar hiç sunucuya
  // gitmiyordu (arizaKaydet tanımlıydı ama çağrılmıyordu): kayıt yalnız
  // ekranda duruyor, ilk veri yenilemesinde sunucudaki boş listeyle
  // eziliyordu. Artık her yeni/değişen arıza "pending" işaretlenir, cihazda
  // saklanır (ks-ariza-bekleyen) ve sırayla gönderilir. Yeni kayıt numarasını
  // sunucudaki sayaçtan alır (ARZ-yıl-sıra): cihazda üretilen "AR-1xx"
  // numaraları iki cihazda çakışıyordu.
  async arizaGonder(id) {
    const M = this._sb;
    if (!M || !M.tokenOku() || this.state.offline || !this.state.sunucu) return null;
    const f = (this.state.faults || []).find(x => x.id === id);
    if (!f || f.sync !== 'pending') return null;
    const a = f.assetId ? (this.state.assets || []).find(x => x.id === f.assetId) : null;
    // Tesis henüz sunucuda değilse önce tesis kuyruğu gider; tesissiz
    // (şebeke) arızada ilçe gerekir
    if (f.assetId && (!a || a.dbId == null)) return null;
    if (!f.assetId && !f.ilce) return null;
    let no = f.no;
    if (!f.dbId && !/^ARZ-\d{4}-\d+$/.test(no || '')) {
      const n = await M.numaraAl('ariza');
      if (!n.ok) return null;
      no = n.data;
      // Alınan numara hemen kayda işlenir: yazma başarısız olursa yeniden
      // denemede aynı numara kullanılır, sayaçtan boşa numara harcanmaz
      await new Promise(res => this.setState(st => ({
        faults: (st.faults || []).map(x => x.id === id ? { ...x, no } : x)
      }), res));
    }
    const malT = (f.malzeme || []).reduce((t, mz) => t + (Number(mz.tutar) || 0) * (Number(mz.adet) || 1), 0);
    const saat = parseFloat(String(f.hours || '').replace(',', '.')) || 0;
    const isc = parseFloat(String(f.iscilik || '').replace(',', '.')) || saat * 320;
    const r = await M.arizaKaydet({
      dbId: f.dbId || null, no, tesisDbId: a ? a.dbId : null, type: f.type, priority: f.priority || 'Normal',
      status: f.status || 'acik', crew: f.crew && f.crew !== ATANMADI ? f.crew : null,
      desc: f.note || f.desc || null, malzeme: f.malzeme || [], maliyet: malT + isc || null,
      grup: arizaGrubu(f, a), koy: a ? null : f.koy, ilce: a ? null : f.ilce,
      nokta: f.nokta || null, noktaDogruluk: f.noktaDogruluk ?? null
    });
    if (!r.ok) {
      if (!r.cevrimdisi) this.duyur((f.no || 'Arıza') + ' sunucuya yazılamadı: ' + (r.err || 'bilinmeyen hata') + ' Kayıt cihazda bekliyor.', 9000, 'kotu');
      return null;
    }
    const dbId = f.dbId || Number(r.data);
    const yeniId = f.dbId ? f.id : 'f' + dbId;
    // Cihazdaki geçici numara (AR-1xx) ile açılan iz satırları sunucu numarasına bağlansın
    if (!f.dbId && f.no && f.no !== no) this.denetimYaz('ariza', 'Arıza numarası verildi', f.no + ' → ' + no, no);
    const yeni = { ...f, id: yeniId, dbId, no, tesisDbId: a ? a.dbId : null, grup: arizaGrubu(f, a), sync: 'synced' };
    const ff = this.state.faultForm;
    // Talep, arızaya cihaz numarasıyla bağlanmıştı — sunucu numarasına çevrilir
    const tl = (this.state.talepler || []);
    const talepDegis = no !== f.no && tl.some(t => t.arizaNo === f.no);
    if (talepDegis) {
      const yeniTl = tl.map(t => t.arizaNo === f.no ? { ...t, arizaNo: no } : t);
      this.modulYaz('talep', yeniTl.slice(0, 1000));
    }
    await new Promise(res => this.setState(st => ({
      faults: (st.faults || []).map(x => x.id === id ? yeni : x),
      faultForm: ff && ff.id === id ? { ...ff, id: yeniId, dbId, no, sync: 'synced' } : st.faultForm,
      ...(talepDegis ? { talepler: (st.talepler || []).map(t => t.arizaNo === f.no ? { ...t, arizaNo: no } : t) } : {})
    }), res));
    this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults });
    // SLA / bekleme / ana arıza / planlı zaman bilgisi
    if (f.ek && (f.ekBekleyen || !f.dbId)) this.arizaEkGonder(yeniId);
    // Cihazda bekleyen fotoğraf/ses dosyaları artık kayda bağlanabilir
    (async () => {
      const d = await this._depoYuk;
      if (d) { await d.medyaRefDegis(id, yeniId); this.medyaGonder(yeniId); }
    })();
    // Çevrimdışıyken çözülen arızanın bağlı iş emri şimdi kapanır
    if (yeni.status === 'cozuldu') {
      this.talepArizaKapandi(yeni);
      const ie = this.isEmriBul(dbId);
      if (ie && ie.status !== 'kapatildi') setTimeout(() => this.isEmriKapatVer(ie, yeni), 500);
    }
    // "Kaydedince iş emri aç ve ekibe ata" işaretliyse (telefon sade ekran)
    if (f.iseEmri === true && !f.dbId) {
      this.setState(st => ({ faults: (st.faults || []).map(x => x.id === yeniId ? { ...x, iseEmri: false } : x) }));
      this.isEmriAcSade(yeni, { crew: f.crew, araclar: f.aracSec || [] });
    }
    // Kayıtla birlikte seçilen fotoğraf ve sesli notlar arıza kimliği belli
    // olunca yüklenir — arıza kanıtı sayılsınlar diye
    const md = (this._arizaMedya || {})[id];
    if (md) {
      delete this._arizaMedya[id];
      if ((md.photos || []).length) {
        this.arizaFotoGonder(md.photos, a ? a.dbId : null, a ? a.code : no, dbId).then(n => {
          if (n) this.duyur(`${n} arıza fotoğrafı ${no} kaydına yüklendi.`, 5000, 'iyi');
        });
      }
      if ((md.sesler || []).length) {
        (async () => {
          let n = 0;
          for (const sn of md.sesler) {
            const sec = (sn.sure || '0:00').split(':').reduce((t, v) => t * 60 + (+v || 0), 0);
            const r = await M.sesYukle(sn.blob, a ? a.dbId : null, a ? a.code : no, sec, 'Arıza sesli notu · ' + (ASAMA_AD[sn.asama] || ASAMA_AD.once), dbId);
            if (r && r.ok) n++;
          }
          if (n) { this.arizaFotoYenile(dbId); this.duyur(n + ' sesli not ' + no + ' kaydına yüklendi.', 5000, 'iyi'); }
        })();
      }
    }
    return yeni;
  }
  async arizaKuyrukGonder() {
    if (this._arizaGonderiyor) return 0;
    const bekleyen = (this.state.faults || []).filter(f => f.sync === 'pending').map(f => f.id);
    if (!bekleyen.length) return 0;
    this._arizaGonderiyor = true;
    let n = 0;
    try {
      for (const id of bekleyen) { if (await this.arizaGonder(id)) n++; }
    } finally { this._arizaGonderiyor = false; }
    return n;
  }
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
  // Saha fotoğrafı: öncesi/sonrası. Arıza sunucudaysa hemen yüklenir, değilse
  // kayıt yazılınca (arizaGonder) yüklenmek üzere bekler.
  sahaFoto(f, asama) {
    if (!f) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment'; inp.style.display = 'none';
    inp.onchange = () => {
      const list = [...(inp.files || [])];
      inp.remove();
      if (!list.length) return;
      const ek = list.map(file => ({ file, url: URL.createObjectURL(file), kb: Math.round(file.size / 1024), asama }));
      const sf = { ...(this.state.sahaFoto || {}) };
      const k = sf[f.id] || { once: 0, sonra: 0 };
      sf[f.id] = { ...k, [asama]: k[asama] + ek.length };
      this.setState({ sahaFoto: sf });
      const a = (this.state.assets || []).find(x => x.id === f.assetId);
      const beklet = async (liste) => {
        // Önce telefonun deposuna (sayfa kapansa da kalır); depolama kapalıysa bellekte tutulur
        const kalici = await this.medyaBirak('ariza', f.id, a ? a.code : f.no, { photos: liste });
        if (!kalici) {
          this._arizaMedya = this._arizaMedya || {};
          const md = this._arizaMedya[f.id] || { photos: [], sesler: [] };
          md.photos = [...md.photos, ...liste];
          this._arizaMedya[f.id] = md;
          this.setState(st => ({ faults: (st.faults || []).map(x => x.id === f.id ? { ...x, sync: 'pending' } : x) }));
        }
        this.duyur(`${ASAMA_AD[asama]} fotoğrafı telefonda — internet gelince yüklenecek.`, 5000);
      };
      if (f.dbId && !this.state.offline && this._sb) {
        this.arizaFotoGonder(ek, a ? a.dbId : null, a ? a.code : f.no, f.dbId).then(n => {
          if (n === ek.length) return this.duyur(`${ASAMA_AD[asama]} fotoğrafı ${f.no} kaydına yüklendi.`, 5000, 'iyi');
          beklet(ek.filter(p => !p.yuklendi));
        });
      } else {
        beklet(ek);
      }
    };
    document.body.appendChild(inp);
    inp.click();
  }
  // Çevrimdışı çekilen fotoğraf ve sesler IndexedDB'de durur; sayfa kapansa da
  // kaybolmaz, internet gelince ve kayıt sunucuya yazılınca kendiliğinden yüklenir.
  // Depolama kapalıysa false döner (çağıran bellekteki eski yola düşer).
  async medyaBirak(hedef, ref, kod, ek) {
    const d = await this._depoYuk;
    if (!d) return false;
    let tamam = true;
    for (const p of (ek.photos || [])) {
      if (!p.file) continue;
      const id = await d.medyaEkle({ hedef, ref, kod, tur: 'foto', blob: p.file, ad: p.file.name || '', asama: p.asama || 'once', kb: p.kb || 0 });
      if (id == null || id === true) tamam = false; else p.idbId = id;
    }
    for (const sn of (ek.sesler || [])) {
      if (!sn.blob) continue;
      const id = await d.medyaEkle({ hedef, ref, kod, tur: 'ses', blob: sn.blob, sure: sn.sure || '0:00', asama: sn.asama || 'once' });
      if (id == null || id === true) tamam = false; else sn.idbId = id;
    }
    this.bekleyenEkYenile();
    return tamam;
  }
  // Tek arızanın cihazda bekleyen dosyalarını yükler (arıza sunucuya yazılmışsa)
  async medyaGonder(ref) {
    const d = await this._depoYuk, M = this._sb;
    if (!d || !M || !M.tokenOku() || this.state.offline) return 0;
    const f = (this.state.faults || []).find(x => x.id === ref);
    if (!f || !f.dbId) return 0;
    const a = f.assetId ? (this.state.assets || []).find(x => x.id === f.assetId) : null;
    const tesisDbId = a ? a.dbId : null, kod = a ? a.code : f.no;
    this._medyaUcta = this._medyaUcta || new Set();
    const liste = (await d.medyaListe()).filter(x => x.hedef === 'ariza' && x.ref === ref && !this._medyaUcta.has(x.id));
    let foto = 0, ses = 0;
    for (const m of liste) {
      this._medyaUcta.add(m.id);
      try {
        let r;
        if (m.tur === 'foto') r = await M.fotoYukle(m.blob, tesisDbId, kod, 'Arıza kaydı · ' + (ASAMA_AD[m.asama] || ASAMA_AD.once), f.dbId);
        else {
          const sec = String(m.sure || '0:00').split(':').reduce((tt, v) => tt * 60 + (+v || 0), 0);
          r = await M.sesYukle(m.blob, tesisDbId, kod, sec, 'Arıza sesli notu · ' + (ASAMA_AD[m.asama] || ASAMA_AD.once), f.dbId);
        }
        if (r && r.ok) { await d.medyaSil(m.id); m.tur === 'foto' ? foto++ : ses++; }
        else if (r && r.cevrimdisi) break;
      } catch (e) { break; } finally { this._medyaUcta.delete(m.id); }
    }
    this.bekleyenEkYenile();
    if (foto || ses) {
      this.arizaFotoYenile(f.dbId);
      this.duyur((foto ? foto + ' fotoğraf' : '') + (foto && ses ? ' ve ' : '') + (ses ? ses + ' sesli not' : '') + ' ' + f.no + ' kaydına yüklendi.', 5000, 'iyi');
    }
    return foto + ses;
  }
  // Bağlantı gelince: bekleyen bütün arıza ve tesis dosyaları
  async medyaKuyrukGonder() {
    const d = await this._depoYuk, M = this._sb;
    if (!d || !M || !M.tokenOku() || this.state.offline) return;
    const liste = await d.medyaListe();
    if (!liste.length) { this.bekleyenEkYenile(); return; }
    for (const ref of [...new Set(liste.filter(x => x.hedef === 'ariza').map(x => x.ref))]) await this.medyaGonder(ref);
    // tesis fotoğrafları: kayıt kodundan sunucudaki tesis bulunur
    const tes = liste.filter(x => x.hedef === 'tesis');
    const kodlar = [...new Set(tes.map(x => x.kod))];
    this._medyaUcta = this._medyaUcta || new Set();
    for (const kod of kodlar) {
      const a = (this.state.assets || []).find(x => x.dbId != null && String(x.code).toUpperCase() === String(kod).toUpperCase());
      if (!a) continue;
      let n = 0;
      for (const m of tes.filter(x => x.kod === kod && !this._medyaUcta.has(x.id))) {
        this._medyaUcta.add(m.id);
        try {
          const r = await M.fotoYukle(m.blob, a.dbId, a.code);
          if (r && r.ok) { await d.medyaSil(m.id); n++; } else if (r && r.cevrimdisi) break;
        } catch (e) { break; } finally { this._medyaUcta.delete(m.id); }
      }
      if (n) { this.fotoYenile(a.dbId); this.duyur(n + ' fotoğraf ' + a.code + ' kaydına yüklendi.', 5000, 'iyi'); }
    }
    this.bekleyenEkYenile();
  }
  // Gönderilmemiş arızalar cihazda saklanır: sayfa kapanıp açılsa da kaybolmaz.
  // (Seçilen fotoğraf dosyaları saklanamaz — tarayıcı izin vermez.)
  arizaBekleyenYaz() {
    const b = (this.state.faults || []).filter(f => f.sync === 'pending' || f.ekBekleyen)
      .map(f => ({ ...f, photos: (f.photos || []).filter(p => !p.file), sesler: [] }));
    try { localStorage.setItem('ks-ariza-bekleyen', JSON.stringify(b)); } catch (e) { /* depolama kapalı */ }
  }