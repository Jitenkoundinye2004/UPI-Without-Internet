const cryptoService = require('../crypto/HybridCryptoService');
const idempotency = require('./IdempotencyService');
const settlement = require('./SettlementService');

class BridgeIngestionService {

    constructor() {
        this.maxAgeSeconds = 86400; // 1 day
    }

    async ingest(packet, bridgeNodeId, hopCount) {
        try {
            const packetHash = cryptoService.hashCiphertext(packet.ciphertext);

            // ---- Idempotency gate ----
            if (!idempotency.claim(packetHash)) {
                console.log(`DUPLICATE packet ${packetHash.substring(0, 12)}... from bridge ${bridgeNodeId} — dropped`);
                return { outcome: 'DUPLICATE_DROPPED', packetHash, reason: null, transactionId: null };
            }

            // ---- Decrypt ----
            let instruction;
            try {
                instruction = await cryptoService.decrypt(packet.ciphertext);
            } catch (e) {
                console.warn(`Decryption failed for packet ${packetHash.substring(0, 12)}...: ${e.message}`);
                return { outcome: 'INVALID', packetHash, reason: 'decryption_failed', transactionId: null };
            }

            // ---- Freshness check (replay protection) ----
            const ageSeconds = (Date.now() - instruction.signedAt) / 1000;
            if (ageSeconds > this.maxAgeSeconds) {
                console.warn(`Packet ${packetHash.substring(0, 12)}... too old (${ageSeconds}s), rejected`);
                return { outcome: 'INVALID', packetHash, reason: 'stale_packet', transactionId: null };
            }
            if (ageSeconds < -300) { // clock skew tolerance
                return { outcome: 'INVALID', packetHash, reason: 'future_dated', transactionId: null };
            }

            // ---- Settle ----
            const tx = await settlement.settle(instruction, packetHash, bridgeNodeId, hopCount);
            return { outcome: 'SETTLED', packetHash, reason: null, transactionId: tx.id };

        } catch (e) {
            console.error(`Ingestion error: ${e.message}`);
            return { outcome: 'INVALID', packetHash: '?', reason: 'internal_error: ' + e.message, transactionId: null };
        }
    }
}

module.exports = new BridgeIngestionService();
