  // ── telemetri: cihazlar, son değerler, alarmlar, eşik kuralları
  telemetriGuncelle(yama, cb) { this.setState(st => ({ telemetri: { ...st.telemetri, ...yama } }), cb); }
  async telemetriYenile(sessiz) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !M.telemetriCihazlar || this.state.offline) return;
    const [c, a, k] = await Promise.all([M.telemetriCihazlar(), M.telemetriAlarmlar(7), M.telemetriKurallar()]);
    if (!c.ok) {
      if (c.cevrimdisi) return;
      const kurulu = /does not exist|telemetri_cihaz_listesi/i.test(c.err || '');
      return this.telemetriGuncelle({ yuk: true, hata: kurulu
        ? 'Telemetri veritabanı kurulu değil — SQL-telemetri.sql dosyasını Supabase SQL Editor’de çalıştırın.' : (c.err || 'Telemetri okunamadı.') });
    }
    const cihazlar = (c.data || []).map(r => ({
      id: r.id, kod: r.kod, ad: r.ad, tesisId: r.tesis_id, tesisKod: r.tesis_kod || '', koy: r.koy || '', ilce: r.ilce || '',
      tur: r.tur, protokol: r.protokol, beklenenDk: r.beklenen_dk || 15, aktif: r.aktif !== false,
      sonMs: r.son_gorulme ? Date.parse(r.son_gorulme) : 0, degerler: Array.isArray(r.degerler) ? r.degerler : [], acikAlarm: r.acik_alarm || 0
    }));
    const alarmlar = a.ok ? (a.data || []).map(x => ({
      id: x.id, cihazId: x.cihaz_id, cihazAd: x.cihaz_ad, tesisId: x.tesis_id, tesisKod: x.tesis_kod || '', kanal: x.kanal,
      deger: x.deger, onem: x.onem, mesaj: x.mesaj, acildi: x.acildi, kapandi: x.kapandi, onayAd: x.onay_zaman ? (x.onay_ad || 'Görüldü') : null, arizaId: x.ariza_id
    })) : this.state.telemetri.alarmlar;
    const kurallar = k.ok ? (k.data || []).map(x => ({
      id: x.id, cihazId: x.cihaz_id, cihazAd: x.cihaz_ad, kanal: x.kanal, op: x.op, esik: x.esik, onem: x.onem, aktif: x.aktif !== false
    })) : this.state.telemetri.kurallar;
    this.telemetriGuncelle({ yuk: true, hata: '', cihazlar, alarmlar, kurallar }, () => {
      if (this.state.telemetri.sec) this.telemetriSeriYukle();
    });
  }
  telemetriSec(id) {
    const T = this.state.telemetri;
    this.telemetriGuncelle({ sec: T.sec === id ? null : id, kanal: null, seri: [], bilgi: false }, () => { if (this.state.telemetri.sec) this.telemetriSeriYukle(); });
  }
  async telemetriSeriYukle() {
    const M = this._sb, T = this.state.telemetri;
    const c = T.cihazlar.find(x => x.id === T.sec);
    if (!M || !c) return;
    const kanal = T.kanal || (c.degerler[0] && c.degerler[0].kanal);
    if (!kanal) return this.telemetriGuncelle({ seri: [] });
    const r = await M.telemetriGecmis(c.id, kanal, T.saat);
    if (!r.ok) return;
    const cur = this.state.telemetri;
    if (cur.sec !== c.id || (cur.kanal || kanal) !== kanal) return;
    this.telemetriGuncelle({ kanal, seri: (r.data || []).map(x => ({ t: Date.parse(x.zaman), v: x.deger })) });
  }
  telemetriFormAc(c) {
    this.telemetriGuncelle({ anahtar: null, bilgi: false, form: c
      ? { id: c.id, kod: c.kod, ad: c.ad, tesis: c.tesisKod, tur: c.tur, protokol: c.protokol, dk: String(c.beklenenDk) }
      : { id: null, kod: '', ad: '', tesis: '', tur: 'kuyu', protokol: 'http', dk: '15' } });
  }
  telemetriForm(alan, v) { this.telemetriGuncelle({ form: { ...this.state.telemetri.form, [alan]: v } }); }
  async telemetriFormKaydet() {
    const M = this._sb, f = this.state.telemetri.form;
    if (!M || !f) return;
    const tkod = (f.tesis || '').trim().toUpperCase();
    let tesisId = null;
    if (tkod) {
      const a = (this.state.assets || []).find(x => String(x.code || '').toUpperCase() === tkod);
      if (!a || a.dbId == null) return this.duyur('“' + f.tesis + '” kodlu tesis bulunamadı — listeden seçin ya da boş bırakın.', 6000, 'kotu');
      tesisId = a.dbId;
    }
    const r = await M.telemetriCihazKaydet({ id: f.id, kod: f.kod, ad: f.ad, tesisId, tur: f.tur, protokol: f.protokol, dk: parseInt(f.dk, 10) || 15 });
    if (!r.ok) return this.duyur(r.err || 'Cihaz kaydedilemedi.', 7000, 'kotu');
    this.denetimYaz('kayit', f.id ? 'Telemetri cihazı düzenlendi' : 'Telemetri cihazı eklendi', f.ad + ' · ' + f.kod, tkod);
    const yeniAnahtar = r.data && r.data.anahtar ? { kod: f.kod.trim(), anahtar: r.data.anahtar } : null;
    this.telemetriGuncelle({ form: null, anahtar: yeniAnahtar, bilgi: !!yeniAnahtar, sec: (r.data && r.data.id) || this.state.telemetri.sec });
    await this.telemetriYenile(true);
  }
  async telemetriAnahtarYenile(c) {
    if (!c || !window.confirm(c.ad + ' için yeni anahtar üretilsin mi?\n\nEski anahtar hemen geçersiz olur; cihazdaki anahtarı da değiştirmeniz gerekir.')) return;
    const r = await this._sb.telemetriAnahtarYenile(c.id);
    if (!r.ok) return this.duyur(r.err || 'Anahtar yenilenemedi.', 6000, 'kotu');
    this.denetimYaz('kayit', 'Telemetri anahtarı yenilendi', c.ad + ' · ' + c.kod, '');
    this.telemetriGuncelle({ anahtar: { kod: c.kod, anahtar: r.data }, bilgi: true });
  }
  async telemetriCihazSil(c) {
    if (!c || !window.confirm(c.ad + ' cihazı, ölçüm geçmişi ve kuralları ile birlikte silinsin mi?')) return;
    const r = await this._sb.telemetriCihazSil(c.id);
    if (!r.ok) return this.duyur(r.err || 'Silinemedi.', 6000, 'kotu');
    this.denetimYaz('kayit', 'Telemetri cihazı silindi', c.ad + ' · ' + c.kod, '');
    this.telemetriGuncelle({ sec: null, anahtar: null, bilgi: false, seri: [] });
    this.telemetriYenile(true);
  }
  telemetriKuralFormAc() {
    const T = this.state.telemetri;
    const c = T.cihazlar.find(x => x.id === T.sec) || T.cihazlar[0];
    if (!c) return this.duyur('Önce bir cihaz ekleyin.', 4000, 'kotu');
    this.telemetriGuncelle({ kuralForm: { cihaz: String(c.id), kanal: (c.degerler[0] && c.degerler[0].kanal) || '', op: '<', esik: '', onem: 'uyari' } });
  }
  telemetriKuralAlan(alan, v) { this.telemetriGuncelle({ kuralForm: { ...this.state.telemetri.kuralForm, [alan]: v } }); }
  async telemetriKuralKaydet() {
    const f = this.state.telemetri.kuralForm;
    const esik = parseFloat(String(f.esik).replace(',', '.'));
    if (!f.kanal.trim()) return this.duyur('Ölçüm adını yazın (örn. seviye).', 4000, 'kotu');
    if (isNaN(esik)) return this.duyur('Sınır değeri sayı olarak yazın.', 4000, 'kotu');
    const r = await this._sb.telemetriKuralKaydet({ cihazId: Number(f.cihaz), kanal: f.kanal.trim(), op: f.op, esik, onem: f.onem });
    if (!r.ok) return this.duyur(r.err || 'Kural kaydedilemedi.', 6000, 'kotu');
    this.telemetriGuncelle({ kuralForm: null });
    this.telemetriYenile(true);
  }
  async telemetriKuralSil(id) {
    if (!window.confirm('Bu kural silinsin mi?')) return;
    const r = await this._sb.telemetriKuralSil(id);
    if (!r.ok) return this.duyur(r.err || 'Silinemedi.', 6000, 'kotu');
    this.telemetriYenile(true);
  }
  async telemetriAlarmOnayla(a) {
    const r = await this._sb.telemetriAlarmOnayla(a.id, null);
    if (!r.ok) return this.duyur(r.err || 'Onaylanamadı.', 5000, 'kotu');
    this.telemetriYenile(true);
  }
  // Alarmı onaylar ve içeriği doldurulmuş arıza formunu açar
  telemetriAlarmAriza(a) {
    const T = this.state.telemetri;
    const c = T.cihazlar.find(x => x.id === a.cihazId);
    const tesis = a.tesisId != null ? (this.state.assets || []).find(x => x.dbId === a.tesisId) : null;
    const grup = tesis ? arizaGrubu({}, tesis) : 'su';
    const G = ARIZA_GRUP[grup] || ARIZA_GRUP.su;
    this._sb.telemetriAlarmOnayla(a.id, null).then(() => this.telemetriYenile(true));
    this.setState({
      tab: this.state.device === 'phone' ? this.state.tab : 'ariza', panel: 'ariza', selected: tesis ? tesis.id : this.state.selected,
      faultForm: {
        assetId: tesis ? tesis.id : null, type: G.turler[0], grup, yerModu: tesis ? 'tesis' : 'koy',
        ilce: tesis ? '' : ((c && c.ilce) || ''), koy: tesis ? '' : ((c && c.koy) || ''),
        priority: a.onem === 'kritik' ? 'Acil' : 'Yüksek', status: 'acik', crew: ATANMADI,
        note: 'TELEMETRİ ALARMI · ' + (a.mesaj || '') + (c ? ' · cihaz ' + c.kod : ''),
        malzeme: [], sesler: [], iscilik: '', isaret: null, id: null, photos: [], hours: '', tesisSec: !tesis, tesisQ: ''
      }
    });
  }
  // Bağlantı bilgisi: cihaza girilecek adres, kod ve örnek gövde
  telemetriBaglantiMetni(kod, anahtar) {
    const M = this._sb;
    const ornek = JSON.stringify({ p_kod: kod, p_anahtar: anahtar || '<cihaz anahtarı>',
      p_olcumler: [{ kanal: 'debi', deger: 12.4, birim: 'l/s' }, { kanal: 'seviye', deger: 38.2, birim: 'm' }] }, null, 2);
    return 'POST ' + (M ? M.TELEMETRI_ADRES : '') + '\n'
      + 'apikey: ' + (M ? M.YAYIN_ANAHTARI : '') + '\n'
      + 'Content-Type: application/json\n\n' + ornek
      + '\n\nİsteğe bağlı: her ölçüme "zaman": "2026-10-05T14:30:00Z" eklenebilir — internetsiz kalan toplayıcı biriktirdiği ölçümleri sonradan gönderebilir.';
  }