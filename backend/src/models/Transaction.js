const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    packetId: {
        type: String,
        required: true,
        unique: true // Prevents replay attacks automatically
    },
    senderVpa: {
        type: String,
        required: true,
        index: true
    },
    receiverVpa: {
        type: String,
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['SETTLED', 'REJECTED', 'INVALID'],
        required: true
    },
    bridgeNodeId: {
        type: String,
        default: null
    },
    hopCount: {
        type: Number,
        default: 0
    },
    failureReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
