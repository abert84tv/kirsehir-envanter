const SURUM = '2026.10.10-163';
const STD_LOC = { lat: 39.1462, lon: 34.1583 };
const SES_KEY = 'ks-envanter-oturum';
const FOTO_NIYET = 'ks-foto-niyet';
const VKEY = 'ks-envanter-koy-konum';
const STATUS_LABEL = {
  acik: 'Açık', atandi: 'Atandı', sahada: 'Sahada', bilgi: 'Bilgi bekliyor',
  bekleme: 'Beklemede', yonlendirildi: 'Yönlendirildi', kontrol: 'Kontrolde',
  yeniden: 'Yeniden açıldı', cozuldu: 'Çözüldü', iptal: 'İptal'
};
// Kapanmış sayılan durumlar — açık iş sayımları ve süre hesabı bunları atlar
const KAPALI_DURUM = ['cozuldu', 'iptal'];
// Tesis aktifliği: sunucu enum'u aktif | ariza | pasif — pasif dışındakiler hizmette sayılır
const AKTIF_LABEL = { aktif: 'Aktif', pasif: 'Pasif', ariza: 'Arızalı' };
const aktifMi = a => !!a && a.status !== 'pasif';
const aktifAd = a => AKTIF_LABEL[(a && a.status) || 'aktif'] || 'Aktif';
const norm = s => String(s).toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
  .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/i̇/g, 'i');
const nkey = s => norm(String(s || '').trim().replace(/\s+/g, ' ')
  .replace(/\s*[\(\[].*?[\)\]]\s*$/, '')
  .replace(/\s+(köyü|köy|beldesi|belde|mahallesi|mah\.?|mh\.?)$/i, ''))
  .replace(/[^a-z0-9]/g, '')
  .replace(/(koyu|koy)$/, (x, _y, o) => o >= 4 ? '' : x);
const AYIRT = ['buyuk', 'kucuk', 'asagi', 'yukari', 'orta', 'yeni', 'eski', 'dere', 'tepe'];
const ayirtEsit = (a, b) => AYIRT.every(t => a.includes(t) === b.includes(t));
const onEk = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const benzerlik = (a, b) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let onc = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, onc + (a[i - 1] === b[j - 1] ? 0 : 1));
      onc = t;
    }
  }
  return dp[b.length];
};
const ALANLAR = {
  kuyu: [
    ['Kuyu ve ölçüm', [['year', 'Yapım (sondaj) yılı', '', 'sayi'], ['derinlik', 'Kuyu derinliği', 'm', 'sayi'], ['pompaD', 'Pompa / montaj derinliği', 'm', 'sayi'], ['cap', 'Kuyu çapı', 'mm', 'sayi'], ['statik', 'Statik seviye', 'm', 'sayi'], ['dinamik', 'Dinamik seviye', 'm', 'sayi'], ['debi', 'Debi', 'L/s', 'sayi'], ['kolon', 'Kolon borusu', '', 'metin'], ['kolonCap', 'Kolon borusu çapı', 'mm', 'sayi'], ['rf', 'RF haberleşme', '', 'metin']]],
    ['Belge ve sondaj', [['ruhsat', 'DSİ ruhsat / izin no', '', 'metin'], ['sondajFirma', 'Sondaj firması', '', 'metin'], ['sondajTarih', 'Sondaj tarihi', '', 'tarih'], ['kot', 'Kuyu başı kotu', 'm', 'sayi'], ['kuyuLog', 'Kuyu logu', '', 'uzun'], ['filtre', 'Filtre aralıkları', '', 'metin'], ['cakil', 'Çakıl zarfı / şap', '', 'metin']]],
    ['Su kalitesi', [['suAnaliz', 'Su analizi sonucu', '', 'metin'], ['suAnalizTarih', 'Analiz tarihi', '', 'tarih'], ['klorDeger', 'Klor ölçümü', 'mg/L', 'metin']]],
    ['Pompa ve elektrik', [['pompaMarka', 'Pompa markası', '', 'metin'], ['pompaModel', 'Pompa modeli', '', 'metin'], ['kademe', 'Kademe', '', 'metin'], ['motor', 'Pompa gücü', 'kW', 'sayi'], ['motorSeri', 'Motor seri no', '', 'metin'], ['montajTarih', 'Montaj tarihi', '', 'tarih'], ['kablo', 'Motor kablosu', 'mm²', 'sayi'], ['kalkis', 'Kalkış tipi', '', 'metin'], ['termik', 'Termik ayar değeri', 'A', 'metin'], ['akim', 'Ölçülen akım', 'A', 'metin'], ['isletmeSaat', 'İşletme saati', 'saat', 'sayi'], ['sayac', 'Sayaç değeri', 'kWh', 'metin'], ['yedekPompa', 'Yedek pompa', '', 'metin'], ['pompaHesap', 'Pompa hesabı', '', 'metin']]],
    ['Bakım', [['bakim', 'Son bakım', '', 'tarih']]]
  ],
  depo: [
    ['Depo', [['year', 'Yapım yılı', '', 'sayi'], ['hacim', 'Hacim', 'm³', 'sayi'], ['kaynak', 'Besleyen kaynak sayısı', '', 'sayi'], ['malzeme', 'Malzeme', '', 'metin'], ['rfMod', 'RF modülü', '', 'evet']]],
    ['Klorlama ve seviye', [['klorCihaz', 'Klorlama cihazı', '', 'metin'], ['seviyeSensor', 'Seviye sensörü / telemetri', '', 'metin']]],
    ['Terfi hattı ve şebeke', [['terfiUzunluk', 'Terfi hattı uzunluğu', 'm', 'sayi'], ['terfiCap', 'Terfi hattı çapı', 'mm', 'sayi'], ['hizmetKoy', 'Hizmet ettiği yerleşim', '', 'metin'], ['nufus', 'Hizmet ettiği nüfus', '', 'sayi'], ['abone', 'Abone sayısı', '', 'sayi']]],
    ['Bakım ve güvenlik', [['temizlik', 'Son temizlik', '', 'tarih'], ['kapak', 'Kapak ve güvenlik', '', 'metin'], ['bakim', 'Son bakım', '', 'tarih']]]
  ],
  ag: [
    ['AG panosu', [['year', 'Kurulum yılı', '', 'sayi'], ['pano', 'Pano tipi', '', 'metin'], ['trafoTipi', 'Trafo tipi', '', 'metin'], ['trafo', 'Besleyen trafo', 'kVA', 'sayi'], ['sigorta', 'Ana sigorta', 'A', 'sayi'], ['brans', 'Branş sigortası', 'A', 'sayi'], ['kalkis', 'Kalkış tipi', '', 'metin'], ['klor', 'Kompanzasyon', '', 'evet'], ['bakim', 'Son bakım', '', 'tarih']]]
  ],
  ges: [
    ['GES', [['year', 'Devreye alma yılı', '', 'sayi'], ['guc', 'Kurulu güç', 'kW', 'sayi'], ['panelAdet', 'Panel adedi', '', 'sayi'], ['inverter', 'İnverter', '', 'metin'], ['baglanti', 'Bağlantı tipi', '', 'metin'], ['bakim', 'Son bakım', '', 'tarih']]]
  ]
};
const rng = seed => { let s = seed; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; };
const fmt = n => n == null ? '—' : n.toLocaleString('tr-TR');
