    // settlements
    const settlements = [];
    if (m) {
      for (const d of m.DISTRICTS) {
        settlements.push({
          name: d.name + ' (ilçe)', district: '—', weight: '700',
          pop: fmt(d.pop), buyukbas: '—', kucukbas: '—',
          inv: String(s.assets.filter(a => a.district === d.name).length),
          src: d.pop ? `TÜİK ${d.popYear}` : 'veri bekleniyor',
          rowBg: dark ? ui.surf2 : 'var(--color-neutral-200)', numColor: ui.fg
        });
        const vs = this.koyList(m, d);
        for (const v of vs) {
          const y = this.yerlesimBul(d.name, v);
          settlements.push({
            name: v, district: d.name, weight: '400',
            pop: y && y.nufus != null ? fmt(y.nufus) : '—',
            buyukbas: y && y.buyukbas != null ? fmt(y.buyukbas) : '—',
            kucukbas: y && y.kucukbas != null ? fmt(y.kucukbas) : '—',
            inv: String(s.assets.filter(a => a.village === v).length),
            src: y ? ('Yüklenen dosya' + (y.yil ? ' · ' + y.yil : '') + (y.yaklasik ? ' · yaklaşık eşleşme: ' + y.yaklasik : '')) : 'veri yüklenmedi',
            rowBg: 'transparent', numColor: y ? ui.fg : ui.mut
          });
        }
        if (!vs.length) settlements.push({
          name: `${d.villageCount} köy — isim listesi içe aktarılacak`, district: d.name, weight: '400',
          pop: '—', buyukbas: '—', kucukbas: '—', inv: '—', src: 'İçişleri mülki idare envanteri',
          rowBg: 'transparent', numColor: ui.mut
        });
      }
    }
