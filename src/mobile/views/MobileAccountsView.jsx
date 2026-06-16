import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import {
  CreditCard, Plus, Trash2, Edit2, X, Check, ChevronLeft
} from 'lucide-react';

const getTypeStyles = (type) => {
  switch (type) {
    case 'Funded':
      return {
        color: '#30d158', // Emerald Green
        bg: 'rgba(48, 209, 88, 0.12)',
        bgActive: 'rgba(48, 209, 88, 0.22)',
        gradient: 'linear-gradient(135deg, rgba(48, 209, 88, 0.25) 0%, rgba(48, 209, 88, 0.05) 100%)',
        border: 'rgba(48, 209, 88, 0.3)'
      };
    case 'Evaluation':
      return {
        color: '#0a84ff', // Blue
        bg: 'rgba(10, 132, 255, 0.12)',
        bgActive: 'rgba(10, 132, 255, 0.22)',
        gradient: 'linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(10, 132, 255, 0.05) 100%)',
        border: 'rgba(10, 132, 255, 0.3)'
      };
    case 'Personal':
      return {
        color: '#bf5af2', // Purple
        bg: 'rgba(191, 90, 242, 0.12)',
        bgActive: 'rgba(191, 90, 242, 0.22)',
        gradient: 'linear-gradient(135deg, rgba(191, 90, 242, 0.25) 0%, rgba(191, 90, 242, 0.05) 100%)',
        border: 'rgba(191, 90, 242, 0.3)'
      };
    default:
      return {
        color: '#ff9f0a', // Orange
        bg: 'rgba(255, 159, 10, 0.12)',
        bgActive: 'rgba(255, 159, 10, 0.22)',
        gradient: 'linear-gradient(135deg, rgba(255, 159, 10, 0.25) 0%, rgba(255, 159, 10, 0.05) 100%)',
        border: 'rgba(255, 159, 10, 0.3)'
      };
  }
};

export default function MobileAccountsView({ selectedAccountId, setSelectedAccountId, accounts, addToast, onBack }) {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('Funded');
  const [newAccBalance, setNewAccBalance] = useState(100000);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 10);
  };

  const handleAddAccount = async () => {
    if (!newAccName.trim()) return;
    const id = `acc-${Date.now()}`;
    await db.accounts.add({
      id,
      name: newAccName.trim(),
      type: newAccType,
      balance: newAccBalance,
      profitTarget: 0,
      maxLoss: 0,
      drawdownLimit: 0,
      maxDailyLoss: 0,
      minDays: 0
    });
    setSelectedAccountId(id);
    setNewAccName('');
    setShowAddAccount(false);
    addToast('Account created.', 'success');
  };

  const handleEditAccount = async () => {
    if (!newAccName.trim() || !editingAccount) return;
    await db.accounts.update(editingAccount.id, {
      name: newAccName.trim(),
      type: newAccType,
      balance: newAccBalance
    });
    setEditingAccount(null);
    setNewAccName('');
    addToast('Account updated.', 'success');
  };

  const openEditAccount = (acc) => {
    setEditingAccount(acc);
    setNewAccName(acc.name);
    setNewAccType(acc.type || 'Funded');
    setNewAccBalance(acc.balance || 0);
  };

  const handleDeleteAccount = async (id) => {
    if (accounts.length <= 1) {
      addToast('Cannot delete last account.', 'error');
      return;
    }
    if (!window.confirm('Delete this account and all associated trades?')) return;
    try {
      const referencedTrades = await db.trades.where('accountId').equals(id).toArray();
      const tradeIds = referencedTrades.map(t => t.id);
      
      if (tradeIds.length > 0) {
        await db.executions.where('tradeId').anyOf(tradeIds).delete();
      }
      
      await db.trades.where('accountId').equals(id).delete();
      await db.accounts.delete(id);
      
      if (selectedAccountId === id) {
        const remaining = accounts.filter(a => a.id !== id);
        if (remaining.length > 0) setSelectedAccountId(remaining[0].id);
      }
      addToast('Account deleted.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Delete failed.', 'error');
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: '#000' }}>
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
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              marginRight: 4
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <div style={{
            opacity: isScrolled ? 0 : 1,
            transform: isScrolled ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: isScrolled ? 'none' : 'auto'
          }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0, marginBottom: 2 }}>
              accounts.
            </h1>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {accounts.length} active trading account{accounts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setNewAccName('');
            setNewAccType('Funded');
            setNewAccBalance(100000);
            setShowAddAccount(true);
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <Plus size={13} />
          <span>Add New</span>
        </button>
      </div>

      {/* Scrollable Container */}
      <div 
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(var(--safe-top) + 88px)',
          paddingBottom: 'calc(64px + var(--safe-bottom) + 24px)'
        }}
      >
        <div style={{ height: 16 }} />
        {['Funded', 'Evaluation', 'Personal', 'Other'].map(type => {
          const typeAccounts = accounts.filter(a => (a.type || 'Funded') === type || (type === 'Other' && !['Funded', 'Evaluation', 'Personal'].includes(a.type)));
          if (typeAccounts.length === 0) return null;
          
          const styles = getTypeStyles(type);
          return (
            <div key={type} style={{ marginBottom: 20 }}>
              <div style={{ padding: '0 20px 8px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{type}</div>
              <div style={{ margin: '0 16px', background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {typeAccounts.map((acc, i) => {
                  const isSelected = selectedAccountId === acc.id;
                  return (
                    <div key={acc.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 16px',
                      borderBottom: i < typeAccounts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      gap: 12
                    }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: styles.gradient,
                        border: `1px solid ${isSelected ? styles.color : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CreditCard size={18} color={styles.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                          balance: <span style={{ color: '#fff', fontWeight: 500 }}>${(acc.balance || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!isSelected && (
                          <button
                            onClick={() => setSelectedAccountId(acc.id)}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8,
                              padding: '5px 10px',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            Select
                          </button>
                        )}
                        {isSelected && (
                          <div style={{
                            background: styles.bg,
                            border: `1px solid ${styles.border}`,
                            borderRadius: 8,
                            padding: '5px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: styles.color
                          }}>
                            Active
                          </div>
                        )}
                        <button
                          onClick={() => openEditAccount(acc)}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Edit2 size={13} color="rgba(255,255,255,0.8)" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          style={{
                            background: 'rgba(255,69,58,0.1)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '5px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={13} color="#ff453a" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Account Sheet */}
      <AnimatePresence>
        {(showAddAccount || editingAccount) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddAccount(false);
              setEditingAccount(null);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 500,
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
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 20px' }} />
              <div style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{editingAccount ? 'Edit Account' : 'New Account'}</span>
                  <button onClick={() => {
                    setShowAddAccount(false);
                    setEditingAccount(null);
                  }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Account Name</div>
                  <input
                    value={newAccName}
                    onChange={e => setNewAccName(e.target.value)}
                    placeholder="e.g. Apex 100K Eval"
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

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Type</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Funded', 'Evaluation', 'Personal', 'Other'].map(t => {
                      const tStyles = getTypeStyles(t);
                      const isActive = newAccType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setNewAccType(t)}
                          style={{
                            background: isActive ? tStyles.bg : 'rgba(255,255,255,0.02)',
                            border: isActive ? `1px solid ${tStyles.color}` : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 20,
                            padding: '8px 14px',
                            color: isActive ? tStyles.color : 'rgba(255,255,255,0.5)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tStyles.color }} />
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Starting Balance</div>
                  <input
                    type="number"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(parseFloat(e.target.value) || 0)}
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
                  {/* Presets */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {[25000, 50000, 100000, 150000, 250000, 300000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setNewAccBalance(amt)}
                        style={{
                          background: newAccBalance === amt ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                          border: newAccBalance === amt ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.04)',
                          borderRadius: 8,
                          padding: '6px 12px',
                          color: newAccBalance === amt ? '#fff' : 'rgba(255,255,255,0.4)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          outline: 'none'
                        }}
                      >
                        ${amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={editingAccount ? handleEditAccount : handleAddAccount}
                  disabled={!newAccName.trim()}
                  style={{
                    width: '100%',
                    background: newAccName.trim() 
                      ? `linear-gradient(135deg, ${getTypeStyles(newAccType).color} 0%, ${getTypeStyles(newAccType).color}d0 100%)` 
                      : 'rgba(255,255,255,0.04)',
                    border: newAccName.trim() 
                      ? 'none' 
                      : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: newAccName.trim() ? ((newAccType === 'Personal' || newAccType === 'Evaluation') ? '#fff' : '#000') : 'rgba(255,255,255,0.2)',
                    cursor: newAccName.trim() ? 'pointer' : 'default',
                    transition: 'all 0.25s',
                    boxShadow: newAccName.trim() ? `0 4px 20px ${getTypeStyles(newAccType).color}25` : 'none',
                    outline: 'none'
                  }}
                >
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
