-- 2026-10-09 — gecmis tablosundaki gereksiz toplu "Kayıt güncellendi" satırlarının temizliği.
-- Nedeni: cop_temizle her çağrıda bütün tesisleri yeniden yazıyordu (bkz. SQL-cop-temizle-surum-duzelt.sql);
-- ~550 bin satır birikti (tablo 103 MB, veritabanının neredeyse tamamı).
-- Silinen: aynı dakikada 50'den fazla farklı tesiste görülen "Kayıt güncellendi" satırları (toplu yazma izi).
-- Kalan: tekil gerçek düzenlemeler (~97 satır), oluşturma / çöp kutusu / geri getirme / iş emri satırları.

-- 1) Önce say (silmez):
select count(*) as silinecek
  from gecmis g
 where g.ne = 'Kayıt güncellendi'
   and date_trunc('minute', g.ne_zaman) in (
     select date_trunc('minute', ne_zaman) from gecmis where ne = 'Kayıt güncellendi'
      group by 1 having count(distinct tesis_id) >= 50);

-- 2) Sil:
delete from gecmis g
 where g.ne = 'Kayıt güncellendi'
   and date_trunc('minute', g.ne_zaman) in (
     select date_trunc('minute', ne_zaman) from gecmis where ne = 'Kayıt güncellendi'
      group by 1 having count(distinct tesis_id) >= 50);

-- 3) Yer geri kazanmak için (ayrı çalıştırılır, transaction dışında):
-- vacuum full gecmis;
