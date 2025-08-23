import { NextApiRequest, NextApiResponse } from 'next';

interface DownloadStats {
  totalDownloads: number;
  recentDownloads: number; // Downloads in the last 7 days
  platformBreakdown: {
    mac: number;
    windows: number;
    linux: number;
    other: number;
  };
  latestVersion: string;
  lastUpdate: string;
}

/**
 * API endpoint to get download statistics from GitHub releases
 * Returns aggregated download data for analytics
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<DownloadStats | { error: string }>) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get all releases from GitHub API
    const githubApiUrl = 'https://api.github.com/repos/Viditjn02/leviousa101/releases';
    
    const response = await fetch(githubApiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Leviousa-Stats-Server',
        // Add GitHub token if available for higher rate limits
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
        })
      }
    });

    if (!response.ok) {
      console.error('GitHub API Error:', response.status, response.statusText);
      return res.status(502).json({ error: 'Unable to fetch release statistics' });
    }

    const releases = await response.json();
    
    let totalDownloads = 0;
    let recentDownloads = 0;
    const platformBreakdown = {
      mac: 0,
      windows: 0,
      linux: 0,
      other: 0
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Aggregate download stats from all releases
    releases.forEach((release: any) => {
      const releaseDate = new Date(release.created_at);
      
      release.assets.forEach((asset: any) => {
        const downloadCount = asset.download_count || 0;
        totalDownloads += downloadCount;
        
        // Count recent downloads (approximate based on release date)
        if (releaseDate >= sevenDaysAgo) {
          recentDownloads += downloadCount;
        }
        
        // Categorize by platform
        const filename = asset.name.toLowerCase();
        if (filename.includes('.dmg') || filename.includes('macos') || filename.includes('darwin')) {
          platformBreakdown.mac += downloadCount;
        } else if (filename.includes('.exe') || filename.includes('win') || filename.includes('setup')) {
          platformBreakdown.windows += downloadCount;
        } else if (filename.includes('.appimage') || filename.includes('linux') || filename.includes('.deb') || filename.includes('.rpm')) {
          platformBreakdown.linux += downloadCount;
        } else {
          platformBreakdown.other += downloadCount;
        }
      });
    });

    // Get latest release info
    const latestRelease = releases.find((release: any) => !release.draft && !release.prerelease);
    
    const stats: DownloadStats = {
      totalDownloads,
      recentDownloads,
      platformBreakdown,
      latestVersion: latestRelease?.tag_name || 'Unknown',
      lastUpdate: new Date().toISOString()
    };

    // Set cache headers (cache for 1 hour since download counts don't change frequently)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/json');

    res.status(200).json(stats);

  } catch (error) {
    console.error('Download Stats API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
