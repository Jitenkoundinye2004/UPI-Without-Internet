# Offline Mesh Payment Protocol

A Node.js and React application that demonstrates **offline UPI payments routed through a device-to-device mesh network**. You're in a basement with zero connectivity. You send your friend ₹500. Your phone encrypts the payment, broadcasts it to nearby phones, and the packet hops device-to-device until *some* phone walks outside, gets 4G, and silently uploads it to this backend. The backend decrypts, deduplicates, and settles the transaction.

This repository contains both the **backend server** (Node.js + Express + SQLite) and the **interactive frontend dashboard** (React + Tailwind CSS + Framer Motion) which simulates the mesh network visually.

---

## What this demo proves

The system shows three things working end-to-end:

1. **A payment can travel from sender to backend through untrusted intermediaries** without any of them being able to read or tamper with it. (Hybrid RSA + AES-GCM encryption.)
2. **Even if the same payment reaches the backend simultaneously through multiple bridge nodes, it settles exactly once.** (Idempotency via atomic cache checks on the ciphertext hash.)
3. **A tampered or replayed packet is rejected** before it touches the ledger.

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React
- **Backend:** Node.js, Express.js, Sequelize, SQLite
- **Security:** RSA-2048 and AES-256-GCM (Hybrid Encryption)

---

## How to run it

### Prerequisites

- **Node.js** (v18 or newer) installed.

### Setup & Installation

1. Open a terminal in the `backend` folder and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Open another terminal in the `frontend` folder and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Running the Project

**1. Start the Backend:**
In the `backend` directory, run:
```bash
node src/server.js
```
*The server will start on port 8080. It will automatically generate RSA keypairs and seed the SQLite database with demo accounts.*

**2. Start the Frontend:**
In the `frontend` directory, run:
```bash
npm run dev
```
*Vite will start the development server (usually on port 5173).*

**3. Open the Dashboard:**
Navigate to the frontend URL (e.g., `http://localhost:5173`) in your browser to interact with the premium UI.

*(Alternatively, you can build the frontend with `npm run build` and move the `dist` folder into `backend/public` to serve everything directly from the Node.js backend on `http://localhost:8080`).*

---

## The Demo Flow (Step-by-Step)

The dashboard has an interactive sidebar that walks through the full pipeline:

### Step 1 — Compose a payment
Choose sender, receiver, amount, and PIN. Click **"Inject Packet"**.
- The server pretends to be the sender's phone, encrypts the instruction with the server's RSA public key, and hands the packet to an offline virtual device (`phone-alice`).

### Step 2 — Run gossip rounds
Click **"Run Round"**. 
- Each round, every device that holds a packet broadcasts it to every other device. You will see the visual cards animate as packets transfer across the mesh network.

### Step 3 — Bridge node walks outside
Click **"Flush Bridges"**.
- `phone-bridge` (the device with a simulated 4G connection) POSTs every packet it holds to the backend. The backend hashes the ciphertext, checks the idempotency cache, decrypts the payload, and settles the transaction if valid.
- Watch the **Account Balances** and **Transaction Ledger** update in real-time.

---

## Architecture & Security

### Hybrid Encryption (Solving the untrusted intermediary problem)
The sender encrypts the payload with the server's public key. To handle large JSON payloads:
1. Generate a fresh AES-256 key for the packet.
2. Encrypt the JSON with **AES-256-GCM** (fast + authenticated).
3. Encrypt the AES key with **RSA-OAEP**.
*If an intermediate node flips a single bit, decryption throws an exception because the GCM tag won't verify.*

### Idempotency (Solving the duplicate-storm problem)
If three bridge nodes upload the same packet simultaneously, the backend computes `SHA-256(ciphertext)` and claims it in a cache layer. Duplicates are instantly rejected (`DUPLICATE_DROPPED`) before any heavy RSA decryption occurs, ensuring the sender is only debited once.

### Replay Attack Prevention
The encrypted payload includes a timestamp (`signedAt`) and a `nonce` (UUID). The server rejects packets older than 24 hours. A replay of an old, valid packet is byte-identical and caught by the idempotency cache.

---

## Honest limitations of the concept

1. **The receiver cannot verify the sender has funds offline.** When the sender hands the receiver a packet, it is essentially an IOU. If the sender's account is empty when the packet reaches the backend, settlement fails. *(Real offline UPI uses a pre-funded hardware-backed wallet to prove funds offline).*
2. **Double-spending.** A malicious sender could send a packet to Bob in basement A, and another packet to Carol in basement B. The first packet to reach the backend settles; the other is rejected.
3. **Background BLE limitations.** In reality, establishing reliable background Bluetooth GATT connections between strangers' phones is highly restrictive on modern iOS and Android devices. This project simulates the mesh network logic.

*This project is designed as a proof-of-concept for mesh-routed deferred settlements and cryptographic idempotency.*
