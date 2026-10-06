    // converter
    const ce = parseFloat(String(s.conv.e).replace(',', '.')), cn = parseFloat(String(s.conv.n).replace(',', '.')), cmv = this.cm(s.conv.zone);
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
    if (s.conv.sys === 'DMS') {
      const lat = dms(s.conv.e) || parseFloat(String(s.conv.e).replace(',', '.'));
      const lon = dms(s.conv.n) || parseFloat(String(s.conv.n).replace(',', '.'));
      if (isFinite(lat) && isFinite(lon)) {
        const [ei, ni] = tmForward(lat, lon, cmv, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cmv);
        convLL = [lat, lon];
        out = [
          { label: 'WGS84 ondalık derece', value: `${lat.toFixed(6)} , ${lon.toFixed(6)}` },
          { label: 'ITRF96-3° sağa / yukarı', value: `${ei.toFixed(2)} , ${ni.toFixed(2)}` },
          { label: 'ED50 3° sağa / yukarı', value: `${e50.toFixed(2)} , ${n50.toFixed(2)}` },
          { label: 'Derece-dakika-saniye', value: `${toDms(lat, true)} ${toDms(lon, false)}` }
        ];
        note = 'Google Maps’te bir noktaya sağ tıklayıp koordinatı kopyaladığınızda bu biçim gelir — olduğu gibi yapıştırın. Ondalık derece (39.146200, 34.158300) de kabul edilir.';
      } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Google’dan kopyaladığınız koordinatı yapıştırın: 39°08\'46.3"N ve 34°09\'29.9"E, ya da ondalık 39.146200 ve 34.158300.'; }
    } else if (isFinite(ce) && isFinite(cn)) {
      if (s.conv.sys === 'ITRF96') {
        const [lat, lon] = tmInverse(ce, cn, cmv, ELL.grs80);
        const [e50, n50] = wgsToEd50Grid(lat, lon, cmv);
        convLL = [lat, lon];
        out = [{ label: 'WGS84 enlem / boylam', value: `${lat.toFixed(6)}° , ${lon.toFixed(6)}°` },
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
          { label: 'Derece-dakika-saniye (Google)', value: `${toDms(lat, true)} ${toDms(lon, false)}` },
          { label: 'Kayma', value: `ΔX ${SHIFT[0]} · ΔY ${SHIFT[1]} · ΔZ ${SHIFT[2]} m` }];
        note = 'ED50 → ITRF96 gerçek datum dönüşümü: Hayford 1924 elipsoidinden GRS80’e Helmert kayması.';
      }
      if (!(convLL[0] > BBOX.s && convLL[0] < BBOX.n && convLL[1] > BBOX.w && convLL[1] < BBOX.e))
        note = 'Bu koordinat il sınırının dışına düşüyor — dilim 11 mi 12 mi? ' + note;
    } else { out = [{ label: 'Sonuç', value: '—' }]; note = 'Sağa ve yukarı değerlerini girin.'; }
