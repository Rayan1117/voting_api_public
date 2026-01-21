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
const char* jwtToken = "YOUR_JWT_TOKEN_HERE";

SocketIoClient webSocket;

// =======================
// EVM Buttons/LEDs
// =======================
const int NUM_PINS = 8;
int buttonPins[NUM_PINS] = {4, 5, 12, 13, 14, 27, 26, 25};
int ledPins[NUM_PINS]    = {15, 33, 18, 19, 21, 22, 23, 32};

// Current pin status from server
int currentPins[NUM_PINS] = {0};
int groupMap[NUM_PINS]    = {0};  // group IDs
int groupVotes[4]          = {-1,-1,-1,-1}; // store voted pin index per group
int maxGroup               = 0;

// =======================
// STATE
// =======================
int selectedCandidate = -1;

// =======================
// UTILITY
// =======================
void enableGroupButtons(int group) {
  for(int i=0; i<NUM_PINS; i++){
    if(currentPins[i] == 1 && groupMap[i] == group && groupVotes[group-1] == -1){
      pinMode(buttonPins[i], INPUT_PULLUP); // enable voting for this candidate
    } else {
      pinMode(buttonPins[i], INPUT);        // disable
    }
  }
}

void resetVoteCycle() {
  // reset LEDs
  for(int i=0; i<NUM_PINS; i++) digitalWrite(ledPins[i], LOW);
  // reset group votes
  for(int i=0; i<4; i++) groupVotes[i] = -1;
  selectedCandidate = -1;
  // enable first group only
  enableGroupButtons(1);
}

void voteCycleComplete() {
  DynamicJsonDocument doc(256);
  doc["espId"] = EspId;
  JsonObject votes = doc.createNestedObject("votes");
  for(int g=1; g<=maxGroup; g++){
    if(groupVotes[g-1] != -1) votes[String(g)] = groupVotes[g-1];
  }
  String json;
  serializeJson(doc,json);
  webSocket.emit("vote-selected", json.c_str());
  Serial.println("✅ Vote cycle complete");
}

// Recover cached votes from server
void recoverCachedVotes(JsonArray cachedVotes){
  for(int i=0; i<cachedVotes.size(); i++){
    int idx = cachedVotes[i];
    int grp = groupMap[idx];
    if(grp <= 0) continue;
    groupVotes[grp-1] = idx;
    digitalWrite(ledPins[idx], HIGH);
  }
  // Enable first group that has not yet voted
  for(int g=1; g<=maxGroup; g++){
    if(groupVotes[g-1] == -1){
      enableGroupButtons(g);
      break;
    }
  }
}

// =======================
// SOCKET EVENTS
// =======================
void voteReset(const char* payload, size_t length) {
  Serial.println("Vote reset triggered.");
  resetVoteCycle();
}

void onConnect(const char* payload, size_t length){
  Serial.println("✅ Connected to server");
  String msg = "{\"espId\":\"" + EspId + "\",\"role\":\"esp\"}";
  webSocket.emit("post-connection", msg.c_str());
}

void onDisconnect(const char* payload, size_t length){
  Serial.println("⚠️ Disconnected from server");
}

void onChangeConfig(const char* payload, size_t length){
  Serial.println("⚙️ Config change received:");
  Serial.println(payload);

  DynamicJsonDocument doc(1024);
  if(deserializeJson(doc,payload)){ Serial.println("Failed to parse JSON"); return; }

  if(!doc.containsKey("pin_bits") || !doc.containsKey("group_pins")) return;

  JsonArray pinsArray  = doc["pin_bits"].as<JsonArray>();
  JsonArray groupsArray= doc["group_pins"].as<JsonArray>();
  JsonArray cachedVotes = doc.containsKey("cached_votes") ? doc["cached_votes"].as<JsonArray>() : JsonArray();

  maxGroup = 0;
  for(int i=0;i<NUM_PINS;i++){
    currentPins[i] = pinsArray[i];
    groupMap[i]    = groupsArray[i];
    if(groupMap[i] > maxGroup) maxGroup = groupMap[i];
  }

  recoverCachedVotes(cachedVotes);
  webSocket.emit("config-changed", "{\"espId\":\"NVEM1234\"}");
}

// =======================
// SETUP
// =======================
void setup() {
  Serial.begin(115200);
  delay(1000);

  // initialize LEDs
  for(int i=0;i<NUM_PINS;i++){
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  // connect WiFi
  WiFi.begin(ssid,password);
  Serial.print("Connecting WiFi");
  while(WiFi.status() != WL_CONNECTED){ delay(500); Serial.print("."); }
  Serial.println("\n✅ WiFi connected");
  Serial.println(WiFi.localIP());

  // connect socket.io
  String url = "/socket.io/?EIO=3&transport=websocket&token=" + String(jwtToken);
  webSocket.begin(host,port,url.c_str());

  webSocket.on("connect", onConnect);
  webSocket.on("disconnect", onDisconnect);
  webSocket.on("change-config", onChangeConfig);
  webSocket.on("vote-updated", voteReset);
  webSocket.on("reset-selected", voteReset);

  resetVoteCycle();
}

// =======================
// LOOP
// =======================
void loop() {
  webSocket.loop();

  if(selectedCandidate == -1){
    // Button 1
    if(currentPins[0]==1 && groupMap[0]>0 && groupVotes[groupMap[0]-1]==-1 && digitalRead(buttonPins[0])==LOW){
      selectedCandidate=0;
      groupVotes[groupMap[0]-1]=0;
      digitalWrite(ledPins[0], HIGH);
      Serial.println("Button 1 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 2
    else if(currentPins[1]==1 && groupMap[1]>0 && groupVotes[groupMap[1]-1]==-1 && digitalRead(buttonPins[1])==LOW){
      selectedCandidate=1;
      groupVotes[groupMap[1]-1]=1;
      digitalWrite(ledPins[1], HIGH);
      Serial.println("Button 2 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 3
    else if(currentPins[2]==1 && groupMap[2]>0 && groupVotes[groupMap[2]-1]==-1 && digitalRead(buttonPins[2])==LOW){
      selectedCandidate=2;
      groupVotes[groupMap[2]-1]=2;
      digitalWrite(ledPins[2], HIGH);
      Serial.println("Button 3 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 4
    else if(currentPins[3]==1 && groupMap[3]>0 && groupVotes[groupMap[3]-1]==-1 && digitalRead(buttonPins[3])==LOW){
      selectedCandidate=3;
      groupVotes[groupMap[3]-1]=3;
      digitalWrite(ledPins[3], HIGH);
      Serial.println("Button 4 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 5
    else if(currentPins[4]==1 && groupMap[4]>0 && groupVotes[groupMap[4]-1]==-1 && digitalRead(buttonPins[4])==LOW){
      selectedCandidate=4;
      groupVotes[groupMap[4]-1]=4;
      digitalWrite(ledPins[4], HIGH);
      Serial.println("Button 5 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 6
    else if(currentPins[5]==1 && groupMap[5]>0 && groupVotes[groupMap[5]-1]==-1 && digitalRead(buttonPins[5])==LOW){
      selectedCandidate=5;
      groupVotes[groupMap[5]-1]=5;
      digitalWrite(ledPins[5], HIGH);
      Serial.println("Button 6 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 7
    else if(currentPins[6]==1 && groupMap[6]>0 && groupVotes[groupMap[6]-1]==-1 && digitalRead(buttonPins[6])==LOW){
      selectedCandidate=6;
      groupVotes[groupMap[6]-1]=6;
      digitalWrite(ledPins[6], HIGH);
      Serial.println("Button 7 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
    // Button 8
    else if(currentPins[7]==1 && groupMap[7]>0 && groupVotes[groupMap[7]-1]==-1 && digitalRead(buttonPins[7])==LOW){
      selectedCandidate=7;
      groupVotes[groupMap[7]-1]=7;
      digitalWrite(ledPins[7], HIGH);
      Serial.println("Button 8 pressed");
      webSocket.emit("present", "{\"room\":\"NVEM1234\",\"role\":\"esp\"}");
    }
  }

  // After a button pressed, move to next unvoted group
  if(selectedCandidate != -1){
    selectedCandidate = -1;

    // Check if all groups voted
    bool allVoted = true;
    for(int g=0; g<maxGroup; g++){
      if(groupVotes[g]==-1){ allVoted=false; break; }
    }
    if(allVoted){
      voteCycleComplete();
    }
  }
}
