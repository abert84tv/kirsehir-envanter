      ayar: (() => {
        const a = tabId === 'ayarlar';
        const sec = ayarAcik(s);
        const v = id => a && sec === id;
        return {
          // Liste yalnız hiçbir bölüm seçili değilken görünür
          listeAcik: a && !sec,
          detay: a && !!sec,
          bolumAd: ayarAdi(sec),
          // Aynı başlığın öteki bölümleri üst sekmeler olarak (tek bölümlü başlıkta sekme çıkmaz)
          altSekmeler: (() => {
            const g = AYAR_GRUP.find(x => x[3].includes(sec));
            const uyeler = g ? g[3].filter(ayarGoster) : [];
            return uyeler.length < 2 ? [] : uyeler.map(id => ({
              ad: (AYAR_BOLUMLER.find(b => b[0] === id) || [, id])[1], aktif: id === sec,
              bg: id === sec ? 'var(--color-accent)' : 'transparent', fg: id === sec ? '#fff' : ui.fg, kenar: id === sec ? 'var(--color-accent)' : ui.rule,
              git: ayarGit(id)
            }));
          })(),
          altVar: a && !!sec && (() => { const g = AYAR_GRUP.find(x => x[3].includes(sec)); return !!g && g[3].filter(ayarGoster).length > 1; })(),
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