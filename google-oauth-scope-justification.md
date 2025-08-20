# Google OAuth Consent Screen - Scope Justification Document
## Leviousa - Commercial AI Meeting Assistant

### Application Information
- **Application Name:** Leviousa
- **Application Type:** Desktop Application (Electron) with Web Interface
- **Application URL:** https://leviousa-101.web.app
- **Privacy Policy URL:** https://leviousa-101.web.app/settings/privacy
- **Terms of Service URL:** https://leviousa-101.web.app/settings
- **Support Email:** viditjn02@gmail.com
- **Developer Contact:** viditjn02@gmail.com

### Application Description
Leviousa is a commercial AI-powered meeting assistant that helps professionals with real-time meeting transcription, insights, and workflow automation. The application integrates with Google Workspace services to provide comprehensive productivity features while maintaining user privacy and control.

### Core Features Requiring Google Integration
1. **Meeting Notes & Documentation** - Automatic saving of meeting transcripts to Google Drive and Docs
2. **Calendar Integration** - Smart meeting scheduling and calendar event management
3. **Email Automation** - Sending meeting summaries and follow-ups via Gmail
4. **Task Management** - Converting action items to Google Tasks
5. **Data Analysis** - Meeting metrics and insights in Google Sheets
6. **Workspace Integration** - Seamless workflow with existing Google Workspace setup

---

## Detailed Scope Justifications

### 1. Google Drive API Scopes

#### `https://www.googleapis.com/auth/drive.readonly`
**Purpose:** Read access to user's Google Drive files
**Justification:** 
- Allows users to import existing meeting notes and documents for context
- Enables the AI assistant to reference previously stored meeting materials
- Required for displaying user's Drive files in the application interface
- Used to access templates and shared meeting documents

#### `https://www.googleapis.com/auth/drive.file`
**Purpose:** Create, read, update, and delete files that the app creates in Drive
**Justification:**
- Essential for saving meeting transcripts as documents in Google Drive
- Allows automatic backup of meeting recordings and notes
- Enables creation of structured meeting folders and organization
- Required for updating existing meeting documents with new information

### 2. Gmail API Scopes

#### `https://www.googleapis.com/auth/gmail.readonly`
**Purpose:** Read user's email messages
**Justification:**
- Enables the AI to understand meeting context by reading related email threads
- Helps identify meeting participants from email invitations
- Allows smart scheduling suggestions based on email communications
- Required for email-based meeting preparation and context gathering

#### `https://www.googleapis.com/auth/gmail.modify`
**Purpose:** Read, compose, send, and permanently delete user's email
**Justification:**
- Essential for organizing meeting-related emails into appropriate labels
- Allows automatic archiving of processed meeting invitations
- Enables smart email management based on meeting outcomes
- Required for updating email threads with meeting results

#### `https://www.googleapis.com/auth/gmail.send`
**Purpose:** Send email on behalf of the user
**Justification:**
- **Core Feature:** Automatically sends meeting summaries to participants
- Enables follow-up emails with action items and next steps
- Allows scheduling confirmation emails for new meetings
- Essential for professional workflow automation

#### `https://www.googleapis.com/auth/gmail.compose`
**Purpose:** Create email drafts
**Justification:**
- Creates draft emails with meeting summaries for user review before sending
- Enables preparation of follow-up emails based on meeting outcomes
- Allows users to customize automated emails before sending
- Provides user control over automated communications

### 3. Google Calendar API Scopes

#### `https://www.googleapis.com/auth/calendar.readonly`
**Purpose:** Read user's calendar events
**Justification:**
- **Essential for Core Functionality:** Understanding user's meeting schedule
- Enables automatic meeting preparation by reading calendar event details
- Allows smart scheduling suggestions based on existing availability
- Required for context-aware meeting assistance

#### `https://www.googleapis.com/auth/calendar.events`
**Purpose:** Create, read, update, and delete calendar events
**Justification:**
- **Core Feature:** Automatically creates calendar events for new meetings
- Updates existing events with meeting notes and outcomes
- Enables rescheduling based on meeting results
- Essential for comprehensive calendar management workflow

### 4. Google Docs API Scopes

#### `https://www.googleapis.com/auth/documents.readonly`
**Purpose:** Read user's Google Docs
**Justification:**
- Allows reading of existing meeting templates and note formats
- Enables the AI to understand user's preferred documentation style
- Required for accessing shared meeting agendas and templates
- Helps maintain consistency with existing document formats

#### `https://www.googleapis.com/auth/documents`
**Purpose:** Create, read, update, and delete Google Docs
**Justification:**
- **Primary Use Case:** Creates comprehensive meeting transcripts as Google Docs
- Enables real-time collaborative note-taking during meetings
- Allows formatting and structuring of meeting documents
- Essential for professional meeting documentation workflow

### 5. Google Sheets API Scopes

#### `https://www.googleapis.com/auth/spreadsheets.readonly`
**Purpose:** Read user's Google Sheets
**Justification:**
- Allows reading of existing meeting tracking spreadsheets
- Enables analysis of historical meeting data and patterns
- Required for integration with existing project management sheets
- Helps understand user's data organization preferences

#### `https://www.googleapis.com/auth/spreadsheets`
**Purpose:** Create, read, update, and delete Google Sheets
**Justification:**
- **Analytics Feature:** Creates meeting metrics and analytics dashboards
- Enables tracking of action items and follow-up tasks
- Allows creation of attendance and participation reports
- Essential for data-driven meeting improvement insights

### 6. Google Tasks API Scope

#### `https://www.googleapis.com/auth/tasks`
**Purpose:** Create, read, update, and delete tasks
**Justification:**
- **Key Productivity Feature:** Converts meeting action items to Google Tasks automatically
- Enables assignment of follow-up tasks to meeting participants
- Allows tracking of task completion status
- Essential for actionable meeting outcomes and accountability

### 7. User Information Scopes

#### `https://www.googleapis.com/auth/userinfo.email`
**Purpose:** Access user's email address
**Justification:**
- Required for user identification and authentication
- Used for sending system notifications and updates
- Essential for associating meeting data with the correct user account
- Standard requirement for OAuth applications

#### `https://www.googleapis.com/auth/userinfo.profile`
**Purpose:** Access user's basic profile information
**Justification:**
- Used for personalizing the application experience
- Enables proper attribution in shared meeting documents
- Required for user identification in collaborative features
- Standard requirement for comprehensive user authentication

---

## Privacy and Security Commitments

### Data Usage
1. **Minimal Data Collection:** Only accesses data necessary for core meeting assistant functionality
2. **User Control:** Users can revoke access at any time through Google Account settings
3. **No Unauthorized Sharing:** Data is never shared with third parties without explicit user consent
4. **Secure Storage:** All data is encrypted in transit and at rest
5. **Limited Retention:** Data is only retained as long as necessary for service provision

### Security Measures
1. **OAuth 2.0 with PKCE:** Implements secure authentication with Proof Key for Code Exchange
2. **Encrypted Communications:** All API calls use HTTPS/TLS encryption
3. **Minimal Permissions:** Requests only the minimum scopes required for functionality
4. **Regular Security Audits:** Application undergoes regular security reviews
5. **Secure Key Management:** API keys and credentials are securely stored and rotated

### User Transparency
1. **Clear Consent Flow:** Users see exactly what permissions are being requested
2. **Feature Explanations:** Each feature clearly explains why specific permissions are needed
3. **Granular Control:** Users can enable/disable individual integrations
4. **Activity Logs:** Users can view what data has been accessed and when
5. **Easy Revocation:** Simple process to revoke permissions or delete data

---

## Business Justification

### Target Users
- **Business Professionals:** Who need efficient meeting management and follow-up
- **Team Leaders:** Who want comprehensive meeting analytics and action tracking
- **Project Managers:** Who require integrated task management with meeting outcomes
- **Consultants:** Who need professional meeting documentation and client communication

### Commercial Use Case
Leviousa is a commercial productivity tool that provides value by automating routine meeting-related tasks, enabling users to focus on high-value activities rather than administrative work. The Google Workspace integration is essential for seamless workflow integration in professional environments.

### Competitive Advantage
The comprehensive Google Workspace integration allows Leviousa to provide a unified meeting experience that competitors cannot match, making it an essential tool for Google Workspace users.

---

## Technical Implementation

### OAuth Flow
1. User initiates authentication from within the Leviousa application
2. Redirected to Google OAuth consent screen with clear scope explanations
3. Upon consent, user is redirected back to application
4. Secure token exchange using PKCE for enhanced security
5. Tokens stored securely with encryption

### Error Handling
- Graceful degradation when services are unavailable
- Clear error messages and recovery instructions
- Automatic token refresh for uninterrupted service
- Circuit breaker patterns to prevent API abuse

### Rate Limiting
- Intelligent API usage to stay within Google's rate limits
- Exponential backoff for retry logic
- Caching to minimize unnecessary API calls
- User notifications when rate limits are approached

This application represents a genuine use case for comprehensive Google Workspace integration, providing significant value to professional users while maintaining the highest standards of privacy and security.
