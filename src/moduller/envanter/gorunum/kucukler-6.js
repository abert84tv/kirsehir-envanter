      openTestForm: () => canWrite
        ? this.setState({ testForm: { statik: '', dinamik: '', debi: '', sure: '', toparlanma: '', note: '' } })
        : this.say('Bu rolde deneme ölçümü girilemez.'),
      closeTestForm: () => this.setState({ testForm: null }),
      onTestStatik: e => this.setState({ testForm: { ...this.state.testForm, statik: e.target.value } }),
      onTestDinamik: e => this.setState({ testForm: { ...this.state.testForm, dinamik: e.target.value } }),
      onTestDebi: e => this.setState({ testForm: { ...this.state.testForm, debi: e.target.value } }),
      onTestSure: e => this.setState({ testForm: { ...this.state.testForm, sure: e.target.value } }),
      onTestToparlanma: e => this.setState({ testForm: { ...this.state.testForm, toparlanma: e.target.value } }),
      onTestNote: e => this.setState({ testForm: { ...this.state.testForm, note: e.target.value } }),
      saveTest: () => {
        const f = s.testForm, id = sel && sel.id;
        if (!id) return;
        const a1 = parseFloat(f.statik), a2 = parseFloat(f.dinamik), q = parseFloat(f.debi);
        if (!isFinite(a1) || !isFinite(a2) || !isFinite(q)) return this.say('Statik, dinamik ve debi zorunlu.');
        const st = Math.min(a1, a2), dn = Math.max(a1, a2), dus = dn - st;
        const rec = {
          date: new Date().toLocaleDateString('tr-TR'), by: me ? me.name : '—',
          statik: st.toFixed(1) + ' m', dinamik: dn.toFixed(1) + ' m',
          dusum: dus > 0 ? dus.toFixed(1) + ' m' : '—',
          debi: q.toFixed(1) + ' l/s',
          sure: f.sure ? f.sure + ' saat' : '—',
          toparlanma: f.toparlanma ? f.toparlanma + ' dk' : '—',
          ozgul: dus > 0 ? (q / dus).toFixed(2) + ' l/s/m' : '—',
          note: f.note, pend: s.offline
        };
        this.setState({
          testForm: null,
          tests: { ...s.tests, [id]: [rec, ...(s.tests[id] || [])] },
          queue: [{ id: 'q' + Date.now(), title: sel.code + ' · deneme ölçümü', meta: `${rec.debi} · düşüm ${rec.dusum} · özgül ${rec.ozgul}`, state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
        });
        this.say(s.offline ? 'Deneme ölçümü cihaza yazıldı — kuyruğa alındı.' : `Deneme kaydedildi · özgül debi ${rec.ozgul}.`);
      },
      editDetail: () => {
        if (!sel) return;
        if (!canWrite) return this.say('Bu rolde kayıt düzenleme kapalı.');
        if (!this.yazabilir(sel)) return this.kilitUyar(sel);
        const d = sel.d || {};
        const bos = v => (v === '—' || v === 'Yeni kayıt' || v === undefined || v === null) ? '' : v;
        const g = { id: sel.id, year: sel.year == null ? '' : String(sel.year), ilce: sel.district || '', koy: sel.village || '', d: {} };
        for (const [, alanlar] of (ALANLAR[sel.type] || [])) {
          for (const [k] of alanlar) {
            if (k === 'year') continue;
            g.d[k] = typeof d[k] === 'boolean' ? d[k] : String(bos(d[k]));
          }
        }
        this.setState({ alanForm: g });
      },