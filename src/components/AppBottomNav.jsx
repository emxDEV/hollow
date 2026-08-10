import React from 'react';
import { LayoutDashboard, BarChart2, Calendar, BookOpen, ClipboardCheck, Settings, Plus } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

const TABS = [
  { id: 'dashboard',    label: 'Home',     icon: LayoutDashboard },
  { id: 'analytics',   label: 'Analytics',icon: BarChart2 },
  { id: 'journal',     label: 'Journal',  icon: BookOpen },
  { id: 'settings',    label: 'Settings', icon: Settings },
];

export default function AppBottomNav() {
  const view = useUIStore(s => s.view);
  const setView = useUIStore(s => s.setView);
  const setIsAddExecutionOpen = useUIStore(s => s.setIsAddExecutionOpen);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      height: 'calc(60px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'rgba(9, 9, 11, 0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.07)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 4px',
      boxSizing: 'border-box',
    }}>
      {/* First 2 tabs */}
      {TABS.slice(0, 2).map(tab => {
        const isActive = view === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#b86eff' : 'rgba(255,255,255,0.4)',
              padding: '8px 0',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.15s ease',
              outline: 'none',
            }}
          >
            <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '-0.01em', fontFamily: 'var(--font-body)' }}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Center + Add Execution FAB */}
      <button
        onClick={() => setIsAddExecutionOpen(true)}
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
          boxShadow: '0 4px 20px rgba(138, 48, 246, 0.5)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          transform: 'translateY(-6px)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(0.95)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1)'; }}
        onTouchStart={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(0.95)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1)'; }}
        title="Add Execution"
      >
        <Plus size={24} strokeWidth={2.5} color="#fff" />
      </button>

      {/* Last 3 tabs */}
      {TABS.slice(2).map(tab => {
        const isActive = view === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#b86eff' : 'rgba(255,255,255,0.4)',
              padding: '8px 0',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.15s ease',
              outline: 'none',
            }}
          >
            <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '-0.01em', fontFamily: 'var(--font-body)' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
