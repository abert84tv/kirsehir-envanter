      // Ayarlar listesi — beş başlık (AYAR_GRUP). Her başlığın altındaki eski bölümler, açılan sayfanın üstünde sekme olur.
      // Rol, modül ve sayfa yetkisi (ayarGoster) görünmeyen bölümü listeden de sekmeden de çıkarır.
      ayarListe: (() => {
        const sec = ayarAcik(s);
        const aktifUye = AYAR_TAB[tabId] ? tabId : (tabId === 'ayarlar' ? sec : null);
        const copSay = s.trash.length + (s.cop || []).length;
        const satirlar = AYAR_GRUP.map(([gid, ad, alt, uyeler]) => {
          const gorunen = uyeler.filter(ayarGoster);
          if (!gorunen.length) return null;
          const aktif = gorunen.includes(aktifUye);
          return {
            ad, alt,
            aktif,
            zemin: aktif && tabId === 'ayarlar' ? ui.sel : 'transparent',
            renk: aktif && tabId === 'ayarlar' ? ui.acc : ui.fg,
            rozet: gorunen.includes('cop') && copSay ? String(copSay) : '',
            git: () => ayarGit(gorunen[0])
          };
        }).filter(Boolean);
        return satirlar.length ? [{ baslik: '', satirlar }] : [];
      })(),
