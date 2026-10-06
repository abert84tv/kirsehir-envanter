      arzKontrol: arzKontrol,
      faults: arzSatir.map(f => {
        const a = s.assets.find(x => x.id === f.assetId) || {};
        return {
          no: f.no, assetCode: a.code || (f.koy ? f.koy + ' (şebeke)' : '—'), type: f.type, priority: f.priority,
          status: STATUS_LABEL[f.status], crew: f.crew, opened: f.opened,
          sureVar: sureOn,
          sure: (() => {
            if (!sureOn) return '';
            const d = this.sureDurum(f);
            return d ? d.hedef + ' · ' + d.etiket : '—';
          })(),
          sureFg: (() => {
            if (!sureOn) return ui.mut;
            const d = this.sureDurum(f);
            return d && d.gecikti ? ui.acc : (d && d.yaklasti ? ui.fg : ui.mut);
          })(),
          pBg: f.priority === 'Acil' ? ui.pend : 'transparent',
          pFg: priColor(f.priority), pBorder: priColor(f.priority),
          rowBg: ff && ff.id === f.id ? ui.sel : 'transparent',
          tap: () => this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...f } })
        };
      }),
      faultSummary: (me && me.role === 'personel'
        ? `${me.crew} · size atanan ${myFaults.length} kayıt`
        : `${openF.length} açık · ${s.faults.filter(f => f.status === 'cozuldu').length} çözüldü`),
      faultStats: [
        { n: myFaults.filter(f => f.status === 'acik').length, label: 'Açık', color: 'var(--color-accent)' },
        { n: myFaults.filter(f => f.status === 'atandi').length, label: 'Atandı', color: ui.fg },
        { n: myFaults.filter(f => f.status === 'sahada').length, label: 'Sahada', color: ui.fg },
        { n: myFaults.filter(f => f.status === 'cozuldu').length, label: 'Çözüldü', color: ui.mut }
      ],
      newFault: () => {
        if (!canCreateFault) return this.say(arizaOn ? 'Bu rol arıza kaydı açamaz.' : 'Arıza modülü pasif.');
        // Telefonda seçili tesis yoksa tesis boş başlar: listenin ilk kaydı
        // kendiliğinden seçili geliyordu, sahada fark edilmeden yanlış tesise
        // arıza açılabilirdi
        const a = sel || (s.device === 'phone' ? null : s.assets[0]);
        this.setState({ panel: 'ariza', tab: s.device === 'phone' ? s.tab : 'ariza', faultForm: { id: null, malzeme: [], sesler: [], iscilik: '', isaret: null, assetId: a ? a.id : null, type: FAULT_TYPES[a ? a.type : 'kuyu'][0], priority: 'Yüksek', status: 'acik', crew: canAssign ? CREWS[0] : (me && me.crew) || CREWS[0], note: '', hours: '', photos: [], iseEmri: s.device === 'phone' && canAssign ? true : undefined } });
      },
      // Açık arıza varken doğrudan yeni kayıt açılmaz: mükerrer kaydı önlemek
      // için önce var olan sorulur.
      newFaultForAsset: () => {
        if (!sel) return;
        const acikOlan = s.faults.filter(f => f.assetId === sel.id && !KAPALI_DURUM.includes(f.status) && f.status !== 'iptal');
        if (acikOlan.length) {
          const f = acikOlan[0];
          const devam = window.confirm(sel.code + ' kaydında açık arıza var:\n\n'
            + f.no + ' · ' + f.type + ' · ' + (STATUS_LABEL[f.status] || f.status) + ' · ' + f.crew
            + '\n\nTAMAM: bu kaydı açar. İPTAL: ayrı bir arıza kaydı açar.');
          if (devam) return this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...f } });
        }
        this.setState({ panel: 'ariza', faultForm: { id: null, malzeme: [], sesler: [], iscilik: '', isaret: null, assetId: sel.id, type: FAULT_TYPES[sel.type][0], priority: 'Normal', status: 'acik', crew: CREWS[0], note: '', photos: [] } });
      },
      assetOptions: (() => {
        // 264 kaydın tamamını <select>'e basmak telefonu kilitliyordu — en yakın 40 kayıt
        const secili = ff && ff.assetId;
        // Talepten geliyorsa talebin köyüne, konum alınmışsa cihaza, yoksa il
        // merkezine en yakın 40 tesis
        const ref = (ff && ff.talepNokta) || s.benimKonum;
        const uzak = ref ? (a => this.mesafeM(ref, a)) : (a => this.distKm(a));
        const yakin = [...s.assets].filter(a => isFinite(a.lat)).sort((x, y) => uzak(x) - uzak(y)).slice(0, 40);
        if (secili && !yakin.some(a => a.id === secili)) {
          const a = s.assets.find(x => x.id === secili);
          if (a) yakin.unshift(a);
        }
        return yakin.map(a => ({ id: a.id, label: `${a.code} · ${TYPES[a.type].label} · ${this.yerGoster(a)}` }));
      })(),
      crews: CREWS,