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
    const var_ = liste.find(x => x.malzeme === ad && x.tur !== 'zimmet');
    if (var_) return this.siparisYaz(liste.filter(x => x.id !== var_.id), ad + ' sipariş listesinden çıkarıldı.');
    const k = this.katalogBul(ad);
    // Malzeme alım isteğini operatör açar, müdür onaylar; onay yetkisi olan açarsa kendiliğinden onaylı olur
    const ben = (this.state.session && this.state.session.name) || '';
    const onayli = this.yetkiVar(this.state.session, 'stokSiparisOnay');
    this.siparisYaz([...liste, {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), malzeme: ad,
      adet: this.siparisOneri(ad), birim: k ? k.birim : 'adet',
      ekleyen: ben, damga: this.damga(),
      tur: 'alim', durum: onayli ? 'onayli' : 'istek', ...(onayli ? { onaylayan: ben, onayDamga: this.damga() } : {})
    }], onayli ? ad + ' sipariş listesine eklendi (onaylı).' : ad + ' için alım isteği açıldı — müdür onayı bekliyor.');
  }
  // Miktar kutusu her tuşta sunucuya yazmasın: ekran hemen güncellenir,
  // yazma yazmayı bitirdikten bir süre sonra tek sefer yapılır
  siparisAdet(id, deger) {
    const ham = String(deger).replace(',', '.');
    const n = parseFloat(ham);
    // onaylı isteğin miktarını yalnız onay yetkilisi (müdür) değiştirir
    const onayYetkili = this.yetkiVar(this.state.session, 'stokSiparisOnay');
    const hedef = (this.state.siparis || []).find(x => x.id === id);
    if (hedef && hedef.durum === 'onayli' && !onayYetkili) return this.duyur('Onaylı isteğin miktarını yalnızca müdür değiştirir; geri gönderilmesini isteyin.', 5000, 'kotu');
    const liste = (this.state.siparis || []).map(x => x.id === id
      ? { ...x, adet: ham === '' ? '' : (isFinite(n) && n > 0 ? n : x.adet) } : x);
    this.setState({ siparis: liste });
    clearTimeout(this._sipZaman);
    this._sipZaman = setTimeout(() => {
      const temiz = (this.state.siparis || []).map(x => x.adet === '' ? { ...x, adet: 1 } : x);
      this.siparisYaz(temiz);
    }, 900);
  }
  // Ekibe malzeme verme isteği: operatör açar, müdür onaylar, onaylanınca operatör teslim eder
  cikisIstegiAc(g) {
    if (!this.yetkiVar(this.state.session, 'stokSiparis')) return this.duyur('Ekibe malzeme verme isteğini operatör açar.', 5000, 'kotu');
    const ben = (this.state.session && this.state.session.name) || '';
    const onayli = this.yetkiVar(this.state.session, 'stokSiparisOnay');
    const liste = this.state.siparis || [];
    this.siparisYaz([...liste, {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), tur: 'zimmet', malzeme: g.malzeme,
      adet: g.adet, birim: g.birim, ekip: g.ekip, ambar: g.ambar, not: (g.not || '').trim(),
      ekleyen: ben, damga: this.damga(),
      durum: onayli ? 'onayli' : 'istek', ...(onayli ? { onaylayan: ben, onayDamga: this.damga() } : {})
    }], g.malzeme + ' × ' + g.adet + ' ' + g.birim + ' → ' + g.ekip + (onayli ? ' çıkış isteği açıldı (onaylı).' : ' için çıkış isteği açıldı — müdür onayı bekliyor.'));
    this.setState({ ambarForm: null, siparisPanel: true });
  }
  // Onaylayan müdür (onay yetkisi olan) isteği operatöre GERİ GÖNDERİR: onay düşer, neden istek satırında görünür
  siparisGeriGonder(id) {
    if (!this.yetkiVar(this.state.session, 'stokSiparisOnay')) return this.duyur('Onaylı isteği yalnızca onay yetkilisi (müdür) geri gönderir.', 5000, 'kotu');
    const x = (this.state.siparis || []).find(y => y.id === id);
    if (!x) return;
    const neden = (window.prompt('Geri gönderme nedeni — operatör neyi düzeltmeli?') || '').trim();
    if (!neden) return;
    const ben = (this.state.session && this.state.session.name) || '';
    this.denetimYaz('ambar', 'Malzeme isteği geri gönderildi', x.malzeme + ' × ' + x.adet + ' · ' + neden, ben);
    this.siparisYaz((this.state.siparis || []).map(y => y.id === id ? { ...y, durum: 'istek', onaylayan: '', onayDamga: '', geriNot: neden + ' · ' + ben + ' · ' + this.damga() } : y), x.malzeme + ' isteği operatöre geri gönderildi.');
  }
  // Onayla ya da reddet: isteği iptal eder (neden denetim izine yazılır)
  siparisIptal(id) {
    if (!this.yetkiVar(this.state.session, 'stokSiparisOnay')) return this.duyur('İsteği yalnızca onay yetkilisi (müdür) iptal eder.', 5000, 'kotu');
    const x = (this.state.siparis || []).find(y => y.id === id);
    if (!x) return;
    const neden = (window.prompt('İptal / ret nedeni') || '').trim();
    if (!neden) return;
    const ben = (this.state.session && this.state.session.name) || '';
    this.denetimYaz('ambar', x.durum === 'onayli' ? 'Onaylı malzeme isteği iptal edildi' : 'Malzeme isteği reddedildi', x.malzeme + ' × ' + x.adet + (x.ekip ? ' → ' + x.ekip : '') + ' · ' + neden, ben);
    this.siparisYaz((this.state.siparis || []).filter(y => y.id !== id), x.malzeme + (x.durum === 'onayli' ? ' isteği iptal edildi.' : ' isteği reddedildi.'));
  }
  // Müdür (ya da onay yetkisi olan) alım isteğini onaylar
  siparisOnayla(id) {
    if (!this.yetkiVar(this.state.session, 'stokSiparisOnay')) return this.duyur('Malzeme alım isteğini yalnızca müdür onaylar.', 5000, 'kotu');
    const ben = (this.state.session && this.state.session.name) || '';
    const x = (this.state.siparis || []).find(y => y.id === id);
    if (!x) return;
    this.siparisYaz((this.state.siparis || []).map(y => y.id === id ? { ...y, durum: 'onayli', onaylayan: ben, onayDamga: this.damga(), geriNot: '' } : y), x.malzeme + (x.tur === 'zimmet' ? ' çıkış isteği onaylandı.' : ' alım isteği onaylandı.'));
  }
  siparisMetin() {
    // yalnız onaylı kalemler siparişe çıkar
    const liste = (this.state.siparis || []).filter(x => x.durum === 'onayli' && x.tur !== 'zimmet');
    return 'Malzeme sipariş listesi — ' + this.damga() + '\n'
      + liste.map((x, i) => {
        const k = this.katalogBul(x.malzeme);
        return (i + 1) + '. ' + (k ? k.kod + ' ' : '') + x.malzeme + ' — ' + x.adet + ' ' + x.birim;
      }).join('\n');
  }
  siparisKopyala() {
    if (!(this.state.siparis || []).some(x => x.durum === 'onayli' && x.tur !== 'zimmet')) return this.duyur('Onaylı kalem yok — önce müdürün alım isteklerini onaylaması gerekir.', 6000, 'kotu');
    const t = this.siparisMetin();
    const bitti = () => this.duyur('Sipariş listesi panoya kopyalandı — e-posta ya da yazışmaya yapıştırabilirsiniz.', 5000, 'iyi');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(bitti, () => this.duyur('Kopyalanamadı — tarayıcı izin vermedi.', 5000, 'kotu'));
    } catch (e) { /* aşağıda bildirilir */ }
    this.duyur('Kopyalanamadı — tarayıcı izin vermedi.', 5000, 'kotu');
  }