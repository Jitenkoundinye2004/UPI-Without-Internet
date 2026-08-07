class IdempotencyService {
    constructor() {
        this.seen = new Map();
        this.ttlSeconds = 86400; // 1 day
        
        // Periodically evict expired entries (every 60s)
        setInterval(() => this.evictExpired(), 60000);
    }

    claim(packetHash) {
        const now = Date.now();
        if (this.seen.has(packetHash)) {
            return false;
        }
        this.seen.set(packetHash, now);
        return true;
    }

    size() {
        return this.seen.size;
    }

    evictExpired() {
        const cutoff = Date.now() - (this.ttlSeconds * 1000);
        for (const [hash, time] of this.seen.entries()) {
            if (time < cutoff) {
                this.seen.delete(hash);
            }
        }
    }

    clear() {
        this.seen.clear();
    }
}

module.exports = new IdempotencyService();
