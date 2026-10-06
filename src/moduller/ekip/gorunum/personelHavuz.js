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