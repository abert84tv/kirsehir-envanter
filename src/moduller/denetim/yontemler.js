  kvkkYaz(yama) {
    const y = { ...(this.state.kvkk || {}), ...yama };
    try { localStorage.setItem('ks-kvkk', JSON.stringify(y)); } catch (e) { /* depolama kapalı */ }
    this.setState({ kvkk: y });
  }
  kvkkSaklama(k, gun) {
    const y = { ...(this.state.kvkk || {}) };
    y.saklama = { ...(y.saklama || {}), [k]: gun };
    const ad = (SAKLAMA_TANIM.find(s => s.k === k) || {}).ad || k;
    const sec = SAKLAMA_SECENEK.find(s => s.gun === gun);
    this.denetimYaz('ayar', 'Saklama süresi değişti', ad + ' → ' + (sec ? sec.ad : gun + ' gün'), 'KVKK');
    try { localStorage.setItem('ks-kvkk', JSON.stringify(y)); } catch (e) { /* depolama kapalı */ }
    this.setState({ kvkk: y }, () => this.duyur(ad + ' saklama süresi ' + (sec ? sec.ad : gun + ' gün')
      + ' olarak ayarlandı. Süresi dolan kayıtlar Ayarlar > KVKK bölümünden temizlenir.', 6500, 'iyi',
      () => this.setState({ tab: 'ayarlar', ayarBolum: 'ekip' })));
  }
  // Süresi dolmuş kişisel veriyi arar. Sonuç yalnızca sayıdır; silme ayrı adım.
  kvkkTarama() {
    const K = this.state.kvkk || {};
    const S = K.saklama || {};
    const gecti = (damga, gun) => {
      if (!gun) return false;
      const g = this.gunGecti(damga);
      return g != null && g > gun;
    };
    const talepler = (this.state.talepler || []).filter(t =>
      (t.ad || t.tel) && gecti(t.acilis, S.talep));
    const sesler = [];
    for (const id in (this.state.sesler || {}))
      for (const s of (this.state.sesler[id] || []))
        if (gecti(s.tarih || s.damga, S.ses)) sesler.push(s);
    const denetim = (this.state.denetim || []).filter(d => gecti(d.t, S.denetim));
    return { talepler, sesler, denetim };
  }
  // Talep kayıtlarındaki ad ve telefonu siler; talebin kendisi kalır
  kvkkTalepAnonim(hepsi) {
    const t = this.kvkkTarama().talepler;
    const hedef = hepsi ? (this.state.talepler || []).filter(x => x.ad || x.tel) : t;
    if (!hedef.length) return this.duyur('Silinecek kişisel veri bulunamadı.', 4500);
    if (!window.confirm(hedef.length + ' talep kaydındaki ad ve telefon kalıcı olarak silinecek.\n\n'
      + 'Talep, konu, köy ve sonuç bilgisi kalır — istatistik bozulmaz. Geri alınamaz.\n\nOnaylıyor musunuz?')) return;
    const idler = new Set(hedef.map(x => x.id));
    const liste = (this.state.talepler || []).map(x => idler.has(x.id)
      ? { ...x, ad: 'Kişi bilgisi silindi', tel: '', kvkkSilme: this.damga() }
      : x);
    this.denetimYaz('veri', 'KVKK — kişisel veri silindi',
      hedef.length + ' talep kaydında ad ve telefon anonimleştirildi', 'KVKK');
    this.talepYaz(liste, hedef.length + ' talep kaydındaki kişisel veri silindi. Talepler listede kalıyor.');
  }
  // Aydınlatma metni: kurumun bilgileriyle ve gerçek saklama süreleriyle üretilir
  kvkkMetin() {
    const K = this.state.kvkk || {};
    const sure = k => {
      const g = (K.saklama || {})[k];
      if (!g) return 'süresiz';
      const s = SAKLAMA_SECENEK.find(x => x.gun === g);
      return s ? s.ad : g + ' gün';
    };
    return [
      K.kurum + ' — Kişisel Verilerin Korunması Aydınlatma Metni',
      '',
      'Veri sorumlusu: ' + K.kurum,
      K.adres ? 'Adres: ' + K.adres : '',
      K.irtibat ? 'İrtibat: ' + K.irtibat : '',
      '',
      'Hangi veriler işleniyor',
      '· Talep sahibinin adı ve telefon numarası — başvurunun kaydı ve geri dönüş için.',
      '· Saha fotoğrafları — yapılan işin ve tesis durumunun kanıtı için. Kişi görüntüsü',
      '  içermemesi esastır; içeriyorsa ilgili kişinin talebiyle silinir.',
      '· Sesli saha notları — teknik personelin kayıt sırasında bıraktığı notlar.',
      '· Kayıt konumu ve kaydı giren personel bilgisi — işlemin doğrulanması için.',
      '',
      'Neden işleniyor',
      'İçme suyu ve elektrik tesislerinin işletilmesi, arıza ve bakım işlerinin yürütülmesi,',
      'gelen talep ve şikâyetlerin karşılanması ve kamu kaynaklarının denetlenebilmesi için.',
      'Hukuki dayanak: KVKK 5/2-a (kanunlarda öngörülme), 5/2-ç (hukuki yükümlülük) ve',
      '5/2-e (kamu görevinin yerine getirilmesi).',
      '',
      'Ne kadar süre saklanıyor',
      '· Talep sahibinin adı ve telefonu: ' + sure('talep'),
      '· Fotoğraflar: ' + sure('foto'),
      '· Sesli notlar: ' + sure('ses'),
      '· Konum ve personel kaydı: ' + sure('konum'),
      '· İşlem kaydı (denetim izi): ' + sure('denetim'),
      'Süre sonunda kişisel veriler silinir; talebin konusu ve sonucu istatistik için',
      'kişiye bağlanamayacak biçimde kalır.',
      '',
      'Kimlere aktarılıyor',
      'Kurum dışına aktarılmaz. Arıza bildirimi için ekip telefonuna gönderilen mesajda',
      'talep sahibinin bilgisi yer almaz. Yargı ve denetim organlarının kanuni talebi',
      'saklıdır.',
      '',
      'Haklarınız',
      'KVKK 11. madde uyarınca hangi verilerinizin işlendiğini öğrenme, düzeltilmesini',
      've silinmesini isteme hakkınız var. Başvurunuzu ' + (K.irtibat || 'kuruma')
        + ' iletebilirsiniz; en geç otuz gün içinde cevaplanır.'
    ].filter(x => x !== null).join('\n');
  }
  // Çöp kutusunu topluca kalıcı siler — her öğe için ayrı onay sormadan
  async copBosalt(liste) {
    const M = this._sb;
    if (!M) return;
    let n = 0, hata = '';
    this.duyur(liste.length + ' öğe kalıcı siliniyor…', 4000);
    for (const r of liste) {
      const f = r.tur === 'foto' ? M.fotoKaliciSil : M.tesisKaliciSil;
      if (!f) { hata = 'cop-kutusu.sql çalıştırılmamış.'; break; }
      let x;
      try { x = await f(r.dbId); } catch (e) { x = { ok: false, err: 'Bağlantı kesildi.' }; }
      if (x && x.ok) n++; else if (!hata) hata = (x && x.err) || 'Silinemedi.';
    }
    await this.copYenile();
    this.duyur(n + ' öğe kalıcı silindi — veritabanında izi kalmadı.'
      + (hata ? ' Bir kısmı silinemedi: ' + hata : ''), 8000, hata ? 'kotu' : 'iyi');
  }
  // Sistem geneli denetim izi. iz() kayda bağlı geçmişi, bu ise
  // programın tamamını yazar — kayıt dışı işlemler de buraya düşer.
  denetimYaz(sinif, ne, detay, kapsam) {
    const me = this.state.session;
    const d = new Date();
    const kayit = {
      id: 'dz' + d.getTime() + Math.random().toString(36).slice(2, 6),
      iso: d.toISOString(), t: this.damga(), sinif, ne,
      detay: String(detay == null ? '' : detay).slice(0, 300),
      kapsam: kapsam || '',
      kim: me ? me.name : 'Oturum yok',
      rol: me ? (me.role || '') : '',
      nereden: this.state.device === 'phone' ? 'Telefon' : 'Bilgisayar',
      cevrimdisi: !!this.state.offline
    };
    this.setState(st => {
      const liste = [kayit, ...(st.denetim || [])].slice(0, DENETIM_SINIR);
      try { localStorage.setItem('ks-denetim', JSON.stringify(liste)); } catch (e) { /* depolama kapalı */ }
      return { denetim: liste };
    });
    // Sunucuya da yazılır; başarısızsa satır cihazda kalır ve kuyrukla gider
    const M = this._sb;
    if (M && this.state.sunucu && !this.state.offline) {
      M.denetimEkle(kayit).then(r => {
        if (!r || !r.ok) this.setState(st => ({
          denetim: (st.denetim || []).map(x => x.id === kayit.id ? { ...x, cevrimdisi: true } : x)
        }));
      }).catch(() => { /* çevrimdışı — kuyrukla gider */ });
    }
    return kayit;
  }
  iz(assetId, ne, detay) {
    const me = this.state.session;
    const kayit = {
      t: this.damga(), ne, detay: detay || '',
      kim: me ? me.name : 'Bilinmeyen',
      nereden: this.state.device === 'phone' ? 'Telefon' : 'Bilgisayar',
      cevrimdisi: this.state.offline
    };
    this.setState(st => ({ log: { ...st.log, [assetId]: [kayit, ...(st.log[assetId] || [])] } }));
    const a = (this.state.assets || []).find(x => x.id === assetId);
    this.denetimYaz('kayit', ne, detay, a ? a.code : assetId);
    return kayit;
  }
  // Çöp kutusu sunucudan gelir: silinen kayıt ve fotoğraf orada durur.
  // Her yenilemede süresi geçenler (30 gün) kalıcı silinir.
  async copYenile() {
    const M = this._sb;
    if (!M || !M.tokenOku()) return;
    try {
      if (M.copTemizle) {
        const t = await M.copTemizle();
        if (t && t.ok && t.data && (t.data.tesis || t.data.foto)) {
          this.duyur(`Çöp kutusunda 30 günü dolan ${t.data.tesis} kayıt ve ${t.data.foto} fotoğraf kalıcı silindi.`, 6000, 'bilgi',
            () => this.setState({ tab: 'cop' }));
        }
      }
      const [k, f] = await Promise.all([
        M.copListesi ? M.copListesi() : { ok: false },
        M.fotoCopListesi ? M.fotoCopListesi() : { ok: false }
      ]);
      const out = [];
      if (k && k.ok) for (const r of (k.data || [])) out.push({
        tur: 'tesis', dbId: r.id, kod: r.kod, tip: r.tur, ilce: r.ilce, koy: r.koy,
        silindi: r.silindi, silen: r.silen, kalan: r.kalan_gun, yazilabilir: r.yazilabilir !== false
      });
      if (f && f.ok) for (const r of (f.data || [])) out.push({
        tur: 'foto', ek: r.tur || 'foto', dbId: r.id, kod: r.kod || '—', ilce: r.ilce, koy: r.koy, adres: r.adres,
        boyut: r.boyut, silindi: r.silindi, silen: r.silen, kalan: r.kalan_gun,
        yazilabilir: r.yazilabilir !== false
      });
      out.sort((a, b) => String(b.silindi || '').localeCompare(String(a.silindi || '')));
      this.setState({ cop: out });
    } catch (e) { /* çöp kutusu okunamadı — SQL henüz çalıştırılmamış olabilir */ }
  }