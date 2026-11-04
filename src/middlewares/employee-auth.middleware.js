const env = require('../config/env');
const jwt = require('jsonwebtoken');

const requireEmployee = (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
        }

        const secret = env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        
        // Attach the decoded token payload to the request object
        req.user = decoded;
        
        next();
    } catch (err) {
        console.error('Employee Authentication Error:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = { requireEmployee };
