  // ── Ayarlar > Entegrasyon: dış servis anahtarları sunucuda saklanır
  entegrasyonGuncelle(y) { this.setState(st => ({ entegrasyon: { ...st.entegrasyon, ...y } })); }
  async entegrasyonYenile() {
    const M = this._sb;
    if (!M || !M.entegrasyonListesi || !M.tokenOku() || this.state.offline) return;
    this.konumCihazlariYenile();
    const r = await M.entegrasyonListesi();
    this.entegrasyonGuncelle(r.ok
      ? { yuk: true, hata: '', liste: (r.data || []).map(x => ({ ad: x.ad, son4: x.son4, zaman: x.guncelleme, kim: x.guncelleyen })) }
      : { yuk: true, hata: r.err || 'Okunamadı.' });
  }
  async entegrasyonKaydet(ad, deger) {
    // Telegram anahtarı silinirken önce bot bağlantısı (webhook) kesilir: bot artık mesaj iletmez
    if (!deger && ad === 'telegram_bot_anahtari' && this._sb.telegramKaldir) await this._sb.telegramKaldir();
    const r = await this._sb.entegrasyonKaydet(ad, deger);
    if (!r.ok) return this.duyur(r.err || 'Kaydedilemedi.', 7000, 'kotu');
    this.denetimYaz('ayar', deger ? 'Entegrasyon anahtarı kaydedildi' : 'Entegrasyon anahtarı silindi', ad, '');
    this.entegrasyonGuncelle({ girisler: { ...(this.state.entegrasyon.girisler || {}), [ad]: '' }, sonuclar: { ...(this.state.entegrasyon.sonuclar || {}), [ad]: '' } });
    this.duyur(deger ? 'Anahtar sunucuya kaydedildi.' : 'Anahtar silindi.', 5000, 'iyi');
    this.entegrasyonYenile();
  }
  async entegrasyonDene(ad) {
    const yaz = m => this.entegrasyonGuncelle({ sonuclar: { ...(this.state.entegrasyon.sonuclar || {}), [ad]: m } });
    yaz('Deneniyor…');
    if (ad === 'arvento_kullanici' || ad === 'arvento_sifre' || ad === 'konum_yazma_anahtari') {
      return yaz('Bu anahtar kaydedildi. Araç takip verisi gelmeye başlayınca ekip konumları haritada ve ekip seçiminde görünür; “Ekip konumu — cihazlar” bölümünde her cihazın son konumu yazılır.');
    }
    if (ad === 'telegram_bot_anahtari') {
      const r = await this._sb.telegramKur();
      return yaz(r && r.ok ? 'Bot bağlandı ✔ — Telegram’da @' + (r.kullanici || 'bot') + ' botuna yazan herkesin mesajı Gelen > Web başvuruları’na düşer.' : 'Bağlanamadı: ' + ((r && r.err) || 'bilinmeyen hata'));
    }
    const r = await this._sb.aiSiniflandir('Köyün üst mahallesinde boru patlamış, sokakta su akıyor, iki gündür çeşmeden su gelmiyor.');
    yaz(r && r.ok
      ? 'Çalışıyor ✔ — grup: ' + (r.data.grup || '—') + ' · tür: ' + (r.data.tur || '—') + ' · aciliyet: ' + (r.data.oncelik || '—')
      : 'Yanıt alınamadı: ' + ((r && r.err) || 'bilinmeyen hata'));
  }