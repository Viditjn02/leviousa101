# 🔐 Complete OAuth Setup Guide for MCP External Services

## 🔄 **Localhost Callback Approach**

Leviousa uses a **localhost callback server** for reliable OAuth handling. This is the OAuth 2.0 recommended solution for desktop applications and avoids browser security restrictions.

| Provider | Redirect URI | Notes |
|----------|-------------|-------|
| **Notion** | `http://localhost:PORT/callback` | PORT is dynamically assigned |
| **GitHub** | `http://localhost:PORT/callback` | PORT is dynamically assigned |
| **Slack** | `http://localhost:PORT/callback` | PORT is dynamically assigned |

**📋 For dynamic ports**: Most providers support wildcard localhost URIs like `http://localhost:*/callback` or you can add multiple specific ports like `http://localhost:3000/callback`, `http://localhost:3001/callback`, etc.

---

## 🔵 **1. Google Drive - Use Firebase Auth (RECOMMENDED)**

Since you already have Firebase Auth with Google Sign-In set up, we can simply extend it to include Google Drive access!

### **Step 1: Update Your Firebase Auth Code**

In your existing Firebase Auth implementation, add the Google Drive scope:

```javascript
// In your Firebase Auth setup
import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';

const provider = new GoogleAuthProvider();

// Add Google Drive scope to your existing Firebase Auth
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Your existing sign-in code
const auth = getAuth();
signInWithPopup(auth, provider)
  .then((result) => {
    // Get the access token for Google APIs
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential.accessToken;
    
    // Store this token for MCP use
    localStorage.setItem('google_drive_token', accessToken);
    
    // Your existing user handling code...
  });
```

### **Step 2: Set Up Token Bridge**

Add this to your Firebase Auth handler to bridge tokens to MCP:

```javascript
// After successful Firebase Auth
window.electron?.ipcRenderer?.invoke('mcp:setCredential', 'firebase_drive_token', accessToken);
```

### **Why This Approach is Better:**
- ✅ Uses your existing authentication
- ✅ No additional OAuth setup required  
- ✅ Users only see one login flow
- ✅ Per-file access (secure & non-sensitive scope)
- ✅ No separate consent screens

---

## 🟠 **2. GitHub OAuth Setup**

### **Step 1: Create GitHub OAuth App**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Leviousa MCP Integration`
   - **Homepage URL**: `https://leviousa-101.web.app`
   - **Authorization callback URL**: `http://localhost:3000/callback` (or add multiple ports)
4. Click **"Register application"**

### **Step 2: Get Client Credentials**
1. After creation, note down:
   - **Client ID** (public)
   - **Client Secret** (private - click "Generate new client secret")

### **Step 3: Configure in Your App**
In your MCP settings UI:
1. Set `github_client_id` = your Client ID
2. Set `github_client_secret` = your Client Secret
3. Click "Connect GitHub"

### **Scopes Used**: `repo`, `user:email` (for repository access and user info)

---

## 🟣 **3. Notion OAuth Setup**

### **Step 1: Create Notion Integration**
1. Go to [Notion My Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in:
   - **Name**: `Leviousa MCP`
   - **Logo**: Upload your app logo (optional)
   - **Associated workspace**: Select your workspace
4. Click **"Submit"**

### **Step 2: Configure OAuth**
1. In your integration settings, go to **"OAuth Domain & URIs"**
2. Add these redirect URIs (Notion requires exact matches):
   ```
   http://localhost:3000/callback
   http://localhost:3001/callback
   http://localhost:3002/callback
   http://localhost:3003/callback
   http://localhost:3004/callback
   ```
3. Click **"Save changes"**

### **Step 3: Get Credentials**
1. Copy the **"OAuth client ID"**
2. Copy the **"OAuth client secret"**

### **Step 4: Configure in Your App**
In your MCP settings UI:
1. Set `notion_client_id` = your OAuth client ID
2. Set `notion_client_secret` = your OAuth client secret  
3. Click "Connect Notion"

### **Scopes Used**: `read`, `write` (for reading and creating content)

---

## 🟢 **4. Slack OAuth Setup**

### **Step 1: Create Slack App**
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Fill in:
   - **App Name**: `Leviousa MCP`
   - **Workspace**: Choose your development workspace
5. Click **"Create App"**

### **Step 2: Configure OAuth**
1. In your app settings, go to **"OAuth & Permissions"**
2. Under **"Redirect URLs"**, click **"Add New Redirect URL"**
3. Enter: `http://localhost:3000/callback`
4. Click **"Save URLs"**

### **Step 3: Set Bot Scopes**
In the same **"OAuth & Permissions"** page, under **"Scopes"** → **"Bot Token Scopes"**, add:
- `channels:read` - View basic information about public channels
- `channels:history` - View messages and other content in public channels  
- `chat:write` - Send messages as the app
- `files:read` - View files shared in channels and conversations

### **Step 4: Get Credentials**
1. Go to **"Basic Information"** → **"App Credentials"**
2. Copy **"Client ID"**
3. Copy **"Client Secret"**

### **Step 5: Configure in Your App**
In your MCP settings UI:
1. Set `slack_client_id` = your Client ID
2. Set `slack_client_secret` = your Client Secret
3. Click "Connect Slack"

---

## 🎯 **Quick Setup Summary**

| Service | What You Need | Where to Get It |
|---------|---------------|-----------------|
| **Google Drive** | ✅ Already have it! | Extend Firebase Auth |
| **GitHub** | Client ID + Secret | [GitHub Developer Settings](https://github.com/settings/developers) |
| **Notion** | OAuth Client ID + Secret | [Notion My Integrations](https://www.notion.so/my-integrations) |
| **Slack** | Client ID + Secret | [Slack API Apps](https://api.slack.com/apps) |

---

## 🔧 **Using the MCP Settings UI**

After setting up OAuth credentials:

1. **Open your app's Settings** → **MCP Services**
2. **Set credentials** using the credential keys shown above
3. **Click "Connect [Service]"** for each service
4. **Complete OAuth flow** in your browser
5. **Return to app** - service should show "Connected" ✅

---

## 🔗 **How Localhost OAuth Works**

The OAuth flow uses a temporary localhost server for maximum reliability:

### **The Complete Flow**
1. **User clicks "Connect [Service]"** in MCP Settings
2. **Leviousa starts localhost server** on a random available port (e.g., 3456)
3. **OAuth URL is generated** with `http://localhost:3456/callback` as redirect
4. **System browser opens** with the OAuth authorization URL
5. **User grants permission** to your app
6. **OAuth provider redirects** to `http://localhost:3456/callback?code=...&state=...`
7. **Localhost server receives** the callback directly (no browser restrictions!)
8. **Leviousa processes** the OAuth code and exchanges it for tokens
9. **Browser shows success page** and auto-closes
10. **Localhost server stops** and connection is established

### **Why This Works Better**
- ✅ **No browser security restrictions** (localhost is trusted)
- ✅ **No cross-origin issues** (same-origin policy doesn't apply)
- ✅ **No custom protocol limitations** (uses standard HTTP)
- ✅ **Direct processing** (no intermediate redirects)
- ✅ **Works in all browsers** (including private/incognito mode)

### **Automatic Fallback**
If the localhost server fails to start, Leviousa automatically falls back to the previous web callback method for maximum compatibility.

---

## 🛠️ **Troubleshooting**

### **"Connection refused" error**
- The localhost server couldn't start (port conflict)
- Leviousa will automatically retry with a different port
- If it persists, restart the application

### **"Redirect URI mismatch" error**
- Add `http://localhost:3000/callback` to your OAuth app settings
- For dynamic ports, add multiple URIs or use wildcards if supported
- Check for typos in the redirect URI

### **OAuth timeout**
- The localhost server automatically stops after 10 minutes
- Simply try connecting again

### **Browser doesn't redirect**
- This is normal - the localhost server handles everything
- Look for the success message in the browser tab
- The tab should auto-close after 3 seconds

### **Still having issues?**
1. Check the Electron app console for detailed logs
2. Verify your OAuth credentials are correctly configured
3. Ensure the OAuth app is properly set up in the provider's dashboard
4. Try the connection again - the localhost server starts fresh each time

---

## 🔒 **Security Notes**

- All credentials are **encrypted locally**
- OAuth tokens are **automatically refreshed**
- Only **minimum required scopes** are requested
- **Secure localhost** callback URLs only
- **No sensitive data** stored in plain text

---

## ✅ **What You Get After Setup**

Once configured, your MCP system will have access to:

| Service | Capabilities |
|---------|-------------|
| **Google Drive** | Search, read, and list files; automatic format conversion |
| **GitHub** | Repository access, file operations, issue management |
| **Notion** | Page reading, database querying, content creation |
| **Slack** | Channel reading, message sending, file access |

All accessible through natural language commands in your AI assistant! 🚀

---

**🎉 Once configured, your OAuth integrations will work seamlessly with reliable localhost callback handling!** 