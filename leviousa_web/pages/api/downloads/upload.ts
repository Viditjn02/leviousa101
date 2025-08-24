import { put } from '@vercel/blob';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Secure file upload API for Leviousa installers
 * Uses Vercel Blob Storage with encryption and unique URLs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple authentication (you can enhance this)
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const expectedToken = process.env.UPLOAD_SECRET || 'your-secure-upload-token';
    
    if (authToken !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse form data
    const formData = await req.formData?.() || new FormData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string;
    const architecture = formData.get('architecture') as string || 'universal';

    if (!file || !platform) {
      return res.status(400).json({ 
        error: 'Missing required fields: file and platform' 
      });
    }

    // Validate file types for security
    const allowedTypes = {
      'macos': ['.dmg'],
      'windows': ['.exe', '.msi'],
      'linux': ['.AppImage', '.deb', '.rpm', '.tar.gz']
    };

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const platformTypes = allowedTypes[platform.toLowerCase()] || [];
    
    if (!platformTypes.includes(fileExtension)) {
      return res.status(400).json({
        error: `Invalid file type for ${platform}. Allowed: ${platformTypes.join(', ')}`
      });
    }

    // Generate secure file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${platform}-${architecture}-${timestamp}${fileExtension}`;
    const blobPath = `releases/v1.0.0/${fileName}`;

    console.log(`🔐 Uploading ${file.name} as ${blobPath}`);

    // Upload to Vercel Blob with public access but unguessable URL
    const blob = await put(blobPath, file, {
      access: 'public', // Public access but URL is unguessable for security
      addRandomSuffix: true // Adds entropy to prevent URL guessing
    });

    console.log(`✅ File uploaded successfully: ${blob.url}`);

    // Return secure download information
    res.status(200).json({
      success: true,
      file: {
        name: fileName,
        originalName: file.name,
        platform,
        architecture,
        size: file.size,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname
      },
      uploadedAt: new Date().toISOString(),
      cdnInfo: {
        encrypted: true,
        globalDistribution: true,
        securityLevel: 'enterprise'
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    res.status(500).json({ 
      error: 'Upload failed',
      message: 'Failed to upload file to secure storage'
    });
  }
}

// Increase file size limit for installers
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb', // Allow up to 500MB for app installers
    },
  },
};
