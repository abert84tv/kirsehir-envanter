const SAKLAMA_TANIM = [
  { k: 'foto', ad: 'Arıza ve tesis fotoğrafları', gun: 1825,
    not: 'Yapılan işin kanıtı. Beş yıl, tesis ömrü boyunca dava ve denetim için yeterli.' },
  { k: 'ses', ad: 'Sesli saha notları', gun: 365,
    not: 'Kişinin sesi kişisel veridir. Yazıya geçirildikten sonra tutulmasına gerek kalmaz.' },
  { k: 'konum', ad: 'Personel konum kaydı', gun: 90,
    not: 'Kaydı kimin nereden girdiği. Üç ay, denetim için yeterli, izleme aracına dönüşmez.' },
  { k: 'talep', ad: 'Talep sahibinin adı ve telefonu', gun: 730,
    not: 'Geri dönüş ve tekrar başvuru eşleştirmesi için. Süre sonunda talep kalır, kişi bilgisi silinir.' },
  { k: 'denetim', ad: 'Denetim izi', gun: 3650,
    not: 'Kim ne yaptı kaydı. On yıl, Sayıştay denetim süresini karşılar.' }
];
const SAKLAMA_SECENEK = [
  { gun: 90, ad: '3 ay' }, { gun: 180, ad: '6 ay' }, { gun: 365, ad: '1 yıl' },
  { gun: 730, ad: '2 yıl' }, { gun: 1825, ad: '5 yıl' }, { gun: 3650, ad: '10 yıl' },
  { gun: 0, ad: 'Süresiz' }
];
// Araç ve ekipman: plakalı araçlar km, plakasız ekipman motor saati sayar