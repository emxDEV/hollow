import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/hollowDb';
import { supabase } from '../../db/supabaseClient';
import { APP_VERSION } from '../../utils/version';
import {
  User, Settings, CreditCard, ChevronRight, Bell,
  Moon, Layers, Wifi, WifiOff, Plus, Trash2, Edit2, X, Check,
  HelpCircle, ClipboardCheck, Info, LogOut, Activity, Dumbbell, Users, TrendingUp, DollarSign
} from 'lucide-react';

export default function ProfileView({ selectedAccountId, setSelectedAccountId, accounts, addToast, onNavigate, onScrollChange }) {
  const [enableClouds, setEnableClouds] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profile, setProfile] = useState({
    displayName: localStorage.getItem('hollowDisplayName') || 'Unnamed Trader',
    traderTitle: localStorage.getItem('hollowTraderTitle') || 'Trader · Hollow',
    timezone: localStorage.getItem('hollowTimezone') || 'Europe/London',
    tradingStyle: localStorage.getItem('hollowTradingStyle') || 'Day Trader',
    bio: localStorage.getItem('hollowBio') || '',
    primaryMarket: localStorage.getItem('hollowPrimaryMarket') || 'Futures'
  });
  const [userEmail, setUserEmail] = useState('');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(localStorage.getItem('hollowEnableAutoBackup') !== 'false');

  const handleToggleAutoBackup = async (enabled) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('hollowEnableAutoBackup', enabled ? 'true' : 'false');
    try {
      await supabase.auth.updateUser({
        data: { enableAutoBackup: enabled }
      });
    } catch (err) {
      console.error('Failed to sync auto-backup setting:', err);
    }
    addToast(enabled ? 'Auto-backup enabled.' : 'Auto-backup disabled.', 'success');
  };

  const handleManualBackup = async () => {
    addToast('Generating backup...', 'success');
    try {
      const [accs, trds, execs, jrns, plns, grps, wrkts] = await Promise.all([
        db.accounts.toArray(),
        db.trades.toArray(),
        db.executions.toArray(),
        db.dailyJournals.toArray(),
        db.weeklyPlanners.toArray(),
        db.groups.toArray(),
        db.workouts ? db.workouts.toArray() : []
      ]);
      const { exportAllDataBackupPDF } = await import('../../utils/pdfExport');
      const doc = exportAllDataBackupPDF(accs, trds, execs, jrns, plns, grps, wrkts);
      const filename = `hollow_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`;
      doc.save(filename);
      addToast('Backup downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Backup failed.', 'error');
    }
  };

  // Form states for the bottom sheet
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMarket, setEditMarket] = useState('Futures');
  const [editStyle, setEditStyle] = useState('Day Trader');
  const [editTimezone, setEditTimezone] = useState('Europe/London');
  const [editBio, setEditBio] = useState('');

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setIsScrolled(scrollTop > 10);
    if (onScrollChange) {
      onScrollChange(scrollTop);
    }
  };

  const loadProfile = () => {
    setProfile({
      displayName: localStorage.getItem('hollowDisplayName') || 'Unnamed Trader',
      traderTitle: localStorage.getItem('hollowTraderTitle') || 'Trader · Hollow',
      timezone: localStorage.getItem('hollowTimezone') || 'Europe/London',
      tradingStyle: localStorage.getItem('hollowTradingStyle') || 'Day Trader',
      bio: localStorage.getItem('hollowBio') || '',
      primaryMarket: localStorage.getItem('hollowPrimaryMarket') || 'Futures'
    });
  };

  useEffect(() => {
    setEnableClouds(localStorage.getItem('hollowEnableClouds') !== 'false');
    loadProfile();
    
    // Fetch email from Supabase Auth
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email);
        }
      } catch (err) {
        console.error('Failed to fetch user email:', err);
      }
    }
    fetchUser();

    window.addEventListener('hollowSettingsUpdated', loadProfile);
    return () => {
      window.removeEventListener('hollowSettingsUpdated', loadProfile);
    };
  }, []);

  const handleSaveProfile = async () => {
    localStorage.setItem('hollowDisplayName', editName.trim() || 'Unnamed Trader');
    localStorage.setItem('hollowUsername', editName.trim() || 'Unnamed Trader');
    localStorage.setItem('hollowTraderTitle', editTitle.trim() || 'Trader · Hollow');
    localStorage.setItem('hollowPrimaryMarket', editMarket);
    localStorage.setItem('hollowTradingStyle', editStyle);
    localStorage.setItem('hollowTimezone', editTimezone);
    localStorage.setItem('hollowBio', editBio.trim());
    
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
    
    try {
      await supabase.auth.updateUser({
        data: {
          displayName: editName.trim() || 'Unnamed Trader',
          traderTitle: editTitle.trim() || 'Trader · Hollow',
          primaryMarket: editMarket,
          tradingStyle: editStyle,
          timezone: editTimezone,
          bio: editBio.trim()
        }
      });
    } catch (err) {
      console.error('Failed to sync profile changes to Supabase Auth:', err);
    }
    
    addToast('Profile updated successfully!', 'success');
    setShowEditProfile(false);
  };

  const toggleClouds = async () => {
    const next = !enableClouds;
    setEnableClouds(next);
    localStorage.setItem('hollowEnableClouds', String(next));
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
    try {
      await supabase.auth.updateUser({
        data: { enableClouds: next }
      });
    } catch (err) {
      console.error('Failed to sync cloud backdrop setting:', err);
    }
  };

  const Toggle = ({ value, onToggle }) => (
    <div
      onClick={onToggle}
      style={{
        width: 51,
        height: 31,
        borderRadius: 100,
        background: value ? '#30d158' : '#3a3a3c',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s',
        flexShrink: 0
      }}
    >
      <div style={{
        position: 'absolute',
        width: 27,
        height: 27,
        top: 2,
        left: value ? 22 : 2,
        background: 'white',
        borderRadius: '50%',
        transition: 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
      }} />
    </div>
  );

  const SectionHeader = ({ title }) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '20px 16px 8px' }}>
      {title}
    </div>
  );

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        background: isScrolled
          ? 'linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.98) 40%, rgba(0, 0, 0, 0.85) 70%, rgba(0, 0, 0, 0) 100%)'
          : 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#fff',
          margin: 0,
          opacity: isScrolled ? 0 : 1,
          transform: isScrolled ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isScrolled ? 'none' : 'auto'
        }}>
          profile.
        </h1>
      </div>

      <div 
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          WebkitOverflowScrolling: 'touch', 
          paddingTop: 'calc(var(--safe-top) + 80px)',
          paddingBottom: 'calc(64px + var(--safe-bottom) + 24px)'
        }}
      >

        {/* User card */}
        <div style={{ padding: '0 16px', marginBottom: 4 }}>
          <div style={{
            background: '#0f0f11',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '20px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0a84ff, #bf5af2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: '#fff',
                textTransform: 'uppercase',
                flexShrink: 0
              }}>
                {(profile.displayName ? profile.displayName.trim().charAt(0) : 'H').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                  {profile.displayName}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                  {profile.traderTitle}
                </div>
                {userEmail && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                    {userEmail}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 6 }}>
                  <span>{profile.tradingStyle}</span>
                  <span>·</span>
                  <span>{profile.primaryMarket}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setEditName(profile.displayName);
                setEditTitle(profile.traderTitle);
                setEditMarket(profile.primaryMarket);
                setEditStyle(profile.tradingStyle);
                setEditTimezone(profile.timezone);
                setEditBio(profile.bio);
                setShowEditProfile(true);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                outline: 'none',
                flexShrink: 0
              }}
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>

        {/* Trading Suite Sub-navigation */}
        <SectionHeader title="Trading Suite" />
        <div style={{ margin: '0 16px 16px', background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {[
            { label: 'Trading Accounts', desc: 'Manage, select, and edit your trading accounts', icon: CreditCard, view: 'accounts' },
            { label: 'Performance Stats', desc: 'Detailed playbook edge, discipline, and session statistics', icon: TrendingUp, view: 'stats' },
            { label: 'Payout Tracker', desc: 'Track payouts from prop firms and accounts', icon: DollarSign, view: 'payouts' },
            { label: 'Weekly Review', desc: 'Stoic weekly review audit board', icon: ClipboardCheck, view: 'weeklyReview' },
            { label: 'Training Journal', desc: 'Workout log, reps, weight, volume curves', icon: Dumbbell, view: 'trainingJournal' },
            { label: 'Copy Groups', desc: 'Mirror leader trades to follower accounts', icon: Users, view: 'groups' }
          ].map((item, idx, arr) => (
            <div
              key={item.label}
              onClick={() => onNavigate && onNavigate(item.view)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                gap: 12,
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <item.icon size={16} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
            </div>
          ))}
        </div>

        {/* App Settings */}
        <SectionHeader title="Appearance" />
        <div style={{ margin: '0 16px', background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {[
            { label: 'Cloud Backdrop', sub: 'Ambient blur clouds', value: enableClouds, onToggle: toggleClouds },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.sub}</div>
              </div>
              <Toggle value={item.value} onToggle={item.onToggle} />
            </div>
          ))}
        </div>

        {/* About */}
        <SectionHeader title="About" />
        <div style={{ margin: '0 16px', background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {[
            { label: 'Version', value: APP_VERSION },
            { label: 'Database', value: 'IndexedDB + Supabase' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
            }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Sunday Backup */}
        <SectionHeader title="Automated Sunday Backup" />
        <div style={{ margin: '0 16px 16px', background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            gap: 12
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Enable Weekly Auto-Backup</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>Triggers automatically when you open the app on Sunday. Saves complete PDF ledger to device.</div>
            </div>
            <Toggle value={autoBackupEnabled} onToggle={() => handleToggleAutoBackup(!autoBackupEnabled)} />
          </div>
          
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
              Manually download a complete portable data document (PDF) representing all accounts, journals, trades, and workouts instantly.
            </div>
            <button
              onClick={handleManualBackup}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                marginTop: 4
              }}
            >
              Generate Backup Now
            </button>
          </div>
        </div>


        {/* Account Operations */}
        <SectionHeader title="Account" />
        <div style={{ margin: '0 16px', background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <button
            onClick={async () => {
              if (window.confirm('Sign out of your Hollow account? Offline cache will be cleared.')) {
                const { supabase } = await import('../../db/supabaseClient');
                await supabase.auth.signOut();
              }
            }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '14px 16px',
              color: '#ff453a',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              outline: 'none'
            }}
          >
            <span>Sign Out</span>
            <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
          </button>
          <button
            onClick={async () => {
              if (window.confirm('WARNING: Are you sure you want to delete your profile account and permanently wipe all data? This will erase all local and cloud data. This action cannot be undone.')) {
                const { clearDatabaseAndCloud } = await import('../../db/hollowDb');
                const { supabase } = await import('../../db/supabaseClient');
                await clearDatabaseAndCloud();
                await supabase.auth.signOut();
              }
            }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '14px 16px',
              color: '#ff453a',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              outline: 'none',
              borderTop: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <span>Delete Account & Data</span>
            <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
          </button>
        </div>

        {/* Brand footer */}
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.02em' }}>hollow.</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>stoic trading journal</div>
        </div>
      </div>

      {/* Edit Profile Bottom Sheet */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditProfile(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 1500,
              display: 'flex',
              alignItems: 'flex-end'
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                background: '#0f0f11',
                borderRadius: '24px 24px 0 0',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                paddingBottom: 'calc(var(--safe-bottom) + 16px)',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 16px', flexShrink: 0 }} />
              
              {/* Header */}
              <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Edit Profile</span>
                <button 
                  onClick={() => setShowEditProfile(false)} 
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Display Name */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Display Name</div>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="e.g. Max Trader"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: 15,
                      padding: '12px 14px',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  />
                </div>

                {/* Trader Title */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Trader Title</div>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="e.g. Prop Trader · Futures Specialist"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: 15,
                      padding: '12px 14px',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  />
                </div>

                {/* Primary Market */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Primary Market</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Futures', 'Forex', 'Equities', 'Crypto', 'Options'].map(market => {
                      const isActive = editMarket === market;
                      return (
                        <button
                          key={market}
                          onClick={() => setEditMarket(market)}
                          style={{
                            background: isActive ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: isActive ? '1px solid #0a84ff' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 20,
                            padding: '8px 14px',
                            color: isActive ? '#0a84ff' : 'rgba(255,255,255,0.5)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                        >
                          {market}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trading Style */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Trading Style</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Scalper', 'Day Trader', 'Swing Trader', 'Position Trader'].map(style => {
                      const isActive = editStyle === style;
                      return (
                        <button
                          key={style}
                          onClick={() => setEditStyle(style)}
                          style={{
                            background: isActive ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: isActive ? '1px solid #bf5af2' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 20,
                            padding: '8px 14px',
                            color: isActive ? '#bf5af2' : 'rgba(255,255,255,0.5)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Timezone</div>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={editTimezone}
                      onChange={e => setEditTimezone(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        color: '#fff',
                        fontFamily: 'var(--font)',
                        fontSize: 15,
                        padding: '12px 14px',
                        outline: 'none',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        backgroundSize: '16px'
                      }}
                    >
                      {[
                        { value: 'America/New_York', label: 'Eastern Time (ET)' },
                        { value: 'America/Chicago', label: 'Central Time (CT)' },
                        { value: 'America/Denver', label: 'Mountain Time (MT)' },
                        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                        { value: 'Europe/London', label: 'London (GMT/BST)' },
                        { value: 'Europe/Berlin', label: 'Central Europe (CET)' },
                        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
                        { value: 'Australia/Sydney', label: 'Sydney (AEDT)' }
                      ].map(tz => (
                        <option key={tz.value} value={tz.value} style={{ background: '#1c1c1e', color: '#fff' }}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Short Bio */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Short Bio</div>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    placeholder="A few words about your trading approach..."
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: 15,
                      padding: '12px 14px',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                      resize: 'none',
                      lineHeight: 1.5
                    }}
                  />
                </div>
              </div>

              {/* Save Button Container */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <button
                  onClick={handleSaveProfile}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #0a84ff 0%, #0a84ffd0 100%)',
                    border: 'none',
                    borderRadius: 14,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                    boxShadow: '0 4px 20px rgba(10, 132, 255, 0.25)',
                    outline: 'none'
                  }}
                >
                  Save Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
