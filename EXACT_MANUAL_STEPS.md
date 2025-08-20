# Google OAuth Verification - Exact Manual Steps ✅

## 🎯 3 Links You Need to Complete (15 minutes total)

---

## **STEP 1: OAuth Consent Screen Configuration** ⏱️ 5 minutes
**Link:** https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101

### **Detailed Instructions:**

1. **Click "EDIT APP" button** (if consent screen exists) or **"CREATE" button** (if new)

2. **App Information Section:**
   ```
   ✅ User Type: External (select this radio button)
   ✅ App name: Leviousa
   ✅ User support email: viditjn02@gmail.com (select from dropdown)
   ✅ App logo: [SKIP - Optional]
   ```

3. **App Domain Section:**
   ```
   ✅ Application home page: https://leviousa-101.web.app
   ✅ Application privacy policy link: https://leviousa-101.web.app/privacy-policy.html
   ✅ Application terms of service link: https://leviousa-101.web.app/terms-of-service.html
   ```

4. **Authorized Domains Section:**
   ```
   ✅ Click "+ ADD DOMAIN"
   ✅ Enter: leviousa-101.web.app
   ✅ Press Enter
   ```

5. **Developer Contact Information:**
   ```
   ✅ Email addresses: viditjn02@gmail.com
   ✅ Click "+ ADD ANOTHER EMAIL" if you want to add more
   ```

6. **Click "SAVE AND CONTINUE"**

7. **Scopes Section - Click "ADD OR REMOVE SCOPES":**
   
   **Copy and paste these EXACT scope URLs one by one:**
   ```
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.compose
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/documents.readonly
   https://www.googleapis.com/auth/documents
   https://www.googleapis.com/auth/spreadsheets.readonly
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/tasks
   ```

   **For each scope, add justification (you can use these):**
   - **userinfo.email/profile:** "User authentication and identification"
   - **drive.file/readonly:** "Save meeting transcripts and access existing documents"  
   - **gmail.readonly/modify/send/compose:** "Send meeting summaries and organize meeting emails"
   - **calendar.readonly/events:** "Create meeting events and read calendar for scheduling"
   - **documents.readonly/documents:** "Create meeting transcripts as Google Docs"
   - **spreadsheets.readonly/spreadsheets:** "Generate meeting analytics and task tracking"
   - **tasks:** "Convert meeting action items to Google Tasks"

8. **Click "UPDATE" then "SAVE AND CONTINUE"**

9. **Test Users Section:**
   ```
   ✅ Add test user: viditjn02@gmail.com
   ✅ Add any other emails you want to test with
   ```

10. **Click "SAVE AND CONTINUE"**

11. **Summary Section:**
    ```
    ✅ Review all information
    ✅ Click "BACK TO DASHBOARD"
    ```

---

## **STEP 2: Domain Verification** ⏱️ 5 minutes
**Link:** https://search.google.com/search-console

### **Detailed Instructions:**

1. **Click "Add Property" button**

2. **Select "URL prefix" option** (right side)

3. **Enter URL:**
   ```
   ✅ URL: https://leviousa-101.web.app
   ✅ Click "CONTINUE"
   ```

4. **Verification Method - Choose HTML file (easiest):**
   ```
   ✅ Click "HTML file" tab
   ✅ Download the verification file (something like google1234567890abcdef.html)
   ```

5. **Upload Verification File:**
   ```bash
   # In your terminal, from the Leviousa101 directory:
   cd leviousa_web/public
   
   # Move the downloaded verification file here
   # (drag and drop from Downloads folder or use mv command)
   
   # Deploy to Firebase
   cd ..
   firebase deploy --only hosting
   ```

6. **Back in Search Console:**
   ```
   ✅ Click "VERIFY" button
   ✅ Should show "Ownership verified" ✅
   ```

**Alternative DNS Method (if HTML doesn't work):**
```
1. Click "Domain name provider" dropdown
2. Select "Other" 
3. Copy the TXT record value
4. Add TXT record to your DNS settings (if you control DNS)
5. Click "VERIFY"
```

---

## **STEP 3: OAuth Client Creation** ⏱️ 5 minutes  
**Link:** https://console.cloud.google.com/apis/credentials?project=leviousa-101

### **Detailed Instructions:**

1. **Click "CREATE CREDENTIALS" button** (top of page)

2. **Select "OAuth 2.0 Client IDs"** from dropdown

3. **Application Type:**
   ```
   ✅ Select: Web application
   ```

4. **Name:**
   ```
   ✅ Name: Leviousa OAuth Client
   ```

5. **Authorized JavaScript origins:**
   ```
   ✅ Click "+ ADD URI"
   ✅ URI 1: https://leviousa-101.web.app
   ✅ Click "+ ADD URI"  
   ✅ URI 2: http://localhost:3000
   ✅ Click "+ ADD URI"
   ✅ URI 3: http://localhost:9001
   ```

6. **Authorized redirect URIs:**
   ```
   ✅ Click "+ ADD URI"
   ✅ URI 1: https://leviousa-101.web.app/oauth/callback
   ✅ Click "+ ADD URI"
   ✅ URI 2: http://localhost:3000/oauth/callback  
   ✅ Click "+ ADD URI"
   ✅ URI 3: http://localhost:9001/oauth/callback
   ```

7. **Click "CREATE"**

8. **Download Credentials:**
   ```
   ✅ Click "DOWNLOAD JSON" button
   ✅ Save as: google-oauth-credentials.json
   ✅ Store securely - contains Client ID and Secret
   ```

9. **Copy Client Information:**
   ```
   ✅ Copy Client ID (starts with numbers, ends with .apps.googleusercontent.com)
   ✅ Copy Client Secret (random string)
   ✅ Save these for your application configuration
   ```

---

## **STEP 4: Submit for Verification** ⏱️ 3 minutes
**Go back to:** https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101

### **Final Submission:**

1. **Click "PUBLISH APP"** button

2. **Verification Submission Form:**
   ```
   ✅ App Description: "Leviousa is a commercial AI meeting assistant that integrates with Google Workspace to provide meeting transcription, automated summaries, and workflow integration."
   
   ✅ Upload Justification Document: 
      - Upload: google-oauth-scope-justification.md (from your project folder)
   
   ✅ Demo Video: 
      - Record 2-3 minute video using google-verification-demo-script.md
      - Or upload placeholder and add later
   
   ✅ Additional Information:
      "This application provides legitimate business productivity features for professional users. All requested scopes are essential for core meeting assistance functionality. Comprehensive privacy policy and security measures are implemented."
   ```

3. **Click "SUBMIT FOR VERIFICATION"**

---

## ✅ **Completion Checklist**

After completing all 3 steps:

- [ ] OAuth Consent Screen configured with all 15 scopes
- [ ] Domain leviousa-101.web.app verified in Search Console  
- [ ] OAuth 2.0 Client ID created with correct redirect URIs
- [ ] App submitted for Google verification review
- [ ] Client credentials downloaded and stored securely

---

## 🎯 **Expected Timeline**

- **Manual Setup:** 15 minutes (following these steps)
- **Google Review:** 2-6 weeks  
- **Follow-up Questions:** Respond within 7 days if contacted
- **Final Approval:** High confidence based on comprehensive setup

---

## 💡 **Pro Tips**

1. **Keep all browser tabs open** until everything is complete
2. **Don't worry about the "unverified app" warning** - this is normal during review
3. **Save your Client ID and Secret** - you'll need these in your application  
4. **The demo video can be added later** if needed during review
5. **Check your email regularly** for Google's verification team communications

---

## 🆘 **If Something Goes Wrong**

**Common Issues:**
- **Domain verification fails:** Try the DNS TXT record method instead
- **Scope errors:** Double-check you copied the URLs exactly
- **Redirect URI errors:** Make sure URLs match exactly (no trailing slashes)

**Contact for help:**  
- **Email:** viditjn02@gmail.com
- **Subject:** "Google OAuth Setup Issue - Leviousa"

**Ready to start? Run this to open all pages:**
```bash
./quick-oauth-setup.sh
```

🚀 **You've got this! The hardest part (documentation and preparation) is already done.**
