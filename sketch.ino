#include <WiFi.h>
#include <SocketIoClient.h>
#include <ArduinoJson.h> // Ensure you have this library for JSON parsing
#include <HTTPClient.h>

const char* ssid = "ARUN";                // Replace with your network SSID
const char* password = "12345678";      // Replace with your network password
const char* host = "10.201.190.229";        // Replace with your server IP

SocketIoClient webSocket;

const String EspId = "NVEM1234";
// Define the size of the pinsstring array
const int NUM_PINS = 8;

int currentPins[NUM_PINS] = {0, 0, 0, 0, 0, 0, 0, 0};

int selectedCandidate;

bool buttonPressed = false;

const int Button1 = 4;
const int Button2 = 5;
const int Button3 = 12;
const int Button4 = 13;
const int Button5 = 14;
const int Button6 = 27;
const int Button7 = 26;
const int Button8 = 25;
const int Button1LedPin = 15;
const int Button2LedPin = 33;
const int Button3LedPin = 18;
const int Button4LedPin = 19;
const int Button5LedPin = 21;
const int Button6LedPin = 22;
const int Button7LedPin = 23;
const int Button8LedPin = 32;

void getStartupConfig(const char* espId) {
  HTTPClient http;

  String serverUrl = "http://10.201.190.229:5000/startup/get-config?espId=" + String(espId);

  http.begin(serverUrl); // Starts HTTP connection
  int httpCode = http.GET(); // Sends the GET request

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Config received: ");
    Serial.println(payload);
    // Parse JSON and apply config
  }
  else if(httpCode == 400) {
    Serial.println("There is no ongoing election");
  } else {
    Serial.printf("Failed to get config, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void event(const char* payload, size_t length) {
    Serial.printf("Message received: %s\n", payload);

    // Parse the JSON payload
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    if (error) {
        Serial.println("Failed to parse JSON!");
        return;
    }

    // Check if the payload contains pinsstring
    if (!doc.containsKey("pin_bits")) {
        Serial.println("pinsstring not found in the message.");
        return;
    }

    // Get the pinsstring from the payload
    const char* pinsString = doc["pin_bits"];
    // Parse the pinsstring
    DynamicJsonDocument pinsDoc(1024);
    DeserializationError pinsError = deserializeJson(pinsDoc, pinsString);
    if (pinsError) {
        Serial.println("Failed to parse pinsstring!");
        return;
    }
    // Update currentPins with the received data
    for (int i = 0; i < NUM_PINS; i++) {
        currentPins[i] = pinsDoc[i]; // Fill currentPins with parsed data
    }

        // If they are different, update oldPins with currentPins
        Serial.println("Configuration has changed. Updating old pins.");

        // Print the updated old pins and which buttons are enabled
        Serial.print("Updated pins: ");
        for (int i = 0; i < NUM_PINS; i++) {
            Serial.print(currentPins[i]);
            Serial.print(" ");
        }
        Serial.println(); // New line after printing all old pins

        Serial.print("Enabled buttons: ");
        for (int i = 0; i < NUM_PINS; i++) {
            // Check the digital state to print which buttons are actually enabled
            if (currentPins[i] ==  1) {
                Serial.print("Button ");
                Serial.print(i + 1); // Print button number (1 to NUM_PINS)
                Serial.print(" ");
            }
        }
        Serial.println();
      //String changed ="changed successfully";
        webSocket.emit("config-changed", "{\"message\":\"changed successfully\"}");
        webSocket.on("election-started", startElection);
        webSocket.emit("start-election", "{\"espId\":\"NVEM1234\"}");
        webSocket.on("vote-updated", voteCasted);
        webSocket.on("reset-selected", voteCasted);
        webSocket.on("check-presence", registerPresence);
}

void registerPresence(const char* payload, size _t length) {
    Serial.println("check-presence");
    webSocket.emit("present", "{\"room\":\"NVEM1234\", \"role\":\"esp\"}");
}

void startElection(const char* payload, size_t length) {
        delay(2000);
        selectedCandidate = -1;
    }

void voteCasted(const char* payload, size_t length) {
  Serial.println("Reset the button to work again");
  selectedCandidate = -1;

  // Manually set all LED pins to LOW
  digitalWrite(Button1LedPin, LOW);
  digitalWrite(Button2LedPin, LOW);
  digitalWrite(Button3LedPin, LOW);
  digitalWrite(Button4LedPin, LOW);
  digitalWrite(Button5LedPin, LOW);
  digitalWrite(Button6LedPin, LOW);
  digitalWrite(Button7LedPin, LOW);
  digitalWrite(Button8LedPin, LOW);
}

void onConnect(const char* payload, size_t length) {
    Serial.println("Connected to server");
}

void onDisconnect(const char* payload, size_t length) {
    Serial.println("Disconnected from server");
}

int selected_candidate = -1;

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(Button1,INPUT_PULLUP);
    pinMode(Button2,INPUT_PULLUP);
    pinMode(Button3,INPUT_PULLUP);
    pinMode(Button4,INPUT_PULLUP);
    pinMode(Button5,INPUT_PULLUP);
    pinMode(Button6,INPUT_PULLUP);
    pinMode(Button7,INPUT_PULLUP);
    pinMode(Button8,INPUT_PULLUP);

    pinMode(Button1LedPin,OUTPUT);
    pinMode(Button2LedPin,OUTPUT);
    pinMode(Button3LedPin,OUTPUT);
    pinMode(Button4LedPin,OUTPUT);
    pinMode(Button5LedPin,OUTPUT);
    pinMode(Button6LedPin,OUTPUT);
    pinMode(Button7LedPin,OUTPUT);
    pinMode(Button8LedPin,OUTPUT);

    // Connect to Wi-Fi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(WiFi.localIP());
    Serial.println("Connected to WiFi");


    getStartupConfig(EspId.c_str());

    // Connect to WebSocket
    webSocket.begin(host, 5000, "/socket.io/?EIO=3&transport=websocket");
    webSocket.emit("post-connection", "{\"espId\":\"NVEM1234\"}");  // Correctly serialized JSON string
    webSocket.on("change-config", event); // Event listener for 'data' messages

    // Set up event listeners for connection and disconnection
    webSocket.on("connect", onConnect);
    webSocket.on("disconnect", onDisconnect);

}

void loop() {
    webSocket.loop();
    // Check button presses and update selectedCandidate
    if (selectedCandidate == -1) {
        if (digitalRead(Button1) == LOW) {
            selectedCandidate = 1;
            buttonPressed = true;
            digitalWrite(Button1LedPin, HIGH);
            Serial.println("Button1 pressed");
        } else if (digitalRead(Button2) == LOW) {
            selectedCandidate = 2;
            buttonPressed = true;
            digitalWrite(Button2LedPin, HIGH);
            Serial.println("Button2 pressed");
        } else if (digitalRead(Button3) == LOW) {
            selectedCandidate = 3;
            buttonPressed = true;
            digitalWrite(Button3LedPin, HIGH);
            Serial.println("Button3 pressed");
        } else if (digitalRead(Button4) == LOW) {
            selectedCandidate = 4;
            buttonPressed = true;
            digitalWrite(Button4LedPin, HIGH);
            Serial.println("Button4 pressed");
        } else if (digitalRead(Button5) == LOW) {
            selectedCandidate = 5;
            buttonPressed = true;
            digitalWrite(Button5LedPin, HIGH);
            Serial.println("Button5 pressed");
        } else if (digitalRead(Button6) == LOW) {
            selectedCandidate = 6;
            buttonPressed = true;
            digitalWrite(Button6LedPin, HIGH);
            Serial.println("Button6 pressed");
        } else if (digitalRead(Button7) == LOW) {
            selectedCandidate = 7;
            buttonPressed = true;
            digitalWrite(Button7LedPin, HIGH);
            Serial.println("Button7 pressed");
        } else if (digitalRead(Button8) == LOW) {
            selectedCandidate = 8;
            buttonPressed = true;
            digitalWrite(Button8LedPin, HIGH);
            Serial.println("Button8 pressed");
        }
    }

    // Emit the vote once a candidate is selected
    if (selectedCandidate != -1 && buttonPressed == true) {
        String voteData = "{\"espId\":\"NVEM1234\",\"voteIndex\":\"" + String(selectedCandidate - 1) + "\"}";
        webSocket.emit("vote-selected", voteData.c_str()); // Emit the selected vote to server
        buttonPressed = false;
    }

}
