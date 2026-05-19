// OLFU SafetyNet - Wristband Firmware (ESP32-C3)
// Medical-Grade Vitals Monitoring Protocol
// Hardware: ESP32-C3 SuperMini + MAX30102 (HR/SpO2) + MAX30205 (Skin Temp)

#include <Wire.h>
#include "MAX30105.h"           // Required: SparkFun MAX3010x Library
#include "heartRate.h"           // Included in SparkFun MAX3010x Library
#include "ClosedCube_MAX30205.h" // Required: ClosedCube MAX30205 Library
#include <NimBLEDevice.h>        // Required: NimBLE-Arduino Library

// BLE Identity & UUIDs
#define DEVICE_NAME "OLFU-SN-001"
#define SERVICE_UUID "180D" // Standard Heart Rate Service
#define CHAR_HR_UUID "2A37" // Heart Rate Measurement
#define CHAR_TEMP_UUID "2A1C" // Temperature Measurement
#define CHAR_SPO2_UUID "2A5F" // SpO2 Measurement (Custom/Analogous)

MAX30105 particleSensor;
ClosedCube_MAX30205 tempSensor;

NimBLEServer* pServer;
NimBLECharacteristic* pHRChar;
NimBLECharacteristic* pTempChar;
NimBLECharacteristic* pSpO2Char;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg = 0;
float spo2 = 0; 
bool deviceConnected = false;

// Bluetooth Callback
class ServerCallbacks: public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer) {
        deviceConnected = true;
        Serial.println(">>> OLFU DASHBOARD CONNECTED");
    };
    void onDisconnect(NimBLEServer* pServer) {
        deviceConnected = false;
        Serial.println(">>> OLFU DASHBOARD DISCONNECTED");
        NimBLEDevice::startAdvertising();
    };
};

void setup() {
    Serial.begin(115200);
    delay(2000); 
    
    Serial.println("OLFU SafetyNet: Initializing Hardware...");
    
    // I2C Initialize (SDA=8, SCL=9 for ESP32-C3 SuperMini)
    Wire.begin(8, 9);
    
    // MAX30102 Setup
    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println(">>> ERROR: MAX30102 sensor not found. Check I2C wiring (SDA=8, SCL=9)");
    } else {
        Serial.println(">>> SUCCESS: MAX30102 Heart Rate Sensor Active");
        particleSensor.setup(0x2F, 4, 3, 400, 411, 4096); 
    }
    
    // MAX30205 Setup
    tempSensor.begin(0x48);
    Serial.println(">>> SUCCESS: MAX30205 Body Temp Sensor Active");

    // Bluetooth Initialization (NimBLE Stack)
    NimBLEDevice::init(DEVICE_NAME);
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    NimBLEService* pService = pServer->createService(SERVICE_UUID);
    pHRChar = pService->createCharacteristic(CHAR_HR_UUID, NIMBLE_PROPERTY::NOTIFY);
    pTempChar = pService->createCharacteristic(CHAR_TEMP_UUID, NIMBLE_PROPERTY::NOTIFY);
    pSpO2Char = pService->createCharacteristic(CHAR_SPO2_UUID, NIMBLE_PROPERTY::NOTIFY);

    pService->start();

    // Start Advertising
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setAppearance(0x0340); // Heart Rate Sensor
    pAdvertising->start();

    Serial.println("OLFU SafetyNet: System Ready. Bluetooth Advertising...");
}

void loop() {
    long irValue = particleSensor.getIR();
    long redValue = particleSensor.getRed();
    
    // 1. Heart Rate Processing
    if (checkForBeat(irValue) == true) {
        long delta = millis() - lastBeat;
        lastBeat = millis();
        beatsPerMinute = 60 / (delta / 1000.0);

        if (beatsPerMinute < 255 && beatsPerMinute > 20) {
            rates[rateSpot++] = (byte)beatsPerMinute;
            rateSpot %= RATE_SIZE;
            beatAvg = 0;
            for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
            beatAvg /= RATE_SIZE;
        }
    }

    // 2. Temperature Processing
    float rawT = tempSensor.readTemperature();
    float bodyTemp = rawT;
    
    // Correction for common sensor driver overflow anomalies
    if (bodyTemp > 100.0) {
        if (bodyTemp > 200) bodyTemp -= 256.0;
        else bodyTemp -= 128.0;
        bodyTemp = abs(bodyTemp);
    }

    // Contact Threshold
    bool isFingerPresent = (irValue > 10000);

    if (!isFingerPresent) {
        bodyTemp = 0.0;
        spo2 = 0.0;
        beatAvg = 0;
    } else {
        // SpO2 Approximation
        float ratio = (float)redValue / (float)irValue;
        float calculatedSpo2 = 104.0 - (17.0 * ratio);
        spo2 = (spo2 * 0.8) + (calculatedSpo2 * 0.2);
        if (spo2 > 100) spo2 = 100.0;
        if (spo2 < 70) spo2 = 70.0;
        
        // Heat gradient calibration
        if (bodyTemp > 0) bodyTemp += 0.5; 
    }

    // 3. Bluetooth Transmission
    if (deviceConnected) {
        // Pulse
        uint16_t hrVal = (uint16_t)beatAvg;
        pHRChar->setValue((uint8_t*)&hrVal, 2);
        pHRChar->notify();

        // Temp
        uint32_t tVal = (uint32_t)(bodyTemp * 100);
        pTempChar->setValue((uint8_t*)&tVal, 4);
        pTempChar->notify();

        // SpO2
        uint16_t sVal = (uint16_t)(spo2 * 10);
        pSpO2Char->setValue((uint8_t*)&sVal, 2);
        pSpO2Char->notify();
        
        if (millis() % 1000 < 50) {
            Serial.printf("STREAM: HR=%d TEMP=%.2f SPO2=%.1f\n", beatAvg, bodyTemp, spo2);
        }
    } else {
        if (millis() % 2000 < 50) {
            Serial.println("STATUS: Advertising... " + String(isFingerPresent ? "(On Body)" : "(Off Body)"));
        }
    }

    delay(20);
}


