      newAsset: {
        typeBtns: Object.keys(TYPES).map(k => ({
          label: TYPES[k].label, sub: TYPES[k].kind,
          bg: na && na.type === k ? 'var(--color-accent)' : 'transparent',
          fg: na && na.type === k ? '#fff' : ui.mut,
          pick: () => this.setState({ newAsset: { ...this.state.newAsset, type: k } })
        })),
        district: na ? na.district : '', village: na ? na.village : '',
        year: na ? na.year : '', note: na ? na.note : '',
        durumSec: [['aktif', 'Aktif'], ['pasif', 'Pasif']].map(([v, l]) => ({
          label: l,
          bg: (na && na.status === v) || (!na || !na.status) && v === 'aktif' ? 'var(--color-accent)' : 'transparent',
          fg: (na && na.status === v) || (!na || !na.status) && v === 'aktif' ? '#fff' : ui.fg,
          pick: () => this.setState({ newAsset: { ...this.state.newAsset, status: v } })
        })),
        districts: m ? m.DISTRICTS.map(d => d.name) : [],
        villages: (() => {
          if (!m || !na) return [];
          const d = m.DISTRICTS.find(x => x.name === na.district);
          return this.koyList(m, d);
        })(),
        coordText: na && na.lat != null && na.lon != null ? `${na.lat.toFixed(5)} , ${na.lon.toFixed(5)}` : 'Konum alınmadı',
        coordNote: na && na.lat != null && na.lon != null
          ? (na.coordAcc
            ? `Cihaz GPS · ±${na.coordAcc} m — kayıt “saha ölçümü” olarak işaretlenir.`
            : 'Yaklaşık konum — GPS alınamadı, köy/ilçe merkezi kondu. Sahada gerçek GPS ile düzeltilmeli.')
          : 'GİT düğmesi cihaz GPS’ini ister; alınamazsa köy/ilçe merkezi yaklaşık konum olarak konur.',
        coordColor: na && na.lat != null && na.lon != null ? (na.coordAcc ? ui.acc : 'var(--color-uyari)') : ui.mut,
        photos: na ? (na.fotoUrl || []).map(url => ({ img: this.imgEl(url, 'Yeni tesis fotoğrafı') })) : [],
        photoCount: na ? `${na.photos} fotoğraf` : '0 fotoğraf',
        code: na ? `KS-${TYPES[na.type].pre}-YENİ` : '',
        cta: s.offline ? 'Cihaza kaydet (kuyruğa al)' : 'Kaydet ve eşitle'
      },