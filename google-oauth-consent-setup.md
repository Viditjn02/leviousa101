# Google OAuth Consent Screen Setup Guide
## Leviousa - Commercial AI Meeting Assistant

### 🚀 Quick Setup Checklist

Follow these steps to get your Google OAuth consent screen approved quickly:

#### Step 1: Deploy Required Pages
```bash
# Deploy privacy policy and terms of service
cd leviousa_web
npm run build
firebase deploy --only hosting
```

**Required URLs (now live):**
- **Privacy Policy:** https://leviousa-101.web.app/privacy-policy
- **Terms of Service:** https://leviousa-101.web.app/terms-of-service
- **Application Homepage:** https://leviousa-101.web.app

#### Step 2: Configure OAuth Consent Screen

Go to [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent?project=leviousa-101)

**Basic Information:**
```
User Type: External
App name: Leviousa
User support email: viditjn02@gmail.com
App logo: (Upload your logo - 120x120px recommended)

App domain:
Application home page: https://leviousa-101.web.app
Application privacy policy link: https://leviousa-101.web.app/privacy-policy
Application terms of service link: https://leviousa-101.web.app/terms-of-service

Authorized domains:
leviousa-101.web.app

Developer contact information:
viditjn02@gmail.com
```

#### Step 3: Add OAuth Scopes

Click "ADD OR REMOVE SCOPES" and add these specific scopes:

**Authentication & Profile (Required):**
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

**Google Drive (File Management):**
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.readonly
```

**Gmail (Meeting Communication):**
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.compose
```

**Google Calendar (Meeting Scheduling):**
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
```

**Google Docs (Meeting Documentation):**
```
https://www.googleapis.com/auth/documents.readonly
https://www.googleapis.com/auth/documents
```

**Google Sheets (Meeting Analytics):**
```
https://www.googleapis.com/auth/spreadsheets.readonly
https://www.googleapis.com/auth/spreadsheets
```

**Google Tasks (Action Items):**
```
https://www.googleapis.com/auth/tasks
```

#### Step 4: Scope Justifications

For each scope, use these justifications:

**Email & Profile:**
- "Required for user authentication and identification"

**Drive (readonly):**
- "Reading existing meeting documents and templates for context and reference"

**Drive (file):**
- "Saving meeting transcripts, notes, and recordings to user's Drive for organization and backup"

**Gmail (readonly):**
- "Reading meeting-related emails and invitations to understand meeting context and prepare relevant insights"

**Gmail (modify):**
- "Organizing meeting-related emails into appropriate labels and managing email workflows"

**Gmail (send):**
- "Sending automated meeting summaries, action items, and follow-up emails to meeting participants"

**Gmail (compose):**
- "Creating draft emails with meeting summaries for user review before sending"

**Calendar (readonly):**
- "Reading user's calendar to understand meeting schedule and provide context-aware assistance"

**Calendar (events):**
- "Creating and updating calendar events with meeting notes, outcomes, and follow-up information"

**Documents (readonly):**
- "Accessing existing meeting templates and documentation to maintain consistency"

**Documents (write):**
- "Creating comprehensive meeting transcripts and formatted meeting notes in Google Docs"

**Sheets (readonly):**
- "Reading existing tracking spreadsheets to understand user's data organization preferences"

**Sheets (write):**
- "Creating meeting analytics dashboards, action item tracking, and productivity insights"

**Tasks:**
- "Converting meeting action items into trackable Google Tasks for accountability and follow-through"

#### Step 5: Test Users

Add these test users during development:
```
viditjn02@gmail.com (Developer)
[Add other team members' emails]
```

#### Step 6: Submit for Verification

**Required Materials for Submission:**

1. **Scope Justification Document:** 
   - File: `google-oauth-scope-justification.md` (already created)
   - Upload this as supporting documentation

2. **Demo Video Script:**
   ```
   Duration: 2-3 minutes
   Content to show:
   1. Open Leviousa application
   2. Click "Connect Google Workspace"
   3. Show OAuth consent screen with clear scope explanations
   4. Demonstrate key features:
      - Meeting transcription saving to Drive
      - Calendar event creation
      - Email summary sending
      - Task creation from action items
   5. Show user can revoke permissions in Google Account
   ```

3. **Verification Form Responses:**
   - **How does your app use Gmail API?** "Sends automated meeting summaries and follow-ups to meeting participants. Organizes meeting-related emails into labels."
   - **How does your app use Drive API?** "Saves meeting transcripts and notes to user's Drive. Accesses existing meeting templates for consistency."
   - **How does your app use Calendar API?** "Creates calendar events for new meetings and updates existing events with meeting outcomes."
   - **Why does your app need these sensitive scopes?** "Core functionality requires comprehensive Google Workspace integration to provide seamless meeting assistance and workflow automation."

---

### 🎯 Quick Approval Tips

#### Domain Verification
1. Verify `leviousa-101.web.app` in [Google Search Console](https://search.google.com/search-console)
2. Add DNS TXT record if prompted
3. Status should show "Verified" before submitting

#### Logo Requirements
- **Size:** 120x120 pixels
- **Format:** PNG with transparent background
- **Content:** Clear, professional logo
- **Brand Consistency:** Match your app's branding

#### Common Rejection Reasons to Avoid
1. ❌ **Vague scope justifications** → ✅ **Specific use cases provided above**
2. ❌ **Missing demo video** → ✅ **Record comprehensive demo**
3. ❌ **Unverified domain** → ✅ **Verify in Search Console first**
4. ❌ **Generic privacy policy** → ✅ **Detailed, service-specific policy created**
5. ❌ **Missing contact information** → ✅ **Clear contact details provided**

#### Timeline Expectations
- **Internal Testing:** Immediate (with test users added)
- **Verification Review:** 2-6 weeks typically
- **Follow-up Questions:** Respond within 7 days if contacted
- **Approval:** Usually granted if all requirements met

---

### 🚨 Critical Success Factors

#### 1. Comprehensive Scope Justification
Each scope must have a clear, specific business justification showing how it's essential for core functionality.

#### 2. Professional Presentation
- Clean, professional UI/UX
- Clear consent flow explanations
- Proper branding and messaging

#### 3. Privacy Compliance
- Detailed privacy policy covering Google API usage
- Clear data retention policies
- User control mechanisms

#### 4. Technical Implementation
- Proper OAuth 2.0 + PKCE implementation
- Secure token handling
- Error handling and user experience

#### 5. Demo Quality
- High-quality screen recording
- Clear narration explaining each feature
- Demonstration of all requested scopes in action

---

### 📞 Emergency Contacts

If you encounter issues during verification:

**Google OAuth Support:**
- [OAuth Consent Screen Help](https://support.google.com/cloud/answer/10311615)
- [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

**Developer Contact:**
- Email: viditjn02@gmail.com
- Subject: "Google OAuth Verification - Leviousa"

---

### ✅ Final Checklist

Before submitting for verification, ensure:

- [ ] Domain `leviousa-101.web.app` is verified in Search Console
- [ ] Privacy Policy and Terms of Service are live at correct URLs
- [ ] All 11 required scopes are added with detailed justifications
- [ ] Test users can successfully complete OAuth flow
- [ ] Demo video recorded showing all features
- [ ] Scope justification document uploaded
- [ ] Developer contact information is current
- [ ] App logo uploaded (120x120px)
- [ ] All form fields completed accurately

**Ready for submission!** 🚀
