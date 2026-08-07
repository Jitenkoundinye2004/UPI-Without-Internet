const crypto = require('crypto');
const serverKeyHolder = require('./ServerKeyHolder');

class HybridCryptoService {

    async encrypt(instruction, publicKeyBase64) {
        const plaintext = JSON.stringify(instruction);
        
        // 1. Generate one-time AES key (256 bits = 32 bytes)
        const aesKey = crypto.randomBytes(32);
        
        // 2. AES-GCM encrypt payload
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
        
        let encryptedPayload = cipher.update(plaintext, 'utf8');
        encryptedPayload = Buffer.concat([encryptedPayload, cipher.final()]);
        const tag = cipher.getAuthTag(); // 16 bytes
        
        // 3. RSA-OAEP encrypt AES key
        const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
        const publicKey = crypto.createPublicKey({
            key: publicKeyBuffer,
            format: 'der',
            type: 'spki'
        });
        
        const encryptedAesKey = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        }, aesKey);

        // 4. Pack: [encrypted AES key 256 bytes][IV 12 bytes][AES ciphertext][tag 16 bytes]
        // Java's cipher.doFinal appends the tag to the end of the ciphertext.
        const packed = Buffer.concat([
            encryptedAesKey,
            iv,
            encryptedPayload,
            tag
        ]);
        
        return packed.toString('base64');
    }
    
    async decrypt(base64Ciphertext) {
        const all = Buffer.from(base64Ciphertext, 'base64');
        
        const RSA_ENCRYPTED_KEY_BYTES = 256;
        const GCM_IV_BYTES = 12;
        const GCM_TAG_BYTES = 16;
        
        if (all.length < RSA_ENCRYPTED_KEY_BYTES + GCM_IV_BYTES + GCM_TAG_BYTES) {
            throw new Error("Ciphertext too short");
        }
        
        // Unpack
        let offset = 0;
        const encryptedAesKey = all.subarray(offset, offset + RSA_ENCRYPTED_KEY_BYTES);
        offset += RSA_ENCRYPTED_KEY_BYTES;
        
        const iv = all.subarray(offset, offset + GCM_IV_BYTES);
        offset += GCM_IV_BYTES;
        
        const aesCiphertextLength = all.length - offset - GCM_TAG_BYTES;
        const aesCiphertext = all.subarray(offset, offset + aesCiphertextLength);
        offset += aesCiphertextLength;
        
        const tag = all.subarray(offset, offset + GCM_TAG_BYTES);
        
        // 1. RSA-decrypt the AES key
        let aesKey;
        try {
            aesKey = crypto.privateDecrypt({
                key: serverKeyHolder.getPrivateKey(),
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, encryptedAesKey);
        } catch (e) {
            throw new Error("Failed to decrypt AES key: " + e.message);
        }
        
        // 2. AES-GCM decrypt + verify tag
        try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(aesCiphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return JSON.parse(decrypted.toString('utf8'));
        } catch (e) {
            throw new Error("Failed to decrypt payload: " + e.message);
        }
    }
    
    hashCiphertext(base64Ciphertext) {
        return crypto.createHash('sha256').update(base64Ciphertext).digest('hex');
    }
}

module.exports = new HybridCryptoService();
