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