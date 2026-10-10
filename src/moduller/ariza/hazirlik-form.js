    // fault form
    const ff = s.faultForm;
    const ffAsset = ff ? s.assets.find(a => a.id === ff.assetId) : null;
    const prios = ['Acil', 'Yüksek', 'Normal'];
    // Akış: sahanın elinde olmayan bekleyişler ayrı durumlarda; merkez onayı
    // açıkken kapanış Kontrolde adımından geçer.
    const wfSteps = [['acik', 'Açık'], ['atandi', 'Atandı'], ['sahada', 'Sahada'],
      ['bilgi', 'Bilgi bekliyor'], ['bekleme', 'Beklemede'], ['yonlendirildi', 'Başka birime'],
      ['kontrol', 'Ön onay bekliyor'], ['mudur_onayi', 'Müdür onayında'],
      ['cozuldu', 'Çözüldü'], ['iptal', 'İptal']];
