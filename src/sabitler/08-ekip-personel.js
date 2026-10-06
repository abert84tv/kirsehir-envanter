const EKIP_BASLANGIC = [
  { ad: 'Ekip 1 — Merkez', vardiya: 'Gündüz', yetkinlik: ['Elektrik', 'Mekanik'], tel: '', sefTel: '', sefId: '', bolgeler: ['Merkez'], uyeIdler: [], not: '' },
  { ad: 'Ekip 2 — Kaman', vardiya: 'Vardiyalı', yetkinlik: ['Mekanik'], tel: '', sefTel: '', sefId: '', bolgeler: ['Kaman'], uyeIdler: [], not: '' },
  { ad: 'Ekip 3 — Mucur', vardiya: 'Gündüz', yetkinlik: ['Elektrik'], tel: '', sefTel: '', sefId: '', bolgeler: ['Mucur'], uyeIdler: [], not: '' },
  { ad: 'Ekip 4 — Çiçekdağı', vardiya: 'Nöbet', yetkinlik: ['Mekanik', 'Sondaj'], tel: '', sefTel: '', sefId: '', bolgeler: ['Çiçekdağı'], uyeIdler: [], not: '' }
];
const ATANMADI = 'Atanmadı';

// Personel durumu — izinli/raporlu kişi ekip listesinde uyarı olarak görünür
const PERSONEL_DURUM = {
  aktif: 'Görevde', izin: 'İzinli', rapor: 'Raporlu', gorevli: 'Başka görevde', ayrildi: 'Ayrıldı'
};
const PERSONEL_YOK = ['izin', 'rapor', 'gorevli', 'ayrildi'];
// Günlük kayıt türleri — personel ve araç günlük defterinde ortak kullanılır (Faz 2)
const GUN_TUR_PERSONEL = { izin: 'İzin', rapor: 'Rapor', fazla_mesai: 'Fazla mesai', gorevli: 'Başka görevde' };
const GUN_TUR_ARAC = { bakim: 'Bakım', ariza: 'Arıza/tamir', gorevde: 'Sahada görevde', muayene: 'Muayene/belge' };
// Saha kanıtı aşaması — ekip işe başlamadan ve bitirdikten sonra ayrı ayrı
// fotoğraf/ses kaydı yükler (madde 10). Yeni sütun açmadan foto.aciklama
// metnine eklenir: 'Arıza kaydı · Öncesi' / '... · Sonrası'.
const ASAMA_AD = { once: 'Öncesi', sonra: 'Sonrası' };
// Vardiya takvimi: haftanın günlerinde hangi ekip nöbetçi
const GUNLER = [
  { k: 1, ad: 'Pazartesi', kisa: 'Pzt' }, { k: 2, ad: 'Salı', kisa: 'Sal' },
  { k: 3, ad: 'Çarşamba', kisa: 'Çar' }, { k: 4, ad: 'Perşembe', kisa: 'Per' },
  { k: 5, ad: 'Cuma', kisa: 'Cum' }, { k: 6, ad: 'Cumartesi', kisa: 'Cmt' },
  { k: 0, ad: 'Pazar', kisa: 'Paz' }
];

// Personel havuzu: kişiler ekipten bağımsız durur, ekibe oradan alınır.
// Meslek, yetkinlik uyarısında kullanılır.
const MESLEKLER = [
  'Elektrik teknisyeni', 'Makine teknisyeni', 'Su tesisatçısı', 'Sondaj operatörü',
  'Kaynakçı', 'İş makinesi operatörü', 'Şoför', 'Mühendis', 'Tekniker', 'Düz işçi'
];
// Meslekten gelen yetkinlik — ekip kurulunca kendiliğinden işaretlenir.
// Anahtarlar sadeleştirilerek karşılaştırılır: “elektrik teknikeri” de
// “Elektrik teknisyeni” gibi elektrik yetkinliği sayılır.
const MESLEK_YETKINLIK = {
  'Elektrik teknisyeni': 'Elektrik', 'Makine teknisyeni': 'Mekanik',
  'Su tesisatçısı': 'Mekanik', 'Sondaj operatörü': 'Sondaj', 'Kaynakçı': 'Kaynak'
};
function sadeMetin(s) {
  return String(s || '').toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}
// Serbest yazılmış meslek adını listedeki karşılığına oturtur.
// Oturmazsa metni bozmaz, olduğu gibi döndürür.
function meslekEsle(ham) {
  const t = (ham || '').trim();
  if (!t) return MESLEKLER[0];
  const q = sadeMetin(t);
  const tam = MESLEKLER.find(m => sadeMetin(m) === q);
  if (tam) return tam;
  // “elektrik teknikeri” → “Elektrik teknisyeni”: ilk kelime ortaksa eşle
  const ilk = q.replace(/(teknisyeni|teknikeri|teknik|operatoru|operator|ustasi|usta)$/, '');
  if (ilk.length > 3) {
    const yakin = MESLEKLER.find(m => sadeMetin(m).startsWith(ilk));
    if (yakin) return yakin;
  }
  return t;
}
// Yetkinlik karşılığı — büyük/küçük harf ve ek farkı gözetmez
function meslekYetkinlik(meslek) {
  const q = sadeMetin(meslekEsle(meslek));
  for (const k in MESLEK_YETKINLIK) if (sadeMetin(k) === q) return MESLEK_YETKINLIK[k];
  if (/elektrik/.test(q)) return 'Elektrik';
  if (/makine|tesisat|mekanik/.test(q)) return 'Mekanik';
  if (/sondaj/.test(q)) return 'Sondaj';
  if (/kaynak/.test(q)) return 'Kaynak';
  return null;
}
const VARDIYALAR = ['Gündüz', 'Vardiyalı', 'Nöbet', 'İzinli'];
const YETKINLIKLER = ['Elektrik', 'Mekanik', 'Sondaj', 'Kaynak'];
// Arıza türünden gereken yetkinlik: eşleşmezse form uyarı yazar, atamayı engellemez
const YETKINLIK_ESLEME = [
  [/motor|akım|elektrik|sigorta|kontaktör|kablo|pano|invert|panel|şalt|rf|sensör|klorlama|üretim/i, 'Elektrik'],
  [/pompa|kolon|kaçak|çatlak|debi|vana|kapak/i, 'Mekanik']
];