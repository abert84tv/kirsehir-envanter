      kullanici: (() => {
        const list = s.users;
        const yonetici = !!me && me.role === 'yonetici';
        const f = s.userForm;
        const ilceler = m ? m.DISTRICTS.map(d => d.name) : [];
        const yaz = (k, v) => this.setState({ userForm: { ...this.state.userForm, [k]: v, err: '' } });
        const kaydet = () => {
          const g = this.state.userForm;
          const ad = (g.name || '').trim();
          const kad = (g.user || '').trim().toLowerCase();
          if (!ad) return this.setState({ userForm: { ...g, err: 'Ad soyad yazın.' } });
          if (!/^[a-z0-9._-]{3,}$/.test(kad)) return this.setState({ userForm: { ...g, err: 'Kullanıcı adı en az 3 karakter; küçük harf, sayı, nokta ve alt çizgi kullanın.' } });
          if (list.some(u => u.user === kad && u.id !== g.id)) return this.setState({ userForm: { ...g, err: 'Bu kullanıcı adı başkasında var.' } });
          if (!g.id && (g.pw || '').length < 4) return this.setState({ userForm: { ...g, err: 'Başlangıç şifresi en az 4 karakter olmalı.' } });
          const eskiKayit = g.id ? list.find(u => u.id === g.id) : null;
          if (eskiKayit && eskiKayit.role === 'yonetici' && g.role !== 'yonetici'
            && list.filter(x => x.role === 'yonetici' && x.aktif !== false).length <= 1) {
            return this.setState({ userForm: { ...g, err: 'Sistemdeki son yönetici bu kişi — rolü düşürülemez. Önce başka bir kullanıcıyı yönetici yapın.' } });
          }
          const alan = { name: ad, user: kad, role: g.role, tel: g.tel || '', unvan: g.unvan || '', bolge: g.bolge || '' };
          const mevcut = g.id ? list.find(u => u.id === g.id) : null;
          this.setState({ userForm: null });
          if (mevcut && mevcut.dbId) {
            this.yonetIsle(ad + ' güncellendi.', M => M.kullaniciGuncelle({ ...alan, id: mevcut.dbId }));
          } else if (!g.id) {
            this.yonetIsle(ad + ' eklendi ve veritabanına yazıldı. Başlangıç şifresini kendisine iletin — ilk girişte kendi şifresini belirleyecek, her cihazdan girebilir.',
              M => M.kullaniciEkle({ ...alan, pw: g.pw }));
          } else {
            this.usersKaydet(list.map(u => u.id === g.id ? { ...u, ...alan } : u));
            this.say(ad + ' güncellendi — bu kayıt henüz veritabanında değil, yalnızca bu cihazda duruyor.', true);
            setTimeout(() => this.setState({ toast: null }), 6000);
          }
        };
        return {
          yonetici, kapali: !yonetici, ekleGoster: yonetici && !f,
          note: yonetici
            ? 'Kişi ekleyip çıkarma yalnızca Yönetici yetkisindedir. Eklediğiniz kişiye bir başlangıç şifresi verirsiniz; ilk girişinde programın kendisi şifreyi değiştirmesini ister.'
            : 'Kullanıcı ekleme ve çıkarma Yönetici yetkisindedir. Listeyi görebilir, değiştiremezsiniz.',
          rows: list.map(u => ({
            name: u.name, user: u.user, role: u.roleLabel,
            unvan: u.unvan || '—', tel: u.tel || '—', bolge: u.bolge || 'Tüm il',
            ozet: [u.unvan, u.tel, u.bolge || 'Tüm il'].filter(Boolean).join(' · '),
            durum: u.aktif === false ? 'Donduruldu' : (u.mustChange ? 'Şifre bekliyor' : 'Etkin'),
            durumRenk: u.aktif === false ? ui.mut : (u.mustChange ? ui.acc : ui.fg),
            bg: u.aktif === false ? ui.surf2 : (me && me.id === u.id ? ui.sel : 'transparent'),
            mark: me && me.id === u.id ? 'Siz' : '',
            kendisi: !!me && me.id === u.id,
            duzenlenir: yonetici,
            silinebilir: yonetici && !(me && me.id === u.id)
              && !(u.role === 'yonetici' && list.filter(x => x.role === 'yonetici' && x.aktif !== false).length <= 1),
            kapatLabel: u.aktif === false ? 'Aktif et' : 'Dondur',
            yetkiAcik: s.yetkiForm === u.id,
            // Müdür vekâleti: rolünde son onay yetkisi olmayan kişiye tek düğmeyle verilir / geri alınır
            vekaletVar: !((CAN.close || []).includes(u.role) && (CAN.stokSiparisOnay || []).includes(u.role)),
            vekaletAcik: this.yetkiVar(u, 'close') && this.yetkiVar(u, 'stokSiparisOnay'),
            vekaletEtiket: (this.yetkiVar(u, 'close') && this.yetkiVar(u, 'stokSiparisOnay')) ? 'Müdür vekâletini kaldır' : 'Müdür vekâleti ver',
            vekalet: () => this.vekaletYaz(u.id, !(this.yetkiVar(u, 'close') && this.yetkiVar(u, 'stokSiparisOnay'))),
            istisnalar: PERMS.map(([k, ad]) => {
              const rolVar = (CAN[k] || []).includes(u.role);
              const acik = this.yetkiVar(u, k);
              const kilitli = ISTISNA_DISI.includes(k) || (u.role === 'yonetici' && rolVar);
              return {
                ad, acik, kilitli,
                durum: kilitli ? (rolVar ? 'Rolden geliyor' : 'Rolde yok')
                  : (acik === rolVar ? 'Rol paketi' : (acik ? 'İstisna: verildi' : 'İstisna: kaldırıldı')),
                durumFg: kilitli ? ui.mut : (acik === rolVar ? ui.mut : ui.acc),
                kutuBg: acik ? ui.acc : 'transparent',
                kutuFg: acik ? '#fff' : ui.mut,
                kutuKenar: acik ? ui.acc : ui.rule,
                isaret: acik ? '✓' : '',
                tik: () => kilitli
                  ? this.duyur(ISTISNA_DISI.includes(k)
                    ? ad + ' role bağlı kalır — kişiye özel istisna verilmez. Rolü değiştirerek yönetin.'
                    : 'Yönetici rolünün bu yetkisi kısıtlanamaz.', 6000, 'kotu')
                  : this.istisnaYaz(u.id, k, !acik)
              };
            }),
            istisnaSayi: (() => {
              const n = PERMS.filter(([k]) => !ISTISNA_DISI.includes(k)
                && this.yetkiVar(u, k) !== (CAN[k] || []).includes(u.role)).length;
              return n ? n + ' istisna' : 'rol paketi aynen';
            })(),
            sonYonetici: u.role === 'yonetici'
              && list.filter(x => x.role === 'yonetici' && x.aktif !== false).length <= 1,
            yetkiLabel: s.yetkiForm === u.id ? 'Yetki panelini kapat' : 'Sayfa yetkileri',
            yetkiAc: () => this.setState({ yetkiForm: this.state.yetkiForm === u.id ? null : u.id }),
            yetkiBaslik: u.name + ' · sol menü sayfa yetkileri',
            yetkiNot: u.role === 'yonetici'
              ? 'Yönetici bütün sayfaları görür ve düzenler; kilitlenemez — sistem yönetimsiz kalmasın diye buradaki seçim ona uygulanmaz.'
              : 'Yok: sayfa sol menüde hiç çıkmaz. Görür: sayfayı açar, ekleme–düzenleme–silme düğmeleri kapalı olur ve üstte uyarı şeridi çıkar. Tam: girer ve kaydeder. Değişiklik kişinin bir sonraki ekran yenilemesinde geçerli olur.',
            // Eski 14 sayfa kimliği, bugünkü menüdeki altı gruba göre toplu gösterilir
            // (bkz. SAYFA_GRUPLARI) — depolama anahtarı (sid) ve davranış değişmedi.
            sayfalar: SAYFA_GRUPLARI.map(g => ({
              ad: g.ad,
              suzgecler: g.uyeler.map(([sid]) => {
                const mevcut = u.role === 'yonetici' ? 'tam' : (((u.sayfalar || {})[sid]) || rolSayfaVarsayilan(u.role, sid));
                return {
                  label: SUZGEC_ESKI_AD[sid] || sid,
                  secenekler: YETKI_SEC.map(([v, l]) => ({
                    label: l,
                    bg: mevcut === v ? (v === 'yok' ? ui.mut : 'var(--color-accent)') : 'transparent',
                    fg: mevcut === v ? '#fff' : ui.fg,
                    pick: () => this.sayfaYetkiYaz(u.id, sid, v)
                  }))
                };
              })
            })),
            edit: () => this.setState({
              userForm: { id: u.id, name: u.name, user: u.user, role: u.role, tel: u.tel || '', unvan: u.unvan || '', bolge: u.bolge || '', pw: '', err: '' }
            }),
            sifre: () => {
              const yeni = String(Math.floor(100000 + Math.random() * 900000));
              if (u.dbId) {
                this.yonetIsle(u.name + ' için yeni şifre: ' + yeni + ' — kendisine iletin, ilk girişte kendi şifresini belirleyecek. Açık oturumları kapatıldı.',
                  M => M.sifreSifirla(u.dbId, yeni));
                setTimeout(() => this.setState({ toast: null }), 14000);
                return;
              }
              this.usersKaydet(list.map(x => x.id === u.id ? { ...x, pw: yeni, mustChange: true } : x));
              this.say(u.name + ' için yeni şifre: ' + yeni + ' — kendisine iletin, ilk girişte değiştirecek.', true);
              setTimeout(() => this.setState({ toast: null }), 12000);
            },
            kapat: () => {
              if (u.dbId) return this.yonetIsle(u.name + (u.aktif === false
                ? ' hesabı yeniden aktif edildi — eski kullanıcı adı ve şifresiyle her cihazdan girer.'
                : ' hesabı donduruldu — açık oturumları kapatıldı, artık giriş yapamaz. Attığı bütün kayıtlar adıyla sistemde kalır; işe dönerse Aktif et ile açılır.'),
                M => M.hesapDurum(u.dbId, u.aktif === false));
              this.usersKaydet(list.map(x => x.id === u.id ? { ...x, aktif: x.aktif === false } : x));
              this.say(u.name + (u.aktif === false
                ? ' hesabı yeniden aktif edildi — eski kullanıcı adıyla girer, şifresi de aynı kalır.'
                : ' hesabı donduruldu — artık giriş yapamaz. Attığı bütün kayıtlar ve düzenlemeler adıyla sistemde kalır; işe dönerse Aktif et ile açılır.'), true);
              setTimeout(() => this.setState({ toast: null }), 7000);
            },
            sil: () => {
              if (u.dbId) return this.yonetIsle(u.name + ' silindi. Attığı kayıtlarda adı “Silinmiş kullanıcı” olarak görünecek.',
                M => M.kullaniciSil(u.dbId));
              this.usersKaydet(list.filter(x => x.id !== u.id));
              this.say(u.name + ' silindi. Attığı kayıtlarda adı “Silinmiş kullanıcı” olarak görünecek.', true);
              setTimeout(() => this.setState({ toast: null }), 6000);
            }
          })),
          formOn: !!f,
          form: f ? {
            baslik: f.id ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı',
            yeni: !f.id, name: f.name, user: f.user, tel: f.tel, unvan: f.unvan, pw: f.pw,
            err: f.err, hasErr: !!f.err,
            userNote: f.id ? 'Kullanıcı adını değiştirirseniz kişi yeni adla girer.' : 'Giriş ekranında yazacağı ad. Örnek: a.bertan',
            onName: e => yaz('name', e.target.value),
            onUser: e => yaz('user', e.target.value),
            onTel: e => yaz('tel', e.target.value),
            onUnvan: e => yaz('unvan', e.target.value),
            onPw: e => yaz('pw', e.target.value),
            onBolge: e => yaz('bolge', e.target.value),
            bolge: f.bolge,
            ilceler: ilceler.map(n => ({ n })),
            roller: ALL_ROLES.map(r => ({
              label: ROLE_LABEL[r],
              bg: f.role === r ? 'var(--color-accent)' : 'transparent',
              fg: f.role === r ? '#fff' : ui.fg,
              pick: () => yaz('role', r)
            })),
            kaydet, iptal: () => this.setState({ userForm: null })
          } : { roller: [], ilceler: [] },
          ekle: () => this.setState({
            userForm: { id: null, name: '', user: '', role: 'personel', tel: '', unvan: '', bolge: '', pw: String(Math.floor(100000 + Math.random() * 900000)), err: '' }
          })
        };
      })(),