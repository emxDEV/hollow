import React, { useState, useMemo } from 'react';
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

  // Active sub-tab in Edge Analytics: 'all' | 'timeframes' | 'dol' | 'po3' | 'models' | 'ratings' | 'days'
  const [activeEdgeCategory, setActiveEdgeCategory] = useState('all');

  // Payout Tracker Modal State & Persistence
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutsList, setPayoutsList] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowPayoutsList');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'p1', amount: 2500, date: '2026-08-01', accountName: 'Apex 50k #1', certificateUrl: '' },
      { id: 'p2', amount: 2320, date: '2026-07-15', accountName: 'Topstep 150k', certificateUrl: '' }
    ];
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

  // Comprehensive Edge Statistics Aggregation Engine (Timeframe, DOL, PO3, Models, Ratings, Days)
  const edgeStats = useMemo(() => {
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
      if (trade.po3Time) processItem(po3Map, trade.po3Time, pnl, risk);

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

    const formatList = (map) => {
      return Object.values(map).map(item => {
        const winRate = item.trades > 0 ? ((item.wins / item.trades) * 100).toFixed(1) : '0.0';
        const avgR = item.trades > 0 ? (item.totalR / item.trades).toFixed(2) : '0.00';
        return {
          ...item,
          winRatePct: parseFloat(winRate),
          winRateStr: `${winRate}%`,
          avgR: parseFloat(avgR),
          totalR: parseFloat(item.totalR.toFixed(2))
        };
      }).sort((a, b) => b.trades - a.trades);
    };

    return {
      timeframes: formatList(timeframesMap),
      dols: formatList(dolsMap),
      po3: formatList(po3Map),
      models: formatList(modelsMap),
      ratings: formatList(ratingsMap),
      sides: formatList(sideMap),
      weekdays: Object.values(weekdaysMap).map(item => {
        const winRate = item.trades > 0 ? ((item.wins / item.trades) * 100).toFixed(1) : '0.0';
        const avgR = item.trades > 0 ? (item.totalR / item.trades).toFixed(2) : '0.00';
        return {
          ...item,
          winRatePct: parseFloat(winRate),
          winRateStr: `${winRate}%`,
          avgR: parseFloat(avgR),
          totalR: parseFloat(item.totalR.toFixed(2))
        };
      })
    };
  }, [filteredTrades, executions]);

  // Demo Fallback Data for Edge Analytics if user has no trades yet
  const isDataEmpty = filteredTrades.length === 0;
  const edgeDisplayData = isDataEmpty ? {
    timeframes: [
      { name: '1m', trades: 8, winRatePct: 75.0, winRateStr: '75.0%', avgR: 1.85, totalR: 14.80 },
      { name: '30s', trades: 5, winRatePct: 60.0, winRateStr: '60.0%', avgR: 1.12, totalR: 5.60 },
      { name: '2m', trades: 4, winRatePct: 50.0, winRateStr: '50.0%', avgR: 0.75, totalR: 3.00 },
      { name: '3m', trades: 3, winRatePct: 33.3, winRateStr: '33.3%', avgR: -0.40, totalR: -1.20 },
      { name: '15s', trades: 2, winRatePct: 100.0, winRateStr: '100.0%', avgR: 2.20, totalR: 4.40 }
    ],
    dols: [
      { name: 'HTF alignment', trades: 9, winRatePct: 77.8, winRateStr: '77.8%', avgR: 1.92, totalR: 17.28 },
      { name: 'Unmitigated Imbalances', trades: 6, winRatePct: 66.7, winRateStr: '66.7%', avgR: 1.45, totalR: 8.70 },
      { name: 'LRLR', trades: 5, winRatePct: 60.0, winRateStr: '60.0%', avgR: 1.20, totalR: 6.00 },
      { name: 'PDH / PDL', trades: 4, winRatePct: 50.0, winRateStr: '50.0%', avgR: 0.65, totalR: 2.60 },
      { name: 'Data High / Low', trades: 2, winRatePct: 0.0, winRateStr: '0.0%', avgR: -1.00, totalR: -2.00 }
    ],
    po3: [
      { name: '09:30', trades: 10, winRatePct: 70.0, winRateStr: '70.0%', avgR: 1.64, totalR: 16.40 },
      { name: '10:00', trades: 7, winRatePct: 57.1, winRateStr: '57.1%', avgR: 1.10, totalR: 7.70 },
      { name: '10:15', trades: 4, winRatePct: 50.0, winRateStr: '50.0%', avgR: 0.50, totalR: 2.00 },
      { name: '12:00', trades: 3, winRatePct: 100.0, winRateStr: '100.0%', avgR: 2.10, totalR: 6.30 }
    ],
    models: [
      { name: 'MXM', trades: 11, winRatePct: 72.7, winRateStr: '72.7%', avgR: 1.78, totalR: 19.58 },
      { name: 'MECH', trades: 6, winRatePct: 50.0, winRateStr: '50.0%', avgR: 0.80, totalR: 4.80 },
      { name: 'CONT', trades: 4, winRatePct: 75.0, winRateStr: '75.0%', avgR: 1.40, totalR: 5.60 }
    ],
    ratings: [
      { name: 'A+', trades: 12, winRatePct: 83.3, winRateStr: '83.3%', avgR: 2.15, totalR: 25.80 },
      { name: 'A', trades: 7, winRatePct: 57.1, winRateStr: '57.1%', avgR: 1.05, totalR: 7.35 },
      { name: 'B', trades: 6, winRatePct: 33.3, winRateStr: '33.3%', avgR: -0.25, totalR: -1.50 },
      { name: 'F', trades: 3, winRatePct: 0.0, winRateStr: '0.0%', avgR: -1.00, totalR: -3.00 }
    ],
    sides: [
      { name: 'Long', trades: 16, winRatePct: 68.8, winRateStr: '68.8%', avgR: 1.62, totalR: 25.92 },
      { name: 'Short', trades: 12, winRatePct: 41.7, winRateStr: '41.7%', avgR: 0.45, totalR: 5.40 }
    ],
    weekdays: [
      { name: 'Monday', trades: 5, winRatePct: 80.0, winRateStr: '80.0%', avgR: 1.90, totalR: 9.50 },
      { name: 'Tuesday', trades: 6, winRatePct: 66.7, winRateStr: '66.7%', avgR: 1.40, totalR: 8.40 },
      { name: 'Wednesday', trades: 7, winRatePct: 42.9, winRateStr: '42.9%', avgR: 0.35, totalR: 2.45 },
      { name: 'Thursday', trades: 6, winRatePct: 66.7, winRateStr: '66.7%', avgR: 1.50, totalR: 9.00 },
      { name: 'Friday', trades: 4, winRatePct: 50.0, winRateStr: '50.0%', avgR: 0.50, totalR: 2.00 }
    ]
  } : edgeStats;

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
            {isDataEmpty && (
              <span style={{ background: 'rgba(184, 110, 255, 0.15)', color: '#b86eff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '100px', border: '1px solid rgba(184, 110, 255, 0.3)' }}>
                Demo View Mode
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: COLORS.muted, marginTop: '4px' }}>
            Detailed performance insights and edge statistics of your trading
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
            borderRadius: '100px',
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
              {edgeDisplayData.ratings[0]?.winRateStr || '72.5%'}
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
                strokeDasharray="72.5, 100"
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
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>+1.42R</div>
          <span style={{ fontSize: '10px', color: COLORS.gain, fontWeight: '700' }}>+0.18R vs prev. 30 days</span>
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
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>1.83</div>
          <span style={{ fontSize: '9px', color: COLORS.gain, background: 'rgba(48,209,88,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', width: 'fit-content' }}>Good</span>
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
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>0.72R</div>
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
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>28</div>
          <span style={{ fontSize: '10px', color: COLORS.gain, fontWeight: '700' }}>+7 vs prev. 30 days</span>
        </div>
      </div>

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
