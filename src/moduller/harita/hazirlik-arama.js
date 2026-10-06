    // ITRF96 / TM sağa-yukarı: ondalıklı ve virgüllü de olur — "572799,55 4331744,74"
    const tm = (() => {
      if (!/\d/.test(q)) return null;
      const raw = q.replace(/[.\s]*(m|metre)\b/gi, ' ').trim();
      // virgül ondalık ayırıcı ise (rakam,rakam-rakam) noktaya çevir, ayırıcı virgülleri boşluk yap
      const cleaned = raw.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2').replace(/,/g, ' ');
      const nums = (cleaned.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      if (nums.length !== 2) return null;
      const [a, b] = nums;
      const isE = v => v >= 100000 && v < 1000000, isN = v => v >= 3500000 && v < 5000000;
      let E, N;
      if (isE(a) && isN(b)) { E = a; N = b; }
      else if (isE(b) && isN(a)) { E = b; N = a; }
      else return null;
      for (const z of [33, 36, 30, 39]) {
        const [la, lo] = tmInverse(E, N, z, ELL.grs80);
        if (la > 35 && la < 43 && lo > 25 && lo < 46) return { E, N, zone: z, lat: la, lon: lo };
      }
      return null;
    })();
    const cmatch = null;
    // WGS84 ondalık derece: "39.1462 34.1583" · "39,1462, 34,1583" · "34.1583 39.1462" · N/E harfleri olsa da olur
    const wgs = (() => {
      if (tm || !/\d/.test(q)) return null;
      const nums = (q.replace(/[NnSsEeWwKkGgDdBb°'"´]/g, ' ').match(/-?\d{1,3}[.,]\d+/g) || [])
        .map(x => parseFloat(x.replace(',', '.')));
      if (nums.length !== 2) return null;
      const [a, b] = nums;
      const ok = (la, lo) => la > 35 && la < 43 && lo > 25 && lo < 46;
      if (ok(a, b)) return { lat: a, lon: b, swapped: false };
      if (ok(b, a)) return { lat: b, lon: a, swapped: true };
      return null;
    })();
    let suggestions = [];
    if (tm) {
      const nr = s.assets.map(a => ({ a, km: 6371 * 2 * Math.asin(Math.sqrt(
        Math.sin((a.lat - tm.lat) * Math.PI / 360) ** 2 +
        Math.cos(tm.lat * Math.PI / 180) * Math.cos(a.lat * Math.PI / 180) *
        Math.sin((a.lon - tm.lon) * Math.PI / 360) ** 2)) }))
        .sort((x, y) => x.km - y.km)[0];
      suggestions = [{
        name: `${tm.E.toFixed(2)} · ${tm.N.toFixed(2)}`,
        kind: 'ITRF96 · ' + tm.zone + '° DİLİM',
        meta: `WGS84 ${tm.lat.toFixed(5)}, ${tm.lon.toFixed(5)}` + (nr ? ` · en yakın ${nr.a.code}, ${nr.km.toFixed(1)} km` : ''),
        go: () => {
          this.flyTo(tm.lat, tm.lon, 16);
          this.toMap({ ks: 'go', lat: tm.lat, lon: tm.lon, label: `ITRF96 ${tm.zone}° · aranan koordinat` });
          this.setState({ query: '', tab: 'harita' });
          this.say(`${tm.zone}° dilim → WGS84 ${tm.lat.toFixed(5)}, ${tm.lon.toFixed(5)}${nr ? ` — en yakın kayıt ${nr.a.code}, ${nr.km.toFixed(1)} km` : ''}`);
        }
      }];
      if (nr && nr.km < 0.3) suggestions.push({
        name: nr.a.code, kind: 'Kayıt', meta: `bu koordinatta · ${this.yer(nr.a)}`,
        go: () => { this.flyTo(nr.a.lat, nr.a.lon, 16); this.setState({ query: '', selected: nr.a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }); }
      });
    } else if (wgs) {
      const near = s.assets.map(a => ({ a, km: 6371 * 2 * Math.asin(Math.sqrt(
        Math.sin((a.lat - wgs.lat) * Math.PI / 360) ** 2 +
        Math.cos(wgs.lat * Math.PI / 180) * Math.cos(a.lat * Math.PI / 180) *
        Math.sin((a.lon - wgs.lon) * Math.PI / 360) ** 2)) }))
        .sort((x, y) => x.km - y.km)[0];
      suggestions = [{
        name: `${wgs.lat.toFixed(5)} , ${wgs.lon.toFixed(5)}`,
        kind: 'Koordinat',
        meta: (wgs.swapped ? 'boylam-enlem sırası düzeltildi · ' : '') +
          (near ? `en yakın kayıt ${near.a.code}, ${near.km.toFixed(1)} km` : 'haritaya git'),
        go: () => {
          this.flyTo(wgs.lat, wgs.lon, 16);
          this.toMap({ ks: 'go', lat: wgs.lat, lon: wgs.lon, label: 'Aranan koordinat' });
          this.setState({ query: '', tab: 'harita' });
          this.say(`Koordinata gidildi: ${wgs.lat.toFixed(5)}, ${wgs.lon.toFixed(5)}${near ? ` — en yakın kayıt ${near.a.code}, ${near.km.toFixed(1)} km` : ''}`);
        }
      }];
      if (near && near.km < 0.3) suggestions.push({
        name: near.a.code, kind: 'Kayıt', meta: `bu koordinatta · ${this.yer(near.a)}`,
        go: () => { this.flyTo(near.a.lat, near.a.lon, 16); this.setState({ query: '', selected: near.a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }); }
      });
    } else if (qn.length > 2 && s.assets.some(a => this.alanAra(a, qn))) {
      // tüm teknik alanlarda arama — pompa markası, arıza türü, kuyu logu, her şey
      const bulunan = s.assets.filter(a => this.alanAra(a, qn)).slice(0, 8);
      suggestions = bulunan.map(a => {
        const nerede = this.alanAra(a, qn);
        return {
          name: a.code, kind: TYPES[a.type].glyph,
          meta: `${nerede} · ${this.yer(a)}`,
          // Liste görünümündeysek listede kalınır: arama kutusuna kod yazılır,
          // kayıt tabloda süzülür. Haritadaysak haritada bulunur.
          go: () => {
            if (this.state.tab === 'envanter') {
              this.setState({ query: '', envQ: a.code, selected: a.id, detailTab: 'bilgi' });
              return;
            }
            this.flyTo(a.lat, a.lon, 16);
            this.setState({ query: '', selected: a.id, panel: 'detay', detailTab: 'bilgi' });
          }
        };
      });
    } else if (qn.length > 1 && m) {
      const vill = [];
      const gorulen = new Set();
      // "Eldelekliortaoba" ile "Eldelekli Ortaoba" aynı köydür — boşluk ve noktalama atılır
      const anahtar = x => norm(x).replace(/[^a-z0-9]/g, '');
      // gömülü HGM yerleşim listesi — koordinatı kesin bilinir, internet gerekmez
      for (const r of (this._yer || [])) {
        const nr = norm(r[0]);
        if (nr !== qn && nr.indexOf(qn) !== 0 && !nr.split(' ').some(w => w.indexOf(qn) === 0)) continue;
        if (r[3] === 'ILCE' || r[3] === 'IL') continue;
        gorulen.add(anahtar(r[0]));
        // r[4] varsa resmî ilçe adıdır; yoksa en yakın ilçe merkezine göre tahmin edilir
        const dd = (r[4] && m.DISTRICTS.find(x => x.name === r[4])) || m.DISTRICTS.slice().sort((a, b) =>
          (Math.abs(a.lat - r[1]) + Math.abs(a.lon - r[2])) - (Math.abs(b.lat - r[1]) + Math.abs(b.lon - r[2])))[0];
        const ak = anahtar(r[0]);
        vill.push({
          v: r[0], d: dd, hgm: { lat: r[1], lon: r[2] },
          n: s.assets.filter(a => anahtar(a.village || '') === ak).length
        });
      }
      for (const d of m.DISTRICTS) for (const v of this.koyList(m, d)) {
        if (norm(v).includes(qn) && !gorulen.has(anahtar(v))) {
          gorulen.add(anahtar(v));
          vill.push({ v, d, n: s.assets.filter(a => a.village === v).length });
        }
      }
      // kaydı olan köyler üste: bunların yeri kesin bilinir
      // koordinatı bilinen (HGM) kayıtlar önce — Enter her zaman kesin konuma gitsin
      vill.sort((x, y) =>
        ((y.hgm ? 1 : 0) - (x.hgm ? 1 : 0)) ||
        (y.n - x.n) ||
        (norm(x.v).indexOf(qn) - norm(y.v).indexOf(qn)) ||
        x.v.localeCompare(y.v, 'tr'));
      suggestions = vill.slice(0, 8).map(({ v, d, hgm, n }) => ({
        name: v, kind: 'Köy',
        meta: `${d.name} · ` + (n ? `${n} kayıt` : (hgm ? 'HGM listesi' : 'yeri haritadan bulunur')),
        go: hgm
          ? () => {
              this.vSave(v, hgm.lat, hgm.lon, false);
              this.flyTo(hgm.lat, hgm.lon, 15);
              this.toMap({ ks: 'go', lat: hgm.lat, lon: hgm.lon, label: `${v} · ${d.name}` });
              this.setState({ query: '', tab: 'harita', vFix: this.vOnayli(v) ? null : { name: v, district: d.name, from: 'HGM yerleşim listesi', lat: hgm.lat, lon: hgm.lon } });
            }
          : () => this.gotoVillage(v, d)
      })).concat(s.assets.filter(a => norm(a.code).includes(qn)).slice(0, 3).map(a => ({
        name: a.code, kind: 'Kayıt', meta: `${a.village} · ${TYPES[a.type].kind}`,
        go: () => {
          if (this.state.tab === 'envanter') {
            this.setState({ query: '', envQ: a.code, selected: a.id, detailTab: 'bilgi' });
            return;
          }
          this.flyTo(a.lat, a.lon);
          this.setState({ query: '', selected: a.id, panel: 'detay', detailTab: 'bilgi' });
        }
      })));
    }
