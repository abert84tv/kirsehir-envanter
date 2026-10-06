  // ── fotoğraf: dosya seçici gizli bir input; kamera ve galeri aynı düğmeden
  fotoSec(kamera) {
    const sel = this.state.assets.find(a => a.id === this.state.selected);
    if (!sel) return;
    if (!this.yazabilir(sel)) return this.kilitUyar(sel);
    if (!this._sb || !this._sb.tokenOku()) {
      this.say('Fotoğraf yüklemek için bir kez giriş yapmış olmanız gerekiyor.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    // Telefonda kamera açılırken tarayıcı sayfayı bellekten atabiliyor: dönüşte program
    // yeniden yükleniyor ve seçim kayboluyordu. Niyeti cihaza yazıyoruz — yeniden
    // yüklenirse fotoNiyetGeriYukle() aynı kaydın Foto sekmesini açar.
    try {
      localStorage.setItem(FOTO_NIYET, JSON.stringify({ id: sel.id, kod: sel.code, t: Date.now() }));
    } catch (e) { /* depolama kapalı */ }
    // Seçici her seferinde yeniden kurulmaz; aynı eleman kalır — bellek baskısı azalır
    let inp = this._fotoInput;
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.style.position = 'fixed';
      inp.style.left = '-9999px';
      inp.style.opacity = '0';
      document.body.appendChild(inp);
      this._fotoInput = inp;
    }
    inp.value = '';
    inp.accept = 'image/*';
    inp.multiple = !kamera;
    if (kamera) inp.setAttribute('capture', 'environment');   // telefonda arka kamerayı açar
    else inp.removeAttribute('capture');
    inp.onchange = () => {
      const list = [...(inp.files || [])];
      try { localStorage.removeItem(FOTO_NIYET); } catch (e) { /* yok */ }
      inp.value = '';
      if (list.length) this.fotoGonder(sel, list);
    };
    inp.click();
  }
  // İnternet yoksa (ya da kayıt henüz sunucuda değilse) fotoğraf telefonun deposunda bekler
  async fotoBeklet(sel, dosyalar) {
    const kalici = await this.medyaBirak('tesis', sel.id, sel.code, { photos: dosyalar.map(file => ({ file, kb: Math.round(file.size / 1024) })) });
    this.duyur(kalici
      ? dosyalar.length + ' fotoğraf telefonda — internet gelince ' + sel.code + ' kaydına yüklenecek.'
      : 'Fotoğraf telefonda saklanamadı — internet olan yerde yeniden çekin.', 6000, kalici ? 'bilgi' : 'kotu');
  }
  async fotoGonder(sel, list) {
    const M = this._sb;
    if (this.state.offline || !sel.dbId) return this.fotoBeklet(sel, list);
    this.setState({ fotoYuk: { toplam: list.length, biten: 0, kod: sel.code } });
    let ok = 0, kb = 0, hata = '';
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const r = await M.fotoYukle(f, sel.dbId, sel.code);
      if (r.ok) { ok++; kb += Math.round((r.data.boyut || 0) / 1024); }
      else if (r.cevrimdisi) { this.setState({ fotoYuk: null }); await this.fotoBeklet(sel, list.slice(i)); break; }
      else if (!hata) hata = r.err;
      this.setState({ fotoYuk: { toplam: list.length, biten: ok, kod: sel.code } });
    }
    this.setState({ fotoYuk: null });
    await this.fotoYenile(sel.dbId);
    this.veriYenile(true);
    if (!ok && !hata) return;
    if (!ok) {
      this.say(hata || 'Fotoğraf yüklenemedi.', true);
      setTimeout(() => this.setState({ toast: null }), 9000);
      return;
    }
    this.duyur(`${ok} fotoğraf ${sel.code} kaydına yüklendi · ${kb} KB.${hata ? ' ' + (list.length - ok) + ' tanesi yüklenemedi: ' + hata : ''}`, 6000, 'iyi');
  }
  async fotoYenile(dbId) {
    const M = this._sb;
    if (!M || !M.tokenOku() || !dbId) return;
    const [f, sn] = await Promise.all([M.fotoListesi(dbId), M.sesListesi(dbId)]);
    this.setState(st => ({
      fotolar: f.ok ? { ...st.fotolar, [dbId]: f.data } : st.fotolar,
      kayitliSesler: sn.ok ? { ...st.kayitliSesler, [dbId]: sn.data } : st.kayitliSesler
    }));
  }
  fotoKaldir(f, sel) {
    if (!this.yazabilir(sel)) return this.kilitUyar(sel);
    this._sb.fotoSil(f.id).then(r => {
      if (!r.ok) return this.say(r.err, true);
      this.fotoYenile(sel.dbId);
      this.veriYenile(true);
      this.duyur('Fotoğraf çöp kutusuna taşındı — 30 gün içinde geri getirilebilir. Ayarlar > Çöp kutusu.', 6000);
    });
  }
  // Kamera açılırken telefon programı bellekten atarsa kullanıcı bıraktığı yere döner
  fotoNiyetGeriYukle() {
    if (this._niyetIsledi) return;
    let n = null;
    try { n = JSON.parse(localStorage.getItem(FOTO_NIYET) || 'null'); } catch (e) { /* yok */ }
    if (!n) return;
    try { localStorage.removeItem(FOTO_NIYET); } catch (e) { /* depolama kapalı */ }
    if (!n.t || Date.now() - n.t > 600000) return;
    const a = this.state.assets.find(x => x.id === n.id) || this.state.assets.find(x => x.code === n.kod);
    if (!a) return;
    this._niyetIsledi = true;
    this.setState({ selected: a.id, panel: 'detay', detailTab: 'medya', tab: 'harita' });
    if (a.dbId) this.fotoYenile(a.dbId);
    this.duyur(a.code + ' yeniden açıldı. Telefon, kamera açıkken programı bellekten attığı için çekilen kare programa ulaşmadı — “Galeriden seç” ile telefonun galerisinden ekleyin.', 14000);
  }
  cm = z => Number(z) * 3;