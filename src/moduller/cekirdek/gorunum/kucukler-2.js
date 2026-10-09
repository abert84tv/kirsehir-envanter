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
          tamTog: () => { const v = !this.state.telTam; this.setState({ telTam: v }); try { document.documentElement.classList.toggle('ks-tam', v); } catch (e) { /* belge yok */ } setTimeout(() => { const w = this.mapWin(); const p = this.profilWin(); try { w && w.dispatchEvent(new Event('resize')); p && p.dispatchEvent(new Event('resize')); } catch (e) { /* çerçeve yok */ } }, 120); }
        };
      })(),
      telMenu: {
        acik: !!s.telMenuAcik, kenar: s.telMenuAcik ? 'var(--color-accent)' : ui.rule,
        zemin: s.telMenuAcik ? 'var(--color-accent)' : 'transparent', yazi: s.telMenuAcik ? '#fff' : ui.fg,
        ac: () => this.setState({ telMenuAcik: !this.state.telMenuAcik }),
        kapat: () => this.setState({ telMenuAcik: false }),
        ogeler: (() => {
          const k = fn => () => { this.geziMenu(); this.setState({ telMenuAcik: false }); fn(); };
          return [
            { ikon: '▮', ad: 'Barkod okut', renk: ui.fg, git: k(() => this.barkodAc()) },
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