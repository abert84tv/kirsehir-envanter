      onFaultAsset: e => {
        const a = s.assets.find(x => x.id === e.target.value);
        const g = a ? TESIS_GRUP[a.type] || 'su' : arizaGrubu(this.state.faultForm, null);
        const ff0 = this.state.faultForm;
        this.setState({ faultForm: { ...ff0, assetId: e.target.value || null, grup: g,
          type: ARIZA_GRUP[g].turler.includes(ff0.type) ? ff0.type : ARIZA_GRUP[g].turler[0] } });
      },
      onFaultType: e => this.setState({ faultForm: { ...this.state.faultForm, type: e.target.value } }),
      onFaultNote: e => this.setState({ faultForm: { ...this.state.faultForm, note: e.target.value } }),
      onFaultCrew: e => {
        const c = e.target.value, f0 = this.state.faultForm;
        // Ekip atanınca açık arıza "Atandı", ekip kalkınca yeniden "Açık"
        const durum = c && c !== ATANMADI ? (f0.status === 'acik' ? 'atandi' : f0.status) : (f0.status === 'atandi' ? 'acik' : f0.status);
        this.setState({ faultForm: { ...f0, crew: c, status: durum } });
      },
      onFaultHours: e => this.setState({ faultForm: { ...this.state.faultForm, hours: e.target.value } }),
      addFaultPhoto: () => this.arizaFotoSec(false),
      cekFaultPhoto: () => this.arizaFotoSec(true),
      // Saha kanıtı aşaması — işe başlamadan önce mi sonra mı çekildiği,
      // bir sonraki eklenen fotoğraf/ses kaydına damgalanır (madde 10).
      asamaSec: Object.entries(ASAMA_AD).map(([k, ad]) => {
        const secili = (ff && ff.fotoAsama === 'sonra' ? 'sonra' : 'once') === k;
        return { label: ad, ...seg(secili, () => this.setState({ faultForm: { ...this.state.faultForm, fotoAsama: k } })) };
      }),
      isaretle: i => () => this.setState({ faultForm: { ...this.state.faultForm, isaret: i } }),