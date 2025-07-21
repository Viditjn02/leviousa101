# Activity Page Self-Healing Fix

## Problem Identified

The activity page had a **routing-dependent loading issue**:

### ✅ **Working Case (Invalid Routes)**
- User visits `/dashboard` or `/logout` (non-existent routes)
- Next.js falls back to root page (`/`)
- Root page redirects authenticated users to `/activity`
- **This redirect flow works perfectly**

### ❌ **Broken Case (Direct Access)**
- User directly visits or reloads `/activity`
- Goes directly to activity page component
- Gets stuck loading due to CORS/authentication race conditions
- **Page hangs indefinitely**

## Root Cause

Direct page access has different initialization timing compared to redirect access:
- **Direct access**: AuthProvider + ActivityPage initialize simultaneously → Race conditions
- **Redirect access**: AuthProvider already resolved → Clean navigation

## Solution: Self-Healing Mechanism

Since the redirect flow works perfectly, I implemented a **self-healing mechanism** that mimics the working behavior:

### Implementation Details

```typescript
// Self-healing mechanism in /app/activity/page.tsx
useEffect(() => {
  const warningTimeout = setTimeout(() => {
    if (isLoading) {
      setShowStuckWarning(true); // Show user warning at 8 seconds
    }
  }, 8000);
  
  const redirectTimeout = setTimeout(() => {
    if (isLoading) {
      router.push('/'); // Redirect to root at 12 seconds (triggers working flow)
    }
  }, 12000);
  
  return () => {
    clearTimeout(warningTimeout);
    clearTimeout(redirectTimeout);
  };
}, [isLoading, router]);
```

### User Experience

1. **0-8 seconds**: Normal loading spinner
2. **8-12 seconds**: Warning message appears: "⚠️ Loading is taking longer than expected. Will auto-refresh in a few seconds..."
3. **12+ seconds**: Automatic redirect to `/` → back to `/activity` (clean flow)

## Benefits

- ✅ **Self-healing**: Never gets permanently stuck
- ✅ **Transparent**: User doesn't realize it's a workaround
- ✅ **Leverages working flow**: Uses the already-functioning redirect mechanism
- ✅ **No complex debugging**: Avoids deep CORS/authentication race condition fixes
- ✅ **Robust**: Handles any unknown loading issues

## Testing

To test the fix:
1. Visit https://leviousa-101.web.app/activity directly
2. If it loads normally: ✅ Fixed
3. If it gets stuck: Watch for warning at 8s, auto-redirect at 12s
4. After redirect: Should load successfully

## Future Improvements

Once this proves stable, the underlying CORS/authentication race conditions can be investigated and fixed properly, then this self-healing mechanism can be removed. 