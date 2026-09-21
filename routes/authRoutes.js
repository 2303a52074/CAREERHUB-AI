/*Generate authentication routes for user login and registration using Express and JWT*/
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ai-smart-interview-jwt-secret-key-2025';

/* REGISTER */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        res.json({ message: "User registered successfully", user: { id: user._id, name: user.name, email: user.email } });

    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Registration failed: " + err.message });
    }
});

/* LOGIN */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials. User not found." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
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
        res.status(500).json({ message: "Login failed: " + err.message });
    }
});

/* QUICK DEMO LOGIN */
router.post('/demo', async (req, res) => {
    try {
        let user = await User.findOne({ email: 'demo@example.com' });
        if (!user) {
            user = (await User.find())[0];
        }
        if (!user) {
            try {
                const hashedPassword = await bcrypt.hash('password123', 10);
                user = new User({
                    name: 'Alex Johnson (Demo)',
                    email: 'demo@example.com',
                    password: hashedPassword,
                    role: 'admin',
                    targetRole: 'Full Stack Developer',
                    skills: ['React', 'Node.js', 'Python', 'Algorithms', 'System Design']
                });
                await user.save();
            } catch (createErr) {
                user = {
                    _id: '659b1234567890abcdef1234',
                    name: 'Alex Johnson (Demo)',
                    email: 'demo@example.com',
                    role: 'admin'
                };
            }
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role || 'admin' },
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
        res.status(500).json({ message: "Demo login failed" });
    }
});

/* GET PROFILE */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user || req.user);
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

/* UPDATE PROFILE */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = name || user.name;
        user.email = email || user.email;

        await user.save();
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error updating profile" });
    }
});

module.exports = router;
