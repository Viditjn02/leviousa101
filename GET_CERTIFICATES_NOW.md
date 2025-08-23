# 🚀 Get Your Apple Developer Certificates (5 Minutes)

## Step 1: Add Apple ID to Xcode (2 minutes)

1. **Open Xcode** (already installed ✅)
2. **Xcode menu** → **Preferences** (or **Settings** in newer versions)
3. **Accounts tab** → Click **+** button
4. **Add Apple ID** → Enter your Apple Developer account email
5. **Sign in** with your Apple ID password
6. **Select your team** (should show your name/company)

## Step 2: Download Certificates (1 minute)

1. In Xcode Preferences → Accounts
2. **Select your Apple ID**
3. **Select your team** on the right
4. Click **"Download Manual Profiles"** or **"Manage Certificates"**
5. Look for **"Developer ID Application"** certificate
6. If missing, click **+** → **"Developer ID Application"**

## Step 3: Verify Certificates (30 seconds)

Run this command to check if certificates are installed:

```bash
security find-identity -v -p codesigning
```

You should see something like:
```
1) ABCD1234... "Developer ID Application: Your Name (TEAM123)"
2) EFGH5678... "Developer ID Installer: Your Name (TEAM123)"  
```

---

## 🚨 Quick Troubleshooting

### If you don't see certificates:
1. **Check Apple Developer Portal**: https://developer.apple.com/account/resources/certificates/
2. **Create certificates manually**:
   - "Developer ID Application" (signs the app)
   - "Developer ID Installer" (signs the DMG)
3. **Download and double-click** .cer files

### If Xcode shows "No teams":
- Your Apple Developer membership might still be processing
- Check https://developer.apple.com/account/ for status

---

**Ready for the next step? Let me know when you see the certificates! 🔐**
