      prefNote: (() => {
        const u = s.session;
        if (!u) return '';
        const zemin = { street: 'Sokak', sat: 'Uydu', hyb: 'Uydu + ad' }[s.mapBase] || 'Sokak';
        const acik = ['kuyu', 'depo', 'ag', 'ges'].filter(k => s.filter[k]);
        const suzgec = acik.length === 4 ? 'bütün türler açık'
          : (acik.length ? 'yalnızca ' + acik.map(k => TYPES[k].label).join(', ') : 'hepsi kapalı');
        return `${u.name} olarak yaptığınız her seçim bu cihazda saklanıyor: harita zemini ${zemin}, ${s.theme === 'dark' ? 'koyu' : 'açık'} tema, ulaşım modu ${s.navMode ? 'açık' : 'kapalı'}, kayıt süzgeci ${suzgec}, bildirim kanalı ${s.bildirimKanal || 'SMS'} (${s.bildirimEsik || 'Acil ve yüksek'}), koordinat sistemi ${s.conv.sys === 'DMS' ? 'Google / WGS84' : s.conv.sys + '-3°'} dilim ${s.conv.zone}, en son açık ekran ve sekme. Bir dahaki girişinizde program tam bıraktığınız gibi açılır. Başka biri kendi hesabıyla girdiğinde kendi ayarlarını görür.`;
      })(),
      prefReset: () => {
        const u = s.session;
        if (u) { try { localStorage.removeItem('ks-pref-' + u.user); } catch (e) { /* yok */ } }
        try { localStorage.setItem('ks-tema', 'light'); } catch (e) { /* yok */ }
        this.setState({
          mapBase: 'street', theme: 'light', navMode: false,
          filter: { kuyu: true, depo: true, ag: true, ges: true, pasif: true, kaynak: false, memba: false },
          bildirimKanal: 'SMS', bildirimEsik: 'Acil ve yüksek',
          conv: { sys: 'ITRF96', zone: '11', e: '615860', n: '4322830' },
          tab: 'harita', detailTab: 'bilgi'
        }, () => this.prefUygula());
        this.say('Ayarlar varsayılana döndü — harita sokak zemini, açık tema, ulaşım modu kapalı.');
      },