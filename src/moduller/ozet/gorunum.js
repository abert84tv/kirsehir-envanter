      pano: (() => {
        if (tabId !== 'isPano') return { acik: false };
        const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
        const yarin = bugun.getTime() + 86400000;
        const bugunMu = str => { const t = this.damgaMs(str); return t >= bugun.getTime() && t < yarin; };
        const saat = str => { const m = String(str || '').match(/\s(\d{1,2}):/); return m ? +m[1] : null; };
        const F = arizaOn ? myFaults : [];
        const T = talepOn ? (s.talepler || []) : [];
        const acikF = F.filter(f => !KAPALI_DURUM.includes(f.status));
        const acikT = T.filter(t => !TALEP_KAPALI.includes(t.durum));
        const gec = f => { if (!sureOn) return false; const d = this.sureDurum(f); return !!(d && d.gecikti); };
        const gelenF = F.filter(f => bugunMu(f.opened)), gelenT = T.filter(t => bugunMu(t.acilis));
        const kapanan = F.filter(f => f.status === 'cozuldu' && bugunMu(f.closed));
        const geciken = acikF.filter(gec);
        const sureler = F.filter(f => f.status === 'cozuldu' && f.openedIso && f.closedIso)
          .map(f => (new Date(f.closedIso) - new Date(f.openedIso)) / 3600000).filter(h => h >= 0 && h < 24 * 120);
        const ort = sureler.length ? sureler.reduce((a, b) => a + b, 0) / sureler.length : null;
        const saatlik = (liste, al) => { const b = Array(11).fill(0); liste.forEach(x => { const h = saat(al(x)); if (h != null && h >= 8 && h <= 18) b[h - 8]++; }); return b; };
        const birikim = arr => arr.map((_, i) => arr.slice(0, i + 1).reduce((a, b) => a + b, 0));
        const yesil = '#34c759', mavi = 'var(--color-accent)', kirmizi = 'var(--color-uyari)';
        const gelenSaat = saatlik([...gelenF, ...gelenT], x => x.opened || x.acilis);
        const sureMetin = h => h == null ? '—' : (h < 48 ? Math.floor(h) + ' sa ' + Math.round((h % 1) * 60) + ' dk' : Math.round(h / 24) + ' gün');
        const kpis = [
          { label: 'Bugün gelen', val: String(gelenF.length + gelenT.length), alt: gelenT.length + ' talep · ' + gelenF.length + ' arıza', altC: ui.mut, alarm: false, el: this.kivilcim(gelenSaat, '#0071e3') },
          { label: 'Bugün kapanan', val: String(kapanan.length), alt: (gelenF.length ? '%' + Math.round(kapanan.length / gelenF.length * 100) + ' kapanma' : 'bugün açılan arıza yok'), altC: '#1b7a36', alarm: false, el: this.kivilcim(birikim(saatlik(kapanan, x => x.closed)), yesil) },
          ...(sureOn ? [{ label: 'Hedef süresi geçen', val: String(geciken.length), alt: geciken.filter(f => f.priority === 'Acil').length + '’i acil', altC: geciken.length ? kirmizi : ui.mut, alarm: geciken.length > 0, el: null }] : []),
          { label: 'Ort. çözüm süresi', val: sureMetin(ort), alt: sureler.length ? 'son ' + sureler.length + ' kapanan arıza' : 'henüz kapanan arıza yok', altC: ui.mut, alarm: false, el: null },
          ...(!sureOn ? [] : [(() => {
            const so = this.slaOzet();
            return { label: 'SLA zamanında kapanış', val: so.yuzde == null ? '—' : '%' + so.yuzde,
              alt: so.say ? (so.asimGun ? 'aşım toplamı ' + so.asimGun.toLocaleString('tr-TR') + ' gün' : 'aşım yok') + ' · bekleme ' + so.beklemeSaat + ' sa' : 'henüz kapanan arıza yok',
              altC: so.asimGun ? kirmizi : ui.mut, alarm: false, el: null };
          })()])
        ];
        const durumSay = d => acikF.filter(f => d.includes(f.status));
        const ASAMA = [
          ['talep', 'Talep', '#8e8e93', acikT, () => this.setState({ tab: 'talep' }), talepOn],
          ['acik', 'Açık arıza', '#5e5ce6', durumSay(['acik', 'yeniden']), () => this.setState({ tab: 'ariza', arzF: { durum: 'acik' } }), arizaOn],
          ['atandi', 'Atandı', '#0071e3', durumSay(['atandi']), () => this.setState({ tab: 'ariza', arzF: { durum: 'atandi' } }), arizaOn],
          ['sahada', 'Sahada', '#ff9f0a', durumSay(['sahada']), () => this.setState({ tab: 'ariza', arzF: { durum: 'sahada' } }), arizaOn],
          ['bekle', 'Beklemede', '#af52de', durumSay(['bilgi', 'bekleme', 'yonlendirildi', 'kontrol']), () => this.setState({ tab: 'ariza', arzF: {} }), arizaOn],
          ['kapanis', 'Bugün kapandı', '#34c759', kapanan, () => this.setState({ tab: 'ariza', arzF: { durum: 'cozuldu' } }), arizaOn]
        ].filter(r => r[5]);
        const hedef = Math.max(gelenF.length, 1);
        const asamalar = ASAMA.map(([id, l, c, liste, git], i) => {
          const n = liste.length, son = id === 'kapanis';
          const late = son || id === 'talep' ? 0 : liste.filter(gec).length;
          const acilT = id === 'talep' ? liste.filter(t => t.oncelik === 'Acil').length : 0;
          return {
            l, c, n, git, cizgi: i < ASAMA.length - 1, gecikme: (i * .3).toFixed(1) + 's',
            okW: son ? Math.min(100, n / hedef * 100) + '%' : (n ? (100 - late / n * 100) + '%' : '0%'),
            okC: c, lateW: n && !son ? (late / n * 100) + '%' : '0%',
            not: son ? (gelenF.length ? 'bugün açılanların %' + Math.round(n / hedef * 100) + '’i' : 'kapanan iş') : (id === 'talep' ? (acilT ? acilT + ' acil' : 'bekleyen talep') : (late ? late + ' gecikmiş' : (n ? 'hepsi süresinde' : 'iş yok'))),
            notC: son ? '#1b7a36' : ((late || acilT) ? kirmizi : ui.mut),
            sinif: 'ks-asama' + (son && n ? ' ks-parla' : '')
          };
        });
        const ONC = { 'Acil': 0, 'Yüksek': 1, 'Normal': 2, 'Düşük': 3 };
        const oncRenk = p => p === 'Acil' ? kirmizi : (p === 'Yüksek' ? '#ff9f0a' : ui.mut);
        const isler = acikF.map(f => ({ f, d: sureOn ? this.sureDurum(f) : null }))
          .sort((a, b) => ((b.d && b.d.gecikti) ? 1 : 0) - ((a.d && a.d.gecikti) ? 1 : 0) || (ONC[a.f.priority] ?? 9) - (ONC[b.f.priority] ?? 9) || this.damgaMs(a.f.opened) - this.damgaMs(b.f.opened))
          .slice(0, 12).map(({ f, d }) => {
            const a = s.assets.find(x => x.id === f.assetId);
            return {
              no: f.no, pr: f.priority || 'Normal', prC: oncRenk(f.priority),
              ne: f.type || 'Arıza', yer: (a ? a.code + ' · ' : '') + (a ? this.yerGoster(a) : (f.district || '')),
              durum: STATUS_LABEL[f.status] || f.status, ekip: f.crew && f.crew !== ATANMADI ? f.crew : 'Atanmadı',
              ekipC: f.crew && f.crew !== ATANMADI ? ui.fg : 'var(--color-bekle)',
              sure: d ? (d.gecikti ? d.etiket : 'hedef ' + d.hedef) : (f.opened || ''), sureC: d && d.gecikti ? kirmizi : ui.mut,
              ac: () => this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...f } })
            };
          });
        const ilceSay = {};
        acikF.forEach(f => { const k = f.district || (s.assets.find(x => x.id === f.assetId) || {}).district || '—'; ilceSay[k] = (ilceSay[k] || 0) + 1; });
        acikT.forEach(t => { const k = t.ilce || '—'; ilceSay[k] = (ilceSay[k] || 0) + 1; });
        const ilceMax = Math.max(1, ...Object.values(ilceSay));
        const ilceler = Object.entries(ilceSay).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ad, n]) => ({
          ad, n, w: (n / ilceMax * 100) + '%', git: () => this.setState({ tab: 'ariza', arzQ: ad === '—' ? '' : ad, arzF: {} })
        }));
        const ekipSay = {};
        acikF.forEach(f => { const k = f.crew && f.crew !== ATANMADI ? f.crew : 'Atanmadı'; ekipSay[k] = (ekipSay[k] || 0) + 1; });
        const ekipler = Object.entries(ekipSay).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ad, n]) => ({
          ad, n, w: Math.min(100, n / 8 * 100) + '%', c: ad === 'Atanmadı' ? '#8e8e93' : (n >= 6 ? kirmizi : (n >= 4 ? '#ff9f0a' : yesil)),
          etiket: n >= 6 && ad !== 'Atanmadı' ? n + ' iş · aşırı yük' : n + ' iş'
        }));
        const zaman = iso => {
          const t = iso ? new Date(iso).getTime() : 0;
          if (!t) return '';
          const dk = Math.round((Date.now() - t) / 60000);
          return dk < 1 ? 'şimdi' : (dk < 60 ? dk + ' dk' : (dk < 1440 ? Math.round(dk / 60) + ' sa' : Math.round(dk / 1440) + ' gün'));
        };
        const SINIF_RENK = { ariza: kirmizi, kayit: mavi, veri: '#5e5ce6', ambar: '#ff9f0a', is_emri: '#af52de', oturum: '#8e8e93', talep: '#8e8e93' };
        const akis = (s.denetim || []).filter(x => x.sinif !== 'oturum').slice(0, 8).map(x => ({
          ne: x.ne, detay: [x.kapsam, x.detay].filter(Boolean).join(' · '), kim: x.kim || '', zaman: zaman(x.iso) || x.t || '',
          c: SINIF_RENK[x.sinif] || '#8e8e93'
        }));
        return {
          acik: true, kpis, asamalar, isler, isVar: isler.length > 0, isYok: isler.length === 0,
          isYokNot: arizaOn ? 'Açık arıza yok. Yeni arıza “Açık” süzgecinden ya da tesis kartındaki “Arıza aç” ile girilir.' : 'Arıza modülü kapalı.',
          ilceler, ilceVar: ilceler.length > 0, ilceYok: ilceler.length === 0,
          ekipler, ekipVar: ekipler.length > 0, ekipYok: ekipler.length === 0,
          akis, akisVar: akis.length > 0, akisYok: akis.length === 0,
          acikSay: acikF.length + acikT.length
        };
      })(),
      ozet: (() => {
        const byD = {}, byV = {};
        for (const a of s.assets) {
          (byD[a.district] = byD[a.district] || { n: 0, kuyu: 0, depo: 0, miss: 0, aktif: 0, pasif: 0 });
          byD[a.district].n++;
          if (aktifMi(a)) byD[a.district].aktif++; else byD[a.district].pasif++;
          if (a.type === 'kuyu') byD[a.district].kuyu++;
          if (a.type === 'depo') byD[a.district].depo++;
          if (this.missingOf(a).length) byD[a.district].miss++;
          const key = this.yer(a);
          (byV[key] = byV[key] || { n: 0, miss: 0, photos: 0 });
          byV[key].n++; byV[key].photos += a.photos;
          if (this.missingOf(a).length) byV[key].miss++;
        }
        const miss = s.assets.map(a => ({ a, m: this.missingOf(a) })).filter(x => x.m.length);
        const near = [...s.assets].map(a => ({ a, km: this.distKm(a) })).sort((x, y) => x.km - y.km).slice(0, 8);
        const openF = s.faults.filter(f => !KAPALI_DURUM.includes(f.status));
        // Tekrarlayan arıza: aynı tesiste birden çok kayıt — kalıcı çözüm işareti
        const tekrarList = (() => {
          const g = {};
          for (const f of s.faults) {
            const o = (g[f.assetId] = g[f.assetId] || { n: 0, turler: {}, son: '', acik: 0 });
            o.n++;
            o.turler[f.type] = (o.turler[f.type] || 0) + 1;
            if (!KAPALI_DURUM.includes(f.status)) o.acik++;
            if (!o.son) o.son = f.opened;
          }
          return Object.entries(g).filter(([, o]) => o.n > 1).sort((x, y) => y[1].n - x[1].n).slice(0, 12)
            .map(([id, o]) => {
              const a = s.assets.find(x => x.id === id);
              const enSik = Object.entries(o.turler).sort((x, y) => y[1] - x[1])[0];
              return {
                code: a ? a.code : '—', place: a ? this.yer(a) : 'kayıt bulunamadı',
                n: o.n + ' arıza', tur: enSik ? enSik[0] + ' × ' + enSik[1] : '—',
                son: o.son || '—', acik: o.acik ? o.acik + ' açık' : 'kapalı',
                acikFg: o.acik ? ui.acc : ui.mut,
                open: () => {
                  if (!a) return;
                  this.flyTo(a.lat, a.lon, 16);
                  this.setState({ selected: a.id, panel: 'detay', detailTab: 'ariza' });
                }
              };
            });
        })();
        // Ekip performansı: çözülen iş, ortalama süre, tekrar oranı
        const ekipPerf = (s.ekipler || []).map(e => {
          const isler = s.faults.filter(f => f.crew === e.ad);
          const cozulen = isler.filter(f => f.status === 'cozuldu');
          const acik = isler.filter(f => !KAPALI_DURUM.includes(f.status));
          const saatler = cozulen.map(f => parseFloat(String(f.hours || '').replace(',', '.')))
            .filter(x => isFinite(x) && x > 0);
          const ortSaat = saatler.length
            ? Math.round(saatler.reduce((a, b) => a + b, 0) / saatler.length * 10) / 10 : null;
          const tekrarli = cozulen.filter(f => (f.tekrar || 0) > 0).length;
          const gecikmis = sureOn ? acik.filter(f => { const dd = this.sureDurum(f); return dd && dd.gecikti; }).length : 0;
          const turSay = {};
          for (const f of isler) turSay[f.type] = (turSay[f.type] || 0) + 1;
          const enSik = Object.entries(turSay).sort((a, b) => b[1] - a[1])[0];
          return {
            ad: e.ad, toplam: isler.length,
            satir1: cozulen.length + ' çözüldü · ' + acik.length + ' açık'
              + (gecikmis ? ' · ' + gecikmis + ' gecikmiş' : ''),
            satir1Fg: gecikmis ? ui.acc : ui.fg,
            satir2: [
              ortSaat != null ? 'ortalama ' + ortSaat + ' saat' : 'süre girilmemiş',
              tekrarli ? tekrarli + ' iş tekrar açıldı' : 'tekrar açılan iş yok',
              enSik ? 'en sık: ' + enSik[0] : ''
            ].filter(Boolean).join(' · '),
            barW: Math.round(Math.min(1, isler.length / Math.max(1, ...(s.ekipler || []).map(x =>
              s.faults.filter(f => f.crew === x.ad).length))) * 100) + '%'
          };
        }).filter(x => x.toplam > 0).sort((a, b) => b.toplam - a.toplam);
        // Esnek raporlama — gün/hafta/ay/yıl/özel aralık + il/ilçe süzgeci
        // (madde 37). Daha önce "Bu hafta yapılanlar" oturum içindeki
        // kayıtları sayıyordu; artık gerçek tarih damgasından hesaplanıyor.
        const assetOf = id => s.assets.find(x => x.id === id);
        const aralik = this.zamanAraligi(s.ozetZaman || 'hafta', s.ozetBas, s.ozetBit);
        const ilceF = s.ozetIlce || '';
        const ilceUyar = a => !ilceF || (a && a.district === ilceF);
        const faultsF = s.faults.filter(f => {
          const d = this.tarihParse(f.opened);
          return d && d >= aralik.bas && d < aralik.bit && ilceUyar(assetOf(f.assetId));
        });
        const cozulenF = faultsF.filter(f => f.status === 'cozuldu');
        let testSay = 0;
        for (const [aid, list] of Object.entries(s.tests || {})) {
          if (!ilceUyar(assetOf(aid))) continue;
          for (const t of list) {
            const d = this.tarihParse(t.date);
            if (d && d >= aralik.bas && d < aralik.bit) testSay++;
          }
        }
        const hareketF = ((s.ambar && s.ambar.hareket) || []).filter(h => {
          const d = this.tarihParse(h.damga);
          if (!d || d < aralik.bas || d >= aralik.bit) return false;
          if (!ilceF) return true;
          const a = h.assetId ? assetOf(h.assetId) : null;
          return !!a && a.district === ilceF;
        });
        const sarfF = hareketF.filter(h => h.tur === 'sarf' || h.tur === 'hurda');
        // Pasife alınmış kalemin eski sarfı da fiyatıyla sayılır
        const tutarOf = h => { const kalem = this.katalogBul(h.malzeme); return kalem ? (Number(kalem.fiyat) || 0) * (Number(h.adet) || 0) : 0; };
        const malzemeMaliyet = sarfF.reduce((t, h) => t + tutarOf(h), 0);
        const kritikStokSayi = STOK_KALEM.filter(m => this.ambarDurum(m[0]).kritik).length;
        const koyG = {};
        for (const h of sarfF) {
          const a = h.assetId ? assetOf(h.assetId) : null;
          // Köy adı girilmemiş tesiste en yakın köy (≈)
          const key = a ? this.yerGoster(a) : 'Tesis belirtilmemiş';
          const o = (koyG[key] = koyG[key] || { tutar: 0, kalemler: {} });
          o.tutar += tutarOf(h);
          o.kalemler[h.malzeme] = (o.kalemler[h.malzeme] || 0) + (Number(h.adet) || 0);
        }
        // Köy bazlı arızalar: arızanın köyü = girilen köy > tesisin köyü >
        // arıza noktasına en yakın köy > tesise en yakın köy (arizaKoy)
        const arizaKoyG = {};
        for (const f of s.faults) {
          const d = this.tarihParse(f.opened);
          if (!d || d < aralik.bas || d >= aralik.bit) continue;
          const a = f.assetId ? assetOf(f.assetId) : null;
          const ky = this.arizaKoy(f, a);
          if (ilceF && ky.ilce !== ilceF) continue;
          const key = (ky.ad || 'Köy belirlenemedi') + ' · ' + (ky.ilce || '—');
          const o = (arizaKoyG[key] = arizaKoyG[key] || { n: 0, acik: 0, nokta: 0, sebeke: 0, turler: {}, gruplar: {}, yaklasik: 0 });
          o.n++;
          if (!KAPALI_DURUM.includes(f.status)) o.acik++;
          if (f.nokta) o.nokta++;
          if (!f.assetId) o.sebeke++;
          if (ky.kaynak === 'nokta' || ky.kaynak === 'tesis-yakın') o.yaklasik++;
          o.turler[f.type] = (o.turler[f.type] || 0) + 1;
          const g = arizaGrubu(f, a); o.gruplar[g] = (o.gruplar[g] || 0) + 1;
        }
        const arizaKoy = Object.entries(arizaKoyG).sort((x, y) => y[1].n - x[1].n || y[1].acik - x[1].acik).slice(0, 30)
          .map(([name, o]) => {
            const enSik = Object.entries(o.turler).sort((x, y) => y[1] - x[1])[0];
            return {
              name: name + (o.yaklasik === o.n ? ' ≈' : ''),
              ozet: [o.acik ? o.acik + ' açık' : 'hepsi kapandı',
                Object.entries(o.gruplar).map(([g, n]) => ARIZA_GRUP[g].ad + ' ' + n).join(', '),
                enSik ? 'en sık: ' + enSik[0] + (enSik[1] > 1 ? ' (' + enSik[1] + ')' : '') : '',
                o.sebeke ? o.sebeke + ' şebeke arızası' : '',
                o.nokta ? o.nokta + '/' + o.n + ' arıza noktası kayıtlı' : 'arıza noktası yok'].filter(Boolean).join(' · '),
              n: String(o.n)
            };
          });
        const malzemeKoy = Object.entries(koyG).sort((x, y) => y[1].tutar - x[1].tutar).slice(0, 20)
          .map(([name, o]) => ({
            name, ozet: Object.entries(o.kalemler).map(([k, n]) => k + ' × ' + n).join(' · '),
            tutar: this.tl(o.tutar)
          }));
        return {
          ekipPerf,
          ekipPerfYok: ekipPerf.length === 0,
          ekipPerfNot: 'Ekip başına iş yükü, ortalama çözüm süresi ve tekrar açılan iş sayısı. Süre, arıza kaydına girilen çalışma saatinden gelir.',
          ekipPerfBos: 'Ekiplere atanmış çözülmüş iş yok. Arıza kayıtlarında ekip atanıp çalışma saati girildikçe bu tablo dolar.',
          tekrar: tekrarList,
          tekrarYok: tekrarList.length === 0,
          tekrarNot: 'Aynı tesiste birden çok arıza kaydı olanlar — en çok kayıtlıdan başlar.',
          tekrarBos: 'Aynı tesiste ikinci arıza kaydı yok. Bir tesis burada görünmeye başladıysa aynı parça tekrar arızalanıyor demektir; kalıcı çözüm gerekir.',
          stats: [
            { n: String(s.assets.length), label: 'Kayıt' },
            { n: String(s.assets.filter(a => a.type === 'kuyu').length), label: 'Kuyu' },
            { n: String(s.assets.filter(a => a.type === 'depo').length), label: 'Depo' },
            { n: String(s.assets.filter(a => aktifMi(a)).length), label: 'Aktif' },
            { n: String(s.assets.filter(a => !aktifMi(a)).length), label: 'Pasif' },
            { n: String(miss.length), label: 'Eksik bilgili' },
            { n: String(openF.length), label: 'Açık arıza' },
            { n: String(pendA.length + pendF.length + s.queue.filter(q => q.state === 'pending').length), label: 'Eşitleme bekleyen' }
          ],
          districts: Object.entries(byD).sort((x, y) => y[1].n - x[1].n).map(([name, v]) => ({
            name, n: v.n + ' kayıt', mix: `${v.kuyu} kuyu · ${v.depo} depo · ${v.aktif} aktif · ${v.pasif} pasif`,
            miss: v.miss + ' eksik',
            missFg: v.miss ? ui.acc : ui.mut,
            barW: Math.round(v.n / Math.max(...Object.values(byD).map(z => z.n)) * 100) + '%'
          })),
          villages: Object.entries(byV).sort((x, y) => y[1].n - x[1].n).slice(0, 12).map(([name, v]) => ({
            name, n: v.n + ' kayıt', photos: v.photos + ' fotoğraf',
            miss: v.miss ? v.miss + ' eksik' : 'tam',
            missFg: v.miss ? ui.acc : ui.mut
          })),
          missing: miss.slice(0, 20).map(({ a, m }) => ({
            code: a.code, place: this.yer(a),
            fields: m.join(' · '), count: m.length + ' alan',
            open: () => { this.flyTo(a.lat, a.lon, 16); this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi' }); }
          })),
          aktiflik: (() => {
            const satir = ['kuyu', 'depo', 'ag', 'ges'].map(t => {
              const hepsi = s.assets.filter(a => a.type === t);
              const ak = hepsi.filter(a => aktifMi(a)).length;
              return {
                tur: TYPES[t].kind, aktif: String(ak), pasif: String(hepsi.length - ak),
                toplam: String(hepsi.length),
                oran: hepsi.length ? Math.round(ak / hepsi.length * 100) + '%' : '—',
                barW: hepsi.length ? Math.round(ak / hepsi.length * 100) + '%' : '0%'
              };
            });
            const ta = s.assets.filter(a => aktifMi(a)).length;
            return {
              satir,
              toplam: {
                tur: 'Toplam', aktif: String(ta), pasif: String(s.assets.length - ta),
                toplam: String(s.assets.length),
                oran: s.assets.length ? Math.round(ta / s.assets.length * 100) + '%' : '—'
              },
              note: 'Pasif kayıtlar envanterden düşmez; hizmet dışı sayılır. İlçe kırılımı aşağıdaki tabloda, kayıt bazında Envanter sekmesindeki Durum süzgecinde.'
            };
          })(),
          missingNote: miss.length + ' kayıtta zorunlu alan boş. Toplu aktarımla gelen noktalar burada listelenir — tek tek açıp doldurabilirsiniz.',
          near: near.map(({ a, km }) => ({
            code: a.code, place: this.yer(a),
            km: km.toFixed(1) + ' km',
            kind: TYPES[a.type].kind,
            route: () => this.yolTarifiVer(a)
          })),
          zamanSec: [['bugun', 'Bugün'], ['hafta', 'Hafta'], ['ay', 'Ay'], ['yil', 'Yıl'], ['tum', 'Tümü'], ['ozel', 'Özel']]
            .map(([k, ad]) => ({
              label: ad, ...seg((s.ozetZaman || 'hafta') === k, () => this.setState({ ozetZaman: k }))
            })),
          ozelVar: s.ozetZaman === 'ozel',
          ozelBas: s.ozetBas, onOzelBas: e => this.setState({ ozetBas: e.target.value }),
          ozelBit: s.ozetBit, onOzelBit: e => this.setState({ ozetBit: e.target.value }),
          ilceler: [{ ad: 'Tüm ilçeler', deger: '' }, ...Object.keys(byD).sort().map(d => ({ ad: d, deger: d }))],
          ilce: s.ozetIlce || '', onIlce: e => this.setState({ ozetIlce: e.target.value }),
          week: [
            { n: String(faultsF.length), label: 'Açılan arıza', fg: ui.fg },
            { n: String(cozulenF.length), label: 'Çözülen arıza', fg: ui.fg },
            { n: String(testSay), label: 'Girilen deneme', fg: ui.fg },
            { n: String(sarfF.length), label: 'Malzeme hareketi', fg: ui.fg },
            { n: this.tl(malzemeMaliyet), label: 'Malzeme maliyeti', fg: ui.fg },
            { n: String(kritikStokSayi), label: 'Kritik stok', fg: kritikStokSayi ? 'var(--color-uyari)' : ui.fg }
          ],
          weekBaslik: aralik.ad + (ilceF ? ' · ' + ilceF : '') + ' yapılanlar',
          weekNote: 'Gün/hafta/ay/yıl ya da özel bir aralık ve isterseniz tek bir ilçe seçin — arıza, deneme ve ambar hareketi kayıtlarının gerçek tarih damgasına göre süzülür.',
          malzemeKoy,
          malzemeKoyVar: malzemeKoy.length > 0,
          arizaKoy, arizaKoyVar: arizaKoy.length > 0,
          arizaKoyNot: 'Seçili aralıkta açılan arızaların köy · ilçe kırılımı. Köy şu sırayla belirlenir: kayıtta girilen köy, tesisin köyü, ekibin kaydettiği arıza noktasına en yakın köy, tesise en yakın köy. “≈” yalnız koordinattan bulunmuş köyü gösterir.',
          malzemeKoyNot: 'Seçili aralıkta arıza kapanışında ekip zimmetinden düşülen (sarf/hurda) malzemenin köy · ilçe kırılımı ve tutarı. Ambar ekranından elle girilen sarf işlemleri bir tesise bağlı olmadığı için "Tesis belirtilmemiş" altında toplanır.',
          // Özet tek ekranda 9 ayrı tablo/liste üst üste duruyordu (kullanıcı
          // geri bildirimi — "çok karmaşık"), üçe bölündü: Envanter (dağılım/
          // eksik bilgi/yakın tesisler), Ekip ve arıza (performans/tekrar),
          // Rapor (tarih aralıklı arıza+stok özeti + köy bazlı malzeme
          // maliyeti — ikisi de aynı zaman/ilçe süzgecini paylaşıyor).
          sekmeSec: [['envanter', 'Envanter'], ['ekip', 'Ekip ve arıza'], ['rapor', 'Rapor']]
            .map(([k, ad]) => ({
              ad, ...seg((s.ozetSekme || 'envanter') === k, () => this.setState({ ozetSekme: k }))
            })),
          // Telefonda "Rapor" sekmesi yok — esnek tarih raporu ve köy bazlı
          // malzeme maliyeti masaüstüne özgü (zaten öyleydi, bu turda taşınmadı).
          sekmeSecTel: [['envanter', 'Envanter'], ['ekip', 'Ekip ve arıza']]
            .map(([k, ad]) => ({
              ad, ...seg((s.ozetSekme || 'envanter') === k, () => this.setState({ ozetSekme: k }))
            })),
          envanterSekmesi: (s.ozetSekme || 'envanter') === 'envanter',
          ekipSekmesi: s.ozetSekme === 'ekip',
          raporSekmesi: s.ozetSekme === 'rapor'
        };
      })(),
      exportReport: kind => () => kind === 'excel' ? this.excelVer() : this.pdfVer(),
      exportExcel: () => this.excelVer(),
      exportPdf: () => this.pdfVer(),