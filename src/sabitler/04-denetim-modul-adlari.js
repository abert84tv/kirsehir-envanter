const DENETIM_SINIF = {
  kayit: 'Kayıt', ariza: 'Arıza', ambar: 'Ambar', bakim: 'Bakım',
  ayar: 'Ayar', kullanici: 'Kullanıcı', oturum: 'Oturum', veri: 'Veri', talep: 'Talep',
  bildirim: 'Bildirim'
};
const DENETIM_SINIR = 3000;
const MODUL_AD = {
  ariza: 'Arıza ve iş emri', bakim: 'Periyodik bakım', sure: 'Hedef süre',
  kanit: 'Kanıt zorunluluğu', onay: 'Merkez onayı', ambar: 'Ambar ve zimmet',
  arac: 'Araç ve ekipman', talep: 'Dış talep'
};
// Dış talep: köyden gelen ihbar ve istek. Arıza kaydından ayrıdır —
// her talep arızaya dönüşmez, ama dönüşenin izi kalır.