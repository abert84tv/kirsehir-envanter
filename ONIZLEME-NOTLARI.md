# Önizleme dalı: `iyilestirme-onizleme` (sürüm 2026.10.21-216)

Canlıya (`main`) alınmadı. Bu dal yalnız Vercel önizleme adresinde denenir; onay verilince `main`'e birleştirilir.
Önizleme canlı veritabanına bağlıdır: denerken kayıt değiştirmeyin ya da yalnız bildiğiniz kaydı değiştirin.

## Ne değişti, nerede bakılır

| # | Değişiklik | Nerede görülür | Dosya |
|---|---|---|---|
| H1 | **Açılış hızı:** 1,8 MB'lık şablon canlı sayfaya yerleşmiyor (template içinde); açılışta 7 gereksiz harita sayfası yüklenmiyor | Uygulamayı açınca; "yükleme bitti" süresi ~400 ms → ~95 ms (bu bilgisayarda) | `src/kabuk.html` |
| H3 | Telefon üst/alt çubuk ölçümü 1,5 sn'de bir yoklama yerine boyut değişince | Gözle görülmez; pil/akıcılık | `cekirdek/yontemler/baslat.js` |
| H4 | Hatlar yalnız görünen alan + çevresi için çizilir | Haritada hat olan köylerde kaydırma/yakınlaştırma; kaydırınca hatlar eksiksiz görünmeli | `harita-katman.js` |
| H5 | Sekme arka plandayken 30/60 sn yenileme durur; sekmeye dönünce hemen yenilenir | Gözle görülmez | `esitleme/yontemler/baslat.js` |
| M2 | Ayarlar: "Veri ve gizlilik" ikiye bölündü: **Veri** (5 sekme) ve **Gizlilik ve denetim** (2 sekme) | Ayarlar listesi | `src/sabitler/09-rol-yetki-menu.js` |
| M3 | Telefon alt çubuğu boş yer kalırsa Ayarlar'ı da gösterir (modüller kapalıyken: Envanter, Özet, Ayarlar, Tümü) | Telefon görünümü | `cekirdek/gorunum/kucukler-3.js` |
| M4 | Özet'te Rapor paneli açık gelir (tek dokunuş); "Rapor ▾" ile kapanır | Özet sayfası | `ozet/gorunum/kucukler-1.js`, `ozet/yontemler/rapor.js` |
| B2 | Arıza modülü kapalıyken telefon haritasında **+ Yeni tesis** düğmesi (sağ altta, konum düğmesinin üstünde) | Telefon, Harita | `harita/gorunum/kucukler-2.js`, `cekirdek/telefon/ust-alan.html` |
| B3 | "Bekleyen N" ve ağ durumu tek hapta birleşti | Üst çubuk (masaüstü ve telefon) | `cekirdek/masaustu/ust-cubuk.html`, `cekirdek/telefon/ust-alan.html` |
| V3 | Yeni tesiste aynı türde 30 m içinde kayıt varsa bir kez uyarı; ikinci Kaydet onay sayılır | Yeni tesis kaydederken | `envanter/gorunum/saveNewAsset.js`, `envanter/yontemler/diger.js` |
| V4 | Tesis geçmişine hangi alanın neden nereye değiştiği yazılır (en çok 8 alan) | Tesis kartı › Geçmiş (alan düzenledikten sonra) | `envanter/gorunum/alanDuzenle.js` |

## Zaten vardı (değişiklik yapılmadı)

- **M1** Kapalı modüllerin sayfaları menüde zaten gizleniyor (`hazirlik-menu.js`); canlıda doğrulandı: menü yalnız Envanter, Özet, Ayarlar.
- **B1** Harita düğmeleri masaüstü ve telefonda zaten aynı yerde ve aynı boyutta.
- **B2 (masaüstü)** "+ Yeni tesis" üst çubukta zaten var.
- **B4** Tesis alan formunda Kaydet çubuğu zaten ekranın altında sabit.
- **V2** "Bekleyen N" düğmesi zaten bekleyen kayıtların listesini ve nedenini açıyor.
- **H6** Excel kütüphanesi zaten gerektiğinde yükleniyor.

## Bilerek yapılmadı

- **H2 (`renderVals` parçalama):** ölçüldü: bir ekran çizimi ~9 ms, boştayken 35 sn'de 0 çizim. Riskine değmez.
- **V4 "geri al" düğmesi:** eski değerleri yapılandırılmış saklamadan güvenli geri alma yok; ayrı iş.
- **V1 (yazma yolu taraması):** sonuç aşağıda; sunucu değişikliği gerektirdiği için dokunulmadı.

## V1 bulguları (yazma yolları ve sürüm koruması)

- Tesis kaydı: sürüm denetimli (`tesis_kaydet` + `p_surum`), çakışmada güncel kayıt çekilip yeniden denenir. İyi.
- Modül verileri (ekip, ambar, talep…): sürüm denetimli + birleştirme (`veri_yaz_surumlu`). İyi. Eski sürümsüz `veri_yaz` işlevi sunucuda duruyor ama program çağırmıyor.
- **Açık kalan:** `hat_kaydet` bir tesisin bütün hatlarını toptan değiştirir ve sürüm denetimi yok. İki kişi aynı köyde aynı anda hat çizerse sonra kaydeden diğerinin çizimini siler. Çözüm sunucuda (hat_kaydet'e sürüm) yapılmalı.
- `is_emri_kaydet`, `not_ekle`: sürüm denetimi yok; iş emrinde aynı iş iki kişide açılırsa son yazan kazanır.

## Geri alma

Dal `main`'e birleştirilmediği sürece canlıya etkisi yoktur. Birleştirildikten sonra sorun çıkarsa `git revert` ile tek adımda geri alınır.
