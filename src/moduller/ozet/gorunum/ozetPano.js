      // Özet > Envanter: kutu kutu (modül modül) hareketli gösterge paneli.
      // Renkler haritadaki tür renkleriyle aynıdır (kuyu mavi, depo kehribar, AG mor, GES sarı);
      // koyu temada ayrı adımlar kullanılır. Her kutu bir "modül"dür; şablon ortaktır (masaüstü ve telefon aynı).
      ozetPano: (() => {
        if (tabId !== 'ozet') return { var: false };
        const A = s.assets || [];
        const toplam = A.length;
        const REN = turRenk(dark);
        const DIGER = dark ? '#8e8e93' : '#a8a29e';
        const SIRA = ['kuyu', 'depo', 'ag', 'ges'];
        const yuzde = (n, t) => t ? Math.round(n / t * 100) : 0;
        const git = f => () => this.setState({ tab: 'envanter', envQ: '', envF: f });
        const zemin = ui.surf;
        // ring: dilimler arası ince boşluk (zemin renginde)
        const halka = parcalar => {
          const T = parcalar.reduce((t, p) => t + p.n, 0);
          if (!T) return `conic-gradient(${ui.rule} 0 360deg)`;
          let a = 0; const GAP = parcalar.filter(p => p.n > 0).length > 1 ? 1.8 : 0; const out = [];
          for (const p of parcalar) {
            if (!p.n) continue;
            const d = p.n / T * 360;
            out.push(`${p.renk} ${a}deg ${a + d - GAP}deg`);
            if (GAP) out.push(`${zemin} ${a + d - GAP}deg ${a + d}deg`);
            a += d;
          }
          return `conic-gradient(${out.join(',')})`;
        };

        // 1) Tür dağılımı
        const tur = SIRA.map(t => ({ t, n: A.filter(a => a.type === t).length })).filter(x => x.n > 0);
        const turSatir = tur.map((x, i) => ({
          ad: TYPES[x.t].kind, n: x.n, pct: yuzde(x.n, toplam) + '%', renk: REN[x.t], i,
          ipucu: TYPES[x.t].kind + ': ' + x.n + ' kayıt — listede göster', git: git({ tur: x.t })
        }));

        // 2) Hizmet durumu
        const aktif = A.filter(a => aktifMi(a)).length, pasif = toplam - aktif;
        const aktifYuzde = toplam ? (pasif ? Math.min(99, yuzde(aktif, toplam)) : 100) : 0;

        // 3) Fotoğraf kapsamı
        const fotolu = A.filter(a => (a.photos || 0) > 0).length;
        const fotoSayi = A.reduce((t, a) => t + (a.photos || 0), 0);
        const fotoYuzde = yuzde(fotolu, toplam);
        const fotoTur = SIRA.map(t => {
          const h = A.filter(a => a.type === t); const f = h.filter(a => (a.photos || 0) > 0).length;
          return { t, n: h.length, f };
        }).filter(x => x.n > 0).map((x, i) => ({ ad: TYPES[x.t].kind, f: x.f, n: x.n, w: yuzde(x.f, x.n) + '%', renk: REN[x.t], i, ipucu: x.f + ' / ' + x.n + ' kayıtta fotoğraf var' }));

        // 4) İlçeler (kuyu / depo / diğer üst üste)
        const byD = {};
        for (const a of A) {
          const o = (byD[a.district || '—'] = byD[a.district || '—'] || { kuyu: 0, depo: 0, diger: 0 });
          if (a.type === 'kuyu') o.kuyu++; else if (a.type === 'depo') o.depo++; else o.diger++;
        }
        const ilceler = Object.entries(byD).map(([ad, o]) => ({ ad, ...o, n: o.kuyu + o.depo + o.diger })).sort((x, y) => y.n - x.n);
        const maxI = Math.max(1, ...ilceler.map(x => x.n));
        const ilceSatir = ilceler.map((x, i) => ({
          ad: x.ad, n: x.n, i,
          wK: (x.kuyu / maxI * 100) + '%', wD: (x.depo / maxI * 100) + '%', wO: (x.diger / maxI * 100) + '%',
          ipucu: x.ad + ': ' + x.kuyu + ' kuyu, ' + x.depo + ' depo' + (x.diger ? ', ' + x.diger + ' diğer' : '') + ' — listede göster',
          git: git({ ilce: x.ad })
        }));

        // 5) Köyler (en çok kayıtlı 8; köyü yazılmamış kayıtlar sayılmaz)
        const byV = {};
        for (const a of A) { if (!a.village) continue; const k = a.village + ' · ' + (a.district || ''); (byV[k] = byV[k] || { n: 0, ad: a.village, ilce: a.district || '' }).n++; }
        const koyler = Object.values(byV).sort((x, y) => y.n - x.n).slice(0, 8);
        const maxK = Math.max(1, ...koyler.map(x => x.n));
        const koySatir = koyler.map((x, i) => ({
          ad: x.ad, ilce: x.ilce, n: x.n, w: (x.n / maxK * 100) + '%', i, ipucu: x.ad + ': ' + x.n + ' kayıt — listede göster',
          git: () => this.setState({ tab: 'envanter', envF: {}, envQ: x.ad })
        }));

        // 6) Yakınımdaki tesisler
        const yakin = [...A].map(a => ({ a, km: this.distKm(a) })).sort((x, y) => x.km - y.km).slice(0, 5).map(({ a, km }) => ({
          kod: a.code, yer: a.village ? a.village + ' · ' + (a.district || '') : (a.district || ''), km: km.toFixed(1) + ' km', renk: REN[a.type] || DIGER, route: () => this.yolTarifiVer(a)
        }));


        // ── sayısal alan okuyucu: “45”, “45 kW”, “12,5” → sayı; “—”, boş → yok
        const say = v => { const m = String(v == null ? '' : v).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
        const kuyular = A.filter(a => a.type === 'kuyu');
        const al = k => kuyular.map(a => say((a.d || {})[k])).filter(v => v != null && v > 0);
        const motorlar = al('motor'), derinlikler = al('derinlik'), debiler = al('debi');
        const topla = d => d.reduce((t, v) => t + v, 0);
        const ond = n => (Math.round(n * 10) / 10).toLocaleString('tr-TR');

        // 7) Teknik özet
        const teknik = [
          { ad: 'Toplam pompa gücü', birim: 'kW', n: motorlar.length, deger: motorlar.length ? Math.round(topla(motorlar)) : null, ipucu: 'Pompa gücü girilmiş kuyuların toplamı' },
          { ad: 'Ortalama kuyu derinliği', birim: 'm', n: derinlikler.length, deger: derinlikler.length ? Math.round(topla(derinlikler) / derinlikler.length) : null, ipucu: 'Derinliği girilmiş kuyuların ortalaması' },
          { ad: 'Toplam debi', birim: 'L/sn', n: debiler.length, deger: debiler.length ? Math.round(topla(debiler)) : null, ipucu: 'Debisi girilmiş kuyuların toplamı' }
        ].map(x => ({ ...x, var: x.deger != null, yok: x.deger == null, kayit: x.n ? x.n + ' kuyuda girilmiş' : 'henüz girilmemiş' }));

        // 8) Dağılım grafikleri (yapım yılı / derinlik / debi)
        const sekmeHist = s.ozetHist || 'derinlik';
        const HIST = {
          yil: { ad: 'Yapım yılı', birim: '', veri: kuyular.map(a => say(a.year)).filter(v => v != null && v > 1800),
                 kutu: [['2000 öncesi', 0, 2000], ['2000–09', 2000, 2010], ['2010–19', 2010, 2020], ['2020 ve sonrası', 2020, 9999]] },
          derinlik: { ad: 'Derinlik', birim: 'm', veri: derinlikler, kutu: [['0–50', 0, 50], ['50–100', 50, 100], ['100–150', 100, 150], ['150–200', 150, 200], ['200+', 200, 1e9]] },
          debi: { ad: 'Debi', birim: 'L/sn', veri: debiler, kutu: [['0–5', 0, 5], ['5–10', 5, 10], ['10–20', 10, 20], ['20+', 20, 1e9]] }
        };
        const H = HIST[sekmeHist] || HIST.derinlik;
        const hSay = H.kutu.map(([ad, lo, hi]) => ({ ad, n: H.veri.filter(v => v >= lo && v < hi).length }));
        const hMax = Math.max(1, ...hSay.map(x => x.n));
        const hist = {
          sekmeler: Object.entries(HIST).map(([k, h]) => ({ ad: h.ad, ...seg(sekmeHist === k, () => this.setState({ ozetHist: k })) })),
          var: H.veri.length > 0, yok: H.veri.length === 0, n: H.veri.length, birim: H.birim,
          sutunlar: hSay.map((x, i) => ({ ad: x.ad, n: x.n, h: Math.max(x.n ? 4 : 0, Math.round(x.n / hMax * 100)) + '%', i, ipucu: x.ad + (H.birim ? ' ' + H.birim : '') + ': ' + x.n + ' kuyu' })),
          not: H.veri.length ? H.veri.length + ' kuyunun ' + H.ad.toLocaleLowerCase('tr') + ' bilgisi girilmiş' : 'Henüz ' + H.ad.toLocaleLowerCase('tr') + ' bilgisi girilmiş kuyu yok. Kuyu kartında “Düzenle” ile girildikçe grafik dolar.'
        };

        // 9) Su kalitesi
        const tarihMs = v => { const t = String(v || ''); let m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/); if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime(); m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : 0; };
        const analizli = kuyular.filter(a => tarihMs((a.d || {}).suAnalizTarih) > 0);
        const yilOnce = Date.now() - 365 * 86400000;
        const eskiAnaliz = analizli.filter(a => tarihMs(a.d.suAnalizTarih) < yilOnce).length;
        const klorlar = kuyular.map(a => say((a.d || {}).klorDeger)).filter(v => v != null);
        const su = {
          analizli: analizli.length, eski: eskiAnaliz, guncel: analizli.length - eskiAnaliz,
          klorSayi: klorlar.length, klorAralik: klorlar.length ? ond(Math.min(...klorlar)) + ' – ' + ond(Math.max(...klorlar)) + ' mg/L' : '',
          var: analizli.length > 0 || klorlar.length > 0, yok: analizli.length === 0 && klorlar.length === 0,
          eskiVar: eskiAnaliz > 0, klorVar: klorlar.length > 0
        };

        // 10) Nüfusa göre kuyu (10 bin kişiye düşen)
        const IL = (this.state.data && this.state.data.DISTRICTS) || [];
        const nufusSatir = IL.map(d => {
          const k = kuyular.filter(a => a.district === d.name).length;
          const oran = d.pop ? k / d.pop * 10000 : null;
          return { ad: d.name, k, pop: d.pop, oran };
        }).sort((x, y) => (y.oran == null ? -1 : y.oran) - (x.oran == null ? -1 : x.oran));
        const maxO = Math.max(0.0001, ...nufusSatir.map(x => x.oran || 0));
        const nufus = nufusSatir.map((x, i) => ({
          ad: x.ad, i, deger: x.oran == null ? '—' : ond(x.oran), w: x.oran == null ? '0%' : (x.oran / maxO * 100) + '%',
          alt: x.oran == null ? 'nüfus verisi yok' : x.k + ' kuyu · ' + x.pop.toLocaleString('tr-TR') + ' kişi',
          ipucu: x.ad + ': ' + (x.oran == null ? 'nüfus verisi yok' : x.k + ' kuyu, ' + x.pop.toLocaleString('tr-TR') + ' kişi'), git: git({ ilce: x.ad, tur: 'kuyu' })
        }));

        // 11) Konum kaynağı
        const progMu = a => /program/i.test(a.coordSource || a.source || '');
        const kaynak = [
          { ad: 'Programdan girilen', n: A.filter(a => !a.coordApprox && progMu(a)).length, renk: REN.kuyu },
          { ad: 'Dosyadan aktarılan (KML/Excel)', n: A.filter(a => !a.coordApprox && !progMu(a)).length, renk: REN.depo },
          { ad: 'Yaklaşık — sahada doğrulanacak', n: A.filter(a => a.coordApprox).length, renk: REN.ges }
        ].filter(x => x.n > 0).map((x, i) => ({ ...x, i, w: yuzde(x.n, toplam) + '%', pct: yuzde(x.n, toplam) + '%', ipucu: x.ad + ': ' + x.n + ' kayıt' }));

        // 12) Son hareketler (toplu yazma izleri — aynı dakikada 20'den çok kayıt — sayılmaz)
        const dk = iso => String(iso || '').slice(0, 16);
        const sayim = {};
        for (const a of A) for (const k of [a.guncellendi, a.olusturuldu]) if (k) sayim[dk(k)] = (sayim[dk(k)] || 0) + 1;
        const gercek = iso => iso && sayim[dk(iso)] < 20;
        const yas = ms => { const d = Math.max(0, Math.round((Date.now() - ms) / 60000)); return d < 2 ? 'şimdi' : d < 60 ? d + ' dk önce' : d < 1440 ? Math.floor(d / 60) + ' sa önce' : Math.floor(d / 1440) + ' gün önce'; };
        const olaylar = [];
        for (const a of A) {
          const g = gercek(a.guncellendi) ? Date.parse(a.guncellendi) : 0, o = gercek(a.olusturuldu) ? Date.parse(a.olusturuldu) : 0;
          const ms = Math.max(g || 0, o || 0); if (!ms) continue;
          const yeniKayit = o && (!g || Math.abs(g - o) < 120000);
          olaylar.push({ a, ms, ne: yeniKayit ? 'eklendi' : 'güncellendi', kim: (yeniKayit ? a.olusturan : a.guncelleyen) || '' });
        }
        const son = olaylar.sort((x, y) => y.ms - x.ms).slice(0, 6).map(({ a, ms, ne, kim }) => ({
          kod: a.code, ne: ne + (kim ? ' · ' + kim : ''), zaman: yas(ms), yer: a.village ? a.village + ' · ' + (a.district || '') : (a.district || ''), renk: REN[a.type] || DIGER,
          ac: () => this.setState({ selected: a.id, panel: 'detay', tab: 'harita', detailTab: 'bilgi' })
        }));

        // 3b) Dağılım haritası: gerçek harita zemini ozet-harita.html çerçevesinde çizilir (ozetHaritaGonder); burada yalnız süzgeç ve zemin seçimi
        const gizli = s.ozetGizli || [];
        const nokta = A.filter(a => a.lat != null && a.lon != null);
        const gorunen = nokta.filter(a => !gizli.includes(a.type));
        const turler = SIRA.map(t => ({ t, n: A.filter(a => a.type === t && a.lat != null).length })).filter(x => x.n > 0).map(x => {
          const acik = !gizli.includes(x.t);
          return { ad: TYPES[x.t].kind, n: x.n, renk: REN[x.t], acik, kapali: !acik,
            fg: acik ? ui.fg : ui.mut, kenar: acik ? REN[x.t] : ui.rule, op: acik ? '1' : '.55', ipucu: (acik ? 'Gizle: ' : 'Göster: ') + TYPES[x.t].kind,
            pick: () => this.setState(st => { const g = st.ozetGizli || []; return { ozetGizli: g.includes(x.t) ? g.filter(y => y !== x.t) : [...g, x.t] }; }) };
        });
        const zeminAd = [['street', 'Sokak'], ['sat', 'Uydu'], ['hyb', 'Uydu + ad']];
        const harita = {
          var: nokta.length > 0, turler, say: gorunen.length + ' / ' + nokta.length + ' kayıt gösteriliyor', hepsiVar: gizli.length > 0, hepsi: () => this.setState({ ozetGizli: [] }),
          zeminler: zeminAd.map(([k, ad]) => ({ ad, ...seg((s.ozetZemin || 'hyb') === k, () => { try { localStorage.setItem('ks-ozet-zemin', k); } catch (e) { /* depolama kapalı */ } this.setState({ ozetZemin: k }); }) }))
        };

        return {
          var: true, bos: toplam === 0, zemin,
          renkKuyu: REN.kuyu, renkDepo: REN.depo, renkDiger: DIGER, renkVurgu: 'var(--color-accent)', iz: ui.rule,
          toplam, turDonut: halka(tur.map(x => ({ n: x.n, renk: REN[x.t] }))), turSatir,
          aktif, pasif, aktifYuzde, pasifVar: pasif > 0,
          aktifHalka: toplam ? `conic-gradient(var(--color-accent) 0deg ${aktifYuzde * 3.6}deg, ${ui.rule} 0)` : `conic-gradient(${ui.rule} 0 360deg)`,
          pasifGit: git({ aktiflik: 'Pasif' }),
          fotosuzGit: git({ hazir: 'fotosuz' }), teknikGit: git({ hazir: 'teknikbos' }),
          fotolu, fotoSayi, fotoYuzde, fotoTur,
          fotoHalka: `conic-gradient(var(--color-accent) 0deg ${fotoYuzde * 3.6}deg, ${ui.rule} 0)`,
          ilceSatir, koySatir, koyVar: koySatir.length > 0, yakin, yakinVar: yakin.length > 0,
          teknik, hist, su, nufus, nufusVar: nufus.length > 0, kaynak, kaynakVar: kaynak.length > 0, son, sonVar: son.length > 0, harita
        };
      })(),
