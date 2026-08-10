import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL } from '../utils/tradeMath';
import {
  BarChart2, Calendar, Filter, TrendingUp, TrendingDown,
  DollarSign, Activity, ChevronDown, Percent, Award, Info, HelpCircle,
  Plus, Upload, X, Trash2, Image as ImageIcon, CheckCircle, Clock, Tag, Target, Layers, LayoutGrid
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ComposedChart, Legend
} from 'recharts';
import useUIStore from '../store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';

// Color palette matching Hollow high-energy dark design system
const COLORS = {
  gain: '#30d158',
  loss: '#ff453a',
  purple: '#b86eff',
  purpleBright: '#c27eff',
  purpleDim: 'rgba(184, 110, 255, 0.15)',
  gold: '#ffd60a',
  cyan: '#64d2ff',
  muted: 'rgba(255, 255, 255, 0.45)',
  cardBg: '#0f0f11',
  cardBorder: 'rgba(255, 255, 255, 0.08)'
};

export default function AnalyticsView() {
  const isMobile = useUIStore(state => state.isMobile);
  const [timeframe, setTimeframe] = useState('30D'); // 7D, 30D, 90D, 6M, 1Y, All
  const [equityViewMode, setEquityViewMode] = useState('Daily');
  const [showFilters, setShowFilters] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('All');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview'); // 'overview' | 'edge'
  const [activeEdgeCategory, setActiveEdgeCategory] = useState('all');

  // Custom Date Range State & Date Picker Popover
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Payout Tracker Modal State & Persistence
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutsList, setPayoutsList] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowPayoutsList');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Payout Form inputs
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payoutAccount, setPayoutAccount] = useState('');
  const [certificateDataUrl, setCertificateDataUrl] = useState('');
  const [selectedCertificateLightbox, setSelectedCertificateLightbox] = useState(null);

  // Save payouts to localStorage
  const savePayoutsList = (newList) => {
    setPayoutsList(newList);
    localStorage.setItem('hollowPayoutsList', JSON.stringify(newList));
  };

  const handleAddPayout = (e) => {
    if (e) e.preventDefault();
    const num = parseFloat(payoutAmount);
    if (isNaN(num) || num <= 0) return;

    const newPayout = {
      id: `payout-${Date.now()}`,
      amount: num,
      date: payoutDate || new Date().toISOString().split('T')[0],
      accountName: payoutAccount.trim() || 'Prop Firm Account',
      certificateUrl: certificateDataUrl
    };

    const updated = [newPayout, ...payoutsList];
    savePayoutsList(updated);

    // Reset inputs
    setPayoutAmount('');
    setPayoutAccount('');
    setCertificateDataUrl('');
  };

  const handleDeletePayout = (id) => {
    const updated = payoutsList.filter(p => p.id !== id);
    savePayoutsList(updated);
  };

  const handleCertificateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCertificateDataUrl(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Total Payouts Sum
  const totalPayoutsSum = useMemo(() => {
    return payoutsList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [payoutsList]);

  // Reactively query trades and executions
  const trades = useLiveQuery(() => (db && db.trades ? db.trades.toArray() : []), []) || [];
  const executions = useLiveQuery(() => (db && db.executions ? db.executions.toArray() : []), []) || [];

  // Formatted date range label for topbar button
  const formattedDateRangeLabel = useMemo(() => {
    if (customStartDate && customEndDate) {
      const s = new Date(customStartDate + 'T00:00:00');
      const e = new Date(customEndDate + 'T23:59:59');
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    const end = new Date();
    let start = new Date();
    if (timeframe === '7D') start.setDate(end.getDate() - 7);
    else if (timeframe === '30D') start.setDate(end.getDate() - 30);
    else if (timeframe === '90D') start.setDate(end.getDate() - 90);
    else if (timeframe === '6M') start.setDate(end.getDate() - 180);
    else if (timeframe === '1Y') start.setDate(end.getDate() - 365);
    else if (timeframe === 'All') {
      if (trades.length === 0) return 'All Time';
      const validDates = trades.map(t => new Date(t.date).getTime()).filter(t => !isNaN(t));
      if (validDates.length === 0) return 'All Time';
      const earliest = new Date(Math.min(...validDates));
      return `${earliest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [timeframe, customStartDate, customEndDate, trades]);

  // Combine trades with standalone executions into a unified trackable trades array
  const allTrackedTrades = useMemo(() => {
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

        const risk = 200;
        const netPnL = e.manualPnL !== undefined ? parseFloat(e.manualPnL) : rVal * risk;

        return {
          id: e.id,
          date: e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0],
          symbol: e.symbol || 'NQ',
          bias: e.bias || 'Long',
          model: e.model || 'Standard Setup',
          rating: e.rating || 'A+',
          po3: e.po3 || 'N/A',
          dol: e.dol || 'N/A',
          wl: e.wl || (rVal > 0 ? 'Win' : (rVal < 0 ? 'Loss' : 'BE')),
          rr: e.rr || (rVal !== 0 ? `${rVal >= 0 ? '+' : ''}${rVal}R` : '0R'),
          manualPnL: netPnL,
          riskAmount: risk,
          session: e.session || 'New York',
          virtualNetPnL: netPnL,
          isStandaloneExec: true
        };
      });

    return [...trades, ...standaloneExecTrades];
  }, [trades, executions]);

  // Filter trades by timeframe, custom date range, and symbol with 100% start-of-day precision
  const filteredTrades = useMemo(() => {
    let list = [...allTrackedTrades];
    if (symbolFilter !== 'All') {
      list = list.filter(t => t.symbol === symbolFilter);
    }

    if (customStartDate && customEndDate) {
      const startMs = new Date(customStartDate + 'T00:00:00').getTime();
      const endMs = new Date(customEndDate + 'T23:59:59').getTime();
      list = list.filter(t => {
        const dMs = new Date(t.date).getTime();
        return dMs >= startMs && dMs <= endMs;
      });
    } else {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      if (timeframe === '7D') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 7);
        cutoff.setHours(0, 0, 0, 0);
        list = list.filter(t => new Date(t.date) >= cutoff);
      } else if (timeframe === '30D') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 30);
        cutoff.setHours(0, 0, 0, 0);
        list = list.filter(t => new Date(t.date) >= cutoff);
      } else if (timeframe === '90D') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 90);
        cutoff.setHours(0, 0, 0, 0);
        list = list.filter(t => new Date(t.date) >= cutoff);
      } else if (timeframe === '6M') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 180);
        cutoff.setHours(0, 0, 0, 0);
        list = list.filter(t => new Date(t.date) >= cutoff);
      } else if (timeframe === '1Y') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 365);
        cutoff.setHours(0, 0, 0, 0);
        list = list.filter(t => new Date(t.date) >= cutoff);
      }
    }
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allTrackedTrades, timeframe, symbolFilter, customStartDate, customEndDate]);

  const isDataEmpty = filteredTrades.length === 0;

  // Comprehensive Edge Statistics Aggregation Engine (Timeframe, DOL, PO3, Models, Ratings, Days)
  
  const [pillsTrigger, setPillsTrigger] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setPillsTrigger(t => t + 1);
    window.addEventListener('hollowCustomPillsUpdated', handleUpdate);
    return () => window.removeEventListener('hollowCustomPillsUpdated', handleUpdate);
  }, []);

  const analyticsData = useMemo(() => {
    let totalPnL = 0;
    let totalWinsPnL = 0;
    let totalLossesPnL = 0;
    let winsCount = 0;
    let lossesCount = 0;
    let beCount = 0;

    let bestTradePnL = 0;
    let worstTradePnL = 0;

    const dayOfWeekPnL = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
    const sessionPnL = { 'New York': { trades: 0, pnl: 0 }, 'London': { trades: 0, pnl: 0 }, 'Asian': { trades: 0, pnl: 0 }, 'Pre-Market': { trades: 0, pnl: 0 } };
    const marketMap = {};
    const gradeMap = { 'A+ / A': 0, 'B': 0, 'C': 0, 'F': 0 };

    const pnlDistributionBins = {
      '<-2R': 0, '-2R': 0, '-1R': 0, '-0.5R': 0, '0R': 0,
      '0.5R': 0, '1R': 0, '2R': 0, '>2R': 0
    };

    let cumulativeEquity = 100000;
    const equityCurvePoints = [{ date: 'Start', balance: cumulativeEquity, pnl: 0 }];

    filteredTrades.forEach(trade => {
      let pnl = 0;
      if (trade.isStandaloneExec) {
        pnl = trade.virtualNetPnL;
      } else {
        const tradeExecs = executions.filter(e => e.tradeId === trade.id);
        const math = calculateTradePnL(trade, tradeExecs);
        pnl = math.netPnL;
      }
      totalPnL += pnl;

      if (pnl > bestTradePnL) bestTradePnL = pnl;
      if (pnl < worstTradePnL) worstTradePnL = pnl;

      const isWin = pnl > 0;
      const isLoss = pnl < 0;

      if (isWin) {
        totalWinsPnL += pnl;
        winsCount++;
      } else if (isLoss) {
        totalLossesPnL += Math.abs(pnl);
        lossesCount++;
      } else {
        beCount++;
      }

      // Equity point
      cumulativeEquity += pnl;
      const dateLabel = trade.date ? new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Trade';
      equityCurvePoints.push({ date: dateLabel, balance: cumulativeEquity, pnl });

      // Day of week
      if (trade.date) {
        const d = new Date(trade.date);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (dayOfWeekPnL[dayName] !== undefined) {
          dayOfWeekPnL[dayName] += pnl;
        }
      }

      // Market symbol
      const sym = trade.symbol || 'NQ';
      if (!marketMap[sym]) marketMap[sym] = { symbol: sym, trades: 0, wins: 0, pnl: 0, totalR: 0 };
      marketMap[sym].trades++;
      if (pnl > 0) marketMap[sym].wins++;
      marketMap[sym].pnl += pnl;
      marketMap[sym].totalR += pnl / (trade.riskAmount || 200);

      // Rating grade
      const rating = trade.rating || 'A+';
      if (rating.includes('A')) gradeMap['A+ / A']++;
      else if (rating === 'B') gradeMap['B']++;
      else if (rating === 'C') gradeMap['C']++;
      else gradeMap['F']++;

      // Session
      const session = trade.session || 'New York';
      if (sessionPnL[session]) {
        sessionPnL[session].trades++;
        sessionPnL[session].pnl += pnl;
      }

      // PnL R Distribution Bins
      const risk = trade.riskAmount || 200;
      const rVal = pnl / risk;
      if (rVal < -2) pnlDistributionBins['<-2R']++;
      else if (rVal < -1) pnlDistributionBins['-2R']++;
      else if (rVal < -0.5) pnlDistributionBins['-1R']++;
      else if (rVal < 0) pnlDistributionBins['-0.5R']++;
      else if (rVal === 0) pnlDistributionBins['0R']++;
      else if (rVal <= 0.8) pnlDistributionBins['0.5R']++;
      else if (rVal <= 1.5) pnlDistributionBins['1R']++;
      else if (rVal <= 2.5) pnlDistributionBins['2R']++;
      else pnlDistributionBins['>2R']++;
    });

    const totalCount = filteredTrades.length;
    const winRate = totalCount > 0 ? ((winsCount / (winsCount + lossesCount || 1)) * 100).toFixed(1) : '0.0';
    const avgWin = winsCount > 0 ? totalWinsPnL / winsCount : 0;
    const avgLoss = lossesCount > 0 ? totalLossesPnL / lossesCount : 0;
    const profitFactor = totalLossesPnL > 0 ? (totalWinsPnL / totalLossesPnL).toFixed(2) : (totalWinsPnL > 0 ? '99.9' : '0.00');
    const avgR = totalCount > 0 ? (totalPnL / (totalCount * 200)).toFixed(2) : '0.00';
    const expectancy = totalCount > 0 ? ((totalWinsPnL - totalLossesPnL) / (totalCount * 200)).toFixed(2) : '0.00';

    return {
      totalPnL,
      totalWinsPnL,
      totalLossesPnL,
      winsCount,
      lossesCount,
      beCount,
      totalCount,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgR,
      expectancy,
      bestTradePnL,
      worstTradePnL,
      equityCurvePoints,
      dayOfWeekPnL,
      sessionPnL,
      marketList: Object.values(marketMap).map(m => ({
        ...m,
        winRate: m.trades > 0 ? `${((m.wins / m.trades) * 100).toFixed(1)}%` : '0.0%',
        avgR: m.trades > 0 ? `${m.totalR >= 0 ? '+' : ''}${(m.totalR / m.trades).toFixed(2)}R` : '0.00R',
        totalR: parseFloat(m.totalR.toFixed(2))
      })),
      gradeMap,
      pnlDistributionBins
    };
  }, [filteredTrades, executions]);

  const displayData = analyticsData;

  const winRateOverTimeData = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    let totalEligible = 0;
    let wins = 0;
    return filteredTrades.map(trade => {
      const math = calculateTradePnL(trade, executions.filter(e => e.tradeId === trade.id));
      if (math.netPnL !== 0) {
        totalEligible++;
        if (math.netPnL > 0) wins++;
      }
      const winRate = totalEligible > 0 ? (wins / totalEligible) * 100 : 0;
      const dateLabel = trade.date ? new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Trade';
      return { date: dateLabel, winRate: parseFloat(winRate.toFixed(1)) };
    });
  }, [filteredTrades, executions]);

  const SESSION_COLORS = ['#b86eff', '#64d2ff', '#30d158', '#ff453a'];
  const RATING_COLORS = ['#30d158', '#b86eff', '#ffd60a', '#ff453a'];

  const edgeStats = useMemo(() => {
    // 1. Fetch Pill Definitions from Settings (localStorage)
    const getStoredPills = (key, fallback) => {
      try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
      } catch { return fallback; }
    };

    const activeModels = getStoredPills('hollowCustomModels', []);
    const activeDOLs = getStoredPills('hollowCustomDOLs', []);
    const activePO3s = getStoredPills('hollowCustomPO3Times', []);
    const activeEntryTFs = getStoredPills('hollowCustomEntryTFs', []);

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
    const sideMap = {
      Long: { name: 'Long', trades: 0, wins: 0, totalR: 0 },
      Short: { name: 'Short', trades: 0, wins: 0, totalR: 0 }
    };

    const processItem = (map, key, pnl, risk) => {
      if (!key) return;
      const cleanKey = key.trim();
      if (!cleanKey) return;
      if (!map[cleanKey]) map[cleanKey] = { name: cleanKey, trades: 0, wins: 0, totalR: 0 };
      map[cleanKey].trades++;
      if (pnl > 0) map[cleanKey].wins++;
      map[cleanKey].totalR += pnl / (risk || 200);
    };

    filteredTrades.forEach(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const math = calculateTradePnL(trade, tradeExecs);
      const pnl = math.netPnL;
      const risk = trade.riskAmount || 200;

      // 1. Entry Timeframe
      if (trade.entryTf) processItem(timeframesMap, trade.entryTf, pnl, risk);

      // 2. DOL (Supports comma separated multi-select)
      if (trade.dol) {
        trade.dol.split(',').forEach(d => processItem(dolsMap, d, pnl, risk));
      }

      // 3. PO3 Time
      if (trade.po3Time) {
        trade.po3Time.split(',').forEach(p => processItem(po3Map, p, pnl, risk));
      }

      // 4. Model
      if (trade.model) processItem(modelsMap, trade.model, pnl, risk);

      // 5. Setup Rating
      const rating = trade.rating || 'A+';
      processItem(ratingsMap, rating, pnl, risk);

      // 6. Direction / Side
      const side = trade.direction === 'SHORT' ? 'Short' : 'Long';
      processItem(sideMap, side, pnl, risk);

      // 7. Weekday
      if (trade.date) {
        const dayName = new Date(trade.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (weekdaysMap[dayName]) {
          processItem(weekdaysMap, dayName, pnl, risk);
        }
      }
    });

    const formatListOrdered = (map, orderedKeys) => {
      return orderedKeys.map(key => {
        const cleanKey = typeof key === 'object' ? key.label : key;
        const item = map[cleanKey] || { name: cleanKey, trades: 0, wins: 0, totalR: 0 };
        const winRate = item.trades > 0 ? ((item.wins / item.trades) * 100).toFixed(1) : '0.0';
        const avgR = item.trades > 0 ? (item.totalR / item.trades).toFixed(2) : '0.00';
        return {
          ...item,
          winRatePct: parseFloat(winRate),
          winRateStr: `${winRate}%`,
          avgR: parseFloat(avgR),
          totalR: parseFloat(item.totalR.toFixed(2))
        };
      });
    };

    const formatListStatic = (orderedKeys, map) => formatListOrdered(map, orderedKeys);

    return {
      timeframes: formatListOrdered(timeframesMap, activeEntryTFs),
      dols: formatListOrdered(dolsMap, activeDOLs),
      po3: formatListOrdered(po3Map, activePO3s),
      models: formatListOrdered(modelsMap, activeModels),
      ratings: formatListStatic(['A+', 'A', 'B', 'C', 'F'], ratingsMap),
      sides: formatListStatic(['Long', 'Short'], sideMap),
      weekdays: formatListStatic(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], weekdaysMap)
    };
  }, [filteredTrades, executions, pillsTrigger]);

  const edgeDisplayData = edgeStats;

  // Render Breakdown Table Helper matching screenshot UI
  const renderBreakdownTable = (title, items, icon) => (
    <div style={{
      background: COLORS.cardBg,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: '18px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#fff', margin: 0 }}>{title}</h3>
        </div>
        <span style={{ fontSize: '11px', color: COLORS.muted }}>{items.length} items</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: COLORS.muted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Label</th>
              <th style={{ textAlign: 'center', padding: '8px 0' }}># Trades</th>
              <th style={{ textAlign: 'center', padding: '8px 0' }}>Win Rate</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }}>Avg R</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }}>Total R</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: COLORS.muted, fontSize: '11px' }}>
                  No data recorded yet
                </td>
              </tr>
            ) : (
              items.map(row => {
                const isWin = row.totalR >= 0;
                return (
                  <tr key={row.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 0', fontWeight: '700', color: '#fff' }}>{row.name}</td>
                    <td style={{ padding: '10px 0', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>{row.trades}</td>
                    <td style={{ padding: '10px 0', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#fff' }}>{row.winRateStr}</span>
                        {/* Circular SVG Ring Gauge matching user's screenshot */}
                        <svg width="18" height="18" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="4"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={row.winRatePct >= 50 ? '#30d158' : '#ff453a'}
                            strokeWidth="4"
                            strokeDasharray={`${row.winRatePct}, 100`}
                          />
                        </svg>
                      </div>
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700', color: row.avgR >= 0 ? COLORS.gain : COLORS.loss }}>
                      {row.avgR >= 0 ? '+' : ''}{row.avgR}R
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '800', color: isWin ? COLORS.gain : COLORS.loss }}>
                      {isWin ? '+' : ''}{row.totalR}R
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{
      height: '100%',
      width: '100%',
      overflowY: 'auto',
      background: '#000000',
      color: '#ffffff',
      padding: isMobile ? '16px' : '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }} className="hollow-menu-scrollbar">

      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Analytics
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: COLORS.muted, marginTop: '4px' }}>
            Detailed performance insights and edge statistics of your trading
          </p>
        </div>

        {/* Header Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
            padding: '3px'
          }}>
            <button
              onClick={() => setActiveAnalyticsTab('overview')}
              style={{
                background: activeAnalyticsTab === 'overview' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeAnalyticsTab === 'overview' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                fontWeight: activeAnalyticsTab === 'overview' ? '700' : '500',
                fontSize: '11px',
                padding: '5px 14px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveAnalyticsTab('edge')}
              style={{
                background: activeAnalyticsTab === 'edge' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeAnalyticsTab === 'edge' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                fontWeight: activeAnalyticsTab === 'edge' ? '700' : '500',
                fontSize: '11px',
                padding: '5px 14px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Setup Stats
            </button>
          </div>

          {/* Timeframe Filter Pills Bar */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
            padding: '3px'
          }}>
            {['7D', '30D', '90D', '6M', '1Y', 'All'].map(tf => {
              const isSel = timeframe === tf && !customStartDate;
              return (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  style={{
                    background: isSel ? '#b86eff' : 'transparent',
                    color: isSel ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                    fontWeight: isSel ? '800' : '600',
                    fontSize: '11px',
                    padding: '5px 12px',
                    borderRadius: '100px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>

          {/* Interactive Date Picker Display Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: (customStartDate || isDatePickerOpen) ? 'rgba(184, 110, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: (customStartDate || isDatePickerOpen) ? '1px solid rgba(184, 110, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '100px',
                padding: '8px 14px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Calendar size={14} color="#b86eff" />
              <span>{formattedDateRangeLabel}</span>
              <ChevronDown size={13} style={{ opacity: 0.5 }} />
            </button>

            {/* Custom Date Range Popover */}
            {isDatePickerOpen && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#141416',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '16px',
                zIndex: 999,
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '280px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#b86eff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select Custom Date Range
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: COLORS.muted }}>Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '12px',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: COLORS.muted }}>End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '12px',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setTimeframe('30D');
                      setIsDatePickerOpen(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: COLORS.muted,
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset (30D)
                  </button>
                  <button
                    onClick={() => setIsDatePickerOpen(false)}
                    style={{
                      background: '#b86eff',
                      border: 'none',
                      color: '#000',
                      fontWeight: '800',
                      fontSize: '11px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOP 6 PERFORMANCE METRIC CARDS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
        gap: '14px'
      }}>
        {/* Card 1: Payout Tracker (Clickable to open modal) */}
        <div
          onClick={() => setIsPayoutModalOpen(true)}
          style={{
            background: COLORS.cardBg,
            border: '1px solid rgba(184, 110, 255, 0.35)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(184, 110, 255, 0.15)',
            transition: 'transform 0.15s, border-color 0.15s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#b86eff' }}>Payout Tracker</span>
            <Plus size={14} color="#b86eff" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: COLORS.gain, letterSpacing: '-0.02em' }}>
            +${totalPayoutsSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '10px', color: COLORS.purpleBright, fontWeight: '700' }}>
            {payoutsList.length} Payouts • Log & Proof
          </span>
        </div>

        {/* Card 2: Win Rate */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.muted, display: 'block' }}>Win Rate</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '4px 0 2px' }}>
              {displayData.totalCount > 0 ? `${displayData.winRate}%` : '0.0%'}
            </div>
            <span style={{ fontSize: '10px', color: COLORS.muted }}>Overall Win Rate</span>
          </div>

          <div style={{ position: 'relative', width: '42px', height: '42px' }}>
            <svg width="42" height="42" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#b86eff"
                strokeWidth="4"
                strokeDasharray={`${displayData.totalCount > 0 ? displayData.winRate : 0}, 100`}
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Average R */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.muted }}>Average R</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: displayData.avgR >= 0 ? COLORS.gain : COLORS.loss }}>
            {displayData.totalCount > 0 ? `${displayData.avgR >= 0 ? '+' : ''}${displayData.avgR}R` : '0.00R'}
          </div>
          <span style={{ fontSize: '10px', color: displayData.totalPnL >= 0 ? COLORS.gain : COLORS.loss, fontWeight: '700' }}>
            {displayData.totalCount > 0 ? `${displayData.totalPnL >= 0 ? '+' : ''}${(displayData.totalPnL / 200).toFixed(2)}R total` : '0.00R total'}
          </span>
        </div>

        {/* Card 4: Profit Factor */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.muted }}>Profit Factor</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>
            {displayData.totalCount > 0 ? displayData.profitFactor : '0.00'}
          </div>
          <span style={{ fontSize: '9px', color: COLORS.gain, background: 'rgba(48,209,88,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', width: 'fit-content' }}>
            {displayData.totalCount > 0 ? (parseFloat(displayData.profitFactor) >= 1.5 ? 'Strong' : parseFloat(displayData.profitFactor) >= 1.0 ? 'Good' : 'Needs Work') : 'No Data'}
          </span>
        </div>

        {/* Card 5: Expectancy */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.muted }}>Expectancy</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: displayData.expectancy >= 0 ? COLORS.gain : COLORS.loss }}>
            {displayData.totalCount > 0 ? `${displayData.expectancy >= 0 ? '+' : ''}${displayData.expectancy}R` : '0.00R'}
          </div>
          <span style={{ fontSize: '10px', color: COLORS.muted }}>Per Trade</span>
        </div>

        {/* Card 6: Total Trades */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.muted }}>Total Trades</span>
            <Calendar size={13} color="#b86eff" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>
            {displayData.totalCount}
          </div>
          <span style={{ fontSize: '10px', color: COLORS.muted, fontWeight: '700' }}>
            {displayData.totalCount > 0 ? `${displayData.totalCount} trades logged` : 'No trades logged'}
          </span>
        </div>
      </div>

      
      {activeAnalyticsTab === 'overview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* MIDDLE SECTION ROW 1 (EQUITY CURVE, PNL DIST, DAY OF WEEK) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr 1.2fr',
        gap: '16px'
      }}>
        {/* Card 1: Equity Curve */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Equity Curve</span>
              <Info size={13} style={{ color: COLORS.muted }} />
            </div>
            <select
              value={equityViewMode}
              onChange={e => setEquityViewMode(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                outline: 'none'
              }}
            >
              <option value="Daily">Daily</option>
              <option value="Trade">Per Trade</option>
            </select>
          </div>

          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData.equityCurvePoints}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b86eff" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#b86eff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#12101e', border: '1px solid rgba(184,110,255,0.3)', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`$${val.toLocaleString()}`, 'Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#b86eff" strokeWidth={2.5} fillOpacity={1} fill="url(#equityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: P&L Distribution (R) */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>P&L Distribution (R)</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', gap: '4px', paddingTop: '20px' }}>
            {Object.entries(displayData.pnlDistributionBins).map(([bin, count]) => {
              const isWin = bin.includes('0.5') || bin.includes('1R') || bin.includes('2R') || bin.includes('>2R');
              const barHeight = Math.max((count / 8) * 140, 6);
              const color = isWin ? COLORS.gain : (bin === '0R' ? '#b86eff' : COLORS.loss);

              return (
                <div key={bin} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{count}</span>
                  <div style={{
                    width: '100%',
                    maxWidth: '16px',
                    height: `${barHeight}px`,
                    background: color,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.85
                  }} />
                  <span style={{ fontSize: '9px', color: COLORS.muted, whiteSpace: 'nowrap' }}>{bin}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Performance by Day of Week */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Performance by Day of Week</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(displayData.dayOfWeekPnL).map(([day, val]) => {
              const isWin = val >= 0;
              const rVal = (val / 200).toFixed(2);
              const widthPct = Math.min((Math.abs(val) / 600) * 100, 100);

              return (
                <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', width: '32px' }}>{day}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: isWin ? COLORS.gain : COLORS.loss,
                      borderRadius: '3px'
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: isWin ? COLORS.gain : COLORS.loss, width: '50px', textAlign: 'right' }}>
                    {isWin ? '+' : ''}{rVal}R
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION ROW 2 (SESSION, MARKET TABLE, R MULTIPLE) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.6fr 1.2fr',
        gap: '16px'
      }}>
        {/* Card 4: Performance by Session */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Performance by Session</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '110px', height: '110px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(displayData.sessionPnL).map(([name, obj]) => ({ name, value: obj.trades }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {SESSION_COLORS.map((col, idx) => (
                      <Cell key={idx} fill={col} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {Object.entries(displayData.sessionPnL).map(([sess, obj], idx) => (
                <div key={sess} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SESSION_COLORS[idx % SESSION_COLORS.length] }} />
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{sess}</span>
                  </div>
                  <span style={{ fontWeight: '800', color: obj.pnl >= 0 ? COLORS.gain : COLORS.loss }}>
                    {obj.pnl >= 0 ? '+' : ''}${(obj.pnl / 200).toFixed(2)}R
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 5: Performance by Market */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Performance by Market</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: COLORS.muted, textTransform: 'uppercase', fontSize: '10px' }}>
                <th style={{ textAlign: 'left', padding: '8px 0' }}>Market</th>
                <th style={{ textAlign: 'center', padding: '8px 0' }}>Trades</th>
                <th style={{ textAlign: 'center', padding: '8px 0' }}>Win Rate</th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Avg R</th>
              </tr>
            </thead>
            <tbody>
              {displayData.marketList.map(row => (
                <tr key={row.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 0', fontWeight: '800', color: '#fff' }}>{row.symbol}</td>
                  <td style={{ padding: '10px 0', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{row.trades}</td>
                  <td style={{ padding: '10px 0', textAlign: 'center', color: '#fff' }}>{row.winRate}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '800', color: (row.totalR ?? 0) >= 0 ? COLORS.gain : COLORS.loss }}>{row.avgR}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 6: R Multiple Breakdown */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>R Multiple Breakdown</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Average Win</span>
              <span style={{ fontWeight: '800', color: COLORS.gain }}>
                {displayData.winsCount > 0 ? `+${(displayData.avgWin / 200).toFixed(2)}R` : '+0.00R'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Average Loss</span>
              <span style={{ fontWeight: '800', color: COLORS.loss }}>
                {displayData.lossesCount > 0 ? `-${(displayData.avgLoss / 200).toFixed(2)}R` : '-0.00R'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Best Trade</span>
              <span style={{ fontWeight: '800', color: COLORS.gain }}>
                {displayData.bestTradePnL !== 0 ? `${displayData.bestTradePnL >= 0 ? '+' : ''}${(displayData.bestTradePnL / 200).toFixed(2)}R` : '0.00R'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Worst Trade</span>
              <span style={{ fontWeight: '800', color: COLORS.loss }}>
                {displayData.worstTradePnL !== 0 ? `${displayData.worstTradePnL >= 0 ? '+' : ''}${(displayData.worstTradePnL / 200).toFixed(2)}R` : '0.00R'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: '700' }}>Avg Win / Avg Loss Ratio</span>
              <span style={{ fontWeight: '800', color: '#b86eff' }}>
                {displayData.avgLoss > 0 ? (displayData.avgWin / displayData.avgLoss).toFixed(2) : displayData.avgWin > 0 ? '9.99' : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION ROW 3 (MONTHLY PERF, WIN RATE TREND, TRADE GRADE DISTRIBUTION) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1.5fr 1fr',
        gap: '16px'
      }}>
        {/* Card 7: Monthly Performance (R) */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Monthly Performance (R)</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(() => {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const monthlyR = {};
                filteredTrades.forEach(trade => {
                  if (!trade.date) return;
                  const d = new Date(trade.date);
                  const key = months[d.getMonth()];
                  const tradeExecs = executions.filter(e => e.tradeId === trade.id);
                  const math = calculateTradePnL(trade, tradeExecs);
                  const r = math.netPnL / (trade.riskAmount || 200);
                  if (!monthlyR[key]) monthlyR[key] = { month: key, r: 0 };
                  monthlyR[key].r += r;
                });
                return months
                  .filter(m => monthlyR[m])
                  .map(m => ({ month: m, r: parseFloat(monthlyR[m].r.toFixed(2)) }));
              })()}>
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} tickFormatter={v => `${v}R`} />
                <Tooltip
                  contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => [`${value >= 0 ? '+' : ''}${value}R`, 'Total R']}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                  {(() => {
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const monthlyR = {};
                    filteredTrades.forEach(trade => {
                      if (!trade.date) return;
                      const d = new Date(trade.date);
                      const key = months[d.getMonth()];
                      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
                      const math = calculateTradePnL(trade, tradeExecs);
                      const r = math.netPnL / (trade.riskAmount || 200);
                      if (!monthlyR[key]) monthlyR[key] = { month: key, r: 0 };
                      monthlyR[key].r += r;
                    });
                    return months
                      .filter(m => monthlyR[m])
                      .map((m, i) => (
                        <Cell key={i} fill={monthlyR[m].r >= 0 ? '#b86eff' : COLORS.loss} />
                      ));
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 8: Win Rate Over Time */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Win Rate Over Time</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winRateOverTimeData}>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Line type="monotone" dataKey="winRate" stroke="#b86eff" strokeWidth={2} dot={{ fill: '#b86eff', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 9: Trade Grade Distribution */}
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '18px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Trade Grade Distribution</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '110px', height: '110px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(displayData.gradeMap).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {RATING_COLORS.map((col, idx) => (
                      <Cell key={idx} fill={col} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', flex: 1 }}>
              {Object.entries(displayData.gradeMap).map(([grade, val], idx) => (
                <div key={grade} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: RATING_COLORS[idx % RATING_COLORS.length] }} />
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Grade {grade}</span>
                  </div>
                  <span style={{ fontWeight: '800', color: '#fff' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      

        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* ---------------- NEW EDGE STATS TABLES ---------------- */}
{/* SETUP & EDGE STATISTICS BREAKDOWN SECTION (MATCHING SCREENSHOTS) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
              Setup & Edge Statistics
            </h2>
            <p style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>
              Performance breakdown across Entry Timeframes, DOL Targets, PO3 Timings, Models, and Ratings
            </p>
          </div>

          {/* Sub-Category Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { id: 'all', label: 'All Tables' },
              { id: 'timeframes', label: 'Entry Timeframes' },
              { id: 'dol', label: 'DOL Targets' },
              { id: 'po3', label: 'PO3 Timings' },
              { id: 'models', label: 'Models' },
              { id: 'ratings', label: 'Ratings' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveEdgeCategory(cat.id)}
                style={{
                  background: activeEdgeCategory === cat.id ? '#b86eff' : 'transparent',
                  color: activeEdgeCategory === cat.id ? '#000' : 'rgba(255,255,255,0.6)',
                  fontWeight: activeEdgeCategory === cat.id ? '800' : '500',
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-COLUMN GRID OF BREAKDOWN TABLES MATCHING SCREENSHOTS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          {(activeEdgeCategory === 'all' || activeEdgeCategory === 'timeframes') && (
            renderBreakdownTable('Entry Timeframes', edgeDisplayData.timeframes, <Tag size={16} color="#b86eff" />)
          )}

          {(activeEdgeCategory === 'all' || activeEdgeCategory === 'dol') && (
            renderBreakdownTable('Draw on Liquidity (DOL Targets)', edgeDisplayData.dols, <Target size={16} color="#64d2ff" />)
          )}

          {(activeEdgeCategory === 'all' || activeEdgeCategory === 'po3') && (
            renderBreakdownTable('PO3 Timings', edgeDisplayData.po3, <Clock size={16} color="#ffd60a" />)
          )}

          {(activeEdgeCategory === 'all' || activeEdgeCategory === 'models') && (
            renderBreakdownTable('Entry Models', edgeDisplayData.models, <Layers size={16} color="#30d158" />)
          )}

          {(activeEdgeCategory === 'all' || activeEdgeCategory === 'ratings') && (
            renderBreakdownTable('Trade Rating Quality', edgeDisplayData.ratings, <Award size={16} color="#ff9f0a" />)
          )}

          {activeEdgeCategory === 'all' && (
            renderBreakdownTable('Weekday Performance', edgeDisplayData.weekdays, <Calendar size={16} color="#ff375f" />)
          )}
        </div>
      </div>

      
        </div>
      )}
{/* PAYOUT TRACKER MODAL */}
      <AnimatePresence>
        {isPayoutModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setIsPayoutModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                background: '#0f0f11',
                border: '1px solid rgba(184, 110, 255, 0.3)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '560px',
                padding: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>Payout Tracker & Proof Certificates</h2>
                  <p style={{ fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>
                    Record your payouts and upload funding proof certificates
                  </p>
                </div>
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Add New Payout Form */}
              <form onSubmit={handleAddPayout} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#b86eff' }}>+ Log New Payout</span>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: COLORS.muted, display: 'block', marginBottom: '4px' }}>Payout Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="2500.00"
                      value={payoutAmount}
                      onChange={e => setPayoutAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: COLORS.muted, display: 'block', marginBottom: '4px' }}>Payout Date</label>
                    <input
                      type="date"
                      value={payoutDate}
                      onChange={e => setPayoutDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: COLORS.muted, display: 'block', marginBottom: '4px' }}>Account / Prop Firm Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex 50k #1, Topstep 150k"
                    value={payoutAccount}
                    onChange={e => setPayoutAccount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Upload Certificate Photo / Proof */}
                <div>
                  <label style={{ fontSize: '11px', color: COLORS.muted, display: 'block', marginBottom: '4px' }}>Proof Certificate (Optional Photo/PDF)</label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'rgba(184, 110, 255, 0.08)',
                    border: '1px border-dashed #b86eff',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#b86eff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}>
                    <Upload size={16} />
                    <span>{certificateDataUrl ? 'Certificate Attached ✓' : 'Upload Proof Certificate'}</span>
                    <input type="file" accept="image/*" onChange={handleCertificateUpload} style={{ display: 'none' }} />
                  </label>
                  {certificateDataUrl && (
                    <div style={{ marginTop: '8px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(184,110,255,0.4)', position: 'relative' }}>
                      <img src={certificateDataUrl} alt="Certificate Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setCertificateDataUrl('')}
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #b86eff, #8a30f6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Save Payout Record
                </button>
              </form>

              {/* Logged Payouts History List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>Payout History</span>

                {payoutsList.length === 0 ? (
                  <div style={{ fontSize: '12px', color: COLORS.muted, textAlign: 'center', padding: '16px' }}>No payouts logged yet</div>
                ) : (
                  payoutsList.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {item.certificateUrl ? (
                          <div
                            onClick={() => setSelectedCertificateLightbox(item.certificateUrl)}
                            style={{ width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #b86eff', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <img src={item.certificateUrl} alt="Certificate Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(184, 110, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b86eff', flexShrink: 0 }}>
                            <Award size={20} />
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.gain }}>
                            +${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', color: COLORS.muted }}>
                            {item.accountName} • {item.date}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePayout(item.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,69,58,0.6)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate Lightbox Modal */}
      <AnimatePresence>
        {selectedCertificateLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCertificateLightbox(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <button
              onClick={() => setSelectedCertificateLightbox(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
            <img src={selectedCertificateLightbox} alt="Payout Certificate Lightbox" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
