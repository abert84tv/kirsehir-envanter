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