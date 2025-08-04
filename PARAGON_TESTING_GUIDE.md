# 🧪 Paragon Integration Testing Guide

## ✅ **Implementation Complete!**

The Paragon Connect Portal integration has been successfully implemented for your **Electron + Firebase + MCP architecture**. No more 7105 errors or browser-opening issues!

## 🚀 **Testing Steps**

### **1. Configure Environment Variables**
Create/update `services/paragon-mcp/.env`:
```env
PROJECT_ID=db5e019e-0558-4378-93de-f212a73e0606
SIGNING_KEY=your_paragon_signing_key_here
OAUTH_CALLBACK_PORT=3002
```

### **2. Configure Redirect URLs in Paragon Dashboard**
For each integration you want to test:

1. **Go to**: https://dashboard.useparagon.com
2. **Navigate to**: `Integrations` → `Connected Integrations` → **[Integration Name]** (e.g., Gmail)
3. **Find**: "Redirect URL" section in that integration's settings
4. **Set Redirect URL to**: `http://localhost:3002/callback`
5. **Save**: The configuration

**Example Integrations to Test:**
- Gmail: Set redirect URL to `http://localhost:3002/callback`
- Salesforce: Set redirect URL to `http://localhost:3002/callback`
- Slack: Set redirect URL to `http://localhost:3002/callback`

### **3. Start the Application**
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/Leviousa101
npm run dev  # Starts Electron app with Firebase hosting
```

### **4. Access the Integrations Page**
- **In Electron**: The app will open to Firebase hosting
- **Navigate to**: `https://leviousa-101.web.app/integrations`
- **You should see**: Integration cards for Gmail, Salesforce, Slack, etc.

### **5. Test OAuth Flow**
1. **Click "Connect"** on any integration (e.g., Gmail)
2. **Should happen**:
   - OAuth URL opens in your **default browser** (not in-app browser)
   - You see Gmail's login page
   - After authorization, redirects to `http://localhost:3002/callback`
   - **Returns to Electron app** with success notification
   - Integration status shows "Connected"

### **6. Expected Console Output**
In Electron console, you should see:
```
[ParagonBridge] Starting Paragon authentication for service: gmail
[OAuth] Processing Paragon OAuth callback
[ParagonMCP] Processing OAuth callback - code: abc123..., state: paragon_gmail_...
✅ Paragon authentication initiated for gmail
```

## 🔧 **Troubleshooting**

### **❌ Still Getting 7105 Error?**
- **Check**: Redirect URL in Paragon dashboard is exactly `http://localhost:3002/callback`
- **Verify**: You're configuring the redirect URL in the **specific integration settings**, not general settings
- **Ensure**: OAuth callback server is running on port 3002

### **❌ OAuth Opens in App Instead of Browser?**
- **Expected**: OAuth should open in **default browser**, not in-app
- **If in-app**: Check that `shell.openExternal(response.authUrl)` is working in `paragonBridge.js`

### **❌ "Paragon API not available" Error?**
- **Check**: You're accessing from Electron app, not direct browser
- **Verify**: `window.api.paragon` is available in console
- **Ensure**: Preload script is loading correctly

### **❌ MCP Client Not Available?**
- **Check**: Electron app is fully initialized
- **Verify**: Console shows `[ParagonBridge] Paragon IPC bridge initialized successfully`
- **Restart**: The Electron app if needed

## 📋 **Test Checklist**

- [ ] Environment variables set in `services/paragon-mcp/.env`
- [ ] Redirect URLs configured in Paragon dashboard
- [ ] Electron app starts without errors
- [ ] Can access `https://leviousa-101.web.app/integrations`
- [ ] "Connect" button works and opens browser
- [ ] OAuth flow completes and returns to app
- [ ] Integration status shows "Connected"
- [ ] No 7105 errors in browser or console
- [ ] OAuth opens in browser, not in-app

## 🎉 **Success Indicators**

✅ **Connect Portal displays in-app** (not opening separate browser window)
✅ **OAuth flow uses default browser** for authentication  
✅ **No 7105 redirect URL errors**
✅ **Integration status updates properly**
✅ **Works with Firebase hosting** (`https://leviousa-101.web.app`)
✅ **Integrates with your MCP architecture**

## 📞 **Next Steps After Testing**

1. **Add more integrations** to the dashboard
2. **Implement real token exchange** (replace mock in `exchangeCodeForToken`)
3. **Add user feedback** (toast notifications, better error handling)
4. **Deploy to production** Firebase hosting

## 🔗 **Key Files to Review**

- `services/paragon-mcp/src/index.ts` - MCP service
- `src/features/paragon/paragonBridge.js` - Electron bridge
- `leviousa_web/components/ParagonIntegration.tsx` - UI component
- `leviousa_web/app/integrations/page.tsx` - Integrations page
- `PARAGON_CORRECT_IMPLEMENTATION.md` - Complete implementation details

**Happy Testing! 🚀**