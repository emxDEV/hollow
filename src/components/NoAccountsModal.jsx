import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, DollarSign, ArrowRight, X } from 'lucide-react';
import { db } from '../db/hollowDb';

export default function NoAccountsModal({ isOpen, onClose, isMobile, addToast }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('EVALUATION'); // 'EVALUATION' | 'FUNDED' | 'PERSONAL'
  const [balance, setBalance] = useState(100000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Theme Mapping based on existing account colors
  const getTheme = () => {
    switch (type) {
      case 'FUNDED':
        return {
          primary: '#30d158', // Emerald Green
          glow: 'rgba(48, 209, 88, 0.25)',
          bg: 'rgba(48, 209, 88, 0.08)',
          gradient: 'linear-gradient(135deg, #30d158 0%, #1c9b3a 100%)',
          rgb: '48, 209, 88'
        };
      case 'EVALUATION':
        return {
          primary: '#0a84ff', // Blue
          glow: 'rgba(10, 132, 255, 0.25)',
          bg: 'rgba(10, 132, 255, 0.08)',
          gradient: 'linear-gradient(135deg, #0a84ff 0%, #0056b3 100%)',
          rgb: '10, 132, 255'
        };
      case 'PERSONAL':
        return {
          primary: '#bf5af2', // Purple
          glow: 'rgba(191, 90, 242, 0.25)',
          bg: 'rgba(191, 90, 242, 0.08)',
          gradient: 'linear-gradient(135deg, #bf5af2 0%, #8c2db2 100%)',
          rgb: '191, 90, 242'
        };
      default:
        return {
          primary: '#ff9f0a', // Orange
          glow: 'rgba(255, 159, 10, 0.25)',
          bg: 'rgba(255, 159, 10, 0.08)',
          gradient: 'linear-gradient(135deg, #ff9f0a 0%, #c67c05 100%)',
          rgb: '255, 159, 10'
        };
    }
  };

  const theme = getTheme();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const id = `acc-${Date.now()}`;
      await db.accounts.add({
        id,
        name: name.trim(),
        type,
        balance: Number(balance) || 0,
        profitTarget: 0,
        maxLoss: 0,
        drawdownLimit: 0,
        maxDailyLoss: 0,
        minDays: 0
      });
      
      if (addToast) {
        addToast('First trading account initialized successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to create onboarding account:', err);
      if (addToast) {
        addToast('Failed to create account.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const typeOptions = [
    { value: 'EVALUATION', label: 'Evaluation', desc: 'Prop firm challenge', color: '#0a84ff', bg: 'rgba(10, 132, 255, 0.08)' },
    { value: 'FUNDED', label: 'Funded', desc: 'Live prop account', color: '#30d158', bg: 'rgba(48, 209, 88, 0.08)' },
    { value: 'PERSONAL', label: 'Personal', desc: 'Own private capital', color: '#bf5af2', bg: 'rgba(191, 90, 242, 0.08)' }
  ];

  const quickBalances = [50000, 100000, 200000];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 20
        }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{
            width: '100%',
            maxWidth: 460,
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100vh' : '90vh',
            background: '#0a0a0c',
            borderRadius: isMobile ? 0 : 24,
            border: isMobile ? 'none' : `1px solid rgba(${theme.rgb}, 0.15)`,
            boxShadow: `0 32px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(${theme.rgb}, 0.04)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: isMobile ? 'env(safe-area-inset-top, 44px)' : 0,
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 34px)' : 0,
            transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
            position: 'relative'
          }}
        >
          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: isMobile ? 'calc(env(safe-area-inset-top, 44px) + 16px)' : '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                color: 'rgba(255, 255, 255, 0.6)',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* Scrollable Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '40px 32px 32px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 24 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}bd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${theme.glow}`,
                transition: 'background 0.4s ease, box-shadow 0.4s ease'
              }}>
                <CreditCard size={20} color="#000" strokeWidth={2.5} />
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: theme.primary, textTransform: 'uppercase', letterSpacing: '1px', transition: 'color 0.4s ease' }}>getting started</span>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>create your ledger.</h2>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5, marginBottom: 28 }}>
              To begin tracking your trades, confluences, playbook edges, and stats, please configure your first active trading account parameters.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Account Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>account name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apex $100k funded, my personal account"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#141416',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '12px 16px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = theme.primary;
                    e.target.style.boxShadow = `0 0 10px rgba(${theme.rgb}, 0.1)`;
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Account Type Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>account type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {typeOptions.map(opt => {
                    const active = type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        style={{
                          background: active ? opt.bg : '#141416',
                          border: active ? `1px solid ${opt.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '12px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.25s',
                          outline: 'none',
                          boxShadow: active ? `0 0 12px rgba(${opt.value === 'FUNDED' ? '48,209,88' : opt.value === 'EVALUATION' ? '10,132,255' : '191,90,242'}, 0.12)` : 'none'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '700', color: active ? opt.color : 'rgba(255,255,255,0.7)' }}>{opt.label.toLowerCase()}</span>
                        <span style={{ fontSize: '9px', color: active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial Balance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>initial balance</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {quickBalances.map(bal => (
                      <button
                        key={bal}
                        type="button"
                        onClick={() => setBalance(bal)}
                        style={{
                          background: balance === bal ? theme.bg : 'rgba(255,255,255,0.04)',
                          border: balance === bal ? `1px solid ${theme.primary}` : '1px solid transparent',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: theme.primary,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        ${bal.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.primary, fontSize: '14px', fontWeight: '700', transition: 'color 0.4s ease' }}>$</span>
                  <input
                    type="number"
                    required
                    value={balance}
                    onChange={e => setBalance(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#141416',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px 16px 12px 28px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = theme.primary;
                      e.target.style.boxShadow = `0 0 10px rgba(${theme.rgb}, 0.1)`;
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                style={{
                  width: '100%',
                  background: theme.gradient,
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#fff',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '12px',
                  opacity: name.trim() ? 1 : 0.6,
                  boxShadow: `0 8px 24px ${theme.glow}`,
                  outline: 'none',
                  transition: 'all 0.4s ease'
                }}
              >
                <span>initialize account & enter workspace</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
