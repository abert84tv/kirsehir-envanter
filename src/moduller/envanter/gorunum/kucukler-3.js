      onNaDistrict: e => this.setState({ newAsset: { ...this.state.newAsset, district: e.target.value, village: '' } }),
      onNaVillage: e => this.setState({ newAsset: { ...this.state.newAsset, village: e.target.value } }),
      onNaYear: e => this.setState({ newAsset: { ...this.state.newAsset, year: e.target.value } }),
      onNaNote: e => this.setState({ newAsset: { ...this.state.newAsset, note: e.target.value } }),