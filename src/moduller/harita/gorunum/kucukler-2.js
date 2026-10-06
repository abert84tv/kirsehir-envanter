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