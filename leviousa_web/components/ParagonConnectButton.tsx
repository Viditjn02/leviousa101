import React from 'react';

interface ParagonConnectButtonProps {
  service: string;
  displayName: string;
  projectId: string;
  userId: string;
}

export default function ParagonConnectButton({ 
  service, 
  displayName, 
  projectId, 
  userId 
}: ParagonConnectButtonProps) {
  
  const handleConnect = () => {
    // Since the SDK's connect() method is broken, we'll use the direct URL approach
    // This is the same URL that works in the Paragon dashboard
    const connectUrl = `https://connect.useparagon.com/${projectId}?integration=${service}`;
    
    // Open in a popup window with proper dimensions
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      connectUrl,
      `paragon-connect-${service}`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      alert('Please allow popups to connect your ' + displayName + ' account');
      return;
    }
    
    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://connect.useparagon.com') return;
      
      console.log('Message from Paragon:', event.data);
      
      // Handle success/error messages from Paragon
      if (event.data.type === 'SUCCESS') {
        console.log(`✅ ${displayName} connected successfully`);
        // Reload the page or update the UI
        window.location.reload();
      } else if (event.data.type === 'ERROR') {
        console.error(`❌ ${displayName} connection failed:`, event.data.error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Clean up listener when popup closes
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };
  
  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
    >
      Connect {displayName}
    </button>
  );
}
