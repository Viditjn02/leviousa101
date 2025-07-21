# macOS SystemAudioDump Security Fix

## Problem
The `SystemAudioDump` executable is being blocked by macOS Gatekeeper with the error:
> "SystemAudioDump" Not Opened - Apple could not verify "SystemAudioDump" is free of malware that may harm your Mac or compromise your privacy.

## Why This Happens
- The `SystemAudioDump` is a native executable for audio capture on macOS
- It's not properly code-signed or notarized
- macOS Gatekeeper blocks unsigned executables for security

## Quick Fix (Development)

### Method 1: Use the Fix Script
```bash
./fix-macos-audio.sh
```

### Method 2: Manual Fix
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine src/ui/assets/SystemAudioDump

# Ensure executable permissions
chmod +x src/ui/assets/SystemAudioDump
```

### Method 3: Manual Security Override
1. When you see the security dialog, click "Done" (don't move to trash)
2. Go to **System Preferences → Security & Privacy → General**
3. You should see a message about SystemAudioDump being blocked
4. Click **"Allow Anyway"** next to it
5. Try running the app again

## Production Fix (Code Signing)

For production builds, the executable needs proper code signing. Update `electron-builder.yml`:

```yaml
afterSign: "scripts/notarize.js"

mac:
  # ... existing config ...
  binaries:
    - src/ui/assets/SystemAudioDump
  extraFiles:
    - from: src/ui/assets/SystemAudioDump
      to: Resources/SystemAudioDump
      filter: "**/*"
```

## Alternative: Temporary Gatekeeper Disable
⚠️ **Not recommended for security reasons**
```bash
# Disable Gatekeeper (requires admin password)
sudo spctl --master-disable

# Re-enable Gatekeeper after testing
sudo spctl --master-enable
```

## Verification
After applying the fix:
1. Restart the Leviousa application
2. Try using the audio capture feature
3. Check the console logs for:
   ```
   SystemAudioDump started with PID: [number]
   macOS audio capture started.
   ```

## Technical Details
- **File**: `src/ui/assets/SystemAudioDump`
- **Purpose**: Captures system audio on macOS for the Listen feature
- **Alternative**: For production, consider using only `getDisplayMedia` with audio loopback
- **Location in code**: Used in `src/features/listen/stt/sttService.js`

## Troubleshooting

### Still Getting Security Warnings?
1. Check if you need to restart the app completely
2. Verify the executable has the right permissions:
   ```bash
   ls -la src/ui/assets/SystemAudioDump
   # Should show: -rwxr-xr-x
   ```
3. Check for extended attributes:
   ```bash
   xattr -l src/ui/assets/SystemAudioDump
   # Should be empty or not show quarantine
   ```

### Audio Capture Not Working?
1. Check microphone permissions in System Preferences
2. Verify the STT sessions are initialized
3. Look for "Their STT session closed" errors in console

### Development vs Production
- **Development**: Use the manual override methods above
- **Production**: Implement proper code signing and notarization
- **CI/CD**: Add the fix script to your build process 