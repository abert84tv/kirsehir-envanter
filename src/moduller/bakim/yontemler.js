  bakimPeriyot(t) { return t === 'kuyu' ? 6 : 12; }
  bakimDurum(a) {
    const p = String(a.d.bakim || '').split('.');
    const per = this.bakimPeriyot(a.type);
    if (p.length !== 3) return { gecikme: null, gun: null, label: 'Bakım kaydı yok', sev: 2, sort: -1 };
    const son = new Date(+p[2], +p[1] - 1, +p[0]);
    const hedef = new Date(son.getFullYear(), son.getMonth() + per, son.getDate());
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const gun = Math.round((hedef - bugun) / 86400000);
    return {
      gun,
      label: gun < 0 ? `${-gun} gün gecikti` : (gun <= 30 ? `${gun} gün kaldı` : `${gun} gün kaldı`),
      sev: gun < 0 ? 2 : (gun <= 30 ? 1 : 0),
      son: a.d.bakim, hedef: `${String(hedef.getDate()).padStart(2, '0')}.${String(hedef.getMonth() + 1).padStart(2, '0')}.${hedef.getFullYear()}`,
      sort: gun
    };
  }