# 🚀 VERCEL MIGRATION & CUSTOM DOMAIN SETUP GUIDE
## Migrating from Firebase to Vercel with www.leviousa.com

## 📋 **COMPLETE STEP-BY-STEP PROCESS:**

---

## **STEP 1: VERCEL SETUP (5 minutes)**

### **1.1 Login to Vercel:**
```bash
cd leviousa_web
vercel login
```
**Enter your email/GitHub account when prompted**

### **1.2 Initialize Vercel Project:**
```bash
vercel
```
**When prompted:**
- Set up and deploy? **Yes**
- Which scope? **Your personal account**
- Link to existing project? **No**
- Project name? **leviousa** (or press Enter for default)
- Directory? **./leviousa_web** (current directory)
- Override settings? **No**

### **1.3 Verify Deployment:**
```bash
vercel --prod
```
**This will give you a production URL like: https://leviousa-xyz.vercel.app**

---

## **STEP 2: CUSTOM DOMAIN SETUP (10 minutes)**

### **2.1 Add Custom Domain in Vercel:**
```bash
vercel domains add www.leviousa.com
```

### **2.2 Get DNS Configuration:**
```bash
vercel domains inspect www.leviousa.com
```
**This will show you the DNS records needed:**
- **CNAME record:** `www.leviousa.com` → `cname.vercel-dns.com`
- **Or A records:** Specific IP addresses

### **2.3 Configure DNS (Choose Your Provider):**

#### **If using Cloudflare:**
1. Go to Cloudflare dashboard
2. Add DNS record: 
   - **Type:** CNAME
   - **Name:** www
   - **Target:** cname.vercel-dns.com
   - **Proxy status:** DNS only (gray cloud)

#### **If using GoDaddy/Namecheap/Other:**
1. Go to your domain registrar's DNS management
2. Add CNAME record:
   - **Host/Name:** www
   - **Points to:** cname.vercel-dns.com

### **2.4 Verify Domain:**
```bash
vercel domains verify www.leviousa.com
```

---

## **STEP 3: UPDATE OAUTH CONSENT SCREEN (5 minutes)**

### **3.1 Go to OAuth Consent Screen:**
**URL:** https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101

### **3.2 Update App Domain Information:**
```
✅ Application home page: https://www.leviousa.com
✅ Application privacy policy link: https://www.leviousa.com/privacy-policy.html
✅ Application terms of service link: https://www.leviousa.com/terms-of-service.html
✅ Authorized domains: www.leviousa.com
```

### **3.3 Update OAuth Client Redirect URIs:**
**Go to:** https://console.cloud.google.com/apis/credentials?project=leviousa-101

**Click on your OAuth client and update Authorized redirect URIs:**
```
✅ https://www.leviousa.com/oauth/callback
✅ http://localhost:3000/oauth/callback (keep for development)
✅ http://localhost:9001/oauth/callback (keep for API)
```

---

## **STEP 4: DEPLOY UPDATED PRIVACY/TERMS PAGES (3 minutes)**

### **4.1 Update Privacy Policy URL:**
```bash
# Update privacy policy to reference new domain
# The pages already exist, just need to deploy to Vercel
cd leviousa_web
vercel --prod
```

### **4.2 Verify Pages Load:**
```bash
curl -I https://www.leviousa.com/privacy-policy.html
curl -I https://www.leviousa.com/terms-of-service.html
```
**Should return 200 OK status**

---

## **STEP 5: DOMAIN VERIFICATION IN GOOGLE SEARCH CONSOLE (5 minutes)**

### **5.1 Add Property:**
**Go to:** https://search.google.com/search-console

1. **Click "Add Property"**
2. **Select "URL prefix"**
3. **Enter:** `https://www.leviousa.com`
4. **Click "Continue"**

### **5.2 Verify Domain:**

#### **Method 1: HTML File (Recommended)**
1. **Download verification file** (google1234.html)
2. **Upload to Vercel:**
   ```bash
   # Copy verification file to leviousa_web/public/
   cp ~/Downloads/google*.html leviousa_web/public/
   cd leviousa_web
   vercel --prod
   ```
3. **Click "Verify" in Search Console**

#### **Method 2: DNS TXT Record**
1. **Copy TXT record value from Search Console**
2. **Add to your DNS provider:**
   - **Type:** TXT
   - **Name:** @ (or leave blank)
   - **Value:** [paste verification string]
3. **Click "Verify"**

---

## **STEP 6: RECORD OAUTH VERIFICATION VIDEO (15 minutes)**

### **6.1 Test Demo Script:**
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/Leviousa101
./record-oauth-verification-demo.sh
```
**Check that script shows www.leviousa.com correctly**

### **6.2 Record Video:**
1. **Start screen recording** (QuickTime: Cmd+Shift+5)
2. **Run demo script** and follow prompts
3. **Record for 3-4 minutes**
4. **Save as MP4 file**

### **6.3 Upload to YouTube:**
1. **Upload video as "Unlisted"**
2. **Title:** "Leviousa OAuth Verification Demo"
3. **Copy YouTube URL**

---

## **STEP 7: FINAL SYSTEM TEST (10 minutes)**

### **7.1 Test Web Dashboard:**
```bash
# Open in browser
open https://www.leviousa.com
```
**Verify:** App loads correctly with new domain

### **7.2 Test Electron App:**
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/Leviousa101
npm start
```
**Verify:** 
- Electron app starts
- localhost:9001 API works
- Integration pages load from www.leviousa.com

### **7.3 Test OAuth Flow:**
1. **Click "Connect Google Workspace" in app**
2. **Verify redirect goes to www.leviousa.com OAuth callback**
3. **Check that authentication completes successfully**

---

## **STEP 8: SUBMIT OAUTH VERIFICATION (5 minutes)**

### **8.1 Complete OAuth Consent Form:**
**Paste YouTube URL in demo video field**

### **8.2 Final Scope Justifications:**
**Use these updated justifications mentioning www.leviousa.com:**

```
Leviousa (https://www.leviousa.com) is a commercial AI meeting assistant requiring these scopes for essential business functionality:

GMAIL ACCESS: Read meeting invitation emails and send automated meeting summaries to participants via professional email workflows.

CALENDAR INTEGRATION: Read user's meeting schedule for context-aware preparation and create/update calendar events with meeting outcomes.

These scopes enable comprehensive Google Workspace integration essential for professional meeting assistance workflows.
```

### **8.3 Submit for Verification:**
**Click "Submit for Verification"**

---

## 🎯 **VERCEL BENEFITS OVER FIREBASE:**

### **✅ Advantages:**
- **Better Next.js integration** - Built specifically for Next.js
- **Automatic deployments** - Git-based deployments  
- **Better custom domain support** - Easier SSL and DNS setup
- **Edge functions** - Better performance globally
- **Professional appearance** - Better for OAuth verification

### **📊 Migration Impact:**
- **No code changes needed** - Next.js app works as-is
- **Better performance** - Vercel's edge network
- **Easier domain management** - Built-in DNS tools
- **Professional hosting** - Better for business use

---

## ⏱️ **TOTAL TIME ESTIMATE:**

- **Vercel setup:** 5 minutes
- **Custom domain:** 10 minutes  
- **OAuth updates:** 5 minutes
- **Deploy & verify:** 3 minutes
- **Domain verification:** 5 minutes
- **Record video:** 15 minutes
- **System testing:** 10 minutes
- **Submit verification:** 5 minutes

**Total: ~60 minutes to professional OAuth verification setup** 🚀

**Ready to start with Vercel setup?**
