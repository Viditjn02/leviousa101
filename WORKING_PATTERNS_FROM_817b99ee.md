# Working Integration Patterns from Commit 817b99eec5e64878d3a5e05daf17f20cb8f8e076

## 🎯 **Analysis Complete - All Integration Patterns Discovered**

Based on comprehensive analysis of the working commit, here are the **exact patterns** that were working:

## 📊 **Working Proxy API Endpoints**

### **1. Gmail Integration** ✅
```javascript
// List Messages
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/gmail/v1/users/me/messages

// Send Email (Special Pattern)
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/gmail/v1/users/me/messages/send
```

### **2. Google Calendar Integration** ✅  
```javascript
// List Calendars
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/users/me/calendarList

// List Events  
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events

// Create Event (POST)
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events

// Update Event (PUT)
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events/${eventId}

// Delete Event (DELETE)
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events/${eventId}
```

### **3. LinkedIn Integration** ✅
```javascript
// Get Profile
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/people/~:(id,firstName,lastName,headline)

// Try Company Profile
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/companies
```

### **4. Notion Integration** ✅
```javascript
// User Info (replaces deprecated databases endpoint)
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/notion/v1/users/me
// Headers: { 'Notion-Version': '2022-06-28' }
```

### **5. Calendly Integration** ✅
```javascript
// Get User Info
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/users/me

// List Scheduled Events (needs org URI)
https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/scheduled_events?organization=${orgUri}
```

## 🔧 **Working Workflow UUIDs**

### **Calendar Operations (Zeus API)**
```javascript
const CALENDAR_WORKFLOW_ID = 'b3722478-58db-4d18-a75a-043664ead1f7';

// Usage:
https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/triggers/${CALENDAR_WORKFLOW_ID}
// Method: POST
// Body: { calendar: 'primary', maxResults: 10 }
```

## 📋 **Critical Differences Found**

### **1. Integration Name Casing**
- **Working**: `google-calendar` (hyphen)
- **Current**: `googleCalendar` (camelCase)

### **2. Gmail Send Pattern**  
- **Working**: Uses `gmail/gmail/v1/users/me/messages/send` endpoint  
- **Current**: Uses Zeus workflow (may not be configured)

### **3. Calendar Create**
- **Working**: Direct Proxy API to `google-calendar/events` (POST)
- **Current**: Zeus workflow (UUID doesn't exist)

### **4. Response Format**
- **Working**: `{ success: true, data: ... }`
- **Current**: May vary

## 🎯 **Key Insights**

1. **Proxy API was PRIMARY method** - not Zeus workflows
2. **Zeus workflows were SECONDARY** for specific operations  
3. **Integration names use hyphens** in proxy URLs
4. **Gmail send has special endpoint pattern**
5. **Calendar operations use direct proxy endpoints**

## 🔧 **What Needs to be Fixed in Current Implementation**

1. **Change** `googleCalendar` → `google-calendar` in proxy calls
2. **Use Proxy API for calendar create** instead of Zeus workflow
3. **Fix Gmail send** to use proper proxy endpoint if not working  
4. **Use correct LinkedIn endpoint** with field selection
5. **Add Notion-Version header** for Notion calls

## ✅ **Verification**

The working commit had **full CRUD operations** working because they used **direct Proxy API calls** with the correct endpoint formats, NOT Zeus workflows for most operations.

The **current failure** is because we're using:
- Wrong integration names (camelCase vs hyphens) 
- Zeus workflows where Proxy API should be used
- Missing headers and incorrect endpoint paths



