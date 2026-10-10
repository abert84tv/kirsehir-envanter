      // Modüller: kurum bu iki bölümü kullanmıyorsa kapatır, program yalın çalışır
      moduller: (() => {
        // Bağımlı modülün düğmesi kendi ayarını gösterir (arıza kapalıyken de)
        const modAyar = ad => ad === 'sure' || ad === 'onay' ? s.modul[ad] === true : s.modul[ad] !== false;
        return {
        not: 'Kapatılan modülün menüsü, kayıt sekmesi ve uyarıları görünmez; girilmiş kayıtlar veritabanında durur ve modül yeniden açıldığında yerinde bulunur. Envanter, harita, özet ve rapor her zaman açıktır.',
        list: [
          {
            ad: 'Arıza ve iş emri',
            ac: seg(arizaOn, () => { if (!arizaOn) this.modulAnahtar('ariza', true); }),
            kapa: seg(!arizaOn, () => { if (arizaOn) this.modulAnahtar('ariza', false); }),
            sayi: s.faults.length + ' arıza kaydı',
            aciklama: 'Arıza kaydı açma, ekip atama, malzeme ve işçilik girme, sahadan kapatma. Menüdeki Arıza sekmesini ve kayıt detayındaki Arıza sekmesini kapsar.'
          },
          {
            ad: 'Periyodik bakım',
            ac: seg(bakimOn, () => { if (!bakimOn) this.modulAnahtar('bakim', true); }),
            kapa: seg(!bakimOn, () => { if (bakimOn) this.modulAnahtar('bakim', false); }),
            sayi: 'kuyu 6 ay · depo, AG, GES 12 ay',
            aciklama: 'Bakım takvimi, geciken bakım listesi, hedef tarih ve “Yapıldı” işareti. Menüdeki Bakım sekmesini ve kayıt detayındaki Bakım sekmesini kapsar.'
          },
          {
            ad: 'Ambar ve zimmet',
            ac: seg(ambarOn, () => { if (!ambarOn) this.modulAnahtar('ambar', true); }),
            kapa: seg(!ambarOn, () => { if (ambarOn) this.modulAnahtar('ambar', false); }),
            sayi: STOK_KALEM.length + ' stok kalemi · ' + AMBARLAR.length + ' ambar',
            aciklama: 'Ambar mevcudu, ekip zimmeti ve hareket dökümü. Menüdeki Ambar sekmesini kapsar; kapatılırsa arıza kaydındaki malzeme listesi çalışmaya devam eder, yalnızca stok takibi görünmez.'
          },
          {
            ad: 'Dış talep',
            ac: seg(talepOn, () => { if (!talepOn) this.modulAnahtar('talep', true); }),
            kapa: seg(!talepOn, () => { if (talepOn) this.modulAnahtar('talep', false); }),
            sayi: (s.talepler || []).length + ' talep · '
              + (s.talepler || []).filter(t => !TALEP_KAPALI.includes(t.durum)).length + ' bekleyen',
            aciklama: 'Köyden telefonla, WhatsApp’tan, dilekçeyle gelen istek ve ihbarların kaydı. İş panosunun Yeni sütununda ve İş kartında görünür; talep arızaya çevrilince arıza kaydına bağlanır.'
          },
          {
            ad: 'Araç ve ekipman',
            ac: seg(aracOn, () => { if (!aracOn) this.modulAnahtar('arac', true); }),
            kapa: seg(!aracOn, () => { if (aracOn) this.modulAnahtar('arac', false); }),
            sayi: ((s.arac && s.arac.list) || []).length + ' araç ve ekipman',
            aciklama: 'Araç ve ekipman listesi, kimde olduğu, sayaç okumaları ve görev dökümü. Menüdeki Araç sekmesini kapsar.'
          },
          {
            ad: 'Telemetri',
            ac: seg(telemetriOn, () => { if (!telemetriOn) this.modulAnahtar('telemetri', true); }),
            kapa: seg(!telemetriOn, () => { if (telemetriOn) this.modulAnahtar('telemetri', false); }),
            sayi: 'sensör ve PLC verileri',
            aciklama: 'Kuyu ve depolara bağlı sensör/PLC cihazlarının verisi, alarmlar ve eşik kuralları. Cihaz bağlamadıysanız kapalı kalsın; açınca Kaynaklar altında Telemetri sayfası görünür.'
          },
          {
            ad: 'Hedef süre',
            ac: seg(modAyar('sure'), () => { if (!modAyar('sure') || !arizaOn) this.modulAnahtar('sure', true); }),
            kapa: seg(!modAyar('sure'), () => { if (modAyar('sure')) this.modulAnahtar('sure', false); }),
            sayi: arizaOn ? 'acil 2 · yüksek 5 · normal 15 · düşük 30 gün' : 'arıza modülü kapalı — açarsanız arıza da açılır',
            aciklama: 'Arıza listesinde bildirim tarihinden sayılan hedef tarih ve kalan gün gösterilir; geciken kayıt kırmızı yazılır. Süre yalnızca sıra gösterir — kaydı kapatmayı engellemez, kimseye uyarı gitmez. Süreler personel durumuna göre geniş tutulmuştur; sahada baskı yaratıyorsa kapatın, program hiçbir yerinde süre aramaz.'
          },
          {
            ad: 'Kanıt zorunluluğu',
            ac: seg(modAyar('kanit'), () => { if (!modAyar('kanit') || !arizaOn) this.modulAnahtar('kanit', true); }),
            kapa: seg(!modAyar('kanit'), () => { if (modAyar('kanit')) this.modulAnahtar('kanit', false); }),
            sayi: arizaOn ? 'en az bir fotoğraf' : 'arıza modülü kapalı — açarsanız arıza da açılır',
            aciklama: 'Bir arıza “Çözüldü” işaretlenirken kayıtta fotoğraf yoksa kapanış kabul edilmez. Yapılan işin kanıtı kalır, sonradan “yapıldı mı” tartışması olmaz. Kapalıyken fotoğraf yine eklenebilir, ama kapanış şartı değildir.'
          }

        ]
        };
      })(),