// Privacy Protection Module for Leviousa
// Prevents windows from being captured by screen recording and remote desktop software

const { BrowserWindow } = require('electron');
const os = require('os');

// Windows API constants
const WDA_NONE = 0x00000000;
const WDA_MONITOR = 0x00000001;
const WDA_EXCLUDEFROMCAPTURE = 0x00000011;

// Check if running on supported Windows version
function isWindows10Version2004OrHigher() {
    if (process.platform !== 'win32') return false;
    
    const release = os.release();
    const [major, minor, build] = release.split('.').map(Number);
    
    // Windows 10 version 2004 is build 19041
    return major === 10 && build >= 19041;
}

// Platform-specific protection
function setWindowPrivacy(window, excludeFromCapture = true) {
    if (!window || window.isDestroyed()) return;
    
    console.log(`[Privacy] Setting privacy for window: ${excludeFromCapture ? 'HIDDEN' : 'VISIBLE'}`);
    
    if (process.platform === 'win32') {
        // Windows: Use SetWindowDisplayAffinity
        try {
            // Check if we support WDA_EXCLUDEFROMCAPTURE
            const useExcludeFlag = isWindows10Version2004OrHigher();
            
            // Try to use native binding if available
            if (window.setWindowDisplayAffinity) {
                const affinity = excludeFromCapture 
                    ? (useExcludeFlag ? WDA_EXCLUDEFROMCAPTURE : WDA_MONITOR)
                    : WDA_NONE;
                    
                window.setWindowDisplayAffinity(affinity);
                console.log(`[Privacy] Applied display affinity: ${affinity}`);
            } else {
                // Fallback to FFI if needed
                const ffi = require('ffi-napi');
                const ref = require('ref-napi');
                
                const user32 = ffi.Library('user32', {
                    'SetWindowDisplayAffinity': ['bool', ['pointer', 'uint32']]
                });
                
                const hwnd = window.getNativeWindowHandle();
                const affinity = excludeFromCapture 
                    ? (useExcludeFlag ? WDA_EXCLUDEFROMCAPTURE : WDA_MONITOR)
                    : WDA_NONE;
                    
                const result = user32.SetWindowDisplayAffinity(hwnd, affinity);
                
                if (result) {
                    console.log(`[Privacy] Successfully set display affinity: ${affinity}`);
                } else {
                    console.error('[Privacy] Failed to set window display affinity');
                }
            }
        } catch (error) {
            console.error('[Privacy] Error setting window privacy:', error);
            console.log('[Privacy] Falling back to content protection');
            window.setContentProtection(excludeFromCapture);
        }
    } else if (process.platform === 'darwin') {
        // macOS: Use multiple techniques
        // 1. Content protection (already implemented in Leviousa)
        window.setContentProtection(excludeFromCapture);
        
        // 2. Set window level to make it harder to capture
        if (excludeFromCapture) {
            // Set to screen saver level which is often excluded from captures
            window.setAlwaysOnTop(true, 'screen-saver');
            
            // Additional macOS privacy settings
            window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
            
            // Disable window shadows (makes it harder to detect)
            window.setHasShadow(false);
        } else {
            window.setAlwaysOnTop(false);
            window.setHasShadow(true);
        }
        
        console.log('[Privacy] Applied macOS privacy settings');
    } else {
        // Linux: Limited options, use content protection
        window.setContentProtection(excludeFromCapture);
        console.log('[Privacy] Applied content protection (Linux)');
    }
}

// Enhanced window creation with privacy
function createPrivateWindow(options = {}) {
    const path = require('node:path');
    
    // Set icon based on platform
    const getIconPath = () => {
        if (process.platform === 'darwin') {
            return path.join(__dirname, '../ui/assets/logo.icns');
        } else if (process.platform === 'win32') {
            return path.join(__dirname, '../ui/assets/logo.ico');
        } else {
            return path.join(__dirname, '../ui/assets/logo.png');
        }
    };

    const defaultOptions = {
        show: false,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        roundedCorners: false,
        hasShadow: false,
        enableLargerThanScreen: true,
        paintWhenInitiallyHidden: false,
        icon: getIconPath(),
        // Additional privacy-focused options
        focusable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        movable: true,
        resizable: false,
    };
    
    const window = new BrowserWindow({ ...defaultOptions, ...options });
    
    // Apply privacy protection immediately
    setWindowPrivacy(window, true);
    
    // Reapply on show to ensure it persists
    window.on('show', () => {
        setWindowPrivacy(window, true);
    });
    
    return window;
}

// Detect remote access attempts
function detectRemoteAccess() {
    if (process.platform === 'win32') {
        try {
            // Method 1: Check for Remote Desktop session
            const ffi = require('ffi-napi');
            const user32 = ffi.Library('user32', {
                'GetSystemMetrics': ['int', ['int']]
            });
            
            const SM_REMOTESESSION = 0x1000;
            const isRemoteSession = user32.GetSystemMetrics(SM_REMOTESESSION) !== 0;
            
            if (isRemoteSession) {
                console.log('[Privacy] Remote Desktop session detected!');
                return { detected: true, type: 'RDP' };
            }
            
            // Method 2: Check for common remote access processes
            const exec = require('child_process').exec;
            const remoteProcesses = [
                'TeamViewer.exe',
                'AnyDesk.exe',
                'chrome_remote_desktop_host.exe',
                'vncserver.exe',
                'RustDesk.exe'
            ];
            
            // Check running processes
            exec('tasklist', (error, stdout) => {
                if (!error) {
                    for (const process of remoteProcesses) {
                        if (stdout.toLowerCase().includes(process.toLowerCase())) {
                            console.log(`[Privacy] Remote access software detected: ${process}`);
                            return { detected: true, type: process };
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[Privacy] Error detecting remote session:', error);
        }
    } else if (process.platform === 'darwin') {
        // macOS: Check for screen recording permissions granted to apps
        try {
            const { systemPreferences } = require('electron');
            
            // Check if screen recording is being used
            const screenRecordingApps = systemPreferences.getMediaAccessStatus('screen');
            if (screenRecordingApps === 'granted') {
                console.log('[Privacy] Screen recording permissions detected');
                // Additional checks could be implemented here
            }
        } catch (error) {
            console.error('[Privacy] Error checking macOS permissions:', error);
        }
    }
    
    return { detected: false, type: null };
}

// Auto-hide windows on remote access detection
function setupRemoteAccessProtection(windowPool) {
    let checkInterval;
    let lastDetectionState = false;
    
    const startMonitoring = () => {
        checkInterval = setInterval(() => {
            const detection = detectRemoteAccess();
            
            if (detection.detected && !lastDetectionState) {
                console.log(`[Privacy] Hiding windows due to ${detection.type} detection`);
                
                windowPool.forEach((window, name) => {
                    if (!window.isDestroyed() && window.isVisible()) {
                        // Store visibility state
                        window.__wasVisible = true;
                        window.hide();
                        
                        // Double-ensure privacy protection is active
                        setWindowPrivacy(window, true);
                    }
                });
                
                lastDetectionState = true;
            } else if (!detection.detected && lastDetectionState) {
                console.log('[Privacy] Remote access no longer detected, restoring windows');
                
                windowPool.forEach((window, name) => {
                    if (!window.isDestroyed() && window.__wasVisible) {
                        window.show();
                        window.__wasVisible = false;
                    }
                });
                
                lastDetectionState = false;
            }
        }, 3000); // Check every 3 seconds
    };
    
    const stopMonitoring = () => {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    };
    
    return { startMonitoring, stopMonitoring };
}

// Utility function to apply privacy to all windows in a pool
function applyPrivacyToAllWindows(windowPool, excludeFromCapture = true) {
    windowPool.forEach((window, name) => {
        if (window && !window.isDestroyed()) {
            setWindowPrivacy(window, excludeFromCapture);
        }
    });
}

// Export all functions
module.exports = {
    setWindowPrivacy,
    createPrivateWindow,
    detectRemoteAccess,
    setupRemoteAccessProtection,
    applyPrivacyToAllWindows,
    isWindows10Version2004OrHigher
};