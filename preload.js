const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => {
        // Whitelist channels for security
        const validChannels = [
            'dialog-action-',
            'custom-dialog-action'
        ];
        
        // Allow any channel that starts with our valid prefixes
        const isValidChannel = validChannels.some(validChannel => 
            channel.startsWith(validChannel)
        );
        
        if (isValidChannel) {
            ipcRenderer.send(channel, data);
        } else {
            console.warn('Invalid IPC channel:', channel);
        }
    },
    
    invoke: (channel, data) => {
        const validChannels = [
            'dialog-action-',
            'custom-dialog-action',
            'test:subscription-access'
        ];
        
        const isValidChannel = validChannels.some(validChannel => 
            channel.startsWith(validChannel)
        );
        
        if (isValidChannel) {
            return ipcRenderer.invoke(channel, data);
        } else {
            console.warn('Invalid IPC channel:', channel);
            return Promise.reject('Invalid channel');
        }
    },

    on: (channel, callback) => {
        const validChannels = [
            'dialog-result',
            'custom-dialog-result'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },

    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
