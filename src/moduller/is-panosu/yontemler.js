  // is-panosu modülü — İş panosu işlemleri. Hepsi var olan akışları çağırır; yeni iş kuralı eklemez.
  // “Yeni geldi” uyarısı: Yeni sütunundaki, son 12 saatte gelmiş ve henüz açılıp bakılmamış iş
  panoYeniMi(anahtar, ms) {
    return !!ms && Date.now() - ms < 12 * 3600000 && !(this.state.panoGoruldu || []).includes(anahtar);
  }
  panoGoruldu(anahtar) {
    const g = this.state.panoGoruldu || [];
    if (g.includes(anahtar)) return;
    const yeni = [...g, anahtar].slice(-400);
    try { localStorage.setItem('ks-pano-goruldu', JSON.stringify(yeni)); } catch (e) { /* depolama kapalı */ }
    this.setState({ panoGoruldu: yeni });
  }
  // Menüdeki sayı: bakılmamış yeni işler
  // Sırası bende olan onaylar: ön/son onay, tesis önerisi, malzeme isteği, reddedilen talep incelemesi (menü rozeti ve “Onayım bekliyor” sütunu)
  onayBekleyenSay() {
    const s = this.state, me = s.session;
    if (!me) return 0;
    const can = k => this.yetkiVar(me, k);
    let n = 0;
    if (s.modul.ariza !== false) {
      for (const f of (s.faults || [])) {
        if (f.status === 'kontrol' && (can('onOnay') || can('close'))) n++;
        else if (f.status === 'mudur_onayi' && can('close')) n++;
      }
    }
    n += (s.tesisOneriler || []).filter(o => o.benim_sira).length;
    if (can('stokSiparisOnay') && s.modul.ambar !== false) n += (s.siparis || []).filter(x => x.durum === 'istek').length;
    if (can('close') && s.modul.talep !== false) n += (s.talepler || []).filter(x => x.durum === 'red').length;
    return n;
  }
  panoYeniSayi() {
    const s = this.state;
    let n = 0;
    if (s.modul.talep !== false) {
      for (const b of (s.basvurular || [])) if (b.durum === 'yeni' && this.panoYeniMi('b' + b.id, Date.parse(b.zaman) || 0)) n++;
      for (const t of (s.talepler || [])) if (!TALEP_KAPALI.includes(t.durum) && this.panoYeniMi('t' + t.id, this.damgaMs(t.acilis))) n++;
    }
    if (s.modul.ariza !== false) {
      for (const f of (s.faults || [])) {
        if (f.status !== 'acik' && f.status !== 'yeniden') continue;
        if (this.panoYeniMi('f' + f.id, this.damgaMs(f.opened) || (f.openedIso ? Date.parse(f.openedIso) : 0))) n++;
      }
    }
    return n;
  }
  // Panoyu Tablo görünümünde, verilen süzgeçle açar (durum: yeni|atandi|sahada|bitti, ekip, q)
  panoGit(suz) {
    this.setState({ tab: 'isPanosu', panoGorunum: 'tablo', panoSuz: { ...(suz || {}) }, isKarti: null, faultForm: null });
  }
  // Başvuruyu tek adımda arıza formuna taşır (önce talep olur, sonra arıza formu açılır)
  async panoBasvuruArizaya(b) {
    await this.basvuruAktar(b);
    const t = (this.state.talepler || []).find(x => x.takip === b.takip);
    if (t) this.panoTalepArizaya(t);
  }
  // Talebi arıza formuna taşır; formu açık bırakır, panodan ayrılmaz
  panoTalepArizaya(t) {
    this.talepArizaya(t.id);
    setTimeout(() => this.setState({ tab: 'isPanosu' }), 0);
  }
  // Arızayı ayrıntı formunda (masaüstü sağ panel / telefon sade ekran) açar
  panoAc(f) {
    this.panoGoruldu('f' + f.id);
    const form = { malzeme: [], sesler: [], iscilik: '', isaret: null, photos: [], ...f };
    // Masaüstü: tek sayfa kart. Telefon: mevcut sade arıza ekranı (alt sayfa)
    if (this.state.device === 'phone') this.setState({ panel: 'ariza', faultForm: form });
    else this.setState({ tab: 'isKarti', isKarti: { tur: 'a', id: f.id }, panel: 'yok', faultForm: form });
  }
  // "Sahada": ekip yerine vardı
  panoSahada(f) {
    this.sahaDurum({ ...f }, 'sahada');
    this.duyur((f.no || 'İş') + ' sahada olarak işaretlendi.', 4000, 'iyi');
  }
  // Ekip atar; sunucuya bağlıysa iş emri de açılır (arıza formundaki "iş emri oluştur ve ekibe ata" ile aynı iş)
  async panoEkipAta(f, crew) {
    this.setState({ panoEkip: null });
    if (!this.yetkiVar(this.state.session, 'assign')) return this.say('Ekip atamasını operatör, müdür ya da yönetici yapar.', true);
    const M = this._sb;
    const ie = f.dbId ? this.isEmriBul(f.dbId) : null;
    const baglanti = !!(M && M.tokenOku() && this.state.sunucu && !this.state.offline);
    if (ie && baglanti) await this.isEmriAtaKaydet(ie, { ekip: crew, araclar: (ie.araclar || []).map(x => x.id) });
    else if (!ie && f.dbId && baglanti) await this.isEmriAcSade(f, { crew });
    // İş emri akışı atlandıysa (bağlantı yok, hata) ekip yine de arızaya yazılır
    const g = (this.state.faults || []).find(x => x.id === f.id);
    if (g && g.crew !== crew) this.arizaEkipYaz(g, crew);
    this.denetimYaz('ariza', 'Panodan ekip atandı', (f.no || '') + ' · ' + crew, f.no || '');
  }
  // Kutuyu bir sütuna bıraktı
  panoBirak(kolon) {
    const k = this._panoSurukle;
    this._panoSurukle = null;
    this.setState({ panoHedef: null });
    if (!k || k.tur !== 'ariza') return;
    const f = (this.state.faults || []).find(x => x.id === k.id);
    if (!f) return;
    const ekipVar = !!f.crew && f.crew !== ATANMADI;
    if (kolon === 'atandi') {
      if (f.status === 'atandi') return;
      if (!this.yetkiVar(this.state.session, 'assign')) return this.say('Ekip atamasını operatör, müdür ya da yönetici yapar.', true);
      if (ekipVar && ['acik', 'yeniden'].includes(f.status)) return this.panoEkipAta(f, f.crew);
      return this.setState({ panoEkip: f.id, panoKolon: 'yeni' }, () => this.duyur('Önce hangi ekibin gideceğini seçin.', 4500, 'bilgi'));
    }
    if (kolon === 'sahada') {
      if (f.status === 'sahada') return;
      return this.panoSahada(f);
    }
    if (kolon === 'bitti') {
      this.panoAc(f);
      return this.duyur('Kapatmak için formda “İşi tamamla”ya basın — kanıt fotoğrafı ve malzeme orada alınır.', 7000, 'bilgi');
    }
    this.duyur('İşi geriye almak için arıza formundaki durumu değiştirin.', 5000, 'bilgi');
  }
//@dahil moduller/is-panosu/yontemler/kart.js