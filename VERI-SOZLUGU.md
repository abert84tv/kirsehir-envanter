# Kırşehir Envanter — Veri Sözlüğü

Veritabanı: Supabase (PostgreSQL). Bütün tablolarda satır güvenliği (RLS) açık ve doğrudan erişim kapalıdır;
programlar yalnızca `SECURITY DEFINER` işlevlerle (RPC) okuyup yazar. Her işlev oturum anahtarını (`p_token`)
doğrular ve rolü denetler. Yalnızca `basvuru_ekle`, `basvuru_durum` ve `telemetri_yaz` oturumsuz çağrılabilir.
Roller: `yonetici`, `mudur`, `muhendis`, `sef`, `personel`.

Zaman alanları UTC `timestamptz` olarak saklanır, programda Türkiye saatiyle gösterilir.

## 1. Tesis envanteri

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `tesis` | Kuyu, depo, AG hattı, GES kaydı. Silme "çöp kutusu"dur (`silindi` dolu). | `kod` (KS-KUYU-0001), `tur`, `durum` (aktif/pasif), `ilce`, `koy`, `lat`/`lon`, `konum_yaklasik`, `yapim_yili`, `barkod`, `veri` (jsonb: teknik alanlar `d` ve fotoğraf sayısı), `surum` (eşzamanlı düzenleme denetimi) |
| `hat` | Tesise bağlı boru/kablo güzergâhı (çizim). | `tesis_id`, `tur` (isale, sebeke…), `noktalar` (jsonb koordinat dizisi) |
| `foto` | Tesis fotoğrafı, arıza kanıtı ve sesli not. Dosya Supabase Storage'dadır. | `tesis_id`, `ariza_id` (doluysa arıza kanıtı), `tur` (foto/ses), `adres` (depo yolu), `cekildi`, `silindi` |
| `saha_notu` | Tesis hakkında serbest saha notu. | `tesis_id`, `metin`, `yazan_k`, `yazildi` |
| `deneme` | Kuyu pompa deneme ölçümü. | `statik`, `dinamik`, `debi`, `ozgul_debi`, `sure_saat` |
| `gecmis` | Tesis değişiklik geçmişi (kim, ne, ne zaman). | `tesis_id`, `ne`, `detay`, `kim_ad`, `cevrimdisi` |
| `yerlesim_ek` | Elle eklenen köy/yerleşim noktası. | `ilce`, `ad`, `lat`, `lon` |
| `alt_sistem_kategori` | Alt sistem → ana kategori eşlemesi (rapor için). | `alt_sistem`, `kategori` |

## 2. Arıza ve iş emri

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `ariza` | Arıza kaydı; tesisli ya da tesissiz (şebeke/köy). | `no` (ARZ-yıl-sıra), `tesis_id` (boş olabilir), `grup`, `tur`, `oncelik`, `durum`, `ekip`, `malzeme` (jsonb), `maliyet`, `koy`/`ilce`, `lat`/`lon` (arıza noktası), `konum_dogruluk`, `acildi`, `kapandi` |
| `is_emirleri` | Arızadan açılan iş emri; ekip ve araç ataması, kapanış. | `no` (IEM-yıl-sıra), `ariza_id`, `tesis_id`, `tur`, `alt_sistem`, `ekip`, `araclar` (jsonb), `durum`, `planlanan_malzeme`, `kullanilan_malzeme`, `toplam_saat`, `surum` |
| `numara_sayaci` | Yıllık sıra numarası üretimi (ARZ, IEM, TLP). | `tur`, `yil`, `deger` |
| `talepler` | Eski talep tablosu (artık talepler `kurum_veri` içinde tutulur). | — |

Arıza durumları: `acik`, `atandi`, `sahada`, `cozuldu`, `bilgi`, `bekleme`, `yonlendirildi`, `kontrol`, `yeniden`, `iptal`.

## 3. Ambar, ekip, araç

| Tablo | Amaç |
|---|---|
| `ambar_stok` | Ambar × malzeme mevcudu (satır kilidiyle güncellenir). |
| `ambar_zimmet` | Ekip × malzeme zimmeti. |
| `ambar_hareket` | Giriş, çıkış, zimmet, iade, sarf, hurda hareketleri (silinmez). |
| `ekipler`, `araclar`, `arac_hareket` | Ekip / araç kayıtları ve araç defteri (ana kaynak `kurum_veri`). |
| `kurum_veri` | Sürümlü JSON depo. `anahtar`: `ekip`, `personel`, `nobet`, `ambar`, `arac`, `talep`, `muhtar`, `malzeme`, `siparis`, `modul`. Yazma `surum` karşılaştırmasıyla yapılır; çakışırsa birleştirilir. |

## 4. Kullanıcı ve güvenlik

| Tablo | Amaç |
|---|---|
| `kullanicilar` | Hesaplar. Şifre yalnızca özet olarak (`sifre_ozet`, bcrypt). `rol`, `bolge` (ilçe yetkisi), `sayfa_yetki`, `yetki_istisna`. |
| `oturum` | Oturum anahtarı (`token`); 90 gün kullanılmazsa geçersiz olur. |
| `denetim` | Silinemeyen işlem izi: kim, ne, ne zaman, çevrimdışı mı. |
| `profil`, `tercih` | Eski kimlik doğrulama artığı ve kullanıcı görünüm tercihi. |
| `entegrasyon` | Dış servis anahtarları (yalnız Edge Function okur). |

## 5. Telemetri

| Tablo | Amaç |
|---|---|
| `telemetri_cihaz` | Sensör/PLC/veri toplayıcı. `kod`, `tesis_id`, `anahtar_ozet` (SHA-256), `beklenen_dk`, `son_gorulme`. |
| `telemetri_olcum` | Ham ölçümler (`kanal`, `deger`, `birim`, `zaman`). 90 günden eskisi silinir. |
| `telemetri_son` | Her cihaz × kanal için son değer. |
| `telemetri_kural` | Eşik kuralı (`kanal`, `op` `<` `>` `<=` `>=`, `esik`, `onem`). |
| `telemetri_alarm` | Kuraldan doğan alarm; `kapandi` boşsa açık. `onay_k`, `ariza_id`. |

Cihaz ucu: `POST /rest/v1/rpc/telemetri_yaz` — gövde: `{"p_kod","p_anahtar","p_olcumler":[{"kanal","deger","birim","zaman"?}]}`.

## 6. Vatandaş / muhtar başvurusu

| Tablo | Amaç |
|---|---|
| `vatandas_basvuru` | `/bildirim` sayfasından gelen başvuru. `takip` (BSV-XXXXXX), `ad`, `tel`, `sifat`, `ilce`, `koy`, `konu`, `aciklama`, `lat`/`lon`, `kvkk_onay`, `durum`, `sonuc`, `talep_no`, `ip_ozet` (IP'nin geri döndürülemez özeti). |
| `basvuru_engel` | Spam kara listesi (IP özeti ve telefon). |

## 7. Cihazdaki (çevrimdışı) veri

Tarayıcıda: `localStorage` (`ks-*` anahtarları: bekleyen arıza, ambar/modül kuyruğu, kullanıcı tercihi) ve
IndexedDB `ks-cihaz` (`anlik`: sunucudan son alınan veri, `medya`: gönderilmeyi bekleyen fotoğraf/ses).
Servis çalışanı `ks-*-kabuk` (uygulama dosyaları) ve `ks-harita-karo` (harita karoları, en çok 900) önbelleklerini tutar.
