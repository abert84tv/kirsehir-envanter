      naAc: canCreateAsset ? () => this.naAc() : () => this.say('Bu rolde yeni tesis kaydı kapalı — rol dağıtımı Ayarlar > Yetkiler ekranında.'),
      naAcVar: canCreateAsset && s.device !== 'phone',