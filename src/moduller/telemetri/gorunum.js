      telemetri: (() => {
        const T = s.telemetri || {};
        const BOS = {
          pad: '16px 22px 22px', ozet: [], sekmeler: [], kartlar: [], kanallar: [], saatler: [], alarmlar: [], kurallar: [],
          detay: { ad: '', baglanti: () => {}, duzenle: () => {}, sil: () => {} },
          grafik: { var: false, yok: false, yokMetin: '', alan: '', cizgi: '', mn: '', mx: '', ort: '', birim: '' },
          form: { baslik: '', ad: '', kod: '', tesis: '', tur: 'kuyu', protokol: 'http', dk: '15' },
          kuralForm: { cihaz: '', kanal: '', op: '<', esik: '', onem: 'uyari' },
          baglanti: { baslik: '', metin: '', yeniAnahtar: false }, cihazSecenek: [], kanalOneri: [], tesisOneri: [],
          hata: '', hataVar: false, yazar: false
        };
        if (tabId !== 'telemetri') return BOS;
        const simdi = Date.now();
        const yazar = !!(me && ['yonetici', 'mudur', 'muhendis'].includes(me.role)) && !s.offline;
        const sayi = v => Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
        const once = ms => {
          const dk = Math.round((simdi - ms) / 60000);
          return dk < 1 ? 'şimdi' : dk < 60 ? dk + ' dk önce' : dk < 1440 ? Math.round(dk / 60) + ' sa önce' : Math.round(dk / 1440) + ' gün önce';
        };
        const durum = c => {
          if (!c.aktif) return { ad: 'Kapalı', renk: ui.mut };
          if (!c.sonMs) return { ad: 'Veri gelmedi', renk: '#d97706' };
          return (simdi - c.sonMs) / 60000 <= c.beklenenDk * 2 + 1 ? { ad: 'Veri geliyor', renk: '#1b9a4a' } : { ad: 'Sessiz', renk: '#d92d20' };
        };
        const upd = (y, cb) => this.telemetriGuncelle(y, cb);
        const cihazlar = T.cihazlar || [];
        const acikA = (T.alarmlar || []).filter(a => !a.kapandi);
        const geliyor = cihazlar.filter(c => durum(c).ad === 'Veri geliyor').length;
        const sessiz = cihazlar.filter(c => durum(c).ad === 'Sessiz').length;
        const chip = (acik) => ({ kenar: acik ? 'var(--color-accent)' : ui.rule, bg: acik ? 'var(--color-accent)' : 'transparent', fg: acik ? '#fff' : ui.fg });
        const sec = cihazlar.find(c => c.id === T.sec) || null;
        const kanalAd = sec ? (T.kanal || (sec.degerler[0] && sec.degerler[0].kanal) || '') : '';
        const seri = T.seri || [];
        const grafik = { ...BOS.grafik };
        if (sec && seri.length > 1) {
          const W = 600, H = 150, P = 6;
          const t0 = seri[0].t, t1 = Math.max(seri[seri.length - 1].t, t0 + 1);
          const vs = seri.map(x => x.v);
          let lo = Math.min(...vs), hi = Math.max(...vs);
          const mn = lo, mx = hi;
          if (hi === lo) { hi += 1; lo -= 1; }
          const pts = seri.map(x => (P + (x.t - t0) / (t1 - t0) * (W - 2 * P)).toFixed(1) + ',' + (H - P - (x.v - lo) / (hi - lo) * (H - 2 * P)).toFixed(1));
          grafik.var = true; grafik.cizgi = pts.join(' ');
          grafik.alan = grafik.cizgi + ' ' + (W - P) + ',' + (H - P) + ' ' + P + ',' + (H - P);
          grafik.mn = sayi(mn); grafik.mx = sayi(mx); grafik.ort = sayi(vs.reduce((a, b) => a + b, 0) / vs.length);
          const dg = sec.degerler.find(x => x.kanal === kanalAd);
          grafik.birim = dg && dg.birim ? 'Birim: ' + dg.birim : '';
        } else if (sec) {
          grafik.yok = true;
          grafik.yokMetin = kanalAd ? 'Seçilen sürede bu ölçüm için yeterli veri yok.' : 'Bu cihaz henüz ölçüm göndermedi.';
        }
        const baglanti = T.anahtar
          ? { baslik: T.anahtar.kod + ' — bağlantı bilgisi', metin: this.telemetriBaglantiMetni(T.anahtar.kod, T.anahtar.anahtar), yeniAnahtar: true }
          : { baslik: (sec ? sec.ad : 'Cihaz') + ' — bağlantı bilgisi', metin: sec ? this.telemetriBaglantiMetni(sec.kod, '') : '', yeniAnahtar: false };
        const f = T.form, kf = T.kuralForm;
        return {
          ...BOS, yazar, hata: T.hata || '', hataVar: !!T.hata,
          pad: s.device === 'phone' ? '12px 12px 18px' : '16px 22px 22px',
          ozet: [
            { sayi: cihazlar.length, ad: 'Cihaz', renk: ui.fg },
            { sayi: geliyor, ad: 'Veri geliyor', renk: '#1b9a4a' },
            { sayi: sessiz, ad: 'Sessiz', renk: sessiz ? '#d92d20' : ui.fg },
            { sayi: acikA.length, ad: 'Açık alarm', renk: acikA.length ? '#d92d20' : ui.fg }
          ],
          cihazEkle: () => this.telemetriFormAc(null),
          sekmeler: [['cihaz', 'Cihazlar'], ['alarm', 'Alarmlar' + (acikA.length ? ' · ' + acikA.length : '')], ['kural', 'Kurallar']].map(([id, ad]) => {
            const c = chip(T.sek === id);
            return { ad, kenar: c.kenar, bg: c.bg, fg: c.fg, sec: () => upd({ sek: id }) };
          }),
          sekCihaz: T.sek === 'cihaz', sekAlarm: T.sek === 'alarm', sekKural: T.sek === 'kural',
          cihazYok: !cihazlar.length && !T.hata && T.yuk,
          kartlar: cihazlar.map(c => {
            const d = durum(c);
            return {
              id: c.id, ad: c.ad, yer: [c.tesisKod, c.koy].filter(Boolean).join(' · ') || 'Tesise bağlı değil',
              durum: d.ad, renk: d.renk, son: c.sonMs ? once(c.sonMs) : '—',
              degerler: c.degerler.slice(0, 6).map(x => ({ kanal: x.kanal, v: sayi(x.deger) + (x.birim ? ' ' + x.birim : '') })),
              alarm: c.acikAlarm, alarmVar: c.acikAlarm > 0,
              kenar: T.sec === c.id ? 'var(--color-accent)' : ui.rule, sec: () => this.telemetriSec(c.id)
            };
          }),
          detayVar: !!sec && T.sek === 'cihaz',
          detay: sec ? {
            ad: sec.ad + ' · ' + sec.kod,
            baglanti: () => upd({ bilgi: !T.bilgi, anahtar: null }),
            duzenle: () => this.telemetriFormAc(sec), sil: () => this.telemetriCihazSil(sec)
          } : BOS.detay,
          kanallar: sec ? sec.degerler.map(x => {
            const c = chip(x.kanal === kanalAd);
            return { ad: x.kanal, kenar: c.kenar, bg: c.bg, fg: c.fg, sec: () => upd({ kanal: x.kanal }, () => this.telemetriSeriYukle()) };
          }) : [],
          saatler: sec ? [[6, '6 sa'], [24, '24 sa'], [168, '7 gün'], [720, '30 gün']].map(([h, ad]) => {
            const c = chip(T.saat === h);
            return { ad, kenar: c.kenar, bg: c.bg, fg: c.fg, sec: () => this.telemetriGuncelle({ saat: h }, () => this.telemetriSeriYukle()) };
          }) : [],
          grafik,
          alarmYok: !(T.alarmlar || []).length,
          alarmlar: (T.alarmlar || []).map(a => ({
            mesaj: a.mesaj || (a.cihazAd + ' · ' + a.kanal),
            tesis: a.tesisKod ? a.tesisKod + ' · ' : '', acildi: this.damgaCevir(a.acildi),
            durum: a.kapandi ? 'Kapandı ' + this.damgaCevir(a.kapandi) : (a.onayAd ? 'Görüldü · ' + a.onayAd : 'Açık'),
            renk: a.kapandi ? ui.mut : (a.onem === 'kritik' ? '#d92d20' : '#d97706'),
            onayBekler: !a.kapandi && !a.onayAd && !s.offline,
            arizaDugme: !a.kapandi && !a.arizaId && canCreateFault, arizaVar: !!a.arizaId,
            onayla: () => this.telemetriAlarmOnayla(a), ariza: () => this.telemetriAlarmAriza(a)
          })),
          kuralYok: !(T.kurallar || []).length,
          kurallar: (T.kurallar || []).map(r => ({
            cihaz: r.cihazAd, kosul: r.kanal + ' ' + r.op + ' ' + sayi(r.esik), onem: r.onem === 'kritik' ? 'Kritik' : 'Uyarı',
            renk: r.onem === 'kritik' ? '#d92d20' : '#d97706', sil: () => this.telemetriKuralSil(r.id)
          })),
          kuralEkle: () => this.telemetriKuralFormAc(),
          kuralFormAcik: !!kf,
          kuralForm: kf ? {
            ...kf, onCihaz: e => this.telemetriKuralAlan('cihaz', e.target.value), onKanal: e => this.telemetriKuralAlan('kanal', e.target.value),
            onOp: e => this.telemetriKuralAlan('op', e.target.value), onEsik: e => this.telemetriKuralAlan('esik', e.target.value),
            onOnem: e => this.telemetriKuralAlan('onem', e.target.value),
            kaydet: () => this.telemetriKuralKaydet(), vazgec: () => upd({ kuralForm: null })
          } : BOS.kuralForm,
          cihazSecenek: cihazlar.map(c => ({ v: String(c.id), n: c.ad })),
          kanalOneri: (() => {
            const c = kf && cihazlar.find(x => String(x.id) === kf.cihaz);
            return c ? c.degerler.map(x => ({ v: x.kanal })) : [];
          })(),
          tesisOneri: (s.assets || []).filter(a => a.dbId != null).slice(0, 400).map(a => ({ v: a.code, n: [a.village, a.district].filter(Boolean).join(' · ') })),
          formAcik: !!f,
          form: f ? {
            ...f, baslik: f.id ? 'Cihazı düzenle' : 'Yeni cihaz',
            onAd: e => this.telemetriForm('ad', e.target.value), onKod: e => this.telemetriForm('kod', e.target.value),
            onTesis: e => this.telemetriForm('tesis', e.target.value), onTur: e => this.telemetriForm('tur', e.target.value),
            onProtokol: e => this.telemetriForm('protokol', e.target.value), onDk: e => this.telemetriForm('dk', e.target.value),
            kaydet: () => this.telemetriFormKaydet(), vazgec: () => upd({ form: null })
          } : BOS.form,
          baglantiAcik: !!(T.anahtar || (T.bilgi && sec)),
          baglanti: {
            ...baglanti,
            kopyala: () => { try { navigator.clipboard.writeText(baglanti.metin); this.duyur('Kopyalandı.', 2500, 'iyi'); } catch (e) { this.duyur('Kopyalanamadı — metni elle seçin.', 4000, 'kotu'); } },
            yenile: () => this.telemetriAnahtarYenile(sec || cihazlar.find(c => T.anahtar && c.kod === T.anahtar.kod)),
            kapat: () => upd({ anahtar: null, bilgi: false })
          }
        };
      })(),