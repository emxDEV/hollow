import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function PayoutsView({ addToast, onScrollChange }) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('2500');
  const [selectedAccount, setSelectedAccount] = useState('Topstep 150K Funded');

  const [payouts, setPayouts] = useState([
    { id: 1, account: 'Topstep 150K Funded', amount: '$2,500.00', date: 'Aug 04, 2026', status: 'Completed', method: 'Direct ACH' },
    { id: 2, account: 'Apex 50K Funded #1', amount: '$1,750.00', date: 'Jul 20, 2026', status: 'Completed', method: 'Wire Transfer' },
    { id: 3, account: 'Apex 50K Funded #2', amount: '$1,000.00', date: 'Jul 05, 2026', status: 'Completed', method: 'Crypto (USDT)' },
  ]);

  const totalPaidOut = '$5,250.00';

  const handleRequestPayout = (e) => {
    e.preventDefault();
    const newPayout = {
      id: Date.now(),
      account: selectedAccount,
      amount: `$${parseFloat(payoutAmount || 0).toFixed(2)}`,
      date: 'Just now',
      status: 'Processing',
      method: 'Direct ACH'
    };
    setPayouts([newPayout, ...payouts]);
    addToast(`Payout request of $${payoutAmount} submitted successfully!`, 'success');
    setShowRequestModal(false);
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
        padding: 'calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 88px) 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: '0 0 2px 0',
          color: '#ffffff',
        }}>
          Payouts
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400 }}>
          Track profit splits & withdrawals
        </div>
      </div>

      {/* Overview Balance Card */}
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase' }}>
            TOTAL PAID OUT
          </span>
          <span style={{
            background: 'rgba(184, 110, 255, 0.15)',
            border: '1px solid rgba(184, 110, 255, 0.35)',
            color: '#d8b4fe',
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            100% PROFIT SPLIT
          </span>
        </div>

        <div style={{
          fontSize: '32px',
          fontWeight: 900,
          color: '#b86eff',
          letterSpacing: '-0.02em',
          marginBottom: '16px',
          textShadow: '0 0 20px rgba(184, 110, 255, 0.35)',
        }}>
          {totalPaidOut}
        </div>

        <div style={{
          background: '#141418',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600 }}>Next Payout Window</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>In 4 Days (Aug 15)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600 }}>Eligible Buffer</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#30d158', marginTop: '2px' }}>$4,200.00</div>
          </div>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
            border: 'none',
            borderRadius: '14px',
            padding: '13px',
            fontSize: '14px',
            fontWeight: 800,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginTop: '16px',
            boxShadow: '0 4px 20px rgba(184, 110, 255, 0.4)',
            outline: 'none',
          }}
        >
          <ArrowUpRight size={18} strokeWidth={2.5} />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Payout History */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '10px',
          paddingLeft: '2px',
        }}>
          PAYOUT HISTORY
        </div>

        <div style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {payouts.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                borderBottom: idx < payouts.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(184, 110, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#b86eff',
                }}>
                  <Wallet size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                    {p.account}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
                    {p.date} · {p.method}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  {p.amount}
                </div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: p.status === 'Completed' ? '#30d158' : '#ff9f0a',
                  marginTop: '2px',
                }}>
                  {p.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request Payout Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRequestModal(false)}
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
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>Request Withdrawal</span>
                <button onClick={() => setShowRequestModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRequestPayout} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', marginBottom: '6px' }}>Select Account</div>
                  <select
                    value={selectedAccount}
                    onChange={e => setSelectedAccount(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#16161a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="Topstep 150K Funded">Topstep 150K Funded (Eligible: $4,200.00)</option>
                    <option value="Apex 50K Funded #1">Apex 50K Funded #1 (Eligible: $1,850.00)</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', marginBottom: '6px' }}>Withdrawal Amount ($)</div>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    max="4200"
                    style={{
                      width: '100%',
                      background: '#16161a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: 800,
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#b86eff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#000',
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  Confirm Payout Request
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
