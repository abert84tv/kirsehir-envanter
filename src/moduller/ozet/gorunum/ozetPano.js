      // Özet > Envanter: kutu kutu (modül modül) hareketli gösterge paneli.
      // Renkler haritadaki tür renkleriyle aynıdır (kuyu mavi, depo kehribar, AG mor, GES sarı);
      // koyu temada ayrı adımlar kullanılır. Her kutu bir "modül"dür; şablon ortaktır (masaüstü ve telefon aynı).
      ozetPano: (() => {
        if (tabId !== 'ozet') return { var: false };
        const A = s.assets || [];
        const toplam = A.length;
        const REN = dark ? { kuyu: '#3d8bfd', depo: '#d4770a', ag: '#9a78e8', ges: '#b88700' } : { kuyu: '#0071e3', depo: '#b45309', ag: '#7b3fbf', ges: '#c08a00' };
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

        return {
          var: true, bos: toplam === 0, zemin,
          renkKuyu: REN.kuyu, renkDepo: REN.depo, renkDiger: DIGER, renkVurgu: 'var(--color-accent)', iz: ui.rule,
          toplam, turDonut: halka(tur.map(x => ({ n: x.n, renk: REN[x.t] }))), turSatir,
          aktif, pasif, aktifYuzde, pasifVar: pasif > 0,
          aktifHalka: toplam ? `conic-gradient(var(--color-accent) 0deg ${aktifYuzde * 3.6}deg, ${ui.rule} 0)` : `conic-gradient(${ui.rule} 0 360deg)`,
          pasifGit: git({ aktiflik: 'Pasif' }),
          fotolu, fotoSayi, fotoYuzde, fotoTur,
          fotoHalka: `conic-gradient(var(--color-accent) 0deg ${fotoYuzde * 3.6}deg, ${ui.rule} 0)`,
          ilceSatir, koySatir, koyVar: koySatir.length > 0, yakin, yakinVar: yakin.length > 0
        };
      })(),
