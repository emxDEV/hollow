import React from 'react';

export function getPropFirmInfo(firmName = '', type = '') {
  const name = (firmName || '').toLowerCase();
  const accType = (type || '').toLowerCase();
  
  if (name.includes('apex')) {
    return {
      displayName: 'Apex',
      color: '#ffffff',
      bg: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.2)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L2 19h20L12 3z" />
          <path d="M12 3v16" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
        </svg>
      )
    };
  }
  
  if (name.includes('topstep')) {
    return {
      displayName: 'Topstep',
      color: '#e5e5e5',
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.15)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 20h4v-4h4v-4h4v-4h4V4" />
        </svg>
      )
    };
  }
  
  if (name.includes('tradeify')) {
    return {
      displayName: 'Tradeify',
      color: '#cccccc',
      bg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.12)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 17l6-6-6-6M13 17l6-6-6-6" />
        </svg>
      )
    };
  }
  
  if (name.includes('myfunded') || name.includes('mffu')) {
    return {
      displayName: 'MFFU',
      color: '#b3b3b3',
      bg: 'rgba(255, 255, 255, 0.03)',
      border: 'rgba(255, 255, 255, 0.08)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M8 14V10l4 3 4-3v4" />
        </svg>
      )
    };
  }
  
  if (name.includes('bulenox')) {
    return {
      displayName: 'Bulenox',
      color: '#999999',
      bg: 'rgba(255, 255, 255, 0.03)',
      border: 'rgba(255, 255, 255, 0.08)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4v8l-8 5-8-5V7l8-4z" />
          <path d="M8 9s2 3 4 3 4-3 4-3" />
        </svg>
      )
    };
  }
  
  if (name.includes('take profit') || name.includes('tpt')) {
    return {
      displayName: 'TPT',
      color: '#808080',
      bg: 'rgba(255, 255, 255, 0.02)',
      border: 'rgba(255, 255, 255, 0.06)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M7 12h10" />
        </svg>
      )
    };
  }
  
  if (name.includes('lucid')) {
    return {
      displayName: 'Lucid',
      color: '#d1d1d6',
      bg: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.12)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z" />
        </svg>
      )
    };
  }
  
  if (name.includes('interactive') || name.includes('ib') || accType === 'live') {
    return {
      displayName: 'IBKR',
      color: '#f2f2f7',
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.15)',
      logo: (size) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M9 8h2v8H9M15 8h-2v8h2" />
        </svg>
      )
    };
  }
  
  return {
    displayName: 'Hollow',
    color: 'rgba(255,255,255,0.7)',
    bg: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.1)',
    logo: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z" />
      </svg>
    )
  };
}

export function PropFirmLogo({ firm, type, size = 16, color }) {
  const info = getPropFirmInfo(firm, type);
  return (
    <span style={{ color: color || info.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {info.logo(size)}
    </span>
  );
}

export function PropFirmBadge({ firm, type, size = 26, logoSize = 12 }) {
  const info = getPropFirmInfo(firm, type);
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '6px',
      background: info.bg,
      border: `1px solid ${info.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: info.color,
      flexShrink: 0
    }}>
      {info.logo(logoSize)}
    </div>
  );
}
