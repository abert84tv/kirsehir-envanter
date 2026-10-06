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