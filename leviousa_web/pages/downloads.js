import { useState, useEffect } from 'react';

export default function DownloadsPage() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    try {
      const response = await fetch('/api/downloads/latest');
      const data = await response.json();
      setReleases([data]); // For now, just show latest
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadOptions = [
    {
      os: 'macOS',
      icon: '🍎',
      downloads: [
        { 
          name: 'macOS (Apple Silicon)', 
          url: '/api/downloads/dmg?arch=arm64',
          description: 'For M1, M2, M3 Macs'
        },
        { 
          name: 'macOS (Intel)', 
          url: '/api/downloads/dmg?arch=intel',
          description: 'For Intel-based Macs'
        }
      ]
    },
    {
      os: 'Windows',
      icon: '🪟',
      downloads: [
        { 
          name: 'Windows Installer', 
          url: '/api/downloads/exe',
          description: 'Windows 10/11 (64-bit)'
        }
      ]
    },
    {
      os: 'Linux',
      icon: '🐧',
      downloads: [
        { 
          name: 'Linux AppImage', 
          url: '/api/downloads/linux',
          description: 'Universal Linux binary'
        }
      ]
    }
  ];

  return (
    <div className="downloads-page">
      <div className="container">
        <h1>Download Leviousa</h1>
        <p className="subtitle">
          Choose the right version for your operating system
        </p>

        {loading ? (
          <div className="loading">Loading releases...</div>
        ) : (
          <div className="download-grid">
            {downloadOptions.map((option) => (
              <div key={option.os} className="os-section">
                <h2>
                  <span className="os-icon">{option.icon}</span>
                  {option.os}
                </h2>
                
                <div className="download-options">
                  {option.downloads.map((download, index) => (
                    <div key={index} className="download-item">
                      <div className="download-info">
                        <h3>{download.name}</h3>
                        <p>{download.description}</p>
                      </div>
                      <a 
                        href={download.url}
                        className="download-link"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="additional-info">
          <h3>System Requirements</h3>
          <ul>
            <li><strong>macOS:</strong> macOS 10.15 (Catalina) or later</li>
            <li><strong>Windows:</strong> Windows 10 or later (64-bit)</li>
            <li><strong>Linux:</strong> Ubuntu 18.04+ / equivalent distribution</li>
          </ul>
          
          <div className="help-section">
            <h3>Need Help?</h3>
            <p>Having trouble with the download? <a href="/support">Contact support</a> or check our <a href="/faq">FAQ</a>.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .downloads-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        h1 {
          text-align: center;
          font-size: 3rem;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #fff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          text-align: center;
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 3rem;
        }

        .loading {
          text-align: center;
          font-size: 1.1rem;
          opacity: 0.8;
        }

        .download-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .os-section {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .os-section h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .os-icon {
          font-size: 1.8rem;
        }

        .download-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .download-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .download-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
        }

        .download-info p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .download-link {
          background: linear-gradient(135deg, #0070f3 0%, #0051cc 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .download-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 112, 243, 0.4);
        }

        .additional-info {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .additional-info h3 {
          margin-bottom: 1rem;
          color: #f0f0f0;
        }

        .additional-info ul {
          list-style: none;
          padding: 0;
        }

        .additional-info li {
          padding: 0.5rem 0;
          opacity: 0.9;
        }

        .help-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .help-section a {
          color: #87ceeb;
          text-decoration: none;
        }

        .help-section a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .download-grid {
            grid-template-columns: 1fr;
          }
          
          .download-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
