      talepEkran: (() => {
        const tf = s.talepForm;
        const hepsi = s.talepler || [];
        const q = (s.talepQ || '').toLocaleLowerCase('tr');
        const suz = hepsi.filter(t =>
          (!s.talepSuz || (s.talepSuz === 'acik' ? !TALEP_KAPALI.includes(t.durum) : t.durum === s.talepSuz)) &&
          (!q || [t.no, t.ad, t.tel, t.koy, t.konu, t.aciklama, t.arizaNo].join(' ').toLocaleLowerCase('tr').includes(q)));
        const koyler = (() => {
          if (!m) return [];
          const d = m.DISTRICTS.find(x => x.name === (tf ? tf.ilce : ''));
          const yerel = d ? (m.VILLAGES[d.id] || []) : [];
          const ek = d ? ((s.ekKoyler || {})[d.id] || []).map(x => x.ad) : [];
          return [...new Set([...yerel, ...ek])].sort((a, b) => a.localeCompare(b, 'tr'));
        })();
        const acik = hepsi.filter(t => !TALEP_KAPALI.includes(t.durum));
        return {
          not: 'Köyden telefonla, WhatsApp’tan, dilekçeyle ya da şahsen gelen istek ve ihbarlar buraya yazılır. Talep arıza değildir: her talep arızaya dönüşmez. Yerinde bakıldıktan sonra ya arıza kaydına çevrilir (talep otomatik bağlanır) ya da sonucu yazılıp kapatılır. Bildiren kişinin adı ve telefonu kayıtta kalır, geri dönüş yapılabilir.',
          stats: [
            { n: String(hepsi.length), label: 'Toplam talep', fg: ui.fg },
            { n: String(acik.length), label: 'Bekleyen', fg: acik.length ? ui.acc : ui.fg },
            { n: String(hepsi.filter(t => t.durum === 'arizaya').length), label: 'Arızaya dönüştü', fg: ui.fg },
            { n: String(hepsi.filter(t => t.oncelik === 'Acil' && !TALEP_KAPALI.includes(t.durum)).length), label: 'Acil bekleyen', fg: ui.acc }
          ],
          yeni: () => this.setState({
            talepForm: {
              ad: '', tel: '', sifat: 'muhtar', kanal: 'telefon',
              ilce: (m && m.DISTRICTS[0].name) || '', koy: '',
              konu: TALEP_KONU[0], oncelik: 'Normal', aciklama: '', durum: 'yeni', sonuc: ''
            }
          }),
          q: s.talepQ,
          onQ: e => this.setState({ talepQ: e.target.value }),
          suzSec: [['', 'Hepsi'], ['acik', 'Bekleyen'], ...Object.entries(TALEP_DURUM)].map(([k, ad]) => ({
            label: ad, ...seg(s.talepSuz === k, () => this.setState({ talepSuz: k }))
          })),
          form: {
            on: !!tf,
            baslik: tf && tf.id ? tf.no + ' · talep' : 'Yeni talep',
            ad: tf ? tf.ad : '',
            onAd: e => this.setState({ talepForm: { ...this.state.talepForm, ad: e.target.value } }),
            tel: tf ? tf.tel : '',
            onTel: e => {
              const tel = e.target.value;
              this.setState({ talepForm: { ...this.state.talepForm, tel } });
              // Muhtar numara defteri eşleşmesi — madde 1: operatöre köyü hatırlatır
              const es = this.muhtarEslesenKoy(tel);
              if (es && this.state.talepForm && !this.state.talepForm.koy) {
                this.setState({ talepForm: { ...this.state.talepForm, tel, ilce: es.ilce || this.state.talepForm.ilce, koy: es.koy, sifat: 'muhtar' } });
                this.duyur(`Bu numara ${es.ad} muhtarına ait — ${es.koy}${es.ilce ? ' / ' + es.ilce : ''} otomatik dolduruldu.`, 6000, 'iyi');
              }
            },
            sifat: tf ? tf.sifat : '', sifatlar: Object.entries(TALEP_SIFAT).map(([k, ad]) => ({ k, ad })),
            onSifat: e => this.setState({ talepForm: { ...this.state.talepForm, sifat: e.target.value } }),
            kanal: tf ? tf.kanal : '', kanallar: Object.entries(TALEP_KANAL).map(([k, ad]) => ({ k, ad })),
            onKanal: e => this.setState({ talepForm: { ...this.state.talepForm, kanal: e.target.value } }),
            ilce: tf ? tf.ilce : '', ilceler: m ? m.DISTRICTS.map(d => d.name) : [],
            onIlce: e => this.setState({ talepForm: { ...this.state.talepForm, ilce: e.target.value, koy: '' } }),
            koy: tf ? tf.koy : '', koyler,
            onKoy: e => this.setState({ talepForm: { ...this.state.talepForm, koy: e.target.value } }),
            konu: tf ? tf.konu : '', konular: TALEP_KONU,
            onKonu: e => this.setState({ talepForm: { ...this.state.talepForm, konu: e.target.value } }),
            oncelikSec: TALEP_ONCELIK.map(p => ({
              label: p, ...seg(!!tf && tf.oncelik === p, () => this.setState({ talepForm: { ...this.state.talepForm, oncelik: p } }))
            })),
            aciklama: tf ? tf.aciklama : '',
            onAciklama: e => this.setState({ talepForm: { ...this.state.talepForm, aciklama: e.target.value, aiSonuc: null } }),
            // Ön sınıflandırma önerisi: metinden iş grubu, tür, aciliyet, köy.
            // Yapay zekâ sonucu varsa o, yoksa kurala dayalı tahmin.
            oneri: (() => {
              if (!tf || (tf.aciklama || '').trim().length < 6) return { var: false };
              const o = tf.aiSonuc || this.talepSiniflandir([tf.konu, tf.aciklama].join(' '), { ilce: tf.ilce });
              const G = ARIZA_GRUP[o.grup];
              const uygulandi = !!o.grup && tf.grup === o.grup && tf.tur === o.tur;
              return {
                var: true, kaynak: o.kaynak === 'ai' ? 'Yapay zekâ önerisi' : 'Otomatik öneri',
                ozet: [G ? G.ad : 'İş grubu çıkarılamadı', o.tur, o.oncelik,
                  o.koy ? o.koy + (o.ilce ? ' (' + o.ilce + ')' : '') : 'köy metinde yok'].filter(Boolean).join(' · '),
                gerekce: (o.gerekce || []).length ? 'İpuçları: ' + o.gerekce.join(', ') : '',
                uygulaVar: !!o.grup && !uygulandi, uygulandiVar: uygulandi,
                uygula: () => {
                  const f0 = this.state.talepForm;
                  const koyDoldur = !f0.koy && o.koy;
                  this.setState({ talepForm: { ...f0, grup: o.grup, tur: o.tur, oncelik: o.oncelik || f0.oncelik,
                    ...(koyDoldur ? { koy: o.koy, ilce: o.ilce || f0.ilce } : {}),
                    siniflandirma: { kaynak: o.kaynak, gerekce: o.gerekce || [], zaman: this.damga() } } });
                },
                aiVar: !!this._sb, aiYukleniyor: !!tf.aiYukleniyor,
                aiL: tf.aiYukleniyor ? 'Yapay zekâ çalışıyor…' : 'Yapay zekâ ile sınıflandır',
                ai: () => this.talepAiSiniflandir()
              };
            })(),
            grup: tf ? tf.grup || '' : '',
            gruplar: [{ v: '', l: 'İş grubu — seçilmedi' }, ...Object.keys(ARIZA_GRUP).map(k => ({ v: k, l: ARIZA_GRUP[k].ad }))],
            onGrup: e => { const v = e.target.value; this.setState({ talepForm: { ...this.state.talepForm, grup: v || null, tur: v ? ARIZA_GRUP[v].turler[0] : null } }); },
            tur: tf ? tf.tur || '' : '',
            turler: tf && ARIZA_GRUP[tf.grup] ? ARIZA_GRUP[tf.grup].turler : [],
            turVar: !!(tf && ARIZA_GRUP[tf.grup]),
            onTur: e => this.setState({ talepForm: { ...this.state.talepForm, tur: e.target.value } }),
            sonuc: tf ? tf.sonuc : '',
            onSonuc: e => this.setState({ talepForm: { ...this.state.talepForm, sonuc: e.target.value } }),
            sonucVar: !!(tf && tf.id),
            kvkkVar: !!tf && !tf.id,
            kvkkOnay: !!(tf && tf.kvkkOnay),
            kvkkBg: tf && tf.kvkkOnay ? 'var(--color-accent)' : 'transparent',
            kvkkFg: tf && tf.kvkkOnay ? '#fff' : 'transparent',
            kvkkMetni: 'Bildiren kişiye adının ve telefonunun neden kaydedildiği söylendi'
              + ((s.kvkk || {}).onayZorunlu ? ' (zorunlu)' : ''),
            kvkkTikla: () => this.setState({ talepForm: { ...this.state.talepForm, kvkkOnay: !this.state.talepForm.kvkkOnay } }),
            kaydet: () => this.talepKaydet(this.state.talepForm),
            kapat: () => this.setState({ talepForm: null })
          },
          list: suz.slice(0, 200).map(t => {
            const kapali = TALEP_KAPALI.includes(t.durum);
            return {
              no: t.no, konu: t.konu + (ARIZA_GRUP[t.grup] ? ' · ' + ARIZA_GRUP[t.grup].ad + (t.tur ? ' / ' + t.tur : '') : ''),
              kim: (TALEP_SIFAT[t.sifat] || '') + ' ' + t.ad + (t.tel ? ' · ' + t.tel : ''),
              yer: t.koy + (t.ilce ? ' · ' + t.ilce : ''),
              aciklama: t.aciklama,
              kaynak: [TALEP_KANAL[t.kanal] || t.kanal, t.acilis,
                t.sonuc ? 'Sonuç: ' + t.sonuc : (t.arizaNo ? 'Arıza kaydı: ' + t.arizaNo : '')]
                .filter(Boolean).join(' · '),
              oncelikSatir: [t.oncelik,
                t.sonuc ? 'Sonuç: ' + t.sonuc : (t.arizaNo ? 'Arıza kaydı: ' + t.arizaNo : '')]
                .filter(Boolean).join(' · '),
              durum: TALEP_DURUM[t.durum] || t.durum,
              durumBg: kapali ? 'transparent' : 'var(--color-accent)',
              durumFg: kapali ? ui.mut : '#fff',
              oncelik: t.oncelik,
              oncelikFg: t.oncelik === 'Acil' ? ui.acc : ui.mut,
              acikMi: !kapali,
              ac: () => this.setState({ talepForm: { ...t } }),
              arizaya: () => this.talepArizaya(t.id),
              incele: () => this.talepDurum(t.id, 'incelemede'),
              coz: () => {
                const c = (window.prompt('Sonuç — ne yapıldı?', t.sonuc || '') || '').trim();
                if (!c) return;
                this.talepDurum(t.id, 'cozuldu', c);
              },
              red: () => {
                const c = (window.prompt('Karşılanamama nedeni?', t.sonuc || '') || '').trim();
                if (!c) return;
                this.talepDurum(t.id, 'red', c);
              }
            };
          }),
          bos: suz.length === 0,
          bosNot: hepsi.length
            ? 'Bu süzgece uyan talep yok.'
            : 'Henüz talep yazılmadı. Köyden telefon geldiğinde “Talep al” ile kaydedin — bildiren kişi, köy, konu ve anlattığı.',
          fazla: suz.length > 200 ? suz.length - 200 + ' talep daha var — aramayı daraltın.' : ''
        };
      })(),