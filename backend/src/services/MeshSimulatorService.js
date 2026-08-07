class VirtualDevice {
    constructor(deviceId, hasInternet) {
        this.deviceId = deviceId;
        this.hasInternet = hasInternet;
        this.heldPackets = new Map();
    }

    hold(packet) {
        if (!this.heldPackets.has(packet.packetId)) {
            this.heldPackets.set(packet.packetId, packet);
        }
    }

    getHeldPackets() {
        return Array.from(this.heldPackets.values());
    }

    holds(packetId) {
        return this.heldPackets.has(packetId);
    }

    packetCount() {
        return this.heldPackets.size;
    }

    clear() {
        this.heldPackets.clear();
    }
}

class MeshSimulatorService {
    constructor() {
        this.devices = new Map();
        this.seedDefaultDevices();
    }

    seedDefaultDevices() {
        this.devices.set('phone-alice', new VirtualDevice('phone-alice', false));
        this.devices.set('phone-stranger1', new VirtualDevice('phone-stranger1', false));
        this.devices.set('phone-stranger2', new VirtualDevice('phone-stranger2', false));
        this.devices.set('phone-stranger3', new VirtualDevice('phone-stranger3', false));
        this.devices.set('phone-bridge', new VirtualDevice('phone-bridge', true));
    }

    getDevices() {
        return Array.from(this.devices.values());
    }

    getDevice(id) {
        return this.devices.get(id);
    }

    inject(senderDeviceId, packet) {
        const sender = this.devices.get(senderDeviceId);
        if (!sender) {
            throw new Error(`Unknown device: ${senderDeviceId}`);
        }
        sender.hold(packet);
        console.log(`Packet ${packet.packetId.substring(0, 8)} injected at ${senderDeviceId} (TTL=${packet.ttl})`);
    }

    gossipOnce() {
        let transfers = 0;
        const deviceList = Array.from(this.devices.values());
        
        // Snapshot
        const snapshot = new Map();
        for (const d of deviceList) {
            snapshot.set(d.deviceId, [...d.getHeldPackets()]);
        }

        for (const src of deviceList) {
            const packets = snapshot.get(src.deviceId);
            for (const pkt of packets) {
                if (pkt.ttl <= 0) continue;
                
                for (const dst of deviceList) {
                    if (dst === src) continue;
                    if (dst.holds(pkt.packetId)) continue;
                    
                    const copy = {
                        packetId: pkt.packetId,
                        ttl: pkt.ttl - 1,
                        createdAt: pkt.createdAt,
                        ciphertext: pkt.ciphertext
                    };
                    dst.hold(copy);
                    transfers++;
                }
            }
        }

        console.log(`Gossip round complete: ${transfers} packet transfers`);
        return {
            transfers,
            deviceCounts: this.snapshotMap()
        };
    }

    snapshotMap() {
        const m = {};
        for (const d of this.devices.values()) {
            m[d.deviceId] = d.packetCount();
        }
        return m;
    }

    collectBridgeUploads() {
        const out = [];
        for (const d of this.devices.values()) {
            if (!d.hasInternet) continue;
            for (const pkt of d.getHeldPackets()) {
                out.push({ bridgeNodeId: d.deviceId, packet: pkt });
            }
        }
        return out;
    }

    resetMesh() {
        for (const d of this.devices.values()) {
            d.clear();
        }
    }
}

module.exports = new MeshSimulatorService();
