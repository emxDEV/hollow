import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, DollarSign, ArrowRight } from 'lucide-react';
import { db } from '../db/hollowDb';

export default function NoAccountsModal({ isOpen, isMobile, addToast }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('EVALUATION'); // 'EVALUATION' | 'FUNDED' | 'PERSONAL'
  const [balance, setBalance] = useState(100000);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { value: 'EVALUATION', label: 'Evaluation', desc: 'Prop firm challenge' },
    { value: 'FUNDED', label: 'Funded', desc: 'Live prop account' },
    { value: 'PERSONAL', label: 'Personal', desc: 'Own private capital' }
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
          background: 'rgba(0, 0, 0, 0.88)',
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
            border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 32px 80px rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: isMobile ? 'env(safe-area-inset-top, 44px)' : 0,
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 34px)' : 0
          }}
        >
          {/* Scrollable Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '40px 32px 32px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 24 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #9d76fa, #8257e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(157, 118, 250, 0.3)'
              }}>
                <CreditCard size={18} color="#fff" />
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#9d76fa', textTransform: 'uppercase', letterSpacing: '1px' }}>Getting Started</span>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Create your ledger</h2>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5, marginBottom: 28 }}>
              To begin tracking your trades, confluences, playbook edges, and stats, please configure your first active trading account parameters.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Account Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex $100k Funded, My Personal Account"
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
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(157, 118, 250, 0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
              </div>

              {/* Account Type Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {typeOptions.map(opt => {
                    const active = type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        style={{
                          background: active ? 'rgba(157, 118, 250, 0.12)' : '#141416',
                          border: active ? '1px solid #9d76fa' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '12px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: '700', color: active ? '#9d76fa' : '#fff' }}>{opt.label}</span>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial Balance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Initial Balance</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {quickBalances.map(bal => (
                      <button
                        key={bal}
                        type="button"
                        onClick={() => setBalance(bal)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '600',
                          color: '#9d76fa',
                          cursor: 'pointer'
                        }}
                      >
                        ${bal.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>$</span>
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
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(157, 118, 250, 0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #9d76fa 0%, #8257e5 100%)',
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
                  boxShadow: '0 8px 24px rgba(157, 118, 250, 0.25)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <span>Initialize Account & Enter Workspace</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
