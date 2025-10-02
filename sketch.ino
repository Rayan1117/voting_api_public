#include <WiFi.h>
#include <SocketIoClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// =======================
// WiFi Config
// =======================
const char* ssid = "ARUN";
const char* password = "12345678";

// =======================
// Server Config
// =======================
const char* host = "10.68.158.62";
const int port = 5000;

// =======================
// Device + Auth
// =======================
const String EspId = "NVEM1234";
const char* jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTk0MDQzNjcsImV4cCI6MTc1OTQ5MDc2N30.L6H3hGjkagsCqr5-VxlpuRAuAdO-6VJ5Vw1swprHKJE";

SocketIoClient webSocket;

// =======================
// EVM Buttons/LEDs
// =======================
const int NUM_PINS = 8;
int buttonPins[NUM_PINS] = {4, 5, 12, 13, 14, 27, 26, 25};
int ledPins[NUM_PINS]    = {15, 33, 18, 19, 21, 22, 23, 32};

int currentPins[NUM_PINS] = {0,0,0,0,0,0,0,0};
int groupMap[NUM_PINS]     = {0,0,0,0,0,0,0,0};
int groupVotes[4]          = {-1,-1,-1,-1};
int maxGroup                = 0;

int selectedCandidate = -1;
int currentGroup = 1;

// =======================
// Utility Functions
// =======================
void resetVoteCycle() {
    for (int i=0;i<NUM_PINS;i++) digitalWrite(ledPins[i], LOW);
    for (int i=0;i<4;i++) groupVotes[i] = -1;
    selectedCandidate = -1;
    currentGroup = 1;

    // Enable only first group buttons
    for (int i=0;i<NUM_PINS;i++) {
        if(currentPins[i]==1 && groupMap[i]==currentGroup) pinMode(buttonPins[i], INPUT_PULLUP);
        else pinMode(buttonPins[i], INPUT);
    }
}

void voteCycleComplete() {
    DynamicJsonDocument doc(256);
    doc["espId"] = EspId;
    JsonObject votes = doc.createNestedObject("votes");
    for (int g=1; g<=maxGroup; g++) {
        if(groupVotes[g-1] != -1) votes[String(g)] = groupVotes[g-1];
    }
    String json;
    serializeJson(doc,json);
    webSocket.emit("vote-selected", json.c_str());
    Serial.println("✅ Vote cycle complete - vote-selected emitted");
}

// =======================
// Socket Event Handlers
// =======================

void voteReset(const char* payload, size_t length) {
    Serial.println("Vote reset triggered.");
    resetVoteCycle();
}

void onConnect(const char* payload, size_t length) {
    Serial.println("✅ Connected to server");
    String msg = "{\"espId\":\"" + EspId + "\", \"role\":\"esp\"}";
    webSocket.emit("post-connection", msg.c_str());
    Serial.println("🟢 post-connection emitted");
}

void onDisconnect(const char* payload, size_t length) {
    Serial.println("⚠️ Disconnected from server");
}

void onChangeConfig(const char* payload, size_t length) {
    Serial.println("⚙️ Config change received:");
    Serial.println(payload);

    DynamicJsonDocument doc(1024);
    DeserializationError err = deserializeJson(doc, payload);
    if (err) { Serial.println("Failed to parse JSON"); return; }

    if (!doc.containsKey("pin_bits") || !doc.containsKey("group_pins")) return;

    JsonArray pinsArray = doc["pin_bits"].as<JsonArray>();
    JsonArray groupArray = doc["group_pins"].as<JsonArray>();

    maxGroup = 0;
    for (int i=0;i<NUM_PINS;i++) {
        currentPins[i] = pinsArray[i];
        groupMap[i] = groupArray[i];
        if (groupArray[i] > maxGroup) maxGroup = groupArray[i];
    }

    Serial.print("Max group: "); Serial.println(maxGroup);
    resetVoteCycle();

    webSocket.emit("config-changed", "{\"espId\":\"NVEM1234\"}");
}

// =======================
// Setup + Loop
// =======================
void setup() {
    Serial.begin(115200);
    delay(1000);

    // Initialize LEDs
    for (int i=0;i<NUM_PINS;i++) pinMode(ledPins[i], OUTPUT);
    resetVoteCycle();

    // Connect Wi-Fi
    WiFi.begin(ssid,password);
    Serial.print("Connecting WiFi");
    while(WiFi.status()!=WL_CONNECTED){ delay(500); Serial.print("."); }
    Serial.println("\n✅ WiFi connected");
    Serial.println(WiFi.localIP());

    // Connect Socket.IO (EIO3)
    String url = "/socket.io/?EIO=3&transport=websocket&token=" + String(jwtToken);
    webSocket.begin(host,port,url.c_str());

    // Socket event listeners
    webSocket.on("connect", onConnect);
    webSocket.on("disconnect", onDisconnect);
    webSocket.on("change-config", onChangeConfig);
    webSocket.on("vote-updated", voteReset);
    webSocket.on("reset-selected", voteReset);
}

void loop() {
    webSocket.loop();

    // Handle button click for current group (without loop)
    if (selectedCandidate == -1) {
        if (currentPins[0]==1 && groupMap[0]==currentGroup && digitalRead(buttonPins[0])==LOW) { 
            selectedCandidate=0; 
            digitalWrite(ledPins[0], HIGH); 
            groupVotes[currentGroup-1]=0; 
            Serial.println("Button 1 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[1]==1 && groupMap[1]==currentGroup && digitalRead(buttonPins[1])==LOW) { 
            selectedCandidate=1; 
            digitalWrite(ledPins[1], HIGH); 
            groupVotes[currentGroup-1]=1; 
            Serial.println("Button 2 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[2]==1 && groupMap[2]==currentGroup && digitalRead(buttonPins[2])==LOW) { 
            selectedCandidate=2; 
            digitalWrite(ledPins[2], HIGH); 
            groupVotes[currentGroup-1]=2; 
            Serial.println("Button 3 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[3]==1 && groupMap[3]==currentGroup && digitalRead(buttonPins[3])==LOW) { 
            selectedCandidate=3; 
            digitalWrite(ledPins[3], HIGH); 
            groupVotes[currentGroup-1]=3; 
            Serial.println("Button 4 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[4]==1 && groupMap[4]==currentGroup && digitalRead(buttonPins[4])==LOW) { 
            selectedCandidate=4; 
            digitalWrite(ledPins[4], HIGH); 
            groupVotes[currentGroup-1]=4; 
            Serial.println("Button 5 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[5]==1 && groupMap[5]==currentGroup && digitalRead(buttonPins[5])==LOW) { 
            selectedCandidate=5; 
            digitalWrite(ledPins[5], HIGH); 
            groupVotes[currentGroup-1]=5; 
            Serial.println("Button 6 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[6]==1 && groupMap[6]==currentGroup && digitalRead(buttonPins[6])==LOW) { 
            selectedCandidate=6; 
            digitalWrite(ledPins[6], HIGH); 
            groupVotes[currentGroup-1]=6; 
            Serial.println("Button 7 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
        else if (currentPins[7]==1 && groupMap[7]==currentGroup && digitalRead(buttonPins[7])==LOW) { 
            selectedCandidate=7; 
            digitalWrite(ledPins[7], HIGH); 
            groupVotes[currentGroup-1]=7; 
            Serial.println("Button 8 pressed"); 
            webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); 
            Serial.println("🟢 Presence emitted"); 
        }
    }

    // After pressing a button, move to next group
    if (selectedCandidate != -1) {
        currentGroup++;
        selectedCandidate = -1;

        // Enable only next group buttons
        for (int i=0;i<NUM_PINS;i++) {
            if(currentPins[i]==1 && groupMap[i]==currentGroup) pinMode(buttonPins[i], INPUT_PULLUP);
            else pinMode(buttonPins[i], INPUT);
        }

        // If all groups selected, emit vote
        if (currentGroup > maxGroup) voteCycleComplete();
    }
}