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

  // Live time for status bar
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

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
            <div className="dynamic-island" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff453a', opacity: 0.8 }} />
              <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                <span style={{ width: '2px', height: '6px', background: '#eab308', borderRadius: '1px' }} />
                <span style={{ width: '2px', height: '10px', background: '#eab308', borderRadius: '1px' }} />
                <span style={{ width: '2px', height: '4px', background: '#eab308', borderRadius: '1px' }} />
              </div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="iphone-status-bar">
            <span className="iphone-time" style={{ fontWeight: 700, fontSize: '13px' }}>{timeStr || "21:30"}</span>
            <div className="iphone-status-icons" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Signal size={12} fill="currentColor" stroke="none" />
              <Wifi size={12} strokeWidth={2.4} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: '5px',
                padding: '1px 3px',
                fontSize: '9px',
                fontWeight: 800,
                color: '#fff',
                gap: '1px',
              }}>
                <span>43</span>
              </div>
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
