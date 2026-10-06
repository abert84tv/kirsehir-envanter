      trash: (() => {
        const yonetici = me && (me.role === 'yonetici' || me.role === 'mudur');
        const gun = t => {
          const p = String(t || '').split('.');
          return p.length === 3 ? `${p[0]}.${p[1]}.${p[2].slice(0, 4)}` : String(t || '').slice(0, 10).split('-').reverse().join('.');
        };
        const M0 = this._sb;
        const sunucu = (s.cop || []).map(r => ({
          code: r.tur === 'foto' ? (r.kod || '—') + (r.ek === 'ses' ? ' · sesli not' : ' · fotoğraf') : r.kod,
          onizlemeEl: r.tur === 'foto' && r.ek !== 'ses' && r.adres && M0 && M0.fotoAdres
            ? this.imgEl(M0.fotoAdres(r.adres), 'Çöp kutusundaki fotoğraf')
            : null,
          onizlemeVar: !!(r.tur === 'foto' && r.ek !== 'ses' && r.adres && M0 && M0.fotoAdres),
          sesVar: r.tur === 'foto' && r.ek === 'ses' && !!r.adres,
          sesEl: r.tur === 'foto' && r.ek === 'ses' && r.adres && M0 && M0.fotoAdres
            ? React.createElement('audio', {
              src: M0.fotoAdres(r.adres), controls: true,
              style: { width: '100%', maxWidth: '190px', height: '34px' }
            })
            : null,
          dosyaAd: String(r.adres || '').split('/').pop() || '—',
          buyut: () => {
            if (!(r.adres && M0 && M0.fotoAdres)) return;
            this.setState({ buyut: { url: M0.fotoAdres(r.adres), ad: (r.kod || '—') + ' · çöp kutusu' } });
          },
          kind: r.tur === 'foto' ? (r.ek === 'ses' ? 'Sesli not' : 'Fotoğraf') : (TYPES[r.tip] ? TYPES[r.tip].kind : 'Kayıt'),
          place: (r.koy || 'Köy girilmedi') + ' · ' + (r.ilce || '—'),
          meta: `${gun(r.silindi)} · ${r.silen || '—'} sildi · ${r.kalan} gün sonra kalıcı silinir`
            + (r.tur === 'foto' && r.boyut ? ' · ' + Math.round(r.boyut / 1024) + ' KB' : ''),
          kaliciVar: yonetici && r.yazilabilir,
          geri: () => {
            const M = this._sb;
            if (!M) return;
            const f = r.tur === 'foto' ? M.fotoGeriAl : M.tesisGeriAl;
            if (!f) return this.duyur('Bu işlem için cop-kutusu.sql dosyasını Supabase’de bir kez çalıştırmanız gerekiyor.', 9000, 'kotu');
            f(r.dbId).then(x => {
              if (!x.ok) return this.duyur(x.err || 'Geri getirilemedi.', 7000, 'kotu');
              this.veriYenile(true);
              this.duyur(r.tur === 'foto'
                ? `Fotoğraf geri getirildi — ${r.kod || 'kaydın'} Foto sekmesinde yerine döndü.`
                : `${r.kod} geri getirildi — bütün alanları, fotoğrafları ve geçmişi olduğu gibi döndü.`, 6000, 'iyi');
            });
          },
          kalici: () => {
            const M = this._sb;
            if (!M) return;
            const f = r.tur === 'foto' ? M.fotoKaliciSil : M.tesisKaliciSil;
            if (!f) return this.duyur('Bu işlem için cop-kutusu.sql dosyasını Supabase’de bir kez çalıştırmanız gerekiyor.', 9000, 'kotu');
            const ad = r.tur === 'foto' ? (r.kod || 'Bu') + ' kaydının bir fotoğrafı' : r.kod;
            if (!window.confirm(`${ad} kalıcı silinecek. Bu işlem geri alınamaz — kayıt, fotoğrafları, denemeleri ve notları veritabanından tamamen kalkar. Onaylarsınız mı?`)) return;
            f(r.dbId).then(x => {
              if (!x.ok) return this.duyur(x.err || 'Kalıcı silinemedi.', 7000, 'kotu');
              this.copYenile();
              this.duyur(`${ad} kalıcı silindi — veritabanında hiçbir izi kalmadı.`, 6000);
            });
          }
        }));
        const yerel = s.trash.map((r, i) => ({
          code: r.a.code, kind: TYPES[r.a.type].kind, place: this.yer(r.a),
          meta: `${r.t} · ${r.silen} sildi · bu cihazda bekliyor (veritabanına yazılmamış kayıt)`,
          kaliciVar: false,
          kalici: () => {},
          geri: () => {
            this.setState({ assets: [r.a, ...s.assets], trash: s.trash.filter((_, k) => k !== i) });
            this.iz(r.a.id, 'Kayıt geri getirildi', `Çöp kutusundan alındı — ${r.t} tarihinde ${r.silen} tarafından silinmişti.`);
            this.duyur(`${r.a.code} geri getirildi.`, 5000, 'iyi');
          }
        }));
        const rows = sunucu.concat(yerel);
        const kaliciAday = (s.cop || []).filter(r => r.yazilabilir);
        return {
          rows,
          bos: rows.length === 0,
          // Toplu kalıcı silme — yüzlerce kaydı tek tek onaylamamak için
          topluVar: yonetici && kaliciAday.length > 1,
          topluEtiket: 'Hepsini kalıcı sil — ' + kaliciAday.length,
          toplu: () => {
            const M = this._sb;
            if (!M || !M.tesisKaliciSil) return this.duyur('Bu işlem için cop-kutusu.sql dosyasını Supabase’de bir kez çalıştırmanız gerekiyor.', 9000, 'kotu');
            if (!window.confirm(kaliciAday.length + ' öğe veritabanından tamamen silinecek. Bu işlem geri alınamaz — kayıtlar, fotoğrafları, denemeleri ve notları kalkar. Onaylarsınız mı?')) return;
            this.copBosalt(kaliciAday);
          },
          not: rows.length
            ? `${rows.length} öğe çöp kutusunda. Geri getirdiğinizde bütün alanları, fotoğrafları ve geçmişi olduğu gibi döner. 30 günü dolan öğe kendiliğinden kalıcı silinir; Yönetici ve Müdür süreyi beklemeden “Kalıcı sil” ile kesin silebilir.`
            : 'Çöp kutusu boş. Silinen kayıt ve fotoğraf buraya düşer, 30 gün beklerken geri getirilebilir; süre sonunda kendiliğinden kalıcı silinir.'
        };
      })(),
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
      denetimEkran: (() => {
        const hepsi = s.denetim || [];
        const q = (s.denetimQ || '').toLocaleLowerCase('tr');
        const kimler = [...new Set(hepsi.map(x => x.kim))].sort();
        const suz = hepsi.filter(x =>
          (!s.denetimSinif || x.sinif === s.denetimSinif) &&
          (!s.denetimKim || x.kim === s.denetimKim) &&
          (!q || [x.ne, x.detay, x.kapsam, x.kim, x.t].join(' ').toLocaleLowerCase('tr').includes(q)));
        const bugun = this.damga().split(' ')[0];
        return {
          not: 'Programda yapılan her işlem buraya kim, ne zaman, hangi cihazdan diye yazılır: kayıt açma ve silme, arıza, ambar hareketi, ayar değişikliği, giriş ve çıkış. Liste silinemez, yalnızca son ' + DENETIM_SINIR + ' satır tutulur.',
          stats: [
            { n: String(hepsi.length), label: 'Toplam kayıt', fg: ui.fg },
            { n: String(hepsi.filter(x => x.t.startsWith(bugun)).length), label: 'Bugün', fg: ui.fg },
            { n: String(kimler.length), label: 'Kullanıcı', fg: ui.fg },
            { n: String(suz.length), label: 'Süzgeçten geçen', fg: suz.length === hepsi.length ? ui.fg : ui.acc }
          ],
          q: s.denetimQ,
          onQ: e => this.setState({ denetimQ: e.target.value }),
          sinifSec: [['', 'Hepsi'], ...Object.entries(DENETIM_SINIF)].map(([k, ad]) => ({
            label: ad, ...seg(s.denetimSinif === k, () => this.setState({ denetimSinif: k }))
          })),
          kim: s.denetimKim, kimler,
          onKim: e => this.setState({ denetimKim: e.target.value }),
          satirlar: suz.slice(0, 300).map(x => ({
            t: x.t, sinif: DENETIM_SINIF[x.sinif] || x.sinif,
            sinifFg: x.sinif === 'veri' || x.sinif === 'kullanici' ? ui.acc : ui.mut,
            ne: x.ne, detay: x.detay, kapsam: x.kapsam || '—',
            kim: x.kim + (x.rol ? ' · ' + (ROLE_LABEL[x.rol] || x.rol) : ''),
            nereden: x.nereden + (x.cevrimdisi ? ' · çevrimdışı' : '')
          })),
          bos: suz.length === 0,
          bosNot: hepsi.length
            ? 'Süzgece uyan kayıt yok. Arama kutusunu boşaltın ya da sınıf seçimini “Hepsi” yapın.'
            : 'Henüz işlem yazılmadı. Bir kayıt açtığınızda, ambar hareketi girdiğinizde ya da ayar değiştirdiğinizde satırlar burada birikir.',
          fazla: suz.length > 300 ? suz.length - 300 + ' satır daha var — aramayı daraltın ya da CSV indirin.' : '',
          csv: () => {
            const bas = ['Zaman', 'Sınıf', 'İşlem', 'Ayrıntı', 'Kapsam', 'Kim', 'Rol', 'Nereden', 'Çevrimdışı'];
            const out = [bas.map(x => this.csvKac(x)).join(';')];
            for (const x of suz) {
              out.push([x.t, DENETIM_SINIF[x.sinif] || x.sinif, x.ne, x.detay, x.kapsam,
                x.kim, ROLE_LABEL[x.rol] || x.rol || '', x.nereden, x.cevrimdisi ? 'Evet' : 'Hayır']
                .map(v => this.csvKac(v)).join(';'));
            }
            this.dosyaIndir('denetim-izi-' + new Date().toISOString().slice(0, 10) + '.csv',
              '\ufeff' + out.join('\r\n'), 'text/csv;charset=utf-8');
            this.duyur(suz.length + ' satır CSV olarak indirildi — Excel’de doğrudan açılır.', 6000, 'iyi');
          }
        };
      })(),