const express = require('express');
const cors = require('cors');
// const db = require('./db'); // No longer needed
const { identifyUser } = require('./middleware/auth');

function createApp(eventBridge) {
    const app = express();

    const webUrl = process.env.leviousa_WEB_URL || 'https://www.leviousa.com';
    console.log(`🔧 Backend CORS configured for: ${webUrl}`);
    
    // Allow requests from both Firebase hosting and localhost development
    const allowedOrigins = [
        webUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
    
    console.log(`🔧 CORS allowed origins:`, allowedOrigins);

    app.use(cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, etc.)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn(`🚫 CORS blocked request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));

    app.use(express.json({ limit: '50mb' }));
    
    // Set proper charset for all responses
    app.use((req, res, next) => {
        res.set('Content-Type', 'application/json; charset=utf-8');
        next();
    });

    app.get('/', (req, res) => {
        res.json({ message: "leviousa API is running" });
    });

    app.use((req, res, next) => {
        req.bridge = eventBridge;
        next();
    });

    // Authentication notification endpoint (no auth required)
    app.post('/api/auth/notify-completion', (req, res) => {
        try {
            const { serviceKey, status, error, timestamp } = req.body;
            
            console.log(`[Backend API] 🔔 Authentication notification received for ${serviceKey}:`, { status, error });
            
            if (!serviceKey) {
                return res.status(400).json({
                    success: false,
                    error: 'serviceKey is required'
                });
            }
            
            // Forward notification to Electron app via event bridge
            if (req.bridge && req.bridge.notifyAuthenticationComplete) {
                req.bridge.notifyAuthenticationComplete({
                    serviceKey,
                    status: status || 'authenticated',
                    error,
                    timestamp: timestamp || new Date().toISOString(),
                    source: 'browser'
                });
                
                console.log(`[Backend API] ✅ Forwarded authentication notification to Electron for ${serviceKey}`);
                
                res.json({
                    success: true,
                    message: `Authentication notification forwarded for ${serviceKey}`,
                    serviceKey
                });
            } else {
                console.warn(`[Backend API] ⚠️ Event bridge not available for authentication notification`);
                res.json({
                    success: false,
                    error: 'Event bridge not available',
                    serviceKey
                });
            }
        } catch (error) {
            console.error(`[Backend API] ❌ Error handling authentication notification:`, error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Paragon token generation route (CRITICAL - must be BEFORE auth middleware)
    app.get('/api/paragonToken', async (req, res) => {
        const jwt = require('jsonwebtoken');
        
        let signingKey = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;
        const projectId = process.env.PARAGON_PROJECT_ID || process.env.PROJECT_ID;
        
        if (!signingKey || !projectId) {
            return res.status(500).json({ error: 'Paragon not configured' });
        }
        
        // Process the signing key - remove quotes and fix newlines
        if (signingKey.startsWith('"') && signingKey.endsWith('"')) {
            signingKey = signingKey.slice(1, -1);
        }
        signingKey = signingKey.replace(/\\n/g, '\n');
        
        const userId = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId || 'default-user';
        const now = Math.floor(Date.now() / 1000);
        
        try {
            const token = jwt.sign(
                {
                    sub: userId,
                    aud: `useparagon.com/${projectId}`, // Required audience for Paragon headless connect portal
                    iat: now,
                    exp: now + (24 * 60 * 60), // 24 hours for better persistence
                },
                signingKey,
                { algorithm: 'RS256' }
            );
            
            // Token generated successfully
            console.log(`[API] ✅ Generated Paragon token for user: ${userId}`);
            return res.status(200).json({ userToken: token });
        } catch (err) {
            // Token generation failed
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[API] ❌ Paragon token generation failed:`, errorMessage);
            return res.status(500).json({ error: 'Failed to generate token', details: errorMessage });
        }
    });

    // Apply authentication middleware to other API routes
    app.use('/api', identifyUser);

    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/user', require('./routes/user'));
    app.use('/api/conversations', require('./routes/conversations'));
    app.use('/api/presets', require('./routes/presets'));

    // 🔒 Subscription access check endpoint (simplified for testing)
    app.post('/api/subscription/check-access', async (req, res) => {
        try {
            const { featureType } = req.body;
            
            if (!featureType) {
                return res.status(400).json({
                    allowed: false,
                    message: 'Feature type is required',
                    requiresUpgrade: true
                });
            }

            // Get Firebase auth token and decode it
            let userId = 'guest-user';
            let email = null;
            
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    // Simple JWT decode for user info (same as other endpoints)
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
                        userId = payload.user_id || payload.sub || payload.uid || 'guest-user';
                        email = payload.email || null;
                        console.log(`[API] 🔑 Subscription check for authenticated user: ${userId} (${email})`);
                    }
                } catch (error) {
                    console.log('[API] ⚠️ Token decode failed, using guest access');
                }
            } else {
                console.log('[API] ⚠️ No auth token provided, using guest access');
            }

            // Check if this is a special email (gets Pro access)
            const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com'];
            const isSpecialEmail = email && specialEmails.includes(email);
            
            console.log(`[API] 🧪 Checking access for user: ${userId}, email: ${email}, featureType: ${featureType}, isSpecial: ${isSpecialEmail}`);

            // 🧪 SIMPLIFIED TEST: Check if this is the Pro user or special email
            if (userId === 'vqLrzGnqajPGlX9Wzq89SgqVPsN2' || isSpecialEmail) {
                console.log('[API] ✅ Pro user detected (viditjn02@gmail.com)');
                
                if (featureType === 'integrations') {
                    // Grant Pro user full integration access
                    res.set('Content-Type', 'application/json; charset=utf-8');
                    return res.json({
                        allowed: true,
                        plan: 'pro',
                        message: 'Pro user - integration access granted',
                        requiresUpgrade: false,
                        specialEmail: true,
                        testMode: true
                    });
                } else {
                    // Grant unlimited usage for other features
                    res.set('Content-Type', 'application/json; charset=utf-8');
                    return res.json({
                        allowed: true,
                        plan: 'pro', 
                        message: 'Pro user - unlimited access',
                        requiresUpgrade: false,
                        usage: 0,
                        limit: -1,
                        remaining: -1,
                        testMode: true
                    });
                }
            } else {
                console.log('[API] 🆓 Free user detected');
                
                if (featureType === 'integrations') {
                    // Block free users from integrations
                    res.set('Content-Type', 'application/json; charset=utf-8');
                    return res.json({
                        allowed: false,
                        plan: 'free',
                        message: 'Integration access requires Leviousa Pro',
                        requiresUpgrade: true,
                        testMode: true
                    });
                } else {
                    // Free users get limited usage
                    res.set('Content-Type', 'application/json; charset=utf-8');
                    return res.json({
                        allowed: true,
                        plan: 'free',
                        message: 'Limited access - upgrade for unlimited',
                        requiresUpgrade: false,
                        usage: 5,
                        limit: 10,
                        remaining: 5,
                        testMode: true
                    });
                }
            }

        } catch (error) {
            console.error('[API] ❌ Simplified subscription check error:', error);
            res.set('Content-Type', 'application/json; charset=utf-8');
            res.status(500).json({
                allowed: false,
                message: 'Subscription check failed',
                requiresUpgrade: true,
                error: error.message,
                testMode: true
            });
        }
    });

    app.get('/api/sync/status', (req, res) => {
        res.json({
            status: 'online',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    });

    app.post('/api/desktop/set-user', (req, res) => {
        res.json({
            success: true,
            message: "Direct IPC communication is now used. This endpoint is deprecated.",
            user: req.body,
            deprecated: true
        });
    });

    app.get('/api/desktop/status', (req, res) => {
        res.json({
            connected: true,
            current_user: null,
            communication_method: "IPC",
            file_based_deprecated: true
        });
    });

    return app;
}

module.exports = createApp;
