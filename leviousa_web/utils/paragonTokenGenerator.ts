/**
 * Client-side Paragon token generation utility
 * For development and Firebase deployment compatibility
 */

// Function to generate Paragon user token on client-side
export async function generateParagonToken(): Promise<string> {
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
      sub: 'demo-user',
      aud: `useparagon.com/${projectId}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      demo: true
    }));
    
    return `${header}.${payload}.demo-signature`;
  }
  
  // Development mode - use API route
  try {
    const response = await fetch('/api/paragonToken');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.userToken) {
      throw new Error('No user token received from API');
    }
    return data.userToken;
  } catch (error) {
    console.error('Failed to get Paragon user token from API:', error);
    throw error;
  }
}