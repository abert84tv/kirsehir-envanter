      ayar: (() => {
        const a = tabId === 'ayarlar';
        const sec = ayarAcik(s);
        const v = id => a && sec === id;
        return {
          // Liste yalnız hiçbir bölüm seçili değilken görünür
          listeAcik: a && !sec,
          detay: a && !!sec,
          bolumAd: ayarAdi(sec),
          geri: () => this.setState({ ayarBolum: null }),
          gorunum: v('gorunum'), veri: v('veri'), yetki: v('yetki'), vekalet: v('vekalet'),
          ekip: v('ekip'), personel: v('personel'), kvkk: v('kvkk'), modul: v('modul'),
          uyari: v('uyari'), yapayzeka: v('yapayzeka'), konum: v('konum'),
          // uyarı / yapay zekâ / konum bölümleri aynı kart şablonunu paylaşır (entegrasyon.kartlar bölüme göre süzülür)
          entegrasyon: v('uyari') || v('yapayzeka') || v('konum'),
          bildirim: v('bildirim'), koyeslestir: v('koyeslestir'),
          denetim: tabId === 'denetim', cop: tabId === 'cop'
        };
      })(),