  // is-panosu modülü — İş panosu işlemleri. Hepsi var olan akışları çağırır; yeni iş kuralı eklemez.
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
    this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, photos: [], ...f } });
  }
  // "Sahada": ekip yerine vardı
  panoSahada(f) {
    this.sahaDurum({ ...f }, 'sahada');
    this.duyur((f.no || 'İş') + ' sahada olarak işaretlendi.', 4000, 'iyi');
  }
  // Ekip atar; sunucuya bağlıysa iş emri de açılır (arıza formundaki "iş emri oluştur ve ekibe ata" ile aynı iş)
  async panoEkipAta(f, crew) {
    this.setState({ panoEkip: null });
    if (!CAN.assign.includes((this.state.session || {}).role)) return this.say('Ekip atamasını yönetici, müdür, mühendis ya da şef yapar.', true);
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
      if (!CAN.assign.includes((this.state.session || {}).role)) return this.say('Ekip atamasını yönetici, müdür, mühendis ya da şef yapar.', true);
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
