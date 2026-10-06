      bakimKayit: (() => {
        const f = s.bakimForm;
        const liste = (sel ? (s.bakimlar[sel.id] || []) : []);
        const yaz = (k, v) => this.setState({ bakimForm: { ...this.state.bakimForm, [k]: v } });
        return {
          on: !!f,
          yazabilir: !!sel && canWrite && this.yazabilir(sel),
          bos: liste.length === 0,
          periyot: sel ? this.bakimPeriyot(sel.type) + ' ayda bir' : '',
          durum: sel ? this.bakimDurum(sel).label : '',
          note: 'Yap\u0131lan bak\u0131m\u0131 buraya yaz\u0131n: tarih, ne yap\u0131ld\u0131\u011f\u0131, kullan\u0131lan malzeme. Kaydetti\u011finizde tesisin son bak\u0131m tarihi bu tarihe \u00e7ekilir ve Bak\u0131m takvimi yeniden hesaplan\u0131r. Foto\u011fraf\u0131 Foto sekmesinden eklersiniz.',
          liste: liste.map((b, i) => ({
            tarih: b.tarih, kim: b.kim, is: b.is,
            malzeme: b.malzeme || '\u2014', hasMalzeme: !!b.malzeme,
            sil: () => {
              this.setState(st => ({ bakimlar: { ...st.bakimlar, [sel.id]: (st.bakimlar[sel.id] || []).filter((_, k) => k !== i) } }));
              this.duyur(b.tarih + ' tarihli bak\u0131m kayd\u0131 silindi.', 4000);
            }
          })),
          tarih: f ? f.tarih : '', is: f ? f.is : '', malzeme: f ? f.malzeme : '', notu: f ? f.notu : '',
          onTarih: e => yaz('tarih', e.target.value),
          onIs: e => yaz('is', e.target.value),
          onMalzeme: e => yaz('malzeme', e.target.value),
          onNotu: e => yaz('notu', e.target.value),
          ac: () => {
            if (!sel) return;
            if (!this.yazabilir(sel)) return this.kilitUyar(sel);
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            this.setState({ bakimForm: { tarih: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, is: '', malzeme: '', notu: '' } });
          },
          iptal: () => this.setState({ bakimForm: null }),
          foto: () => this.fotoSec(true),
          kaydet: () => {
            const g = this.state.bakimForm;
            if (!sel || !g) return;
            if (!g.is.trim()) return this.say('Yap\u0131lan i\u015fi yaz\u0131n.');
            const p = String(g.tarih || '').split('-');
            const trTarih = p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : this.damga().slice(0, 10);
            const kayit = { tarih: trTarih, kim: me ? me.name : '\u2014', is: g.is.trim(), malzeme: (g.malzeme || '').trim(), notu: (g.notu || '').trim() };
            const yeni = { ...sel, d: { ...sel.d, bakim: trTarih } };
            this.setState(st => ({
              bakimForm: null,
              bakimlar: { ...st.bakimlar, [sel.id]: [kayit, ...(st.bakimlar[sel.id] || [])] },
              assets: st.assets.map(x => x.id === sel.id ? yeni : x)
            }));
            this.iz(sel.id, 'Bak\u0131m yap\u0131ld\u0131', `${trTarih} \u00b7 ${kayit.is}${kayit.malzeme ? ' \u00b7 ' + kayit.malzeme : ''}`);
            if (sel.dbId && this._sb && this._sb.tokenOku()) {
              this._sb.tesisKaydet(yeni).then(() => this.veriYenile(true));
              this._sb.notEkle(sel.dbId, `BAKIM ${trTarih} \u2014 ${kayit.is}${kayit.malzeme ? ' \u00b7 Malzeme: ' + kayit.malzeme : ''}${kayit.notu ? ' \u00b7 ' + kayit.notu : ''}`);
            }
            this.duyur(`${sel.code} bak\u0131m\u0131 i\u015flendi \u00b7 ${trTarih}. Sonraki bak\u0131m ${this.bakimPeriyot(sel.type)} ay sonra.`, 6000, 'iyi');
          }
        };
      })(),
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