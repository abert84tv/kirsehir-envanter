      isLogin: !s.session && !s.pwForm && !s.oturumKontrol,
      oturumKontrolGoster: s.oturumKontrol && !s.session && !s.pwForm,
      loginForm: {
        user: s.loginUser, pw: s.loginPw, err: s.loginErr, hasErr: !!s.loginErr,
        onUser: e => this.setState({ loginUser: e.target.value, loginErr: '' }),
        onPw: e => this.setState({ loginPw: e.target.value, loginErr: '' }),
        onKey: e => { if (e.key === 'Enter') this.doLogin(); },
        remember: s.remember,
        rememberMark: s.remember ? '■' : '□',
        toggleRemember: () => this.setState({ remember: !this.state.remember }),
        rememberNote: s.remember ? 'Bu cihazda saklanır, tekrar yazmanıza gerek kalmaz.' : 'Hiçbir şey saklanmaz.',
        dolu: false,
        temizle: () => this.setState({ loginUser: '', loginPw: '', loginErr: '', remember: false })
      },
      login: () => this.doLogin(),
      hasSavedLogin: (() => {
        let sk = false;
        try { sk = !!localStorage.getItem(SES_KEY); } catch (e) { /* depolama kapalı */ }
        return sk || !!(this._sb && this._sb.tokenOku());
      })(),
      logout: () => {
        // Çıkış tam çıkıştır: sunucu oturumu kapatılır, cihazdaki anahtar
        // silinir. Yalnızca kullanıcı adı hatırlanır — şifre istenmeden
        // kimse yeniden giremez, sayfa yenilense de.
        const M = this._sb;
        if (M) { M.cikis(); M.tokenYaz(null); }
        try { localStorage.removeItem('ks-oturum-profil'); } catch (e) { /* depolama kapalı */ }
        this._yerelOturum = false;
        let sv = null;
        try { sv = JSON.parse(localStorage.getItem(SES_KEY) || 'null'); } catch (e) { /* depolama kapalı */ }
        this._bekleyenHat = null;
        this.setState({
          session: null, autoLogin: false, panel: 'yok', faultForm: null, selected: null,
          loginUser: sv ? sv.user : '', loginPw: sv ? (sv.pw || '') : '', loginErr: '',
          remember: !!sv, tab: 'harita', scenario: null, newAsset: null
        }, () => {
          this.denetimYaz('oturum', 'Oturum kapatıldı', me ? me.user : '', me ? me.user : '');
          this.say('Oturum kapatıldı. Yeniden girmek için “Giriş yap”a basın.');
        });
      },
      sessionCard: me ? {
        name: me.name, role: me.roleLabel || ROLE_LABEL[me.role] || me.role,
        bas: String(me.name || '?').trim().split(/\s+/).map(p => p[0] || '').join('').slice(0, 2).toLocaleUpperCase('tr'),
        dev: (s.device === 'phone' ? 'Telefon' : 'Bilgisayar') + ' oturumu' + (s.autoLogin ? ' · kayıtlı girişle açıldı' : (s.remember ? ' · giriş bu cihazda saklandı' : '')),
        crew: me.crew || 'Ekip ataması yetkisi: ' + (canAssign ? 'var' : 'yok')
      } : { name: '', role: '', bas: '', dev: '', crew: '' },

      perm: {
        note: can('admin')
          ? 'Rol dağıtımı sizde: Yönetici hesap açar ve rolü atar. Hiyerarşi yukarıdan aşağıya Yönetici → Müdür → Mühendis → Arıza Şefi → Arıza Personeli; her rol kendi satırındaki yetkilerle sınırlıdır.'
          : 'Rol dağıtımını yalnızca Yönetici yapar. Hiyerarşi: Yönetici → Müdür → Mühendis → Arıza Şefi → Arıza Personeli. Kendi satırınız beyaz zeminde.',
        canEdit: can('admin'),
        cols: ROLE_ORDER.map(([id, label]) => ({
          label, me: me && me.role === id ? 'Siz' : '',
          bg: me && me.role === id ? ui.sel : 'transparent'
        })),
        rows: PERMS.map(([, label, roles]) => ({
          label,
          cells: ROLE_ORDER.map(([id]) => ({
            v: roles.includes(id) ? '✓' : '—',
            c: roles.includes(id) ? ui.acc : ui.mut
          })),
          bg: me && roles.includes(me.role) ? 'transparent' : (dark ? 'rgba(244,242,240,.05)' : 'rgba(0,0,0,.035)')
        })),
        roleList: ROLE_ORDER.map(([id, label, desc], i) => ({
          rank: String(i + 1), label, desc,
          count: PERMS.filter(p => p[2].includes(id)).length + ' / ' + PERMS.length + ' yetki',
          bg: me && me.role === id ? ui.sel : 'transparent',
          mark: me && me.role === id ? 'Siz' : ''
        }))
      },
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
            istisnalar: PERMS.map(([k, ad]) => {
              const rolVar = (CAN[k] || []).includes(u.role);
              const acik = this.yetkiVar(u, k);
              const kilitli = ISTISNA_DISI.includes(k) || u.role === 'yonetici';
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
                    : 'Yönetici rolünün yetkileri kısıtlanamaz.', 6000, 'kotu')
                  : this.istisnaYaz(u.id, k, !acik)
              };
            }),
            istisnaSayi: (() => {
              const n = PERMS.filter(([k]) => !ISTISNA_DISI.includes(k) && u.role !== 'yonetici'
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
                const mevcut = u.role === 'yonetici' ? 'tam' : (((u.sayfalar || {})[sid]) || 'tam');
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
      pwChange: (() => {
        const f = s.pwForm;
        return {
          on: !!f, yeni: f ? f.yeni : '', tekrar: f ? f.tekrar : '',
          err: f ? f.err : '', hasErr: !!(f && f.err),
          kim: f ? f.user : '',
          onYeni: e => this.setState({ pwForm: { ...this.state.pwForm, yeni: e.target.value, err: '' } }),
          onTekrar: e => this.setState({ pwForm: { ...this.state.pwForm, tekrar: e.target.value, err: '' } }),
          onKey: e => { if (e.key === 'Enter') this.pwDegistir(); },
          kaydet: () => this.pwDegistir(),
          vazgec: () => this.setState({ pwForm: null, loginPw: '', loginErr: '' })
        };
      })(),

      forgetLogin: () => this.forget(),
      forgetNote: (() => {
        let sk = false;
        try { sk = !!localStorage.getItem(SES_KEY); } catch (e) { /* depolama kapalı */ }
        const anahtar = !!(this._sb && this._sb.tokenOku());
        if (anahtar) return 'Giriş ekranındaki “Beni hatırla” işaretli olduğu için bu cihaza bir oturum anahtarı kaydedildi — program açılışta giriş ekranını atlıyor. Şifreniz saklanmıyor, yalnızca bu anahtar duruyor. Ortak bir bilgisayarda ya da başkasının telefonunda açtıysanız buradan silin: anahtar hem cihazdan hem veritabanından kaldırılır, o cihaz bir daha kendiliğinden girmez. Hesabınız etkilenmez.';
        if (sk) return '“Beni hatırla” işaretliyken kullanıcı adı ve şifre yalnızca bu cihazda saklanır: giriş ekranı alanları dolu getiriyor, “Giriş yap”a basmanız yetiyor — kendiliğinden girmiyor. Ortak bir cihazda açtıysanız buradan silin; hesabınız etkilenmez.';
        return 'Bu cihazda kayıtlı giriş yok — program her açılışta kullanıcı adı ve şifre istiyor.';
      })(),