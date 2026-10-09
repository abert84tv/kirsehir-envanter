      isListesi: (() => {
        const my = me && me.crew;
        // "Bana atanan": ekibi olan kullanıcıya yalnız kendi ekibinin işleri
        // (önceden herkese bütün açık arızalar listeleniyordu)
        const acik = s.faults.filter(f => !KAPALI_DURUM.includes(f.status) && (!my || f.crew === my));
        const gecikmis = s.assets.map(a => ({ a, b: this.bakimDurum(a) }))
          .filter(r => r.b.gun !== null && r.b.gun < 0)
          .sort((x, y) => x.b.gun - y.b.gun).slice(0, 6);
        const items = [
          ...(arizaOn ? acik.slice(0, 8) : []).map(f => {
            const a = s.assets.find(x => x.id === f.assetId);
            return {
              kind: 'Arıza', kindFg: ui.acc,
              title: `${f.no} · ${f.type}`,
              meta: (a ? a.code + ' · ' + this.yer(a) + ' · ' : '') + (f.priority || 'Normal') + ' öncelik',
              open: a ? () => this.setState({ selected: a.id, panel: 'detay', detailTab: 'ariza', tab: 'harita' }) : () => this.setState({ tab: 'isPanosu' })
            };
          }),
          ...(bakimOn ? gecikmis : []).map(r => ({
            kind: 'Bakım', kindFg: ui.fg,
            title: r.a.code + ' — periyodik bakım',
            meta: this.yer(r.a) + ' · ' + r.b.label,
            open: () => this.setState({ tab: 'bakim' })
          }))
        ];
        return {
          items, empty: items.length === 0,
          who: me ? (my ? `${me.name} · ${my}` : me.name) : '',
          date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
          note: (my ? 'Ekibinize düşen ' : 'Bugün ilgilenilmesi gereken işler: ')
            + [arizaOn ? 'açık arızalar' : null, bakimOn ? 'geciken bakımlar' : null]
              .filter(Boolean).join(', ') + '.'
        };
      })(),