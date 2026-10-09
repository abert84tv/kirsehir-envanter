      // Toplu veri girişi ve yedek (Ayarlar > Kayıt araçları / Veri)
      topluGiris: {
        kuyuSablon: () => this.topluSablon('kuyu'), depoSablon: () => this.topluSablon('depo'),
        yukle: () => this.topluYukle(), yedek: () => this.yedekIndir(),
        kuyuSayi: (s.assets || []).filter(a => a.type === 'kuyu').length, depoSayi: (s.assets || []).filter(a => a.type === 'depo').length
      },
      // Barkod okuma katmanı
      barkod: (() => {
        const b = s.barkodTara;
        return {
          acik: !!b, mesaj: b ? b.mesaj : '', deger: b ? b.deger || '' : '', kameraVar: !!(b && b.kamera),
          ac: () => this.barkodAc(), kapat: () => this.barkodKapat(),
          onYaz: e => this.setState({ barkodTara: { ...this.state.barkodTara, deger: e.target.value } }),
          ara: () => this.barkodBul((this.state.barkodTara || {}).deger),
          anahtar: e => { if (e.key === 'Enter') this.barkodBul((this.state.barkodTara || {}).deger); }
        };
      })(),
