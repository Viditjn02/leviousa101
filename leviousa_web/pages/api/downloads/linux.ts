import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🐧 Linux Download request received');

  try {
    // GitHub API configuration
    const owner = 'Viditjn02';
    const repo = 'leviousa101';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    // Headers for GitHub API
    const headers: HeadersInit = {
      'User-Agent': 'Leviousa-Download-Service/1.0',
      'Accept': 'application/vnd.github.v3+json',
    };

    // Add authentication if GitHub token is available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
      console.log('✅ Using authenticated GitHub API');
    } else {
      console.log('⚠️ No GitHub token found, using unauthenticated requests');
    }

    console.log(`📡 Fetching latest release from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, { 
      headers,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    // If GitHub API fails, provide fallback
    if (!response.ok) {
      console.log(`GitHub API returned ${response.status}, providing fallback response`);
      
      return res.status(200).json({
        message: 'Linux version coming soon',
        status: 'not_available',
        alternatives: [
          {
            name: 'GitHub Releases',
            url: `https://github.com/${owner}/${repo}/releases`,
            description: 'Check for manual downloads'
          },
          {
            name: 'Build from Source',
            url: `https://github.com/${owner}/${repo}`,
            description: 'Clone and build locally'
          }
        ],
        buildInstructions: {
          steps: [
            'git clone https://github.com/Viditjn02/leviousa101.git',
            'cd leviousa101',
            'npm install',
            'npm run build:linux'
          ]
        }
      });
    }

    const data = await response.json();
    
    if (!data.assets || data.assets.length === 0) {
      console.log('❌ No assets found in the latest release');
      return res.status(200).json({
        message: 'Linux version not yet available',
        status: 'not_available',
        version: data.tag_name || '1.0.0',
        alternatives: [
          {
            name: 'Build from Source',
            url: `https://github.com/${owner}/${repo}`,
            description: 'Clone and build for your Linux distribution'
          }
        ]
      });
    }

    // Look for Linux-compatible files
    const linuxAsset = data.assets.find((asset: any) => {
      const name = asset.name.toLowerCase();
      return name.includes('linux') || 
             name.includes('appimage') || 
             name.includes('tar.gz') ||
             name.includes('deb') ||
             name.includes('rpm');
    });

    if (!linuxAsset) {
      console.log('❌ No Linux asset found');
      return res.status(200).json({
        message: 'Linux version not yet available',
        status: 'not_available',
        version: data.tag_name || '1.0.0',
        availableAssets: data.assets.map((asset: any) => asset.name),
        alternatives: [
          {
            name: 'Build from Source',
            url: `https://github.com/${owner}/${repo}`,
            description: 'Clone and build for your Linux distribution'
          }
        ]
      });
    }

    console.log(`✅ Found Linux asset: ${linuxAsset.name}`);
    console.log(`📦 Download URL: ${linuxAsset.browser_download_url}`);
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${linuxAsset.name}"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Download-Source', 'github-releases');
    
    // Redirect to the actual download URL
    res.redirect(302, linuxAsset.browser_download_url);
    
  } catch (error) {
    console.error('❌ Linux download error:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch Linux download',
      message: 'Linux version coming soon',
      alternatives: [
        {
          name: 'Build from Source',
          url: 'https://github.com/Viditjn02/leviousa101',
          description: 'Clone and build locally'
        }
      ]
    });
  }
}
