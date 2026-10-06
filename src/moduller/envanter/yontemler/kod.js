  // Kod şeması: KS-<TÜR>-0001. Her tür kendi içinde sayılır ve daima
  // kullanılmayan EN KÜÇÜK sıra verilir; şemaya uymayan eski kodlar sayıyı şişirmez.
  // Şemaya uymayan kodları (tür başına 1..N aralığının dışındaki numaralar,
  // eski toplam-sayaç kalıntıları) boş sıralara çeker. Yalnızca boş numaralara
  // taşındığı için kod tekilliği bozulmaz.
  kodOnarPlan() {
    const plan = [];
    // Çöp kutusundaki kayıtlar veritabanında duruyor ve kodları hâlâ rezerve:
    // geri getirilebilsinler diye o numaralar boş sayılmaz.
    const copKod = new Set((this.state.cop || [])
      .filter(r => r.tur !== 'foto')
      .map(r => String(r.kod || '').trim().toUpperCase()));
    for (const t of ['kuyu', 'depo', 'ag', 'ges']) {
      const on = 'KS-' + TYPES[t].pre + '-';
      const ayni = (this.state.assets || []).filter(a => a.type === t);
      const dolu = new Set();
      for (const k of copKod) {
        if (!k.startsWith(on)) continue;
        const mc = k.slice(on.length).match(/^(\d{1,6})$/);
        if (mc) dolu.add(parseInt(mc[1], 10));
      }
      // Yalnız şemaya uymayan ya da aynı türde tekrarlanan kod "bozuk" sayılır.
      // 2026.10.01'e kadar numarası kayıt sayısından büyük her kod da bozuk
      // sayılıyordu: silinmiş kayıt boşluk bırakınca en yeni tesisin kodu
      // sessizce eski bir numaraya kayıyor (basılı barkod geçersizleşir), çöpteki
      // kodla çakışınca da her 30 sn'de sunucuya yazıp denetim izine satır
      // ekliyordu. Geçerli kod artık asla değiştirilmez.
      const bozuk = [];
      for (const a of ayni) {
        const kod = String(a.code || '').trim().toUpperCase();
        const m2 = kod.startsWith(on) ? kod.slice(on.length).match(/^(\d{1,6})$/) : null;
        const n = m2 ? parseInt(m2[1], 10) : 0;
        if (n >= 1 && !dolu.has(n)) dolu.add(n);
        else bozuk.push(a);
      }

      // Onarılan kod boşluğa değil sıranın sonuna gider: silinmiş bir tesisin
      // numarası başka tesise geçmesin (geçmiş ve etiketler karışmasın)
      let sira = dolu.size ? Math.max(...dolu) : 0;
      for (const a of bozuk) {
        sira++;
        dolu.add(sira);
        plan.push({ asset: a, eski: a.code, yeni: on + String(sira).padStart(4, '0') });
      }
    }
    return plan;
  }
  async kodOnarUygula(sessiz) {
    const plan = this.kodOnarPlan();
    if (!plan.length) return;
    if (!sessiz && !window.confirm(plan.length + ' kaydın kodu şemaya çekilecek. Barkod etiketleri de yeni koda göre üretilir — basılı etiketler varsa yenilenmesi gerekir. Onaylıyor musunuz?')) return;
    const M = this._sb;
    const sunucu = M && M.tokenOku() && !this.state.offline;
    let yazilan = 0, hata = '';
    for (const p of plan) {
      let yeni = { ...p.asset, code: p.yeni, barkod: 'BK-' + p.yeni.slice(3) };
      if (sunucu && p.asset.dbId) {
        // Kod veritabanında tekil: beklenmedik bir çakışmada (çöp kutusunda ya
        // da başka cihazda tutulan numara) sıradaki boş numara denenir.
        const on = p.yeni.slice(0, p.yeni.length - 4);
        let sira = parseInt(p.yeni.slice(-4), 10), r = null;
        for (let deneme = 0; deneme < 40; deneme++) {
          r = await M.tesisKaydet(yeni);
          if (r.ok) break;
          if (!/duplicate key|tesis_kod_key|unique/i.test(String(r.err || ''))) break;
          sira++;
          const kod = on + String(sira).padStart(4, '0');
          yeni = { ...p.asset, code: kod, barkod: 'BK-' + kod.slice(3) };
        }
        if (!r || !r.ok) { if (!hata) hata = (r && r.err) || 'Sunucuya yazılamadı.'; continue; }
        p.yeni = yeni.code;
      }
      this.setState(st => ({ assets: st.assets.map(x => x.id === p.asset.id ? yeni : x) }));
      this.iz(p.asset.id, 'Kod şemaya çekildi', p.eski + ' → ' + p.yeni);
      yazilan++;
    }
    this.yerelTesisYaz((this.state.assets || []).filter(x => x && !x.dbId));
    this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults });
    if (!yazilan && !hata) return;
    this.duyur(hata
      ? yazilan + ' kod düzeltildi, kalanlar yazılamadı: ' + hata
      : yazilan + ' kaydın kodu şemaya çekildi (' + plan.map(p => p.eski + ' → ' + p.yeni).slice(0, 4).join(', ')
        + (plan.length > 4 ? ' …' : '') + '). Barkod etiketleri yeni koda göre yenilendi.',
      9000, hata ? 'kotu' : 'iyi');
  }
  // Şemaya uymayan kod kalmasın: veri her yüklendiğinde bir kez denetlenir.
  // Sunucuya yazılmamış yerel kayıtlar kendiliğinden düzeltilir; sunucudaki
  // kayıtlar barkod bağı olduğu için onay ister (Ayarlar → Kod şemasını onar).
  kodDenetle() {
    if (this._kodOnarimda) return;
    const plan = this.kodOnarPlan();
    if (!plan.length) return;
    // Şemaya uymayan kod bırakılmaz: veri her yüklendiğinde kendiliğinden onarılır
    this._kodOnarimda = true;
    this.kodOnarUygula(true).finally(() => { this._kodOnarimda = false; });
  }
  kodSira(type, liste) {
    const on = 'KS-' + TYPES[type].pre + '-';
    const dolu = new Set();
    for (const a of (liste || [])) {
      const kod = String((a && a.code) || '').trim().toUpperCase();
      if (!kod.startsWith(on)) continue;
      const m2 = kod.slice(on.length).match(/^(\d{1,6})$/);
      if (m2) dolu.add(parseInt(m2[1], 10));
    }
    // Silinmiş bir tesisin numarası yeni tesise verilmez — sıradaki numara
    // en büyüğün bir fazlası (sunucu da çöp kutusuyla çakışmayı ayrıca çözer)
    return dolu.size ? Math.max(...dolu) + 1 : 1;
  }
  siradakiKod(type, ekListe) {
    const liste = (ekListe || []).concat(this.state.assets || []);
    return 'KS-' + TYPES[type].pre + '-' + String(this.kodSira(type, liste)).padStart(4, '0');
  }