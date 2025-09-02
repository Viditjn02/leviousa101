const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');

exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Starting notarization for ${appPath}`);

  try {
    // Use keychain profile for notarization
    await notarize({
      appBundleId: 'com.leviousa.app',
      appPath: appPath,
      keychainProfile: 'leviousa_notarization', // Using the stored keychain profile
    });
    
    console.log('✅ Notarization successful');
    
    // Staple the notarization ticket to the app
    console.log('Stapling notarization ticket...');
    execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
    console.log('✅ Stapling successful');
    
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
