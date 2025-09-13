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
  // ALWAYS use real API route for proper signed tokens
  // Both development and packaged mode use the real Express API (since we have API proxy)
  
  // Development mode - use API route
  try {
    console.log('🔄 [ParagonTokenGenerator] Generating new token from API for', cacheKey);
    const url = userId ? `/api/paragonToken?userId=${encodeURIComponent(userId)}` : '/api/paragonToken';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.userToken) {
      throw new Error('No user token received from API');
    }
    
    // Cache the token (expires in 23 hours for development, accounting for 24-hour server token)
    tokenCache.set(cacheKey, {
      token: data.userToken,
      expiry: Date.now() + (23 * 60 * 60 * 1000)
    });
    
    return data.userToken;
  } catch (error) {
    console.error('Failed to get Paragon user token from API:', error);
    throw error;
  }
}