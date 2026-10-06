  ambarMevcut(malzeme, ambar) {
    return Number((((this.state.ambar || {}).stok || {})[ambar] || {})[malzeme]) || 0;
  }
  ambarZimmet(malzeme, ekip) {
    return Number((((this.state.ambar || {}).zimmet || {})[ekip] || {})[malzeme]) || 0;
  }
  // Bütün ekiplerdeki zimmet. Ekip listesine değil zimmet tablosuna bakar:
  // adı değişmiş ya da silinmiş ekibin üstündeki malzeme de sayılır.
  ambarZimmetToplam(malzeme, ambarObj) {
    const z = (ambarObj || this.state.ambar || {}).zimmet || {};
    return Object.keys(z).reduce((t, c) => t + (Number((z[c] || {})[malzeme]) || 0), 0);
  }
  ambarToplam(malzeme, ambarObj) {
    const st = (ambarObj || this.state.ambar || {}).stok || {};
    return Object.keys(st).reduce((t, A) => t + (Number((st[A] || {})[malzeme]) || 0), 0);
  }
  katalog() {
    const k = this.state.malzemeKatalog;
    return Array.isArray(k) && k.length ? k : katalogBaslangic();
  }
  katalogBul(ad) { return this.katalog().find(k => k.ad === ad) || null; }
  // Bir kalemin ambar durumu. Kritik: ambara girilmiş (ya da zimmette)
  // kalemin ambar mevcudu eşiğe inmiş ya da son 30 günün hızıyla 7 günden
  // az yetecek. Hiç girilmemiş kalem "azaldı" sayılmaz, ambarda yok demektir.
  ambarDurum(ad) {
    const k = this.katalogBul(ad) || {};
    const toplam = this.ambarToplam(ad);
    const zim = this.ambarZimmetToplam(ad);
    const esik = Number(k.esik) || KRITIK_ESIK[k.birim] || 2;
    const tuk = this.ambarTuketim(ad);
    const kacGun = tuk.ort > 0 ? toplam / tuk.ort : null;
    // Son 30 günde çıkışı olup tamamen biten kalem de kritiktir (tükendi)
    const girilmis = toplam + zim > 0 || tuk.toplam > 0;
    const kritik = girilmis && (toplam <= esik || (kacGun != null && kacGun < 7));
    return { toplam, zim, esik, tuk, kacGun, girilmis, kritik };
  }
  // Eski kodun beklediği [ad, fiyat, birim] dizisi — arıza malzeme listesi,
  // maliyet ve raporlar bunu kullanır
  stokKalem() {
    return this.katalog().filter(k => !k.pasif && stoktaMi(k)).map(k => [k.ad, Number(k.fiyat) || 0, k.birim, k.kod, k.kat, k.esik]);
  }
  // Son 30 günün net ambar çıkışı (zimmet + çıkış − iade). Sunucu her
  // hareketi gün gün "gun" altında toplar. Sistem 30 günden yeniyse ortalama
  // geçen gün sayısına bölünür, yoksa ilk haftalarda tüketim olduğundan az
  // görünürdü.
  ambarTuketim(malzeme) {
    const g = (this.state.ambar || {}).gun || {};
    const gunler = Object.keys(g).sort();
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
    const anahtar = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const seri = [];
    let toplam = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(bugun.getTime() - i * 86400000);
      const v = Number((g[anahtar(d)] || {})[malzeme]) || 0;
      toplam += v;
      if (i < 14) seri.push(Math.max(0, v));
    }
    toplam = Math.max(0, toplam);
    let gunSayi = 30;
    if (gunler.length) {
      const ilk = new Date(gunler[0] + 'T00:00:00');
      const gecen = Math.floor((bugun - ilk) / 86400000) + 1;
      if (gecen > 0 && gecen < 30) gunSayi = gecen;
    }
    // İlk hafta tek bir büyük zimmet ortalamayı şişirmesin: en az 7 güne böl
    gunSayi = Math.max(7, gunSayi);
    return { toplam, ort: toplam / gunSayi, seri };
  }
  // Stoğu azaltan hareketten sonra kritik eşiğin altındaki kalemler için
  // uyarı verir (madde 19). ambarObj işlemin uygulandığı güncel veri —
  // this.state.ambar setState sonrası hemen güncel olmayabileceği için
  // çağıran yer elindeki güncel nesneyi (yerelVeri ya da sunucu yanıtı) verir.
  ambarKritikMesaj(islemler, ambarObj) {
    const dusuren = ['zimmet', 'sarf', 'hurda'];
    const dus = [...new Set((islemler || []).filter(i => dusuren.includes(i.tur)).map(i => i.malzeme))];
    if (!dus.length || !ambarObj) return;
    const kritikler = [];
    // (Önceden burada ekran koduna ait SAHA_EKIP kullanılıyordu; metotta
    // tanımsız olduğu için uyarı hiç çıkmıyor, işlem sonu hata veriyordu.)
    for (const ad of dus) {
      const kalem = this.katalogBul(ad);
      if (!kalem) continue;
      const toplam = this.ambarToplam(ad, ambarObj);
      const zim = this.ambarZimmetToplam(ad, ambarObj);
      const esik = Number(kalem.esik) || KRITIK_ESIK[kalem.birim] || 2;
      if (toplam + zim > 0 && toplam <= esik) kritikler.push(ad + ' ' + toplam + ' ' + kalem.birim);
    }
    if (kritikler.length) {
      // Satın alma uyarısı: kritik kalem sipariş listesine kendiliğinden eklenir
      const liste = [...(this.state.siparis || [])];
      const eklenen = [];
      for (const ad of dus) {
        const kalem = this.katalogBul(ad);
        if (!kalem || liste.some(x => x.malzeme === ad)) continue;
        const toplam = this.ambarToplam(ad, ambarObj);
        const esik = Number(kalem.esik) || KRITIK_ESIK[kalem.birim] || 2;
        if (!(toplam <= esik && toplam + this.ambarZimmetToplam(ad, ambarObj) > 0)) continue;
        liste.push({ id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), malzeme: ad, adet: this.siparisOneri(ad),
          birim: kalem.birim, ekleyen: 'Otomatik (kritik stok)', damga: this.damga(), otomatik: true });
        eklenen.push(ad);
      }
      if (eklenen.length) this.siparisYaz(liste);
      setTimeout(() => this.duyur('Kritik stok seviyesi: ' + kritikler.join(', ')
        + (eklenen.length ? '. Satın alma için sipariş listesine eklendi.' : '. Ambara giriş girilmesi gerekiyor.'), 9000, 'kotu',
        () => this.setState({ tab: 'ambar' })), 600);
    }
  }