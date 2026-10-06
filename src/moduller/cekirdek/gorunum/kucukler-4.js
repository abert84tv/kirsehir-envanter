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