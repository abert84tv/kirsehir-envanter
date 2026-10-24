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
        // Telefon kamerayı açarken programı bellekten atabilir: form cihaza yazılır, dönüşte geri gelir
        if (s.device === 'phone' && s.newAsset) {
          try { localStorage.setItem('ks-na-taslak', JSON.stringify({ t: Date.now(), na: { ...s.newAsset, photos: 0, fotoUrl: [] } })); } catch (e) { /* depolama kapalı */ }
        }
        const taslakSil = () => { try { localStorage.removeItem('ks-na-taslak'); } catch (e) { /* yok */ } };
        inp.oncancel = taslakSil;
        inp.onchange = () => {
          taslakSil();
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