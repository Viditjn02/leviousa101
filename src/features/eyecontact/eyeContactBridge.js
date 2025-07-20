// Eye Contact IPC Bridge
const { ipcMain } = require('electron');
const sieveEyeContactService = require('./sieveEyeContactService');

function initializeEyeContactBridge() {
    console.log('[EyeContactBridge] Initializing IPC handlers');

    // Enable/disable eye contact correction
    ipcMain.handle('eyecontact:enable', async () => {
        sieveEyeContactService.enableCorrection();
        return { success: true };
    });

    ipcMain.handle('eyecontact:disable', async () => {
        sieveEyeContactService.disableCorrection();
        return { success: true };
    });

    // Get status
    ipcMain.handle('eyecontact:getStatus', async () => {
        return sieveEyeContactService.getStatus();
    });

    // Set API key
    ipcMain.handle('eyecontact:setApiKey', async (event, apiKey) => {
        sieveEyeContactService.setApiKey(apiKey);
        return { success: true };
    });

    // Process single image
    ipcMain.handle('eyecontact:correctImage', async (event, imageBuffer) => {
        try {
            const correctedBuffer = await sieveEyeContactService.correctEyeContact(imageBuffer);
            if (correctedBuffer) {
                return { 
                    success: true, 
                    data: correctedBuffer,
                    size: correctedBuffer.length 
                };
            } else {
                return { 
                    success: false, 
                    error: 'No correction performed' 
                };
            }
        } catch (error) {
            console.error('[EyeContactBridge] Error correcting image:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    });

    // Process video frame from webcam
    ipcMain.handle('eyecontact:processFrame', async (event, frameData) => {
        try {
            // Convert base64 to buffer if needed
            let imageBuffer;
            if (typeof frameData === 'string') {
                // Remove data URL prefix if present
                const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                imageBuffer = frameData;
            }

            const correctedBuffer = await sieveEyeContactService.correctEyeContact(imageBuffer);
            if (correctedBuffer) {
                // Convert back to base64 for renderer
                const base64 = correctedBuffer.toString('base64');
                const dataUrl = `data:image/jpeg;base64,${base64}`;
                
                return { 
                    success: true, 
                    dataUrl: dataUrl
                };
            } else {
                return { 
                    success: false, 
                    error: 'Frame skipped or processing disabled' 
                };
            }
        } catch (error) {
            console.error('[EyeContactBridge] Error processing frame:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    });

    // Handle events from the service
    sieveEyeContactService.on('correction-complete', (data) => {
        // Broadcast to all windows
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('eyecontact:correction-complete', data);
        });
    });

    sieveEyeContactService.on('correction-error', (data) => {
        // Broadcast to all windows
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('eyecontact:correction-error', data);
        });
    });

    sieveEyeContactService.on('status-changed', (data) => {
        // Broadcast to all windows
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('eyecontact:status-changed', data);
        });
    });

    console.log('[EyeContactBridge] IPC handlers initialized');
}

module.exports = {
    initializeEyeContactBridge
};
