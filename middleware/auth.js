const jwt = require('jsonwebtoken');

// JWT Secret - use environment variable with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    // Extract token from Authorization header (Bearer TOKEN)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request object
        req.user = decoded; // Contains: { id, email, role }

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
};

// Middleware to require specific role
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                error: 'Access forbidden. Insufficient permissions.'
            });
        }
        next();
    };
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required'
        });
    }
    next();
};

module.exports = { authenticateToken, requireRole, requireAdmin, JWT_SECRET };
