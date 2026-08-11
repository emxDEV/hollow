import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Check,
  Copy,
  ChevronRight,
  Shield,
  HelpCircle,
  Zap,
  Plus,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';

const PLAN_CATEGORIES = ['LucidPro', 'LucidFlex', 'LucidDaily', 'LucidDirect'];

const PLANS_DATA = {
  LucidPro: [
    {
      size: '25K',
      title: '25K PRO EVAL',
      target: '$1,250',
      lossLimit: '$1,000',
      drawdown: 'EOD',
      maxSize: '2 Mini OR 20 Micro',
      origPrice: '$123',
      discountPrice: '$90.6',
      resetFee: '$90.00',
    },
    {
      size: '50K',
      title: '50K PRO EVAL',
      target: '$2,500',
      lossLimit: '$2,000',
      drawdown: 'EOD',
      maxSize: '4 Mini OR 40 Micro',
      origPrice: '$167',
      discountPrice: '$118.0',
      resetFee: '$100.00',
    },
    {
      size: '100K',
      title: '100K PRO EVAL',
      target: '$5,000',
      lossLimit: '$3,500',
      drawdown: 'EOD',
      maxSize: '8 Mini OR 80 Micro',
      origPrice: '$289',
      discountPrice: '$198.5',
      resetFee: '$140.00',
    },
    {
      size: '150K',
      title: '150K PRO EVAL',
      target: '$7,500',
      lossLimit: '$5,000',
      drawdown: 'EOD',
      maxSize: '12 Mini OR 120 Micro',
      origPrice: '$399',
      discountPrice: '$285.0',
      resetFee: '$180.00',
    },
  ],
  LucidFlex: [
    {
      size: '50K',
      title: '50K FLEX EVAL',
      target: '$3,000',
      lossLimit: '$2,500',
      drawdown: 'Trailing',
      maxSize: '5 Mini OR 50 Micro',
      origPrice: '$149',
      discountPrice: '$99.0',
      resetFee: '$95.00',
    },
    {
      size: '100K',
      title: '100K FLEX EVAL',
      target: '$6,000',
      lossLimit: '$4,000',
      drawdown: 'Trailing',
      maxSize: '10 Mini OR 100 Micro',
      origPrice: '$275',
      discountPrice: '$185.0',
      resetFee: '$130.00',
    }
  ],
  LucidDaily: [
    {
      size: '50K',
      title: '50K DAILY EVAL',
      target: '$2,500',
      lossLimit: '$2,000',
      drawdown: 'Daily Pause',
      maxSize: '4 Mini OR 40 Micro',
      origPrice: '$135',
      discountPrice: '$89.0',
      resetFee: '$85.00',
    }
  ],
  LucidDirect: [
    {
      size: '25K',
      title: '25K DIRECT FUNDED',
      target: 'None (Instant)',
      lossLimit: '$1,500',
      drawdown: 'Static EOD',
      maxSize: '2 Mini OR 20 Micro',
      origPrice: '$350',
      discountPrice: '$260.0',
      resetFee: 'N/A',
    }
  ]
};

export default function AddPlanView({ addToast, onScrollChange }) {
  const [selectedCategory, setSelectedCategory] = useState('LucidPro');
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [dailyLossLimitOn, setDailyLossLimitOn] = useState(false);
  const [showFundedRules, setShowFundedRules] = useState(false);
  const [showPlatformSelect, setShowPlatformSelect] = useState(false);

  const currentPlans = PLANS_DATA[selectedCategory] || PLANS_DATA['LucidPro'];
  const currentPlan = currentPlans[activePlanIdx] || currentPlans[0];

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText('VAULT');
    addToast('Coupon code VAULT copied to clipboard!', 'success');
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setActivePlanIdx(0);
  };

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
        padding: 'calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 84px) 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* ── TOP HORIZONTAL CATEGORY PILLS ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: '2px',
      }}>
        {PLAN_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              style={{
                flexShrink: 0,
                background: isActive ? '#1c1c22' : 'rgba(255, 255, 255, 0.04)',
                border: isActive ? '1px solid #b86eff' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '100px',
                padding: '8px 16px',
                color: isActive ? '#d8b4fe' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                boxShadow: isActive ? '0 0 14px rgba(184, 110, 255, 0.3)' : 'none',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── MAIN PLAN CARD ── */}
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '20px 18px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        {/* Plan Title */}
        <div style={{
          textAlign: 'center',
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '0.04em',
          color: '#ffffff',
          textTransform: 'uppercase',
          paddingBottom: '4px',
        }}>
          {currentPlan.title}
        </div>

        {/* Spec List Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', fontSize: '13px' }}>
          {/* Profit Target */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Profit target</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{currentPlan.target}</span>
          </div>

          {/* Max Loss Limit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Max loss limit</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{currentPlan.lossLimit}</span>
          </div>

          {/* Drawdown Type */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Drawdown type</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{currentPlan.drawdown}</span>
          </div>

          {/* Max Size */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Max size</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{currentPlan.maxSize}</span>
          </div>

          {/* Daily Loss Limit Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Daily Loss Limit</span>
            <div style={{
              background: '#16161a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '2px',
              display: 'flex',
              gap: '2px',
            }}>
              <button
                onClick={() => setDailyLossLimitOn(true)}
                style={{
                  background: dailyLossLimitOn ? '#b86eff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: dailyLossLimitOn ? '#000000' : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s',
                }}
              >
                ON
              </button>
              <button
                onClick={() => setDailyLossLimitOn(false)}
                style={{
                  background: !dailyLossLimitOn ? '#b86eff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: !dailyLossLimitOn ? '#000000' : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s',
                }}
              >
                OFF
              </button>
            </div>
          </div>

          {/* Account Activation Fee */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Account activation fee</span>
            <span style={{
              background: 'rgba(184, 110, 255, 0.15)',
              border: '1px solid rgba(184, 110, 255, 0.35)',
              color: '#d8b4fe',
              fontWeight: 800,
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '6px',
              letterSpacing: '0.04em',
            }}>
              FREE
            </span>
          </div>

          {/* Trader Dashboard */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Trader dashboard</span>
            <span style={{
              background: 'rgba(184, 110, 255, 0.15)',
              border: '1px solid rgba(184, 110, 255, 0.35)',
              color: '#d8b4fe',
              fontWeight: 800,
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '6px',
              letterSpacing: '0.04em',
            }}>
              REALTIME
            </span>
          </div>

          {/* Pass in as little as one day */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>Pass in as little as one day</span>
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              background: 'rgba(184, 110, 255, 0.15)',
              border: '1px solid rgba(184, 110, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={14} strokeWidth={3} color="#b86eff" />
            </div>
          </div>
        </div>

        {/* Inset Pricing Box */}
        <div style={{
          background: '#040406',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '4px',
        }}>
          <div>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: 'rgba(255, 255, 255, 0.45)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>
              ONE TIME PAYMENT
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Reset Fee <span style={{ color: '#fff', fontWeight: 700 }}>{currentPlan.resetFee}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'flex-end',
              gap: '6px',
            }}>
              <span style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.4)',
                textDecoration: 'line-through',
              }}>
                {currentPlan.origPrice}
              </span>
              <span style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#b86eff',
                letterSpacing: '-0.02em',
                textShadow: '0 0 16px rgba(184, 110, 255, 0.4)',
              }}>
                {currentPlan.discountPrice}
              </span>
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>
              w/ coupon at checkout
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          {/* Funded Rules Button */}
          <button
            onClick={() => setShowFundedRules(true)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.15s',
            }}
          >
            Funded rules
          </button>

          {/* Select Platform Button (Purple Accent) */}
          <button
            onClick={() => setShowPlatformSelect(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: 800,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 24px rgba(184, 110, 255, 0.45)',
              outline: 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <Layers size={18} strokeWidth={2.4} />
            <span>Select platform</span>
          </button>
        </div>
      </div>

      {/* ── CAROUSEL DOTS (Switch plan sizes) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '4px 0',
      }}>
        {currentPlans.map((p, idx) => {
          const isActive = activePlanIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => setActivePlanIdx(idx)}
              style={{
                width: isActive ? '24px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isActive ? '0 0 8px rgba(184, 110, 255, 0.6)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* ── PROMOTIONAL COPY COUPON BANNER ── */}
      <div
        onClick={handleCopyCoupon}
        style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          color: '#ffffff',
          textAlign: 'center',
        }}>
          GET FUNDED AND GET PAID — USE CODE: <span style={{ color: '#b86eff' }}>VAULT</span>
        </span>
        <Copy size={13} color="#b86eff" />
      </div>

      {/* ── FUNDED RULES MODAL SHEET ── */}
      <AnimatePresence>
        {showFundedRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFundedRules(false)}
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
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ width: '36px', height: '4px', background: 'rgba(255, 255, 255, 0.25)', borderRadius: '2px', margin: '12px auto 14px' }} />
              <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>Funded Account Rules</span>
                <button onClick={() => setShowFundedRules(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                {[
                  { title: 'Consistency Rule', text: 'No single day profit may exceed 30% of total requested payout balance.' },
                  { title: 'EOD Trailing Drawdown', text: 'Drawdown locks at starting balance + $100 once target threshold is reached.' },
                  { title: 'News Trading', text: 'Allowed during all major high-impact events without contract restrictions.' },
                  { title: 'Payout Cycle', text: 'First payout eligible after 5 active trading days. Bi-weekly cycles thereafter.' }
                ].map((rule, idx) => (
                  <div key={idx} style={{ background: '#16161a', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#b86eff', marginBottom: '4px' }}>{rule.title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>{rule.text}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SELECT PLATFORM MODAL SHEET ── */}
      <AnimatePresence>
        {showPlatformSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlatformSelect(false)}
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
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ width: '36px', height: '4px', background: 'rgba(255, 255, 255, 0.25)', borderRadius: '2px', margin: '12px auto 14px' }} />
              <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>Select Trading Platform</span>
                <button onClick={() => setShowPlatformSelect(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { name: 'Tradovate', tag: 'Web & Mobile Trading', icon: '📈' },
                  { name: 'TradeSea', tag: 'Next-Gen Prop Engine', icon: '🌊' },
                  { name: 'TradingView (via Tradovate)', tag: 'Advanced Charting', icon: '📊' },
                  { name: 'NinjaTrader 8', tag: 'Desktop Execution', icon: '🥷' },
                ].map((plat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      addToast(`Selected ${plat.name} for ${currentPlan.title}! Coupon VAULT applied.`, 'success');
                      setShowPlatformSelect(false);
                    }}
                    style={{
                      background: '#16161a',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: '#ffffff',
                      textAlign: 'left',
                      outline: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '22px' }}>{plat.icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{plat.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>{plat.tag}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#b86eff" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
