  // Arızanın ekibini eşitler (iş emri ataması sonrası): açıksa "atandı" olur
  arizaEkipYaz(f, crew) {
    if (!f) return;
    const yeniDurum = f.status === 'acik' || f.status === 'yeniden' ? 'atandi' : f.status;
    this.setState(st => ({
      faults: (st.faults || []).map(x => x.id === f.id ? { ...x, crew, status: yeniDurum, sync: 'pending' } : x),
      faultForm: st.faultForm && st.faultForm.id === f.id ? { ...st.faultForm, crew, status: yeniDurum } : st.faultForm
    }));
    setTimeout(() => this.arizaKuyrukGonder(), 0);
  }