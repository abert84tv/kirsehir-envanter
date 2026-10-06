  // Dosyadan içe aktarma — 2026.10.01'e kadar bu fonksiyon dosyayı hiç okumuyor,
  // her seferinde aynı 12 uydurma satırı ilçe merkezlerinin yanına koyuyordu.
  makeImport(source) {
    const kabul = /KML|Earth/i.test(source) ? '.kml,.kmz' : (/GPX/i.test(source) ? '.gpx' : '.csv,.txt,.xlsx,.xls');
    let inp = this._impInput;
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.style.position = 'fixed'; inp.style.left = '-9999px'; inp.style.opacity = '0';
      document.body.appendChild(inp);
      this._impInput = inp;
    }
    inp.value = '';
    inp.accept = kabul;
    inp.onchange = async () => {
      const dosya = inp.files && inp.files[0];
      inp.value = '';
      if (!dosya) return;
      try {
        const noktalar = await this.noktaOku(dosya);
        if (!noktalar.length) return this.say(dosya.name + ' içinde nokta bulunamadı — koordinatlı yer imi / satır yok.', true);
        this.setState({ imp: { source, dosya: dosya.name, step: 2, rows: this.impSatirlar(noktalar) } });
      } catch (e) {
        this.say(dosya.name + ' okunamadı: ' + (e && e.message ? e.message : e), true);
      }
    };
    inp.click();
  }
  // KMZ bir ZIP arşivi: merkezi dizin elle okunur, deflate tarayıcının kendi
  // DecompressionStream'iyle açılır (hat.html'deki aynı yöntem — dış bağımlılık yok)
  async kmzAc(dosya) {
    const buf = new Uint8Array(await dosya.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('bozuk .kmz dosyası (ZIP sonu yok)');
    const girisSayisi = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    for (let i = 0; i < girisSayisi; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const sikistirma = dv.getUint16(p + 10, true);
      const sikBoyut = dv.getUint32(p + 20, true);
      const adU = dv.getUint16(p + 28, true), ekU = dv.getUint16(p + 30, true), yorumU = dv.getUint16(p + 32, true);
      const yerel = dv.getUint32(p + 42, true);
      const ad = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + adU));
      if (/\.kml$/i.test(ad)) {
        const bas = yerel + 30 + dv.getUint16(yerel + 26, true) + dv.getUint16(yerel + 28, true);
        const veri = buf.subarray(bas, bas + sikBoyut);
        let acik;
        if (sikistirma === 0) acik = veri;
        else if (sikistirma === 8) {
          const ds = new DecompressionStream('deflate-raw');
          const w = ds.writable.getWriter(); w.write(veri); w.close();
          acik = new Uint8Array(await new Response(ds.readable).arrayBuffer());
        } else throw new Error('desteklenmeyen sıkıştırma (' + sikistirma + ')');
        return new TextDecoder('utf-8').decode(acik);
      }
      p += 46 + adU + ekU + yorumU;
    }
    throw new Error('.kmz içinde .kml yok');
  }
  // Dosyadaki noktaları [{ name, lat, lon }] olarak döndürür (KML/KMZ yer imi, GPX wpt, CSV satırı)
  async noktaOku(dosya) {
    const ad = dosya.name || '';
    const sayi = v => { const x = parseFloat(String(v == null ? '' : v).trim().replace(',', '.')); return isFinite(x) ? x : null; };
    if (/\.kmz$/i.test(ad) || /\.kml$/i.test(ad)) {
      const metin = /\.kmz$/i.test(ad) ? await this.kmzAc(dosya) : await dosya.text();
      const doc = new DOMParser().parseFromString(metin, 'text/xml');
      if (doc.querySelector('parsererror')) throw new Error('KML biçimi bozuk');
      return [...doc.getElementsByTagName('Placemark')].map((pm, i) => {
        const pt = pm.getElementsByTagName('Point')[0];
        const c = pt && pt.getElementsByTagName('coordinates')[0];
        if (!c) return null;
        const [lon, lat] = c.textContent.trim().split(/[\s]+/)[0].split(',').map(Number);
        const n = pm.getElementsByTagName('name')[0];
        return isFinite(lat) && isFinite(lon) ? { name: (n && n.textContent.trim()) || ('Yer imi ' + (i + 1)), lat, lon } : null;
      }).filter(Boolean);
    }
    if (/\.gpx$/i.test(ad)) {
      const doc = new DOMParser().parseFromString(await dosya.text(), 'text/xml');
      if (doc.querySelector('parsererror')) throw new Error('GPX biçimi bozuk');
      return [...doc.getElementsByTagName('wpt')].map((w, i) => {
        const lat = sayi(w.getAttribute('lat')), lon = sayi(w.getAttribute('lon'));
        const n = w.getElementsByTagName('name')[0];
        return lat != null && lon != null ? { name: (n && n.textContent.trim()) || ('Nokta ' + (i + 1)), lat, lon } : null;
      }).filter(Boolean);
    }
    // CSV / TXT: ayraç ; , veya sekme; başlıkta enlem/lat ve boylam/lon sütunu aranır
    // Excel (.xlsx/.xls): ilk sayfa okunup CSV mantığına verilir (kütüphane yalnız gerektiğinde yüklenir)
    let metinSatirlar = null;
    if (/\.xlsx?$/i.test(ad)) {
      if (!window.XLSX) await new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = './vendor/xlsx.mini.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('Excel okuyucu yüklenemedi (internet gerekebilir)'));
        document.head.appendChild(sc);
      });
      const wb = window.XLSX.read(new Uint8Array(await dosya.arrayBuffer()), { type: 'array' });
      const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
      metinSatirlar = rows.map(r => r.map(v => String(v).replace(/;/g, ',')).join(';'));
    }
    const satirlar = (metinSatirlar ? metinSatirlar.join(String.fromCharCode(10)) : await dosya.text()).replace(/^\ufeff/, '').split(/\r?\n/).filter(x => x.trim());
    if (satirlar.length < 2) return [];
    const ayrac = [';', '\t', ','].find(a => satirlar[0].split(a).length > 1) || ',';
    const bas = satirlar[0].split(ayrac).map(x => norm(x.trim().replace(/^"|"$/g, '')));
    const bul = re => bas.findIndex(h => re.test(h));
    const iLat = bul(/^(enlem|lat|latitude|y)$/), iLon = bul(/^(boylam|lon|lng|long|longitude|x)$/);
    const iAd = bul(/^(ad|adi|isim|name|kod|aciklama)$/);
    if (iLat < 0 || iLon < 0) throw new Error('başlık satırında "enlem" ve "boylam" (ya da lat/lon) sütunu bulunamadı');
    return satirlar.slice(1).map((sat, i) => {
      const h = sat.split(ayrac).map(x => x.trim().replace(/^"|"$/g, ''));
      const lat = sayi(h[iLat]), lon = sayi(h[iLon]);
      return lat != null && lon != null ? { name: (iAd >= 0 && h[iAd]) || ('Satır ' + (i + 2)), lat, lon } : null;
    }).filter(Boolean);
  }
  // Okunan noktalara ilçe, köy, tür tahmini ve mükerrer kontrolü eklenir
  impSatirlar(noktalar) {
    const yerler = (this._yer || []).filter(r => r[3] === 'YKOY' || r[3] === 'BCK');
    const varolan = (this.state.assets || []).filter(a => a && a.lat != null);
    return noktalar.map((p, i) => {
      const icinde = p.lat > 38.7 && p.lat < 39.85 && p.lon > 33.3 && p.lon < 34.8;
      let koy = null, kd = Infinity;
      yerler.forEach(r => { const d = this.mesafeM({ lat: r[1], lon: r[2] }, p); if (d < kd) { kd = d; koy = r; } });
      let es = null, ed = Infinity;
      varolan.forEach(a => { const d = this.mesafeM(a, p); if (d < ed) { ed = d; es = a; } });
      const kayitli = es && ed < 30 ? es.code : '';
      const tur = /depo/i.test(p.name) ? 'depo' : (/kuyu|sondaj/i.test(p.name) ? 'kuyu' : (/\bges\b|güneş/i.test(p.name) ? 'ges' : (/pano|\bag\b|trafo/i.test(p.name) ? 'ag' : null)));
      return {
        i, name: p.name, lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), icinde, kayitli,
        district: koy && kd < 6000 && koy[4] ? koy[4] : (this.enYakinIlce(p.lat, p.lon) || ''),
        village: koy && kd < 4000 ? koy[0] : '',
        type: icinde && !kayitli ? tur : null, sel: false
      };
    });
  }