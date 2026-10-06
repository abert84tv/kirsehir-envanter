      ayar: (() => {
        const a = tabId === 'ayarlar';
        const sec = ayarBolumu(s.ayarBolum);
        const v = id => a && sec === id;
        return {
          // Liste yalnız hiçbir bölüm seçili değilken görünür
          listeAcik: a && !sec,
          detay: a && !!sec,
          bolumAd: ayarAdi(sec),
          geri: () => this.setState({ ayarBolum: null }),
          gorunum: v('gorunum'), veri: v('veri'), yetki: v('yetki'),
          ekip: v('ekip'), kvkk: v('kvkk'), modul: v('modul'), entegrasyon: v('entegrasyon'),
          bildirim: v('bildirim'), koyeslestir: v('koyeslestir'),
          denetim: tabId === 'denetim', cop: tabId === 'cop'
        };
      })(),