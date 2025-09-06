# 🧪 Debug Test Guide - Firebase Auth Investigation

## 🎯 **Current Issue**

Based on your console logs, there's a **Firebase auth state persistence problem**:

```
✅ Initial: "Is authenticated: true" (user Object) 
❌ Reset:   "Received user state change: null"
❌ Result:  Shows welcome screen instead of keeping user logged in
```

## 🔧 **Enhanced Debugging Added**

The **`Leviousa-DEBUG.dmg`** contains comprehensive logging to identify exactly why Firebase auth state resets:

### New Debug Logs Will Show:
```javascript
[AuthService] 🔔 AUTH STATE CHANGE TRIGGERED!
[AuthService] 🔍 Previous user: uid123 (user@email.com)  
[AuthService] 🔍 New user: null
[AuthService] 🔍 Auth state change reason: Firebase onAuthStateChanged callback

// If user becomes null, it will show investigation:
[AuthService] ❌ Firebase user is NULL - investigating cause...
[AuthService] 🔍 This could be caused by:
[AuthService] 🔍   1. User explicitly logged out
[AuthService] 🔍   2. Auth token expired or invalid  
[AuthService] 🔍   3. Firebase persistence failed to restore auth state
[AuthService] 🔍   4. Network issues preventing auth verification

// Plus Firebase client debugging:
[FirebaseClient] ✅ Firebase initialized successfully with class-based electron-store persistence.
[FirebaseClient] 🔍 Initial auth state check: User user@email.com
```

### Paragon SDK Fixes:
```javascript
[Preload] 📋 Paragon SDK loading disabled in preload context due to module resolution issues.
[Preload] 📋 Integration features will load via main process when needed.
```

## 🧪 **Testing Steps**

### 1. **Install Debug DMG**:
```bash
open dist/Leviousa-DEBUG.dmg
# Drag to Applications, replace existing version
```

### 2. **Test Firebase Auth Flow**:
1. **Launch app** and open Developer Tools (View → Toggle Developer Tools)
2. **Click "Sign in with Google"** 
3. **Watch console for detailed auth flow logs**
4. **Sign in with correct Google account** (should show account selection)
5. **Check if auth state persists** or gets reset

### 3. **Expected Debug Output**:

**✅ Successful Flow:**
```
[FirebaseClient] ✅ Firebase initialized successfully...
[AuthService] 🔔 AUTH STATE CHANGE TRIGGERED!
[AuthService] 🔍 Previous user: null
[AuthService] 🔍 New user: uid123 (viditjn02@gmail.com)
[AuthService] ✅ Firebase user signed in: uid123 viditjn02@gmail.com  
[HeaderController] Received user state change: [User Object]
[HeaderController] Is authenticated: true
```

**❌ Problem Flow:**
```
[AuthService] ✅ Firebase user signed in: uid123 viditjn02@gmail.com
[AuthService] 📡 Broadcasting user state...
[AuthService] 🔔 AUTH STATE CHANGE TRIGGERED!  
[AuthService] ❌ Firebase user is NULL - investigating cause...
[AuthService] 🔍   3. Firebase persistence failed to restore auth state ← LIKELY CAUSE
[HeaderController] Received user state change: null
```

## 🔍 **Key Things to Watch For**

### 1. **Paragon SDK Issues**:
- ✅ **Should see**: `Paragon SDK loading disabled in preload context`  
- ❌ **Should NOT see**: `Failed to load Paragon SDK: module not found`

### 2. **IPC Communication**: 
- ✅ **Should see**: Clean console without `ipcRenderer.handle is not a function`
- ✅ **Should see**: `[Preload] Delegating Paragon authenticate to main process`

### 3. **Firebase Auth Persistence**:
- 🔍 **Watch for**: When exactly auth state becomes null
- 🔍 **Check**: If Firebase `currentUser` exists but `onAuthStateChanged` receives null
- 🔍 **Look for**: Auth token expiry or network verification failures

### 4. **Google Account Selection**:
- ✅ **Should see**: Google account selection dialog with multiple accounts
- ✅ **Should authenticate**: With the account you actually choose

## 📋 **Critical Log Patterns to Report**

### If Auth State Reset Issue Persists:
```javascript
[AuthService] 🤔 INCONSISTENCY: Firebase auth has currentUser but onAuthStateChanged received null
[AuthService] 🤔 This suggests a Firebase SDK bug or timing issue
```

### If Google Account Issue Persists:
- Does account selection dialog appear?
- Which account gets authenticated vs. which one you selected?

### If Paragon Issues Persist:
- Any new Paragon SDK errors in console?
- Integration features working or failing?

## 🎯 **Next Actions Based on Test Results**

### **Scenario A**: Debug DMG fixes everything
→ Deploy to production via Vercel blob

### **Scenario B**: Auth state still resets
→ Need to investigate Firebase persistence class implementation

### **Scenario C**: Google account selection still wrong  
→ Need to enhance OAuth provider configuration

### **Scenario D**: Paragon still fails
→ Need to move Paragon SDK completely to main process

---

## 🚀 **Test the `Leviousa-DEBUG.dmg` and report the detailed console logs!**

The enhanced debugging will pinpoint exactly what's causing the Firebase auth state reset issue so we can fix it definitively.

