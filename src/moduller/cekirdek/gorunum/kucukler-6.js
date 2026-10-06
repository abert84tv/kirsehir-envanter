      sources: m ? [
        `Nüfus: ${m.PROVINCE.source} — il ${fmt(m.PROVINCE.population2025)}, Merkez ${fmt(m.DISTRICTS[0].pop)} (${m.DISTRICTS[0].popYear}).`,
        `Köy adları: ilettiğiniz resmî “İlçe ve Köyleri” listesi — ${m.VILLAGE_TOTAL} köy (Merkez 53, Kaman 50, Çiçekdağı 45, Mucur 44, Akpınar 26, Akçakent 20, Boztepe 14).`,
        'Harita zemini: OpenStreetMap (© OpenStreetMap katkıcıları) ve Esri World Imagery (Esri, Maxar, Earthstar Geographics) uydu karoları — ikisi de gerçek servis. Kurum lisanslı bir uydu/ortofoto servisi (ör. HGM, Tapu Kadastro) aynı yere takılabilir.',
        'Yol tarifi: OSRM açık kaynak yönlendirme servisi (deneme sunucusu) — karayolu güzergâhı, mesafe ve süre gerçek hesaplamadır; erişim yoksa kuş uçuşu tahmine düşer ve ekranda öyle yazar.',
        (() => {
          const yv = Object.values(s.yerlesimVeri || {});
          const nf = yv.filter(x => x.nufus != null).length;
          const hv = yv.filter(x => x.buyukbas != null || x.kucukbas != null).length;
          if (!nf && !hv) return 'Köy düzeyi nüfus ve hayvan sayıları henüz yok; uydurulmadı, içe aktarım için boş bırakıldı.';
          return `Köy düzeyi veri: yüklenen dosyadan ${fmt(nf)} yerleşim nüfusu` + (hv ? `, ${fmt(hv)} yerleşim hayvan sayısı` : ' (hayvan sayıları henüz yüklenmedi)') + ' — değerler dosyadan geldiği gibidir, hesaplanmadı.';
        })(),
        `Hayvan varlığı: TÜİK 2024 ulusal referans (sığır ${fmt(m.LIVESTOCK_NATIONAL_2024.sigir)}, koyun ${fmt(m.LIVESTOCK_NATIONAL_2024.koyun)}, keçi ${fmt(m.LIVESTOCK_NATIONAL_2024.keci)}); il/ilçe/köy kırılımı Tarım ve Orman Bakanlığı İBS ekstresinden gelecek.`,
        'Kuyu konumları KUYU YERLERİ 2026 SON.kml dosyasından gelir (264 nokta, gerçek koordinat); depo/AG/GES örnek kayıtlarının konumu ilçe merkezinden türetilmiştir. Her kaydın “Koordinat kaynağı” satırı hangisi olduğunu yazar.'
      ] : ['Veri yükleniyor…'],