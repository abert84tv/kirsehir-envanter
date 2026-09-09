import { KUYULAR } from './kuyular.js';
// Envanter üretimi — hem uygulama hem harita sayfası aynı listeyi kullanır,
// böylece kodlar ve konumlar iki yerde birebir aynı olur.
//
// Demo/örnek kayıt üretimi kaldırıldı (9 Eylül 2026): program yalnızca gerçek
// KML kuyu noktalarıyla açılır. Depo, AG ve GES kayıtları sahada elle girilir;
// arıza, deneme ve saha notu listeleri boş başlar.

export const TYPES = {
  kuyu: { label: 'Kuyu', glyph: 'K', kind: 'Su kuyusu', pre: 'KUY' },
  depo: { label: 'Depo', glyph: 'D', kind: 'Su deposu', pre: 'DEP' },
  ag: { label: 'AG', glyph: 'A', kind: 'AG şebeke / pano', pre: 'AGP' },
  ges: { label: 'GES', glyph: 'G', kind: 'Güneş enerji santrali', pre: 'GES' }
};

export const FAULT_TYPES = {
  kuyu: ['Pompa çalışmıyor', 'Debi düşüklüğü', 'Kolon borusu kaçağı', 'Motor aşırı akım', 'RF haberleşme kesildi', 'Diğer'],
  depo: ['Depo kaçağı / çatlak', 'Klorlama cihazı arızası', 'Seviye sensörü arızası', 'Kapak / güvenlik', 'RF modülü arızası', 'Diğer'],
  ag: ['Elektrik kesintisi', 'Sigorta attı', 'Kontaktör / röle arızası', 'Kablo arızası', 'Pano su aldı', 'Diğer'],
  ges: ['İnverter arızası', 'Panel kırığı', 'Üretim düşüklüğü', 'Bağlantı / şalt arızası', 'Diğer']
};

export const CREWS = ['Atanmadı', 'Ekip 1 — Merkez', 'Ekip 2 — Kaman', 'Ekip 3 — Mucur', 'Ekip 4 — Çiçekdağı'];
export const STATUS_LABEL = { acik: 'Açık', atandi: 'Atandı', sahada: 'Sahada', cozuldu: 'Çözüldü' };

// Yeni kayıtta bütün teknik alanlar boş açılır — sahada doldurulur.
const BOS_ALANLAR = {
  derinlik: '', pompaD: '', cap: '', statik: '', dinamik: '', debi: '', kolon: '', kolonCap: '',
  rf: '', motor: '', kablo: '', hacim: '', kaynak: '', malzeme: '', klor: false, rfMod: false,
  sigorta: '', brans: '', kalkis: '', pano: '', trafoTipi: '', trafo: '', guc: '', panelAdet: '',
  inverter: '', baglanti: '', bakim: '', ruhsat: '', sondajFirma: '', sondajTarih: '', kuyuLog: '',
  filtre: '', cakil: '', kot: '', suAnaliz: '', suAnalizTarih: '', klorDeger: '', pompaMarka: '',
  pompaModel: '', kademe: '', motorSeri: '', montajTarih: '', termik: '', akim: '', isletmeSaat: '',
  sayac: '', yedekPompa: '', pompaHesap: '', klorCihaz: '', seviyeSensor: '', terfiUzunluk: '',
  terfiCap: '', hizmetKoy: '', nufus: '', abone: '', temizlik: '', kapak: ''
};

export function buildAssets() {
  // Gerçek kuyu noktaları (KUYU YERLERİ 2026 SON.kml): yalnızca kod, konum ve
  // ilçe dolu; teknik alanlar sahada doldurulacak.
  const kuyular = KUYULAR.map(k => ({
    id: 'k' + k.no, type: 'kuyu', village: '', district: k.district,
    lat: k.lat, lon: k.lon, coordApprox: false,
    coordSource: 'KML / Google Earth — saha ölçümü ile doğrulanmadı',
    code: `KS-KUY-${String(k.no).padStart(4, '0')}`,
    kmlName: String(k.no), source: 'KML aktarımı · KUYU YERLERİ 2026 SON',
    status: 'aktif', sync: 'synced', photos: 0, year: '',
    d: { ...BOS_ALANLAR }
  }));
  return { assets: kuyular, faults: [] };
}
