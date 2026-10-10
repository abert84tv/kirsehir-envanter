      muhtarPanel: (() => {
        const mp = s.muhtarPanel;
        if (!mp) return { on: false };
        const q = (mp.q || '').toLocaleLowerCase('tr');
        const hepsi = s.muhtarlar || [];
        const gorunen = !q ? hepsi : hepsi.filter(m =>
          [m.ad, m.koy, m.ilce, m.tel].join(' ').toLocaleLowerCase('tr').includes(q));
        const mf = mp.form;
        const yazabilir = this.yetkiVar(s.session, 'assign');
        return {
          on: true,
          kapat: () => this.setState({ muhtarPanel: null }),
          q: mp.q || '', onQ: e => this.setState({ muhtarPanel: { ...mp, q: e.target.value } }),
          yeniVar: yazabilir && !mf,
          yeni: () => this.setState({ muhtarPanel: { ...mp, form: { ad: '', koy: '', ilce: '', tel: '' } } }),
          liste: gorunen.map(m => ({
            ad: m.ad, yer: m.koy + (m.ilce ? ' / ' + m.ilce : ''), tel: m.tel || '—',
            duzenle: () => this.setState({ muhtarPanel: { ...mp, form: { ...m } } }),
            sil: () => this.muhtarSil(m.id)
          })),
          listeBos: !gorunen.length,
          form: !mf ? null : {
            baslik: mf.id ? 'Muhtarı düzenle' : 'Yeni muhtar',
            ad: mf.ad, onAd: e => this.setState({ muhtarPanel: { ...mp, form: { ...mf, ad: e.target.value } } }),
            koy: mf.koy, onKoy: e => this.setState({ muhtarPanel: { ...mp, form: { ...mf, koy: e.target.value } } }),
            ilce: mf.ilce, onIlce: e => this.setState({ muhtarPanel: { ...mp, form: { ...mf, ilce: e.target.value } } }),
            tel: mf.tel, onTel: e => this.setState({ muhtarPanel: { ...mp, form: { ...mf, tel: e.target.value } } }),
            iptal: () => this.setState({ muhtarPanel: { ...mp, form: null } }),
            kaydet: () => this.muhtarKaydet(mf)
          }
        };
      })(),