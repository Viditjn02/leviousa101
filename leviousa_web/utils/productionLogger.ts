/**
 * Production-ready logging utility for web components
 * Conditionally enables/disables console logs based on environment
 */

// Detect if we're in production mode based on multiple factors
const isDevelopment = 
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV !== 'production' ||
  typeof window !== 'undefined' && window.location.hostname.includes('localhost') ||
  typeof window !== 'undefined' && window.location.hostname.includes('127.0.0.1') ||
  typeof window !== 'undefined' && window.location.search.includes('debug=true');

const isProduction = !isDevelopment;

// Create conditional logger for frontend
export const logger = {
    log: isDevelopment ? console.log : () => {},
    info: isDevelopment ? console.info : () => {},
    warn: console.warn, // Always show warnings
    error: console.error, // Always show errors
    debug: isDevelopment ? console.log : () => {},
    
    // Force log for critical messages even in production
    production: console.log,
    
    // Group operations
    group: isDevelopment ? console.group : () => {},
    groupEnd: isDevelopment ? console.groupEnd : () => {},
    
    // Development status
    mode: isDevelopment ? 'development' : 'production'
};

// Log the mode once
if (typeof window !== 'undefined') {
  if (isDevelopment) {
    console.log('[ProductionLogger] 🛠️ Development mode - All logs enabled');
  } else {
    console.log('[ProductionLogger] 🏭 Production mode - Logs minimized');
  }
}

export default logger;
