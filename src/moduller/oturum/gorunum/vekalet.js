      // Ayarlar › Müdür vekâleti: müdür izindeyken onay yetkisini mühendise/müdüre devreder (sunucu: vekalet_ata)
      vekaletEkran: (() => {
        if (!(tabId === 'ayarlar' && ayarAcik(s) === 'vekalet')) return { satirlar: [], bosVar: false };
        const aday = (s.users || []).filter(u => u.aktif !== false && !(me && u.id === me.id) && ['muhendis', 'mudur'].includes(u.role));
        const satirlar = aday.map(u => {
          const vekil = !!(u.istisna && u.istisna._vekalet);
          const ver = u.istisna && u.istisna._vekalet ? u.istisna._vekalet.veren : '';
          return {
            ad: u.name, rol: ROLE_LABEL[u.role] || u.role, bolge: u.bolge ? ' · ' + u.bolge : '',
            durum: vekil ? 'vekil' + (ver ? ' (' + ver + ' verdi)' : '') : (u.role === 'mudur' ? 'müdür (zaten onay yetkili)' : 'vekil değil'),
            durumRenk: vekil ? '#1b9a4a' : ui.mut,
            etiket: u.role === 'mudur' ? 'Gerek yok' : (vekil ? 'Vekâleti kaldır' : 'Vekil yap'),
            bg: vekil ? 'transparent' : 'var(--color-accent)', fg: vekil ? ui.fg : '#fff', kenar: vekil ? ui.rule : 'var(--color-accent)',
            tikla: () => u.role === 'mudur' ? this.duyur(u.name + ' zaten müdür; onay yetkisi rolünden geliyor.', 4500) : this.vekaletAta(u, !vekil)
          };
        });
        return { satirlar, bosVar: satirlar.length === 0 };
      })(),
