const { systemPreferences, shell, desktopCapturer } = require('electron');
const permissionRepository = require('../repositories/permission');

class PermissionService {
  _getAuthService() {
    return require('./authService');
  }

  async checkSystemPermissions() {
    const permissions = {
      microphone: 'unknown',
      screen: 'unknown',
      keychain: 'unknown',
      needsSetup: true
    };

    try {
      if (process.platform === 'darwin') {
        permissions.microphone = systemPreferences.getMediaAccessStatus('microphone');
        permissions.screen = systemPreferences.getMediaAccessStatus('screen');
        permissions.keychain = await this.checkKeychainCompleted(this._getAuthService().getCurrentUserId()) ? 'granted' : 'unknown';
        permissions.needsSetup = permissions.microphone !== 'granted' || permissions.screen !== 'granted' || permissions.keychain !== 'granted';
      } else {
        permissions.microphone = 'granted';
        permissions.screen = 'granted';
        permissions.keychain = 'granted';
        permissions.needsSetup = false;
      }

      console.log('[Permissions] System permissions status:', permissions);
      return permissions;
    } catch (error) {
      console.error('[Permissions] Error checking permissions:', error);
      return {
        microphone: 'unknown',
        screen: 'unknown',
        keychain: 'unknown',
        needsSetup: true,
        error: error.message
      };
    }
  }

  async requestMicrophonePermission() {
    if (process.platform !== 'darwin') {
      return { success: true };
    }

    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      console.log('[Permissions] Microphone status:', status);
      if (status === 'granted') {
        return { success: true, status: 'granted' };
      }

      const granted = await systemPreferences.askForMediaAccess('microphone');
      return {
        success: granted,
        status: granted ? 'granted' : 'denied'
      };
    } catch (error) {
      console.error('[Permissions] Error requesting microphone permission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async openSystemPreferences(section) {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'Not supported on this platform' };
    }

    try {
      if (section === 'screen-recording') {
        try {
          console.log('[Permissions] Triggering screen capture request to register app...');
          
          // Force registration by making a substantial screen access request
          // This approach ensures macOS adds the app to Screen Recording preferences
          
          // Approach 1: Request full-resolution screen capture to trigger permission system
          console.log('[Permissions] Attempting full-resolution screen capture...');
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }, // Large size to force real access
            fetchWindowIcons: true
          });
          
          // Approach 2: Try to access screen content data to ensure registration
          if (sources && sources.length > 0) {
            console.log('[Permissions] Accessing screen source data to ensure registration...');
            const primaryScreen = sources[0];
            // Try to access the thumbnail data (this triggers permission check)
            if (primaryScreen.thumbnail) {
              const thumbnailSize = primaryScreen.thumbnail.getSize();
              console.log('[Permissions] Screen thumbnail accessed:', thumbnailSize);
            }
          }
          
          // Approach 3: Use system preferences API for explicit permission check
          const currentStatus = systemPreferences.getMediaAccessStatus('screen');
          console.log('[Permissions] Screen recording permission status:', currentStatus);
          
          // Approach 4: Request permission explicitly if available (macOS 10.15+)
          if (systemPreferences.askForMediaAccess) {
            console.log('[Permissions] Requesting explicit screen recording permission...');
            try {
              const granted = await systemPreferences.askForMediaAccess('screen');
              console.log('[Permissions] Explicit permission request result:', granted);
            } catch (explicitError) {
              console.log('[Permissions] Explicit permission request triggered system dialog');
            }
          }
          
          // Approach 5: Additional screen access attempt with different parameters
          console.log('[Permissions] Making additional screen access attempts...');
          try {
            // Try with different thumbnail sizes to ensure registration
            await desktopCapturer.getSources({
              types: ['screen'],
              thumbnailSize: { width: 640, height: 480 }
            });
            
            await desktopCapturer.getSources({
              types: ['window'],
              thumbnailSize: { width: 640, height: 480 }
            });
          } catch (additionalError) {
            console.log('[Permissions] Additional screen access attempts completed');
          }
          
          console.log('[Permissions] App registration attempts completed - Leviousa should now appear in System Preferences');
        } catch (captureError) {
          console.log('[Permissions] Screen capture attempt failed (this registers the app):', captureError.message);
          // This error is expected and actually helps register the app
        }
        
        // Open System Preferences after a short delay
        setTimeout(async () => {
          console.log('[Permissions] Opening System Preferences...');
          await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        }, 500);
      }
      return { success: true };
    } catch (error) {
      console.error('[Permissions] Error opening system preferences:', error);
      return { success: false, error: error.message };
    }
  }

  async markKeychainCompleted() {
    try {
      await permissionRepository.markKeychainCompleted(this._getAuthService().getCurrentUserId());
      console.log('[Permissions] Marked keychain as completed');
      return { success: true };
    } catch (error) {
      console.error('[Permissions] Error marking keychain as completed:', error);
      return { success: false, error: error.message };
    }
  }

  async checkKeychainCompleted(uid) {
    if (!uid) {
      // No user authenticated - skip keychain check
      return true;
    }
    try {
      const completed = permissionRepository.checkKeychainCompleted(uid);
      console.log('[Permissions] Keychain completed status:', completed);
      return completed;
    } catch (error) {
      console.error('[Permissions] Error checking keychain completed status:', error);
      return false;
    }
  }
}

const permissionService = new PermissionService();
module.exports = permissionService; 