    // converter
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
    let out = [], note = '', convLL = null;
    // WGS84 UTM 6° (Netcad: “WGS84 6 derece”): dilim 36, orta meridyen 33° D, ölçek k₀ = 0,9996 — 3° dilime göre her iki değer ~%0,04 küçük çıkar
    const utm6 = (lat, lon) => {
      const z = Math.floor((lon + 180) / 6) + 1, c = 6 * z - 183;
      const [e, n] = tmForward(lat, lon, c, ELL.grs80, 0.9996);
      return { label: `WGS84 UTM 6° sağa / yukarı (dilim ${z})`, value: `${e.toFixed(2)} , ${n.toFixed(2)}` };
    };
    if (s.conv.sys === 'DMS') {
      const lat = dms(s.conv.e) || parseFloat(String(s.conv.e).replace(',', '.'));
      const lon = dms(s.conv.n) || parseFloat(String(s.conv.n).replace(',', '.'));
      // Enlem ±90, boylam ±180 dışındaki değer derece olamaz: büyük sayılar çoğunlukla ITRF96/ED50 “sağa / yukarı” (metre) değeridir
      const dereceDisi = isFinite(lat) && isFinite(lon) && (Math.abs(lat) > 90 || Math.abs(lon) > 180);
      if (dereceDisi) {
        out = [{ label: 'Sonuç', value: '—' }];
        note = Math.abs(lat) > 1000 || Math.abs(lon) > 1000
          ? 'Girdiğiniz değerler derece değil, metre (sağa / yukarı) gibi görünüyor. ITRF96-3° ya da ED50 3° sekmesini seçin; bu sekme yalnız enlem ve boylam alır (örnek: 39.1462 ve 34.1583).'
          : 'Enlem −90…90, boylam −180…180 arasında olmalı.';
      } else if (isFinite(lat) && isFinite(lon)) {
        const [ei, ni] = tmForward(lat, lon, cmv, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cmv);
        convLL = [lat, lon];
        out = [
          { label: 'WGS84 ondalık derece', value: `${lat.toFixed(6)} , ${lon.toFixed(6)}` },
          { label: 'ITRF96-3° sağa / yukarı', value: `${ei.toFixed(2)} , ${ni.toFixed(2)}` },
          utm6(lat, lon),
          { label: 'ED50 3° sağa / yukarı', value: `${e50.toFixed(2)} , ${n50.toFixed(2)}` },
          { label: 'Derece-dakika-saniye', value: `${toDms(lat, true)} ${toDms(lon, false)}` }
        ];
        note = 'Google Maps’te bir noktaya sağ tıklayıp koordinatı kopyaladığınızda bu biçim gelir — olduğu gibi yapıştırın. Ondalık derece (39.146200, 34.158300) de kabul edilir.';
      } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Google’dan kopyaladığınız koordinatı yapıştırın: 39°08\'46.3"N ve 34°09\'29.9"E, ya da ondalık 39.146200 ve 34.158300.'; }
    } else if (isFinite(ce) && isFinite(cn)) {
      if (s.conv.sys === 'UTM6') {
        // Kırşehir 6° dilim 36'dadır (30°–36° D, orta meridyen 33°); sonuçlar il sınırı içinde 3° dilim 11 ya da 12'ye çevrilir
        const [lat, lon] = tmInverse(ce, cn, 33, ELL.grs80, 0.9996);
        const cm3 = lon < 34.5 ? 33 : 36, dilim3 = cm3 === 33 ? 11 : 12;
        const [ei, ni] = tmForward(lat, lon, cm3, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cm3);
        convLL = [lat, lon];
        out = [{ label: 'WGS84 enlem / boylam', value: `${lat.toFixed(6)}° , ${lon.toFixed(6)}°` },
          { label: `ITRF96-3° sağa / yukarı (dilim ${dilim3})`, value: `${ei.toFixed(2)} , ${ni.toFixed(2)}` },
          { label: 'Derece-dakika-saniye (Google)', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          { label: 'ED50 3° sağa / yukarı', value: `${e50.toFixed(2)} , ${n50.toFixed(2)}` },
          { label: 'Orta meridyen', value: '33° D · k₀ = 0,9996 (UTM dilim 36)' }];
        note = 'WGS84 UTM 6° → ITRF96-3°: aynı datum, yalnız dilim ve ölçek farkı (k₀ 0,9996 → 1). Sağa değeri 500000’den uzaklaştıkça fark büyür.';
      } else if (s.conv.sys === 'ITRF96') {
        const [lat, lon] = tmInverse(ce, cn, cmv, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cmv);
        convLL = [lat, lon];
        out = [{ label: 'WGS84 enlem / boylam', value: `${lat.toFixed(6)}° , ${lon.toFixed(6)}°` },
          utm6(lat, lon),
          { label: 'Derece-dakika-saniye (Google)', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          { label: 'ED50 3° sağa / yukarı', value: `${e50.toFixed(2)} , ${n50.toFixed(2)}` },
          { label: 'Orta meridyen', value: `${cmv}° D · k₀ = 1` }];
        note = 'ITRF96 → WGS84 yalnızca ters Transverse Mercator; datum hatası yok. ED50 çıktısı ülke geneli 3 parametreli Helmert ile (2–5 m artık hata).';
      } else {
        const [lat, lon] = ed50GridToWgs(ce, cn, cmv);
        const [ei, ni] = tmForward(lat, lon, cmv, ELL.grs80);
        convLL = [lat, lon];
        out = [{ label: 'ITRF96-3° sağa / yukarı', value: `${ei.toFixed(2)} , ${ni.toFixed(2)}` },
          { label: 'WGS84 enlem / boylam', value: `${lat.toFixed(6)}° , ${lon.toFixed(6)}°` },
          utm6(lat, lon),
          { label: 'Derece-dakika-saniye (Google)', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          { label: 'Kayma', value: `ΔX ${SHIFT[0]} · ΔY ${SHIFT[1]} · ΔZ ${SHIFT[2]} m` }];
        note = 'ED50 → ITRF96 gerçek datum dönüşümü: Hayford 1924 elipsoidinden GRS80’e Helmert kayması.';
      }
      if (yerDegisti) note = 'Sağa ve yukarı değerleri yer değiştirmiş görünüyordu — sağa (Y) küçük, yukarı (X) büyük sayıdır; düzeltilerek hesaplandı. ' + note;
      if (!(convLL[0] > BBOX.s && convLL[0] < BBOX.n && convLL[1] > BBOX.w && convLL[1] < BBOX.e))
        note = 'Bu koordinat il sınırının dışına düşüyor — dilim 11 mi 12 mi? ' + note;
    } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Sağa ve yukarı değerlerini girin.'; }
