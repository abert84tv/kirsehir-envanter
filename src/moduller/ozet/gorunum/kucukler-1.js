      exportReport: kind => () => kind === 'excel' ? this.excelVer() : this.pdfVer(),
      exportExcel: () => this.excelVer(),
      exportPdf: () => this.pdfVer(),