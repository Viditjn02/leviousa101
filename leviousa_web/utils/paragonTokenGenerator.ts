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
  // In production/Firebase, we'll use a simple demo token
  // In development with API routes available, use the API
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction || typeof window === 'undefined') {
    // For Firebase/production deployment, return a demo token
    // This is for demo purposes only - in real production you'd get this from your auth system
    const projectId = process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_PARAGON_PROJECT_ID not configured');
    }
    
    // Create a simple JWT-like token for demo purposes
    // Note: This is NOT secure for production - it's just for testing Firebase deployment
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: userId || 'demo-user',
      aud: `useparagon.com/${projectId}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 3600), // 7 days for production
      demo: true
    }));
    
    const token = `${header}.${payload}.demo-signature`;
    
    // Cache the token (expires in 6 days to account for 7-day token)
    tokenCache.set(cacheKey, {
      token,
      expiry: Date.now() + (6 * 24 * 60 * 60 * 1000)
    });
    
    return token;
  }
  
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