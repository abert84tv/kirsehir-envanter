      kvkkEkran: (() => {
        const K = s.kvkk || {};
        const tara = this.kvkkTarama();
        const kisiliTalep = (s.talepler || []).filter(t => t.ad && t.ad !== 'Kişi bilgisi silindi');
        return {
          not: 'Program kişisel veri tutuyor: talep sahibinin adı ve telefonu, saha fotoğrafları, sesli notlar, kaydı kimin nereden girdiği. KVKK bunların ne kadar saklanacağının yazılı olmasını ve süre sonunda silinmesini istiyor. Süreleri buradan belirlersiniz; aydınlatma metni girdiğiniz sürelere göre kendiliğinden yazılır.',
          kurum: K.kurum || '',
          onKurum: e => this.kvkkYaz({ kurum: e.target.value }),
          irtibat: K.irtibat || '',
          onIrtibat: e => this.kvkkYaz({ irtibat: e.target.value }),
          adres: K.adres || '',
          onAdres: e => this.kvkkYaz({ adres: e.target.value }),
          onayZorunlu: !!K.onayZorunlu,
          onaySec: [['Zorunlu değil', false], ['Zorunlu', true]].map(([label, v]) => ({
            label, ...seg(!!K.onayZorunlu === v, () => this.kvkkYaz({ onayZorunlu: v }))
          })),
          onayNot: K.onayZorunlu
            ? 'Talep alınırken “aydınlatma yapıldı” kutusu işaretlenmeden kayıt tamamlanmıyor.'
            : 'Kutu formda görünür ama kayıt için zorunlu değil. Kurumun politikası gerektiriyorsa açın.',
          saklama: SAKLAMA_TANIM.map(t => ({
            ad: t.ad, not: t.not,
            secenekler: SAKLAMA_SECENEK.map(o => ({
              label: o.ad, ...seg((K.saklama || {})[t.k] === o.gun, () => this.kvkkSaklama(t.k, o.gun))
            }))
          })),
          durum: [
            { n: String(kisiliTalep.length), label: 'Kişi bilgisi olan talep', fg: ui.fg },
            { n: String(tara.talepler.length), label: 'Süresi dolan talep', fg: tara.talepler.length ? ui.acc : ui.fg },
            { n: String(tara.sesler.length), label: 'Süresi dolan ses', fg: tara.sesler.length ? ui.acc : ui.fg },
            { n: String(tara.denetim.length), label: 'Süresi dolan denetim', fg: ui.mut }
          ],
          taramaNot: (tara.talepler.length || tara.sesler.length)
            ? 'Saklama süresi dolmuş kayıt var. “Süresi dolanları sil” ile talep kayıtlarındaki ad ve telefonu kaldırabilirsiniz; talebin kendisi ve sonucu listede kalır.'
            : 'Saklama süresi dolmuş kişisel veri yok. Bu ekranı zaman zaman açıp bakmak yeterli.',
          taramaFg: (tara.talepler.length || tara.sesler.length) ? ui.acc : ui.mut,
          sesNot: tara.sesler.length
            ? tara.sesler.length + ' sesli not süresini geçmiş. Sesli notlar sunucuda tutulduğu için silme işlemi tesis kaydının Foto sekmesinden yapılır — buradan toplu silinmiyor.'
            : '',
          silSuresi: () => this.kvkkTalepAnonim(false),
          silHepsi: () => this.kvkkTalepAnonim(true),
          metin: this.kvkkMetin(),
          metinKopya: async () => {
            const t = this.kvkkMetin();
            try {
              await navigator.clipboard.writeText(t);
              this.duyur('Aydınlatma metni kopyalandı — kurumun sayfasına ya da ilan panosuna koyabilirsiniz.', 6000, 'iyi');
            } catch (e) {
              this.duyur('Kopyalanamadı. Metni seçip elle kopyalayın.', 5000, 'kotu');
            }
          },
          metinIndir: () => {
            this.dosyaIndir('kvkk-aydinlatma-metni.txt', this.kvkkMetin(), 'text/plain;charset=utf-8');
            this.denetimYaz('ayar', 'Aydınlatma metni indirildi', '', 'KVKK');
          }
        };
      })(),