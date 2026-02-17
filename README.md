## 🗳️ Voting API

Backend service for the **Smart EVM / Arduino Voting System**.
This API manages elections, user authentication, and real-time communication between the **ESP32** device and the **web dashboard**.

---

## 🎨 Project Presentation

You can view the Smart EVM presentation design on Canva:
👉 https://www.canva.com/design/DAG_B811Ybg/rPAJ8L_VBC7w5IaCP2MEHA/edit?utm_content=DAG_B811Ybg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

---

## 🌍 Hosted API

**Base URL:**
[https://voting-api-wnlq.onrender.com/](https://voting-api-wnlq.onrender.com/)

**Health Check Endpoint:**
`/test` → Returns a message confirming that the API is active.

---

## 🔎 Overview

The Voting API provides the following features:

* Admin endpoints to create, start, and manage elections
* JWT-based authentication with role validation
* Redis for temporary vote and presence tracking
* SQL Server for persistent data storage
* Socket.IO for real-time synchronization with ESP32
* Support for both web and hardware-based voting operations

---

## 📁 Project Structure

index.js — Initializes Express app, middleware, and Socket.IO
authentication/ — Handles login and JWT generation
admin_routes/ — Contains election and configuration endpoints
user_routes/ — Fetch and view-only operations
startup/ — Handles ESP32 configuration and startup recovery
socket_routes/ — Manages WebSocket events and namespaces
sketch.ino — Reference Arduino (ESP32) implementation

---

## ⚙️ Requirements

Node.js 20.x or later
npm
Microsoft SQL Server
Redis

---

🚀 Run Locally

1. Install dependencies
   npm install

2. Start the server
   npm run dev
   or
   npm start

3. Open in browser
   [http://localhost:5000](http://localhost:5000)

Health Check:
[http://localhost:5000/test](http://localhost:5000/test)

---

## 🔐 Authentication

### Login:

**Endpoint:** POST /auth/login

**Request Body:**

```
{
  "username": "NVEM1234",
  "password": "pass@123",
  "role": "admin"
}
```

**Response:**

```
{
  "message": "Login successful",
  "token": "<JWT_TOKEN>",
  "role": "admin"
}
```

Use the token in your requests:
Authorization: Bearer <JWT_TOKEN>

 ### Roles:

* **admin:** Full access to manage elections and configurations
* **user:** Read-only access to view results and data
* **esp:** Device role used by the ESP32 client

---

## 🌐 REST API Routes

**Public Routes**

* GET `/test` → Health check
* POST `/auth/login` → Login and receive JWT
* POST `/verification/verify-token` → Validate JWT token

**Admin Routes – /election**

* POST `/election/create-election` → Create a new election linked to a configuration
* POST `/election/start-election` → Start election, send config to ESP, mark active
* POST `/election/resume-election` → Resume an ongoing election
* POST `/election/end-election` → End an election
* DELETE `/election/delete-election?electionId=...` → Remove election and vote data

**Admin Routes – /config**

* POST `/config/create-config` → Create or save pin/group configuration

**Admin Routes – /startup**

* GET `/startup/get-config?espId=...` → Return configuration for given ESP
* GET `/startup/vote-status?espId=...` → Check if all groups have completed voting

---

## 🧠 Redis Usage

Redis temporarily stores votes and active device states.
It keeps data fast and consistent during real-time sessions.

* `vote:<espId>` — Tracks selected votes
* `presence:<espId>` — Tracks online devices (ESP/admin)
* `config:<espId>` — Holds the current configuration snapshot

Redis helps the ESP reconnect smoothly without losing data mid-session.

---

## 🗄️ Database (SQL Server)

The database contains three main entities:

**election** — Stores election details and state
**config** — Stores pin mappings and group structures (JSON)
**vote_counts** — Records final votes after election completion
**admins / users** — Stores login credentials and roles

Typical flow:

1. Admin creates configuration
2. Links it to a new election
3. Starts the election (data pushed to ESP)
4. Votes come in real-time via Socket.IO
5. Results saved when admin casts vote

---

⚡ Socket.IO Events

**Core Events:**

* post-connection → Register ESP or web client
* change-config → Server sends configuration to ESP
* config-changed → ESP confirms config applied
* vote-selected → ESP sends vote index
* check-presence → Server verifies ESP and admin are active
* present → Confirms active status from both sides
* cast-vote → Admin finalizes and saves vote results
* vote-updated → Notifies web UI and ESP that results are updated
* reset-selected → Clears temporary votes when session resets

---

## 🔌 Arduino / ESP32 Integration

ESP32 connects to the backend through WebSocket (Socket.IO).
It receives configuration data and reports button interactions in real time.

**General Flow:**

1. Connect to Wi-Fi
2. Connect to Socket.IO server using JWT
3. Emit `post-connection` with espId and role
4. Receive `change-config` → configure voting pins
5. When a button is pressed → emit `vote-selected`
6. Respond to `check-presence` → emit `present`
7. On `reset-selected` or `vote-updated` → reset LEDs and selections

**Required Libraries:**
WiFi.h
WebSocketsClient.h
ArduinoJson.h

**Example Config Payload:**

```
{
  "pin_bits": [1,1,1,1,0,0,0,0],
  "group_pins": [1,2,3,4,0,0,0,0]
}
```

---

## 👤 Example Admin Login

Username: NVEM1234
Password: pass@123
