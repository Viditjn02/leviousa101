import { useState, useEffect } from 'react';

export default function SmartDownloadButton() {
  const [os, setOs] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modern OS detection (like VS Code/Discord)
  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = window.navigator.platform.toLowerCase();
      
      if (userAgent.includes('win') || platform.includes('win')) {
        return 'Windows';
      } else if (userAgent.includes('mac') || platform.includes('mac')) {
        // Detect Apple Silicon vs Intel
        const isAppleSilicon = userAgent.includes('apple') && 
          (userAgent.includes('arm') || userAgent.includes('aarch64'));
        return isAppleSilicon ? 'MacOS-arm64' : 'MacOS-intel';
      } else if (userAgent.includes('linux') || platform.includes('linux')) {
        return 'Linux';
      }
      return 'Unknown';
    };

    const detectedOS = detectOS();
    setOs(detectedOS);

    // Set download URLs based on OS (like modern websites)
    const urls = {
      'Windows': '/api/downloads/exe',
      'MacOS-arm64': '/api/downloads/dmg?arch=arm64', 
      'MacOS-intel': '/api/downloads/dmg?arch=intel',
      'Linux': '/api/downloads/linux',
      'Unknown': '/downloads' // Fallback to download page
    };

    setDownloadUrl(urls[detectedOS] || urls['Unknown']);
  }, []);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Modern approach: Use API routes for analytics & redirects
      const response = await fetch(downloadUrl);
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        const data = await response.json();
        if (data.downloadUrl) {
          window.location.href = data.downloadUrl;
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to direct download page
      window.location.href = '/downloads';
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Preparing Download...';
    
    const labels = {
      'Windows': 'Download for Windows',
      'MacOS-arm64': 'Download for Mac (Apple Silicon)',
      'MacOS-intel': 'Download for Mac (Intel)', 
      'Linux': 'Download for Linux',
      'Unknown': 'Download Leviousa'
    };
    
    return labels[os] || 'Download Leviousa';
  };

  return (
    <div className="download-section">
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="download-btn modern-btn"
      >
        <svg 
          className="download-icon" 
          viewBox="0 0 24 24" 
          width="20" 
          height="20"
        >
          <path 
            fill="currentColor" 
            d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,8L16,12H13V16H11V12H8L12,8Z"
          />
        </svg>
        {getButtonText()}
      </button>
      
      {/* Alternative downloads (like VS Code does) */}
      <div className="alt-downloads">
        <a href="/downloads" className="text-link">
          Other platforms & versions
        </a>
      </div>

      <style jsx>{`
        .download-section {
          text-align: center;
          margin: 2rem 0;
        }

        .modern-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 12px 24px;
          background: linear-gradient(135deg, #0070f3 0%, #0051cc 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 200px;
        }

        .modern-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 112, 243, 0.3);
        }

        .modern-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .download-icon {
          flex-shrink: 0;
        }

        .alt-downloads {
          margin-top: 1rem;
        }

        .text-link {
          color: #666;
          text-decoration: none;
          font-size: 14px;
        }

        .text-link:hover {
          color: #0070f3;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
