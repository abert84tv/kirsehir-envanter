-- YETKİ TESTİ (kalıcı, tekrar çalıştırılabilir) — Supabase SQL Editor'de ya da MCP execute_sql ile çalıştırın.
-- Geçici kullanıcılar ve oturumlar oluşturur, rol/yetki tablosunu ve sunucu işlevlerinin yasak çağrılarını dener,
-- SONUNDA HER ZAMAN İSTİSNA FIRLATARAK bütün değişiklikleri geri alır (gerçek veriye hiçbir şey yazılmaz).
-- Beklenen çıktı:  ERROR: YETKI-TESTI TAMAM — N kontrol geçti
-- Başarısızlık:    ERROR: YETKI-TESTI BASARISIZ — ... (hangi kontrol olduğunu yazar)
-- Yeni rol, yetki anahtarı ya da yazma işlevi eklenince bu dosyaya da satır ekleyin.
do $test$
declare
  roller text[] := array['yonetici','mudur','muhendis','operator','sef','izleyici'];
  r text; y text; tok uuid; k kullanicilar; kid bigint;
  tokenlar jsonb := '{}';
  hatalar text[] := '{}';
  sayi int := 0;
  beklenen jsonb := '{
    "assign":          ["operator"],
    "talepYonet":      ["operator"],
    "onOnay":          ["operator"],
    "close":           ["yonetici","mudur"],
    "create":          ["yonetici","mudur","muhendis"],
    "sil":             ["yonetici","mudur"],
    "tesisOner":       [],
    "stokSiparis":     ["operator"],
    "stokSiparisOnay": ["yonetici","mudur"],
    "stokKatalog":     ["yonetici","mudur"],
    "admin":           ["yonetici"]
  }';
  tesis_id bigint;
  reddedildi boolean;
  sonuc text;
begin
  select id into tesis_id from tesis order by id limit 1;

  -- 1) geçici kullanıcı + oturum (her rol için)
  foreach r in array roller loop
    insert into kullanicilar (kullanici_ad, ad, rol, sifre_ozet, aktif)
      values ('yetki.test.' || r, 'Yetki Testi ' || r, r::rol, 'x', true) returning id into kid;
    insert into oturum (kullanici_id, cihaz) values (kid, 'yetki-testi') returning token into tok;
    tokenlar := tokenlar || jsonb_build_object(r, tok::text);
  end loop;

  -- 2) rol × yetki tablosu (rol_yetkisi saf işlevdir)
  foreach r in array roller loop
    select * into k from kullanicilar where kullanici_ad = 'yetki.test.' || r;
    for y in select jsonb_object_keys(beklenen) loop
      sayi := sayi + 1;
      if rol_yetkisi(k, y) is distinct from ((beklenen -> y) ? r) then
        hatalar := hatalar || format('rol_yetkisi(%s, %s) = %s, beklenen %s', r, y, rol_yetkisi(k, y), ((beklenen -> y) ? r));
      end if;
    end loop;
  end loop;

  -- kişiye özel istisna: verilir / alınır; yönetici yalnız açıkça verilirse
  update kullanicilar set yetki_istisna = '{"tesisOner": true}' where kullanici_ad = 'yetki.test.sef';
  select * into k from kullanicilar where kullanici_ad = 'yetki.test.sef';
  sayi := sayi + 1; if not rol_yetkisi(k, 'tesisOner') then hatalar := hatalar || 'istisna: sef tesisOner verilemedi'; end if;
  update kullanicilar set yetki_istisna = '{"assign": false}' where kullanici_ad = 'yetki.test.operator';
  select * into k from kullanicilar where kullanici_ad = 'yetki.test.operator';
  sayi := sayi + 1; if rol_yetkisi(k, 'assign') then hatalar := hatalar || 'istisna: operatör assign geri alınamadı'; end if;
  update kullanicilar set yetki_istisna = '{"assign": true}' where kullanici_ad = 'yetki.test.yonetici';
  select * into k from kullanicilar where kullanici_ad = 'yetki.test.yonetici';
  sayi := sayi + 1; if not rol_yetkisi(k, 'assign') then hatalar := hatalar || 'istisna: yönetici assign verilemedi'; end if;
  update kullanicilar set yetki_istisna = '{"admin": true, "sil": true}' where kullanici_ad = 'yetki.test.mudur';
  select * into k from kullanicilar where kullanici_ad = 'yetki.test.mudur';
  sayi := sayi + 1; if rol_yetkisi(k, 'admin') then hatalar := hatalar || 'istisna: admin anahtarı istisnayla verilememeli'; end if;
  update kullanicilar set yetki_istisna = '{}' where kullanici_ad like 'yetki.test.%';

  -- 3) yasak çağrılar: hata fırlatması beklenir (fırlatmazsa yetki açığı)
  for r, sonuc in
    select * from (values
      ('izleyici', 'veri_yaz'), ('izleyici', 'tesis_sil'), ('izleyici', 'tesis_kalici_sil'), ('izleyici', 'ambar_hareket'),
      ('izleyici', 'cop_temizle'), ('izleyici', 'kullanici_ekle'), ('izleyici', 'yetki_kaydet'),
      ('sef', 'tesis_sil'), ('sef', 'tesis_kalici_sil'), ('sef', 'cop_temizle'), ('sef', 'kullanici_ekle'), ('sef', 'yetki_kaydet'),
      ('operator', 'tesis_sil'), ('operator', 'tesis_kalici_sil'), ('operator', 'cop_temizle'), ('operator', 'kullanici_ekle'), ('operator', 'yetki_kaydet'),
      ('muhendis', 'cop_temizle'), ('muhendis', 'kullanici_ekle'), ('muhendis', 'yetki_kaydet'), ('muhendis', 'tesis_kalici_sil')
    ) v(rol, islev)
  loop
    tok := (tokenlar ->> r)::uuid; sayi := sayi + 1; reddedildi := false;
    begin
      case sonuc
        when 'veri_yaz' then perform veri_yaz(tok, 'yetki-testi', '{}'::jsonb);
        when 'tesis_sil' then perform tesis_sil(tok, tesis_id);
        when 'tesis_kalici_sil' then perform tesis_kalici_sil(tok, tesis_id);
        when 'ambar_hareket' then perform ambar_hareket(tok, '[]'::jsonb);
        -- cop_temizle yetkisizse hata fırlatmaz, boş döner (güvenli): satır dönmesi = yetki var
        when 'cop_temizle' then if not exists (select 1 from cop_temizle(tok)) then raise exception 'reddedildi'; end if;
        when 'kullanici_ekle' then perform kullanici_ekle(tok, 'Test', 'yetki.test.yeni', 'sef'::rol, 'Deneme-4827', null, null, null);
        when 'yetki_kaydet' then perform yetki_kaydet(tok, 1, '{}'::jsonb, '{}'::jsonb);
      end case;
    exception when others then reddedildi := true;
    end;
    if not reddedildi then hatalar := hatalar || format('%s için %s reddedilmedi', r, sonuc); end if;
  end loop;

  -- 4) geçersiz / süresi dolmuş jeton: her okuma ve yazma reddedilmeli
  foreach sonuc in array array['tesis_listesi', 'kullanici_listesi', 'denetim_listesi', 'cop_listesi'] loop
    sayi := sayi + 1; reddedildi := false;
    begin
      case sonuc
        when 'tesis_listesi' then perform tesis_listesi('00000000-0000-0000-0000-000000000000'::uuid);
        when 'kullanici_listesi' then perform kullanici_listesi('00000000-0000-0000-0000-000000000000'::uuid);
        when 'denetim_listesi' then perform denetim_listesi('00000000-0000-0000-0000-000000000000'::uuid, 10);
        when 'cop_listesi' then perform cop_listesi('00000000-0000-0000-0000-000000000000'::uuid);
      end case;
    exception when others then reddedildi := true;
    end;
    if not reddedildi then hatalar := hatalar || format('geçersiz jetonla %s çalıştı', sonuc); end if;
  end loop;
  update oturum set son_kullanim = now() - interval '91 days' where token = (tokenlar ->> 'sef')::uuid;
  sayi := sayi + 1; reddedildi := false;
  begin perform tesis_listesi((tokenlar ->> 'sef')::uuid); exception when others then reddedildi := true; end;
  if not reddedildi then hatalar := hatalar || '90 günden eski oturum hâlâ geçerli'; end if;

  -- 5) doğrudan tablo erişimi kapalı (anonim ve Supabase Auth kullanıcısı)
  foreach sonuc in array array['anon', 'authenticated'] loop
    sayi := sayi + 1; reddedildi := false;
    begin
      execute format('set local role %I', sonuc);
      perform 1 from tesis limit 1;
    exception when insufficient_privilege then reddedildi := true;
    end;
    reset role;
    if not reddedildi then hatalar := hatalar || format('%s rolü tesis tablosunu doğrudan okuyabiliyor', sonuc); end if;
  end loop;

  if array_length(hatalar, 1) > 0 then
    raise exception 'YETKI-TESTI BASARISIZ — % hata (% kontrolden): %', array_length(hatalar, 1), sayi, array_to_string(hatalar, ' | ');
  end if;
  raise exception 'YETKI-TESTI TAMAM — % kontrol geçti', sayi;
end
$test$;
