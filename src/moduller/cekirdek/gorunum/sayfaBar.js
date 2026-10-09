      sayfaBar: (() => {
        const ALT = SAYFA_ALT;
        const g = aktifGrup;
        if (!g) return { acik: false, telAcik: false, baslik: '', alt: '', suzgecler: [] };
        // Ayarlar'da bu üst çubuk hapları (Köy konumları/İçe-dışa aktarım/
        // Denetim izi/Çöp kutusu) sayfa içindeki AYAR_LISTE'yle aynı yerlere
        // gidiyordu — iki ayrı menü gibi duruyordu (kullanıcı geri bildirimi,
        // 2026.09.30). Yetki hâlâ SUZGEC_TANIM'dan okunuyor, dokunulmadı —
        // yalnızca burada, GÖRÜNEN hap listesi Ayarlar'da tek girdiye
        // süzülüyor; tek gerçek erişim yolu artık sayfa içindeki liste.
        let gorunenSuz = g.id === 'ayarlar' ? g.suz.filter(z => z.hedef === 'ayarlar') : g.suz;

        if (gorunenSuz.length < 2) return { acik: false, telAcik: false, baslik: '', alt: '', suzgecler: [] };
        const z0 = g.suz.find(z => z.hedef === tabId);
        return {
          acik: true,
          // Telefonda harita açıkken başlık gizlenir; ekran haritaya kalır
          telAcik: !(s.device === 'phone' && (tabId === 'harita' || tabId === 'profil')),
          baslik: g.ad, alt: ALT[(z0 || {}).id] || '',
          suzgecler: gorunenSuz.map(z => {
            const n = suzgecSayi[z.hedef] || 0;
            return {
              label: z.ad, n, nVar: n > 0,
              bg: tabId === z.hedef ? (dark ? '#48484a' : '#ffffff') : 'transparent',
              fg: tabId === z.hedef ? ui.fg : ui.mut,
              golge: tabId === z.hedef ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
              pick: () => { this.geziYanal(); this.setState({ tab: z.hedef }); }
            };
          })
        };
      })(),
      // “‹ Geri”: bir sayfadan başka sayfaya geçince (örn. Özet > ilçe > liste) önceki sayfaya döner
      geziGeri: (() => {
        const g = s.gezi || [];
        const son = g[g.length - 1];
        const gizli = !son || tabId === 'isKarti' || !s.session;
        return { var: !gizli, ad: son ? son.ad : '', git: () => this.geziGeri(), telAcik: !gizli && !(s.device === 'phone' && (tabId === 'harita' || tabId === 'profil')) };
      })(),
