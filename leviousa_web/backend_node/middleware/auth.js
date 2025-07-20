function identifyUser(req, res, next) {
    const userId = req.get('X-User-ID');

    if (userId) {
        req.uid = userId;
    } else {
        // No user ID provided - Firebase authentication required
        return res.status(401).json({ 
            error: 'Authentication required', 
            message: 'X-User-ID header is required for API access' 
        });
    }
    
    next();
}

module.exports = { identifyUser }; 