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

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  downloadCount: number;
  downloads: {
    mac: {
      url: string;
      filename: string;
      size: number;
    } | null;
    windows: {
      url: string;
      filename: string;
      size: number;
    } | null;
  };
  releaseNotes: string;
}

/**
 * API endpoint to get information about the latest release
 * Returns JSON with download URLs and release information
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ReleaseInfo | { error: string; message?: string }>) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the latest release from GitHub API
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

    if (!response.ok) {
      console.error('GitHub API Error:', response.status, response.statusText);
      return res.status(502).json({ 
        error: 'Unable to fetch release information'
      });
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

    // Find platform-specific assets
    const dmgAsset = latestRelease.assets.find(asset => 
      asset.name.toLowerCase().includes('.dmg') && 
      asset.name.toLowerCase().includes('leviousa')
    );

    const exeAsset = latestRelease.assets.find(asset => {
      const name = asset.name.toLowerCase();
      return (name.includes('.exe') || name.includes('setup')) && 
             name.includes('leviousa');
    });

    // Calculate total download count
    const downloadCount = latestRelease.assets.reduce((total, asset) => total + (asset.download_count || 0), 0);

    // Build response
    const releaseInfo: ReleaseInfo = {
      version: latestRelease.tag_name,
      releaseDate: latestRelease.created_at,
      downloadCount,
      downloads: {
        mac: dmgAsset ? {
          url: `${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/downloads/dmg`,
          filename: dmgAsset.name,
          size: dmgAsset.size
        } : null,
        windows: exeAsset ? {
          url: `${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/downloads/exe`,
          filename: exeAsset.name,
          size: exeAsset.size
        } : null
      },
      releaseNotes: latestRelease.body || `Leviousa ${latestRelease.tag_name} - Latest version with enhanced features and improvements.`
    };

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('Content-Type', 'application/json');

    res.status(200).json(releaseInfo);

  } catch (error) {
    console.error('Latest Release API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to fetch release information. Please try again later.'
    });
  }
}
