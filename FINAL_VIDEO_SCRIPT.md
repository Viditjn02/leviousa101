# 🎬 FINAL OAUTH VERIFICATION VIDEO SCRIPT
## Leviousa - Streamlined Demo (3 minutes)

### 📋 **YOUR CURRENT SCOPES TO DEMONSTRATE:**
- ✅ **gmail.readonly** - Read emails
- ✅ **gmail.send** - Send emails  
- ✅ **calendar.readonly** - Read calendar/events
- ✅ **calendar.events** - Create/update/delete events
- ✅ **userinfo.email/profile** - Basic identity

---

## 🎯 **VIDEO STRUCTURE (3 minutes)**

### **INTRO (0:00 - 0:20)**
**[Screen: Show Leviousa app homepage]**

**Script:**
> "This is Leviousa, an AI meeting assistant that integrates with Google Workspace. I'll demonstrate our OAuth consent flow and show exactly how we use each requested permission.
> 
> **App Details:**
> - Application: Leviousa
> - OAuth Client ID: [show from your OAuth settings]
> - Domain: leviousa-101.web.app
> - We request only 5 Google API scopes for legitimate meeting assistance."

### **OAUTH CONSENT FLOW (0:20 - 0:50)**
**[Screen: Click "Connect Google Workspace"]**

**Script:**
> "When users connect Google Workspace, they see this OAuth consent screen showing our 5 requested permissions. Users can grant granular permissions - they control what access to provide.
>
> Notice we only request:
> - Basic profile info for identification
> - Gmail reading to find meeting emails
> - Gmail sending for meeting summaries  
> - Calendar reading for schedule awareness
> - Calendar editing for meeting management"

**[Screen: Show consent screen, click Allow]**

### **GMAIL FUNCTIONALITY DEMO (0:50 - 1:40)**
**[Screen: Show Gmail integration in action]**

**Script:**
> "**Gmail Reading (gmail.readonly)**: We read meeting invitation emails to understand context and participants. Here's our app searching for meeting-related emails."

**[Demo: Show email reading functionality]**

> "**Gmail Sending (gmail.send)**: After meetings, we automatically send summaries to participants. Here's a meeting summary being sent via Gmail."

**[Demo: Show email being sent with meeting summary]**

### **CALENDAR FUNCTIONALITY DEMO (1:40 - 2:30)**
**[Screen: Show Calendar integration]**

**Script:**
> "**Calendar Reading (calendar.readonly)**: We read the user's calendar to understand their meeting schedule and availability. Here's our app viewing upcoming meetings."

**[Demo: Show calendar events being read]**

> "**Calendar Management (calendar.events)**: We create new meeting events and update existing ones with meeting outcomes. Here's creating a new meeting event with participant details."

**[Demo: Show calendar event being created/updated]**

### **USER CONTROL & PRIVACY (2:30 - 2:50)**
**[Screen: Google Account permissions settings]**

**Script:**
> "Users maintain complete control. They can view our permissions in Google Account settings and revoke access anytime. We only access data during active meeting assistance and follow Google's data policies."

### **CLOSING (2:50 - 3:00)**
**[Screen: Back to Leviousa dashboard]**

**Script:**
> "This demonstrates Leviousa's legitimate use of 5 Google API scopes for professional meeting assistance. Each permission serves essential functionality that users specifically request. Thank you for reviewing our application."

---

## 🎥 **RECORDING CHECKLIST:**

### **Technical:**
- [ ] 1080p resolution minimum
- [ ] Clear audio narration
- [ ] Stable screen recording
- [ ] 3-minute duration

### **Content Requirements:**
- [ ] Show app name and OAuth client ID clearly
- [ ] Demonstrate OAuth consent flow
- [ ] Show Gmail reading functionality working
- [ ] Show Gmail sending functionality working  
- [ ] Show Calendar reading functionality working
- [ ] Show Calendar create/update functionality working
- [ ] Show user privacy controls

### **What to Actually Record:**

#### **Gmail Demo:**
1. **Email Reading**: Use your `gmail_search_emails` or `gmail_get_emails` function
2. **Email Sending**: Use your `gmail_send_email` function to send a test summary

#### **Calendar Demo:**  
1. **Calendar Reading**: Use your `google_calendar_list_events` function
2. **Event Creation**: Use your `google_calendar_create_event` function
3. **Event Update**: Use your `google_calendar_update_event` function

---

## 📹 **QUICK RECORDING SETUP:**

1. **Test Your Functions**: Make sure `gmail_send_email` and `google_calendar_create_event` work
2. **Prepare Test Data**: Have sample meeting data ready
3. **Clean Browser**: Remove personal bookmarks/extensions  
4. **Record in Segments**: Film each demo section separately, then combine
5. **Upload to YouTube**: As unlisted video

---

## 🎯 **VIDEO SUCCESS FACTORS:**

✅ **Shows Real Functionality**: Every scope demonstrated with working features
✅ **Professional Presentation**: Clear narration and smooth demo flow  
✅ **User Privacy Focus**: Emphasizes user control and data protection
✅ **Legitimate Business Use**: Clear meeting assistance value proposition
✅ **Complete Scope Coverage**: All 5 requested scopes demonstrated

**This streamlined approach covers all your actual functionality and will get approved quickly!** 🚀
