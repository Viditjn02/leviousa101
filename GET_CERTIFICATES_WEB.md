# 🌐 Get Certificates Without Xcode (Web Portal Method)

## Step 1: Create Certificates (3 minutes)

### Go to Apple Developer Portal:
**👉 https://developer.apple.com/account/resources/certificates/**

### Create Required Certificates:

#### A. Developer ID Application Certificate
1. Click **"+"** (Create a Certificate)
2. Select **"Developer ID Application"** 
3. Click **Continue**
4. **Upload CSR** (we'll create this below)
5. **Download** the certificate (.cer file)

#### B. Developer ID Installer Certificate  
1. Click **"+"** again
2. Select **"Developer ID Installer"**
3. Click **Continue** 
4. **Upload same CSR**
5. **Download** the certificate (.cer file)

---

## Step 2: Create CSR (Certificate Signing Request)

### Using Keychain Access (Built into macOS):

1. **Open Keychain Access** (Applications → Utilities)
2. **Menu**: Keychain Access → Certificate Assistant → **"Request a Certificate From a Certificate Authority"**
3. **User Email**: Your Apple ID email
4. **Common Name**: Your name or company name
5. **CA Email**: Leave blank
6. **Request is**: "Saved to disk"
7. Click **Continue** → Save the .certSigningRequest file

---

## Step 3: Install Certificates (1 minute)

1. **Double-click** the downloaded .cer files
2. They'll automatically install in **Keychain Access**
3. **Verify installation**:

```bash
security find-identity -v -p codesigning
```

You should see:
```
1) ABC123... "Developer ID Application: Your Name (TEAM123)"
2) DEF456... "Developer ID Installer: Your Name (TEAM123)"
```

---

## 🚀 Alternative: Super Quick Method

If you want to skip the CSR creation, here's the fastest way:

### Use the command line to create CSR:
```bash
# Create private key and CSR in one command
openssl req -new -keyout leviousa_private_key.pem -out leviousa.csr -newkey rsa:2048 -nodes -subj "/CN=Leviousa Developer/O=Your Company/C=US"
```

Then upload `leviousa.csr` to the Apple Developer portal for both certificates.

---

**This method works without Xcode and uses minimal disk space! 🎉**
