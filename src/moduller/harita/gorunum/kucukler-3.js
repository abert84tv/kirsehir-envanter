      convSystems: [['ITRF96', 'ITRF96-3°'], ['ED50', 'ED50 3°'], ['DMS', 'Google / WGS84']].map(([id, label]) => ({
        label, bg: s.conv.sys === id ? ui.surf2 : 'transparent', fg: s.conv.sys === id ? ui.acc : ui.mut,
        pick: () => this.setState({ conv: { ...s.conv, sys: id } })
      })),
      conv: {
        e: s.conv.e, n: s.conv.n, zone: s.conv.zone, out, note,
        isDms: s.conv.sys === 'DMS',
        notDms: s.conv.sys !== 'DMS',
        labelE: s.conv.sys === 'DMS' ? 'Enlem (N)' : 'Sağa (E)',
        labelN: s.conv.sys === 'DMS' ? 'Boylam (E)' : 'Yukarı (N)',
        phE: s.conv.sys === 'DMS' ? '39°08\'46.3"N' : '615860',
        phN: s.conv.sys === 'DMS' ? '34°09\'29.9"E' : '4322830'
      },
      onConvE: e => this.setState({ conv: { ...this.state.conv, e: e.target.value } }),
      onConvN: e => this.setState({ conv: { ...this.state.conv, n: e.target.value } }),
      onConvZone: e => this.setState({ conv: { ...this.state.conv, zone: e.target.value } }),
      flyToConv: () => convLL ? this.flyTo(convLL[0], convLL[1]) : this.say('Geçerli bir koordinat girin.'),