const BBOX = { w: 33.35, e: 34.75, s: 38.75, n: 39.75 };
const TYPES = {
  kuyu: { label: 'Kuyu', glyph: 'K', kind: 'Su kuyusu', pre: 'KUY' },
  depo: { label: 'Depo', glyph: 'D', kind: 'Su deposu', pre: 'DEP' },
  ag: { label: 'AG', glyph: 'A', kind: 'AG şebeke / pano', pre: 'AGP' },
  ges: { label: 'GES', glyph: 'G', kind: 'Güneş enerji santrali', pre: 'GES' }
};
const FAULT_TYPES = {
  kuyu: ['Pompa çalışmıyor', 'Debi düşüklüğü', 'Kolon borusu kaçağı', 'Motor aşırı akım', 'RF haberleşme kesildi', 'Diğer'],
  depo: ['Depo kaçağı / çatlak', 'Klorlama cihazı arızası', 'Seviye sensörü arızası', 'Kapak / güvenlik', 'RF modülü arızası', 'Diğer'],
  ag: ['Elektrik kesintisi', 'Sigorta attı', 'Kontaktör / röle arızası', 'Kablo arızası', 'Pano su aldı', 'Diğer'],
  ges: ['İnverter arızası', 'Panel kırığı', 'Üretim düşüklüğü', 'Bağlantı / şalt arızası', 'Diğer']
};
// İş grubu → arıza türleri. Arıza ekranında önce grup, sonra yalnız o
// gruba ait türler açılır listede gelir. "tesis" grubun hangi tesis türüne
// bağlandığını, "sebeke" tesis yerine köyde bir noktada olabileceğini
// (boru hattı, vana, abone bağlantısı) söyler.
const ARIZA_GRUP = {
  su: { ad: 'Su şebekesi / boru hattı', sebeke: true, tesis: null, turler: [
    'Boru patlağı', 'Boru kaçağı / sızıntı', 'Su yok / kesinti', 'Basınç düşüklüğü', 'Vana arızası',
    'Vana kaçağı', 'Abone bağlantısı arızası', 'Sayaç arızası', 'Bulanık / kirli su', 'Çeşme / hidrant arızası',
    'Donma', 'Diğer'] },
  kuyu: { ad: 'Kuyu ve pompa', sebeke: false, tesis: 'kuyu', turler: [
    'Pompa çalışmıyor', 'Debi düşüklüğü', 'Motor aşırı akım', 'Motor yandı', 'Kolon borusu kaçağı',
    'Çekvalf arızası', 'Kuyu kumlanması', 'Seviye / şamandıra arızası', 'Kuyu başı kaçağı', 'RF haberleşme kesildi', 'Diğer'] },
  depo: { ad: 'Depo', sebeke: false, tesis: 'depo', turler: [
    'Depo kaçağı / çatlak', 'Taşma', 'Klorlama cihazı arızası', 'Klor yetersiz / fazla', 'Seviye sensörü arızası',
    'Giriş / çıkış vanası arızası', 'Kapak / güvenlik', 'Temizlik gerekiyor', 'RF modülü arızası', 'Diğer'] },
  elektrik: { ad: 'Elektrik / pano', sebeke: false, tesis: 'ag', turler: [
    'Elektrik kesintisi', 'Sigorta attı', 'Kontaktör / röle arızası', 'Kablo arızası', 'Pano su aldı',
    'Termik attı', 'Faz kaybı', 'Trafo arızası', 'Topraklama sorunu', 'Kompanzasyon arızası', 'Diğer'] },
  ges: { ad: 'GES', sebeke: false, tesis: 'ges', turler: [
    'İnverter arızası', 'Panel kırığı', 'Panel kirli', 'Üretim düşüklüğü', 'Bağlantı / şalt arızası',
    'Kablo / konnektör arızası', 'Diğer'] },
  kanal: { ad: 'Kanalizasyon', sebeke: true, tesis: null, turler: [
    'Tıkanıklık', 'Taşma', 'Rögar kapağı kırık / yok', 'Koku', 'Hat çökmesi / göçük', 'Foseptik dolu', 'Diğer'] }
};
// Tesis türünden varsayılan grup; eski kayıtta grup yoksa türden tahmin
const TESIS_GRUP = { kuyu: 'kuyu', depo: 'depo', ag: 'elektrik', ges: 'ges' };
function arizaGrubu(f, a) {
  if (f && ARIZA_GRUP[f.grup]) return f.grup;
  if (a && TESIS_GRUP[a.type]) return TESIS_GRUP[a.type];
  const tur = f && f.type;
  for (const g in ARIZA_GRUP) if (tur && ARIZA_GRUP[g].turler.includes(tur)) return g;
  return 'su';
}
// Malzeme kataloğu ilk kurulumda bu listeyle başlar — [ad, birim fiyat ₺,
// birim, kategori]. Liste sabit değil: Ambar ekranındaki "Malzeme tanımla"
// ile eklenir, fiyatı ve kritik eşiği değişir; sunucuda "malzeme"
// anahtarında durur. Ambar mevcudu ve zimmet malzeme ADINA göre tutulur,
// bu yüzden hareketi olan malzemenin adı değiştirilemez.
// Özet haritası ve göstergeler: türe göre sabit renkler (haritadaki işaretlerle aynı; koyu temada ayrı adımlar)
const turRenk = dark => dark ? { kuyu: '#3d8bfd', depo: '#d4770a', ag: '#9a78e8', ges: '#b88700' } : { kuyu: '#0071e3', depo: '#b45309', ag: '#7b3fbf', ges: '#c08a00' };
