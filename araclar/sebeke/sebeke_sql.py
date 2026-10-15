#!/usr/bin/env python3
"""Şebeke paketi (sebeke_paketi.py çıktısı) → SQL (tek işlemde: depo + hat parçaları + baca + vana).
Kullanım: python -I sebeke_sql.py <cikti.sql> <paket1.json> [<paket2.json> ...]
Depo kaydı yoksa çizimdeki başlangıç (1 numaralı düğüm) konumunda yeni depo açılır; kodlar mevcut en büyük numaranın devamıdır."""
import sys, json

def q(t): return "'" + str(t).replace("'", "''") + "'"

def blok(d):
    koy, ilce = d['koy'], d['ilce']
    o = []
    o.append("-- ── %s (%s) ──" % (koy, ilce))
    o.append("do $$\ndeclare v_depo bigint; v_n int; v_b int; v_v int;\nbegin")
    o.append("  if exists (select 1 from tesis where tur in ('baca','vana') and koy = %s and ilce = %s and silindi is null) then raise exception '%s baca/vana kayıtları zaten var — aktarım yapılmadı'; end if;" % (q(koy), q(ilce), koy))
    o.append("  select coalesce(max((substring(kod from '[0-9]+$'))::int), 0) into v_n from tesis where kod like 'KS-DEP-%';")
    o.append("  insert into tesis (kod, tur, durum, ilce, koy, lat, lon, konum_yaklasik, barkod, kaynak, veri)\n    values ('KS-DEP-' || lpad((v_n + 1)::text, 4, '0'), 'depo'::tesis_turu, 'aktif', %s, %s, %s, %s, true, 'BK-DEP-' || lpad((v_n + 1)::text, 4, '0'), %s, '{\"d\":{},\"photos\":0}'::jsonb)\n    returning id into v_depo;" % (q(ilce), q(koy), d['depo']['lat'], d['depo']['lon'], q('Netcad çizimi (başlangıçtaki depo simgesi) — konum yaklaşık')))
    for h in d['hatlar']:
        ek = ' (mevcut)' if h['mevcut'] else ''
        if h['grup'] == 'Ana boru':
            ac = 'Ø%d mm · PE 10 atü · Hat 1 ve Hat 2 ortak ana boru%s · 1-2 parçası · %.3f m · 2 noktası: zemin kotu %.3f m, piyezometre kotu %.3f m, işletme basıncı %.3f m' % (h['cap'], ek, h['uzunluk'], h['zemin'], h['piyezo'], h['basinc'])
        else:
            ac = 'Ø%d mm · PE 10 atü · %s · %s parçası%s · %.3f m · %d noktası: zemin kotu %.3f m, piyezometre kotu %.3f m, işletme basıncı %.3f m' % (h['cap'], h['grup'], h['parca'], ek, h['uzunluk'], h['nokta'], h['zemin'], h['piyezo'], h['basinc'])
        o.append("  insert into hat (tesis_id, tur, noktalar, aciklama, grup) values (v_depo, %s::hat_turu, %s::jsonb, %s, %s);" % (q(h['tur']), q(json.dumps(h['noktalar'], separators=(',', ':'))), q(ac), q(h['grup'])))
    o.append("  select coalesce(max((substring(kod from '[0-9]+$'))::int), 0) into v_b from tesis where kod like 'KS-BAC-%';")
    o.append("  select coalesce(max((substring(kod from '[0-9]+$'))::int), 0) into v_v from tesis where kod like 'KS-VAN-%';")
    def tes(tur, pre, var, b, ek):
        hat = b['grup'] if b['grup'] != 'Ana boru' else 'Ana boru'
        dd = {'ad': b['ad'], 'hat': hat, 'parca': '%s · %s' % (b['grup'], b['parca']), 'cap': str(b['cap'])}
        dd.update(ek)
        veri = json.dumps({'d': dd, 'photos': 0}, ensure_ascii=False, separators=(',', ':'))
        return ("  insert into tesis (kod, tur, durum, ilce, koy, lat, lon, konum_yaklasik, barkod, kaynak, kml_ad, veri) values ('KS-%s-' || lpad((%s + %d)::text, 4, '0'), %s::tesis_turu, 'aktif', %s, %s, %s, %s, true, 'BK-%s-' || lpad((%s + %d)::text, 4, '0'), %s, %s, %s::jsonb);"
                % (pre, var, b['no'], q(tur), q(ilce), q(koy), b['lat'], b['lon'], pre, var, b['no'], q('Netcad KML aktarımı — konum yaklaşık'), q(b['ad']), q(veri)))
    for b in d['bacalar']: o.append(tes('baca', 'BAC', 'v_b', b, {}))
    for b in d['vanalar']: o.append(tes('vana', 'VAN', 'v_v', b, {'vanaTip': 'Ayrım vanası'}))
    o.append("end $$;")
    return '\n'.join(o)

paketler = [json.load(open(p, encoding='utf-8')) for p in sys.argv[2:]]
bas = """-- Şebeke aktarımı (Netcad KML + hesap tabloları): %s
-- Önce SQL-baca-vana-turleri ve SQL-hat-grup çalıştırılmış olmalı. Tek işlemde: bir hata olursa hiçbir şey yazılmaz.
-- Depo kaydı bu köylerde yoktu: çizimdeki başlangıç noktasında yeni depo açılır (konum yaklaşık).
-- Baca/vana konumu çizimdeki yazı (etiket) noktasından alındı: konum yaklaşık, sahada doğrulanacak.
begin;
""" % ', '.join(p['koy'] for p in paketler)
open(sys.argv[1], 'w', encoding='utf-8').write(bas + '\n\n'.join(blok(p) for p in paketler) + "\n\ncommit;\n")
print('yazıldı', sys.argv[1])
