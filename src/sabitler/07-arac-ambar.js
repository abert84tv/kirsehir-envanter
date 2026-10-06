const ARAC_TUR = {
  kamyon: { ad: 'Kamyon', birim: 'km', plaka: true },
  kamyonet: { ad: 'Kamyonet', birim: 'km', plaka: true },
  vinc: { ad: 'Vinç', birim: 'km', plaka: true },
  kepce: { ad: 'Kepçe / ekskavatör', birim: 'saat', plaka: true },
  sondaj: { ad: 'Sondaj makinesi', birim: 'saat', plaka: false },
  jenerator: { ad: 'Jeneratör', birim: 'saat', plaka: false },
  kompresor: { ad: 'Kompresör', birim: 'saat', plaka: false },
  pompa: { ad: 'Seyyar pompa', birim: 'saat', plaka: false }
};
const ARAC_DURUM = {
  musait: 'Müsait', gorevde: 'Görevde', bakimda: 'Bakımda', arizali: 'Arızalı', disi: 'Hizmet dışı'
};
const IS_EMRI_DURUM = {
  acik: 'Açık', atandi: 'Atandı', sahada: 'Sahada', tamamlandi: 'Tamamlandı',
  kapatildi: 'Kapatıldı', iptal: 'İptal'
};
const ARAC_BASLANGIC = [
  { id: 'ar1', ad: 'Su tankeri', tur: 'kamyon', plaka: '40 AK 001', yil: '2018', sayac: '184000', muayene: '2027-03-01' },
  { id: 'ar2', ad: 'Arıza aracı', tur: 'kamyonet', plaka: '40 AB 112', yil: '2021', sayac: '96500', muayene: '2026-11-15' },
  { id: 'ar3', ad: 'Sepetli vinç', tur: 'vinc', plaka: '40 AV 044', yil: '2016', sayac: '212300', muayene: '2026-10-05' },
  { id: 'ar4', ad: 'Kepçe', tur: 'kepce', plaka: '40 AK 205', yil: '2019', sayac: '7400', muayene: '2027-01-20' },
  { id: 'ar5', ad: 'Sondaj makinesi', tur: 'sondaj', plaka: '', yil: '2014', sayac: '11800', muayene: '' },
  { id: 'ar6', ad: 'Seyyar jeneratör', tur: 'jenerator', plaka: '', yil: '2020', sayac: '3200', muayene: '' }
];
const AMBARLAR = ['Merkez ambar', 'Kaman ambarı', 'Mucur ambarı', 'Çiçekdağı ambarı'];
const HAREKET_AD = {
  giris: 'Ambar girişi', cikis: 'Ambar çıkışı', zimmet: 'Ekibe zimmet',
  iade: 'Zimmet iadesi', sarf: 'Sahada sarf', hurda: 'Hurda'
};
// Kritik eşik: bu değerin altına düşen kalem kırmızı yazılır
const KRITIK_ESIK = { adet: 2, boy: 4, metre: 50, kutu: 2 };
// Başlangıç ekipleri. Liste sabit değil: Ayarlar > Ekipler bölümünden
// eklenir, adı değişir, silinir. Ad değişince eski kayıtlar da güncellenir.