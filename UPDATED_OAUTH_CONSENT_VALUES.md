# 🎯 UPDATED OAUTH CONSENT SCREEN VALUES
## For www.leviousa.com Custom Domain

## 📋 **OAUTH CONSENT SCREEN CONFIGURATION:**

### **App Information:**
```
✅ User Type: External
✅ App name: Leviousa
✅ User support email: viditjn02@gmail.com
✅ Application home page: https://www.leviousa.com
✅ Application privacy policy link: https://www.leviousa.com/privacy-policy.html
✅ Application terms of service link: https://www.leviousa.com/terms-of-service.html
✅ Authorized domains: www.leviousa.com
✅ Developer contact: viditjn02@gmail.com
```

### **OAuth 2.0 Client ID Configuration:**

**Authorized JavaScript origins:**
```
https://www.leviousa.com
http://localhost:3000 (for development)
http://localhost:9001 (for API)
```

**Authorized redirect URIs:**
```
https://www.leviousa.com/oauth/callback
http://localhost:3000/oauth/callback (for development)
http://localhost:9001/oauth/callback (for API callbacks)
```

---

## 🔧 **SYSTEM CHANGES MADE:**

### **✅ UPDATED TO www.leviousa.com:**
1. **Core web URL** (src/index.js line 1168)
2. **Config default** (src/features/common/config/config.js line 13)
3. **OAuth redirect URIs** (auth managers)
4. **Documentation scripts** (demo and setup files)

### **✅ PRESERVED LOCALHOST:**
1. **API communication** (localhost:9001) - Internal Electron ↔ API
2. **Development server** (localhost:3000) - Local development only
3. **OAuth callback servers** (localhost:54321) - Internal processing
4. **All IPC communication** - Electron internal processes

---

## 🎬 **UPDATED VIDEO DEMO SCRIPT:**

The terminal demo now shows:
- **Domain:** www.leviousa.com
- **OAuth Redirect:** https://www.leviousa.com/oauth/callback  
- **Privacy Policy:** https://www.leviousa.com/privacy-policy.html
- **Terms of Service:** https://www.leviousa.com/terms-of-service.html

---

## 🚀 **NEXT STEPS:**

1. **Setup DNS/Hosting:**
   - Point www.leviousa.com to your Firebase hosting
   - Verify domain ownership in Google Search Console

2. **Update OAuth Consent Screen:**
   - Use the new www.leviousa.com URLs above
   - Update all redirect URIs to include www.leviousa.com

3. **Record Demo Video:**
   ```bash
   ./record-oauth-verification-demo.sh
   ```

4. **Test System:**
   - Verify Electron app still works with localhost API
   - Verify web dashboard loads from www.leviousa.com
   - Test OAuth flow with new redirect URIs

---

## ⚠️ **IMPORTANT NOTES:**

### **Professional Benefits:**
✅ **Custom domain** looks much more professional for OAuth verification  
✅ **Branded URLs** increase user trust and confidence
✅ **Consistent branding** across all touchpoints
✅ **Better verification chances** with professional domain

### **Technical Safety:**
✅ **Localhost preserved** - Electron core functionality untouched
✅ **Development workflow** - localhost:3000 still works  
✅ **API communication** - localhost:9001 still works
✅ **OAuth callbacks** - localhost servers still work for internal processing

This change only affects the **public-facing web dashboard** while preserving all **internal system communication**! 🎯
