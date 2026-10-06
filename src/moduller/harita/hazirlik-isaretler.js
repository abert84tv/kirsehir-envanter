    // markers
    const markers = [];
    if (s.zoom <= 11.6) {
      const g = s.zoom <= 10 ? .34 : .17, cells = new Map();
      for (const a of vis) {
        const k = `${Math.floor(a.lat / g)}:${Math.floor(a.lon / g)}`;
        const c = cells.get(k) || { n: 0, lat: 0, lon: 0, pend: 0, items: [] };
        c.n++; c.lat += a.lat; c.lon += a.lon; c.items.push(a);
        if (a.sync === 'pending') c.pend++;
        cells.set(k, c);
      }
      for (const [, c] of cells) {
        const p = this.proj(c.lat / c.n, c.lon / c.n);
        if (p.x < -8 || p.x > 108 || p.y < -8 || p.y > 108) continue;
        const single = c.n === 1, a = c.items[0];
        markers.push({
          x: p.x.toFixed(2), y: p.y.toFixed(2), z: 3,
          label: single ? TYPES[a.type].glyph : String(c.n),
          size: single ? '26px' : (c.n > 9 ? '34px' : '30px'), fs: single ? '11px' : '12px',
          fill: single ? (c.pend ? 'var(--color-accent)' : ui.surf) : ui.fg,
          stroke: c.pend ? 'var(--color-accent)' : ui.fg,
          ink: single ? (c.pend ? '#fff' : ui.fg) : ui.bg,
          tap: single ? () => this.setState({ selected: a.id, detailTab: 'bilgi', panel: 'detay' })
            : () => this.setState({ zoom: 13, center: { lat: c.lat / c.n, lon: c.lon / c.n } })
        });
      }
    } else {
      for (const a of vis) {
        const p = this.proj(a.lat, a.lon);
        if (p.x < -8 || p.x > 108 || p.y < -8 || p.y > 108) continue;
        const pend = a.sync === 'pending', isSel = a.id === s.selected;
        const hasFault = openF.some(f => f.assetId === a.id);
        const pasif = !aktifMi(a);
        markers.push({
          x: p.x.toFixed(2), y: p.y.toFixed(2), z: isSel ? 5 : 3,
          label: TYPES[a.type].glyph, size: '28px', fs: '11px',
          kenar: pasif ? 'dashed' : 'solid', solgun: '1',
          fill: pasif ? '#3f4a5a' : (pend || hasFault ? 'var(--color-accent)' : (isSel ? ui.fg : ui.surf)),
          stroke: pasif ? '#eceaea' : (pend || hasFault ? 'var(--color-accent)' : ui.fg),
          ink: pasif ? '#fff' : (pend || hasFault ? '#fff' : (isSel ? ui.bg : ui.fg)),
          tap: () => this.setState({ selected: a.id, detailTab: 'bilgi', panel: 'detay' })
        });
      }
    }
