      arzKontrol: arzKontrol,
      faults: arzSatir.map(f => {
        const a = s.assets.find(x => x.id === f.assetId) || {};
        return {
          no: f.no, assetCode: a.code || (f.koy ? f.koy + ' (şebeke)' : '—'), type: f.type, priority: f.priority,
          status: STATUS_LABEL[f.status], crew: f.crew, opened: f.opened,
          sureVar: sureOn,
          sure: (() => {
            if (!sureOn) return '';
            const d = this.sureDurum(f);
            return d ? d.hedef + ' · ' + d.etiket : '—';
          })(),
          sureFg: (() => {
            if (!sureOn) return ui.mut;
            const d = this.sureDurum(f);
            return d && d.gecikti ? ui.acc : (d && d.yaklasti ? ui.fg : ui.mut);
          })(),
          pBg: f.priority === 'Acil' ? ui.pend : 'transparent',
          pFg: priColor(f.priority), pBorder: priColor(f.priority),
          rowBg: ff && ff.id === f.id ? ui.sel : 'transparent',
          tap: () => this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...f } })
        };
      }),
      faultSummary: (me && me.role === 'personel'
        ? `${me.crew} · size atanan ${myFaults.length} kayıt`
        : `${openF.length} açık · ${s.faults.filter(f => f.status === 'cozuldu').length} çözüldü`),
      faultStats: [
        { n: myFaults.filter(f => f.status === 'acik').length, label: 'Açık', color: 'var(--color-accent)' },
        { n: myFaults.filter(f => f.status === 'atandi').length, label: 'Atandı', color: ui.fg },
        { n: myFaults.filter(f => f.status === 'sahada').length, label: 'Sahada', color: ui.fg },
        { n: myFaults.filter(f => f.status === 'cozuldu').length, label: 'Çözüldü', color: ui.mut }
      ],
      newFault: () => {
        if (!canCreateFault) return this.say(arizaOn ? 'Bu rol arıza kaydı açamaz.' : 'Arıza modülü pasif.');
        // Telefonda seçili tesis yoksa tesis boş başlar: listenin ilk kaydı
        // kendiliğinden seçili geliyordu, sahada fark edilmeden yanlış tesise
        // arıza açılabilirdi
        const a = sel || (s.device === 'phone' ? null : s.assets[0]);
        this.setState({ panel: 'ariza', tab: s.device === 'phone' ? s.tab : 'ariza', faultForm: { id: null, malzeme: [], sesler: [], iscilik: '', isaret: null, assetId: a ? a.id : null, type: FAULT_TYPES[a ? a.type : 'kuyu'][0], priority: 'Yüksek', status: 'acik', crew: canAssign ? CREWS[0] : (me && me.crew) || CREWS[0], note: '', hours: '', photos: [], iseEmri: s.device === 'phone' && canAssign ? true : undefined } });
      },
      // Açık arıza varken doğrudan yeni kayıt açılmaz: mükerrer kaydı önlemek
      // için önce var olan sorulur.
      newFaultForAsset: () => {
        if (!sel) return;
        const acikOlan = s.faults.filter(f => f.assetId === sel.id && !KAPALI_DURUM.includes(f.status) && f.status !== 'iptal');
        if (acikOlan.length) {
          const f = acikOlan[0];
          const devam = window.confirm(sel.code + ' kaydında açık arıza var:\n\n'
            + f.no + ' · ' + f.type + ' · ' + (STATUS_LABEL[f.status] || f.status) + ' · ' + f.crew
            + '\n\nTAMAM: bu kaydı açar. İPTAL: ayrı bir arıza kaydı açar.');
          if (devam) return this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...f } });
        }
        this.setState({ panel: 'ariza', faultForm: { id: null, malzeme: [], sesler: [], iscilik: '', isaret: null, assetId: sel.id, type: FAULT_TYPES[sel.type][0], priority: 'Normal', status: 'acik', crew: CREWS[0], note: '', photos: [] } });
      },
      assetOptions: (() => {
        // 264 kaydın tamamını <select>'e basmak telefonu kilitliyordu — en yakın 40 kayıt
        const secili = ff && ff.assetId;
        // Talepten geliyorsa talebin köyüne, konum alınmışsa cihaza, yoksa il
        // merkezine en yakın 40 tesis
        const ref = (ff && ff.talepNokta) || s.benimKonum;
        const uzak = ref ? (a => this.mesafeM(ref, a)) : (a => this.distKm(a));
        const yakin = [...s.assets].filter(a => isFinite(a.lat)).sort((x, y) => uzak(x) - uzak(y)).slice(0, 40);
        if (secili && !yakin.some(a => a.id === secili)) {
          const a = s.assets.find(x => x.id === secili);
          if (a) yakin.unshift(a);
        }
        return yakin.map(a => ({ id: a.id, label: `${a.code} · ${TYPES[a.type].label} · ${this.yerGoster(a)}` }));
      })(),
      crews: CREWS,
      faultForm: {
        isExisting: !!(ff && ff.id),
        // Telefonda sade arıza ekranı: sahada yalnız gereken — tesis, ne oldu,
        // ne kadar acil, fotoğraf, not. Malzeme/süre/maliyet/iş emri/ekip
        // önerisi "Ayrıntılı form"un arkasında (2026.10.01 kullanıcı isteği).
        sadeMod: s.device === 'phone' && !!ff && !ff.ayrinti,
        ayrintiMod: !(s.device === 'phone' && !!ff && !ff.ayrinti),
        sade: (() => {
          if (!(s.device === 'phone' && ff && !ff.ayrinti)) return {};
          const yeni = !ff.id;
          const kapali = KAPALI_DURUM.includes(ff.status);
          const yaz = y => this.setState({ faultForm: { ...this.state.faultForm, ...y } });
          const ADIM = [['acik', 'Açık'], ['atandi', 'Atandı'], ['sahada', 'Sahada'], ['cozuldu', 'Kapandı']];
          const sira = { acik: 0, yeniden: 0, bilgi: 0, yonlendirildi: 0, atandi: 1, bekleme: 1, sahada: 2, kontrol: 2, cozuldu: 3, iptal: 3 };
          const n = sira[ff.status] ?? 0;
          const PRC = { 'Acil': 'var(--color-uyari)', 'Yüksek': '#ff9f0a', 'Normal': 'var(--color-accent)', 'Düşük': '#8e8e93' };
          const kayitAsama = ff.status === 'sahada' || ff.status === 'kontrol' ? 'sonra' : 'once';
          const kendiIsi = !!(me && (me.role !== 'personel' || ff.crew === me.crew));
          return {
            yeni, mevcut: !yeni, formGoster: !(yeni && ff.tesisSec),
            ust: yeni ? 'Yeni arıza' : (STATUS_LABEL[ff.status] || ff.status),
            ustC: yeni ? ui.acc : (kapali ? '#1b7a36' : ui.acc),
            baslik: yeni ? 'Arıza bildir' : (ff.no || '') + ' · ' + (ff.type || ''),
            tesis: ffAsset ? TYPES[ffAsset.type].label + ' · ' + this.yerGoster(ffAsset) : (ff.koy ? 'Şebeke · ' + ff.koy + ' · ' + (ff.ilce || '') : 'Tesis seçilmedi'),
            tesisAlt: ffAsset ? ffAsset.code + ' · ' + TYPES[ffAsset.type].kind
              : (ff.talepKoy ? 'Talep: ' + ff.talepKoy + ' — yakındaki tesisler önce gelir' : 'Dokunun, köy adı ya da kodla arayın'),
            tesisDegis: () => yaz({ tesisSec: true, tesisQ: '' }),
            tesisDegisVar: yeni,
            tesisDegisL: ffAsset ? 'Değiştir' : 'Tesis seç',
            // Tam ekran tesis seçici: bütün tesislerde arama; köy adı boşsa
            // en yakın köy gösterilir. Talepten gelindiyse talebin köyüne,
            // konum alındıysa cihaza yakın olanlar önce.
            secici: (() => {
              const acik = yeni && !!ff.tesisSec;
              if (!acik) return { acik: false };
              const q = sadeMetin(ff.tesisQ || '');
              const ref = ff.talepNokta || s.benimKonum || null;
              const refAd = ff.talepNokta ? (ff.talepKoy || 'talep köyü') : (s.benimKonum ? 'konumunuz' : '');
              const etiket = a => sadeMetin([a.code, a.village, (this.yakinKoy(a) || {}).ad, a.district, TYPES[a.type].label, TYPES[a.type].kind, a.barkod].filter(Boolean).join(' '));
              let l = s.assets.filter(a => isFinite(a.lat) && (!q || etiket(a).includes(q)));
              const uz = a => ref ? this.mesafeM(ref, a) : 0;
              l.sort((x, y) => (ref ? uz(x) - uz(y) : 0) || (x.district || '').localeCompare(y.district || '', 'tr') || x.code.localeCompare(y.code, 'tr'));
              const toplam = l.length;
              l = l.slice(0, q ? 60 : 40);
              const kmYaz = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
              return {
                acik: true, q: ff.tesisQ || '',
                onQ: e => yaz({ tesisQ: e.target.value }),
                kapat: () => yaz({ tesisSec: false }),
                konumYok: !s.benimKonum && !ff.talepNokta,
                konumAl: () => {
                  if (!navigator.geolocation) return this.duyur('Bu cihaz konum vermiyor.', 4000, 'kotu');
                  this.say('Konumunuz alınıyor…');
                  navigator.geolocation.getCurrentPosition(
                    p => { this.setState({ benimKonum: { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now() } }); this.duyur('Konum alındı — size en yakın tesisler üstte.', 4000, 'iyi'); },
                    e => this.duyur(e && e.code === 1 ? 'Konum izni verilmemiş — tarayıcı ayarlarından açın.' : 'Konum alınamadı — açık alanda yeniden deneyin.', 6000, 'kotu'),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
                },
                not: (q ? toplam + ' tesis eşleşti' : toplam + ' tesis') + (refAd ? ' · ' + refAd + ' yakınından başlar' : ' · ilçeye göre')
                  + (toplam > l.length ? ' · ilk ' + l.length + ' gösteriliyor, aramayı daraltın' : ''),
                bos: !l.length,
                satirlar: l.map(a => ({
                  ust: TYPES[a.type].label + ' · ' + this.yerGoster(a),
                  alt: a.code + (ref ? ' · ' + kmYaz(uz(a)) : '') + (a.status === 'pasif' ? ' · pasif' : ''),
                  harf: TYPES[a.type].glyph,
                  zemin: a.id === ff.assetId ? (dark ? 'rgba(10,132,255,.18)' : 'rgba(0,113,227,.08)') : 'transparent',
                  sec: () => {
                    const g = TESIS_GRUP[a.type] || 'su';
                    const ff0 = this.state.faultForm;
                    this.setState({ faultForm: { ...ff0, assetId: a.id, grup: g, yerModu: 'tesis',
                      type: ARIZA_GRUP[g].turler.includes(ff0.type) ? ff0.type : ARIZA_GRUP[g].turler[0], tesisSec: false, tesisQ: '' } });
                  }
                }))
              };
            })(),
            // İş grubu → yalnız o grubun arıza türleri; yer (tesis/köy); arıza noktası
            ...this.arizaFormYer(ff, ffAsset),
            oncelikler: ['Acil', 'Yüksek', 'Normal'].map(p => ({
              l: p, bg: ff.priority === p ? PRC[p] : ui.surf, fg: ff.priority === p ? '#fff' : ui.fg,
              kenar: ff.priority === p ? PRC[p] : ui.rule, sec: () => yaz({ priority: p })
            })),
            ekipVar: canAssign, ekipAltVar: canAssign && yeni,
            // İş emri ve atama: ekip + araç seç, tek düğmeyle iş emri aç ve ata
            isEmri: (() => {
              const ie = ff.dbId ? this.isEmriBul(ff.dbId) : null;
              const goster = canAssign || !!ie;
              const ieKapali = !!ie && ['kapatildi', 'iptal', 'tamamlandi'].includes(ie.status);
              const havuz = ((s.arac && s.arac.list) || []).slice().sort((a, b) => (a.durum === 'musait' ? 0 : 1) - (b.durum === 'musait' ? 0 : 1));
              const secili = ff.aracSec || (ie ? (ie.araclar || []).map(x => x.id) : []);
              const crewVar = !!(ff.crew && ff.crew !== ATANMADI);
              const toggleOn = ff.iseEmri === true;
              const duzenlenir = canAssign && !ieKapali && (ie || !yeni || toggleOn);
              let aksiyon = null;
              if (!yeni && !ie && canAssign) aksiyon = {
                l: 'İş emri oluştur ve ekibe ata',
                run: () => {
                  const f1 = this.state.faultForm;
                  if (!f1.dbId) return this.say('Arıza henüz sunucuya yazılmadı — birkaç saniye sonra yeniden deneyin.', true);
                  if (!(f1.crew && f1.crew !== ATANMADI)) return this.say('Önce yukarıdan ekip seçin.', true);
                  this.isEmriAcSade(f1, { crew: f1.crew, araclar: f1.aracSec || [] });
                }
              };
              if (ie && !ieKapali && canAssign) aksiyon = {
                l: 'Atamayı güncelle (ekip + araç)',
                run: () => {
                  const f1 = this.state.faultForm;
                  if (!(f1.crew && f1.crew !== ATANMADI)) return this.say('Önce yukarıdan ekip seçin.', true);
                  this.isEmriAtaKaydet(this.isEmriBul(f1.dbId), { ekip: f1.crew, araclar: f1.aracSec || (ie.araclar || []).map(x => x.id) });
                }
              };
              return {
                goster, yeni, ieVar: !!ie,
                durum: ie ? ie.no + ' · ' + (IS_EMRI_DURUM[ie.status] || ie.status) : (yeni ? '' : 'Bu arıza için iş emri yok'),
                durumC: ie ? (ieKapali ? '#1b7a36' : ui.acc) : ui.mut,
                ekipSatir: ie ? 'Ekip: ' + (ie.crew || 'atanmadı') + (ie.atayan ? ' · atayan ' + ie.atayan : '') : '',
                aracSatir: ie ? 'Araç: ' + ((ie.araclar || []).map(a => a.plaka || a.ad).join(', ') || 'yok') : '',
                toggleVar: yeni && canAssign, toggleOn,
                toggleBg: toggleOn ? 'var(--color-accent)' : 'transparent', toggleFg: toggleOn ? '#fff' : 'transparent',
                toggle: () => yaz({ iseEmri: !toggleOn }),
                araclarVar: duzenlenir && havuz.length > 0,
                araclar: havuz.map(a => {
                  const sec = secili.includes(a.id);
                  const yok = a.durum && a.durum !== 'musait';
                  return {
                    l: (a.plaka || a.ad) + (yok ? ' · ' + (ARAC_DURUM[a.durum] || a.durum) : ''),
                    bg: sec ? 'var(--color-accent)' : ui.surf, fg: sec ? '#fff' : ui.fg, kenar: sec ? 'var(--color-accent)' : ui.rule,
                    op: yok && !sec ? '.55' : '1',
                    sec: () => yaz({ aracSec: sec ? secili.filter(x => x !== a.id) : [...secili, a.id] })
                  };
                }),
                aksiyonVar: !!aksiyon, aksiyonL: aksiyon ? aksiyon.l : '', aksiyon: aksiyon ? aksiyon.run : () => {},
                yetkiNot: 'İş emrini ekip atama yetkisi olan şef/müdür açar.',
                yetkiNotVar: !canAssign && !ie,
                panelAc: () => { if (ie) this.setState({ panel: 'yok', faultForm: null, isEmriPanel: { id: ie.dbId } }); },
                panelVar: !!ie
              };
            })(),
            ekipYazi: ff.crew && ff.crew !== ATANMADI ? ff.crew : 'Ekip atanmadı',
            // Var olan arızanın kayıt bilgisi: ekip, açan, öncelik, hedef süre,
            // iş emri ve bu arızanın denetim izindeki hareketleri
            bilgi: (() => {
              if (yeni) return {};
              const no = ff.no || '';
              const den = s.denetim || [];
              const eskiNo = den.filter(r => r.ne === 'Arıza numarası verildi' && String(r.detay || '').endsWith('→ ' + no))
                .map(r => String(r.detay).split(' → ')[0]);
              const nolar = [no, ...eskiNo].filter(Boolean);
              const ilgili = den.filter(r => ['ariza', 'is_emri', 'ambar'].includes(r.sinif)
                && nolar.some(n => r.kapsam === n || String(r.detay || '').includes(n))).slice(0, 10);
              const atandi = !!(ff.crew && ff.crew !== ATANMADI);
              const d = sureOn ? this.sureDurum(ff) : null;
              const ie = ff.dbId ? this.isEmriBul(ff.dbId) : null;
              const ekipKart = atandi ? (s.ekipler || []).find(e => e.ad === ff.crew) : null;
              const tel = ekipKart ? (ekipKart.tel || ekipKart.sefTel || '') : '';
              return {
                ekip: atandi ? ff.crew : 'Ekip atanmadı', ekipC: atandi ? ui.fg : 'var(--color-uyari)',
                ekipTel: tel, ekipTelVar: !!tel, ekipAra: () => { if (tel) location.href = 'tel:' + String(tel).replace(/\s+/g, ''); },
                ekipDegisVar: canAssign,
                satirlar: [
                  ['Açan', [ff.reporter, ff.opened].filter(Boolean).join(' · ') || '—'],
                  ['Öncelik', ff.priority || 'Normal'],
                  ...(d ? [['Hedef süre', d.gecikti ? d.etiket : 'hedef ' + d.hedef]] : []),
                  ['İş emri', ie ? ie.no + ' · ' + (IS_EMRI_DURUM[ie.status] || ie.status) : 'yok'],
                  ...(ff.closed ? [['Kapanış', [ff.closer, ff.closed].filter(Boolean).join(' · ')]] : []),
                  ...(ff.noktaKim ? [['Noktayı alan', ff.noktaKim + (ff.noktaZaman ? ' · ' + this.damgaCevir(ff.noktaZaman) : '')]] : [])
                ].map(([l, v]) => ({ l, v })),
                hareket: ilgili.map(r => ({ ne: r.ne, detay: r.detay || '', alt: [r.kim, r.t].filter(Boolean).join(' · ') })),
                hareketVar: ilgili.length > 0, hareketYok: !ilgili.length
              };
            })(),
            adimlar: ADIM.map(([, l], i) => ({
              l, ic: n > i ? '✓' : String(i + 1),
              bg: n > i ? 'var(--color-accent)' : (n === i ? ui.surf : ui.surf2),
              fg: n > i ? '#fff' : (n === i ? ui.acc : ui.mut),
              halka: n === i ? '0 0 0 2px var(--color-accent)' : 'none',
              cizgi: i < 3, cizgiW: n > i ? '100%' : '0%', esnek: i < 3 ? '1 1 0' : '0 0 auto'
            })),
            // Var olan işte durumuna göre tek ana düğme
            vardimVar: !yeni && !kapali && ff.status !== 'sahada' && ff.status !== 'kontrol' && kendiIsi,
            vardim: () => {
              const f0 = (this.state.faults || []).find(x => x.id === ff.id) || ff;
              this.sahaDurum({ ...f0, note: this.state.faultForm.note ?? f0.note }, 'sahada');
              yaz({ status: 'sahada' });
              this.duyur((ff.no || 'İş') + ' sahada olarak işaretlendi. İş bitince “İşi tamamla”ya basın.', 5000, 'iyi');
            },
            tamamlaVar: !yeni && (ff.status === 'sahada') && kendiIsi,
            // Kapanış adımı saha akışında: sonrası fotoğrafı + zimmetten malzeme
            tamamla: () => this.setState({ panel: 'yok', faultForm: null, tab: 'gunluk', sahaAktifId: ff.id, sahaKapanis: { id: ff.id, mz: {}, not: '' } }),
            onayda: !yeni && ff.status === 'kontrol',
            kapali: !yeni && kapali,
            yolTarifi: () => { if (ffAsset && this.yolTarifiVer(ffAsset)) this.say(`${ffAsset.code} için güzergâh hesaplanıyor…`); },
            fotoCek: () => this.setState({ faultForm: { ...this.state.faultForm, fotoAsama: kayitAsama } }, () => this.arizaFotoSec(true)),
            fotoGaleri: () => this.setState({ faultForm: { ...this.state.faultForm, fotoAsama: kayitAsama } }, () => this.arizaFotoSec(false)),
            fotoAlt: kayitAsama === 'sonra' ? 'Sonrası fotoğrafı' : (yeni ? 'Arızanın fotoğrafı' : 'Öncesi fotoğrafı'),
            notYer: yeni ? 'Ne gördünüz? (isteğe bağlı)' : 'Not ekleyin (isteğe bağlı)',
            kaydetL: yeni ? (s.offline ? 'Cihaza kaydet' : 'Arızayı kaydet') : 'Değişiklikleri kaydet',
            kaydetVar: yeni || !kapali,
            ayrinti: () => yaz({ ayrinti: true })
          };
        })(),
        sadeyeDon: () => this.setState({ faultForm: { ...this.state.faultForm, ayrinti: false } }),
        sadeyeDonVar: s.device === 'phone',
        title: ff ? (ff.id ? ff.no : 'Yeni arıza kaydı') : 'Yeni arıza kaydı',
        sub: ffAsset ? `${ffAsset.code} · ${this.yer(ffAsset)} · ${TYPES[ffAsset.type].kind}` : 'Kayıt seçin',
        hasAsset: !!ffAsset || !!(ff && ff.id),
        koord: ffAsset ? `${ffAsset.lat.toFixed(5)} , ${ffAsset.lon.toFixed(5)}` : '',
        haritada: () => ffAsset && this.flyTo(ffAsset.lat, ffAsset.lon, 16),
        yolTarifi: () => {
          const hedef = ffAsset || (ff && ff.nokta ? { id: 'ariza-' + ff.id, code: ff.no || 'Arıza noktası', village: ff.koy || '', lat: ff.nokta.lat, lon: ff.nokta.lon } : null);
          if (!hedef) return this.say('Bu arızanın tesisi ya da kayıtlı noktası yok — yol tarifi için nokta gerekir.', true);
          if (this.yolTarifiVer(hedef)) this.say(`${hedef.code} için yol tarifi çizildi. Telefon navigasyonuna aktarmak için haritadaki “Telefonda aç” düğmesini kullanın.`);
        },
        isEmriLabel: (() => {
          if (!ff || !ff.dbId) return 'İş emri';
          const ie = this.isEmriBul(ff.dbId);
          if (!ie) return 'İş emri oluştur';
          return 'İş Emri: ' + ie.no + (ie.status === 'kapatildi' ? ' ✓' : ' · ' + (ie.crew || 'ekip bekliyor'));
        })(),
        isEmri: () => {
          if (!ff) return;
          if (!CAN.assign.includes(s.session.role)) return this.say('İş emri oluşturma yetkiniz yok.');
          const ie = ff.dbId ? this.isEmriBul(ff.dbId) : null;
          if (ie) return this.setState({ isEmriPanel: { id: ie.dbId } });
          this.isEmriAcSade(ff, { crew: ff.crew, araclar: ff.aracSec || [] });
        },
        assetId: ff ? ff.assetId : '', type: ff ? ff.type : '',
        typeOptions: ff ? this.arizaFormYer(ff, ffAsset).turSecenek : FAULT_TYPES.kuyu,
        yerGrup: ff ? this.arizaFormYer(ff, ffAsset) : {},
        tesisYok: !!ff && !ff.assetId,
        note: ff ? ff.note : '', crew: ff ? ff.crew : CREWS[0], hours: ff ? ff.hours : '',
        photos: ff ? (ff.photos || []).map((p, i) => ({
          ...p,
          gercek: !!p.url,
          img: p.url ? this.imgEl(p.url, 'Arıza fotoğrafı') : null,
          indir: p.url ? () => this.medyaIndir(p.url, `ariza-foto-${i + 1}.jpg`) : null,
          indirilir: !!p.url,
          border: ff.isaret === i ? 'var(--color-accent)' : ui.rule,
          mark: ff.isaret === i ? 'İşaretli' : (ASAMA_AD[p.asama] || ASAMA_AD.once)
            + (p.kb ? ' · ' + p.kb + ' KB' : (p.state ? ' · ' + p.state : '')),
          markBg: ff.isaret === i ? 'var(--color-accent)' : 'rgba(32,30,29,.75)',
          markFg: '#fff',
          isaretle: () => this.setState({ faultForm: { ...this.state.faultForm, isaret: i } }),
          kaldir: () => {
            const g = this.state.faultForm;
            if (p.url) { try { URL.revokeObjectURL(p.url); } catch (e) {} }
            this.setState({ faultForm: { ...g, photos: (g.photos || []).filter((_, k) => k !== i), isaret: null } });
          }
        })) : [],
        // Sunucuda bu arızaya bağlı fotoğraflar da formda görünür (önceden
        // yalnız yeni seçilenler görünüyordu: yüklenmiş kanıt "0 adet" sayılıyordu)
        ...(() => {
          const liste = ff && ff.dbId ? (s.fotolar || {})['a' + ff.dbId] : null;
          if (ff && ff.dbId && !liste && this._sb) {
            this._formFotoIstek = this._formFotoIstek || {};
            if (!this._formFotoIstek[ff.dbId]) { this._formFotoIstek[ff.dbId] = 1; setTimeout(() => this.arizaFotoYenile(ff.dbId), 0); }
          }
          const kayit = ff && ff.dbId ? (liste || []).filter(x => x.arizaDbId === ff.dbId) : [];
          const yeni = ff ? (ff.photos || []).length : 0;
          const sesListe = ff && ff.dbId ? (s.kayitliSesler || {})['a' + ff.dbId] : null;
          return {
            kayitSes: (sesListe || []).map(x => ({
              player: this.audioEl(x.url),
              meta: [x.yukleyen, x.sure ? Math.floor(x.sure / 60) + ':' + String(x.sure % 60).padStart(2, '0') : '', x.yuklendi ? this.damgaCevir(x.yuklendi) : ''].filter(Boolean).join(' · ')
            })),
            kayitSesVar: !!(sesListe && sesListe.length),
            kayitFoto: kayit.map(x => ({
              img: this.imgEl(x.url, 'Arıza fotoğrafı'),
              etiket: /Sonrası/.test(x.aciklama || '') ? 'Sonrası' : (/Öncesi/.test(x.aciklama || '') ? 'Öncesi' : 'Kayıtta')
            })),
            photoCount: kayit.length ? kayit.length + ' kayıtta' + (yeni ? ' · ' + yeni + ' yeni' : '') : yeni + ' adet'
          };
        })(),
        kaydetmiyor: !(ff && ff.kayitta),
        crewLocked: !canAssign, crewOpacity: canAssign ? '1' : '.55',
        sla: (() => {
          if (!ff) return { goster: false };
          const ek = ff.ek || {};
          const yonetimRol = CAN.assign.includes((me || {}).role);
          const pad = n => String(n).padStart(2, '0');
          const yerelZaman = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
          const bekDk = (ek.beklemeDk || 0) + (ek.beklemeBas ? Math.max(0, Math.round((Date.now() - Date.parse(ek.beklemeBas)) / 60000)) : 0);
          const ilceF = ffAsset ? ffAsset.district : (ff.ilce || ff.district || '');
          const adaylar = (s.faults || []).filter(x => x.dbId != null && x.dbId !== ff.dbId && !KAPALI_DURUM.includes(x.status)
            && !(x.ek && x.ek.anaId) && (!ilceF || (x.district || x.ilce || '') === ilceF || !(x.district || x.ilce)));
          const bagli = ff.dbId ? (s.faults || []).filter(x => x.ek && x.ek.anaId === ff.dbId) : [];
          const varsayilan = this.sureGun(ff.priority);
          return {
            goster: true, yonetim: yonetimRol && sureOn, yonetimDegil: !yonetimRol && sureOn,
            slaYazi: ek.slaIptal ? 'Bu arıza SLA dışı sayılıyor.' : 'SLA süresi: ' + (ek.slaGun != null ? ek.slaGun : varsayilan) + ' gün. Değişikliği yönetici yapar.',
            gun: ek.slaGun != null ? String(ek.slaGun) : '', varsayilan: String(varsayilan) + ' (öncelikten)',
            iptal: !!ek.slaIptal,
            onGun: e => { const v = String(e.target.value || '').trim(); this.arizaEkDegis(ff, { slaGun: v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0)) }); },
            onIptal: () => this.arizaEkDegis(ff, { slaIptal: !ek.slaIptal }),
            bekleme: sureOn && ff.status === 'bekleme', neden: ek.beklemeNeden || '', nedenler: BEKLEME_NEDEN.map(v => ({ v })),
            onNeden: e => this.arizaEkDegis(ff, { beklemeNeden: e.target.value }),
            beklemeVar: sureOn && bekDk > 0,
            beklemeYazi: 'Toplam bekleme: ' + (bekDk >= 120 ? Math.floor(bekDk / 60) + ' saat' : bekDk + ' dk') + ' — hedef süreden düşülür.',
            ana: ek.anaId ? String(ek.anaId) : '',
            anaSecenek: [{ v: '', n: 'Yok — bağımsız arıza' },
              ...(ek.anaId && !adaylar.some(x => x.dbId === ek.anaId) ? [{ v: String(ek.anaId), n: ((s.faults || []).find(x => x.dbId === ek.anaId) || {}).no || ('#' + ek.anaId) }] : []),
              ...adaylar.slice(0, 40).map(x => ({ v: String(x.dbId), n: x.no + ' · ' + (x.koy || x.tesisKoy || x.district || '') + ' · ' + (x.type || '') }))],
            onAna: e => this.arizaEkDegis(ff, { anaId: e.target.value ? Number(e.target.value) : null }),
            bagliVar: bagli.length > 0,
            bagliYazi: 'Bu ana arızaya bağlı ' + bagli.length + ' ihbar: ' + bagli.slice(0, 5).map(x => x.no).join(', ') + (bagli.length > 5 ? '…' : '') + ' — çözülünce hepsine sorulur.',
            planli: yerelZaman(ek.planli),
            onPlanli: e => this.arizaEkDegis(ff, { planli: e.target.value ? new Date(e.target.value).toISOString() : null })
          };
        })(),
        assignNote: canAssign
          ? 'Arıza fotoğrafları fault_media tablosunda tutulur — envanter galerisine karışmaz. Atamayı yaptığınızda ekip kendi listesinde görür.'
          : 'Ekip atamasını Arıza Şefi ve üstü değiştirir; arıza personeli atamayı göremez, kendi ekibine düşen işi görür. Arıza fotoğrafları envanter galerisinden ayrı tutulur.',
        priorities: prios.map(p => ({
          label: p, bg: ff && ff.priority === p ? (p === 'Acil' ? 'var(--color-accent)' : ui.surf2) : 'transparent',
          fg: ff && ff.priority === p ? (p === 'Acil' ? '#fff' : ui.acc) : ui.mut,
          pick: () => this.setState({ faultForm: { ...this.state.faultForm, priority: p } })
        })),
        // Hızlı iş akışı (masaüstü + telefon ayrıntılı form): Sahadayım → İşi tamamla
        hizli: (() => {
          if (!ff || !ff.id) return { var: false };
          const kapali = KAPALI_DURUM.includes(ff.status);
          const kendiIsi = !!(me && (me.role !== 'personel' || ff.crew === me.crew));
          const vardimVar = !kapali && ff.status !== 'sahada' && ff.status !== 'kontrol' && kendiIsi;
          const tamamlaVar = !kapali && ff.status === 'sahada' && kendiIsi;
          const hedef = onayOn && !canAssign ? 'kontrol' : 'cozuldu';
          return {
            var: vardimVar || tamamlaVar, vardimVar, tamamlaVar,
            not: vardimVar ? 'Sahadayım: ekip yerine vardı, iş “Sahada” olur ve başlama zamanı kaydolur.'
              : 'İşi tamamla: aşağıdaki fotoğraf, malzeme ve süre ile ' + (hedef === 'kontrol' ? 'işi merkez onayına gönderir.' : 'kaydı kapatır; kanıt fotoğrafı zorunluysa eksikse uyarır.'),
            vardim: () => {
              const f0 = (this.state.faults || []).find(x => x.id === ff.id) || ff;
              this.sahaDurum({ ...f0, note: this.state.faultForm.note ?? f0.note }, 'sahada');
              this.setState({ faultForm: { ...this.state.faultForm, status: 'sahada' } });
              this.duyur((ff.no || 'İş') + ' sahada olarak işaretlendi. İş bitince “İşi tamamla”ya basın.', 5000, 'iyi');
            },
            tamamla: () => this.setState({ faultForm: { ...this.state.faultForm, status: hedef } }, () => this.renderVals().saveFault())
          };
        })(),
        workflow: wfSteps.map(([id, label]) => {
          // Merkez onayı açıkken “Çözüldü”yü yalnızca atama yetkisi olan verir;
          // saha ekibi işi Kontrolde durumuna bırakır.
          const kilit = onayOn && id === 'cozuldu' && !canAssign;
          return {
            label, border: ff && ff.status === id ? 'var(--color-accent)' : ui.rule,
            bg: ff && ff.status === id ? ui.pend : 'transparent',
            fg: kilit ? ui.mut : (ff && ff.status === id ? ui.acc : ui.mut),
            op: kilit ? '.45' : '1',
            go: () => {
              if (kilit) return this.say('Merkez onayı açık: işi “Kontrolde” bırakın, kapanışı merkez verir.');
              this.setState({ faultForm: { ...this.state.faultForm, status: id } });
            }
          };
        }),
        // Merkez denetimi: kanıtı görüp onaylar ya da nedenini yazıp iade eder
        onay: {
          on: !!(onayOn && ff && ff.id && ff.status === 'kontrol' && canAssign),
          not: 'Saha işi bitirdi. Fotoğrafları ve notu inceleyin: yeterliyse kapatın, eksikse nedenini yazıp sahaya iade edin.',
          kapat: () => {
            this.setState({ faultForm: { ...this.state.faultForm, status: 'cozuldu' } });
            this.say('Kayıt kapanışa alındı — kaydetmeyi tamamlayın.');
          },
          iade: () => {
            const neden = (window.prompt('İade nedeni — sahada ne eksik kaldı?') || '').trim();
            if (!neden) return;
            const f = this.state.faultForm;
            this.setState({
              faultForm: {
                ...f, status: 'sahada',
                note: ((f.note || '') + (f.note ? '\n' : '') + 'MERKEZ İADESİ · ' + this.damga() + ' · ' + neden)
              }
            });
            this.say('Sahaya iade edildi, neden nota işlendi — kaydetmeyi tamamlayın.');
          }
        },
        // Ekip önerisi: tesisin ilçesine bakan ekipler + bugünün nöbetçisi
        ekipOneri: (() => {
          if (!ffAsset) return [];
          const ilce = ffAsset.district || '';
          const out = [];
          for (const e of (s.ekipler || [])) {
            const bolgede = (e.bolgeler || []).includes(ilce);
            const tumIl = (e.bolgeler || []).length === 0;
            const nobetci = e.ad === nobetciEkip;
            if (!bolgede && !tumIl && !nobetci) continue;
            const acik = s.faults.filter(f => f.crew === e.ad && !KAPALI_DURUM.includes(f.status)).length;
            const kisiler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
            const calisan = kisiler.filter(p => !PERSONEL_YOK.includes(p.durum)).length;
            out.push({
              ad: e.ad,
              siralama: (nobetci ? -100 : 0) + (bolgede ? -50 : 0) + (calisan ? 0 : 200) + acik,
              neden: [
                nobetci ? 'bugün nöbetçi' : '',
                bolgede ? ilce + ' bölgesi' : (tumIl ? 'tüm il' : ''),
                kisiler.length ? calisan + ' kişi görevde' : 'kişi girilmedi',
                acik + ' açık iş'
              ].filter(Boolean).join(' · '),
              secili: !!ff && ff.crew === e.ad
            });
          }
          return out.sort((a, b) => a.siralama - b.siralama).slice(0, 4).map(x => ({
            ad: x.ad, neden: x.neden,
            bg: x.secili ? 'var(--color-accent)' : 'transparent',
            fg: x.secili ? '#fff' : ui.fg,
            nedenFg: x.secili ? '#fff' : ui.mut,
            pick: () => this.setState({ faultForm: { ...this.state.faultForm, crew: x.ad } })
          }));
        })(),
        ekipOneriVar: !!ffAsset && (s.ekipler || []).length > 0,
        ekipOneriNot: nobetciEkip
          ? 'Bugünün nöbetçisi ' + nobetciEkip + '; tesisin ilçesine bakan ekipler önce geliyor.'
          : 'Tesisin ilçesine bakan ekipler önce geliyor. Nöbet takvimi girilmedi — Ayarlar > Ekipler bölümünden girilir.',
        ekipBilgi: (() => {
          const ad = ff ? ff.crew : '';
          const e = ekipAyarBul(ad);
          if (!ad || ad === ATANMADI || !e) return 'Ekip atanmadı — atama yapılmadan iş sahaya düşmez.';
          const acik = s.faults.filter(x => x.crew === ad && !KAPALI_DURUM.includes(x.status)).length;
          const kisiler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
          const calisan = kisiler.filter(p => !PERSONEL_YOK.includes(p.durum));
          const yok = kisiler.filter(p => PERSONEL_YOK.includes(p.durum));
          return [
            e.vardiya,
            kisiler.length ? (calisan.length ? calisan.map(p => p.ad).join(', ') : 'görevde kimse yok') : '',
            yok.length ? yok.map(p => p.ad + ' ' + (PERSONEL_DURUM[p.durum] || '').toLocaleLowerCase('tr')).join(', ') : '',
            (e.yetkinlik || []).join(', ') || 'yetkinlik girilmedi',
            'şu an ' + acik + ' açık iş'
          ].filter(Boolean).join(' · ');
        })(),
        ekipUyariVar: (() => {
          const ad = ff ? ff.crew : '', e = ekipAyarBul(ad);
          if (!ad || ad === ATANMADI || !e) return false;
          const kisiler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
          if (kisiler.length && !kisiler.some(p => !PERSONEL_YOK.includes(p.durum))) return true;
          const gerek = (YETKINLIK_ESLEME.find(([re]) => re.test(String(ff.type || ''))) || [])[1];
          return !!(gerek && !(e.yetkinlik || []).includes(gerek));
        })(),
        ekipUyari: (() => {
          const ad = ff ? ff.crew : '', e = ekipAyarBul(ad);
          if (e) {
            const kisiler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
            if (kisiler.length && !kisiler.some(p => !PERSONEL_YOK.includes(p.durum)))
              return 'Bu ekipteki kişilerin hepsi izinli, raporlu ya da başka görevde. Atama yapılabilir ama iş sahaya düşmez.';
          }
          if (e) {
            const kisiler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
            if (kisiler.length && !kisiler.some(p => !PERSONEL_YOK.includes(p.durum)))
              return 'Bu ekipteki kişilerin hepsi izinli, raporlu ya da başka görevde. Atama yapılabilir ama iş sahaya düşmez.';
          }
          const gerek = (YETKINLIK_ESLEME.find(([re]) => re.test(String(ff && ff.type || ''))) || [])[1];
          if (!gerek || !e) return '';
          return 'Bu arıza ' + gerek.toLowerCase() + ' yetkinliği istiyor, seçilen ekipte kayıtlı değil. Atama yine de yapılabilir.';
        })(),
        gecmisNot: (() => {
          if (!ffAsset) return '';
          const g = s.faults.filter(x => x.assetId === ffAsset.id && (!ff || x.id !== ff.id));
          if (!g.length) return ffAsset.code + ' kaydında başka arıza yok.';
          const sik = {};
          for (const x of g) sik[x.type] = (sik[x.type] || 0) + 1;
          const enSik = Object.entries(sik).sort((a, b) => b[1] - a[1])[0];
          return ffAsset.code + ' kaydında ' + g.length + ' arıza geçmişi var · en sık: '
            + enSik[0] + ' × ' + enSik[1] + ' · son kayıt ' + (g[0].opened || '—') + '.';
        })(),
        // Kapanmış kayıt yeniden açılır: geçmiş, fotoğraf ve maliyet korunur
        yenidenAc: {
          on: !!(ff && ff.id && KAPALI_DURUM.includes(ff.status) && canAssign),
          not: 'Aynı arıza tekrar görüldüyse yeni kayıt açmak yerine bu kaydı yeniden açın — fotoğrafları, malzemesi ve maliyeti kayıtta kalır, tekrar sayacı artar.',
          go: () => {
            const neden = (window.prompt('Yeniden açma nedeni — arıza tekrar mı etti?') || '').trim();
            if (!neden) return;
            const g = this.state.faultForm;
            this.setState({
              faultForm: {
                ...g, status: 'yeniden', tekrar: (g.tekrar || 0) + 1,
                note: ((g.note || '') + (g.note ? '\n' : '') + 'YENİDEN AÇILDI · ' + this.damga() + ' · ' + neden)
              }
            });
            this.say('Kayıt yeniden açıldı — kaydetmeyi tamamlayın.');
          }
        },
        kanitVar: kanitOn,
        kanitNot: 'Kanıt zorunlu: “Çözüldü” işaretlemek için kayıtta en az bir fotoğraf olmalı — sahada çekilen tek fotoğraf yeterli.',
        cta: s.offline ? 'Cihaza kaydet (kuyruğa al)' : (ff && ff.id ? 'Güncelle ve eşitle' : 'Kaydet ve eşitle'),
        // malzeme ve maliyet
        malzemeler: ff ? (ff.malzeme || []).map((mz, i) => ({
          ad: mz.ad, adet: mz.adet + ' ' + mz.birim, tutar: mz.tutar ? this.tl(mz.tutar) : '—',
          sil: () => this.setState(st => ({ faultForm: { ...st.faultForm, malzeme: st.faultForm.malzeme.filter((_, j) => j !== i) } }))
        })) : [],
        malzemeVar: !!(ff && ff.malzeme && ff.malzeme.length),
        // Katalog 300+ kalemi bulabilir: hepsi düğme olarak dökülmez. Arama
        // boşken ekibin zimmetindeki kalemler önce gelir (kapanışta zaten
        // o zimmetten düşülür), aramada eşleşenler.
        malzemeQ: s.arizaMlzQ || '',
        onMalzemeQ: e => this.setState({ arizaMlzQ: e.target.value, arizaMlzAcik: true }),
        malzemeAcik: !!s.arizaMlzAcik || !!(s.arizaMlzQ || '').trim(),
        malzemeOk: (s.arizaMlzAcik || (s.arizaMlzQ || '').trim()) ? '▴ Kapat' : '▾ Aç',
        malzemeSay: MALZEME.length + ' kalem' + ((s.arizaMlzQ || '').trim() ? ' · aranıyor' : ''),
        malzemeTog: () => this.setState({ arizaMlzAcik: !(this.state.arizaMlzAcik || (this.state.arizaMlzQ || '').trim()), arizaMlzQ: '' }),
        ...(() => {
          const q = sadeMetin(s.arizaMlzQ || '');
          const zim = (ff && ff.crew && ((s.ambar || {}).zimmet || {})[ff.crew]) || {};
          const kodu = ad => (this.katalogBul(ad) || {}).kod || '';
          const uyan = q ? MALZEME.filter(mz => sadeMetin(mz[0] + ' ' + kodu(mz[0])).includes(q))
            : MALZEME.slice().sort((a, b) => ((Number(zim[b[0]]) > 0) - (Number(zim[a[0]]) > 0)));
          const sinir = q ? 24 : 14;
          const zimSay = Object.keys(zim).filter(x => Number(zim[x]) > 0).length;
          return {
            malzemeNot: uyan.length > sinir ? (uyan.length - sinir) + ' kalem daha var — aramak için yazın.'
              : (q && !uyan.length ? 'Eşleşen malzeme yok. Katalogda yoksa Ambar > Malzeme tanımla.' : (zimSay && !q ? ff.crew + ' zimmetindekiler önde.' : '')),
            malzemeSecenek: uyan.slice(0, sinir).map(mz => {
              const z = Number(zim[mz[0]]) || 0;
              return {
                ad: mz[0], fiyat: this.tl(mz[1]) + ' / ' + mz[2] + (z ? ' · zimmette ' + z : ''),
                ekle: () => this.setState(st => ({
                  arizaMlzAcik: false, arizaMlzQ: '',
                  faultForm: { ...st.faultForm, malzeme: [...(st.faultForm.malzeme || []), { ad: mz[0], adet: 1, birim: mz[2], tutar: mz[1] }] }
                }))
              };
            })
          };
        })(),
        iscilik: ff ? (ff.iscilik || '') : '',
        onIscilik: e => this.setState({ faultForm: { ...this.state.faultForm, iscilik: e.target.value } }),
        maliyet: (() => {
          if (!ff) return { malzeme: '—', iscilik: '—', toplam: '—', not: '' };
          const mt = (ff.malzeme || []).reduce((t, mz) => t + (mz.tutar || 0) * (mz.adet || 1), 0);
          const saat = parseFloat(String(ff.hours || '').replace(',', '.')) || 0;
          const isc = parseFloat(String(ff.iscilik || '').replace(',', '.')) || (saat * 320);
          return {
            malzeme: this.tl(mt), iscilik: this.tl(isc), toplam: this.tl(mt + isc),
            not: ff.iscilik ? 'İşçilik elle girildi.' : (saat ? `İşçilik ${saat} saat × 320 ₺ olarak hesaplandı — elle de girebilirsiniz.` : 'Süreyi girince işçilik kendiliğinden hesaplanır.')
          };
        })(),
        // sesli not
        sesler: ff ? (ff.sesler || []).map((sn, i) => ({
          sure: sn.sure, durum: sn.durum, url: sn.url || '',
          calinabilir: !!sn.url,
          player: sn.url ? this.audioEl(sn.url, true) : null,
          indir: sn.url ? () => this.medyaIndir(sn.url, `ariza-sesli-not-${i + 1}.webm`) : null,
          durumFg: sn.durum === 'Cihazda' ? ui.acc : ui.mut,
          sil: () => this.setState(st => {
            const eski = st.faultForm.sesler[i];
            if (eski && eski.url) { try { URL.revokeObjectURL(eski.url); } catch (e) {} }
            return { faultForm: { ...st.faultForm, sesler: st.faultForm.sesler.filter((_, j) => j !== i) } };
          })
        })) : [],
        seslerVar: !!(ff && ff.sesler && ff.sesler.length),
        kaydediyor: !!(ff && ff.kayitta),
        sesBaslat: () => this.sesKayit(),
        // fotoğraf işaretleme
        isaretModu: !!(ff && ff.isaret !== undefined && ff.isaret !== null),
        isaretFoto: ff && ff.isaret !== null && ff.isaret !== undefined ? `${ff.isaret + 1}. fotoğraf` : '',
        isaretKapat: () => this.setState({ faultForm: { ...this.state.faultForm, isaret: null } }),
        isaretAraclar: [
          { ad: 'Ok', not: 'arızalı parçayı göster' },
          { ad: 'Daire', not: 'bölgeyi çevrele' },
          { ad: 'Yazı', not: 'ölçü veya açıklama' }
        ].map(t => ({
          ...t, sec: () => this.say(`${t.ad} aracı seçildi — fotoğrafa dokunarak ${t.not}. İşaretler fotoğrafın üstüne ayrı katman olarak kaydedilir, aslı bozulmaz.`)
        }))
      },
      onFaultAsset: e => {
        const a = s.assets.find(x => x.id === e.target.value);
        const g = a ? TESIS_GRUP[a.type] || 'su' : arizaGrubu(this.state.faultForm, null);
        const ff0 = this.state.faultForm;
        this.setState({ faultForm: { ...ff0, assetId: e.target.value || null, grup: g,
          type: ARIZA_GRUP[g].turler.includes(ff0.type) ? ff0.type : ARIZA_GRUP[g].turler[0] } });
      },
      onFaultType: e => this.setState({ faultForm: { ...this.state.faultForm, type: e.target.value } }),
      onFaultNote: e => this.setState({ faultForm: { ...this.state.faultForm, note: e.target.value } }),
      onFaultCrew: e => {
        const c = e.target.value, f0 = this.state.faultForm;
        // Ekip atanınca açık arıza "Atandı", ekip kalkınca yeniden "Açık"
        const durum = c && c !== ATANMADI ? (f0.status === 'acik' ? 'atandi' : f0.status) : (f0.status === 'atandi' ? 'acik' : f0.status);
        this.setState({ faultForm: { ...f0, crew: c, status: durum } });
      },
      onFaultHours: e => this.setState({ faultForm: { ...this.state.faultForm, hours: e.target.value } }),
      addFaultPhoto: () => this.arizaFotoSec(false),
      cekFaultPhoto: () => this.arizaFotoSec(true),
      // Saha kanıtı aşaması — işe başlamadan önce mi sonra mı çekildiği,
      // bir sonraki eklenen fotoğraf/ses kaydına damgalanır (madde 10).
      asamaSec: Object.entries(ASAMA_AD).map(([k, ad]) => {
        const secili = (ff && ff.fotoAsama === 'sonra' ? 'sonra' : 'once') === k;
        return { label: ad, ...seg(secili, () => this.setState({ faultForm: { ...this.state.faultForm, fotoAsama: k } })) };
      }),
      isaretle: i => () => this.setState({ faultForm: { ...this.state.faultForm, isaret: i } }),
      saveFault: () => {
        const f = this.state.faultForm;
        // Mükerrer kayıt denetimi — yalnızca yeni kayıt açılırken
        if (f && !f.id && f.assetId) {
          const ben = this.mukerrerBul(f);
          if (ben.length) {
            const liste = ben.slice(0, 3).map(x => '• ' + x.no + ' · ' + x.type + ' · '
              + (STATUS_LABEL[x.status] || x.status) + ' · ' + x.opened + ' · ' + x.crew).join('\n');
            const ac = window.confirm('Bu tesiste benzer kayıt var:\n\n' + liste
              + '\n\nTAMAM: var olan kaydı açar, yeni kayıt oluşmaz.\nİPTAL: yine de ayrı kayıt açar.');
            if (ac) {
              // Talep bağı korunur: mükerrer kayıt seçilse de talep o arızaya bağlanır
              if (f.talepId) this.talepDurum(f.talepId, 'arizaya', 'Var olan ' + ben[0].no + ' kaydına bağlandı');
              return this.setState({ faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...ben[0] } },
                () => this.duyur(ben[0].no + ' açıldı — mükerrer kayıt oluşmadı. Yeni bilgiyi bu kaydın notuna yazın.'
                  + (f.talepId ? ' Talep bu kayda bağlandı.' : ''), 6500, 'iyi'));
            }
          }
        }
        // Kanıtsız kapanış: fotoğraf olmadan “Çözüldü” yazılamaz. Sunucuda bu
        // arızaya bağlı fotoğraf da sayılır (önceden yalnız formda yeni
        // eklenen sayılıyordu: öncesi fotoğrafı yüklenmiş arıza kapatılamıyordu).
        if (kanitOn && f && f.status === 'cozuldu' && !((f.photos || []).length)) {
          const liste = f.dbId ? (s.fotolar || {})['a' + f.dbId] : null;
          if (f.dbId && !liste && this._sb && !this._kanitBak) {
            this._kanitBak = true;
            this.say('Kayıttaki fotoğraflar kontrol ediliyor…');
            return this.arizaFotoYenile(f.dbId).then(() => { this._kanitBak = false; this.renderVals().saveFault(); });
          }
          this._kanitBak = false;
          const sunucuda = (liste || []).filter(p => p.arizaDbId === f.dbId).length;
          if (!sunucuda) return this.say('Kanıt zorunlu — kapatmadan önce en az bir fotoğraf ekleyin.', true);
        }
        // Tesis ya da (şebeke arızasında) ilçe+köy gerekir
        if (!f || (!f.assetId && !f.ilce)) return this.say('Önce tesisi ya da arızanın köyünü seçin.', true);
        if (!f.assetId && !f.koy) return this.say('Arızanın köyünü seçin.', true);
        const a = f.assetId ? s.assets.find(x => x.id === f.assetId) : null;
        const aKod = a ? a.code : (f.koy + ' · ' + f.ilce);
        // Her kayıt önce "pending": sunucuya arizaKuyrukGonder yazar
        const sync = 'pending';
        const yeniId = f.id ? f.id : 'nf' + Date.now();
        // Numara if/else dışında üretilir: talep bağlama, denetim izi ve
        // zimmet düşümü hepsi bu numarayı kullanır.
        const arizaNo = f.id ? f.no : 'AR-' + String(101 + s.faults.length);
        if (f.id) {
          this.setState({
            faults: s.faults.map(x => x.id === f.id ? { ...f, sync } : x), panel: s.device === 'phone' ? 'yok' : 'ariza',
            faultForm: null,
            queue: [{ id: 'q' + Date.now(), title: `${f.no} · durum ${STATUS_LABEL[f.status]}`, meta: `${aKod} · ${f.crew}`, state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
          });
        } else {
          this.setState({
            faults: [{ ...f, id: yeniId, no: arizaNo, sync, reporter: s.role, opened: this.damga() }, ...s.faults],
            panel: s.device === 'phone' ? 'yok' : 'ariza', faultForm: null, tab: 'ariza',
            queue: [{ id: 'q' + Date.now(), title: `${arizaNo} · yeni arıza`, meta: `${aKod} · ${f.type} · ${(f.photos || []).length} fotoğraf`, state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
          });
        }
        if (f.status === 'cozuldu') setTimeout(() => this.anaCozum({ ...f, no: arizaNo }), 400);
        // Kapanan kayıtta kullanılan malzeme ekip zimmetinden düşülebilir
        if (ambarOn && f.status === 'cozuldu' && (f.malzeme || []).length
          && f.crew && f.crew !== 'Atanmadı') {
          const dus = window.confirm('Kullanılan malzeme ' + f.crew + ' zimmetinden düşülsün mü?\n\n'
            + (f.malzeme || []).map(mz => '• ' + mz.ad + ' × ' + (mz.adet || 1) + ' ' + mz.birim).join('\n'));
          if (dus) setTimeout(() => this.arizaStokDus({ ...f, no: arizaNo }), 0);
        }
        // Arızaya bağlı açık bir iş emri varsa arıza kapanınca o da kapanır —
        // kullanılan malzeme + toplam saat + not tesis geçmişine ayrıntılı yazılır.
        if (f.status === 'cozuldu' && f.dbId) {
          const baglIsEmri = this.isEmriBul(f.dbId);
          if (baglIsEmri && baglIsEmri.status !== 'kapatildi') {
            setTimeout(() => this.isEmriKapatVer(baglIsEmri, { ...f, no: arizaNo }), 300);
          }
        }
        if (!f.id && f.talepId) {
          const tl = [...(this.state.talepler || [])];
          const ti = tl.findIndex(x => x.id === f.talepId);
          if (ti >= 0) {
            tl[ti] = { ...tl[ti], durum: 'arizaya', arizaNo, guncelleme: this.damga() };
            this.denetimYaz('talep', 'Talep arızaya dönüştürüldü', arizaNo + ' · ' + f.type, tl[ti].no);
            this.modulYaz('talep', tl.slice(0, 1000));
            this.setState({ talepler: tl });
          }
        }
        this.denetimYaz('ariza', f.id ? 'Arıza güncellendi' : 'Arıza açıldı',
          f.type + ' · ' + (STATUS_LABEL[f.status] || f.status) + ' · ' + f.priority
          + ' · ' + (f.crew || 'ekip atanmadı'), arizaNo || (ffAsset ? ffAsset.code : ''));
        // sesli notlar da kayıtla birlikte gider. Yeni kayıtta arıza kimliği
        // sunucuya yazılınca belli olur: fotoğraf ve ses o zaman yüklenir
        // (arizaGonder), böylece arıza kanıtı olarak bağlanır.
        // Dosyalar arıza kaydının içinde tutulmaz: kayıt sonradan yeniden
        // kaydedilince aynı fotoğraf ikinci kez yükleniyordu (2026.10.01).
        const sesler = (f.sesler || []).filter(x => x.blob);
        const bekleyen = (f.photos || []).filter(p => p.file);
        this.setState(st => ({ faults: (st.faults || []).map(x => x.id === yeniId ? { ...x, photos: (x.photos || []).filter(p => !p.file), sesler: [] } : x) }));
        if (sesler.length || bekleyen.length) {
          // Dosyalar önce telefonun deposuna yazılır, sonra kayıt gönderilir
          this.medyaBirak('ariza', yeniId, ffAsset ? ffAsset.code : arizaNo, { photos: bekleyen, sesler }).then(kalici => {
            if (!kalici) {
              this._arizaMedya = this._arizaMedya || {};
              const md = this._arizaMedya[yeniId] || { photos: [], sesler: [] };
              this._arizaMedya[yeniId] = { photos: [...md.photos, ...bekleyen], sesler: [...md.sesler, ...sesler] };
            }
            this.arizaKuyrukGonder();
          });
        } else setTimeout(() => this.arizaKuyrukGonder(), 0);
        // Seçilen fotoğraf ve sesler kayıt sunucuya yazılınca yüklenir (arizaGonder)
        if (bekleyen.length && (s.offline || !this._sb)) {
          this.say(`${bekleyen.length} fotoğraf cihazda bekliyor — ${s.offline ? 'bağlantı gelince' : 'kayıt veritabanına yazıldıktan sonra'} yüklenecek.`, true);
          setTimeout(() => this.setState({ toast: null }), 8000);
        }
        // yeni arıza bildirimi: ekranın üstünde çıkar, birkaç saniye sonra kendiliğinden kalkar
        const kanal = s.bildirimKanal || 'SMS';
        const acilMi = f.priority === 'Acil' || f.priority === 'Yüksek';
        const ekipVar = !!(f.crew && f.crew !== 'Atanmadı');
        const gercekGonderim = acilMi && ekipVar && (this.state.smsAyar || {}).acik && !s.offline;
        if (!f.id) {
          // Gerçek gönderim açıksa mesaj sunucu işlevine gider; sonucu
          // arizaMesaj kendi bildirimini yazar.
          if (gercekGonderim) setTimeout(() => this.arizaMesaj({ ...f, no: arizaNo }, a), 0);
          this.duyur(`Yeni arıza · ${aKod} — ${f.type} · ${f.priority} öncelik` +
            (s.offline
              ? '. Cihaza kaydedildi, bağlantı gelince eşitlenecek.'
              : (gercekGonderim
                ? `. ${f.crew} ekibine ${kanal} gönderiliyor…`
                : (acilMi && ekipVar
                  ? `. ${f.crew} atandı — mesaj gönderimi kapalı, Ayarlar > Bildirim bölümünden açabilirsiniz.`
                  : (acilMi ? '. Ekip atanmadığı için bildirim gönderilmedi — ekip seçip kaydedin.' : '. Kayıt eşitlendi.')))), 7000, 'ariza',
            () => {
              const yeni = this.state.faults[0];
              this.setState({
                tab: 'ariza', panel: 'ariza',
                faultForm: yeni ? { malzeme: [], sesler: [], iscilik: '', isaret: null, ...yeni } : null
              });
            });
        } else {
          this.duyur(`${f.no} güncellendi — durum ${STATUS_LABEL[f.status]}${s.offline ? ' · cihazda bekliyor' : ''}.`, 4500, 'bilgi',
            () => this.setState({ tab: 'ariza', panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...f } }));
        }
      },
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
      isListesi: (() => {
        const my = me && me.crew;
        // "Bana atanan": ekibi olan kullanıcıya yalnız kendi ekibinin işleri
        // (önceden herkese bütün açık arızalar listeleniyordu)
        const acik = s.faults.filter(f => !KAPALI_DURUM.includes(f.status) && (!my || f.crew === my));
        const gecikmis = s.assets.map(a => ({ a, b: this.bakimDurum(a) }))
          .filter(r => r.b.gun !== null && r.b.gun < 0)
          .sort((x, y) => x.b.gun - y.b.gun).slice(0, 6);
        const eksik = s.assets.map(a => ({ a, m: this.missingOf(a) })).filter(x => x.m.length >= 6).slice(0, 6);
        const items = [
          ...(arizaOn ? acik.slice(0, 8) : []).map(f => {
            const a = s.assets.find(x => x.id === f.assetId);
            return {
              kind: 'Arıza', kindFg: ui.acc,
              title: `${f.no} · ${f.type}`,
              meta: (a ? a.code + ' · ' + this.yer(a) + ' · ' : '') + (f.priority || 'Normal') + ' öncelik',
              open: a ? () => this.setState({ selected: a.id, panel: 'detay', detailTab: 'ariza', tab: 'harita' }) : () => this.setState({ tab: 'arizalar' })
            };
          }),
          ...(bakimOn ? gecikmis : []).map(r => ({
            kind: 'Bakım', kindFg: ui.fg,
            title: r.a.code + ' — periyodik bakım',
            meta: this.yer(r.a) + ' · ' + r.b.label,
            open: () => this.setState({ tab: 'bakim' })
          })),
          ...eksik.map(({ a, m }) => ({
            kind: 'EKSİK BİLGİ', kindFg: ui.mut,
            title: a.code + ' — ' + m.length + ' alan boş',
            meta: this.yer(a) + ' · ' + m.slice(0, 3).join(', '),
            open: () => this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' })
          }))
        ];
        return {
          items, empty: items.length === 0,
          who: me ? (my ? `${me.name} · ${my}` : me.name) : '',
          date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
          note: (my ? 'Ekibinize düşen ' : 'Bugün ilgilenilmesi gereken işler: ')
            + [arizaOn ? 'açık arızalar' : null, bakimOn ? 'geciken bakımlar' : null, 'bilgisi çok eksik kayıtlar']
              .filter(Boolean).join(', ') + '.'
        };
      })(),