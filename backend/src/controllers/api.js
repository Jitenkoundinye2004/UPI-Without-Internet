const express = require('express');
const router = express.Router();

const serverKeyHolder = require('../crypto/ServerKeyHolder');
const demo = require('../services/DemoService');
const mesh = require('../services/MeshSimulatorService');
const bridge = require('../services/BridgeIngestionService');
const idempotency = require('../services/IdempotencyService');

// Mongoose Models
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Controllers
const { registerUser, loginUser, getMe } = require('./authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// ------------------------------------------------------------------ Auth
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/me', authMiddleware, getMe);

// ------------------------------------------------------------------ Offline Crypto Engine
router.post('/transaction/offline', async (req, res) => {
    // Start a MongoDB ACID Transaction Session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { payload, signature, pin } = req.body;
        const { senderVpa, receiverVpa, amount, nonce } = payload;

        if (amount <= 0) throw new Error("Amount must be greater than 0");

        // 1. Find Sender and Receiver
        const sender = await User.findOne({ vpa: senderVpa }).session(session);
        const receiver = await User.findOne({ vpa: receiverVpa }).session(session);

        if (!sender) throw new Error("Sender not found in database");
        if (!receiver) throw new Error("Receiver VPA not found");

        // 2. Verify Cryptographic Signature! (This proves they have the Private Key offline)
        // Convert the raw base64 SPKI key back into a format Node crypto can use
        const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${sender.publicKey}\n-----END PUBLIC KEY-----`;
        
        const verify = crypto.createVerify('SHA256');
        verify.update(JSON.stringify(payload));
        verify.end();

        const isValid = verify.verify(publicKeyPem, Buffer.from(signature, 'base64'));

        if (!isValid) {
            throw new Error("Cryptographic Signature Invalid! Transaction rejected.");
        }

        // 3. Verify Balance
        if (sender.balance < amount) {
            throw new Error("Insufficient Funds");
        }

        // 4. Record the Transaction with the Nonce as Packet ID to prevent Replay Attacks
        const tx = await Transaction.create([{
            packetId: nonce,
            senderVpa,
            receiverVpa,
            amount,
            status: 'SETTLED',
            bridgeNodeId: 'Direct-Upload'
        }], { session });

        // 5. Safely move the money using MongoDB ACID
        sender.balance -= amount;
        receiver.balance += amount;

        await sender.save({ session });
        await receiver.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Cryptographic Offline Signature Verified & Funds Settled!", transaction: tx[0] });

    } catch (e) {
        // Rollback the transaction if anything fails (hacking attempt, insufficient funds, etc)
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: e.message });
    }
});

// ------------------------------------------------------------------ Demo Add Money
router.post('/account/add-money', async (req, res) => {
    try {
        const { vpa, amount } = req.body;
        if (!vpa || !amount) return res.status(400).json({ error: "Missing data" });

        const user = await User.findOne({ vpa });
        if (!user) return res.status(404).json({ error: "User not found" });

        user.balance += Number(amount);
        await user.save();

        res.json({ message: `Successfully added ₹${amount}`, balance: user.balance });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------------ key
router.get('/server-key', (req, res) => {
    res.json({
        publicKey: serverKeyHolder.getPublicKeyBase64(),
        algorithm: "RSA-2048 / OAEP-SHA256",
        hybridScheme: "RSA-OAEP encrypts an AES-256-GCM session key"
    });
});

// ---------------------------------------------------------------- demo
router.post('/demo/send', async (req, res) => {
    try {
        const reqBody = req.body;
        const packet = await demo.createPacket(
            reqBody.senderVpa, 
            reqBody.receiverVpa, 
            reqBody.amount, 
            reqBody.pin,
            reqBody.ttl == null ? 5 : reqBody.ttl
        );

        const startDevice = reqBody.startDevice == null ? "phone-jiten" : reqBody.startDevice;
        mesh.inject(startDevice, packet);

        res.json({
            packetId: packet.packetId,
            ciphertextPreview: packet.ciphertext.substring(0, 64) + "...",
            ttl: packet.ttl,
            injectedAt: startDevice
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -------------------------------------------------------------- mesh sim
router.get('/mesh/state', (req, res) => {
    const deviceData = [];
    for (const d of mesh.getDevices()) {
        deviceData.push({
            deviceId: d.deviceId,
            hasInternet: d.hasInternet,
            packetCount: d.packetCount(),
            packetIds: d.getHeldPackets().map(p => p.packetId.substring(0, 8))
        });
    }
    res.json({
        devices: deviceData,
        idempotencyCacheSize: idempotency.size()
    });
});

router.post('/mesh/gossip', (req, res) => {
    const r = mesh.gossipOnce();
    res.json({
        transfers: r.transfers,
        deviceCounts: r.deviceCounts
    });
});

router.post('/mesh/flush', async (req, res) => {
    const uploads = mesh.collectBridgeUploads();
    const results = [];
    
    // Process them all simultaneously (Promise.all)
    await Promise.all(uploads.map(async (up) => {
        const r = await bridge.ingest(up.packet, up.bridgeNodeId, 5 - up.packet.ttl);
        results.push({
            bridgeNode: up.bridgeNodeId,
            packetId: up.packet.packetId.substring(0, 8),
            outcome: r.outcome,
            reason: r.reason == null ? "" : r.reason,
            transactionId: r.transactionId == null ? -1 : r.transactionId
        });
    }));

    res.json({
        uploadsAttempted: uploads.length,
        results: results
    });
});

router.post('/mesh/reset', (req, res) => {
    mesh.resetMesh();
    idempotency.clear();
    res.json({ status: "mesh and idempotency cache cleared" });
});

// -------------------------------------------------------------- bridge
router.post('/bridge/ingest', async (req, res) => {
    const packet = req.body;
    const bridgeNodeId = req.header('X-Bridge-Node-Id') || 'unknown';
    const hopCount = parseInt(req.header('X-Hop-Count') || '0', 10);

    const r = await bridge.ingest(packet, bridgeNodeId, hopCount);
    res.json(r);
});

// ------------------------------------------------------------- accounts / transactions
// Note: We use User.find() instead of Account.findAll() for Mongoose
router.get('/accounts', async (req, res) => {
    try {
        // Exclude password and pin hashes from public API response
        const users = await User.find().select('-passwordHash -pinHash');
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(transactions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
