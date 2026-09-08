import { KUYULAR } from './kuyular.js';
// Envanter üretimi — hem uygulama hem harita sayfası aynı tohumu kullanır,
// böylece kodlar ve konumlar iki yerde birebir aynı olur.

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

const rng = seed => { let s = seed; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; };

export function buildAssets(m) {
  const r = rng(4711), assets = [], order = ['kuyu', 'depo', 'ag', 'ges'];
  const sayac = { kuyu: 0, depo: 0, ag: 0, ges: 0 };
  let i = 0;
  for (const d of m.DISTRICTS) {
    const vs = m.VILLAGES[d.id] || [];
    const picks = vs.length ? vs.filter((_, k) => k % 2 === 0) : [d.name];
    for (const v of picks) {
      const n = 1 + Math.floor(r() * 2.4);
      for (let k = 0; k < n; k++) {
        const type = order[Math.floor(r() * (k === 0 ? 2 : 4))];
        const yil = 1986 + Math.floor(r() * 38);
        i++;
        assets.push({
          id: 'a' + i, type, village: v, district: d.name,
          lat: d.lat + (r() - .5) * .16, lon: d.lon + (r() - .5) * .2, coordApprox: true,
          code: `KS-${TYPES[type].pre}-${String(++sayac[type]).padStart(4, '0')}`,
          status: r() < .1 ? 'pasif' : 'aktif',
          sync: r() < .08 ? 'pending' : 'synced',
          photos: Math.floor(r() * 5),
          year: yil,
          d: (() => { const statik = 10 + r() * 40;
            const dd = () => String(1 + Math.floor(r() * 28)).padStart(2, '0'), mm = () => String(1 + Math.floor(r() * 12)).padStart(2, '0');
            return {
            derinlik: (60 + r() * 180).toFixed(1), pompaD: (40 + r() * 120).toFixed(1),
            cap: [200, 250, 300, 350][Math.floor(r() * 4)], statik: statik.toFixed(1),
            dinamik: (statik + 6 + r() * 34).toFixed(1), debi: (2 + r() * 22).toFixed(1),
            kolon: ['Galvanizli çelik', 'HDPE', 'Paslanmaz', 'PVC'][Math.floor(r() * 4)],
            kolonCap: [100, 125, 150][Math.floor(r() * 3)],
            rf: ['Kurulu — aktif', 'Kurulu — arızalı', 'Yok', 'Planlandı'][Math.floor(r() * 4)],
            motor: (5.5 + r() * 40).toFixed(1), kablo: [4, 6, 10, 16][Math.floor(r() * 4)],
            hacim: [50, 75, 100, 150, 200, 300][Math.floor(r() * 6)],
            kaynak: 1 + Math.floor(r() * 3),
            malzeme: ['Betonarme', 'Çelik', 'Prefabrik'][Math.floor(r() * 3)],
            klor: r() < .45, rfMod: r() < .5,
            sigorta: [25, 32, 40, 63, 80][Math.floor(r() * 5)],
            brans: [16, 20, 25, 32][Math.floor(r() * 4)],
            kalkis: ['Direkt', 'Yıldız-üçgen', 'Soft-starter', 'Sürücü (VFD)'][Math.floor(r() * 4)],
            pano: ['Sac', 'Poliester'][Math.floor(r() * 2)],
            trafoTipi: ['Direk tipi (tek direk)', 'Direk tipi (çift direk)'][Math.floor(r() * 2)],
            trafo: [25, 50, 100, 160][Math.floor(r() * 4)],
            guc: (5 + r() * 90).toFixed(1), panelAdet: 12 + Math.floor(r() * 180),
            inverter: ['Huawei', 'SMA', 'Fronius', 'Growatt'][Math.floor(r() * 4)],
            baglanti: ['Şebeke bağlantılı', 'Off-grid', 'Hibrit'][Math.floor(r() * 3)],
            bakim: `${dd()}.${mm()}.${2024 + Math.floor(r() * 2)}`,
            // kuyu — belge ve sondaj
            ruhsat: r() < .25 ? '' : 'DSİ/' + (2 + Math.floor(r() * 6)) + '-' + (1000 + Math.floor(r() * 8999)),
            sondajFirma: r() < .3 ? '' : ['Anadolu Sondaj', 'Kırşehir Sondaj', 'Öz Su Sondaj', 'Bozkır Sondaj'][Math.floor(r() * 4)],
            sondajTarih: r() < .3 ? '' : `${dd()}.${mm()}.${yil}`,
            kuyuLog: r() < .35 ? '' : [
              '0-8 m bitkisel toprak · 8-34 m kil · 34-72 m çakıl (verimli) · 72+ m marn',
              '0-5 m dolgu · 5-40 m killi kum · 40-95 m kireçtaşı (çatlaklı) · 95+ m marn',
              '0-12 m killi toprak · 12-48 m kum-çakıl · 48-88 m silt · 88+ m anakaya'
            ][Math.floor(r() * 3)],
            filtre: r() < .35 ? '' : `${40 + Math.floor(r() * 30)}-${80 + Math.floor(r() * 40)} m arası, ${[24, 30, 36, 42][Math.floor(r() * 4)]} m filtre`,
            cakil: r() < .4 ? '' : ['2-4 mm yıkanmış çakıl, 6 m şap', '3-6 mm çakıl, 8 m kil şap', '2-4 mm çakıl, şap yok'][Math.floor(r() * 3)],
            kot: r() < .3 ? '' : (860 + Math.floor(r() * 480)) + ' m',
            suAnaliz: r() < .35 ? '' : ['İçilebilir — TS 266 uygun', 'İçilebilir — sertlik yüksek', 'Nitrat sınırda', 'İletkenlik yüksek'][Math.floor(r() * 4)],
            suAnalizTarih: r() < .35 ? '' : `${dd()}.${mm()}.202${4 + Math.floor(r() * 2)}`,
            klorDeger: r() < .4 ? '' : (0.2 + r() * .8).toFixed(2) + ' mg/L',
            // pompa ve elektrik
            pompaMarka: r() < .25 ? '' : ['Standart', 'Layne Bowler', 'Grundfos', 'Sumak', 'İmpo'][Math.floor(r() * 5)],
            pompaModel: r() < .3 ? '' : 'SP-' + (6 + Math.floor(r() * 12)) + '/' + (8 + Math.floor(r() * 30)),
            kademe: r() < .3 ? '' : (6 + Math.floor(r() * 26)) + ' kademe',
            motorSeri: r() < .35 ? '' : 'MT' + (100000 + Math.floor(r() * 899999)),
            montajTarih: r() < .35 ? '' : `${dd()}.${mm()}.202${Math.floor(r() * 6)}`,
            termik: r() < .4 ? '' : (12 + Math.floor(r() * 60)) + ' A',
            akim: r() < .4 ? '' : (10 + r() * 55).toFixed(1) + ' A',
            isletmeSaat: r() < .4 ? '' : (800 + Math.floor(r() * 42000)).toLocaleString('tr-TR') + ' saat',
            sayac: r() < .4 ? '' : (12000 + Math.floor(r() * 380000)).toLocaleString('tr-TR') + ' kWh',
            yedekPompa: r() < .35 ? '' : (r() < .4 ? 'Var — depoda' : 'Yok'),
            pompaHesap: r() < .55 ? '' : 'Pompa hesap programından okundu',
            // depo ve şebeke
            klorCihaz: r() < .3 ? '' : ['Dozaj pompası — çalışıyor', 'Dozaj pompası — arızalı', 'Tablet klorlama', 'Yok'][Math.floor(r() * 4)],
            seviyeSensor: r() < .3 ? '' : ['Şamandıra', 'Basınç sensörü + telemetri', 'Ultrasonik + telemetri', 'Yok'][Math.floor(r() * 4)],
            terfiUzunluk: r() < .35 ? '' : (0.4 + r() * 6).toFixed(1) + ' km',
            terfiCap: r() < .35 ? '' : 'Ø' + [63, 75, 90, 110, 125, 160][Math.floor(r() * 6)] + ' mm',
            hizmetKoy: r() < .25 ? '' : (1 + Math.floor(r() * 3)) + ' köy',
            nufus: r() < .25 ? '' : (80 + Math.floor(r() * 1500)).toLocaleString('tr-TR') + ' kişi',
            abone: r() < .3 ? '' : (30 + Math.floor(r() * 520)) + ' abone',
            temizlik: r() < .35 ? '' : `${dd()}.${mm()}.202${4 + Math.floor(r() * 2)}`,
            kapak: r() < .3 ? '' : ['Kilitli — sağlam', 'Kilitli — kapak paslı', 'Kilit yok', 'Kapak hasarlı'][Math.floor(r() * 4)]
          }; })()
        });
      }
    }
  }
  // ── gerçek kuyu noktaları (KUYU YERLERİ 2026 SON.kml — 264 nokta)
  // KML'den gelen kayıtlar: yalnızca kod, konum ve ilçe dolu; teknik alanlar sahada doldurulacak.
  const bos = {
    derinlik: '', pompaD: '', cap: '', statik: '', dinamik: '', debi: '', kolon: '', kolonCap: '',
    rf: '', motor: '', kablo: '', hacim: '', kaynak: '', malzeme: '', klor: false, rfMod: false,
    sigorta: '', brans: '', kalkis: '', pano: '', trafoTipi: '', trafo: '', guc: '', panelAdet: '',
    inverter: '', baglanti: '', bakim: '', ruhsat: '', sondajFirma: '', sondajTarih: '', kuyuLog: '',
    filtre: '', cakil: '', kot: '', suAnaliz: '', suAnalizTarih: '', klorDeger: '', pompaMarka: '',
    pompaModel: '', kademe: '', motorSeri: '', montajTarih: '', termik: '', akim: '', isletmeSaat: '',
    sayac: '', yedekPompa: '', pompaHesap: '', klorCihaz: '', seviyeSensor: '', terfiUzunluk: '',
    terfiCap: '', hizmetKoy: '', nufus: '', abone: '', temizlik: '', kapak: ''
  };
  const realWells = KUYULAR.map(k => ({
    id: 'k' + k.no, type: 'kuyu', village: '', district: k.district,
    lat: k.lat, lon: k.lon, coordApprox: false,
    coordSource: 'KML / Google Earth — saha ölçümü ile doğrulanmadı',
    code: `KS-KUY-${String(k.no).padStart(4, '0')}`,
    kmlName: String(k.no), source: 'KML aktarımı · KUYU YERLERİ 2026 SON',
    status: 'aktif', sync: 'synced', photos: 0, year: '',
    d: { ...bos }
  }));

  const all = [...realWells, ...assets.filter(a => a.type !== 'kuyu')];

  const faults = [];
  const prios = ['Acil', 'Yüksek', 'Normal'], sts = ['acik', 'atandi', 'sahada', 'cozuldu'];
  for (let k = 0; k < 7; k++) {
    const a = all[Math.floor(r() * all.length)];
    const list = FAULT_TYPES[a.type];
    faults.push({
      id: 'f' + (k + 1), no: 'AR-' + String(101 + k), assetId: a.id,
      type: list[Math.floor(r() * list.length)],
      priority: prios[Math.floor(r() * 3)], status: sts[Math.floor(r() * 4)],
      crew: CREWS[1 + Math.floor(r() * 4)], reporter: 'Muhtar bildirimi',
      opened: `${10 + Math.floor(r() * 18)}.08.2026 ${8 + Math.floor(r() * 9)}:${10 + Math.floor(r() * 49)}`,
      note: '', hours: String(1 + Math.floor(r() * 8)), photos: [], sync: 'synced'
    });
  }
  return { assets: all, faults };
}
