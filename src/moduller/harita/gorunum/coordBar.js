      coordBar: (() => {
        const p = s.picked;
        if (!p) return { on: false, rows: [], wgs: '', dms: '', itrf: '', bekle: '' };
        const zone = p.lon < 34.5 ? '11' : '12';
        const cmv = this.cm(zone);
        const [ei, ni] = tmForward(p.lat, p.lon, cmv, ELL.grs80);
        const dd = (v, ns) => {
          const s0 = v < 0 ? (ns ? 'S' : 'W') : (ns ? 'N' : 'E');
          const av = Math.abs(v), g = Math.floor(av), mn = Math.floor((av - g) * 60), sc = ((av - g) * 60 - mn) * 60;
          return `${g}°${String(mn).padStart(2, '0')}'${sc.toFixed(2)}"${s0}`;
        };
        return {
          on: true, bekle: '',
          wgs: `${p.lat.toFixed(6)} , ${p.lon.toFixed(6)}`,
          dms: `${dd(p.lat, true)} ${dd(p.lon, false)}`,
          itrf: `${ei.toFixed(2)} , ${ni.toFixed(2)} · dilim ${zone}`,
          kopyala: () => {
            const t = `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
            try { navigator.clipboard.writeText(t); } catch (e) { /* izin yok */ }
            this.say(`Koordinat kopyalandı: ${t}`);
          },
          yeniTesis: can('create') ? () => {
            this._naTemizle();
            const ilce = this.enYakinIlce(p.lat, p.lon) || ((m && m.DISTRICTS[0].name) || '');
            const yeni = { type: 'kuyu', district: ilce, village: '', year: '', note: '', lat: p.lat, lon: p.lon, photos: 0, fotoUrl: [] };
            if (s.device === 'phone') this.setState({ tab: 'islem', scenario: 'yeni', picked: null, newAsset: yeni });
            else this.setState({ picked: null, scenario: null, newAsset: yeni, naSz: { adim: 1, yol: 'harita', onay: false } });
            this.toMap({ ks: 'coordMode', on: false });
            this.say(`Yeni tesis kaydı bu koordinatla açıldı: ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`);
          } : null,
          canCreate: can('create'),
          kapat: () => { this.setState({ picked: null }); this.toMap({ ks: 'coordMode', on: false }); },
          donustur: () => this.setState({
            picked: null, panel: 'donusum',
            conv: { sys: 'DMS', zone, e: p.lat.toFixed(6), n: p.lon.toFixed(6) }
          })
        };
      })(),