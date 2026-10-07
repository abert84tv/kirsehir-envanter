      // İş kartı: yeni gelen başvuru/talebi tek sayfada karara bağlar — bildirim, sınıf, yer, kim gidecek, ne zaman, Ata.
      // Eski Talep ekranına gitmeden arıza oluşturur ve ekibe atar.
      isKartiEkran: (() => {
        const BOS = { acik: false, gruplar: [], turler: [], oncelikler: [], ilceler: [], tesisler: [], ekipler: [], zamanSec: [], gerekce: [] };
        const k = s.isKarti;
        if (tabId !== 'isKarti' || !k) return BOS;
        const kay = k.tur === 'b' ? (s.basvurular || []).find(x => x.id === k.id) : (s.talepler || []).find(x => x.id === k.id);
        if (!kay) return BOS;
        const yaz = y => this.setState({ isKarti: { ...this.state.isKarti, ...y } });
        const telg = k.tur === 'b' && kay.konu === 'Telegram bildirimi';
        const kanal = k.tur === 'b' ? (telg ? 'Telegram' : 'Web formu') : (TALEP_KANAL[kay.kanal] || '');
        const zaman = k.tur === 'b' ? this.damgaCevir(kay.zaman) : kay.acilis;
        const G = ARIZA_GRUP[k.grup] || ARIZA_GRUP.su;
        const sebeke = !!G.sebeke;
        const ref = this.isKartiNokta(kay);
        const kmYaz = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
        const yasMetin = iso => { const dk = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return dk < 2 ? 'şimdi' : dk < 60 ? dk + ' dk önce' : dk < 1440 ? Math.floor(dk / 60) + ' sa önce' : Math.floor(dk / 1440) + ' gün önce'; };

        // tesis seçimi (tesisli gruplarda)
        let tesisler = [];
        if (!sebeke) {
          const q = sadeMetin(k.tesisQ || '');
          const nk = nkey(k.koy);
          let l = s.assets.filter(a => isFinite(a.lat) && (!G.tesis || a.type === G.tesis));
          if (q) l = l.filter(a => sadeMetin([a.code, a.village, (this.yakinKoy(a) || {}).ad, a.district].filter(Boolean).join(' ')).includes(q));
          else if (nk) { const ayni = l.filter(a => a.village && nkey(a.village) === nk); if (ayni.length) l = ayni; }
          const uz = a => ref ? this.mesafeM(ref, a) : 0;
          l = l.sort((x, y) => (ref ? uz(x) - uz(y) : 0) || x.code.localeCompare(y.code, 'tr')).slice(0, 6);
          tesisler = l.map(a => ({
            ust: TYPES[a.type].label + ' · ' + this.yerGoster(a), alt: a.code + (ref ? ' · ' + kmYaz(uz(a)) : ''),
            secili: a.id === k.assetId, bg: a.id === k.assetId ? 'var(--color-accent)' : 'transparent', fg: a.id === k.assetId ? '#fff' : ui.fg,
            sec: () => yaz({ assetId: a.id })
          }));
        }
        const secAsset = k.assetId ? s.assets.find(a => a.id === k.assetId) : null;
        const hedef = secAsset ? { lat: secAsset.lat, lon: secAsset.lon } : ref;

        // ekip adayları: bölge, nöbet, doluluk, üyelerin durumu, araç, son konum
        const ekipListe = [];
        for (const e of (s.ekipler || [])) {
          const kisiler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
          const calisan = kisiler.filter(p => !PERSONEL_YOK.includes(p.durum));
          const izinli = kisiler.filter(p => PERSONEL_YOK.includes(p.durum));
          const araclar = ((s.arac && s.arac.list) || []).filter(v => v.ekip === e.ad);
          const musait = araclar.filter(v => v.durum !== 'bakimda' && v.durum !== 'arizali' && v.durum !== 'disi');
          const acik = s.faults.filter(f => f.crew === e.ad && !KAPALI_DURUM.includes(f.status)).length;
          const bolgede = (e.bolgeler || []).includes(k.ilce) || !(e.bolgeler || []).length;
          const nobetci = e.ad === nobetciEkip;
          const konum = (s.ekipKonum || {})[e.ad] || null;
          const km = konum && hedef ? this.mesafeM(hedef, konum) : null;
          const taze = konum ? (Date.now() - Date.parse(konum.zaman)) < 30 * 60000 : false;
          const uyari = [
            !kisiler.length ? 'Ekibe personel girilmemiş' : '',
            izinli.length ? izinli.map(p => p.ad.split(' ')[0] + ' ' + (PERSONEL_DURUM[p.durum] || '').toLocaleLowerCase('tr')).join(', ') : '',
            kisiler.length && !calisan.length ? 'Görevde kimse yok' : '',
            !araclar.length ? 'Araç bağlı değil' : (!musait.length ? 'Araç müsait değil' : '')
          ].filter(Boolean);
          const secili = k.ekip === e.ad;
          ekipListe.push({
            ad: e.ad, secili,
            sira: (nobetci ? -100 : 0) + (bolgede ? -50 : 0) + (kisiler.length && !calisan.length ? 300 : 0) + (taze && km != null ? km / 1000 : 60) + acik * 2,
            neden: [nobetci ? 'bugün nöbetçi' : '', bolgede ? (e.bolgeler || []).length ? k.ilce + ' bölgesi' : 'tüm il' : '', acik + ' açık iş'].filter(Boolean).join(' · '),
            uyeler: kisiler.map(p => ({ ad: p.ad, durum: PERSONEL_YOK.includes(p.durum) ? (PERSONEL_DURUM[p.durum] || '') : '', renk: PERSONEL_YOK.includes(p.durum) ? '#d97706' : ui.fg })),
            uyeNot: kisiler.length ? calisan.length + ' / ' + kisiler.length + ' kişi görevde' : 'Personel Ayarlar › Ekipler’den girilir',
            aracMetin: araclar.length ? araclar.map(v => (v.plaka || v.ad || 'araç') + ' · ' + (ARAC_DURUM[v.durum] || v.durum)).join(', ') : 'Araç bağlı değil',
            uyari, uyariVar: uyari.length > 0,
            konumMetin: konum ? (km != null ? kmYaz(km) + ' uzakta · ' : '') + (konum.kaynak === 'arac' ? 'araç takip' : 'zimmetli cihaz') + ' · ' + yasMetin(konum.zaman) + (taze ? '' : ' (eski)') : 'Konum bilgisi yok',
            konumRenk: taze ? '#1b9a4a' : ui.mut,
            bg: secili ? 'var(--color-accent)' : 'transparent', fg: secili ? '#fff' : ui.fg, mut: secili ? 'rgba(255,255,255,.85)' : ui.mut,
            kenar: secili ? 'var(--color-accent)' : ui.rule,
            sec: () => yaz({ ekip: secili ? '' : e.ad })
          });
        }
        ekipListe.sort((a, b) => a.sira - b.sira);

        const secEkip = ekipListe.find(e => e.secili) || null;
        const eksik = [
          sebeke && !k.koy ? 'köy yazılmamış' : '',
          !sebeke && !k.assetId ? 'tesis seçilmemiş' : '',
          !k.ariza ? 'arıza türü seçilmemiş' : ''
        ].filter(Boolean);
        return {
          acik: true, bekle: !!k.bekle,
          baslik: (k.tur === 'b' ? 'Yeni başvuru' : 'Talep') + ' · ' + kanal + (k.tur === 'b' ? ' · ' + kay.takip : ' · ' + kay.no),
          geri: () => this.setState({ tab: 'isPanosu', isKarti: null }),
          // 1. Bildirim
          kanal, zaman, kim: kay.ad, kimVar: !!kay.ad, sifat: (k.tur === 'b' ? (kay.sifat === 'muhtar' ? 'Muhtar' : 'Vatandaş') : (TALEP_SIFAT[kay.sifat] || '')),
          tel: kay.tel || '', telVar: !!kay.tel, telGit: 'tel:' + String(kay.tel || '').replace(/[^+\d]/g, ''),
          metin: kay.aciklama || kay.konu || '', takip: k.tur === 'b' ? kay.takip : (kay.takip || ''), takipVar: k.tur === 'b' || !!kay.takip,
          konumBildirim: k.tur === 'b' && kay.lat != null ? 'Bildirimde konum var: ' + (+kay.lat).toFixed(5) + ', ' + (+kay.lon).toFixed(5) : '',
          konumBildirimVar: k.tur === 'b' && kay.lat != null,
          haritada: () => { this.setState({ tab: 'harita' }); this.toMap({ ks: 'go', lat: kay.lat, lon: kay.lon, label: 'Bildirilen konum' }); },
          // 2. Sınıf
          gruplar: Object.keys(ARIZA_GRUP).map(g => ({ v: g, l: ARIZA_GRUP[g].ad })),
          grup: k.grup, onGrup: e => { const g = e.target.value; yaz({ grup: g, ariza: ARIZA_GRUP[g].turler[0], assetId: null }); },
          turler: G.turler.map(x => ({ v: x })), tur: k.ariza, onTur: e => yaz({ ariza: e.target.value }),
          oncelikler: ['Acil', 'Yüksek', 'Normal', 'Düşük'].map(p => ({
            l: p, bg: k.oncelik === p ? (p === 'Acil' ? 'var(--color-uyari)' : p === 'Yüksek' ? '#ff9f0a' : 'var(--color-accent)') : 'transparent',
            fg: k.oncelik === p ? '#fff' : ui.fg, sec: () => yaz({ oncelik: p })
          })),
          gerekce: (k.gerekce || []).slice(0, 3), gerekceVar: (k.gerekce || []).length > 0,
          // 3. Yer
          ilceler: (m ? m.DISTRICTS.map(d => ({ v: d.name })) : []), ilce: k.ilce || '', onIlce: e => yaz({ ilce: e.target.value }),
          koy: k.koy || '', onKoy: e => yaz({ koy: e.target.value }),
          sebeke, tesisVar: !sebeke, tesisler, tesisQ: k.tesisQ || '', onTesisQ: e => yaz({ tesisQ: e.target.value }),
          tesisYok: !sebeke && !tesisler.length,
          yerNot: sebeke ? 'Şebeke arızası: tesis gerekmez, köy yeterli. Ekip varınca arıza noktasını kaydeder.' : (secAsset ? secAsset.code + ' seçildi.' : 'Köydeki tesislerden birini seçin; köy adı yazılmadıysa kod ya da köy adıyla arayın.'),
          // 4. Kim gidecek
          ekipler: ekipListe, ekipVar: ekipListe.length > 0, ekipYok: !ekipListe.length,
          secEkipVar: !!secEkip, secEkip: secEkip,
          ekipNot: 'Ekibin üyeleri ve aracı Ayarlar › Ekipler ve Araç bölümünden belirlenir; ekibi seçince otomatik atanır.',
          // 5. Ne zaman
          zamanSec: [['hemen', 'Hemen'], ['ileri', 'İleri tarihe planla']].map(([v, l]) => ({ l, ...seg((k.zaman || 'hemen') === v, () => yaz({ zaman: v })) })),
          ileri: (k.zaman || 'hemen') === 'ileri', planli: k.planli || '', onPlanli: e => yaz({ planli: e.target.value }),
          // 6. Not
          not: k.not || '', onNot: e => yaz({ not: e.target.value }),
          // Karar
          eksik: eksik.join(' · '), eksikVar: eksik.length > 0,
          ata: () => this.isKartiAta(),
          ataEtiket: k.bekle ? 'Hazırlanıyor…' : (k.ekip ? 'Ata' : 'Arıza oluştur (ekibi sonra ata)'),
          ikinci: k.tur === 'b' ? 'Spam' : 'Arıza değil — kapat',
          ikinciGit: () => k.tur === 'b' ? this.basvuruEngelle(kay).then(() => this.setState({ tab: 'isPanosu', isKarti: null })) : this.isKartiKapat(kay)
        };
      })(),
