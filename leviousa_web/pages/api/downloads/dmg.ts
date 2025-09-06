import type { NextApiRequest, NextApiResponse } from 'next'
import logger from '@/utils/productionLogger';

/**
 * DMG Download API with Enhanced Architecture Detection
 * Serves notarized DMGs from GitHub releases with auto-detection
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Enhanced architecture detection and handling
    const { arch } = req.query;
    const userAgent = req.headers['user-agent'] || '';
    
    // Auto-detect architecture if not specified
    let detectedArch = 'arm64'; // Default to Apple Silicon
    
    if (arch) {
      detectedArch = arch === 'intel' || arch === 'x64' ? 'intel' : 'arm64';
    } else {
      // Auto-detect from user agent
      const isIntelMac = /Intel Mac/.test(userAgent) || /x86_64/.test(userAgent);
      detectedArch = isIntelMac ? 'intel' : 'arm64';
    }
    
    logger.debug(`🎯 Architecture: ${detectedArch} (${arch ? 'specified' : 'auto-detected'})`);

    // Vercel Blob Storage - Fresh Universal DMG
    const vercelBlobUrl = 'https://0o5nwpnru4kg7num.public.blob.vercel-storage.com/releases/Leviousa.dmg';
    
    const downloadUrl = vercelBlobUrl;
    logger.debug(`🔗 Redirecting to notarized DMG: ${downloadUrl}`);
    
    // Set proper headers for download tracking and filename
    res.setHeader('X-Architecture-Detected', detectedArch);
    res.setHeader('X-User-Agent', userAgent.substring(0, 100));
    res.setHeader('X-Download-Source', 'vercel-blob-storage');
    res.setHeader('X-Apple-Notarized', 'true');
    res.setHeader('X-Leviousa-Version', 'v1.02');
    res.setHeader('Content-Disposition', 'attachment; filename="Leviousa.dmg"');
    
    // Direct redirect to Vercel Blob storage (notarized DMG)
    logger.debug('🚀 Redirecting to fresh notarized DMG via Vercel Blob');
    return res.redirect(302, downloadUrl);
    
  } catch (error) {
    console.error('Download API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to process download request. Please try again later.'
    });
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};