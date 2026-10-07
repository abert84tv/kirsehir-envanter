      // konum modülü — Ayarlar'da: bu cihazın konum paylaşımı (ekip hesabı) ve konum cihazları (yönetici/müdür)
      konumEkran: (() => {
        const ekipHesabi = !!(me && me.crew);
        const yonetici = !!(me && ['yonetici', 'mudur'].includes(me.role));
        const yaz = y => this.setState({ konumForm: { ...this.state.konumForm, ...y } });
        const yasMetin = iso => { if (!iso) return ''; const dk = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return dk < 2 ? 'şimdi' : dk < 60 ? dk + ' dk önce' : dk < 1440 ? Math.floor(dk / 60) + ' sa önce' : Math.floor(dk / 1440) + ' gün önce'; };
        const f = s.konumForm;
        const acik = !!s.konumPaylasim;
        const M = this._sb;
        return {
          paylasim: {
            var: ekipHesabi,
            ekip: me && me.crew ? me.crew : '',
            acik, durum: acik ? 'Açık — bu cihazın konumu ' + (me && me.crew) + ' ekibinin konumu olarak paylaşılıyor' : 'Kapalı — konum paylaşılmıyor',
            durumRenk: acik ? '#1b9a4a' : ui.mut,
            etiket: acik ? 'Paylaşımı kapat' : 'Konumu paylaş',
            hata: s.konumHata || '', hataVar: !!s.konumHata,
            son: s.konumSon ? 'Son gönderim: ' + yasMetin(new Date(s.konumSon).toISOString()) : '',
            sonVar: !!s.konumSon,
            tog: () => this.konumPaylasimTog(),
            not: 'Yalnız ekibe zimmetli tablet/telefonda açın. Uygulama açık ve ekran uyanıkken dakikada bir konum gider; yalnız son konum saklanır, geçmiş tutulmaz. Personel bu konuda bilgilendirilmelidir (Ayarlar › KVKK).'
          },
          cihaz: {
            var: yonetici,
            adres: M && M.KONUM_YAZ_ADRES ? M.KONUM_YAZ_ADRES : '',
            liste: (s.konumCihazlar || []).map(c => ({
              ad: c.ad, tur: c.tur === 'arvento' ? 'Araç takip' : 'Zimmetli cihaz', ekip: c.ekip || 'ekip yok', ekipRenk: c.ekip ? ui.fg : '#d97706',
              kod: c.tur === 'arvento' ? (c.plaka || c.kod || 'kod yok') : 'ekip hesabı',
              konum: c.zaman ? yasMetin(c.zaman) + (Date.now() - Date.parse(c.zaman) > 30 * 60000 ? ' (eski)' : '') : 'konum gelmedi',
              konumRenk: c.zaman && Date.now() - Date.parse(c.zaman) <= 30 * 60000 ? '#1b9a4a' : ui.mut,
              duzenle: () => this.setState({ konumForm: { id: c.id, ad: c.ad, tur: c.tur, ekip: c.ekip, plaka: c.plaka, kod: c.kod, aktif: c.aktif } }),
              sil: () => this.konumCihazSil(c)
            })),
            bos: !(s.konumCihazlar || []).length,
            yeni: () => this.setState({ konumForm: { id: null, ad: '', tur: 'arvento', ekip: '', plaka: '', kod: '', aktif: true } }),
            form: !!f,
            baslik: f && f.id ? 'Cihazı düzenle' : 'Yeni konum cihazı',
            ad: f ? f.ad : '', onAd: e => yaz({ ad: e.target.value }),
            tur: f ? f.tur : 'arvento', onTur: e => yaz({ tur: e.target.value }),
            turler: [{ v: 'arvento', l: 'Araç takip (Arvento)' }, { v: 'tablet', l: 'Zimmetli tablet / telefon' }],
            ekipDeger: f ? f.ekip : '', onEkip: e => yaz({ ekip: e.target.value }),
            ekipler: [{ v: '', l: 'Ekip seçin…' }, ...(s.ekipler || []).map(e => ({ v: e.ad, l: e.ad }))],
            plaka: f ? f.plaka : '', onPlaka: e => yaz({ plaka: e.target.value }),
            kod: f ? f.kod : '', onKod: e => yaz({ kod: e.target.value }),
            arventoMu: !!f && f.tur === 'arvento',
            kaydet: () => this.konumFormKaydet(), iptal: () => this.setState({ konumForm: null })
          }
        };
      })(),
