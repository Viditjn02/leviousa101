const { BrowserWindow, globalShortcut, screen, app, shell } = require('electron');
const WindowLayoutManager = require('./windowLayoutManager');
const SmoothMovementManager = require('./smoothMovementManager');
const path = require('node:path');
const os = require('os');
const shortcutsService = require('../features/shortcuts/shortcutsService');
const internalBridge = require('../bridge/internalBridge');
const permissionRepository = require('../features/common/repositories/permission');

/* ────────────────[ GLASS BYPASS ]─────────────── */
let liquidGlass;
const isLiquidGlassSupported = () => {
    if (process.platform !== 'darwin') {
        return false;
    }
    const majorVersion = parseInt(os.release().split('.')[0], 10);
    // return majorVersion >= 25; // macOS 26+ (Darwin 25+)
    return majorVersion >= 26; // See you soon!
};
let shouldUseLiquidGlass = isLiquidGlassSupported();
if (shouldUseLiquidGlass) {
    try {
        liquidGlass = require('electron-liquid-glass');
    } catch (e) {
        console.warn('Could not load optional dependency "electron-liquid-glass". The feature will be disabled.');
        shouldUseLiquidGlass = false;
    }
}
/* ────────────────[ GLASS BYPASS ]─────────────── */

let isContentProtectionOn = true;
let lastVisibleWindows = new Set(['header']);

let currentHeaderState = 'apikey';
const windowPool = new Map();

let settingsHideTimer = null;


let layoutManager = null;
let movementManager = null;


function updateChildWindowLayouts(animated = true) {
    // if (movementManager.isAnimating) return;

    const visibleWindows = {};
    const listenWin = windowPool.get('listen');
    const askWin = windowPool.get('ask');
    if (listenWin && !listenWin.isDestroyed() && listenWin.isVisible()) {
        visibleWindows.listen = true;
    }
    if (askWin && !askWin.isDestroyed() && askWin.isVisible()) {
        visibleWindows.ask = true;
    }

    if (Object.keys(visibleWindows).length === 0) return;

    const newLayout = layoutManager.calculateFeatureWindowLayout(visibleWindows);
    movementManager.animateLayout(newLayout, animated);
}

const showSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: true });
};

const hideSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: false });
};

const cancelHideSettingsWindow = () => {
    internalBridge.emit('window:requestVisibility', { name: 'settings', visible: true });
};

const moveWindowStep = (direction) => {
    internalBridge.emit('window:moveStep', { direction });
};

const resizeHeaderWindow = ({ width, height }) => {
    internalBridge.emit('window:resizeHeaderWindow', { width, height });
};

const handleHeaderAnimationFinished = (state) => {
    internalBridge.emit('window:headerAnimationFinished', state);
};

const getHeaderPosition = () => {
    return new Promise((resolve) => {
        internalBridge.emit('window:getHeaderPosition', (position) => {
            resolve(position);
        });
    });
};

const moveHeaderTo = (newX, newY) => {
    internalBridge.emit('window:moveHeaderTo', { newX, newY });
};

const adjustWindowHeight = (winName, targetHeight) => {
    internalBridge.emit('window:adjustWindowHeight', { winName, targetHeight });
};


function setupWindowController(windowPool, layoutManager, movementManager) {
    internalBridge.on('window:requestVisibility', ({ name, visible }) => {
        handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, visible);
    });
    internalBridge.on('window:requestToggleAllWindowsVisibility', ({ targetVisibility }) => {
        changeAllWindowsVisibility(windowPool, targetVisibility);
    });
    internalBridge.on('window:moveToDisplay', ({ displayId }) => {
        // movementManager.moveToDisplay(displayId);
        const header = windowPool.get('header');
        if (header) {
            const newPosition = layoutManager.calculateNewPositionForDisplay(header, displayId);
            if (newPosition) {
                movementManager.animateWindowPosition(header, newPosition, {
                    onComplete: () => updateChildWindowLayouts(true)
                });
            }
        }
    });
    internalBridge.on('window:moveToEdge', ({ direction }) => {
        const header = windowPool.get('header');
        if (header) {
            const newPosition = layoutManager.calculateEdgePosition(header, direction);
            movementManager.animateWindowPosition(header, newPosition, { 
                onComplete: () => updateChildWindowLayouts(true) 
            });
        }
    });

    internalBridge.on('window:moveStep', ({ direction }) => {
        const header = windowPool.get('header');
        if (header) { 
            const newHeaderPosition = layoutManager.calculateStepMovePosition(header, direction);
            if (!newHeaderPosition) return;
    
            const futureHeaderBounds = { ...header.getBounds(), ...newHeaderPosition };
            const visibleWindows = {};
            const listenWin = windowPool.get('listen');
            const askWin = windowPool.get('ask');
            if (listenWin && !listenWin.isDestroyed() && listenWin.isVisible()) {
                visibleWindows.listen = true;
            }
            if (askWin && !askWin.isDestroyed() && askWin.isVisible()) {
                visibleWindows.ask = true;
            }

            const newChildLayout = layoutManager.calculateFeatureWindowLayout(visibleWindows, futureHeaderBounds);
    
            movementManager.animateWindowPosition(header, newHeaderPosition);
            movementManager.animateLayout(newChildLayout);
        }
    });

    internalBridge.on('window:resizeHeaderWindow', ({ width, height }) => {
        const header = windowPool.get('header');
        if (!header || movementManager.isAnimating) return;

        const newHeaderBounds = layoutManager.calculateHeaderResize(header, { width, height });
        
        const wasResizable = header.isResizable();
        if (!wasResizable) header.setResizable(true);

        movementManager.animateWindowBounds(header, newHeaderBounds, {
            onComplete: () => {
                if (!wasResizable) header.setResizable(false);
                updateChildWindowLayouts(true);
            }
        });
    });
    internalBridge.on('window:headerAnimationFinished', (state) => {
        const header = windowPool.get('header');
        if (!header || header.isDestroyed()) return;

        if (state === 'hidden') {
            header.hide();
        } else if (state === 'visible') {
            updateChildWindowLayouts(false);
        }
    });
    internalBridge.on('window:getHeaderPosition', (reply) => {
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            reply(header.getBounds());
        } else {
            reply({ x: 0, y: 0, width: 0, height: 0 });
        }
    });
    internalBridge.on('window:moveHeaderTo', ({ newX, newY }) => {
        const header = windowPool.get('header');
        if (header) {
            const newPosition = layoutManager.calculateClampedPosition(header, { x: newX, y: newY });
            header.setPosition(newPosition.x, newPosition.y);
        }
    });
    internalBridge.on('window:adjustWindowHeight', ({ winName, targetHeight }) => {
        console.log(`[Layout Debug] adjustWindowHeight: targetHeight=${targetHeight}`);
        const senderWindow = windowPool.get(winName);
        if (senderWindow) {
            const newBounds = layoutManager.calculateWindowHeightAdjustment(senderWindow, targetHeight);
            
            const wasResizable = senderWindow.isResizable();
            if (!wasResizable) senderWindow.setResizable(true);

            movementManager.animateWindowBounds(senderWindow, newBounds, {
                onComplete: () => {
                    if (!wasResizable) senderWindow.setResizable(false);
                    updateChildWindowLayouts(true);
                }
            });
        }
    });
}

function changeAllWindowsVisibility(windowPool, targetVisibility) {
    const header = windowPool.get('header');
    if (!header) return;

    if (typeof targetVisibility === 'boolean' &&
        header.isVisible() === targetVisibility) {
        return;
    }
  
    if (header.isVisible()) {
      lastVisibleWindows.clear();
  
      windowPool.forEach((win, name) => {
        if (win && !win.isDestroyed() && win.isVisible()) {
          lastVisibleWindows.add(name);
        }
      });
  
      lastVisibleWindows.forEach(name => {
        if (name === 'header') return;
        const win = windowPool.get(name);
        if (win && !win.isDestroyed()) win.hide();
      });
      header.hide();
  
      return;
    }
  
    lastVisibleWindows.forEach(name => {
      const win = windowPool.get(name);
      if (win && !win.isDestroyed())
        win.show();
    });
  }

/**
 * 
 * @param {Map<string, BrowserWindow>} windowPool
 * @param {WindowLayoutManager} layoutManager 
 * @param {SmoothMovementManager} movementManager
 * @param {'listen' | 'ask' | 'settings' | 'shortcut-settings'} name 
 * @param {boolean} shouldBeVisible 
 */
async function handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, shouldBeVisible) {
    console.log(`[WindowManager] Request: set '${name}' visibility to ${shouldBeVisible}`);
    const win = windowPool.get(name);

    if (!win || win.isDestroyed()) {
        console.warn(`[WindowManager] Window '${name}' not found or destroyed.`);
        return;
    }

    if (name !== 'settings') {
        const isCurrentlyVisible = win.isVisible();
        if (isCurrentlyVisible === shouldBeVisible) {
            console.log(`[WindowManager] Window '${name}' is already in the desired state.`);
            return;
        }
    }

    const disableClicks = (selectedWindow) => {
        for (const [name, win] of windowPool) {
            if (win !== selectedWindow && !win.isDestroyed()) {
                win.setIgnoreMouseEvents(true, { forward: true });
            }
        }
    };

    const restoreClicks = () => {
        for (const [, win] of windowPool) {
            if (!win.isDestroyed()) win.setIgnoreMouseEvents(false);
        }
    };

    if (name === 'settings') {
        if (shouldBeVisible) {
            // Cancel any pending hide operations
            if (settingsHideTimer) {
                clearTimeout(settingsHideTimer);
                settingsHideTimer = null;
            }
            const position = layoutManager.calculateSettingsWindowPosition();
            if (position) {
                win.setBounds(position);
                win.__lockedByButton = true;
                win.show();
                win.moveTop();
                
                // 🎯 PRIVACY MODE Z-ORDER FIX: Force settings to highest level in privacy mode
                if (isContentProtectionOn) {
                    if (process.platform === 'darwin') {
                        win.setAlwaysOnTop(true, 'screen-saver');
                    } else {
                win.setAlwaysOnTop(true);
                    }
                    win.focus();
                    win.moveTop();
                } else {
                    win.setAlwaysOnTop(true);
                }
            } else {
                console.warn('[WindowManager] Could not calculate settings window position.');
            }
        } else {
            // Hide after a delay
            if (settingsHideTimer) {
                clearTimeout(settingsHideTimer);
            }
            settingsHideTimer = setTimeout(() => {
                if (win && !win.isDestroyed()) {
                    win.setAlwaysOnTop(false);
                    win.hide();
                }
                settingsHideTimer = null;
            }, 200);

            win.__lockedByButton = false;
        }
        return;
    }


    if (name === 'shortcut-settings') {
        if (shouldBeVisible) {
            // layoutManager.positionShortcutSettingsWindow();
            const newBounds = layoutManager.calculateShortcutSettingsWindowPosition();
            if (newBounds) win.setBounds(newBounds);
            
            if (process.platform === 'darwin') {
                win.setAlwaysOnTop(true, 'screen-saver');
            } else {
                win.setAlwaysOnTop(true);
            }
            // globalShortcut.unregisterAll();
            disableClicks(win);
            win.show();
        } else {
            if (process.platform === 'darwin') {
                win.setAlwaysOnTop(false, 'screen-saver');
            } else {
                win.setAlwaysOnTop(false);
            }
            restoreClicks();
            win.hide();
        }
        return;
    }

    if (name === 'listen' || name === 'ask') {
        const win = windowPool.get(name);
        const otherName = name === 'listen' ? 'ask' : 'listen';
        const otherWin = windowPool.get(otherName);
        const isOtherWinVisible = otherWin && !otherWin.isDestroyed() && otherWin.isVisible();
        
        const ANIM_OFFSET_X = 50;
        const ANIM_OFFSET_Y = 20;

        const finalVisibility = {
            listen: (name === 'listen' && shouldBeVisible) || (otherName === 'listen' && isOtherWinVisible),
            ask: (name === 'ask' && shouldBeVisible) || (otherName === 'ask' && isOtherWinVisible),
        };
        if (!shouldBeVisible) {
            finalVisibility[name] = false;
        }

        const targetLayout = layoutManager.calculateFeatureWindowLayout(finalVisibility);

        if (shouldBeVisible) {
            if (!win) return;
            const targetBounds = targetLayout[name];
            if (!targetBounds) return;

            const startPos = { ...targetBounds };
            if (name === 'listen') startPos.x -= ANIM_OFFSET_X;
            else if (name === 'ask') startPos.y -= ANIM_OFFSET_Y;

            win.setOpacity(0);
            win.setBounds(startPos);
            win.show();

            movementManager.fade(win, { to: 1 });
            movementManager.animateLayout(targetLayout);

        } else {
            if (!win || !win.isVisible()) return;

            const currentBounds = win.getBounds();
            const targetPos = { ...currentBounds };
            if (name === 'listen') targetPos.x -= ANIM_OFFSET_X;
            else if (name === 'ask') targetPos.y -= ANIM_OFFSET_Y;

            movementManager.fade(win, { to: 0, onComplete: () => win.hide() });
            movementManager.animateWindowPosition(win, targetPos);
            
            // 다른 창들도 새 레이아웃으로 애니메이션
            const otherWindowsLayout = { ...targetLayout };
            delete otherWindowsLayout[name];
            movementManager.animateLayout(otherWindowsLayout);
        }
    }
}


const setContentProtection = (status) => {
    isContentProtectionOn = status;
    console.log(`[Protection] Content protection toggled to: ${isContentProtectionOn}`);
    windowPool.forEach((win, name) => {
        if (win && !win.isDestroyed()) {
            // 🎯 PRIVACY MODE FIX: Don't apply content protection to header to preserve mouse events
            if (name === 'header') {
                win.setContentProtection(false); // Header always has no protection for mouse hover
                console.log('[Protection] Header content protection kept OFF to preserve mouse hover functionality');
            } else {
            win.setContentProtection(isContentProtectionOn);
            }
        }
    });
    
    // Also update browser window and view if they exist
    if (globalBrowserWindow && !globalBrowserWindow.isDestroyed()) {
        globalBrowserWindow.setContentProtection(isContentProtectionOn);
    }
    // Update all browser tabs if they exist
    if (browserTabs && browserTabs.length > 0) {
        browserTabs.forEach(tab => {
            if (tab.browserView && tab.browserView.webContents) {
                // BrowserView doesn't have setContentProtection, but the parent window handles it
                console.log('[Protection] BrowserView protection inherited from parent window for tab:', tab.id);
            }
        });
    }
};

const getContentProtectionStatus = () => isContentProtectionOn;

const toggleContentProtection = () => {
    const newStatus = !getContentProtectionStatus();
    setContentProtection(newStatus);
    return newStatus;
};


const openLoginPage = () => {
    const webUrl = process.env.leviousa_WEB_URL || 'https://www.leviousa.com';
    const personalizeUrl = `${webUrl}/personalize?desktop=true`;
    shell.openExternal(personalizeUrl);
    console.log('Opening personalization page:', personalizeUrl);
};


function createFeatureWindows(header, namesToCreate) {
    // if (windowPool.has('listen')) return;

    // Check if this is a development build that should show dev tools
    const isDevBuild = process.env.LEVIOUSA_DEV_BUILD === 'true';

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

    const commonChildOptions = {
        parent: header,
        show: false,
        frame: false,
        transparent: true,
        vibrancy: false,
        hasShadow: false,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        resizable: false,
        icon: getIconPath(),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            // Enable dev tools in development builds
            ...(isDevBuild && { enableRemoteModule: false, devTools: true }),
        },
    };

    const createFeatureWindow = (name) => {
        if (windowPool.has(name)) return;
        
        switch (name) {
            case 'listen': {
                const listen = new BrowserWindow({
                    ...commonChildOptions, width:400,minWidth:400,maxWidth:900,
                    maxHeight:900,
                });
                listen.setContentProtection(isContentProtectionOn);
                listen.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    listen.setWindowButtonVisibility(false);
                }
                const listenLoadOptions = { query: { view: 'listen' } };
                if (!shouldUseLiquidGlass) {
                    listen.loadFile(path.join(__dirname, '../ui/app/content.html'), listenLoadOptions);
                }
                else {
                    listenLoadOptions.query.glass = 'true';
                    listen.loadFile(path.join(__dirname, '../ui/app/content.html'), listenLoadOptions);
                    listen.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(listen.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                // Open DevTools for listen window in development builds
                if (isDevBuild) {
                    listen.webContents.once('dom-ready', () => {
                        console.log('🔧 [DevBuild] Opening dev tools for listen window...');
                        listen.webContents.openDevTools({ mode: 'detach' });
                    });
                }
                windowPool.set('listen', listen);
                
                // 🎯 AUTO-FOCUS: Listen window comes to front on mouse hover
                listen.on('mouse-enter', () => {
                    console.log('[Auto-Focus] 🎯 Mouse entered listen window - bringing to front');
                    listen.moveTop();
                });
                
                break;
            }

            // ask
            case 'ask': {
                const ask = new BrowserWindow({ ...commonChildOptions, width:600 });
                ask.setContentProtection(isContentProtectionOn);
                ask.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    ask.setWindowButtonVisibility(false);
                }
                const askLoadOptions = { query: { view: 'ask' } };
                if (!shouldUseLiquidGlass) {
                    ask.loadFile(path.join(__dirname, '../ui/app/content.html'), askLoadOptions);
                }
                else {
                    askLoadOptions.query.glass = 'true';
                    ask.loadFile(path.join(__dirname, '../ui/app/content.html'), askLoadOptions);
                    ask.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(ask.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                
                // Open DevTools for ask window in development builds
                if (isDevBuild) {
                    ask.webContents.once('dom-ready', () => {
                        console.log('🔧 [DevBuild] Opening dev tools for ask window...');
                        ask.webContents.openDevTools({ mode: 'detach' });
                    });
                }
                windowPool.set('ask', ask);
                
                // 🎯 AUTO-FOCUS: Ask window comes to front on mouse hover
                ask.on('mouse-enter', () => {
                    console.log('[Auto-Focus] 🎯 Mouse entered ask window - bringing to front');
                    ask.moveTop();
                });
                
                break;
            }

            // settings
            case 'settings': {
                const settings = new BrowserWindow({ ...commonChildOptions, width:240, maxHeight:400, parent:undefined });
                settings.setContentProtection(isContentProtectionOn);
                settings.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    settings.setWindowButtonVisibility(false);
                }
                const settingsLoadOptions = { query: { view: 'settings' } };
                if (!shouldUseLiquidGlass) {
                    settings.loadFile(path.join(__dirname,'../ui/app/content.html'), settingsLoadOptions)
                        .catch(console.error);
                }
                else {
                    settingsLoadOptions.query.glass = 'true';
                    settings.loadFile(path.join(__dirname,'../ui/app/content.html'), settingsLoadOptions)
                        .catch(console.error);
                    settings.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(settings.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                            // liquidGlass.unstable_setScrim(viewId, 1);
                            // liquidGlass.unstable_setSubdued(viewId, 1);
                        }
                    });
                }
                windowPool.set('settings', settings);  
                
                // 🎯 AUTO-FOCUS: Settings window comes to front on mouse hover with privacy mode support
                settings.on('mouse-enter', () => {
                    console.log('[Auto-Focus] 🎯 Mouse entered settings window - bringing to front');
                    settings.moveTop();
                    
                    // 🎯 PRIVACY MODE Z-ORDER FIX: Ensure proper layering in privacy mode
                    if (isContentProtectionOn) {
                        console.log('[Auto-Focus] 🔍 Privacy mode - using screen-saver level');
                        if (process.platform === 'darwin') {
                            settings.setAlwaysOnTop(true, 'screen-saver');
                        } else {
                            settings.setAlwaysOnTop(true);
                        }
                        settings.focus();
                    } else {
                        settings.setAlwaysOnTop(true);
                    }
                });

                // DevTools disabled for cleaner development experience
                // if (!app.isPackaged) {
                //     settings.webContents.openDevTools({ mode: 'detach' });
                // }
                break;
            }

            // tutorial
            case 'tutorial': {
                // Dynamic sizing based on screen size
                const { screen } = require('electron');
                const primaryDisplay = screen.getPrimaryDisplay();
                const screenWidth = primaryDisplay.workAreaSize.width;
                const screenHeight = primaryDisplay.workAreaSize.height;
                
                // Responsive sizing: 60% of screen width, max 700px, min 400px
                const tutorialWidth = Math.min(Math.max(screenWidth * 0.6, 400), 700);
                // Responsive height: 50% of screen height, max 500px, min 300px  
                const tutorialHeight = Math.min(Math.max(screenHeight * 0.5, 300), 500);
                
                const tutorial = new BrowserWindow({ 
                    ...commonChildOptions, 
                    width: Math.round(tutorialWidth), 
                    height: Math.round(tutorialHeight),
                    parent: undefined,
                    alwaysOnTop: true,
                    center: true,
                    focusable: true,
                    modal: false,
                    show: false // Start hidden, will be shown when triggered
                });
                tutorial.setContentProtection(isContentProtectionOn);
                tutorial.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true});
                if (process.platform === 'darwin') {
                    tutorial.setWindowButtonVisibility(false);
                }
                
                // Load interactive tutorial HTML file
                const tutorialLoadOptions = {};
                if (!shouldUseLiquidGlass) {
                    tutorial.loadFile(path.join(__dirname, '../ui/tutorial/tutorial.html'), tutorialLoadOptions)
                        .catch(console.error);
                }
                else {
                    tutorialLoadOptions.query = { glass: 'true' };
                    tutorial.loadFile(path.join(__dirname, '../ui/tutorial/tutorial.html'), tutorialLoadOptions)
                        .catch(console.error);
                    tutorial.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(tutorial.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                        }
                    });
                }

                windowPool.set('tutorial', tutorial);
                
                tutorial.on('closed', () => {
                    console.log('[TutorialWindow] Tutorial window closed.');
                });
                
                tutorial.on('mouse-enter', () => {
                    console.log('[Auto-Focus] 🎯 Mouse entered tutorial - bringing to front');
                    tutorial.moveTop();
                });

                console.log('[TutorialWindow] ✅ Tutorial window created and ready');
                break;
            }

            case 'shortcut-settings': {
                const shortcutEditor = new BrowserWindow({
                    ...commonChildOptions,
                    width: 353,
                    height: 720,
                    modal: false,
                    parent: undefined,
                    alwaysOnTop: true,
                    titleBarOverlay: false,
                });

                shortcutEditor.setContentProtection(isContentProtectionOn);
                shortcutEditor.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
                if (process.platform === 'darwin') {
                    shortcutEditor.setWindowButtonVisibility(false);
                }

                const loadOptions = { query: { view: 'shortcut-settings' } };
                if (!shouldUseLiquidGlass) {
                    shortcutEditor.loadFile(path.join(__dirname, '../ui/app/content.html'), loadOptions);
                } else {
                    loadOptions.query.glass = 'true';
                    shortcutEditor.loadFile(path.join(__dirname, '../ui/app/content.html'), loadOptions);
                    shortcutEditor.webContents.once('did-finish-load', () => {
                        const viewId = liquidGlass.addView(shortcutEditor.getNativeWindowHandle());
                        if (viewId !== -1) {
                            liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                        }
                    });
                }

                windowPool.set('shortcut-settings', shortcutEditor);
                
                // 🎯 AUTO-FOCUS: Shortcut settings window comes to front on mouse hover
                shortcutEditor.on('mouse-enter', () => {
                    console.log('[Auto-Focus] 🎯 Mouse entered shortcut settings - bringing to front');
                    shortcutEditor.moveTop();
                });
                
                // DevTools disabled for cleaner development experience
                // if (!app.isPackaged) {
                //     shortcutEditor.webContents.openDevTools({ mode: 'detach' });
                // }
                break;
            }
        }
    };

    if (Array.isArray(namesToCreate)) {
        namesToCreate.forEach(name => createFeatureWindow(name));
    } else if (typeof namesToCreate === 'string') {
        createFeatureWindow(namesToCreate);
    } else {
        createFeatureWindow('listen');
        createFeatureWindow('ask');
        createFeatureWindow('settings');
        createFeatureWindow('shortcut-settings');
    }
}

function destroyFeatureWindows() {
    const featureWindows = ['listen','ask','settings','shortcut-settings'];
    if (settingsHideTimer) {
        clearTimeout(settingsHideTimer);
        settingsHideTimer = null;
    }
    featureWindows.forEach(name=>{
        const win = windowPool.get(name);
        if (win && !win.isDestroyed()) win.destroy();
        windowPool.delete(name);
    });
}



function getCurrentDisplay(window) {
    if (!window || window.isDestroyed()) return screen.getPrimaryDisplay();

    const windowBounds = window.getBounds();
    const windowCenter = {
        x: windowBounds.x + windowBounds.width / 2,
        y: windowBounds.y + windowBounds.height / 2,
    };

    return screen.getDisplayNearestPoint(windowCenter);
}



function createWindows() {
    console.log('>>> [windowManager.js] Creating windows...');
    
    const HEADER_HEIGHT        = 47;
    const DEFAULT_WINDOW_WIDTH = 480; // Optimized width with tight spacing

    const primaryDisplay = screen.getPrimaryDisplay();
    const { y: workAreaY, width: screenWidth } = primaryDisplay.workArea;

    const initialX = Math.round((screenWidth - DEFAULT_WINDOW_WIDTH) / 2);
    const initialY = workAreaY + 21;
    
    // Check if this is a development build that should show dev tools
    const isDevBuild = process.env.LEVIOUSA_DEV_BUILD === 'true';
        
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

    const header = new BrowserWindow({
        width: DEFAULT_WINDOW_WIDTH,
        height: HEADER_HEIGHT,
        x: initialX,
        y: initialY,
        frame: false,
        transparent: true,
        vibrancy: false,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        resizable: false,
        focusable: true,
        acceptFirstMouse: true,
        icon: getIconPath(),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            backgroundThrottling: false,
            webSecurity: false,
            enableRemoteModule: false,
            // Ensure proper rendering and prevent pixelation
            experimentalFeatures: false,
            // Enable dev tools in development builds
            ...(isDevBuild && { devTools: true }),
        },
        // Prevent pixelation and ensure proper rendering
        useContentSize: true,
        disableAutoHideCursor: true,
    });
    if (process.platform === 'darwin') {
        header.setWindowButtonVisibility(false);
    }
    const headerLoadOptions = {};
    if (!shouldUseLiquidGlass) {
        header.loadFile(path.join(__dirname, '../ui/app/header.html'), headerLoadOptions);
    }
    else {
        headerLoadOptions.query = { glass: 'true' };
        header.loadFile(path.join(__dirname, '../ui/app/header.html'), headerLoadOptions);
        header.webContents.once('did-finish-load', () => {
            const viewId = liquidGlass.addView(header.getNativeWindowHandle());
            if (viewId !== -1) {
                liquidGlass.unstable_setVariant(viewId, liquidGlass.GlassMaterialVariant.bubbles);
                // liquidGlass.unstable_setScrim(viewId, 1); 
                // liquidGlass.unstable_setSubdued(viewId, 1);
            }
        });
    }
    windowPool.set('header', header);
    console.log('[WindowManager] Header window created and added to windowPool');
    
    // Set custom User-Agent to identify as Leviousa instead of Electron
    header.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Leviousa/1.0.0 Safari/537.36');
    
    layoutManager = new WindowLayoutManager(windowPool);
    movementManager = new SmoothMovementManager(windowPool);
    console.log('[WindowManager] Layout and movement managers initialized');


    header.on('moved', () => {
        if (movementManager.isAnimating) {
            return;
        }
        updateChildWindowLayouts(false);
    });

    header.webContents.once('dom-ready', () => {
        shortcutsService.initialize(windowPool);
        shortcutsService.registerShortcuts();
    });

    setupIpcHandlers(windowPool, layoutManager);
    setupWindowController(windowPool, layoutManager, movementManager);

    if (currentHeaderState === 'main') {
        createFeatureWindows(header, ['listen', 'ask', 'settings', 'shortcut-settings', 'tutorial']);
    }

    // 🎯 PRIVACY MODE FIX: Don't apply content protection to header to preserve mouse events
    // The header needs mouse events for settings hover, but other windows can have protection
    header.setContentProtection(false); // Always false to preserve mouse hover functionality
    header.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    
    // Open DevTools in development builds for debugging
    if (isDevBuild) {
        console.log('🔧 [DevBuild] Opening developer tools for debugging...');
        header.webContents.openDevTools({ mode: 'detach' });
        
        // Also enable dev tools for feature windows when they're created
        header.webContents.once('dom-ready', () => {
            console.log('🔧 [DevBuild] Developer tools available - press F12 or Cmd+Opt+I');
        });
    }

    header.on('focus', () => {
        console.log('[WindowManager] Header gained focus');
    });

    header.on('blur', () => {
        console.log('[WindowManager] Header lost focus');
    });
    
    // 🎯 AUTO-FOCUS: Header window comes to front on mouse hover  
    header.on('mouse-enter', () => {
        console.log('[Auto-Focus] 🎯 Mouse entered header window - bringing to front');
        header.moveTop();
    });

    header.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'mouseDown') {
            const target = input.target;
            if (target && (target.includes('input') || target.includes('apikey'))) {
                header.focus();
            }
        }
    });

    header.on('resize', () => updateChildWindowLayouts(false));

    return windowPool;
}


function setupIpcHandlers(windowPool, layoutManager) {
    screen.on('display-added', (event, newDisplay) => {
        console.log('[Display] New display added:', newDisplay.id);
    });

    screen.on('display-removed', (event, oldDisplay) => {
        console.log('[Display] Display removed:', oldDisplay.id);
        const header = windowPool.get('header');

        if (header && getCurrentDisplay(header).id === oldDisplay.id) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const newPosition = layoutManager.calculateNewPositionForDisplay(header, primaryDisplay.id);
            if (newPosition) {
                // 복구 상황이므로 애니메이션 없이 즉시 이동
                header.setPosition(newPosition.x, newPosition.y, false);
                updateChildWindowLayouts(false);
            }
        }
    });

    screen.on('display-metrics-changed', (event, display, changedMetrics) => {
        // 레이아웃 업데이트 함수를 새 버전으로 호출
        updateChildWindowLayouts(false);
    });
}


const handleHeaderStateChanged = (state) => {
    console.log(`[WindowManager] Header state changed to: ${state}`);
    currentHeaderState = state;

    if (state === 'main') {
        createFeatureWindows(windowPool.get('header'), ['listen', 'ask', 'settings', 'shortcut-settings', 'tutorial']);
    } else {         // 'apikey' | 'permission'
        destroyFeatureWindows();
    }
    internalBridge.emit('reregister-shortcuts');
};

// Global browser window and multi-tab support
let globalBrowserWindow = null;
let browserTabs = []; // Array to store multiple BrowserViews
let activeTabId = null;
let globalRecentPopups = new Set(); // Global deduplication for popup URLs
let googleAuthCooldown = false; // Prevent multiple Google auth popups

const toggleBrowserWindow = async () => {
    if (globalBrowserWindow && !globalBrowserWindow.isDestroyed()) {
        // Close existing browser window and view
        console.log('[WindowManager] 🌐 Closing browser window');
        // Close all tabs
        browserTabs.forEach(tab => {
            try {
                if (tab.browserView) {
                    globalBrowserWindow.removeBrowserView(tab.browserView);
                }
            } catch (error) {
                console.error('[WindowManager] Error removing BrowserView:', error);
            }
        });
        browserTabs = [];
        activeTabId = null;
        globalRecentPopups.clear(); // Clear popup deduplication when closing browser
        googleAuthCooldown = false; // Clear Google auth cooldown
        globalBrowserWindow.close();
        globalBrowserWindow = null;
        return { isOpen: false };
    } else {
        // 🔒 Check subscription and usage limits for browser feature
        try {
            const subscriptionService = require('../features/common/services/subscriptionService');
            const usageTrackingRepository = require('../features/common/repositories/usageTracking');
            
            console.log('[WindowManager] 🔍 Checking browser usage limits...');
            const usageCheck = await subscriptionService.checkUsageAllowed('browser');
            
            if (!usageCheck.allowed) {
                const errorMessage = usageCheck.unlimited ? 
                    'Browser feature is not available.' :
                    `Browser daily limit reached. Used: ${usageCheck.usage}/${usageCheck.limit} minutes. Resets in 24 hours.`;
                    
                console.log('[WindowManager] 🚫 Browser usage limit exceeded:', errorMessage);
                
                // Show notification or error dialog
                const { dialog } = require('electron');
                dialog.showMessageBox({
                    type: 'warning',
                    title: 'Usage Limit Reached',
                    message: errorMessage,
                    detail: 'Upgrade to Pro for unlimited browser access.',
                    buttons: ['OK', 'Upgrade to Pro']
                }).then((response) => {
                    if (response.response === 1) {
                        // Open upgrade page
                        shell.openExternal('https://www.leviousa.com/settings/billing');
                    }
                });
                return { success: false, error: errorMessage };
            }
            
            console.log('[WindowManager] ✅ Browser usage check passed. Remaining:', usageCheck.remaining || 'unlimited');
            
            // Track browser usage start (1 minute per session)
            await subscriptionService.trackUsageToWebAPI('browser', 1);
            console.log('[WindowManager] ✅ Browser usage tracked: +1 minute');
            
        } catch (error) {
            console.error('[WindowManager] ❌ Error checking browser subscription:', error);
            // Allow usage if subscription check fails (fallback)
        }
        
        // Create new invisible, moveable, resizable browser window with BrowserView
        console.log('[WindowManager] 🌐 Creating advanced browser window with BrowserView');
        
        const { BrowserWindow, BrowserView } = require('electron');
        const path = require('path');
        
        // Get main header position to position browser window relative to it
        const headerWindow = windowPool.get('header');
        const headerBounds = headerWindow ? headerWindow.getBounds() : { x: 100, y: 100 };
        
        // Set icon based on platform - same function as main overlay
        const getIconPath = () => {
            if (process.platform === 'darwin') {
                return path.join(__dirname, '../ui/assets/logo.icns');
            } else if (process.platform === 'win32') {
                return path.join(__dirname, '../ui/assets/logo.ico');
            } else {
                return path.join(__dirname, '../ui/assets/logo.png');
            }
        };

        // Create browser window with minimal interface and privacy protection
        globalBrowserWindow = new BrowserWindow({
            width: 700, // Even smaller default width
            height: 500, // Even smaller default height
            x: headerBounds.x + 50,
            y: headerBounds.y + 80,
            show: true,
            frame: false,
            transparent: true, // Transparent like main overlay
            vibrancy: false,
            hasShadow: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            hiddenInMissionControl: true,
            resizable: false, // PRIVACY: Disable resize handles and cursors for screen sharing
            movable: true,
            minimizable: false,
            maximizable: false,
            focusable: true,
            acceptFirstMouse: true,
            icon: getIconPath(),
            opacity: 0.8, // Set default opacity like main overlay
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js'),
                backgroundThrottling: false,
                webSecurity: true, // Enhanced security for BrowserView
                enableRemoteModule: false,
                experimentalFeatures: false,
                partition: 'persist:browser', // Persistent session for passwords/cookies
            },
            useContentSize: true,
            disableAutoHideCursor: true, // PRIVACY: Disable cursor auto-hide which can leak info
            title: 'Leviousa Browser'
        });

        // Create first tab
        console.log('[WindowManager] 🌐 Creating first tab...');
        const firstTab = createNewTabInternal('Google', 'https://www.google.com');
        browserTabs.push(firstTab);
        activeTabId = firstTab.id;
        
        console.log('[WindowManager] ✅ First tab created:', firstTab.id, 'Total tabs:', browserTabs.length);
        
        // Add first tab's BrowserView to window
        globalBrowserWindow.setBrowserView(firstTab.browserView);

        // Create simple control bar interface (avoid encoding issues)
        globalBrowserWindow.webContents.once('did-finish-load', () => {
            globalBrowserWindow.webContents.executeJavaScript(`
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                document.body.style.background = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent background like main overlay
                document.body.style.overflow = 'hidden';
                document.body.style.backdropFilter = 'blur(12px)';
                document.body.style.borderRadius = '12px';
                // Make only non-interactive areas draggable
                document.body.style.webkitAppRegion = 'no-drag'; // Website content should not be draggable
                
                // Add CSS for slider styling and privacy protection
                const style = document.createElement('style');
                style.textContent = 
                    '/* Privacy: Disable all tooltips and cursor changes for screen sharing protection */ ' +
                    '* { cursor: default !important; } ' +
                    '[title] { cursor: default !important; } ' +
                    'button { cursor: default !important; } ' +
                    'a { cursor: default !important; } ' +
                    'input[type="range"] { cursor: default !important; } ' +
                    'input[type="range"]::-webkit-slider-thumb { ' +
                        '-webkit-appearance: none; ' +
                        'width: 12px; ' +
                        'height: 12px; ' +
                        'border-radius: 50%; ' +
                        'background: white; ' +
                        'cursor: default !important; ' +
                    '} ' +
                    'input[type="range"]::-webkit-slider-track { ' +
                        'background: rgba(255, 255, 255, 0.3); ' +
                        'height: 4px; ' +
                        'border-radius: 2px; ' +
                    '}';
                document.head.appendChild(style);
                
                // Create title bar as fixed overlay (doesn't interfere with BrowserView)
                const titleBar = document.createElement('div');
                titleBar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; height: 35px; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(12px); display: flex; align-items: center; padding: 0 12px; gap: 8px; -webkit-app-region: drag; border-bottom: 1px solid rgba(255, 255, 255, 0.1); z-index: 9999; border-radius: 12px 12px 0 0;';
                
                // Close button on the left (macOS style) - No tooltips for privacy
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.style.cssText = 'width: 20px; height: 20px; border: none; border-radius: 50%; background: rgba(255, 95, 87, 0.8); color: white; cursor: default; font-size: 10px; font-weight: bold; transition: background 0.15s ease; display: flex; align-items: center; justify-content: center; -webkit-app-region: no-drag; margin-right: 8px;';
                closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 59, 48, 1)';
                closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 95, 87, 0.8)';
                closeBtn.onclick = () => window.electronAPI?.closeWindow?.();
                
                // Create simple tab container with always-visible + button
                const tabContainer = document.createElement('div');
                tabContainer.style.cssText = 'display: flex; gap: 4px; -webkit-app-region: no-drag; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 4px; margin: 0 8px; max-width: 300px;';
                tabContainer.id = 'tab-container';
                
                // Create simple tab display - will show multiple tabs horizontally
                window.currentTabIndex = 0;
                window.allTabs = [];
                
                // Initial tab is ready - + button is always visible and functional
                
                const navButtons = document.createElement('div');
                navButtons.style.cssText = 'display: flex; gap: 4px; -webkit-app-region: no-drag;';
                
                const backBtn = document.createElement('button');
                backBtn.innerHTML = '‹';
                backBtn.style.cssText = 'width: 24px; height: 24px; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: white; cursor: default; font-size: 12px; transition: background 0.15s ease; display: flex; align-items: center; justify-content: center;';
                backBtn.onclick = () => window.electronAPI?.browserViewGoBack?.();
                
                const forwardBtn = document.createElement('button');
                forwardBtn.innerHTML = '›';
                forwardBtn.style.cssText = 'width: 24px; height: 24px; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: white; cursor: default; font-size: 12px; transition: background 0.15s ease; display: flex; align-items: center; justify-content: center;';
                forwardBtn.onclick = () => window.electronAPI?.browserViewGoForward?.();
                
                const reloadBtn = document.createElement('button');
                reloadBtn.innerHTML = '↻';
                reloadBtn.style.cssText = 'width: 24px; height: 24px; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: white; cursor: default; font-size: 12px; transition: background 0.15s ease; display: flex; align-items: center; justify-content: center;';
                reloadBtn.onclick = () => window.electronAPI?.browserViewReload?.();
                
                navButtons.appendChild(backBtn);
                navButtons.appendChild(forwardBtn);
                navButtons.appendChild(reloadBtn);
                
                const urlBar = document.createElement('input');
                urlBar.type = 'text';
                urlBar.placeholder = 'Enter URL or search...';
                urlBar.style.cssText = 'flex: 1; padding: 4px 10px; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 15px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 12px; -webkit-app-region: no-drag; margin: 0 8px; cursor: default;';
                urlBar.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        let url = urlBar.value.trim();
                        if (url) {
                            if (!url.includes('://')) {
                                url = 'https://' + url;
                            }
                            window.electronAPI?.navigateBrowserView?.(url);
                            
                            // Clear and unfocus URL field after navigation for better UX
                            setTimeout(() => {
                                urlBar.value = '';
                                urlBar.placeholder = 'Enter URL or search...';
                                urlBar.blur(); // CRITICAL: Remove focus so website is clickable
                                console.log('[Browser] 🧹 URL field cleared and unfocused after navigation');
                            }, 1000); // Longer timeout to ensure navigation completes
                        }
                    }
                });
                
                // Privacy: Add keyboard shortcuts for resize since visual resize is disabled
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        switch(e.key) {
                            case '=':
                            case '+':
                                // Increase window size (Ctrl/Cmd + Plus)
                                e.preventDefault();
                                window.electronAPI?.resizeBrowserWindow?.(50, 50);
                                break;
                            case '-':
                                // Decrease window size (Ctrl/Cmd + Minus)
                                e.preventDefault();
                                window.electronAPI?.resizeBrowserWindow?.(-50, -50);
                                break;
                        }
                    }
                });
                
                // Opacity control slider
                const opacityControl = document.createElement('div');
                opacityControl.style.cssText = 'display: flex; align-items: center; gap: 6px; -webkit-app-region: no-drag;';
                
                const opacityLabel = document.createElement('span');
                opacityLabel.textContent = '⚪';
                opacityLabel.style.cssText = 'color: white; font-size: 10px;';
                
                const opacitySlider = document.createElement('input');
                opacitySlider.type = 'range';
                opacitySlider.min = '0.3';
                opacitySlider.max = '1';
                opacitySlider.step = '0.1';
                opacitySlider.value = '0.8';
                opacitySlider.style.cssText = 'width: 60px; height: 4px; -webkit-appearance: none; background: rgba(255, 255, 255, 0.3); border-radius: 2px; outline: none;';
                opacitySlider.addEventListener('input', (e) => {
                    const opacity = e.target.value;
                    // Update entire window opacity using electronAPI
                    window.electronAPI?.setBrowserWindowOpacity?.(opacity);
                });
                
                opacityControl.appendChild(opacityLabel);
                opacityControl.appendChild(opacitySlider);
                
                // Add draggable spacer for window movement with globe icon
                const dragSpacer = document.createElement('div');
                dragSpacer.style.cssText = 'flex: 1; height: 35px; -webkit-app-region: drag; min-width: 50px; display: flex; align-items: center; justify-content: center;';
                
                // Add proper globe icon to the drag area
                const globeIcon = document.createElement('span');
                globeIcon.innerHTML = '🌐';
                globeIcon.style.cssText = 'font-size: 14px; opacity: 0.6; -webkit-app-region: drag; user-select: none; pointer-events: none; transition: opacity 0.2s ease;';
                dragSpacer.appendChild(globeIcon);
                
                // Add hover effect for globe icon
                dragSpacer.addEventListener('mouseenter', () => {
                    globeIcon.style.opacity = '0.9';
                });
                dragSpacer.addEventListener('mouseleave', () => {
                    globeIcon.style.opacity = '0.6';
                });
                
                titleBar.appendChild(closeBtn);
                titleBar.appendChild(tabContainer);
                titleBar.appendChild(navButtons);
                titleBar.appendChild(urlBar);
                titleBar.appendChild(dragSpacer); // Flexible drag area
                titleBar.appendChild(opacityControl);
                
                // Store references for tab management
                window.browserTabsData = [];
                window.activeTabId = null;
                
                // Add title bar as fixed overlay
                document.body.appendChild(titleBar);
                
                // Immediately populate tabs after title bar is added
                setTimeout(() => {
                    console.log('[Browser] Populating initial tabs...');
                    const container = document.getElementById('tab-container');
                    if (container) {
                        // Create first tab display (no cursor pointer for privacy)
                        const tab1 = document.createElement('div');
                        tab1.style.cssText = 'background: rgba(255, 255, 255, 0.95); color: black; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; min-width: 80px; cursor: default; margin-right: 2px;';
                        tab1.textContent = 'Tab 1';
                        
                        // Add + button (no cursor pointer for privacy)
                        const plus = document.createElement('button');
                        plus.innerHTML = '+';
                        plus.style.cssText = 'background: rgba(34, 139, 34, 0.8); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: default; font-size: 14px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin-left: 4px;';
                        plus.onclick = () => {
                            console.log('[Browser] Plus clicked - calling createNewTab');
                            if (window.electronAPI && window.electronAPI.createNewTab) {
                                window.electronAPI.createNewTab();
                            }
                        };
                        
                        container.appendChild(tab1);
                        container.appendChild(plus);
                        
                        console.log('[Browser] Initial tab UI created');
                    }
                    
                    if (window.electronAPI?.positionBrowserView) {
                        window.electronAPI.positionBrowserView();
                    }
                }, 10);
                
                console.log('[Leviousa] Browser controls with real multi-tab support created');
            `).catch(err => {
                console.error('[WindowManager] Error executing browser UI script:', err);
            });
        });
        
        globalBrowserWindow.loadURL('data:text/html,<html><head><title>Leviousa Browser</title></head><body><div>Loading browser...</div></body></html>');

        // Position active tab on window resize
        globalBrowserWindow.on('resize', () => {
            const activeTab = browserTabs.find(tab => tab.id === activeTabId);
            if (activeTab && activeTab.browserView && activeTab.browserView.webContents) {
                try {
                    const bounds = globalBrowserWindow.getBounds();
                    activeTab.browserView.setBounds({
                        x: 0,
                        y: 35, // Below title bar
                        width: bounds.width,
                        height: bounds.height - 35
                    });
                } catch (error) {
                    console.error('[WindowManager] Error resizing active tab:', error);
                }
            }
        });

        // Initial positioning for first tab
        const bounds = globalBrowserWindow.getBounds();
        firstTab.browserView.setBounds({
            x: 0,
            y: 35, // Below title bar
            width: bounds.width,
            height: bounds.height - 35
        });

        // Load Google in first tab
        firstTab.browserView.webContents.loadURL('https://www.google.com');
        
        // 🚫 RESTORE POPUP BLOCKING AT ELECTRON LEVEL
        firstTab.browserView.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
            console.log('[Popup Blocking] 🚫 ELECTRON-LEVEL: Blocked popup window creation:', url);
            
            // Create new tab instead of popup (with smart Google auth deduplication)
            const isGoogleAuth = url && (url.includes('accounts.google.com/o/oauth2') || url.includes('accounts.google.com/gsi'));
            const shouldBlock = globalRecentPopups.has(url) || (isGoogleAuth && googleAuthCooldown);
            
            if (url && !shouldBlock) {
                globalRecentPopups.add(url);
                
                if (isGoogleAuth) {
                    googleAuthCooldown = true;
                    console.log('[Popup Blocking] 🚫 Google auth cooldown activated for 2 seconds');
                    setTimeout(() => {
                        googleAuthCooldown = false;
                        console.log('[Popup Blocking] ✅ Google auth cooldown cleared');
                    }, 2000);
                }
                
                console.log('[Popup Blocking] ✅ Creating new tab with popup URL directly:', url);
                setTimeout(() => {
                    const domain = url.includes('accounts.google.com') ? 'Google Sign-in' : 'Auth';
                    createNewTab(url, domain);
                }, 100);
                
                setTimeout(() => {
                    globalRecentPopups.delete(url);
                    console.log('[Popup Blocking] 🗑️ Cleared popup URL from dedup list');
                }, 3000);
            } else if (url) {
                if (isGoogleAuth && googleAuthCooldown) {
                    console.log('[Popup Blocking] 🚫 GOOGLE AUTH COOLDOWN: Ignoring additional Google auth popup');
                } else {
                    console.log('[Popup Blocking] 🚫 DUPLICATE: Ignoring duplicate popup request');
                }
            }
            
            return { action: 'deny' };
        });
        
        // Re-position after window is shown to ensure proper layout
        globalBrowserWindow.once('show', () => {
            setTimeout(() => {
                const activeTab = browserTabs.find(tab => tab.id === activeTabId);
                if (activeTab && activeTab.browserView && activeTab.browserView.webContents) {
                    const newBounds = globalBrowserWindow.getBounds();
                    activeTab.browserView.setBounds({
                        x: 0,
                        y: 35,
                        width: newBounds.width,
                        height: newBounds.height - 35
                    });
                    console.log('[WindowManager] Active tab repositioned after window show');
                }
                
                // Force tab UI update after window is shown
                setTimeout(() => {
                    console.log('[WindowManager] 🚀 Forcing initial tab UI update');
                    updateTabUI();
                }, 100);
            }, 200);
        });
        
        // Apply same invisibility and workspace settings as main overlay
        // Apply enhanced privacy protection to browser window
        globalBrowserWindow.setContentProtection(isContentProtectionOn);
        globalBrowserWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        
        // Apply additional macOS privacy protection
        if (process.platform === 'darwin' && isContentProtectionOn) {
            console.log('[WindowManager] 🔒 Applying enhanced privacy protection to browser window');
            globalBrowserWindow.setAlwaysOnTop(true, 'screen-saver');
            globalBrowserWindow.setHasShadow(false);
        }
        
        // macOS specific settings like main overlay
        if (process.platform === 'darwin') {
            globalBrowserWindow.setWindowButtonVisibility(false);
        }
        
        // 🎯 AUTO-FOCUS: Browser window comes to front on mouse hover
        globalBrowserWindow.on('mouse-enter', () => {
            console.log('[Auto-Focus] 🎯 Mouse entered browser window - bringing to front');
            globalBrowserWindow.moveTop();
        });
        
        // Track browser window in the window pool for proper overlay behavior
        windowPool.set('browser', globalBrowserWindow);
        
        // Handle window closed
        globalBrowserWindow.on('closed', () => {
            console.log('[WindowManager] 🌐 Browser window closed');
            // Clean up all tabs
            browserTabs.forEach(tab => {
                try {
                    // BrowserViews are automatically cleaned up when window closes
                    console.log('[WindowManager] Cleaning up tab:', tab.id);
                } catch (error) {
                    console.error('[WindowManager] Error cleaning up tab:', error);
                }
            });
            browserTabs = [];
            activeTabId = null;
            globalBrowserWindow = null;
            windowPool.delete('browser');
            
            // Notify main header that browser window is closed
            const headerWindow = windowPool.get('header');
            if (headerWindow && !headerWindow.isDestroyed()) {
                headerWindow.webContents.executeJavaScript(`
                    window.postMessage({ type: 'browser-window-closed' }, '*');
                    console.log('[WindowManager] Sent browser close message to header');
                `).catch(err => {
                    console.log('[WindowManager] Could not notify header of browser close');
                });
            }
        });

        return { isOpen: true };
    }
};

const navigateBrowserWindow = (url) => {
    const activeTab = browserTabs.find(tab => tab.id === activeTabId);
    if (!activeTab || !activeTab.browserView || !activeTab.browserView.webContents) {
        console.warn('[WindowManager] 🌐 No active tab available for navigation');
        return { success: false, message: 'No active tab' };
    }
    
    try {
        console.log('[WindowManager] 🌐 Navigating active tab to:', url);
        
        // Navigate using active tab's BrowserView
        activeTab.browserView.webContents.loadURL(url);
        
        // Update tab title and URL
        activeTab.url = url;
        const domain = url.replace(/^https?:\/\//, '').split('/')[0];
        activeTab.title = domain;
        
        // Clear and unfocus URL bar after navigation for better UX  
        globalBrowserWindow.webContents.executeJavaScript(`
            const urlBar = document.querySelector('input[placeholder*="Enter URL"]');
            if (urlBar) {
                urlBar.value = '';
                urlBar.placeholder = 'Enter URL or search...';
                urlBar.blur(); // CRITICAL: Remove focus so website is clickable
                console.log('[Browser] 🧹 URL field cleared and unfocused after navigation');
            }
        `).catch(err => {
            console.error('[WindowManager] Error clearing URL bar:', err);
        });
        
        // Update tab UI to reflect new title
        updateTabUI();
        
        // Focus the browser window
        globalBrowserWindow.focus();
        
        return { success: true, url: url };
    } catch (error) {
        console.error('[WindowManager] Error navigating browser window:', error);
        return { success: false, error: error.message };
    }
};

// Additional browser controls for active tab
const browserViewGoBack = () => {
    const activeTab = browserTabs.find(tab => tab.id === activeTabId);
    if (activeTab && activeTab.browserView && activeTab.browserView.webContents) {
        try {
            if (activeTab.browserView.webContents.canGoBack()) {
                activeTab.browserView.webContents.goBack();
                return { success: true };
            }
        } catch (error) {
            console.error('[WindowManager] Error going back:', error);
        }
    }
    return { success: false };
};

const browserViewGoForward = () => {
    const activeTab = browserTabs.find(tab => tab.id === activeTabId);
    if (activeTab && activeTab.browserView && activeTab.browserView.webContents) {
        try {
            if (activeTab.browserView.webContents.canGoForward()) {
                activeTab.browserView.webContents.goForward();
                return { success: true };
            }
        } catch (error) {
            console.error('[WindowManager] Error going forward:', error);
        }
    }
    return { success: false };
};

const browserViewReload = () => {
    const activeTab = browserTabs.find(tab => tab.id === activeTabId);
    if (activeTab && activeTab.browserView && activeTab.browserView.webContents) {
        try {
            activeTab.browserView.webContents.reload();
            return { success: true };
        } catch (error) {
            console.error('[WindowManager] Error reloading:', error);
        }
    }
    return { success: false };
};

const positionBrowserView = () => {
    const activeTab = browserTabs.find(tab => tab.id === activeTabId);
    if (activeTab && activeTab.browserView && globalBrowserWindow && !globalBrowserWindow.isDestroyed()) {
        try {
            const bounds = globalBrowserWindow.getBounds();
            activeTab.browserView.setBounds({
                x: 0,
                y: 35, // Below title bar
                width: bounds.width,
                height: bounds.height - 35
            });
            console.log('[WindowManager] Active BrowserView repositioned below title bar');
            return { success: true };
        } catch (error) {
            console.error('[WindowManager] Error positioning BrowserView:', error);
        }
    }
    return { success: false };
};

// Multi-tab support functions
function createNewTabInternal(title = 'New Tab', url = 'https://www.google.com') {
    const { BrowserView } = require('electron');
    const tabId = Date.now().toString(); // Simple ID generation
    
    console.log('[WindowManager] Creating internal tab:', { id: tabId, title, url });
    
    const browserView = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            enableRemoteModule: false,
            partition: 'persist:browser',
            plugins: true,
            experimentalFeatures: false,
            backgroundThrottling: false,
            // Enhanced privacy settings
            disableDialogs: true, // Prevent alert/confirm dialogs from being visible
            contextIsolation: true,
            sandbox: false, // Keep false for functionality but could be enabled for more security
        }
    });
    
    // Add event listeners for automatic title updates and privacy protection
    browserView.webContents.on('page-title-updated', () => {
        console.log('[WindowManager] 🏷️ Page title updated for tab:', tabId);
        // Update tab UI when title changes
        setTimeout(() => {
            updateTabUI();
        }, 100);
    });
    
    browserView.webContents.on('did-finish-load', () => {
        console.log('[WindowManager] 📄 Page loaded for tab:', tabId);
        
        // Inject comprehensive privacy CSS and JavaScript + RESTORE IFRAME BLOCKING
        if (!browserView.__privacyCSSInjected) {
            // Comprehensive CSS to block all cursor changes and tooltips + UNIVERSAL IFRAME BLOCKING
            browserView.webContents.insertCSS(`
                /* PRIVACY: Force default cursor everywhere */
                *, *:before, *:after, 
                a, a:hover, a:active, a:visited,
                button, button:hover, button:active,
                input, input:hover, input:active,
                select, option, textarea,
                [role="button"], [role="link"],
                .btn, .button, .link,
                img, svg, canvas,
                [onclick], [onmouseover], [href],
                [tabindex], [draggable] {
                    cursor: default !important;
                    pointer-events: auto !important;
                }
                
                /* PRIVACY: Remove all tooltips and titles */
                [title] { 
                    cursor: default !important;
                }
                
                /* PRIVACY: Block tooltip pseudo-elements */
                *:hover::before, *:hover::after,
                [title]:hover::before, [title]:hover::after,
                [data-tooltip]:hover::before, [data-tooltip]:hover::after,
                .tooltip, .tooltip:hover,
                .tippy-box, .tippy-content {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                
                /* PRIVACY: Block common tooltip classes */
                .tooltip, .tooltiptext, .tooltip-content,
                .tippy, .tippy-tooltip, .tippy-box,
                .hint, .hint-tooltip,
                .ui-tooltip, .ui-tooltip-content,
                [data-bs-toggle="tooltip"],
                [data-toggle="tooltip"] {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                /* 🚫 UNIVERSAL IFRAME BLOCKING - PREVENT ALL IFRAME LEAKS */
                iframe, object[data*="html"], embed[src*="html"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    width: 0 !important;
                    height: 0 !important;
                    position: absolute !important;
                    left: -9999px !important;
                    top: -9999px !important;
                    pointer-events: none !important;
                }
                
                /* 🚫 BLOCK SPECIFIC GOOGLE APPS MENU ONLY - MORE TARGETED */
                [data-ogsr-up], 
                .gb_pc, .gb_Ra, .gb_Sa, .gb_Ta, .gb_Ua, .gb_Va, .gb_Wa,
                .VYBDae-Bz112c, .VYBDae-Bz112c-LgbsSe, 
                .gb_g, .gb_h, .gb_i,
                [aria-label="Google apps"][role="button"] + div,
                [aria-label="Google apps"] ~ div[role="menu"],
                div[data-ved][role="menu"],
                div[jsname="V68bde"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                
                /* 🚫 BLOCK TOOLTIPS AND MODALS BUT PRESERVE FUNCTIONAL DROPDOWNS */
                [role="tooltip"], 
                [aria-modal="true"],
                .tooltip-inner, .popover, .popover-content,
                div[class*="tooltip"], div[id*="tooltip"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
            `).then(() => {
                browserView.__privacyCSSInjected = true;
            }).catch(() => {
                // Silent fail
            });
            
            // Also inject JavaScript to disable tooltips programmatically + RESTORE UNIVERSAL IFRAME BLOCKING
            browserView.webContents.executeJavaScript(`
                (function() {
                    try {
                        // 🚫 UNIVERSAL IFRAME BLOCKING - COMPREHENSIVE SOLUTION
                        console.log('[IFrame Blocking] 🛡️ Implementing universal iframe blocking...');
                        
                        // 1. REMOVE ALL EXISTING IFRAMES
                        const removeAllIframes = () => {
                            const iframes = document.querySelectorAll('iframe, object[data*="html"], embed[src*="html"]');
                            console.log('[IFrame Blocking] 🗑️ Found and removing', iframes.length, 'existing iframes');
                            iframes.forEach((iframe, index) => {
                                console.log('[IFrame Blocking] Removing iframe', index + 1, ':', iframe.src || iframe.data || 'no-src');
                                iframe.remove();
                            });
                        };
                        
                        // Remove existing iframes immediately
                        removeAllIframes();
                        
                        // 2. HIJACK IFRAME CREATION
                        const originalCreateElement = document.createElement;
                        document.createElement = function(tagName) {
                            if (tagName && tagName.toLowerCase() === 'iframe') {
                                console.log('[IFrame Blocking] 🚫 BLOCKED: Attempted iframe creation via createElement');
                                const dummyDiv = originalCreateElement.call(document, 'div');
                                dummyDiv.style.display = 'none';
                                return dummyDiv;
                            }
                            return originalCreateElement.apply(document, arguments);
                        };
                        
                        // 3. HIJACK INNERHTML IFRAME INJECTION
                        const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
                        Object.defineProperty(Element.prototype, 'innerHTML', {
                            set: function(value) {
                                if (typeof value === 'string' && value.toLowerCase().includes('<iframe')) {
                                    console.log('[IFrame Blocking] 🚫 BLOCKED: innerHTML with iframe detected');
                                    value = value.replace(/<iframe[^>]*>.*?<\\/iframe>/gis, '');
                                    value = value.replace(/<iframe[^>]*\\/>/gis, '');
                                }
                                return originalInnerHTMLSetter.call(this, value);
                            },
                            get: function() {
                                return this.innerHTML;
                            },
                            configurable: true
                        });
                        
                        // 4. MUTATION OBSERVER - CATCH ALL IFRAME ADDITIONS
                        const iframeBlockingObserver = new MutationObserver(mutations => {
                            mutations.forEach(mutation => {
                                if (mutation.type === 'childList') {
                                    mutation.addedNodes.forEach(node => {
                                        if (node.nodeType === 1) {
                                            if (node.tagName && node.tagName.toLowerCase() === 'iframe') {
                                                console.log('[IFrame Blocking] 🚫 BLOCKED: MutationObserver caught iframe addition:', node.src || 'no-src');
                                                node.remove();
                                            }
                                            if (node.querySelectorAll) {
                                                const nestedIframes = node.querySelectorAll('iframe, object[data*="html"], embed[src*="html"]');
                                                if (nestedIframes.length > 0) {
                                                    console.log('[IFrame Blocking] 🚫 BLOCKED: Found', nestedIframes.length, 'nested iframes');
                                                    nestedIframes.forEach(iframe => iframe.remove());
                                                }
                                            }
                                        }
                                    });
                                }
                            });
                        });
                        
                        iframeBlockingObserver.observe(document.documentElement, {
                            childList: true,
                            subtree: true
                        });
                        
                        // 5. PERIODIC IFRAME CLEANUP + GOOGLE APPS BUTTON BLOCKING
                        setInterval(() => {
                            removeAllIframes();
                            
                            // Clean up Google Apps menu popups
                            const specificPopups = document.querySelectorAll('[data-ogsr-up], .gb_pc, .gb_Ra, div[data-ved][role="menu"], div[jsname="V68bde"]');
                            if (specificPopups.length > 0) {
                                console.log('[IFrame Blocking] 🗑️ Removing', specificPopups.length, 'popup elements');
                                specificPopups.forEach(popup => popup.remove());
                            }
                            
                            // Block Google Apps button clicks aggressively
                            const googleAppsButtons = document.querySelectorAll('[aria-label="Google apps"], .gb_d, .gb_A, .gb_3');
                            googleAppsButtons.forEach(button => {
                                const newButton = button.cloneNode(true);
                                button.parentNode?.replaceChild(newButton, button);
                                newButton.addEventListener('click', (e) => {
                                    console.log('[Click Blocking] 🚫 BLOCKED: Google Apps button click');
                                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false;
                                }, true);
                                newButton.addEventListener('mousedown', (e) => {
                                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false;
                                }, true);
                            });
                        }, 3000);
                        
                        // 6. INTERCEPT POPUP WINDOW CREATION
                        const originalWindowOpen = window.open;
                        window.open = function(url, name, features) {
                            console.log('[Popup Blocking] 🚫 BLOCKED: window.open intercepted:', url);
                            
                            if (url && typeof url === 'string') {
                                try {
                                    window.parent.postMessage({
                                        type: 'create-tab-from-popup',
                                        url: url,
                                        source: 'popup-intercept'
                                    }, '*');
                                    console.log('[Popup Blocking] ✅ Redirected popup to new tab:', url);
                                } catch (e) {
                                    console.log('[Popup Blocking] Could not redirect popup to tab:', e);
                                }
                            }
                            
                            return {
                                closed: false,
                                close: () => {},
                                focus: () => {},
                                blur: () => {},
                                postMessage: () => {}
                            };
                        };
                        
                        console.log('[IFrame Blocking] ✅ Universal iframe blocking + popup interception active!');
                        
                        // Original tooltip blocking code
                        document.querySelectorAll('[title]').forEach(el => {
                            el.removeAttribute('title');
                            el.setAttribute('data-original-title', ''); // Block Bootstrap tooltips
                        });
                        
                        // Override tooltip creation functions
                        if (window.tippy) window.tippy = () => {};
                        if (window.Tooltip) window.Tooltip = function() {};
                        
                        // Block title attribute mutations
                        const observer = new MutationObserver(mutations => {
                            mutations.forEach(mutation => {
                                if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                                    mutation.target.removeAttribute('title');
                                }
                            });
                        });
                        observer.observe(document.documentElement, {
                            attributes: true,
                            subtree: true,
                            attributeFilter: ['title']
                        });
                        
                        // Periodic enforcement for dynamically added content
                        setInterval(() => {
                            document.querySelectorAll('[title]').forEach(el => {
                                el.removeAttribute('title');
                            });
                        }, 2000);
                        
                        console.log('[Privacy] Website tooltips and cursors disabled with continuous enforcement');
                    } catch(e) {
                        console.error('[IFrame Blocking] Error in iframe blocking script:', e);
                    }
                })();
            `).catch(() => {
                // Silent fail
            });
        }
        
        // Update tab UI when page finishes loading
        setTimeout(() => {
            updateTabUI();
        }, 500); // Give time for title to be set
    });
    
    browserView.webContents.on('did-navigate', () => {
        console.log('[WindowManager] 🧭 Navigation completed for tab:', tabId);
        
        // Re-apply privacy protection + iframe blocking on navigation (for SPAs/AJAX)
        setTimeout(() => {
            browserView.webContents.executeJavaScript(`
                (function() {
                    try {
                        // Re-apply iframe blocking on navigation
                        console.log('[IFrame Blocking] 🔄 Re-applying iframe blocking on navigation...');
                        const iframes = document.querySelectorAll('iframe, object[data*="html"], embed[src*="html"]');
                        console.log('[IFrame Blocking] 🗑️ Navigation cleanup: removing', iframes.length, 'iframes');
                        iframes.forEach(iframe => iframe.remove());
                        
                        // Remove popup elements
                        const specificPopups = document.querySelectorAll('[data-ogsr-up], .gb_pc, .gb_Ra, div[data-ved][role="menu"], div[jsname="V68bde"]');
                        if (specificPopups.length > 0) {
                            console.log('[IFrame Blocking] 🗑️ Navigation cleanup: removing', specificPopups.length, 'popup elements');
                            specificPopups.forEach(popup => popup.remove());
                        }
                        
                        // Remove all title attributes again
                        document.querySelectorAll('[title]').forEach(el => {
                            el.removeAttribute('title');
                        });
                        console.log('[Privacy] Navigation privacy + iframe blocking re-applied');
                    } catch(e) {
                        // Silent fail
                    }
                })();
            `).catch(() => {
                // Silent fail
            });
        }, 1000);
        
        // Update tab UI when navigation completes
        setTimeout(() => {
            updateTabUI();
        }, 300);
    });
    
    browserView.webContents.on('dom-ready', () => {
        console.log('[WindowManager] 🌍 DOM ready for tab:', tabId);
        
        // Apply privacy protection + iframe blocking as soon as DOM is ready
        browserView.webContents.executeJavaScript(`
            (function() {
                try {
                    // Immediate iframe blocking on DOM ready
                    console.log('[IFrame Blocking] 🚀 DOM-ready iframe blocking...');
                    const iframes = document.querySelectorAll('iframe, object[data*="html"], embed[src*="html"]');
                    console.log('[IFrame Blocking] 🗑️ DOM-ready cleanup: removing', iframes.length, 'iframes');
                    iframes.forEach(iframe => iframe.remove());
                    
                    // Remove popup elements immediately
                    const specificPopups = document.querySelectorAll('[data-ogsr-up], .gb_pc, .gb_Ra, div[data-ved][role="menu"], div[jsname="V68bde"]');
                    if (specificPopups.length > 0) {
                        console.log('[IFrame Blocking] 🗑️ DOM-ready cleanup: removing', specificPopups.length, 'popup elements');
                        specificPopups.forEach(popup => popup.remove());
                    }
                    
                    // Immediate privacy enforcement
                    document.querySelectorAll('[title]').forEach(el => {
                        el.removeAttribute('title');
                    });
                    console.log('[Privacy] DOM-ready privacy + iframe blocking applied');
                } catch(e) {
                    // Silent fail
                }
            })();
        `).catch(() => {
            // Silent fail
        });
    });
    
    // 🚫 ADD POPUP BLOCKING TO THIS TAB
    browserView.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
        console.log('[Popup Blocking] 🚫 ELECTRON-LEVEL: Blocked popup for tab', tabId, ':', url);
        
        // Smart deduplication for Google auth
        const isGoogleAuth = url && (url.includes('accounts.google.com/o/oauth2') || url.includes('accounts.google.com/gsi'));
        const shouldBlock = globalRecentPopups.has(url) || (isGoogleAuth && googleAuthCooldown);
        
        if (url && !shouldBlock) {
            globalRecentPopups.add(url);
            
            if (isGoogleAuth) {
                googleAuthCooldown = true;
                console.log('[Popup Blocking] 🚫 Google auth cooldown activated for 2 seconds');
                setTimeout(() => {
                    googleAuthCooldown = false;
                    console.log('[Popup Blocking] ✅ Google auth cooldown cleared');
                }, 2000);
            }
            
            console.log('[Popup Blocking] ✅ Creating new tab with popup URL directly:', url);
            setTimeout(() => {
                const domain = url.includes('accounts.google.com') ? 'Google Sign-in' : 'Auth';
                createNewTab(url, domain);
            }, 100);
            
            setTimeout(() => {
                globalRecentPopups.delete(url);
                console.log('[Popup Blocking] 🗑️ Cleared popup URL from dedup list');
            }, 3000);
        } else if (url) {
            if (isGoogleAuth && googleAuthCooldown) {
                console.log('[Popup Blocking] 🚫 GOOGLE AUTH COOLDOWN: Ignoring additional Google auth popup for tab', tabId);
            } else {
                console.log('[Popup Blocking] 🚫 DUPLICATE: Ignoring duplicate popup request for tab', tabId);
            }
        }
        
        return { action: 'deny' };
    });
    
    const tab = {
        id: tabId,
        title: title,
        url: url,
        browserView: browserView
    };
    
    console.log('[WindowManager] ✅ Internal tab created successfully with popup blocking:', tabId);
    return tab;
}

const setBrowserWindowOpacity = (opacity) => {
    if (globalBrowserWindow && !globalBrowserWindow.isDestroyed()) {
        try {
            globalBrowserWindow.setOpacity(parseFloat(opacity));
            console.log('[WindowManager] Browser window opacity set to:', opacity);
            return { success: true, opacity: opacity };
        } catch (error) {
            console.error('[WindowManager] Error setting browser window opacity:', error);
        }
    }
    return { success: false };
};

const resizeBrowserWindow = (deltaWidth, deltaHeight) => {
    if (globalBrowserWindow && !globalBrowserWindow.isDestroyed()) {
        try {
            const currentBounds = globalBrowserWindow.getBounds();
            const newWidth = Math.max(400, currentBounds.width + deltaWidth); // Minimum width 400px
            const newHeight = Math.max(300, currentBounds.height + deltaHeight); // Minimum height 300px
            
            globalBrowserWindow.setSize(newWidth, newHeight);
            
            // Reposition active BrowserView to fit new window size
            positionBrowserView();
            
            console.log('[WindowManager] 🔧 Browser window resized to:', newWidth, 'x', newHeight);
            return { success: true, width: newWidth, height: newHeight };
        } catch (error) {
            console.error('[WindowManager] Error resizing browser window:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: false, message: 'No browser window available' };
};

const createNewTab = (customUrl = null, customTitle = null) => {
    if (!globalBrowserWindow || globalBrowserWindow.isDestroyed()) {
        return { success: false, message: 'No browser window open' };
    }
    
    try {
        const url = customUrl || 'https://www.google.com';
        const title = customTitle || 'Google';
        
        console.log('[WindowManager] Creating new tab with URL:', url);
        const newTab = createNewTabInternal(title, url);
        browserTabs.push(newTab);
        
        // Switch to new tab immediately
        const switchResult = switchTab(newTab.id);
        
        // Update UI to show new tab count
        setTimeout(() => {
            console.log('[WindowManager] 🔄 Calling updateTabUI after new tab creation');
            updateTabUI();
        }, 200);
        
        console.log('[WindowManager] ✅ Created new tab:', newTab.id, 'Total tabs:', browserTabs.length);
        return { success: true, tabId: newTab.id, totalTabs: browserTabs.length };
    } catch (error) {
        console.error('[WindowManager] Error creating new tab:', error);
        return { success: false, error: error.message };
    }
};

const switchTab = (tabId) => {
    const tab = browserTabs.find(t => t.id === tabId);
    if (!tab || !globalBrowserWindow || globalBrowserWindow.isDestroyed()) {
        console.warn('[WindowManager] Tab or window not found for switching');
        return { success: false, message: 'Tab or window not found' };
    }
    
    try {
        console.log('[WindowManager] Switching to tab:', tabId, 'from:', activeTabId);
        
        // Hide current active tab
        const currentTab = browserTabs.find(t => t.id === activeTabId);
        if (currentTab && currentTab.browserView && currentTab.id !== tabId) {
            try {
                globalBrowserWindow.removeBrowserView(currentTab.browserView);
                console.log('[WindowManager] Removed current tab:', currentTab.id);
            } catch (removeError) {
                console.warn('[WindowManager] Could not remove current tab view:', removeError.message);
            }
        }
        
        // Show new active tab
        globalBrowserWindow.setBrowserView(tab.browserView);
        activeTabId = tabId;
        
        // Position the new active tab
        const bounds = globalBrowserWindow.getBounds();
        tab.browserView.setBounds({
            x: 0,
            y: 35,
            width: bounds.width,
            height: bounds.height - 35
        });
        
        // Load content if not already loaded
        const currentUrl = tab.browserView.webContents.getURL();
        if (!currentUrl || currentUrl === 'about:blank' || currentUrl === '') {
            console.log('[WindowManager] Loading content for new tab:', tab.url);
            tab.browserView.webContents.loadURL(tab.url);
        }
        
        // Update tab UI after switching
        setTimeout(() => {
            console.log('[WindowManager] 🔄 Calling updateTabUI after tab switch');
            updateTabUI();
        }, 100);
        
        console.log('[WindowManager] ✅ Switched to tab:', tabId, 'Total tabs:', browserTabs.length);
        return { success: true, tabId: tabId, totalTabs: browserTabs.length };
    } catch (error) {
        console.error('[WindowManager] Error switching tab:', error);
        return { success: false, error: error.message };
    }
};

const closeTab = (tabId) => {
    if (browserTabs.length <= 1) {
        return { success: false, message: 'Cannot close last tab' };
    }
    
    try {
        const tabIndex = browserTabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) {
            return { success: false, message: 'Tab not found' };
        }
        
        const tab = browserTabs[tabIndex];
        
        // Remove BrowserView from window
        if (tab.browserView) {
            globalBrowserWindow.removeBrowserView(tab.browserView);
        }
        
        // Remove from tabs array
        browserTabs.splice(tabIndex, 1);
        
        // Switch to another tab if this was active
        if (activeTabId === tabId) {
            const newActiveTab = browserTabs[Math.max(0, tabIndex - 1)];
            switchTab(newActiveTab.id);
        }
        
        // Update tab UI
        updateTabUI();
        
        console.log('[WindowManager] Closed tab:', tabId);
        return { success: true, tabId: tabId };
    } catch (error) {
        console.error('[WindowManager] Error closing tab:', error);
        return { success: false, error: error.message };
    }
};

const switchTabByIndex = (tabIndex) => {
    try {
        if (tabIndex < 0 || tabIndex >= browserTabs.length) {
            console.warn('[WindowManager] Invalid tab index:', tabIndex);
            return { success: false, message: 'Invalid tab index' };
        }
        
        const tab = browserTabs[tabIndex];
        if (!tab) {
            return { success: false, message: 'Tab not found at index' };
        }
        
        console.log('[WindowManager] 🔄 Switching to tab by index:', tabIndex, 'ID:', tab.id);
        return switchTab(tab.id);
    } catch (error) {
        console.error('[WindowManager] Error switching tab by index:', error);
        return { success: false, error: error.message };
    }
};

const closeTabByIndex = (tabIndex) => {
    try {
        if (tabIndex < 0 || tabIndex >= browserTabs.length) {
            console.warn('[WindowManager] Invalid tab index for closing:', tabIndex);
            return { success: false, message: 'Invalid tab index' };
        }
        
        if (browserTabs.length <= 1) {
            console.warn('[WindowManager] Cannot close last tab');
            return { success: false, message: 'Cannot close last tab' };
        }
        
        const tab = browserTabs[tabIndex];
        console.log('[WindowManager] 🗑️ Closing tab by index:', tabIndex, 'ID:', tab.id);
        
        return closeTab(tab.id);
    } catch (error) {
        console.error('[WindowManager] Error closing tab by index:', error);
        return { success: false, error: error.message };
    }
};

const updateTabUI = () => {
    if (!globalBrowserWindow || globalBrowserWindow.isDestroyed() || browserTabs.length === 0) return;
    
    try {
        const totalTabs = browserTabs.length;
        const activeIndex = browserTabs.findIndex(tab => tab.id === activeTabId);
        
        console.log('[WindowManager] 📱 Updating tab UI for', totalTabs, 'tabs, active:', activeIndex);
        
        // Get actual website titles from BrowserViews
        const tabTitles = browserTabs.map((tab, index) => {
            try {
                if (tab.browserView && tab.browserView.webContents) {
                    let title = tab.browserView.webContents.getTitle();
                    
                    // Fallback to URL-based title if page title is empty/generic
                    if (!title || title === '' || title === 'New Tab' || title === 'about:blank') {
                        const url = tab.browserView.webContents.getURL();
                        if (url && url !== 'about:blank' && url !== '') {
                            try {
                                const urlObj = new URL(url);
                                title = urlObj.hostname.replace('www.', '').split('.')[0];
                                title = title.charAt(0).toUpperCase() + title.slice(1);
                            } catch {
                                title = `Tab ${index + 1}`;
                            }
                        } else {
                            title = `Tab ${index + 1}`;
                        }
                    }
                    
                    // Limit title length for better UI
                    if (title.length > 15) {
                        title = title.substring(0, 15) + '...';
                    }
                    
                    return title;
                } else {
                    return `Tab ${index + 1}`;
                }
            } catch (error) {
                console.warn('[WindowManager] Error getting title for tab', index, ':', error.message);
                return `Tab ${index + 1}`;
            }
        });
        
        console.log('[WindowManager] 🏷️ Tab titles:', tabTitles);
        
        // Escape titles for safe JavaScript injection
        const escapedTitles = tabTitles.map(title => title.replace(/'/g, "\\'").replace(/"/g, '\\"'));
        
        // Use a much simpler approach - just update text content and styles
            globalBrowserWindow.webContents.executeJavaScript(`
            (function() {
                try {
                const container = document.getElementById('tab-container');
                    if (!container) return;
                    
                    container.innerHTML = '';
                    const tabTitles = ${JSON.stringify(escapedTitles)};
                    
                    // Create tab elements based on count
                    for (let i = 0; i < ${totalTabs}; i++) {
                        const tab = document.createElement('div');
                        const isActive = i === ${activeIndex};
                        
                        // Tab wrapper with flexbox for title and close button
                        tab.style.cssText = 'background: ' + (isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.3)') + '; color: ' + (isActive ? 'black' : 'white') + '; padding: 6px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; min-width: 70px; margin-right: 4px; cursor: default; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;';
                        tab.setAttribute('data-tab-index', i);
                        
                        // Tab title (clickable for switching)
                        const tabTitle = document.createElement('span');
                        tabTitle.textContent = tabTitles[i] || ('Tab ' + (i + 1));
                        tabTitle.style.cssText = 'flex: 1; cursor: default; user-select: none;';
                        tabTitle.onclick = function(e) {
                            e.stopPropagation();
                            const tabIndex = parseInt(tab.getAttribute('data-tab-index'));
                            console.log('[TabUI] Clicked tab', tabIndex + 1, ':', tabTitles[tabIndex]);
                            if (window.electronAPI && window.electronAPI.switchTabByIndex) {
                                window.electronAPI.switchTabByIndex(tabIndex);
                            }
                        };
                        
                        // Close button (only show if more than 1 tab)
                        if (${totalTabs} > 1) {
                            const closeBtn = document.createElement('span');
                            closeBtn.innerHTML = '&times;';
                            closeBtn.style.cssText = 'width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; border-radius: 2px; cursor: default; font-size: 12px; font-weight: bold; opacity: 0.7; transition: all 0.2s ease;';
                            closeBtn.onmouseover = function() { this.style.opacity = '1'; this.style.background = 'rgba(255, 255, 255, 0.2)'; };
                            closeBtn.onmouseout = function() { this.style.opacity = '0.7'; this.style.background = 'transparent'; };
                            closeBtn.onclick = function(e) {
                                e.stopPropagation();
                                const tabIndex = parseInt(tab.getAttribute('data-tab-index'));
                                console.log('[TabUI] Closing tab', tabIndex + 1);
                                if (window.electronAPI && window.electronAPI.closeTabByIndex) {
                                    window.electronAPI.closeTabByIndex(tabIndex);
                                }
                            };
                            tab.appendChild(tabTitle);
                            tab.appendChild(closeBtn);
                        } else {
                            // No close button for single tab
                            tab.appendChild(tabTitle);
                        }
                        
                        container.appendChild(tab);
                    }
                    
                    // Always add + button (no cursor pointer for privacy)
                    const plus = document.createElement('button');
                    plus.innerHTML = '+';
                    plus.style.cssText = 'background: rgba(34, 139, 34, 0.8); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: default; font-size: 14px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin-left: 4px; transition: all 0.2s ease;';
                    plus.onmouseover = function() { this.style.background = 'rgba(34, 139, 34, 1)'; };
                    plus.onmouseout = function() { this.style.background = 'rgba(34, 139, 34, 0.8)'; };
                    plus.onclick = function() { 
                        console.log('[TabUI] Plus button clicked');
                        if (window.electronAPI && window.electronAPI.createNewTab) {
                            window.electronAPI.createNewTab();
                        }
                    };
                    
                    container.appendChild(plus);
                    console.log('[TabUI] ✅ Created', ${totalTabs}, 'tabs with titles:', tabTitles);
                    
                } catch (err) {
                    console.error('[TabUI] Error updating tabs:', err);
                }
            })();
        `).catch(err => {
            console.error('[WindowManager] Error executing tab UI script:', err);
        });
        
    } catch (error) {
        console.error('[WindowManager] Tab UI update error:', error);
    }
};


// Create new tab with URL wrapper function  
const createNewTabWithUrl = (url, title = null) => {
    return createNewTab(url, title);
};

// Tutorial window management functions
const showTutorialWindow = (autoPlay = false) => {
    console.log(`[TutorialWindow] 🎓 Showing tutorial window... (autoPlay: ${autoPlay})`);
    
    const tutorialWin = windowPool.get('tutorial');
    if (tutorialWin && !tutorialWin.isDestroyed()) {
        console.log('[TutorialWindow] ✅ Tutorial window found, making visible');
        tutorialWin.show();
        tutorialWin.center();
        tutorialWin.moveTop();
        tutorialWin.focus();
        
        // Pass autoPlay setting to the tutorial window
        setTimeout(() => {
            tutorialWin.webContents.executeJavaScript(`
                if (typeof window.setAutoPlay === 'function') {
                    window.setAutoPlay(${autoPlay});
                } else {
                    window.tutorialAutoPlay = ${autoPlay};
                }
            `).catch(error => {
                console.warn('[TutorialWindow] Could not set autoPlay:', error);
            });
        }, 100); // Small delay to ensure the window content is loaded
        
        return { success: true };
    } else {
        console.warn('[TutorialWindow] ⚠️ Tutorial window not available');
        return { success: false, error: 'Tutorial window not available' };
    }
};

const hideTutorialWindow = () => {
    console.log('[TutorialWindow] 🙈 Hiding tutorial window...');
    
    const tutorialWin = windowPool.get('tutorial');
    if (tutorialWin && !tutorialWin.isDestroyed()) {
        tutorialWin.hide();
        console.log('[TutorialWindow] ✅ Tutorial window hidden');
        return { success: true };
    } else {
        console.warn('[TutorialWindow] ⚠️ Tutorial window not available to hide');
        return { success: false, error: 'Tutorial window not available' };
    }
};

const isTutorialWindowVisible = () => {
    const tutorialWin = windowPool.get('tutorial');
    return tutorialWin && !tutorialWin.isDestroyed() && tutorialWin.isVisible();
};

module.exports = {
    createWindows,
    windowPool,
    toggleContentProtection,
    resizeHeaderWindow,
    getContentProtectionStatus,
    showSettingsWindow,
    hideSettingsWindow,
    cancelHideSettingsWindow,
    openLoginPage,
    moveWindowStep,
    handleHeaderStateChanged,
    handleHeaderAnimationFinished,
    getHeaderPosition,
    moveHeaderTo,
    adjustWindowHeight,
    toggleBrowserWindow,
    navigateBrowserWindow,
    browserViewGoBack,
    browserViewGoForward,
    browserViewReload,
    positionBrowserView,
    setBrowserWindowOpacity,
    resizeBrowserWindow,
    createNewTab,
    createNewTabWithUrl,
    switchTab,
    switchTabByIndex,
    closeTab,
    closeTabByIndex,
    updateTabUI,
    showTutorialWindow,
    hideTutorialWindow,
    isTutorialWindowVisible
};