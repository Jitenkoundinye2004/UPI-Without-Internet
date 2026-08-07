const express = require('express');
const router = express.Router();

const serverKeyHolder = require('../crypto/ServerKeyHolder');
const demo = require('../services/DemoService');
const mesh = require('../services/MeshSimulatorService');
const bridge = require('../services/BridgeIngestionService');
const idempotency = require('../services/IdempotencyService');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

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

        const startDevice = reqBody.startDevice == null ? "phone-alice" : reqBody.startDevice;
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

// ------------------------------------------------------------- accounts
router.get('/accounts', async (req, res) => {
    const accounts = await Account.findAll();
    res.json(accounts);
});

router.get('/transactions', async (req, res) => {
    const transactions = await Transaction.findAll({
        order: [['id', 'DESC']],
        limit: 20
    });
    res.json(transactions);
});

module.exports = router;
