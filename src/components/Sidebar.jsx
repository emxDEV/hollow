import React from 'react';
import { 
  LayoutDashboard, 
  BarChart2,
  Calendar,
  BookOpen, 
  ClipboardCheck, 
  Settings,
  HelpCircle,
  Plus,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import HollowLogo from './HollowLogo';
import { useUIStore } from '../store/useUIStore';

export default function Sidebar({
  activeView,
  setActiveView,
  sidebarCollapsed = false,
  setSidebarCollapsed,
  isMobile = false,
  onClose
}) {
  const setIsAddExecutionOpen = useUIStore(state => state.setIsAddExecutionOpen);

  const handleTabClick = (viewId) => {
    setActiveView(viewId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const navSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
      ]
    },
    {
      title: 'JOURNALING',
      items: [
        { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
        { id: 'journal', label: 'Daily Journal', icon: <BookOpen size={18} /> },
        { id: 'weeklyReview', label: 'Weekly Review', icon: <ClipboardCheck size={18} /> },
      ]
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
        { id: 'help', label: 'Help & Support', icon: <HelpCircle size={18} /> },
      ]
    }
  ];

  const displayName = localStorage.getItem('hollowDisplayName') || localStorage.getItem('hollowUsername') || 'Trader';
  const traderTitle = localStorage.getItem('hollowTraderTitle') || 'Pro Trader';

  return (
    <motion.div 
      animate={{ width: sidebarCollapsed ? '80px' : '260px' }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        flexShrink: 0,
        background: '#09090b',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0 16px 0',
        zIndex: 10,
        position: 'relative',
        userSelect: 'none'
      }}
    >
      
      {/* BRAND HEADER */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: sidebarCollapsed ? '0 16px' : '0 18px',
        marginBottom: '20px',
        height: '44px',
        position: 'relative'
      }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isMobile ? 'default' : 'pointer' }}
          onClick={() => !isMobile && setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
        >
          <HollowLogo
            size={38}
            showText={!sidebarCollapsed}
            color="#ffffff"
          />
        </div>
        
        <button 
          onClick={() => setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
          style={{ 
            color: 'rgba(255,255,255,0.4)', 
            background: 'transparent',
            border: 'none',
            fontSize: '16px', 
            cursor: 'pointer', 
            display: isMobile ? 'none' : 'flex', 
            alignItems: 'center',
            fontWeight: '600',
            outline: 'none',
            transition: 'all 0.2s',
            transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            padding: '4px 6px',
            borderRadius: '6px'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          «
        </button>
      </div>

      {/* ACTION BUTTON: ADD EXECUTION */}
      <div style={{ padding: '0 14px 18px 14px' }}>
        <button
          onClick={() => {
            setIsAddExecutionOpen(true);
            if (isMobile && onClose) onClose();
          }}
          style={{
            width: '100%',
            padding: sidebarCollapsed ? '10px 0' : '11px 14px',
            background: 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(138, 48, 246, 0.35)',
            transition: 'transform 0.15s, boxShadow 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Track New Execution"
        >
          <Plus size={16} strokeWidth={2.5} />
          {!sidebarCollapsed && <span>Add Execution</span>}
        </button>
      </div>

      {/* STRUCTURED NAVIGATION CATEGORIES */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        padding: '0 10px',
        gap: '20px'
      }}>
        {navSections.map((section, sectionIdx) => (
          <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            
            {/* Section Header Label */}
            {!sidebarCollapsed && (
              <div style={{
                fontSize: '10px',
                fontWeight: '800',
                color: 'rgba(255, 255, 255, 0.3)',
                letterSpacing: '0.8px',
                padding: '4px 12px 6px 12px',
                textTransform: 'uppercase'
              }}>
                {section.title}
              </div>
            )}

            {/* Section Items */}
            {section.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'help') {
                      alert('Hollow Trading Platform Support & Documentation');
                    } else {
                      handleTabClick(item.id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    width: '100%',
                    padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                    borderRadius: '10px',
                    border: isActive ? '1px solid rgba(184, 110, 255, 0.25)' : '1px solid transparent',
                    background: isActive ? 'rgba(184, 110, 255, 0.12)' : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontWeight: isActive ? '700' : '500',
                    fontSize: '13px',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    position: 'relative',
                    gap: sidebarCollapsed ? '0' : '12px'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                    }
                  }}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  {/* Left Purple Accent Bar for Active Item */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: '-10px',
                      top: '6px',
                      bottom: '6px',
                      width: '3.5px',
                      background: '#b86eff',
                      borderRadius: '0 4px 4px 0',
                      boxShadow: '0 0 10px rgba(184, 110, 255, 0.8)'
                    }} />
                  )}

                  <span style={{ color: isActive ? '#b86eff' : 'inherit', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  
                  {!sidebarCollapsed && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* FOOTER TRADER PROFILE CARD */}
      <div style={{ padding: '12px 10px 0 10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: 'auto' }}>
        <div 
          onClick={() => handleTabClick('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: sidebarCollapsed ? '8px 0' : '8px 10px',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
          title="Trader Profile & Settings"
        >
          {/* Avatar Circle with Online Dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(184, 110, 255, 0.3) 0%, rgba(138, 48, 246, 0.5) 100%)',
              border: '1px solid rgba(184, 110, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#30d158',
              border: '2px solid #09090b'
            }} />
          </div>

          {!sidebarCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {traderTitle}
              </span>
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
}
