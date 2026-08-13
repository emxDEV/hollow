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
  X,
  Sparkles,
  DollarSign,
  Upload
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

  // Filter systems
  const [datePreset, setDatePreset] = useState('30D'); // '7D' | '30D' | '90D' | '6M' | '1Y' | 'All'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customRange, setCustomRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  // Temp state for custom date picker dialog inputs
  const [tempStart, setTempStart] = useState(customRange.start);
  const [tempEnd, setTempEnd] = useState(customRange.end);

  // Payouts Tracker State & Dialog
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutModalTab, setPayoutModalTab] = useState('insights'); // 'payouts' | 'insights'
  const [collapsedYears, setCollapsedYears] = useState({});
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

  // Group payouts by propFirm for insights
  const propFirmInsights = useMemo(() => {
    const groups = {};
    payoutsList.forEach(p => {
      const firm = p.propFirm || 'Other Platform';
      if (!groups[firm]) {
        groups[firm] = {
          name: firm,
          totalEarned: 0,
          payoutsCount: 0,
          largestPayout: 0,
          earliestDate: null,
          yearlyData: {}
        };
      }

      const amt = parseFloat(p.amount) || 0;
      groups[firm].totalEarned += amt;
      groups[firm].payoutsCount += 1;
      if (amt > groups[firm].largestPayout) {
        groups[firm].largestPayout = amt;
      }

      const pDate = new Date(p.date);
      if (!isNaN(pDate.getTime())) {
        if (!groups[firm].earliestDate || pDate < groups[firm].earliestDate) {
          groups[firm].earliestDate = pDate;
        }

        const year = pDate.getFullYear();
        const monthName = pDate.toLocaleString('en-US', { month: 'short' });
        if (!groups[firm].yearlyData[year]) {
          groups[firm].yearlyData[year] = {
            total: 0,
            months: {}
          };
        }
        groups[firm].yearlyData[year].total += amt;
        groups[firm].yearlyData[year].months[monthName] = (groups[firm].yearlyData[year].months[monthName] || 0) + amt;
      }
    });

    return Object.values(groups);
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
    const safeTrades = Array.isArray(trades) ? trades : [];
    if (!selectedAccountId || selectedAccountId === 'all') return safeTrades;
    return safeTrades.filter(t => t.accountId === selectedAccountId);
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

    const safeTrades = Array.isArray(acctTrades) ? acctTrades : [];
    const safeExecs = Array.isArray(executions) ? executions : [];

    const tradeEnriched = safeTrades.map(t => {
      const execs = safeExecs.filter(e => e.tradeId === t.id);
      const { netPnL, grossPnL, commissions } = calculateTradePnL(t, execs);
      return { ...t, netPnL, grossPnL, commissions };
    });

    return [...tradeEnriched, ...standaloneExecTrades];
  }, [acctTrades, executions]);

  // Synchronize customRange with datePreset
  useEffect(() => {
    if (!datePreset) return;
    const end = new Date();
    const start = new Date();
    switch (datePreset) {
      case '7D':
        start.setDate(end.getDate() - 7);
        break;
      case '30D':
        start.setDate(end.getDate() - 30);
        break;
      case '90D':
        start.setDate(end.getDate() - 90);
        break;
      case '6M':
        start.setMonth(end.getMonth() - 6);
        break;
      case '1Y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'All':
        start.setTime(0); // Epoch start
        break;
      default:
        return;
    }
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setCustomRange({ start: startStr, end: endStr });
    setTempStart(startStr);
    setTempEnd(endStr);
  }, [datePreset]);

  const filteredEnriched = useMemo(() => {
    return enriched.filter(t => {
      if (!t.date) return false;
      return t.date >= customRange.start && t.date <= customRange.end;
    });
  }, [enriched, customRange]);

  const formattedDateRange = useMemo(() => {
    const startD = new Date(customRange.start);
    const endD = new Date(customRange.end);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return 'Select Dates';
    
    const options = { month: 'short', day: 'numeric' };
    const startStr = startD.toLocaleDateString('en-US', options);
    const endStr = endD.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [customRange]);

  // General KPIs and stats
  const stats = useMemo(() => {
    if (!filteredEnriched.length) return { total: 0, winRate: 0, pf: 0, avgWin: 0, avgLoss: 0, count: 0, totalR: 0, expectancy: 0, wins: 0, losses: 0 };
    
    const wins = filteredEnriched.filter(t => t.netPnL > 0);
    const losses = filteredEnriched.filter(t => t.netPnL < 0);
    const totalWin = wins.reduce((s, t) => s + t.netPnL, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));

    // Calculate total R-multiple
    let totalR = 0;
    filteredEnriched.forEach(t => {
      if (t.rr !== undefined && t.rr !== null && t.rr !== '') {
        totalR += parseFloat(t.rr) || 0;
      } else {
        totalR += t.netPnL / (t.riskAmount || 200);
      }
    });

    return {
      total: filteredEnriched.reduce((s, t) => s + t.netPnL, 0),
      winRate: (wins.length / filteredEnriched.length) * 100,
      pf: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 9.99 : 0,
      avgWin: wins.length ? totalWin / wins.length : 0,
      avgLoss: losses.length ? totalLoss / losses.length : 0,
      count: filteredEnriched.length,
      totalR,
      expectancy: totalR / filteredEnriched.length,
      wins: wins.length,
      losses: losses.length
    };
  }, [filteredEnriched]);

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

    filteredEnriched.forEach(trade => {
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
  }, [filteredEnriched]);

  // ── 2. CHARTS & DETAILS DATA ──
  
  // Equity curve
  const equityCurve = useMemo(() => {
    const byDate = {};
    filteredEnriched.forEach(t => {
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
  }, [filteredEnriched]);

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

    filteredEnriched.forEach(t => {
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
  }, [filteredEnriched]);

  // Weekday Performance (R)
  const weekdaysOutcome = useMemo(() => {
    const data = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0
    };
    filteredEnriched.forEach(t => {
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
  }, [filteredEnriched]);

  // Performance by Session (NY, LN, AS, PM)
  const sessionData = useMemo(() => {
    const sessions = {
      'New York': 0,
      'London': 0,
      'Asian': 0,
      'Pre-Market': 0
    };
    filteredEnriched.forEach(t => {
      const s = t.session || 'New York';
      if (sessions[s] !== undefined) {
        sessions[s]++;
      }
    });
    return Object.entries(sessions).map(([name, value]) => ({ name, value }));
  }, [filteredEnriched]);

  // Performance by Market
  const marketPerformance = useMemo(() => {
    const markets = {};
    filteredEnriched.forEach(t => {
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
  }, [filteredEnriched]);

  // Breakdown statistics (Avg Win, Avg Loss, Best, Worst, Win/Loss Ratio)
  const rBreakdown = useMemo(() => {
    const rMultiples = filteredEnriched.map(t => {
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
  }, [filteredEnriched]);

  // Grade Distribution
  const gradeDistribution = useMemo(() => {
    const grades = {
      'Grade A+/ A': 0,
      'Grade B': 0,
      'Grade C': 0,
      'Grade F': 0
    };
    filteredEnriched.forEach(t => {
      const g = t.rating || 'A+';
      if (g === 'A+' || g === 'A') grades['Grade A+/ A']++;
      else if (g === 'B') grades['Grade B']++;
      else if (g === 'C') grades['Grade C']++;
      else if (g === 'F') grades['Grade F']++;
    });
    return Object.entries(grades).map(([name, value]) => ({ name, value }));
  }, [filteredEnriched]);

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

        {/* Date Filter System Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between', marginTop: '4px' }}>
          {/* Preset Buttons Pill container */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px',
            padding: '2px',
            flex: 1,
            maxWidth: '240px'
          }}>
            {['7D', '30D', '90D', '6M', '1Y', 'All'].map(p => {
              const isSel = datePreset === p;
              return (
                <button
                  key={p}
                  onClick={() => setDatePreset(p)}
                  style={{
                    flex: 1,
                    background: isSel ? '#b86eff' : 'transparent',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 0',
                    color: isSel ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Date Picker trigger pill */}
          <button
            onClick={() => {
              setTempStart(customRange.start);
              setTempEnd(customRange.end);
              setShowDatePicker(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '24px',
              padding: '6px 14px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              maxWidth: '170px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} color="#b86eff" />
              <span>{formattedDateRange}</span>
            </div>
            <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: 3
        }}>
          {STAT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
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
          minHeight: 0,
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
                          stroke="none"
                          strokeWidth={0}
                          dataKey="value"
                        >
                          {sessionData.map((entry, index) => {
                            const colors = ['#b86eff', '#64d2ff', '#30d158', '#ffd60a'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" strokeWidth={0} />;
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 850, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>Payouts</h2>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Manage your payout requests and view history</p>
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
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Selector Tab switcher: Payouts vs Insights */}
              <div style={{
                display: 'flex',
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '3px'
              }}>
                <button
                  onClick={() => setPayoutModalTab('payouts')}
                  style={{
                    flex: 1,
                    background: payoutModalTab === 'payouts' ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: payoutModalTab === 'payouts' ? '#ffffff' : 'rgba(255,255,255,0.45)',
                    border: 'none',
                    borderRadius: '9px',
                    padding: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  Payouts
                </button>
                <button
                  onClick={() => setPayoutModalTab('insights')}
                  style={{
                    flex: 1,
                    background: payoutModalTab === 'insights' ? 'rgba(48, 209, 88, 0.15)' : 'transparent',
                    color: payoutModalTab === 'insights' ? '#30d158' : 'rgba(255,255,255,0.45)',
                    border: 'none',
                    borderRadius: '9px',
                    padding: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  Insights
                </button>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '2px' }}>
                {payoutModalTab === 'payouts' ? (
                  <>
                    {/* Add Payout Form */}
                    <form onSubmit={handleAddPayout} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#b86eff' }}>+ Log New Payout</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>AMOUNT ($)</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 2500"
                            value={formAmount}
                            onChange={e => setFormAmount(e.target.value)}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
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
                          <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>DATE</label>
                          <input
                            type="date"
                            required
                            value={formDate}
                            onChange={e => setFormDate(e.target.value)}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
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
                        <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>PROP FIRM / PLATFORM</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Apex, Topstep, Lucid Trading"
                          value={formPropFirm}
                          onChange={e => setFormPropFirm(e.target.value)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
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
                          background: 'linear-gradient(135deg, #b86eff, #8a30f6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          marginTop: '4px',
                          outline: 'none'
                        }}
                      >
                        Add Payout
                      </button>
                    </form>

                    {/* Historical List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>History ({payoutsList.length})</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                borderRadius: '12px',
                                padding: '12px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{p.propFirm}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                  {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 850, color: '#30d158' }}>
                                  +${parseFloat(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                    alignItems: 'center',
                                    outline: 'none'
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
                  </>
                ) : (
                  /* ── INSIGHTS TAB ON MOBILE ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                    {propFirmInsights.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '24px' }}>
                        No payouts logged yet. Use the **Payouts** tab to record your profit splits.
                      </div>
                    ) : (
                      propFirmInsights.map(firm => {
                        const oldestDateStr = firm.earliestDate
                          ? firm.earliestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          : 'N/A';

                        return (
                          <div
                            key={firm.name}
                            style={{
                              background: '#09090b',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '20px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                            }}
                          >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* 3D cosmic orb planet logo */}
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: 'radial-gradient(circle at 30% 30%, #5b6e9c 0%, #0f1322 75%, #000000 100%)',
                                  boxShadow: '0 0 12px rgba(48, 209, 88, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  flexShrink: 0
                                }} />
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>
                                    {firm.name}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', color: '#30d158', fontSize: '8.5px', fontWeight: '800', letterSpacing: '0.04em' }}>
                                    <DollarSign size={8} strokeWidth={2.5} />
                                    <span>FUNDED PAYOUTS</span>
                                  </div>
                                </div>
                              </div>
                              
                              <button style={{ background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', outline: 'none' }}>
                                <Upload size={12} />
                              </button>
                            </div>

                            {/* Total Earned Payout Amount */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                              <div style={{ fontSize: '9.5px', fontWeight: '750', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Total Earned
                              </div>
                              <div style={{ fontSize: '26px', fontWeight: '850', color: '#30d158', marginTop: '2px', letterSpacing: '-0.02em' }}>
                                ${firm.totalEarned.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>

                            {/* Key Stats Grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '10px',
                              background: 'rgba(255,255,255,0.02)',
                              borderRadius: '12px',
                              padding: '10px 12px',
                              border: '1px solid rgba(255,255,255,0.04)'
                            }}>
                              <div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Payouts</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{firm.payoutsCount}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Largest</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#30d158', marginTop: '2px' }}>
                                  ${firm.largestPayout.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Since</div>
                                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{oldestDateStr}</div>
                              </div>
                            </div>

                            {/* Yearly / Monthly breakdown bars */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Earnings</span>
                              
                              {Object.entries(firm.yearlyData).map(([year, yearData]) => {
                                const maxMonthAmt = Math.max(...Object.values(yearData.months), 1);
                                const yearKey = `${firm.name}-${year}`;
                                const isYearCollapsed = collapsedYears[yearKey];

                                return (
                                  <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* Year Header Row */}
                                    <div 
                                      onClick={() => {
                                        setCollapsedYears(prev => ({
                                          ...prev,
                                          [yearKey]: !prev[yearKey]
                                        }));
                                      }}
                                      style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        borderBottom: '1px solid rgba(255,255,255,0.04)', 
                                        paddingBottom: '4px',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: '#fff' }}>
                                        <span style={{ color: '#30d158', fontSize: '13px', transition: 'all 0.15s ease' }}>
                                          {isYearCollapsed ? '⊕' : '⊖'}
                                        </span>
                                        <span>{year}</span>
                                      </div>
                                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#30d158' }}>
                                        ${yearData.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </span>
                                    </div>

                                    {/* Month Bars Grid */}
                                    {!isYearCollapsed && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
                                        {Object.entries(yearData.months).map(([month, amt]) => {
                                          const pct = (amt / maxMonthAmt) * 100;
                                          return (
                                            <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ width: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                                                {month}
                                              </span>
                                              <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '100px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #1d8239, #30d158)', borderRadius: '100px' }} />
                                              </div>
                                              <span style={{ fontSize: '10.5px', color: '#30d158', fontWeight: '750', textAlign: 'right', minWidth: '45px' }}>
                                                ${amt.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CUSTOM DATE RANGE PICKER MODAL SHEET ── */}
      <AnimatePresence>
        {showDatePicker && (
          <div
            onClick={() => setShowDatePicker(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{
                width: '100%',
                background: '#09090b',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px 24px 0 0',
                padding: '20px',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Custom Date Range</span>
                <button
                  onClick={() => setShowDatePicker(false)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Start Date</label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={e => setTempStart(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>End Date</label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={e => setTempEnd(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCustomRange({ start: tempStart, end: tempEnd });
                  setDatePreset(null); // Clear preset selection as it's now custom
                  setShowDatePicker(false);
                }}
                style={{
                  background: 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(138, 48, 246, 0.3)'
                }}
              >
                Apply Date Range
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
