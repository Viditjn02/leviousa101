# 🏗️ DOMAIN ARCHITECTURE ANALYSIS
## Understanding What Should Change vs Stay Localhost

Based on deep codebase analysis, here's the clear architectural separation:

---

## ✅ **WHAT SHOULD CHANGE TO www.leviousa.com**

### **1. Public Web Dashboard (Firebase Hosted)**
**Current:** `https://leviousa-101.web.app`  
**Should be:** `https://www.leviousa.com`

**Key File:** `src/index.js` line 1168
```javascript
webUrl = 'https://leviousa-101.web.app'; // ← CHANGE THIS
```

**Purpose:** Public-facing web interface for users

### **2. OAuth Redirect URIs**
**Current:** `https://leviousa-101.web.app/oauth/callback`  
**Should be:** `https://www.leviousa.com/oauth/callback`

**Purpose:** Where Google redirects after OAuth consent

### **3. Legal/Privacy URLs**
**Current:** 
- `https://leviousa-101.web.app/privacy-policy.html`
- `https://leviousa-101.web.app/terms-of-service.html`

**Should be:**
- `https://www.leviousa.com/privacy-policy.html`  
- `https://www.leviousa.com/terms-of-service.html`

**Purpose:** Required for OAuth consent screen compliance

### **4. OAuth Consent Screen Configuration**
- **Application home page:** www.leviousa.com
- **Authorized domains:** www.leviousa.com
- **Privacy/Terms URLs:** www.leviousa.com URLs

---

## ❌ **WHAT SHOULD STAY LOCALHOST (Critical!)**

### **1. Internal API Communication**
**Always:** `http://localhost:9001` (or dynamic port)

**Key File:** `src/index.js` line 1174
```javascript
process.env.leviousa_API_URL = `http://localhost:${apiPort}`; // ← KEEP LOCALHOST
```

**Purpose:** Electron main process ↔ Express API communication

### **2. Development Server**
**Always:** `http://localhost:3000`

**Files:** Multiple development configurations
**Purpose:** Local Next.js development server

### **3. Internal OAuth Callback Servers**
**Always:** `http://localhost:54321` (Paragon), dynamic ports (others)

**Key File:** `src/index.js` line 1211
```javascript
const PARAGON_OAUTH_PORT = 54321; // ← KEEP LOCALHOST
```

**Purpose:** Internal OAuth processing between services

### **4. IPC Communication**
**Always:** Inter-process communication within Electron
**Purpose:** Electron main ↔ renderer communication

---

## 🎯 **ARCHITECTURAL PATTERN:**

```
┌─────────────────────────────────────────────────────┐
│                 PUBLIC DOMAIN                       │
│              www.leviousa.com                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ OAuth Redirects, Privacy Policy, Terms     │    │
│  │ Public Web Dashboard (Firebase Hosted)     │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                        │
                        │ (OAuth flow only)
                        │
┌─────────────────────────────────────────────────────┐
│               LOCALHOST DOMAIN                      │
│                localhost:*                          │
│  ┌─────────────────────────────────────────────┐    │
│  │ Electron Main Process                       │    │
│  │ Express API (localhost:9001)                │    │
│  │ Development Server (localhost:3000)         │    │
│  │ OAuth Callback Servers (localhost:54321)   │    │
│  │ All Internal IPC Communication             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 📋 **SPECIFIC FILES TO UPDATE:**

### **Core System Configuration:**
```javascript
// src/index.js (line 1168)
webUrl = 'https://www.leviousa.com'; // ← UPDATE

// src/features/common/config/config.js (line 13)  
webUrl: process.env.leviousa_WEB_URL || 'https://www.leviousa.com', // ← UPDATE
```

### **OAuth and Authentication:**
```javascript
// src/features/invisibility/auth/OAuthManager.js (line 173)
callbackUrl = 'https://www.leviousa.com/api/oauth/callback'; // ← UPDATE

// src/config/mcpConfig.js (line 395)
redirectUri = 'https://www.leviousa.com/api/oauth/callback'; // ← UPDATE
```

### **Documentation and Scripts:**
- All OAuth setup guides and scripts
- Demo video scripts
- Privacy policy and terms of service content

---

## 🔧 **WHAT NOT TO CHANGE:**

### **Internal Communication (CRITICAL):**
```javascript
// src/index.js (line 1174) - KEEP AS IS
process.env.leviousa_API_URL = `http://localhost:${apiPort}`;

// leviousa_web/utils/api.ts (line 222) - KEEP AS IS  
API_ORIGIN = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9001'
  : '';

// All localhost:3000 development references - KEEP AS IS
// All localhost:9001 API references - KEEP AS IS
// All localhost OAuth callback servers - KEEP AS IS
```

---

## 🎯 **SUMMARY:**

**Public-facing = www.leviousa.com**  
**Internal communication = localhost**

This maintains your Electron architecture while giving you a professional domain for OAuth verification.

Ready to proceed with the specific file updates? 🚀
