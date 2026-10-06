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