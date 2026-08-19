const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendEmail } = require('../services/emailService');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Helper to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Send OTP for Registration
// @route   POST /api/auth/send-register-otp
// @access  Public
const sendRegisterOtp = async (req, res) => {
    try {
        const { email, vpa } = req.body;
        
        if (!email || !vpa) {
            return res.status(400).json({ error: 'Please provide email and vpa' });
        }

        const emailLower = email.toLowerCase();
        
        // Check if user exists
        const emailExists = await User.findOne({ email: emailLower });
        if (emailExists) return res.status(400).json({ error: 'Email is already registered' });
        
        const vpaExists = await User.findOne({ vpa: vpa.toLowerCase() });
        if (vpaExists) return res.status(400).json({ error: 'VPA is already taken' });

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save/Update OTP
        await OTP.findOneAndUpdate(
            { email: emailLower, type: 'REGISTER' },
            { otp: otpCode, expiresAt },
            { upsert: true, new: true }
        );

        // Send Email
        await sendEmail(
            emailLower, 
            'MeshPay - Registration Verification Code', 
            `Your MeshPay verification code is: ${otpCode}. It expires in 5 minutes.`,
            `<p>Your MeshPay verification code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`
        );

        res.status(200).json({ message: 'OTP sent successfully to email' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { vpa, email, holderName, password, pin, publicKey, otp } = req.body;

        if (!vpa || !email || !holderName || !password || !pin || !publicKey || !otp) {
            return res.status(400).json({ error: 'Please add all required fields, including OTP' });
        }

        const emailLower = email.toLowerCase();

        // Strong Validations
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailLower)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (!/^\d{4}$/.test(pin.toString())) {
            return res.status(400).json({ error: 'Offline PIN must be exactly 4 digits' });
        }

        // Verify OTP
        const validOtp = await OTP.findOne({ 
            email: emailLower, 
            type: 'REGISTER',
            otp,
            expiresAt: { $gt: new Date() }
        });

        if (!validOtp) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Check if user exists (by VPA or Email) again for safety
        const vpaExists = await User.findOne({ vpa: vpa.toLowerCase() });
        const emailExists = await User.findOne({ email: emailLower });
        
        if (vpaExists) return res.status(400).json({ error: 'VPA is already taken' });
        if (emailExists) return res.status(400).json({ error: 'Email is already registered' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Hash PIN
        const pinHash = await bcrypt.hash(pin.toString(), salt);

        // Create user
        const user = await User.create({
            vpa,
            email: emailLower,
            holderName,
            passwordHash,
            pinHash,
            publicKey,
            balance: 1000.00
        });

        if (user) {
            // Cleanup OTP
            await OTP.deleteOne({ _id: validOtp._id });

            res.status(201).json({
                _id: user.id,
                vpa: user.vpa,
                holderName: user.holderName,
                balance: user.balance,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            res.json({
                _id: user.id,
                vpa: user.vpa,
                email: user.email,
                holderName: user.holderName,
                balance: user.balance,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

// @desc    Forgot Password (Send OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const emailLower = email.toLowerCase();
        const user = await User.findOne({ email: emailLower });
        if (!user) {
            // For security, don't reveal if user exists, just return success
            return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
        }

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await OTP.findOneAndUpdate(
            { email: emailLower, type: 'RESET_PASSWORD' },
            { otp: otpCode, expiresAt },
            { upsert: true, new: true }
        );

        await sendEmail(
            emailLower, 
            'MeshPay - Password Reset Code', 
            `Your password reset code is: ${otpCode}. It expires in 5 minutes.`,
            `<p>Your password reset code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`
        );

        res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const emailLower = email.toLowerCase();
        const validOtp = await OTP.findOne({ 
            email: emailLower, 
            type: 'RESET_PASSWORD',
            otp,
            expiresAt: { $gt: new Date() }
        });

        if (!validOtp) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const user = await User.findOne({ email: emailLower });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        await OTP.deleteOne({ _id: validOtp._id });

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Forgot UPI PIN (Send OTP)
// @route   POST /api/auth/forgot-pin
// @access  Public
const forgotPin = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const emailLower = email.toLowerCase();
        const user = await User.findOne({ email: emailLower });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await OTP.findOneAndUpdate(
            { email: emailLower, type: 'RESET_PIN' },
            { otp: otpCode, expiresAt },
            { upsert: true, new: true }
        );

        await sendEmail(
            emailLower, 
            'MeshPay - UPI PIN Reset Code', 
            `Your offline transaction PIN reset code is: ${otpCode}. It expires in 5 minutes.`,
            `<p>Your offline transaction PIN reset code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`
        );

        res.status(200).json({ message: 'OTP sent to email' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Reset UPI PIN
// @route   POST /api/auth/reset-pin
// @access  Public
const resetPin = async (req, res) => {
    try {
        const { email, otp, newPin } = req.body;
        if (!email || !otp || !newPin) return res.status(400).json({ error: 'Missing required fields' });

        if (!/^\d{4}$/.test(newPin.toString())) {
            return res.status(400).json({ error: 'Offline PIN must be exactly 4 digits' });
        }

        const emailLower = email.toLowerCase();
        const validOtp = await OTP.findOne({ 
            email: emailLower, 
            type: 'RESET_PIN',
            otp,
            expiresAt: { $gt: new Date() }
        });

        if (!validOtp) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const user = await User.findOne({ email: emailLower });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.pinHash = await bcrypt.hash(newPin.toString(), salt);
        await user.save();

        await OTP.deleteOne({ _id: validOtp._id });

        res.status(200).json({ message: 'UPI PIN reset successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    sendRegisterOtp,
    registerUser,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword,
    forgotPin,
    resetPin
};
