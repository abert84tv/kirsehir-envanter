    // converter — beş sistem birbirine tam çevrilir: ITRF96-3°, WGS84 6° (UTM), ED50 3°, ED50 6° (UTM), Google / WGS84 (enlem-boylam)
    let ce = parseFloat(String(s.conv.e).replace(',', '.')), cn = parseFloat(String(s.conv.n).replace(',', '.'));
    const cmv = this.cm(s.conv.zone);
    // Sağa (yüzbinler) ve yukarı (milyonlar) yer değiştirmişse düzeltilir: sağa 1 milyonu geçemez, yukarı Türkiye'de 3,9–4,6 milyondur
    const yerDegisti = s.conv.sys !== 'DMS' && isFinite(ce) && isFinite(cn) && ce > 1e6 && cn < 1e6;
    if (yerDegisti) [ce, cn] = [cn, ce];
    // derece-dakika-saniye (Google’ın gösterdiği biçim) → ondalık derece
    const dms = t => {
      const m = String(t || '').match(/(-?\d+(?:[.,]\d+)?)[°\s]+(\d+(?:[.,]\d+)?)['′\s]+(\d+(?:[.,]\d+)?)["″\s]*([NSEWnsew])?/);
      if (!m) return NaN;
      const v = Math.abs(+m[1].replace(',', '.')) + (+m[2].replace(',', '.')) / 60 + (+m[3].replace(',', '.')) / 3600;
      const neg = (+m[1].replace(',', '.')) < 0 || /[SWsw]/.test(m[4] || '');
      return neg ? -v : v;
    };
    const toDms = (v, ns) => {
      const s0 = v < 0 ? (ns ? 'S' : 'W') : (ns ? 'N' : 'E');
      const av = Math.abs(v), d = Math.floor(av), mn = Math.floor((av - d) * 60), sc = ((av - d) * 60 - mn) * 60;
      return `${d}°${String(mn).padStart(2, '0')}'${sc.toFixed(2)}"${s0}`;
    };
    // UTM 6° dilimi: dilim no = ⌊(boylam + 180) / 6⌋ + 1, orta meridyen = 6·dilim − 183, ölçek k₀ = 0,9996 (Kırşehir: dilim 36, 33° D)
    const UTM_K = 0.9996;
    const utmDilim = lon => { const z = Math.floor((lon + 180) / 6) + 1; return { z, cm: 6 * z - 183 }; };
    // WGS84 enlem-boylamdan bütün sistemlere: giriş sisteminin satırı çıkarılır
    const hepsi = (lat, lon, cm3, giris) => {
      const z3 = cm3 === 33 ? 11 : 12, u = utmDilim(lon);
      const [ei, ni] = tmForward(lat, lon, cm3, ELL.grs80);
      const [eu, nu] = tmForward(lat, lon, u.cm, ELL.grs80, UTM_K);
      const [e50, n50] = wgsToEd50Grid(lat, lon, cm3);
      const [e506, n506] = wgsToEd50Grid(lat, lon, u.cm, UTM_K);
      const [la50, lo50] = wgsToEd50Geo(lat, lon);
      const xy = (e, n) => `${e.toFixed(2)} , ${n.toFixed(2)}`;
      return [
        ['DMS', 'WGS84 enlem / boylam', `${lat.toFixed(7)}° , ${lon.toFixed(7)}°`],
        ['DMSG', 'Derece-dakika-saniye (Google)', `${toDms(lat, true)} ${toDms(lon, false)}`],
        ['ITRF96', `ITRF96-3° sağa (Y) / yukarı (X) · dilim ${z3}`, xy(ei, ni)],
        ['UTM6', `WGS84 6° sağa (Y) / yukarı (X) · dilim ${u.z}`, xy(eu, nu)],
        ['ED50', `ED50 3° sağa (Y) / yukarı (X) · dilim ${z3}`, xy(e50, n50)],
        ['ED50_6', `ED50 6° sağa (Y) / yukarı (X) · dilim ${u.z}`, xy(e506, n506)],
        ['ED50G', 'ED50 enlem / boylam', `${la50.toFixed(7)}° , ${lo50.toFixed(7)}°`]
      ].filter(r => r[0] !== giris && !(giris === 'DMS' && r[0] === 'DMSG')).map(r => ({ label: r[1], value: r[2] }));
    };
    let out = [], note = '', convLL = null;
    const sys = s.conv.sys;
    if (sys === 'DMS') {
      const lat = dms(s.conv.e) || parseFloat(String(s.conv.e).replace(',', '.'));
      const lon = dms(s.conv.n) || parseFloat(String(s.conv.n).replace(',', '.'));
      // Enlem ±90, boylam ±180 dışındaki değer derece olamaz: büyük sayılar çoğunlukla “sağa / yukarı” (metre) değeridir
      const dereceDisi = isFinite(lat) && isFinite(lon) && (Math.abs(lat) > 90 || Math.abs(lon) > 180);
      if (dereceDisi) {
        out = [{ label: 'Sonuç', value: '—' }];
        note = Math.abs(lat) > 1000 || Math.abs(lon) > 1000
          ? 'Girdiğiniz değerler derece değil, metre (sağa / yukarı) gibi görünüyor. ITRF96-3°, WGS84 6° ya da ED50 sekmesini seçin; bu sekme yalnız enlem ve boylam alır (örnek: 39.1462 ve 34.1583).'
          : 'Enlem −90…90, boylam −180…180 arasında olmalı.';
      } else if (isFinite(lat) && isFinite(lon)) {
        convLL = [lat, lon];
        out = [{ label: 'WGS84 ondalık derece', value: `${lat.toFixed(7)} , ${lon.toFixed(7)}` },
          { label: 'Derece-dakika-saniye', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          ...hepsi(lat, lon, lat >= -90 && lon < 34.5 ? 33 : 36, 'DMS').filter(r => !/^WGS84 enlem|^Derece/.test(r.label))];
        note = 'Google Maps’te bir noktaya sağ tıklayıp koordinatı kopyaladığınızda bu biçim gelir — olduğu gibi yapıştırın. Ondalık derece (39.146200, 34.158300) de kabul edilir.';
      } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Google’dan kopyaladığınız koordinatı yapıştırın: 39°08\'46.3"N ve 34°09\'29.9"E, ya da ondalık 39.146200 ve 34.158300.'; }
    } else if (isFinite(ce) && isFinite(cn)) {
      let lat, lon, cm3 = cmv, ek = '';
      if (sys === 'UTM6') {
        // Kırşehir 6° dilim 36'dadır (30°–36° D, orta meridyen 33°)
        [lat, lon] = tmInverse(ce, cn, 33, ELL.grs80, UTM_K);
        cm3 = lon < 34.5 ? 33 : 36;
        ek = 'WGS84 UTM 6° → ITRF96-3°: aynı datum, yalnız dilim ve ölçek farkı (k₀ 0,9996 → 1); sağa değeri 500000’den uzaklaştıkça fark büyür.';
      } else if (sys === 'ITRF96') {
        [lat, lon] = tmInverse(ce, cn, cmv, ELL.grs80);
        ek = 'ITRF96 → WGS84 yalnızca ters Transverse Mercator; datum hatası yok. ED50 çıktıları Netcad çıktısına uydurulmuş 7 parametreli dönüşümle (Kırşehir bölgesinde Netcad ile mm düzeyinde).';
      } else if (sys === 'ED50_6') {
        [lat, lon] = ed50GridToWgs(ce, cn, 33, UTM_K);
        cm3 = lon < 34.5 ? 33 : 36;
        ek = 'ED50 6° (UTM, k₀ 0,9996) → ITRF96: Hayford 1924 → GRS80, Netcad çıktısına uydurulmuş 7 parametreli dönüşüm (Kırşehir bölgesi).';
      } else {
        [lat, lon] = ed50GridToWgs(ce, cn, cmv);
        ek = 'ED50 → ITRF96: Hayford 1924 → GRS80, Netcad çıktısına uydurulmuş 7 parametreli dönüşüm (Kırşehir bölgesinde Netcad ile mm düzeyinde).';
      }
      convLL = [lat, lon];
      const kayit = { ITRF96: 'ITRF96-3° girişi', UTM6: 'WGS84 6° girişi', ED50: 'ED50 3° girişi', ED50_6: 'ED50 6° girişi' };
      out = [...hepsi(lat, lon, cm3, sys), { label: kayit[sys] ? 'Orta meridyen' : '', value: sys === 'UTM6' || sys === 'ED50_6' ? '33° D · k₀ = 0,9996 (UTM dilim 36)' : `${cmv}° D · k₀ = 1` },
        ...(sys === 'ED50' || sys === 'ED50_6' ? [{ label: 'ED50 dönüşümü', value: '7 parametre · Netcad’e uydurulmuş · yalnız Kırşehir' }] : [])];
      note = ek;
      if (yerDegisti) note = 'Sağa ve yukarı değerleri yer değiştirmiş görünüyordu — sağa (Y) küçük, yukarı (X) büyük sayıdır; düzeltilerek hesaplandı. ' + note;
      if (!(convLL[0] > BBOX.s && convLL[0] < BBOX.n && convLL[1] > BBOX.w && convLL[1] < BBOX.e))
        note = 'Bu koordinat il sınırının dışına düşüyor — sistem ya da dilim (11 / 12, 6° için 36) doğru mu? ' + note;
    } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Sağa ve yukarı değerlerini girin.'; }
