/**
 * Production-ready logging utility
 * Conditionally enables/disables console logs based on environment
 */

const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.argv.includes('--dev') ||
                     !process.execPath.includes('/Applications/') && !process.execPath.includes('/Volumes/');

const isDistribution = process.execPath.includes('/Applications/') || 
                      process.execPath.includes('/Volumes/') ||
                      process.env.NODE_ENV === 'production';

// Create conditional logger
const logger = {
    log: isDevelopment ? console.log : () => {},
    info: isDevelopment ? console.info : () => {},
    warn: console.warn, // Always show warnings
    error: console.error, // Always show errors
    debug: isDevelopment ? console.log : () => {},
    
    // Force log for critical messages even in production
    production: console.log
};

// Development status
if (isDevelopment) {
    console.log('[Logger] 🛠️ Development mode - All logs enabled');
} else {
    console.log('[Logger] 🏭 Production mode - Logs minimized');
}

module.exports = logger;
