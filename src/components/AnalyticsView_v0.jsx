import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL, isTradeBE, isTradeWinRateEligible } from '../utils/tradeMath';
import {
  BarChart2, Calendar, Filter, TrendingUp, TrendingDown,
  DollarSign, Activity, ChevronDown, Percent, Award, Info, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ComposedChart, Legend
} from 'recharts';
import useUIStore from '../store/useUIStore';

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

  // Reactively query trades and executions
  const trades = useLiveQuery(() => db.trades.toArray(), []) || [];
  const executions = useLiveQuery(() => db.executions.toArray(), []) || [];

  // Filter trades by timeframe and symbol
  const filteredTrades = useMemo(() => {
    let list = [...trades];
    if (symbolFilter !== 'All') {
      list = list.filter(t => t.symbol === symbolFilter);
    }

    const now = new Date();
    if (timeframe === '7D') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= cutoff);
    } else if (timeframe === '30D') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= cutoff);
    } else if (timeframe === '90D') {
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= cutoff);
    } else if (timeframe === '6M') {
      const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= cutoff);
    } else if (timeframe === '1Y') {
      const cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      list = list.filter(t => new Date(t.date) >= cutoff);
    }
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades, timeframe, symbolFilter]);

  // Compute calculated trade metrics
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
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const math = calculateTradePnL(trade, tradeExecs);
      const pnl = math.netPnL;
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

      // PnL R Distribution Bins (assuming avg risk $200 per trade if R not set)
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
      marketList: Object.values(marketMap),
      gradeMap,
      pnlDistributionBins
    };
  }, [filteredTrades, executions]);

  // Demo fallback values if no trades exist yet to wowed user visually
  const isDataEmpty = filteredTrades.length === 0;
  const displayData = isDataEmpty ? {
    totalPnL: 4820,
    winRate: '57.1',
    winsCount: 16,
    lossesCount: 12,
    beCount: 0,
    totalCount: 28,
    avgR: '1.42',
    profitFactor: '1.83',
    expectancy: '0.72',
    bestTradePnL: 728,
    worstTradePnL: -440,
    equityCurvePoints: [
      { date: 'Jul 11', balance: 92000 },
      { date: 'Jul 16', balance: 95500 },
      { date: 'Jul 21', balance: 93800 },
      { date: 'Jul 26', balance: 101240 },
      { date: 'Jul 31', balance: 99400 },
      { date: 'Aug 5', balance: 104200 },
      { date: 'Aug 10', balance: 108000 }
    ],
    dayOfWeekPnL: { Mon: 248, Tue: 168, Wed: -42, Thu: 224, Fri: 272 },
    sessionPnL: {
      'New York': { trades: 18, pnl: 3240, percent: 45.3 },
      'London': { trades: 8, pnl: 1420, percent: 31.7 },
      'Asian': { trades: 3, pnl: 450, percent: 17.1 },
      'Pre-Market': { trades: 1, pnl: -120, percent: 5.9 }
    },
    marketList: [
      { symbol: 'NQ', trades: 18, winRate: '61.1%', pnl: 3240, avgR: '+1.62R' },
      { symbol: 'ES', trades: 7, winRate: '42.9%', pnl: 980, avgR: '+0.98R' },
      { symbol: 'MNQ', trades: 3, winRate: '66.7%', pnl: 600, avgR: '+1.33R' }
    ],
    gradeMap: { 'A+ / A': 11, 'B': 9, 'C': 6, 'F': 2 },
    pnlDistributionBins: {
      '<-2R': 1, '-2R': 2, '-1R': 4, '-0.5R': 3, '0R': 1,
      '0.5R': 6, '1R': 5, '2R': 4, '>2R': 2
    }
  } : analyticsData;

  // Session Pie chart colors
  const SESSION_COLORS = ['#b86eff', '#64d2ff', '#30d158', '#ff453a'];
  // Rating Pie chart colors
  const RATING_COLORS = ['#30d158', '#b86eff', '#ffd60a', '#ff453a'];

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
            {isDataEmpty && (
              <span style={{ background: 'rgba(184, 110, 255, 0.15)', color: '#b86eff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(184, 110, 255, 0.3)' }}>
                Demo View Mode
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: COLORS.muted, marginTop: '4px' }}>
            Detailed performance insights of your trading
          </p>
        </div>

        {/* Header Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Timeframe Filter Pills Bar */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
            padding: '3px'
          }}>
            {['7D', '30D', '90D', '6M', '1Y', 'All'].map(tf => {
              const isSel = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
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

          {/* Date Picker Display Button */}
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            <Calendar size={14} color="#b86eff" />
            <span>Jul 11 – Aug 10, 2026</span>
            <ChevronDown size={13} style={{ opacity: 0.5 }} />
          </button>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: showFilters ? 'rgba(184, 110, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: showFilters ? '1px solid #b86eff' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '8px 14px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Filter size={14} color="#b86eff" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS DROPDOWN */}
      {showFilters && (
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.muted, display: 'block', marginBottom: '4px' }}>Symbol / Market</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'NQ', 'ES'].map(sym => (
                <button
                  key={sym}
                  onClick={() => setSymbolFilter(sym)}
                  style={{
                    background: symbolFilter === sym ? '#fff' : 'rgba(255,255,255,0.05)',
                    color: symbolFilter === sym ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOP 6 PERFORMANCE METRIC CARDS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
        gap: '14px'
      }}>
        {/* Card 1: Net P&L */}
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
          <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.muted }}>Net P&L</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: displayData.totalPnL >= 0 ? COLORS.gain : COLORS.loss, letterSpacing: '-0.02em' }}>
            {displayData.totalPnL >= 0 ? '+' : ''}${Math.abs(displayData.totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '10px', color: COLORS.gain, fontWeight: '700' }}>
            +8.42% vs prev. 30 days
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
              {displayData.winRate}%
            </div>
            <span style={{ fontSize: '10px', color: COLORS.muted }}>
              {displayData.winsCount}W / {displayData.lossesCount}L
            </span>
          </div>

          {/* SVG Donut Ring Gauge */}
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
                strokeDasharray={`${displayData.winRate}, 100`}
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
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>
            {displayData.avgR}R
          </div>
          <span style={{ fontSize: '10px', color: COLORS.gain, fontWeight: '700' }}>
            +0.18R vs prev. 30 days
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
            {displayData.profitFactor}
          </div>
          <span style={{
            fontSize: '9px',
            color: COLORS.gain,
            background: 'rgba(48,209,88,0.15)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: '800',
            width: 'fit-content'
          }}>
            Good
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
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>
            {displayData.expectancy}R
          </div>
          <span style={{ fontSize: '10px', color: COLORS.muted }}>
            Per Trade
          </span>
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
          <span style={{ fontSize: '10px', color: COLORS.gain, fontWeight: '700' }}>
            +7 vs prev. 30 days
          </span>
        </div>
      </div>

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

          {/* Bar Chart Bins */}
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
                  >
                    {SESSION_COLORS.map((col, idx) => (
                      <Cell key={idx} fill={col} />
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
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Net P&L</th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Avg R</th>
              </tr>
            </thead>
            <tbody>
              {displayData.marketList.map(row => (
                <tr key={row.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 0', fontWeight: '800', color: '#fff' }}>{row.symbol}</td>
                  <td style={{ padding: '10px 0', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{row.trades}</td>
                  <td style={{ padding: '10px 0', textAlign: 'center', color: '#fff' }}>{row.winRate}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '800', color: row.pnl >= 0 ? COLORS.gain : COLORS.loss }}>
                    {row.pnl >= 0 ? '+' : ''}${row.pnl.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '800', color: COLORS.gain }}>{row.avgR}</td>
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
              <span style={{ fontWeight: '800', color: COLORS.gain }}>+1.81R</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Average Loss</span>
              <span style={{ fontWeight: '800', color: COLORS.loss }}>-0.78R</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Best Trade</span>
              <span style={{ fontWeight: '800', color: COLORS.gain }}>+3.64R</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Worst Trade</span>
              <span style={{ fontWeight: '800', color: COLORS.loss }}>-2.21R</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: '700' }}>Avg Win / Avg Loss Ratio</span>
              <span style={{ fontWeight: '800', color: '#b86eff' }}>2.32</span>
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
        {/* Card 7: Monthly Performance */}
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
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Monthly Performance</span>
            <Info size={13} style={{ color: COLORS.muted }} />
          </div>

          <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { month: 'Feb', pnl: 1800 },
                { month: 'Mar', pnl: 3400 },
                { month: 'Apr', pnl: 4200 },
                { month: 'May', pnl: 1900 },
                { month: 'Jun', pnl: -2200 },
                { month: 'Jul', pnl: 3800 },
                { month: 'Aug', pnl: 4820 }
              ]}>
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <Bar dataKey="pnl" fill="#b86eff" radius={[4, 4, 0, 0]} />
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
              <LineChart data={[
                { date: 'Jul 11', winRate: 50 },
                { date: 'Jul 16', winRate: 58 },
                { date: 'Jul 21', winRate: 52 },
                { date: 'Jul 26', winRate: 64 },
                { date: 'Jul 31', winRate: 59 },
                { date: 'Aug 5', winRate: 62 },
                { date: 'Aug 10', winRate: 57.1 }
              ]}>
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
                  >
                    {RATING_COLORS.map((col, idx) => (
                      <Cell key={idx} fill={col} />
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
  );
}
