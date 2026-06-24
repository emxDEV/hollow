import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { CircleDollarSign, Plus, Trash2, Edit3, DollarSign, Calendar, Landmark, Check, X } from 'lucide-react';
import useUIStore from '../store/useUIStore';

export default function PayoutsView() {
  const isMobile = useUIStore(state => state.isMobile);

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

  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [propFirm, setPropFirm] = useState('');
  const [accountId, setAccountId] = useState('');

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || !date || !propFirm) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

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

    // Sort payouts by date descending
    updatedPayouts.sort((a, b) => b.date.localeCompare(a.date));

    // Save to dailyJournals (synced)
    await db.dailyJournals.put({
      date: 'payouts-data',
      status: 'COMPLETED',
      postMarketNotes: JSON.stringify(updatedPayouts)
    });

    // Reset Form
    setEditingId(null);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPropFirm('');
    setAccountId('');
  };

  const handleEdit = (payout) => {
    setEditingId(payout.id);
    setAmount(payout.amount.toString());
    setDate(payout.date);
    setPropFirm(payout.propFirm);
    setAccountId(payout.accountId || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payout?')) return;
    const updatedPayouts = payouts.filter(p => p.id !== id);
    await db.dailyJournals.put({
      date: 'payouts-data',
      status: 'COMPLETED',
      postMarketNotes: JSON.stringify(updatedPayouts)
    });
    if (editingId === id) {
      setEditingId(null);
      setAmount('');
      setPropFirm('');
      setAccountId('');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPropFirm('');
    setAccountId('');
  };

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

    const average = payouts.length > 0 ? (allTimeTotal / payouts.length) : 0;

    return {
      thisMonthTotal,
      allTimeTotal,
      average,
      count: payouts.length,
      firmsCount: firms.size
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Title Header */}
      <div style={{
        padding: '30px 40px 10px',
        borderBottom: '1px solid #1c1c1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            margin: 0
          }}>
            payouts.
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '4px'
          }}>
            track your prop firm and account payouts in real-time.
          </p>
        </div>
      </div>

      {/* Main Scroll Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '30px 40px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px'
      }}>
        {/* Little Widgets Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {/* Card 1: This Month */}
          <div style={{
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(48,209,88,0.08) 0%, rgba(0,0,0,0) 70%)',
              pointerEvents: 'none'
            }} />
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>
              made this month
            </span>
            <span style={{ fontSize: '32px', fontWeight: '800', color: '#30d158', letterSpacing: '-1px' }}>
              {formatCurrency(stats.thisMonthTotal)}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              from active funded accounts
            </span>
          </div>

          {/* Card 2: All-Time */}
          <div style={{
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 70%)',
              pointerEvents: 'none'
            }} />
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>
              total payouts
            </span>
            <span style={{ fontSize: '32px', fontWeight: '800', color: '#ffffff', letterSpacing: '-1px' }}>
              {formatCurrency(stats.allTimeTotal)}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              across {stats.count} transaction{stats.count !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Card 3: Average Payout */}
          <div style={{
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>
              average size
            </span>
            <span style={{ fontSize: '32px', fontWeight: '800', color: '#ffffff', letterSpacing: '-1px' }}>
              {formatCurrency(stats.average)}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              per requested payout
            </span>
          </div>

          {/* Card 4: Prop Firms */}
          <div style={{
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)' }}>
              active prop firms
            </span>
            <span style={{ fontSize: '32px', fontWeight: '800', color: '#ffffff', letterSpacing: '-1px' }}>
              {stats.firmsCount}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              distinct partners funded
            </span>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{
          display: 'flex',
          gap: '30px',
          flexWrap: 'wrap-reverse'
        }}>
          {/* Left Panel: Payout History */}
          <div style={{
            flex: '2 1 600px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '20px',
                letterSpacing: '-0.3px'
              }}>
                transaction history.
              </h2>

              {payouts.length === 0 ? (
                <div style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <CircleDollarSign size={40} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <div>no payouts logged yet. use the panel to log your first payout.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1c1c1e' }}>
                        <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>Date</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>Prop Firm</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>Account</th>
                        <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '12px 16px', width: '90px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => {
                        const relatedAccount = accounts.find(a => a.id === p.accountId);
                        return (
                          <tr
                            key={p.id}
                            style={{
                              borderBottom: '1px solid #1c1c1e',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#161618'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                              {p.date ? new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                              {p.propFirm}
                            </td>
                            <td style={{ padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                              {relatedAccount ? relatedAccount.name : '—'}
                            </td>
                            <td style={{ padding: '16px', fontSize: '15px', fontWeight: '700', color: '#30d158', textAlign: 'right' }}>
                              +{formatCurrency(p.amount)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleEdit(p)}
                                  title="Edit Entry"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                  }}
                                  onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  title="Delete Entry"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,69,58,0.6)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                  }}
                                  onMouseOver={(e) => { e.currentTarget.style.color = '#ff453a'; e.currentTarget.style.background = 'rgba(255,69,58,0.1)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,69,58,0.6)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Add / Edit Form */}
          <div style={{
            flex: '1 1 300px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
              borderRadius: '16px',
              padding: '24px',
              position: 'sticky',
              top: '20px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '20px',
                letterSpacing: '-0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {editingId ? 'edit payout.' : 'log payout.'}
              </h2>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Prop Firm Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    Prop Firm / Partner
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Landmark size={14} style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Apex, FTMO, Funding Pips"
                      value={propFirm}
                      onChange={(e) => setPropFirm(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: '#161618',
                        border: '1px solid #1c1c1e',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 36px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                      onBlur={(e) => e.target.style.borderColor = '#1c1c1e'}
                    />
                  </div>
                </div>

                {/* Amount Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
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
                        border: '1px solid #1c1c1e',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 36px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                      onBlur={(e) => e.target.style.borderColor = '#1c1c1e'}
                    />
                  </div>
                </div>

                {/* Date Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
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
                        border: '1px solid #1c1c1e',
                        borderRadius: '10px',
                        padding: '10px 12px 10px 36px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                      onBlur={(e) => e.target.style.borderColor = '#1c1c1e'}
                    />
                  </div>
                </div>

                {/* Account Tag Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>
                    Related Account (Optional)
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#161618',
                      border: '1px solid #1c1c1e',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                    onBlur={(e) => e.target.style.borderColor = '#1c1c1e'}
                  >
                    <option value="">— Select Account —</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.propFirm || 'Personal'})</option>
                    ))}
                  </select>
                </div>

                {/* Submit Action */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid #1c1c1e',
                        borderRadius: '10px',
                        padding: '12px',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <X size={14} />
                      <span>cancel</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    style={{
                      flex: 2,
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
                      gap: '6px',
                      outline: 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f2f2f7'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <Check size={14} />
                    <span>{editingId ? 'save changes' : 'submit payout'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
