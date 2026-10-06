const TALEP_KANAL = {
  telefon: 'Telefon', whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'SMS', dilekce: 'Dilekçe',
  sahsen: 'Şahsen', eposta: 'E-posta', cimer: 'CİMER / BİMER', web: 'Web formu'
};
const TALEP_SIFAT = { muhtar: 'Muhtar', vatandas: 'Vatandaş', kurum: 'Kurum', personel: 'Personel' };
const TALEP_KONU = [
  'Susuzluk / su gelmiyor', 'Su kesintisi', 'Su bulanık / kirli', 'Boru patlağı — kaçak',
  'Depo taşması', 'Elektrik kesintisi', 'Yeni kuyu / depo isteği', 'Şebeke genişletme isteği',
  'Sayaç / abonelik', 'Şikâyet', 'Bilgi isteği', 'Diğer'
];
const TALEP_DURUM = {
  yeni: 'Yeni', incelemede: 'İncelemede', arizaya: 'Arızaya dönüştürüldü',
  cozuldu: 'Çözüldü', red: 'Karşılanamaz'
};
const TALEP_KAPALI = ['cozuldu', 'red', 'arizaya'];
const TALEP_ONCELIK = ['Acil', 'Yüksek', 'Normal', 'Düşük'];
// İş beklemeye alınırken seçilen neden — bekleme süresi SLA hedefinden düşülür
const BEKLEME_NEDEN = ['Dış kurum bekleniyor (elektrik dağıtım, karayolları…)', 'Malzeme bekleniyor',
  'Hava ya da yol koşulu', 'Abone / muhtar bekleniyor', 'Diğer'];

// KVKK — saklama süreleri. Gün cinsinden; 0 = süresiz sakla.
// Kurumun kendi politikasına göre Ayarlar > KVKK bölümünden değişir.