      silLabel: !can('sil') ? 'Silme yetkiniz yok' : (sel && !this.yazabilir(sel) ? 'Bu ilçede yetkiniz yok' : 'Kaydı sil'),
      canSil: can('sil'),
      // ilçe yetkisi: kayıt başka ilçedeyse ekranda kilit görünür
      kilit: (() => {
        const me2 = s.session;
        if (!sel || !me2 || this.yazabilir(sel)) return { on: false, text: '' };
        return {
          on: true,
          text: `${sel.district} ilçesi — görüntüleme yetkiniz var, değiştirme yetkiniz yok. Sorumluluk bölgeniz ${me2.bolge || '—'}. Değişiklik için ilçe sorumlusuna veya müdüre başvurun.`
        };
      })(),
      card: (() => {
        const a = s.card;
        if (!a) return { on: false, rows: [], code: '', kind: '', place: '', koord: '', notu: '', tarih: '', chart: this.denemeGrafik(null) };
        return {
          on: true, code: a.code, kind: TYPES[a.type].kind, place: this.yer(a),
          koord: `${a.lat.toFixed(6)} , ${a.lon.toFixed(6)}`,
          yil: a.year || '—',
          barkod: 'BK-' + a.code.slice(3),
          notu: s.notes[a.id] || '',
          hasNot: !!s.notes[a.id],
          tarih: this.damga(),
          chart: this.denemeGrafik(a),
          // başlık satırları karta yazılmaz — iki kolonlu akışta üyelerinden kopuyorlar
          rows: this.rows(a)
            .filter(([, v, hi]) => hi !== 2 && String(v).indexOf('— eksik') !== 0)
            .map(([label, value]) => ({ label, value: String(value) })),
          yazdir: () => { try { window.print(); } catch (e) { /* engelli */ } },
          kapat: () => this.setState({ card: null })
        };
      })(),
      kartAc: () => sel && this.setState({ card: sel }),
      envKontrol: envKontrol,
      list: envSatir.map(a => {
        const pend = a.sync === 'pending';
        return {
          code: a.code, typeLabel: TYPES[a.type].kind, place: this.yer(a),
          year: a.year || '—', photos: a.photos, glyph: TYPES[a.type].glyph,
          metaPhone: `${TYPES[a.type].kind} · ${this.yer(a)}`,
          rowBg: a.id === s.selected ? ui.sel : 'transparent',
          fill: pend ? 'var(--color-accent)' : 'transparent',
          stroke: pend ? 'var(--color-accent)' : ui.rule,
          ink: pend ? '#fff' : ui.fg,
          sLabel: pend ? 'Bekliyor' : 'Eşitlendi', sVar: !!pend,
          sBg: pend ? ui.pend : 'transparent',
          sFg: pend ? (dark ? 'var(--color-accent-400)' : 'var(--color-accent-700)') : ui.mut,
          sBorder: pend ? 'var(--color-accent)' : ui.rule,
          aLabel: aktifAd(a),
          aBg: aktifMi(a) ? 'transparent' : '#3f4a5a',
          aFg: aktifMi(a) ? ui.fg : '#fff',
          aBorder: aktifMi(a) ? ui.rule : '#3f4a5a',
          solgun: '1',
          tap: () => { this.flyTo(a.lat, a.lon, 16); this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi' }); }
        };
      }),
      listNote: qn.length > 1
        ? `“${q}” araması — köy adı, ilçe, kayıt kodu ve bütün teknik alanlarda arandı.`
        : `${vis.length} kayıt. Arama kutusuna köy adı yazın — liste yalnızca o köyün kayıtlarına iner.`,

      closeDetail: () => this.setState({ selected: null, panel: 'yok' }),

      goImport: () => !can('create')
        ? this.say('Toplu aktarımı Mühendis ve üstü yapar.')
        : (s.device === 'phone'
            ? this.duyur('Dış veri aktarımı bilgisayardan yapılır — dosya seçmek ve yüzlerce noktayı tek tek işaretlemek telefon ekranında güvenli değil. Aynı hesapla bilgisayardan girin.', 9000)
            : this.setState({ tab: 'aktarim', imp: null })),
      goSettings: () => this.setState({ tab: 'ayarlar' }),