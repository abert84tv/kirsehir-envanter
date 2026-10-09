      // Ayarlar > Kayıt araçları > Köy kontrolü: köy adı otomatik yazılmış kayıtlar (uzaktan yakına)
      koyKontrol: (() => {
        const ac = tabId === 'ayarlar' && ayarAcik(s) === 'koyeslestir';
        if (!ac) return { var: false, satirlar: [], sayi: 0 };
        const L = (s.assets || []).filter(a => a.d && a.d.koyOtomatik).map(a => ({ a, km: parseFloat(String(a.d.koyOtomatik).replace(',', '.')) || 0 })).sort((x, y) => y.km - x.km);
        return {
          var: L.length > 0, sayi: L.length, yok: L.length === 0,
          ozet: L.length + ' kayıtta köy adı otomatik yazıldı (en yakın yerleşimden; en uzağı ' + (L.length ? L[0].km.toFixed(1) : '0') + ' km).',
          satirlar: L.map(({ a, km }) => ({
            kod: a.code, koy: a.village, ilce: a.district, km: km.toFixed(1) + ' km',
            renk: km > 1 ? '#d97706' : ui.mut,
            dogru: () => this.koyDogru(a), duzelt: () => this.koyDuzeltAc(a), geriAl: () => this.koyGeriAl(a)
          })),
          tumDogru: () => this.koyTumDogru(), tumGeriAl: () => this.koyTumGeriAl()
        };
      })(),
