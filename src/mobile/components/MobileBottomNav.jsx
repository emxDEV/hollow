import React from 'react';
import { Home, BookOpen, User } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User }
];

export default function MobileBottomNav({ activeTab, onTabChange, visible = true }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(var(--safe-bottom) + 4px)',
      left: '16px',
      right: '16px',
      zIndex: 100,
      height: '64px',
      background: 'rgba(20, 20, 22, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: '32px',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.95)',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
    }}>
      {TABS.map((tab) => {
        return (
          <div
            key={tab.id}
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                background: activeTab === tab.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 10px',
                minWidth: '50px',
                height: '46px',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#ffffff' : 'rgba(255,255,255,0.4)',
                transition: 'background 0.2s, color 0.2s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {React.createElement(tab.icon, { size: 20, strokeWidth: activeTab === tab.id ? 2.2 : 1.8 })}
              <span style={{
                fontSize: 10,
                fontWeight: activeTab === tab.id ? 600 : 500,
                letterSpacing: '-0.01em',
                fontFamily: 'var(--font)'
              }}>
                {tab.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
