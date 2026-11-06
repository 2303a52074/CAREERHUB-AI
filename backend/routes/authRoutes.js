/*Generate authentication routes for user login and registration using Express and JWT*/
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const JWT_SECRET = require('../utils/jwtConfig');
const { validateProfileUpdate } = require('../utils/profileValidation');

const router = express.Router();

/* REGISTER */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (typeof name !== 'string' || !name.trim() ||
            typeof email !== 'string' || !email.trim() ||
            typeof password !== 'string' || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (name.trim().length > 100 || email.trim().length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ message: "Enter a valid name and email address." });
        }
        if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ message: "Password must be 8 to 72 bytes long." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ name: name.trim(), email: normalizedEmail, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: "User registered successfully", user: { id: user._id, name: user.name, email: user.email } });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }
        console.error("Registration error:", err);
        res.status(500).json({ message: "Registration failed. Please try again." });
    }
});

/* LOGIN */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Login failed. Please try again." });
    }
});

/* GET PROFILE */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -calendarRefreshToken');
        res.json(user || req.user);
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

/* UPDATE PROFILE */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const requestedFields = {};
        for (const field of ['name', 'email']) {
            if (req.body[field] !== undefined) requestedFields[field] = req.body[field];
        }
        const { updates, error } = validateProfileUpdate(requestedFields);
        if (error) return res.status(400).json({ message: error });
        if (updates.email) {
            const existing = await User.findOne({ email: updates.email });
            if (existing && String(existing._id) !== String(req.user.id)) {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
        }
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -calendarRefreshToken');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: 'Profile updated successfully.', user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        console.error('Basic profile update failed:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

module.exports = router;
