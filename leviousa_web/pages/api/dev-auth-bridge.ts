import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Development Mode Authentication Bridge
 * Workaround for macOS Electron deep link limitations in development mode
 */

// Simple in-memory store for development auth data
const authBridge = new Map<string, any>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[DevAuthBridge] Request received:', req.method, req.url);
  
  if (req.method === 'POST') {
    // Store auth data from browser
    try {
      const { authData, timestamp } = req.body;
      
      if (!authData || !authData.user || !authData.user.token) {
        return res.status(400).json({ error: 'Invalid auth data' });
      }
      
      console.log('[DevAuthBridge] Storing auth data for user:', authData.user.email);
      
      // Store with timestamp key for cleanup
      const key = `auth_${timestamp}`;
      authBridge.set(key, {
        ...authData,
        storedAt: Date.now()
      });
      
      // Clean up old entries (>5 minutes)
      for (const [k, v] of authBridge.entries()) {
        if (Date.now() - v.storedAt > 300000) {
          authBridge.delete(k);
        }
      }
      
      console.log('[DevAuthBridge] Auth data stored successfully');
      return res.status(200).json({ success: true, message: 'Auth data stored' });
      
    } catch (error) {
      console.error('[DevAuthBridge] Error storing auth data:', error);
      return res.status(500).json({ error: 'Failed to store auth data' });
    }
    
  } else if (req.method === 'GET') {
    // Check for auth data (Electron polling)
    try {
      console.log('[DevAuthBridge] Polling request from Electron app');
      
      // Return the most recent auth data
      let latestAuth = null;
      let latestTimestamp = 0;
      
      for (const [key, authData] of authBridge.entries()) {
        if (authData.timestamp > latestTimestamp) {
          latestAuth = authData;
          latestTimestamp = authData.timestamp;
        }
      }
      
      if (latestAuth && Date.now() - latestAuth.timestamp < 300000) { // Within 5 minutes
        console.log('[DevAuthBridge] Returning auth data for user:', latestAuth.user.email);
        
        // Remove the auth data after returning it (one-time use)
        for (const [key, authData] of authBridge.entries()) {
          if (authData.timestamp === latestTimestamp) {
            authBridge.delete(key);
            break;
          }
        }
        
        return res.status(200).json(latestAuth);
      } else {
        return res.status(404).json({ success: false, message: 'No auth data available' });
      }
      
    } catch (error) {
      console.error('[DevAuthBridge] Error retrieving auth data:', error);
      return res.status(500).json({ error: 'Failed to retrieve auth data' });
    }
    
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

