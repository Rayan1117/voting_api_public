#include <WiFi.h>
#include <FirebaseESP32.h>
#include <time.h> // Include the time library for timestamps

// Wi-Fi credentials
#define WIFI_SSID "novotech"
#define WIFI_PASSWORD "12345678"

// Firebase Project credentials
#define FIREBASE_HOST "smart-evm-6d9a5-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "g9twGBPQ20bpmPVSkmYv4RPKDoPZSGXsyApaJm2n"

// Firebase instances
FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

// Button and LED pins
const int boy1Button = 4;
const int boy2Button = 5;
const int boy3Button = 12;
const int boy4Button = 13;
const int girl1Button = 14;
const int girl2Button = 27;
const int girl3Button = 26;
const int girl4Button = 25;
const int boy1LedPin = 15;
const int boy2LedPin = 33;
const int boy3LedPin = 18;
const int boy4LedPin = 19;
const int girl1LedPin = 21;
const int girl2LedPin = 22;
const int girl3LedPin = 23;
const int girl4LedPin = 32;

// Define the Wi-Fi status LED pin
const int wifiStatusLedPin = 2;

// Variable to track the selected button
int selectedCandidate = -1; // 1-4 for boys, 5-8 for girls

void setup() {
  Serial.begin(115200);

  // Initialize button and LED pins
  pinMode(boy1Button, INPUT_PULLUP);
  pinMode(boy2Button, INPUT_PULLUP);
  pinMode(boy3Button, INPUT_PULLUP);
  pinMode(boy4Button, INPUT_PULLUP);
  pinMode(girl1Button, INPUT_PULLUP);
  pinMode(girl2Button, INPUT_PULLUP);
  pinMode(girl3Button, INPUT_PULLUP);
  pinMode(girl4Button, INPUT_PULLUP);
  pinMode(boy1LedPin, OUTPUT);
  pinMode(boy2LedPin, OUTPUT);
  pinMode(boy3LedPin, OUTPUT);
  pinMode(boy4LedPin, OUTPUT);
  pinMode(girl1LedPin, OUTPUT);
  pinMode(girl2LedPin, OUTPUT);
  pinMode(girl3LedPin, OUTPUT);
  pinMode(girl4LedPin, OUTPUT);

  // Initialize the Wi-Fi status LED pin
  pinMode(wifiStatusLedPin, OUTPUT);
  digitalWrite(wifiStatusLedPin, LOW); // Turn off initially

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println(" Connected to Wi-Fi");

  // Turn on the Wi-Fi status LED
  digitalWrite(wifiStatusLedPin, HIGH);

  // Configure Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Initialize time service for timestamps
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  // Check if no candidate is selected
  if (selectedCandidate == -1) {
    // Check button presses
    if (digitalRead(boy1Button) == LOW) {
      selectedCandidate = 1;
      digitalWrite(boy1LedPin, HIGH);
      Serial.println("Boy1 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(boy2Button) == LOW) {
      selectedCandidate = 2;
      digitalWrite(boy2LedPin, HIGH);
      Serial.println("Boy2 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(boy3Button) == LOW) {
      selectedCandidate = 3;
      digitalWrite(boy3LedPin, HIGH);
      Serial.println("Boy3 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(boy4Button) == LOW) {
      selectedCandidate = 4;
      digitalWrite(boy4LedPin, HIGH);
      Serial.println("Boy4 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(girl1Button) == LOW) {
      selectedCandidate = 5;
      digitalWrite(girl1LedPin, HIGH);
      Serial.println("Girl1 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(girl2Button) == LOW) {
      selectedCandidate = 6;
      digitalWrite(girl2LedPin, HIGH);
      Serial.println("Girl2 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(girl3Button) == LOW) {
      selectedCandidate = 7;
      digitalWrite(girl3LedPin, HIGH);
      Serial.println("Girl3 pressed");
      setRe7setFlag(1); // Set reset_flag to 1 after button press
    } else if (digitalRead(girl4Button) == LOW) {
      selectedCandidate = 8;
      digitalWrite(girl4LedPin, HIGH);
      Serial.println("Girl4 pressed");
      setResetFlag(1); // Set reset_flag to 1 after button press
    }
  }

  // Check flag in Firebase if a button has been pressed
  if (selectedCandidate != -1) {
    String flagUrl = "/NEVM8024/flag";

    if (Firebase.getInt(firebaseData, flagUrl)) {
      int flagStatus = firebaseData.intData();

      if (flagStatus == 1) { // If the flag is raised, call staticVote
        Serial.println("Flag raised, processing vote...");

        // Call the voting function with the selected candidate index
        staticVote(selectedCandidate); 

        // Reset the selected candidate and LEDs after voting
        reset();

        // Reset the flag after processing
        Firebase.setInt(firebaseData, flagUrl, 0);
        Serial.println("Flag reset after voting.");
      }
    } else {
      Serial.println("Failed to get flag: " + firebaseData.errorReason());
    }
  }
}

// Cast votes and update Firebase
void staticVote(int candidateIndex) {
    String voteUrl = "/NEVM8024/vote_count";
    String voteDetailsUrl = "/NEVM8024/vote_details";

    // Read current vote counts
    if (Firebase.getString(firebaseData, voteUrl)) {
        String currentVotes = firebaseData.stringData();
        
        int voteCounts[8]; // Assuming 8 candidates (4 boys, 4 girls)
        int index = 0;
        int start = 0;
        while ((index < 8) && (start < currentVotes.length())) {
            int end = currentVotes.indexOf(',', start);
            if (end == -1) {
                end = currentVotes.length();
            }
            voteCounts[index++] = currentVotes.substring(start, end).toInt();
            start = end + 1;
        }

        // Increment votes for the selected candidate
        if (candidateIndex != -1 && candidateIndex - 1 < 8) {
            voteCounts[candidateIndex - 1]++; // Update the vote count for the selected candidate
            updateVoteDetails(candidateIndex - 1); // Update details for the selected candidate
        }

        // Update vote counts in Firebase
        String newVoteCounts = "";
        for (int i = 0; i < 8; i++) {
            newVoteCounts += String(voteCounts[i]);
            if (i < 7) newVoteCounts += ",";
        }
        Firebase.setString(firebaseData, voteUrl, newVoteCounts);

        // Reset reset_flag after successfully updating the vote
        setResetFlag(0); // Reset reset_flag to 0 after vote update
    } else {
        Serial.println("Failed to fetch current votes: " + firebaseData.errorReason());
    }
}

// Update vote details in Firebase with timestamp
void updateVoteDetails(int candidateIndex) {
    String voteDetailsUrl = "/NEVM8024/vote_details";
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Failed to obtain time");
        return;
    }

    String timestamp = String(timeinfo.tm_year + 1900) + "-" +
                       String(timeinfo.tm_mon + 1) + "-" +
                       String(timeinfo.tm_mday) + "T" +
                       String(timeinfo.tm_hour) + ":" +
                       String(timeinfo.tm_min) + ":" +
                       String(timeinfo.tm_sec) + "Z";

    FirebaseJson voteDetailJson;
    voteDetailJson.set("candidate", String(candidateIndex));
    voteDetailJson.set("timestamp", timestamp);
    Firebase.pushJSON(firebaseData, voteDetailsUrl, voteDetailJson);
}

// Reset the LED states and selections
void reset() {
    digitalWrite(boy1LedPin, LOW);
    digitalWrite(boy2LedPin, LOW);
    digitalWrite(boy3LedPin, LOW);
    digitalWrite(boy4LedPin, LOW);
    digitalWrite(girl1LedPin, LOW);
    digitalWrite(girl2LedPin, LOW);
    digitalWrite(girl3LedPin, LOW);
    digitalWrite(girl4LedPin, LOW);

    // Reset selection
    selectedCandidate = -1; // Reset the selected candidate
}

// Function to set or reset the reset_flag in Firebase
void setResetFlag(int value) {
  String resetFlagUrl = "/NEVM8024/reset_flag";
  if (Firebase.setInt(firebaseData, resetFlagUrl, value)) {
    Serial.println("Reset flag set to: " + String(value));
  } else {
    Serial.println("Failed to set reset flag: " + firebaseData.errorReason());
  }
}