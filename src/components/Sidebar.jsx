import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Plus, 
  ClipboardCheck, 
  LineChart, 
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Dumbbell
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({
  activeView,
  setActiveView,
  accounts,
  selectedAccountId,
  setSelectedAccountId,
  sidebarCollapsed = false,
  setSidebarCollapsed,
  onAddTradeClick,
  isMobile = false,
  onClose
}) {

  const handleTabClick = (viewId) => {
    setActiveView(viewId);
    if (isMobile && onClose) {
      onClose();
    }
  };


  // Financials navigation
  const financialsMenuItems = [
    { id: 'dashboard', label: 'dashboard.', icon: <LayoutDashboard size={18} /> },
    { id: 'stats', label: 'performance stats.', icon: <LineChart size={18} /> },
    { id: 'weeklyReview', label: 'weekly review.', icon: <ClipboardCheck size={18} /> },
    { id: 'groups', label: 'groups.', icon: <Users size={18} /> }
  ];

  // Fitness navigation
  const fitnessMenuItems = [
    { id: 'journal', label: 'daily journal.', icon: <BookOpen size={18} /> },
    { id: 'trainingJournal', label: 'training journal.', icon: <Dumbbell size={18} /> }
  ];



  const labelTransitionStyle = {
    whiteSpace: 'nowrap',
    overflow: 'hidden'
  };

  return (
    <motion.div 
      animate={{ width: sidebarCollapsed ? '80px' : '260px' }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        flexShrink: 0,
        background: 'rgba(10, 10, 12, 0.45)',
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        zIndex: 10,
        position: 'relative'
      }}
    >
      
      {/* BRAND HEADER: Star/Cross Logo, Text, and Collapse Arrow */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 20px',
        marginBottom: '16px',
        height: '36px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Minimalist Circular Brand Logo */}
          <svg 
            key={sidebarCollapsed ? 'collapsed' : 'expanded'}
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0, cursor: isMobile ? 'default' : 'pointer' }}
            onClick={() => !isMobile && setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
          >
            <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2.5" />
          </svg>
          
          <motion.span 
            animate={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 'auto' }}
            transition={{ duration: 0.15 }}
            style={{ 
              fontFamily: 'var(--font-logo)', 
              fontWeight: '800', 
              fontSize: '22px', 
              letterSpacing: '0.5px', 
              textTransform: 'lowercase',
              color: '#fff',
              lineHeight: 1,
              ...labelTransitionStyle
            }}
          >
            hollow.
          </motion.span>
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
            transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            padding: '4px',
            position: sidebarCollapsed ? 'absolute' : 'relative',
            right: sidebarCollapsed ? '16px' : '0'
          }}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          «
        </button>
      </div>

      {/* ADD TRADE PREMIUM BUTTON */}
      <div style={{ padding: sidebarCollapsed ? '8px 10px' : '8px 20px', marginBottom: '8px' }}>
        {sidebarCollapsed ? (
          <button 
            onClick={onAddTradeClick}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
              margin: '0 auto',
              outline: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f2f2f7'}
            onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
            title="add trade."
          >
            <Plus size={20} />
          </button>
        ) : (
          <button 
            onClick={onAddTradeClick}
            style={{
              width: '100%',
              background: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 16px',
              color: '#000000',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'var(--font-heading)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f2f2f7';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <Plus size={14} />
            <span>add trade.</span>
          </button>
        )}
      </div>

      {/* CORE NAVIGATION */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        
        {/* Financials Category */}
        {!sidebarCollapsed && (
          <div style={{
            fontSize: '9px',
            fontWeight: '800',
            color: 'var(--colors-stone)',
            textTransform: 'lowercase',
            letterSpacing: '1.5px',
            padding: '12px 20px 6px 20px',
            opacity: 0.45,
            fontFamily: 'var(--font-heading)'
          }}>
            financials.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
          {financialsMenuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  padding: sidebarCollapsed ? '12px 0' : '12px 20px',
                  border: 'none',
                  background: isActive ? '#1c1c1e' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '14px',
                  transition: 'all var(--transition-fast)',
                  outline: 'none',
                  position: 'relative',
                  gap: sidebarCollapsed ? '0' : '12px'
                }}
              >
                <span style={{ color: isActive ? '#fff' : 'inherit', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
                <motion.span 
                  animate={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 'auto', marginLeft: sidebarCollapsed ? 0 : 12 }}
                  transition={{ duration: 0.15 }}
                  style={labelTransitionStyle}
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </div>

        {/* Fitness Category */}
        {!sidebarCollapsed && (
          <div style={{
            fontSize: '9px',
            fontWeight: '800',
            color: 'var(--colors-stone)',
            textTransform: 'lowercase',
            letterSpacing: '1.5px',
            padding: '12px 20px 6px 20px',
            opacity: 0.45,
            fontFamily: 'var(--font-heading)'
          }}>
            fitness.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {fitnessMenuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  padding: sidebarCollapsed ? '12px 0' : '12px 20px',
                  border: 'none',
                  background: isActive ? '#1c1c1e' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '14px',
                  transition: 'all var(--transition-fast)',
                  outline: 'none',
                  position: 'relative',
                  gap: sidebarCollapsed ? '0' : '12px'
                }}
              >
                <span style={{ color: isActive ? '#fff' : 'inherit', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
                <motion.span 
                  animate={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 'auto', marginLeft: sidebarCollapsed ? 0 : 12 }}
                  transition={{ duration: 0.15 }}
                  style={labelTransitionStyle}
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </div>

        {/* MID-DIVIDER LINE */}
        <div style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          margin: sidebarCollapsed ? '20px 10px' : '20px 20px'
        }} />

        {/* SETTINGS & HELP OPTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => handleTabClick('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: sidebarCollapsed ? '12px 0' : '12px 20px',
              border: 'none',
              background: activeView === 'settings' ? '#1c1c1e' : 'transparent',
              color: activeView === 'settings' ? '#fff' : 'rgba(255, 255, 255, 0.45)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: activeView === 'settings' ? '600' : '500',
              fontSize: '14px',
              gap: sidebarCollapsed ? '0' : '12px',
              outline: 'none',
              position: 'relative'
            }}
            title={sidebarCollapsed ? 'Settings' : ''}
          >
            <Settings size={18} style={{ color: activeView === 'settings' ? '#fff' : 'inherit' }} />
            <motion.span 
              animate={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 'auto', marginLeft: sidebarCollapsed ? 0 : 12 }}
              transition={{ duration: 0.15 }}
              style={labelTransitionStyle}
            >
              settings.
            </motion.span>
          </button>

          <button
            onClick={() => alert('Help & Support center')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              width: '100%',
              padding: sidebarCollapsed ? '12px 0' : '12px 20px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.45)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: '500',
              fontSize: '14px',
              gap: sidebarCollapsed ? '0' : '12px',
              outline: 'none'
            }}
            title={sidebarCollapsed ? 'Help & Support' : ''}
          >
            <HelpCircle size={18} />
            <motion.span 
              animate={{ opacity: sidebarCollapsed ? 0 : 1, width: sidebarCollapsed ? 0 : 'auto', marginLeft: sidebarCollapsed ? 0 : 12 }}
              transition={{ duration: 0.15 }}
              style={labelTransitionStyle}
            >
              help & support.
            </motion.span>
          </button>
        </div>

      </div>


    </motion.div>
  );
}
