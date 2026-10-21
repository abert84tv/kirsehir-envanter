      exportReport: kind => () => kind === 'excel' ? this.excelVer() : this.pdfVer(),
      exportExcel: () => this.excelVer(),
      exportPdf: () => this.pdfVer(),
      // Özet sayfasındaki "Rapor" paneli: Genel rapor, İlçe raporu, Köy karnesi (seçilen köy)
      rapor: {
        acik: s.raporPanel !== false, tog: () => this.raporPanelAc(),
        genel: () => this.raporGenel(), ilce: () => this.raporIlce(),
        koyler: s.raporPanel ? this.raporKoyListe() : [],
        koy: s.raporKoy || '', onKoy: e => this.raporKoySec(e.target.value),
        karne: () => this.raporKoy(this.state.raporKoy), karneHazir: !!s.raporKoy,
        karneOp: s.raporKoy ? '1' : '.5'
      },