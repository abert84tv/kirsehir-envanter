#!/usr/bin/env python3
"""Netcad şebeke çizimi (KML) + hesap tablosu (JSON, PDF'ten elle okunmuş) → şebeke paketi (JSON).

Kullanım:  python -I sebeke_paketi.py <tablo.json> <cizim.kml> <cikti.json>

KML: çizgiler (LineString) boru parçaları + sembol çizgileri, noktalar (Point) P1.. baca etiketleri, AV vana etiketleri.
Tablo JSON: {"koy", "ilce", "ad", "hatlar": {"Hat 1": [[parça, uzunluk, çap, nokta, piyezometre, zemin, işletme, "mevcut"?], ...]}}
Her tablo satırı (örn. "3-12") topolojiye ve uzunluğa göre KML'deki bir çizgiye eşlenir; eşleşme tutmazsa hata verir.
Hiçbir paket kurulmaz; yalnız standart kütüphane.
"""
import sys, re, math, json, collections

tablo = json.load(open(sys.argv[1], encoding='utf-8'))
s = open(sys.argv[2], encoding='utf-8').read()

lines, pts = [], []
for m in re.findall(r'<Placemark.*?</Placemark>', s, re.S):
    nn = re.search(r'<name>(.*?)</name>', m, re.S); n = nn.group(1) if nn else ''
    cs = [tuple(map(float, x.split(',')[:2])) for x in re.search(r'<coordinates>(.*?)</coordinates>', m, re.S).group(1).split()]
    if '<LineString>' in m: lines.append(cs)
    elif '<Point>' in m: pts.append((n, cs[0]))
LAT0 = sum(p[1] for n, p in pts) / len(pts); LON0 = sum(p[0] for n, p in pts) / len(pts)
kx = 111320 * math.cos(math.radians(LAT0)); ky = 110574
xy = lambda p: ((p[0] - LON0) * kx, (p[1] - LAT0) * ky)
ln = lambda cs: sum(math.dist(xy(a), xy(b)) for a, b in zip(cs, cs[1:]))
R = [cs for cs in lines if cs[0] != cs[-1] and ln(cs) >= 6.5]   # kapalı çizgiler yazı kutusu
RL = [ln(c) for c in R]
BAG = 6.5   # düğüm dairesi nedeniyle bağlanan çizgi uçları birbirinden birkaç metre açık olabilir
TOL = 0.025  # KML uzunluğu tablodan %0,1–1,7 kısa çıkıyor

# tablo doğrulaması: piyezometre - zemin = işletme basıncı
for h, rows in tablo['hatlar'].items():
    for r in rows:
        assert abs(r[4] - r[5] - r[6]) < 0.002, ('kot tutmuyor', h, r)


def coz(rows, yasak):
    """rows: [(a,b,L,...)] → {satır: (çizgi no, ters mi)} ve düğüm koordinatları; geri izlemeli arama."""
    kenar = [(int(r[0].split('-')[0]), int(r[0].split('-')[1]), r[1], r[0]) for r in rows]
    # 1 numaralı düğümden genişleyen sıra
    sira, bilinen, kalan = [], {1}, kenar[:]
    while kalan:
        for k in kalan:
            if k[0] in bilinen:
                sira.append(k); bilinen.add(k[1]); kalan.remove(k); break
        else:
            raise SystemExit('Tablo bağlı değil: ' + str(kalan))
    dugum = {}
    kul = {}

    def ara(i):
        if i == len(sira): return True
        a, b, L, ad = sira[i]
        adaylar = []
        for j, cs in enumerate(R):
            if j in kul.values() or j in yasak: continue
            e = abs(RL[j] - L) / L
            # kısa parçalarda çizgi düğüm dairesinde biter: tablo uzunluğundan %8'e kadar kısa olabilir
            if e > (TOL if L >= 20 else 0.08): continue
            for ters in (False, True):
                p0, p1 = (cs[-1], cs[0]) if ters else (cs[0], cs[-1])
                if a in dugum and math.dist(xy(dugum[a]), xy(p0)) > BAG: continue
                if b in dugum and math.dist(xy(dugum[b]), xy(p1)) > BAG: continue
                adaylar.append((e, j, ters, p0, p1))
        for e, j, ters, p0, p1 in sorted(adaylar):
            eski = dict(dugum); kul[ad] = j
            dugum.setdefault(a, p0); dugum.setdefault(b, p1)
            if ara(i + 1): return True
            del kul[ad]; dugum.clear(); dugum.update(eski)
        return False
    if not ara(0): raise SystemExit('Eşleşme bulunamadı: ' + str(rows[:1]))
    return dict(kul), dict(dugum)


sonuc = {'koy': tablo['koy'], 'ilce': tablo['ilce'], 'ad': tablo.get('ad', tablo['koy']), 'hatlar': [], 'bacalar': [], 'vanalar': []}
yasak, atanan, dugumler = set(), {}, {}
# önce çok satırlı hat, sonra diğerleri; ortak '1-2' satırı çizgiyi paylaşır
for hat in sorted(tablo['hatlar'], key=lambda h: -len(tablo['hatlar'][h])):
    rows = tablo['hatlar'][hat]
    kul, dg = coz(rows, yasak)
    dugumler[hat] = dg
    for ad, j in kul.items():
        if ad == '1-2': atanan.setdefault('1-2', j)
        else: yasak.add(j)
    # ikinci hatta '1-2' aynı çizgiyi kullanmalı: yasak kümesinden çıkarılmaz
    for r in rows:
        j = kul[r[0]]
        rp = r[4:7]; nokta = r[3]
        cs = R[j]
        # yön: tablodaki a→b
        a = int(r[0].split('-')[0])
        if math.dist(xy(dg[a]), xy(cs[0])) > math.dist(xy(dg[a]), xy(cs[-1])): cs = cs[::-1]
        nk = []
        for p in cs:
            t = [round(p[1], 7), round(p[0], 7)]
            if not nk or nk[-1] != t: nk.append(t)
        ortak = (r[0] == '1-2')
        sonuc['hatlar'].append({
            'grup': 'Ana boru' if ortak else hat, 'hat': hat, 'parca': r[0], 'cap': r[2], 'uzunluk': r[1],
            'tur': 'isale' if ortak else 'sebeke', 'nokta': nokta, 'zemin': r[5], 'piyezo': r[4], 'basinc': r[6],
            'mevcut': len(r) > 7 and r[7] == 'mevcut', 'noktalar': nk, 'kml_uz': round(RL[j], 1), 'cizgi': j})
# '1-2' iki hatta da geçtiği için tek kayıt: Ana boru
gor, tekil = set(), []
for h in sonuc['hatlar']:
    if h['parca'] == '1-2':
        if h['cizgi'] in gor: continue
        gor.add(h['cizgi'])
    tekil.append(h)
sonuc['hatlar'] = tekil

# depo: 1 numaralı düğüm (1-2 çizgisinin uzak ucu)
any_h = next(iter(dugumler)); d1 = dugumler[any_h][1]
sonuc['depo'] = {'lat': round(d1[1], 7), 'lon': round(d1[0], 7)}

# yakınlık: bir nokta hangi hat parçasına düşüyor
parcalar = [(h['grup'], h['parca'], h['cap'], h['noktalar']) for h in sonuc['hatlar']]
def dseg(p, a, b):
    ax, ay = a; bx, by = b; px, py = p; dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)
def yakin(lon, lat):
    q = xy((lon, lat)); best = None
    for g, pa, cap, nk in parcalar:
        d = min(dseg(q, xy((nk[i][1], nk[i][0])), xy((nk[i + 1][1], nk[i + 1][0]))) for i in range(len(nk) - 1))
        if best is None or d < best[0]: best = (d, g, pa, cap)
    return best

g = collections.defaultdict(list)
for n, p in pts: g[n].append(p)
pn = sorted([n for n in g if re.fullmatch(r'P\d+', n)], key=lambda n: int(n[1:]))
for n in pn:
    pp = g[n]; lon = sum(p[0] for p in pp) / len(pp); lat = sum(p[1] for p in pp) / len(pp)
    d, gr, pa, cap = yakin(lon, lat)
    sonuc['bacalar'].append({'no': int(n[1:]), 'ad': n, 'lat': round(lat, 7), 'lon': round(lon, 7), 'grup': gr, 'parca': pa, 'cap': cap, 'uzak': round(d, 1)})
av = sorted(g.get('AV', []), key=lambda p: p[1])
for k, p in enumerate(av, 1):
    d, gr, pa, cap = yakin(p[0], p[1])
    sonuc['vanalar'].append({'no': k, 'ad': 'AV%d' % k, 'lat': round(p[1], 7), 'lon': round(p[0], 7), 'grup': gr, 'parca': pa, 'cap': cap, 'uzak': round(d, 1)})

json.dump(sonuc, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# özet
print('hat parçası', len(sonuc['hatlar']), '| baca', len(sonuc['bacalar']), '| vana', len(sonuc['vanalar']))
for h in sonuc['hatlar']:
    print('%-9s %-6s Ø%d tablo %.3f kml %.1f  (%+.2f%%)' % (h['grup'], h['parca'], h['cap'], h['uzunluk'], h['kml_uz'], 100 * (h['kml_uz'] - h['uzunluk']) / h['uzunluk']))
kul = {h['cizgi'] for h in sonuc['hatlar']}
rest = [(round(RL[j], 1)) for j in range(len(R)) if j not in kul and RL[j] >= 12.5]
print('kullanılmayan açık çizgiler (>=12,5 m):', rest)
