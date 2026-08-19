const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['REGISTER', 'RESET_PASSWORD', 'RESET_PIN'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '5m' } // Automatically delete document after 5 minutes
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('OTP', otpSchema);
