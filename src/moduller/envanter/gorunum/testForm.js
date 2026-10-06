      testForm: {
        open: !!s.testForm,
        statik: s.testForm ? s.testForm.statik : '', dinamik: s.testForm ? s.testForm.dinamik : '',
        debi: s.testForm ? s.testForm.debi : '', sure: s.testForm ? s.testForm.sure : '',
        toparlanma: s.testForm ? s.testForm.toparlanma : '', note: s.testForm ? s.testForm.note : '',
        dusum: (() => {
          const f = s.testForm; if (!f) return '—';
          const d = Math.abs(parseFloat(f.dinamik) - parseFloat(f.statik));
          return isFinite(d) && d > 0 ? d.toFixed(1) + ' m' : '—';
        })(),
        ozgul: (() => {
          const f = s.testForm; if (!f) return '—';
          const d = Math.abs(parseFloat(f.dinamik) - parseFloat(f.statik)), q = parseFloat(f.debi);
          return isFinite(d) && d > 0 && isFinite(q) ? (q / d).toFixed(2) + ' l/s/m' : '—';
        })(),
        warn: (() => {
          const f = s.testForm; if (!f) return '';
          const a = parseFloat(f.statik), b = parseFloat(f.dinamik);
          return isFinite(a) && isFinite(b) && b < a ? 'Dinamik seviye statikten sığ girildi — düşüm mutlak değer olarak alındı, alanları kontrol edin.' : '';
        })(),
        hasWarn: (() => {
          const f = s.testForm; if (!f) return false;
          const a = parseFloat(f.statik), b = parseFloat(f.dinamik);
          return isFinite(a) && isFinite(b) && b < a;
        })()
      },