      // Toplu veri girişi ve yedek (Ayarlar > Kayıt araçları / Veri)
      topluGiris: {
        kuyuSablon: () => this.topluSablon('kuyu'), depoSablon: () => this.topluSablon('depo'),
        yukle: () => this.topluYukle(), yedek: () => this.yedekIndir(),
        kuyuSayi: (s.assets || []).filter(a => a.type === 'kuyu').length, depoSayi: (s.assets || []).filter(a => a.type === 'depo').length
      },
