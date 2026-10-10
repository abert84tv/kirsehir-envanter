      saveFault: () => {
        const f = this.state.faultForm;
        // Mükerrer kayıt denetimi — yalnızca yeni kayıt açılırken
        if (f && !f.id && f.assetId) {
          const ben = this.mukerrerBul(f);
          if (ben.length) {
            const liste = ben.slice(0, 3).map(x => '• ' + x.no + ' · ' + x.type + ' · '
              + (STATUS_LABEL[x.status] || x.status) + ' · ' + x.opened + ' · ' + x.crew).join('\n');
            const ac = window.confirm('Bu tesiste benzer kayıt var:\n\n' + liste
              + '\n\nTAMAM: var olan kaydı açar, yeni kayıt oluşmaz.\nİPTAL: yine de ayrı kayıt açar.');
            if (ac) {
              // Talep bağı korunur: mükerrer kayıt seçilse de talep o arızaya bağlanır
              if (f.talepId) this.talepDurum(f.talepId, 'arizaya', 'Var olan ' + ben[0].no + ' kaydına bağlandı');
              return this.setState({ faultForm: { malzeme: [], sesler: [], iscilik: '', isaret: null, ...ben[0] } },
                () => this.duyur(ben[0].no + ' açıldı — mükerrer kayıt oluşmadı. Yeni bilgiyi bu kaydın notuna yazın.'
                  + (f.talepId ? ' Talep bu kayda bağlandı.' : ''), 6500, 'iyi'));
            }
          }
        }
        // Kanıtsız kapanış: fotoğraf olmadan “Çözüldü” yazılamaz. Sunucuda bu
        // arızaya bağlı fotoğraf da sayılır (önceden yalnız formda yeni
        // eklenen sayılıyordu: öncesi fotoğrafı yüklenmiş arıza kapatılamıyordu).
        if (kanitOn && f && f.status === 'cozuldu' && !((f.photos || []).length)) {
          const liste = f.dbId ? (s.fotolar || {})['a' + f.dbId] : null;
          if (f.dbId && !liste && this._sb && !this._kanitBak) {
            this._kanitBak = true;
            this.say('Kayıttaki fotoğraflar kontrol ediliyor…');
            return this.arizaFotoYenile(f.dbId).then(() => { this._kanitBak = false; this.renderVals().saveFault(); });
          }
          this._kanitBak = false;
          const sunucuda = (liste || []).filter(p => p.arizaDbId === f.dbId).length;
          if (!sunucuda) return this.say('Kanıt zorunlu — kapatmadan önce en az bir fotoğraf ekleyin.', true);
        }
        // Tesis ya da (şebeke arızasında) ilçe+köy gerekir
        if (!f || (!f.assetId && !f.ilce)) return this.say('Önce tesisi ya da arızanın köyünü seçin.', true);
        if (!f.assetId && !f.koy) return this.say('Arızanın köyünü seçin.', true);
        const a = f.assetId ? s.assets.find(x => x.id === f.assetId) : null;
        const aKod = a ? a.code : (f.koy + ' · ' + f.ilce);
        // Her kayıt önce "pending": sunucuya arizaKuyrukGonder yazar
        const sync = 'pending';
        const yeniId = f.id ? f.id : 'nf' + Date.now();
        // Numara if/else dışında üretilir: talep bağlama, denetim izi ve
        // zimmet düşümü hepsi bu numarayı kullanır.
        const arizaNo = f.id ? f.no : 'AR-' + String(101 + s.faults.length);
        if (f.id) {
          this.setState({
            faults: s.faults.map(x => x.id === f.id ? { ...f, sync } : x), panel: s.device === 'phone' ? 'yok' : 'ariza',
            faultForm: null,
            queue: [{ id: 'q' + Date.now(), title: `${f.no} · durum ${STATUS_LABEL[f.status]}`, meta: `${aKod} · ${f.crew}`, state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
          });
        } else {
          this.setState({
            faults: [{ ...f, id: yeniId, no: arizaNo, sync, reporter: s.role, opened: this.damga() }, ...s.faults],
            panel: s.device === 'phone' ? 'yok' : 'ariza', faultForm: null, tab: 'isPanosu',
            queue: [{ id: 'q' + Date.now(), title: `${arizaNo} · yeni arıza`, meta: `${aKod} · ${f.type} · ${(f.photos || []).length} fotoğraf`, state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
          });
        }
        if (f.status === 'cozuldu') setTimeout(() => this.anaCozum({ ...f, no: arizaNo }), 400);
        // Kapanan kayıtta kullanılan malzeme ekip zimmetinden düşülebilir
        // İş son onayla ilk kez kapanırken: kullanılan malzeme ekip zimmetinden KENDİLİĞİNDEN düşer (soru sorulmaz;
        // aynı işin malzemesi ikinci kez düşmez). Bağlı talebin çözülmesi sunucu kaydı gelince esitleme.js'te yapılır.
        const onceki = f.id ? ((s.faults || []).find(x => x.id === f.id) || {}).status : null;
        const yeniKapandi = f.status === 'cozuldu' && onceki !== 'cozuldu';
        if (ambarOn && yeniKapandi && (f.malzeme || []).length && f.crew && f.crew !== 'Atanmadı') {
          setTimeout(() => this.arizaStokDus({ ...f, no: arizaNo }), 0);
        }
        // Arızaya bağlı açık bir iş emri varsa arıza kapanınca o da kapanır —
        // kullanılan malzeme + toplam saat + not tesis geçmişine ayrıntılı yazılır.
        if (f.status === 'cozuldu' && f.dbId) {
          const baglIsEmri = this.isEmriBul(f.dbId);
          if (baglIsEmri && baglIsEmri.status !== 'kapatildi') {
            setTimeout(() => this.isEmriKapatVer(baglIsEmri, { ...f, no: arizaNo }), 300);
          }
        }
        if (!f.id && f.talepId) {
          const tl = [...(this.state.talepler || [])];
          const ti = tl.findIndex(x => x.id === f.talepId);
          if (ti >= 0) {
            tl[ti] = { ...tl[ti], durum: 'arizaya', arizaNo, guncelleme: this.damga() };
            this.denetimYaz('talep', 'Talep arızaya dönüştürüldü', arizaNo + ' · ' + f.type, tl[ti].no);
            this.modulYaz('talep', tl.slice(0, 1000));
            this.setState({ talepler: tl });
          }
        }
        this.denetimYaz('ariza', f.id ? 'Arıza güncellendi' : 'Arıza açıldı',
          f.type + ' · ' + (STATUS_LABEL[f.status] || f.status) + ' · ' + f.priority
          + ' · ' + (f.crew || 'ekip atanmadı'), arizaNo || (ffAsset ? ffAsset.code : ''));
        // sesli notlar da kayıtla birlikte gider. Yeni kayıtta arıza kimliği
        // sunucuya yazılınca belli olur: fotoğraf ve ses o zaman yüklenir
        // (arizaGonder), böylece arıza kanıtı olarak bağlanır.
        // Dosyalar arıza kaydının içinde tutulmaz: kayıt sonradan yeniden
        // kaydedilince aynı fotoğraf ikinci kez yükleniyordu (2026.10.01).
        const sesler = (f.sesler || []).filter(x => x.blob);
        const bekleyen = (f.photos || []).filter(p => p.file);
        this.setState(st => ({ faults: (st.faults || []).map(x => x.id === yeniId ? { ...x, photos: (x.photos || []).filter(p => !p.file), sesler: [] } : x) }));
        if (sesler.length || bekleyen.length) {
          // Dosyalar önce telefonun deposuna yazılır, sonra kayıt gönderilir
          this.medyaBirak('ariza', yeniId, ffAsset ? ffAsset.code : arizaNo, { photos: bekleyen, sesler }).then(kalici => {
            if (!kalici) {
              this._arizaMedya = this._arizaMedya || {};
              const md = this._arizaMedya[yeniId] || { photos: [], sesler: [] };
              this._arizaMedya[yeniId] = { photos: [...md.photos, ...bekleyen], sesler: [...md.sesler, ...sesler] };
            }
            this.arizaKuyrukGonder();
          });
        } else setTimeout(() => this.arizaKuyrukGonder(), 0);
        // Seçilen fotoğraf ve sesler kayıt sunucuya yazılınca yüklenir (arizaGonder)
        if (bekleyen.length && (s.offline || !this._sb)) {
          this.say(`${bekleyen.length} fotoğraf cihazda bekliyor — ${s.offline ? 'bağlantı gelince' : 'kayıt veritabanına yazıldıktan sonra'} yüklenecek.`, true);
          setTimeout(() => this.setState({ toast: null }), 8000);
        }
        // yeni arıza bildirimi: ekranın üstünde çıkar, birkaç saniye sonra kendiliğinden kalkar
        const kanal = s.bildirimKanal || 'SMS';
        const acilMi = f.priority === 'Acil' || f.priority === 'Yüksek';
        const ekipVar = !!(f.crew && f.crew !== 'Atanmadı');
        const gercekGonderim = acilMi && ekipVar && (this.state.smsAyar || {}).acik && !s.offline;
        if (!f.id) {
          // Gerçek gönderim açıksa mesaj sunucu işlevine gider; sonucu
          // arizaMesaj kendi bildirimini yazar.
          if (gercekGonderim) setTimeout(() => this.arizaMesaj({ ...f, no: arizaNo }, a), 0);
          this.duyur(`Yeni arıza · ${aKod} — ${f.type} · ${f.priority} öncelik` +
            (s.offline
              ? '. Cihaza kaydedildi, bağlantı gelince eşitlenecek.'
              : (gercekGonderim
                ? `. ${f.crew} ekibine ${kanal} gönderiliyor…`
                : (acilMi && ekipVar
                  ? `. ${f.crew} atandı — mesaj gönderimi kapalı, Ayarlar > Bildirim bölümünden açabilirsiniz.`
                  : (acilMi ? '. Ekip atanmadığı için bildirim gönderilmedi — ekip seçip kaydedin.' : '. Kayıt eşitlendi.')))), 7000, 'ariza',
            () => { const yeni = this.state.faults[0]; if (yeni) this.panoAc(yeni); });
        } else {
          this.duyur(`${f.no} güncellendi — durum ${STATUS_LABEL[f.status]}${s.offline ? ' · cihazda bekliyor' : ''}.`, 4500, 'bilgi',
            () => this.panoAc(f));
        }
      },