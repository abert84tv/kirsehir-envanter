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