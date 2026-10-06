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