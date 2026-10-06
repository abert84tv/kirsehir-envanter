      goToMyLocation: () => {
        // Harita cihaz GPS'ini ister (harita.html → konumBul); gerçek sonuç
        // {ks:'konum'} mesajıyla asenkron gelir ve gerçek doğrulukla bildirilir
        // (bkz. componentDidMount'taki mesaj dinleyicisi). Burada sabit bir
        // "±4 m" iddiası göstermek yanlıştı — sonuç gelene kadar bekletilir.
        this.toMap({ ks: 'go' });
        this.setState({ tab: 'harita' });
        this.say('Konumunuz aranıyor…');
      },
      routeToSel: () => {
        if (!sel) return;
        if (this.yolTarifiVer(sel)) this.say(`${sel.code} için karayolu güzergâhı hesaplanıyor…`);
      },
      // Kayıt detayındaki GİT kaydın kendi noktasına götürür; ana haritadaki GİT konumunuza
      goToSel: () => {
        if (!sel) return;
        this.flyTo(sel.lat, sel.lon, 17);
        this.setState({ tab: 'harita', panel: s.device === 'phone' ? 'yok' : s.panel });
        this.say(`${sel.code} · ${sel.lat.toFixed(5)}, ${sel.lon.toFixed(5)}`);
      },
      hatCiz: {
        on: !!(s.hatTam && sel),
        kod: sel ? sel.code : '',
        bilgi: sel ? `${this.yer(sel)} · çizdiğiniz hat kapatınca kayda işlenir ve ana haritada görünür` : '',
        kapat: () => this.setState({ hatTam: false }, () => { this.hatlariYolla(); this.pushMap(); })
      },
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
      vFixBar: {
        on: !!s.vFix && !s.pick,
        text: s.vFix ? `${s.vFix.name} · ${s.vFix.district} — konum kaynağı: ${s.vFix.from}` : '',
        fix: () => {
          const v = this.state.vFix;
          this.setState({ vFix: null, pick: { name: v.name, district: v.district } });
          this.toMap({ ks: 'pick', name: v.name });
        },
        ok: () => {
          const v = this.state.vFix;
          // onaylanan konumu kalıcı yap; daha önce elle işaretlenmişse ona dokunmaz
          const ex = v && this.vCache()[norm(v.name)];
          if (v && v.lat !== undefined && !(ex && ex.manual !== false)) this.vSave(v.name, v.lat, v.lon, true);
          this.setState({ vFix: null });
          this.say(`${v.name} köyünün konumu onaylandı ve kaydedildi — bu köy bundan sonra internetsiz de bulunur.`);
        }
      },
      pickBar: {
        on: !!s.pick,
        text: s.pick ? `${s.pick.name} · ${s.pick.district} — köyün merkezine haritada dokunun` : '',
        cancel: () => { this.setState({ pick: null }); this.toMap({ ks: 'pick', name: null }); }
      },
      vSaved: (() => {
        const n = Object.keys(this.vCache()).length;
        return n
          ? `Köy konumları programın içinde gömülü. Bunun dışında elle işaretlediğiniz ${n} konum bu cihazda saklı ve gömülü listeye göre öncelikli.`
          : 'Köy konumları programın içinde gömülü — elle işaretlenmiş ayrı bir konum yok.';
      })(),
      vClear: () => {
        const n = Object.keys(this.vCache()).length;
        try { localStorage.setItem(VKEY, '{}'); } catch (e) { /* yok */ }
        this.forceUpdate();
        this.say(n ? `${n} konum kaydı silindi. Köy aramaları artık doğrudan gömülü HGM listesinden geliyor.` : 'Silinecek konum kaydı yok.');
      },

      profil: (() => {
        return {
          note: 'Haritaya tıklayarak nokta koyun; iki veya daha çok nokta arasındaki uzaklık, kot farkı (rakım), tırmanma–iniş ve yol profili hesaplanır. Noktaları sürükleyerek düzeltebilirsiniz. Rakım için internet gerekir, uzaklık çevrimdışı da ölçülür.'
        };
      })(),
      markers, flyPing: !!s.fly, fly: s.fly ? this.proj(s.fly.lat, s.fly.lon) : { x: 50, y: 50 },
      filters: [['all', 'Tümü'], ['kuyu', 'Kuyu'], ['depo', 'Depo'], ['ag', 'AG'], ['ges', 'GES'], ['pasif', 'Pasifler'], ['kaynak', 'ISU Kaynak'], ['memba', 'ISU Memba']].map(([id, label]) => {
        const turler = ['kuyu', 'depo', 'ag', 'ges', 'kaynak', 'memba'];
        const on = id === 'all' ? turler.every(t => s.filter[t])
          : id === 'pasif' ? s.filter.pasif !== false : s.filter[id];
        return {
          label,
          bg: on ? (dark ? 'rgba(10,132,255,.20)' : 'var(--color-accent-100)') : 'transparent',
          fg: on ? ui.acc : ui.mut,
          kenar: on ? (dark ? 'rgba(10,132,255,.42)' : 'var(--color-accent-300)') : ui.rule,
          // telefonda haritanın üstünde yüzer: hepsi beyaz kalır,
          // açık olan mavi yazar — haritanın okunurluğu bozulmaz
          telBg: ui.surf,
          telFg: on ? ui.acc : ui.mut,
          toggle: () => id === 'all'
            ? this.setState({ filter: { ...s.filter, kuyu: !on, depo: !on, ag: !on, ges: !on, kaynak: !on, memba: !on } }, () => this.pushMap())
            : id === 'pasif'
              ? this.setState({ filter: { ...s.filter, pasif: s.filter.pasif === false } }, () => this.pushMap())
              : this.setState({ filter: { ...s.filter, [id]: !s.filter[id] } }, () => this.pushMap())
        };
      }),
      counts: {
        line1: `${vis.length} kayıt · ${vis.filter(a => aktifMi(a)).length} aktif · ${vis.filter(a => !aktifMi(a)).length} pasif`,
        // Süzgeç çubuğunda yer az: kısa biçim yazılır, tamamı ipucunda durur
        kisa: `${vis.length} kayıt`,
        line2: 'OpenStreetMap' },
      map: {
        filtreBos: !['kuyu', 'depo', 'ag', 'ges'].some(k => s.filter[k]),
        hepsiniAc: () => this.setState({ filter: { ...s.filter, kuyu: true, depo: true, ag: true, ges: true, kaynak: true, memba: true } }, () => this.pushMap()),
        display: tabId === 'harita' ? 'flex' : 'none', arizaBtn: canCreateFault ? 'flex' : 'none' },
      zoomIn: () => this.setState({ zoom: Math.min(15.5, s.zoom + 1) }),
      zoomOut: () => this.setState({ zoom: Math.max(9, s.zoom - 1) }),
      locate: () => { this.flyTo(39.1462, 34.1583); this.say('GPS konumu alındı · doğruluk ±4 m'); },

      closeConv: () => this.setState({ panel: 'yok' }),
      convBtn: s.panel === 'donusum'
        ? { border: 'var(--color-accent)', bg: 'var(--color-accent)', fg: '#fff' }
        : { border: ui.rule, bg: 'transparent', fg: ui.fg },
      openConv: () => this.setState({ panel: s.panel === 'donusum' ? 'yok' : 'donusum' }),
      vFill: {
        run: () => this.fillVillages(),
        label: s.vFill === 'loading' ? 'Çalışıyor…' : (s.vFill === 'done' ? 'Yeniden çalıştır' : 'Kuyulara köy adı yaz'),
        note: (() => {
          const auto = s.assets.filter(a => a.villageAuto !== undefined);
          const bos = s.assets.filter(a => !a.village).length;
          if (s.vFill === 'loading') return 'Kayıtlar en yakın yerleşime bağlanıyor…';
          if (s.vFill === 'error') return 'İşlem tamamlanamadı — tekrar deneyin.';
          if (auto.length) {
            const far = auto.filter(a => a.villageAuto > 4).length;
            return `${auto.length} kayda köy adı otomatik yazıldı; ${far} tanesi 4 km’den uzak eşleşti — bunları kontrol edin. Her kaydın Not sekmesinde hangi köye kaç km uzaklıkta eşleştiği yazıyor.`;
          }
          return `Bu düğme bir kez çalıştırılır: köyü boş olan ${bos} kayda en yakın yerleşimin adını yazar. Bir daha basmanız gerekmez — yanlış eşleşen köyü kaydın kendi sayfasından (“Köy / ilçe düzelt” düğmesi) elle düzeltirsiniz. Köy konumları programda gömülü (HGM coğrafi ad dizini, ${(this._yer || []).length} yerleşim), köy araması internetsiz çalışır.`;
        })()
      },
      convSystems: [['ITRF96', 'ITRF96-3°'], ['ED50', 'ED50 3°'], ['DMS', 'Google / WGS84']].map(([id, label]) => ({
        label, bg: s.conv.sys === id ? ui.surf2 : 'transparent', fg: s.conv.sys === id ? ui.acc : ui.mut,
        pick: () => this.setState({ conv: { ...s.conv, sys: id } })
      })),
      conv: {
        e: s.conv.e, n: s.conv.n, zone: s.conv.zone, out, note,
        isDms: s.conv.sys === 'DMS',
        notDms: s.conv.sys !== 'DMS',
        labelE: s.conv.sys === 'DMS' ? 'Enlem (N)' : 'Sağa (E)',
        labelN: s.conv.sys === 'DMS' ? 'Boylam (E)' : 'Yukarı (N)',
        phE: s.conv.sys === 'DMS' ? '39°08\'46.3"N' : '615860',
        phN: s.conv.sys === 'DMS' ? '34°09\'29.9"E' : '4322830'
      },
      onConvE: e => this.setState({ conv: { ...this.state.conv, e: e.target.value } }),
      onConvN: e => this.setState({ conv: { ...this.state.conv, n: e.target.value } }),
      onConvZone: e => this.setState({ conv: { ...this.state.conv, zone: e.target.value } }),
      flyToConv: () => convLL ? this.flyTo(convLL[0], convLL[1]) : this.say('Geçerli bir koordinat girin.'),