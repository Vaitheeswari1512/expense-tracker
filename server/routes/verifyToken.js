const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('auth-token');
    if (!token) return res.status(401).send('Access Denied');

    // Bypass for offline dummy tokens (Development mode)
    if (token.startsWith('offline-dummy-token')) {
        req.user = { _id: req.body.userId || req.header('userId') };
        return next();
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};
