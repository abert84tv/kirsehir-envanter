  // Sipariş listesi — tükenmek üzere olan kalemler buraya eklenir, ambar
  // girişi yapılınca kendiliğinden düşer
  siparisYaz(liste, mesaj) {
    this.modulYaz('siparis', liste);
    this.setState({ siparis: liste }, () => { if (mesaj) this.duyur(mesaj, 4500, 'iyi'); });
  }
  siparisOneri(ad) {
    const k = this.katalogBul(ad);
    const t = this.ambarTuketim(ad);
    const toplam = this.ambarToplam(ad);
    // 30 günlük ihtiyaç, yoksa kritik eşiğin iki katı
    const hedef = t.ort > 0 ? Math.ceil(t.ort * 30) : Math.ceil(((k && k.esik) || 2) * 2);
    return Math.max(1, hedef - toplam);
  }
  siparisEkle(ad) {
    const liste = this.state.siparis || [];
    const var_ = liste.find(x => x.malzeme === ad);
    if (var_) return this.siparisYaz(liste.filter(x => x.id !== var_.id), ad + ' sipariş listesinden çıkarıldı.');
    const k = this.katalogBul(ad);
    this.siparisYaz([...liste, {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), malzeme: ad,
      adet: this.siparisOneri(ad), birim: k ? k.birim : 'adet',
      ekleyen: (this.state.session && this.state.session.name) || '', damga: this.damga()
    }], ad + ' sipariş listesine eklendi.');
  }
  // Miktar kutusu her tuşta sunucuya yazmasın: ekran hemen güncellenir,
  // yazma yazmayı bitirdikten bir süre sonra tek sefer yapılır
  siparisAdet(id, deger) {
    const ham = String(deger).replace(',', '.');
    const n = parseFloat(ham);
    const liste = (this.state.siparis || []).map(x => x.id === id
      ? { ...x, adet: ham === '' ? '' : (isFinite(n) && n > 0 ? n : x.adet) } : x);
    this.setState({ siparis: liste });
    clearTimeout(this._sipZaman);
    this._sipZaman = setTimeout(() => {
      const temiz = (this.state.siparis || []).map(x => x.adet === '' ? { ...x, adet: 1 } : x);
      this.siparisYaz(temiz);
    }, 900);
  }
  siparisMetin() {
    const liste = this.state.siparis || [];
    return 'Malzeme sipariş listesi — ' + this.damga() + '\n'
      + liste.map((x, i) => {
        const k = this.katalogBul(x.malzeme);
        return (i + 1) + '. ' + (k ? k.kod + ' ' : '') + x.malzeme + ' — ' + x.adet + ' ' + x.birim;
      }).join('\n');
  }
  siparisKopyala() {
    const t = this.siparisMetin();
    const bitti = () => this.duyur('Sipariş listesi panoya kopyalandı — e-posta ya da yazışmaya yapıştırabilirsiniz.', 5000, 'iyi');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(bitti, () => this.duyur('Kopyalanamadı — tarayıcı izin vermedi.', 5000, 'kotu'));
    } catch (e) { /* aşağıda bildirilir */ }
    this.duyur('Kopyalanamadı — tarayıcı izin vermedi.', 5000, 'kotu');
  }