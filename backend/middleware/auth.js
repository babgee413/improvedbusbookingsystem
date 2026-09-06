const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verifies the JWT sent in the Authorization header (Bearer token)
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, email }
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
}

// Restricts a route to specific roles, e.g. requireRole('admin')
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action.' });
        }
        next();
    };
}

module.exports = { verifyToken, requireRole };
