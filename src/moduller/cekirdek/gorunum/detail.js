      detail: sel ? {
        ...(() => {
          const acik = (s.faults || []).filter(f => f.assetId === sel.id && !KAPALI_DURUM.includes(f.status)).length;
          return {
            acikAriza: acik > 0, arizaEt: acik + ' açık arıza',
            fotoSekme: () => this.setState({ detailTab: 'medya' }, () => { if (sel.dbId && !(this.state.fotolar || {})[sel.dbId]) this.fotoYenile(sel.dbId); })
          };
        })(),
        kind: TYPES[sel.type].kind, code: sel.code,
        meta: `${this.yer(sel)} · ${sel.year ? sel.year + ' yapım' : 'yıl girilmedi'} · ${sel.sync === 'pending' ? 'eşitleme bekliyor' : 'eşitlendi'}`,
        tabs: [['bilgi', 'Bilgi'], ...(sel.type === 'kuyu' ? [['deneme', 'Deneme']] : []), ['hat', 'Hat'], ['medya', 'Foto'],
          ...(bakimOn ? [['bakim', 'Bakım']] : []), ['not', 'Not'], ...(arizaOn ? [['ariza', 'Arıza']] : []), ['gecmis', 'Geçmiş']].map(([id, label]) => ({
          label, bg: s.detailTab === id ? ui.surf2 : 'transparent', fg: s.detailTab === id ? ui.acc : ui.mut,
          pick: () => {
            this.setState({ detailTab: id });
            if (id === 'medya' && sel.dbId && !(s.fotolar || {})[sel.dbId]) this.fotoYenile(sel.dbId);
          }
        })),
        showFields: s.detailTab === 'bilgi',
        showGecmis: s.detailTab === 'gecmis',
        showMedia: s.detailTab === 'medya', showFaults: s.detailTab === 'ariza',
        showBakim: s.detailTab === 'bakim',
        showTests: s.detailTab === 'deneme', showNote: s.detailTab === 'not',
        showHat: s.detailTab === 'hat',
        hat: (() => {
          const liste = (s.hatlar || {})[sel.id] || [];
          const TUR_AD = { terfi: 'Terfi hattı', isale: 'İsale hattı', sebeke: 'Şebeke hattı', ag: 'AG enerji hattı', og: 'OG enerji hattı', dc: 'GES DC hattı' };
          const TUR_RENK = { terfi: '#ec3013', isale: '#201e1d', sebeke: '#6c6763', ag: '#1b6ef3', og: '#7b3fbf', dc: '#c08a00' };
          const toplam = liste.reduce((t, x) => t + this.hatUzunluk(x.noktalar), 0);
          return {
            varMi: liste.length > 0,
            sayi: liste.length + ' hat · ' + this.hatMetin(toplam) + ' toplam',
            note: canWrite
              ? 'Bu kayda bağlı su, enerji ve kolektör hatlarını haritada çizin ya da KML/KMZ ile içe aktarın. Her tür ayrı renkte görünür, uzunluklar kendiliğinden hesaplanır.'
              : 'Bu kayıtta değişiklik yetkiniz yok — hatlar yalnızca görüntülenir.',
            rows: liste.map(x => ({
              ad: TUR_AD[x.tur] || x.tur,
              renk: TUR_RENK[x.tur] || '#201e1d',
              uzunluk: this.hatMetin(this.hatUzunluk(x.noktalar)),
              nokta: (x.noktalar || []).length + ' nokta'
            })),
            ac: () => this.setState({ hatTam: true }),
            acNote: canWrite
              ? 'Çizim ekranı tam ekranda açılır: soldan hat türünü seçin, haritaya tıklayarak güzergâhı geçin, “Hattı bitir”e basın. Çizilen hatlar ana haritada da görünür — araç menüsündeki “Hat güzergâhları” anahtarıyla kapatılabilir.'
              : 'Çizim ekranı tam ekranda açılır; bu kayıtta değişiklik yetkiniz olmadığı için hatlar yalnızca görüntülenir.',
            temizle: () => {
              if (!canWrite) return;
              if (!window.confirm(sel.code + ' kaydındaki bütün hat güzergâhları silinecek. Onaylıyor musunuz?')) return;
              this.hatKaydet(sel.id, []);
              this.iz(sel.id, 'Hatlar silindi', liste.length + ' güzergâh kaldırıldı.');
              setTimeout(() => this.hatGonder(), 60);
            }
          };
        })(),
        tests: this.testsFor(sel).map(t => {
          const kendi = (s.tests[sel.id] || []).indexOf(t);
          return {
            date: t.date, by: t.by,
            statik: t.statik, dinamik: t.dinamik, dusum: t.dusum,
            debi: t.debi, sure: t.sure, ozgul: t.ozgul, toparlanma: t.toparlanma,
            note: t.note || '—',
            pend: t.pend ? 'Cihazda' : '', pendC: t.pend ? 'var(--color-accent)' : 'transparent',
            // yalnızca bu programdan girilen ölçüm silinebilir; sondaj kaydı yerinde kalır
            silinir: kendi >= 0 && canWrite,
            sil: () => {
              this.setState(st => ({ tests: { ...st.tests, [sel.id]: (st.tests[sel.id] || []).filter((_, k) => k !== kendi) } }));
              this.iz(sel.id, 'Deneme ölçümü silindi', `${t.date} · ${t.debi}`);
              this.duyur(`${t.date} tarihli deneme ölçümü silindi.`, 4000);
            }
          };
        }),
        testsEmpty: this.testsFor(sel).length === 0,
        chart: this.denemeGrafik(sel),
        testNote: 'Kuyu açıldıktan sonra yapılan pompaj denemesi: statik ve dinamik seviye, debi, deneme süresi ve toparlanma. Özgül debi (l/s/m) düşüme bölünerek kendiliğinden çıkar — pompa seçiminde kullanılan değer bu.',
        noteText: s.notes[sel.id] ?? (sel.d.bakim === 'Yeni kayıt' ? '' : ''),
        hasNote: !!(s.notes[sel.id] || '').trim(),
        aktif: {
          aktifMi: aktifMi(sel),
          etiket: aktifAd(sel),
          bg: aktifMi(sel) ? 'transparent' : '#3f4a5a',
          fg: aktifMi(sel) ? ui.fg : '#fff',
          kenar: aktifMi(sel) ? ui.rule : '#3f4a5a',
          dugme: aktifMi(sel) ? 'Pasife al' : 'Aktife al',
          gorunur: canWrite,
          tik: () => this.aktiflikDegistir(sel)
        },
        gitNote: () => this.setState({ detailTab: 'not' }),
        notePlaceholder: 'Erişim yolu, kilit/anahtar kimde, muhtar telefonu, gözle görülen eksik, sonra yapılacak iş — aklınıza geleni buraya yazın.',
        noteMeta: s.notes[sel.id]
          ? `Son yazan: ${me ? me.name : '—'} · ${s.device === 'phone' ? 'Telefon' : 'Bilgisayar'}`
          : 'Henüz not yazılmadı.',
        gecmis: (() => {
          const kendi = (s.log[sel.id] || []).map(r => ({
            t: r.t, ne: r.ne,
            kim: `${r.kim} · ${r.nereden}${r.cevrimdisi ? ' · çevrimdışı girildi' : ''}`,
            detay: r.detay, hasDetay: !!r.detay, fg: ui.acc
          }));
          const kok = [{
            t: sel.source && sel.source.indexOf('KML') === 0 ? '—' : (sel.year ? sel.year : '—'),
            ne: 'Kayıt oluşturuldu',
            kim: sel.source || 'Elle girildi',
            detay: sel.kmlName ? `KML yer imi no ${sel.kmlName} — teknik alanlar boş geldi` : '',
            hasDetay: !!sel.kmlName, fg: ui.mut
          }];
          return [...kendi, ...kok];
        })(),
        gecmisBos: (s.log[sel.id] || []).length === 0,
        gecmisNot: (s.log[sel.id] || []).length === 0
          ? 'Bu oturumda bu kayıtta değişiklik yapılmadı. Not yazma, deneme ekleme, fotoğraf ekleme ve arıza açma işlemleri buraya kim-ne zaman-nereden diye yazılır.'
          : `${(s.log[sel.id] || []).length} değişiklik kayıtlı. Gerçek kurulumda bu geçmiş silinmez, denetimde bu liste sorulur.`,
        rows: (s.detailTab === 'gecmis'
          ? []
          : [
            [sel.type === 'kuyu' ? 'Kuyu barkodu' : 'Tesis barkodu', 'BK-' + sel.code.slice(3)],
            ['Direk barkodu', sel.type === 'kuyu' ? 'BD-' + sel.code.slice(-4) : '—'],
            ...this.rows(sel)
          ]
        ).map(([label, value, hi]) => ({
          label: hi === 2 ? label.toUpperCase() : label,
          value: String(value),
          color: hi === 2 ? ui.acc : (String(value) === '—' ? ui.mut : (hi ? ui.acc : ui.fg)),
          bg: hi === 2 ? ui.surf2 : (hi === 1 ? ui.pend : 'transparent')
        })),
        // sunucudan gelen gerçek fotoğraflar; bağlantı yoksa eski yer tutucular
        foto: (() => {
          const list = (s.fotolar || {})[sel.dbId];
          const yuk = s.fotoYuk;
          const bagli = !!(this._sb && s.sunucu && sel.dbId);
          return {
            sunucu: true, izgara: bagli,
            list: (list || []).map((f, i) => ({
              url: f.url, alt: sel.code + ' fotoğrafı',
              img: this.imgEl(f.url, sel.code + ' fotoğrafı'),
              ac: () => this.setState({ buyut: { i, dbId: sel.dbId } }),
              indir: () => this.medyaIndir(f.url, `${sel.code}-${(f.yuklendi || '').slice(0, 10)}-${f.id}.jpg`),
              meta: `${f.yukleyen} · ${(f.yuklendi || '').slice(0, 10).split('-').reverse().join('.')}`,
              kb: f.boyut ? Math.round(f.boyut / 1024) + ' KB' : '',
              silinir: f.yazilabilir && this.yazabilir(sel),
              sil: () => this.fotoKaldir(f, sel)
            })),
            bos: bagli ? (!!list && list.length === 0) : true,
            sesler: ((s.kayitliSesler || {})[sel.dbId] || []).map(x => ({
              url: x.url, player: this.audioEl(x.url),
              indir: () => this.medyaIndir(x.url, `${sel.code}-sesli-not-${x.id}.${/mp4|m4a/.test(x.anahtar || '') ? 'm4a' : 'webm'}`),
              meta: `${x.yukleyen} · ${x.sure ? Math.floor(x.sure / 60) + ':' + String(x.sure % 60).padStart(2, '0') : '—'}${x.boyut ? ' · ' + Math.round(x.boyut / 1024) + ' KB' : ''}`,
              silinir: x.yazilabilir && this.yazabilir(sel),
              sil: () => this._sb.fotoSil(x.id).then(r => {
                if (!r.ok) return this.say(r.err, true);
                this.fotoYenile(sel.dbId);
                this.duyur('Sesli not çöp kutusuna taşındı — 30 gün içinde geri getirilebilir.', 5000);
              })
            })),
            yukleniyor: !!yuk,
            yukText: yuk ? `Yükleniyor · ${yuk.biten}/${yuk.toplam}` : '',
            kilitli: !this.yazabilir(sel),
            eklenebilir: this.yazabilir(sel) && !yuk,
            cek: () => this.fotoSec(true),
            galeri: () => this.fotoSec(false),
            note: !this.yazabilir(sel)
              ? `${sel.district} ilçesi — fotoğraf ekleme yetkiniz yok, mevcut fotoğrafları görebilirsiniz.`
              : bagli
                ? 'Fotoğraflar yüklenmeden önce küçültülür — uzun kenar 1600 piksel, dosya yaklaşık 200 KB. Telefonun çektiği kare ile ekranda görülen arasında fark olmaz.'
                : `Bu kayıt henüz ortak veritabanında değil — fotoğraf seçebilirsiniz ama yükleme bağlantı kurulduktan sonra yapılır. Üst şeritteki ${s.sunucu ? 'Yenile' : 'Bağlan'} düğmesi bağlantıyı dener.`
          };
        })(),
        media: Array.from({ length: sel.photos }, (_, i) => {
          const up = sel.sync === 'pending' && i >= sel.photos - 1;
          return { state: up ? (s.offline ? 'Cihazda' : 'Yükleniyor') : 'Yüklendi', bg: up ? 'var(--color-accent)' : ui.fg, fg: up ? '#fff' : ui.bg };
        }),
        mediaEmpty: sel.photos === 0,
        faults: (s.faults.filter(f => f.assetId === sel.id).length
          ? s.faults.filter(f => f.assetId === sel.id)
          : []).map(f => ({
            type: f.type, line: `${f.no} · ${STATUS_LABEL[f.status]} · ${f.priority} · ${f.crew}`,
            dot: priColor(f.priority), tap: () => this.setState({ panel: 'ariza', faultForm: { ...f } })
          })),
        // Açık arıza özeti: sekmeye girildiğinde ilk görülen şey bu
        arizaOzet: (() => {
          const hepsi = s.faults.filter(f => f.assetId === sel.id);
          const acikOlan = hepsi.filter(f => !KAPALI_DURUM.includes(f.status) && f.status !== 'iptal');
          const kapali = hepsi.length - acikOlan.length;
          if (!hepsi.length) {
            return {
              acikVar: false, acikYok: true, kayitVar: false,
              baslik: 'Bu kayıtta arıza geçmişi yok',
              alt: 'Sahada bir sorun görürseniz aşağıdan kayıt açın.',
              fg: ui.mut, yeniLabel: 'Bu kayıt için arıza aç'
            };
          }
          if (!acikOlan.length) {
            return {
              acikVar: false, acikYok: true, kayitVar: true,
              baslik: kapali + ' arıza kapatıldı, açık kayıt yok',
              alt: 'Geçmiş kayıtlar aşağıda; yeni bir sorun için kayıt açabilirsiniz.',
              fg: ui.mut, yeniLabel: 'Bu kayıt için arıza aç'
            };
          }
          const ilk = acikOlan[0];
          const d = sureOn ? this.sureDurum(ilk) : null;
          return {
            acikVar: true, acikYok: false, kayitVar: true,
            baslik: acikOlan.length === 1
              ? 'Bu kayıtta açık arıza var: ' + ilk.no
              : 'Bu kayıtta ' + acikOlan.length + ' açık arıza var',
            alt: ilk.type + ' · ' + (STATUS_LABEL[ilk.status] || ilk.status) + ' · ' + ilk.crew
              + ' · ' + ilk.opened + (d ? ' · hedef ' + d.hedef + ' (' + d.etiket + ')' : ''),
            fg: ui.acc,
            acAd: 'Açık arızayı aç — ' + ilk.no,
            ac: () => this.setState({ panel: 'ariza', faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...ilk } }),
            yeniLabel: 'Yine de ayrı arıza aç'
          };
        })(),
        canEdit: !canWrite ? '.45' : '1',
        editLabel: !canWrite ? 'Yetki yok' : 'Kaydı düzenle'
      } : { tabs: [], rows: [], media: [], faults: [], tests: [], foto: { list: [], sunucu: false, izgara: false } },