const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = require('../utils/jwtConfig');

async function authMiddleware(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    let verified;
    try {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        verified = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }

    try {
        const user = await User.findById(verified.id);
        if (!user) {
            return res.status(401).json({ message: "Invalid token: account no longer exists." });
        }
        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = authMiddleware;
