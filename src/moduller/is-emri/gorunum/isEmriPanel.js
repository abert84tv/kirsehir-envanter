      isEmriPanel: (() => {
        const ip = s.isEmriPanel;
        if (!ip) return { on: false };
        const liste = s.isEmirleri || [];
        const durumF = ip.durumF || '';
        const zamanF = ip.zamanF || 'tum';
        const ilceF2 = ip.ilceF || '';
        const araligi = this.zamanAraligi(zamanF, ip.ozelBas, ip.ozelBit);
        const gorunen = liste.filter(x => {
          if (durumF && x.status !== durumF) return false;
          if (ilceF2 && x.district !== ilceF2) return false;
          const d = x.acildi ? new Date(x.acildi) : null;
          return !!d && !isNaN(d) && d >= araligi.bas && d < araligi.bit;
        });
        const secili = ip.id ? liste.find(x => x.dbId === ip.id) : null;
        const ekipForm = ip.ekipForm || {};
        const araclarSecili = ekipForm.araclar || (secili ? (secili.araclar || []).map(x => x.id) : []);
        const aracHavuz = (s.arac && s.arac.list) || [];
        return {
          on: true,
          detay: !!secili,
          baslik: secili ? secili.no : 'İş Emirleri',
          kapat: () => this.setState({ isEmriPanel: null }),
          geri: () => this.setState({ isEmriPanel: { durumF, zamanF, ilceF: ilceF2, ozelBas: ip.ozelBas, ozelBit: ip.ozelBit } }),
          filtreler: [['', 'Tümü'], ['acik', 'Açık'], ['atandi', 'Atandı'], ['sahada', 'Sahada'],
            ['tamamlandi', 'Tamamlandı'], ['kapatildi', 'Kapatıldı']].map(([k, ad]) => {
            const on = durumF === k;
            return {
              ad, bg: on ? (dark ? 'rgba(10,132,255,.20)' : 'var(--color-accent-100)') : 'transparent',
              fg: on ? ui.acc : ui.mut,
              sec: () => this.setState({ isEmriPanel: { ...ip, durumF: k } })
            };
          }),
          zamanSec: [['bugun', 'Bugün'], ['hafta', 'Hafta'], ['ay', 'Ay'], ['yil', 'Yıl'], ['tum', 'Tümü'], ['ozel', 'Özel']]
            .map(([k, ad]) => ({
              label: ad, ...seg(zamanF === k, () => this.setState({ isEmriPanel: { ...ip, zamanF: k } }))
            })),
          ozelVar: zamanF === 'ozel',
          ozelBas: ip.ozelBas || '', onOzelBas: e => this.setState({ isEmriPanel: { ...ip, ozelBas: e.target.value } }),
          ozelBit: ip.ozelBit || '', onOzelBit: e => this.setState({ isEmriPanel: { ...ip, ozelBit: e.target.value } }),
          ilceler: [{ ad: 'Tüm ilçeler', deger: '' },
            ...[...new Set(liste.map(x => x.district).filter(Boolean))].sort().map(d => ({ ad: d, deger: d }))],
          ilce: ilceF2, onIlce: e => this.setState({ isEmriPanel: { ...ip, ilceF: e.target.value } }),
          liste: gorunen.map(x => ({
            no: x.no, tesis: x.tesisKod || (x.koy ? x.koy + ' (şebeke)' : '—'), tur: x.type,
            oncelik: x.priority, durum: IS_EMRI_DURUM[x.status] || x.status,
            ekip: x.crew || 'ekip atanmadı', tarih: (x.acildi || '').slice(0, 10),
            ac: () => this.setState({ isEmriPanel: { ...ip, id: x.dbId } })
          })),
          listeBos: !gorunen.length,
          secili: !secili ? null : {
            no: secili.no, tesis: secili.tesisKod || (secili.koy ? secili.koy + ' (şebeke)' : '—'), tur: secili.type,
            altSistem: secili.altSistem || '—', oncelik: secili.priority,
            aciklama: secili.desc || '—', durum: IS_EMRI_DURUM[secili.status] || secili.status,
            ekip: secili.crew || 'Atanmadı',
            araclarOzet: (secili.araclar || []).map(a => a.plaka || a.ad).join(', ') || 'yok',
            ek: (() => {
              const E0 = (s.isEmriEk || {})[secili.dbId] || { ekipler: [], altIsler: [] };
              const yaz = y => this.isEmriEkYaz(secili.dbId, { ...E0, ...y });
              const ana = secili.crew || '';
              const yazar = !s.offline && (me || {}).role !== 'izleyici' && secili.status !== 'kapatildi';
              let onceki = true;
              return {
                yazar,
                ekipYok: !(E0.ekipler || []).length,
                ekipler: (E0.ekipler || []).map(ad => ({ ad, sil: () => yaz({ ekipler: E0.ekipler.filter(x => x !== ad) }) })),
                ekipDeger: '', ekipSecenek: CREWS.filter(c => c !== ana && !(E0.ekipler || []).includes(c)),
                onEkip: e => { if (e.target.value) yaz({ ekipler: [...(E0.ekipler || []), e.target.value] }); },
                altIsler: (E0.altIsler || []).map((a, i) => {
                  const aktif = !a.bitti && onceki;
                  if (!a.bitti) onceki = false;
                  return {
                    sira: i + 1, ekip: a.ekip || '—', aciklama: a.aciklama || '—',
                    durum: a.bitti ? 'Tamamlandı' : (aktif ? 'Sırada — şimdi yapılacak' : 'Önceki iş bekleniyor'),
                    renk: a.bitti ? '#1b9a4a' : (aktif ? '#d97706' : ui.mut), opak: a.bitti ? '.6' : '1',
                    bitirVar: !a.bitti && !s.offline,
                    bitir: () => yaz({ altIsler: E0.altIsler.map((x, j) => j === i ? { ...x, bitti: true, bitis: new Date().toISOString() } : x) }),
                    sil: () => yaz({ altIsler: E0.altIsler.filter((x, j) => j !== i) })
                  };
                }),
                altEkip: (ip.altForm || {}).ekip || '', altNot: (ip.altForm || {}).aciklama || '',
                altEkipSecenek: CREWS,
                onAltEkip: e => { const v = e.target.value; this.setState(st => ({ isEmriPanel: { ...st.isEmriPanel, altForm: { ...((st.isEmriPanel || {}).altForm || {}), ekip: v } } })); },
                onAltNot: e => { const v = e.target.value; this.setState(st => ({ isEmriPanel: { ...st.isEmriPanel, altForm: { ...((st.isEmriPanel || {}).altForm || {}), aciklama: v } } })); },
                altEkle: () => {
                  const f = ip.altForm || {};
                  if (!f.ekip || !(f.aciklama || '').trim()) return this.duyur('Ekip seçin ve yapılacak işi yazın.', 4000, 'kotu');
                  yaz({ altIsler: [...(E0.altIsler || []), { id: 'a' + Date.now().toString(36), ekip: f.ekip, aciklama: f.aciklama.trim(), bitti: false }] });
                  this.setState({ isEmriPanel: { ...ip, altForm: {} } });
                }
              };
            })(),
            acan: secili.acan || '—', acildi: (secili.acildi || '').slice(0, 16).replace('T', ' '),
            kapatildi: secili.status === 'kapatildi',
            kapatan: secili.kapatan || '—', kapandi: (secili.kapandi || '').slice(0, 16).replace('T', ' '),
            kullanilanMalzeme: (secili.kullanilanMalzeme || []).map(m => m.malzeme + ' × ' + m.adet).join(', ') || '—',
            toplamSaat: secili.toplamSaat != null ? secili.toplamSaat + ' saat' : '—',
            kapatVar: this.yetkiVar(s.session, 'close') && secili.status !== 'kapatildi' && !s.offline,
            kapatGo: () => this.isEmriElleKapat(secili),
            ataFormVar: this.yetkiVar(s.session, 'assign') && secili.status !== 'kapatildi',
            ataForm: {
              ekip: ekipForm.ekip ?? secili.crew ?? '', ekipler: CREWS,
              onEkip: e => this.setState({ isEmriPanel: { ...ip, ekipForm: { ...ekipForm, ekip: e.target.value } } }),
              araclar: aracHavuz.slice().sort((a, b) => (a.durum === 'musait' ? 0 : 1) - (b.durum === 'musait' ? 0 : 1)).map(a => {
                const sec = araclarSecili.includes(a.id);
                return {
                  id: a.id, label: (a.plaka || a.ad) + (a.durum !== 'musait' ? ' · ' + (ARAC_DURUM[a.durum] || a.durum) : ''),
                  opacity: a.durum !== 'musait' ? '.55' : '1',
                  bg: sec ? ui.acc : 'transparent', fg: sec ? '#fff' : ui.fg,
                  kenar: sec ? ui.acc : ui.rule,
                  toggle: () => {
                    const yeni = sec
                      ? araclarSecili.filter(id => id !== a.id) : [...araclarSecili, a.id];
                    this.setState({ isEmriPanel: { ...ip, ekipForm: { ...ekipForm, araclar: yeni } } });
                  }
                };
              }),
              kaydet: () => this.isEmriAtaKaydet(secili, { ekip: ekipForm.ekip ?? secili.crew ?? '', araclar: araclarSecili })
            }
          }
        };
      })(),