import React from 'react';
import { LayoutDashboard, BarChart2, Plus, BookOpen, Settings } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'add', label: '', icon: Plus, isAction: true },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function MobileBottomNav({ activeTab, onTabChange, onAddClick }) {
  return (
    <div style={{
      width: '100%',
      zIndex: 200,
      // Increased padding to position bar at absolute bottom with safe-area notch space
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingTop: '8px',
      background: 'rgba(9, 9, 11, 0.98)',
      backdropFilter: 'blur(28px) saturate(190%)',
      WebkitBackdropFilter: 'blur(28px) saturate(190%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.7)',
      touchAction: 'none', // Prevents gestures on the bar from scrolling the page
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        if (tab.isAction) {
          return (
            <button
              key={tab.id}
              onClick={() => onAddClick ? onAddClick() : onTabChange('add')}
              style={{
                flexShrink: 0,
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(138, 48, 246, 0.55), 0 0 12px rgba(184, 110, 255, 0.4)',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                transform: 'translateY(-8px)', // Raised action button
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onTouchStart={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(0.95)'; }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1)'; }}
              onTouchCancel={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1)'; }}
            >
              <Plus size={26} strokeWidth={2.5} color="#ffffff" />
            </button>
          );
        }

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
              gap: '4px',
              background: 'transparent',
              border: 'none',
              padding: '6px 2px 2px',
              minWidth: '50px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: isActive ? 'drop-shadow(0 0 8px rgba(184, 110, 255, 0.6))' : 'none',
              transition: 'all 0.2s ease',
            }}>
              <IconComponent
                size={22}
                strokeWidth={isActive ? 2.3 : 1.8}
                color={isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.45)'}
              />
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '-0.01em',
              fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
              color: isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.45)',
              transition: 'color 0.2s ease',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}