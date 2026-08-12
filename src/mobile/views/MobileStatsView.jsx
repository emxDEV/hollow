import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Zap,
  Clock,
  Shield,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Layers,
  Activity,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { calculateTradePnL, isTradeWinRateEligible } from '../../utils/tradeMath';
import { getPayouts, savePayouts } from '../../db/hollowDb';

const fmt = (n) => {
  if (!n && n !== 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};

const STAT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'setupStats', label: 'Setup Stats' },
];

export default function MobileStatsView({ trades = [], executions = [], selectedAccountId = 'all', onSharePnL, onBack, onScrollChange }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeTableFilter, setActiveTableFilter] = useState('All'); // 'All' | 'Entry Timeframes' | 'DOL Targets' | 'PO3 Timings' | 'Models' | 'Ratings'

  // Payouts Tracker State & Dialog
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutsList, setPayoutsList] = useState([]);
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPropFirm, setFormPropFirm] = useState('');

  // Fetch payouts on mount
  useEffect(() => {
    async function load() {
      const data = await getPayouts();
      setPayoutsList(data || []);
    }
    load();
  }, []);

  const totalPayoutsSum = useMemo(() => {
    return payoutsList.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [payoutsList]);

  const handleAddPayout = async (e) => {
    e.preventDefault();
    if (!formAmount) return;
    const newPayout = {
      id: Date.now(),
      amount: parseFloat(formAmount) || 0,
      date: formDate || new Date().toISOString().split('T')[0],
      propFirm: formPropFirm || 'Apex'
    };
    const updated = [newPayout, ...payoutsList];
    setPayoutsList(updated);
    await savePayouts(updated);
    
    // Reset form
    setFormAmount('');
    setFormPropFirm('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeletePayout = async (id) => {
    const updated = payoutsList.filter(p => p.id !== id);
    setPayoutsList(updated);
    await savePayouts(updated);
  };

  // Filter trades based on active account
  const acctTrades = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return trades;
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  // Enrich trades with net outcomes
  const enriched = useMemo(() => {
    const standaloneExecTrades = executions
      .filter(e => e.id && !e.tradeId)
      .map(e => {
        let rVal = 0;
        if (e.rr !== undefined && e.rr !== null && e.rr !== '') {
          const num = parseFloat(String(e.rr).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) rVal = num;
        } else if (e.wl === 'Win') {
          rVal = 2.0;
        } else if (e.wl === 'Loss') {
          rVal = -1.0;
        }
        const netPnL = e.manualPnL !== undefined ? parseFloat(e.manualPnL) : rVal * 200;
        return {
          id: e.id,
          date: e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0],
          symbol: e.symbol || 'NQ',
          bias: e.bias || 'Long',
          model: e.model || 'Standard Setup',
          rating: e.rating || 'A+',
          netPnL,
          grossPnL: netPnL,
          commissions: 0,
          rr: rVal
        };
      });

    const tradeEnriched = acctTrades.map(t => {
      const execs = executions.filter(e => e.tradeId === t.id);
      const { netPnL, grossPnL, commissions } = calculateTradePnL(t, execs);
      return { ...t, netPnL, grossPnL, commissions };
    });

    return [...tradeEnriched, ...standaloneExecTrades];
  }, [acctTrades, executions]);

  // General KPIs and stats
  const stats = useMemo(() => {
    if (!enriched.length) return { total: 0, winRate: 0, pf: 0, avgWin: 0, avgLoss: 0, count: 0, totalR: 0, expectancy: 0, wins: 0, losses: 0 };
    
    const wins = enriched.filter(t => t.netPnL > 0);
    const losses = enriched.filter(t => t.netPnL < 0);
    const totalWin = wins.reduce((s, t) => s + t.netPnL, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));

    // Calculate total R-multiple
    let totalR = 0;
    enriched.forEach(t => {
      if (t.rr !== undefined && t.rr !== null && t.rr !== '') {
        totalR += parseFloat(t.rr) || 0;
      } else {
        totalR += t.netPnL / (t.riskAmount || 200);
      }
    });

    return {
      total: enriched.reduce((s, t) => s + t.netPnL, 0),
      winRate: (wins.length / enriched.length) * 100,
      pf: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 9.99 : 0,
      avgWin: wins.length ? totalWin / wins.length : 0,
      avgLoss: losses.length ? totalLoss / losses.length : 0,
      count: enriched.length,
      totalR,
      expectancy: totalR / enriched.length,
      wins: wins.length,
      losses: losses.length
    };
  }, [enriched]);

  // ── 1. SETUP STATS / EDGE DATA ──
  const edgeStats = useMemo(() => {
    const getStoredPills = (key, fallback) => {
      try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
      } catch { return fallback; }
    };

    const activeModels = getStoredPills('hollowCustomModels', ['MXM', 'CONT', 'MECH']);
    const activeDOLs = getStoredPills('hollowCustomDOLs', [
      'HTF alignment',
      'EQH/EQL: 5< candles apart',
      'Data High/Low',
      'PDH/PDL',
      'EQH/EQL: 1-3 candles apart',
      'Trendline Liquidity',
      'Unmitigated Imbalances',
      'LRLR',
      'Low Hanging Fruits',
      'High/Low inside FVG\'s',
      'NWOG/NDOG',
      'REQL/REQH',
      'Session Highs/ Lows',
      'Order Blocks'
    ]);
    const activePO3s = getStoredPills('hollowCustomPO3Times', ['09:30', '09:45', '10:00', '10:15', '10:30']);
    const activeEntryTFs = getStoredPills('hollowCustomEntryTFs', ['15s', '30s', '1m', '2m', '3m', '5m']);

    const timeframesMap = {};
    const dolsMap = {};
    const po3Map = {};
    const modelsMap = {};
    const ratingsMap = {};
    const weekdaysMap = {
      Monday: { name: 'Monday', trades: 0, wins: 0, totalR: 0 },
      Tuesday: { name: 'Tuesday', trades: 0, wins: 0, totalR: 0 },
      Wednesday: { name: 'Wednesday', trades: 0, wins: 0, totalR: 0 },
      Thursday: { name: 'Thursday', trades: 0, wins: 0, totalR: 0 },
      Friday: { name: 'Friday', trades: 0, wins: 0, totalR: 0 }
    };

    const processItem = (map, key, pnl, rVal) => {
      if (!key) return;
      const cleanKey = key.trim();
      if (!cleanKey) return;
      if (!map[cleanKey]) map[cleanKey] = { name: cleanKey, trades: 0, wins: 0, totalR: 0 };
      map[cleanKey].trades++;
      if (pnl > 0) map[cleanKey].wins++;
      map[cleanKey].totalR += rVal;
    };

    enriched.forEach(trade => {
      const pnl = trade.netPnL;
      let rVal = 0;
      if (trade.rr !== undefined && trade.rr !== null && trade.rr !== '') {
        rVal = parseFloat(String(trade.rr).replace(/[^0-9.-]/g, '')) || 0;
      } else {
        rVal = pnl / (trade.riskAmount || 200);
      }

      const tf = trade.entryTf || trade.timeframe || trade.entryTimeframe;
      if (tf) processItem(timeframesMap, tf, pnl, rVal);

      const dolField = trade.dol || trade.dolTarget;
      if (dolField) {
        String(dolField).split(',').forEach(d => processItem(dolsMap, d, pnl, rVal));
      }

      const po3Field = trade.po3Time || trade.po3Timing;
      if (po3Field) {
        String(po3Field).split(',').forEach(p => processItem(po3Map, p, pnl, rVal));
      }

      if (trade.model) processItem(modelsMap, trade.model, pnl, rVal);

      const rating = trade.rating || 'A+';
      processItem(ratingsMap, rating, pnl, rVal);

      if (trade.date) {
        const dayName = new Date(trade.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (weekdaysMap[dayName]) {
          processItem(weekdaysMap, dayName, pnl, rVal);
        }
      }
    });

    const formatListOrdered = (map, orderedKeys) => {
      return orderedKeys.map(key => {
        const cleanKey = typeof key === 'object' ? key.label : key;
        const item = map[cleanKey] || { name: cleanKey, trades: 0, wins: 0, totalR: 0 };
        const winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
        const avgR = item.trades > 0 ? item.totalR / item.trades : 0;
        return {
          ...item,
          winRate: winRate,
          winRateStr: `${winRate.toFixed(1)}%`,
          avgR: avgR,
          totalR: item.totalR
        };
      });
    };

    return {
      timeframes: formatListOrdered(timeframesMap, activeEntryTFs),
      dols: formatListOrdered(dolsMap, activeDOLs),
      po3: formatListOrdered(po3Map, activePO3s),
      models: formatListOrdered(modelsMap, activeModels),
      ratings: formatListOrdered(ratingsMap, ['A+', 'A', 'B', 'C', 'F']),
      weekdays: formatListOrdered(weekdaysMap, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    };
  }, [enriched]);

  // ── 2. CHARTS & DETAILS DATA ──
  
  // Equity curve
  const equityCurve = useMemo(() => {
    const byDate = {};
    enriched.forEach(t => {
      const dateStr = t.date ? t.date.slice(5) : '';
      if (!dateStr) return;
      byDate[dateStr] = (byDate[dateStr] || 0) + t.netPnL;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    let cum = 0;
    return sorted.map(([date, pnl]) => {
      cum += pnl;
      return { date, value: cum };
    });
  }, [enriched]);

  // P&L Distribution (R) Bins
  const pnlDistributionData = useMemo(() => {
    const bins = {
      '<-2R': 0,
      '-2R': 0,
      '-1R': 0,
      '-0.5R': 0,
      '0R': 0,
      '0.5R': 0,
      '1R': 0,
      '2R': 0,
      '>2R': 0
    };

    enriched.forEach(t => {
      let r = 0;
      if (t.rr !== undefined && t.rr !== null && t.rr !== '') {
        r = parseFloat(t.rr) || 0;
      } else {
        r = t.netPnL / (t.riskAmount || 200);
      }

      if (r < -2.0) bins['<-2R']++;
      else if (r <= -1.5) bins['-2R']++;
      else if (r <= -0.75) bins['-1R']++;
      else if (r < 0) bins['-0.5R']++;
      else if (r === 0) bins['0R']++;
      else if (r <= 0.75) bins['0.5R']++;
      else if (r <= 1.5) bins['1R']++;
      else if (r <= 2.5) bins['2R']++;
      else bins['>2R']++;
    });

    return Object.entries(bins).map(([bin, count]) => ({ name: bin, count }));
  }, [enriched]);

  // Weekday Performance (R)
  const weekdaysOutcome = useMemo(() => {
    const data = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0
    };
    enriched.forEach(t => {
      if (!t.date) return;
      const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' });
      if (data[day] !== undefined) {
        let r = 0;
        if (t.rr !== undefined && t.rr !== null && t.rr !== '') {
          r = parseFloat(t.rr) || 0;
        } else {
          r = t.netPnL / (t.riskAmount || 200);
        }
        data[day] += r;
      }
    });
    return Object.entries(data).map(([day, r]) => ({ day, r }));
  }, [enriched]);

  // Performance by Session (NY, LN, AS, PM)
  const sessionData = useMemo(() => {
    const sessions = {
      'New York': 0,
      'London': 0,
      'Asian': 0,
      'Pre-Market': 0
    };
    enriched.forEach(t => {
      const s = t.session || 'New York';
      if (sessions[s] !== undefined) {
        sessions[s]++;
      }
    });
    return Object.entries(sessions).map(([name, value]) => ({ name, value }));
  }, [enriched]);

  // Performance by Market
  const marketPerformance = useMemo(() => {
    const markets = {};
    enriched.forEach(t => {
      const sym = t.symbol || 'NQ';
      if (!markets[sym]) markets[sym] = { symbol: sym, trades: 0, wins: 0, totalR: 0 };
      markets[sym].trades++;
      if (t.netPnL > 0) markets[sym].wins++;
      
      let r = 0;
      if (t.rr !== undefined && t.rr !== null && t.rr !== '') {
        r = parseFloat(t.rr) || 0;
      } else {
        r = t.netPnL / (t.riskAmount || 200);
      }
      markets[sym].totalR += r;
    });
    return Object.values(markets).map(m => ({
      ...m,
      winRate: m.trades > 0 ? (m.wins / m.trades) * 100 : 0,
      avgR: m.trades > 0 ? m.totalR / m.trades : 0
    }));
  }, [enriched]);

  // Breakdown statistics (Avg Win, Avg Loss, Best, Worst, Win/Loss Ratio)
  const rBreakdown = useMemo(() => {
    const rMultiples = enriched.map(t => {
      if (t.rr !== undefined && t.rr !== null && t.rr !== '') {
        return parseFloat(t.rr) || 0;
      }
      return t.netPnL / (t.riskAmount || 200);
    });

    const wins = rMultiples.filter(r => r > 0);
    const losses = rMultiples.filter(r => r < 0);

    const avgWin = wins.length ? wins.reduce((s, r) => s + r, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, r) => s + r, 0) / losses.length : 0;
    const best = rMultiples.length ? Math.max(...rMultiples) : 0;
    const worst = rMultiples.length ? Math.min(...rMultiples) : 0;
    const ratio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;

    return { avgWin, avgLoss, best, worst, ratio };
  }, [enriched]);

  // Grade Distribution
  const gradeDistribution = useMemo(() => {
    const grades = {
      'Grade A+/ A': 0,
      'Grade B': 0,
      'Grade C': 0,
      'Grade F': 0
    };
    enriched.forEach(t => {
      const g = t.rating || 'A+';
      if (g === 'A+' || g === 'A') grades['Grade A+/ A']++;
      else if (g === 'B') grades['Grade B']++;
      else if (g === 'C') grades['Grade C']++;
      else if (g === 'F') grades['Grade F']++;
    });
    return Object.entries(grades).map(([name, value]) => ({ name, value }));
  }, [enriched]);

  const handleScroll = (e) => {
    if (onScrollChange) onScrollChange(e.target.scrollTop);
  };

  const renderBreakdownTable = (title, items) => {
    return (
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{title}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{items.length} items</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '6px 4px', textTransform: 'uppercase' }}>Label</th>
                <th style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'center' }}># Trades</th>
                <th style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'center' }}>Win Rate</th>
                <th style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'right' }}>Avg R</th>
                <th style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '6px 4px', textTransform: 'uppercase', textAlign: 'right' }}>Total R</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const totalRVal = item.totalR || 0;
                return (
                  <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', padding: '10px 4px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </td>
                    <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', padding: '10px 4px', textAlign: 'center' }}>
                      {item.trades}
                    </td>
                    <td style={{ fontSize: '12px', color: '#fff', padding: '10px 4px', textAlign: 'center', fontWeight: 600 }}>
                      {item.winRate.toFixed(0)}%
                    </td>
                    <td style={{ fontSize: '12px', padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: item.avgR > 0 ? '#30d158' : (item.avgR < 0 ? '#ff453a' : '#fff') }}>
                      {item.avgR >= 0 ? `+${item.avgR.toFixed(2)}` : `${item.avgR.toFixed(2)}`}
                    </td>
                    <td style={{ fontSize: '12px', padding: '10px 4px', textAlign: 'right', fontWeight: 700, color: totalRVal > 0 ? '#30d158' : (totalRVal < 0 ? '#ff453a' : '#fff') }}>
                      {totalRVal >= 0 ? `+${totalRVal.toFixed(2)}` : `${totalRVal.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: '#000000' }}>
      
      {/* ── STICKY BLURRY HEADER ── */}
      <div style={{
        flexShrink: 0,
        zIndex: 90,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '14px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onBack && (
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
            )}
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0, marginBottom: 2 }}>
                Analytics
              </h1>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Detailed performance insights &amp; edge statistics
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: '#1c1c1e',
          borderRadius: 12,
          padding: 3
        }}>
          {STAT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: activeTab === tab.id ? '#2c2c2e' : 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '8px 4px',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCROLLABLE CONTAINER ── */}
      <div 
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          WebkitOverflowScrolling: 'touch',
          padding: '16px',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <AnimatePresence mode="wait">
          
          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              
              {/* KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                
                {/* Payout Tracker */}
                <div
                  onClick={() => setShowPayoutModal(true)}
                  style={{
                    background: '#09090b',
                    border: '1px solid #b86eff',
                    boxShadow: '0 0 12px rgba(184, 110, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '85px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#b86eff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payout Tracker</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#30d158', margin: '4px 0' }}>
                    +${totalPayoutsSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>
                    {payoutsList.length} Payout{payoutsList.length === 1 ? '' : 's'} • Log &amp; Proof
                  </span>
                </div>

                {/* Win Rate */}
                <div style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '85px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Win Rate</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{stats.winRate.toFixed(1)}%</div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>Overall Win Rate</span>
                </div>

                {/* Average R */}
                <div style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '85px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average R</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#30d158', margin: '4px 0' }}>+{rBreakdown.avgWin.toFixed(2)}R</div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>{stats.totalR >= 0 ? `+${stats.totalR.toFixed(2)}R` : `${stats.totalR.toFixed(2)}R`} total</span>
                </div>

                {/* Profit Factor */}
                <div style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '85px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profit Factor</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{stats.pf.toFixed(2)}</div>
                  <div style={{
                    alignSelf: 'flex-start',
                    fontSize: '8px',
                    fontWeight: 800,
                    background: stats.pf >= 1 ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                    color: stats.pf >= 1 ? '#30d158' : '#ff453a',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {stats.pf >= 1 ? 'Solid' : 'Needs Work'}
                  </div>
                </div>

                {/* Expectancy */}
                <div style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '85px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expectancy</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: stats.expectancy >= 0 ? '#30d158' : '#ff453a', margin: '4px 0' }}>
                    {stats.expectancy >= 0 ? `+${stats.expectancy.toFixed(2)}R` : `${stats.expectancy.toFixed(2)}R`}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>Per Trade</span>
                </div>

                {/* Total Trades */}
                <div style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '85px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Trades</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{stats.count}</div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>{stats.count} trades logged</span>
                </div>

              </div>

              {/* Equity Curve Chart */}
              <div style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '16px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Equity Curve</span>
                <div style={{ height: 160, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eqGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#b86eff" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#b86eff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" style={{ fontSize: '9px' }} />
                      <YAxis stroke="rgba(255,255,255,0.2)" style={{ fontSize: '9px' }} />
                      <Tooltip contentStyle={{ background: '#121216', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="value" stroke="#b86eff" strokeWidth={2} fill="url(#eqGlow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* P&L Distribution (R) */}
              <div style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '16px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>P&amp;L Distribution (R)</span>
                <div style={{ height: 160, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pnlDistributionData} margin={{ top: 10, right: 5, left: -30, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" style={{ fontSize: '9px' }} />
                      <YAxis stroke="rgba(255,255,255,0.2)" style={{ fontSize: '9px' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#121216', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#b86eff" radius={[4, 4, 0, 0]}>
                        {pnlDistributionData.map((entry, idx) => {
                          const isNegative = entry.name.startsWith('-');
                          return <Cell key={`cell-${idx}`} fill={isNegative ? 'rgba(255,69,58,0.75)' : (entry.name === '0R' ? 'rgba(255,255,255,0.3)' : 'rgba(48,209,88,0.75)')} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekday Performance */}
              <div style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '16px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance by Day of Week</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                  {weekdaysOutcome.map((w) => {
                    const isPos = w.r >= 0;
                    return (
                      <div key={w.day} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', width: '32px' }}>{w.day}</span>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            right: isPos ? 'auto' : '50%',
                            width: `${Math.min(Math.abs(w.r) * 15, 50)}%`,
                            height: '100%',
                            background: isPos ? '#30d158' : '#ff453a',
                            borderRadius: '3px',
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: isPos ? '#30d158' : '#ff453a', width: '55px', textAlign: 'right' }}>
                          {w.r >= 0 ? `+${w.r.toFixed(2)}R` : `${w.r.toFixed(2)}R`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance by Session */}
              <div style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '16px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance by Session</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
                  <div style={{ width: '100px', height: '100px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sessionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {sessionData.map((entry, index) => {
                            const colors = ['#b86eff', '#64d2ff', '#30d158', '#ffd60a'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {sessionData.map((s, idx) => {
                      const colors = ['#b86eff', '#64d2ff', '#30d158', '#ffd60a'];
                      return (
                        <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[idx % colors.length] }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{s.name}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>{s.value} trades</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* R Multiple Breakdown */}
              <div style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '16px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>R Multiple Breakdown</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                  {[
                    { label: 'Average Win', val: `+${rBreakdown.avgWin.toFixed(2)}R`, color: '#30d158' },
                    { label: 'Average Loss', val: `${rBreakdown.avgLoss.toFixed(2)}R`, color: '#ff453a' },
                    { label: 'Best Trade', val: `+${rBreakdown.best.toFixed(2)}R`, color: '#30d158' },
                    { label: 'Worst Trade', val: `${rBreakdown.worst.toFixed(2)}R`, color: '#ff453a' },
                    { label: 'Avg Win / Avg Loss Ratio', val: rBreakdown.ratio.toFixed(2), color: '#b86eff' },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: row.color }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance by Market */}
              {marketPerformance.length > 0 && (
                <div style={{
                  background: '#09090b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '16px'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance by Market</span>
                  <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', paddingBottom: '6px' }}>Market</th>
                          <th style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', paddingBottom: '6px', textAlign: 'center' }}>Trades</th>
                          <th style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', paddingBottom: '6px', textAlign: 'center' }}>Win Rate</th>
                          <th style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', paddingBottom: '6px', textAlign: 'right' }}>Avg R</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketPerformance.map((m) => (
                          <tr key={m.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ fontSize: '12px', fontWeight: 700, padding: '8px 0' }}>{m.symbol}</td>
                            <td style={{ fontSize: '12px', padding: '8px 0', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{m.trades}</td>
                            <td style={{ fontSize: '12px', padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>{m.winRate.toFixed(1)}%</td>
                            <td style={{ fontSize: '12px', padding: '8px 0', textAlign: 'right', fontWeight: 700, color: m.avgR >= 0 ? '#30d158' : '#ff453a' }}>
                              {m.avgR >= 0 ? `+${m.avgR.toFixed(2)}` : `${m.avgR.toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ── SETUP STATS TAB ── */}
          {activeTab === 'setupStats' && (
            <motion.div
              key="setupStats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Setup &amp; Edge Statistics</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>
                  Performance breakdown across Entry Timeframes, DOL Targets, PO3 Timings, Models, and Ratings.
                </span>
              </div>

              {/* Setup Stats Horizontal Filter Pills */}
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                paddingBottom: '2px'
              }}>
                {['All', 'Entry Timeframes', 'DOL Targets', 'PO3 Timings', 'Models', 'Ratings'].map((f) => {
                  const isActive = activeTableFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setActiveTableFilter(f)}
                      style={{
                        flexShrink: 0,
                        background: isActive ? '#b86eff' : 'rgba(255, 255, 255, 0.04)',
                        border: 'none',
                        borderRadius: '100px',
                        padding: '6px 14px',
                        color: isActive ? '#000' : 'rgba(255, 255, 255, 0.65)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              {/* Render Selected Tables */}
              {(activeTableFilter === 'All' || activeTableFilter === 'Entry Timeframes') && (
                renderBreakdownTable('Entry Timeframes', edgeStats.timeframes)
              )}

              {(activeTableFilter === 'All' || activeTableFilter === 'DOL Targets') && (
                renderBreakdownTable('Draw on Liquidity (DOL Targets)', edgeStats.dols)
              )}

              {(activeTableFilter === 'All' || activeTableFilter === 'PO3 Timings') && (
                renderBreakdownTable('PO3 Timings', edgeStats.po3)
              )}

              {(activeTableFilter === 'All' || activeTableFilter === 'Models') && (
                renderBreakdownTable('Entry Models', edgeStats.models)
              )}

              {(activeTableFilter === 'All' || activeTableFilter === 'Ratings') && (
                renderBreakdownTable('Trade Rating Quality', edgeStats.ratings)
              )}

              {activeTableFilter === 'All' && (
                renderBreakdownTable('Weekday Performance', edgeStats.weekdays)
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── PAYOUT TRACKER MODAL ── */}
      <AnimatePresence>
        {showPayoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setShowPayoutModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              style={{
                width: '100%',
                maxHeight: '80vh',
                background: '#09090b',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px',
                paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxSizing: 'border-box'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>Payout Tracker</h2>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0 0' }}>Log prop firm payouts and track historical data</p>
                </div>
                <button
                  onClick={() => setShowPayoutModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Add Payout Form */}
              <form onSubmit={handleAddPayout} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Amount ($)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2500"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '10px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Prop Firm / Platform</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex, Topstep, FundedNext"
                    value={formPropFirm}
                    onChange={e => setFormPropFirm(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#b86eff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} /> Add Payout
                </button>
              </form>

              {/* Historical List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>History ({payoutsList.length})</span>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                  {payoutsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      No payouts logged yet.
                    </div>
                  ) : (
                    payoutsList.map(p => (
                      <div
                        key={p.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{p.propFirm}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                            {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#30d158' }}>
                            +${parseFloat(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => handleDeletePayout(p.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ff453a',
                              padding: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
