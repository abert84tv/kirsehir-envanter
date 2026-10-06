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
      yerlesimYukleme: (() => {
        const kayit = s.yerlesimVeri || {};
        return {
          sayi: Object.keys(kayit).length,
          note: Object.keys(kayit).length
            ? `${Object.keys(kayit).length} yerle\u015fim i\u00e7in kay\u0131t y\u00fcklendi. Yeni bir dosya y\u00fcklerseniz ayn\u0131 adl\u0131 sat\u0131rlar\u0131n \u00fczerine yaz\u0131l\u0131r; dosyada olmayan s\u00fctunlar (\u00f6rne\u011fin hayvan say\u0131lar\u0131) korunur.`
            : 'K\u00f6y n\u00fcfusu ve hayvan varl\u0131\u011f\u0131 hen\u00fcz y\u00fcklenmedi. T\u00dc\u0130K veya Tar\u0131m M\u00fcd\u00fcrl\u00fc\u011f\u00fc ekstresini oldu\u011fu gibi y\u00fckleyebilirsiniz; biraz farkl\u0131 bir tablonuz varsa \u00f6rnek dosyay\u0131 indirip onu doldurun.',
          ornek: () => {
            const sat = ['Yıl;İlçe;Köy;Nüfus;Büyükbaş;Küçükbaş'];
            if (m) for (const d of m.DISTRICTS) for (const v of (m.VILLAGES[d.id] || []).slice(0, 400)) sat.push(`2025;${d.name};${v};;;`);
            this.dosyaIndir('koy-nufus-hayvan-sablonu.csv', '\ufeff' + sat.join('\r\n'), 'text/csv;charset=utf-8');
            this.duyur('\u015eablon indirildi. N\u00fcfus ve hayvan s\u00fctunlar\u0131n\u0131 doldurup geri y\u00fckleyin \u2014 s\u00fctun s\u0131ras\u0131n\u0131 de\u011fi\u015ftirseniz de okunur.', 7000);
          },
          yukle: () => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.csv,.txt,text/csv';
            inp.style.display = 'none';
            inp.onchange = () => {
              const dosya = (inp.files || [])[0];
              inp.remove();
              if (!dosya) return;
              const fr = new FileReader();
              fr.onerror = () => this.duyur('Dosya okunamad\u0131. Ba\u015fka bir kopyas\u0131n\u0131 deneyin.', 7000, 'kotu');
              fr.onload = () => {
                try { this.yerlesimCsvIsle(fr.result, dosya.name); }
                catch (e) { this.duyur('Dosya okunamad\u0131: ' + (e && e.message ? e.message : e), 8000, 'kotu'); }
              };
              fr.readAsArrayBuffer(dosya);
            };
            document.body.appendChild(inp);
            inp.click();
          },
          temizle: () => {
            try { localStorage.removeItem('ks-yerlesim-veri'); } catch (e) { /* yok */ }
            this.setState({ yerlesimVeri: {} });
            this.duyur('Y\u00fcklenen n\u00fcfus ve hayvan verisi silindi.', 4000);
          }
        };
      })(),
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
            const yeni = { ...sel, village: koy, district: g.district || sel.district, villageAuto: undefined };
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