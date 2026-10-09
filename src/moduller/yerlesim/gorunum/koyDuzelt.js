      koyDuzelt: (() => {
        const f = s.koyForm;
        const ilceler = m ? m.DISTRICTS.map(d => d.name) : [];
        return {
          on: !!f,
          acilir: !!sel,
          koy: f ? f.village : '', ilce: f ? f.district : '',
          ilceler: ilceler.map(n => ({ n })),
          koyler: (() => {
            if (!m || !f) return [];
            const d = m.DISTRICTS.find(x => x.name === f.district);
            return (d ? (m.VILLAGES[d.id] || []) : []).map(n => ({ n }));
          })(),
          ac: () => {
            if (!sel) return;
            if (!this.yazabilir(sel)) return this.kilitUyar(sel);
            this.setState({ koyForm: { village: sel.village || '', district: sel.district || (ilceler[0] || '') } });
          },
          onKoy: e => this.setState({ koyForm: { ...this.state.koyForm, village: e.target.value } }),
          onIlce: e => this.setState({ koyForm: { ...this.state.koyForm, district: e.target.value } }),
          iptal: () => this.setState({ koyForm: null }),
          kaydet: () => {
            const g = this.state.koyForm;
            if (!sel || !g) return;
            const koy = (g.village || '').trim();
            const yeni = { ...sel, village: koy, district: g.district || sel.district, villageAuto: undefined, d: { ...(sel.d || {}), koyOtomatik: '' } };
            this.setState({ koyForm: null, assets: s.assets.map(x => x.id === sel.id ? yeni : x) },
              () => this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults }));
            this.iz(sel.id, 'Köy bilgisi düzeltildi', `${sel.village || '(boş)'} → ${koy || '(boş)'} · ${yeni.district}`);
            if (sel.dbId && this._sb && this._sb.tokenOku()) {
              this._sb.tesisKaydet(yeni).then(r => {
                if (!r.ok) return this.say(r.err || 'Kaydedilemedi.', true);
                this.veriYenile(true);
                this.duyur(`${sel.code} → ${koy || '(köy boş)'} · ${yeni.district}. Herkesin ekranında güncellendi.`, 6000, 'iyi');
              });
            } else {
              this.duyur(`${sel.code} → ${koy || '(köy boş)'} · ${yeni.district}. Bu kayıt henüz veritabanında değil, cihazda duruyor.`, 6000);
            }
          }
        };
      })(),