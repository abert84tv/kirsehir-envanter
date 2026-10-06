const ROLE_ORDER = [
  ['yonetici', 'Yönetici', 'Tüm yetkiler — rol dağıtımı dâhil'],
  ['mudur', 'Müdür', 'Onay, silme, rapor; kullanıcı yönetimi hariç'],
  ['muhendis', 'Mühendis', 'Envanteri kurar ve düzenler, iş atar'],
  ['sef', 'Arıza Şefi', 'Arızayı yönetir, ekip atar, kapatır'],
  ['personel', 'Arıza Personeli', 'Sahada iş görür: güncelleme, fotoğraf, arıza kaydı']
];
const ROLE_LABEL = Object.fromEntries(ROLE_ORDER.map(r => [r[0], r[1]]));
// Hesaplar yalnızca veritabanında; programın içinde gömülü kullanıcı ve şifre
// yok. Çevrimdışıyken bu cihazda daha önce doğrulanmış hesaplar girebilir.
const ALL_ROLES = ROLE_ORDER.map(r => r[0]);
const PERMS = [
  ['gor', 'Envanteri ve haritayı görüntüleme', ALL_ROLES],
  ['foto', 'Fotoğraf ekleme', ALL_ROLES],
  ['arizaAc', 'Arıza kaydı açma', ALL_ROLES],
  ['write', 'Kayıt bilgisi güncelleme', ['yonetici', 'mudur', 'muhendis', 'sef', 'personel']],
  ['create', 'Yeni tesis kaydı açma', ['yonetici', 'mudur', 'muhendis']],
  ['assign', 'Ekip atama', ['yonetici', 'mudur', 'muhendis', 'sef']],
  ['close', 'Arıza kapatma / onay', ['yonetici', 'mudur', 'sef']],
  ['rapor', 'Rapor ve veri dışa aktarma', ['yonetici', 'mudur', 'muhendis']],
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
  ['Kurum', [
    ['yetki', 'Yetkiler ve kullanıcılar', 'Kim neyi görebilir, kim değiştirebilir'],
    ['ekip', 'Ekipler ve personel', 'Vardiya, yetkinlik ve ekip listesi'],
    ['kvkk', 'KVKK ve saklama', 'Kişisel veri saklama süreleri']
  ]],
  ['Veri', [
    ['veri', 'Senkronizasyon ve sürüm', 'Sunucu bağlantısı, bekleyen kayıtlar, program sürümü'],
    ['denetim', 'Denetim izi', 'Kim neyi ne zaman değiştirdi'],
    ['cop', 'Çöp kutusu', 'Silinen kayıtlar 30 gün burada bekler']
  ]],
  ['Saha araçları', [
    ['bildirim', 'Arıza bildirimleri', 'Ekibe ve şefe SMS/mesaj gönderimi'],
    ['koyeslestir', 'Kayıt araçları', 'Köy adı eşleştirme, yeni tesis kurma'],
    ['yerlesim', 'Köy ve yerleşim listesi', 'Nüfus, hayvan varlığı, yerleşim adları'],
    ['aktarim', 'Dış veri aktarımı', 'KML/KMZ, Excel/CSV, Sheets, GPX içe alma']
  ]],
  ['Program', [
    ['gorunum', 'Harita ve görünüm', 'Zemin, tema, menü yerleşimi'],
    ['modul', 'Modüller', 'Kullanılmayan bölümleri kapatın'],
    ['entegrasyon', 'Entegrasyon', 'Yapay zekâ ve dış servis anahtarları']
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
  entegrasyon: 'entegrasyon', kurum: 'yetki', program: 'gorunum',
  yetki: 'yetki', ekip: 'ekip', kvkk: 'kvkk', veri: 'veri',
  gorunum: 'gorunum', modul: 'modul'
};
const AYAR_BOLUMLER = AYAR_LISTE.flatMap(([, r]) => r);
const ayarBolumu = id => {
  if (!id) return null;
  const d = AYAR_ESKI[id] || id;
  return AYAR_BOLUMLER.some(([bid]) => bid === d) ? d : null;
};
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