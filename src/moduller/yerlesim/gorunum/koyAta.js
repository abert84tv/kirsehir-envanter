      // Envanter > “Köyü boş” kayıtlara toplu köy atama penceresi (masaüstü ve telefon aynı şablon)
      koyAta: (() => {
        const k = s.koyAtaDurum;
        if (!k) return { acik: false, satirlar: [], adaylar: [], sonuclar: [] };
        const bos = this.koyAtaBosKayitlar();
        const secili = bos.filter(a => k.sec.includes(a.id));
        const hedefMi = v => !!(k.hedef && k.hedef.ad === v.ad && k.hedef.ilce === v.ilce);
        const km = x => x.toFixed(1).replace('.', ',') + ' km';
        const chip = (v, alt) => ({
          ad: v.ad, alt, on: hedefMi(v),
          bg: hedefMi(v) ? '#1b9a4a' : 'transparent', fg: hedefMi(v) ? '#fff' : ui.fg, kenar: hedefMi(v) ? '#1b9a4a' : ui.rule,
          sec: () => this.koyAtaGuncelle({ hedef: hedefMi(v) ? null : { ad: v.ad, ilce: v.ilce } })
        });
        const adaylar = this.koyAtaAdaylar(secili).map(v => chip(v, (v.ilce ? v.ilce + ' · ' : '') + km(v.km)));
        const q = norm((k.q || '').trim());
        const sonuclar = q.length < 2 ? [] : this.koyAtaDugumler().filter(v => norm(v.ad).includes(q)).slice(0, 6).map(v => chip(v, v.ilce));
        const satirlar = bos.map(a => ({ a, o: this.koyAtaOneri(a) }))
          .sort((x, y) => (x.o ? x.o.ad : '').localeCompare(y.o ? y.o.ad : '', 'tr') || x.a.code.localeCompare(y.a.code, 'tr'))
          .map(({ a, o }) => {
            const on = k.sec.includes(a.id);
            return {
              kod: a.code, ilce: a.district || '', oneri: o ? o.ad : '—', oneriKm: o ? km(o.km) : '', on, isaret: on ? '✓' : '',
              bg: on ? 'rgba(0,113,227,.10)' : 'transparent', kutu: on ? 'var(--color-accent)' : 'transparent', kutuKenar: on ? 'var(--color-accent)' : ui.rule,
              tik: () => this.koyAtaSecTik(a.id, true),
              hizli: () => o && this.koyAtaUygula([a.id], { ad: o.ad, ilce: o.ilce }), hizliVar: !!o
            };
          });
        const hedefAd = k.hedef ? k.hedef.ad : '';
        const hazir = !!(secili.length && k.hedef) && !k.yaziyor;
        return {
          acik: true, bosYok: bos.length === 0, bosDegil: bos.length > 0, sayi: bos.length, secSayi: secili.length, satirlar, adaylar, adayVar: adaylar.length > 0, sonuclar, sonucVar: sonuclar.length > 0,
          ozet: bos.length ? bos.length + ' kayıtta köy boş' : 'Köyü boş kayıt kalmadı',
          q: k.q || '', onQ: e => this.koyAtaGuncelle({ q: e.target.value }),
          hedefAd, hedefVar: !!k.hedef, hedefMetin: k.hedef ? k.hedef.ad + (k.hedef.ilce ? ' · ' + k.hedef.ilce : '') : 'Köy seçilmedi',
          secMetin: secili.length ? secili.length + ' kayıt seçili' : 'Haritadan ya da listeden kayıt seçin',
          hepsi: () => this.koyAtaGuncelle({ sec: bos.map(a => a.id) }), temizle: () => this.koyAtaGuncelle({ sec: [], hedef: null }),
          cevre: () => this.koyAtaCevre(), cevreVar: secili.length > 0,
          uygula: () => this.koyAtaUygula(secili.map(a => a.id), k.hedef), hazir, yaziyor: !!k.yaziyor,
          dugme: k.yaziyor ? 'Yazılıyor…' : (hazir ? secili.length + ' kayda “' + hedefAd + '” ata' : 'Köy ve kayıt seçin'),
          dugmeBg: hazir ? 'var(--color-accent)' : ui.surf2, dugmeFg: hazir ? '#fff' : ui.mut,
          kapat: () => this.koyAtaKapat()
        };
      })(),
