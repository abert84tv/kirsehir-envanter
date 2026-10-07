const TELEFON_SIRA = ['envanter', 'isler', 'kaynaklar', 'ozet'];
// Sayfa/süzgeç başına tek satırlık açıklama — üst çubukta başlığın altında
const SAYFA_ALT = {
  pano: 'Talepten kapanışa iş hattı — bir aşamaya tıklayınca o işler açılır.',
  gelen: 'Köyden gelen ihbar ve istekler. Gereken talep arızaya dönüşür.',
  acik: 'Açık arıza ve iş emirleri.',
  bugun: 'Bugün size ve ekibinize düşen işler.',
  planli: 'Tarihi önceden belli periyodik bakımlar.',
  liste: 'Bütün tesisler tablo olarak — başlığa basarak sırala, alt satırdan süz.',
  harita: 'Aynı kayıtlar harita üzerinde; tıklayınca kayıt açılır.',
  ekip: 'Ekiplerin yükü, personel ve araç durumu, açık işlerin haritası.',
  malzeme: 'Ambar stoğu, ekip zimmeti ve hareket dökümü.',
  arac: 'Araç, ekipman ve bunların zimmeti.',
  telemetri: 'Sensör ve PLC verileri, alarmlar ve eşik kuralları.',
  ozet: 'İlçe dağılımı, eksik bilgi, ekip ve arıza özetleri.',
  kesit: 'Hat boyunca yükseklik kesiti.',
  denetim: 'Kim neyi ne zaman değiştirdi — silinemeyen kayıt.',
  cop: 'Silinen kayıtlar burada bekler; 30 gün içinde geri alınır.',
  ayarlar: 'Kurum, veri ve program ayarları.',
  yerlesim: 'Köy konumlarının elle düzeltilmesi.',
  aktarim: 'Dosyadan içe alma ve dışa aktarma.'
};
// Sol menüdeki sayfalar — kullanıcı bazında yetki verilebilen birimler
const SAYFALAR = [['harita', 'Harita'], ['envanter', 'Envanter'], ['ariza', 'Arıza'],
  ['gunluk', 'Bugün'], ['talep', 'Talep'], ['bakim', 'Bakım'], ['ambar', 'Ambar'], ['arac', 'Araç'], ['ozet', 'Özet'], ['profil', 'Hat Kesiti'],
  ['yerlesim', 'Yerleşim'], ['kuyruk', 'Kuyruk'], ['aktarim', 'Aktarım'], ['ayarlar', 'Ayarlar']];
const YETKI_SEC = [['tam', 'Tam'], ['gor', 'Görür'], ['yok', 'Yok']];
// ── Süzgeç haritası ──────────────────────────────────────────────
// Menü birleşmesinden sonraki altı sayfa ve içindeki süzgeçler. Her süzgeç
// bugünkü sayfa yetkisini MİRAS ALIR: yetki tablosu ve kullanıcı kayıtları
// hiç değişmez, yalnızca yetkinin nereye uygulandığı değişir. Talebi görme
// yetkisi olmayan kullanıcı, İşler sayfası açıksa Gelen süzgecini görmez.
// Üçüncü sütun: yetkinin okunduğu bugünkü sayfa kimliği.
const SUZGEC_TANIM = {
  // "Genel bakış" (operasyon panosu) kendi yetki anahtarı yok — arıza
  // yetkisinden miras alır, sekmesi isPano (2026.10).
  isler: [['kanban', 'İş panosu', 'ariza', 'isPanosu'], ['pano', 'Genel bakış', 'ariza', 'isPano'], ['gelen', 'Gelen', 'talep'], ['acik', 'Açık', 'ariza'],
    ['bugun', 'Bana atanan', 'gunluk'], ['planli', 'Periyodik bakım', 'bakim']],
  // Hat kesiti Envanter'in üçüncü görünümü: aynı harita, aynı katmanlar (2026.10.06)
  envanter: [['harita', 'Harita', 'harita'], ['kesit', 'Hat kesiti', 'profil'], ['liste', 'Liste', 'envanter']],
  // "Ekipler" (ekip ve araç panosu) araç yetkisinden miras alır, sekmesi ekipPano
  kaynaklar: [['ekip', 'Ekipler', 'arac', 'ekipPano'], ['malzeme', 'Stok', 'ambar'], ['arac', 'Araç', 'arac'],
    ['telemetri', 'Telemetri', 'ozet', 'telemetri']],
  // Denetim izi ve Çöp kutusu buradan Ayarlar'a taşındı (2026.09.15) — ikisi
  // de zaten Ayarlar > Veri bölümünde ayrıca listeleniyordu (AYAR_LISTE),
  // Özet'in altında ikinci bir yoldan erişilebilir olmaları kafa karıştırıyordu
  // ve "Özet" (rapor/gösterge) ile de konu olarak örtüşmüyordu. Yetkileri
  // hâlâ Ayarlar yetkisinden miras alınıyor (üçüncü sütun) — bu hiç değişmedi.
  ozet: [['ozet', 'Özet', 'ozet']],
  ayarlar: [['ayarlar', 'Ayarlar', 'ayarlar'], ['yerlesim', 'Köy konumları', 'yerlesim'],
    ['aktarim', 'İçe ve dışa aktarım', 'aktarim'],
    ['denetim', 'Denetim izi', 'ayarlar', 'denetim'], ['cop', 'Çöp kutusu', 'ayarlar', 'cop']]
};
// Kuyruk sayfa olmaktan çıkıp üst çubukta göstergeye dönüşür; yetkisi kalır.
const SUZGEC_GOSTERGE = [['kuyruk', 'Bekleyen kayıt', 'kuyruk']];
// Bugünkü sayfa kimliğinin yeni sayfa ve süzgeç karşılığı. Birleşme
// tamamlanana kadar program eski kimlikleri kullanır; geçişi bu tablo taşır.
const SUZGEC_ESKI = (() => {
  const m = {};
  for (const sayfa in SUZGEC_TANIM)
    for (const [sid, , eski, hedef] of SUZGEC_TANIM[sayfa])
      if (!m[hedef || eski]) m[hedef || eski] = { sayfa, suzgec: sid };
  for (const [sid, , eski] of SUZGEC_GOSTERGE) m[eski] = { sayfa: 'gosterge', suzgec: sid };
  return m;
})();
// Birleşmeden sonraki sayfa adları
const SUZGEC_SAYFA_AD = {
  isler: 'İşler', envanter: 'Envanter', kaynaklar: 'Ekip, Araç, Ambar',
  ozet: 'Özet', kesit: 'Hat Kesiti', ayarlar: 'Ayarlar', gosterge: 'Üst çubuk'
};
// Eski sayfa kimliğinin bugünkü süzgeç adı — "Sayfa yetkileri" panelinde
// kullanıcıya "talep"/"gunluk"/"bakim" gibi artık görünmeyen eski isimler
// yerine menüde gördüğü gerçek süzgeç adı (Gelen/Bana atanan/Planlı...) gösterilsin diye.
const SUZGEC_ESKI_AD = Object.fromEntries(SAYFALAR.map(([sid, label]) => {
  const grp = SUZGEC_ESKI[sid];
  if (!grp) return [sid, label];
  const t = (SUZGEC_TANIM[grp.sayfa] || SUZGEC_GOSTERGE).find(x => x[0] === grp.suzgec);
  return [sid, t ? t[1] : label];
}));
// "Sayfa yetkileri" panelini artık menüdeki altı grupla aynı sırada göstermek
// için eski 14 sayfa kimliği, süzgeç haritasındaki grubuna göre toplanır.
const SAYFA_GRUPLARI = ['isler', 'envanter', 'kaynaklar', 'ozet', 'ayarlar', 'gosterge']
  .map(sayfa => ({
    ad: SUZGEC_SAYFA_AD[sayfa],
    uyeler: SAYFALAR.filter(([sid]) => SUZGEC_ESKI[sid] && SUZGEC_ESKI[sid].sayfa === sayfa)
  }))
  .filter(g => g.uyeler.length);
// Kişiye özel istisna verilebilen yetkiler — silme ve kullanıcı yönetimi role bağlı kalır
const ISTISNA_DISI = ['sil', 'admin', 'gor'];
// Sürüm damgası: yayına alınan kopyanın hangi sürüm olduğu programdan
// görülebilsin — tarayıcı eski dosyayı önbellekten açtığında fark edilir.