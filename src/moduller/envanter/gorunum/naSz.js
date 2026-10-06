      naSz: (() => {
        const z = s.naSz, n = s.newAsset;
        if (!z || !n) return { acik: false, haritada: false };
        const setZ = p => this.setState(st => ({ naSz: { ...st.naSz, ...p } }));
        const setN = p => this.setState(st => ({ newAsset: { ...st.newAsset, ...p } }));
        const adim = z.adim;
        const konumVar = n.lat != null && n.lon != null && isFinite(n.lat) && isFinite(n.lon);
        const icinde = konumVar && n.lat > 38.7 && n.lat < 39.85 && n.lon > 33.3 && n.lon < 34.8;
        let yakin = null;
        if (konumVar) {
          let bd = Infinity, best = null;
          (s.assets || []).forEach(a => { if (a && a.lat != null) { const d = this.mesafeM(a, n); if (d < bd) { bd = d; best = a; } } });
          if (best && bd < 60) yakin = { a: best, d: Math.round(bd) };
        }
        const konumAnahtar = konumVar ? n.lat.toFixed(6) + ',' + n.lon.toFixed(6) : '';
        const onayli = !!yakin && z.onay === konumAnahtar;
        const yilHam = String(n.year || '').trim();
        const yilOk = !yilHam || (/^\d{4}$/.test(yilHam) && +yilHam >= 1900 && +yilHam <= new Date().getFullYear() + 1);
        const ok = adim === 1 ? !!n.village : (adim === 2 ? (konumVar && icinde && (!yakin || onayli)) : yilOk);
        const uyari = adim === 1 ? (n.village ? '' : 'Köy / yerleşim seçin — konum doğrulaması ve raporlar buna dayanır.')
          : adim === 2 ? (!konumVar ? 'Konum zorunlu — üç yoldan biriyle verin.' : (!icinde ? 'Koordinat Kırşehir sınırlarının dışında görünüyor.' : (yakin && !onayli ? 'Yakında kayıtlı tesis var — kontrol edin.' : '')))
            : (yilOk ? (s.offline ? 'Çevrimdışısınız — kayıt cihaza yazılır, bağlantı gelince gider.' : 'Kaydedilince bütün ekiplerin ekranına düşer.') : 'Yapım yılı 4 haneli olmalı ya da boş kalmalı.');
        const seg = (on) => ({ bg: on ? (dark ? '#48484a' : '#ffffff') : 'transparent', golge: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none', fg: on ? ui.fg : ui.mut });
        const ac = (on, gecti) => ({
          bg: gecti ? 'var(--color-accent)' : (on ? ui.surf : ui.surf2), fg: gecti ? '#fff' : (on ? ui.acc : ui.mut),
          halka: on ? '0 0 0 2px var(--color-accent)' : 'none'
        });
        const parse = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
        return {
          acik: !z.haritada, haritada: !!z.haritada,
          kod: this.siradakiKod(n.type),
          kapat: () => this.naKapat(),
          adimlar: [['Tür ve yer', 1], ['Konum', 2], ['Bilgi ve foto', 3]].map(([l, k], i) => {
            const st = ac(adim === k, adim > k);
            return { l, ic: adim > k ? '✓' : String(k), bg: st.bg, fg: st.fg, halka: st.halka, tc: adim >= k ? ui.fg : ui.mut, cizgi: i < 2, cizgiW: adim > k ? '100%' : '0%' };
          }),
          a1: adim === 1, a2: adim === 2, a3: adim === 3,
          turler: Object.keys(TYPES).map(k => {
            const on = n.type === k;
            return {
              label: TYPES[k].label, sub: TYPES[k].kind, glyph: TYPES[k].glyph,
              bg: on ? (dark ? 'rgba(10,132,255,.16)' : 'var(--color-accent-100)') : ui.surf2,
              halka: on ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px ' + ui.rule,
              pick: () => setN({ type: k })
            };
          }),
          yollar: [['gps', 'Cihaz GPS’i'], ['harita', 'Haritadan seç'], ['yaz', 'Koordinat yaz']].map(([id, l]) => ({ l, ...seg(z.yol === id), pick: () => setZ({ yol: id }) })),
          yGps: z.yol === 'gps', yHarita: z.yol === 'harita', yYaz: z.yol === 'yaz',
          haritadaSec: () => { setZ({ haritada: true }); this.setState({ tab: 'harita', panel: 'yok' }); this.say('Haritada tesisin yerine çift tıklayın.'); },
          haritaVazgec: () => setZ({ haritada: false }),
          latTxt: z.latTxt != null ? z.latTxt : (konumVar && z.yol === 'yaz' ? String(n.lat) : ''),
          lonTxt: z.lonTxt != null ? z.lonTxt : (konumVar && z.yol === 'yaz' ? String(n.lon) : ''),
          onLat: e => { const v = e.target.value; setZ({ latTxt: v }); setN({ lat: parse(v), coordAcc: null }); },
          onLon: e => { const v = e.target.value; setZ({ lonTxt: v }); setN({ lon: parse(v), coordAcc: null }); },
          konumTxt: konumVar ? n.lat.toFixed(6) + ', ' + n.lon.toFixed(6) : 'Konum henüz yok',
          konumNot: !konumVar ? 'Sahadaysanız GPS, ofisteyseniz haritadan seçin ya da koordinat yazın.'
            : (!icinde ? 'Bu nokta il sınırının dışında — rakamları kontrol edin.'
              : (n.coordAcc ? 'Cihaz GPS · ±' + n.coordAcc + ' m — “saha ölçümü” olarak işaretlenir.' : 'Yaklaşık konum — sahada GPS ile düzeltilebilir.')),
          konumZemin: !konumVar ? ui.surf2 : (icinde ? (dark ? 'rgba(48,209,88,.12)' : 'rgba(52,199,89,.1)') : 'var(--color-uyari-100)'),
          konumNokta: !konumVar ? ui.mut : (icinde ? '#34c759' : 'var(--color-uyari)'),
          yakinVar: !!yakin && icinde,
          yakinTxt: yakin ? `${yakin.d} m yakında ${yakin.a.code} var (${TYPES[yakin.a.type].kind}${yakin.a.village ? ', ' + yakin.a.village : ''})` : '',
          yakinAc: () => { if (!yakin) return; const a = yakin.a; this.naKapat(); this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }, () => this.flyTo(a.lat, a.lon, 16)); },
          yakinOnay: () => setZ({ onay: onayli ? false : konumAnahtar }),
          onayL: onayli ? '✓ Farklı tesis, devam' : 'Farklı tesis, devam et',
          onayBg: onayli ? '#34c759' : ui.fg, onayFg: onayli ? '#fff' : ui.bg,
          yilBr: yilOk ? ui.rule : 'var(--color-uyari)',
          yilNot: yilOk ? (yilHam ? '' : 'Bilinmiyorsa boş bırakın — tahmin yazmayın, “eksik” sayılır.') : 'Geçersiz yıl',
          yilNotC: yilOk ? ui.mut : 'var(--color-uyari)',
          uyari, uyariC: ok ? ui.mut : 'var(--color-bekle)',
          geriVar: adim > 1, geri: () => setZ({ adim: adim - 1 }),
          ileriL: adim === 3 ? (s.offline ? 'Cihaza kaydet' : 'Kaydet') : 'Devam',
          ileriBg: adim === 3 ? '#34c759' : 'var(--color-accent)', ileriOp: ok ? 1 : .45,
          ileri: () => { if (!ok) return; if (adim === 3) this._yeniKaydet(); else setZ({ adim: adim + 1 }); }
        };
      })(),