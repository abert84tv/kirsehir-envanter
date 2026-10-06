  // Muhtar numara defteri — madde 1: talep formunda telefon girilince köy
  // otomatik önerilir. Basit tutuldu: köy/ilçe serbest metin, listeye göre
  // eşleştirme yalnız telefon numarası üzerinden.
  muhtarYaz(liste, mesaj) {
    this.modulYaz('muhtar', liste);
    this.setState({ muhtarlar: liste, muhtarPanel: this.state.muhtarPanel ? { ...this.state.muhtarPanel, form: null } : null }, () => {
      if (mesaj) this.duyur(mesaj, 6000, 'iyi');
    });
  }
  muhtarBul(id) { return (this.state.muhtarlar || []).find(m => m.id === id) || null; }
  muhtarTelNormal(tel) { return String(tel || '').replace(/\D/g, '').slice(-10); }
  muhtarEslesenKoy(tel) {
    const n = this.muhtarTelNormal(tel);
    if (n.length < 10) return null;
    const m = (this.state.muhtarlar || []).find(x => this.muhtarTelNormal(x.tel) === n);
    return m ? { koy: m.koy, ilce: m.ilce, ad: m.ad } : null;
  }
  muhtarKaydet(g) {
    if (!g) return;
    const ad = (g.ad || '').trim(), koy = (g.koy || '').trim(), tel = (g.tel || '').trim();
    if (!ad || !koy) return this.duyur('Muhtar adı ve köy zorunlu.', 4500, 'kotu');
    if (tel && this.muhtarTelNormal(tel).length < 10) return this.duyur('Telefon eksik görünüyor — 10 haneli girin.', 5000, 'kotu');
    const liste = (this.state.muhtarlar || []).map(m => ({ ...m }));
    if (tel) {
      const cakisan = liste.find(m => this.muhtarTelNormal(m.tel) === this.muhtarTelNormal(tel) && m.id !== g.id);
      if (cakisan) return this.duyur(tel + ' numarası ' + cakisan.ad + ' (' + cakisan.koy + ') adına kayıtlı.', 7000, 'kotu');
    }
    const kart = { id: g.id || 'mh' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ad, koy, ilce: (g.ilce || '').trim(), tel };
    const i = liste.findIndex(m => m.id === kart.id);
    if (i < 0) liste.push(kart); else liste[i] = kart;
    this.denetimYaz('ayar', i < 0 ? 'Muhtar eklendi' : 'Muhtar güncellendi', koy + (tel ? ' · ' + tel : ''), ad);
    this.muhtarYaz(liste, ad + (i < 0 ? ' eklendi' : ' güncellendi') + '.');
  }
  muhtarSil(id) {
    const m = this.muhtarBul(id);
    if (!m) return;
    if (!window.confirm(m.ad + ' (' + m.koy + ') defterden silinecek. Onaylıyor musunuz?')) return;
    this.denetimYaz('veri', 'Muhtar silindi', m.koy, m.ad);
    this.muhtarYaz((this.state.muhtarlar || []).filter(x => x.id !== id), m.ad + ' silindi.');
  }