#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>


#define SS_PIN      D8      
#define RST_PIN     D3     


#define GREEN_LED   D1
#define RED_LED     D2
#define BUZZER_PIN  D4     

MFRC522 mfrc522(SS_PIN, RST_PIN);


const char* ssid     = "FOREVER";                 
const char* password = "pen pineapple apple pen";  


// IMPORTANT: `ipconfig`
const char* serverUrl = "http://10.212.255.172:5000/api/rfid";

// --- AUTHORIZED RFID TAGS (Replace with your own) ---
byte allowedTags[][4] = {
  {0x13, 0x24, 0x3F, 0xE4},
  {0x62, 0x40, 0x47, 0x5C}
};

const int allowedTagsCount = sizeof(allowedTags) / sizeof(allowedTags[0]);

bool isAuthorized(byte* uid, byte uidSize) {
  for (int i = 0; i < allowedTagsCount; i++) {
    bool match = true;
    for (int j = 0; j < 4; j++) {
      if (uid[j] != allowedTags[i][j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

String getUIDString() {
  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
    if (i != mfrc522.uid.size - 1) uidStr += ":";
  }
  uidStr.toUpperCase();
  return uidStr;
}

void beepUnauthorized() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(RED_LED, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(RED_LED, LOW);
    delay(200);
  }
}

void sendUIDToServer(String uidStr, bool authorized) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - cannot send UID");
    return;
  }

  HTTPClient http;
  WiFiClient client;

  String url = String(serverUrl) + "?uid=" + uidStr + "&auth=" + (authorized ? "1" : "0");
  Serial.print("Sending to server: ");
  Serial.println(url);

  http.begin(client, url);

  int httpCode = http.GET();

  if (httpCode > 0) {
    Serial.printf("Server response code: %d\n", httpCode);
    String payload = http.getString();
    Serial.println("Response: " + payload);
  } else {
    Serial.printf("HTTP Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("NodeMCU IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed. Check SSID/password or router.");
  }
}

void setup() {
  Serial.begin(115200);

  connectToWiFi();

  SPI.begin();
  mfrc522.PCD_Init();

  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("System Ready — Tap RFID card.");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial())
    return;

  String uidStr = getUIDString();
  Serial.print("\nUID Detected: ");
  Serial.println(uidStr);

  bool authorized = isAuthorized(mfrc522.uid.uidByte, mfrc522.uid.size);

  if (authorized) {
    Serial.println("Authorized Access");
    digitalWrite(GREEN_LED, HIGH);
    sendUIDToServer(uidStr, true);
    delay(1000);
    digitalWrite(GREEN_LED, LOW);
  } else {
    Serial.println("Unauthorized Access");
    sendUIDToServer(uidStr, false);
    beepUnauthorized();
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(500);
}
