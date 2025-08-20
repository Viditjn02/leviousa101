# 🎬 GOOGLE OAUTH VERIFICATION VIDEO SCRIPT
## Leviousa - AI Meeting Assistant

### 📋 **VIDEO REQUIREMENTS (from Google):**
✅ Demonstrate OAuth grant process by users  
✅ Explain how you'll use sensitive and restricted scopes in detail  
✅ Show for each OAuth client in the project  
✅ Clearly show app details (name, OAuth client ID, etc.)  

---

## 🎯 **VIDEO STRUCTURE (3-4 minutes total)**

### **INTRO (0:00 - 0:30)**
**[Screen: Leviousa application homepage]**

**Script:**
> "Hello, I'm demonstrating Leviousa, a commercial AI-powered meeting assistant that integrates with Google Workspace. This video shows our OAuth consent flow and explains exactly how we use each requested scope for legitimate business functionality.
> 
> **App Details:**
> - Application Name: Leviousa  
> - OAuth Client ID: 284693214404-jl4dabihe7k6o2loj8eil4nf344kef1m.apps.googleusercontent.com
> - Project ID: leviousa-101
> - Domain: leviousa-101.web.app"

### **OAUTH GRANT PROCESS DEMONSTRATION (0:30 - 1:30)**
**[Screen: Click "Connect Google Workspace" button]**

**Script:**
> "When users want to connect their Google Workspace, they click 'Connect Google Workspace'. This initiates our secure OAuth 2.0 flow using PKCE for enhanced security."

**[Screen: Google OAuth consent screen]**

**Script:**
> "Users see Google's official consent screen showing our app name 'Leviousa' and all requested permissions. Notice the granular permissions - users can choose which scopes to grant. Let me walk through each scope category and explain exactly why we need them."

### **RESTRICTED SCOPES JUSTIFICATION (1:30 - 2:30)**

#### **Google Drive Scopes (1:30 - 1:50)**
**[Screen: Show Drive scope in consent screen]**

**Script:**
> "**RESTRICTED SCOPE: Google Drive Access**
> 
> We request `drive.file` and `drive.readonly` for essential meeting document management:
> 
> 1. **File Storage**: We automatically save meeting transcripts and recordings to the user's Drive in organized folders
> 2. **Template Access**: We read existing meeting templates to maintain consistency
> 3. **Document Organization**: We create structured folder hierarchies for easy meeting retrieval
> 
> **Live Demo**: Here's a meeting transcript being saved to Drive with proper organization."

**[Screen: Show actual file being saved to Google Drive]**

#### **Sensitive Scopes Explanation (1:50 - 2:30)**

##### **Gmail Scopes (1:50 - 2:05)**
**[Screen: Show Gmail scopes in consent]**

**Script:**
> "**SENSITIVE SCOPES: Gmail Access**
> 
> We request `gmail.send`, `gmail.compose`, `gmail.readonly`, `gmail.modify` for professional communication:
> 
> 1. **Meeting Summaries**: Automatically send meeting summaries to all participants
> 2. **Follow-up Emails**: Create and send action item reminders
> 3. **Context Reading**: Read meeting invitation emails for preparation
> 4. **Email Organization**: Label and organize meeting-related emails
> 
> **Live Demo**: Here's an automated meeting summary being sent via Gmail."

**[Screen: Show email being composed and sent]**

##### **Calendar Scopes (2:05 - 2:15)**
**[Screen: Show Calendar scopes]**

**Script:**
> "**SENSITIVE SCOPES: Calendar Access**
> 
> We request `calendar.readonly` and `calendar.events` for meeting management:
> 
> 1. **Schedule Reading**: Understand user's meeting schedule for context
> 2. **Event Creation**: Create new meeting events with transcripts attached
> 3. **Event Updates**: Add meeting outcomes and follow-ups to existing events
> 
> **Live Demo**: Here's a calendar event being created with meeting details."

**[Screen: Show calendar event creation]**

##### **Documents & Sheets Scopes (2:15 - 2:25)**
**[Screen: Show Documents/Sheets scopes]**

**Script:**
> "**SENSITIVE SCOPES: Documents & Sheets Access**
> 
> For `documents` and `spreadsheets` scopes:
> 
> 1. **Meeting Transcripts**: Create formatted meeting notes in Google Docs
> 2. **Analytics**: Generate meeting insights and productivity metrics in Sheets
> 3. **Action Tracking**: Track meeting action items and completion status
> 
> **Live Demo**: Here's a meeting transcript being created in Google Docs and analytics in Sheets."

**[Screen: Show document creation and spreadsheet analytics]**

##### **Tasks Scope (2:25 - 2:30)**
**[Screen: Show Tasks scope]**

**Script:**
> "**SENSITIVE SCOPE: Tasks Access**
> 
> We request `tasks` scope for action item management:
> 
> 1. **Action Items**: Convert meeting decisions into trackable Google Tasks
> 2. **Accountability**: Assign tasks to meeting participants
> 3. **Follow-through**: Monitor completion status
> 
> **Live Demo**: Here's meeting action items being converted to Google Tasks."

**[Screen: Show task creation]**

### **USER CONTROL & PRIVACY (2:30 - 3:00)**
**[Screen: Show Google Account settings]**

**Script:**
> "Users maintain complete control over their data. They can:
> 
> 1. **View Permissions**: See exactly what Leviousa has accessed in Google Account settings
> 2. **Revoke Access**: Remove permissions at any time
> 3. **Granular Control**: Choose which scopes to grant during initial consent
> 4. **Data Security**: All data is encrypted and processed securely
> 
> This demonstrates our commitment to user privacy and Google's API policies."

### **BUSINESS JUSTIFICATION (3:00 - 3:30)**
**[Screen: Return to Leviousa dashboard showing integrated workflow]**

**Script:**
> "**Why These Scopes Are Essential:**
> 
> Leviousa provides comprehensive meeting assistance that requires deep Google Workspace integration. Our users are business professionals who need:
> 
> ✓ Automated meeting documentation saved to their existing workflows
> ✓ Professional communication with meeting participants  
> ✓ Seamless calendar integration for scheduling
> ✓ Data-driven meeting insights for productivity improvement
> ✓ Action item tracking for accountability
> 
> Each requested scope serves a core business function that limited permissions cannot provide. This integration saves professionals hours of manual work per week."

### **CLOSING (3:30 - 4:00)**
**[Screen: Show app details again]**

**Script:**
> "**Summary:**
> - Application: Leviousa AI Meeting Assistant
> - All scopes used for legitimate business functionality
> - Full user control and privacy compliance
> - Professional productivity tool with clear value proposition
> 
> This demonstrates Leviousa's responsible use of Google APIs for genuine business needs. Thank you for reviewing our verification request."

---

## 📹 **RECORDING CHECKLIST**

### **Technical Requirements:**
- [ ] **Resolution**: 1080p minimum
- [ ] **Audio**: Clear narration throughout
- [ ] **Duration**: 3-4 minutes
- [ ] **Format**: MP4 (widely supported)

### **Content Requirements:**
- [ ] **App Name**: Clearly shown (Leviousa)
- [ ] **OAuth Client ID**: Displayed (284693214404-jl4dabihe7k6o2loj8eil4nf344kef1m.apps.googleusercontent.com)
- [ ] **Project ID**: Mentioned (leviousa-101)
- [ ] **OAuth Grant Process**: Full demonstration
- [ ] **Each Scope Justified**: Detailed explanation for all sensitive/restricted scopes
- [ ] **Live Functionality**: Actual features working, not mockups
- [ ] **User Control**: Show privacy settings and revocation options

### **Screen Recording Setup:**
- [ ] **Clean browser**: No personal bookmarks or extensions visible
- [ ] **Stable connection**: Ensure smooth demo without interruptions  
- [ ] **Test account**: Use account with realistic data (not dummy/test data)
- [ ] **App functionality**: Verify all features work before recording

### **Upload Instructions:**
1. **Upload to YouTube** as unlisted video
2. **Copy the YouTube URL**  
3. **Paste URL in the OAuth consent screen form**
4. **Ensure video remains accessible during review**

---

## 🎯 **KEY SUCCESS FACTORS**

Based on [Google's verification requirements](https://support.google.com/cloud/answer/13463073?visit_id=638911744250645605-1092383752&hl=en-GB&rd=1#verification-requirements):

✅ **Demonstrate Real Functionality**: Show actual working features, not mockups  
✅ **Explain Business Need**: Clear justification for why each scope is essential  
✅ **Show User Control**: Demonstrate privacy settings and user rights  
✅ **Professional Presentation**: High-quality recording with clear narration  
✅ **Complete Coverage**: Address every sensitive and restricted scope requested  

This video script meets all of Google's requirements for OAuth app verification! 🚀
