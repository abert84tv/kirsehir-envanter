      ayar: (() => {
        const a = tabId === 'ayarlar';
        const sec = ayarBolumu(s.ayarBolum);
        const v = id => a && sec === id;
        return {
          // Liste yalnız hiçbir bölüm seçili değilken görünür
          listeAcik: a && !sec,
          detay: a && !!sec,
          bolumAd: ayarAdi(sec),
          geri: () => this.setState({ ayarBolum: null }),
          gorunum: v('gorunum'), veri: v('veri'), yetki: v('yetki'),
          ekip: v('ekip'), kvkk: v('kvkk'), modul: v('modul'), entegrasyon: v('entegrasyon'),
          bildirim: v('bildirim'), koyeslestir: v('koyeslestir'),
          denetim: tabId === 'denetim', cop: tabId === 'cop'
        };
      })(),
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
            aciklama: 'Köyden telefonla, WhatsApp’tan, dilekçeyle gelen istek ve ihbarların kaydı. Menüdeki Talep sekmesini kapsar; talep arızaya çevrilince arıza kaydına bağlanır.'
          },
          {
            ad: 'Araç ve ekipman',
            ac: seg(aracOn, () => { if (!aracOn) this.modulAnahtar('arac', true); }),
            kapa: seg(!aracOn, () => { if (aracOn) this.modulAnahtar('arac', false); }),
            sayi: ((s.arac && s.arac.list) || []).length + ' araç ve ekipman',
            aciklama: 'Araç ve ekipman listesi, kimde olduğu, sayaç okumaları ve görev dökümü. Menüdeki Araç sekmesini kapsar.'
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
          },
          {
            ad: 'Merkez onayı',
            ac: seg(modAyar('onay'), () => { if (!modAyar('onay') || !arizaOn) this.modulAnahtar('onay', true); }),
            kapa: seg(!modAyar('onay'), () => { if (modAyar('onay')) this.modulAnahtar('onay', false); }),
            sayi: arizaOn ? 'Kontrolde adımı eklenir' : 'arıza modülü kapalı — açarsanız arıza da açılır',
            aciklama: 'Açıkken saha kaydı doğrudan kapatamaz: işi “Kontrolde” bırakır, merkez fotoğrafı görüp onaylar ya da nedenini yazıp sahaya iade eder. İade nedeni kaydın notuna işlenir. Merkezde denetimi yapacak personel yoksa kapalı tutun — akış bugünkü gibi kalır.'
          }
        ]
        };
      })(),
      // Ayarlar listesi — iOS Ayarlar gibi kümelenmiş satırlar
      ayarListe: AYAR_LISTE.map(([baslik, satirlar]) => ({
        baslik,
        satirlar: satirlar
          // Modüller yalnız yöneticide; ayrı sekmesi olanlar SUZGEC_TANIM'daki
          // kendi yetkisinden okur (AYAR_TAB_YETKI), ötekiler ayarlar yetkisinden
          .filter(([id]) => (id !== 'modul' || can('admin'))
            && (!AYAR_TAB_YETKI[id] || yetki(AYAR_TAB_YETKI[id]) !== 'yok'))
          .map(([id, ad, alt]) => ({
            ad,
            alt: id === 'cop' && (s.trash.length + (s.cop || []).length)
              ? (s.trash.length + (s.cop || []).length) + ' kayıt bekliyor'
              : alt,
            // "aktarim" masaüstüne özgü — telefonda arayışı bilgisayara yönlendirir,
            // izinsiz kullanıcıyı uyarır (goImport ile birebir aynı davranış)
            git: id === 'aktarim'
              ? () => (!can('create')
                  ? this.say('Toplu aktarımı Mühendis ve üstü yapar.')
                  : (s.device === 'phone'
                      ? this.duyur('Dış veri aktarımı bilgisayardan yapılır — dosya seçmek ve yüzlerce noktayı tek tek işaretlemek telefon ekranında güvenli değil. Aynı hesapla bilgisayardan girin.', 9000)
                      : this.setState({ tab: 'aktarim', imp: null })))
              : AYAR_TAB[id] ? () => this.setState({ tab: AYAR_TAB[id] })
              : () => this.setState({ ayarBolum: id })
          }))
      })).filter(g => g.satirlar.length),
      prefNote: (() => {
        const u = s.session;
        if (!u) return '';
        const zemin = { street: 'Sokak', sat: 'Uydu', hyb: 'Uydu + ad' }[s.mapBase] || 'Sokak';
        const acik = ['kuyu', 'depo', 'ag', 'ges'].filter(k => s.filter[k]);
        const suzgec = acik.length === 4 ? 'bütün türler açık'
          : (acik.length ? 'yalnızca ' + acik.map(k => TYPES[k].label).join(', ') : 'hepsi kapalı');
        return `${u.name} olarak yaptığınız her seçim bu cihazda saklanıyor: harita zemini ${zemin}, ${s.theme === 'dark' ? 'koyu' : 'açık'} tema, ulaşım modu ${s.navMode ? 'açık' : 'kapalı'}, kayıt süzgeci ${suzgec}, bildirim kanalı ${s.bildirimKanal || 'SMS'} (${s.bildirimEsik || 'Acil ve yüksek'}), koordinat sistemi ${s.conv.sys === 'DMS' ? 'Google / WGS84' : s.conv.sys + '-3°'} dilim ${s.conv.zone}, en son açık ekran ve sekme. Bir dahaki girişinizde program tam bıraktığınız gibi açılır. Başka biri kendi hesabıyla girdiğinde kendi ayarlarını görür.`;
      })(),
      prefReset: () => {
        const u = s.session;
        if (u) { try { localStorage.removeItem('ks-pref-' + u.user); } catch (e) { /* yok */ } }
        try { localStorage.setItem('ks-tema', 'light'); } catch (e) { /* yok */ }
        this.setState({
          mapBase: 'street', theme: 'light', navMode: false,
          filter: { kuyu: true, depo: true, ag: true, ges: true, pasif: true, kaynak: false, memba: false },
          bildirimKanal: 'SMS', bildirimEsik: 'Acil ve yüksek',
          conv: { sys: 'ITRF96', zone: '11', e: '615860', n: '4322830' },
          tab: 'harita', detailTab: 'bilgi'
        }, () => this.prefUygula());
        this.say('Ayarlar varsayılana döndü — harita sokak zemini, açık tema, ulaşım modu kapalı.');
      },