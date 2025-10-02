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
const char* jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTkzMTcwMDYsImV4cCI6MTc1OTQwMzQwNn0.Yqbu-meOphQ41sb1EuPY38QabcVGfvcsyxsTifbPFP0";

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
bool buttonPressed = false;
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
        pinMode(buttonPins[i], currentPins[i]==1 && groupMap[i]==currentGroup ? INPUT_PULLUP : INPUT);
    }
}

void voteCycleComplete() {
    // Send vote-selected only for valid groups
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
void registerPresence(const char* payload, size_t length) {
    webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
}

void startElection(const char* payload, size_t length) {
    Serial.println("Election started, resetting state...");
    resetVoteCycle();
}

void voteReset(const char* payload, size_t length) {
    Serial.println("Vote reset triggered.");
    resetVoteCycle();
}

void onConnect(const char* payload, size_t length) {
    Serial.println("✅ Connected to server");
    String msg = "{\"espId\":\"" + EspId + "\"}";
    webSocket.emit("post-connection", msg.c_str());
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

    // Emit config-changed back to server
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

    webSocket.on("connect", onConnect);
    webSocket.on("disconnect", onDisconnect);
    webSocket.on("change-config", onChangeConfig);
    webSocket.on("start-election", startElection);
    webSocket.on("vote-updated", voteReset);
    webSocket.on("reset-selected", voteReset);
    webSocket.on("check-presence", registerPresence);
}

void loop() {
    webSocket.loop();

    // Handle button click
    if (selectedCandidate == -1) {
        if (currentPins[0]==1 && groupMap[0]==currentGroup && digitalRead(buttonPins[0])==LOW) { selectedCandidate=0; buttonPressed=true; digitalWrite(ledPins[0], HIGH); groupVotes[currentGroup-1]=0; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 1 pressed"); }
        else if (currentPins[1]==1 && groupMap[1]==currentGroup && digitalRead(buttonPins[1])==LOW) { selectedCandidate=1; buttonPressed=true; digitalWrite(ledPins[1], HIGH); groupVotes[currentGroup-1]=1; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 2 pressed"); }
        else if (currentPins[2]==1 && groupMap[2]==currentGroup && digitalRead(buttonPins[2])==LOW) { selectedCandidate=2; buttonPressed=true; digitalWrite(ledPins[2], HIGH); groupVotes[currentGroup-1]=2; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 3 pressed"); }
        else if (currentPins[3]==1 && groupMap[3]==currentGroup && digitalRead(buttonPins[3])==LOW) { selectedCandidate=3; buttonPressed=true; digitalWrite(ledPins[3], HIGH); groupVotes[currentGroup-1]=3; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 4 pressed"); }
        else if (currentPins[4]==1 && groupMap[4]==currentGroup && digitalRead(buttonPins[4])==LOW) { selectedCandidate=4; buttonPressed=true; digitalWrite(ledPins[4], HIGH); groupVotes[currentGroup-1]=4; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 5 pressed"); }
        else if (currentPins[5]==1 && groupMap[5]==currentGroup && digitalRead(buttonPins[5])==LOW) { selectedCandidate=5; buttonPressed=true; digitalWrite(ledPins[5], HIGH); groupVotes[currentGroup-1]=5; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 6 pressed"); }
        else if (currentPins[6]==1 && groupMap[6]==currentGroup && digitalRead(buttonPins[6])==LOW) { selectedCandidate=6; buttonPressed=true; digitalWrite(ledPins[6], HIGH); groupVotes[currentGroup-1]=6; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 7 pressed"); }
        else if (currentPins[7]==1 && groupMap[7]==currentGroup && digitalRead(buttonPins[7])==LOW) { selectedCandidate=7; buttonPressed=true; digitalWrite(ledPins[7], HIGH); groupVotes[currentGroup-1]=7; webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}"); Serial.println("Button 8 pressed"); }
    }

    // After pressing a button in current group, move to next group
  // After pressing a button in current group, move to next active group
if (selectedCandidate != -1 && buttonPressed) {
    buttonPressed = false;
    selectedCandidate = -1;

    // --- Move to next non-empty group ---
    if (currentGroup == 1) {
        if (currentPins[3]==1 && groupMap[3]==3) currentGroup = 3;
        else if (currentPins[4]==1 && groupMap[4]==3) currentGroup = 3;
        else voteCycleComplete(); // no more active groups
    }
    else if (currentGroup == 3) {
        voteCycleComplete();
    }

    // --- Enable only next group buttons ---
    if (currentGroup <= maxGroup) {
        if (currentGroup==1) {
            pinMode(buttonPins[0], currentPins[0]==1 && groupMap[0]==1 ? INPUT_PULLUP : INPUT);
            pinMode(buttonPins[1], currentPins[1]==1 && groupMap[1]==1 ? INPUT_PULLUP : INPUT);
        }
        else if (currentGroup==3) {
            pinMode(buttonPins[3], currentPins[3]==1 && groupMap[3]==3 ? INPUT_PULLUP : INPUT);
            pinMode(buttonPins[4], currentPins[4]==1 && groupMap[4]==3 ? INPUT_PULLUP : INPUT);
        }
    }
}

}
