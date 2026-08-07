const sequelize = require('../config/database');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

class SettlementService {
    constructor() {
        this.mutex = Promise.resolve();
    }

    async settle(instruction, packetHash, bridgeNodeId, hopCount) {
        // SQLite doesn't support concurrent transactions on a single connection.
        // We use a simple promise chain as a mutex to serialize the writes.
        return new Promise((resolve, reject) => {
            this.mutex = this.mutex.then(async () => {
                // Start a database transaction
                const t = await sequelize.transaction();
                try {
                    const sender = await Account.findByPk(instruction.senderVpa, { transaction: t });
                    if (!sender) {
                        throw new Error(`Unknown sender VPA: ${instruction.senderVpa}`);
                    }

                    const receiver = await Account.findByPk(instruction.receiverVpa, { transaction: t });
                    if (!receiver) {
                        throw new Error(`Unknown receiver VPA: ${instruction.receiverVpa}`);
                    }

                    const amount = parseFloat(instruction.amount);
                    if (amount <= 0) {
                        throw new Error("Amount must be positive");
                    }

                    if (parseFloat(sender.balance) < amount) {
                        console.warn(`Insufficient balance: ${sender.vpa} has ₹${sender.balance}, tried to send ₹${amount}`);
                        const tx = await this.recordRejected(instruction, packetHash, bridgeNodeId, hopCount, t);
                        await t.commit();
                        resolve(tx);
                        return;
                    }

                    // Update balances
                    sender.balance = parseFloat(sender.balance) - amount;
                    receiver.balance = parseFloat(receiver.balance) + amount;
                    
                    await sender.save({ transaction: t });
                    await receiver.save({ transaction: t });

                    const tx = await Transaction.create({
                        packetHash,
                        senderVpa: instruction.senderVpa,
                        receiverVpa: instruction.receiverVpa,
                        amount: amount,
                        signedAt: new Date(instruction.signedAt),
                        settledAt: new Date(),
                        bridgeNodeId,
                        hopCount,
                        status: 'SETTLED'
                    }, { transaction: t });

                    await t.commit();

                    console.log(`SETTLED ₹${amount} from ${sender.vpa} to ${receiver.vpa} (packetHash=${packetHash.substring(0, 12)}..., bridge=${bridgeNodeId}, hops=${hopCount})`);
                    resolve(tx);
                } catch (error) {
                    await t.rollback();
                    reject(error);
                }
            }).catch(err => {
                // Catch any errors so the mutex doesn't permanently break
                reject(err);
            });
        });
    }

    async recordRejected(instruction, packetHash, bridgeNodeId, hopCount, t) {
        return await Transaction.create({
            packetHash,
            senderVpa: instruction.senderVpa,
            receiverVpa: instruction.receiverVpa,
            amount: parseFloat(instruction.amount),
            signedAt: new Date(instruction.signedAt),
            settledAt: new Date(),
            bridgeNodeId,
            hopCount,
            status: 'REJECTED'
        }, { transaction: t });
    }
}

module.exports = new SettlementService();
