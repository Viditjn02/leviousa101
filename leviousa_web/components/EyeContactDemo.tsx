import React, { useEffect, useRef, useState } from 'react';

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

interface EyeContactDemoProps {
  enabled?: boolean;
}

declare global {
  interface Window {
    webgazer: any;
  }
}

const EyeContactDemo: React.FC<EyeContactDemoProps> = ({ enabled = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  
  // Load WebGazer.js
  useEffect(() => {
    const loadWebGazer = async () => {
      if (!window.webgazer) {
        const script = document.createElement('script');
        script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
        script.onload = () => {
          console.log('✅ WebGazer.js loaded');
        };
        script.onerror = () => {
          setWebcamError('Failed to load WebGazer.js');
        };
        document.head.appendChild(script);
      }
    };
    
    loadWebGazer();
  }, []);

  // Start webcam and eye tracking
  const startEyeTracking = async () => {
    try {
      // Start webcam
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start WebGazer if available
      if (window.webgazer) {
        window.webgazer
          .setGazeListener((data: any, timestamp: number) => {
            if (data) {
              setGazeData({
                x: data.x,
                y: data.y,
                timestamp: timestamp
              });
              
              // Draw gaze point and corrected position
              drawGazeVisualization(data.x, data.y);
            }
          })
          .showVideo(false) // Hide WebGazer's video
          .showPredictionPoints(false) // Hide WebGazer's prediction points
          .begin();
        
        setIsActive(true);
        setWebcamError(null);
      }
    } catch (error) {
      console.error('Failed to start eye tracking:', error);
      setWebcamError('Please allow camera access to use eye contact correction');
    }
  };

  // Stop eye tracking
  const stopEyeTracking = () => {
    if (window.webgazer) {
      window.webgazer.end();
    }
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    setIsActive(false);
    setGazeData(null);
  };

  // Draw gaze visualization
  const drawGazeVisualization = (gazeX: number, gazeY: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Calculate gaze position relative to video
    const videoRect = video.getBoundingClientRect();
    const relativeX = (gazeX / window.innerWidth) * canvas.width;
    const relativeY = (gazeY / window.innerHeight) * canvas.height;
    
    // Draw current gaze point (red)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(relativeX, relativeY, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Calculate "corrected" gaze point (towards camera/center)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 3; // Camera is typically at top-center
    
    // Interpolate between actual gaze and camera position
    const correctionStrength = 0.6; // 60% correction towards camera
    const correctedX = relativeX + (centerX - relativeX) * correctionStrength;
    const correctedY = relativeY + (centerY - relativeY) * correctionStrength;
    
    // Draw corrected gaze point (green)
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(correctedX, correctedY, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw connection line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(relativeX, relativeY);
    ctx.lineTo(correctedX, correctedY);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText('Actual Gaze', relativeX + 15, relativeY - 10);
    ctx.fillText('Corrected Look', correctedX + 15, correctedY - 10);
  };

  // Start calibration
  const startCalibration = () => {
    alert('Click on different areas of the screen while looking at your cursor. This trains the eye tracker to be more accurate.');
    setIsCalibrated(true);
  };

  useEffect(() => {
    // Animation loop for canvas updates
    let animationFrame: number;
    
    const animate = () => {
      if (isActive && videoRef.current && canvasRef.current) {
        // Update canvas size to match video
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    if (isActive) {
      animationFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isActive]);

  return (
    <div className="eye-contact-demo" style={{ 
      maxWidth: '800px', 
      margin: '20px auto', 
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: 'white', marginBottom: '10px' }}>
          🎥 Real-Time Eye Contact Correction Demo
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
          This demo shows how eye tracking works in real-time. The red dot shows where you're actually looking, 
          and the green dot shows where your gaze would be corrected to appear more natural in video calls.
        </p>
      </div>

      {webcamError && (
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          color: '#FFC107',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          ⚠️ {webcamError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <button
          onClick={isActive ? stopEyeTracking : startEyeTracking}
          style={{
            padding: '10px 20px',
            background: isActive ? '#f44336' : '#4CAF50',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {isActive ? 'Stop Tracking' : 'Start Eye Tracking'}
        </button>

        {isActive && (
          <button
            onClick={startCalibration}
            style={{
              padding: '10px 20px',
              background: '#2196F3',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Calibrate
          </button>
        )}
      </div>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Hidden video element for webcam feed */}
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ display: 'none' }}
        />
        
        {/* Canvas for visualization */}
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            background: '#000'
          }}
        />
        
        {!isActive && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <p>Click "Start Eye Tracking" to begin</p>
          </div>
        )}
      </div>

      {gazeData && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '6px'
        }}>
          <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>Live Gaze Data:</h4>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
            <div>X: {Math.round(gazeData.x)}px</div>
            <div>Y: {Math.round(gazeData.y)}px</div>
            <div>Timestamp: {Math.round(gazeData.timestamp)}ms</div>
          </div>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>How it works:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>🔴 Red dot: Where you're actually looking</li>
          <li>🟢 Green dot: Corrected gaze position (towards camera)</li>
          <li>📏 White line: Shows the correction being applied</li>
          <li>🎯 Click around the screen to improve accuracy</li>
        </ul>
      </div>
    </div>
  );
};

export default EyeContactDemo; 