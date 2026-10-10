      // Ayarlar listesi — iOS Ayarlar gibi kümelenmiş satırlar
      ayarListe: AYAR_LISTE.map(([baslik, satirlar]) => ({
        baslik,
        satirlar: satirlar
          // Modüller yalnız yöneticide; ayrı sekmesi olanlar SUZGEC_TANIM'daki
          // kendi yetkisinden okur (AYAR_TAB_YETKI), ötekiler ayarlar yetkisinden
          .filter(([id]) => (id !== 'modul' || can('admin')) && (id !== 'vekalet' || !!(me && ['mudur', 'yonetici'].includes(me.role))) && ayarGorunur(id, s.modul)
            && (!AYAR_TAB_YETKI[id] || yetki(AYAR_TAB_YETKI[id]) !== 'yok'))
          .map(([id, ad, alt]) => ({
            ad,
            aktif: ayarAcik(s) === id,
            zemin: ayarAcik(s) === id && tabId === 'ayarlar' ? ui.sel : 'transparent',
            renk: ayarAcik(s) === id && tabId === 'ayarlar' ? ui.acc : ui.fg,
            rozet: id === 'cop' && (s.trash.length + (s.cop || []).length) ? String(s.trash.length + (s.cop || []).length) : '',
            alt: id === 'cop' && (s.trash.length + (s.cop || []).length)
              ? (s.trash.length + (s.cop || []).length) + ' kayıt bekliyor'
              : alt,
            // "aktarim" masaüstüne özgü — telefonda arayışı bilgisayara yönlendirir,
            // izinsiz kullanıcıyı uyarır (goImport ile birebir aynı davranış)
            git: id === 'aktarim'
              ? () => (!can('create')
                  ? this.say('Toplu aktarımı Mühendis ve üstü yapar.')
                  : (s.device === 'phone'
                      ? this.duyur('Dış veri aktarımı bilgisayardan yapılır — dosya seçmek ve yüzlerce noktayı tek tek işaretlemek telefon ekranında güvenli değil. Aynı hesapla bilgisayardan girin.', 9000)
                      : this.setState({ tab: 'aktarim', imp: null })))
              : AYAR_TAB[id] ? () => this.setState({ tab: AYAR_TAB[id] })
              : () => this.setState({ ayarBolum: id })
          }))
      })).filter(g => g.satirlar.length),