-- DENEME VERİSİ TEMİZLİĞİ — deneme hesapları (kullanıcı adı "deneme.…"), deneme ekipleri/personeli ve senaryo denemelerinin açtığı kayıtlar.
-- Hazırlandığı tarih: 2026-10-10. Deneme başlamadan önceki durum (taban):
--   ariza: 4 kayıt (en büyük id 4) · is_emirleri: 1 (id 1) · foto (ses dahil): en büyük id 43 · saha_notu: 0 · denetim en büyük id 920 · gecmis en büyük id 552734
--   tesis: 292 kayıt, en büyük id 1084 · gerçek kullanıcı: 2 (yönetici, müdür) · numara_sayaci: ariza 4, isemri 1, talep 4 (2026)
--   kurum_veri: ekip [], personel [], siparis [], ambar {"gun":{},"stok":{},"zimmet":{},"hareket":[]}, talep: 14. sürüm; modul değişmedi
-- Bu dosya SİLER: yalnız deneme bittiğinde, içeriğini okuyup çalıştırın. Çalıştırmadan önce şu sorgularla neyin silineceğine bakın:
--   select count(*) from tesis where olusturan_k in (select id from kullanicilar where kullanici_ad like 'deneme.%');   -- deneme tesisleri (kodları KS-KUY-xxxx'e dönüşür; "DENEME-" ile aranamaz)
--   select id, no from ariza where id > 4;   select id, no from is_emirleri where id > 1;

-- 1) Deneme tesisleri ve bağlı kayıtlar (hesaplar silinmeden ÖNCE: tesisler "olusturan_k" ile bulunur)
create temp table _dtesis on commit drop as
  select id from tesis where olusturan_k in (select id from kullanicilar where kullanici_ad like 'deneme.%');
delete from deneme where tesis_id in (select id from _dtesis);
delete from saha_notu where tesis_id in (select id from _dtesis) or id > 0;
delete from foto where tesis_id in (select id from _dtesis) or id > 43;
delete from hat where tesis_id in (select id from _dtesis) or olusturan_k in (select id from kullanicilar where kullanici_ad like 'deneme.%');
delete from telemetri_cihaz where tesis_id in (select id from _dtesis);
delete from gecmis where tesis_id in (select id from _dtesis) or id > 552734;
delete from tesis_degisiklik where acan_k in (select id from kullanicilar where kullanici_ad like 'deneme.%');
delete from konum_son where cihaz_id in (select id from konum_cihaz where ekip like 'Deneme%' or ad like 'DENEME%');
delete from konum_cihaz where ekip like 'Deneme%' or ad like 'DENEME%';
delete from vatandas_basvuru where takip like 'DNTEST-%';

-- 2) Senaryoların açtığı arıza / iş emri / talep izleri (tabandan sonra gelenler)
delete from is_emri_ek where exists (select 1 from is_emirleri e where e.id = is_emri_ek.id and e.id > 1);
delete from ariza_ek where ariza_id > 4;
delete from is_emirleri where id > 1;
delete from ariza where id > 4;
delete from tesis where id in (select id from _dtesis);
delete from denetim where id > 920;
update numara_sayaci set deger = 4 where tur = 'ariza' and yil = 2026;
update numara_sayaci set deger = 1 where tur = 'isemri' and yil = 2026;
update numara_sayaci set deger = 4 where tur = 'talep' and yil = 2026;

-- 3) Ortak veri satırları
update kurum_veri set veri = '[]'::jsonb, surum = surum + 1, guncelleme = now() where anahtar in ('ekip', 'personel', 'siparis');
-- deneme araçları (dn-ar1…dn-ar6) ve örnek araç listesi: deneme öncesi bu kayıt boştu ({}); program başlangıç listesini kendisi gösterir
update kurum_veri set veri = '{}'::jsonb, surum = surum + 1, guncelleme = now() where anahtar = 'arac';
update kurum_veri set veri = '{"gun": {}, "stok": {}, "zimmet": {}, "hareket": []}'::jsonb, surum = surum + 1, guncelleme = now() where anahtar = 'ambar';
update kurum_veri
   set veri = (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(veri) x where coalesce(x->>'ad', '') not ilike '%deneme%'),
       surum = surum + 1, guncelleme = now()
 where anahtar = 'talep' and jsonb_typeof(veri) = 'array';

-- 4) Deneme hesapları ve oturumları (en sonda)
delete from tercih where kullanici_id in (select id from kullanicilar where kullanici_ad like 'deneme.%');
delete from oturum where kullanici_id in (select id from kullanicilar where kullanici_ad like 'deneme.%');
delete from kullanicilar where kullanici_ad like 'deneme.%';

-- 5) Sonuç kontrolü (her biri taban değere dönmeli: tesis 292, ariza 4, is_emirleri 1, kullanıcı 2)
select (select count(*) from tesis) tesis, (select count(*) from ariza) ariza, (select count(*) from is_emirleri) is_emri, (select count(*) from kullanicilar) kullanici;
