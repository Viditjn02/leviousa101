import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * Serve Notarized DMG Files - Updated 2025-08-31T07:20:26.671Z
 * Apple notarization completed and stapled
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { arch = 'arm64' } = req.query;
  
  try {
    // Determine which DMG to serve based on architecture
    const dmgFiles = {
      'arm64': 'dist/Leviousa-1.0.0-arm64.dmg',
      'intel': 'dist/Leviousa-1.0.0.dmg',
      'x64': 'dist/Leviousa-1.0.0.dmg'  // Alias for intel
    };
    
    const dmgPath = dmgFiles[arch as string] || dmgFiles.arm64;
    const fullPath = path.join(process.cwd(), '..', dmgPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'DMG not found',
        arch,
        path: dmgPath
      });
    }
    
    const stat = fs.statSync(fullPath);
    const dmgBuffer = fs.readFileSync(fullPath);
    
    // Set headers for secure download
    const filename = path.basename(dmgPath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('X-Download-Source', 'leviousa-notarized');
    res.setHeader('X-Apple-Notarized', 'true');
    res.setHeader('X-Code-Signed', 'Developer ID Application: Vidit Jain (8LNUMP84V8)');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hour cache
    
    // Send the DMG file
    res.send(dmgBuffer);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Download failed',
      message: 'Unable to serve DMG file' 
    });
  }
}

// Increase body size limit for large DMG files
export const config = {
  api: {
    responseLimit: '300mb'
  }
};