/**
 * Client-side Paragon token generation utility
 * For development and Firebase deployment compatibility
 */

// Token cache to prevent multiple concurrent requests
const tokenCache = new Map<string, { token: string; expiry: number }>();

// Function to clear expired tokens from cache
export function clearExpiredTokens(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];
  
  tokenCache.forEach((value, key) => {
    if (value.expiry <= now) {
      console.log('🗑️ [ParagonTokenGenerator] Clearing expired token for', key);
      entriesToDelete.push(key);
    }
  });
  
  entriesToDelete.forEach(key => tokenCache.delete(key));
}

// Function to force clear all tokens (useful for debugging)
export function clearAllTokens(): void {
  console.log('🗑️ [ParagonTokenGenerator] Clearing all cached tokens');
  tokenCache.clear();
}

// Function to generate Paragon user token on client-side
export async function generateParagonToken(userId?: string): Promise<string> {
  const cacheKey = userId || 'default-user';
  
  // Check cache first (but with shorter validity to avoid expired token issues)
  const cached = tokenCache.get(cacheKey);
  const cacheValid = cached && cached.expiry > Date.now() + (5 * 60 * 1000); // Invalidate 5 min before expiry
  if (cacheValid) {
    console.log('🔄 [ParagonTokenGenerator] Using cached token for', cacheKey);
    return cached.token;
  } else if (cached) {
    console.log('🔄 [ParagonTokenGenerator] Cached token near expiry, generating new one for', cacheKey);
    tokenCache.delete(cacheKey); // Clear expired cache
  }
  
  // ALWAYS use real JWT tokens from API route (no more fake tokens!)
  // This ensures proper Paragon authentication in all environments
  try {
    console.log('🔄 [ParagonTokenGenerator] Generating new token from API for', cacheKey);
    
    // Use new Paragon token API endpoint with POST method
    const response = await fetch('/api/paragon/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userId || 'default-user' })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.token) {
      throw new Error(`API error: ${data.error || 'No token received'}`);
    }
    
    console.log('✅ [ParagonTokenGenerator] Token generated successfully from API');
    
    // Cache the token (expires in 50 minutes for 1-hour server tokens)
    tokenCache.set(cacheKey, {
      token: data.token,
      expiry: Date.now() + (50 * 60 * 1000) // 50 minutes
    });
    
    return data.token;
  } catch (error) {
    console.error('[ParagonTokenGenerator] ❌ Failed to get Paragon user token from API:', error);
    throw error;
  }
}