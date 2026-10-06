      scen: {
        picker: !s.scenario,
        isNew: s.scenario === 'yeni',
        isList: s.scenario === 'mevcut' || s.scenario === 'guncelle' || s.scenario === 'foto',
        listTitle: s.scenario === 'foto' ? 'Fotoğraf eklenecek kaydı seçin'
          : (s.scenario === 'guncelle' ? 'Bilgisi güncellenecek kaydı seçin' : 'Girilecek tesisi seçin'),
        listNote: s.scenario === 'foto' ? 'Seçtiğiniz kayıt Foto sekmesinde açılır; çekilen kare çevrimdışıysa cihazda bekler.'
          : (s.scenario === 'guncelle' ? 'Kayıt Bilgi sekmesinde açılır; düzenleme önce cihaza yazılır, sonra eşitlenir.'
            : 'Kayıt detayı açılır — arıza geçmişi, fotoğraflar ve yol tarifi buradan görülür.'),
        back: () => { this._bekleyenHat = null; this._naTemizle(); this.setState({ scenario: null, newAsset: null }); }
      },
      scenarios: [
        ['yeni', 'Yeni tesis kur', 'Sahada olmayan bir kuyu, depo, AG panosu veya GES için sıfırdan kayıt açın; konum GPS’ten gelir.', canCreateAsset],
        ['mevcut', 'Mevcut tesise gir', 'Kod, köy veya haritadan seçerek var olan kaydı açın.', true],
        ['guncelle', 'Bilgi güncelle', 'Debi, seviye, sigorta gibi alanları saha ölçümüyle güncelleyin.', canWrite],
        ['foto', 'Fotoğraf ekle', 'Kayda tesis fotoğrafı ekleyin — arıza fotoğrafından ayrı tutulur.', canWrite]
      ].map(([id, title, desc, ok]) => ({
        title, desc, badge: ok ? 'Yetkiniz var' : 'Yetki yok',
        border: ok ? 'var(--color-accent)' : ui.rule, fg: ok ? ui.fg : ui.mut,
        badgeFg: ok ? ui.acc : ui.mut,
        go: () => ok
          ? (this._naTemizle(), (id === 'yeni' && s.device !== 'phone')
            ? this.naAc()
            : this.setState({ scenario: id, newAsset: id === 'yeni' ? { type: 'kuyu', district: (m && m.DISTRICTS[0].name) || '', village: '', year: '', note: '', lat: null, lon: null, photos: 0, fotoUrl: [] } : null }))
          : this.say('Bu rolde bu işlem kapalı — rol dağıtımı Ayarlar > Roller ve yetkiler ekranında.')
      })),
      scenList: [...vis].slice(0, 40).map(a => ({
        code: a.code, meta: `${TYPES[a.type].kind} · ${this.yer(a)}${a.year ? ' · ' + a.year : ''}`,
        glyph: TYPES[a.type].glyph,
        tap: () => this.setState({
          selected: a.id, panel: 'detay',
          detailTab: s.scenario === 'foto' ? 'medya' : 'bilgi'
        }, () => this.flyTo(a.lat, a.lon, 16))
      })),
      newAsset: {
        typeBtns: Object.keys(TYPES).map(k => ({
          label: TYPES[k].label, sub: TYPES[k].kind,
          bg: na && na.type === k ? 'var(--color-accent)' : 'transparent',
          fg: na && na.type === k ? '#fff' : ui.mut,
          pick: () => this.setState({ newAsset: { ...this.state.newAsset, type: k } })
        })),
        district: na ? na.district : '', village: na ? na.village : '',
        year: na ? na.year : '', note: na ? na.note : '',
        durumSec: [['aktif', 'Aktif'], ['pasif', 'Pasif']].map(([v, l]) => ({
          label: l,
          bg: (na && na.status === v) || (!na || !na.status) && v === 'aktif' ? 'var(--color-accent)' : 'transparent',
          fg: (na && na.status === v) || (!na || !na.status) && v === 'aktif' ? '#fff' : ui.fg,
          pick: () => this.setState({ newAsset: { ...this.state.newAsset, status: v } })
        })),
        districts: m ? m.DISTRICTS.map(d => d.name) : [],
        villages: (() => {
          if (!m || !na) return [];
          const d = m.DISTRICTS.find(x => x.name === na.district);
          return this.koyList(m, d);
        })(),
        coordText: na && na.lat != null && na.lon != null ? `${na.lat.toFixed(5)} , ${na.lon.toFixed(5)}` : 'Konum alınmadı',
        coordNote: na && na.lat != null && na.lon != null
          ? (na.coordAcc
            ? `Cihaz GPS · ±${na.coordAcc} m — kayıt “saha ölçümü” olarak işaretlenir.`
            : 'Yaklaşık konum — GPS alınamadı, köy/ilçe merkezi kondu. Sahada gerçek GPS ile düzeltilmeli.')
          : 'GİT düğmesi cihaz GPS’ini ister; alınamazsa köy/ilçe merkezi yaklaşık konum olarak konur.',
        coordColor: na && na.lat != null && na.lon != null ? (na.coordAcc ? ui.acc : 'var(--color-uyari)') : ui.mut,
        photos: na ? (na.fotoUrl || []).map(url => ({ img: this.imgEl(url, 'Yeni tesis fotoğrafı') })) : [],
        photoCount: na ? `${na.photos} fotoğraf` : '0 fotoğraf',
        code: na ? `KS-${TYPES[na.type].pre}-YENİ` : '',
        cta: s.offline ? 'Cihaza kaydet (kuyruğa al)' : 'Kaydet ve eşitle'
      },
      naAc: canCreateAsset ? () => this.naAc() : () => this.say('Bu rolde yeni tesis kaydı kapalı — rol dağıtımı Ayarlar > Yetkiler ekranında.'),
      naAcVar: canCreateAsset && s.device !== 'phone',
      naSz: (() => {
        const z = s.naSz, n = s.newAsset;
        if (!z || !n) return { acik: false, haritada: false };
        const setZ = p => this.setState(st => ({ naSz: { ...st.naSz, ...p } }));
        const setN = p => this.setState(st => ({ newAsset: { ...st.newAsset, ...p } }));
        const adim = z.adim;
        const konumVar = n.lat != null && n.lon != null && isFinite(n.lat) && isFinite(n.lon);
        const icinde = konumVar && n.lat > 38.7 && n.lat < 39.85 && n.lon > 33.3 && n.lon < 34.8;
        let yakin = null;
        if (konumVar) {
          let bd = Infinity, best = null;
          (s.assets || []).forEach(a => { if (a && a.lat != null) { const d = this.mesafeM(a, n); if (d < bd) { bd = d; best = a; } } });
          if (best && bd < 60) yakin = { a: best, d: Math.round(bd) };
        }
        const konumAnahtar = konumVar ? n.lat.toFixed(6) + ',' + n.lon.toFixed(6) : '';
        const onayli = !!yakin && z.onay === konumAnahtar;
        const yilHam = String(n.year || '').trim();
        const yilOk = !yilHam || (/^\d{4}$/.test(yilHam) && +yilHam >= 1900 && +yilHam <= new Date().getFullYear() + 1);
        const ok = adim === 1 ? !!n.village : (adim === 2 ? (konumVar && icinde && (!yakin || onayli)) : yilOk);
        const uyari = adim === 1 ? (n.village ? '' : 'Köy / yerleşim seçin — konum doğrulaması ve raporlar buna dayanır.')
          : adim === 2 ? (!konumVar ? 'Konum zorunlu — üç yoldan biriyle verin.' : (!icinde ? 'Koordinat Kırşehir sınırlarının dışında görünüyor.' : (yakin && !onayli ? 'Yakında kayıtlı tesis var — kontrol edin.' : '')))
            : (yilOk ? (s.offline ? 'Çevrimdışısınız — kayıt cihaza yazılır, bağlantı gelince gider.' : 'Kaydedilince bütün ekiplerin ekranına düşer.') : 'Yapım yılı 4 haneli olmalı ya da boş kalmalı.');
        const seg = (on) => ({ bg: on ? (dark ? '#48484a' : '#ffffff') : 'transparent', golge: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none', fg: on ? ui.fg : ui.mut });
        const ac = (on, gecti) => ({
          bg: gecti ? 'var(--color-accent)' : (on ? ui.surf : ui.surf2), fg: gecti ? '#fff' : (on ? ui.acc : ui.mut),
          halka: on ? '0 0 0 2px var(--color-accent)' : 'none'
        });
        const parse = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
        return {
          acik: !z.haritada, haritada: !!z.haritada,
          kod: this.siradakiKod(n.type),
          kapat: () => this.naKapat(),
          adimlar: [['Tür ve yer', 1], ['Konum', 2], ['Bilgi ve foto', 3]].map(([l, k], i) => {
            const st = ac(adim === k, adim > k);
            return { l, ic: adim > k ? '✓' : String(k), bg: st.bg, fg: st.fg, halka: st.halka, tc: adim >= k ? ui.fg : ui.mut, cizgi: i < 2, cizgiW: adim > k ? '100%' : '0%' };
          }),
          a1: adim === 1, a2: adim === 2, a3: adim === 3,
          turler: Object.keys(TYPES).map(k => {
            const on = n.type === k;
            return {
              label: TYPES[k].label, sub: TYPES[k].kind, glyph: TYPES[k].glyph,
              bg: on ? (dark ? 'rgba(10,132,255,.16)' : 'var(--color-accent-100)') : ui.surf2,
              halka: on ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px ' + ui.rule,
              pick: () => setN({ type: k })
            };
          }),
          yollar: [['gps', 'Cihaz GPS’i'], ['harita', 'Haritadan seç'], ['yaz', 'Koordinat yaz']].map(([id, l]) => ({ l, ...seg(z.yol === id), pick: () => setZ({ yol: id }) })),
          yGps: z.yol === 'gps', yHarita: z.yol === 'harita', yYaz: z.yol === 'yaz',
          haritadaSec: () => { setZ({ haritada: true }); this.setState({ tab: 'harita', panel: 'yok' }); this.say('Haritada tesisin yerine çift tıklayın.'); },
          haritaVazgec: () => setZ({ haritada: false }),
          latTxt: z.latTxt != null ? z.latTxt : (konumVar && z.yol === 'yaz' ? String(n.lat) : ''),
          lonTxt: z.lonTxt != null ? z.lonTxt : (konumVar && z.yol === 'yaz' ? String(n.lon) : ''),
          onLat: e => { const v = e.target.value; setZ({ latTxt: v }); setN({ lat: parse(v), coordAcc: null }); },
          onLon: e => { const v = e.target.value; setZ({ lonTxt: v }); setN({ lon: parse(v), coordAcc: null }); },
          konumTxt: konumVar ? n.lat.toFixed(6) + ', ' + n.lon.toFixed(6) : 'Konum henüz yok',
          konumNot: !konumVar ? 'Sahadaysanız GPS, ofisteyseniz haritadan seçin ya da koordinat yazın.'
            : (!icinde ? 'Bu nokta il sınırının dışında — rakamları kontrol edin.'
              : (n.coordAcc ? 'Cihaz GPS · ±' + n.coordAcc + ' m — “saha ölçümü” olarak işaretlenir.' : 'Yaklaşık konum — sahada GPS ile düzeltilebilir.')),
          konumZemin: !konumVar ? ui.surf2 : (icinde ? (dark ? 'rgba(48,209,88,.12)' : 'rgba(52,199,89,.1)') : 'var(--color-uyari-100)'),
          konumNokta: !konumVar ? ui.mut : (icinde ? '#34c759' : 'var(--color-uyari)'),
          yakinVar: !!yakin && icinde,
          yakinTxt: yakin ? `${yakin.d} m yakında ${yakin.a.code} var (${TYPES[yakin.a.type].kind}${yakin.a.village ? ', ' + yakin.a.village : ''})` : '',
          yakinAc: () => { if (!yakin) return; const a = yakin.a; this.naKapat(); this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita' }, () => this.flyTo(a.lat, a.lon, 16)); },
          yakinOnay: () => setZ({ onay: onayli ? false : konumAnahtar }),
          onayL: onayli ? '✓ Farklı tesis, devam' : 'Farklı tesis, devam et',
          onayBg: onayli ? '#34c759' : ui.fg, onayFg: onayli ? '#fff' : ui.bg,
          yilBr: yilOk ? ui.rule : 'var(--color-uyari)',
          yilNot: yilOk ? (yilHam ? '' : 'Bilinmiyorsa boş bırakın — tahmin yazmayın, “eksik” sayılır.') : 'Geçersiz yıl',
          yilNotC: yilOk ? ui.mut : 'var(--color-uyari)',
          uyari, uyariC: ok ? ui.mut : 'var(--color-bekle)',
          geriVar: adim > 1, geri: () => setZ({ adim: adim - 1 }),
          ileriL: adim === 3 ? (s.offline ? 'Cihaza kaydet' : 'Kaydet') : 'Devam',
          ileriBg: adim === 3 ? '#34c759' : 'var(--color-accent)', ileriOp: ok ? 1 : .45,
          ileri: () => { if (!ok) return; if (adim === 3) this._yeniKaydet(); else setZ({ adim: adim + 1 }); }
        };
      })(),
      onNaDistrict: e => this.setState({ newAsset: { ...this.state.newAsset, district: e.target.value, village: '' } }),
      onNaVillage: e => this.setState({ newAsset: { ...this.state.newAsset, village: e.target.value } }),
      onNaYear: e => this.setState({ newAsset: { ...this.state.newAsset, year: e.target.value } }),
      onNaNote: e => this.setState({ newAsset: { ...this.state.newAsset, note: e.target.value } }),
      grabLocation: () => {
        // Köy/ilçe merkezi yalnızca GPS hiç alınamazsa kullanılan, dürüstçe
        // "yaklaşık" işaretlenen bir yedek — rastgele sapma eklenmez, çünkü
        // rastgelelik daha sonra düzeltilemez ve konumu daha "gerçek" gösterip
        // yanıltır.
        const yaklasikMerkez = () => {
          const na = this.state.newAsset;
          const d = m && m.DISTRICTS.find(x => x.name === na.district);
          const elle = d ? this.ekKoyKoord(d.id, na.village) : null;
          if (elle) return { lat: elle.lat, lon: elle.lon };
          const yer = na.village && this._yer ? this._yer.find(r => nkey(r[0]) === nkey(na.village)) : null;
          if (yer) return { lat: yer[1], lon: yer[2] };
          return { lat: d ? d.lat : STD_LOC.lat, lon: d ? d.lon : STD_LOC.lon };
        };
        if (!navigator.geolocation) {
          const { lat, lon } = yaklasikMerkez();
          this.setState({ newAsset: { ...this.state.newAsset, lat, lon, coordAcc: null } });
          this.toMap({ ks: 'go', lat, lon, label: 'Yeni tesis konumu · yaklaşık (cihazda GPS yok)' });
          return this.say('Bu cihazda GPS yok — köy/ilçe merkezi yaklaşık konum olarak kondu, sahada gerçek GPS ile düzeltin.', true);
        }
        this.say('Konum aranıyor…');
        navigator.geolocation.getCurrentPosition(
          p => {
            const lat = p.coords.latitude, lon = p.coords.longitude, acc = Math.round(p.coords.accuracy);
            this.setState({ newAsset: { ...this.state.newAsset, lat, lon, coordAcc: acc } });
            this.toMap({ ks: 'go', lat, lon, label: 'Yeni tesis konumu · cihaz GPS ±' + acc + ' m' });
            this.say('Konum alındı · cihaz GPS ±' + acc + ' m — haritada işaretlendi.');
          },
          err => {
            const { lat, lon } = yaklasikMerkez();
            this.setState({ newAsset: { ...this.state.newAsset, lat, lon, coordAcc: null } });
            this.toMap({ ks: 'go', lat, lon, label: 'Yeni tesis konumu · yaklaşık (GPS alınamadı)' });
            this.say('Konum alınamadı (' + (err.code === 1 ? 'izin verilmedi' : 'zaman aşımı ya da hata')
              + ') — köy/ilçe merkezi yaklaşık kondu, sahada gerçek GPS ile düzeltin.', true);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      },
      // Yeni kayıt formundaki fotoğraflar kayıt açılana kadar bellekte bekler,
      // kayıt veritabanına yazılınca gerçek dosya olarak yüklenir.
      addNaPhoto: () => {
        let inp = this._naInput;
        if (!inp) {
          inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = 'image/*';
          inp.style.position = 'fixed';
          inp.style.left = '-9999px';
          inp.style.opacity = '0';
          document.body.appendChild(inp);
          this._naInput = inp;
        }
        inp.value = '';
        inp.multiple = s.device !== 'phone';
        if (s.device === 'phone') inp.setAttribute('capture', 'environment');
        else inp.removeAttribute('capture');
        inp.onchange = () => {
          const list = [...(inp.files || [])].filter(f => /^image\//.test(f.type));
          inp.value = '';
          if (!list.length || !this.state.newAsset) return;
          this._naFiles = [...(this._naFiles || []), ...list];
          const urls = list.map(f => URL.createObjectURL(f));
          this._naUrls = [...(this._naUrls || []), ...urls];
          this.setState(st => ({ newAsset: st.newAsset ? { ...st.newAsset, photos: (st.newAsset.photos || 0) + list.length, fotoUrl: [...(st.newAsset.fotoUrl || []), ...urls] } : st.newAsset }));
        };
        inp.click();
      },
      saveNewAsset: this._yeniKaydet = () => {
        const n = this.state.newAsset;
        const naNot = (n.note || '').trim();
        if (!n.village) return this.say('Köy / yerleşim seçin.');
        if (n.lat == null || n.lon == null || !isFinite(n.lat) || !isFinite(n.lon)) return this.say('Konumu alın — GİT düğmesi.');
        const yilHam = String(n.year || '').trim();
        const yil = parseInt(yilHam, 10);
        if (yilHam && !(yil >= 1900 && yil <= new Date().getFullYear() + 1)) return this.say('Yapım yılı geçersiz — bilinmiyorsa boş bırakın.');
        const dosyalar = this._naFiles || [];
        this._naFiles = [];
        const sunucuVar = !!(this._sb && this._sb.tokenOku() && !s.offline);
        const asset = {
          id: 'na' + Date.now(), type: n.type, village: n.village, district: n.district,
          lat: n.lat, lon: n.lon, coordApprox: !n.coordAcc,
          code: this.siradakiKod(n.type),
          status: n.status === 'pasif' ? 'pasif' : 'aktif', sync: sunucuVar ? 'synced' : 'pending', photos: 0,
          year: yilHam ? yil : '',
          d: {}
        };
        // Elle açılan kayıt damgası: yalnızca bu damgayı taşıyanlar
        // çevrimdışı kuyruktan sunucuya gönderilir.
        asset.elle = true;
        const denetle = kod => this.denetimYaz('kayit', 'Yeni tesis kaydı açıldı',
          TYPES[asset.type].kind + ' · ' + asset.village + ' · ' + asset.district, kod);
        if (this._sb && this._sb.tokenOku() && !s.offline) {
          if (!this.yazabilir(asset)) return this.kilitUyar(asset);
          const eskiForm = { newAsset: n, naSz: s.naSz, scenario: s.scenario, tab: s.tab };
          this.setState({ scenario: null, newAsset: null, naSz: null, tab: 'harita' });
          this._sb.tesisKaydet(asset).then(async r => {
            if (!r.ok) {
              // Form ve fotoğraflar kaybolmasın: kullanıcı düzeltip yeniden kaydedebilir
              this._naFiles = dosyalar;
              this.setState({ ...eskiForm, naSz: eskiForm.naSz ? { ...eskiForm.naSz, adim: 3, haritada: false } : null });
              this.say((r.cevrimdisi
                ? 'Bağlantı kesildi — kayıt gönderilemedi. Çevrimdışı kipe geçip yeniden deneyin, kayıt cihazda beklesin.'
                : r.err) + ' Form açık kaldı, bilgileriniz kaybolmadı.', true);
              setTimeout(() => this.setState({ toast: null }), 12000);
              return;
            }
            await this.veriYenile(true);
            const yeni = this.state.assets.find(x => x.dbId === r.data);
            // Kod çakışırsa sunucu sıradaki boş kodu verir; mesaj ve iz gerçek kodu yazar
            asset.code = yeni ? yeni.code : asset.code;
            denetle(asset.code);
            if (naNot) {
              if (yeni) this.setState(st => ({ notes: { ...st.notes, [yeni.id]: naNot } }));
              if (yeni) this.iz(yeni.id, 'Saha notu eklendi', naNot.slice(0, 90));
              this._sb.notEkle(r.data, naNot);
            }
            this.setState({ selected: yeni ? yeni.id : null, panel: yeni ? 'detay' : 'yok', detailTab: 'bilgi' });
            if (yeni && this._bekleyenHat) { this.hatKaydet(yeni.id, this._bekleyenHat); this._bekleyenHat = null; }
            if (yeni) this.flyTo(yeni.lat, yeni.lon, 15);
            this.say(`${asset.code} veritabanına yazıldı — bütün ekiplerin ekranında görünüyor. Detay alanlarını şimdi doldurabilirsiniz.`, true);
            setTimeout(() => this.setState({ toast: null }), 8000);
            if (yeni && dosyalar.length) await this.fotoGonder(yeni, dosyalar);
            this._naTemizle();
          });
          return;
        }
        this.setState({
          assets: [asset, ...s.assets], scenario: null, newAsset: null, naSz: null,
          notes: naNot ? { ...s.notes, [asset.id]: naNot } : s.notes,
          selected: asset.id, panel: 'detay', detailTab: 'bilgi', tab: 'harita',
          queue: [{ id: 'q' + Date.now(), title: asset.code + ' · yeni tesis', meta: `${asset.village} · ${TYPES[asset.type].kind}`, state: 'pending', dotPend: true }, ...s.queue]
        });
        denetle(asset.code);
        if (this._bekleyenHat) { this.hatKaydet(asset.id, this._bekleyenHat); this._bekleyenHat = null; }
        this.yerelTesisYaz([asset, ...this.yerelTesisOku().filter(x => x.code !== asset.code)]);
        this.flyTo(asset.lat, asset.lon, 15);
        if (naNot) this.iz(asset.id, 'Saha notu eklendi', naNot.slice(0, 90));
        this._naTemizle();
        this.say((s.offline ? 'Yeni tesis cihaza kaydedildi — bağlantı gelince kendiliğinden yüklenir.' : 'Yeni tesis cihaza kaydedildi — ortak veritabanı oturumu yok, bağlanınca gönderilir.')
          + (dosyalar.length ? ' Çektiğiniz ' + dosyalar.length + ' fotoğraf yüklenemedi; bağlantı gelince kayıt kartının Foto sekmesinden ekleyin.' : ''), !!dosyalar.length);
      },
      buyut: (() => {
        const b = s.buyut;
        // çöp kutusundan gelen tek fotoğraf: doğrudan adresle gösterilir
        if (b && b.url) {
          return {
            on: true,
            img: React.createElement('img', {
              src: b.url, alt: b.ad || 'Fotoğraf',
              style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }
            }),
            sayac: '1 / 1', meta: b.ad || '', coklu: false,
            onceki: () => {}, sonraki: () => {},
            indir: () => this.medyaIndir(b.url, (b.ad || 'foto').replace(/[^\wğüşiöçĞÜŞİÖÇ.-]+/g, '-') + '.jpg'),
            kapat: () => this.setState({ buyut: null })
          };
        }
        const liste = b ? ((s.fotolar || {})[b.dbId] || []) : [];
        if (!b || !liste.length) return { on: false, sayac: '', meta: '', img: null, coklu: false };
        const i = Math.max(0, Math.min(b.i, liste.length - 1));
        const f = liste[i];
        const git = k => this.setState({ buyut: { ...b, i: (k + liste.length) % liste.length } });
        return {
          on: true,
          img: React.createElement('img', {
            src: f.url, alt: 'Fotoğraf',
            style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }
          }),
          sayac: `${i + 1} / ${liste.length}`,
          meta: `${f.yukleyen || ''} · ${(f.yuklendi || '').slice(0, 10).split('-').reverse().join('.')}${f.boyut ? ' · ' + Math.round(f.boyut / 1024) + ' KB' : ''}`,
          coklu: liste.length > 1,
          onceki: () => git(i - 1),
          sonraki: () => git(i + 1),
          indir: () => this.medyaIndir(f.url, `foto-${f.id}.jpg`),
          kapat: () => this.setState({ buyut: null })
        };
      })(),
      yeniTesisAc: () => can('create')
        ? (s.device !== 'phone' ? this.naAc() : (this._naTemizle(), this.setState({ tab: 'islem', scenario: 'yeni', newAsset: { type: 'kuyu', district: (m && m.DISTRICTS[0].name) || '', village: '', year: '', note: '', lat: null, lon: null, photos: 0, fotoUrl: [] } })))
        : this.say('Yeni tesis kayd\u0131n\u0131 M\u00fchendis ve \u00fcst\u00fc a\u00e7ar.'),
      silKayit: !can('sil') ? null : () => {
        const a = sel;
        if (!a) return;
        if (!this.yazabilir(a)) return this.kilitUyar(a);
        this.denetimYaz('veri', 'Kayıt çöp kutusuna taşındı',
          TYPES[a.type].kind + ' · ' + this.yer(a), a.code);
        const me2 = s.session;
        if (a.dbId && this._sb) {
          this._sb.tesisSil(a.dbId).then(r => {
            if (!r.ok) { this.say(r.err, true); return; }
            this.setState({ selected: null, panel: 'yok' });
            this.veriYenile(true);
            this.say(`${a.code} çöp kutusuna taşındı — 30 gün içinde geri getirilebilir. Ayarlar > Çöp kutusu. Kayıt herkesin ekranından kalktı.`, true);
            setTimeout(() => this.setState({ toast: null }), 7000);
          });
          return;
        }
        this.setState({
          assets: s.assets.filter(x => x.id !== a.id),
          trash: [{ a, silen: me2 ? me2.name : '—', t: this.damga(), gun: 30 }, ...s.trash],
          selected: null, panel: 'yok'
        });
        this.say(`${a.code} çöp kutusuna taşındı — 30 gün içinde geri getirilebilir. Ayarlar > Çöp kutusu.`, true);
        setTimeout(() => this.setState({ toast: null }), 6000);
      },
      silLabel: !can('sil') ? 'Silme yetkiniz yok' : (sel && !this.yazabilir(sel) ? 'Bu ilçede yetkiniz yok' : 'Kaydı sil'),
      canSil: can('sil'),
      // ilçe yetkisi: kayıt başka ilçedeyse ekranda kilit görünür
      kilit: (() => {
        const me2 = s.session;
        if (!sel || !me2 || this.yazabilir(sel)) return { on: false, text: '' };
        return {
          on: true,
          text: `${sel.district} ilçesi — görüntüleme yetkiniz var, değiştirme yetkiniz yok. Sorumluluk bölgeniz ${me2.bolge || '—'}. Değişiklik için ilçe sorumlusuna veya müdüre başvurun.`
        };
      })(),
      card: (() => {
        const a = s.card;
        if (!a) return { on: false, rows: [], code: '', kind: '', place: '', koord: '', notu: '', tarih: '', chart: this.denemeGrafik(null) };
        return {
          on: true, code: a.code, kind: TYPES[a.type].kind, place: this.yer(a),
          koord: `${a.lat.toFixed(6)} , ${a.lon.toFixed(6)}`,
          yil: a.year || '—',
          barkod: 'BK-' + a.code.slice(3),
          notu: s.notes[a.id] || '',
          hasNot: !!s.notes[a.id],
          tarih: this.damga(),
          chart: this.denemeGrafik(a),
          // başlık satırları karta yazılmaz — iki kolonlu akışta üyelerinden kopuyorlar
          rows: this.rows(a)
            .filter(([, v, hi]) => hi !== 2 && String(v).indexOf('— eksik') !== 0)
            .map(([label, value]) => ({ label, value: String(value) })),
          yazdir: () => { try { window.print(); } catch (e) { /* engelli */ } },
          kapat: () => this.setState({ card: null })
        };
      })(),
      kartAc: () => sel && this.setState({ card: sel }),
      envKontrol: envKontrol,
      list: envSatir.map(a => {
        const pend = a.sync === 'pending';
        return {
          code: a.code, typeLabel: TYPES[a.type].kind, place: this.yer(a),
          year: a.year || '—', photos: a.photos, glyph: TYPES[a.type].glyph,
          metaPhone: `${TYPES[a.type].kind} · ${this.yer(a)}`,
          rowBg: a.id === s.selected ? ui.sel : 'transparent',
          fill: pend ? 'var(--color-accent)' : 'transparent',
          stroke: pend ? 'var(--color-accent)' : ui.rule,
          ink: pend ? '#fff' : ui.fg,
          sLabel: pend ? 'Bekliyor' : 'Eşitlendi', sVar: !!pend,
          sBg: pend ? ui.pend : 'transparent',
          sFg: pend ? (dark ? 'var(--color-accent-400)' : 'var(--color-accent-700)') : ui.mut,
          sBorder: pend ? 'var(--color-accent)' : ui.rule,
          aLabel: aktifAd(a),
          aBg: aktifMi(a) ? 'transparent' : '#3f4a5a',
          aFg: aktifMi(a) ? ui.fg : '#fff',
          aBorder: aktifMi(a) ? ui.rule : '#3f4a5a',
          solgun: '1',
          tap: () => { this.flyTo(a.lat, a.lon, 16); this.setState({ selected: a.id, panel: 'detay', detailTab: 'bilgi' }); }
        };
      }),
      listNote: qn.length > 1
        ? `“${q}” araması — köy adı, ilçe, kayıt kodu ve bütün teknik alanlarda arandı.`
        : `${vis.length} kayıt. Arama kutusuna köy adı yazın — liste yalnızca o köyün kayıtlarına iner.`,

      closeDetail: () => this.setState({ selected: null, panel: 'yok' }),

      goImport: () => !can('create')
        ? this.say('Toplu aktarımı Mühendis ve üstü yapar.')
        : (s.device === 'phone'
            ? this.duyur('Dış veri aktarımı bilgisayardan yapılır — dosya seçmek ve yüzlerce noktayı tek tek işaretlemek telefon ekranında güvenli değil. Aynı hesapla bilgisayardan girin.', 9000)
            : this.setState({ tab: 'aktarim', imp: null })),
      goSettings: () => this.setState({ tab: 'ayarlar' }),
      testForm: {
        open: !!s.testForm,
        statik: s.testForm ? s.testForm.statik : '', dinamik: s.testForm ? s.testForm.dinamik : '',
        debi: s.testForm ? s.testForm.debi : '', sure: s.testForm ? s.testForm.sure : '',
        toparlanma: s.testForm ? s.testForm.toparlanma : '', note: s.testForm ? s.testForm.note : '',
        dusum: (() => {
          const f = s.testForm; if (!f) return '—';
          const d = Math.abs(parseFloat(f.dinamik) - parseFloat(f.statik));
          return isFinite(d) && d > 0 ? d.toFixed(1) + ' m' : '—';
        })(),
        ozgul: (() => {
          const f = s.testForm; if (!f) return '—';
          const d = Math.abs(parseFloat(f.dinamik) - parseFloat(f.statik)), q = parseFloat(f.debi);
          return isFinite(d) && d > 0 && isFinite(q) ? (q / d).toFixed(2) + ' l/s/m' : '—';
        })(),
        warn: (() => {
          const f = s.testForm; if (!f) return '';
          const a = parseFloat(f.statik), b = parseFloat(f.dinamik);
          return isFinite(a) && isFinite(b) && b < a ? 'Dinamik seviye statikten sığ girildi — düşüm mutlak değer olarak alındı, alanları kontrol edin.' : '';
        })(),
        hasWarn: (() => {
          const f = s.testForm; if (!f) return false;
          const a = parseFloat(f.statik), b = parseFloat(f.dinamik);
          return isFinite(a) && isFinite(b) && b < a;
        })()
      },
      openTestForm: () => canWrite
        ? this.setState({ testForm: { statik: '', dinamik: '', debi: '', sure: '', toparlanma: '', note: '' } })
        : this.say('Bu rolde deneme ölçümü girilemez.'),
      closeTestForm: () => this.setState({ testForm: null }),
      onTestStatik: e => this.setState({ testForm: { ...this.state.testForm, statik: e.target.value } }),
      onTestDinamik: e => this.setState({ testForm: { ...this.state.testForm, dinamik: e.target.value } }),
      onTestDebi: e => this.setState({ testForm: { ...this.state.testForm, debi: e.target.value } }),
      onTestSure: e => this.setState({ testForm: { ...this.state.testForm, sure: e.target.value } }),
      onTestToparlanma: e => this.setState({ testForm: { ...this.state.testForm, toparlanma: e.target.value } }),
      onTestNote: e => this.setState({ testForm: { ...this.state.testForm, note: e.target.value } }),
      saveTest: () => {
        const f = s.testForm, id = sel && sel.id;
        if (!id) return;
        const a1 = parseFloat(f.statik), a2 = parseFloat(f.dinamik), q = parseFloat(f.debi);
        if (!isFinite(a1) || !isFinite(a2) || !isFinite(q)) return this.say('Statik, dinamik ve debi zorunlu.');
        const st = Math.min(a1, a2), dn = Math.max(a1, a2), dus = dn - st;
        const rec = {
          date: new Date().toLocaleDateString('tr-TR'), by: me ? me.name : '—',
          statik: st.toFixed(1) + ' m', dinamik: dn.toFixed(1) + ' m',
          dusum: dus > 0 ? dus.toFixed(1) + ' m' : '—',
          debi: q.toFixed(1) + ' l/s',
          sure: f.sure ? f.sure + ' saat' : '—',
          toparlanma: f.toparlanma ? f.toparlanma + ' dk' : '—',
          ozgul: dus > 0 ? (q / dus).toFixed(2) + ' l/s/m' : '—',
          note: f.note, pend: s.offline
        };
        this.setState({
          testForm: null,
          tests: { ...s.tests, [id]: [rec, ...(s.tests[id] || [])] },
          queue: [{ id: 'q' + Date.now(), title: sel.code + ' · deneme ölçümü', meta: `${rec.debi} · düşüm ${rec.dusum} · özgül ${rec.ozgul}`, state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
        });
        this.say(s.offline ? 'Deneme ölçümü cihaza yazıldı — kuyruğa alındı.' : `Deneme kaydedildi · özgül debi ${rec.ozgul}.`);
      },
      editDetail: () => {
        if (!sel) return;
        if (!canWrite) return this.say('Bu rolde kayıt düzenleme kapalı.');
        if (!this.yazabilir(sel)) return this.kilitUyar(sel);
        const d = sel.d || {};
        const bos = v => (v === '—' || v === 'Yeni kayıt' || v === undefined || v === null) ? '' : v;
        const g = { id: sel.id, year: sel.year == null ? '' : String(sel.year), ilce: sel.district || '', koy: sel.village || '', d: {} };
        for (const [, alanlar] of (ALANLAR[sel.type] || [])) {
          for (const [k] of alanlar) {
            if (k === 'year') continue;
            g.d[k] = typeof d[k] === 'boolean' ? d[k] : String(bos(d[k]));
          }
        }
        this.setState({ alanForm: g });
      },
      alanDuzenle: (() => {
        const g = s.alanForm;
        const a = g && s.assets.find(x => x.id === g.id);
        if (!g || !a) return { on: false, baslik: '', kod: '', gruplar: [], kaydet: () => {}, iptal: () => {} };
        const set = (k, v) => this.setState(st => ({
          alanForm: k === 'year'
            ? { ...st.alanForm, year: v }
            : { ...st.alanForm, d: { ...st.alanForm.d, [k]: v } }
        }));
        return {
          on: true,
          kod: a.code,
          ilce: g.ilce, koy: g.koy,
          ilceler: (m ? m.DISTRICTS.map(d => d.name) : []).map(n => ({ n })),
          koyler: (() => {
            const d = m && m.DISTRICTS.find(x => x.name === g.ilce);
            return (d ? (m.VILLAGES[d.id] || []) : []).map(n => ({ n }));
          })(),
          onIlce: e => this.setState(st => ({ alanForm: { ...st.alanForm, ilce: e.target.value, koy: '' } })),
          onKoy: e => this.setState(st => ({ alanForm: { ...st.alanForm, koy: e.target.value } })),
          baslik: TYPES[a.type].kind + ' · alanları düzenle',
          not: 'Boş bıraktığınız alan “— eksik” kalır ve Özet ekranındaki eksik listesinde durur. Kayıt önce cihaza yazılır, bağlantı varsa hemen eşitlenir.',
          gruplar: (ALANLAR[a.type] || []).map(([baslik, alanlar]) => ({
            baslik,
            alanlar: alanlar.map(([k, label, unit, tip]) => {
              const evet = tip === 'evet';
              const ham = k === 'year' ? g.year : g.d[k];
              const acik = ham === true || ham === 'true' || ham === 'Var';
              return {
                k, label, unit: unit || '',
                evetMi: evet, metinMi: !evet,
                mod: tip === 'sayi' ? 'decimal' : 'text',
                val: evet ? '' : (ham === undefined || ham === null ? '' : ham),
                acBg: acik ? 'var(--color-accent)' : 'transparent',
                acFg: acik ? '#fff' : ui.mut,
                kapaBg: acik ? 'transparent' : ui.fg,
                kapaFg: acik ? ui.mut : ui.bg,
                onChange: e => set(k, e.target.value),
                ac: () => set(k, true), kapa: () => set(k, false)
              };
            })
          })),
          iptal: () => this.setState({ alanForm: null }),
          kaydet: () => {
            const temiz = {};
            const bool = new Set();
            for (const [, alanlar] of (ALANLAR[a.type] || [])) {
              for (const [k, , , tip] of alanlar) if (tip === 'evet') bool.add(k);
            }
            let dolu = 0;
            for (const k of Object.keys(g.d)) {
              if (bool.has(k)) {
                const v = g.d[k];
                temiz[k] = v === true || v === 'true' || v === 'Var';
                if (temiz[k]) dolu++;
                continue;
              }
              const v = typeof g.d[k] === 'boolean' ? String(g.d[k]) : String(g.d[k]).trim();
              if (v === '') { temiz[k] = ''; continue; }
              temiz[k] = v;
              dolu++;
            }
            const yilHam = String(g.year == null ? '' : g.year).replace(/[^0-9]/g, '');
            const yil = yilHam ? parseInt(yilHam, 10) : '';
            const koy = (g.koy || '').trim();
            const ilce = g.ilce || a.district;
            const yerDegisti = koy !== (a.village || '') || ilce !== a.district;
            const yeni = { ...a, village: koy, district: ilce, villageAuto: yerDegisti ? undefined : a.villageAuto, year: yil, d: { ...(a.d || {}), ...temiz }, sync: s.offline ? 'pending' : a.sync };
            this.setState({
              alanForm: null,
              assets: s.assets.map(x => x.id === a.id ? yeni : x),
              queue: s.offline
                ? [{ id: 'q' + Date.now(), title: a.code + ' · alan güncelleme', meta: dolu + ' alan', state: 'pending', dotPend: true }, ...s.queue]
                : s.queue
            }, () => { if (yerDegisti) this.toMap({ ks: 'assets', assets: this.state.assets, faults: this.state.faults }); });
            if (yerDegisti) this.iz(a.id, 'Köy bilgisi düzeltildi', `${a.village || '(boş)'} → ${koy || '(boş)'} · ${ilce}`);
            this.iz(a.id, 'Alanlar güncellendi', dolu + ' alan dolu');
            if (yeni.dbId && this._sb && this._sb.tokenOku() && !s.offline) {
              this._sb.tesisKaydet(yeni).then(r => { if (r && !r.ok && r.cevrimdisi) this.tesisBekle(yeni.id); else this.veriYenile(true); });
            }
            this.duyur(`${a.code} güncellendi · ${koy || '(köy boş)'} · ${ilce} · ${dolu} alan dolu.` + (s.offline ? ' Çevrimdışısınız — kuyruğa alındı.' : ''), 6000, 'iyi');
          }
        };
      })(),
      addDetailPhoto: () => {
        if (!sel) return;
        this.setState({
          assets: s.assets.map(a => a.id === sel.id ? { ...a, photos: a.photos + 1, sync: s.offline ? 'pending' : a.sync } : a),
          queue: [{ id: 'q' + Date.now(), title: sel.code + ' · fotoğraf', meta: s.offline ? 'cihazda · 1.2 MB' : 'yüklendi', state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
        });
        this.say(s.offline ? 'Fotoğraf cihaza kaydedildi.' : 'Fotoğraf yüklendi.');
      },