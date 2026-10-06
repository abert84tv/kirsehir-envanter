      koyEkle: (() => {
        const g = s.koyEkleForm || {};
        const ek = s.ekKoyler || {};
        const rows = [];
        for (const dId in ek) {
          const d = m && m.DISTRICTS.find(x => x.id === dId);
          (ek[dId] || []).forEach((r, i) => rows.push({
            ad: r.ad, ilce: d ? d.name : dId,
            koord: r.lat != null ? `${(+r.lat).toFixed(5)} , ${(+r.lon).toFixed(5)}` : 'konum yok',
            sil: () => this.ekKoySil(dId, i)
          }));
        }
        const yz = k => e => this.setState({ koyEkleForm: { ...(this.state.koyEkleForm || {}), [k]: e.target.value } });
        return {
          note: 'Resmî köy listesi HGM ad dizininden gelir; köylere bağlı mahalleler, mezralar ve sonradan kurulan yerleşimler o dizinde yoktur. Eksik olanı buradan ekleyin — eklediğiniz yerleşim yeni kayıt formundaki köy listesinde, aramada ve yerleşim tablosunda görünür, bu tarayıcıda kalıcı olarak saklanır.',
          ilce: g.ilce || '', ad: g.ad || '', lat: g.lat || '', lon: g.lon || '',
          ilceler: m ? m.DISTRICTS.map(d => ({ id: d.id, name: d.name })) : [],
          onIlce: yz('ilce'), onAd: yz('ad'), onLat: yz('lat'), onLon: yz('lon'),
          ekle: () => this.ekKoyEkle(),
          rows, varMi: rows.length > 0,
          sayi: rows.length + ' elle eklenen yerleşim'
        };
      })(),