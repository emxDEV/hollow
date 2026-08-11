import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../db/supabaseClient';
import {
  User,
  ScanFace,
  Bell,
  LogOut,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

function PurpleToggle({ checked, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: '51px',
        height: '31px',
        borderRadius: '999px',
        background: checked
          ? 'linear-gradient(135deg, #b86eff, #7c3aed)'
          : 'rgba(255, 255, 255, 0.12)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s ease, box-shadow 0.25s ease',
        boxShadow: checked ? '0 0 12px rgba(184, 110, 255, 0.45)' : 'none',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        width: '27px',
        height: '27px',
        top: '2px',
        left: checked ? '22px' : '2px',
        background: '#ffffff',
        borderRadius: '50%',
        transition: 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
      }} />
    </div>
  );
}

export default function ProfileView({ addToast, onScrollChange, onOpenWeeklyReview }) {
  const [displayName, setDisplayName] = useState(localStorage.getItem('hollowDisplayName') || 'Emanuel Maxim');
  const [userEmail, setUserEmail] = useState('maxim.emanuel@icloud.com');
  const [requireFaceId, setRequireFaceId] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'accountInfo' | 'editProfile'

  const [editName, setEditName] = useState(displayName);
  const [editEmail, setEditEmail] = useState(userEmail);

  useEffect(() => {
    async function fetchUser() {
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.email) {
            setUserEmail(user.email);
            setEditEmail(user.email);
          }
          if (user.user_metadata?.displayName) {
            setDisplayName(user.user_metadata.displayName);
            setEditName(user.user_metadata.displayName);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    }
    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    const trimmed = editName.trim() || 'Emanuel Maxim';
    setDisplayName(trimmed);
    localStorage.setItem('hollowDisplayName', trimmed);
    localStorage.setItem('hollowUsername', trimmed);
    window.dispatchEvent(new Event('hollowSettingsUpdated'));

    if (supabase) {
      try {
        await supabase.auth.updateUser({ data: { displayName: trimmed } });
      } catch (err) {
        console.error('Failed to update user profile in cloud:', err);
      }
    }

    addToast('Profile updated successfully!', 'success');
    setActiveModal(null);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      if (supabase) {
        try { await supabase.auth.signOut(); } catch (_) {}
      }
      localStorage.clear();
      window.location.reload();
    }
  };

  const font = "var(--font, 'Inter', -apple-system, sans-serif)";

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#000000',
      color: '#ffffff',
      fontFamily: font,
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── STICKY BLURRY HEADER ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '14px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: '0 0 1px 0',
          color: '#ffffff',
        }}>
          Settings
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400 }}>
          Account &amp; preferences
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        onScroll={(e) => onScrollChange && onScrollChange(e.target.scrollTop)}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '20px 16px',
          paddingBottom: 'calc(var(--safe-bottom, 34px) + 96px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >

        {/* ── USER ROW ── */}
        <div
          onClick={() => setActiveModal('editProfile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed 0%, #b86eff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 800,
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(184, 110, 255, 0.35)',
          }}>
            {(displayName ? displayName.trim().charAt(0) : 'E').toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', marginBottom: '2px' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
          </div>

          <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
        </div>

        {/* ── ACCOUNT SETTINGS ── */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'rgba(255, 255, 255, 0.4)',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingLeft: '2px',
          }}>
            Account Settings
          </div>

          <div style={{
            background: '#09090b',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            <div
              onClick={() => setActiveModal('accountInfo')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px 18px',
                gap: '14px',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'flex' }}>
                <User size={18} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                  Account information
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                  Membership · Currency · Sync status
                </div>
              </div>
              <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
            </div>
          </div>
        </div>

        {/* ── PREFERENCES ── */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'rgba(255, 255, 255, 0.4)',
            textTransform: 'uppercase',
            marginBottom: '8px',
            paddingLeft: '2px',
          }}>
            Preferences
          </div>

          <div style={{
            background: '#09090b',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            {/* Face ID */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'flex' }}>
                  <ScanFace size={18} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                    Require Face ID
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    Lock the app with Face ID
                  </div>
                </div>
              </div>
              <PurpleToggle
                checked={requireFaceId}
                onChange={() => {
                  const next = !requireFaceId;
                  setRequireFaceId(next);
                  addToast(next ? 'Face ID requirement enabled' : 'Face ID requirement disabled', 'info');
                }}
              />
            </div>

            {/* Push Notifications */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 18px',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'flex' }}>
                  <Bell size={18} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                    Push Notifications
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {pushNotifications ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              <PurpleToggle
                checked={pushNotifications}
                onChange={() => {
                  const next = !pushNotifications;
                  setPushNotifications(next);
                  addToast(next ? 'Notifications enabled' : 'Notifications disabled', 'info');
                }}
              />
            </div>
          </div>
        </div>

        {/* ── LOG OUT ── */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            borderRadius: '18px',
            padding: '16px',
            fontSize: '15px',
            fontWeight: 700,
            color: '#ff453a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            outline: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          <LogOut size={17} strokeWidth={2.4} />
          <span>Log out</span>
        </button>

        {/* ── APP VERSION ── */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255, 255, 255, 0.2)', paddingBottom: '8px' }}>
          Hollow · v91 · © 2025 Hollow Trading
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
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
                maxWidth: '500px',
                background: '#0f0f11',
                borderRadius: '24px 24px 0 0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderBottom: 'none',
                paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: '36px', height: '4px', background: 'rgba(255, 255, 255, 0.25)', borderRadius: '2px', margin: '12px auto 14px' }} />

              <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {activeModal === 'editProfile' && 'Edit Profile'}
                  {activeModal === 'accountInfo' && 'Account Information'}
                </span>
                <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: 0 }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>

                {/* Edit Profile */}
                {activeModal === 'editProfile' && (
                  <>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Display Name</div>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          color: '#fff',
                          fontSize: '15px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Email Address</div>
                      <input
                        value={userEmail}
                        disabled
                        style={{
                          width: '100%',
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontSize: '15px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #b86eff)',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '14px',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#fff',
                        cursor: 'pointer',
                        marginTop: '6px',
                      }}
                    >
                      Save Profile
                    </button>
                  </>
                )}

                {/* Account Info */}
                {activeModal === 'accountInfo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Membership Tier', value: 'Hollow Pro Ledger (Lifetime)', accent: '#d8b4fe' },
                      { label: 'Default Currency', value: 'USD ($)', accent: '#ffffff' },
                      { label: 'Cloud Sync State', value: 'Connected & Synced', accent: '#30d158' },
                    ].map((row, i) => (
                      <div key={i} style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                          {row.label}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: row.accent }}>
                          {row.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
