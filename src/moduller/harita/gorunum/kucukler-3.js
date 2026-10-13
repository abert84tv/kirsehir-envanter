      convSystems: [['ITRF96', 'ITRF96-3°'], ['UTM6', 'WGS84 6°'], ['ED50', 'ED50 3°'], ['DMS', 'Google / WGS84']].map(([id, label]) => ({
        label, bg: s.conv.sys === id ? ui.surf2 : 'transparent', fg: s.conv.sys === id ? ui.acc : ui.mut,
        pick: () => this.setState({ conv: { ...s.conv, sys: id } })
      })),
      conv: {
        e: s.conv.e, n: s.conv.n, zone: s.conv.zone, out, note,
        isDms: s.conv.sys === 'DMS',
        notDms: s.conv.sys !== 'DMS' && s.conv.sys !== 'UTM6',   // dilim seçimi yalnız 3° dilimli sistemlerde (UTM 6° Kırşehir'de tek dilim: 36)
        labelE: s.conv.sys === 'DMS' ? 'Enlem (N)' : 'Sağa (Y)',
        labelN: s.conv.sys === 'DMS' ? 'Boylam (E)' : 'Yukarı (X)',
        phE: s.conv.sys === 'DMS' ? '39°08\'46.3"N' : (s.conv.sys === 'UTM6' ? '569702' : '615860'),
        phN: s.conv.sys === 'DMS' ? '34°09\'29.9"E' : (s.conv.sys === 'UTM6' ? '4339074' : '4322830')
      },
      onConvE: e => this.setState({ conv: { ...this.state.conv, e: e.target.value } }),
      onConvN: e => this.setState({ conv: { ...this.state.conv, n: e.target.value } }),
      onConvZone: e => this.setState({ conv: { ...this.state.conv, zone: e.target.value } }),
      flyToConv: () => convLL ? this.flyTo(convLL[0], convLL[1]) : this.say('Geçerli bir koordinat girin.'),