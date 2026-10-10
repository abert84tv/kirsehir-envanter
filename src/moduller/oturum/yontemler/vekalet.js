  // Müdür vekâleti: sunucu işlevi (vekalet_ata) yalnız müdürün çağrısını kabul eder, vekil mühendis ya da müdür olabilir
  async vekaletAta(u, ver) {
    const M = this._sb;
    if (!u || !u.dbId) return this.duyur('Bu hesap sunucuda yok — vekâlet verilemez.', 5000, 'kotu');
    if (!M || !M.vekaletAta || !M.tokenOku() || this.state.offline) return this.duyur('Vekâlet için sunucuya bağlı olmanız gerekir.', 5000, 'kotu');
    const r = await M.vekaletAta(u.dbId, ver);
    if (!(r && r.ok)) return this.duyur((r && r.err) || 'Vekâlet işlenemedi.', 7000, 'kotu');
    this.denetimYaz('yetki', ver ? 'Müdür vekâleti verildi' : 'Müdür vekâleti kaldırıldı', u.name, u.user || '');
    try { await this.yetkiYenile(); } catch (e) { /* liste bir sonraki eşitlemede yenilenir */ }
    this.duyur(u.name + (ver ? ' · müdür vekili oldu: son onay ve malzeme isteği onayı verebilir.' : ' · vekâlet kaldırıldı.'), 7000, 'iyi');
  }
