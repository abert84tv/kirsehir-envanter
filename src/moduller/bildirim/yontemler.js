  smsAyarYaz(yama) {
    const y = { ...(this.state.smsAyar || {}), ...yama };
    try { localStorage.setItem('ks-sms', JSON.stringify(y)); } catch (e) { /* depolama kapalı */ }
    this.setState({ smsAyar: y });
  }
  smsKuyrukYaz(liste) {
    try { localStorage.setItem('ks-sms-kuyruk', JSON.stringify(liste.slice(0, 200))); } catch (e) { /* depolama kapalı */ }
    this.setState({ smsKuyruk: liste });
  }
  // Bir arıza için alıcı numaraları: atanan ekip + ekip şefi
  smsAlicilar(ekipAdi) {
    const out = [];
    const e = this.ekipBul(ekipAdi);
    if (e) {
      if ((e.tel || '').trim()) out.push(e.tel.trim());
      if ((e.sefTel || '').trim() && !out.includes(e.sefTel.trim())) out.push(e.sefTel.trim());
      const sefKisi = e.sefId ? this.personelBul(e.sefId) : null;
      // İzinli/raporlu şefe mesaj gitmez
      if (sefKisi && !PERSONEL_YOK.includes(sefKisi.durum)
        && (sefKisi.tel || '').trim() && !out.includes(sefKisi.tel.trim())) out.push(sefKisi.tel.trim());
    }
    const merkez = ((this.state.smsAyar || {}).sefTel || '').trim();
    if (merkez && !out.includes(merkez)) out.push(merkez);
    return out;
  }
  smsMetin(f, a) {
    const yer = a ? this.yer(a) : '';
    return (f.priority || '').toLocaleUpperCase('tr') + ' — ' + (a ? a.code : '') + ', ' + yer
      + ', ' + f.type + '. ' + (f.crew && f.crew !== 'Atanmadı' ? f.crew + ' atandı. ' : '')
      + this.damga();
  }
  // Gönderim: sunucu işlevine gider. Başarısızsa kuyruğa yazılır,
  // bağlantı gelince “Kuyruğu gönder” ile yeniden denenir.
  async smsGonder(g) {
    const ayar = this.state.smsAyar || {};
    if (!ayar.acik) return { ok: false, hata: 'Mesaj gönderimi kapalı — Ayarlar > Bildirim bölümünden açın.' };
    if (!ayar.url) return { ok: false, hata: 'Sunucu adresi girilmedi — Ayarlar > Bildirim bölümüne işlev adresini yazın.' };
    if (!(g.numaralar || []).length) return { ok: false, hata: 'Alıcı numarası yok — Ayarlar > Ekipler bölümünde ekip telefonunu girin.' };
    const M = this._sb;
    const jeton = (M && M.tokenOku && M.tokenOku()) || '';
    if (!jeton) return { ok: false, hata: 'Sunucu oturumu yok — ortak veritabanına giriş yapmadan mesaj gönderilemez.' };
    try {
      const r = await fetch(ayar.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: jeton,
          kanal: g.kanal || this.state.bildirimKanal || 'SMS',
          metin: g.metin, numaralar: g.numaralar,
          kapsam: g.kapsam || '', deneme: !!g.deneme
        })
      });
      const c = await r.json().catch(() => ({}));
      if (r.ok && c.ok !== false) return { ok: true, ...c };
      return { ok: false, hata: c.hata || ('Sunucu ' + r.status + ' döndü.') };
    } catch (e) {
      return { ok: false, hata: 'Sunucuya ulaşılamadı — bağlantı yok ya da adres yanlış.' };
    }
  }
  // Arıza kaydından çağrılır; sonucu bildirim olarak yazar
  async arizaMesaj(f, a) {
    const ayar = this.state.smsAyar || {};
    if (!ayar.acik) return;
    const kanal = this.state.bildirimKanal || 'SMS';
    const numaralar = this.smsAlicilar(f.crew);
    const metin = this.smsMetin(f, a);
    const kapsam = f.no || (a ? a.code : '');
    const r = await this.smsGonder({ kanal, metin, numaralar, kapsam });
    if (r.ok) {
      this.denetimYaz('bildirim', 'Mesaj gönderildi',
        kanal + ' · ' + numaralar.length + ' numara · ' + (r.referans || ''), kapsam);
      this.duyur(kapsam + ' bildirimi ' + kanal + ' ile gönderildi — ' + numaralar.length + ' numara.', 6000, 'iyi');
      return;
    }
    const kuyruk = [{
      id: 'sm' + Date.now(), damga: this.damga(), kanal, metin, numaralar, kapsam, hata: r.hata
    }, ...(this.state.smsKuyruk || [])];
    this.smsKuyrukYaz(kuyruk);
    this.denetimYaz('bildirim', 'Mesaj kuyruğa alındı', kanal + ' · ' + r.hata, kapsam);
    this.duyur(kapsam + ' bildirimi gönderilemedi: ' + r.hata + ' Mesaj kuyrukta bekliyor.', 8000, 'kotu',
      () => this.setState({ tab: 'ayarlar', ayarBolum: 'bildirim' }));
  }
  // İş bitince talep sahibine bildirim: telefon numarası ve KVKK onayı olan, Telegram dışından (telefon/web/yüz yüze) gelen talepte kısa mesaj gider.
  // Telegram'dan gelen başvurana bot mesajı zaten sunucudan gider (basvuru_telegram_durum). Gönderilemezse kuyruğa yazılır.
  async talepSahibiMesaj(t) {
    const ayar = this.state.smsAyar || {};
    if (!t || !ayar.acik || t.kanal === 'telegram' || !(t.tel || '').trim() || !t.kvkkOnay) return;
    const kanal = this.state.bildirimKanal || 'SMS';
    const metin = t.no + ' numaralı talebiniz için ' + (t.koy || 'bölgenizdeki') + ' arıza giderildi. Bilgilendirme mesajıdır. ' + this.damga();
    const numaralar = [t.tel.trim()];
    const r = await this.smsGonder({ kanal, metin, numaralar, kapsam: t.no });
    if (r.ok) {
      this.denetimYaz('bildirim', 'Talep sahibine mesaj gönderildi', kanal + ' · ' + (r.referans || ''), t.no);
      return;
    }
    this.smsKuyrukYaz([{ id: 'sm' + Date.now(), damga: this.damga(), kanal, metin, numaralar, kapsam: t.no, hata: r.hata }, ...(this.state.smsKuyruk || [])]);
    this.denetimYaz('bildirim', 'Talep sahibine mesaj kuyruğa alındı', kanal + ' · ' + r.hata, t.no);
    this.duyur(t.no + ' talep sahibine mesaj gönderilemedi: ' + r.hata + ' Mesaj kuyrukta bekliyor.', 8000, 'kotu',
      () => this.setState({ tab: 'ayarlar', ayarBolum: 'bildirim' }));
  }
  async smsKuyrukGonder() {
    const kuyruk = [...(this.state.smsKuyruk || [])];
    if (!kuyruk.length) return this.duyur('Kuyrukta bekleyen mesaj yok.', 4000);
    this.setState({ smsGonderiyor: true });
    const kalan = [];
    let giden = 0;
    for (const m of kuyruk) {
      const r = await this.smsGonder(m);
      if (r.ok) giden++;
      else kalan.push({ ...m, hata: r.hata });
    }
    this.smsKuyrukYaz(kalan);
    this.setState({ smsGonderiyor: false });
    this.denetimYaz('bildirim', 'Kuyruk gönderildi', giden + ' gitti, ' + kalan.length + ' kaldı', '');
    this.duyur(giden + ' mesaj gönderildi' + (kalan.length ? ', ' + kalan.length + ' hâlâ bekliyor.' : ', kuyruk boşaldı.'),
      6500, kalan.length ? 'kotu' : 'iyi');
  }