# 🔍 ELECTRON OAUTH FLOW ANALYSIS
## What Localhost Ports Are Actually Needed

## 📋 **ACTUAL USAGE FROM CODEBASE:**

### **✅ CRITICAL LOCALHOST PORTS (DO NOT REMOVE):**

#### **Port 54321 - Paragon OAuth Callbacks**
```javascript
// src/index.js line 1211
const PARAGON_OAUTH_PORT = 54321; // Dedicated port for Paragon OAuth callbacks
```
**Purpose:** Paragon integration OAuth processing
**Required URI:** `http://127.0.0.1:54321/paragon/callback`

#### **Ports 3000-3004 - General OAuth Callback Servers**  
```javascript
// src/features/invisibility/auth/OAuthManager.js line 446
const preferredPorts = [3000, 3001, 3002, 3003, 3004];
```
**Purpose:** Dynamic OAuth callback servers for MCP services
**Required URIs:** 
- `http://localhost:3000/callback`
- `http://localhost:3001/callback` 
- `http://localhost:3002/callback`
- `http://localhost:3003/callback`
- `http://localhost:3004/callback`

#### **Port 3002 - MCP Server Communication**
```javascript
// src/features/invisibility/mcp/ServerRegistry.js line 567
env['PORT'] = process.env.PORT || '3002';
```
**Purpose:** MCP server OAuth handling

### **❌ UNNECESSARY REDIRECT URIS (CAN REMOVE):**

- ❌ `https://leviousa-101.web.app/oauth/callback` (old domain)
- ❌ `http://localhost:8000/oauth2callback` (not used in code)

### **🤔 UNCLEAR (INVESTIGATE):**
- `https://passport.useparagon.com/oauth` (Paragon integration)

---

## 🔧 **SMART SOLUTION:**

### **KEEP Essential Localhost URLs BUT Organize Better:**

**Organize redirect URIs like this:**

#### **Production (HTTPS Only):**
```
✅ https://www.leviousa.com/oauth/callback
✅ https://passport.useparagon.com/oauth (Paragon integration)
```

#### **Development & Internal (Localhost):**
```
✅ http://localhost:3000/callback (OAuth manager)
✅ http://localhost:3001/callback (OAuth manager fallback)  
✅ http://localhost:3002/callback (MCP server)
✅ http://localhost:3003/callback (OAuth manager fallback)
✅ http://localhost:3004/callback (OAuth manager fallback)
✅ http://127.0.0.1:54321/paragon/callback (Paragon OAuth)
```

#### **Remove (Unnecessary):**
```
❌ https://leviousa-101.web.app/oauth/callback (old domain)
❌ http://localhost:8000/oauth2callback (not in code)
```

---

## 💡 **WHY THIS SHOULD WORK:**

Based on [Google's OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies#browsers), the issue might be:

1. **Mixed old/new domains** confusing Google's validation
2. **Too many unnecessary localhost ports** (8000 not used)
3. **Old Firebase domain** still present

**Solution:** Clean organization while preserving all functional OAuth flows.
