      scen: {
        picker: !s.scenario,
        isNew: s.scenario === 'yeni',
        isList: s.scenario === 'mevcut' || s.scenario === 'guncelle' || s.scenario === 'foto',
        listTitle: s.scenario === 'foto' ? 'Fotoğraf eklenecek kaydı seçin'
          : (s.scenario === 'guncelle' ? 'Bilgisi güncellenecek kaydı seçin' : 'Girilecek tesisi seçin'),
        listNote: s.scenario === 'foto' ? 'Seçtiğiniz kayıt Foto sekmesinde açılır; çekilen kare çevrimdışıysa cihazda bekler.'
          : (s.scenario === 'guncelle' ? 'Kayıt Bilgi sekmesinde açılır; düzenleme önce cihaza yazılır, sonra eşitlenir.'
            : 'Kayıt detayı açılır — arıza geçmişi, fotoğraflar ve yol tarifi buradan görülür.'),
        back: () => { this._bekleyenHat = null; this._naTemizle(); this.setState({ scenario: null, newAsset: null }); }
      },
      scenarios: [
        ['yeni', 'Yeni tesis kur', 'Sahada olmayan bir kuyu, depo, AG panosu veya GES için sıfırdan kayıt açın; konum GPS’ten gelir.', canCreateAsset],
        ['mevcut', 'Mevcut tesise gir', 'Kod, köy veya haritadan seçerek var olan kaydı açın.', true],
        ['guncelle', 'Bilgi güncelle', 'Debi, seviye, sigorta gibi alanları saha ölçümüyle güncelleyin.', canWrite],
        ['foto', 'Fotoğraf ekle', 'Kayda tesis fotoğrafı ekleyin — arıza fotoğrafından ayrı tutulur.', canWrite]
      ].map(([id, title, desc, ok]) => ({
        title, desc, badge: ok ? 'Yetkiniz var' : 'Yetki yok',
        border: ok ? 'var(--color-accent)' : ui.rule, fg: ok ? ui.fg : ui.mut,
        badgeFg: ok ? ui.acc : ui.mut,
        go: () => ok
          ? (this._naTemizle(), (id === 'yeni' && s.device !== 'phone')
            ? this.naAc()
            : this.setState({ scenario: id, newAsset: id === 'yeni' ? { type: 'kuyu', district: (m && m.DISTRICTS[0].name) || '', village: '', year: '', note: '', lat: null, lon: null, photos: 0, fotoUrl: [] } : null }))
          : this.say('Bu rolde bu işlem kapalı — rol dağıtımı Ayarlar > Roller ve yetkiler ekranında.')
      })),
      scenList: [...vis].slice(0, 40).map(a => ({
        code: a.code, meta: `${TYPES[a.type].kind} · ${this.yer(a)}${a.year ? ' · ' + a.year : ''}`,
        glyph: TYPES[a.type].glyph,
        tap: () => this.setState({
          selected: a.id, panel: 'detay',
          detailTab: s.scenario === 'foto' ? 'medya' : 'bilgi'
        }, () => this.flyTo(a.lat, a.lon, 16))
      })),