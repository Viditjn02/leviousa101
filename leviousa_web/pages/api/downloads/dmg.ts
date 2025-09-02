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

    // GitHub releases URLs - PROFESSIONAL NOTARIZED VERSION
    const githubUrls = {
      arm64: 'https://github.com/Viditjn02/leviousa101/releases/download/1.0.0-FINAL-COMPLETE-1756840180591/Leviousa-v1.01-PROFESSIONAL.dmg',
      intel: 'https://github.com/Viditjn02/leviousa101/releases/download/1.0.0-FINAL-COMPLETE-1756840180591/Leviousa-v1.01-PROFESSIONAL.dmg' // Universal DMG works for all architectures
    };
    
    const downloadUrl = githubUrls[detectedArch];
    logger.debug(`🔗 Redirecting to notarized DMG: ${downloadUrl}`);
    
    // Set proper headers for download tracking and filename
    res.setHeader('X-Architecture-Detected', detectedArch);
    res.setHeader('X-User-Agent', userAgent.substring(0, 100));
    res.setHeader('X-Download-Source', 'github-releases-production-ready');
    res.setHeader('X-Apple-Notarized', 'true');
    res.setHeader('X-Leviousa-Version', 'v1.01');
    res.setHeader('Content-Disposition', 'attachment; filename="Leviousa v1.01.dmg"');
    
    // Direct redirect to GitHub release (notarized DMG)
    logger.debug('🚀 Redirecting to notarized DMG with proper filename');
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