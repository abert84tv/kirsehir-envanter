      ambarEkran: (() => {
        // Ağır hesap (katalog × 30 gün tüketim) yalnız Ambar açıkken yapılır
        if (tabId !== 'ambar') return { acik: false, form: { on: false } };
        const af = s.ambarForm;
        // Yetkiler (Ayarlar › Yetkiler): rol + kişiye özel istisna + Stok sayfa yetkisi; saha personeli yalnız kendi ekibini düşer
        const sayfaYaz = yetki('ambar') === 'tam' && (me || {}).role !== 'izleyici';
        const EKIPLER = me && me.role === 'personel' && me.crew ? [me.crew] : SAHA_EKIP;
        const izin = {
          giris: this.stokIzin('giris'), zimmet: this.stokIzin('zimmet'), sarf: this.stokIzin('sarf', me && me.crew), duzelt: this.stokIzin('hurda'),
          katalog: sayfaYaz && this.yetkiVar(me, 'stokKatalog'), siparis: sayfaYaz && this.yetkiVar(me, 'stokSiparis'),
          fiyat: this.yetkiVar(me, 'rapor')    // fiyat ve tutar yalnız rapor yetkisi olanlara gösterilir
        };
        const izinTur = { giris: izin.giris, iade: izin.zimmet, zimmet: izin.zimmet, sarf: izin.sarf, hurda: izin.duzelt, cikis: izin.duzelt };
        const yazabilir = izin.giris || izin.zimmet || izin.sarf || izin.duzelt;
        const katYetki = izin.katalog;
        const tlGor = n => izin.fiyat ? this.tl(n) : '';
        const zimTablo = (s.ambar && s.ambar.zimmet) || {};
        const kisa = A => A.replace(' ambarı', '').replace(' ambar', '');
        const AMB_RENK = ['var(--color-accent)', '#5e5ce6', '#ff9f0a', '#34c759'];
        const kirmizi = 'var(--color-uyari)', turuncu = '#e07b00', yesil = '#1f9d4c';
        const sayi = n => (Math.round(n * 10) / 10).toLocaleString('tr-TR');
        const birimK = b => b === 'metre' ? 'm' : b;
        const tlKisa = n => n >= 1e6 ? '₺' + (n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' M'
          : (n >= 1e4 ? '₺' + Math.round(n / 1000).toLocaleString('tr-TR') + ' B' : this.tl(n));
        const katalog = this.katalog();
        const stokta = katalog.filter(k => !k.pasif && stoktaMi(k));
        const sip = s.siparis || [];
        const sipSet = new Set(sip.map(x => x.malzeme));
        const tum = stokta.map(k => ({ k, d: this.ambarDurum(k.ad), dag: AMBARLAR.map(A => this.ambarMevcut(k.ad, A)) }));
        const gunC = g => g == null ? ui.mut : (g < 7 ? kirmizi : (g < 15 ? turuncu : yesil));
        const gunYazi = x => {
          if (!x.d.girilmis) return 'girilmedi';
          if (x.d.toplam <= 0) return 'Tükendi';
          if (x.d.kacGun == null) return 'çıkış yok';
          return x.d.kacGun < 1 ? '1 günden az' : Math.round(x.d.kacGun) + ' gün';
        };
        const formAc = (tur, malzeme, ek) => this.setState({ ambarKart: null, ambarForm: {
          tur, malzeme: malzeme || '', ambar: tur === 'sarf' || tur === 'hurda' ? '' : AMBARLAR[0],
          ekip: ['zimmet', 'iade', 'sarf', 'hurda'].includes(tur) ? (EKIPLER[0] || '') : '', adet: '', not: '', ...(ek || {}) } });

        // Kayıt türü → yön ve neden listesi (ekran sadeliği için; saklanan tür altı olarak kalır)
        const yonDe = tur => ['giris', 'iade'].includes(tur) ? 'giris' : 'cikis';
        const NEDEN = {
          giris: [{ tur: 'giris', ad: 'Mal alımı', etki: 'ambar artar' }, { tur: 'iade', ad: 'Ekipten iade', etki: 'ambar artar · ekip azalır' }],
          cikis: [{ tur: 'zimmet', ad: 'Ekibe ver', etki: 'ambar azalır · ekip artar' }, { tur: 'sarf', ad: 'Sahada kullanıldı', etki: 'ekip azalır' },
            { tur: 'hurda', ad: 'Hurda', etki: 'ekip azalır' }, { tur: 'cikis', ad: 'Ambardan düş', etki: 'ambar azalır (kayıp, sayım farkı)' }]
        };
        const nedenSec = k => this.setState({ ambarForm: { ...this.state.ambarForm, tur: k,
          ambar: k === 'sarf' || k === 'hurda' ? '' : (this.state.ambarForm.ambar || AMBARLAR[0]),
          ekip: ['zimmet', 'iade', 'sarf', 'hurda'].includes(k) ? (this.state.ambarForm.ekip || EKIPLER[0] || '') : '' } });

        // — göstergeler
        const kritikler = tum.filter(x => x.d.kritik);
        const az7 = kritikler.filter(x => x.d.toplam <= 0 || (x.d.kacGun != null && x.d.kacGun < 7)).length;
        const hareketler = (s.ambar && s.ambar.hareket) || [];
        const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
        const gunMs = 86400000;
        const ambarDeger = tum.reduce((t, x) => t + x.d.toplam * (Number(x.k.fiyat) || 0), 0);
        const ekipDeger = tum.reduce((t, x) => t + x.d.zim * (Number(x.k.fiyat) || 0), 0);
        const ambardaN = tum.filter(x => x.d.toplam > 0).length;
        const katSayi = new Set(stokta.map(k => k.kat)).size;
        const tukendi = kritikler.filter(x => x.d.toplam <= 0).length, azaldi = kritikler.length - tukendi;
        // Bugünkü hareket sayısı ve son 7 günün günlük işlem sayısı (küçük çizgi için)
        const hareketGun = d => hareketler.filter(h => { const m = this.damgaMs(h.damga); return m >= d.getTime() && m < d.getTime() + gunMs; });
        const bugunHareket = hareketGun(bugun);
        const bugunGiris = bugunHareket.filter(h => ['giris', 'iade'].includes(h.tur)).length;
        const yediIslem = [6, 5, 4, 3, 2, 1, 0].map(i => hareketGun(new Date(bugun.getTime() - i * gunMs)).length);
        const kpis = [
          { label: 'Malzeme çeşidi', val: String(stokta.length), alt: ambardaN + ' tanesi ambarda' + (izin.fiyat ? ' · stok değeri ' + tlKisa(ambarDeger) : ''), altC: ui.mut, alarm: false, el: '', git: () => this.setState({ ambarSuz: '', ambarKat: '' }) },
          { label: 'Tükenen', val: String(tukendi), alt: tukendi ? 'ambarda kalmadı' : 'tükenen kalem yok', altC: tukendi ? kirmizi : yesil, alarm: tukendi > 0, valC: tukendi ? kirmizi : ui.fg, el: '', git: () => this.setState({ ambarSuz: s.ambarSuz === 'tukenen' ? '' : 'tukenen' }) },
          { label: 'Azalan', val: String(azaldi), alt: azaldi ? az7 + ' tanesi 7 günden az yeter' : 'azalan kalem yok', altC: azaldi ? turuncu : yesil, alarm: false, valC: azaldi ? turuncu : ui.fg, el: '', git: () => this.setState({ ambarSuz: s.ambarSuz === 'azalan' ? '' : 'azalan' }) },
          { label: 'Bugün hareket', val: String(bugunHareket.length), alt: bugunGiris + ' giriş · ' + (bugunHareket.length - bugunGiris) + ' çıkış', altC: ui.mut, alarm: false, el: this.kivilcim(yediIslem, '#ff9f0a'), git: null }
        ].map(k => ({ valC: ui.fg, ...k, imlec: k.git ? 'pointer' : 'default', git: k.git || (() => {}) }));

        // — son 14 gün: günlük giriş ve çıkış işlem sayısı (hareket listesinden; ilk 400 hareket)
        const grafikGun = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(i => {
          const d = new Date(bugun.getTime() - i * gunMs);
          const hh = hareketGun(d);
          const g = hh.filter(h => ['giris', 'iade'].includes(h.tur)).length;
          return { d, g, c: hh.length - g };
        });
        const gMax = Math.max(1, ...grafikGun.map(x => Math.max(x.g, x.c)));
        const hareketGrafik = {
          var: hareketler.length > 0,
          toplamG: grafikGun.reduce((t, x) => t + x.g, 0), toplamC: grafikGun.reduce((t, x) => t + x.c, 0),
          gunler: grafikGun.map((x, i) => ({
            gun: String(x.d.getDate()), i, bugunMu: i === 13,
            gH: (x.g ? Math.max(6, Math.round(x.g / gMax * 100)) : 0) + '%', cH: (x.c ? Math.max(6, Math.round(x.c / gMax * 100)) : 0) + '%',
            ipucu: x.d.getDate() + '.' + (x.d.getMonth() + 1) + ' · ' + x.g + ' giriş, ' + x.c + ' çıkış'
          }))
        };

        // — süzgeç, kategori, sıralama
        const q = sadeMetin(s.ambarQ || '');
        const katF = s.ambarKat || '';
        const suz = s.ambarSuz || '';
        const sira = s.ambarSira || 'gun';
        let liste = tum.filter(x =>
          (!katF || x.k.kat === katF) &&
          (!suz || (suz === 'kritik' ? x.d.kritik : suz === 'tukenen' ? (x.d.girilmis && x.d.toplam <= 0) : suz === 'azalan' ? (x.d.kritik && x.d.toplam > 0) : suz === 'var' ? x.d.toplam > 0 : suz === 'siparis' ? sipSet.has(x.k.ad) : true)) &&
          (!q || sadeMetin(x.k.ad + ' ' + x.k.kod + ' ' + (MALZEME_KAT[x.k.kat] || '')).includes(q)));
        const gunAnahtar = x => !x.d.girilmis ? 3e9 : (x.d.toplam <= 0 ? -1 : (x.d.kacGun == null ? 2e9 + (x.d.kritik ? 0 : 1) : x.d.kacGun));
        if (sira === 'gun') liste.sort((a, b) => gunAnahtar(a) - gunAnahtar(b) || a.k.ad.localeCompare(b.k.ad, 'tr'));
        else if (sira === 'tuketim') liste.sort((a, b) => b.d.tuk.toplam - a.d.tuk.toplam || a.k.ad.localeCompare(b.k.ad, 'tr'));
        else liste.sort((a, b) => a.k.ad.localeCompare(b.k.ad, 'tr'));
        const SINIR = 120;
        const gorunen = s.ambarHepsi ? liste : liste.slice(0, SINIR);
        const katSay = {};
        for (const k of stokta) katSay[k.kat] = (katSay[k.kat] || 0) + 1;
        const cip = (on, sec) => ({ bg: on ? 'var(--color-accent)' : ui.surf2, fg: on ? '#fff' : ui.fg, sec });
        const kategoriler = [['', 'Tümü', stokta.length], ...Object.keys(MALZEME_KAT).filter(k => katSay[k] || k === katF).map(k => [k, MALZEME_KAT[k], katSay[k] || 0])]
          .map(([id, l, n]) => ({ l, n: String(n), ...cip(katF === id, () => this.setState({ ambarKat: id })) }));
        const suzgecler = [['tukenen', 'Tükenen', tukendi], ['azalan', 'Azalan', azaldi], ['var', 'Ambarda olan', ambardaN], ['siparis', 'Siparişte', sip.length]]
          .map(([id, l, n]) => ({ l, n: String(n), ...cip(suz === id, () => this.setState({ ambarSuz: suz === id ? '' : id })) }));
        const siralar = [['gun', 'Kaç gün yeter'], ['tuketim', 'En çok tüketilen'], ['az', 'A → Z']].map(([id, l]) => ({
          l, bg: sira === id ? ui.surf : 'transparent', golge: sira === id ? '0 1px 3px rgba(0,0,0,.14)' : 'none',
          sec: () => this.setState({ ambarSira: id })
        }));

        // — tablo satırları (masaüstü) ve kalem kartları (telefon)
        const satir = x => {
          const { k, d, dag } = x;
          const mx = Math.max(1, d.toplam);
          const g = d.toplam <= 0 && d.girilmis ? 0 : d.kacGun;
          const meta = [
            dag.some(n => n > 0) ? AMBARLAR.map((A, i) => dag[i] > 0 ? kisa(A) + ' ' + sayi(dag[i]) : '').filter(Boolean).join(' · ') : 'ambarda yok',
            d.zim ? 'ekiplerde ' + sayi(d.zim) + ' ' + k.birim : '',
            d.girilmis ? tlGor((d.toplam + d.zim) * (Number(k.fiyat) || 0)) : ''
          ].filter(Boolean).join(' · ');
          return {
            ad: k.ad, kod: k.kod, birim: k.birim, katL: MALZEME_KAT[k.kat] || '—',
            w0: (dag[0] / mx * 100).toFixed(1) + '%', w1: (dag[1] / mx * 100).toFixed(1) + '%',
            w2: (dag[2] / mx * 100).toFixed(1) + '%', w3: (dag[3] / mx * 100).toFixed(1) + '%',
            toplamN: sayi(d.toplam), toplam: sayi(d.toplam) + ' ' + k.birim,
            toplamFg: d.kritik ? kirmizi : ui.fg,
            ekipte: d.zim ? sayi(d.zim) + ' ' + birimK(k.birim) : '—',
            tukEl: d.tuk.toplam > 0 ? this.kivilcim(d.tuk.seri, gunC(g), 96, 26)
              : React.createElement('span', { style: { font: '400 11.5px/1 var(--font-body)', color: ui.mut } }, 'çıkış yok'),
            tukYazi: d.tuk.toplam > 0 ? sayi(d.tuk.toplam) + ' ' + birimK(k.birim) + ' / 30 gün' : '',
            gun: gunYazi(x), gunC: d.toplam <= 0 && d.girilmis ? kirmizi : gunC(d.kacGun),
            hiz: d.tuk.ort > 0 ? '· ' + sayi(d.tuk.ort) + '/gün' : '',
            gunW: (g == null ? 0 : Math.min(g, 60) / 60 * 100).toFixed(1) + '%',
            zemin: d.kritik ? (dark ? 'rgba(255,69,58,.07)' : 'rgba(215,0,21,.035)') : 'transparent',
            sipVar: sipSet.has(k.ad),
            meta, kritik: d.kritik, girilmis: d.girilmis,
            ac: () => this.setState({ ambarKart: k.ad }),
            giris: () => formAc('giris', k.ad),
            zimmetVer: () => formAc('zimmet', k.ad, { ambar: (AMBARLAR.find((A, i) => dag[i] > 0)) || AMBARLAR[0] })
          };
        };
        const satirlar = gorunen.map(satir);

        // — tükenmek üzere
        const tukenen = kritikler.slice().sort((a, b) => gunAnahtar(a) - gunAnahtar(b) || (a.d.toplam / a.d.esik) - (b.d.toplam / b.d.esik)).slice(0, 6)
          .map(x => {
            const on = sipSet.has(x.k.ad);
            const g = x.d.toplam <= 0 ? 0 : x.d.kacGun;
            const oran = g != null ? Math.min(1, g / 7) : Math.min(1, x.d.toplam / Math.max(1, x.d.esik * 2));
            return {
              ad: x.k.ad,
              gun: x.d.toplam <= 0 ? 'Tükendi' : (x.d.kacGun != null ? gunYazi(x) : 'eşikte · ' + sayi(x.d.toplam) + ' ' + birimK(x.k.birim)),
              c: g != null && g >= 7 ? turuncu : kirmizi, w: Math.max(4, oran * 100).toFixed(0) + '%',
              bL: on ? '✓ Siparişte' : 'Siparişe ekle',
              bBg: on ? 'rgba(52,199,89,.15)' : (dark ? 'rgba(10,132,255,.2)' : 'rgba(0,113,227,.1)'),
              bFg: on ? '#1b7a36' : ui.acc,
              sec: () => this.siparisEkle(x.k.ad),
              ac: () => this.setState({ ambarKart: x.k.ad })
            };
          });

        // — bugünkü hareketler
        const HT = {
          giris: ['Giriş', 'rgba(52,199,89,.15)', '#1b7a36'], cikis: ['Çıkış', 'rgba(0,0,0,.06)', ui.fg],
          zimmet: ['Zimmet', 'rgba(0,113,227,.12)', ui.acc], iade: ['İade', 'rgba(175,82,222,.13)', '#8e3fb8'],
          sarf: ['Sarf', 'rgba(255,159,10,.17)', '#9a5200'], hurda: ['Hurda', 'rgba(215,0,21,.1)', kirmizi]
        };
        const bugunH = hareketler.filter(h => this.damgaMs(h.damga) >= bugun.getTime());
        const hSatir = h => {
          const t = HT[h.tur] || [h.tur, ui.surf2, ui.fg];
          return {
            tur: t[0], bg: t[1], fg: t[2],
            ne: h.malzeme + ' × ' + sayi(Number(h.adet) || 0) + ' ' + birimK(h.birim || ''),
            alt: [[h.ambar && kisa(h.ambar), h.ekip].filter(Boolean).join(' → '), h.not, h.kim].filter(Boolean).join(' · '),
            saat: (String(h.damga || '').split(' ')[1] || ''),
            gun: String(h.damga || '').split(' ')[0]
          };
        };

        // — ekip zimmeti (silinmiş/adı değişmiş ekibin zimmeti de görünür)
        const zimEkipler = [...new Set([...SAHA_EKIP, ...Object.keys(zimTablo).filter(c => Object.keys(zimTablo[c] || {}).length)])];
        const zimmetler = zimEkipler.map(c => {
          const t = zimTablo[c] || {};
          const list = Object.keys(t).filter(k => t[k] > 0);
          const deger = list.reduce((x, ad) => x + t[ad] * (Number((this.katalogBul(ad) || {}).fiyat) || 0), 0);
          return {
            ekip: c, iadeVar: list.length > 0 && izin.zimmet, sarfVar: list.length > 0 && this.stokIzin('sarf', c), hurdaVar: list.length > 0 && izin.duzelt,
            varMi: list.length > 0 && (izin.zimmet || this.stokIzin('sarf', c) || izin.duzelt), kalem: list.length ? list.length + ' kalem' + (izin.fiyat ? ' · ' + this.tl(deger) : '') : 'zimmet yok',
            ozet: list.length ? list.map(k => k + ' × ' + sayi(t[k])).join(' · ') : 'zimmetinde malzeme yok',
            ozetFg: list.length ? ui.fg : ui.mut,
            iade: () => formAc('iade', list[0], { ekip: c }),
            sarf: () => formAc('sarf', list[0], { ekip: c }),
            hurda: () => formAc('hurda', list[0], { ekip: c })
          };
        });

        // — malzeme kartı
        const kartK = s.ambarKart ? this.katalogBul(s.ambarKart) : null;
        const kart = (() => {
          if (!kartK) return { on: false };
          const d = this.ambarDurum(kartK.ad);
          const x = { k: kartK, d, dag: AMBARLAR.map(A => this.ambarMevcut(kartK.ad, A)) };
          const r = satir(x);
          return {
            on: true, ad: kartK.ad, kod: kartK.kod, katL: MALZEME_KAT[kartK.kat] || '—', birim: kartK.birim,
            fiyat: izin.fiyat ? this.tl(Number(kartK.fiyat) || 0) + ' / ' + kartK.birim : '—', esik: sayi(d.esik) + ' ' + kartK.birim,
            pasif: !!kartK.pasif,
            toplam: r.toplam, toplamFg: r.toplamFg, gun: r.gun, gunC: r.gunC,
            hiz: d.tuk.ort > 0 ? 'günde ortalama ' + sayi(d.tuk.ort) + ' ' + birimK(kartK.birim) : '',
            tuk: d.tuk.toplam > 0 ? sayi(d.tuk.toplam) + ' ' + kartK.birim + ' son 30 günde' : 'son 30 günde ambar çıkışı yok',
            tukEl: d.tuk.toplam > 0 ? this.kivilcim(d.tuk.seri, r.gunC, 220, 44) : '',
            ambarlar: AMBARLAR.map((A, i) => ({ ad: A, n: sayi(x.dag[i]) + ' ' + birimK(kartK.birim), c: AMB_RENK[i], fg: x.dag[i] > 0 ? ui.fg : ui.mut })),
            ekipler: Object.keys(zimTablo).filter(c => Number((zimTablo[c] || {})[kartK.ad]) > 0)
              .map(c => ({ ad: c, n: sayi(zimTablo[c][kartK.ad]) + ' ' + birimK(kartK.birim) })),
            ekipYok: !d.zim,
            hareket: hareketler.filter(h => h.malzeme === kartK.ad).slice(0, 8).map(hSatir),
            hareketYok: !hareketler.some(h => h.malzeme === kartK.ad),
            yazabilir: (izin.giris || izin.zimmet || izin.siparis) && !kartK.pasif, girisVar: izin.giris && !kartK.pasif, zimmetVar: izin.zimmet && !kartK.pasif, siparisVar: izin.siparis && !kartK.pasif, katYetki,
            sipL: sipSet.has(kartK.ad) ? '✓ Siparişte' : 'Siparişe ekle',
            sipOneri: 'öneri: ' + sayi(this.siparisOneri(kartK.ad)) + ' ' + kartK.birim,
            giris: () => formAc('giris', kartK.ad),
            zimmet: () => formAc('zimmet', kartK.ad, { ambar: (AMBARLAR.find((A, i) => x.dag[i] > 0)) || AMBARLAR[0] }),
            siparis: () => this.siparisEkle(kartK.ad),
            duzenle: () => this.setState({ ambarKart: null, malzemeForm: { ...kartK, fiyat: String(kartK.fiyat ?? ''), esik: String(kartK.esik ?? '') } }),
            pasifL: kartK.pasif ? 'Yeniden etkinleştir' : 'Pasife al',
            pasifYap: () => this.malzemePasif(kartK.kod, !kartK.pasif),
            kapat: () => this.setState({ ambarKart: null })
          };
        })();

        // — malzeme tanım formu
        const mf = s.malzemeForm;
        const mfSet = (alan, v) => this.setState({ malzemeForm: { ...this.state.malzemeForm, [alan]: v } });
        const malzemeForm = !mf ? { on: false } : {
          on: true, baslik: mf.kod ? mf.kod + ' · düzenle' : 'Yeni malzeme',
          kod: mf.kod || this.malzemeKodSira(katalog),
          adKilit: !!(mf.kod && this.malzemeHareketli((katalog.find(k => k.kod === mf.kod) || {}).ad || '')),
          ad: mf.ad || '', onAd: e => mfSet('ad', e.target.value),
          kat: mf.kat || 'sarf', katlar: Object.keys(MALZEME_KAT).map(k => ({ v: k, l: MALZEME_KAT[k] })), onKat: e => mfSet('kat', e.target.value),
          birim: mf.birim || 'adet', birimler: MALZEME_BIRIM, onBirim: e => mfSet('birim', e.target.value),
          fiyat: mf.fiyat ?? '', onFiyat: e => mfSet('fiyat', e.target.value),
          esik: mf.esik ?? '', onEsik: e => mfSet('esik', e.target.value),
          esikIpucu: 'boş bırakılırsa ' + (KRITIK_ESIK[mf.birim || 'adet'] || 2) + ' ' + (mf.birim || 'adet'),
          benzer: (() => {
            const a = sadeMetin(mf.ad || '');
            if (a.length < 3) return '';
            const b = katalog.filter(k => k.kod !== mf.kod && sadeMetin(k.ad).includes(a)).slice(0, 3).map(k => k.kod + ' ' + k.ad);
            return b.length ? 'Katalogda benzer: ' + b.join(' · ') : '';
          })(),
          kaydet: () => this.malzemeKaydet(this.state.malzemeForm),
          kapat: () => this.setState({ malzemeForm: null })
        };

        // — sipariş listesi
        const siparisPanel = !s.siparisPanel ? { on: false } : {
          on: true, bos: !sip.length, yazabilir: izin.siparis, salt: !izin.siparis,
          toplam: izin.fiyat ? this.tl(sip.reduce((t, x) => t + (Number(x.adet) || 0) * (Number((this.katalogBul(x.malzeme) || {}).fiyat) || 0), 0)) : '—',
          kalemler: sip.map(x => {
            const k = this.katalogBul(x.malzeme) || {};
            const d = this.ambarDurum(x.malzeme);
            return {
              ad: x.malzeme, kod: k.kod || '—', birim: x.birim,
              adet: String(x.adet), onAdet: e => this.siparisAdet(x.id, e.target.value),
              durum: d.toplam <= 0 ? 'ambarda kalmadı'
                : 'ambarda ' + sayi(d.toplam) + ' ' + birimK(x.birim) + (d.kacGun != null ? ' · ' + gunYazi({ d, k }) + ' yeter' : ''),
              tutar: izin.fiyat ? this.tl((Number(x.adet) || 0) * (Number(k.fiyat) || 0)) : '',
              ekleyen: [x.ekleyen, x.damga].filter(Boolean).join(' · '),
              cikar: () => this.siparisYaz(sip.filter(y => y.id !== x.id), x.malzeme + ' listeden çıkarıldı.')
            };
          }),
          kopyala: () => this.siparisKopyala(),
          temizle: () => this.siparisYaz([], 'Sipariş listesi temizlendi.'),
          kritikEkle: () => {
            const yeni = kritikler.filter(x => !sipSet.has(x.k.ad));
            if (!yeni.length) return this.duyur('Kritik kalemlerin hepsi zaten listede.', 4000);
            this.siparisYaz([...sip, ...yeni.map((x, i) => ({
              id: 's' + Date.now() + i, malzeme: x.k.ad, adet: this.siparisOneri(x.k.ad), birim: x.k.birim,
              ekleyen: (me || {}).name || '', damga: this.damga()
            }))], yeni.length + ' kritik kalem listeye eklendi.');
          },
          kapat: () => this.setState({ siparisPanel: false })
        };

        return {
          acik: true, yazabilir, katYetki,
          not: 'Önce “Giriş” ile mevcut girilir, sahaya çıkacak malzeme ekibe zimmet edilir, iş bitince iade edilir ya da sarf düşülür. Kritik eşiğin altına düşen ya da 7 günden az yetecek kalem kırmızı yazılır.',
          baslikAlt: AMBARLAR.length + ' ambar · ' + stokta.length + ' malzeme çeşidi · ' + zimEkipler.filter(c => Object.keys(zimTablo[c] || {}).length).length + ' ekipte zimmet',
          q: s.ambarQ || '', onQ: e => this.setState({ ambarQ: e.target.value, ambarHepsi: false }),
          kpis, hareketGrafik, kategoriler, suzgecler, siralar,
          ambarAd: AMBARLAR.map((A, i) => ({ ad: kisa(A), c: AMB_RENK[i] })),
          satirlar, satirVar: satirlar.length > 0, satirYok: !satirlar.length,
          bosYazi: q ? '“' + (s.ambarQ || '') + '” ile eşleşen malzeme yok.' : 'Bu süzgece uyan malzeme yok.',
          sonuc: liste.length + ' malzeme' + (liste.length > gorunen.length ? ' · ilk ' + gorunen.length + ' gösteriliyor' : ''),
          dahaVar: liste.length > gorunen.length,
          hepsiniGoster: () => this.setState({ ambarHepsi: true }),
          tukenen, tukenenVar: tukenen.length > 0, tukenenYok: !tukenen.length,
          bugunH: bugunH.slice(0, 8).map(hSatir), bugunSay: bugunH.length + ' hareket',
          bugunVar: bugunH.length > 0, bugunYok: !bugunH.length,
          sipN: String(sip.length), sipVar: sip.length > 0,
          siparisAc: () => this.setState({ siparisPanel: true }),
          malzemeYeni: () => this.setState({ malzemeForm: { kod: '', ad: s.ambarQ || '', kat: katF || 'sarf', birim: 'adet', fiyat: '', esik: '' } }),
          kart, malzemeForm, siparisPanel,
          // telefon şablonu bu alanları kullanır
          stats: [
            { n: String(ambardaN), label: 'Ambarda kalem', fg: ui.fg },
            { n: String(kritikler.length), label: 'Kritik seviye', fg: kritikler.length ? kirmizi : ui.fg },
            { n: String(SAHA_EKIP.reduce((t, c) => t + Object.keys(zimTablo[c] || {}).length, 0)), label: 'Ekip zimmetinde', fg: ui.fg },
            { n: String(hareketler.length), label: 'Hareket kaydı', fg: ui.fg }
          ],
          yeni: () => formAc('giris', ''),
          girisVar: izin.giris || izin.zimmet, cikisVar: izin.zimmet || izin.sarf || izin.duzelt, siparisYetki: izin.siparis,
          girisAc: () => formAc(['giris', 'iade'].find(k => izinTur[k]) || 'giris', ''),
          cikisAc: () => formAc(['zimmet', 'sarf', 'hurda', 'cikis'].find(k => izinTur[k]) || 'zimmet', ''),
          kalemler: satirlar,
          zimmetler,
          hareketler: hareketler.slice(0, 40).map(x => ({
            tur: HAREKET_AD[x.tur] || x.tur,
            turFg: x.tur === 'giris' || x.tur === 'iade' ? ui.fg : (x.tur === 'hurda' ? kirmizi : ui.acc),
            malzeme: x.malzeme, adet: x.adet + ' ' + x.birim,
            meta: [[x.ambar, x.ekip].filter(Boolean).join(' → '), x.damga, x.kim, x.not]
              .filter(Boolean).join(' · ')
          })),
          hareketYok: !hareketler.length,
          hareketBos: 'Henüz hareket yok. İlk adım: kullandığınız malzemelerin ambar mevcudunu “Giriş” ile girin.',
          form: {
            on: !!af,
            baslik: af ? HAREKET_AD[af.tur] : '',
            // İki düğme (Giriş / Çıkış) + “neden/nereden”: seçilen neden altı kayıt türünden birine karşılık gelir (veri değişmez)
            yonler: [['giris', 'Giriş'], ['cikis', 'Çıkış']].filter(([y]) => NEDEN[y].some(n => izinTur[n.tur])).map(([y, l]) => ({
              label: l, ...seg(!!af && yonDe(af.tur) === y, () => nedenSec(NEDEN[y].find(n => izinTur[n.tur]).tur)),
              alt: y === 'giris' ? 'ambara mal geldi' : 'ambardan ya da ekipten çıktı'
            })),
            nedenler: !af ? [] : NEDEN[yonDe(af.tur)].filter(n => izinTur[n.tur]).map(n => ({
              ad: n.ad, etki: n.etki, on: af.tur === n.tur,
              bg: af.tur === n.tur ? 'var(--color-accent)' : ui.surf2, fg: af.tur === n.tur ? '#fff' : ui.fg, fg2: af.tur === n.tur ? 'rgba(255,255,255,.85)' : ui.mut,
              pick: () => nedenSec(n.tur)
            })),
            nedenBaslik: !af ? '' : (yonDe(af.tur) === 'giris' ? 'Nereden geldi?' : 'Neden çıkıyor?'),
            malzeme: af ? af.malzeme : '', malzemeler: STOK_KALEM.map(m => m[0]),
            // masaüstünde yazarak arama: 300+ kalemde açılır liste yerine
            malzemeSecenek: STOK_KALEM.map(m => ({ v: m[0], l: m[3] + ' · ' + (MALZEME_KAT[m[4]] || '') + ' · ' + m[2] })),
            onMalzeme: e => this.setState({ ambarForm: { ...this.state.ambarForm, malzeme: e.target.value } }),
            malzemeUyari: af && af.malzeme && !STOK_KALEM.some(m => m[0] === af.malzeme) ? 'Katalogda yok — listeden seçin.' : '',
            ambar: af ? af.ambar : '', ambarlar: AMBARLAR,
            ambarVar: !!af && af.tur !== 'sarf' && af.tur !== 'hurda',
            onAmbar: e => this.setState({ ambarForm: { ...this.state.ambarForm, ambar: e.target.value } }),
            ekip: af ? af.ekip : '', ekipler: EKIPLER,
            ekipVar: !!af && ['zimmet', 'iade', 'sarf', 'hurda'].includes(af.tur),
            onEkip: e => this.setState({ ambarForm: { ...this.state.ambarForm, ekip: e.target.value } }),
            // Sarf/hurda bir tesise bağlanırsa Özet'teki köy bazlı malzeme
            // raporunda "Tesis belirtilmemiş" yerine gerçek köyde görünür
            // (madde 18) — isteğe bağlı, her sarf bir tesisle ilgili değildir.
            tesisVar: !!af && ['sarf', 'hurda'].includes(af.tur),
            tesis: af ? (af.assetId || '') : '',
            tesisler: [{ id: '', kod: 'Tesis belirtilmedi (isteğe bağlı)' },
              ...s.assets.slice().sort((a, b) => (a.code || '').localeCompare(b.code || '', 'tr'))
                .map(a => ({ id: a.id, kod: a.code + ' · ' + this.yer(a) }))],
            onTesis: e => this.setState({ ambarForm: { ...this.state.ambarForm, assetId: e.target.value || null } }),
            adet: af ? af.adet : '',
            onAdet: e => this.setState({ ambarForm: { ...this.state.ambarForm, adet: e.target.value } }),
            not: af ? af.not : '',
            onNot: e => this.setState({ ambarForm: { ...this.state.ambarForm, not: e.target.value } }),
            durum: (() => {
              if (!af || !af.malzeme) return '—';
              const kalem = this.katalogBul(af.malzeme);
              const b = kalem ? kalem.birim : 'adet';
              // Giriş öncesi – girilen – sonraki: işlenmeden önce kullanıcı rakamları görür
              const n = Math.abs(parseFloat(String(af.adet || '').replace(',', '.')) || 0);
              const dAmb = { giris: n, cikis: -n, zimmet: -n, iade: n }[af.tur] || 0;
              const dEk = { zimmet: n, iade: -n, sarf: -n, hurda: -n }[af.tur] || 0;
              const satir = (ad, once, d) => {
                if (!n || !d) return ad + ': ' + sayi(once) + ' ' + b;
                const sonra = once + d;
                return ad + ': önce ' + sayi(once) + ' → ' + (d > 0 ? '+' : '−') + sayi(Math.abs(d)) + ' → sonra ' + sayi(sonra) + ' ' + b + (sonra < 0 ? ' (YETERSİZ)' : '');
              };
              const m1 = af.ambar ? satir(af.ambar, this.ambarMevcut(af.malzeme, af.ambar), dAmb) : '';
              const m2 = af.ekip ? satir(af.ekip + ' zimmeti', this.ambarZimmet(af.malzeme, af.ekip), dEk) : '';
              return [m1, m2].filter(Boolean).join('  |  ') || '—';
            })(),
            kaydet: () => this.ambarHareket(this.state.ambarForm),
            kapat: () => this.setState({ ambarForm: null })
          }
        };
      })(),