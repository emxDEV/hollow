import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../db/supabaseClient';
import {
  User,
  Key,
  Layers,
  PlusCircle,
  Share2,
  Megaphone,
  ScanFace,
  Bell,
  LogOut,
  ChevronRight,
  X,
  CreditCard,
  Check,
  Edit2,
  Shield,
  Smartphone,
  ExternalLink,
  ShoppingBag
} from 'lucide-react';

export default function ProfileView({ addToast, onScrollChange }) {
  const [displayName, setDisplayName] = useState(localStorage.getItem('hollowDisplayName') || 'Emanuel Maxim');
  const [userEmail, setUserEmail] = useState('maxim.emanuel@icloud.com');
  const [requireFaceId, setRequireFaceId] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'accountInfo' | 'credentials' | 'platforms' | 'addons' | 'social' | 'announcements' | 'editProfile'

  // Edit form states
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
        await supabase.auth.updateUser({
          data: { displayName: trimmed }
        });
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
        await supabase.auth.signOut();
      }
      localStorage.removeItem('hollow_last_user_id');
      addToast('Logged out successfully.', 'info');
      window.location.reload();
    }
  };

  // Purple Switch Toggle component
  const PurpleToggle = ({ checked, onChange }) => (
    <div
      onClick={onChange}
      style={{
        width: '51px',
        height: '31px',
        borderRadius: '100px',
        background: checked ? '#b86eff' : '#3a3a3c',
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

  return (
    <div
      onScroll={(e) => onScrollChange && onScrollChange(e.target.scrollTop)}
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: '#000000',
        color: '#ffffff',
        padding: 'calc(var(--safe-top, 47px) + 16px) 16px calc(var(--safe-bottom, 34px) + 88px) 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* ── TOP HEADER ── */}
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: '0 0 2px 0',
          color: '#ffffff',
        }}>
          Profile
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400 }}>
          Account & preferences
        </div>
      </div>

      {/* ── USER ROW CARD ── */}
      <div
        onClick={() => setActiveModal('editProfile')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '4px 0',
          cursor: 'pointer',
        }}
      >
        {/* Circle Avatar with Initial */}
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: '#141416',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 800,
          color: '#ffffff',
          flexShrink: 0,
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

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── SECTION 1: ACCOUNT SETTINGS ── */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          paddingLeft: '2px',
        }}>
          ACCOUNT SETTINGS
        </div>

        <div style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {[
            {
              id: 'accountInfo',
              title: 'Account information',
              subtitle: 'Profile · Payment methods · Orders · Subscriptions',
              icon: User,
            },
            {
              id: 'credentials',
              title: 'Trading credentials',
              subtitle: 'Platform logins & access',
              icon: Key,
            },
            {
              id: 'platforms',
              title: 'Platforms',
              subtitle: 'TradeSea, Tradovate & more',
              icon: Layers,
            },
            {
              id: 'addons',
              title: 'Add-ons',
              subtitle: 'Extra features for your accounts',
              icon: PlusCircle,
            }
          ].map((item, idx, arr) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveModal(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: idx < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center' }}>
                  <IconComp size={18} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.subtitle}
                  </div>
                </div>

                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: COMMUNITY ── */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          paddingLeft: '2px',
        }}>
          COMMUNITY
        </div>

        <div style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {[
            {
              id: 'social',
              title: 'Social media & merch',
              subtitle: 'Follow us, join the community & shop merch',
              icon: Share2,
            },
            {
              id: 'announcements',
              title: 'Announcements',
              subtitle: 'Updates, alerts & community',
              icon: Megaphone,
            }
          ].map((item, idx, arr) => {
            const IconComp = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveModal(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: idx < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center' }}>
                  <IconComp size={18} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.subtitle}
                  </div>
                </div>

                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: PREFERENCES (Purple Toggles) ── */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '8px',
          paddingLeft: '2px',
        }}>
          PREFERENCES
        </div>

        <div style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {/* Require Face ID */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center' }}>
                <ScanFace size={18} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                  Require Face ID
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
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

          {/* Push Notifications (Vibrant Purple Switch) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'flex', alignItems: 'center' }}>
                <Bell size={18} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                  Push Notifications
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
                  {pushNotifications ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            <PurpleToggle
              checked={pushNotifications}
              onChange={() => {
                const next = !pushNotifications;
                setPushNotifications(next);
                addToast(next ? 'Push notifications enabled' : 'Push notifications disabled', 'info');
              }}
            />
          </div>
        </div>
      </div>

      {/* ── LOG OUT BUTTON (Red Rounded Button) ── */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          background: '#dc2626',
          border: 'none',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '15px',
          fontWeight: 700,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.35)',
          outline: 'none',
          transition: 'transform 0.15s, filter 0.15s',
          marginTop: '4px',
        }}
      >
        <LogOut size={18} strokeWidth={2.4} />
        <span>Log out</span>
      </button>

      {/* ── MODALS / SUB-SHEETS ── */}
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
                  {activeModal === 'credentials' && 'Trading Credentials'}
                  {activeModal === 'platforms' && 'Platforms & Connections'}
                  {activeModal === 'addons' && 'Account Add-ons'}
                  {activeModal === 'social' && 'Social Media & Merch'}
                  {activeModal === 'announcements' && 'Community Announcements'}
                </span>
                <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                {/* Edit Profile */}
                {activeModal === 'editProfile' && (
                  <>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', marginBottom: '6px' }}>Display Name</div>
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
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', marginBottom: '6px' }}>Email Address</div>
                      <input
                        value={userEmail}
                        disabled
                        style={{
                          width: '100%',
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '15px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      style={{
                        background: '#b86eff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '14px',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#000',
                        cursor: 'pointer',
                        marginTop: '10px',
                      }}
                    >
                      Save Profile
                    </button>
                  </>
                )}

                {/* Account Info */}
                {activeModal === 'accountInfo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Membership Tier</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#d8b4fe', marginTop: '2px' }}>Hollow Pro Ledger (Lifetime)</div>
                    </div>
                    <div style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Default Currency</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>USD ($)</div>
                    </div>
                    <div style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Cloud Sync State</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#30d158', marginTop: '2px' }}>Connected & Synced</div>
                    </div>
                  </div>
                )}

                {/* Credentials */}
                {activeModal === 'credentials' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { platform: 'Tradovate API', user: 'apex_trader_mxm', status: 'Connected', key: '••••••••••••••••' },
                      { platform: 'TradeSea Gateway', user: 'emanuel_maxim', status: 'Connected', key: '••••••••••••••••' },
                      { platform: 'Rithmic / CQG', user: 'topstep_funded_01', status: 'Active', key: '••••••••••••••••' },
                    ].map((cred, i) => (
                      <div key={i} style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{cred.platform}</span>
                          <span style={{ fontSize: '10px', color: '#b86eff', background: 'rgba(184, 110, 255, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{cred.status}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>User: {cred.user} · Key: {cred.key}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Platforms */}
                {activeModal === 'platforms' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'TradeSea', desc: 'Realtime high-speed execution router', connected: true },
                      { name: 'Tradovate', desc: 'Direct market futures gateway', connected: true },
                      { name: 'TradingView', desc: 'Chart studies & indicators integration', connected: true },
                      { name: 'NinjaTrader', desc: 'Desktop bridge connector', connected: false }
                    ].map((plat, i) => (
                      <div key={i} style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{plat.name}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>{plat.desc}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: plat.connected ? '#b86eff' : 'rgba(255, 255, 255, 0.4)' }}>
                          {plat.connected ? 'Active' : 'Connect'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add-ons */}
                {activeModal === 'addons' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'Automated Trailing Loss Guardian', price: 'Included', active: true },
                      { name: 'Cognitive LLM Trade Journal AI', price: 'Included', active: true },
                      { name: 'Sunday Automated PDF Backup Vault', price: 'Included', active: true },
                      { name: 'Multi-Account Trade Replicator', price: 'Active', active: true },
                    ].map((addon, i) => (
                      <div key={i} style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{addon.name}</div>
                          <div style={{ fontSize: '12px', color: '#b86eff', fontWeight: 600 }}>{addon.price}</div>
                        </div>
                        <Check size={16} color="#b86eff" strokeWidth={3} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Social & Merch */}
                {activeModal === 'social' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'Twitter / X', link: '@hollowledger' },
                      { name: 'Discord Trader Community', link: 'discord.gg/hollow' },
                      { name: 'Official Trader Merch & Hoodies', link: 'shop.hollow.trade' },
                      { name: 'YouTube Edge Tutorials', link: 'youtube.com/@hollow' }
                    ].map((s, i) => (
                      <div key={i} onClick={() => addToast(`Opening ${s.name}...`, 'info')} style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{s.name}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>{s.link}</div>
                        </div>
                        <ExternalLink size={14} color="#b86eff" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Announcements */}
                {activeModal === 'announcements' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: '#16161a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>v91 UI Release</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>Obsidian dark theme with purple neon accents and upgraded execution engine is now live.</div>
                    </div>
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
