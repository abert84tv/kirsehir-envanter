      modulEsitleme: (() => {
        const kuyruk = s.modulKuyruk || {};
        const ADLAR = { ekip: 'Ekipler', personel: 'Personel havuzu', nobet: 'Nöbet takvimi',
          ambar: 'Ambar ve zimmet', arac: 'Araç ve ekipman', talep: 'Dış talepler' };
        const bekleyen = Object.keys(kuyruk);
        const izBekleyen = (s.denetim || []).filter(x => x.cevrimdisi && !x.gonderildi).length;
        const ambarBekleyen = (s.ambarKuyruk || []).length;
        const geciciNo = (s.talepler || []).filter(t => t.noGecici).length;
        return {
          not: 'Ekip, personel, nöbet, ambar, araç ve talep kayıtları ortak veritabanında durur — her bilgisayar aynı veriyi görür. Bağlantı yoksa değişiklik cihazda tutulur ve bağlantı gelince kendiliğinden yazılır. İki kişi aynı listeyi değiştirirse iki değişiklik birleştirilir; ambarda bakiye hesabı sunucuda yapıldığı için eşzamanlı düşüşler birbirini silmez.',
          durum: !s.sunucu
            ? 'Cihaz kopyasıyla çalışıyorsunuz — ortak veritabanına giriş yapılmadı, kayıtlar yalnızca bu bilgisayarda.'
            : ((bekleyen.length || ambarBekleyen)
              ? [bekleyen.length ? bekleyen.length + ' modül' : '',
                 ambarBekleyen ? ambarBekleyen + ' ambar hareketi' : '']
                 .filter(Boolean).join(' ve ') + ' sunucuya yazılamadı, kuyrukta bekliyor.'
              : 'Bütün modüller sunucuyla eşit.'),
          durumFg: !s.sunucu || bekleyen.length || ambarBekleyen ? ui.acc : ui.fg,
          bekleyen: [
            ...bekleyen.map(a => ({ ad: ADLAR[a] || a, zaman: kuyruk[a] })),
            ...(ambarBekleyen ? [{ ad: 'Ambar hareketi × ' + ambarBekleyen, zaman: 'bakiye sunucuda hesaplanacak' }] : []),
            ...(geciciNo ? [{ ad: 'Geçici numaralı talep × ' + geciciNo, zaman: 'kesin numara alınacak' }] : [])
          ],
          bekleyenVar: bekleyen.length > 0 || ambarBekleyen > 0 || geciciNo > 0,
          izNot: izBekleyen ? izBekleyen + ' denetim satırı da gönderilmeyi bekliyor.' : '',
          gonder: () => this.modulKuyrukGonder(),
          yukle: () => {
            if (!s.sunucu) return this.duyur('Ortak veritabanına bağlı değilsiniz.', 5000, 'kotu');
            if (!window.confirm('Sunucudaki modül verisi bu cihazdaki kopyanın üzerine yazılacak.\n\n'
              + 'Bu cihazda girip henüz gönderilmemiş değişiklik varsa kaybolur. Önce “Kuyruğu gönder” demeniz iyi olur.\n\nDevam edilsin mi?')) return;
            this.modulleriYukle(false);
          },
          sunucuVar: !!s.sunucu
        };
      })(),
      queue: (() => {
        const mAd = { ekip: 'Ekipler', personel: 'Personel havuzu', nobet: 'Nöbet takvimi', ambar: 'Ambar ve zimmet', arac: 'Araç ve ekipman', talep: 'Dış talepler' };
        const akt = 'var(--color-accent)';
        const varlikSatir = pendA.map(a => ({
          title: a.code + ' · ' + (a.dbId != null ? 'düzenleme' : 'yeni kayıt'), meta: this.yer(a) + ' · ' + TYPES[a.type].kind,
          state: 'Bekliyor', dot: akt
        }));
        const arizaSatir = pendF.map(f => {
          const a = f.assetId ? (s.assets || []).find(x => x.id === f.assetId) : null;
          const sebep = f.assetId && (!a || a.dbId == null) ? 'Bağlı tesis henüz sunucuda yok — önce tesis gönderilmeli'
            : (!f.assetId && !f.ilce ? 'İlçe seçilmemiş — arızayı açıp ilçe girin' : 'Gönderilmeyi bekliyor');
          return { title: (f.no || 'Arıza') + ' · ' + (f.type || ''), meta: sebep + (a ? ' · ' + a.code : ''), state: 'Bekliyor', dot: akt };
        });
        const ambarSatir = (s.ambarKuyruk || []).map(h => ({ title: 'Ambar hareketi · ' + (h.malzeme || ''), meta: 'bakiye sunucuda hesaplanacak', state: 'Bekliyor', dot: akt }));
        const modulSatir = Object.keys(s.modulKuyruk || {}).map(k => ({ title: (mAd[k] || k) + ' verisi', meta: 'sunucuya yazılamadı', state: 'Bekliyor', dot: akt }));
        const ekB = s.bekleyenEk || {};
        const ekSatir = [
          ...(ekB.not ? [{ title: 'Not × ' + ekB.not, meta: 'kayda eklenecek', state: 'Bekliyor', dot: akt }] : []),
          ...(ekB.medya ? [{ title: 'Fotoğraf / ses × ' + ekB.medya, meta: 'yüklenecek', state: 'Bekliyor', dot: akt }] : [])
        ];
        const bekleyenler = [...varlikSatir, ...arizaSatir, ...ambarSatir, ...modulSatir, ...ekSatir];
        const diger = ambarSatir.length + modulSatir.length + ekSatir.length;
        return {
          summary: s.offline ? 'Çevrimdışı · bağlantı gelince kendiliğinden gider'
            : (bekleyenSay ? bekleyenSay + ' kayıt bekliyor — “Şimdi gönder” deneyin' : 'Her şey eşitlendi'),
          stats: [
            { n: pendA.length, label: 'Tesis kaydı', color: pendA.length ? akt : ui.fg },
            { n: pendF.length, label: 'Arıza', color: pendF.length ? akt : ui.fg },
            { n: diger, label: 'Diğer (ambar, not, foto)', color: diger ? akt : ui.fg }
          ],
          items: bekleyenler.length ? bekleyenler.slice(0, 30)
            : (s.queue || []).slice(0, 8).map(q => ({ title: q.title, meta: q.meta, state: 'Eşitlendi', dot: ui.mut })),
          canSync: s.offline ? '.45' : '1',
          cta: s.offline ? 'Bağlantı bekleniyor' : 'Şimdi gönder',
          hint: 'Bekleyen kayıt, sunucuya henüz ulaşmamış demektir: bağlantı yoksa cihazda saklanır, bağlantı gelince kendiliğinden gider (ayrıca dakikada bir denenir). Satırın altındaki yazı neden beklediğini söyler.'
        };
      })(),
      syncNow: async () => {
        if (s.offline) return this.say('Çevrimdışı — bağlantı gelince kendiliğinden başlar.');
        const M = this._sb;
        if (!M || !M.tokenOku()) {
          this.setState({
            assets: s.assets.map(a => ({ ...a, sync: 'synced' })),
            faults: s.faults.map(f => ({ ...f, sync: 'synced' })),
            queue: s.queue.map(q => ({ ...q, state: 'synced', meta: 'Cihazda işaretlendi' }))
          });
          return this.say('Veritabanı bağlı değil — kayıtlar bu cihazda işaretlendi.', true);
        }
        this.say('Kuyruk gönderiliyor…');
        try {
          await this.kuyrukGonder();
          await this.arizaKuyrukGonder();
          await this.modulKuyrukGonder(true);
          await this.ambarKuyrukGonder();
          await this.notKuyrukGonder();
          await this.medyaKuyrukGonder();
        } catch (e) { /* kalanlar listede görünür */ }
        this.bekleyenEkYenile();
        const st = this.state;
        const kalan = (st.assets || []).filter(a => a.sync === 'pending').length + (st.faults || []).filter(f => f.sync === 'pending').length
          + (st.ambarKuyruk || []).length + Object.keys(st.modulKuyruk || {}).length;
        this.setState(x => ({ queue: x.queue.map(q => q.state === 'pending' ? { ...q, state: 'synced', meta: 'Sunucuya yüklendi' } : q) }));
        this.say(kalan ? kalan + ' kayıt hâlâ gitmedi — listede nedeni yazıyor.' : 'Hepsi gönderildi.');
      },