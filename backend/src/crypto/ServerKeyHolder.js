const crypto = require('crypto');

class ServerKeyHolder {
    constructor() {
        this.keyPair = null;
    }

    init() {
        this.keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'der'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'der'
            }
        });
        console.log(`Server RSA keypair generated (2048-bit). Public key fingerprint: ${this.getPublicKeyBase64().substring(0, 32)}...`);
    }

    getPublicKey() {
        return crypto.createPublicKey({
            key: this.keyPair.publicKey,
            format: 'der',
            type: 'spki'
        });
    }

    getPrivateKey() {
        return crypto.createPrivateKey({
            key: this.keyPair.privateKey,
            format: 'der',
            type: 'pkcs8'
        });
    }

    getPublicKeyBase64() {
        return this.keyPair.publicKey.toString('base64');
    }
}

const serverKeyHolder = new ServerKeyHolder();
module.exports = serverKeyHolder;
