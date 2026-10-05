// Cihaz deposu (IndexedDB): çevrimdışıyken çekilen fotoğraf/ses dosyaları ve
// sunucudan son alınan veri kopyası burada durur. localStorage dosya tutamaz
// ve ~5 MB ile sınırlıdır; IndexedDB ikisini de taşır.
// Her işlev hata verirse sessizce boş döner — depolama kapalıysa (gizli sekme
// vb.) program yine çalışır, yalnızca çevrimdışı kalıcılık olmaz.

const AD = 'ks-cihaz';
let dbSoz = null;

function ac() {
  if (dbSoz) return dbSoz;
  dbSoz = new Promise((res, rej) => {
    try {
      const i = indexedDB.open(AD, 1);
      i.onupgradeneeded = () => {
        const db = i.result;
        if (!db.objectStoreNames.contains('anlik')) db.createObjectStore('anlik', { keyPath: 'k' });
        if (!db.objectStoreNames.contains('medya')) {
          const m = db.createObjectStore('medya', { keyPath: 'id', autoIncrement: true });
          m.createIndex('ref', 'ref', { unique: false });
        }
      };
      i.onsuccess = () => res(i.result);
      i.onerror = () => rej(i.error);
      i.onblocked = () => rej(new Error('engellendi'));
    } catch (e) { rej(e); }
  }).catch(() => { dbSoz = null; return null; });
  return dbSoz;
}

function islem(depo, mod, fn) {
  return ac().then(db => {
    if (!db) return null;
    return new Promise(res => {
      try {
        const t = db.transaction(depo, mod);
        const s = t.objectStore(depo);
        let sonuc;
        const r = fn(s);
        if (r) r.onsuccess = () => { sonuc = r.result; };
        t.oncomplete = () => res(sonuc === undefined ? true : sonuc);
        t.onerror = () => res(null);
        t.onabort = () => res(null);
      } catch (e) { res(null); }
    });
  });
}

// Kalıcı depolama izni: tarayıcı yer daraldığında bu veriyi silmesin
export function kaliciIste() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* desteklenmiyor */ }
}

// ── sunucudan son alınan veri (çevrimdışı açılışta kullanılır)
export function anlikYaz(k, v) { return islem('anlik', 'readwrite', s => s.put({ k, v, z: Date.now() })); }
export async function anlikOku(k) {
  const r = await islem('anlik', 'readonly', s => s.get(k));
  return r && r !== true ? r : null;
}
export function anlikSil(k) { return islem('anlik', 'readwrite', s => s.delete(k)); }

// ── gönderilmeyi bekleyen fotoğraf ve ses dosyaları
// kayıt: { hedef:'ariza'|'tesis', ref, tur:'foto'|'ses', blob, asama, sure, kb, ad, kod, t }
export function medyaEkle(kayit) {
  return islem('medya', 'readwrite', s => s.add({ ...kayit, t: kayit.t || Date.now() }));
}
export async function medyaListe() {
  const r = await islem('medya', 'readonly', s => s.getAll());
  return Array.isArray(r) ? r : [];
}
export function medyaSil(id) { return islem('medya', 'readwrite', s => s.delete(id)); }
export async function medyaSay() { const r = await islem('medya', 'readonly', s => s.count()); return typeof r === 'number' ? r : 0; }
// Arıza sunucuya yazılınca yerel kimliği değişir; dosyalar yeni kimliğe bağlanır
export async function medyaRefDegis(eski, yeni) {
  if (eski === yeni) return true;
  const liste = (await medyaListe()).filter(x => x.hedef === 'ariza' && x.ref === eski);
  for (const k of liste) await islem('medya', 'readwrite', s => s.put({ ...k, ref: yeni }));
  return true;
}
