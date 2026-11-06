function requireMongo(req, res, next) {
    if (req.app.locals?.mongo?.readyState === 1) return next();
    return res.status(503).json({
        code: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB is unavailable. Persistent application data cannot be accessed right now.'
    });
}

module.exports = requireMongo;
