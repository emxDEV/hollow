import React from 'react';
import { Home, Wallet, PlusCircle, MessageSquare, User } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'add', label: 'Add', icon: PlusCircle },
  { id: 'support', label: 'Support', icon: MessageSquare },
  { id: 'profile', label: 'Profile', icon: User }
];

export default function MobileBottomNav({ activeTab, onTabChange, visible = true }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      paddingTop: '8px',
      background: 'rgba(9, 9, 11, 0.92)',
      backdropFilter: 'blur(24px) saturate(190%)',
      WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.6)',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              background: 'transparent',
              border: 'none',
              padding: '6px 4px',
              minWidth: '54px',
              cursor: 'pointer',
              color: isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.4)',
              transition: 'color 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: isActive ? 'drop-shadow(0 0 8px rgba(184, 110, 255, 0.5))' : 'none',
              transition: 'filter 0.2s ease',
            }}>
              <IconComponent
                size={22}
                strokeWidth={isActive ? 2.3 : 1.8}
                color={isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.4)'}
              />
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '-0.01em',
              fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
              color: isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.4)',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
