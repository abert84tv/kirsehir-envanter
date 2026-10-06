      bakim: (() => {
        // pasif tesise bakım hatırlatması çıkmaz — hizmet dışıdır
        const rows = s.assets.filter(a => aktifMi(a)).map(a => ({ a, b: this.bakimDurum(a) }))
          .sort((x, y) => (x.b.sort === -1 ? -1e9 : x.b.sort) - (y.b.sort === -1 ? -1e9 : y.b.sort));
        const gec = rows.filter(r => r.b.gun !== null && r.b.gun < 0);
        const yak = rows.filter(r => r.b.gun !== null && r.b.gun >= 0 && r.b.gun <= 30);
        const yok = rows.filter(r => r.b.gun === null);
        const line = r => ({
          code: r.a.code, place: this.yer(r.a), kind: TYPES[r.a.type].kind,
          label: r.b.label,
          fg: r.b.sev === 2 ? ui.acc : (r.b.sev === 1 ? ui.fg : ui.mut),
          bg: r.b.sev === 2 ? ui.pend : 'transparent',
          per: this.bakimPeriyot(r.a.type) + ' ayda bir',
          son: r.b.son ? 'Son: ' + r.b.son : '—',
          hedef: r.b.hedef ? 'Hedef: ' + r.b.hedef : 'Hedef: son bakım tarihi girilince hesaplanır',
          open: () => { this.flyTo(r.a.lat, r.a.lon, 16); this.setState({ selected: r.a.id, panel: 'detay', detailTab: 'bilgi' }); },
          git: () => this.yolTarifiVer(r.a),
          done: can('write') ? () => {
            const bugun = this.damga().split(' ')[0];
            const yeni = { ...r.a, d: { ...r.a.d, bakim: bugun } };
            const M = this._sb;
            const sunucuya = !!(r.a.dbId && M && M.tokenOku() && !s.offline);
            this.setState(st => ({
              assets: st.assets.map(x => x.id === r.a.id ? { ...yeni, sync: sunucuya ? x.sync : 'pending' } : x),
              queue: [{ id: 'q' + Date.now(), code: r.a.code, kind: 'Bakım yapıldı', state: sunucuya ? 'synced' : 'pending', at: 'şimdi' }, ...st.queue]
            }));
            this.iz(r.a.id, 'Bakım yapıldı', bugun + ' · Bakım takviminden işaretlendi');
            if (sunucuya) M.tesisKaydet(yeni).then(x => { if (x.ok) this.veriYenile(true); });
            this.say(`${r.a.code} — bakım bugün yapıldı olarak işaretlendi. Sonraki bakım ${this.bakimPeriyot(r.a.type)} ay sonra.`);
          } : null,
          canDone: can('write')
        });
        return {
          stats: [
            { n: String(gec.length), label: 'Geciken', fg: ui.acc },
            { n: String(yak.length), label: '30 gün içinde', fg: ui.fg },
            { n: String(yok.length), label: 'Kaydı yok', fg: ui.mut },
            { n: String(rows.length - gec.length - yak.length - yok.length), label: 'Zamanında', fg: ui.mut }
          ],
          gecikenler: gec.slice(0, 30).map(line),
          gecikenlerVar: bakimOn && gec.length > 0,
          yaklasanlar: yak.slice(0, 30).map(line),
          yaklasanlarVar: yak.length > 0,
          kayitsiz: yok.slice(0, 40).map(line),
          kayitsizVar: yok.length > 0,
          kayitsizNot: `${yok.length} kayıtta son bakım tarihi yok — bakım takvimi ancak tarih girildikten sonra çalışır.`,
          note: 'Periyot: kuyular 6 ayda bir, depo ve elektrik tesisleri 12 ayda bir. Bakımı yaptığınızda satırdaki “Yapıldı” düğmesine basın; tarih bugüne çekilir ve sonraki bakım günü kendiliğinden hesaplanır.'
        };
      })(),