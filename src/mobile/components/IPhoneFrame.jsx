import React, { useState, useEffect } from 'react';
import { Battery, Wifi, Signal } from 'lucide-react';

export default function IPhoneFrame({ children }) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isDesktop) {
    return <>{children}</>;
  }

  // Format time for status bar
  const timeStr = "9:41";

  return (
    <div className="emulator-container">
      {/* Ambient background blur clouds */}
      <div className="emulator-bg-glow" />
      
      {/* iPhone 15 Pro Device Frame */}
      <div className="iphone-device">
        {/* Physical buttons */}
        <div className="iphone-btn iphone-btn-action" />
        <div className="iphone-btn iphone-btn-volume-up" />
        <div className="iphone-btn iphone-btn-volume-down" />
        <div className="iphone-btn iphone-btn-power" />
        
        {/* Screen */}
        <div className="iphone-screen">
          {/* Dynamic Island */}
          <div className="dynamic-island-container">
            <div className="dynamic-island" />
          </div>
          
          {/* Status Bar */}
          <div className="iphone-status-bar">
            <span className="iphone-time">{timeStr}</span>
            <div className="iphone-status-icons">
              <Signal size={11} fill="currentColor" stroke="none" />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: -0.2 }}>5G</span>
              <Battery size={15} style={{ marginLeft: 2, opacity: 0.9 }} />
            </div>
          </div>
          
          {/* App Contents */}
          <div className="iphone-content">
            {children}
          </div>
          
          {/* Home Indicator */}
          <div className="iphone-home-indicator-bar">
            <div className="iphone-home-indicator" />
          </div>
        </div>
      </div>
      
      {/* Legend Info */}
      <div className="emulator-legend">
        <h3>hollow. mobile emulator</h3>
        <p>Simulating iPhone 15 Pro hardware. Resize your browser window below 768px or open on a mobile device to automatically view full screen.</p>
      </div>
    </div>
  );
}
