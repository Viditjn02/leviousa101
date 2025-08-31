function identifyUser(req, res, next) {
    const userId = req.get('X-User-ID');

    if (userId) {
        req.uid = userId;
        req.user = { uid: userId }; // Add user object for compatibility
        console.log(`[AuthMiddleware] ✅ User identified: ${userId}`);
    } else {
        console.log('[AuthMiddleware] ❌ No X-User-ID header provided');
        return res.status(401).json({ 
            error: 'Authentication required', 
            message: 'X-User-ID header is required for API access' 
        });
    }
    
    next();
}

module.exports = { identifyUser }; 