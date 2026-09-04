// İlçe merkez koordinatları: Harita Genel Müdürlüğü “HGM Yerleşim Noktası” veri seti (Lambert Conformal Conic TC1M → WGS84).
// Kırşehir idari veri seti.
// Köy listesi: kullanıcının ilettiği resmî "İlçe ve Köyleri" listesi (252 köy) — bu dosyadaki
// yazımlar o listeye göredir. Nüfus: TÜİK ADNKS. Yüzölçümü: Harita Genel Müdürlüğü.
// İlçe koordinatları gerçektir; köy koordinatı VERİ SETİNDE YOKTUR (harita OSM etiketlerini kullanır).

export const PROVINCE = {
  name: 'Kırşehir', plate: 40,
  population2025: 242777, male: 120876, female: 121901,
  areaKm2: 6584, districts: 7, municipalities: 10, mahalle: 67, villages: 252,
  source: 'TÜİK ADNKS 2025'
};

export const LIVESTOCK_NATIONAL_2024 = {
  sigir: 16824208, manda: 162051, koyun: 44080584, keci: 10822084, kumes: 384146654,
  source: 'TÜİK Hayvan Varlığı İstatistikleri, 2024'
};

export const DISTRICTS = [
  { id: 'merkez', name: 'Merkez', lat: 39.15091, lon: 34.15952, pop: 163219, popYear: 2022, areaKm2: 1719, villageCount: 53 },
  { id: 'kaman', name: 'Kaman', lat: 39.3592, lon: 33.71778, pop: 34129, popYear: 2022, areaKm2: 1284, villageCount: 50 },
  { id: 'mucur', name: 'Mucur', lat: 39.06379, lon: 34.37449, pop: 18211, popYear: 2022, areaKm2: 992, villageCount: 44 },
  { id: 'cicekdagi', name: 'Çiçekdağı', lat: 39.60333, lon: 34.41644, pop: null, popYear: null, areaKm2: null, villageCount: 45 },
  { id: 'akpinar', name: 'Akpınar', lat: 39.45014, lon: 33.96242, pop: 6893, popYear: 2022, areaKm2: 582, villageCount: 26 },
  { id: 'akcakent', name: 'Akçakent', lat: 39.62691, lon: 34.09871, pop: 3519, popYear: 2022, areaKm2: 370, villageCount: 20 },
  { id: 'boztepe', name: 'Boztepe', lat: 39.26707, lon: 34.26237, pop: 5019, popYear: 2022, areaKm2: 747, villageCount: 14 }
];

export const VILLAGES = {
  akcakent: ['Avanoğlu', 'Ayvalı', 'Derefakılı', 'Güllühüyük', 'Hacıfakılı', 'Hamzabey', 'Hasanali', 'Kilimli', 'Kösefakılı', 'Küçükabdiuşağı', 'Mahsenli', 'Ödemişli', 'Ömeruşağı', 'Polatlı', 'Solakuşağı', 'Taşlıoluk', 'Tepefakılı', 'Yaylaözü', 'Yeşildere', 'Yetikli'],
  akpinar: ['Alişar', 'Aşağıhomurlu', 'Boyalık', 'Büyükabdiuşağı', 'Çalıburnu', 'Çayözü', 'Çebişler', 'Çelebiuşağı', 'Çiftlikmehmetağa', 'Çiftliksarıkaya', 'Demirci', 'Deveci', 'Durmuşlu', 'Eldeleklidemirel', 'Eldelekliortaoba', 'Eşrefli', 'Gülveren', 'Hacımirza', 'Hacıselimli', 'Hanyerisarıkaya', 'Himmetuşağı', 'Karaova', 'Kelismailuşağı', 'Köşker', 'Pekmezci', 'Sofrazlı'],
  boztepe: ['Büyükkışla', 'Çamalak', 'Çevirme', 'Çiğdeli', 'Çimeli', 'Eskidoğanlı', 'Harmanaltı', 'Hatunoğlu', 'Hüseyinli', 'Karacaören', 'Külhüyük', 'Uzunpınar', 'Üçkuyu', 'Yenidoğanlı'],
  cicekdagi: ['Acıköy', 'Akbıyıklı', 'Alahacılı', 'Alanköy', 'Alimpınar', 'Armutlu', 'Aşağıhacıahmetli', 'Bahçepınar', 'Baraklı', 'Beşikli', 'Boğazevci', 'Bozlar', 'Büyükteflek', 'Çanakpınar', 'Çepni', 'Çiçekli', 'Çopraşık', 'Çubuktarla', 'Demirli', 'Doğankaş', 'Gölcük', 'Hacıduraklı', 'Hacıhasanlı', 'Hacıoğlu', 'Halaçlı', 'Harmanpınar', 'Haydarlı', 'İbikli', 'Kabaklı', 'Kaleevci', 'Kavaklıöz', 'Kırdök', 'Kızılcalı', 'Konurkale', 'Küçükteflek', 'Mahmutlu', 'Ortahacıahmetli', 'Pöhrenk', 'Safalı', 'Şahinoğlu', 'Tatbekirli', 'Tepecik', 'Topalali', 'Yalnızağaç', 'Yukarıhacıahmetli'],
  kaman: ['Ağapınar', 'Aydınlar', 'Başköy', 'Bayındır', 'Bayramözü', 'Benzer', 'Büğüz', 'Çadırlıhacıbayram', 'Çadırlıkörmehmet', 'Çağırkan', 'Darıözü', 'Değirmenözü', 'Demirli', 'Esentepe', 'Fakılı', 'Gökeşme', 'Gültepe', 'Hamit', 'Hirfanlı', 'İbrişim', 'İkizler', 'İmancı', 'İsahocalı', 'Kale', 'Karahabalı', 'Karakaya', 'Kargınselimağa', 'Kargınkızıközü', 'Kargınmeşe', 'Kargınyenice', 'Kekilliali', 'Meşeköy', 'Mollaosmanlar', 'Ömerhacılı', 'Ömerkahya', 'Sarıömerli', 'Savcılıbağbaşı', 'Savcılıbüyükoba', 'Savcılıebeyit', 'Savcılıkışla', 'Savcılıkurutlu', 'Savcılımeryemkaşı', 'Tatık', 'Tepeköy', 'Yağmurlusarıuşağı', 'Yazıyolu', 'Yelek', 'Yeniköy', 'Yeniyapan', 'Yukarıçiftlikli'],
  merkez: ['Akçaağıl', 'Çadırlıhacıyusuf', 'Çayağzı', 'Çuğun', 'Dedeli', 'Değirmenkaşı', 'Dulkadirli', 'Dulkadirlikaraisa', 'Ecikağıl', 'Göllü', 'Güzler', 'Homurlubeşler', 'Homurluüçler', 'Hashüyük', 'Kalankaldı', 'Karaboğaz', 'Karaduraklı', 'Karahıdır', 'Karalar', 'Karıncalı', 'Kartalkaya', 'Kesikköprü', 'Kırkpınar', 'Kocabey', 'Kortulu', 'Körpınar', 'Kurtbeliyeniyapan', 'Kuruağıl', 'Saraycık', 'Sevdiğin', 'Seyrekköy', 'Sıdıklıbüyükoba', 'Sıdıklıdarboğaz', 'Sıdıklıikizağıl', 'Sıdıklıkumarkaç', 'Sıdıklıküçükboğaz', 'Sıdıklıküçükoba', 'Sıdıklıortaoba', 'Taburoğlu', 'Tatarilyaskışla', 'Tatarilyasyayla', 'Tepesidelik', 'Toklümen', 'Tosunburnu', 'Ulupınar', 'Uzunaliuşağı', 'Yağmurluarmutlu', 'Yağmurlubüyükoba', 'Yağmurlukale', 'Yağmurlusayobası', 'Yeşilli', 'Yeşiloba', 'Yukarıhomurlu'],
  mucur: ['Aksaklı', 'Altınyazı', 'Asmakaradam', 'Avcıköy', 'Aydoğmuş', 'Babur', 'Bayramuşağı', 'Bazlamaç', 'Budak', 'Büyükkayapa', 'Çatalarkaç', 'Dağçiftliği', 'Dalakçı', 'Devepınarı', 'Geycek', 'Gümüşkümbet', 'Güzyurdu', 'İnaç', 'Karaarkaç', 'Karacalı', 'Karakuyu', 'Kargın', 'Kepez', 'Kılıçlı', 'Kıran', 'Kızılağıl', 'Kızıldağyeniyapan', 'Kurugöl', 'Kuşaklı', 'Küçükburunağıl', 'Küçükkavak', 'Küçükkayapa', 'Medetsiz', 'Obruk', 'Palangıç', 'Pınarkaya', 'Rahmalar', 'Seyfe', 'Susuz', 'Yazıkınık', 'Yeğenağa', 'Yeniköy', 'Yeşilyurt', 'Yürücek']
};

export const VILLAGE_TOTAL = Object.values(VILLAGES).reduce((n, v) => n + v.length, 0);
