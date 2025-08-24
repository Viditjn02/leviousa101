import { NextApiRequest, NextApiResponse } from 'next';

interface GitHubAsset {
  name: string;
  download_url: string;
  size: number;
  created_at: string;
  browser_download_url: string;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  assets: GitHubAsset[];
}

/**
 * API endpoint to serve the latest DMG file from GitHub releases
 * Automatically redirects to the latest macOS DMG download
 * Falls back to direct file serving if GitHub releases are unavailable
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Modern approach: Handle architecture detection
    const { arch } = req.query;
    const requestedArch = arch === 'intel' ? 'intel' : 'arm64'; // Default to Apple Silicon
    console.log(`🎯 Architecture requested: ${requestedArch}`);

    // Try GitHub releases first
    const githubApiUrl = 'https://api.github.com/repos/Viditjn02/leviousa101/releases';
    
    const response = await fetch(githubApiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Leviousa-Download-Server',
        // Add GitHub token if available for higher rate limits
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
        })
      }
    });

    // If GitHub API fails, try fallback options
    if (!response.ok) {
      console.log(`GitHub API returned ${response.status}, trying fallback options...`);
      
      // Fallback: Direct redirect to known working release  
      console.log('GitHub API unavailable, redirecting to direct download');
      
      // Modern fallback: Use self-hosted downloads with architecture detection
      const fallbackUrls = {
        'arm64': 'https://www.leviousa.com/releases/Leviousa-1.0.0-arm64.dmg',
        'intel': 'https://www.leviousa.com/releases/Leviousa-1.0.0-intel.dmg'
      };
      
      const directDownloadUrl = fallbackUrls[requestedArch];
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="Leviousa-1.0.0-${requestedArch}.dmg"`);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('X-Download-Source', 'self-hosted-fallback');
      res.setHeader('X-Architecture', requestedArch);
      
      return res.redirect(302, directDownloadUrl);
    }

    const releases: GitHubRelease[] = await response.json();
    
    // Find the latest non-draft, non-prerelease release
    const latestRelease = releases.find(release => 
      !release.draft && !release.prerelease && release.assets.length > 0
    );

    if (!latestRelease) {
      return res.status(404).json({ 
        error: 'No stable releases found',
        message: 'Please check back soon for the latest Leviousa release.'
      });
    }

    // Modern approach: Find DMG file based on architecture
    const architecturePatterns = {
      'arm64': ['arm64', 'apple-silicon', 'aarch64'],
      'intel': ['intel', 'x64', 'x86_64', 'universal']
    };
    
    const patterns = architecturePatterns[requestedArch];
    
    let dmgAsset = latestRelease.assets.find(asset => {
      const name = asset.name.toLowerCase();
      return name.includes('.dmg') && 
             name.includes('leviousa') &&
             patterns.some(pattern => name.includes(pattern.toLowerCase()));
    });
    
    // Fallback: Find any DMG if specific architecture not found
    if (!dmgAsset) {
      dmgAsset = latestRelease.assets.find(asset => {
        const name = asset.name.toLowerCase();
        return name.includes('.dmg') && name.includes('leviousa');
      });
    }

    if (!dmgAsset) {
      return res.status(404).json({ 
        error: 'DMG file not found',
        message: `No DMG file found in release ${latestRelease.tag_name}`,
        availableAssets: latestRelease.assets.map(a => a.name)
      });
    }

    // Log the download for analytics
    console.log(`✅ DMG Download: ${dmgAsset.name} (${dmgAsset.size} bytes) from release ${latestRelease.tag_name} for ${requestedArch}`);

    // Set proper headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${dmgAsset.name}"`);
    res.setHeader('Content-Length', dmgAsset.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('X-Release-Version', latestRelease.tag_name);
    res.setHeader('X-File-Size', dmgAsset.size.toString());
    res.setHeader('X-Release-Date', latestRelease.created_at);
    res.setHeader('X-Architecture', requestedArch);
    res.setHeader('X-Asset-Name', dmgAsset.name);

    // Redirect to the GitHub download URL
    res.redirect(302, dmgAsset.browser_download_url);

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
