const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { vpa, email, holderName, password, pin, publicKey } = req.body;

        if (!vpa || !email || !holderName || !password || !pin || !publicKey) {
            return res.status(400).json({ error: 'Please add all required fields, including email and publicKey' });
        }

        // Strong Validations
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (!/^\d{4}$/.test(pin.toString())) {
            return res.status(400).json({ error: 'Offline PIN must be exactly 4 digits' });
        }

        // Check if user exists (by VPA or Email)
        const vpaExists = await User.findOne({ vpa: vpa.toLowerCase() });
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        
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
            email: email.toLowerCase(),
            holderName,
            passwordHash,
            pinHash,
            publicKey,
            balance: 1000.00
        });

        if (user) {
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

module.exports = {
    registerUser,
    loginUser,
    getMe
};
