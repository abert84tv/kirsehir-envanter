  // Malzeme kataloğu: yeni kalem ya da düzenleme
  malzemeKaydet(f) {
    if (!f) return;
    const ad = String(f.ad || '').trim().replace(/\s+/g, ' ');
    if (ad.length < 2) return this.duyur('Malzeme adını yazın.', 4000, 'kotu');
    // "18.500,50" ve "18.500" Türkçe yazımdır (nokta binlik ayırıcı); "18500.5" de kabul
    const fh = String(f.fiyat ?? '').trim().replace(/\s|₺/g, '');
    const fiyat = parseFloat(fh.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(fh)
      ? fh.replace(/\./g, '').replace(',', '.') : fh);
    if (f.fiyat !== '' && f.fiyat != null && (!isFinite(fiyat) || fiyat < 0)) return this.duyur('Fiyat sayı olmalı.', 4000, 'kotu');
    const esik = parseFloat(String(f.esik || '').replace(',', '.'));
    if (f.esik !== '' && f.esik != null && (!isFinite(esik) || esik < 0)) return this.duyur('Kritik eşik sayı olmalı.', 4000, 'kotu');
    const liste = this.katalog().map(k => ({ ...k }));
    const ayni = liste.find(k => sadeMetin(k.ad) === sadeMetin(ad) && k.kod !== f.kod);
    if (ayni) return this.duyur('“' + ayni.ad + '” zaten katalogda (' + ayni.kod + ').', 6000, 'kotu');
    const eski = f.kod ? liste.find(k => k.kod === f.kod) : null;
    if (eski && eski.ad !== ad && this.malzemeHareketli(eski.ad)) {
      return this.duyur('“' + eski.ad + '” için ambar hareketi var; adı değiştirilemez (mevcut ve zimmet ada göre tutulur). Yeni ad için yeni malzeme tanımlayın.', 9000, 'kotu');
    }
    const kayit = {
      kod: eski ? eski.kod : this.malzemeKodSira(liste),
      ad, kat: MALZEME_KAT[f.kat] ? f.kat : 'sarf',
      birim: MALZEME_BIRIM.includes(f.birim) ? f.birim : 'adet',
      fiyat: isFinite(fiyat) ? Math.round(fiyat * 100) / 100 : 0,
      esik: isFinite(esik) ? esik : (KRITIK_ESIK[f.birim] || 2),
      pasif: false
    };
    if (eski) {
      if (eski.birim !== kayit.birim && this.malzemeHareketli(eski.ad)) {
        return this.duyur('Hareketi olan malzemenin birimi değiştirilemez — miktarlar yanlış okunur.', 7000, 'kotu');
      }
      Object.assign(eski, kayit);
    } else liste.push(kayit);
    this.modulYaz('malzeme', liste);
    this.denetimYaz('ambar', eski ? 'Malzeme düzenlendi' : 'Malzeme tanımlandı',
      kayit.kod + ' · ' + kayit.ad + ' · ' + this.tl(kayit.fiyat) + ' / ' + kayit.birim, 'Katalog');
    this.setState({ malzemeKatalog: liste, malzemeForm: null, ambarKart: kayit.ad },
      () => this.duyur(kayit.kod + ' · ' + kayit.ad + (eski ? ' güncellendi.' : ' kataloğa eklendi.'), 5000, 'iyi'));
  }
  malzemeHareketli(ad) {
    const a = this.state.ambar || {};
    return this.ambarToplam(ad) > 0 || this.ambarZimmetToplam(ad) > 0
      || (a.hareket || []).some(h => h.malzeme === ad)
      || (this.state.ambarKuyruk || []).some(h => h.malzeme === ad);
  }
  malzemeKodSira(liste) {
    const n = liste.map(k => +(String(k.kod).match(/^MLZ-(\d+)$/) || [])[1] || 0);
    return 'MLZ-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(4, '0');
  }
  // Pasife alınan kalem listelerden düşer ama silinmez: eski hareket ve
  // raporlar onu adıyla göstermeye devam eder.
  malzemePasif(kod, pasif) {
    const liste = this.katalog().map(k => ({ ...k }));
    const k = liste.find(x => x.kod === kod);
    if (!k) return;
    if (pasif && (this.ambarToplam(k.ad) > 0 || this.ambarZimmetToplam(k.ad) > 0)) {
      return this.duyur(k.ad + ' ambarda ya da zimmette duruyor — önce çıkış/iade yapın.', 7000, 'kotu');
    }
    k.pasif = !!pasif;
    this.modulYaz('malzeme', liste);
    this.denetimYaz('ambar', pasif ? 'Malzeme pasife alındı' : 'Malzeme yeniden etkin', k.kod + ' · ' + k.ad, 'Katalog');
    this.setState({ malzemeKatalog: liste, ambarKart: pasif ? null : k.ad },
      () => this.duyur(k.ad + (pasif ? ' pasife alındı; listelerde görünmez, eski kayıtlar korunur.' : ' yeniden etkin.'), 6000, 'iyi'));
  }