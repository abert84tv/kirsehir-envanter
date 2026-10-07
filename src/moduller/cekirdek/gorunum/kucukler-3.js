      // Telefon haritasında sayfanın öbür görünümüne geçiş hapı
      telGecis: (() => {
        const g = aktifGrup;
        const z = g && g.suz.find(x => x.hedef !== tabId);
        const digerleri = g ? g.suz.filter(x => x.hedef !== tabId) : [];
        return z ? { var: true, label: z.ad, go: () => this.setState({ tab: z.hedef }),
          liste: digerleri.map(x => ({ label: x.ad, go: () => this.setState({ tab: x.hedef }) })) }
          : { var: false, label: '', go: () => {}, liste: [] };
      })(),
      // Kuyruk artık sayfa değil, üst çubukta gösterge
      kuyrukG: (() => {
        const n = bekleyenSay;
        return {
          var: yetki('kuyruk') !== 'yok' && n > 0, n,
          label: 'Bekleyen ' + n,
          not: n + ' kayıt sunucuya henüz gitmedi (bağlantı yokken ya da sunucu reddedince cihazda bekler) — dokununca listesi ve nedeni açılır.',
          git: () => this.setState({ tab: 'kuyruk' })
        };
      })(),
      tab: {
        harita: tabId === 'harita', envanter: tabId === 'envanter', ariza: tabId === 'ariza',
        yerlesim: tabId === 'yerlesim', kuyruk: tabId === 'kuyruk', profil: tabId === 'profil',
        islem: tabId === 'islem', ayarlar: tabId === 'ayarlar', aktarim: tabId === 'aktarim',
        // Denetim izi ve çöp kutusu Özet sayfasının süzgeçleri oldu; gövdeleri
        // ayarlar kabının içinde durduğu için kap bu üç sekmede açılır.
        ayarKap: tabId === 'ayarlar' || tabId === 'denetim' || tabId === 'cop',
        ozet: tabId === 'ozet', gunluk: tabId === 'gunluk', bakim: tabId === 'bakim',
        ambar: tabId === 'ambar', arac: tabId === 'arac', talep: tabId === 'talep',
        isPano: tabId === 'isPano', isPanosu: tabId === 'isPanosu', ekipPano: tabId === 'ekipPano', telemetri: tabId === 'telemetri'
      },
      // Masaüstü menüsü başlıklara ayrılır; içi boşalan başlık görünmez
      navGruplu: MENU_GRUP.map(([baslik, idler]) => ({
        baslik,
        ogeler: idler.map(id => navVisible.find(g => g.id === id)).filter(Boolean).map(navItem)
      })).filter(g => g.ogeler.length),
      // Telefon alt çubuğu: en çok dört sayfa, kalanı "Tümü"
      navPhone: (() => {
        const secili = TELEFON_SIRA
          .map(id => navVisible.find(g => g.id === id))
          .filter(Boolean).slice(0, 4);
        const acikBadge = navVisible
          .filter(g => !secili.includes(g))
          .reduce((t, g) => t + (g.badge || 0), 0);
        // Alt çubukta uzun grup adı sığmıyor ("Ekip, Araç, …") — kısa adı kullanılır
        const KISA = { kaynaklar: 'Kaynaklar' };
        return [...secili.map(g => ({ ...navItem(g), ...(KISA[g.id] ? { label: KISA[g.id] } : {}) })), {
          label: 'Tümü', go: () => this.setState({ menuAcik: true }),
          bg: 'transparent', fg: s.menuAcik ? ui.acc : ui.mut,
          mark: 'transparent', dot: s.menuAcik ? 'var(--color-accent)' : 'transparent',
          badge: acikBadge > 0, badgeN: acikBadge
        }];
      })(),
      // "Tümü" sayfası — başlıklı tam liste
      menuSayfa: {
        acik: !!s.menuAcik,
        kapat: () => this.setState({ menuAcik: false }),
        gruplar: MENU_GRUP.map(([baslik, idler]) => ({
          baslik,
          ogeler: idler.map(id => navVisible.find(g => g.id === id)).filter(Boolean).map(g => {
            const n = navItem(g);
            return { ...n, go: () => this.setState({ tab: (g.suz[0] || {}).hedef || 'harita', menuAcik: false }) };
          })
        })).filter(g => g.ogeler.length)
      },
      // Yalnız Ayarlar > Görünüm'de gösterilir; o an açık olan grup
      // (Ayarlar'ın kendisi) kendine giden anlamsız bir düğme olmasın diye düşer
      otherScreens: navVisible.filter(g => !TELEFON_SIRA.includes(g.id) && !g.acik).map(navItem),

      province: m ? {
        line: `${fmt(m.PROVINCE.population2025)} nüfus · ${m.PROVINCE.districts} ilçe · ${m.PROVINCE.municipalities} belediye · ${m.PROVINCE.mahalle} mahalle · ${m.PROVINCE.villages} köy · ${fmt(m.PROVINCE.areaKm2)} km²`,
        note: (() => {
          const yv = Object.values(s.yerlesimVeri || {});
          const nf = yv.filter(x => x.nufus != null).length;
          const hv = yv.filter(x => x.buyukbas != null || x.kucukbas != null).length;
          if (!nf && !hv) return `Nüfus: ${m.PROVINCE.source}. Köy düzeyi nüfus ve hayvan varlığı henüz içe aktarılmadı — köy nüfusları TÜİK ADNKS köy ekstresinden, büyükbaş/küçükbaş sayıları Tarım ve Orman Bakanlığı İBS il müdürlüğü ekstresinden gelecek (ulusal referans 2024: ${fmt(m.LIVESTOCK_NATIONAL_2024.sigir)} sığır, ${fmt(m.LIVESTOCK_NATIONAL_2024.koyun)} koyun, ${fmt(m.LIVESTOCK_NATIONAL_2024.keci)} keçi).`;
          return `Nüfus: ${m.PROVINCE.source}. Yüklenen dosyadan ${fmt(nf)} yerleşimin nüfusu` + (hv ? `, ${fmt(hv)} yerleşimin hayvan sayısı` : '') + ' işlendi.' + (hv ? '' : ' Büyükbaş/küçükbaş sayıları henüz yok — Tarım ve Orman Bakanlığı İBS ekstresini aynı ekrandan yükleyebilirsiniz.');
        })()
      } : { line: 'Veri yükleniyor…', note: '' },
      settlements,
