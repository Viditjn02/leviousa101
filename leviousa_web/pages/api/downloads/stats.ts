import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Simple download statistics API
 * Returns basic download metrics from server logs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Note: In production, you'd typically pull this from a database or analytics service
    // For now, this returns the tracking setup info
    
    const stats = {
      tracking_enabled: true,
      analytics_sources: [
        'PostHog (client-side button clicks)',
        'Vercel Analytics (client-side)',  
        'Server logs (API requests)',
        'Google Analytics (gtag)'
      ],
      posthog_events: [
        'download_button_clicked - Comprehensive download tracking with device info',
      ],
      server_events: [
        'Download requests logged with IP, platform, and user agent'
      ],
      how_to_check: {
        posthog: 'Login to PostHog dashboard and search for "download_button_clicked" events',
        vercel: 'Check Vercel Analytics dashboard for "download_start" events',
        server_logs: 'Check Vercel function logs for "📊 DOWNLOAD:" entries'
      },
      last_updated: new Date().toISOString(),
      version: '1.0.6'
    };

    res.status(200).json(stats);
    
  } catch (error) {
    console.error('Download stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to fetch download statistics'
    });
  }
}