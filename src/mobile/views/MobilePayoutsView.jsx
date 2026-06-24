import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/hollowDb';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, DollarSign, Calendar, Landmark, X, Edit3, Trash2 } from 'lucide-react';

export default function MobilePayoutsView({ accounts, addToast, onBack }) {
  // Reactive DB queries
  const payouts = useLiveQuery(async () => {
    const row = await db.dailyJournals.get('payouts-data');
    if (!row || !row.postMarketNotes) return [];
    try {
      return JSON.parse(row.postMarketNotes);
    } catch (e) {
      console.error('Failed to parse payouts:', e);
      return [];
    }
  }, []) || [];

  // Sheet / Modal State
  const [showSheet, setShowSheet] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [propFirm, setPropFirm] = useState('');
  const [accountId, setAccountId] = useState('');

  // Computations
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let thisMonthTotal = 0;
    let allTimeTotal = 0;
    const firms = new Set();

    payouts.forEach(p => {
      const pAmt = parseFloat(p.amount) || 0;
      allTimeTotal += pAmt;
      
      if (p.propFirm) {
        firms.add(p.propFirm.trim().toLowerCase());
      }

      if (p.date) {
        const pDate = new Date(p.date);
        if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
          thisMonthTotal += pAmt;
        }
      }
    });

    return {
      thisMonthTotal,
      allTimeTotal,
      firmsCount: firms.size,
      count: payouts.length
    };
  }, [payouts]);

  // Currency helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPropFirm('');
    setAccountId('');
    setShowSheet(true);
  };

  const handleOpenEdit = (payout) => {
    setEditingId(payout.id);
    setAmount(payout.amount.toString());
    setDate(payout.date);
    setPropFirm(payout.propFirm);
    setAccountId(payout.accountId || '');
    setShowSheet(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || !date || !propFirm) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      addToast('Please enter a valid amount.', 'error');
      return;
    }

    let updatedPayouts;
    if (editingId) {
      updatedPayouts = payouts.map(p => p.id === editingId ? { ...p, amount: numericAmount, date, propFirm, accountId } : p);
    } else {
      updatedPayouts = [
        ...payouts,
        {
          id: `payout-${Date.now()}`,
          amount: numericAmount,
          date,
          propFirm,
          accountId
        }
      ];
    }

    // Sort descending
    updatedPayouts.sort((a, b) => b.date.localeCompare(a.date));

    // Save to synced dailyJournals table
    try {
      await db.dailyJournals.put({
        date: 'payouts-data',
        status: 'COMPLETED',
        postMarketNotes: JSON.stringify(updatedPayouts)
      });
      addToast(editingId ? 'Payout updated.' : 'Payout logged.', 'success');
      setShowSheet(false);
    } catch (err) {
      addToast('Failed to save payout.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payout?')) return;
    
    const updatedPayouts = payouts.filter(p => p.id !== id);
    try {
      await db.dailyJournals.put({
        date: 'payouts-data',
        status: 'COMPLETED',
        postMarketNotes: JSON.stringify(updatedPayouts)
      });
      addToast('Payout deleted.', 'success');
      setShowSheet(false);
    } catch (err) {
      addToast('Failed to delete payout.', 'error');
    }
  };

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center', outline: 'none' }}>
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>payouts.</h1>
          </div>
          
          <button
            onClick={handleOpenAdd}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px'
      }}>
        {/* Horizontal Widget Scroll */}
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Card 1: This Month */}
          <div style={{
            flex: '0 0 140px',
            background: '#0f0f11',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
              This Month
            </span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#30d158' }}>
              {formatCurrency(stats.thisMonthTotal)}
            </span>
          </div>

          {/* Card 2: Total */}
          <div style={{
            flex: '0 0 140px',
            background: '#0f0f11',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
              All-Time
            </span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
              {formatCurrency(stats.allTimeTotal)}
            </span>
          </div>

          {/* Card 3: Partners */}
          <div style={{
            flex: '0 0 140px',
            background: '#0f0f11',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
              Prop Firms
            </span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
              {stats.firmsCount} {stats.firmsCount === 1 ? 'Firm' : 'Firms'}
            </span>
          </div>
        </div>

        {/* Transaction History Header */}
        <h2 style={{
          fontSize: '14px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '12px',
          marginTop: '8px'
        }}>
          transaction history.
        </h2>

        {/* Payouts list */}
        {payouts.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '13px',
            background: '#0f0f11',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <DollarSign size={24} style={{ opacity: 0.4 }} />
            <span>No payouts logged. Tap + to begin.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {payouts.map(p => {
              const relatedAccount = accounts.find(a => a.id === p.accountId);
              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  style={{
                    background: '#0f0f11',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
                      {p.propFirm}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {p.date ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      {relatedAccount && ` · ${relatedAccount.name}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#30d158' }}>
                      +{formatCurrency(p.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-up Bottom Sheet */}
      <AnimatePresence>
        {showSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000
              }}
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#0f0f11',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '24px 20px 40px',
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              {/* Sheet Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                  {editingId ? 'Edit Payout' : 'Log Payout'}
                </h3>
                <button
                  onClick={() => setShowSheet(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form fields */}
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Prop Firm */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    Prop Firm / Partner
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Landmark size={14} style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Apex, FTMO"
                      value={propFirm}
                      onChange={(e) => setPropFirm(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: '#161618',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 36px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Amount */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    Payout Amount (USD)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: '#161618',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 36px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    Payout Date
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Calendar size={14} style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: '#161618',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 36px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Account Tag */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    Related Account (Optional)
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#161618',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">— Select Account —</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.propFirm || 'Personal'})</option>
                    ))}
                  </select>
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingId)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,69,58,0.1)',
                        border: '1px solid rgba(255,69,58,0.3)',
                        borderRadius: '10px',
                        padding: '12px',
                        color: '#ff453a',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        outline: 'none'
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    style={{
                      flex: editingId ? 2 : 1,
                      background: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      color: '#000000',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    <span>{editingId ? 'Save Changes' : 'Save Payout'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
