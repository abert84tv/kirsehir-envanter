const MALZEME_BASLANGIC = [
  ['Dalgıç pompa (kademe değişimi)', 18500, 'adet', 'pompa'],
  ['Dalgıç motor', 24000, 'adet', 'pompa'],
  ['Kolon borusu Ø75 (6 m)', 2150, 'boy', 'boru'],
  ['Kolon borusu Ø90 (6 m)', 2900, 'boy', 'boru'],
  ['Motor kablosu 4×6 mm²', 285, 'metre', 'kablo'],
  ['Motor kablosu 4×10 mm²', 430, 'metre', 'kablo'],
  ['Termik röle', 1450, 'adet', 'pano'],
  ['Kontaktör', 1180, 'adet', 'pano'],
  ['Pano sigortası', 240, 'adet', 'pano'],
  ['Çekvalf', 890, 'adet', 'vana'],
  ['Küresel vana Ø75', 640, 'adet', 'vana'],
  ['Manometre', 320, 'adet', 'vana'],
  ['Klor tableti (10 kg)', 1250, 'kutu', 'sarf'],
  ['Şamandıra', 480, 'adet', 'vana'],
  ['Vinç / kamyon (kuyu çekme)', 6500, 'gün', 'hizmet'],
  ['İşçilik (ekip yevmiyesi)', 2800, 'gün', 'hizmet']
];
const MALZEME_KAT = {
  pompa: 'Pompa ve motor', boru: 'Boru ve bağlantı', kablo: 'Kablo ve elektrik',
  pano: 'Pano ve sigorta', vana: 'Vana ve armatür', sarf: 'Sarf ve diğer',
  hizmet: 'Hizmet (stokta tutulmaz)'
};
const MALZEME_BIRIM = ['adet', 'metre', 'boy', 'kutu', 'kg', 'litre', 'set', 'takım', 'rulo', 'gün'];
// Katalog kaydı: { kod, ad, kat, birim, fiyat, esik, pasif }
function katalogBaslangic() {
  return MALZEME_BASLANGIC.map(([ad, fiyat, birim, kat], i) => ({
    kod: 'MLZ-' + String(i + 1).padStart(4, '0'), ad, kat, birim, fiyat,
    esik: KRITIK_ESIK[birim] || 2, pasif: false
  }));
}
// Hizmet (gün birimli) kalemi stokta tutulmaz
const stoktaMi = k => k.kat !== 'hizmet' && k.birim !== 'gün';
// Ekip adı kayıtlarda metin olarak durur, bu yüzden sabittir. Vardiya ve
// yetkinlik Ayarlar > Ekipler bölümünden değişir, cihazda saklanır.
// Ambar: stok kalemleri malzeme listesinden gelir. Gün birimli kalemler
// (vinç, işçilik) hizmettir, stokta tutulmaz.
// Denetim izi: her satır bir sınıfa girer, süzgeç bu sınıflara göre çalışır