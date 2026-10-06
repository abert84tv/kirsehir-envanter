      // Telefon > İşler > Bana atanan: saha personelinin akışı. Ekibin açık
      // işleri sırayla; o anki iş kartında Sahaya vardım → öncesi fotoğrafı
      // → İşi tamamla (sonrası fotoğrafı, zimmetten malzeme) adımları.
      saha: (() => {
        if (!(s.device === 'phone' && tabId === 'gunluk')) return { acik: false };
        const kirmizi = 'var(--color-uyari)', yesil = '#34c759';
        const iki = n => String(n).padStart(2, '0');
        // Ekip: kullanıcı kaydındaki ekip, yoksa personel havuzunda hesabına bağlı kişinin ekibi
        const kisi = (s.personel || []).find(p => p.kullanici && me && p.kullanici === me.user);
        const crew = (me && me.crew) || (kisi ? ((s.ekipler || []).find(e => e.sefId === kisi.id || (e.uyeIdler || []).includes(kisi.id)) || {}).ad : '') || '';
        const PR = { 'Acil': 0, 'Yüksek': 1, 'Normal': 2, 'Düşük': 3 };
        const tum = arizaOn ? s.faults : [];
        const ekibin = f => crew ? f.crew === crew : (f.crew && f.crew !== ATANMADI);
        const acik = tum.filter(f => ekibin(f) && !KAPALI_DURUM.includes(f.status));
        const konum = s.benimKonum;
        const assetOf = f => s.assets.find(x => x.id === f.assetId) || null;
        const km = a => konum && a && isFinite(a.lat) ? this.mesafeM(konum, a) / 1000 : null;
        // Arıza noktası varsa mesafe ona, yoksa tesise
        const yerOf = f => f.nokta || assetOf(f);
        // Sıra: sahada olan önce, sonra öncelik, sonra (konum varsa) yakınlık, sonra açılış
        const sirali = acik.filter(f => f.status !== 'kontrol').map(f => ({ f, a: assetOf(f) }))
          .sort((x, y) => (y.f.status === 'sahada') - (x.f.status === 'sahada')
            || (PR[x.f.priority] ?? 9) - (PR[y.f.priority] ?? 9)
            || ((km(yerOf(x.f)) ?? 1e9) - (km(yerOf(y.f)) ?? 1e9))
            || this.damgaMs(x.f.opened) - this.damgaMs(y.f.opened));
        const onayBekleyen = acik.filter(f => f.status === 'kontrol').length;
        const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
        const bitti = tum.filter(f => ekibin(f) && KAPALI_DURUM.includes(f.status) && this.damgaMs(f.closed) >= bugun.getTime()).length
          + onayBekleyen;
        const toplam = bitti + sirali.length;
        const secId = s.sahaAktifId && sirali.some(x => x.f.id === s.sahaAktifId) ? s.sahaAktifId : (sirali[0] || { f: {} }).f.id;
        const cur = sirali.find(x => x.f.id === secId) || null;
        const PRC = {
          'Acil': ['rgba(215,0,21,.1)', kirmizi], 'Yüksek': ['rgba(255,159,10,.17)', '#9a5200'],
          'Normal': [ui.surf2, ui.fg], 'Düşük': [ui.surf2, ui.mut]
        };
        const mesafeYazi = f => { const a = assetOf(f); const k = km(yerOf(f)); return k == null ? (f.koy || (a ? a.district : f.district) || '') : (k < 1 ? Math.round(k * 1000) + ' m' : k.toFixed(1).replace('.', ',') + ' km') + (f.nokta ? ' · arıza noktası' : ' · kuş uçuşu'); };
        const saat = (new Date()).getHours();
        const selam = saat < 11 ? 'Günaydın' : (saat < 18 ? 'İyi günler' : 'İyi akşamlar');
        const arac = ((s.arac && s.arac.list) || []).find(v => v.ekip === crew && v.durum === 'gorevde');
        const sf = s.sahaFoto || {};

        let is = { var: false };
        if (cur) {
          const f = cur.f, a = cur.a;
          const step = f.status === 'sahada' ? 1 : 0;
          const kp = s.sahaKapanis && s.sahaKapanis.id === f.id ? s.sahaKapanis : null;
          // Bu oturumda çekilenler + sunucuda bu arızaya bağlı olanlar
          const fo0 = sf[f.id] || { once: 0, sonra: 0 };
          const srv = f.dbId ? (s.fotolar || {})['a' + f.dbId] : null;
          if (!srv && f.dbId && this._sb) {
            this._sahaFotoIstek = this._sahaFotoIstek || {};
            if (!this._sahaFotoIstek[f.dbId]) { this._sahaFotoIstek[f.dbId] = 1; setTimeout(() => this.arizaFotoYenile(f.dbId), 0); }
          }
          const bagli = (srv || []).filter(p => f.dbId && p.arizaDbId === f.dbId);
          const fo = {
            once: fo0.once + bagli.filter(p => /Öncesi/.test(p.aciklama || '')).length,
            sonra: fo0.sonra + bagli.filter(p => /Sonrası/.test(p.aciklama || '')).length
          };
          const onceTamam = !kanitOn || fo.once > 0;
          const sonraTamam = !kanitOn || fo.sonra > 0;
          const d = sureOn ? this.sureDurum(f) : null;
          const adim = kp ? 2 : step;
          const zim = ((s.ambar || {}).zimmet || {})[f.crew] || {};
          const secim = (kp && kp.mz) || {};
          const mzListe = Object.keys(zim).filter(ad => Number(zim[ad]) > 0).sort((x, y) => x.localeCompare(y, 'tr'));
          const secilen = mzListe.filter(ad => secim[ad] > 0);
          const kapat = () => {
            if (!sonraTamam) return this.duyur('Kanıt zorunlu — önce sonrası fotoğrafını çekin.', 5000, 'kotu');
            const malzeme = secilen.map(ad => {
              const k = this.katalogBul(ad) || {};
              return { ad, adet: secim[ad], birim: k.birim || 'adet', tutar: Number(k.fiyat) || 0 };
            });
            this.sahaDurum(f, onayOn ? 'kontrol' : 'cozuldu', { malzeme: [...(f.malzeme || []), ...malzeme], notEk: ((kp && kp.not) || '').trim() });
            this.setState({ sahaBasari: { id: f.id, onay: onayOn, metin: (malzeme.length ? malzeme.map(m => m.adet + ' × ' + m.ad).join(', ') + ' zimmetten düşüldü. ' : '')
              + (onayOn ? 'Kayıt merkez onayına gönderildi.' : 'Öncesi/sonrası kanıt tesisin arıza geçmişine yazıldı.') } });
            clearTimeout(this._sahaZ);
            this._sahaZ = setTimeout(() => this.setState({ sahaBasari: null, sahaAktifId: null }), 2200);
          };
          is = {
            var: true,
            no: f.no || '', pr: f.priority || 'Normal', prBg: (PRC[f.priority] || PRC.Normal)[0], prFg: (PRC[f.priority] || PRC.Normal)[1],
            prSinif: f.priority === 'Acil' ? 'ks-nabiz' : '',
            sure: d ? (d.gecikti ? d.etiket : 'hedef ' + d.hedef) : (STATUS_LABEL[f.status] || f.status),
            sureC: d && d.gecikti ? kirmizi : ui.mut,
            baslik: f.type || 'Arıza', tesis: a ? TYPES[a.type].label + ' · ' + this.yerGoster(a) + ' · ' + a.code : ('Şebeke · ' + [f.koy, f.district].filter(Boolean).join(' · ')),
            mesafe: mesafeYazi(f) || '—', not: (f.note || f.desc || '').split('\n')[0] || 'not yok',
            adimlar: [0, 1, 2].map(i => ({
              ic: adim > i ? '✓' : String(i + 1),
              bg: adim > i ? 'var(--color-accent)' : (adim === i ? ui.surf : ui.surf2),
              fg: adim > i ? '#fff' : (adim === i ? ui.acc : ui.mut),
              halka: adim === i ? '0 0 0 2px var(--color-accent)' : 'none',
              cizgi: i < 2, cizgiW: adim > i ? '100%' : '0%', esnek: i < 2 ? '1 1 0' : '0 0 auto'
            })),
            s0: adim === 0 && f.status !== 'bekleme', s1: adim === 1, s2: adim === 2,
            beklemede: f.status === 'bekleme', bekNeden: (f.ek && f.ek.beklemeNeden) || 'neden belirtilmedi',
            bekle: () => this.setState({ bekleSheet: { id: f.id } }),
            olay: () => this.setState({ olaySheet: { id: f.id } }),
            devam: () => this.sahaDurum(f, (f.ek && f.ek.oncekiDurum && f.ek.oncekiDurum !== 'bekleme') ? f.ek.oncekiDurum : 'atandi'),
            yolTarifi: () => { if (a && this.yolTarifiVer(a)) this.say(`${a.code} için güzergâh hesaplanıyor…`); },
            vardim: () => this.sahaDurum(f, 'sahada'),
            noktaYazi: f.nokta ? 'Arıza noktası kayıtlı · ±' + (f.noktaDogruluk ?? '?') + ' m' : 'Arıza noktası henüz kaydedilmedi',
            noktaC: f.nokta ? '#1b7a36' : 'var(--color-uyari)',
            noktaL: f.nokta ? 'Yeniden al' : 'Şimdi kaydet',
            noktaAl: () => this.arizaNoktaAl(f),
            fotoOnce: () => this.sahaFoto(f, 'once'),
            onceL: fo.once ? '✓ Öncesi fotoğrafı · ' + fo.once + ' fotoğraf' : 'Öncesi fotoğrafı çek',
            onceAlt: kanitOn ? 'İşe başlamadan önce çekin — zorunlu' : 'İşe başlamadan önceki hâli',
            onceKenar: fo.once ? yesil : ui.rule, onceZemin: fo.once ? 'rgba(52,199,89,.08)' : ui.surf2, onceIk: fo.once ? yesil : 'var(--color-accent)',
            tamamla: () => {
              if (!onceTamam) return this.duyur('Kanıt zorunlu — önce öncesi fotoğrafını çekin.', 5000, 'kotu');
              this.setState({ sahaKapanis: { id: f.id, mz: {}, not: '' } });
            },
            tamamlaOp: onceTamam ? '1' : '.5',
            fotoSonra: () => this.sahaFoto(f, 'sonra'),
            sonraL: fo.sonra ? '✓ Sonrası fotoğrafı · ' + fo.sonra + ' fotoğraf' : 'Sonrası fotoğrafı çek',
            sonraKenar: fo.sonra ? yesil : ui.rule, sonraZemin: fo.sonra ? 'rgba(52,199,89,.08)' : ui.surf2, sonraIk: fo.sonra ? yesil : 'var(--color-accent)',
            mzVar: mzListe.length > 0, mzYok: !mzListe.length,
            mzYokNot: f.crew && f.crew !== ATANMADI ? f.crew + ' zimmetinde malzeme yok.' : 'İş bir ekibe atanmamış — zimmet düşülemez.',
            mz: mzListe.map(ad => {
              const n = secim[ad] || 0, elde = Number(zim[ad]) || 0;
              const k = this.katalogBul(ad) || {};
              const adim2 = k.birim === 'metre' && elde >= 10 ? 5 : 1;
              const yaz = v => this.setState({ sahaKapanis: { ...this.state.sahaKapanis, mz: { ...((this.state.sahaKapanis || {}).mz || {}), [ad]: v } } });
              return {
                ad, elde: 'zimmette ' + elde + ' ' + (k.birim || ''), n: String(n), c: n ? ui.acc : ui.mut,
                arti: () => yaz(Math.min(elde, n + adim2)), eksi: () => yaz(Math.max(0, n - adim2))
              };
            }),
            kapNot: kp ? kp.not || '' : '',
            onKapNot: e => this.setState({ sahaKapanis: { ...this.state.sahaKapanis, not: e.target.value } }),
            kapatL: !sonraTamam ? 'Önce sonrası fotoğrafı' : (onayOn ? 'Onaya gönder' : (secilen.length ? 'Kapat · ' + secilen.length + ' kalem zimmetten düş' : 'Malzemesiz kapat')),
            kapatBg: sonraTamam ? yesil : ui.mut, kapatOp: sonraTamam ? '1' : '.6',
            kapat,
            vazgec: () => this.setState({ sahaKapanis: null }),
            formAc: () => this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, photos: [], ...f } })
          };
        }
        const halka = 113.1;
        return {
          acik: true,
          selam: selam + (me && me.name ? ', ' + String(me.name).split(' ')[0] : ''),
          alt: [crew || 'Ekip atanmamış — bütün ekiplerin işleri', arac ? (arac.plaka || arac.ad) : ''].filter(Boolean).join(' · '),
          ini: String((me && me.name) || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr'),
          bitti: String(bitti), toplam: String(toplam), kalan: String(sirali.length),
          halka: (toplam ? bitti / toplam * halka : 0).toFixed(1) + ' ' + halka,
          ozet: toplam ? 'Bugün ' + bitti + ' iş tamam, ' + sirali.length + ' kaldı' : 'Ekibinize açık iş yok',
          ozetAlt: (konum ? 'Önceliğe ve yakınlığa göre dizildi' : 'Önceliğe göre dizildi · konumunuzu alırsanız yakınlık da sayılır')
            + (onayBekleyen ? ' · ' + onayBekleyen + ' iş merkez onayında' : ''),
          konumVar: !!konum, konumYok: !konum,
          konumAl: () => {
            if (!navigator.geolocation) return this.duyur('Bu cihaz konum vermiyor.', 4000, 'kotu');
            this.say('Konumunuz alınıyor…');
            navigator.geolocation.getCurrentPosition(
              p => { this.setState({ benimKonum: { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now() } }); this.duyur('Konum alındı — işler yakınlığa göre de dizildi.', 4000, 'iyi'); },
              e => this.duyur(e && e.code === 1 ? 'Konum izni verilmemiş — tarayıcı ayarlarından açın.' : 'Konum alınamadı — açık alanda yeniden deneyin.', 6000, 'kotu'),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
          },
          is, isGoster: !!cur && !s.sahaBasari, isYok: !cur && !s.sahaBasari,
          basariVar: !!s.sahaBasari, basariMetin: (s.sahaBasari || {}).metin || '',
          basariBaslik: (s.sahaBasari || {}).onay ? 'Onaya gönderildi' : 'İş kapandı',
          bosBaslik: arizaOn ? (toplam ? 'Bugünkü işler bitti' : 'Açık iş yok') : 'Arıza modülü kapalı',
          bosAlt: arizaOn ? 'Yeni iş atanınca burada görünecek.' : 'Yönetici Ayarlar > Modüller bölümünden açabilir.',
          sonraki: sirali.filter(x => x.f.id !== secId).slice(0, 12).map((x, i) => ({
            sira: String(i + 2), baslik: x.f.type || 'Arıza',
            tesis: (x.a ? TYPES[x.a.type].label + ' · ' + this.yerGoster(x.a) + ' · ' + x.a.code : 'Şebeke · ' + [x.f.koy, x.f.district].filter(Boolean).join(' · ')) + (x.f.status === 'sahada' ? ' · sahada' : ''),
            pr: x.f.priority || 'Normal', prBg: (PRC[x.f.priority] || PRC.Normal)[0], prFg: (PRC[x.f.priority] || PRC.Normal)[1],
            mesafe: mesafeYazi(x.f), sec: () => this.setState({ sahaAktifId: x.f.id, sahaKapanis: null })
          })),
          sonrakiVar: sirali.length > 1,
          zimmet: (() => {
            const z = ((s.ambar || {}).zimmet || {})[crew] || {};
            return Object.keys(z).filter(ad => Number(z[ad]) > 0).sort((x, y) => x.localeCompare(y, 'tr')).map(ad => {
              const k = this.katalogBul(ad) || {};
              const az = Number(z[ad]) <= ((k.birim === 'metre') ? 10 : 1);
              return { ad, n: String(z[ad]), birim: k.birim || '', c: az ? kirmizi : ui.fg, not: az ? 'azaldı · ambardan isteyin' : (k.kod || ''), notC: az ? kirmizi : ui.mut };
            });
          })(),
          zimmetVar: !!crew && Object.values(((s.ambar || {}).zimmet || {})[crew] || {}).some(v => Number(v) > 0),
          ambarOn,
          olaySheet: (() => {
            const olf = s.olaySheet ? (s.faults || []).find(x => x.id === s.olaySheet.id) : null;
            return { var: !!olf, kapat: () => this.setState({ olaySheet: null }),
              ariza: () => this.aracOlay(olf, 'ariza'), kaza: () => this.aracOlay(olf, 'kaza') };
          })(),
          bekleSheet: (() => {
            const bf = s.bekleSheet ? (s.faults || []).find(x => x.id === s.bekleSheet.id) : null;
            return {
              var: !!bf, kapat: () => this.setState({ bekleSheet: null }), dur: e => { if (e && e.stopPropagation) e.stopPropagation(); },
              liste: BEKLEME_NEDEN.map(n => ({ ad: n, sec: () => {
                this.setState({ bekleSheet: null });
                if (bf) this.sahaDurum(bf, 'bekleme', { ek: { ...(bf.ek || {}), beklemeNeden: n }, ekBekleyen: true });
              } }))
            };
          })()
        };
      })(),