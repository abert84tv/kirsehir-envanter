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