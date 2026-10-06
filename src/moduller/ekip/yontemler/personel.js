  // ── Personel havuzu ──────────────────────────────────────────
  personelYaz(liste, mesaj) {
    this.modulYaz('personel', liste);
    this.setState({ personel: liste, personelForm: null }, () => {
      if (mesaj) this.duyur(mesaj, 6000, 'iyi', () => this.setState({ tab: 'ayarlar', ayarBolum: 'ekip' }));
    });
  }
  personelBul(id) { return (this.state.personel || []).find(p => p.id === id) || null; }
  personelKaydet(g) {
    if (!g) return;
    const ad = (g.ad || '').trim();
    if (!ad) return this.duyur('Ad soyad girin.', 4500, 'kotu');
    const liste = (this.state.personel || []).map(p => ({ ...p }));
    const ayni = liste.find(p => p.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr') && p.id !== g.id);
    if (ayni) return this.duyur(ad + ' havuzda zaten var. Aynı adda ikinci kişi varsa ayırt edici bir şey ekleyin.', 7000, 'kotu');
    const kart = {
      id: g.id || 'ps' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ad, meslek: meslekEsle(g.meslek), tel: (g.tel || '').trim(), not: (g.not || '').trim(),
      durum: PERSONEL_DURUM[g.durum] ? g.durum : 'aktif',
      donus: g.donus || '',
      kullanici: (g.kullanici || '').trim(),
      araclar: Array.isArray(g.araclar) ? g.araclar.filter(k => ARAC_TUR[k]) : [],
      gunler: Array.isArray(g.gunler) ? g.gunler : []
    };
    // Bir kullanıcı hesabı yalnız tek kişiye bağlanabilir
    if (kart.kullanici) {
      const cakisan = liste.find(p => p.kullanici === kart.kullanici && p.id !== kart.id);
      if (cakisan) return this.duyur(kart.kullanici + ' hesabı ' + cakisan.ad
        + ' kişisine bağlı. Önce oradan kaldırın.', 8000, 'kotu');
    }
    const i = liste.findIndex(p => p.id === kart.id);
    if (i < 0) liste.push(kart); else liste[i] = kart;
    this.denetimYaz('ayar', i < 0 ? 'Personel eklendi' : 'Personel güncellendi',
      kart.meslek + (kart.tel ? ' · ' + kart.tel : ''), ad);
    this.personelYaz(liste, ad + (i < 0 ? ' havuza eklendi' : ' güncellendi') + ' · ' + kart.meslek + '.');
  }
  personelSil(id) {
    const p = this.personelBul(id);
    if (!p) return;
    const ekipler = (this.state.ekipler || []).filter(e => (e.uyeIdler || []).includes(id) || e.sefId === id);
    if (ekipler.length) {
      return this.duyur(p.ad + ' silinemez — ' + ekipler.map(e => e.ad).join(', ')
        + ' ekibinde görünüyor. Önce ekipten çıkarın.', 8000, 'kotu');
    }
    if (!window.confirm(p.ad + ' havuzdan silinecek. Onaylıyor musunuz?')) return;
    this.denetimYaz('veri', 'Personel silindi', p.meslek, p.ad);
    this.personelYaz((this.state.personel || []).filter(x => x.id !== id), p.ad + ' havuzdan silindi.');
  }
  // Günlük izin/mesai kaydı — personelForm açıkken alt bölümde eklenir/silinir,
  // panel kapanmaz (Faz 2, madde 6). Kayıt personel kartının kendi içinde tutulur.
  personelGunEkle() {
    const pf = this.state.personelForm;
    if (!pf || !pf.id) return;
    const t = this.state.personelGunTaslak || {};
    if (!t.tarih) return this.duyur('Tarih seçin.', 4000, 'kotu');
    if (!GUN_TUR_PERSONEL[t.tur]) return this.duyur('Kayıt türü seçin.', 4000, 'kotu');
    const kayit = { id: 'gn' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      tarih: t.tarih, tur: t.tur, saat: (t.saat || '').trim(), not: (t.not || '').trim() };
    const liste = (this.state.personel || []).map(p => p.id !== pf.id ? p
      : { ...p, gunler: [kayit, ...(p.gunler || [])].sort((a, b) => b.tarih.localeCompare(a.tarih)) });
    const guncel = liste.find(p => p.id === pf.id);
    this.modulYaz('personel', liste);
    this.denetimYaz('veri', 'Personel gün kaydı eklendi', GUN_TUR_PERSONEL[t.tur] + ' · ' + t.tarih, pf.ad);
    this.setState({ personel: liste, personelForm: { ...pf, gunler: guncel.gunler },
      personelGunTaslak: { tarih: '', tur: 'izin', saat: '', not: '' } });
  }
  personelGunSil(gunId) {
    const pf = this.state.personelForm;
    if (!pf || !pf.id) return;
    const liste = (this.state.personel || []).map(p => p.id !== pf.id ? p
      : { ...p, gunler: (p.gunler || []).filter(g => g.id !== gunId) });
    const guncel = liste.find(p => p.id === pf.id);
    this.modulYaz('personel', liste);
    this.setState({ personel: liste, personelForm: { ...pf, gunler: guncel.gunler } });
  }