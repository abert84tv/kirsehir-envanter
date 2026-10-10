      ekipPano: (() => {
        if (tabId !== 'ekipPano') return { acik: false };
        const kirmizi = 'var(--color-uyari)', turuncu = '#ff9f0a', yesil = '#34c759', mor = '#af52de', gri = '#8e8e93', indigo = '#5e5ce6';
        const iki = n => String(n).padStart(2, '0');
        const bugun = new Date();
        const bugunIso = bugun.getFullYear() + '-' + iki(bugun.getMonth() + 1) + '-' + iki(bugun.getDate());
        const acikF = arizaOn ? s.faults.filter(f => !KAPALI_DURUM.includes(f.status)) : [];
        const assetOf = id => s.assets.find(a => a.id === id) || null;
        const ekipIsler = ad => acikF.filter(f => f.crew === ad);
        const sahadaEkip = new Set(acikF.filter(f => f.status === 'sahada' && f.crew && f.crew !== ATANMADI).map(f => f.crew));
        // Saha şefi yalnız kendi ekibini, kendi personelini ve aracını görür (diğer ekiplerin işi sunucudan da gelmez)
        const sefEkip = me && me.role === 'sef' && me.crew ? me.crew : '';
        const ekipListe = (s.ekipler || []).filter(e => !sefEkip || e.ad === sefEkip);
        const uyeEkip = {};
        for (const e of ekipListe) for (const id of [e.sefId, ...(e.uyeIdler || [])].filter(Boolean)) if (!uyeEkip[id]) uyeEkip[id] = e.ad;

        // — personelin bugünkü durumu: gün kaydı kartın durumunu ezer; dönüş
        //   tarihi geçmiş izin/rapor görevde sayılır
        const PS = {
          sahada: ['Sahada', turuncu], musait: ['Görevde', yesil], izin: ['İzinli', gri],
          rapor: ['Raporlu', mor], gorevli: ['Başka görevde', indigo]
        };
        const perDurum = p => {
          const g = (p.gunler || []).find(x => x.tarih === bugunIso && ['izin', 'rapor', 'gorevli'].includes(x.tur));
          if (g) return g.tur;
          if (['izin', 'rapor', 'gorevli'].includes(p.durum) && !(p.donus && p.donus < bugunIso)) return p.durum;
          return sahadaEkip.has(uyeEkip[p.id]) ? 'sahada' : 'musait';
        };
        const personel = (s.personel || []).filter(p => p.durum !== 'ayrildi' && (!sefEkip || uyeEkip[p.id] === sefEkip));
        const perD = Object.fromEntries(personel.map(p => [p.id, perDurum(p)]));
        const pf = s.ekipPf || '';
        const seg = (TANIM, sayac, toplam, secili, sec) => Object.keys(TANIM).filter(k => sayac[k]).map(k => ({
          l: TANIM[k][0], c: TANIM[k][1], n: String(sayac[k]),
          w: (sayac[k] / Math.max(1, toplam) * 100).toFixed(2) + '%',
          op: !secili || secili === k ? '1' : '.25',
          bg: secili === k ? ui.surf2 : 'transparent', kenar: secili === k ? ui.fg : ui.rule,
          sec: () => sec(secili === k ? '' : k)
        }));
        const perSay = {};
        personel.forEach(p => { perSay[perD[p.id]] = (perSay[perD[p.id]] || 0) + 1; });
        const perSeg = seg(PS, perSay, personel.length, pf, k => this.setState({ ekipPf: k }));

        // — araçlar
        const AS = {
          gorevde: ['Görevde', 'var(--color-accent)', dark ? 'rgba(10,132,255,.2)' : 'rgba(0,113,227,.12)', ui.acc],
          musait: ['Müsait', yesil, 'rgba(52,199,89,.15)', '#1b7a36'],
          bakimda: ['Bakımda', turuncu, 'rgba(255,159,10,.17)', '#9a5200'],
          arizali: ['Arızalı', kirmizi, 'rgba(215,0,21,.1)', kirmizi],
          disi: ['Hizmet dışı', gri, ui.surf2, ui.mut]
        };
        const araclar = ((s.arac && s.arac.list) || []).filter(v => !sefEkip || v.ekip === sefEkip);
        const aracSay = {};
        araclar.forEach(v => { const d = AS[v.durum] ? v.durum : 'musait'; aracSay[d] = (aracSay[d] || 0) + 1; });
        const vf = s.ekipVf || '';
        const aracSeg = seg(AS, aracSay, araclar.length, vf, k => this.setState({ ekipVf: k }));

        // — ekip kartları
        const secEkip = s.ekipSec || '';
        const ini = ad => String(ad || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr');
        const ISC = { sahada: turuncu, atandi: 'var(--color-accent)' };
        const ekipKart = ekipListe.map(e => {
          const isler = ekipIsler(e.ad);
          const n = isler.length;
          const etkin = isler.find(f => f.status === 'sahada') || isler.find(f => f.status === 'atandi') || isler[0];
          const a = etkin ? assetOf(etkin.assetId) : null;
          const uyeler = [...new Set([e.sefId, ...(e.uyeIdler || [])].filter(Boolean))]
            .map(id => (s.personel || []).find(p => p.id === id)).filter(p => p && p.durum !== 'ayrildi');
          const yok = uyeler.filter(p => ['izin', 'rapor', 'gorevli'].includes(perD[p.id])).length;
          const arac = araclar.filter(v => v.ekip === e.ad && v.durum === 'gorevde');
          const on = secEkip === e.ad;
          const yukC = n >= 6 ? kirmizi : (n >= 4 ? turuncu : yesil);
          return {
            ad: e.ad, bolge: [(e.bolgeler || []).join(', '), e.vardiya].filter(Boolean).join(' · '),
            nobetci: e.ad === nobetciEkip,
            yukL: n >= 6 ? n + ' iş · aşırı yük' : (n ? n + ' açık iş' : 'boşta'),
            yukBg: n >= 6 ? 'rgba(215,0,21,.1)' : ui.surf2, yukFg: n >= 6 ? kirmizi : ui.fg,
            yukW: (Math.min(n, 8) / 8 * 100).toFixed(1) + '%', yukC,
            is: etkin ? [a ? a.code : etkin.no, a ? this.yer(a) : (etkin.district || ''), (STATUS_LABEL[etkin.status] || etkin.status).toLocaleLowerCase('tr')].filter(Boolean).join(' · ')
              : (arizaOn ? 'Açık işi yok' : 'Arıza modülü kapalı'),
            isC: etkin ? (ISC[etkin.status] || mor) : yesil,
            uyeler: uyeler.map(p => {
              const d = perD[p.id];
              return { ini: ini(p.ad), c: PS[d][1], title: p.ad + ' · ' + p.meslek + ' · ' + PS[d][0], op: !pf || pf === d ? '1' : '.22' };
            }),
            uyeYok: !uyeler.length,
            kisi: uyeler.length ? (uyeler.length - yok) + '/' + uyeler.length + ' kişi' + (yok ? ' · ' + yok + ' yok' : '') : 'üye atanmadı',
            kisiC: yok ? kirmizi : ui.mut,
            arac: arac.length ? arac.map(v => v.plaka || v.ad).join(', ') : 'araç yok',
            aracC: arac.length ? ui.fg : ui.mut,
            zemin: on ? (dark ? 'rgba(10,132,255,.12)' : 'rgba(0,113,227,.06)') : ui.surf2,
            halka: on ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px ' + ui.rule,
            sec: () => this.setState({ ekipSec: on ? '' : e.ad }),
            isler: () => this.panoGit({ ekip: e.ad })
          };
        }).sort((x, y) => (y.nobetci - x.nobetci) || 0);
        const atanmamis = acikF.filter(f => !f.crew || f.crew === ATANMADI).length;

        // — iş haritası: araç takip bağlantısı yok; noktalar açık işlerin yeri
        // Telefonda kart daha dar: harita genişliği ona göre (yükseklik aynı)
        const W = s.device === 'phone' ? 322 : 372, H = 232;
        const LA0 = 38.83, LA1 = 39.74, LO0 = 33.45, LO1 = 34.64;
        const sc = (H - 16) / (LA1 - LA0), kx = Math.cos(39.3 * Math.PI / 180);
        const x0 = (W - (LO1 - LO0) * kx * sc) / 2;
        const px = (lat, lon) => [x0 + (lon - LO0) * kx * sc, 8 + (LA1 - lat) * sc];
        const icinde = (lat, lon) => isFinite(lat) && isFinite(lon) && lat > LA0 && lat < LA1 && lon > LO0 && lon < LO1;
        const tesisNokta = s.assets.filter(a => icinde(a.lat, a.lon)).map(a => {
          const [x, y] = px(a.lat, a.lon); return { x: x.toFixed(1) + 'px', y: y.toFixed(1) + 'px' };
        });
        const ilceEt = (m ? m.DISTRICTS : []).filter(d => icinde(d.lat, d.lon)).map(d => {
          const [x, y] = px(d.lat, d.lon); return { ad: d.name, x: x.toFixed(1) + 'px', y: y.toFixed(1) + 'px' };
        });
        // Arıza noktası kaydedilmişse o, yoksa tesisin yeri
        const isNokta = acikF.map(f => ({ f, a: assetOf(f.assetId) })).map(x => ({ ...x, p: x.f.nokta || x.a }))
          .filter(x => x.p && icinde(x.p.lat, x.p.lon)).map(({ f, a, p }) => {
          const [x, y] = px(p.lat, p.lon);
          const atanmadi = !f.crew || f.crew === ATANMADI;
          const on = secEkip && f.crew === secEkip;
          const c = atanmadi ? kirmizi : (ISC[f.status] || mor);
          const d = on ? 12 : 8;
          return {
            x: (x - d / 2).toFixed(1) + 'px', y: (y - d / 2).toFixed(1) + 'px', d: d + 'px', c,
            sinif: 'ks-nokta' + (f.status === 'sahada' || on ? ' ks-ping' : ''),
            op: !secEkip || on ? '1' : '.25',
            title: f.no + ' · ' + (a ? a.code : (f.koy || 'şebeke')) + ' · ' + (atanmadi ? 'atanmadı' : f.crew) + ' · ' + (STATUS_LABEL[f.status] || f.status)
          };
        });

        // — araç filosu
        const muayeneGun = iso => { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? null : Math.round((d - new Date(bugunIso + 'T00:00:00')) / 86400000); };
        const filo = araclar.filter(v => !vf || (AS[v.durum] ? v.durum : 'musait') === vf).map(v => {
          const d = AS[v.durum] ? v.durum : 'musait';
          const mg = muayeneGun(v.muayene);
          const tur = (ARAC_TUR[v.tur] || {}).ad || v.tur || '';
          const on = secEkip && v.ekip === secEkip;
          return {
            plaka: v.plaka || v.ad, tip: v.plaka ? v.ad + ' · ' + tur : tur,
            kim: d === 'gorevde' ? [v.ekip, v.surucu, v.is].filter(Boolean).join(' · ') || 'görevde' : (v.ekip ? v.ekip + ' · ' : '') + AS[d][0].toLocaleLowerCase('tr'),
            durum: AS[d][0], dBg: AS[d][2], dFg: AS[d][3],
            muL: mg == null ? 'muayene tarihi yok' : (mg < 0 ? 'muayene ' + (-mg) + ' gün geçti' : 'muayeneye ' + mg + ' gün'),
            muC: mg != null && mg < 30 ? kirmizi : ui.mut,
            muW: mg == null ? '0%' : Math.max(4, Math.min(100, mg / 365 * 100)).toFixed(0) + '%',
            muBar: mg == null ? ui.surf2 : (mg < 30 ? kirmizi : (mg < 90 ? turuncu : yesil)),
            zemin: on ? (dark ? 'rgba(10,132,255,.12)' : 'rgba(0,113,227,.06)') : 'transparent',
            ac: () => this.setState({ tab: 'arac', aracForm: { ...v } })
          };
        });

        const ayarYetki = ['yonetici', 'mudur'].includes((me || {}).role);
        return {
          acik: true,
          baslikAlt: personel.length + ' personel · ' + ekipListe.length + ' ekip · ' + araclar.length + ' araç ve ekipman'
            + (nobetciEkip ? ' · bugün nöbetçi: ' + nobetciEkip : ''),
          perTop: String(personel.length), perSeg, perVar: personel.length > 0, perYok: !personel.length,
          perIpucu: pf ? 'süzülüyor' : '',
          aracTop: String(araclar.length), aracSeg, aracVar: araclar.length > 0, aracYok: !araclar.length,
          aracIpucu: vf ? 'süzülüyor' : '',
          ekipler: ekipKart, ekipVar: ekipKart.length > 0, ekipYok: !ekipKart.length,
          ekipNot: atanmamis ? atanmamis + ' iş ekip bekliyor' : '',
          ekipNotC: atanmamis ? kirmizi : ui.mut,
          tesisNokta, ilceEt, isNokta, haritaH: H + 'px',
          haritaNot: isNokta.length ? isNokta.length + ' açık iş' : 'açık iş yok',
          filo, filoVar: filo.length > 0, filoYok: !filo.length,
          filoSay: vf ? filo.length + ' araç · ' + AS[vf][0].toLocaleLowerCase('tr') : araclar.length + ' araç',
          vfVar: !!vf, vfKaldir: () => this.setState({ ekipVf: '' }),
          secVar: !!secEkip, secAd: secEkip, secKaldir: () => this.setState({ ekipSec: '' }),
          ayarYetki,
          ekipDuzenle: () => this.setState({ tab: 'ayarlar', ayarBolum: 'ekip' }),
          aracDefteri: () => this.setState({ tab: 'arac' })
        };
      })(),