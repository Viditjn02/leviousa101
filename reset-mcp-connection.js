#!/usr/bin/env node

/**
 * Reset MCP Connection Script
 * This script will reset the circuit breaker and restart the MCP connection
 */

const { ipcRenderer } = require('electron');

async function resetMCPConnection() {
    console.log('🔄 Resetting MCP Connection...');
    
    try {
        // Call the main process to reset the circuit breaker
        if (typeof window !== 'undefined' && window.api?.mcp) {
            console.log('🌐 Browser context - using window.api');
            
            // Reset circuit breaker
            if (window.api.mcp.resetCircuitBreaker) {
                await window.api.mcp.resetCircuitBreaker();
                console.log('✅ Circuit breaker reset');
            }
            
            // Restart MCP client
            if (window.api.mcp.restart) {
                await window.api.mcp.restart();
                console.log('✅ MCP client restarted');
            }
            
        } else if (typeof process !== 'undefined' && process.type === 'renderer') {
            console.log('🖥️ Electron renderer - using IPC');
            
            // Send IPC message to reset circuit breaker
            await ipcRenderer.invoke('mcp:reset-circuit-breaker');
            console.log('✅ Circuit breaker reset via IPC');
            
            // Send IPC message to restart MCP client
            await ipcRenderer.invoke('mcp:restart');
            console.log('✅ MCP client restarted via IPC');
            
        } else {
            console.log('❌ Not in a supported context. Please restart the application.');
            return false;
        }
        
        console.log('🎉 MCP connection reset complete!');
        console.log('📊 Gmail authentication should now be detected.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to reset MCP connection:', error.message);
        return false;
    }
}

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = resetMCPConnection;
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
    window.resetMCPConnection = resetMCPConnection;
    console.log('🔧 MCP reset function available as window.resetMCPConnection()');
} else {
    resetMCPConnection();
}
