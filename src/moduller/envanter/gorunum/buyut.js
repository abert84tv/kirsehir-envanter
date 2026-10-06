      buyut: (() => {
        const b = s.buyut;
        // çöp kutusundan gelen tek fotoğraf: doğrudan adresle gösterilir
        if (b && b.url) {
          return {
            on: true,
            img: React.createElement('img', {
              src: b.url, alt: b.ad || 'Fotoğraf',
              style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }
            }),
            sayac: '1 / 1', meta: b.ad || '', coklu: false,
            onceki: () => {}, sonraki: () => {},
            indir: () => this.medyaIndir(b.url, (b.ad || 'foto').replace(/[^\wğüşiöçĞÜŞİÖÇ.-]+/g, '-') + '.jpg'),
            kapat: () => this.setState({ buyut: null })
          };
        }
        const liste = b ? ((s.fotolar || {})[b.dbId] || []) : [];
        if (!b || !liste.length) return { on: false, sayac: '', meta: '', img: null, coklu: false };
        const i = Math.max(0, Math.min(b.i, liste.length - 1));
        const f = liste[i];
        const git = k => this.setState({ buyut: { ...b, i: (k + liste.length) % liste.length } });
        return {
          on: true,
          img: React.createElement('img', {
            src: f.url, alt: 'Fotoğraf',
            style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }
          }),
          sayac: `${i + 1} / ${liste.length}`,
          meta: `${f.yukleyen || ''} · ${(f.yuklendi || '').slice(0, 10).split('-').reverse().join('.')}${f.boyut ? ' · ' + Math.round(f.boyut / 1024) + ' KB' : ''}`,
          coklu: liste.length > 1,
          onceki: () => git(i - 1),
          sonraki: () => git(i + 1),
          indir: () => this.medyaIndir(f.url, `foto-${f.id}.jpg`),
          kapat: () => this.setState({ buyut: null })
        };
      })(),