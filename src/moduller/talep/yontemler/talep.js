  talepYaz(liste, mesaj, git) {
    this.modulYaz('talep', liste.slice(0, 1000));
    this.setState({ talepler: liste, talepForm: null },
      () => { this.basvuruEsitle(); if (mesaj) this.duyur(mesaj, 6500, 'iyi', git || (() => this.setState({ tab: 'talep' }))); });
  }
  talepNo() {
    const y = new Date().getFullYear();
    const n = (this.state.talepler || []).filter(t => String(t.no || '').includes('-' + y + '-')).length + 1;
    // Çevrimdışı geçici numara: cihaz eki numarayı benzersiz kılar, eşitlenince
    // sunucudan kesin numara alınır. talepNoAl() bu işi yapar.
    return 'TLP-' + y + '-' + String(n).padStart(3, '0');
  }
  // Numarayı sunucudan alır. Bağlantı yoksa geçici numara verir ve kaydı
  // işaretler — iki cihaz aynı numarayı üretemesin.
  async talepNoAl() {
    const M = this._sb;
    if (M && this.state.sunucu && !this.state.offline) {
      const r = await M.numaraAl('talep');
      if (r && r.ok && typeof r.data === 'string') return { no: r.data, gecici: false };
    }
    const cihaz = this.cihazEki();
    return { no: this.talepNo().replace(/^TLP-(\d+)-/, 'TLP-$1-G' + cihaz + '-'), gecici: true };
  }
  // Bu cihaza özgü kalıcı üç harf. Çevrimdışı verilen geçici numaraların
  // farklı cihazlarda çakışmamasını sağlar.
  cihazEki() {
    let v = null;
    try { v = localStorage.getItem('ks-cihaz-eki'); } catch (e) { /* depolama kapalı */ }
    if (!v) {
      v = Math.random().toString(36).slice(2, 5).toUpperCase();
      try { localStorage.setItem('ks-cihaz-eki', v); } catch (e) { /* depolama kapalı */ }
    }
    return v;
  }
  // Geçici numaralı talepler eşitlenince kesin numarayı alır
  async talepNoDuzelt() {
    const M = this._sb;
    if (!M || !this.state.sunucu || this.state.offline) return;
    const gecici = (this.state.talepler || []).filter(t => t.noGecici);
    if (!gecici.length) return;
    const r = await M.numaraToplu('talep', gecici.length);
    if (!(r && r.ok && Array.isArray(r.data) && r.data.length === gecici.length)) return;
    const esle = new Map(gecici.map((t, i) => [t.id, r.data[i]]));
    const liste = (this.state.talepler || []).map(t => esle.has(t.id)
      ? { ...t, no: esle.get(t.id), noGecici: false, noEski: t.no } : t);
    this.denetimYaz('veri', 'Geçici talep numaraları kesinleşti',
      gecici.length + ' talep sunucudan kesin numara aldı', 'Talep');
    this.modulYaz('talep', liste.slice(0, 1000));
    this.setState({ talepler: liste });
    this.duyur(gecici.length + ' talebin geçici numarası kesin numaraya çevrildi.', 7000, 'iyi');
  }
  // Yeni talepte numara sunucudan alınır; alma işi beklediği için kayıt
  // iki adıma bölünür. Var olan talebin numarası değişmez.
  // Gelen talep metninden ön sınıflandırma (kurala dayalı, çevrimdışı çalışır):
  // iş grubu, arıza türü, aciliyet ve metinde geçen köy. Yapay zekâ
  // sınıflandırması kurulunca onun sonucu tercih edilir (talepAiSiniflandir).
  talepSiniflandir(metin, ipucu) {
    // Türkçe harfler sadeleşir, boşluklar korunur (sadeMetin boşluğu da siler)
    const katla = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/[^a-z0-9]+/g, ' ');
    const T = ' ' + katla(metin) + ' ';
    const ham = ' ' + String(metin || '').toLocaleLowerCase('tr') + ' ';
    const var_ = re => re.test(T);
    const gerekce = [];
    // Kökler ekleriyle de eşleşir (kuyu-nun, pompa-sı, boru-su); kısa ve
    // başka kelimenin başı olabilecekler (faz, ges, don) tam kelime aranır
    const GRUP_KURAL = [
      ['kanal', /\b(kanalizasyon\w*|rogar\w*|foseptik\w*|lagim\w*|pis su|atik su|gider\w*)/],
      ['ges', /\b(ges\b|gunes panel\w*|gunes enerji\w*|inverter\w*|invertor\w*)/],
      ['elektrik', /\b(elektrik\w*|sigorta\w*|pano\w*|trafo\w*|faz\b|kontaktor\w*|termik\w*|cereyan\w*)/],
      ['depo', /\b(depo\w*|hazne\w*|klor\w*)/],
      ['kuyu', /\b(kuyu\w*|pompa\w*|dalgic\w*|motor\w*|sondaj\w*|debi\w*)/],
      ['su', /\b(boru\w*|patla\w*|kacak\w*|kacag\w*|sizinti\w*|siziyor|vana\w*|sayac\w*|su yok|susuz\w*|su gelmiyor|basinc\w*|tazyik\w*|bulanik\w*|camur\w*|cesme\w*|hidrant\w*|dondu|donma\w*)/]
    ];
    let grup = null;
    for (const [g, re] of GRUP_KURAL) { const m = T.match(re); if (m) { grup = g; gerekce.push('“' + m[1] + '” → ' + ARIZA_GRUP[g].ad); break; } }
    if (!grup && /su\b/.test(T)) { grup = 'su'; gerekce.push('“su” → ' + ARIZA_GRUP.su.ad); }
    const TUR_KURAL = {
      su: [[/patla/, 'Boru patlağı'], [/(kacak|kacag|sizinti|siziyor|akiyor)/, 'Boru kaçağı / sızıntı'], [/(su yok|susuz|gelmiyor|kesik|kesinti|akmiyor)/, 'Su yok / kesinti'],
        [/(basinc|tazyik|az geliyor|zayif|ince akiyor)/, 'Basınç düşüklüğü'], [/vana/, 'Vana arızası'], [/sayac/, 'Sayaç arızası'],
        [/(bulanik|camur|kirli|renkli|kokulu su)/, 'Bulanık / kirli su'], [/(cesme|hidrant)/, 'Çeşme / hidrant arızası'], [/(dondu|donma|buz)/, 'Donma']],
      kuyu: [[/(yandi|yanik)/, 'Motor yandı'], [/(calismiyor|durdu|calismaz|bozuldu)/, 'Pompa çalışmıyor'], [/(debi|az su|su azaldi)/, 'Debi düşüklüğü'],
        [/(atiyor|akim)/, 'Motor aşırı akım'], [/(kum|camur)/, 'Kuyu kumlanması'], [/(kacak|sizinti)/, 'Kuyu başı kaçağı']],
      depo: [[/(tasiyor|tasma|tasti)/, 'Taşma'], [/(catlak|kacak|sizinti)/, 'Depo kaçağı / çatlak'], [/klor/, 'Klor yetersiz / fazla'], [/(kapak|kilit)/, 'Kapak / güvenlik'], [/(temizlik|kirli)/, 'Temizlik gerekiyor']],
      elektrik: [[/(elektrik yok|kesinti|kesik)/, 'Elektrik kesintisi'], [/sigorta/, 'Sigorta attı'], [/termik/, 'Termik attı'], [/faz/, 'Faz kaybı'], [/trafo/, 'Trafo arızası'], [/(su aldi|islandi)/, 'Pano su aldı'], [/kablo/, 'Kablo arızası']],
      ges: [[/(kirik|catlak)/, 'Panel kırığı'], [/(kirli|toz)/, 'Panel kirli'], [/inverter|invertor/, 'İnverter arızası'], [/(uretim|az uretiyor)/, 'Üretim düşüklüğü']],
      kanal: [[/(tikali|tikandi|tikanik)/, 'Tıkanıklık'], [/(tasiyor|tasma)/, 'Taşma'], [/(rogar|kapak)/, 'Rögar kapağı kırık / yok'], [/koku/, 'Koku'], [/(cokme|gocuk)/, 'Hat çökmesi / göçük'], [/foseptik/, 'Foseptik dolu']]
    };
    let tur = null;
    if (grup) {
      for (const [re, ad] of TUR_KURAL[grup] || []) if (var_(re)) { tur = ad; gerekce.push(ad); break; }
      if (!tur) tur = ARIZA_GRUP[grup].turler[0];
    }
    // Aciliyet
    let oncelik = 'Normal';
    if (var_(/\b(acil|hemen|derhal|cok acil|tum koy|butun koy|koyun tamami|kimsede su yok|hastane|okul|cami|patla\w*|sel|su basti)\b/)) { oncelik = 'Acil'; gerekce.push('aciliyet ifadesi'); }
    else if (var_(/\b(su yok|susuz|gelmiyor|iki gundur|2 gundur|uc gundur|3 gundur|gunlerdir|hala)\b/)) { oncelik = 'Yüksek'; gerekce.push('uzun süren kesinti'); }
    // Köy: metinde geçen yerleşim adı (en uzun eşleşme); ilçe ipucu varsa ona öncelik
    let koy = null, ilce = null;
    // Metinde geçen ilçe adı köy değil, ilçe ipucudur ("Mucur Kırlar köyü")
    const ilceler = ((this.state.data && this.state.data.DISTRICTS) || []).map(d => d.name);
    const ilceAdlari = new Set(ilceler.map(x => katla(x).trim()));
    const ilceMetin = ilceler.find(x => T.includes(' ' + katla(x).trim() + ' '));
    if (ilceMetin && !(ipucu && ipucu.ilce)) ipucu = { ...(ipucu || {}), ilce: ilceMetin };
    const yerler = (this._yer || []).filter(r => r[3] === 'YKOY' || r[3] === 'BCK');
    let enUzun = 0;
    for (const r of yerler) {
      const ad = katla(String(r[0]).replace(/_?Mrk ?(bucak|köy)$/i, '')).trim();
      if (ad.length < 3 || ad.length <= enUzun || ilceAdlari.has(ad)) continue;
      if (T.includes(' ' + ad + ' ')) {
        if (ipucu && ipucu.ilce && r[4] && katla(r[4]).trim() !== katla(ipucu.ilce).trim()) continue;
        enUzun = ad.length; koy = String(r[0]).replace(/_?Mrk ?(bucak|köy)$/i, ' merkez').trim(); ilce = r[4] || null;
      }
    }
    if (koy) gerekce.push('köy: ' + koy);
    if (!ilce && ilceMetin) { ilce = ilceMetin; gerekce.push('ilçe: ' + ilceMetin); }
    const guven = (grup ? 1 : 0) + (tur && grup ? 1 : 0) + (koy ? 1 : 0);
    return { grup, tur, oncelik, koy, ilce, gerekce, guven, kaynak: 'kural' };
  }
  // Yapay zekâ sınıflandırması: sonuç öneri kutusuna gelir, operatör uygular
  async talepAiSiniflandir() {
    const tf = this.state.talepForm;
    const M = this._sb;
    if (!tf || !M || !M.aiSiniflandir) return;
    const metin = [tf.konu, tf.aciklama].filter(Boolean).join('. ');
    if ((tf.aciklama || '').trim().length < 6) return this.duyur('Önce başvurunun ne olduğunu yazın.', 4000, 'kotu');
    this.setState({ talepForm: { ...tf, aiYukleniyor: true } });
    const r = await M.aiSiniflandir(metin);
    const f0 = this.state.talepForm;
    if (!f0) return;
    if (!r.ok) {
      this.setState({ talepForm: { ...f0, aiYukleniyor: false } });
      return this.duyur(r.anahtarYok
        ? 'Yapay zekâ henüz kurulmadı — Supabase > Edge Functions > Secrets bölümüne ANTHROPIC_API_KEY girilmeli. Şimdilik otomatik öneri kullanılıyor.'
        : 'Yapay zekâ sınıflandıramadı: ' + r.err, 9000, 'kotu');
    }
    const d = r.data;
    // Yapay zekânın yazdığı köy yerleşim listesinde aranır (yazım farkı olabilir)
    const katla = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, ' ').replace(/\s*koy(u|unde|unden)?$/, '').trim();
    let koy = null, ilce = d.ilce || null;
    if (d.koy) {
      const hedef = katla(d.koy);
      const r2 = (this._yer || []).find(y => (y[3] === 'YKOY' || y[3] === 'BCK') && katla(String(y[0]).replace(/_?Mrk ?(bucak|köy)$/i, '')) === hedef
        && (!ilce || !y[4] || katla(y[4]) === katla(ilce)));
      if (r2) { koy = String(r2[0]).replace(/_?Mrk ?(bucak|köy)$/i, ' merkez').trim(); ilce = ilce || r2[4] || null; }
    }
    this.setState({ talepForm: { ...f0, aiYukleniyor: false, aiSonuc: {
      grup: d.grup, tur: d.tur, oncelik: d.oncelik, koy, ilce, kaynak: 'ai',
      gerekce: [d.ozet, d.gerekce, d.koy && !koy ? '“' + d.koy + '” yerleşim listesinde bulunamadı' : ''].filter(Boolean)
    } } });
  }
  talepKaydet(g) {
    if (!g) return;
    const ad = (g.ad || '').trim();
    if (!ad) return this.duyur('Bildiren kişinin adını yazın.', 4500, 'kotu');
    if (!g.koy) return this.duyur('Köy / yerleşim seçin.', 4500, 'kotu');
    if (!(g.aciklama || '').trim()) return this.duyur('Talebin ne olduğunu bir iki cümleyle yazın.', 5000, 'kotu');
    if ((this.state.kvkk || {}).onayZorunlu && !g.id && !g.kvkkOnay) {
      return this.duyur('Bildiren kişiye adının ve telefonunun ne için kaydedildiği söylenmeli — formdaki onay kutusunu işaretleyin. Metin Ayarlar > KVKK bölümünde.', 9000, 'kotu');
    }
    // Numara ancak buraya kadar gelen, yazılacağı kesin kayıt için alınır.
    // Doğrulamadan önce alınsa hatalı her denemede bir numara yanar ve
    // resmî talep sırasında açıklanamayan boşluk kalır.
    if (!g.id && !g.no && !this._talepNo) {
      this.talepNoAl().then(x => {
        this._talepNo = x.no; this._talepGecici = x.gecici;
        this.talepKaydet(g);
        this._talepNo = null; this._talepGecici = false;
        if (x.gecici) this.duyur('Bağlantı olmadığı için geçici numara verildi (' + x.no
          + '). Bağlantı gelince kesin numaraya çevrilecek.', 8000);
      }).catch(() => {
        this._talepNo = this.talepNo(); this._talepGecici = false;
        this.talepKaydet(g); this._talepNo = null;
      });
      return;
    }

    const liste = [...(this.state.talepler || [])];
    const i = liste.findIndex(x => x.id === g.id);
    const kayit = {
      id: g.id || 'tl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      no: g.no || this._talepNo || this.talepNo(),
      noGecici: g.no ? !!g.noGecici : !!this._talepGecici,
      acilis: g.acilis || this.damga(),
      guncelleme: this.damga(),
      ad, tel: (g.tel || '').trim(), sifat: g.sifat || 'vatandas',
      kanal: g.kanal || 'telefon', ilce: g.ilce || '', koy: g.koy,
      konu: g.konu || TALEP_KONU[0], oncelik: g.oncelik || 'Normal',
      aciklama: (g.aciklama || '').trim(),
      durum: g.durum || 'yeni',
      sonuc: (g.sonuc || '').trim(),
      arizaNo: g.arizaNo || '',
      kvkkOnay: !!g.kvkkOnay, kvkkSilme: g.kvkkSilme || '',
      alan: g.alan || ((this.state.session && this.state.session.name) || ''),
      // Ön sınıflandırma (kural ya da yapay zekâ) — arızaya çevrilince grup/tür buradan gelir
      grup: ARIZA_GRUP[g.grup] ? g.grup : null, tur: g.tur || null,
      siniflandirma: g.siniflandirma || null,
      takip: g.takip || ''
    };
    if (i < 0) liste.unshift(kayit); else liste[i] = kayit;
    this.denetimYaz('talep', i < 0 ? 'Talep alındı' : 'Talep güncellendi',
      kayit.konu + ' · ' + kayit.koy + ' · ' + (TALEP_SIFAT[kayit.sifat] || '') + ' ' + kayit.ad
      + ' · ' + (TALEP_DURUM[kayit.durum] || kayit.durum), kayit.no);
    this.talepYaz(liste, kayit.no + (i < 0 ? ' kaydedildi' : ' güncellendi') + ' — ' + kayit.konu + ' · ' + kayit.koy + '.');
  }
  talepDurum(id, durum, sonuc) {
    const liste = [...(this.state.talepler || [])];
    const i = liste.findIndex(x => x.id === id);
    if (i < 0) return;
    liste[i] = { ...liste[i], durum, guncelleme: this.damga(), sonuc: sonuc != null ? sonuc : liste[i].sonuc };
    this.denetimYaz('talep', 'Talep durumu değişti',
      (TALEP_DURUM[durum] || durum) + (sonuc ? ' · ' + sonuc : ''), liste[i].no);
    this.talepYaz(liste, liste[i].no + ' · ' + (TALEP_DURUM[durum] || durum) + '.');
  }
  // Talebi arıza kaydına çevirir: köydeki kayıtlardan birini seçtirir,
  // arıza formunu talep bilgisiyle doldurur, talebi bağlar.
  // Talepten arıza: tesis seçimi arıza ekranındaki seçiciyle yapılır.
  // Önceden yalnız köy adı birebir girilmiş tesisler aranıyor ve sıra numarası
  // window.prompt ile soruluyordu — kuyuların çoğunda köy adı boş olduğu için
  // "köyünde kayıtlı tesis yok" deyip duruyordu. Artık talebin köyü yerleşim
  // listesinde bulunur, o noktaya yakın tesisler önce gelir.
  talepArizaya(id) {
    const t = (this.state.talepler || []).find(x => x.id === id);
    if (!t) return;
    const nk = nkey(t.koy), ik = nkey(t.ilce);
    const yerler = this._yer || [];
    const nokta = yerler.find(r => nkey(r[0]) === nk && (!ik || !r[4] || nkey(r[4]) === ik)) || yerler.find(r => nkey(r[0]) === nk);
    // Talebin sınıfı (yoksa metinden tahmin): şebeke arızası (su/kanal)
    // tesis seçtirmeden talebin köyüyle açılır
    const sinif = ARIZA_GRUP[t.grup] ? { grup: t.grup, tur: t.tur } : this.talepSiniflandir([t.konu, t.aciklama].join(' '), { ilce: t.ilce });
    const grup = ARIZA_GRUP[sinif.grup] ? sinif.grup : 'su';
    const G = ARIZA_GRUP[grup];
    const tur = G.turler.includes(sinif.tur) ? sinif.tur : G.turler[0];
    const sebeke = G.sebeke;
    const ayni = sebeke ? [] : (this.state.assets || []).filter(a => a.village && nkey(a.village) === nk && (!ik || nkey(a.district) === ik)
      && (!G.tesis || a.type === G.tesis));
    const tek = ayni.length === 1 ? ayni[0] : null;
    const telefon = this.state.device === 'phone';
    this.setState({
      tab: telefon ? this.state.tab : 'ariza', panel: 'ariza', selected: tek ? tek.id : this.state.selected,
      faultForm: {
        assetId: tek ? tek.id : null, type: tur, grup, yerModu: sebeke ? 'koy' : 'tesis',
        ilce: sebeke ? (t.ilce || '') : '', koy: sebeke ? (t.koy || '') : '',
        priority: t.oncelik || 'Normal', status: 'acik', crew: ATANMADI,
        note: t.no + ' · ' + (TALEP_SIFAT[t.sifat] || '') + ' ' + t.ad
          + (t.tel ? ' (' + t.tel + ')' : '') + ' · ' + (TALEP_KANAL[t.kanal] || '') + '\n' + (t.aciklama || ''),
        malzeme: [], sesler: [], iscilik: '', isaret: null,
        id: null, photos: [], hours: '', talepId: t.id,
        talepKoy: t.koy, talepNokta: nokta ? { lat: nokta[1], lon: nokta[2] } : null,
        tesisSec: !tek && !sebeke, tesisQ: ''
      }
    }, () => this.duyur(t.no + ' arıza formuna taşındı — ' + (sebeke
      ? G.ad + ' arızası olarak ' + t.koy + ' köyüyle açıldı; tesis gerekmiyor. Ekip varınca arıza noktasını kaydeder.'
      : tek
      ? tek.code + ' seçildi. Arıza türünü seçip kaydedin.'
      : (nokta ? t.koy + ' köyüne yakın tesisler listede önce. Tesisi seçin, türü işaretleyip kaydedin.'
        : t.koy + ' köyü yerleşim listesinde bulunamadı — tesisi arayarak seçin.'))
      + ' Kaydedince talep “Arızaya dönüştürüldü” olur.', 9000, 'iyi'));
  }