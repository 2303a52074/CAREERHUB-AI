const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-smart-interview-jwt-secret-key-2025';

async function authMiddleware(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    try {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const verified = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(verified.id);
        if (!user) {
            req.user = { id: verified.id, email: verified.email, role: verified.role || 'user' };
        } else {
            req.user = user;
        }

        next();
    } catch (err) {
        return res.status(400).json({ message: "Invalid Token" });
    }
}

module.exports = authMiddleware;
