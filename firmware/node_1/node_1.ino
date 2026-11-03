#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <esp_system.h>
#include <esp_timer.h>
#include <time.h>
#include "secrets.h"

const char* NODE_ID = "node_1";

const uint8_t DMS_PIN = 5;
const uint8_t LED_PIN = 2;
const uint8_t PH_PIN = 34;
const uint8_t SOIL_PIN = 35;

const int SOIL_DRY_ADC_MAX = 2576;
const int SOIL_WET_ADC_CUTOFF = 650;
const float SOIL_D3 = -0.1368201823f;
const float SOIL_D2 = 0.7017281581f;
const float SOIL_D1 = -1.2209490615f;
const float SOIL_D0 = 0.8646193519f;
const char* SOIL_CALIBRATION_ID = "vwc_cubic_l0_13_provisional";

const uint16_t MAX_RECORDS = 512;
const uint32_t ACK_RETRY_MS = 30000;
const uint32_t WIFI_RETRY_MS = 30000;
const uint32_t MQTT_RETRY_MS = 15000;

enum SensorState : uint8_t {
  IDLE,
  PH_SETTLE,
  PH_SAMPLING,
  RECOVERY,
  SOIL_SETTLE,
  SOIL_SAMPLING
};

WiFiClientSecure tls;
PubSubClient mqtt(tls);

String telemetryTopic;
String configTopic;
String ackTopic;
String bootId;

bool fsReady = false;
bool storageMountFailed = false;
bool firstRead = true;
bool sentOnce = false;
bool ackReceived = false;
bool wifiWasConnected = false;
bool mqttTried = false;

uint32_t intervalMs = 15UL * 60UL * 1000UL;
uint32_t lastReadMs = 0;
uint32_t lastWifiTry = 0;
uint32_t lastMqttTry = 0;
uint32_t lastSendMs = 0;
uint32_t nextSequence = 1;
uint16_t queued = 0;

String pendingPath;
String pendingPayload;
String pendingId;
String serialCommand;

SensorState sensorState = IDLE;
uint8_t sampleIndex = 0;
uint32_t phaseMs = 0;
uint32_t sampleMs = 0;
long adcSum = 0;

int adcPH = 0;
float phValue = 7.0f;
float lastPH = 7.0f;
bool phValid = false;

float soilVWC = 0.0f;
float soilVWCPercent = 0.0f;
bool soilVwcAvailable = false;
bool soilADCClamped = false;
int soilADCForCalculation = 0;
const char* soilStatus = "not_read";

uint64_t measuredUptime = 0;
String measuredAt;

void convertSoilToVWC(int adc) {
  soilVwcAvailable = false;
  soilADCClamped = false;
  soilVWC = 0.0f;
  soilVWCPercent = 0.0f;
  soilADCForCalculation = adc;
  soilStatus = "not_calculated";

  if (adc <= 0 || adc >= 4095) {
    soilStatus = "adc_rail_or_invalid";
    return;
  }
  if (adc <= SOIL_WET_ADC_CUTOFF) {
    soilStatus = "wet_out_of_range";
    return;
  }
  if (adc > SOIL_DRY_ADC_MAX) {
    soilADCForCalculation = SOIL_DRY_ADC_MAX;
    soilADCClamped = true;
    soilStatus = "dry_clamped";
  } else {
    soilStatus = "within_model_range";
  }

  float x = (float)soilADCForCalculation / 1000.0f;
  float theta = ((SOIL_D3 * x + SOIL_D2) * x + SOIL_D1) * x + SOIL_D0;
  if (!(theta >= 0.0f && theta <= 1.0f)) {
    soilStatus = "calculation_invalid";
    return;
  }

  soilVWC = theta;
  soilVWCPercent = theta * 100.0f;
  soilVwcAvailable = true;
}

String queuePath(uint32_t sequence) {
  char path[32];
  snprintf(path, sizeof(path), "/q/%010lu.json", (unsigned long)sequence);
  return String(path);
}

bool parseSequence(String path, uint32_t& sequence) {
  String name = path.substring(path.lastIndexOf('/') + 1);
  if (name.length() != 15 || !name.endsWith(".json")) return false;
  for (int i = 0; i < 10; i++) {
    if (name[i] < '0' || name[i] > '9') return false;
  }
  unsigned long long n = strtoull(name.c_str(), nullptr, 10);
  if (n == 0 || n >= UINT32_MAX) return false;
  sequence = (uint32_t)n;
  return true;
}

String oldestPath() {
  File dir = LittleFS.open("/q");
  if (!dir || !dir.isDirectory()) return "";

  uint32_t minimum = UINT32_MAX;
  File file = dir.openNextFile();
  while (file) {
    uint32_t n;
    if (!file.isDirectory() && parseSequence(String(file.name()), n) && n < minimum) {
      minimum = n;
    }
    file.close();
    file = dir.openNextFile();
  }
  dir.close();

  return minimum == UINT32_MAX ? String("") : queuePath(minimum);
}

bool mountStorage() {
  if (!LittleFS.begin(false)) return false;
  if (!LittleFS.exists("/q") && !LittleFS.mkdir("/q")) return false;
  if (LittleFS.exists("/record.tmp") && !LittleFS.remove("/record.tmp")) return false;

  queued = 0;
  nextSequence = 1;

  File dir = LittleFS.open("/q");
  if (!dir || !dir.isDirectory()) return false;

  File file = dir.openNextFile();
  while (file) {
    uint32_t n;
    if (!file.isDirectory() && parseSequence(String(file.name()), n)) {
      queued++;
      if (n >= nextSequence) nextSequence = n + 1;
    }
    file.close();
    file = dir.openNextFile();
  }
  dir.close();

  Serial.printf("Storage mounted: %u pending, %u/%u bytes used\n", queued,
                (unsigned)LittleFS.usedBytes(), (unsigned)LittleFS.totalBytes());
  return true;
}

String utcNow() {
  time_t now = time(nullptr);
  if (now < 1704067200) return "";

  struct tm utc;
  gmtime_r(&now, &utc);
  char out[24];
  strftime(out, sizeof(out), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(out);
}

bool saveReading(int adcSoil) {
  if (!fsReady || queued >= MAX_RECORDS || nextSequence == UINT32_MAX ||
      LittleFS.totalBytes() - LittleFS.usedBytes() < 16384) {
    Serial.println("ERROR: storage unavailable/full; NEW reading NOT saved.");
    return false;
  }

  String id = String(NODE_ID) + "-" + bootId + "-" + String(nextSequence);

  JsonDocument doc;
  doc["node_id"] = NODE_ID;
  doc["record_id"] = id;
  doc["boot_id"] = bootId;
  doc["uptime_ms"] = measuredUptime;
  if (measuredAt.length()) {
    doc["measured_at"] = measuredAt;
  } else {
    doc["measured_at"] = nullptr;
  }
  doc["time_valid"] = measuredAt.length() > 0;
  doc["ph"] = roundf(phValue * 10.0f) / 10.0f;
  doc["ph_valid"] = phValid;
  doc["ph_used_previous"] = !phValid;
  if (soilVwcAvailable) {
    doc["soil_vwc"] = roundf(soilVWC * 10000.0f) / 10000.0f;
    doc["soil_vwc_pct"] = roundf(soilVWCPercent * 100.0f) / 100.0f;
    doc["adc_soil_used"] = soilADCForCalculation;
  } else {
    doc["soil_vwc"] = nullptr;
    doc["soil_vwc_pct"] = nullptr;
    doc["adc_soil_used"] = nullptr;
  }
  doc["soil_status"] = soilStatus;
  doc["soil_adc_clamped"] = soilADCClamped;
  doc["soil_calibration_id"] = SOIL_CALIBRATION_ID;
  doc["adc_ph"] = adcPH;
  doc["adc_soil"] = adcSoil;
  doc["reading_interval_min"] = intervalMs / 60000UL;

  if (doc.overflowed()) {
    Serial.println("ERROR: JSON allocation failed; reading NOT saved.");
    return false;
  }

  String payload;
  size_t expected = measureJson(doc);
  if (serializeJson(doc, payload) != expected || payload.length() != expected) {
    Serial.println("ERROR: incomplete JSON; reading NOT saved.");
    return false;
  }

  File file = LittleFS.open("/record.tmp", "w");
  if (!file) {
    Serial.println("ERROR: cannot open temp file; reading NOT saved.");
    return false;
  }
  size_t written = file.print(payload);
  file.flush();
  file.close();

  File check = LittleFS.open("/record.tmp", "r");
  bool ok = check && written == payload.length() && check.readString() == payload;
  check.close();

  String target = queuePath(nextSequence);
  if (!ok || LittleFS.exists(target) || !LittleFS.rename("/record.tmp", target)) {
    Serial.println("ERROR: write/commit failed; reading NOT saved.");
    return false;
  }

  nextSequence++;
  queued++;
  Serial.printf("SAVED (%u pending): ", queued);
  Serial.println(payload);
  return true;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) == ackTopic) {
    if (sentOnce && length == pendingId.length() &&
        memcmp(payload, pendingId.c_str(), length) == 0) {
      ackReceived = true;
    }
    return;
  }
  if (String(topic) != configTopic) return;

  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  if (!doc["reading_interval_min"].is<int>()) return;

  int minutes = doc["reading_interval_min"].as<int>();
  if (minutes < 1 || minutes > 60) {
    Serial.println("Invalid interval: allowed 1-60 min.");
    return;
  }

  uint32_t updated = (uint32_t)minutes * 60000UL;
  if (updated != intervalMs) {
    intervalMs = updated;
    Serial.printf("Interval updated: %d minutes\n", minutes);
  }
}

void serviceNetwork() {
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiWasConnected) {
      tls.stop();
      wifiWasConnected = false;
    }
    if (sensorState == IDLE && millis() - lastWifiTry >= WIFI_RETRY_MS) {
      lastWifiTry = millis();
      WiFi.reconnect();
    }
    return;
  }

  if (!wifiWasConnected) {
    wifiWasConnected = true;
    mqttTried = false;
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    Serial.println("WiFi connected; NTP requested.");
  }

  if (!mqtt.connected() && sensorState == IDLE &&
      (!mqttTried || millis() - lastMqttTry >= MQTT_RETRY_MS)) {
    mqttTried = true;
    lastMqttTry = millis();

    String clientId = String("ESP32_") + NODE_ID + "_" + bootId;
    bool connected = strlen(MQTT_USER) > 0
                         ? mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)
                         : mqtt.connect(clientId.c_str());

    if (connected) {
      bool ackSubscribed = mqtt.subscribe(ackTopic.c_str(), 1);
      bool configSubscribed = mqtt.subscribe(configTopic.c_str(), 1);
      if (!ackSubscribed || !configSubscribed) {
        mqtt.disconnect();
        Serial.println("Subscription send failed; retry later.");
      } else {
        Serial.println("MQTT connected; config + ACK subscriptions requested.");
      }
    } else {
      Serial.printf("MQTT failed: %d; sensors continue.\n", mqtt.state());
    }
  }

  if (mqtt.connected()) mqtt.loop();
}

void serviceQueue() {
  if (!fsReady) return;

  if (ackReceived && pendingPath.length()) {
    if (!LittleFS.remove(pendingPath)) {
      static uint32_t lastError = 0;
      if (millis() - lastError > 5000) {
        lastError = millis();
        Serial.println("ERROR: cannot delete ACKed record.");
      }
      return;
    }
    if (queued) queued--;
    Serial.print("ACKED: ");
    Serial.println(pendingId);
    pendingPath = "";
    pendingId = "";
    pendingPayload = "";
    ackReceived = false;
    sentOnce = false;
  }

  if (!mqtt.connected() || WiFi.status() != WL_CONNECTED || queued == 0) return;

  if (!pendingPath.length()) {
    pendingPath = oldestPath();
    if (!pendingPath.length()) {
      Serial.println("ERROR: queue index mismatch.");
      return;
    }

    File file = LittleFS.open(pendingPath, "r");
    pendingPayload = file ? file.readString() : String("");
    file.close();

    JsonDocument doc;
    if (deserializeJson(doc, pendingPayload) || !doc["record_id"].is<const char*>()) {
      Serial.println("ERROR: corrupt queue record; queue paused. Inspect filesystem.");
      fsReady = false;
      return;
    }
    pendingId = doc["record_id"].as<String>();
  }

  if (sentOnce && millis() - lastSendMs < ACK_RETRY_MS) return;

  if (mqtt.publish(telemetryTopic.c_str(), pendingPayload.c_str(), false)) {
    sentOnce = true;
    lastSendMs = millis();
    Serial.print("SENT; waiting backend ACK: ");
    Serial.println(pendingId);
  } else {
    Serial.println("Publish failed; record remains stored.");
    mqtt.disconnect();
    mqttTried = true;
    lastMqttTry = millis();
  }
}

void serviceSensors() {
  uint32_t now = millis();

  switch (sensorState) {
    case IDLE:
      if (!firstRead && now - lastReadMs < intervalMs) return;
      firstRead = false;
      lastReadMs = now;
      analogReadResolution(10);
      digitalWrite(DMS_PIN, LOW);
      digitalWrite(LED_PIN, HIGH);
      sensorState = PH_SETTLE;
      phaseMs = now;
      Serial.println("DMS active: stabilizing 10 seconds...");
      break;

    case PH_SETTLE:
      if (now - phaseMs < 10000) return;
      measuredAt = utcNow();
      measuredUptime = (uint64_t)(esp_timer_get_time() / 1000);
      adcSum = 0;
      sampleIndex = 0;
      sampleMs = now;
      sensorState = PH_SAMPLING;
      break;

    case PH_SAMPLING:
      if (now - sampleMs < 20) return;
      sampleMs = now;
      adcSum += analogRead(PH_PIN);
      if (++sampleIndex < 15) return;

      adcPH = adcSum / 15;
      {
        float raw = -0.0233f * (float)adcPH + 12.698f;
        phValid = raw >= 3.0f && raw <= 10.0f;
        if (phValid) {
          lastPH = raw;
        } else {
          Serial.println("WARNING: pH out of range; previous/default value flagged.");
        }
      }
      phValue = lastPH;
      digitalWrite(DMS_PIN, HIGH);
      digitalWrite(LED_PIN, LOW);
      phaseMs = now;
      sensorState = RECOVERY;
      break;

    case RECOVERY:
      if (now - phaseMs < 3000) return;
      analogReadResolution(12);
      phaseMs = now;
      sensorState = SOIL_SETTLE;
      break;

    case SOIL_SETTLE:
      if (now - phaseMs < 100) return;
      adcSum = 0;
      sampleIndex = 0;
      sampleMs = now;
      sensorState = SOIL_SAMPLING;
      break;

    case SOIL_SAMPLING:
      if (now - sampleMs < 20) return;
      sampleMs = now;
      adcSum += analogRead(SOIL_PIN);
      if (++sampleIndex < 20) return;

      int soil = adcSum / 20;
      convertSoilToVWC(soil);

      Serial.printf("ADC pH=%d | pH=%.1f | ADC soil=%d", adcPH, phValue, soil);
      if (soilVwcAvailable) {
        Serial.printf(" | VWC=%.4f m3/m3 | VWC Percent=%.2f %%", soilVWC, soilVWCPercent);
      } else {
        Serial.print(" | VWC=N/A");
      }
      Serial.printf(" | Soil status=%s\n", soilStatus);

      saveReading(soil);
      sensorState = IDLE;
      break;
  }
}

void serviceSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      serialCommand.trim();
      if (serialCommand == "FORMAT LITTLEFS" && storageMountFailed) {
        Serial.println("Explicit format requested: erasing filesystem.");
        LittleFS.end();
        if (LittleFS.format()) {
          fsReady = mountStorage();
          storageMountFailed = !fsReady;
          pendingPath = "";
          pendingId = "";
          pendingPayload = "";
          sentOnce = false;
          ackReceived = false;
        }
        Serial.println(fsReady ? "Format/mount OK." : "Format/mount FAILED; check partition scheme.");
      }
      serialCommand = "";
    } else if (serialCommand.length() < 64) {
      serialCommand += c;
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(DMS_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(DMS_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiTry = millis();

  char token[33];
  snprintf(token, sizeof(token), "%08lx%08lx%08lx%08lx",
           (unsigned long)esp_random(), (unsigned long)esp_random(),
           (unsigned long)esp_random(), (unsigned long)esp_random());
  bootId = token;

  String base = String("suburin/devices/") + NODE_ID;
  telemetryTopic = base + "/telemetry";
  configTopic = base + "/config";
  ackTopic = base + "/ack";

  fsReady = mountStorage();
  storageMountFailed = !fsReady;
  if (!fsReady) {
    Serial.println("ERROR: filesystem not mounted. Send FORMAT LITTLEFS to erase and retry.");
  }

  tls.setInsecure();
  tls.setHandshakeTimeout(5);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  if (!mqtt.setBufferSize(1536)) Serial.println("ERROR: MQTT buffer allocation failed.");
  mqtt.setKeepAlive(60);
  mqtt.setSocketTimeout(3);

  Serial.println("SUBURIN VWC: sensing continues even without WiFi/MQTT.");
  Serial.println("VWC cubic provisional; no RWC/CC conversion. Soil averaging: 20 samples.");
  Serial.print("Backend ACK topic: ");
  Serial.println(ackTopic);
}

void loop() {
  serviceSerial();
  serviceSensors();
  serviceNetwork();
  serviceQueue();
  delay(2);
}
