  baslatOturumKaydi() {
    try {
      const raw = localStorage.getItem(SES_KEY);
      if (raw) {
        const sv = JSON.parse(raw);
        if (sv && sv.user) this.setState({ loginUser: sv.user, loginPw: sv.pw || '', remember: true });
      }
    } catch (e) { /* depolama kapalı veya bozuk kayıt */ }
  }