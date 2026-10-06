      imp: (() => {
        const im = s.imp;
        const setRow = (i, patch) => this.setState({ imp: { ...im, rows: im.rows.map(r => r.i === i ? { ...r, ...patch } : r) } });
        const rows = im ? im.rows : [];
        const typed = rows.filter(r => r.type);
        return {
          step1: !im, step2: !!im,
          allowed: can('create'),
          source: im ? im.source + (im.dosya ? ' · ' + im.dosya : '') : '',
          sources: [
            ['Google Earth / My Maps (KML, KMZ)', 'Yer imlerinin adı ve nokta koordinatı okunur (NetCAD’den KML/KMZ çıktısı da olur)'],
            ['Excel / CSV', 'Başlıkta “enlem” ve “boylam” (ya da lat/lon) sütunu olan tablo — WGS84 ondalık derece; Excel’de “CSV olarak kaydet”'],
            ['GPS cihazı (GPX)', 'El cihazından indirilen nokta (waypoint) dosyası']
          ].map(([label, desc]) => ({ label, desc, pick: () => this.makeImport(label) })),
          rows: rows.map(r => ({
            name: r.name,
            place: `${r.village || 'köy bulunamadı'} · ${r.district || '—'}`
              + (!r.icinde ? ' · İL SINIRI DIŞI — aktarılmaz' : (r.kayitli ? ' · 30 m içinde ' + r.kayitli + ' kayıtlı' : '')),
            coord: `${r.lat} , ${r.lon}`,
            typeLabel: r.type ? TYPES[r.type].kind : (!r.icinde ? 'Aktarılmaz' : (r.kayitli ? 'Zaten kayıtlı olabilir' : 'Tür seçilmedi')),
            typeFg: r.type ? ui.fg : ui.acc,
            rowBg: r.sel ? ui.sel : 'transparent',
            check: r.sel ? '■' : '□',
            toggle: () => setRow(r.i, { sel: !r.sel }),
            types: Object.keys(TYPES).map(k => ({
              label: TYPES[k].label,
              bg: r.type === k ? 'var(--color-accent)' : 'transparent',
              fg: r.type === k ? '#fff' : ui.mut,
              pick: () => r.icinde ? setRow(r.i, { type: k }) : this.say('Bu nokta il sınırının dışında — aktarılmaz.')
            }))
          })),
          count: rows.length + ' nokta okundu' + (rows.filter(r => r.kayitli).length ? ' · ' + rows.filter(r => r.kayitli).length + ' tanesi zaten kayıtlı olabilir' : ''),
          typedCount: typed.length + ' / ' + rows.length + ' noktada tür işaretli',
          ready: typed.length > 0,
          untypedNote: typed.length === rows.length
            ? 'Hepsi işaretli — kaydedebilirsiniz.'
            : (rows.length - typed.length) + ' nokta türsüz; işaretlenmeyenler aktarılmaz.',
          bulk: Object.keys(TYPES).map(k => ({
            label: 'Seçilenler → ' + TYPES[k].label,
            pick: () => this.setState({ imp: { ...im, rows: im.rows.map(r => r.sel && r.icinde ? { ...r, type: k } : r) } })
          })),
          selectAll: () => this.setState({ imp: { ...im, rows: im.rows.map(r => ({ ...r, sel: true })) } }),
          selectNone: () => this.setState({ imp: { ...im, rows: im.rows.map(r => ({ ...r, sel: false })) } }),
          back: () => this.setState({ imp: null }),
          save: async () => {
            const t = im.rows.filter(r => r.type && r.icinde);
            if (!t.length) return this.say('En az bir noktaya tür işaretleyin.');
            const eksikKoy = t.filter(r => !r.village).length;
            if (eksikKoy && !window.confirm(eksikKoy + ' noktanın yakınında (4 km) resmî köy bulunamadı; köy alanı boş kalacak, sonra kartından girilebilir. Devam edilsin mi?')) return;
            const yeniler = [];
            const added = t.map((r, k) => {
              const kod = this.siradakiKod(r.type, yeniler);
              yeniler.push({ type: r.type, code: kod });
              return {
                id: 'imp' + Date.now() + k, type: r.type, village: r.village, district: r.district,
                lat: r.lat, lon: r.lon, coordApprox: false, code: kod, elle: true,
                status: 'aktif', sync: 'pending', photos: 0, year: '', d: {}, _ad: r.name
              };
            });
            const notMetin = r => `${im.source} aktarımı${im.dosya ? ' (' + im.dosya + ')' : ''} · özgün ad: ${r._ad}. Teknik alanlar boş — sahada doldurulacak.`;
            const M = this._sb;
            if (M && M.tokenOku() && !s.offline) {
              // Sunucuya tek tek yazılır; kod çakışırsa sunucu sıradaki boş kodu verir
              this.setState({ imp: null, tab: 'harita' });
              let ok = 0, hata = '';
              for (const a of added) {
                this.duyur(`Aktarılıyor… ${ok + 1} / ${added.length}`, 3000);
                const r = await M.tesisKaydet(a);
                if (r.ok) { ok++; M.notEkle(r.data, notMetin(a)); } else if (!hata) hata = r.err || 'yazılamadı';
              }
              await this.veriYenile(true);
              this.denetimYaz('kayit', 'Dosyadan tesis aktarıldı', ok + ' kayıt · ' + im.source + (im.dosya ? ' · ' + im.dosya : ''), '');
              this.duyur(`${ok} nokta envantere yazıldı — bütün ekiplerde görünüyor.` + (hata ? ` ${added.length - ok} tanesi yazılamadı: ${hata}` : ''), 9000, hata ? 'kotu' : 'iyi');
              return;
            }
            const notes = { ...s.notes };
            added.forEach(a => { notes[a.id] = notMetin(a); });
            this.setState({
              assets: [...added, ...s.assets], imp: null, notes, tab: 'harita',
              queue: [{ id: 'q' + Date.now(), title: `${added.length} nokta aktarıldı`, meta: `${im.source} · sunucuya gönderilmeyi bekliyor`, state: 'pending', dotPend: true }, ...s.queue]
            });
            this.yerelTesisYaz([...added, ...this.yerelTesisOku().filter(x => !added.some(a => a.code === x.code))]);
            this.say(`${added.length} nokta cihaza kaydedildi — bağlantı gelince sunucuya gönderilir.`);
          }
        };
      })(),