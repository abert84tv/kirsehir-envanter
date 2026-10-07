      // Sayfa süzgeç çubuğu — birleşmiş sayfaların üstünde durur.
      // Tek süzgeçli sayfada (Hat Kesiti) çubuk hiç çıkmaz.
      // İşler > Genel bakış: talepten kapanışa iş hattı, günün göstergeleri, öncelikli işler
      // Kaynaklar > Ekipler: personel ve araç durumu, ekip yükü, iş haritası
      // (masaüstü ve telefon şablonu ayrı, veri ortak)
      entegrasyon: (() => {
        const E = s.entegrasyon || {};
        const bolum = ayarAcik(s);
        const BOLUM_KART = { uyari: ['telegram_bot_anahtari'], yapayzeka: ['gemini_api_anahtari', 'anthropic_api_anahtari'], konum: ['konum_yazma_anahtari', 'arvento_kullanici', 'arvento_sifre'] };
        if (!(tabId === 'ayarlar' && BOLUM_KART[bolum])) return { kartlar: [], yazar: false, yaziYok: false, uyari: { var: false } };
        const yonetici = !!(me && me.role === 'yonetici');
        const goster = !!(me && ['yonetici', 'mudur'].includes(me.role));
        const KARTLAR = [
          ['gemini_api_anahtari', 'Yapay zekâ — Google Gemini (ücretsiz)', 'Gelen talebi önceden sınıflandırır. aistudio.google.com/apikey adresinden Google hesabıyla ücretsiz anahtar alınır (kredi kartı istemez).', 'AIza…', 'Dene'],
          ['anthropic_api_anahtari', 'Yapay zekâ — Anthropic Claude (ücretli API)', 'Varsa Gemini yerine bu kullanılır. Anahtar console.anthropic.com adresinden alınır; kullandıkça ücretlenir. İptal için “Anahtarı sil”.', 'sk-ant-…', 'Dene'],
          ['telegram_bot_anahtari', 'Telegram botu (ücretsiz)', 'Vatandaş Telegram’dan yazınca bildirim başvuru olur ve takip kodu alır. 1) Telegram’da @BotFather’a /newbot yazın, adı verin. 2) Verdiği anahtarı aşağıya yapıştırıp “Anahtarı kaydet”. 3) “Botu bağla”. İptal için “Anahtarı sil” yeter — bot da kesilir.', '123456:ABC…', 'Botu bağla'],
          ['konum_yazma_anahtari', 'Araç takip — konum yazma anahtarı', 'Araç takip sisteminin (Arvento) konumu programa yazarken kullandığı gizli anahtar. En az 16 karakterlik uzun rastgele bir metin uydurup buraya kaydedin; aynı metni verileri ileten tarafa verin. Yazma adresi aşağıdaki “Ekip konumu — cihazlar” kartında.', 'uzun-rastgele-bir-anahtar', 'Bilgi'],
          ['arvento_kullanici', 'Araç takip — Arvento kullanıcı adı', 'Programın Arvento’dan konumu kendisi çekebilmesi için (bağlantı hazır olduğunda). Hesap bilgisi Arvento’dan ya da bilgi işlemden alınır; yalnız yönetici girer, tarayıcıya geri gelmez.', 'kullanıcı adı', 'Bilgi'],
          ['arvento_sifre', 'Araç takip — Arvento şifresi', 'Yukarıdaki kullanıcı adının şifresi. Sunucuda saklanır; istediğiniz zaman silebilirsiniz.', 'şifre', 'Bilgi']
        ];
        const izin = typeof Notification === 'undefined' ? 'yok' : Notification.permission;
        const sohbetVar = (E.liste || []).some(x => x.ad === 'telegram_uyari_sohbet');
        const botVar = (E.liste || []).some(x => x.ad === 'telegram_bot_anahtari');
        return {
          uyari: {
            var: goster && bolum === 'uyari',
            ses: s.sesAcik ? 'Ses: hazır ✔' : 'Ses: kilitli — sayfaya bir kez dokunun, sonra “Sesi dene”ye basın',
            sesRenk: s.sesAcik ? '#1b9a4a' : '#d97706',
            bildirim: izin === 'granted' ? 'Tarayıcı bildirimi: açık ✔' : (izin === 'denied' ? 'Tarayıcı bildirimi: engellenmiş — adres çubuğundaki kilit simgesinden izin verin' : (izin === 'yok' ? 'Tarayıcı bildirimi: bu cihaz desteklemiyor' : 'Tarayıcı bildirimi: izin verilmedi')),
            bildirimRenk: izin === 'granted' ? '#1b9a4a' : '#d97706',
            telegram: !botVar ? 'Telegram uyarısı: önce botu bağlayın'
              : (sohbetVar ? 'Telegram uyarısı: kayıtlı sohbet var ✔ (uygulama kapalıyken de telefona mesaj düşer)'
                : 'Telegram uyarısı: kayıtlı sohbet yok — uygulama kapalıyken uyarı için aşağıdaki kodla kaydolun'),
            telegramRenk: sohbetVar ? '#1b9a4a' : '#d97706',
            kod: E.uyariKod ? 'Telegram’da kendi botunuza şunu yazın:  /yonetici ' + E.uyariKod + '   (çıkmak için: /yonetici CIK)' : '',
            kodVar: !!E.uyariKod,
            telVar: botVar && yonetici,
            dene: () => {
              this._sesAc && this._sesAc(); this.uyariSesi();
              this.setState({ basvuruUyari: { n: 1, metin: 'Deneme · Köy (İlçe) — bu bir denemedir' } });
              if (izin === 'granted') { try { new Notification('Deneme — Kırşehir Envanter', { body: 'Bildirim çalışıyor.' }); } catch (e) { /* bildirim yok */ } }
            },
            izinIste: () => {
              if (typeof Notification === 'undefined') return this.duyur('Bu cihaz tarayıcı bildirimi desteklemiyor.', 5000, 'kotu');
              Notification.requestPermission().then(p => {
                this.setState({ uyariTik: Date.now() });
                if (p === 'granted') { try { new Notification('Bildirim açıldı', { body: 'Yeni başvuru gelince böyle görünür.' }); } catch (e) { /* bildirim yok */ } }
                else this.duyur('İzin verilmedi — tarayıcının site ayarlarından bildirime izin verin.', 7000, 'kotu');
              });
            },
            kodGetir: async () => {
              const r = await this._sb.telegramKod();
              if (r && r.ok) this.entegrasyonGuncelle({ uyariKod: r.kod }); else this.duyur((r && r.err) || 'Kod alınamadı.', 6000, 'kotu');
            }
          },
          yazar: yonetici && !s.offline, yaziYok: !yonetici,
          kartlar: KARTLAR.filter(k => BOLUM_KART[bolum].includes(k[0])).map(([ad, baslik, aciklama, ipucu, deneAd]) => {
            const x = (E.liste || []).find(i => i.ad === ad);
            const sonuc = (E.sonuclar || {})[ad] || '';
            return {
              baslik, aciklama, ipucu, deneAd, dolu: !!x,
              durum: !goster ? 'Bu bölümü yalnızca yönetici ve müdür görür.' : E.hata ? E.hata
                : x ? 'Anahtar kayıtlı ✔ (…' + x.son4 + ')' + (x.zaman ? ' · ' + this.damgaCevir(x.zaman) : '') + (x.kim ? ' · ' + x.kim : '')
                : (E.yuk ? 'Anahtar girilmemiş.' : 'Yükleniyor…'),
              durumRenk: E.hata ? '#d92d20' : x ? '#1b9a4a' : ui.mut,
              giris: (E.girisler || {})[ad] || '',
              onGiris: e => this.entegrasyonGuncelle({ girisler: { ...(this.state.entegrasyon.girisler || {}), [ad]: e.target.value } }),
              kaydet: () => { const d = String((E.girisler || {})[ad] || '').trim(); if (!d) return this.duyur('Anahtarı yapıştırın.', 4000, 'kotu'); this.entegrasyonKaydet(ad, d); },
              sil: () => { if (window.confirm('Kayıtlı anahtar silinsin mi?')) this.entegrasyonKaydet(ad, ''); },
              dene: () => this.entegrasyonDene(ad), sonuc, sonucVar: !!sonuc
            };
          })
        };
      })(),