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