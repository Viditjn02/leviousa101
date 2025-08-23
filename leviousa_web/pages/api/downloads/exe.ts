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
 * API endpoint to serve the latest Windows installer from GitHub releases
 * Automatically redirects to the latest Windows EXE download
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        error: 'Unable to fetch release information',
        details: `GitHub API returned ${response.status}`
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

    // Find the Windows installer in the release assets (prioritize Setup.exe over portable)
    const exeAsset = latestRelease.assets.find(asset => {
      const name = asset.name.toLowerCase();
      return (name.includes('.exe') || name.includes('setup')) && 
             name.includes('leviousa') &&
             !name.includes('portable'); // Prefer installer over portable
    }) || latestRelease.assets.find(asset => {
      // Fallback to any exe file if no setup found
      const name = asset.name.toLowerCase();
      return name.includes('.exe') && name.includes('leviousa');
    });

    if (!exeAsset) {
      return res.status(404).json({ 
        error: 'Windows installer not found',
        message: `No Windows installer found in release ${latestRelease.tag_name}`,
        availableAssets: latestRelease.assets.map(a => a.name)
      });
    }

    // Log the download for analytics
    console.log(`EXE Download: ${exeAsset.name} (${exeAsset.size} bytes) from release ${latestRelease.tag_name}`);

    // Set proper headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${exeAsset.name}"`);
    res.setHeader('Content-Length', exeAsset.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.setHeader('X-Release-Version', latestRelease.tag_name);
    res.setHeader('X-File-Size', exeAsset.size.toString());
    res.setHeader('X-Release-Date', latestRelease.created_at);

    // Redirect to the GitHub download URL
    res.redirect(302, exeAsset.browser_download_url);

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
