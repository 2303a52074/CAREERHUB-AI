const crypto = require('crypto');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
}

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not configured; using a temporary development-only secret. Sessions will expire on restart.');
}

module.exports = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
