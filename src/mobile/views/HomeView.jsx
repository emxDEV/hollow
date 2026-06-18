import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ChevronDown,
  Award, Target, Zap, Clock, Check, X, CreditCard, Users, Layers, AlertCircle, Calendar
} from 'lucide-react';
import DateStrip from '../components/DateStrip';
import { calculateTradePnL, isTradeBE } from '../../utils/tradeMath';
import { db } from '../../db/hollowDb';
import { useLiveQuery } from 'dexie-react-hooks';
import HollowLogo from '../../components/HollowLogo';

const fmt = (n) => {
  if (n === undefined || n === null) return '$0.00';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
};

const fmtFull = (n) => {
  if (!n) return '$0.00';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${abs.toFixed(2)}`;
};

const fmtPct = (n) => (n !== null && n !== undefined ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` : '0%');

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

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export default function HomeView({
  trades, executions, accounts, selectedAccountId, setSelectedAccountId, onSelectTrade, onScrollChange
}) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const groups = useLiveQuery(() => db.groups.toArray()) || [];

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isScrolled, setIsScrolled] = useState(false);
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setIsScrolled(scrollTop > 10);
    if (onScrollChange) {
      onScrollChange(scrollTop);
    }
  };

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Filter to selected account / copy group
  const acctTrades = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return trades;
    if (selectedAccountId.startsWith('group-')) {
      const selectedGroup = groups.find(g => g.id === selectedAccountId);
      if (selectedGroup) {
        const groupAccs = [selectedGroup.leaderAccountId, ...(selectedGroup.followerAccountIds || [])].filter(Boolean);
        return trades.filter(t => groupAccs.includes(t.accountId));
      }
    }
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId, groups]);

  // Enrich with PnL
  const enriched = useMemo(() => acctTrades.map(t => {
    const execs = executions.filter(e => e.tradeId === t.id);
    const { netPnL } = calculateTradePnL(t, execs);
    return { ...t, netPnL };
  }), [acctTrades, executions]);

  // Daily trades
  const dailyTrades = useMemo(() =>
    enriched.filter(t => t.date === selectedDate).sort((a, b) => b.netPnL - a.netPnL),
    [enriched, selectedDate]
  );

  const dailyPnL = useMemo(() =>
    dailyTrades.reduce((s, t) => s + t.netPnL, 0), [dailyTrades]
  );

  // All-time stats
  const allStats = useMemo(() => {
    const total = enriched.reduce((s, t) => s + t.netPnL, 0);
    const wins = enriched.filter(t => t.netPnL > 0);
    const losses = enriched.filter(t => t.netPnL < 0);
    const winRate = enriched.length > 0 ? (wins.length / enriched.length) * 100 : 0;
    const totalWin = wins.reduce((s, t) => s + t.netPnL, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));
    const pf = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 9.99 : 0;
    return { total, winRate, pf, count: enriched.length };
  }, [enriched]);

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return null;
    return accounts.find(a => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const rulesCompliance = useMemo(() => {
    if (!selectedAccount) return null;

    const currentBalance = Math.round((selectedAccount.balance || 0) + allStats.total);
    const capital = selectedAccount.capital || selectedAccount.balance || 0;
    const profitTargetGoal = selectedAccount.profitTarget || 0;
    const currentProfit = currentBalance - capital;

    let profitProgress = 0;
    if (profitTargetGoal > capital) {
      const targetDifference = profitTargetGoal - capital;
      profitProgress = Math.max(0, Math.min(100, (currentProfit / targetDifference) * 100));
    }

    // 1. Unique active days
    const uniqueDates = new Set(enriched.map(t => t.date));
    const activeDays = uniqueDates.size;
    const requiredTradingDays = selectedAccount.minTradingDays || 0;

    // 2. Daily Loss Tracker
    const acctDailyPnL = dailyPnL;
    const dailyLossLimit = selectedAccount.maxDailyLoss || 0;
    let dailyLossBudgetPct = 100;
    if (dailyLossLimit > 0) {
      const remainingBudget = Math.max(0, dailyLossLimit + acctDailyPnL);
      dailyLossBudgetPct = (remainingBudget / dailyLossLimit) * 100;
    }

    // 3. Trailing Drawdown calculation
    const chronologicalTrades = [...enriched].sort((a, b) => a.date.localeCompare(b.date));
    let runningBalance = selectedAccount.balance || 0;
    let runningPeak = runningBalance;

    chronologicalTrades.forEach(t => {
      runningBalance += (t.netPnL || 0);
      if (runningBalance > runningPeak) {
        runningPeak = runningBalance;
      }
    });

    const drawdownLimit = selectedAccount.drawdownLimit || 0;
    let trailingLimit = runningPeak - drawdownLimit;
    if (selectedAccount.drawdownType === 'Trailing' && trailingLimit > capital) {
      trailingLimit = capital;
    }

    let breachLimit = 0;
    if (selectedAccount.drawdownType === 'Trailing') {
      breachLimit = trailingLimit;
    } else if (selectedAccount.drawdownType === 'Static') {
      breachLimit = selectedAccount.maxLoss || (capital - drawdownLimit);
    } else if (selectedAccount.drawdownType === 'Daily') {
      breachLimit = selectedAccount.maxLoss || (capital - drawdownLimit);
    } else {
      breachLimit = selectedAccount.maxLoss || 0;
    }

    const distanceToBreach = breachLimit > 0 ? (currentBalance - breachLimit) : 0;

    return {
      currentBalance,
      capital,
      profitTargetGoal,
      currentProfit,
      profitProgress,
      activeDays,
      requiredTradingDays,
      dailyPnL: acctDailyPnL,
      dailyLossLimit,
      dailyLossBudgetPct,
      runningPeak,
      breachLimit,
      distanceToBreach,
      evalStatus: selectedAccount.evaluationStatus || 'Active',
      drawdownType: selectedAccount.drawdownType || 'None'
    };
  }, [selectedAccount, enriched, allStats.total, dailyPnL]);

  // Equity curve (last 30 days)
  const equityCurve = useMemo(() => {
    const byDate = {};
    enriched.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = 0;
      byDate[t.date] += t.netPnL;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    let cum = 0;
    return sorted.map(([date, pnl]) => {
      cum += pnl;
      return {
        date: date.slice(5),
        value: Math.round(cum * 100) / 100,
        pnl: Math.round(pnl * 100) / 100
      };
    });
  }, [enriched]);

  // Trade dates for strip dots
  const tradeDates = useMemo(() => [...new Set(enriched.map(t => t.date))], [enriched]);

  // Recent trades (last 5)
  const recentTrades = useMemo(() =>
    [...enriched].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [enriched]
  );

  // Calendar daily calculations
  const calendarDays = useMemo(() => {
    const days = [];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    // Find all non-Sunday days
    const activeDays = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const dObj = new Date(calYear, calMonth, dayNum);
      const wDay = dObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      if (wDay === 0) continue; // Skip Sundays

      const monSatIndex = wDay - 1; // 0 = Mon, 1 = Tue, ..., 5 = Sat
      activeDays.push({ dayNum, dateStr, monSatIndex });
    }

    if (activeDays.length === 0) return [];

    // The first active day's monSatIndex tells us how many padding days we need at the start
    const startOffset = activeDays[0].monSatIndex;
    for (let i = 0; i < startOffset; i++) {
      days.push({ isPadding: true, key: `pad-${i}` });
    }

    // Now push all the active days
    activeDays.forEach(day => {
      const dayTrades = enriched.filter(t => t.date === day.dateStr);
      const dayNetPnL = dayTrades.reduce((sum, t) => sum + t.netPnL, 0);
      let winCount = 0;
      dayTrades.forEach(t => { if (t.netPnL > 0) winCount++; });
      const winPct = dayTrades.length > 0 ? Math.round((winCount / dayTrades.length) * 100) : 0;
      
      days.push({
        isPadding: false,
        dayNum: day.dayNum,
        dateString: day.dateStr,
        tradesCount: dayTrades.length,
        netPnL: dayNetPnL,
        winRate: winPct,
        firstTradeId: dayTrades[0]?.id || null,
        key: `day-${day.dayNum}`
      });
    });

    return days;
  }, [enriched, calYear, calMonth]);

  const calPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

  const calMonthlyStats = useMemo(() => {
    const monthTrades = enriched.filter(t => t.date.startsWith(calPrefix));
    const totalPnL = monthTrades.reduce((sum, t) => sum + t.netPnL, 0);
    const activeDaysCount = new Set(monthTrades.map(t => t.date)).size;
    return { pnl: totalPnL, days: activeDaysCount };
  }, [enriched, calPrefix]);

  const currentDisplayName = useMemo(() => {
    if (selectedAccountId === 'all') return 'All Accounts';
    if (selectedAccountId && selectedAccountId.startsWith('group-')) {
      const grp = groups.find(g => g.id === selectedAccountId);
      return grp ? grp.name : 'Group';
    }
    const acc = accounts.find(a => a.id === selectedAccountId);
    return acc ? acc.name : 'Select Account';
  }, [selectedAccountId, accounts, groups]);

  const isPositiveDay = dailyPnL >= 0;
  const isPositiveOverall = allStats.total >= 0;

  const kpis = [
    { label: 'Win Rate', value: `${allStats.winRate.toFixed(0)}%`, sub: `${enriched.filter(t => t.netPnL > 0).length} wins`, color: '#30d158' },
    { label: 'Profit Factor', value: allStats.pf.toFixed(2), sub: 'p&l ratio', color: '#0a84ff' },
    { label: 'Total Trades', value: allStats.count, sub: 'all time', color: '#bf5af2' },
    { label: 'Total P&L', value: fmt(allStats.total), sub: 'net p&l', color: isPositiveOverall ? '#30d158' : '#ff453a' },
  ];

  // Navigate dates
  const shiftDate = (dir) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: isScrolled ? 0 : 1,
          transform: isScrolled ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isScrolled ? 'none' : 'auto'
        }}>
          <HollowLogo size={20} showText={true} color="#ffffff" />
        </div>
        {/* Account badge */}
        <div 
          onClick={() => setShowAccountMenu(!showAccountMenu)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 20,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentDisplayName.toLowerCase()}
          </span>
          <ChevronDown size={13} color="rgba(255, 255, 255, 0.6)" />
        </div>
      </div>

      <AnimatePresence>
        {showAccountMenu && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccountMenu(false)}
              className="bottom-sheet-overlay"
              style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            />
            {/* Bottom sheet content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={e => e.stopPropagation()}
              className="bottom-sheet"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh',
                overflow: 'hidden',
                background: '#0f0f11',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px 24px 0 0',
                paddingBottom: 'calc(var(--safe-bottom) + 16px)'
              }}
            >
              <div className="sheet-handle" style={{ margin: '12px auto 8px' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Select Account</span>
                <button 
                  onClick={() => setShowAccountMenu(false)} 
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable list of accounts */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Special/Overview Row: All Accounts */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <button
                    onClick={() => {
                      setSelectedAccountId('all');
                      setShowAccountMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: selectedAccountId === 'all' ? 'rgba(10, 132, 255, 0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedAccountId === 'all' ? '#0a84ff' : 'rgba(255,255,255,0.04)'}`,
                      borderRadius: 14,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%)',
                        border: `1px solid ${selectedAccountId === 'all' ? '#0a84ff' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: selectedAccountId === 'all' ? '#0a84ff' : 'rgba(255,255,255,0.6)'
                      }}>
                        <Layers size={16} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>All Accounts</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>Consolidated view of all trades</span>
                      </div>
                    </div>
                    {selectedAccountId === 'all' && <Check size={16} color="#0a84ff" strokeWidth={3} />}
                  </button>
                </div>

                {/* Accounts grouped by type */}
                {['Funded', 'Evaluation', 'Personal', 'Other'].map(type => {
                  const typeAccounts = accounts.filter(a => (a.type || 'Funded') === type || (type === 'Other' && !['Funded', 'Evaluation', 'Personal'].includes(a.type)));
                  if (typeAccounts.length === 0) return null;

                  const styles = getTypeStyles(type);
                  return (
                    <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>
                        {type}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        {typeAccounts.map((acc, i) => {
                          const isSelected = selectedAccountId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              onClick={() => {
                                setSelectedAccountId(acc.id);
                                setShowAccountMenu(false);
                              }}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: isSelected ? styles.bg : 'none',
                                border: 'none',
                                borderBottom: i < typeAccounts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                outline: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 8,
                                  background: styles.gradient,
                                  border: `1px solid ${isSelected ? styles.color : 'rgba(255,255,255,0.08)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: styles.color
                                }}>
                                  <CreditCard size={16} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500 }}>{acc.name}</span>
                                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                    balance: <span style={{ color: '#fff', fontWeight: 500 }}>${(acc.balance || 0).toLocaleString()}</span>
                                  </span>
                                </div>
                              </div>
                              {isSelected && <Check size={16} color={styles.color} strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Copy Groups */}
                {groups.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4 }}>
                      Copy Groups
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      {groups.map((g, i) => {
                        const isSelected = selectedAccountId === g.id;
                        return (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSelectedAccountId(g.id);
                              setShowAccountMenu(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: isSelected ? 'rgba(255, 159, 10, 0.06)' : 'none',
                              border: 'none',
                              borderBottom: i < groups.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                              color: '#fff',
                              fontSize: 14,
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              outline: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.2) 0%, rgba(255, 159, 10, 0.04) 100%)',
                                border: `1px solid ${isSelected ? '#ff9f0a' : 'rgba(255,255,255,0.08)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ff9f0a'
                              }}>
                                <Users size={16} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500 }}>{g.name}</span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                  {[g.leaderAccountId, ...(g.followerAccountIds || [])].filter(Boolean).length} accounts
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check size={16} color="#ff9f0a" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scrollable Content */}
      <div 
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(var(--safe-top) + 80px)',
          paddingBottom: 'calc(64px + var(--safe-bottom) + 24px)'
        }}
      >
        {/* Hero Daily P&L Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: '0 16px', marginBottom: 20 }}
        >
          <div style={{
            background: isPositiveDay
              ? 'linear-gradient(135deg, #0d2b1a 0%, #0f3320 100%)'
              : 'linear-gradient(135deg, #2b0d0d 0%, #331010 100%)',
            border: `1px solid ${isPositiveDay ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
            borderRadius: 20,
            padding: '24px 20px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* BG glow */}
            <div style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: isPositiveDay ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.08)',
              filter: 'blur(30px)'
            }} />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {isPositiveDay
                  ? <TrendingUp size={16} color="#30d158" />
                  : <TrendingDown size={16} color="#ff453a" />
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: isPositiveDay ? '#30d158' : '#ff453a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedDate === today ? "Today's P&L" : `P&L · ${selectedDate}`}
                </span>
              </div>

              <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12, color: isPositiveDay ? '#30d158' : '#ff453a' }}>
                {fmtFull(dailyPnL)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  {dailyTrades.length} {dailyTrades.length === 1 ? 'trade' : 'trades'}
                </span>
                {dailyTrades.length > 0 && (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {dailyTrades.filter(t => t.netPnL > 0).length} wins · {dailyTrades.filter(t => t.netPnL < 0).length} losses
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account stats widget on mobile dashboard */}
        {selectedAccountId && selectedAccountId !== 'all' && !selectedAccountId.startsWith('group-') && selectedAccount && rulesCompliance && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ padding: '0 16px', marginBottom: 20 }}
          >
            <div style={{
              background: '#0f0f11',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: getTypeStyles(selectedAccount.type || 'Funded').gradient,
                    border: `1px solid ${getTypeStyles(selectedAccount.type || 'Funded').color}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getTypeStyles(selectedAccount.type || 'Funded').color
                  }}>
                    <CreditCard size={14} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'lowercase' }}>
                      {selectedAccount.propFirm ? selectedAccount.propFirm.toLowerCase() : 'custom firm'}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 1, textTransform: 'lowercase' }}>
                      {selectedAccount.name ? selectedAccount.name.toLowerCase() : 'unnamed'} ({selectedAccount.type ? selectedAccount.type.toLowerCase() : 'account'})
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'lowercase' }}>account balance</span>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                      ${rulesCompliance.currentBalance.toLocaleString()}
                    </span>
                    {(() => {
                      const statusColors = {
                        active: '#0a84ff',
                        passed: '#30d158',
                        failed: '#ff453a',
                        payout: '#bf5af2'
                      };
                      const statusColor = statusColors[rulesCompliance.evalStatus.toLowerCase()] || 'rgba(255,255,255,0.4)';
                      return (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: `${statusColor}1A`,
                          border: `1px solid ${statusColor}4D`,
                          color: statusColor,
                          padding: '1px 5px',
                          borderRadius: '8px',
                          marginLeft: 6,
                          textTransform: 'lowercase',
                          lineHeight: 1
                        }}>
                          {rulesCompliance.evalStatus.toLowerCase()}.
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.06)', margin: '12px 0' }} />

              {/* Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Profit Target */}
                {rulesCompliance.profitTargetGoal > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase' }}>profit target</span>
                      <span style={{ fontWeight: '600', color: '#fff' }}>
                        ${Math.round(rulesCompliance.currentProfit).toLocaleString()} / ${(rulesCompliance.profitTargetGoal - rulesCompliance.capital).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${rulesCompliance.profitProgress}%`, height: '100%', background: '#30d158', borderRadius: 2 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase' }}>profit target</span>
                    <span style={{ fontWeight: '500', color: 'rgba(255,255,255,0.35)' }}>no target set.</span>
                  </div>
                )}

                {/* Drawdown limit */}
                {rulesCompliance.drawdownType !== 'None' ? (
                  rulesCompliance.drawdownType === 'Daily' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)' }}>
                          <AlertCircle size={11} color="rgba(255,255,255,0.6)" />
                          <span style={{ textTransform: 'lowercase' }}>daily loss limit</span>
                        </div>
                        <span style={{ fontWeight: '600', color: rulesCompliance.dailyPnL < 0 ? '#ff453a' : '#30d158' }}>
                          {rulesCompliance.dailyPnL >= 0 ? '+' : ''}${Math.round(rulesCompliance.dailyPnL).toLocaleString()} / -${rulesCompliance.dailyLossLimit.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${rulesCompliance.dailyLossBudgetPct}%`,
                          height: '100%',
                          background: rulesCompliance.dailyLossBudgetPct > 50 
                            ? '#30d158' 
                            : (rulesCompliance.dailyLossBudgetPct > 20 ? '#ff9f0a' : '#ff453a'),
                          borderRadius: 2
                        }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)' }}>
                          <AlertCircle size={11} color="rgba(255,255,255,0.6)" />
                          <span style={{ textTransform: 'lowercase' }}>{rulesCompliance.drawdownType.toLowerCase()} limit</span>
                        </div>
                        <span style={{ fontWeight: '600', color: '#fff' }}>
                          limit: ${Math.round(rulesCompliance.breachLimit).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, background: 'rgba(255,255,255,0.02)', padding: '5px 8px', borderRadius: 6 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, textTransform: 'lowercase' }}>
                            {rulesCompliance.drawdownType === 'Trailing' ? 'peak balance' : 'starting bal'}
                          </span>
                          <span style={{ fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                            ${Math.round(rulesCompliance.drawdownType === 'Trailing' ? rulesCompliance.runningPeak : rulesCompliance.capital).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, textTransform: 'lowercase' }}>breach distance</span>
                          <span style={{ 
                            fontWeight: '700', 
                            color: rulesCompliance.distanceToBreach > 1000 ? '#30d158' : (rulesCompliance.distanceToBreach > 0 ? '#ff9f0a' : '#ff453a'),
                            marginTop: 1 
                          }}>
                            ${Math.round(rulesCompliance.distanceToBreach).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase' }}>drawdown limit</span>
                    <span style={{ fontWeight: '500', color: 'rgba(255,255,255,0.35)' }}>no drawdown limit.</span>
                  </div>
                )}

                {/* Active Trading Days */}
                {rulesCompliance.requiredTradingDays > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)' }}>
                        <Calendar size={11} color="rgba(255,255,255,0.6)" />
                        <span style={{ textTransform: 'lowercase' }}>active trading days</span>
                      </div>
                      <span style={{ fontWeight: '600', color: '#fff' }}>
                        {rulesCompliance.activeDays} / {rulesCompliance.requiredTradingDays} days
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 3, width: '100%', marginTop: 1 }}>
                      {Array.from({ length: rulesCompliance.requiredTradingDays }).map((_, dIdx) => {
                        const isDayFilled = dIdx < rulesCompliance.activeDays;
                        return (
                          <div 
                            key={dIdx}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 1.5,
                              background: isDayFilled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase' }}>trading days</span>
                    <span style={{ fontWeight: '500', color: 'rgba(255,255,255,0.35)' }}>no minimum days.</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Date Strip */}
        <div style={{ marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {new Date(selectedDate).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => shiftDate(-7)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => shiftDate(7)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <DateStrip
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            tradeDates={tradeDates}
          />
        </div>

        {/* Equity Curve Chart */}
        <div style={{ marginBottom: 20, padding: '0 16px' }}>
          <div style={{
            background: '#0f0f11',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 0 8px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Equity Curve
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: isPositiveOverall ? '#30d158' : '#ff453a', letterSpacing: '-0.02em' }}>
                {fmtFull(allStats.total)}
              </div>
            </div>
            <div style={{ height: 100, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve.length > 0 ? equityCurve : [{ date: 'no trades', value: 0 }]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositiveOverall ? '#30d158' : '#ff453a'} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isPositiveOverall ? '#30d158' : '#ff453a'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isPositiveOverall ? '#30d158' : '#ff453a'}
                    strokeWidth={2}
                    fill="url(#curveGrad)"
                    dot={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [`$${v.toFixed(2)}`, 'Equity']}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: '#0f0f11',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '16px 14px',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: k.color, marginBottom: 4 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                  {k.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {k.sub}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Daily Trades */}
        {dailyTrades.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', marginBottom: 12 }}>
              Trades · {selectedDate === today ? 'Today' : selectedDate}
            </div>
            <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              {dailyTrades.map((t, i) => {
                const isBE = isTradeBE(t);
                const isWin = !isBE && t.netPnL > 0;
                const isLoss = !isBE && t.netPnL < 0;

                let iconBg = 'rgba(255,255,255,0.06)';
                let iconColor = 'rgba(255,255,255,0.4)';
                let valueColor = 'rgba(255,255,255,0.5)';

                if (isWin) {
                  iconBg = 'rgba(48,209,88,0.12)';
                  iconColor = '#30d158';
                  valueColor = '#30d158';
                } else if (isLoss) {
                  iconBg = 'rgba(255,69,58,0.12)';
                  iconColor = '#ff453a';
                  valueColor = '#ff453a';
                } else if (isBE) {
                  iconBg = 'rgba(255,159,10,0.12)';
                  iconColor = '#ff9f0a';
                  valueColor = '#ff9f0a';
                }

                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTrade(t.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: i < dailyTrades.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      cursor: 'pointer',
                      gap: 12,
                      textAlign: 'left',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isWin ? (
                        <TrendingUp size={16} color={iconColor} />
                      ) : isLoss ? (
                        <TrendingDown size={16} color={iconColor} />
                      ) : isBE ? (
                        <div style={{ fontSize: 10, fontWeight: 800, color: iconColor }}>BE</div>
                      ) : (
                        <div style={{ width: 8, height: 2, background: iconColor, borderRadius: 1 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                        {t.symbol || 'Unknown'}
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>
                          {t.bias}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.model || '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: valueColor, letterSpacing: '-0.01em', flexShrink: 0 }}>
                      {fmt(t.netPnL)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {dailyTrades.length === 0 && (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>No trades this day</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Tap + to log a trade</div>
          </div>
        )}

        {/* Resized P&L Calendar */}
        <div style={{ padding: '0 16px', marginBottom: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', textTransform: 'lowercase' }}>
              calendar.
            </span>
            {/* Monthly stats pill */}
            <div style={{
              display: 'flex',
              gap: 6,
              fontSize: 11,
              background: 'rgba(255,255,255,0.04)',
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.06)',
              fontWeight: 600
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>monthly:</span>
              <span style={{ color: calMonthlyStats.pnl >= 0 ? '#30d158' : '#ff453a' }}>
                {calMonthlyStats.pnl >= 0 ? '+' : ''}${Math.abs(calMonthlyStats.pnl) >= 1000 ? (calMonthlyStats.pnl / 1000).toFixed(1) + 'k' : Math.round(calMonthlyStats.pnl)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <span style={{ color: '#0a84ff' }}>
                {calMonthlyStats.days}d
              </span>
            </div>
          </div>

          {/* Month selector row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '2px'
            }}>
              <button
                onClick={() => {
                  setCalMonth(prev => {
                    if (prev === 0) { setCalYear(y => y - 1); return 11; }
                    return prev - 1;
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '0 4px', minWidth: 90, textAlign: 'center', textTransform: 'lowercase', letterSpacing: '-0.01em' }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={() => {
                  setCalMonth(prev => {
                    if (prev === 11) { setCalYear(y => y + 1); return 0; }
                    return prev + 1;
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              onClick={() => {
                const now = new Date();
                setCalYear(now.getFullYear());
                setCalMonth(now.getMonth());
              }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                color: '#fff',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              this month
            </button>
          </div>

          {/* Calendar Grid Container */}
          <div style={{
            background: '#0f0f11',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            {/* Weekday Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
              {['m', 't', 'w', 't', 'f', 's'].map((d, idx) => (
                <div key={idx} style={{ textTransform: 'lowercase' }}>{d}</div>
              ))}
            </div>

            {/* Grid Blocks (Auto Rows) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
              {calendarDays.map((day) => {
                if (day.isPadding) {
                  return <div key={day.key} style={{ aspectRatio: '1', background: 'transparent' }} />;
                }

                const hasTrades = day.tradesCount > 0;
                const tradesForDay = enriched.filter(t => t.date === day.dateString);
                const hasBETrade = tradesForDay.some(t => isTradeBE(t));
                const isStrictBE = hasTrades && (day.netPnL === 0 || hasBETrade);
                const isGain = hasTrades && !isStrictBE && day.netPnL > 0;
                const isLoss = hasTrades && !isStrictBE && day.netPnL < 0;
                const isSelected = selectedDate === day.dateString;

                let bg = 'rgba(255, 255, 255, 0.02)';
                let border = '1px solid rgba(255, 255, 255, 0.05)';

                if (hasTrades) {
                  if (isStrictBE) {
                    bg = isSelected ? 'rgba(255, 159, 10, 0.25)' : 'rgba(255, 159, 10, 0.12)';
                    border = `1px solid ${isSelected ? '#ff9f0a' : 'rgba(255, 159, 10, 0.25)'}`;
                  } else if (isGain) {
                    bg = isSelected ? 'rgba(48, 209, 88, 0.25)' : 'rgba(48, 209, 88, 0.12)';
                    border = `1px solid ${isSelected ? '#30d158' : 'rgba(48, 209, 88, 0.25)'}`;
                  } else {
                    bg = isSelected ? 'rgba(255, 69, 58, 0.25)' : 'rgba(255, 69, 58, 0.12)';
                    border = `1px solid ${isSelected ? '#ff453a' : 'rgba(255, 69, 58, 0.25)'}`;
                  }
                } else if (isSelected) {
                  bg = 'rgba(255, 255, 255, 0.12)';
                  border = '1px solid rgba(255, 255, 255, 0.3)';
                }

                const fmtCompactPnL = (val) => {
                  const abs = Math.round(Math.abs(val));
                  if (isStrictBE && val === 0) return '$0';
                  if (abs >= 1000) return `${val >= 0 ? '+' : '-'}${(abs / 1000).toFixed(1)}k`;
                  return `${val >= 0 ? '+' : '-'}$${abs}`;
                };

                return (
                  <div
                    key={day.key}
                    onClick={() => {
                      setSelectedDate(day.dateString);
                      if (hasTrades && day.firstTradeId) {
                        onSelectTrade(day.firstTradeId);
                      }
                    }}
                    style={{
                      aspectRatio: '1',
                      background: bg,
                      border: border,
                      borderRadius: 10,
                      padding: '6px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative'
                    }}
                  >
                    <span style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: hasTrades ? '#fff' : (isSelected ? '#fff' : 'rgba(255,255,255,0.3)'),
                      alignSelf: 'flex-start',
                      lineHeight: 1
                    }}>
                      {day.dayNum}
                    </span>

                    {hasTrades && (
                      <span style={{
                        fontSize: 8,
                        fontWeight: '800',
                        color: isGain ? '#30d158' : (isStrictBE ? '#ff9f0a' : '#ff453a'),
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        width: '100%',
                        alignSelf: 'center'
                      }}>
                        {fmtCompactPnL(day.netPnL)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
