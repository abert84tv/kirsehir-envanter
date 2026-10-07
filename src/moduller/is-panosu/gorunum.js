      // is-panosu modülü — "İş panosu": başvuru, talep ve arızalar tek ekranda Yeni / Atandı / Sahada / Bitti sütunlarında.
      // Her kutucuk bir iş; solundaki renkli çubuk ve nokta önceliği, altındaki tek büyük düğme bir sonraki adımı gösterir.
      isPanosuEkran: (() => {
        if (tabId !== 'isPanosu') return { acik: false, kolonlar: [], panoGorunumu: true, gorunumSec: [], tablo: { acik: false, basliklar: [], satirlar: [], durumSecenek: [], ekipSecenek: [], atamaSecenek: [] }, ozet: [], telSec: [], telKartlar: [], telBos: '', telRenk: '', yeniTalep: () => {} };
        const simdi = Date.now();
        const yasMetin = ms => {
          if (!ms) return '';
          const dk = Math.max(0, Math.round((simdi - ms) / 60000));
          return dk < 2 ? 'şimdi' : dk < 60 ? dk + ' dk önce' : dk < 1440 ? Math.floor(dk / 60) + ' sa önce' : Math.floor(dk / 1440) + ' gün önce';
        };
        const ONC = { 'Acil': 0, 'Yüksek': 1, 'Normal': 2, 'Düşük': 3 };
        const oncRenk = p => p === 'Acil' ? 'var(--color-uyari)' : p === 'Yüksek' ? '#ff9f0a' : p === 'Düşük' ? '#8e8e93' : 'var(--color-accent)';
        const KOLON = [
          ['yeni', 'Yeni', '#5e5ce6', 'Yeni iş yok'],
          ['atandi', 'Atandı', '#0a84ff', 'Atanmış iş yok'],
          ['sahada', 'Sahada', '#ff9f0a', 'Sahada iş yok'],
          ['bitti', 'Bitti', '#30d158', 'Son 7 günde kapanan yok']
        ];
        const KOLON_AD = Object.fromEntries(KOLON.map(k => [k[0], k[1]]));
        const SAHA_DURUMLARI = ['sahada', 'bilgi', 'bekleme', 'yonlendirildi', 'kontrol'];
        const yeniKolonu = st => st === 'acik' || st === 'yeniden';
        const yazabilir = !!me && me.role !== 'izleyici';
        const kartlar = [];
        const secilenEkip = s.panoEkip;
        const ekipSecenek = f => CREWS.filter(c => c !== ATANMADI).map(c => {
          const is = s.faults.filter(x => x.crew === c && !KAPALI_DURUM.includes(x.status)).length;
          return { ad: c, say: is ? is + ' iş' : 'boş', sec: () => this.panoEkipAta(f, c) };
        });

        // ── başvurular (Telegram / web formu): henüz kimse almadı
        if (talepOn) for (const b of (s.basvurular || []).filter(x => x.durum === 'yeni')) {
          const ms = Date.parse(b.zaman) || 0, telg = b.konu === 'Telegram bildirimi';
          kartlar.push({
            anahtar: 'b' + b.id, kolon: 'yeni', tur: 'Başvuru', onc: 'Normal', ms,
            baslik: telg ? (String(b.aciklama || '').slice(0, 70) || 'Telegram mesajı') : (b.konu || 'Başvuru'),
            yer: (b.koy && b.koy !== 'Belirtilmedi' ? b.koy + (b.ilce ? ' · ' + b.ilce : '') : 'Köy yazılmamış'),
            kim: 'Bildiren: ' + b.ad, kimBos: false, kanal: telg ? 'Telegram' : 'Web formu',
            aciklama: telg ? '' : String(b.aciklama || '').slice(0, 110), uyari: '',
            dugme: yazabilir ? 'Değerlendir' : 'Aç', dugmeRenk: '#5e5ce6',
            git: () => this.isKartiAc('b', b.id),
            ikinci: can('assign') ? 'Spam' : '', ikinciGit: () => this.basvuruEngelle(b),
            ac: () => this.isKartiAc('b', b.id), surukle: null
          });
        }
        // ── talepler: alındı ama henüz arızaya çevrilmedi
        if (talepOn) for (const t of (s.talepler || []).filter(x => !TALEP_KAPALI.includes(x.durum))) {
          kartlar.push({
            anahtar: 't' + t.id, kolon: 'yeni', tur: 'Talep', onc: t.oncelik || 'Normal', ms: this.damgaMs(t.acilis),
            baslik: t.konu, yer: t.koy + (t.ilce ? ' · ' + t.ilce : ''),
            kim: 'Bildiren: ' + t.ad, kimBos: false, kanal: TALEP_KANAL[t.kanal] || '', aciklama: String(t.aciklama || '').slice(0, 110), uyari: '',
            dugme: yazabilir ? 'Değerlendir' : 'Aç', dugmeRenk: '#5e5ce6',
            git: () => this.isKartiAc('t', t.id),
            ikinci: '', ikinciGit: () => {}, ac: () => this.isKartiAc('t', t.id), surukle: null
          });
        }
        // ── arızalar
        if (arizaOn) for (const f of myFaults) {
          let kolon = null;
          if (yeniKolonu(f.status)) kolon = 'yeni';
          else if (f.status === 'atandi') kolon = 'atandi';
          else if (SAHA_DURUMLARI.includes(f.status)) kolon = 'sahada';
          else if (f.status === 'cozuldu') {
            const kms = f.closedIso ? Date.parse(f.closedIso) : this.damgaMs(f.closed);
            if (kms && simdi - kms < 7 * 86400000) kolon = 'bitti'; else if (!kms) kolon = 'bitti';
          }
          if (!kolon) continue;
          const a = f.assetId ? s.assets.find(x => x.id === f.assetId) : null;
          const ekipVar = !!f.crew && f.crew !== ATANMADI;
          const ms = this.damgaMs(f.opened) || (f.openedIso ? Date.parse(f.openedIso) : 0);
          const sd = sureOn && kolon !== 'bitti' ? this.sureDurum(f) : null;
          const ge = kolon !== 'bitti' && ((sd && sd.gecikti) || (kolon === 'yeni' && ms && simdi - ms > 12 * 3600000));
          let dugme = '', dugmeRenk = '', git = () => {};
          if (kolon === 'yeni') { dugme = can('assign') ? 'Ekip ata' : 'Aç'; dugmeRenk = '#5e5ce6'; git = can('assign') ? () => this.setState({ panoEkip: secilenEkip === f.id ? null : f.id }) : () => this.panoAc(f); }
          else if (kolon === 'atandi') { dugme = yazabilir ? 'Sahada' : 'Aç'; dugmeRenk = '#0a84ff'; git = yazabilir ? () => this.panoSahada(f) : () => this.panoAc(f); }
          else if (kolon === 'sahada') { dugme = f.status === 'kontrol' && can('assign') ? 'Onayla ve kapat' : (yazabilir ? 'İşi bitir' : 'Aç'); dugmeRenk = '#ff9f0a'; git = () => this.panoAc(f); }
          const durumNot = ['bilgi', 'bekleme', 'yonlendirildi', 'kontrol', 'yeniden'].includes(f.status) ? (STATUS_LABEL[f.status] || '') : '';
          kartlar.push({
            anahtar: 'f' + f.id, kolon, tur: f.no, onc: f.priority || 'Normal', ms,
            baslik: f.type || 'Arıza', yer: (a ? a.code + ' · ' + this.yerGoster(a) : [f.koy, f.ilce || f.district].filter(Boolean).join(' · ')),
            kim: ekipVar ? f.crew : 'Ekip atanmadı', kimBos: !ekipVar, kanal: '', aciklama: '',
            uyari: ge ? (sd && sd.gecikti ? sd.etiket : 'Uzun süredir bekliyor') : durumNot,
            uyariKirmizi: !!ge,
            dugme, dugmeRenk, git, ikinci: '', ikinciGit: () => {},
            ac: () => this.panoAc(f),
            ekipSec: kolon === 'yeni' && secilenEkip === f.id, ekipSecenek: kolon === 'yeni' && secilenEkip === f.id ? ekipSecenek(f) : [],
            surukle: kolon !== 'bitti' && yazabilir ? { tur: 'ariza', id: f.id } : null,
            ekipDegisir: kolon !== 'bitti' && can('assign'), ekipDeger: ekipVar ? f.crew : '',
            ekipDegis: e => { const v = e.target.value; if (v && v !== (ekipVar ? f.crew : '')) this.panoEkipAta(f, v); }
          });
        }

        const tamam = k => {
          const surukle = k.surukle;
          const renk = oncRenk(k.onc);
          const ms = k.ms;
          return {
            anahtar: k.anahtar, tur: k.tur, baslik: k.baslik, yer: k.yer, kim: k.kim,
            kimRenk: k.kimBos ? '#d97706' : ui.fg, kanal: k.kanal, kanalVar: !!k.kanal,
            aciklama: k.aciklama, aciklamaVar: !!k.aciklama,
            onc: k.onc, renk, noktaSinif: 'ks-pdot' + (k.onc === 'Acil' ? ' acil' : ''),
            sure: yasMetin(ms), uyari: k.uyari || '', uyariVar: !!k.uyari, uyariRenk: k.uyariKirmizi ? 'var(--color-uyari)' : '#d97706',
            dugme: k.dugme, dugmeVar: !!k.dugme, dugmeRenk: k.dugmeRenk, git: k.git,
            ikinci: k.ikinci, ikinciVar: !!k.ikinci, ikinciGit: k.ikinciGit, ac: k.ac,
            // kutunun/satırın her yerine basınca kart açılır (düğme, seçim kutusu ve yazı alanları kendi işini yapar)
            tikla: e => { const h = e && e.target; if (h && h.closest && h.closest('button,select,input,option,textarea,a')) return; k.ac(); },
            ekipSec: !!k.ekipSec, ekipSecenek: k.ekipSecenek || [],
            ekipDegisir: !!k.ekipDegisir, ekipDeger: k.ekipDeger || '', ekipDegis: k.ekipDegis || (() => {}),
            kolonAd: KOLON_AD[k.kolon], kolonRenk: (KOLON.find(x => x[0] === k.kolon) || [])[2], onc2: ONC[k.onc] ?? 9, ms2: k.ms || 0, kimAd: k.kimBos ? '' : k.kim,
            suruklenir: surukle ? 'true' : 'false', imlec: surukle ? 'grab' : 'default',
            surukleBasla: e => { if (!surukle) return; this._panoSurukle = surukle; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', surukle.id); } catch (x) { /* eski tarayıcı */ } },
            surukleBitti: () => { this._panoSurukle = null; if (this.state.panoHedef) this.setState({ panoHedef: null }); }
          };
        };
        const sirala = (a, b) => (ONC[a.onc] ?? 9) - (ONC[b.onc] ?? 9) || (a.ms || 1e15) - (b.ms || 1e15);
        const kolonlar = KOLON.map(([id, ad, renk, bos]) => {
          let liste = kartlar.filter(k => k.kolon === id);
          liste = id === 'bitti' ? liste.sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 8) : liste.sort(sirala);
          const hedefte = s.panoHedef === id;
          return {
            id, ad, renk, bos, n: kartlar.filter(k => k.kolon === id).length, kartlar: liste.map(tamam), bosVar: !liste.length,
            gecikme: liste.filter(k => k.uyariKirmizi).length,
            zemin: hedefte ? (dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)') : 'transparent',
            kenar: hedefte ? renk : ui.rule,
            ustunde: e => { if (this._panoSurukle) e.preventDefault(); },
            girdi: () => { if (this._panoSurukle && this.state.panoHedef !== id) this.setState({ panoHedef: id }); },
            birak: e => { e.preventDefault(); this.panoBirak(id); }
          };
        });
        const acil = kartlar.filter(k => k.kolon !== 'bitti' && k.onc === 'Acil').length;
        const geciken = kartlar.filter(k => k.uyariKirmizi).length;
        const secKol = KOLON.some(k => k[0] === s.panoKolon) ? s.panoKolon : 'yeni';
        const secK = kolonlar.find(k => k.id === secKol);
        // ── Tablo görünümü (Excel benzeri): aynı kartlar satır olur; başlığa basınca sıralanır, üstten süzülür
        const gor = s.panoGorunum === 'tablo' ? 'tablo' : 'pano';
        const sira = s.panoSira || { k: 'onc', dir: 1 };
        const sz = s.panoSuz || {};
        const ara = String(sz.q || '').toLocaleLowerCase('tr');
        const tumSatir = kartlar.map(k => ({ ...tamam(k), kolon: k.kolon, kimAd: k.kimBos ? '' : k.kim, ms2: k.ms || 0, onc2: ONC[k.onc] ?? 9, durumMetin: KOLON_AD[k.kolon] }));
        let satirlar = tumSatir.filter(r => (!sz.durum || r.kolon === sz.durum)
          && (!sz.ekip || (sz.ekip === '__yok' ? !r.kimAd : r.kimAd === sz.ekip))
          && (!ara || [r.baslik, r.tur, r.yer, r.kim, r.durumMetin, r.aciklama].join(' ').toLocaleLowerCase('tr').includes(ara)));
        const anahtar = { onc: r => r.onc2, no: r => r.tur, baslik: r => r.baslik, yer: r => r.yer, kim: r => r.kim, durum: r => KOLON.findIndex(x => x[0] === r.kolon), sure: r => -r.ms2 };
        const kf = anahtar[sira.k] || anahtar.onc;
        satirlar = satirlar.sort((a, b) => { const x = kf(a), y = kf(b); const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'tr'); return (c || (b.ms2 - a.ms2)) * sira.dir; });
        const BASLIK = [['onc', '●'], ['no', 'No'], ['baslik', 'Ne'], ['yer', 'Nerede'], ['kim', 'Kimde'], ['durum', 'Durum'], ['sure', 'Süre']];
        const ekipAdlari = CREWS.filter(c => c !== ATANMADI);
        const tablo = {
          acik: gor === 'tablo', sayi: satirlar.length + ' / ' + tumSatir.length + ' iş',
          basliklar: BASLIK.map(([k, ad]) => ({ ad: ad + (sira.k === k ? (sira.dir > 0 ? ' ↑' : ' ↓') : ''), tik: () => this.setState({ panoSira: { k, dir: sira.k === k ? -sira.dir : 1 } }) })),
          satirlar: satirlar.map(r => ({ ...r, kimDegisir: r.ekipDegisir })),
          ara: sz.q || '', onAra: e => this.setState({ panoSuz: { ...sz, q: e.target.value } }),
          durum: sz.durum || '', onDurum: e => this.setState({ panoSuz: { ...sz, durum: e.target.value } }),
          durumSecenek: [{ v: '', ad: 'Her durum' }, ...KOLON.map(k => ({ v: k[0], ad: k[1] }))],
          ekip: sz.ekip || '', onEkip: e => this.setState({ panoSuz: { ...sz, ekip: e.target.value } }),
          ekipSecenek: [{ v: '', ad: 'Her ekip' }, { v: '__yok', ad: 'Ekip atanmamış' }, ...ekipAdlari.map(c => ({ v: c, ad: c }))],
          atamaSecenek: [{ v: '', ad: 'Ekip seç…' }, ...ekipAdlari.map(c => ({ v: c, ad: c }))],
          temizleVar: !!(sz.q || sz.durum || sz.ekip), temizle: () => this.setState({ panoSuz: {} })
        };
        return {
          acik: true, kolonlar, tablo, panoGorunumu: gor === 'pano',
          gorunumSec: [['pano', 'Pano'], ['tablo', 'Tablo']].map(([k, ad]) => ({
            ad, ...seg(gor === k, () => { try { localStorage.setItem('ks-pano-gorunum', k); } catch (e) { /* depolama kapalı */ } this.setState({ panoGorunum: k }); })
          })),
          ozet: [
            { n: kartlar.filter(k => k.kolon === 'yeni').length, ad: 'bekleyen', renk: '#5e5ce6' },
            { n: acil, ad: 'acil', renk: 'var(--color-uyari)', alarm: acil > 0 },
            { n: geciken, ad: 'geciken', renk: '#d97706', alarm: false },
            { n: kartlar.filter(k => k.kolon === 'bitti').length, ad: 'son 7 gün biten', renk: '#30d158' }
          ].map(x => ({ ...x, alarm: !!x.alarm && x.n > 0 })),
          yeniTalepVar: yazabilir && talepOn,
          yeniTalep: () => this.setState({
            tab: 'talep', talepForm: {
              ad: '', tel: '', sifat: 'muhtar', kanal: 'telefon', ilce: (m && m.DISTRICTS[0].name) || '', koy: '',
              konu: TALEP_KONU[0], oncelik: 'Normal', aciklama: '', durum: 'yeni', sonuc: ''
            }
          }),
          yardim: 'Kutuyu sütunlar arasında sürükleyin ya da altındaki büyük düğmeye basın. Renkli nokta öncelik: kırmızı acil, turuncu yüksek, mavi normal.',
          telSec: kolonlar.map(k => ({
            ad: k.ad, n: k.n, renk: k.renk, acik: k.id === secKol,
            bg: k.id === secKol ? k.renk : 'transparent', fg: k.id === secKol ? '#fff' : ui.fg,
            sec: () => this.setState({ panoKolon: k.id })
          })),
          telKartlar: secK ? secK.kartlar : [], telBos: secK ? secK.bos : '', telBosVar: !!secK && secK.bosVar, telRenk: secK ? secK.renk : ui.mut
        };
      })(),
//@dahil moduller/is-panosu/gorunum/isKarti.js