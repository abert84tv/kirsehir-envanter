const ROLE_ORDER = [
  ['yonetici', 'Yönetici', 'Sistem sahibi: kullanıcı, rol ve ayar yönetimi; rapor, silme ve son onay. Günlük iş açma/atama yapmaz (gerekirse kendine yetki verir)'],
  ['mudur', 'Müdür', 'Son onay: arıza, iş emri ve malzeme isteklerini onaylar, geri gönderir ya da iptal eder; hurda/ambar düzeltmesi, katalog, rapor, silme; kendi vekâletini atar'],
  ['muhendis', 'Mühendis', 'Bölgesindeki envanteri kurar ve düzenler, hat çizer, rapor alır; arıza yönetimi ve stok yoktur — gerekirse Ayarlar › Yetkiler’den verilir'],
  ['operator', 'Operatör', 'Talepleri alır, işleri ve ekipleri atar, malzeme isteği açar, ambardan ekibe verir; sahadan gelen işe ön onay verir ya da sahaya iade eder'],
  ['sef', 'Saha Şefi', 'Ekip şefi: sahadaki işi yürütür, arıza ve iş emri içeriğini düzenler, fotoğraf, bilgi, not ve sesli kayıt ekler, işi tamamlayıp onaya gönderir. Ambar/stok bağlantısı yoktur'],
  ['izleyici', 'İzleyici', 'Yalnız görür: envanter, harita ve sahadaki ekiplerin çalıştığı yerler. Hiçbir işlem yapamaz']
];
const ROLE_LABEL = Object.fromEntries(ROLE_ORDER.map(r => [r[0], r[1]]));
// Hesaplar yalnızca veritabanında; programın içinde gömülü kullanıcı ve şifre
// yok. Çevrimdışıyken bu cihazda daha önce doğrulanmış hesaplar girebilir.
const ALL_ROLES = ROLE_ORDER.map(r => r[0]);
const ISLEM_ROLLERI = ALL_ROLES.filter(r => r !== 'izleyici');   // izleyici yalnız görür
const PERMS = [
  ['gor', 'Envanteri ve haritayı görüntüleme', ALL_ROLES],
  ['foto', 'Fotoğraf, not ve sesli kayıt ekleme', ISLEM_ROLLERI],
  ['arizaAc', 'Arıza kaydı açma', ISLEM_ROLLERI],
  ['write', 'Kayıt bilgisi güncelleme', ['yonetici', 'mudur', 'muhendis', 'operator', 'sef', 'personel']],
  ['create', 'Yeni tesis kaydı açma', ['yonetici', 'mudur', 'muhendis']],
  // Doğrudan ekleyip silemeyen saha ekibi (örn. elektrik şefi) tesis ÖNERİR: ilçe/bölge mühendisi ön onay verir, müdür son onayla uygular. Yetki kişiye Ayarlar › Yetkiler'den verilir.
  ['tesisOner', 'Tesis ekleme/silme önerme (mühendis ön onayı + müdür son onayı ile uygulanır)', []],
  // İş açan/atayan ≠ ön onaylayan ≠ son onaylayan (görevler ayrılığı): yönetici ve müdür bu işleri açmaz, onaylar
  ['assign', 'Ekip atama ve iş emri açma', ['operator']],
  ['talepYonet', 'Talep ve başvuru yönetimi (kayıt, sınıflandırma, arızaya çevirme)', ['operator']],
  ['onOnay', 'Ön onay: sahadan gelen işi inceleyip müdür onayına gönderme ya da sahaya iade etme', ['operator']],
  ['close', 'Son onay: arıza ve iş emrini kapatma, iptal, yeniden açma; müdür onayındaki işi iade etme', ['yonetici', 'mudur']],
  ['rapor', 'Rapor ve veri dışa aktarma', ['yonetici', 'mudur', 'muhendis']],
  // Stok / ambar
  ['stokGiris', 'Stok: ambara mal alımı girme', ['operator']],
  ['stokZimmet', 'Stok: müdürün onayladığı isteğe göre ekibe malzeme verme, zimmet iadesi alma', ['operator']],
  ['stokSarf', 'Stok: sahada kullanılan malzemeyi ambar kaydından düşme (arıza kapanışında müdür/operatör)', ['yonetici', 'mudur', 'operator']],
  ['stokDuzelt', 'Stok: hurda ve ambar düzeltmesi (kayıp, sayım farkı)', ['yonetici', 'mudur']],
  ['stokKatalog', 'Stok: malzeme tanımlama, fiyat ve kritik eşik', ['yonetici', 'mudur']],
  ['stokSiparis', 'Stok: malzeme isteği açma (alım ve ekibe çıkış)', ['operator']],
  ['stokSiparisOnay', 'Stok: malzeme isteğini (alım ve ekibe çıkış) onaylama', ['yonetici', 'mudur']],
  ['sil', 'Kayıt silme / arşivleme', ['yonetici', 'mudur']],
  ['admin', 'Kullanıcı, rol ve cihaz yönetimi', ['yonetici']]
];
const CAN = Object.fromEntries(PERMS.map(([k, , roles]) => [k, roles]));
// Menü grupları — on üç sayfa dört başlık altında toplanır.
// Sıra kullanım sıklığına göre: günlük iş üstte, sistem işleri altta.
// Hat Kesiti (kesit) sahada kullanılan bir ölçüm aracı — "Çözümleme" (rapor/
// analiz) altında değil, diğer saha araçlarıyla (Envanter, İşler) birlikte
// durur. 2026.09.15'te taşındı: kullanıcı geri bildirimi, gruplamanın
// kafa karıştırdığı yönündeydi.
// İki ayrı iş zincirine göre gruplanır: "Saha işleri" talepten malzeme
// düşümüne kadar birbirine bağlı zincir (talep→triyaj→iş emri→ekip/araç
// atama→saha→kanıt→stok); "Envanter" tesis kaydı + hat güzergâhı zinciri.
// Böylece "stok nerede, envanter nerede" ayrımı menüde de net olur.
const MENU_GRUP = [
  ['Saha işleri', ['isler', 'kaynaklar']],
  ['Envanter', ['envanter']],
  ['Çözümleme', ['ozet']],
  ['Sistem', ['ayarlar']]
];
// Menüdeki sayfaların tam sırası — grup başlıkları bunun üstüne oturur
const MENU_SIRA = ['envanter', 'isler', 'kaynaklar', 'ozet', 'ayarlar'];
// Ayarlar tek liste: satıra dokununca o bölüm açılır, geri ile listeye dönülür.
// Başlıklar listeyi üç kümeye ayırır ama her bölüm kendi ekranında durur.
// 2026.09.30: "Ortak veritabanı ve eşitleme" tek satırda senkronizasyon +
// köy geocoding + arıza bildirimi/SMS + yeni tesis kısayolu + dışa aktarım
// kısayolu gibi altı ayrı konu birikmişti (kullanıcı geri bildirimi — "bir
// sürü açıklama, bir sürü iç içe menü"). Her biri kendi satırına ayrıldı;
// "Saha araçları" grubu bu ayrışmadan doğdu. Üst çubuktaki tekrar eden
// haplar da kaldırıldı (bkz. sayfaBar) — artık tek erişim yolu bu liste.
const AYAR_LISTE = [
  ['Ekip', [
    ['ekip', 'Ekipler', 'Hangi ekipte kim var, hangi araç, vardiya'],
    ['personel', 'Personel', 'Kişiler, yetkinlik, izin ve nöbet']
  ]],
  ['Bağlantılar ve uyarılar', [
    ['uyari', 'Başvuru uyarısı ve Telegram', 'Yeni başvuruda ses, bildirim ve Telegram botu'],
    ['bildirim', 'Ekip mesajları', 'Ekibe ve şefe SMS/mesaj gönderimi'],
    ['konum', 'Ekip konumu', 'Araç takip (Arvento) ve zimmetli cihazlar'],
    ['yapayzeka', 'Yapay zekâ', 'Gelen talebi önceden sınıflandırma']
  ]],
  ['Kullanıcılar ve güvenlik', [
    ['yetki', 'Yetkiler ve kullanıcılar', 'Kim neyi görebilir, kim değiştirebilir'],
    ['vekalet', 'Müdür vekâleti', 'Müdür izindeyken onay yetkisini bir mühendise devredin'],
    ['kvkk', 'KVKK ve saklama', 'Kişisel veri saklama süreleri'],
    ['denetim', 'Denetim izi', 'Kim neyi ne zaman değiştirdi']
  ]],
  ['Veri', [
    ['veri', 'Sürüm ve senkronizasyon', 'Sunucu bağlantısı, bekleyen kayıtlar, program sürümü'],
    ['yerlesim', 'Köy ve yerleşim listesi', 'Nüfus, hayvan varlığı, yerleşim adları'],
    ['koyeslestir', 'Kayıt araçları', 'Köy adı eşleştirme, yeni tesis kurma'],
    ['aktarim', 'Dış veri aktarımı', 'KML/KMZ, Excel/CSV, Sheets, GPX içe alma'],
    ['cop', 'Çöp kutusu', 'Silinen kayıtlar 30 gün burada bekler']
  ]],
  ['Program', [
    ['gorunum', 'Harita ve görünüm', 'Zemin, tema, menü yerleşimi'],
    ['modul', 'Modüller', 'Kullanılmayan bölümleri kapatın']
  ]]
];
// Ayrı sekmesi olan bölümler listeden o sekmeye götürür; yetki üçüncü
// sütun SUZGEC_TANIM'daki karşılığıyla birebir aynı olmalı (aksi hâlde
// yanlış izinle erişim açılır) — bkz. AYAR_TAB_YETKI.
const AYAR_TAB = { denetim: 'denetim', cop: 'cop', yerlesim: 'yerlesim', aktarim: 'aktarim' };
const AYAR_TAB_YETKI = { denetim: 'ayarlar', cop: 'ayarlar', yerlesim: 'yerlesim', aktarim: 'aktarim' };
// Eski kimlikler (bir önceki üç gruplu düzen ve daha eskisi) listeye düşer.
// "bildirim" artık kendi gerçek bölümü olduğu için buradan kaldırıldı —
// eskiden 'veri'ye yönlendiriyordu, şimdi doğrudan kendi bölümüne gider.
const AYAR_ESKI = {
  entegrasyon: 'uyari', kurum: 'yetki', program: 'gorunum',
  yetki: 'yetki', ekip: 'ekip', kvkk: 'kvkk', veri: 'veri',
  gorunum: 'gorunum', modul: 'modul'
};
const AYAR_BOLUMLER = AYAR_LISTE.flatMap(([, r]) => r);
const ayarBolumu = id => {
  if (!id) return null;
  const d = AYAR_ESKI[id] || id;
  return AYAR_BOLUMLER.some(([bid]) => bid === d) ? d : null;
};
// Ayar sayfası yalnız ilgili modül açıksa görünür (anahtarlardan biri açıksa yeter); boş liste = her zaman
const AYAR_MODUL = {
  ekip: ['ariza', 'arac'], personel: ['ariza', 'arac'], konum: ['ariza', 'arac'], bildirim: ['ariza'],
  uyari: ['talep'], yapayzeka: ['talep'], kvkk: ['talep']
};
const ayarGorunur = (id, modul) => !AYAR_MODUL[id] || AYAR_MODUL[id].some(k => (modul || {})[k] !== false);
// Masaüstünde Ayarlar iki sütundur (solda bölüm listesi, sağda içerik): hiçbir bölüm seçili değilse ilki açılır.
// Telefonda liste tek başına açılır, bölüm seçilince tam ekran olur.
const ayarAcik = s => ayarBolumu(s.ayarBolum) || (s.device === 'phone' ? null : (ayarGorunur('ekip', s.modul) ? 'ekip' : 'yetki'));
const ayarAdi = id => (AYAR_BOLUMLER.find(([bid]) => bid === id) || [, 'Ayarlar'])[1];
// Eşitleme mesajlarında geçen modül adları
const MODUL_ADI = {
  ekip: 'Ekip', personel: 'Personel', nobet: 'Nöbet takvimi',
  ambar: 'Ambar', arac: 'Araç', talep: 'Talep', muhtar: 'Muhtarlar',
  malzeme: 'Malzeme kataloğu', siparis: 'Sipariş listesi', modul: 'Modül ayarları'
};
// Sunucudaki modül anahtarı → programdaki durum alanı. Yükleme, yazma ve
// kuyruk gönderme aynı eşlemeyi kullanır (önceden üç ayrı yerde elle
// yazılıydı; muhtar bunlardan ikisinde unutulmuştu).
const MODUL_ALAN = {
  ekip: 'ekipler', personel: 'personel', nobet: 'nobet', ambar: 'ambar', arac: 'arac',
  talep: 'talepler', muhtar: 'muhtarlar', malzeme: 'malzemeKatalog', siparis: 'siparis',
  // Modül anahtarları kurum ayarıdır (2026.10.01'e kadar yalnız cihazda duruyordu)
  modul: 'modul'
};
// Telefonun alt çubuğunda en çok dört sayfa durur; gerisi "Tümü" sayfasında.