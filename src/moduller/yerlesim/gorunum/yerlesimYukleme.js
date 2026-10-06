      yerlesimYukleme: (() => {
        const kayit = s.yerlesimVeri || {};
        return {
          sayi: Object.keys(kayit).length,
          note: Object.keys(kayit).length
            ? `${Object.keys(kayit).length} yerle\u015fim i\u00e7in kay\u0131t y\u00fcklendi. Yeni bir dosya y\u00fcklerseniz ayn\u0131 adl\u0131 sat\u0131rlar\u0131n \u00fczerine yaz\u0131l\u0131r; dosyada olmayan s\u00fctunlar (\u00f6rne\u011fin hayvan say\u0131lar\u0131) korunur.`
            : 'K\u00f6y n\u00fcfusu ve hayvan varl\u0131\u011f\u0131 hen\u00fcz y\u00fcklenmedi. T\u00dc\u0130K veya Tar\u0131m M\u00fcd\u00fcrl\u00fc\u011f\u00fc ekstresini oldu\u011fu gibi y\u00fckleyebilirsiniz; biraz farkl\u0131 bir tablonuz varsa \u00f6rnek dosyay\u0131 indirip onu doldurun.',
          ornek: () => {
            const sat = ['Yıl;İlçe;Köy;Nüfus;Büyükbaş;Küçükbaş'];
            if (m) for (const d of m.DISTRICTS) for (const v of (m.VILLAGES[d.id] || []).slice(0, 400)) sat.push(`2025;${d.name};${v};;;`);
            this.dosyaIndir('koy-nufus-hayvan-sablonu.csv', '\ufeff' + sat.join('\r\n'), 'text/csv;charset=utf-8');
            this.duyur('\u015eablon indirildi. N\u00fcfus ve hayvan s\u00fctunlar\u0131n\u0131 doldurup geri y\u00fckleyin \u2014 s\u00fctun s\u0131ras\u0131n\u0131 de\u011fi\u015ftirseniz de okunur.', 7000);
          },
          yukle: () => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.csv,.txt,text/csv';
            inp.style.display = 'none';
            inp.onchange = () => {
              const dosya = (inp.files || [])[0];
              inp.remove();
              if (!dosya) return;
              const fr = new FileReader();
              fr.onerror = () => this.duyur('Dosya okunamad\u0131. Ba\u015fka bir kopyas\u0131n\u0131 deneyin.', 7000, 'kotu');
              fr.onload = () => {
                try { this.yerlesimCsvIsle(fr.result, dosya.name); }
                catch (e) { this.duyur('Dosya okunamad\u0131: ' + (e && e.message ? e.message : e), 8000, 'kotu'); }
              };
              fr.readAsArrayBuffer(dosya);
            };
            document.body.appendChild(inp);
            inp.click();
          },
          temizle: () => {
            try { localStorage.removeItem('ks-yerlesim-veri'); } catch (e) { /* yok */ }
            this.setState({ yerlesimVeri: {} });
            this.duyur('Y\u00fcklenen n\u00fcfus ve hayvan verisi silindi.', 4000);
          }
        };
      })(),