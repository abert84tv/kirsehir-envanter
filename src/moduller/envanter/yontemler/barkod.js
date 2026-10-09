  // ── Barkod okut: kamerayla (ya da elle yazarak) barkodu okuyup o kaydın kartını açar
  // Kuyu barkodu (BK-KUY-0043), direk barkodu (BD-0043) ve kayıt kodu (KS-KUY-0043) kabul edilir.
  async barkodAc() {
    this.setState({ barkodTara: { mesaj: 'Kamera açılıyor…', deger: '', kamera: false } });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return this.setState({ barkodTara: { mesaj: 'Bu cihazda kamera erişimi yok — barkodu aşağıya yazın.', deger: '', kamera: false } });
    try {
      this._bkAkis = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (e) {
      return this.setState({ barkodTara: { mesaj: 'Kamera izni verilmedi — barkodu aşağıya yazabilirsiniz.', deger: '', kamera: false } });
    }
    await new Promise(r => setTimeout(r, 120));
    const v = document.getElementById('ks-bk-video');
    if (!this.state.barkodTara || !v) { this.barkodKapat(); return; }
    v.srcObject = this._bkAkis;
    try { await v.play(); } catch (e) { /* kullanıcı etkileşimi gerekebilir */ }
    if (!window.BarcodeDetector) {
      this.setState({ barkodTara: { ...this.state.barkodTara, kamera: true, mesaj: 'Bu tarayıcı barkodu kameradan okuyamıyor — barkodu aşağıya yazın.' } });
      return;
    }
    this.setState({ barkodTara: { ...this.state.barkodTara, kamera: true, mesaj: 'Barkodu çerçevenin içine getirin.' } });
    let det; try { det = new window.BarcodeDetector(); } catch (e) { return; }
    const dongu = async () => {
      if (!this.state.barkodTara || !this._bkAkis) return;
      try {
        const r = await det.detect(v);
        if (r && r.length) {
          const t = String(r[0].rawValue || '').trim();
          if (t && t !== this._bkSon) { this._bkSon = t; setTimeout(() => { this._bkSon = ''; }, 2500); if (this.barkodBul(t)) return; }
        }
      } catch (e) { /* kare okunamadı */ }
      this._bkZaman = setTimeout(dongu, 260);
    };
    dongu();
  }
  barkodKapat() {
    clearTimeout(this._bkZaman);
    if (this._bkAkis) { try { this._bkAkis.getTracks().forEach(t => t.stop()); } catch (e) { /* */ } this._bkAkis = null; }
    this.setState({ barkodTara: null });
  }
  barkodBul(metin) {
    const t = String(metin || '').trim().toUpperCase();
    if (!t) return false;
    const a = (this.state.assets || []).find(x => [x.code, x.barkod, x.direkBarkod].some(k => k && String(k).toUpperCase() === t));
    if (!a) { this.setState({ barkodTara: { ...(this.state.barkodTara || {}), mesaj: '“' + metin + '” ile eşleşen kayıt bulunamadı.', deger: (this.state.barkodTara || {}).deger || '' } }); return false; }
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* */ }
    this.barkodKapat();
    this.flyTo(a.lat, a.lon, 16);
    this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' });
    this.duyur(a.code + ' açıldı.', 3000, 'iyi');
    return true;
  }
