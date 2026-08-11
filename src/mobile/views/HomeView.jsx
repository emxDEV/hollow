import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/hollowDb';
import { APP_VERSION } from '../../utils/version';
import {
  ExternalLink,
  ChevronRight,
  Box,
  Gift,
  Award,
  Trophy,
  Newspaper,
  Megaphone,
  Bell,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';

// Custom Discord Icon
function DiscordIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

// Custom TradeSea & Tradovate Logos
function TradeSeaIcon({ size = 20 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #0a84ff 0%, #0055d4 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 900,
      fontSize: size * 0.55
    }}>
      TS
    </div>
  );
}

function TradovateIcon({ size = 20 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 900,
      fontSize: size * 0.55
    }}>
      <TrendingUp size={size * 0.75} strokeWidth={3} color="#ffffff" />
    </div>
  );
}

export default function HomeView({ addToast, onScrollChange, onNavigate, onOpenWeeklyReview }) {
  const [activeModal, setActiveModal] = useState(null); // 'accounts' | 'vault' | 'giveaway' | 'certs' | 'leaderboard' | 'news' | 'announcements' | 'discord' | 'notifications'
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const displayName = localStorage.getItem('hollowDisplayName') || 'mXm';

  // Accounts from DB or realistic defaults
  const dbAccounts = useLiveQuery(() => (db && db.accounts ? db.accounts.toArray() : []), []) || [];
  
  const accountMetrics = useMemo(() => {
    if (dbAccounts.length > 0) {
      const active = dbAccounts.filter(a => !a.isArchived).length;
      const evals = dbAccounts.filter(a => a.type?.toLowerCase().includes('eval') || a.name?.toLowerCase().includes('eval')).length || Math.max(1, Math.floor(active * 0.6));
      const funded = dbAccounts.filter(a => a.type?.toLowerCase().includes('funded') || a.name?.toLowerCase().includes('funded') || a.isFunded).length || Math.max(1, active - evals);
      return { active: active || 3, evals: evals || 2, funded: funded || 1 };
    }
    return { active: 3, evals: 2, funded: 1 };
  }, [dbAccounts]);

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    if (onScrollChange) onScrollChange(scrollTop);
  };

  return (
    <div
      onScroll={handleScroll}
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: '#000000',
        color: '#ffffff',
        padding: 'calc(var(--safe-top, 47px) + 16px) 16px calc(var(--safe-bottom, 34px) + 80px) 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* ── TOP HEADER: Hi, [Name] + Overview + Discord/Bell ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: '0 0 2px 0',
            color: '#ffffff',
          }}>
            Hi, {displayName}
          </h1>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 400 }}>
            Here's your trading overview
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)', marginTop: '2px', fontWeight: 500 }}>
            Updated {currentTimeStr} · v91
          </div>
        </div>

        {/* Discord & Notification action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
          {/* Discord Button */}
          <button
            onClick={() => setActiveModal('discord')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(88, 101, 242, 0.15)',
              border: '1px solid rgba(88, 101, 242, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#5865F2',
              outline: 'none',
              transition: 'transform 0.15s, background 0.15s',
            }}
          >
            <DiscordIcon size={19} color="#7983f5" />
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setActiveModal('notifications')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.8)',
              position: 'relative',
              outline: 'none',
            }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ff453a',
              boxShadow: '0 0 6px rgba(255, 69, 58, 0.8)',
            }} />
          </button>
        </div>
      </div>

      {/* ── ACCOUNTS CARD ── */}
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '18px 20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Top Header inside card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: 'rgba(255, 255, 255, 0.45)',
            textTransform: 'uppercase',
          }}>
            ACCOUNTS
          </span>

          <button
            onClick={() => setActiveModal('accounts')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(184, 110, 255, 0.1)',
              border: '1px solid rgba(184, 110, 255, 0.35)',
              borderRadius: '100px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#d8b4fe',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.2s',
            }}
          >
            <span>Tap to view</span>
            <ChevronRight size={12} strokeWidth={2.5} color="#d8b4fe" />
          </button>
        </div>

        {/* 3 Metric Columns: ACTIVE | EVALS | FUNDED */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          textAlign: 'center',
        }}>
          <div>
            <div style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {accountMetrics.active}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.45)',
              marginTop: '4px',
              textTransform: 'uppercase',
            }}>
              ACTIVE
            </div>
          </div>

          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.06)', borderRight: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {accountMetrics.evals}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.45)',
              marginTop: '4px',
              textTransform: 'uppercase',
            }}>
              EVALS
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {accountMetrics.funded}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.45)',
              marginTop: '4px',
              textTransform: 'uppercase',
            }}>
              FUNDED
            </div>
          </div>
        </div>
      </div>

      {/* ── LAUNCH PLATFORMS ↗ ── */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          <span>LAUNCH PLATFORMS</span>
          <ExternalLink size={12} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* TradeSea Button */}
          <button
            onClick={() => {
              window.open('https://tradesea.com', '_blank');
              addToast('Opening TradeSea Platform...', 'info');
            }}
            style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              color: '#ffffff',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <TradeSeaIcon size={26} />
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              TradeSea
            </span>
          </button>

          {/* Tradovate Button */}
          <button
            onClick={() => {
              window.open('https://trader.tradovate.com', '_blank');
              addToast('Opening Tradovate Platform...', 'info');
            }}
            style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              color: '#ffffff',
              textAlign: 'left',
              outline: 'none',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <TradovateIcon size={26} />
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Tradovate
            </span>
          </button>
        </div>
      </div>

      {/* ── MENU LIST ── */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          MENU
        </div>

        <div style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {[
            { id: 'vault', label: 'The Vault', icon: Box, color: '#b86eff' },
            { id: 'giveaway', label: 'Giveaway', icon: Gift, color: '#b86eff' },
            { id: 'certs', label: 'Certs', icon: Award, color: '#b86eff' },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: '#b86eff' },
            { id: 'news', label: 'News & Events', icon: Newspaper, color: '#b86eff' },
            { id: 'announcements', label: 'Announcements', icon: Megaphone, color: '#b86eff' },
            { id: 'discord', label: 'Connect Discord', icon: DiscordIcon, color: '#b86eff' }
          ].map((item, idx, arr) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveModal(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px 18px',
                  borderBottom: idx < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  filter: 'drop-shadow(0 0 6px rgba(184, 110, 255, 0.3))',
                }}>
                  <IconComponent size={20} strokeWidth={2} color={item.color} />
                </div>

                <div style={{
                  flex: 1,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: item.id === 'vault' || item.id === 'giveaway' || item.id === 'discord' ? '#b86eff' : '#ffffff',
                  letterSpacing: '-0.01em',
                }}>
                  {item.label}
                </div>

                <ChevronRight size={16} color="rgba(255, 255, 255, 0.3)" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODALS / BOTTOM SHEETS ── */}
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
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
              }}
            >
              {/* Handle */}
              <div style={{
                width: '36px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '2px',
                margin: '12px auto 14px',
                flexShrink: 0,
              }} />

              {/* Modal Header */}
              <div style={{
                padding: '0 20px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {activeModal === 'accounts' && 'Trading Accounts'}
                  {activeModal === 'vault' && 'The Vault'}
                  {activeModal === 'giveaway' && 'Trader Giveaways & Rewards'}
                  {activeModal === 'certs' && 'Certificates & Milestones'}
                  {activeModal === 'leaderboard' && 'Trader Leaderboard'}
                  {activeModal === 'news' && 'Economic News & High-Impact Events'}
                  {activeModal === 'announcements' && 'Announcements'}
                  {activeModal === 'discord' && 'Discord Community'}
                  {activeModal === 'notifications' && 'Notifications'}
                </span>
                <button
                  onClick={() => setActiveModal(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. ACCOUNTS VIEW MODAL */}
                {activeModal === 'accounts' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { name: 'Apex 50K Pro #1', type: 'EVAL', balance: '$51,420.00', pnl: '+$1,420.00', status: 'In Progress (71% Target)' },
                        { name: 'Apex 50K Pro #2', type: 'EVAL', balance: '$50,850.00', pnl: '+$850.00', status: 'In Progress (42% Target)' },
                        { name: 'Topstep 150K Funded', type: 'FUNDED', balance: '$154,200.00', pnl: '+$4,200.00', status: 'Payout Eligible' }
                      ].map((acc, i) => (
                        <div key={i} style={{
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{acc.name}</span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: acc.type === 'FUNDED' ? 'rgba(184, 110, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                color: acc.type === 'FUNDED' ? '#d8b4fe' : '#ffffff',
                              }}>
                                {acc.type}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>{acc.status}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#30d158' }}>{acc.pnl}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>{acc.balance}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 2. THE VAULT MODAL */}
                {activeModal === 'vault' && (
                  <>
                    <div style={{
                      background: 'rgba(184, 110, 255, 0.08)',
                      border: '1px solid rgba(184, 110, 255, 0.2)',
                      borderRadius: '16px',
                      padding: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Sparkles size={20} color="#b86eff" />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#d8b4fe' }}>Hollow Edge Vault</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.4 }}>
                        Exclusive institutional setups, model backtests, and high-probability algorithmic checklists unlocked for your profile.
                      </p>
                    </div>

                    {[
                      { title: 'PO3 Silver Bullet Blueprint', desc: '10:00 AM NY Session FVG & Liquidity Sweep Execution', rating: '94% Win Factor' },
                      { title: 'London Judas Swing Reversal', desc: 'Pre-market low hunt with discount orderblock targeting', rating: '3.4 RR Avg' },
                      { title: 'EOD Trailing Rule Calculator', desc: 'Dynamic contract sizing to preserve funded buffer', rating: 'Essential Rule' },
                    ].map((item, i) => (
                      <div key={i} style={{
                        background: '#16161a',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        padding: '14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{item.title}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#b86eff', background: 'rgba(184, 110, 255, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>{item.rating}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>{item.desc}</div>
                      </div>
                    ))}
                  </>
                )}

                {/* 3. GIVEAWAY MODAL */}
                {activeModal === 'giveaway' && (
                  <>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(184, 110, 255, 0.15) 0%, rgba(138, 48, 246, 0.2) 100%)',
                      border: '1px solid rgba(184, 110, 255, 0.4)',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <Gift size={32} color="#d8b4fe" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                        Weekly 100K Account Giveaway
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '14px' }}>
                        Log your daily journals and reach 5 consecutive disciplined execution days to enter automatically.
                      </div>
                      <button
                        onClick={() => {
                          addToast('Entered in this week\'s 100K Giveaway! Good luck!', 'success');
                          setActiveModal(null);
                        }}
                        style={{
                          background: '#b86eff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 20px',
                          color: '#000',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Enter Giveaway Now
                      </button>
                    </div>
                  </>
                )}

                {/* 4. CERTS MODAL */}
                {activeModal === 'certs' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { title: 'Passed 50K Pro Evaluation', date: 'August 2026', firm: 'Apex Trader Funding', verified: true },
                        { title: '10-Day Discipline Master', date: 'July 2026', firm: 'Hollow Ledger', verified: true },
                        { title: 'First $5,000 Payout Certificate', date: 'June 2026', firm: 'TopstepTrader', verified: true },
                      ].map((cert, i) => (
                        <div key={i} style={{
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Award size={24} color="#b86eff" />
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{cert.title}</div>
                              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>{cert.firm} · {cert.date}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#30d158', background: 'rgba(48, 209, 88, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                            VERIFIED
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 5. LEADERBOARD MODAL */}
                {activeModal === 'leaderboard' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { rank: 1, user: 'mXm (You)', pnl: '+$14,820.50', winRate: '78%', badge: '🏆 Diamond' },
                        { rank: 2, user: 'ApexHunter_NY', pnl: '+$12,450.00', winRate: '71%', badge: '🥈 Gold' },
                        { rank: 3, user: 'VeloTrader', pnl: '+$10,190.00', winRate: '68%', badge: '🥉 Silver' },
                        { rank: 4, user: 'NQ_FlowMaster', pnl: '+$8,940.00', winRate: '64%', badge: 'Top 5' },
                        { rank: 5, user: 'GhostExecutor', pnl: '+$7,650.00', winRate: '62%', badge: 'Top 5' }
                      ].map((item) => (
                        <div key={item.rank} style={{
                          background: item.rank === 1 ? 'rgba(184, 110, 255, 0.12)' : '#16161a',
                          border: item.rank === 1 ? '1px solid rgba(184, 110, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: item.rank === 1 ? '#b86eff' : 'rgba(255, 255, 255, 0.4)', width: '20px' }}>
                              #{item.rank}
                            </span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{item.user}</div>
                              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>Winrate: {item.winRate} · {item.badge}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#30d158' }}>
                            {item.pnl}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 6. NEWS & EVENTS MODAL */}
                {activeModal === 'news' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { time: '08:30 AM EST', event: 'US Core CPI (MoM / YoY)', impact: 'HIGH', forecast: '0.2%', prev: '0.1%' },
                        { time: '02:00 PM EST', event: 'FOMC Interest Rate Decision', impact: 'HIGH', forecast: '5.25%', prev: '5.25%' },
                        { time: '08:30 AM EST', event: 'Non-Farm Employment Change (NFP)', impact: 'HIGH', forecast: '185K', prev: '206K' },
                        { time: '10:00 AM EST', event: 'ISM Manufacturing PMI', impact: 'MED', forecast: '49.0', prev: '48.5' },
                      ].map((news, i) => (
                        <div key={i} style={{
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)' }}>{news.time}</span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: news.impact === 'HIGH' ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255, 159, 10, 0.2)',
                              color: news.impact === 'HIGH' ? '#ff453a' : '#ff9f0a',
                            }}>
                              {news.impact} IMPACT
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{news.event}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Forecast: {news.forecast} · Previous: {news.prev}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 7. ANNOUNCEMENTS MODAL */}
                {activeModal === 'announcements' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { title: 'v91 Release: Unified Ledger & Obsidian UI', date: 'Today', text: 'New ultra-fast mobile navigation, real-time cloud sync, and enhanced execution charts.' },
                        { title: 'Tradovate & TradeSea Direct Integration', date: '2 days ago', text: 'Direct platform linking now active with one-tap trade executions.' },
                        { title: 'Sunday Automated PDF Ledgers', date: '1 week ago', text: 'Weekly automated full ledger exports ready every Sunday.' }
                      ].map((item, i) => (
                        <div key={i} style={{
                          background: '#16161a',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '14px',
                          padding: '14px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{item.title}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>{item.date}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', margin: 0, lineHeight: 1.4 }}>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* 8. DISCORD MODAL */}
                {activeModal === 'discord' && (
                  <>
                    <div style={{
                      background: 'rgba(88, 101, 242, 0.12)',
                      border: '1px solid rgba(88, 101, 242, 0.35)',
                      borderRadius: '16px',
                      padding: '20px',
                      textAlign: 'center',
                    }}>
                      <DiscordIcon size={40} color="#7983f5" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                        Hollow Trader Community
                      </div>
                      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Connect your Discord to access live market voice channels, trading edge playbooks, daily prep rooms, and support.
                      </p>
                      <button
                        onClick={() => {
                          window.open('https://discord.gg', '_blank');
                          addToast('Discord connected successfully!', 'success');
                          setActiveModal(null);
                        }}
                        style={{
                          width: '100%',
                          background: '#5865F2',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 20px rgba(88, 101, 242, 0.4)',
                        }}
                      >
                        Join Discord Server
                      </button>
                    </div>
                  </>
                )}

                {/* 9. NOTIFICATIONS MODAL */}
                {activeModal === 'notifications' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { title: 'Risk Buffer Alert', text: 'Apex 50K account is at 82% profit target threshold.', time: '10m ago', unread: true },
                        { title: 'Weekly Review Ready', text: 'Synthesize your trading performance for the week.', time: '1h ago', unread: true },
                        { title: 'Backup Saved', text: 'Automated portable PDF database backup generated.', time: '1d ago', unread: false }
                      ].map((item, i) => (
                        <div key={i} style={{
                          background: item.unread ? 'rgba(184, 110, 255, 0.08)' : '#16161a',
                          border: item.unread ? '1px solid rgba(184, 110, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{item.title}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>{item.time}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{item.text}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
