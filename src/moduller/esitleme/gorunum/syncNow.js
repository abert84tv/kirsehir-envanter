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