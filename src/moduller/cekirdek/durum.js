  state = {
    data: null, device: 'desktop', deviceMode: 'auto',
    theme: (() => { try { return localStorage.getItem('ks-tema') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } })(),
    offline: false,
    session: null, loginUser: '', loginPw: '', loginErr: '', remember: true, autoLogin: false,
    // Açılışta kayıtlı oturum anahtarı doğrulanana kadar true — bu süreçte
    // giriş ekranı yerine kısa bir yükleniyor ekranı gösterilir, "kurumsal
    // giriş" mantığı: geçerli oturum varsa giriş ekranı hiç görünmez.
    oturumKontrol: true,
    mapBase: 'street', navMode: false, route: null,
    scenario: null, newAsset: null,
    role: 'Ofis Mühendisi', tab: 'harita', query: '',
    envQ: '', envSort: { k: 'code', dir: 1 }, envF: {},
    arzQ: '', arzSort: { k: 'no', dir: 1 }, arzF: {},
    zoom: 11, center: null, fly: null,
    assets: [],
    // Sunucuya henüz yazılamamış arızalar cihazdan geri yüklenir
    faults: (() => {
      try {
        const b = JSON.parse(localStorage.getItem('ks-ariza-bekleyen') || '[]');
        return Array.isArray(b) ? b.filter(f => f && f.id && (f.assetId || f.ilce)).map(f => ({ ...f, sync: 'pending' })) : [];
      } catch (e) { return []; }
    })(),
    isEmirleri: [], isEmriPanel: null, selected: null, detailTab: 'bilgi',
    panel: 'yok', faultForm: null, queue: [], toast: null, hatTam: false,
    hatKatman: (() => { try { return localStorage.getItem('ks-hat-katman') !== '0'; } catch (e) { return true; } })(),
    filter: (() => {
      // kaynak/memba: ISU'dan gelen referans katmanları — "Tümü" bunları da kapsar (2026.10.06);
      // depo süzgeci ise ISU depo referans noktalarını da kapsar (bkz. harita.html)
      const v = { kuyu: true, depo: true, ag: true, ges: true, pasif: true, kaynak: true, memba: true };
      try {
        const p = JSON.parse(localStorage.getItem('ks-suzgec') || 'null');
        // Eski kayıtta ISU kapalı saklıydı: bir kez açılır (sonra kullanıcının seçimi korunur)
        const goc = localStorage.getItem('ks-suzgec-isu') === '1';
        if (p && typeof p === 'object') for (const k in v) if (k in p && (goc || (k !== 'kaynak' && k !== 'memba'))) v[k] = p[k] !== false;
        localStorage.setItem('ks-suzgec-isu', '1');
      } catch (e) { /* depolama kapalı */ }
      return v;
    })(),
    notes: {}, tests: {}, testForm: null, imp: null, vFill: null, seeking: null, pick: null, vFix: null,
    ozetZaman: 'hafta', ozetBas: '', ozetBit: '', ozetIlce: '', ozetSekme: 'envanter',
    log: {}, trash: [], cop: [], card: null,
    // Arıza ve Bakım modüler: Ayarlar > Modüller'den kapatılabilir. Kapalı
    // modülün menüsü, sekmesi ve uyarıları görünmez; kayıtları silinmez.
    modul: (() => {
      const v = { ariza: true, bakim: true, sure: false, kanit: true, onay: false, ambar: true, arac: true, talep: true };
      try {
        const p = JSON.parse(localStorage.getItem('ks-modul') || localStorage.getItem('ks-moduller') || 'null');
        if (p && typeof p === 'object') for (const k in v) if (k in p) v[k] = p[k] !== false;
      } catch (e) { /* depolama kapalı */ }
      return v;
    })(),
    // Ekip vardiyası ve yetkinliği: cihazda saklanır, arıza formunda görünür
    // Ambar: mevcut, ekip zimmeti ve hareket dökümü — cihazda saklanır
    ambar: (() => {
      const v = { stok: {}, zimmet: {}, hareket: [] };
      try {
        const p = JSON.parse(localStorage.getItem('ks-ambar') || 'null');
        if (p && typeof p === 'object') {
          if (p.stok && typeof p.stok === 'object') v.stok = p.stok;
          if (p.zimmet && typeof p.zimmet === 'object') v.zimmet = p.zimmet;
          if (Array.isArray(p.hareket)) v.hareket = p.hareket;
          if (p.gun && typeof p.gun === 'object') v.gun = p.gun;
        }
      } catch (e) { /* depolama kapalı */ }
      return v;
    })(),
    ambarForm: null,
    // Malzeme kataloğu ve sipariş listesi — sunucuda "malzeme"/"siparis"
    malzemeKatalog: (() => {
      try {
        const k = JSON.parse(localStorage.getItem('ks-malzeme') || 'null');
        if (Array.isArray(k) && k.length) return k.filter(x => x && x.ad && x.kod);
      } catch (e) { /* depolama kapalı */ }
      return katalogBaslangic();
    })(),
    siparis: (() => {
      try {
        const k = JSON.parse(localStorage.getItem('ks-siparis') || 'null');
        return Array.isArray(k) ? k.filter(x => x && x.malzeme) : [];
      } catch (e) { return []; }
    })(),
    yardim: (() => { try { const v = localStorage.getItem('ks-yardim') === '1'; document.documentElement.classList.toggle('ks-yardim', v); return v; } catch (e) { return false; } })(),
    telemetri: { yuk: false, cihazlar: [], alarmlar: [], kurallar: [], sek: 'cihaz', sec: null, kanal: null,
      saat: 24, seri: [], form: null, kuralForm: null, anahtar: null, bilgi: false, hata: '' },
    basvuruUyari: null, panoGorunum: (() => { try { return localStorage.getItem('ks-pano-gorunum') === 'tablo' ? 'tablo' : 'pano'; } catch (e) { return 'pano'; } })(), panoSira: { k: 'onc', dir: 1 }, panoSuz: {}, isKarti: null, ekipKonum: {}, konumForm: null, konumCihazlar: [], konumHata: '', konumSon: 0, konumPaylasim: (() => { try { return localStorage.getItem('ks-konum-paylas') === '1'; } catch (e) { return false; } })(), panoKolon: 'yeni', panoEkip: null, panoHedef: null, sesAcik: false, uyariTik: 0, telMenuAcik: false, telSuzAcik: false, telListeSuzAcik: false, telArzSuzAcik: false, telAracAcik: false, telTam: false, basvurular: [], bekleSheet: null, olaySheet: null, isEmriEk: {},
    entegrasyon: { yuk: false, liste: [], giris: '', sonuc: '', hata: '' },
    ambarQ: '', ambarKat: '', ambarSira: 'gun', ambarSuz: '', ambarHepsi: false,
    ambarKart: null, malzemeForm: null, siparisPanel: false,
    // Araç ve ekipman — liste, görev durumu ve hareket dökümü
    arac: (() => {
      const v = { list: ARAC_BASLANGIC.map(a => ({ ...a, durum: 'musait', ekip: '', surucu: '', is: '' })), hareket: [] };
      try {
        const p = JSON.parse(localStorage.getItem('ks-arac') || 'null');
        if (p && Array.isArray(p.list)) {
          v.list = p.list;
          if (Array.isArray(p.hareket)) v.hareket = p.hareket;
        }
      } catch (e) { /* depolama kapalı */ }
      return v;
    })(),
    aracForm: null, aracGorev: null,
    aracGunTaslak: { tarih: '', tur: 'bakim', saat: '', not: '' },
    aracKonumTaslak: { lat: '', lon: '', not: '' },
    // Dış talepler — cihazda saklanır
    talepler: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-talep') || 'null');
        if (Array.isArray(p)) return p;
      } catch (e) { /* depolama kapalı */ }
      return [];
    })(),
    talepForm: null, talepSuz: '', talepQ: '',
    // Mesaj gönderimi: sunucu işlevi adresi ve şef numarası cihazda saklanır,
    // gönderilemeyen mesajlar kuyrukta bekler.
    smsAyar: (() => {
      const v = { url: '', sefTel: '', acik: false };
      try {
        const p = JSON.parse(localStorage.getItem('ks-sms') || 'null');
        if (p && typeof p === 'object') Object.assign(v, p);
      } catch (e) { /* depolama kapalı */ }
      return v;
    })(),
    smsKuyruk: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-sms-kuyruk') || 'null');
        if (Array.isArray(p)) return p.slice(0, 200);
      } catch (e) { /* depolama kapalı */ }
      return [];
    })(),
    smsGonderiyor: false,
    // KVKK: saklama süreleri ve veri sorumlusu bilgileri
    kvkk: (() => {
      const v = { kurum: 'Kırşehir İl Özel İdaresi', irtibat: '', adres: '', onayZorunlu: true, saklama: {} };
      for (const s of SAKLAMA_TANIM) v.saklama[s.k] = s.gun;
      try {
        const p = JSON.parse(localStorage.getItem('ks-kvkk') || 'null');
        if (p && typeof p === 'object') {
          for (const k of ['kurum', 'irtibat', 'adres']) if (typeof p[k] === 'string') v[k] = p[k];
          if (typeof p.onayZorunlu === 'boolean') v.onayZorunlu = p.onayZorunlu;
          if (p.saklama) for (const k in v.saklama) if (typeof p.saklama[k] === 'number') v.saklama[k] = p.saklama[k];
        }
      } catch (e) { /* depolama kapalı */ }
      return v;
    })(),
    // Denetim izi — kim, ne zaman, nereden, ne yaptı. Cihazda saklanır.
    denetim: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-denetim') || 'null');
        if (Array.isArray(p)) return p.slice(0, DENETIM_SINIR);
      } catch (e) { /* depolama kapalı */ }
      return [];
    })(),
    denetimQ: '', denetimSinif: '', denetimKim: '',
    menuAcik: false,
    // Sunucuya işlenmeyi bekleyen ambar hareketleri
    ambarKuyruk: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-ambar-kuyruk') || 'null');
        if (Array.isArray(p)) return p;
      } catch (e) { /* depolama kapalı */ }
      return [];
    })(),
    // Okunan sürümler: yazarken geri gönderilir, çakışma böyle bulunur
    modulSurum: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-modul-surum') || 'null');
        if (p && typeof p === 'object') return p;
      } catch (e) { /* depolama kapalı */ }
      return {};
    })(),
    // Sunucuya yazılamayan modüller: anahtar → deneme zamanı
    modulKuyruk: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-modul-kuyruk') || 'null');
        if (p && typeof p === 'object') return p;
      } catch (e) { /* depolama kapalı */ }
      return {};
    })(),
    // Personel havuzu — ad soyad, meslek, telefon. Ekipten bağımsız.
    personel: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-personel') || 'null');
        if (Array.isArray(p)) {
          return p.filter(x => x && x.ad).map(x => ({
            id: x.id || 'ps' + Math.random().toString(36).slice(2, 8),
            ad: String(x.ad).trim(), meslek: x.meslek || MESLEKLER[0],
            tel: x.tel || '', not: x.not || '',
            durum: PERSONEL_DURUM[x.durum] ? x.durum : 'aktif',
            donus: x.donus || '', kullanici: x.kullanici || ''
          }));
        }
        // Eski ekip biçimindeki kişiler havuza taşınır
        const e = JSON.parse(localStorage.getItem('ks-ekipler') || 'null');
        if (Array.isArray(e)) {
          const out = [];
          for (const ek of e)
            for (const u of (ek.uyeler || []))
              if (u && u.ad) out.push({
                id: 'ps' + Math.random().toString(36).slice(2, 8),
                ad: u.ad, meslek: u.gorev || MESLEKLER[0], tel: '', not: ek.ad,
                durum: 'aktif', donus: '', kullanici: ''
              });
          if (out.length) return out;
        }
      } catch (e) { /* depolama kapalı */ }
      return [];
    })(),
    personelForm: null, personelQ: '',
    personelGunTaslak: { tarih: '', tur: 'izin', saat: '', not: '' },
    // Muhtar numara defteri — madde 1: talep formunda telefon eşleşince köy otomatik önerilir
    muhtarlar: (() => {
      try {
        const m = JSON.parse(localStorage.getItem('ks-muhtar') || 'null');
        return Array.isArray(m) ? m.filter(x => x && x.ad) : [];
      } catch (e) { return []; }
    })(),
    muhtarPanel: null,
    // Ekipler: sıralı liste. Eski biçim (ad → ayar nesnesi) da okunur.
    ekipler: (() => {
      const varsayilan = EKIP_BASLANGIC.map(e => ({ ...e, yetkinlik: [...e.yetkinlik], uyeIdler: [] }));
      try {
        const p = JSON.parse(localStorage.getItem('ks-ekipler') || 'null');
        if (Array.isArray(p)) {
          const temiz = p.filter(e => e && typeof e.ad === 'string' && e.ad.trim() && e.ad !== ATANMADI)
            .map(e => ({
              ad: e.ad.trim(), vardiya: e.vardiya || 'Gündüz', tel: e.tel || '',
              sefTel: e.sefTel || '', sefId: e.sefId || '', not: e.not || '',
              bolgeler: Array.isArray(e.bolgeler) ? e.bolgeler : (e.bolge ? [e.bolge] : []),
              yetkinlik: Array.isArray(e.yetkinlik) ? e.yetkinlik : [],
              uyeIdler: Array.isArray(e.uyeIdler) ? e.uyeIdler : []
            }));
          if (temiz.length) return temiz;
        } else if (p && typeof p === 'object') {
          // eski biçim: { 'Ekip 1 — Merkez': { vardiya, yetkinlik, tel } }
          const out = [];
          for (const e of varsayilan) {
            const y = p[e.ad] || {};
            out.push({
              ad: e.ad, vardiya: y.vardiya || e.vardiya, tel: y.tel || '',
              sefTel: '', sefId: '', not: '',
              bolgeler: Array.isArray(e.bolgeler) ? e.bolgeler : (e.bolge ? [e.bolge] : []),
              yetkinlik: Array.isArray(y.yetkinlik) ? y.yetkinlik : [...e.yetkinlik], uyeIdler: []
            });
          }
          return out;
        }
      } catch (e) { /* depolama kapalı */ }
      return varsayilan;
    })(),
    ekipForm: null,
    // Nöbet takvimi: gün numarası → ekip adı. Boşsa nöbetçi belirlenmemiş.
    nobet: (() => {
      try {
        const p = JSON.parse(localStorage.getItem('ks-nobet') || 'null');
        if (p && typeof p === 'object') return p;
      } catch (e) { /* depolama kapalı */ }
      return {};
    })(),
    ayarBolum: null, alanForm: null,
    users: [], userForm: null, pwForm: null,
    fotolar: {}, fotoYuk: null, kayitliSesler: {},
    coordMode: false, picked: null, naSz: null, duyuru: null, koyForm: null, buyut: null,
    bakimlar: {}, bakimForm: null, yerlesimVeri: {}, yerlesimYukle: null,
    ekKoyler: {}, koyEkleForm: { ilce: '', ad: '', lat: '', lon: '' }, yetkiForm: null, hatlar: {},
    conv: { sys: 'ITRF96', zone: '11', e: '615860', n: '4322830' }
  };

  // ── ekran genişliğine göre düzen: dar ekran telefon, geniş ekran bilgisayar