    // İşler: talep, arıza, bugün ve bakım tek sayfada dört süzgeç. Program
    // içeride eski sayfa kimliklerini kullanmaya devam eder — böylece
    // "arıza kaydına git" gibi bütün mevcut geçişler olduğu gibi çalışır.
    // Birleşmiş sayfalar. Menüde altı girdi var; her girdi bir süzgeç kümesi.
    // Program içeride eski sayfa kimliklerini kullanmayı sürdürür, böylece
    // "arıza kaydına git" gibi bütün mevcut geçişler olduğu gibi çalışır.
    const acikAriza = myFaults.filter(f => !KAPALI_DURUM.includes(f.status)).length;
    const acikTalep = (s.talepler || []).filter(t => !TALEP_KAPALI.includes(t.durum)).length;
    // Modül anahtarı kapalıysa o süzgeç hiç çıkmaz
    const modulKapi = { ariza: arizaOn, bakim: bakimOn, talep: talepOn, ambar: ambarOn, arac: aracOn, yerlesim: yerlesimOn, telemetri: telemetriOn, ekipPano: arizaOn || aracOn,
      // "Bana atanan" arıza ve bakım işlerini listeler; ikisi de kapalıysa boş kalır
      // Genel bakış ve Ekipler telefonda da var (2026.10.01, 6. aşama)
      gunluk: arizaOn || bakimOn, isPano: arizaOn || talepOn || oneriOn, isPanosu: arizaOn || talepOn || oneriOn };
    // Rol menüsü: başlık sırası, telefon çubuğu, sayfa adı, süzgeç sırası (ROL_MENU)
    const RM = ROL_MENU[me && me.role] || {};
    const menuGrup = RM.grup ? [...MENU_GRUP].sort((a, b) => { const i = RM.grup.indexOf(a[0]), j = RM.grup.indexOf(b[0]); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }) : MENU_GRUP;
    const telSira = RM.telefon || TELEFON_SIRA;
    const suzgecSayi = { isPanosu: this.panoYeniSayi() + this.onayBekleyenSay(), ariza: acikAriza, talep: acikTalep + (talepOn ? (s.basvurular || []).filter(b => b.durum === 'yeni').length : 0) };
    const gruplar = {};
    for (const sayfa in SUZGEC_TANIM) {
      const sira = (RM.suz || {})[sayfa];
      let zs = suzgecler(sayfa).filter(z => modulKapi[z.hedef] !== false);
      if (sira) zs = [...zs].sort((a, b) => { const i = sira.indexOf(a.id), j = sira.indexOf(b.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
      gruplar[sayfa] = {
        id: sayfa, ad: (RM.ad || {})[sayfa] || (zs.length === 1 ? zs[0].ad : (SUZGEC_SAYFA_AD[sayfa] || sayfa)), suz: zs,
        acik: zs.some(z => z.hedef === tabId),
        badge: zs.reduce((t, z) => t + (suzgecSayi[z.hedef] || 0), 0)
      };
    }
    // Bir süzgeci bile görünmeyen sayfa menüde çıkmaz
    const navVisible = MENU_SIRA.map(id => gruplar[id]).filter(g => g && g.suz.length && !(RM.gizle || []).includes(g.id));
    const navItem = g => ({
      label: g.ad, go: () => { this.geziMenu(); this.setState({ tab: (g.suz[0] || {}).hedef || 'harita' }); },
      // Etkin sayfa dolu mavi hap; ötekiler zeminsiz
      pill: g.acik ? 'var(--color-accent)' : 'transparent',
      hover: g.acik ? 'var(--color-accent)' : (dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.045)'),
      bg: g.acik ? ui.surf2 : 'transparent',
      fg: g.acik ? '#fff' : ui.fg,
      mark: g.acik ? 'var(--color-accent)' : 'transparent',
      dot: g.acik ? 'var(--color-accent)' : 'transparent',
      badgeBg: g.acik ? 'rgba(255,255,255,.24)' : 'var(--color-accent)',
      badgeFg: '#fff',
      // Hapsiz bağlamlar (telefon alt çubuğu, "Tümü" listesi)
      fgPlain: g.acik ? ui.acc : ui.mut,
      fgList: g.acik ? ui.acc : ui.fg,
      isaret: g.acik ? '✓' : '',
      ikon: this.ikon(g.id, 16),
      agirlik: g.acik ? 600 : 500,
      badge: g.badge > 0, badgeN: g.badge
    });
    const aktifGrup = navVisible.find(g => g.acik) || null;
    const seg = (on, act) => ({ bg: on ? 'var(--color-accent)' : 'transparent', fg: on ? '#fff' : ui.mut, pick: act });
    const canCreateAsset = (can('create') || can('tesisOner')) && sayfaTam;   // tesisOner: kayıt açmaz, mühendis/müdür onayına öneri gönderir
    const na = s.newAsset;

    // Kırmızı yalnız aciliyet ve hata için; gerisi nötr
    const priColor = p => p === 'Acil' ? 'var(--color-uyari)'
      : (p === 'Yüksek' ? (dark ? '#ff9f0a' : 'var(--color-bekle)') : ui.mut);
