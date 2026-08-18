const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    vpa: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    holderName: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    pinHash: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0.00,
        min: 0 // Prevents negative balance at the DB level
    },
    publicKey: {
        type: String, // We will use this in Phase 2 for Cryptographic Verification
        default: null
    }
}, {
    timestamps: true,
    optimisticConcurrency: true // Mongoose's built-in versioning (__v) to prevent race conditions
});

module.exports = mongoose.model('User', userSchema);
