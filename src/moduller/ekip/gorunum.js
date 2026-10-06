      // Ekipler: ad sabit, vardiya ve yetkinlik burada; yük canlı sayılır
      // Personel havuzu — kişiler ekipten bağımsız, bilgileri tek yerde
      personelHavuz: (() => {
        const pf = s.personelForm;
        const q = (s.personelQ || '').toLocaleLowerCase('tr');
        const hepsi = s.personel || [];
        const suz = hepsi.filter(p => !q
          || [p.ad, p.meslek, p.tel, p.not].join(' ').toLocaleLowerCase('tr').includes(q));
        const ekipteMi = id => (s.ekipler || []).filter(e => (e.uyeIdler || []).includes(e.sefId === id ? id : id) || e.sefId === id);
        return {
          not: 'Kurumdaki teknik personel burada durur: ad soyad, meslek ve telefon. Ekip kurarken kişiler bu havuzdan seçilir; biri ekipten çıksa bilgisi burada kalır. Aynı kişi birden çok ekipte görünebilir.',
          sayi: hepsi.length + ' kişi'
            + (hepsi.length ? ' · ' + [...new Set(hepsi.map(p => p.meslek))].length + ' meslek' : ''),
          q: s.personelQ,
          onQ: e => this.setState({ personelQ: e.target.value }),
          yeni: () => this.setState({ personelForm: { ad: '', meslek: MESLEKLER[0], tel: '', not: '', durum: 'aktif', donus: '', kullanici: '' } }),
          bos: hepsi.length === 0,
          bosNot: 'Havuz boş. “Kişi ekle” ile teknik personeli girin — ekip kurarken buradan seçeceksiniz.',
          bulunamadi: hepsi.length > 0 && suz.length === 0,
          form: {
            on: !!pf,
            baslik: pf && pf.id ? 'Personel bilgisi' : 'Yeni personel',
            ad: pf ? pf.ad : '',
            onAd: e => this.setState({ personelForm: { ...this.state.personelForm, ad: e.target.value } }),
            meslek: pf ? pf.meslek : '', meslekler: MESLEKLER,
            meslekNot: 'Listeden seçebilir ya da kendiniz yazabilirsiniz. Elektrik, makine, sondaj ve kaynak işlerini yapan meslekler ekibin yetkinliğine kendiliğinden eklenir.',
            onMeslek: e => this.setState({ personelForm: { ...this.state.personelForm, meslek: e.target.value } }),
            tel: pf ? pf.tel : '',
            onTel: e => this.setState({ personelForm: { ...this.state.personelForm, tel: e.target.value } }),
            not: pf ? pf.not : '',
            onNot: e => this.setState({ personelForm: { ...this.state.personelForm, not: e.target.value } }),
            aracTurleri: Object.entries(ARAC_TUR).map(([k, tt]) => {
              const on = !!pf && (pf.araclar || []).includes(k);
              return { ad: tt.ad, kenar: on ? 'var(--color-accent)' : ui.rule, bg: on ? 'var(--color-accent)' : 'transparent', fg: on ? '#fff' : ui.fg,
                sec: () => { const f0 = this.state.personelForm; const cur = f0.araclar || [];
                  this.setState({ personelForm: { ...f0, araclar: cur.includes(k) ? cur.filter(z => z !== k) : [...cur, k] } }); } };
            }),
            durumSec: Object.entries(PERSONEL_DURUM).map(([k, ad]) => ({
              label: ad, ...seg(!!pf && pf.durum === k, () => this.setState({ personelForm: { ...this.state.personelForm, durum: k } }))
            })),
            donusVar: !!pf && PERSONEL_YOK.includes(pf.durum) && pf.durum !== 'ayrildi',
            donus: pf ? pf.donus : '',
            onDonus: e => this.setState({ personelForm: { ...this.state.personelForm, donus: e.target.value } }),
            durumNot: !pf ? '' : (pf.durum === 'aktif'
              ? 'Görevde olan kişi ekip listesinde normal görünür.'
              : 'Bu kişi arıza ataması yapılırken “görevde değil” olarak yazılır; ekipte görevde kimse kalmazsa form uyarır.'),
            kullanici: pf ? pf.kullanici : '',
            kullanicilar: (s.users || []).map(u => ({ user: u.user, ad: u.name + ' · ' + u.user })),
            onKullanici: e => this.setState({ personelForm: { ...this.state.personelForm, kullanici: e.target.value } }),
            kullaniciNot: 'Bağlanırsa bu kişi programa girdiğinde açtığı kayıtlar kendi adına yazılır. Aynı hesap tek kişiye bağlanabilir.',
            gunlukVar: !!pf && !!pf.id,
            gunluk: (!pf || !pf.id) ? null : (() => {
              const taslak = s.personelGunTaslak || { tarih: '', tur: 'izin', saat: '', not: '' };
              const gunler = pf.gunler || [];
              return {
                tarih: taslak.tarih,
                onTarih: e => this.setState({ personelGunTaslak: { ...this.state.personelGunTaslak, tarih: e.target.value } }),
                turSec: Object.entries(GUN_TUR_PERSONEL).map(([k, ad]) => ({
                  label: ad, ...seg(taslak.tur === k, () => this.setState({ personelGunTaslak: { ...this.state.personelGunTaslak, tur: k } }))
                })),
                saatVar: taslak.tur === 'fazla_mesai',
                saat: taslak.saat,
                onSaat: e => this.setState({ personelGunTaslak: { ...this.state.personelGunTaslak, saat: e.target.value } }),
                not: taslak.not,
                onNot: e => this.setState({ personelGunTaslak: { ...this.state.personelGunTaslak, not: e.target.value } }),
                ekle: () => this.personelGunEkle(),
                liste: gunler.slice(0, 12).map(g => ({
                  id: g.id,
                  tarih: (g.tarih || '').split('-').reverse().join('.'),
                  tur: GUN_TUR_PERSONEL[g.tur] || g.tur,
                  ek: [g.saat ? g.saat + ' sa' : '', g.not || ''].filter(Boolean).join(' · '),
                  sil: () => this.personelGunSil(g.id)
                })),
                bos: gunler.length === 0,
                sayi: gunler.length
              };
            })(),
            kaydet: () => this.personelKaydet(this.state.personelForm),
            kapat: () => this.setState({ personelForm: null })
          },
          list: suz.map(p => {
            const ekipleri = (s.ekipler || []).filter(e => (e.uyeIdler || []).includes(p.id));
            const seflik = (s.ekipler || []).filter(e => e.sefId === p.id).map(e => e.ad);
            const yokMu = PERSONEL_YOK.includes(p.durum);
            return {
              ad: p.ad, meslek: p.meslek,
              durum: PERSONEL_DURUM[p.durum] || 'Görevde',
              durumBg: yokMu ? 'var(--color-accent)' : 'transparent',
              durumFg: yokMu ? '#fff' : ui.mut,
              ek: [yokMu && p.donus ? 'dönüş ' + p.donus.split('-').reverse().join('.') : '',
                p.kullanici ? 'hesap: ' + p.kullanici : ''].filter(Boolean).join(' · '),
              tel: (p.tel || '').trim() || 'telefon girilmedi',
              telFg: (p.tel || '').trim() ? ui.fg : ui.mut,
              ekip: ekipleri.length ? ekipleri.map(e => e.ad).join(', ') : 'ekipte değil',
              ekipFg: ekipleri.length ? ui.fg : ui.mut,
              seflik: seflik.length ? seflik.join(', ') + ' şefi' : '',
              not: p.not || '',
              duzenle: () => this.setState({ personelForm: { ...p } }),
              sil: () => this.personelSil(p.id)
            };
          })
        };
      })(),
      ekipYonetim: (() => {
        const ef = s.ekipForm;
        const kisiAd = id => ((s.personel || []).find(p => p.id === id) || {}).ad || '';
        return {
          not: 'Ekip kurmak için “Ekip oluştur”a basın: adı, bölgesi, vardiyası, ekip telefonu, şefin telefonu ve havuzdan seçilecek kişiler. Yetkinlik seçtiğiniz kişilerin mesleğinden kendiliğinden gelir, elle de ekleyebilirsiniz. Ekip adı değiştirilebilir — değiştirince geçmiş arıza kayıtları, zimmetler ve araç atamaları da taşınır.',
          personelYok: (s.personel || []).length === 0,
          personelYokNot: 'Ekip kurmadan önce havuza kişi ekleyin — ekip üyeleri oradan seçiliyor.',
          bos: (s.ekipler || []).length === 0 && !s.ekipForm,
          bosNot: 'Kurulmuş ekip yok. Arıza kaydında atama yapabilmek için en az bir ekip gerekir.',
          // Form açıkken liste kapanır: düzenlenen ekibin formu ekranda tek başına durur
          listeGoster: !s.ekipForm,
          // Nöbet takvimi — haftanın günlerine ekip atanır
          nobet: {
            not: 'Hangi gün hangi ekibin nöbetçi olduğunu girin. Arıza kaydı açılırken o günün nöbetçi ekibi ilk sırada önerilir.',
            bugun: nobetciEkip ? 'Bugün nöbetçi: ' + nobetciEkip : 'Bugün için nöbetçi ekip girilmedi.',
            bugunFg: nobetciEkip ? ui.fg : ui.acc,
            gunler: GUNLER.map(g => ({
              ad: g.ad,
              bugunMu: g.k === new Date().getDay(),
              secenekler: [{ ad: '—', deger: '' }, ...SAHA_EKIP.map(c => ({ ad: c, deger: c }))],
              secili: (s.nobet || {})[g.k] || '',
              onSec: e => this.nobetYaz(g.k, e.target.value)
            }))
          },
          yeni: () => this.setState({
            ekipForm: {
              ad: '', vardiya: 'Gündüz', tel: '', sefTel: '', sefId: '',
              bolgeler: [], not: '', yetkinlik: [], uyeIdler: [], eskiAd: ''
            }
          }),
          form: {
            on: !!ef,
            baslik: ef && ef.eskiAd ? ef.eskiAd + ' · ekip bilgisi' : 'Yeni ekip',
            ad: ef ? ef.ad : '',
            onAd: e => this.setState({ ekipForm: { ...this.state.ekipForm, ad: e.target.value } }),
            adNot: ef && ef.eskiAd
              ? 'Adı değiştirirseniz geçmiş kayıtlar da yeni ada taşınır.'
              : 'Kayıtlarda bu ad görünür — “Ekip 5 — Akpınar” gibi yer belirtmek işi kolaylaştırır.',
            // Bölge çok seçimli: hiçbiri seçilmezse ekip tüm ile bakar
            bolgeSecim: (m ? m.DISTRICTS.map(x => x.name) : []).map(bg => {
              const on = !!ef && (ef.bolgeler || []).includes(bg);
              return {
                label: bg, bg: on ? 'var(--color-accent)' : 'transparent', fg: on ? '#fff' : ui.fg,
                pick: () => {
                  const f = this.state.ekipForm;
                  const liste = (f.bolgeler || []);
                  this.setState({ ekipForm: { ...f, bolgeler: on ? liste.filter(x => x !== bg) : [...liste, bg] } });
                }
              };
            }),
            bolgeTumu: {
              label: 'Tüm il',
              bg: ef && !(ef.bolgeler || []).length ? 'var(--color-accent)' : 'transparent',
              fg: ef && !(ef.bolgeler || []).length ? '#fff' : ui.fg,
              pick: () => this.setState({ ekipForm: { ...this.state.ekipForm, bolgeler: [] } })
            },
            bolgeNot: ef && (ef.bolgeler || []).length
              ? (ef.bolgeler || []).join(', ') + ' — bu ekip bu ilçelere bakıyor.'
              : 'Hiçbir ilçe seçilmedi: ekip tüm ile bakıyor sayılır.',
            tel: ef ? ef.tel : '',
            onTel: e => this.setState({ ekipForm: { ...this.state.ekipForm, tel: e.target.value } }),
            sefTel: ef ? ef.sefTel : '',
            onSefTel: e => this.setState({ ekipForm: { ...this.state.ekipForm, sefTel: e.target.value } }),
            telNot: 'Acil ve yüksek öncelikli arıza bu iki numaraya birlikte bildirilir.',
            vardiyalar: VARDIYALAR.map(v => ({
              label: v, ...seg(!!ef && ef.vardiya === v, () => this.setState({ ekipForm: { ...this.state.ekipForm, vardiya: v } }))
            })),
            yetkinlikler: YETKINLIKLER.map(y => {
              const on = !!ef && (ef.yetkinlik || []).includes(y);
              const meslekten = !!ef && (ef.uyeIdler || []).some(id => meslekYetkinlik(((s.personel || []).find(p => p.id === id) || {}).meslek) === y);
              return {
                label: y + (meslekten && !on ? ' ·' : ''),
                bg: on || meslekten ? 'var(--color-accent)' : 'transparent',
                fg: on || meslekten ? '#fff' : ui.mut,
                pick: () => {
                  const f = this.state.ekipForm;
                  this.setState({ ekipForm: { ...f, yetkinlik: on ? (f.yetkinlik || []).filter(z => z !== y) : [...(f.yetkinlik || []), y] } });
                }
              };
            }),
            yetkinlikNot: 'Nokta işaretli olanlar seçtiğiniz kişilerin mesleğinden geliyor.',
            secilenSayi: ef ? (ef.uyeIdler || []).length + ' kişi seçildi' : '',
            havuz: (s.personel || []).map(p => {
              const on = !!ef && (ef.uyeIdler || []).includes(p.id);
              return {
                ad: p.ad + (PERSONEL_YOK.includes(p.durum) ? ' · ' + (PERSONEL_DURUM[p.durum] || '') : ''),
                meta: [p.meslek, p.tel].filter(Boolean).join(' · '),
                bg: on ? 'var(--color-accent)' : 'transparent',
                fg: on ? '#fff' : ui.fg,
                metaFg: on ? '#fff' : ui.mut,
                pick: () => {
                  const f = this.state.ekipForm;
                  const liste = on ? (f.uyeIdler || []).filter(x => x !== p.id) : [...(f.uyeIdler || []), p.id];
                  this.setState({ ekipForm: { ...f, uyeIdler: liste, sefId: liste.includes(f.sefId) ? f.sefId : '' } });
                }
              };
            }),
            sefId: ef ? ef.sefId : '',
            sefSecenek: ef ? (ef.uyeIdler || []).map(id => ({ id, ad: kisiAd(id) })) : [],
            onSef: e => this.setState({ ekipForm: { ...this.state.ekipForm, sefId: e.target.value } }),
            sefNot: ef && (ef.uyeIdler || []).length
              ? 'Şef, seçilen kişiler arasından belirlenir. Kendi telefonu varsa bildirim ona da gider.'
              : 'Şef seçmek için önce havuzdan kişi seçin.',
            not: ef ? ef.not : '',
            onNot: e => this.setState({ ekipForm: { ...this.state.ekipForm, not: e.target.value } }),
            kaydet: () => this.ekipKaydet(this.state.ekipForm),
            kapat: () => this.setState({ ekipForm: null })
          },
          list: (s.ekipler || []).map(e => {
            const isler = s.faults.filter(f => f.crew === e.ad);
            const acik = isler.filter(f => !KAPALI_DURUM.includes(f.status));
            const gecikmis = sureOn ? acik.filter(f => { const dd = this.sureDurum(f); return dd && dd.gecikti; }).length : 0;
            const uyeler = (e.uyeIdler || []).map(id => (s.personel || []).find(p => p.id === id)).filter(Boolean);
            const sef = e.sefId ? (s.personel || []).find(p => p.id === e.sefId) : null;
            return {
              ad: e.ad,
              bolge: (e.bolgeler || []).join(', ') || 'Tüm il',
              yuk: acik.length + ' açık · ' + isler.filter(f => f.status === 'cozuldu').length + ' çözüldü'
                + (sureOn ? ' · ' + gecikmis + ' gecikmiş' : ''),
              yukFg: gecikmis ? ui.acc : ui.mut,
              barW: Math.round(Math.min(1, acik.length / 8) * 100) + '%',
              basSatir: [(e.bolgeler || []).join(', ') || 'Tüm il', e.vardiya,
                (e.yetkinlik || []).join(', ') || 'yetkinlik girilmedi'].filter(Boolean).join(' · '),
              telSatir: [
                (e.tel || '').trim() ? 'Ekip ' + e.tel.trim() : '',
                (e.sefTel || '').trim() ? 'Şef ' + e.sefTel.trim() : '',
                sef ? 'Şef: ' + sef.ad : ''
              ].filter(Boolean).join(' · ') || 'telefon girilmedi',
              telFg: (e.tel || '').trim() || (e.sefTel || '').trim() ? ui.fg : ui.acc,
              kisiler: uyeler.length
                ? uyeler.map(u => u.ad + ' (' + u.meslek + ')'
                    + (PERSONEL_YOK.includes(u.durum) ? ' — ' + (PERSONEL_DURUM[u.durum] || '').toLocaleLowerCase('tr') : '')).join(' · ')
                : 'kişi seçilmedi',
              kisiFg: uyeler.length ? ui.fg : ui.mut,
              gucSatir: (() => {
                if (!uyeler.length) return '';
                const calisan = uyeler.filter(u => !PERSONEL_YOK.includes(u.durum)).length;
                const eksik = uyeler.length - calisan;
                return calisan + ' kişi görevde' + (eksik ? ' · ' + eksik + ' kişi görevde değil' : '')
                  + (e.ad === nobetciEkip ? ' · bugün nöbetçi' : '');
              })(),
              gucFg: uyeler.length && !uyeler.some(u => !PERSONEL_YOK.includes(u.durum)) ? ui.acc : ui.mut,
              notSatir: e.not || '',
              vardiyalar: VARDIYALAR.map(v => ({ label: v, ...seg(e.vardiya === v, () => this.ekipAyar(e.ad, { vardiya: v })) })),
              duzenle: () => this.setState({
                ekipForm: {
                  ...e, uyeIdler: [...(e.uyeIdler || [])], yetkinlik: [...(e.yetkinlik || [])],
                  bolgeler: [...(e.bolgeler || [])], eskiAd: e.ad
                }
              }),
              sil: () => this.ekipSil(e.ad)
            };
          })
        };
      })(),
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
        const ekipListe = s.ekipler || [];
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
        const personel = (s.personel || []).filter(p => p.durum !== 'ayrildi');
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
        const araclar = (s.arac && s.arac.list) || [];
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
            isler: () => this.setState({ tab: 'ariza', arzF: { ekip: e.ad }, arzQ: '' })
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