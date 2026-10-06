      addDetailPhoto: () => {
        if (!sel) return;
        this.setState({
          assets: s.assets.map(a => a.id === sel.id ? { ...a, photos: a.photos + 1, sync: s.offline ? 'pending' : a.sync } : a),
          queue: [{ id: 'q' + Date.now(), title: sel.code + ' · fotoğraf', meta: s.offline ? 'cihazda · 1.2 MB' : 'yüklendi', state: s.offline ? 'pending' : 'synced', dotPend: s.offline }, ...s.queue]
        });
        this.say(s.offline ? 'Fotoğraf cihaza kaydedildi.' : 'Fotoğraf yüklendi.');
      },