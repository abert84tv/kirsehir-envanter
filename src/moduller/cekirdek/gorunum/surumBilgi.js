      // Sürüm ve önbellek. Telefon eski kopyayı önbellekte tuttuğunda
      // ekranda kaldırılmış kayıtlar görünmeye devam eder; tazeleme bunu çözer.
      surumBilgi: (() => {
        const yerel = this.yerelTesisOku();
        return {
          surum: SURUM,
          not: 'Telefonda kaldırılmış kayıtlar görünüyorsa cihaz eski kopyayı önbellekte tutuyor olabilir. Tazeleme, programı sunucudan yeniden indirir; veritabanındaki kayıtlara dokunmaz.',
          yerelVar: yerel.length > 0,
          yerelLabel: 'Cihazda bekleyen ' + yerel.length + ' kaydı sil',
          tazele: async () => {
            try {
              if (window.caches && caches.keys) {
                const k = await caches.keys();
                await Promise.all(k.map(x => caches.delete(x)));
              }
            } catch (e) { /* önbellek API'si yok */ }
            location.reload();
          },
          yereliSil: () => {
            const kodlar = this.yerelTesisOku().map(x => x.code).join(', ');
            this.yerelTesisYaz([]);
            this.setState({ assets: (this.state.assets || []).filter(x => x && x.dbId) },
              () => this.duyur('Cihazda bekleyen kayıtlar silindi: ' + (kodlar || '—')
                + '. Veritabanındaki kayıtlar yerinde duruyor.', 8000, 'bilgi'));
          }
        };
      })(),