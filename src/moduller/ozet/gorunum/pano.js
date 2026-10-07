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
          ['talep', 'Talep', '#8e8e93', acikT, () => this.panoGit({ durum: 'yeni' }), talepOn],
          ['acik', 'Açık arıza', '#5e5ce6', durumSay(['acik', 'yeniden']), () => this.panoGit({ durum: 'yeni' }), arizaOn],
          ['atandi', 'Atandı', '#0071e3', durumSay(['atandi']), () => this.panoGit({ durum: 'atandi' }), arizaOn],
          ['sahada', 'Sahada', '#ff9f0a', durumSay(['sahada']), () => this.panoGit({ durum: 'sahada' }), arizaOn],
          ['bekle', 'Beklemede', '#af52de', durumSay(['bilgi', 'bekleme', 'yonlendirildi', 'kontrol']), () => this.panoGit({ durum: 'sahada' }), arizaOn],
          ['kapanis', 'Bugün kapandı', '#34c759', kapanan, () => this.panoGit({ durum: 'bitti' }), arizaOn]
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
          ad, n, w: (n / ilceMax * 100) + '%', git: () => this.panoGit({ q: ad === '—' ? '' : ad })
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