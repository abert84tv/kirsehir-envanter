      bildirim: {
        kanal: s.bildirimKanal || 'SMS',
        kanallar: ['SMS', 'WhatsApp', 'İkisi birlikte'].map(k => ({
          label: k,
          bg: (s.bildirimKanal || 'SMS') === k ? 'var(--color-accent)' : 'transparent',
          fg: (s.bildirimKanal || 'SMS') === k ? '#fff' : ui.mut,
          pick: () => this.setState({ bildirimKanal: k })
        })),
        esikler: ['Yalnızca acil', 'Acil ve yüksek', 'Bütün arızalar'].map(k => ({
          label: k,
          bg: (s.bildirimEsik || 'Acil ve yüksek') === k ? ui.surf2 : 'transparent',
          fg: (s.bildirimEsik || 'Acil ve yüksek') === k ? ui.acc : ui.mut,
          pick: () => this.setState({ bildirimEsik: k })
        })),
        // Gerçek gönderim: sunucu işlevi kurulmadan mesaj çıkmaz.
        gercek: (() => {
          const A = s.smsAyar || {};
          const telli = SAHA_EKIP.filter(c => ((ekipAyarBul(c) || {}).tel || '').trim()).length;
          return {
            acik: !!A.acik,
            acKapa: [['Kapalı', false], ['Açık', true]].map(([label, v]) => ({
              label, ...seg(!!A.acik === v, () => this.smsAyarYaz({ acik: v }))
            })),
            url: A.url || '',
            onUrl: e => this.smsAyarYaz({ url: e.target.value.trim() }),
            sefTel: A.sefTel || '',
            onSefTel: e => this.smsAyarYaz({ sefTel: e.target.value }),
            durum: !A.acik
              ? 'Gönderim kapalı — arıza kaydedilirken mesaj çıkmaz, yalnızca ekranda bildirim görünür.'
              : (!A.url
                ? 'Sunucu adresi girilmedi. Mesaj gönderilemez; denemeler kuyruğa yazılır.'
                : (telli
                  ? 'Gönderim açık · ' + telli + ' ekibin telefonu girili'
                    + (A.sefTel ? ' · şef numarası tanımlı' : ' · şef numarası girilmedi') + '.'
                  : 'Sunucu adresi girildi ama hiçbir ekibin telefonu yok — Ayarlar > Ekipler bölümünden girin.')),
            durumFg: A.acik && A.url && telli ? ui.fg : ui.acc,
            kurulum: 'Gerçek SMS ve WhatsApp gönderimi için operatör anahtarı gerekir; anahtar tarayıcıya konulamaz — programı açan herkes görürdü. Bu yüzden gönderim Supabase üzerinde çalışan küçük bir sunucu işleviyle yapılır. Pakette gelen supabase-islev-mesaj-gonder.ts dosyasını Supabase > Edge Functions bölümünde “mesaj-gonder” adıyla yayınlayın, operatör bilgilerini Secrets kısmına girin ve işlev adresini buraya yazın. Kurulum adımları dosyanın başında yazılı.',
            dene: async () => {
              const A2 = this.state.smsAyar || {};
              if (!A2.url) return this.duyur('Önce sunucu adresini yazın.', 4500, 'kotu');
              const num = this.smsAlicilar(SAHA_EKIP.find(c => ((ekipAyarBul(c) || {}).tel || '').trim()) || '');
              if (!num.length) return this.duyur('Deneme için en az bir telefon numarası gerekir — ekip ya da şef numarası girin.', 6000, 'kotu');
              this.duyur('Sunucu bağlantısı deneniyor…', 3000);
              const r = await this.smsGonder({ metin: 'Kırşehir Envanter bağlantı denemesi.', numaralar: num, deneme: true });
              this.denetimYaz('bildirim', r.ok ? 'Bağlantı denemesi başarılı' : 'Bağlantı denemesi başarısız',
                r.bilgi || r.hata || '', 'Ayarlar');
              this.duyur(r.ok ? (r.bilgi || 'Bağlantı hazır — mesaj gönderilmedi.') : ('Bağlantı kurulamadı: ' + r.hata),
                8000, r.ok ? 'iyi' : 'kotu');
            },
            kuyruk: (s.smsKuyruk || []).slice(0, 20).map(m => ({
              kapsam: m.kapsam || 'bildirim',
              meta: [m.kanal, m.numaralar.length + ' numara', m.damga].filter(Boolean).join(' · '),
              hata: m.hata || '',
              metin: m.metin
            })),
            kuyrukSayi: (s.smsKuyruk || []).length,
            kuyrukVar: (s.smsKuyruk || []).length > 0,
            gonderiyor: !!s.smsGonderiyor,
            kuyrukGonder: () => this.smsKuyrukGonder(),
            kuyrukSil: () => {
              if (!window.confirm((s.smsKuyruk || []).length + ' bekleyen mesaj silinecek. Onaylıyor musunuz?')) return;
              this.denetimYaz('bildirim', 'Kuyruk temizlendi', (s.smsKuyruk || []).length + ' mesaj', '');
              this.smsKuyrukYaz([]);
              this.duyur('Kuyruk temizlendi.', 4000);
            }
          };
        })(),
        note: 'Acil ve yüksek öncelikli arıza kaydı açıldığında atanan ekibe ve ekip şefine mesaj gider: öncelik, kayıt kodu, köy ve arıza türü. Gönderim aşağıdaki sunucu bağlantısıyla yapılır; kurulmadıysa mesaj çıkmaz, yalnızca ekranda bildirim görünür. Çevrimdışıyken ya da gönderim başarısızsa mesaj kuyrukta bekler.',
        ornek: 'ACİL — KS-KUY-0042, Güzler · Merkez, Pompa çalışmıyor. Ekip 1 — Merkez atandı. 04.09.2026 14:20',
        test: () => this.say(`Örnek metin (${s.bildirimKanal || 'SMS'}): “ACİL — KS-KUY-0042, Güzler · Merkez, Pompa çalışmıyor.” Gerçek gönderim aşağıdaki sunucu bağlantısı kurulunca yapılır.`)
      },