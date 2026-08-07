const Account = require('../models/Account');
const cryptoService = require('../crypto/HybridCryptoService');
const serverKeyHolder = require('../crypto/ServerKeyHolder');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class DemoService {

    async seedAccounts() {
        const count = await Account.count();
        if (count === 0) {
            await Account.bulkCreate([
                { vpa: 'jiten@demo', holderName: 'Jiten', balance: 5000.00 },
                { vpa: 'janhavi@demo', holderName: 'Janhavi', balance: 1000.00 },
                { vpa: 'suhani@demo', holderName: 'Suhani', balance: 2500.00 },
                { vpa: 'apeksha@demo', holderName: 'Apeksha', balance: 500.00 }
            ]);
            console.log("Seeded 4 demo accounts");
        }
    }

    async createPacket(senderVpa, receiverVpa, amount, pin, ttl) {
        const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
        
        const instruction = {
            senderVpa,
            receiverVpa,
            amount,
            pinHash,
            nonce: uuidv4(),
            signedAt: Date.now()
        };

        const ciphertext = await cryptoService.encrypt(instruction, serverKeyHolder.getPublicKeyBase64());

        return {
            packetId: uuidv4(),
            ttl: ttl,
            createdAt: Date.now(),
            ciphertext: ciphertext
        };
    }
}

module.exports = new DemoService();
