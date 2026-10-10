      ozet: (() => {
        const sekmeler = [['envanter', 'Envanter'], ...(arizaOn ? [['ekip', 'Ekip ve arıza']] : []), ...(arizaOn || ambarOn ? [['rapor', 'Rapor']] : [])];
        const sekAktif = sekmeler.some(x => x[0] === s.ozetSekme) ? s.ozetSekme : 'envanter';
        const byD = {};
        for (const a of s.assets) byD[a.district] = true;
        const openF = s.faults.filter(f => !KAPALI_DURUM.includes(f.status));
        // Tekrarlayan arıza: aynı tesiste birden çok kayıt — kalıcı çözüm işareti
        const tekrarList = (() => {
          const g = {};
          for (const f of s.faults) {
            const o = (g[f.assetId] = g[f.assetId] || { n: 0, turler: {}, son: '', acik: 0 });
            o.n++;
            o.turler[f.type] = (o.turler[f.type] || 0) + 1;
            if (!KAPALI_DURUM.includes(f.status)) o.acik++;
            if (!o.son) o.son = f.opened;
          }
          return Object.entries(g).filter(([, o]) => o.n > 1).sort((x, y) => y[1].n - x[1].n).slice(0, 12)
            .map(([id, o]) => {
              const a = s.assets.find(x => x.id === id);
              const enSik = Object.entries(o.turler).sort((x, y) => y[1] - x[1])[0];
              return {
                code: a ? a.code : '—', place: a ? this.yer(a) : 'kayıt bulunamadı',
                n: o.n + ' arıza', tur: enSik ? enSik[0] + ' × ' + enSik[1] : '—',
                son: o.son || '—', acik: o.acik ? o.acik + ' açık' : 'kapalı',
                acikFg: o.acik ? ui.acc : ui.mut,
                open: () => {
                  if (!a) return;
                  this.flyTo(a.lat, a.lon, 16);
                  this.setState({ selected: a.id, panel: 'detay', detailTab: 'ariza' });
                }
              };
            });
        })();
        // Ekip performansı: çözülen iş, ortalama süre, tekrar oranı
        const ekipPerf = (s.ekipler || []).map(e => {
          const isler = s.faults.filter(f => f.crew === e.ad);
          const cozulen = isler.filter(f => f.status === 'cozuldu');
          const acik = isler.filter(f => !KAPALI_DURUM.includes(f.status));
          const saatler = cozulen.map(f => parseFloat(String(f.hours || '').replace(',', '.')))
            .filter(x => isFinite(x) && x > 0);
          const ortSaat = saatler.length
            ? Math.round(saatler.reduce((a, b) => a + b, 0) / saatler.length * 10) / 10 : null;
          const tekrarli = cozulen.filter(f => (f.tekrar || 0) > 0).length;
          const gecikmis = sureOn ? acik.filter(f => { const dd = this.sureDurum(f); return dd && dd.gecikti; }).length : 0;
          const turSay = {};
          for (const f of isler) turSay[f.type] = (turSay[f.type] || 0) + 1;
          const enSik = Object.entries(turSay).sort((a, b) => b[1] - a[1])[0];
          return {
            ad: e.ad, toplam: isler.length,
            satir1: cozulen.length + ' çözüldü · ' + acik.length + ' açık'
              + (gecikmis ? ' · ' + gecikmis + ' gecikmiş' : ''),
            satir1Fg: gecikmis ? ui.acc : ui.fg,
            satir2: [
              ortSaat != null ? 'ortalama ' + ortSaat + ' saat' : 'süre girilmemiş',
              tekrarli ? tekrarli + ' iş tekrar açıldı' : 'tekrar açılan iş yok',
              enSik ? 'en sık: ' + enSik[0] : ''
            ].filter(Boolean).join(' · '),
            barW: Math.round(Math.min(1, isler.length / Math.max(1, ...(s.ekipler || []).map(x =>
              s.faults.filter(f => f.crew === x.ad).length))) * 100) + '%'
          };
        }).filter(x => x.toplam > 0).sort((a, b) => b.toplam - a.toplam);
        // Esnek raporlama — gün/hafta/ay/yıl/özel aralık + il/ilçe süzgeci
        // (madde 37). Daha önce "Bu hafta yapılanlar" oturum içindeki
        // kayıtları sayıyordu; artık gerçek tarih damgasından hesaplanıyor.
        const assetOf = id => s.assets.find(x => x.id === id);
        const aralik = this.zamanAraligi(s.ozetZaman || 'hafta', s.ozetBas, s.ozetBit);
        const ilceF = s.ozetIlce || '';
        const ilceUyar = a => !ilceF || (a && a.district === ilceF);
        const faultsF = s.faults.filter(f => {
          const d = this.tarihParse(f.opened);
          return d && d >= aralik.bas && d < aralik.bit && ilceUyar(assetOf(f.assetId));
        });
        const cozulenF = faultsF.filter(f => f.status === 'cozuldu');
        let testSay = 0;
        for (const [aid, list] of Object.entries(s.tests || {})) {
          if (!ilceUyar(assetOf(aid))) continue;
          for (const t of list) {
            const d = this.tarihParse(t.date);
            if (d && d >= aralik.bas && d < aralik.bit) testSay++;
          }
        }
        const hareketF = ((s.ambar && s.ambar.hareket) || []).filter(h => {
          const d = this.tarihParse(h.damga);
          if (!d || d < aralik.bas || d >= aralik.bit) return false;
          if (!ilceF) return true;
          const a = h.assetId ? assetOf(h.assetId) : null;
          return !!a && a.district === ilceF;
        });
        const sarfF = hareketF.filter(h => h.tur === 'sarf' || h.tur === 'hurda');
        // Pasife alınmış kalemin eski sarfı da fiyatıyla sayılır
        const tutarOf = h => { const kalem = this.katalogBul(h.malzeme); return kalem ? (Number(kalem.fiyat) || 0) * (Number(h.adet) || 0) : 0; };
        const malzemeMaliyet = sarfF.reduce((t, h) => t + tutarOf(h), 0);
        const kritikStokSayi = STOK_KALEM.filter(m => this.ambarDurum(m[0]).kritik).length;
        const koyG = {};
        for (const h of sarfF) {
          const a = h.assetId ? assetOf(h.assetId) : null;
          // Köy adı girilmemiş tesiste en yakın köy (≈)
          const key = a ? this.yerGoster(a) : 'Tesis belirtilmemiş';
          const o = (koyG[key] = koyG[key] || { tutar: 0, kalemler: {} });
          o.tutar += tutarOf(h);
          o.kalemler[h.malzeme] = (o.kalemler[h.malzeme] || 0) + (Number(h.adet) || 0);
        }
        // Köy bazlı arızalar: arızanın köyü = girilen köy > tesisin köyü >
        // arıza noktasına en yakın köy > tesise en yakın köy (arizaKoy)
        const arizaKoyG = {};
        for (const f of s.faults) {
          const d = this.tarihParse(f.opened);
          if (!d || d < aralik.bas || d >= aralik.bit) continue;
          const a = f.assetId ? assetOf(f.assetId) : null;
          const ky = this.arizaKoy(f, a);
          if (ilceF && ky.ilce !== ilceF) continue;
          const key = (ky.ad || 'Köy belirlenemedi') + ' · ' + (ky.ilce || '—');
          const o = (arizaKoyG[key] = arizaKoyG[key] || { n: 0, acik: 0, nokta: 0, sebeke: 0, turler: {}, gruplar: {}, yaklasik: 0 });
          o.n++;
          if (!KAPALI_DURUM.includes(f.status)) o.acik++;
          if (f.nokta) o.nokta++;
          if (!f.assetId) o.sebeke++;
          if (ky.kaynak === 'nokta' || ky.kaynak === 'tesis-yakın') o.yaklasik++;
          o.turler[f.type] = (o.turler[f.type] || 0) + 1;
          const g = arizaGrubu(f, a); o.gruplar[g] = (o.gruplar[g] || 0) + 1;
        }
        const arizaKoy = Object.entries(arizaKoyG).sort((x, y) => y[1].n - x[1].n || y[1].acik - x[1].acik).slice(0, 30)
          .map(([name, o]) => {
            const enSik = Object.entries(o.turler).sort((x, y) => y[1] - x[1])[0];
            return {
              name: name + (o.yaklasik === o.n ? ' ≈' : ''),
              ozet: [o.acik ? o.acik + ' açık' : 'hepsi kapandı',
                Object.entries(o.gruplar).map(([g, n]) => ARIZA_GRUP[g].ad + ' ' + n).join(', '),
                enSik ? 'en sık: ' + enSik[0] + (enSik[1] > 1 ? ' (' + enSik[1] + ')' : '') : '',
                o.sebeke ? o.sebeke + ' şebeke arızası' : '',
                o.nokta ? o.nokta + '/' + o.n + ' arıza noktası kayıtlı' : 'arıza noktası yok'].filter(Boolean).join(' · '),
              n: String(o.n)
            };
          });
        const malzemeKoy = Object.entries(koyG).sort((x, y) => y[1].tutar - x[1].tutar).slice(0, 20)
          .map(([name, o]) => ({
            name, ozet: Object.entries(o.kalemler).map(([k, n]) => k + ' × ' + n).join(' · '),
            tutar: this.tl(o.tutar)
          }));
        return {
          ekipPerf,
          ekipPerfYok: ekipPerf.length === 0,
          ekipPerfNot: 'Ekip başına iş yükü, ortalama çözüm süresi ve tekrar açılan iş sayısı. Süre, arıza kaydına girilen çalışma saatinden gelir.',
          ekipPerfBos: 'Ekiplere atanmış çözülmüş iş yok. Arıza kayıtlarında ekip atanıp çalışma saati girildikçe bu tablo dolar.',
          tekrar: tekrarList,
          tekrarYok: tekrarList.length === 0,
          tekrarNot: 'Aynı tesiste birden çok arıza kaydı olanlar — en çok kayıtlıdan başlar.',
          tekrarBos: 'Aynı tesiste ikinci arıza kaydı yok. Bir tesis burada görünmeye başladıysa aynı parça tekrar arızalanıyor demektir; kalıcı çözüm gerekir.',
          // 2026.10.07 sadeleştirme: sekiz kutu dörde indi — Kuyu/Depo/Pasif aşağıdaki tür tablosunda,
          // eşitleme bekleyen kayıt üst çubuktaki göstergede zaten var
          stats: [
            { n: String(s.assets.length), label: 'Kayıt' },
            { n: String(s.assets.filter(a => aktifMi(a)).length), label: 'Aktif' },
            ...(arizaOn ? [{ n: String(openF.length), label: 'Açık arıza' }] : [])
          ],
          zamanSec: [['bugun', 'Bugün'], ['hafta', 'Hafta'], ['ay', 'Ay'], ['yil', 'Yıl'], ['tum', 'Tümü'], ['ozel', 'Özel']]
            .map(([k, ad]) => ({
              label: ad, ...seg((s.ozetZaman || 'hafta') === k, () => this.setState({ ozetZaman: k }))
            })),
          ozelVar: s.ozetZaman === 'ozel',
          ozelBas: s.ozetBas, onOzelBas: e => this.setState({ ozetBas: e.target.value }),
          ozelBit: s.ozetBit, onOzelBit: e => this.setState({ ozetBit: e.target.value }),
          ilceler: [{ ad: 'Tüm ilçeler', deger: '' }, ...Object.keys(byD).sort().map(d => ({ ad: d, deger: d }))],
          ilce: s.ozetIlce || '', onIlce: e => this.setState({ ozetIlce: e.target.value }),
          // her gösterge kendi modülüne bağlı: Arıza kapalıyken arıza, Ambar kapalıyken stok göstergeleri çıkmaz
          week: [
            ...(arizaOn ? [{ n: String(faultsF.length), label: 'Açılan arıza', fg: ui.fg }, { n: String(cozulenF.length), label: 'Çözülen arıza', fg: ui.fg }] : []),
            { n: String(testSay), label: 'Girilen deneme', fg: ui.fg },
            ...(ambarOn ? [{ n: String(sarfF.length), label: 'Malzeme hareketi', fg: ui.fg }] : []),
            ...(arizaOn || ambarOn ? [{ n: this.tl(malzemeMaliyet), label: 'Malzeme maliyeti', fg: ui.fg }] : []),
            ...(ambarOn ? [{ n: String(kritikStokSayi), label: 'Kritik stok', fg: kritikStokSayi ? 'var(--color-uyari)' : ui.fg }] : [])
          ],
          weekBaslik: aralik.ad + (ilceF ? ' · ' + ilceF : '') + ' yapılanlar',
          weekNote: 'Gün/hafta/ay/yıl ya da özel bir aralık ve isterseniz tek bir ilçe seçin — arıza, deneme ve ambar hareketi kayıtlarının gerçek tarih damgasına göre süzülür.',
          malzemeKoy,
          malzemeKoyVar: malzemeKoy.length > 0,
          arizaKoy, arizaKoyVar: arizaKoy.length > 0,
          arizaKoyNot: 'Seçili aralıkta açılan arızaların köy · ilçe kırılımı. Köy şu sırayla belirlenir: kayıtta girilen köy, tesisin köyü, ekibin kaydettiği arıza noktasına en yakın köy, tesise en yakın köy. “≈” yalnız koordinattan bulunmuş köyü gösterir.',
          malzemeKoyNot: 'Seçili aralıkta arıza kapanışında ekip zimmetinden düşülen (sarf/hurda) malzemenin köy · ilçe kırılımı ve tutarı. Ambar ekranından elle girilen sarf işlemleri bir tesise bağlı olmadığı için "Tesis belirtilmemiş" altında toplanır.',
          // Özet tek ekranda 9 ayrı tablo/liste üst üste duruyordu (kullanıcı
          // geri bildirimi — "çok karmaşık"), üçe bölündü: Envanter (dağılım/
          // eksik bilgi/yakın tesisler), Ekip ve arıza (performans/tekrar),
          // Rapor (tarih aralıklı arıza+stok özeti + köy bazlı malzeme
          // maliyeti — ikisi de aynı zaman/ilçe süzgecini paylaşıyor).
          // Yalnız envanter açıkken (diğer modüller kapalı) sekme çubuğu hiç çıkmaz
          // Envanter sekmesinde, arıza kapalıyken üstteki sayı kutuları gösterge panelinin kendisidir (tekrar etmesin)
          statsVar: sekAktif !== 'envanter' || arizaOn,
          sekmeVar: sekmeler.length > 1,
          sekmeSec: sekmeler.map(([k, ad]) => ({ ad, ...seg(sekAktif === k, () => this.setState({ ozetSekme: k })) })),
          sekmeSecTel: sekmeler.map(([k, ad]) => ({ ad, ...seg(sekAktif === k, () => this.setState({ ozetSekme: k })) })),
          envanterSekmesi: sekAktif === 'envanter',
          ekipSekmesi: sekAktif === 'ekip',
          raporSekmesi: sekAktif === 'rapor'
        };
      })(),