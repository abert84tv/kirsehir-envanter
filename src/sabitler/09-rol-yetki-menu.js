const ROLE_ORDER = [
  ['yonetici', 'Yönetici', 'Tüm yetkiler — rol dağıtımı dâhil'],
  ['mudur', 'Müdür', 'Arıza ve iş emrinin son onayı ile kapatılması, düzeltme, silme, rapor; kullanıcı yönetimi hariç'],
  ['muhendis', 'Mühendis', 'Envanteri kurar ve düzenler, rapor alır; arıza, iş emri ve stok işleri yoktur — gerekirse Ayarlar › Yetkiler’den verilir'],
  ['operator', 'Operatör', 'Talepleri alır, işleri ve ekipleri atar, ambardan ekibe malzeme verir; iade edilen işi yeniden atar'],
  ['sef', 'Saha Şefi', 'Sahadaki ekibi yönetir, işi tamamlayıp onaya gönderir, kullanılan malzemeyi düşer'],
  ['personel', 'Saha Personeli', 'Sahada iş görür: güncelleme, fotoğraf, arıza kaydı, kendi ekibinin malzemesi']
];
const ROLE_LABEL = Object.fromEntries(ROLE_ORDER.map(r => [r[0], r[1]]));
// Hesaplar yalnızca veritabanında; programın içinde gömülü kullanıcı ve şifre
// yok. Çevrimdışıyken bu cihazda daha önce doğrulanmış hesaplar girebilir.
const ALL_ROLES = ROLE_ORDER.map(r => r[0]);
const PERMS = [
  ['gor', 'Envanteri ve haritayı görüntüleme', ALL_ROLES],
  ['foto', 'Fotoğraf ekleme', ALL_ROLES],
  ['arizaAc', 'Arıza kaydı açma', ALL_ROLES],
  ['write', 'Kayıt bilgisi güncelleme', ['yonetici', 'mudur', 'muhendis', 'operator', 'sef', 'personel']],
  ['create', 'Yeni tesis kaydı açma', ['yonetici', 'mudur', 'muhendis']],
  ['assign', 'Ekip atama ve iş emri açma', ['yonetici', 'mudur', 'operator']],
  ['talepYonet', 'Talep ve başvuru yönetimi (kayıt, sınıflandırma, arızaya çevirme)', ['yonetici', 'mudur', 'operator']],
  ['close', 'Arıza ve iş emrinin son onayı / kapatılması (saha işi onaya gönderir)', ['yonetici', 'mudur']],
  ['rapor', 'Rapor ve veri dışa aktarma', ['yonetici', 'mudur', 'muhendis']],
  // Stok / ambar (görevler ayrılığı): işlemi yapan, düzeltmeyi yapan ve katalogu yöneten kişiler farklıdır
  ['stokGiris', 'Stok: ambara mal alımı girme', ['yonetici', 'operator']],
  ['stokZimmet', 'Stok: ekibe malzeme verme ve zimmet iadesi alma', ['yonetici', 'operator']],
  ['stokSarf', 'Stok: sahada kullanılan malzemeyi düşme (saha personeli yalnız kendi ekibi)', ['yonetici', 'mudur', 'operator', 'sef', 'personel']],
  ['stokDuzelt', 'Stok: hurda ve ambar düzeltmesi (kayıp, sayım farkı)', ['yonetici', 'mudur']],
  ['stokKatalog', 'Stok: malzeme tanımlama, fiyat ve kritik eşik', ['yonetici', 'mudur']],
  ['stokSiparis', 'Stok: sipariş listesini yönetme', ['yonetici', 'mudur', 'operator']],
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