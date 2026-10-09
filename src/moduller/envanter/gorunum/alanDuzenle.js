      alanDuzenle: (() => {
        const g = s.alanForm;
        const a = g && s.assets.find(x => x.id === g.id);
        if (!g || !a) return { on: false, baslik: '', kod: '', gruplar: [], kaydet: () => {}, iptal: () => {} };
        const set = (k, v) => this.setState(st => ({
          alanForm: k === 'year'
            ? { ...st.alanForm, year: v }
            : { ...st.alanForm, d: { ...st.alanForm.d, [k]: v } }
        }));
        return {
          on: true,
          kod: a.code,
          ilce: g.ilce, koy: g.koy,
          ilceler: (m ? m.DISTRICTS.map(d => d.name) : []).map(n => ({ n })),
          koyler: (() => {
            const d = m && m.DISTRICTS.find(x => x.name === g.ilce);
            return (d ? (m.VILLAGES[d.id] || []) : []).map(n => ({ n }));
          })(),
          onIlce: e => this.setState(st => ({ alanForm: { ...st.alanForm, ilce: e.target.value, koy: '' } })),
          onKoy: e => this.setState(st => ({ alanForm: { ...st.alanForm, koy: e.target.value } })),
          baslik: TYPES[a.type].kind + ' · alanları düzenle',
          not: 'Boş bıraktığınız alan “— eksik” kalır. Kayıt önce cihaza yazılır, bağlantı varsa hemen eşitlenir.',
          gruplar: (ALANLAR[a.type] || []).map(([baslik, alanlar]) => ({
            baslik,
            alanlar: alanlar.map(([k, label, unit, tip]) => {
              const evet = tip === 'evet';
              const ham = k === 'year' ? g.year : g.d[k];
              const acik = ham === true || ham === 'true' || ham === 'Var';
              return {
                k, label, unit: unit || '',
                evetMi: evet, metinMi: !evet,
                mod: tip === 'sayi' ? 'decimal' : 'text',
                val: evet ? '' : (ham === undefined || ham === null ? '' : ham),
                acBg: acik ? 'var(--color-accent)' : 'transparent',
                acFg: acik ? '#fff' : ui.mut,
                kapaBg: acik ? 'transparent' : ui.fg,
                kapaFg: acik ? ui.mut : ui.bg,
                onChange: e => set(k, e.target.value),
                ac: () => set(k, true), kapa: () => set(k, false)
              };
            })
          })),
          iptal: () => this.setState({ alanForm: null }),
          kaydet: () => {
            const temiz = {};
            const bool = new Set();
            for (const [, alanlar] of (ALANLAR[a.type] || [])) {
              for (const [k, , , tip] of alanlar) if (tip === 'evet') bool.add(k);
            }
            let dolu = 0;
            for (const k of Object.keys(g.d)) {
              if (bool.has(k)) {
                const v = g.d[k];
                temiz[k] = v === true || v === 'true' || v === 'Var';
                if (temiz[k]) dolu++;
                continue;
              }
              const v = typeof g.d[k] === 'boolean' ? String(g.d[k]) : String(g.d[k]).trim();
              if (v === '') { temiz[k] = ''; continue; }
              temiz[k] = v;
              dolu++;
            }
            const yilHam = String(g.year == null ? '' : g.year).replace(/[^0-9]/g, '');
            const yil = yilHam ? parseInt(yilHam, 10) : '';
            const koy = (g.koy || '').trim();
            const ilce = g.ilce || a.district;
            const yerDegisti = koy !== (a.village || '') || ilce !== a.district;
            const yeni = { ...a, village: koy, district: ilce, villageAuto: yerDegisti ? undefined : a.villageAuto, year: yil, d: { ...(a.d || {}), ...temiz }, sync: s.offline ? 'pending' : a.sync };
            this.setState({
              alanForm: null,
              assets: s.assets.map(x => x.id === a.id ? yeni : x),
              queue: s.offline
                ? [{ id: 'q' + Date.now(), title: a.code + ' · alan güncelleme', meta: dolu + ' alan', state: 'pending', dotPend: true }, ...s.queue]
                : s.queue
            }, () => { if (yerDegisti) this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults }); });
            if (yerDegisti) this.iz(a.id, 'Köy bilgisi düzeltildi', `${a.village || '(boş)'} → ${koy || '(boş)'} · ${ilce}`);
            this.iz(a.id, 'Alanlar güncellendi', dolu + ' alan dolu');
            if (!(yeni.dbId && this._sb && this._sb.tokenOku() && !s.offline)) {
              this.duyur(`${a.code} güncellendi · ${koy || '(köy boş)'} · ${ilce} · ${dolu} alan dolu.` + (s.offline ? ' Çevrimdışısınız — kuyruğa alındı.' : ''), 6000, 'iyi');
              return;
            }
            // Sunucuya yazma: sonuç beklenir. Eskiden hata sessizce yutuluyor, ekran sunucudaki eski veriyle yenileniyor
            // ve “güncellendi” deniyordu — girilen alanlar kayboluyordu.
            (async () => {
              let r;
              try { r = await this._sb.tesisKaydet(yeni); } catch (e) { r = { ok: false, cevrimdisi: true }; }
              // Başkası kaydı bu arada değiştirmişse (sürüm çakışması): güncel kaydı çek, girilenleri onun üstüne uygula, bir kez daha dene
              if (r && !r.ok && !r.cevrimdisi && /değiştirdi|sürüm/i.test(r.err || '')) {
                await this.veriYenile(true);
                const g2 = (this.state.assets || []).find(x => x.id === a.id);
                if (g2) {
                  const yeni2 = { ...g2, village: koy, district: ilce, year: yil, d: { ...(g2.d || {}), ...temiz } };
                  this.setState(st => ({ assets: (st.assets || []).map(x => x.id === a.id ? yeni2 : x) }));
                  try { r = await this._sb.tesisKaydet(yeni2); } catch (e) { r = { ok: false, cevrimdisi: true }; }
                }
              }
              if (r && r.ok) {
                await this.veriYenile(true);
                this.duyur(`${a.code} kaydedildi · ${koy || '(köy boş)'} · ${ilce} · ${dolu} alan dolu.`, 6000, 'iyi');
              } else if (r && r.cevrimdisi) {
                this.tesisBekle(a.id);
                this.duyur(`${a.code} cihaza kaydedildi; bağlantı gelince sunucuya gönderilecek.`, 7000, 'bilgi');
              } else {
                // Reddedildi: ekrandaki veri korunur (yenileme yapılmaz), kullanıcıya gerçek neden söylenir
                this.duyur(`${a.code} SUNUCUYA KAYDEDİLEMEDİ: ${(r && r.err) || 'bilinmeyen hata'}`, 14000, 'kotu');
              }
            })();
          }
        };
      })(),