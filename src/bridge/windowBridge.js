// src/bridge/windowBridge.js
const { ipcMain, shell } = require('electron');

// Bridge는 단순히 IPC 핸들러를 등록하는 역할만 함 (비즈니스 로직 없음)
module.exports = {
  initialize() {
    // initialize 시점에 windowManager를 require하여 circular dependency 문제 해결
    const windowManager = require('../window/windowManager');
    
    // 기존 IPC 핸들러들
    ipcMain.handle('toggle-content-protection', () => windowManager.toggleContentProtection());
    ipcMain.handle('resize-header-window', (event, args) => windowManager.resizeHeaderWindow(args));
    ipcMain.handle('get-content-protection-status', () => windowManager.getContentProtectionStatus());
    ipcMain.on('show-settings-window', () => windowManager.showSettingsWindow());
    ipcMain.on('hide-settings-window', () => windowManager.hideSettingsWindow());
    ipcMain.on('cancel-hide-settings-window', () => windowManager.cancelHideSettingsWindow());

    ipcMain.handle('open-login-page', () => windowManager.openLoginPage());
    ipcMain.handle('open-personalize-page', () => windowManager.openLoginPage());
    ipcMain.handle('move-window-step', (event, direction) => windowManager.moveWindowStep(direction));
    ipcMain.handle('open-external', (event, url) => shell.openExternal(url));

    // Newly moved handlers from windowManager
    ipcMain.on('header-state-changed', (event, state) => windowManager.handleHeaderStateChanged(state));
    ipcMain.on('header-animation-finished', (event, state) => windowManager.handleHeaderAnimationFinished(state));
    ipcMain.handle('get-header-position', () => windowManager.getHeaderPosition());
    ipcMain.handle('move-header-to', (event, newX, newY) => windowManager.moveHeaderTo(newX, newY));
    ipcMain.handle('adjust-window-height', (event, { winName, height }) => windowManager.adjustWindowHeight(winName, height));
    
    // Close window handler for popup windows (close the window that sent the event)
    ipcMain.handle('window:close', (event) => {
      const senderWindow = event.sender.getOwnerBrowserWindow();
      if (senderWindow) {
        senderWindow.close();
        console.log('[WindowBridge] Window closed via close button');
      }
    });

    // Tutorial window specific close handler
    ipcMain.handle('tutorial:close', () => {
      const windowManager = require('../window/windowManager');
      const result = windowManager.hideTutorialWindow();
      console.log('[WindowBridge] Tutorial window close result:', result);
      return result;
    });

    // Interactive tutorial handlers
    ipcMain.handle('tutorial:highlightElement', (event, elementId) => {
      console.log('[WindowBridge] Highlighting element:', elementId);
      
      // Send highlight command to all content windows
      const windowManager = require('../window/windowManager');
      const { windowPool } = windowManager;
      
      windowPool.forEach((window, name) => {
        if (!window.isDestroyed() && name !== 'header' && name !== 'tutorial') {
          const script = 
            'console.log("[' + name + '] Highlighting element: ' + elementId + '");' +
            'try {' +
            '  const element = document.querySelector("[data-tutorial=\\"' + elementId + '\\"]") || ' +
            '  document.querySelector("#' + elementId + '") || ' +
            '  document.querySelector(".' + elementId + '");' +
            '  if (element) {' +
            '    element.style.boxShadow = "0 0 0 3px rgba(144, 81, 81, 0.8), 0 0 20px rgba(144, 81, 81, 0.6)";' +
            '    element.style.borderRadius = "8px";' +
            '    element.style.position = "relative";' +
            '    element.style.zIndex = "9999";' +
            '    element.style.background = "rgba(144, 81, 81, 0.1)";' +
            '    element.scrollIntoView({ behavior: "smooth", block: "center" });' +
            '    element.setAttribute("data-tutorial-highlighted", "true");' +
            '    console.log("[' + name + '] ✅ Element highlighted:", element.tagName);' +
            '  } else {' +
            '    console.log("[' + name + '] ⚠️ Element not found for highlighting: ' + elementId + '");' +
            '  }' +
            '} catch (error) {' +
            '  console.error("[' + name + '] Error in highlighting script:", error);' +
            '}';
          
          window.webContents.executeJavaScript(script).catch(error => {
            console.error(`[WindowBridge] Error highlighting in ${name}:`, error);
          });
        }
      });
      
      return { success: true };
    });

    ipcMain.handle('tutorial:clearHighlights', () => {
      console.log('[WindowBridge] Clearing all highlights');
      
      const windowManager = require('../window/windowManager');
      const { windowPool } = windowManager;
      
      windowPool.forEach((window, name) => {
        if (!window.isDestroyed() && name !== 'header' && name !== 'tutorial') {
          const script = 
            'console.log("[' + name + '] Clearing tutorial highlights");' +
            'try {' +
            '  document.querySelectorAll("[data-tutorial-highlighted=\\"true\\"]").forEach(el => {' +
            '    el.style.boxShadow = "";' +
            '    el.style.background = "";' +
            '    el.style.borderRadius = "";' +
            '    el.style.position = "";' +
            '    el.style.zIndex = "";' +
            '    el.removeAttribute("data-tutorial-highlighted");' +
            '  });' +
            '} catch (error) {' +
            '  console.error("[' + name + '] Error clearing highlights:", error);' +
            '}';
          
          window.webContents.executeJavaScript(script).catch(error => {
            console.error(`[WindowBridge] Error clearing highlights in ${name}:`, error);
          });
        }
      });
      
      return { success: true };
    });

    ipcMain.handle('tutorial:complete', () => {
      console.log('[WindowBridge] Tutorial completed by user');
      
      // Mark tutorial as completed in localStorage
      const windowManager = require('../window/windowManager');
      const { windowPool } = windowManager;
      
      windowPool.forEach((window, name) => {
        if (!window.isDestroyed() && name !== 'header' && name !== 'tutorial') {
          const script = 
            'console.log("[' + name + '] Marking tutorial as completed");' +
            'try {' +
            '  var progress = JSON.parse(localStorage.getItem("leviousa-tutorial-progress") || "{\\"completedFlows\\": []}");' +
            '  if (!progress.completedFlows.includes("welcome")) {' +
            '    progress.completedFlows.push("welcome");' +
            '    localStorage.setItem("leviousa-tutorial-progress", JSON.stringify(progress));' +
            '    console.log("[' + name + '] Tutorial marked as completed");' +
            '  }' +
            '} catch (error) {' +
            '  console.error("[' + name + '] Error marking tutorial complete:", error);' +
            '}';
          
          window.webContents.executeJavaScript(script).catch(error => {
            console.error(`[WindowBridge] Error marking complete in ${name}:`, error);
          });
          
          // Only do this once
          return;
        }
      });
      
      return { success: true };
    });
    
    // Browser window toggle handler
    ipcMain.handle('main-header:browser-toggle', async () => {
      return await windowManager.toggleBrowserWindow();
    });
    
    // Browser window navigation handler
    ipcMain.handle('main-header:browser-navigate', (event, url) => {
      return windowManager.navigateBrowserWindow(url);
    });
    
    // BrowserView control handlers
    ipcMain.handle('browser-view:go-back', () => {
      return windowManager.browserViewGoBack();
    });
    
    ipcMain.handle('browser-view:go-forward', () => {
      return windowManager.browserViewGoForward();
    });
    
    ipcMain.handle('browser-view:reload', () => {
      return windowManager.browserViewReload();
    });
    
    ipcMain.handle('browser-view:position', () => {
      return windowManager.positionBrowserView();
    });
    
    // Browser window opacity control
    ipcMain.handle('browser-window:set-opacity', (event, opacity) => {
      return windowManager.setBrowserWindowOpacity(opacity);
    });
    
    // Multi-tab support
    ipcMain.handle('browser-tabs:create-new', () => {
      return windowManager.createNewTab();
    });
    
    ipcMain.handle('browser-tabs:create-new-with-url', (event, url, title) => {
      return windowManager.createNewTabWithUrl(url, title);
    });
    
    ipcMain.handle('browser-tabs:switch', (event, tabId) => {
      return windowManager.switchTab(tabId);
    });
    
    ipcMain.handle('browser-tabs:switch-by-index', (event, tabIndex) => {
      return windowManager.switchTabByIndex(tabIndex);
    });
    
    ipcMain.handle('browser-tabs:close', (event, tabId) => {
      return windowManager.closeTab(tabId);
    });
    
    ipcMain.handle('browser-tabs:close-by-index', (event, tabIndex) => {
      return windowManager.closeTabByIndex(tabIndex);
    });
    
    ipcMain.handle('browser-tabs:update-ui', () => {
      return windowManager.updateTabUI();
    });
    
    ipcMain.handle('browser-window:resize', (event, deltaWidth, deltaHeight) => {
      return windowManager.resizeBrowserWindow(deltaWidth, deltaHeight);
    });
  },

  notifyFocusChange(win, isFocused) {
    win.webContents.send('window:focus-change', isFocused);
  }
};