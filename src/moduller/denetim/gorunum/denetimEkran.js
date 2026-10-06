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