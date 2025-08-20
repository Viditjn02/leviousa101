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

    app.use(express.json());

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

    // Apply authentication middleware to other API routes
    app.use('/api', identifyUser);

    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/user', require('./routes/user'));
    app.use('/api/conversations', require('./routes/conversations'));
    app.use('/api/presets', require('./routes/presets'));

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
