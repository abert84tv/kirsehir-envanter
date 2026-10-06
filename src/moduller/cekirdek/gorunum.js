      saltOkur: !!me && !sayfaTam,
      saltOkurNot: 'Bu sayfada yalnızca görüntüleme yetkiniz var — kayıt ekleme, düzenleme ve silme düğmeleri kapalı. Yetki değişikliği için yöneticinize başvurun.',
      ui, role: me ? `${me.name} · ${me.roleLabel}` : '', query: s.query, offline: s.offline,
      isDesktop: s.device === 'desktop' && !!s.session, isPhone: s.device === 'phone' && !!s.session,
      setBase: {
        street: seg(s.mapBase === 'street', () => this.setState({ mapBase: 'street' }, () => this.toMap({ ks: 'setBase', base: 'street' }))),
        sat: seg(s.mapBase === 'sat', () => this.setState({ mapBase: 'sat' }, () => this.toMap({ ks: 'setBase', base: 'sat' }))),
        hyb: seg(s.mapBase === 'hyb', () => this.setState({ mapBase: 'hyb' }, () => this.toMap({ ks: 'setBase', base: 'hyb' })))
      },
      setTheme: {
        light: seg(!dark, () => this.temaSec('light')),
        dark: seg(dark, () => this.temaSec('dark'))
      },
      setNet: {
        on: seg(!s.offline, () => this.setState({ offline: false })),
        off: seg(s.offline, () => this.setState({ offline: true }))
      },
      setNav: {
        on: seg(s.navMode, () => this.setState({ navMode: true }, () => this.toMap({ ks: 'navMode', on: true }))),
        off: seg(!s.navMode, () => this.setState({ navMode: false }, () => this.toMap({ ks: 'navMode', on: false })))
      },
      navKapali: !s.navMode,
      ikonlar: {
        gps: this.ikon('gps', 18), gpsBuyuk: this.ikon('gps', 26),
        pin: this.ikon('pin', 16), pinBuyuk: this.ikon('pin', 22),
        tema: this.ikon(dark ? 'gunes' : 'ay', 17),
        indir: this.ikon('indir', 15), indirKucuk: this.ikon('indir', 13),
        cop: this.ikon('cop', 15), copKucuk: this.ikon('cop', 13),
        sol: this.ikon('sol', 24), sag: this.ikon('sag', 24),
        kapat: this.ikon('kapat', 16), kapatBuyuk: this.ikon('kapat', 20),
        uyari: this.ikon('uyari', 20), buyut: this.ikon('buyut', 15),
        kalem: this.ikon('kalem', 14), kalemOrta: this.ikon('kalem', 16), uyariKucuk: this.ikon('uyari', 16), kamera: this.ikon('kamera', 16),
        yenile: this.ikon('yenile', 14),
        cikis: this.ikon('cikis', 14), cikisBuyuk: this.ikon('cikis', 16),
        ariza: this.ikon('ariza', 20), arizaBuyuk: this.ikon('ariza', 24),
        donustur: this.ikon('donustur', 18)
      },
      duyuru: (() => {
        const d = s.duyuru;
        const ariza = !!d && d.tur === 'ariza';
        return {
          show: !!d, text: d ? d.text : '',
          bg: ariza
            ? (dark ? 'rgba(74,26,18,.80)' : 'rgba(255,240,237,.86)')
            : (dark ? 'rgba(30,30,32,.76)' : 'rgba(255,255,255,.84)'),
          fg: ariza ? (dark ? '#fbeeea' : 'var(--color-accent-700)') : ui.fg,
          border: ariza
            ? (dark ? 'rgba(236,48,19,.55)' : 'rgba(236,48,19,.30)')
            : (dark ? 'rgba(255,255,255,.14)' : 'rgba(32,30,29,.10)'),
          zamanFg: dark ? 'rgba(255,255,255,.5)' : 'rgba(32,30,29,.45)',
          tiklanir: !!(d && d.git),
          imlec: d && d.git ? 'pointer' : 'default',
          gitNot: d && d.git ? 'Bildirime dokunun' : '',
          git: () => {
            const g = d && d.git;
            clearTimeout(this._d);
            this.setState({ duyuru: null });
            if (g) g();
          },
          baslik: ariza ? 'Arıza bildirimi' : (d && d.tur === 'kotu' ? 'Uyarı' : 'Envanter'),
          simgeBg: (ariza || (d && d.tur === 'kotu')) ? 'var(--color-uyari)'
            : (d && d.tur === 'iyi' ? '#30a46c' : 'var(--color-accent)'),
          zaman: 'şimdi',
          kapat: () => { clearTimeout(this._d); this.setState({ duyuru: null }); }
        };
      })(),
      setDevice: (() => {
        const mk = id => seg(s.deviceMode === id, () => {
          try { localStorage.setItem('ks-device-mode', id); } catch (e) { /* depolama kapalı */ }
          this.setState({ deviceMode: id, device: id === 'auto' ? this.olcCihaz() : id });
        });
        return {
          auto: mk('auto'), desktop: mk('desktop'), phone: mk('phone'),
          note: s.deviceMode === 'auto'
            ? `Otomatik: ekran genişliğine göre seçilir — şu an ${s.device === 'phone' ? 'telefon' : 'bilgisayar'} düzeni. Ekranı döndürdüğünüzde kendiliğinden uyar.`
            : `Elle sabitlendi: ${s.deviceMode === 'phone' ? 'telefon' : 'bilgisayar'} düzeni. Otomatiğe dönmek için Otomatik'e basın.`
        };
      })(),
      net: s.offline
        ? { label: 'Çevrimdışı', badge: 'Çevrimdışı' + (bekleyenSay ? ' · ' + bekleyenSay : ''), short: 'Off', fill: 'var(--color-uyari)', border: 'var(--color-uyari)', ink: '#fff',
          nokta: 'ks-kapali', yazi: 'var(--color-uyari)', zemin: dark ? 'rgba(255,69,58,.14)' : 'var(--color-uyari-100)',
          ipucu: 'Çevrimdışı — kayıtlar cihazda bekler. Dokununca çevrimiçine döner.' }
        : { label: '4G', badge: s.sunucu ? 'Canlı' : 'Çevrim içi', short: 'On', fill: 'transparent', border: ui.rule, ink: ui.mut,
          nokta: '', yazi: dark ? '#30d158' : '#1b7a36', zemin: dark ? 'rgba(48,209,88,.12)' : 'rgba(52,199,89,.12)',
          ipucu: s.sunucu ? 'Ortak veritabanına bağlı — değişiklikler herkese anında gider.' : 'İnternet var; ortak veritabanı bağlantısı bekleniyor.' },
      toggleNet: () => { const off = !s.offline; this._elleCevrimdisi = off; this.setState({ offline: off }); if (!off) setTimeout(() => this.senkron(true), 1200); this.say(off ? 'Çevrimdışı — kayıtlar IndexedDB’de tutulacak.' : 'Bağlantı geldi — arka plan eşitlemesi hazır.'); },
      yardimKenar: s.yardim ? 'var(--color-accent)' : ui.rule,
      yardimZemin: s.yardim ? 'var(--color-accent)' : 'transparent',
      yardimYazi: s.yardim ? '#fff' : ui.fg,
      toggleYardim: () => this.yardimDegistir(),
      telSuz: (() => {
        const acik = !!s.telSuzAcik, lAcik = !!s.telListeSuzAcik;
        return {
          acik, ok: acik ? '▴' : '▾',
          tog: () => this.setState({ telSuzAcik: !this.state.telSuzAcik }),
          kenar: acik ? 'var(--color-accent)' : ui.rule, zemin: acik ? 'var(--color-accent)' : 'transparent', yazi: acik ? '#fff' : ui.fg,
          listeAcik: lAcik, listeOk: lAcik ? '▴' : '▾',
          listeTog: () => this.setState({ telListeSuzAcik: !this.state.telListeSuzAcik }),
          listeKenar: lAcik ? 'var(--color-accent)' : ui.rule,
          listeEtiket: envKontrol.suzuluyor ? 'süzülüyor' : '',
          aracAcik: !!s.telAracAcik, aracOk: s.telAracAcik ? '▴' : '▾',
          aracKenar: s.telAracAcik ? 'var(--color-accent)' : ui.rule, aracZemin: s.telAracAcik ? 'var(--color-accent)' : 'transparent', aracYazi: s.telAracAcik ? '#fff' : ui.fg,
          aracTog: () => { const v = !this.state.telAracAcik; this.setState({ telAracAcik: v }); const w = this.profilWin(); if (w) try { w.postMessage({ ks: 'arac', acik: v }, '*'); } catch (e) { /* çerçeve yok */ } },
          tamIk: s.telTam ? '⤡' : '⤢',
          tamTog: () => { const v = !this.state.telTam; this.setState({ telTam: v }); try { document.documentElement.classList.toggle('ks-tam', v); } catch (e) { /* belge yok */ } setTimeout(() => { const w = this.mapWin(); const p = this.profilWin(); try { w && w.dispatchEvent(new Event('resize')); p && p.dispatchEvent(new Event('resize')); } catch (e) { /* çerçeve yok */ } }, 120); },
          arzAcik: !!s.telArzSuzAcik, arzOk: s.telArzSuzAcik ? '▴' : '▾',
          arzTog: () => this.setState({ telArzSuzAcik: !this.state.telArzSuzAcik }),
          arzKenar: s.telArzSuzAcik ? 'var(--color-accent)' : ui.rule,
          arzEtiket: (typeof arzKontrol !== 'undefined' && arzKontrol.suzuluyor) ? 'süzülüyor' : ''
        };
      })(),
      telMenu: {
        acik: !!s.telMenuAcik, kenar: s.telMenuAcik ? 'var(--color-accent)' : ui.rule,
        zemin: s.telMenuAcik ? 'var(--color-accent)' : 'transparent', yazi: s.telMenuAcik ? '#fff' : ui.fg,
        ac: () => this.setState({ telMenuAcik: !this.state.telMenuAcik }),
        kapat: () => this.setState({ telMenuAcik: false }),
        ogeler: (() => {
          const k = fn => () => { this.setState({ telMenuAcik: false }); fn(); };
          return [
            { ikon: '↻', ad: 'Şimdi eşitle / yenile', renk: ui.fg, git: k(() => { this.say('Yenileniyor…'); this.senkron(); this.veriYenile(); }) },
            { ikon: dark ? '☀' : '☾', ad: dark ? 'Açık tema' : 'Koyu tema', renk: ui.fg, git: k(() => this.temaSec(dark ? 'light' : 'dark')) },
            { ikon: '?', ad: s.yardim ? 'Açıklamaları gizle' : 'Açıklamaları göster', renk: ui.fg, git: k(() => this.yardimDegistir()) },
            { ikon: '⚙', ad: 'Ayarlar', renk: ui.fg, git: k(() => this.setState({ tab: 'ayarlar', ayarBolum: null })) },
            { ikon: '⎋', ad: 'Çıkış', renk: '#d92d20', git: k(() => this.renderVals().logout()) }
          ];
        })()
      },
      toggleTheme: () => this.temaSec(dark ? 'light' : 'dark'),
      onQuery: e => this.setState({ query: e.target.value }),
      onQueryKey: e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (suggestions.length) suggestions[0].go();
        else if (q) this.say('Bu aramaya karşılık kayıt yok. Koordinat yazıyorsanız iki sayı olmalı: 39.1462 34.1583 (WGS84) veya 572799,55 4331744,74 (ITRF96 sağa-yukarı).');
      },
      suggestions, hasSuggest: suggestions.length > 0,
      seeking: { on: !!s.seeking, text: s.seeking ? `${s.seeking} köyünün yeri aranıyor…` : '' },
      esitle: {
        label: 'Yenile',
        note: s.sunucu ? (s.sonEsitleme ? 'Son eşitleme: ' + s.sonEsitleme : 'Ortak veritabanı bağlı') : 'Cihazdaki kopya — bağlanmak için basın',
        tik: () => this.baglan()
      },
      // Üst çubuk: her sayfada başlık + tek satır açıklama (süzgeç sayısından bağımsız)
      ustBar: (() => {
        const g = aktifGrup;
        const z0 = g && g.suz.find(z => z.hedef === tabId);
        const DIS = { kuyruk: ['Bekleyen kayıtlar', 'Sunucuya gönderilmeyi bekleyen kayıtlar.'], islem: ['Kayıt işlemleri', 'Yeni tesis kur, mevcut tesise gir, bilgi güncelle, fotoğraf ekle.'] };
        if (g) return { baslik: g.ad, alt: SAYFA_ALT[(z0 || {}).id] || SAYFA_ALT[tabId] || '' };
        const d = DIS[tabId];
        return d ? { baslik: d[0], alt: d[1] } : { baslik: 'Kırşehir Envanter', alt: '' };
      })(),
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
              pick: () => this.setState({ tab: z.hedef })
            };
          })
        };
      })(),
      // Sürüm ve önbellek. Telefon eski kopyayı önbellekte tuttuğunda
      // ekranda kaldırılmış kayıtlar görünmeye devam eder; tazeleme bunu çözer.
      surumBilgi: (() => {
        const yerel = this.yerelTesisOku();
        return {
          surum: SURUM,
          not: 'Telefonda kaldırılmış kayıtlar görünüyorsa cihaz eski kopyayı önbellekte tutuyor olabilir. Tazeleme, programı sunucudan yeniden indirir; veritabanındaki kayıtlara dokunmaz.',
          yerelVar: yerel.length > 0,
          yerelLabel: 'Cihazda bekleyen ' + yerel.length + ' kaydı sil',
          tazele: async () => {
            try {
              if (window.caches && caches.keys) {
                const k = await caches.keys();
                await Promise.all(k.map(x => caches.delete(x)));
              }
            } catch (e) { /* önbellek API'si yok */ }
            location.reload();
          },
          yereliSil: () => {
            const kodlar = this.yerelTesisOku().map(x => x.code).join(', ');
            this.yerelTesisYaz([]);
            this.setState({ assets: (this.state.assets || []).filter(x => x && x.dbId) },
              () => this.duyur('Cihazda bekleyen kayıtlar silindi: ' + (kodlar || '—')
                + '. Veritabanındaki kayıtlar yerinde duruyor.', 8000, 'bilgi'));
          }
        };
      })(),
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
        isPano: tabId === 'isPano', ekipPano: tabId === 'ekipPano', telemetri: tabId === 'telemetri'
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

      panel: {
        isDetail: s.panel === 'detay' && !!sel, isFault: s.panel === 'ariza' && !!ff, isConv: s.panel === 'donusum',
        any: (s.panel === 'detay' && !!sel) || (s.panel === 'ariza' && !!ff) || s.panel === 'donusum'
      },
      sheet: { open: s.device === 'phone' && ((s.panel === 'detay' && !!sel) || (s.panel === 'ariza' && !!ff) || s.panel === 'donusum') },
      closePanel: () => this.setState({ panel: 'yok', faultForm: null, selected: s.device === 'phone' ? null : s.selected }),
      // Masaüstü sağ panel: üstteki sabit çıkış düğmesi hangi kart açıksa onu kapatır
      panelKapat: () => {
        if (s.panel === 'ariza') this.setState({ panel: 'yok', faultForm: null });
        else if (s.panel === 'detay') this.setState({ selected: null, panel: 'yok' });
        else this.setState({ panel: 'yok' });
      },
      detail: sel ? {
        ...(() => {
          // Kayıt tamlığı: başlık satırları hariç, "— eksik" olmayan alanların oranı
          const satir = this.rows(sel).filter(r => r[2] !== 2);
          const eksik = satir.filter(r => String(r[1]).indexOf('— eksik') === 0).length;
          const tam = satir.length ? Math.round((satir.length - eksik) / satir.length * 100) : 0;
          const acik = (s.faults || []).filter(f => f.assetId === sel.id && !KAPALI_DURUM.includes(f.status)).length;
          return {
            tam, eksik, tamW: tam + '%', tamC: tam < 30 ? '#ff9f0a' : (tam < 70 ? 'var(--color-accent)' : '#34c759'),
            acikAriza: acik > 0, arizaEt: acik + ' açık arıza',
            fotoSekme: () => this.setState({ detailTab: 'medya' }, () => { if (sel.dbId && !(this.state.fotolar || {})[sel.dbId]) this.fotoYenile(sel.dbId); })
          };
        })(),
        kind: TYPES[sel.type].kind, code: sel.code,
        meta: `${this.yer(sel)} · ${sel.year ? sel.year + ' yapım' : 'yıl girilmedi'} · ${sel.sync === 'pending' ? 'eşitleme bekliyor' : 'eşitlendi'}`,
        tabs: [['bilgi', 'Bilgi'], ...(sel.type === 'kuyu' ? [['deneme', 'Deneme']] : []), ['hat', 'Hat'], ['medya', 'Foto'],
          ...(bakimOn ? [['bakim', 'Bakım']] : []), ['not', 'Not'], ...(arizaOn ? [['ariza', 'Arıza']] : []), ['gecmis', 'Geçmiş']].map(([id, label]) => ({
          label, bg: s.detailTab === id ? ui.surf2 : 'transparent', fg: s.detailTab === id ? ui.acc : ui.mut,
          pick: () => {
            this.setState({ detailTab: id });
            if (id === 'medya' && sel.dbId && !(s.fotolar || {})[sel.dbId]) this.fotoYenile(sel.dbId);
          }
        })),
        showFields: s.detailTab === 'bilgi',
        showGecmis: s.detailTab === 'gecmis',
        showMedia: s.detailTab === 'medya', showFaults: s.detailTab === 'ariza',
        showBakim: s.detailTab === 'bakim',
        showTests: s.detailTab === 'deneme', showNote: s.detailTab === 'not',
        showHat: s.detailTab === 'hat',
        hat: (() => {
          const liste = (s.hatlar || {})[sel.id] || [];
          const TUR_AD = { terfi: 'Terfi hattı', isale: 'İsale hattı', sebeke: 'Şebeke hattı', ag: 'AG enerji hattı', og: 'OG enerji hattı', dc: 'GES DC hattı' };
          const TUR_RENK = { terfi: '#ec3013', isale: '#201e1d', sebeke: '#6c6763', ag: '#1b6ef3', og: '#7b3fbf', dc: '#c08a00' };
          const toplam = liste.reduce((t, x) => t + this.hatUzunluk(x.noktalar), 0);
          return {
            varMi: liste.length > 0,
            sayi: liste.length + ' hat · ' + this.hatMetin(toplam) + ' toplam',
            note: canWrite
              ? 'Bu kayda bağlı su, enerji ve kolektör hatlarını haritada çizin ya da KML/KMZ ile içe aktarın. Her tür ayrı renkte görünür, uzunluklar kendiliğinden hesaplanır.'
              : 'Bu kayıtta değişiklik yetkiniz yok — hatlar yalnızca görüntülenir.',
            rows: liste.map(x => ({
              ad: TUR_AD[x.tur] || x.tur,
              renk: TUR_RENK[x.tur] || '#201e1d',
              uzunluk: this.hatMetin(this.hatUzunluk(x.noktalar)),
              nokta: (x.noktalar || []).length + ' nokta'
            })),
            ac: () => this.setState({ hatTam: true }),
            acNote: canWrite
              ? 'Çizim ekranı tam ekranda açılır: soldan hat türünü seçin, haritaya tıklayarak güzergâhı geçin, “Hattı bitir”e basın. Çizilen hatlar ana haritada da görünür — araç menüsündeki “Hat güzergâhları” anahtarıyla kapatılabilir.'
              : 'Çizim ekranı tam ekranda açılır; bu kayıtta değişiklik yetkiniz olmadığı için hatlar yalnızca görüntülenir.',
            temizle: () => {
              if (!canWrite) return;
              if (!window.confirm(sel.code + ' kaydındaki bütün hat güzergâhları silinecek. Onaylıyor musunuz?')) return;
              this.hatKaydet(sel.id, []);
              this.iz(sel.id, 'Hatlar silindi', liste.length + ' güzergâh kaldırıldı.');
              setTimeout(() => this.hatGonder(), 60);
            }
          };
        })(),
        tests: this.testsFor(sel).map(t => {
          const kendi = (s.tests[sel.id] || []).indexOf(t);
          return {
            date: t.date, by: t.by,
            statik: t.statik, dinamik: t.dinamik, dusum: t.dusum,
            debi: t.debi, sure: t.sure, ozgul: t.ozgul, toparlanma: t.toparlanma,
            note: t.note || '—',
            pend: t.pend ? 'Cihazda' : '', pendC: t.pend ? 'var(--color-accent)' : 'transparent',
            // yalnızca bu programdan girilen ölçüm silinebilir; sondaj kaydı yerinde kalır
            silinir: kendi >= 0 && canWrite,
            sil: () => {
              this.setState(st => ({ tests: { ...st.tests, [sel.id]: (st.tests[sel.id] || []).filter((_, k) => k !== kendi) } }));
              this.iz(sel.id, 'Deneme ölçümü silindi', `${t.date} · ${t.debi}`);
              this.duyur(`${t.date} tarihli deneme ölçümü silindi.`, 4000);
            }
          };
        }),
        testsEmpty: this.testsFor(sel).length === 0,
        chart: this.denemeGrafik(sel),
        testNote: 'Kuyu açıldıktan sonra yapılan pompaj denemesi: statik ve dinamik seviye, debi, deneme süresi ve toparlanma. Özgül debi (l/s/m) düşüme bölünerek kendiliğinden çıkar — pompa seçiminde kullanılan değer bu.',
        noteText: s.notes[sel.id] ?? (sel.d.bakim === 'Yeni kayıt' ? '' : ''),
        hasNote: !!(s.notes[sel.id] || '').trim(),
        aktif: {
          aktifMi: aktifMi(sel),
          etiket: aktifAd(sel),
          bg: aktifMi(sel) ? 'transparent' : '#3f4a5a',
          fg: aktifMi(sel) ? ui.fg : '#fff',
          kenar: aktifMi(sel) ? ui.rule : '#3f4a5a',
          dugme: aktifMi(sel) ? 'Pasife al' : 'Aktife al',
          gorunur: canWrite,
          tik: () => this.aktiflikDegistir(sel)
        },
        gitNote: () => this.setState({ detailTab: 'not' }),
        notePlaceholder: 'Erişim yolu, kilit/anahtar kimde, muhtar telefonu, gözle görülen eksik, sonra yapılacak iş — aklınıza geleni buraya yazın.',
        noteMeta: s.notes[sel.id]
          ? `Son yazan: ${me ? me.name : '—'} · ${s.device === 'phone' ? 'Telefon' : 'Bilgisayar'}`
          : 'Henüz not yazılmadı.',
        gecmis: (() => {
          const kendi = (s.log[sel.id] || []).map(r => ({
            t: r.t, ne: r.ne,
            kim: `${r.kim} · ${r.nereden}${r.cevrimdisi ? ' · çevrimdışı girildi' : ''}`,
            detay: r.detay, hasDetay: !!r.detay, fg: ui.acc
          }));
          const kok = [{
            t: sel.source && sel.source.indexOf('KML') === 0 ? '—' : (sel.year ? sel.year : '—'),
            ne: 'Kayıt oluşturuldu',
            kim: sel.source || 'Elle girildi',
            detay: sel.kmlName ? `KML yer imi no ${sel.kmlName} — teknik alanlar boş geldi` : '',
            hasDetay: !!sel.kmlName, fg: ui.mut
          }];
          return [...kendi, ...kok];
        })(),
        gecmisBos: (s.log[sel.id] || []).length === 0,
        gecmisNot: (s.log[sel.id] || []).length === 0
          ? 'Bu oturumda bu kayıtta değişiklik yapılmadı. Not yazma, deneme ekleme, fotoğraf ekleme ve arıza açma işlemleri buraya kim-ne zaman-nereden diye yazılır.'
          : `${(s.log[sel.id] || []).length} değişiklik kayıtlı. Gerçek kurulumda bu geçmiş silinmez, denetimde bu liste sorulur.`,
        rows: (s.detailTab === 'gecmis'
          ? []
          : [
            [sel.type === 'kuyu' ? 'Kuyu barkodu' : 'Tesis barkodu', 'BK-' + sel.code.slice(3)],
            ['Direk barkodu', sel.type === 'kuyu' ? 'BD-' + sel.code.slice(-4) : '—'],
            ...this.rows(sel)
          ]
        ).map(([label, value, hi]) => ({
          label: hi === 2 ? label.toUpperCase() : label,
          value: String(value),
          color: hi === 2 ? ui.acc : (String(value).indexOf('— eksik') === 0 ? ui.acc : (hi ? ui.acc : ui.fg)),
          bg: hi === 2 ? ui.surf2 : (hi === 1 ? ui.pend : 'transparent')
        })),
        // sunucudan gelen gerçek fotoğraflar; bağlantı yoksa eski yer tutucular
        foto: (() => {
          const list = (s.fotolar || {})[sel.dbId];
          const yuk = s.fotoYuk;
          const bagli = !!(this._sb && s.sunucu && sel.dbId);
          return {
            sunucu: true, izgara: bagli,
            list: (list || []).map((f, i) => ({
              url: f.url, alt: sel.code + ' fotoğrafı',
              img: this.imgEl(f.url, sel.code + ' fotoğrafı'),
              ac: () => this.setState({ buyut: { i, dbId: sel.dbId } }),
              indir: () => this.medyaIndir(f.url, `${sel.code}-${(f.yuklendi || '').slice(0, 10)}-${f.id}.jpg`),
              meta: `${f.yukleyen} · ${(f.yuklendi || '').slice(0, 10).split('-').reverse().join('.')}`,
              kb: f.boyut ? Math.round(f.boyut / 1024) + ' KB' : '',
              silinir: f.yazilabilir && this.yazabilir(sel),
              sil: () => this.fotoKaldir(f, sel)
            })),
            bos: bagli ? (!!list && list.length === 0) : true,
            sesler: ((s.kayitliSesler || {})[sel.dbId] || []).map(x => ({
              url: x.url, player: this.audioEl(x.url),
              indir: () => this.medyaIndir(x.url, `${sel.code}-sesli-not-${x.id}.${/mp4|m4a/.test(x.anahtar || '') ? 'm4a' : 'webm'}`),
              meta: `${x.yukleyen} · ${x.sure ? Math.floor(x.sure / 60) + ':' + String(x.sure % 60).padStart(2, '0') : '—'}${x.boyut ? ' · ' + Math.round(x.boyut / 1024) + ' KB' : ''}`,
              silinir: x.yazilabilir && this.yazabilir(sel),
              sil: () => this._sb.fotoSil(x.id).then(r => {
                if (!r.ok) return this.say(r.err, true);
                this.fotoYenile(sel.dbId);
                this.duyur('Sesli not çöp kutusuna taşındı — 30 gün içinde geri getirilebilir.', 5000);
              })
            })),
            yukleniyor: !!yuk,
            yukText: yuk ? `Yükleniyor · ${yuk.biten}/${yuk.toplam}` : '',
            kilitli: !this.yazabilir(sel),
            eklenebilir: this.yazabilir(sel) && !yuk,
            cek: () => this.fotoSec(true),
            galeri: () => this.fotoSec(false),
            note: !this.yazabilir(sel)
              ? `${sel.district} ilçesi — fotoğraf ekleme yetkiniz yok, mevcut fotoğrafları görebilirsiniz.`
              : bagli
                ? 'Fotoğraflar yüklenmeden önce küçültülür — uzun kenar 1600 piksel, dosya yaklaşık 200 KB. Telefonun çektiği kare ile ekranda görülen arasında fark olmaz.'
                : `Bu kayıt henüz ortak veritabanında değil — fotoğraf seçebilirsiniz ama yükleme bağlantı kurulduktan sonra yapılır. Üst şeritteki ${s.sunucu ? 'Yenile' : 'Bağlan'} düğmesi bağlantıyı dener.`
          };
        })(),
        media: Array.from({ length: sel.photos }, (_, i) => {
          const up = sel.sync === 'pending' && i >= sel.photos - 1;
          return { state: up ? (s.offline ? 'Cihazda' : 'Yükleniyor') : 'Yüklendi', bg: up ? 'var(--color-accent)' : ui.fg, fg: up ? '#fff' : ui.bg };
        }),
        mediaEmpty: sel.photos === 0,
        faults: (s.faults.filter(f => f.assetId === sel.id).length
          ? s.faults.filter(f => f.assetId === sel.id)
          : []).map(f => ({
            type: f.type, line: `${f.no} · ${STATUS_LABEL[f.status]} · ${f.priority} · ${f.crew}`,
            dot: priColor(f.priority), tap: () => this.setState({ panel: 'ariza', faultForm: { ...f } })
          })),
        // Açık arıza özeti: sekmeye girildiğinde ilk görülen şey bu
        arizaOzet: (() => {
          const hepsi = s.faults.filter(f => f.assetId === sel.id);
          const acikOlan = hepsi.filter(f => !KAPALI_DURUM.includes(f.status) && f.status !== 'iptal');
          const kapali = hepsi.length - acikOlan.length;
          if (!hepsi.length) {
            return {
              acikVar: false, acikYok: true, kayitVar: false,
              baslik: 'Bu kayıtta arıza geçmişi yok',
              alt: 'Sahada bir sorun görürseniz aşağıdan kayıt açın.',
              fg: ui.mut, yeniLabel: 'Bu kayıt için arıza aç'
            };
          }
          if (!acikOlan.length) {
            return {
              acikVar: false, acikYok: true, kayitVar: true,
              baslik: kapali + ' arıza kapatıldı, açık kayıt yok',
              alt: 'Geçmiş kayıtlar aşağıda; yeni bir sorun için kayıt açabilirsiniz.',
              fg: ui.mut, yeniLabel: 'Bu kayıt için arıza aç'
            };
          }
          const ilk = acikOlan[0];
          const d = sureOn ? this.sureDurum(ilk) : null;
          return {
            acikVar: true, acikYok: false, kayitVar: true,
            baslik: acikOlan.length === 1
              ? 'Bu kayıtta açık arıza var: ' + ilk.no
              : 'Bu kayıtta ' + acikOlan.length + ' açık arıza var',
            alt: ilk.type + ' · ' + (STATUS_LABEL[ilk.status] || ilk.status) + ' · ' + ilk.crew
              + ' · ' + ilk.opened + (d ? ' · hedef ' + d.hedef + ' (' + d.etiket + ')' : ''),
            fg: ui.acc,
            acAd: 'Açık arızayı aç — ' + ilk.no,
            ac: () => this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...ilk } }),
            yeniLabel: 'Yine de ayrı arıza aç'
          };
        })(),
        canEdit: !canWrite ? '.45' : '1',
        editLabel: !canWrite ? 'Yetki yok' : 'Kaydı düzenle'
      } : { tabs: [], rows: [], media: [], faults: [], tests: [], foto: { list: [], sunucu: false, izgara: false } },
      onNote: e => {
        const v = e.target.value, id = sel && sel.id;
        if (id) this.setState({ notes: { ...this.state.notes, [id]: v } });
      },
      saveNote: () => {
        const id = s.selected;
        if (!id) return;
        const metin = (s.notes[id] || '').trim();
        this.iz(id, 'Not güncellendi', metin.slice(0, 90));
        if (metin && sel && sel.dbId && this._sb && this._sb.tokenOku()) {
          const beklet = () => this.notKuyrukYaz([...this.notKuyrukOku(), { dbId: sel.dbId, kod: sel.code, metin, t: Date.now() }]);
          if (s.offline) beklet();
          else this._sb.notEkle(sel.dbId, metin).then(r => {
            if (r && r.ok) this.veriYenile(true);
            else if (r && r.cevrimdisi) beklet();
            else this.say((r && r.err) || 'Not sunucuya yazılamadı.', true);
          });
        }
        this.say(s.offline ? 'Not cihaza yazıldı — bağlantı gelince eşitlenecek. Değişiklik Geçmiş sekmesine işlendi.' : 'Not kaydedildi ve Geçmiş sekmesine işlendi.');
      },
      status: {
        bg: s.offline ? 'var(--color-uyari)' : ui.surf, fg: s.offline ? '#fff' : ui.mut,
        mut: s.offline ? 'rgba(255,255,255,.8)' : ui.mut,
        text: s.offline ? 'Çevrimdışı — kayıtlar cihazda tutuluyor, bağlantı gelince arka planda eşitlenecek'
          : (s.sunucu
              ? `Ortak veritabanı bağlı${s.sonEsitleme ? ' · son eşitleme ' + s.sonEsitleme : ''}${pendA.length + pendF.length ? ' · ' + (pendA.length + pendF.length) + ' bekleyen işlem' : ''}`
              : `Cihazdaki kopya — ortak veritabanına bağlı değil${pendA.length + pendF.length ? ' · ' + (pendA.length + pendF.length) + ' bekleyen işlem' : ''}`),
        right: `${s.assets.length} envanter kaydı · ${s.faults.length} arıza · sürüm ${SURUM}`
      },
      toast: { show: !!s.toast, text: s.toast || '' },
      extendNotes: [
        'Yeni envanter türü: asset_type enum + 1:1 detay tablosu.',
        'Yeni alan: field_defs kaydı — arayüz kod değişmeden büyür.',
        'Yeni modül: sol menüye tab, aynı sync sözleşmesi.'
      ],
      notes: [
        { t: 'Nüfus dosyası olduğu gibi yükleniyor', d: 'Yerleşim ekranındaki yükleme, ilettiğiniz “kırşehir Belde_Köy Nüfusu” dosyasını artık hiç elle düzeltmeden okuyor. Dört şey değişti: (1) başlık satırı tanınıyor, sütun sırası önemli değil — Yıl · İlçe · Köy · Nüfus Sayısı sırası da, önceki Köy · İlçe · Nüfus sırası da geçerli; (2) Excel’in Türkçe (ANSI/Windows-1254) kaydettiği dosyalarda harfler bozulmuyor; (3) ilçe adı yalnızca grubun ilk satırında yazılıysa alttaki satırlara kendiliğinden taşınıyor; (4) köy adındaki “Köy” eki ve küçük yazım farkları (Çuğun/Çoğun, Karın/Karkın, Taşlıoluk/Taşoluk, Hirfanlı/Hirfanlar gibi) eşleştirilebiliyor. Dosyanın 252 satırının tamamı resmî köy listesindeki karşılığına oturdu. Hayvan sayıları dosyada yok; ayrı bir dosyayla yüklerseniz nüfusların üzerine yazılmaz, yanına eklenir.' },
        { t: 'Giriş: kullanıcı adı + şifre', d: 'Rol seçme düğmeleri kalktı. Kullanıcı adı ve şifre girilir, yetki hesaptan gelir. Giriş düğmesi kartın alt şeridinde, sağda. Tek yönetici hesabı: a.bertan (şifresi kendisine ait). Diğer deneme hesapları f.yilmaz / a.demir / m.sahin / m.kaya — şifre 1234.' },
        { t: 'Özel saha cihazı yok', d: 'LT/S cihaz ataması kaldırıldı. Herkes elinin altındaki cihazdan girer — telefon ya da bilgisayar, aynı hesap ikisinde de çalışır. Oturumun hangi cihazdan açıldığı yalnızca kayıt geçmişi için loglanır (Ayarlar > Kullanıcılar ve son oturumlar).' },
        { t: '“Beni hatırla” gerçekten çalışıyor', d: 'İşaretli girdiğinizde kullanıcı adı ve şifre bu cihaza kaydedilir; programı bir daha açtığınızda giriş ekranı hiç gelmez, doğrudan haritaya düşer. Çıkış yapmak bu kaydı silmez — silmek için ayrı “Kayıtlı girişi sil” düğmesi var (aşağıdaki maddeye bakın). Gerçek kurulumda saklanan şey şifre değil, süreli oturum anahtarı olur.' },
        { t: 'AG pano bilgileri düzeltildi', d: 'Beton köşk seçeneği kaldırıldı — pano tipi Sac veya Poliester. Trafo tipi diye ayrı alan geldi: direk tipi (tek direk / çift direk). Trafo güçleri de sizin ölçeğinize çekildi: 25-50-100-160 kVA.' },
        { t: 'İlçe merkezleri artık resmî HGM verisi', d: 'Harita Genel Müdürlüğü’nün “Yerleşim Noktası” veri setinden (Lambert Conformal Conic TC1M projeksiyonundan WGS84’e çevrilerek) yedi ilçe merkezinin resmî koordinatı programa işlendi. 264 kuyunun ilçe ataması bu doğru merkezlere göre yeniden hesaplandı: Mucur 49, Kaman 47, Akpınar 44, Akçakent 37, Boztepe 35, Merkez 28, Çiçekdağı 24. Not: bu veri seti yalnızca il ve ilçe merkezlerini içerir (1003 nokta) — köy noktası yok, o yüzden köy konumu sorunu bu dosyayla kapanmıyor.' },
        { t: 'Köy konumları programa gömüldü — internet gerekmiyor', d: 'HGM “Türkiye ve Çevresi Coğrafi Ad Dizini”nden Kırşehir ve çevresine düşen 1043 yerleşim noktası (962 köy, 43 bucak, 31 ilçe, 4 il merkezi) programın içine yazıldı; 260’ının ilçesi resmî köy listesinden geliyor, tahmin değil. Köy araması artık tamamen çevrimdışı: yazıp Enter’a basınca harita doğrudan köye gider, hiçbir servise sorulmaz. Sıra: (1) sizin elle işaretlediğiniz konum; (2) gömülü HGM listesi; (3) kayıt ortalaması. Elle işaretleme yedek olarak duruyor — listede olmayan bir mezra için ya da bir kaydı düzeltmek için.' },
        { t: '264 gerçek kuyu aktarıldı', d: '“KUYU YERLERİ 2026 SON.kml” dosyasındaki 264 yer imi programa işlendi ve kuyu envanterinin yerini aldı: kodlar KS-KUY-0001 … KS-KUY-0264, koordinatlar dosyadaki değerler (yaklaşık değil, gerçek), ilçe en yakın ilçe merkezine göre atandı — Kaman 49, Mucur 49, Akpınar 41, Akçakent 38, Boztepe 36, Merkez 28, Çiçekdağı 23. Teknik alanların tamamı boş: köy, yapım yılı, derinlik, debi, pompa bilgileri hepsi “— eksik” görünür ve Özet ekranındaki eksik listesinde birikir. Kaydın Bilgi sekmesinin sonunda hangi KML yer iminden geldiği yazar.' },
        { t: 'Kayıt geçmişi — kim, ne zaman, nereden', d: 'Kaydın Geçmiş sekmesi artık gerçek. Her değişiklik satır olarak yazılır: ne yapıldı, hangi tarih ve saat, kim yaptı, telefondan mı bilgisayardan mı, çevrimdışı mı girildi. Not güncellemesi, deneme ekleme, arıza açma, geri getirme — hepsi işlenir. Alt satırda kaydın kökeni durur (KML aktarımı ya da elle giriş). Gerçek kurulumda bu geçmiş silinmez; denetimde sorulan liste budur.' },
        { t: 'Çöp kutusu — silinen kayıt kaybolmuyor', d: 'Kayıt detayında “Sil” düğmesi geldi (yalnızca Yönetici ve Müdür görür). Silinen kayıt yok olmaz, çöp kutusuna düşer ve 30 gün bekler: Ayarlar > Çöp kutusu. “Geri getir” ile bütün alanları, fotoğrafları ve geçmişi olduğu gibi döner; geri getirme işlemi de geçmişe yazılır. Süre sonunda kalıcı silinir.' },
        { t: 'Tüm alanlarda arama', d: 'Arama artık yalnızca kod, köy ve koordinatta değil — bütün teknik alanlarda geçiyor. “Grundfos” yazınca o markanın takılı olduğu kuyular, “kireçtaşı” yazınca kuyu logunda o tabaka geçen kuyular, “kolon” yazınca o türde arızası olan tesisler listelenir. Sonuçta hangi alanda bulunduğu da yazılır: “Pompa markası: Grundfos”. Arıza numarası, arıza türü ve saha notları da taranır.' },
        { t: 'Tesis kartı — A4, sahaya götürülür', d: 'Kayıt detayında “Tesis kartı” düğmesi: tek sayfa A4 çıktı — kod, tür, köy, koordinat, barkod, yapım yılı ve doldurulmuş bütün teknik alanlar iki kolonda, altında saha notu ve imza yeri. Doldurulmamış alanlar karta yazılmaz, sayfa boş satırla dolmaz. Yazdır düğmesi doğrudan yazıcıya ya da PDF’e verir.' },
        { t: 'Haritadan koordinat alma', d: 'Harita menüsünde “Koordinat al” düğmesi: açıp istediğiniz noktaya dokunduğunuzda alt şeritte koordinat üç biçimde birlikte çıkıyor — WGS84 ondalık, Google’ın derece-dakika-saniye biçimi ve ITRF96-3° sağa/yukarı (dilim otomatik seçiliyor). Yanındaki düğmeler: Kopyala (panoya alır), Dönüştürücüye at, Buraya tesis kur (yeni kayıt formunu o koordinatla açar). Dokunduğunuz nokta haritada kırmızı halkayla işaretli kalıyor.' },
        { t: 'Çıkış tek yerde', d: 'Çıkış düğmesi iki yerdeydi — üst şeritte ve kenar çubuğunun altında. Alttaki kaldırıldı; çıkış artık yalnızca sağ üstte. Kenar çubuğundaki oturum kartında sadece “Kayıtlı girişi sil” kaldı: o şifreyi cihazdan siler (ortak bilgisayara geçerken), çıkış yapmak kaydı silmez.' },
        { t: 'Haritadaki ilçe adları kaldırıldı', d: 'İlçe merkezlerinin adları haritada sürekli yazılı duruyordu; kapatma düğmesi vardı ama program yeniden açılınca ayar sıfırlanıyordu. Etiketler tümden kaldırıldı, düğme de menüden kalktı. İlçe merkezleri kırmızı nokta olarak duruyor — üstüne dokununca adı, nüfusu ve köy sayısı çıkıyor.' },
        { t: 'Üçüncü koordinat sistemi bağlandı', d: 'Koordinat dönüşümü artık üç sistemi karşılıklı çeviriyor: ITRF96-3°, ED50 3° ve Google’ın verdiği WGS84 / derece-dakika-saniye. Google Maps’te bir noktaya sağ tıklayıp koordinatı kopyaladığınızda çıkan 39°08\'46.3"N biçimini olduğu gibi yapıştırabilirsiniz; ondalık derece de kabul edilir. Hangi sistemden girerseniz diğer üçü birlikte görünür, “Haritada göster” ile o noktaya gider.' },
        { t: 'Konum listesi kaldırıldı', d: 'Ayarlar’daki köy konumu doğruluk listesi kaldırıldı — köy konumları programın içinde gömülü olduğu için gereksizdi. Yerine tek bir “Elle işaretlenmiş konumları temizle” düğmesi kaldı.' },
        { t: 'Konuma gitme düzeltildi', d: 'Bakım, Özet ve envanter listelerinde bir kayda dokununca harita yanlış yere gidiyordu — konum bilgisi haritaya iletilmiyordu, harita önceki yerinde kalıyordu. Dört yerde de düzeltildi: artık dokunulan kaydın kendi koordinatına gidiyor. Bakım satırlarına ayrıca “Yol tarifi” düğmesi geldi.' },
        { t: 'Arıza formunda konum ve iş emri', d: 'Arıza formu başlığının altında üç düğme: “Haritada göster” kaydı haritada bulur, “Konuma git” bulunduğunuz yerden tesise yol tarifi çizer, “İş emri” arıza türü, öncelik, ekip, konum, malzeme ve maliyet dökümünü tek sayfada hazırlar. Kaydın koordinatı da yanında yazar.' },
        { t: 'Arıza maliyeti ve malzeme', d: 'Arıza formunda “Kullanılan malzeme” bölümü: dalgıç pompa, motor, kolon borusu, kablo, termik, kontaktör, klor tableti, vinç gibi 16 kalem birim fiyatıyla listeli — dokununca eklenir. Altta maliyet üç kutuda görünür: malzeme, işçilik, toplam. İşçiliği elle girebilir ya da boş bırakıp süreden hesaplatabilirsiniz (saat × 320 ₺).' },
        { t: 'Sesli not ve fotoğraf işaretleme', d: 'Arıza formunda sesli not düğmesi var — sahada yazmak yerine konuşup bırakırsınız, kayıt süresiyle listelenir, çevrimdışıysa cihazda bekler. Fotoğraflara dokununca işaretleme açılır: ok (arızalı parçayı göster), daire (bölgeyi çevrele), yazı (ölçü veya açıklama). İşaretler ayrı katman olarak durur, fotoğrafın aslı bozulmaz.' },
        { t: 'Arıza bildirimi — SMS / WhatsApp', d: 'Acil veya yüksek öncelikli arıza kaydı açıldığında atanan ekibe ve ekip şefine mesaj gider: öncelik, kayıt kodu, köy ve arıza türü. Ayarlar > Arıza bildirimi bölümünden kanal (SMS, WhatsApp, ikisi birlikte) ve eşik (yalnızca acil / acil ve yüksek / bütün arızalar) seçilir; deneme mesajı düğmesi de var. Çevrimdışı açılan kayıtta mesaj bağlantı gelince gönderilir.' },
        { t: 'Bakım takvimi — yeni ekran', d: 'Menüde Bakım: geciken bakımlar (kaç gün geciktiği kırmızı yazar), 30 gün içinde sırası gelenler, bakım kaydı olmayanlar. Periyot kuyularda 6 ay, depo ve elektrik tesislerinde 12 ay; son bakım tarihinden sonraki tarih kendiliğinden hesaplanır. Her satırda “Yapıldı” düğmesi var — bastığınızda tarih bugüne çekilir, kayıt eşitleme kuyruğuna girer ve sonraki bakım günü yeniden hesaplanır.' },
        { t: 'Bugün — günlük iş listesi', d: 'Menüde Bugün: açık arızalar, geciken bakımlar ve bilgisi çok eksik kayıtlar tek listede, üstten aşağı çalışılacak sırada. Her satır ilgili kaydı doğrudan açar. Ekibi olan kullanıcıda ekip adı başlıkta görünür.' },
        { t: 'Özet ekranı — yeni', d: 'Menüde Özet: toplam sayılar, ilçe bazında dağılım (çubuklu), en çok kayıtlı 12 köy, eksik bilgisi olan kayıtlar listesi (dokununca kayıt açılır), bu hafta yapılanlar ve size en yakın 8 tesis — her birinin yanında yol tarifi. Üstte Excel’e aktar ve PDF rapor düğmeleri.' },
        { t: 'Deneme karşılaştırma grafiği', d: 'Kuyu kaydının Deneme sekmesinde: her deneme için debi çubuğu, üstünde yıl ve değer; kırmızı çizgi özgül debinin yıllara göre gidişi. İki veya daha çok ölçüm olunca görünür — kuyunun zayıflayıp zayıflamadığı tek bakışta anlaşılır.' },
        { t: 'Dış veri aktarımı — yeni ekran', d: 'Ayarlar > Dış veri aktarımı: Google Earth (KML/KMZ), Excel/CSV, Google Sheets bağlantısı veya GPX dosyasındaki noktalar bir kerede okunur. Noktalar liste hâlinde gelir; adında “kuyu” veya “depo” geçenlerin türü kendiliğinden tahmin edilir, kalanları tek tek veya toplu seçip işaretlersiniz. Kaydedilen noktada ad, konum, köy ve ilçe dolu olur; teknik alanlar ve deneme değerleri sahada girilir. Ekran çalışma ekranlarında durmaz — genellikle bir kez kullanılır.' },
        { t: 'Deneme (pompaj deneme) sekmesi — yeni', d: 'Kuyu kaydında ayrı bir Deneme sekmesi var: her ölçüm için tarih, statik seviye, dinamik seviye, debi, deneme süresi, toparlanma süresi ve deneme notu. Düşüm ve özgül debi (l/s/m) siz yazarken kendiliğinden hesaplanır. Ölçümler üst üste birikir — kuyunun yıllar içinde nasıl davrandığı tek ekranda görülür; çevrimdışı girilen ölçüm cihazda bekler.' },
        { t: 'Her kayda serbest not', d: 'Kayıt detayında Not sekmesi, arıza formunda ve yeni tesis formunda not alanı var — erişim yolu, anahtar kimde, muhtar telefonu, sonra yapılacak iş. Sahada aklınıza gelen her şey kaydın içinde kalır.' },
        { t: 'Pompa hesap programı bağlantısı — sonraki aşama', d: 'Kuyu ve direk barkodu kayıtta alan olarak duruyor. Pompa hesap programınız aynı barkodu okuduğunda hesaplanan pompa değerleri (kademe, motor gücü, kolon çapı, kalkış tipi) bu kayda kendiliğinden yazılabilir. Bağlantı kurulana kadar alanlar elle doldurulur — veri yapısı buna hazır.' },
        { t: 'Fotoğraf deposu: Cloudflare R2', d: 'Fotoğraflar veritabanına değil R2 kovasına gider; veritabanında yalnızca adres durur. Telefonda çekilen kare yüklenmeden küçültülür (uzun kenar 1600 px, ~300 KB) ve ayrıca ~30 KB önizleme üretilir — listelerde önizleme, tam kare yalnızca dokununca iner. Ücretsiz katman 10 GB ≈ 30-50 bin fotoğraf; indirme ücreti yok. Çevrimdışı çekilen kareler cihazda bekler, bağlantı gelince kuyruk sırayla yükler.' },
        { t: 'Rol hiyerarşisi (yeni)', d: 'Yukarıdan aşağıya: 1 Yönetici (her şey) · 2 Müdür (onay, silme, rapor — kullanıcı yönetimi hariç) · 3 Mühendis (envanter kurar/düzenler, iş atar) · 4 Arıza Şefi (arızayı yönetir, ekip atar, kapatır) · 5 Arıza Personeli (güncelleme, fotoğraf, arıza kaydı). 10 yetki × 5 rol matrisi Ayarlar ekranında; dağıtımı yalnızca Yönetici yapar.' },
        { t: 'Menü ve ayarlar nerede', d: 'Menü masaüstünde solda kenar çubuğu, telefonda alt çubuk. Ayarlar açılır pencere değil, menüden açılan ayrı bir ekran — telefonda Yerleşim ve Kuyruk ekranlarına da buradan girilir.' },
        { t: 'İşlem ekranı — dört senaryo', d: 'Yeni tesis kur · Mevcut tesise gir · Bilgi güncelle · Fotoğraf ekle. Yeni tesis formunda tür, ilçe, köy, yapım yılı, konum ve fotoğraf var; kayıt açıldığında haritaya düşer ve eşitleme kuyruğuna girer.' },
        { t: 'GİT — standart saha konumu', d: 'Telefon haritasında büyük kırmızı GİT düğmesi ve yeni tesis formundaki GİT konumu alır (cihaz GPS’i varsa ondan, yoksa standart saha konumundan) ve haritayı oraya götürür.' },
        { t: 'Uydu fotoğrafı', d: 'Harita zemini üç seçenekli: Sokak (OpenStreetMap), Uydu (Esri World Imagery) ve Uydu + ad (uydunun üstüne köy/yol adları). Ayarlar’dan veya haritanın sağ üstündeki menüden değiştirilir.' },
        { t: 'Harita menüsü toplandı', d: 'Sağ üstteki düğme yığını tek bir “Harita menüsü” düğmesine indi — açılıp kapanıyor, haritayı sürüklediğinizde kendiliğinden kapanıyor. Sol alttaki bilgi kutusu kaldırıldı; aynı bilgi Ayarlar ve Değişiklikler ekranında duruyor.' },
        { t: 'Ulaşım / yol tarifi', d: 'Uydu açıldıktan sonra kayıtlar arasında gezinme: kayıt panelindeki “Yol tarifi” konumunuzdan tesise karayolu güzergâhını çizer, km ve dakika verir, “Telefonda aç” ile navigasyona devreder. Servis kapalıysa kuş uçuşu mesafeye düşer ve bunu söyler.' },
        { t: 'Masaüstü + telefon', d: 'Aynı durum, iki yerleşim: 1440 masaüstü (kenar çubuğu + sağ panel) ve 392 telefon. Üstteki düğmelerle geçiş yapın.' },
        { t: 'Gerçek harita', d: 'Zemin artık OpenStreetMap: gerçek yollar, arazi ve yerleşim adları. Fare tekerleği ile yakınlaşır, sürükleyerek gezinir; kayıt kod etiketleri z12’den sonra açılır.' },
        { t: 'Yapım yılı', d: 'Kuyu (sondaj), depo, AG pano (kurulum) ve GES (devreye alma) yıllarının hepsi detay panelinin ilk satırında, vurgulu.' },
        { t: 'Arıza modülü', d: 'Arıza personeli girişi: kayıt, türe göre değişen arıza listesi, öncelik, ekip, süre, fotoğraf ve Açık→Atandı→Sahada→Çözüldü iş akışı.' },
        { t: 'Koyu tema', d: 'Envanter satırları artık yüzey/kural renklerinden geliyor; kırmızı yalnızca dolgu olarak, küçük punto etiketlerde accent-400 ramp adımı.' },
        { t: 'Kullanıcı girişi ve atama', d: 'Giriş kullanıcı adı ve şifre ile yapılır, rol hesaptan gelir. Ekip atamasını Mühendis, Müdür, Yönetici ve Arıza Şefi yapar; arıza personeli yalnızca kendi ekibine atanan kayıtları görür ve durumunu günceller.' },
        { t: 'Modül anahtarı', d: 'Arıza ve Yerleşim sekmeleri Tweaks panelinden kapatılabilir; kapalıyken menüden ve haritadaki arıza düğmesinden kalkar.' },
        { t: 'Resmî köy listesi', d: 'İlettiğiniz “İlçe ve Köyleri” listesindeki 252 köy, yazımıyla birlikte veri setine girdi — Çiçekdağı’nın 45 köyü dahil.' },
        { t: 'Kalan boşluk', d: 'Köy düzeyi nüfus ve hayvan varlığı sayıları hâlâ yok — köy nüfusları TÜİK ADNKS köy ekstresinden, büyükbaş/küçükbaş sayıları Tarım ve Orman Bakanlığı il müdürlüğü ekstresinden gelecek. Kuyu ve köy konumları tamam: 264 kuyu KML’den, 1043 yerleşim HGM coğrafi ad dizininden gömülü — köy araması dış servise ihtiyaç duymuyor.' }
      ],
      sources: m ? [
        `Nüfus: ${m.PROVINCE.source} — il ${fmt(m.PROVINCE.population2025)}, Merkez ${fmt(m.DISTRICTS[0].pop)} (${m.DISTRICTS[0].popYear}).`,
        `Köy adları: ilettiğiniz resmî “İlçe ve Köyleri” listesi — ${m.VILLAGE_TOTAL} köy (Merkez 53, Kaman 50, Çiçekdağı 45, Mucur 44, Akpınar 26, Akçakent 20, Boztepe 14).`,
        'Harita zemini: OpenStreetMap (© OpenStreetMap katkıcıları) ve Esri World Imagery (Esri, Maxar, Earthstar Geographics) uydu karoları — ikisi de gerçek servis. Kurum lisanslı bir uydu/ortofoto servisi (ör. HGM, Tapu Kadastro) aynı yere takılabilir.',
        'Yol tarifi: OSRM açık kaynak yönlendirme servisi (deneme sunucusu) — karayolu güzergâhı, mesafe ve süre gerçek hesaplamadır; erişim yoksa kuş uçuşu tahmine düşer ve ekranda öyle yazar.',
        (() => {
          const yv = Object.values(s.yerlesimVeri || {});
          const nf = yv.filter(x => x.nufus != null).length;
          const hv = yv.filter(x => x.buyukbas != null || x.kucukbas != null).length;
          if (!nf && !hv) return 'Köy düzeyi nüfus ve hayvan sayıları henüz yok; uydurulmadı, içe aktarım için boş bırakıldı.';
          return `Köy düzeyi veri: yüklenen dosyadan ${fmt(nf)} yerleşim nüfusu` + (hv ? `, ${fmt(hv)} yerleşim hayvan sayısı` : ' (hayvan sayıları henüz yüklenmedi)') + ' — değerler dosyadan geldiği gibidir, hesaplanmadı.';
        })(),
        `Hayvan varlığı: TÜİK 2024 ulusal referans (sığır ${fmt(m.LIVESTOCK_NATIONAL_2024.sigir)}, koyun ${fmt(m.LIVESTOCK_NATIONAL_2024.koyun)}, keçi ${fmt(m.LIVESTOCK_NATIONAL_2024.keci)}); il/ilçe/köy kırılımı Tarım ve Orman Bakanlığı İBS ekstresinden gelecek.`,
        'Kuyu konumları KUYU YERLERİ 2026 SON.kml dosyasından gelir (264 nokta, gerçek koordinat); depo/AG/GES örnek kayıtlarının konumu ilçe merkezinden türetilmiştir. Her kaydın “Koordinat kaynağı” satırı hangisi olduğunu yazar.'
      ] : ['Veri yükleniyor…'],