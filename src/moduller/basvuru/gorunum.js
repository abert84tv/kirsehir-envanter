      basvuruBanner: (() => {
        const u = s.basvuruUyari;
        return {
          show: !!u && !!s.session, baslik: u ? (u.n > 1 ? u.n + ' yeni başvuru geldi' : 'Yeni başvuru geldi') : '', metin: u ? u.metin : '',
          sesNot: s.sesAcik ? '' : 'Ses kapalı görünüyor — ekrana bir kez dokunun',
          ac: () => { this.setState({ basvuruUyari: null, tab: 'talep' }); },
          kapat: () => this.setState({ basvuruUyari: null })
        };
      })(),
      webBasvuru: (() => {
        const kopyala = () => {
          const u = location.origin + '/bildirim';
          try { navigator.clipboard.writeText(u); this.duyur('Bağlantı kopyalandı: ' + u + ' — muhtara ve vatandaşa gönderin.', 7000, 'iyi'); }
          catch (e) { this.duyur('Bağlantı: ' + u, 9000); }
        };
        if (tabId !== 'talep') return { var: false, say: 0, liste: [], fazla: '', kopyala };
        const yeni = (s.basvurular || []).filter(b => b.durum === 'yeni');
        const ac = yeni.slice(0, 15);
        return {
          kopyala, var: yeni.length > 0, say: yeni.length,
          fazla: yeni.length > ac.length ? '+ ' + (yeni.length - ac.length) + ' başvuru daha var — sırayla aktarın.' : '',
          liste: ac.map(b => ({
            baslik: b.konu + ' · ' + b.koy + (b.ilce ? ' (' + b.ilce + ')' : ''),
            aciklama: b.aciklama,
            alt: (b.sifat === 'muhtar' ? 'Muhtar ' : '') + b.ad + (b.tel ? ' · ' + b.tel : '') + ' · ' + this.damgaCevir(b.zaman) + ' · ' + b.takip + (b.lat != null ? ' · konumlu' : ''),
            renk: '#d97706',
            aktar: () => this.basvuruAktar(b), engelle: () => this.basvuruEngelle(b)
          }))
        };
      })(),