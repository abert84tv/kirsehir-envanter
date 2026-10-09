  // ── Toplu veri girişi: kuyu/depo bilgilerini Excel (CSV) şablonunda doldurup tek seferde yükleme
  // Şablon mevcut değerlerle gelir; yüklemede yalnız DOLU hücreler yazılır (boş hücre eskisini silmez).
  topluAlanlar(tur) {
    const out = [];
    for (const [, alanlar] of (ALANLAR[tur] || [])) for (const [k, label, unit, tip] of alanlar) if (tip !== 'evet') out.push({ k, label: label + (unit ? ' (' + unit + ')' : ''), tip });
    return out;
  }
  topluSablon(tur) {
    const A = (this.state.assets || []).filter(a => a.type === tur).sort((x, y) => String(x.code).localeCompare(String(y.code)));
    if (!A.length) return this.say('Bu türde kayıt yok.');
    const alanlar = this.topluAlanlar(tur);
    const bas = ['Kod', 'İlçe (değiştirilmez)', 'Köy'].concat(alanlar.map(x => x.label));
    const out = [bas.map(x => this.csvKac(x)).join(';')];
    for (const a of A) {
      const d = a.d || {};
      out.push([a.code, a.district || '', a.village || ''].concat(alanlar.map(x => x.k === 'year' ? (a.year || '') : (d[x.k] === undefined || d[x.k] === null || d[x.k] === '—' ? '' : d[x.k]))).map(x => this.csvKac(x)).join(';'));
    }
    this.dosyaIndir('kirsehir-' + (TYPES[tur].label || tur).toLowerCase() + '-bilgi-sablonu-' + new Date().toISOString().slice(0, 10) + '.csv', '\ufeff' + out.join('\r\n'), 'text/csv;charset=utf-8');
    this.duyur(A.length + ' kayıtlı şablon indirildi. Excel’de açıp doldurun, kaydedin (CSV ya da Excel olarak) ve “Doldurulmuş dosyayı yükle” ile geri verin.', 9000, 'iyi');
  }
  topluSatirlar(metin) {
    const ayrac = [';', '\t', ','].find(a => metin.split(/\r?\n/)[0].split(a).length > 2) || ';';
    const rows = []; let satir = [], hucre = '', tirnak = false;
    for (let i = 0; i < metin.length; i++) {
      const c = metin[i];
      if (tirnak) { if (c === '"') { if (metin[i + 1] === '"') { hucre += '"'; i++; } else tirnak = false; } else hucre += c; }
      else if (c === '"') tirnak = true;
      else if (c === ayrac) { satir.push(hucre); hucre = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && metin[i + 1] === '\n') i++; satir.push(hucre); hucre = ''; if (satir.some(x => x.trim() !== '')) rows.push(satir); satir = []; }
      else hucre += c;
    }
    satir.push(hucre); if (satir.some(x => x.trim() !== '')) rows.push(satir);
    return rows;
  }
  async topluOku(dosya) {
    if (/\.xlsx?$/i.test(dosya.name)) {
      if (!window.XLSX) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = './vendor/xlsx.mini.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('Excel okuyucu yüklenemedi')); document.head.appendChild(sc); });
      const wb = window.XLSX.read(new Uint8Array(await dosya.arrayBuffer()), { type: 'array' });
      return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).filter(r => r.some(x => String(x).trim() !== '')).map(r => r.map(x => String(x)));
    }
    return this.topluSatirlar((await dosya.text()).replace(/^\ufeff/, ''));
  }
  topluYukle() {
    let inp = this._topluInput;
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.txt,.xlsx,.xls'; inp.style.cssText = 'position:fixed;left:-9999px;opacity:0'; document.body.appendChild(inp); this._topluInput = inp; }
    inp.value = '';
    inp.onchange = async () => { const f = inp.files && inp.files[0]; if (f) await this.topluIsle(f); };
    inp.click();
  }
  async topluIsle(dosya) {
    const M = this._sb;
    if (!M || !M.tokenOku() || this.state.offline) return this.say('Toplu giriş için sunucu bağlantısı gerekir.', true);
    let rows;
    try { rows = await this.topluOku(dosya); } catch (e) { return this.say('Dosya okunamadı: ' + e.message, true); }
    if (rows.length < 2) return this.say('Dosyada veri satırı yok.', true);
    // başlık → alan: etiketten (birim parantezi atılarak) ya da alan adından
    const sade = x => norm(String(x).replace(/\(.*?\)/g, '').trim());
    const harita = {};
    for (const tur of Object.keys(ALANLAR)) for (const al of this.topluAlanlar(tur)) { harita[sade(al.label)] = harita[sade(al.label)] || {}; harita[sade(al.label)][tur] = al.k; harita[norm(al.k)] = harita[norm(al.k)] || {}; harita[norm(al.k)][tur] = al.k; }
    const bas = rows[0].map(sade);
    const iKod = bas.findIndex(h => h === 'kod' || h === 'code');
    if (iKod < 0) return this.say('Başlık satırında “Kod” sütunu bulunamadı — indirdiğiniz şablonu kullanın.', true);
    const iKoy = bas.findIndex(h => h === 'koy');
    const sutun = bas.map((h, i) => (i === iKod || i === iKoy || /^ilce/.test(h)) ? null : (harita[h] || null));
    const degisim = [], yok = [];
    let alanSay = 0;
    for (const r of rows.slice(1)) {
      const kod = String(r[iKod] || '').trim().toUpperCase();
      if (!kod) continue;
      const a = (this.state.assets || []).find(x => String(x.code).toUpperCase() === kod);
      if (!a || a.dbId == null) { yok.push(kod); continue; }
      if (!this.yazabilir(a)) continue;
      const d = { ...(a.d || {}) }; let year = a.year, village = a.village, n = 0;
      sutun.forEach((m, i) => {
        if (!m || !m[a.type]) return;
        const k = m[a.type], v = String(r[i] == null ? '' : r[i]).trim();
        if (v === '' || v === '—') return;
        if (k === 'year') { const y = parseInt(v.replace(/[^0-9]/g, ''), 10); if (y && y !== a.year) { year = y; n++; } }
        else if (String(d[k] == null ? '' : d[k]) !== v) { d[k] = v; n++; }
      });
      if (iKoy >= 0) { const kv = String(r[iKoy] || '').trim(); if (kv && kv !== (a.village || '')) { village = kv; d.koyElle = true; d.koyOtomatik = ''; n++; } }
      if (n) { degisim.push({ a, yeni: { ...a, year, village, d } }); alanSay += n; }
    }
    if (!degisim.length) return this.say('Güncellenecek değişiklik yok' + (yok.length ? ' (' + yok.length + ' kod kayıtlarda bulunamadı)' : '') + '.', true);
    if (!window.confirm(degisim.length + ' kayıtta toplam ' + alanSay + ' alan güncellenecek.' + (yok.length ? '\n\nKayıtlarda bulunamayan kod: ' + yok.length + ' (' + yok.slice(0, 4).join(', ') + (yok.length > 4 ? '…' : '') + ') — atlanacak.' : '') + '\n\nBoş bıraktığınız hücreler mevcut bilgiyi silmez.\n\nDevam edilsin mi?')) return;
    let ok = 0, hata = '';
    for (let i = 0; i < degisim.length; i++) {
      const { a, yeni } = degisim[i];
      let r; try { r = await M.tesisKaydet(yeni); } catch (e) { r = { ok: false, cevrimdisi: true }; }
      if (r && r.ok) { ok++; this.iz(a.id, 'Alanlar toplu girişle güncellendi', 'Excel/CSV dosyasından'); }
      else { hata = (r && r.err) || 'bağlantı kesildi'; if (r && r.cevrimdisi) break; }
      if ((i + 1) % 25 === 0) this.say((i + 1) + ' / ' + degisim.length + ' kayıt yazıldı…', true);
    }
    await this.veriYenile(true);
    this.denetimYaz('veri', 'Toplu veri girişi', ok + ' kayıt, ' + alanSay + ' alan (' + dosya.name + ')', 'Kayıt araçları');
    this.duyur(ok + ' kayıt güncellendi' + (hata ? ' · durdu: ' + hata : '') + '.', 8000, hata ? 'kotu' : 'iyi');
  }
  // ── Tam yedek: tesisler (bütün alanlarıyla), saha notları, arızalar, ekipler — tek JSON dosyası
  yedekIndir() {
    const s = this.state, me = s.session || {};
    const yedek = {
      uygulama: 'Kırşehir Envanter', surum: SURUM, tarih: new Date().toISOString(), alan: me.name || '',
      not: 'Fotoğraflar bu dosyada yoktur (yalnız sayıları); fotoğraflar sunucuda saklanır.',
      tesisler: (s.assets || []).map(a => ({ kod: a.code, tur: a.type, durum: a.status, ilce: a.district, koy: a.village || '', lat: a.lat, lon: a.lon, yapimYili: a.year || null, barkod: a.barkod || '', direkBarkod: a.direkBarkod || '', fotografSayisi: a.photos || 0, bilgiler: a.d || {} })),
      sahaNotlari: Object.entries(s.notes || {}).map(([id, not]) => { const a = (s.assets || []).find(x => x.id === id); return { kod: a ? a.code : id, not }; }).filter(x => x.not),
      arizalar: (s.faults || []).map(f => ({ no: f.no, tur: f.type, oncelik: f.priority, durum: f.status, ekip: f.crew, tesis: ((s.assets || []).find(x => x.id === f.assetId) || {}).code || '', acildi: f.opened, kapandi: f.closed, aciklama: f.desc })),
      ekipler: s.ekipler || []
    };
    this.dosyaIndir('kirsehir-envanter-yedek-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(yedek, null, 1), 'application/json');
    this.duyur('Yedek indirildi: ' + yedek.tesisler.length + ' tesis, ' + yedek.arizalar.length + ' arıza, ' + yedek.sahaNotlari.length + ' saha notu.', 7000, 'iyi');
  }
