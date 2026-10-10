      // İş kartı ve arıza kartındaki küçük yer haritası (masaüstü + telefon aynı şablon). Kart yalnız Arıza ya da Talep modülü açıkken
      // erişilebilir olduğundan modül kapanınca harita da kapanır; ekip işaretleri yalnız ekip konumu geldiyse çıkar.
      isHarita: (() => {
        const k = s.isKarti, ff = s.faultForm;
        const talepKart = tabId === 'isKarti' && k && k.tur !== 'a';
        const arizaKart = !!ff && ((tabId === 'isKarti' && k && k.tur === 'a') || (s.device === 'phone' && s.panel === 'ariza' && !!ff.ayrinti));
        const var_ = (arizaOn || talepOn) && (talepKart || arizaKart);
        const ekipSay = Object.keys(s.ekipKonum || {}).length;
        return {
          var: var_,
          not: talepKart ? 'Kırmızı: bildirilen yer · yeşil: seçili tesis. Haritadaki bir tesise basarak da seçebilirsiniz.' + (ekipSay ? ' Mor: ekiplerin son konumu.' : '')
            : 'Kırmızı: arıza yeri · yeşil: kayıt' + (ekipSay ? ' · mor: ekiplerin son konumu' : '') + '.'
        };
      })(),
