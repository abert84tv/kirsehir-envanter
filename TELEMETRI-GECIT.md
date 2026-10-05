# Telemetri geçidi — MQTT / Modbus / PLC bağlantısı

Program yalnızca HTTPS ile ölçüm kabul eder. MQTT veya Modbus konuşan cihazlar için sahada küçük bir
"geçit" (Raspberry Pi, endüstriyel mini PC, Node-RED) çalıştırılır; cihazı okur, HTTPS ile gönderir.
İnternet kesilirse geçit ölçümleri biriktirip `zaman` alanıyla sonradan gönderebilir (30 güne kadar).

Ayarlar: Ekip, Araç, Ambar > Telemetri > Cihaz ekle ile cihaz tanımlanır; ekranda **adres**, **cihaz kodu**
ve **anahtar** gösterilir (anahtar yalnızca o anda).

## Uç nokta

```
POST https://<proje>.supabase.co/rest/v1/rpc/telemetri_yaz
apikey: <yayın anahtarı>
Content-Type: application/json

{"p_kod":"KUYU-12-PLC","p_anahtar":"<cihaz anahtarı>",
 "p_olcumler":[{"kanal":"debi","deger":12.4,"birim":"l/s"},{"kanal":"seviye","deger":38.2,"birim":"m"}]}
```

## Modbus TCP/RTU → HTTPS (Python)

```python
import time, json, requests
from pymodbus.client import ModbusTcpClient
URL = "https://<proje>.supabase.co/rest/v1/rpc/telemetri_yaz"
HDR = {"apikey": "<yayın anahtarı>", "Content-Type": "application/json"}
KOD, ANAHTAR = "KUYU-12-PLC", "<cihaz anahtarı>"
plc = ModbusTcpClient("192.168.1.50", port=502)
kuyruk = []          # internet yokken biriken ölçümler
while True:
    plc.connect()
    r = plc.read_holding_registers(0, 4, slave=1)
    if not r.isError():
        t = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        kuyruk += [{"kanal": "debi",   "deger": r.registers[0] / 10, "birim": "l/s", "zaman": t},
                   {"kanal": "seviye", "deger": r.registers[1] / 10, "birim": "m",   "zaman": t}]
    try:
        requests.post(URL, headers=HDR, timeout=15,
                      data=json.dumps({"p_kod": KOD, "p_anahtar": ANAHTAR, "p_olcumler": kuyruk[:500]})).raise_for_status()
        kuyruk = kuyruk[500:]
    except Exception:
        pass         # bir sonraki turda yeniden denenir
    time.sleep(300)  # 5 dakikada bir
```

## MQTT → HTTPS (Node-RED)

`mqtt in` düğümü (konu: `kuyu/12/#`) → `function` düğümü:

```js
msg.headers = {"apikey": "<yayın anahtarı>", "Content-Type": "application/json"};
msg.payload = {p_kod: "KUYU-12-PLC", p_anahtar: "<cihaz anahtarı>",
  p_olcumler: [{kanal: msg.topic.split("/").pop(), deger: Number(msg.payload)}]};
return msg;
```

→ `http request` düğümü (POST, adres yukarıdaki uç nokta, "return: a parsed JSON object").

## Alarm kuralı

Telemetri ekranında Kurallar > Kural ekle: örn. `seviye < 12` ya da `basinc > 8`. Sınır aşılınca alarm açılır,
değer normale dönünce kendiliğinden kapanır; alarmdan "Arızaya çevir" ile arıza kaydı açılır.
