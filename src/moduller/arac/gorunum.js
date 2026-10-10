      aracEkran: (() => {
        // Saha şefi yalnız kendi ekibinin araçlarını ve onların görev dökümünü görür
        const A0 = s.arac || { list: [], hareket: [] };
        const sefEkipA = me && me.role === 'sef' && me.crew ? me.crew : '';
        const A = !sefEkipA ? A0 : (() => {
          const liste = (A0.list || []).filter(v => v.ekip === sefEkipA);
          const idler = new Set(liste.map(v => v.id));
          return { ...A0, list: liste, hareket: (A0.hareket || []).filter(h => idler.has(h.aracId)) };
        })();
        const af = s.aracForm, ag = s.aracGorev;
        const bugun = new Date();
        const gunFark = iso => {
          if (!iso) return null;
          const d = new Date(iso + 'T00:00:00');
          return isNaN(d) ? null : Math.round((d - bugun) / 86400000);
        };
        const acikIsler = (s.faults || []).filter(f => !KAPALI_DURUM.includes(f.status));
        const list = (A.list || []).map(v => {
          const T = ARAC_TUR[v.tur] || ARAC_TUR.kamyonet;
          const kalan = gunFark(v.muayene);
          const sigKalan = gunFark(v.sigorta);
          const gorevde = v.durum === 'gorevde';
          return {
            id: v.id, ad: v.ad, tur: T.ad,
            plaka: v.plaka || (T.plaka ? 'plaka girilmedi' : 'plakasız ekipman'),
            durum: ARAC_DURUM[v.durum] || v.durum,
            durumBg: gorevde ? 'var(--color-accent)' : (v.durum === 'musait' ? 'transparent' : ui.surf2),
            durumFg: gorevde ? '#fff' : (v.durum === 'musait' ? ui.mut : ui.fg),
            sayac: (parseFloat(v.sayac) || 0).toLocaleString('tr-TR') + ' ' + T.birim,
            meta: [[v.marka, v.model].filter(Boolean).join(' ') || T.ad, v.yil ? v.yil + ' model' : '',
              (parseFloat(v.sayac) || 0).toLocaleString('tr-TR') + ' ' + T.birim].filter(Boolean).join(' · '),
            metaTel: [v.plaka || (T.plaka ? 'plaka girilmedi' : 'plakasız ekipman'), T.ad,
              (parseFloat(v.sayac) || 0).toLocaleString('tr-TR') + ' ' + T.birim].filter(Boolean).join(' · '),
            kimde: gorevde ? (v.ekip + (v.surucu ? ' · ' + v.surucu : '') + (v.is ? ' · ' + v.is : '')) : '',
            kimdeVar: gorevde,
            muayene: [v.muayene
              ? (kalan == null ? '' : (kalan < 0 ? 'Muayene ' + (-kalan) + ' gün geçti'
                : (kalan < 45 ? 'Muayeneye ' + kalan + ' gün' : 'Muayene ' + v.muayene.split('-').reverse().join('.'))))
              : (T.plaka ? 'Muayene tarihi girilmedi' : ''),
              v.sigorta ? (sigKalan == null ? '' : (sigKalan < 0 ? 'Sigorta ' + (-sigKalan) + ' gün geçti' : (sigKalan < 45 ? 'Sigortaya ' + sigKalan + ' gün' : ''))) : ''].filter(Boolean).join(' · '),
            sigortaYazi: v.sigorta ? (sigKalan == null ? '' : (sigKalan < 0 ? 'Sigorta ' + (-sigKalan) + ' gün geçti' : (sigKalan < 45 ? 'Sigortaya ' + sigKalan + ' gün' : ''))) : '',
            muayeneFg: (kalan != null && kalan < 45) || (sigKalan != null && sigKalan < 45) ? ui.acc : ui.mut,
            yil: v.yil ? v.yil + ' model' : '',
            gorevdeMi: gorevde,
            ver: () => this.setState({ aracGorev: { id: v.id, mod: 'ver', ekip: SAHA_EKIP[0] || '', surucu: '', is: '', sayac: v.sayac, durum: v.durum, not: '' } }),
            al: () => this.setState({ aracGorev: { id: v.id, mod: 'al', ekip: v.ekip, surucu: v.surucu, is: v.is, sayac: v.sayac, durum: v.durum, not: '' } }),
            durumDegis: () => this.setState({ aracGorev: { id: v.id, mod: 'durum', durum: v.durum, sayac: v.sayac, ekip: v.ekip, surucu: v.surucu, is: v.is, not: '' } }),
            duzenle: () => this.setState({ aracForm: { ...v } }),
            sil: () => this.aracSil(v.id)
          };
        });
        const uyari = list.filter(v => v.muayeneFg === ui.acc).length;
        const secArac = ag ? (A.list || []).find(x => x.id === ag.id) : null;
        const secTur = secArac ? (ARAC_TUR[secArac.tur] || ARAC_TUR.kamyonet) : null;
        return {
          not: 'Araç ve ekipman listesi, kimde olduğu ve sayaç okumaları. Görev verirken çıkış, teslim alırken dönüş okuması girilir; aradaki fark o görevin km ya da motor saati olarak dökümde kalır. Muayenesine 45 günden az kalan araç kırmızı yazılır.',
          stats: [
            { n: String(list.length), label: 'Araç ve ekipman', fg: ui.fg },
            { n: String(list.filter(v => v.gorevdeMi).length), label: 'Görevde', fg: ui.fg },
            { n: String((A.list || []).filter(v => v.durum === 'bakimda' || v.durum === 'arizali').length), label: 'Bakımda / arızalı', fg: ui.fg },
            { n: String(uyari), label: 'Muayene / sigorta uyarısı', fg: uyari ? ui.acc : ui.fg }
          ],
          list, bos: list.length === 0,
          bosNot: 'Listede araç yok. “Araç ekle” ile kamyon, vinç, kepçe, sondaj makinesi gibi araç ve ekipmanları girin.',
          yeni: () => this.setState({ aracForm: { ad: '', tur: 'kamyonet', plaka: '', yil: '', sayac: '', muayene: '', sigorta: '', marka: '', model: '' } }),
          form: {
            on: !!af,
            baslik: af && af.id ? 'Araç bilgisi' : 'Yeni araç / ekipman',
            ad: af ? af.ad : '',
            onAd: e => this.setState({ aracForm: { ...this.state.aracForm, ad: e.target.value } }),
            tur: af ? af.tur : '', turler: Object.entries(ARAC_TUR).map(([k, t]) => ({ k, ad: t.ad })),
            onTur: e => this.setState({ aracForm: { ...this.state.aracForm, tur: e.target.value } }),
            plaka: af ? af.plaka : '',
            onPlaka: e => this.setState({ aracForm: { ...this.state.aracForm, plaka: e.target.value } }),
            yil: af ? af.yil : '',
            onYil: e => this.setState({ aracForm: { ...this.state.aracForm, yil: e.target.value } }),
            sayac: af ? af.sayac : '',
            sayacLabel: af ? 'Sayaç (' + (ARAC_TUR[af.tur] || ARAC_TUR.kamyonet).birim + ')' : 'Sayaç',
            onSayac: e => this.setState({ aracForm: { ...this.state.aracForm, sayac: e.target.value } }),
            muayene: af ? af.muayene : '',
            onMuayene: e => this.setState({ aracForm: { ...this.state.aracForm, muayene: e.target.value } }),
            sigorta: af ? (af.sigorta || '') : '', marka: af ? (af.marka || '') : '', model: af ? (af.model || '') : '',
            onSigorta: e => this.setState({ aracForm: { ...this.state.aracForm, sigorta: e.target.value } }),
            onMarka: e => this.setState({ aracForm: { ...this.state.aracForm, marka: e.target.value } }),
            onModel: e => this.setState({ aracForm: { ...this.state.aracForm, model: e.target.value } }),
            gunlukVar: !!af && !!af.id,
            gunluk: (!af || !af.id) ? null : (() => {
              const taslak = s.aracGunTaslak || { tarih: '', tur: 'bakim', saat: '', not: '' };
              const gunler = af.gunler || [];
              return {
                tarih: taslak.tarih,
                onTarih: e => this.setState({ aracGunTaslak: { ...this.state.aracGunTaslak, tarih: e.target.value } }),
                turSec: Object.entries(GUN_TUR_ARAC).map(([k, ad]) => ({
                  label: ad, ...seg(taslak.tur === k, () => this.setState({ aracGunTaslak: { ...this.state.aracGunTaslak, tur: k } }))
                })),
                saat: taslak.saat,
                onSaat: e => this.setState({ aracGunTaslak: { ...this.state.aracGunTaslak, saat: e.target.value } }),
                not: taslak.not,
                onNot: e => this.setState({ aracGunTaslak: { ...this.state.aracGunTaslak, not: e.target.value } }),
                ekle: () => this.aracGunEkle(),
                liste: gunler.slice(0, 12).map(g => ({
                  id: g.id,
                  tarih: (g.tarih || '').split('-').reverse().join('.'),
                  tur: GUN_TUR_ARAC[g.tur] || g.tur,
                  ek: [g.saat ? g.saat + ' sa' : '', g.not || ''].filter(Boolean).join(' · '),
                  sil: () => this.aracGunSil(g.id)
                })),
                bos: gunler.length === 0
              };
            })(),
            konumVar: !!af && !!af.id,
            konum: (!af || !af.id) ? null : (() => {
              const taslak = s.aracKonumTaslak || { lat: '', lon: '', not: '' };
              const sk = af.sonKonum || null;
              return {
                varMi: !!sk,
                ozet: sk ? sk.lat.toFixed(5) + ', ' + sk.lon.toFixed(5) + ' · ' + sk.zaman
                  + (sk.kaynak === 'elle' ? ' · elle girildi' : ' · ' + sk.kaynak) : '',
                not: sk ? sk.not : '',
                goster: sk ? () => this.flyTo(sk.lat, sk.lon, 16) : null,
                lat: taslak.lat, onLat: e => this.setState({ aracKonumTaslak: { ...this.state.aracKonumTaslak, lat: e.target.value } }),
                lon: taslak.lon, onLon: e => this.setState({ aracKonumTaslak: { ...this.state.aracKonumTaslak, lon: e.target.value } }),
                girNot: taslak.not, onGirNot: e => this.setState({ aracKonumTaslak: { ...this.state.aracKonumTaslak, not: e.target.value } }),
                kaydet: () => this.aracKonumKaydet(this.state.aracKonumTaslak)
              };
            })(),
            kaydet: () => this.aracKaydet(this.state.aracForm),
            kapat: () => this.setState({ aracForm: null })
          },
          gorev: {
            on: !!ag,
            baslik: !ag ? '' : (ag.mod === 'ver' ? 'Görev ver' : (ag.mod === 'al' ? 'Teslim al' : 'Durum değiştir')),
            arac: secArac ? secArac.ad + (secArac.plaka ? ' · ' + secArac.plaka : '') : '',
            sayacVar: !!ag && ag.mod !== 'durum',
            sayacLabel: secTur ? 'Sayaç okuması (' + secTur.birim + ')' : 'Sayaç',
            sayacNot: secArac && secTur ? 'Kayıtlı değer ' + (parseFloat(secArac.sayac) || 0).toLocaleString('tr-TR') + ' ' + secTur.birim + '.' : '',
            sayac: ag ? ag.sayac : '',
            onSayac: e => this.setState({ aracGorev: { ...this.state.aracGorev, sayac: e.target.value } }),
            ekipVar: !!ag && ag.mod === 'ver',
            ekip: ag ? ag.ekip : '', ekipler: SAHA_EKIP,
            onEkip: e => this.setState({ aracGorev: { ...this.state.aracGorev, ekip: e.target.value } }),
            surucu: ag ? ag.surucu : '',
            onSurucu: e => this.setState({ aracGorev: { ...this.state.aracGorev, surucu: e.target.value } }),
            isVar: !!ag && ag.mod === 'ver',
            is: ag ? ag.is : '',
            isler: acikIsler.slice(0, 40).map(f => f.no + ' · ' + f.type),
            onIs: e => this.setState({ aracGorev: { ...this.state.aracGorev, is: e.target.value } }),
            durumVar: !!ag && ag.mod === 'durum',
            durumSec: Object.entries(ARAC_DURUM).filter(([k]) => k !== 'gorevde').map(([k, ad]) => ({
              label: ad, ...seg(!!ag && ag.durum === k, () => this.setState({ aracGorev: { ...this.state.aracGorev, durum: k } }))
            })),
            not: ag ? ag.not : '',
            onNot: e => this.setState({ aracGorev: { ...this.state.aracGorev, not: e.target.value } }),
            kaydet: () => this.aracGorevIsle(this.state.aracGorev),
            kapat: () => this.setState({ aracGorev: null })
          },
          hareketler: (A.hareket || []).slice(0, 40).map(x => ({
            ne: x.ne, neFg: x.ne === 'Görev verildi' ? ui.acc : ui.mut,
            arac: x.arac + (x.plaka ? ' · ' + x.plaka : ''),
            detay: x.detay, damga: x.damga, kim: x.kim || '—'
          })),
          hareketYok: !(A.hareket || []).length,
          hareketBos: 'Henüz görev kaydı yok. “Görev ver” ile bir aracı ekibe çıkarın; dönüşte “Teslim al” deyince kat edilen km ya da çalışma saati burada birikir.'
        };
      })(),