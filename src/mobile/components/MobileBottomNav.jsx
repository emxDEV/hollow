import React from 'react';
import { LayoutDashboard, BarChart2, Plus, BookOpen, Settings } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'add', label: '', icon: Plus, isAction: true },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function MobileBottomNav({ activeTab, onTabChange, onAddClick, visible = true }) {
  return (
    <div style={{
      flexShrink: 0,
      width: '100%',
      zIndex: 200,
      paddingBottom: '0px',
      paddingTop: '10px',
      background: 'rgba(9, 9, 11, 0.97)',
      backdropFilter: 'blur(24px) saturate(190%)',
      WebkitBackdropFilter: 'blur(24px) saturate(190%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.7)',
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
                width: '48px',
                height: '48px',
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
                transform: 'translateY(-6px)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onTouchStart={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(0.95)'; }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1)'; }}
              title="Add Execution"
            >
              <Plus size={24} strokeWidth={2.5} color="#ffffff" />
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
              gap: 3,
              background: 'transparent',
              border: 'none',
              padding: '4px 2px 6px',
              minWidth: '50px',
              cursor: 'pointer',
              color: isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.45)',
              transition: 'color 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: isActive ? 'drop-shadow(0 0 8px rgba(184, 110, 255, 0.6))' : 'none',
              transition: 'filter 0.2s ease',
            }}>
              <IconComponent
                size={21}
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
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
