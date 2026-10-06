      onNote: e => {
        const v = e.target.value, id = sel && sel.id;
        if (id) this.setState({ notes: { ...this.state.notes, [id]: v } });
      },
      saveNote: () => {
        const id = s.selected;
        if (!id) return;
        const metin = (s.notes[id] || '').trim();
        this.iz(id, 'Not güncellendi', metin.slice(0, 90));
        if (metin && sel && sel.dbId && this._sb && this._sb.tokenOku()) {
          const beklet = () => this.notKuyrukYaz([...this.notKuyrukOku(), { dbId: sel.dbId, kod: sel.code, metin, t: Date.now() }]);
          if (s.offline) beklet();
          else this._sb.notEkle(sel.dbId, metin).then(r => {
            if (r && r.ok) this.veriYenile(true);
            else if (r && r.cevrimdisi) beklet();
            else this.say((r && r.err) || 'Not sunucuya yazılamadı.', true);
          });
        }
        this.say(s.offline ? 'Not cihaza yazıldı — bağlantı gelince eşitlenecek. Değişiklik Geçmiş sekmesine işlendi.' : 'Not kaydedildi ve Geçmiş sekmesine işlendi.');
      },
      status: {
        bg: s.offline ? 'var(--color-uyari)' : ui.surf, fg: s.offline ? '#fff' : ui.mut,
        mut: s.offline ? 'rgba(255,255,255,.8)' : ui.mut,
        text: s.offline ? 'Çevrimdışı — kayıtlar cihazda tutuluyor, bağlantı gelince arka planda eşitlenecek'
          : (s.sunucu
              ? `Ortak veritabanı bağlı${s.sonEsitleme ? ' · son eşitleme ' + s.sonEsitleme : ''}${pendA.length + pendF.length ? ' · ' + (pendA.length + pendF.length) + ' bekleyen işlem' : ''}`
              : `Cihazdaki kopya — ortak veritabanına bağlı değil${pendA.length + pendF.length ? ' · ' + (pendA.length + pendF.length) + ' bekleyen işlem' : ''}`),
        right: `${s.assets.length} envanter kaydı · ${s.faults.length} arıza · sürüm ${SURUM}`
      },
      toast: { show: !!s.toast, text: s.toast || '' },
      extendNotes: [
        'Yeni envanter türü: asset_type enum + 1:1 detay tablosu.',
        'Yeni alan: field_defs kaydı — arayüz kod değişmeden büyür.',
        'Yeni modül: sol menüye tab, aynı sync sözleşmesi.'
      ],