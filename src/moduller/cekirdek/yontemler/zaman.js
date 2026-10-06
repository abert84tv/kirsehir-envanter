  // ISO zamanı programın kullandığı gg.aa.yyyy ss:dd biçimine çevirir
  damgaCevir(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return this.damga();
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear()
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  // Bir tarihin kaç gün önce olduğunu döndürür (gg.aa.yyyy biçiminden)
  gunGecti(damga) {
    const p = String(damga || '').split(' ')[0].split('.');
    if (p.length !== 3) return null;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  // konum kaynağı etiketi tek yerden üretilir — liste ve şerit aynı metni kullanır
  // ── kayıt geçmişi: her değişiklik kim, ne zaman, nereden diye yazılır
  // Kayıt damgası. Cihaz saati yanlış ayarlıysa süre uyumu ölçümü bozulur;
  // bu yüzden girişte sunucu saatiyle arasındaki fark ölçülür ve buradan
  // düzeltilir. Çevrimdışı açılışta son bilinen fark kullanılır.
  // "GG.AA.YYYY SS:DD" → milisaniye (okunamazsa 0)
  damgaMs(str) {
    const m = String(str || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return 0;
    const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
    return isNaN(d) ? 0 : d.getTime();
  }
  // Küçük çizgi grafik (kıvılcım) — şablonda {{ }} delikli SVG tarayıcıda boş istek/
  // uyarı ürettiği için eleman burada kurulur
  kivilcim(arr, renk, w, h) {
    const W = w || 96, H = h || 34;
    const mn = Math.min(...arr), mx = Math.max(...arr), r = (mx - mn) || 1;
    const pts = arr.map((v, i) => (i * W / Math.max(1, arr.length - 1)).toFixed(1) + ',' + (H - 3 - (v - mn) / r * (H - 8)).toFixed(1)).join(' ');
    return React.createElement('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block', flex: 'none' }, 'aria-hidden': true },
      React.createElement('polyline', { points: pts, fill: 'none', stroke: renk, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1, className: 'ks-ciz' }));
  }
  damga() {
    const d = new Date(Date.now() + (this._saatFarki || 0));
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // "DD.MM.YYYY" ya da "DD.MM.YYYY HH:MM" damgasını Date'e çevirir — arıza
  // (f.opened), ambar hareketi (h.damga) ve deneme (t.date) hep bu biçimde.
  // Okunamayan damga null döner, raporlarda sessizce dışarıda bırakılır.
  tarihParse(str) {
    const p = String(str || '').split(' ')[0].split('.');
    if (p.length !== 3) return null;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    return isNaN(d) ? null : d;
  }
  // Esnek raporlama aralığı — Bugün/Hafta/Ay/Yıl/Tümü/Özel (madde 37).
  // bit her zaman ÜST SINIR HARİÇ (bir sonraki günün 00:00'ı) döner.
  zamanAraligi(mod, ozelBas, ozelBit) {
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const yarin = new Date(bugun.getTime() + 86400000);
    if (mod === 'bugun') return { bas: bugun, bit: yarin, ad: 'Bugün' };
    if (mod === 'hafta') {
      const gun = (bugun.getDay() + 6) % 7; // Pazartesi = 0
      const bas = new Date(bugun.getTime() - gun * 86400000);
      return { bas, bit: yarin, ad: 'Bu hafta' };
    }
    if (mod === 'ay') return { bas: new Date(bugun.getFullYear(), bugun.getMonth(), 1), bit: yarin, ad: 'Bu ay' };
    if (mod === 'yil') return { bas: new Date(bugun.getFullYear(), 0, 1), bit: yarin, ad: 'Bu yıl' };
    if (mod === 'ozel') {
      const bas = this.tarihParse((ozelBas || '').split('-').reverse().join('.')) || new Date(2000, 0, 1);
      const bitH = this.tarihParse((ozelBit || '').split('-').reverse().join('.'));
      const bit = bitH ? new Date(bitH.getTime() + 86400000) : yarin;
      return { bas, bit, ad: 'Özel aralık' };
    }
    return { bas: new Date(2000, 0, 1), bit: yarin, ad: 'Tümü' };
  }
  // Sunucu saatiyle cihaz saati arasındaki farkı ölçer.
  // Bir dakikadan küçük fark yok sayılır — her açılışta uyarı vermenin anlamı yok.
  async saatEsitle() {
    const M = this._sb;
    if (!M || !this.state.sunucu || this.state.offline) return;
    const t0 = Date.now();
    const r = await M.sunucuSaati();
    if (!r || !r.ok || !r.data || !r.data.ms) return;
    // Gidiş dönüş süresinin yarısı yol payı olarak düşülür
    const gecikme = (Date.now() - t0) / 2;
    const fark = Math.round(Number(r.data.ms) + gecikme - Date.now());
    this._saatFarki = Math.abs(fark) < 60000 ? 0 : fark;
    try { localStorage.setItem('ks-saat-farki', String(this._saatFarki)); } catch (e) { /* depolama kapalı */ }
    if (this._saatFarki) {
      const dk = Math.round(Math.abs(this._saatFarki) / 60000);
      this.denetimYaz('ayar', 'Cihaz saati düzeltildi',
        'Sunucuyla fark ' + dk + ' dakika (' + (fark > 0 ? 'cihaz geride' : 'cihaz ileride') + ')', 'Saat');
      this.duyur('Bu cihazın saati sunucudan ' + dk + ' dakika '
        + (fark > 0 ? 'geride' : 'ileride') + '. Kayıt zamanları düzeltiliyor — '
        + 'cihazın saatini elle de düzeltmeniz iyi olur.', 9000, 'kotu');
    }
  }