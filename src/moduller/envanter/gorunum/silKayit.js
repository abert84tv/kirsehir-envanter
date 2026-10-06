      silKayit: !can('sil') ? null : () => {
        const a = sel;
        if (!a) return;
        if (!this.yazabilir(a)) return this.kilitUyar(a);
        this.denetimYaz('veri', 'Kayıt çöp kutusuna taşındı',
          TYPES[a.type].kind + ' · ' + this.yer(a), a.code);
        const me2 = s.session;
        if (a.dbId && this._sb) {
          this._sb.tesisSil(a.dbId).then(r => {
            if (!r.ok) { this.say(r.err, true); return; }
            this.setState({ selected: null, panel: 'yok' });
            this.veriYenile(true);
            this.say(`${a.code} çöp kutusuna taşındı — 30 gün içinde geri getirilebilir. Ayarlar > Çöp kutusu. Kayıt herkesin ekranından kalktı.`, true);
            setTimeout(() => this.setState({ toast: null }), 7000);
          });
          return;
        }
        this.setState({
          assets: s.assets.filter(x => x.id !== a.id),
          trash: [{ a, silen: me2 ? me2.name : '—', t: this.damga(), gun: 30 }, ...s.trash],
          selected: null, panel: 'yok'
        });
        this.say(`${a.code} çöp kutusuna taşındı — 30 gün içinde geri getirilebilir. Ayarlar > Çöp kutusu.`, true);
        setTimeout(() => this.setState({ toast: null }), 6000);
      },