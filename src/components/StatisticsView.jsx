import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Award, Compass, ShieldAlert, Zap, TrendingUp, TrendingDown,
  Clock, Activity, AlertCircle, Calendar, Sparkles, CheckCircle,
  Camera, RotateCw, Download, ChevronDown, ChevronUp, PieChart, RefreshCw, BarChart2, Target, DollarSign, Hash, Percent, ArrowUpRight, ArrowDownRight, Filter, Crosshair, HelpCircle, FileText, Smartphone, Tablet, Monitor
} from 'lucide-react';
import HollowSelect from './HollowSelect';
import { exportToPDF } from '../utils/pdfExport';
import { calculateTradePnL, isTradeBE, isTradeWinRateEligible } from '../utils/tradeMath';
import useUIStore from '../store/useUIStore';


const STOIC_QUOTES = {
  win: [
    { text: "No random actions, none not based on underlying principles.", author: "Marcus Aurelius" },
    { text: "If you want steady, choose discipline. If you want fleeting, choose motivation.", author: "Stoic Maxim" },
    { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
    { text: "Keep constant guard over your perceptions, for they are the source of all your actions.", author: "Epictetus" }
  ],
  loss: [
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Difficulty is what wakes up the genius.", author: "Seneca" }
  ]
};

const getMondayOfDate = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export default function StatisticsView({ trades, executions, selectedAccountId }) {
  const isMobile = useUIStore(state => state.isMobile);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'playbook', 'discipline', 'time'
  const [exportMode, setExportMode] = useState('daily'); // 'daily' | 'weekly'
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'playbook', name: 'Playbook Edge', icon: Compass },
    { id: 'discipline', name: 'Discipline & Leakage', icon: ShieldAlert },
    { id: 'time', name: 'Time & Session', icon: Clock }
  ];

  // 1. Filter trades to this account
  const accountTrades = useMemo(() => {
    if (selectedAccountId === 'all') return trades;
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  // 2. Map trade details and calculate individual trade metrics
  const tradeMetrics = useMemo(() => {
    return accountTrades.map(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const pnlDetails = calculateTradePnL(trade, tradeExecs);

      // Hold time calculation: Exit Time - Entry Time
      let holdTimeMs = 0;
      if (tradeExecs.length > 0) {
        const sortedExecs = [...tradeExecs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const entries = sortedExecs.filter(e => e.type === 'ENTRY');
        const exits = sortedExecs.filter(e => e.type === 'EXIT');
        if (entries.length > 0 && exits.length > 0) {
          holdTimeMs = new Date(exits[exits.length - 1].timestamp) - new Date(entries[0].timestamp);
        }
      }

      return {
        ...trade,
        ...pnlDetails,
        holdTimeMs
      };
    });
  }, [accountTrades, executions]);

  // 2b. Group trade metrics by date to compute daily P&L records for export
  const dailyPnLRecords = useMemo(() => {
    const dailyMap = {};
    tradeMetrics.forEach(t => {
      if (!t.date) return;
      const dateKey = t.date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          netPnL: 0,
          tradesCount: 0,
          winCount: 0,
          bestReturn: -Infinity,
          tickers: new Set(),
          mistakesCount: 0
        };
      }
      const record = dailyMap[dateKey];
      record.netPnL += t.netPnL;
      record.tradesCount += 1;
      if (isTradeWinRateEligible(t)) {
        if (t.netPnL > 0) {
          record.winCount += 1;
        }
      }
      if (t.netPnL > record.bestReturn) {
        record.bestReturn = t.netPnL;
      }
      if (t.symbol) {
        record.tickers.add(t.symbol);
      }
    });

    return Object.values(dailyMap)
      .map(record => ({
        ...record,
        bestReturn: record.bestReturn === -Infinity ? 0 : record.bestReturn,
        winRate: record.tradesCount > 0 ? Math.round((record.winCount / record.tradesCount) * 100) : 0,
        tickersList: Array.from(record.tickers).join(', ')
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [tradeMetrics]);

  // 2c. Group trade metrics by week to compute weekly P&L records for export
  const weeklyPnLRecords = useMemo(() => {
    const weeklyMap = {};
    tradeMetrics.forEach(t => {
      if (!t.date) return;
      const mondayKey = getMondayOfDate(t.date);
      if (!weeklyMap[mondayKey]) {
        weeklyMap[mondayKey] = {
          monday: mondayKey,
          netPnL: 0,
          tradesCount: 0,
          winCount: 0,
          bestReturn: -Infinity,
          tickers: new Set()
        };
      }
      const record = weeklyMap[mondayKey];
      record.netPnL += t.netPnL;
      record.tradesCount += 1;
      if (isTradeWinRateEligible(t)) {
        if (t.netPnL > 0) {
          record.winCount += 1;
        }
      }
      if (t.netPnL > record.bestReturn) {
        record.bestReturn = t.netPnL;
      }
      if (t.symbol) {
        record.tickers.add(t.symbol);
      }
    });

    return Object.values(weeklyMap)
      .map(record => {
        const monDate = new Date(record.monday);
        const friDate = new Date(monDate);
        friDate.setDate(monDate.getDate() + 4);
        const rangeStr = `${record.monday} — ${friDate.toISOString().split('T')[0]}`;
        
        return {
          ...record,
          rangeLabel: rangeStr,
          bestReturn: record.bestReturn === -Infinity ? 0 : record.bestReturn,
          winRate: record.tradesCount > 0 ? Math.round((record.winCount / record.tradesCount) * 100) : 0,
          tickersList: Array.from(record.tickers).join(', ')
        };
      })
      .sort((a, b) => new Date(b.monday) - new Date(a.monday));
  }, [tradeMetrics]);

  // Reset quote index on export mode change
  useEffect(() => {
    setQuoteIndex(0);
  }, [exportMode]);

  const activeRecord = useMemo(() => {
    if (exportMode === 'daily') {
      return dailyPnLRecords.length > 0 ? dailyPnLRecords[0] : null;
    } else {
      return weeklyPnLRecords.length > 0 ? weeklyPnLRecords[0] : null;
    }
  }, [exportMode, dailyPnLRecords, weeklyPnLRecords]);

  const currentQuote = useMemo(() => {
    if (!activeRecord) return { text: "Focus on the process, not the outcome.", author: "Stoic Maxim" };
    const quotesList = activeRecord.netPnL >= 0 ? STOIC_QUOTES.win : STOIC_QUOTES.loss;
    return quotesList[quoteIndex % quotesList.length] || quotesList[0];
  }, [activeRecord, quoteIndex]);

  const handleExportPnLCard = async (mode = exportMode) => {
    const cardId = mode === 'daily' ? 'stoic-pnl-card-preview' : 'stoic-weekly-card-preview';
    const cardEl = document.getElementById(cardId);
    if (!cardEl) return;

    const html2canvas = (await import('html2canvas')).default;

    html2canvas(cardEl, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#000000',
      logging: false
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const record = mode === 'daily'
        ? (dailyPnLRecords.length > 0 ? dailyPnLRecords[0] : null)
        : (weeklyPnLRecords.length > 0 ? weeklyPnLRecords[0] : null);
      const filenameSuffix = mode === 'daily' 
        ? (record?.date || 'daily') 
        : (record?.monday || 'weekly');
      link.download = `hollow_pnl_${mode}_${filenameSuffix}.png`;
      link.href = imgData;
      link.click();
    });
  };

  // 3. Compute Equity Curve & Programmatic Max Drawdown (peak-to-trough)
  const equityCurveAndDrawdown = useMemo(() => {
    const sortedTrades = [...tradeMetrics].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let runningPnL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    const curve = [{
      index: 0,
      date: 'Start',
      symbol: '',
      model: '',
      tradePnL: 0,
      pnl: 0,
      peak: 0,
      drawdown: 0
    }];

    sortedTrades.forEach((t, i) => {
      runningPnL += t.netPnL;
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      const dd = peak - runningPnL;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      curve.push({
        index: i + 1,
        date: t.date,
        symbol: t.symbol,
        model: t.model || 'Unmapped',
        tradePnL: t.netPnL,
        pnl: Math.round(runningPnL),
        peak: Math.round(peak),
        drawdown: Math.round(dd)
      });
    });

    return {
      curve,
      maxDrawdown
    };
  }, [tradeMetrics]);

  // 5. Detailed General Overview KPI Stats
  const overviewStats = useMemo(() => {
    const totalTrades = tradeMetrics.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        beCount: 0,
        winRate: 0,
        activeWinRate: 0,
        profitFactor: 0,
        expectancy: 0,
        avgWin: 0,
        avgLoss: 0,
        winLossRatio: 0,
        maxWin: 0,
        maxLoss: 0,
        avgHoldTimeMs: 0,
        avgWinHoldTimeMs: 0,
        avgLossHoldTimeMs: 0,
        totalNetPnL: 0,
        totalCommissions: 0,
        totalContracts: 0
      };
    }

    let winCount = 0;
    let lossCount = 0;
    let beCount = 0;

    let totalWinPnL = 0;
    let totalLossPnL = 0;
    let totalNetPnL = 0;
    let totalCommissions = 0;
    let totalContracts = 0;

    let maxWin = 0;
    let maxLoss = 0;

    let totalHoldTimeMs = 0;
    let totalWinHoldTimeMs = 0;
    let totalLossHoldTimeMs = 0;

    tradeMetrics.forEach(t => {
      totalNetPnL += t.netPnL;
      totalCommissions += t.commissions;
      totalContracts += t.contracts;

      if (isTradeWinRateEligible(t)) {
        if (t.netPnL > 0) {
          winCount++;
          totalWinPnL += t.netPnL;
          if (t.netPnL > maxWin) maxWin = t.netPnL;
          totalHoldTimeMs += t.holdTimeMs;
          totalWinHoldTimeMs += t.holdTimeMs;
        } else if (t.netPnL < 0) {
          lossCount++;
          totalLossPnL += Math.abs(t.netPnL);
          if (t.netPnL < maxLoss) maxLoss = t.netPnL;
          totalHoldTimeMs += t.holdTimeMs;
          totalLossHoldTimeMs += t.holdTimeMs;
        }
      }
      
      if (isTradeBE(t)) {
        beCount++;
      }
    });

    const activeTradesCount = winCount + lossCount;
    const winRate = activeTradesCount > 0 ? (winCount / activeTradesCount) * 100 : 0;
    const activeWinRate = winRate;
    const profitFactor = totalLossPnL > 0 ? (totalWinPnL / totalLossPnL) : (totalWinPnL > 0 ? 9.99 : 0);
    const expectancy = totalTrades > 0 ? (totalNetPnL / totalTrades) : 0;

    const avgWin = winCount > 0 ? (totalWinPnL / winCount) : 0;
    const avgLoss = lossCount > 0 ? (totalLossPnL / lossCount) : 0;
    const winLossRatio = avgLoss > 0 ? (avgWin / avgLoss) : 0;

    const avgHoldTimeMs = activeTradesCount > 0 ? (totalHoldTimeMs / activeTradesCount) : 0;
    const avgWinHoldTimeMs = winCount > 0 ? (totalWinHoldTimeMs / winCount) : 0;
    const avgLossHoldTimeMs = lossCount > 0 ? (totalLossHoldTimeMs / lossCount) : 0;

    return {
      totalTrades,
      winCount,
      lossCount,
      beCount,
      winRate,
      activeWinRate,
      profitFactor,
      expectancy,
      avgWin,
      avgLoss,
      winLossRatio,
      maxWin,
      maxLoss,
      avgHoldTimeMs,
      avgWinHoldTimeMs,
      avgLossHoldTimeMs,
      totalNetPnL,
      totalCommissions,
      totalContracts
    };
  }, [tradeMetrics]);

  // 6. Discipline & Capital Leakage Auditing
  const disciplineLeakageStats = useMemo(() => {
    const totalTrades = tradeMetrics.length;
    if (totalTrades === 0) {
      return {
        disciplineRate: 100,
        cleanTradesCount: 0,
        mistakeTradesCount: 0,
        actualPnL: 0,
        mistakeFreePnL: 0,
        leakageAmount: 0,
        mistakeCurve: [],
        mistakesBreakdown: []
      };
    }

    let cleanTradesCount = 0;
    let mistakeTradesCount = 0;

    const sortedTrades = [...tradeMetrics].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const mistakeCurve = [{
      index: 0,
      date: 'Start',
      actual: 0,
      potential: 0,
      leakage: 0
    }];

    let runningActual = 0;
    let runningPotential = 0;

    const mistakesMap = {
      'FOMO': { name: 'FOMO', count: 0, pnl: 0 },
      'Early Exit': { name: 'Early Exit', count: 0, pnl: 0 },
      'Holding Losers': { name: 'Holding Losers', count: 0, pnl: 0 },
      'Averaging Down': { name: 'Averaging Down', count: 0, pnl: 0 },
      'Overtrading': { name: 'Overtrading', count: 0, pnl: 0 },
      'Sizing Up': { name: 'Sizing Up', count: 0, pnl: 0 }
    };

    sortedTrades.forEach((t, i) => {
      const hasMistake = t.mistakes && t.mistakes.length > 0;
      runningActual += t.netPnL;

      if (!hasMistake) {
        cleanTradesCount++;
        runningPotential += t.netPnL;
      } else {
        mistakeTradesCount++;
        t.mistakes.forEach(m => {
          if (mistakesMap[m]) {
            mistakesMap[m].count++;
            mistakesMap[m].pnl += t.netPnL;
          } else {
            mistakesMap[m] = { name: m, count: 1, pnl: t.netPnL };
          }
        });
      }

      mistakeCurve.push({
        index: i + 1,
        date: t.date,
        actual: Math.round(runningActual),
        potential: Math.round(runningPotential),
        leakage: Math.round(runningPotential - runningActual)
      });
    });

    const disciplineRate = (cleanTradesCount / totalTrades) * 100;
    const leakageAmount = runningPotential - runningActual;
    const mistakesBreakdown = Object.values(mistakesMap).filter(m => m.count > 0).sort((a, b) => a.pnl - b.pnl);

    return {
      disciplineRate,
      cleanTradesCount,
      mistakeTradesCount,
      actualPnL: runningActual,
      mistakeFreePnL: runningPotential,
      leakageAmount,
      mistakeCurve,
      mistakesBreakdown
    };
  }, [tradeMetrics]);

  // 7. Strategy Playbook Edge
  const playbookEdgeStats = useMemo(() => {
    const groups = {};

    tradeMetrics.forEach(t => {
      const strategyName = t.model || 'Unmapped Setups';
      if (!groups[strategyName]) {
        groups[strategyName] = {
          name: strategyName,
          trades: [],
          wins: 0,
          losses: 0,
          be: 0,
          totalPnL: 0,
          grossWins: 0,
          grossLosses: 0,
          totalHoldTimeMs: 0
        };
      }

      const g = groups[strategyName];
      g.trades.push(t);
      g.totalPnL += t.netPnL;
      g.totalHoldTimeMs += t.holdTimeMs;

      if (isTradeWinRateEligible(t)) {
        if (t.netPnL > 0) {
          g.wins++;
          g.grossWins += t.netPnL;
        } else if (t.netPnL < 0) {
          g.losses++;
          g.grossLosses += Math.abs(t.netPnL);
        }
      } else {
        g.be++;
      }
    });

    return Object.values(groups).map(g => {
      const totalTrades = g.trades.length;
      const eligibleTradesCount = g.wins + g.losses;
      const winRate = eligibleTradesCount > 0 ? (g.wins / eligibleTradesCount) * 100 : 0;
      const activeTrades = g.wins + g.losses;
      const activeWinRate = activeTrades > 0 ? (g.wins / activeTrades) * 100 : 0;
      const profitFactor = g.grossLosses > 0 ? (g.grossWins / g.grossLosses) : (g.grossWins > 0 ? 9.99 : 0);
      const expectancy = totalTrades > 0 ? (g.totalPnL / totalTrades) : 0;
      const avgHoldTimeMs = activeTrades > 0 ? (g.totalHoldTimeMs / activeTrades) : 0;

      // Sparkline curve data
      const sorted = [...g.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
      let sum = 0;
      const curveData = [{ value: 0 }];
      sorted.forEach(t => {
        sum += t.netPnL;
        curveData.push({ value: Math.round(sum) });
      });

      return {
        name: g.name,
        totalTrades,
        wins: g.wins,
        losses: g.losses,
        be: g.be,
        winRate,
        activeWinRate,
        profitFactor,
        expectancy,
        avgHoldTimeMs,
        totalPnL: g.totalPnL,
        curveData
      };
    }).sort((a, b) => b.totalPnL - a.totalPnL);
  }, [tradeMetrics]);

  // 8. Bionic Setup Rating Audit
  const setupRatingStats = useMemo(() => {
    const ratings = {
      'A+': { name: 'A+ Setup', count: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
      'A': { name: 'A Setup', count: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
      'B': { name: 'B Setup', count: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
      'C': { name: 'C Setup', count: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
      'F': { name: 'F Setup', count: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossWins: 0, grossLosses: 0 }
    };

    tradeMetrics.forEach(t => {
      const r = t.setupRating || 'A';
      if (ratings[r]) {
        const stat = ratings[r];
        stat.count++;
        stat.pnl += t.netPnL;
        if (isTradeWinRateEligible(t)) {
          if (t.netPnL > 0) {
            stat.wins++;
            stat.grossWins += t.netPnL;
          } else if (t.netPnL < 0) {
            stat.losses++;
            stat.grossLosses += Math.abs(t.netPnL);
          }
        } else {
          stat.be++;
        }
      }
    });

    return Object.values(ratings).map(stat => {
      const eligibleTradesCount = stat.wins + stat.losses;
      const activeCount = stat.wins + stat.losses;
      return {
        ...stat,
        winRate: eligibleTradesCount > 0 ? (stat.wins / eligibleTradesCount) * 100 : 0,
        activeWinRate: activeCount > 0 ? (stat.wins / activeCount) * 100 : 0,
        profitFactor: stat.grossLosses > 0 ? (stat.grossWins / stat.grossLosses) : (stat.grossWins > 0 ? 9.99 : 0)
      };
    }).filter(r => r.count > 0);
  }, [tradeMetrics]);

  // 9. Playbook Session Win Matrix Heatmap
  const sessionMatrix = useMemo(() => {
    const sessions = ['London Session', 'NY Open Morning', 'NY Close Session', 'Asia Session'];
    const models = playbookEdgeStats.map(p => p.name);

    if (models.length === 0) {
      return { sessions, models: [], grid: {} };
    }

    const grid = {};
    models.forEach(model => {
      grid[model] = {};
      sessions.forEach(session => {
        grid[model][session] = {
          tradesCount: 0,
          wins: 0,
          losses: 0,
          pnl: 0,
          winRate: null
        };
      });
    });

    tradeMetrics.forEach(t => {
      const model = t.model || 'Unmapped Setups';
      if (!grid[model]) return;

      let session = 'NY Open Morning'; // Default fallback

      const tradeExecs = executions.filter(e => e.tradeId === t.id && e.type === 'ENTRY');
      if (tradeExecs.length > 0) {
        const date = new Date(tradeExecs[0].timestamp);
        if (!isNaN(date.getTime())) {
          const utcHour = date.getUTCHours();
          if (utcHour >= 7 && utcHour < 13) {
            session = 'London Session';
          } else if (utcHour >= 13 && utcHour < 17) {
            session = 'NY Open Morning';
          } else if (utcHour >= 17 && utcHour < 21) {
            session = 'NY Close Session';
          } else {
            session = 'Asia Session';
          }
        }
      } else {
        const text = ((t.commentBias || '') + ' ' + (t.confluences || []).join(' ')).toLowerCase();
        if (text.includes('london') || text.includes('lnd')) {
          session = 'London Session';
        } else if (text.includes('afternoon') || text.includes('pm') || text.includes('close')) {
          session = 'NY Close Session';
        } else if (text.includes('asia') || text.includes('tokyo') || text.includes('sydney')) {
          session = 'Asia Session';
        } else {
          session = 'NY Open Morning';
        }
      }

      const cell = grid[model][session];
      cell.tradesCount++;
      cell.pnl += t.netPnL;
      if (isTradeWinRateEligible(t)) {
        if (t.netPnL > 0) cell.wins++;
        else if (t.netPnL < 0) cell.losses++;
      }
    });

    models.forEach(model => {
      sessions.forEach(session => {
        const cell = grid[model][session];
        const activeCount = cell.wins + cell.losses;
        cell.winRate = activeCount > 0 ? Math.round((cell.wins / activeCount) * 100) : null;
      });
    });

    return { sessions, models, grid };
  }, [playbookEdgeStats, tradeMetrics, executions]);

  // 10. Day of Week performance
  const dayOfWeekStats = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = {
      'Sunday': { name: 'Sun', pnl: 0, trades: 0, wins: 0, losses: 0 },
      'Monday': { name: 'Mon', pnl: 0, trades: 0, wins: 0, losses: 0 },
      'Tuesday': { name: 'Tue', pnl: 0, trades: 0, wins: 0, losses: 0 },
      'Wednesday': { name: 'Wed', pnl: 0, trades: 0, wins: 0, losses: 0 },
      'Thursday': { name: 'Thu', pnl: 0, trades: 0, wins: 0, losses: 0 },
      'Friday': { name: 'Fri', pnl: 0, trades: 0, wins: 0, losses: 0 },
      'Saturday': { name: 'Sat', pnl: 0, trades: 0, wins: 0, losses: 0 }
    };

    tradeMetrics.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const dayName = dayNames[d.getDay()];
      if (days[dayName]) {
        days[dayName].pnl += t.netPnL;
        days[dayName].trades++;
        if (isTradeWinRateEligible(t)) {
          if (t.netPnL > 0) days[dayName].wins++;
          else if (t.netPnL < 0) days[dayName].losses++;
        }
      }
    });

    return Object.values(days)
      .filter(d => d.trades > 0 || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d.name))
      .map(d => {
        const eligibleTrades = d.wins + d.losses;
        return {
          ...d,
          winRate: eligibleTrades > 0 ? Math.round((d.wins / eligibleTrades) * 100) : 0,
          pnl: Math.round(d.pnl)
        };
      });
  }, [tradeMetrics]);

  // 11. Hour of Day execution density
  const hourlyStats = useMemo(() => {
    const hoursMap = {};
    for (let i = 8; i <= 17; i++) {
      hoursMap[i] = { hour: `${i}:00`, pnl: 0, tradesCount: 0, wins: 0, losses: 0 };
    }

    tradeMetrics.forEach(t => {
      const tradeExecs = executions.filter(e => e.tradeId === t.id && e.type === 'ENTRY');
      if (tradeExecs.length > 0) {
        const date = new Date(tradeExecs[0].timestamp);
        if (!isNaN(date.getTime())) {
          const hr = date.getHours(); // Local hour
          if (!hoursMap[hr]) {
            hoursMap[hr] = { hour: `${hr}:00`, pnl: 0, tradesCount: 0, wins: 0, losses: 0 };
          }
          hoursMap[hr].pnl += t.netPnL;
          hoursMap[hr].tradesCount++;
          if (isTradeWinRateEligible(t)) {
            if (t.netPnL > 0) hoursMap[hr].wins++;
            else if (t.netPnL < 0) hoursMap[hr].losses++;
          }
        }
      }
    });

    return Object.values(hoursMap).sort((a, b) => {
      const aHr = parseInt(a.hour.split(':')[0]);
      const bHr = parseInt(b.hour.split(':')[0]);
      return aHr - bHr;
    }).map(h => ({
      ...h,
      pnl: Math.round(h.pnl)
    }));
  }, [tradeMetrics, executions]);

  // 12. Hold Time Bucket calculations
  const holdTimeBuckets = useMemo(() => {
    const buckets = [
      { label: 'Scalp (< 5m)', pnl: 0, count: 0, wins: 0, losses: 0 },
      { label: 'Short Hold (5m-15m)', pnl: 0, count: 0, wins: 0, losses: 0 },
      { label: 'Medium Hold (15m-1h)', pnl: 0, count: 0, wins: 0, losses: 0 },
      { label: 'Long Hold (> 1h)', pnl: 0, count: 0, wins: 0, losses: 0 }
    ];

    tradeMetrics.forEach(t => {
      if (t.holdTimeMs <= 0) return;
      const mins = t.holdTimeMs / 1000 / 60;

      let b;
      if (mins < 5) b = buckets[0];
      else if (mins < 15) b = buckets[1];
      else if (mins < 60) b = buckets[2];
      else b = buckets[3];

      b.pnl += t.netPnL;
      b.count++;
      if (isTradeWinRateEligible(t)) {
        if (t.netPnL > 0) b.wins++;
        else if (t.netPnL < 0) b.losses++;
      }
    });

    return buckets.map(b => {
      const eligibleCount = b.wins + b.losses;
      return {
        ...b,
        winRate: eligibleCount > 0 ? Math.round((b.wins / eligibleCount) * 100) : 0,
        pnl: Math.round(b.pnl)
      };
    });
  }, [tradeMetrics]);

  // Helper calculations for Day of Week insights
  const dayOfWeekInsights = useMemo(() => {
    const activeDays = dayOfWeekStats.filter(d => d.trades > 0);
    if (activeDays.length === 0) return { best: null, worst: null };
    const sorted = [...activeDays].sort((a, b) => b.pnl - a.pnl);
    return {
      best: sorted[0].pnl > 0 ? sorted[0] : null,
      worst: sorted[sorted.length - 1].pnl < 0 ? sorted[sorted.length - 1] : null
    };
  }, [dayOfWeekStats]);

  // Helper calculations for Hour of Day insights
  const hourlyInsights = useMemo(() => {
    const activeHours = hourlyStats.filter(h => h.tradesCount > 0);
    if (activeHours.length === 0) return { best: null, worst: null };
    const sorted = [...activeHours].sort((a, b) => b.pnl - a.pnl);
    return {
      best: sorted[0].pnl > 0 ? sorted[0] : null,
      worst: sorted[sorted.length - 1].pnl < 0 ? sorted[sorted.length - 1] : null
    };
  }, [hourlyStats]);

  // Helper calculations for Hold Time insights
  const holdTimeInsights = useMemo(() => {
    const activeBuckets = holdTimeBuckets.filter(b => b.count > 0);
    if (activeBuckets.length === 0) return { best: null, worst: null };
    const sorted = [...activeBuckets].sort((a, b) => b.pnl - a.pnl);
    return {
      best: sorted[0].pnl > 0 ? sorted[0] : null,
      worst: sorted[sorted.length - 1].pnl < 0 ? sorted[sorted.length - 1] : null
    };
  }, [holdTimeBuckets]);


  // Helper formatting durations
  const formatHoldTime = (ms) => {
    if (!ms || isNaN(ms) || ms <= 0) return '0s';
    const totalSecs = Math.round(ms / 1000);
    if (totalSecs < 60) return `${totalSecs}s`;

    const totalMins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (totalMins < 60) {
      return secs > 0 ? `${totalMins}m ${secs}s` : `${totalMins}m`;
    }

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getHeatColor = (wr) => {
    if (wr === null) return 'rgba(255, 255, 255, 0.01)';
    if (wr >= 70) return 'rgba(58, 219, 129, 0.12)'; 
    if (wr >= 50) return 'rgba(255, 255, 255, 0.08)'; 
    return 'rgba(255, 107, 107, 0.08)'; 
  };

  // Custom tooltips (Cleaned up, no background active block box)
  const CustomEquityTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.date === 'Start') return null;
      return (
        <div style={{
          background: 'rgba(15, 15, 17, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            Trade #{data.index} • {data.date}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Asset & Model:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{data.symbol} • {data.model}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Trade Return:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: data.tradePnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
              {data.tradePnL >= 0 ? '+' : ''}${Math.round(data.tradePnL).toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Account Balance:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
              ${data.pnl.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Peak Drawdown:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: data.drawdown > 0 ? 'var(--colors-loss)' : 'var(--colors-gain)' }}>
              {data.drawdown > 0 ? `-$${data.drawdown.toLocaleString()}` : '$0'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLeakageTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 15, 17, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            Trade #{data.index} • {data.date}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Actual PnL:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: data.actual >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
              ${data.actual.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Mistake-Free PnL:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--colors-gain)' }}>
              ${data.potential.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px' }}>
            <span style={{ fontSize: '12px', color: 'var(--colors-on-dark-mute)' }}>Behavior Leakage:</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--colors-loss)' }}>
              -${data.leakage.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomMistakesTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 15, 17, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{data.name}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--colors-on-dark-mute)' }}>PnL Impact:</span>
            <span style={{ fontWeight: '600', color: data.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
              {data.pnl >= 0 ? '+' : ''}${Math.abs(Math.round(data.pnl)).toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 15, 17, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{data.name || label}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ color: 'var(--colors-on-dark-mute)' }}>Net PnL:</span>
            <span style={{ fontWeight: '600', color: data.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
              {data.pnl >= 0 ? '+' : ''}${Math.round(data.pnl).toLocaleString()}
            </span>
          </div>
          {data.trades !== undefined && (
            <div style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
              {data.trades} trade{data.trades > 1 ? 's' : ''} • {data.winRate}% Win Rate
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomHourTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const activeCount = data.tradesCount;
      const wr = activeCount > 0 ? Math.round((data.wins / activeCount) * 100) : 0;
      return (
        <div style={{
          background: 'rgba(15, 15, 17, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{data.hour}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ color: 'var(--colors-on-dark-mute)' }}>Net PnL:</span>
            <span style={{ fontWeight: '600', color: data.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
              {data.pnl >= 0 ? '+' : ''}${Math.round(data.pnl).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
            {activeCount} trade{activeCount > 1 ? 's' : ''} • {wr}% Win Rate
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomHoldTimeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(15, 15, 17, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{data.name}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ color: 'var(--colors-on-dark-mute)' }}>Net PnL:</span>
            <span style={{ fontWeight: '600', color: data.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
              {data.pnl >= 0 ? '+' : ''}${Math.round(data.pnl).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
            {data.count} trade{data.count > 1 ? 's' : ''} • {data.winRate}% Win Rate
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px',
      boxSizing: 'border-box'
    }}>
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
      
      {/* Header & Navigation */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1>
            <TrendingUp size={28} color="var(--colors-primary)" /> Performance Stats
          </h1>
          <p>
            Quantitative metrics, playbook edge tracking, and psychological leakage reports.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: isMobile ? '100%' : 'auto',
          marginTop: isMobile ? '12px' : '0',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--colors-hairline-dark)',
            backdropFilter: 'blur(10px)'
          }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--colors-primary-dim)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--colors-on-dark-mute)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '500',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    border: isActive ? '1px solid var(--colors-hairline-strong)' : '1px solid transparent'
                  }}
                >
                  <Icon size={13} color={isActive ? 'var(--colors-primary)' : 'var(--colors-stone)'} />
                  {t.name}
                </button>
              );
            })}
          </div>

          {/* Simple Share Button in Header */}
          {accountTrades.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--colors-hairline-dark)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--colors-on-dark-mute)',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '500',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--colors-hairline-dark)';
                  e.currentTarget.style.color = 'var(--colors-on-dark-mute)';
                }}
              >
                <Camera size={13} color="var(--colors-primary)" /> Share PnL
              </button>

              {showShareDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: 'rgba(15, 15, 17, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 200,
                  minWidth: '150px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(12px)'
                }}>
                  <button
                    onClick={() => {
                      setExportMode('daily');
                      setTimeout(() => handleExportPnLCard('daily'), 100);
                      setShowShareDropdown(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: '#e4e4e7',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Download size={11} /> Export Daily PNG
                  </button>
                  <button
                    onClick={() => {
                      setExportMode('weekly');
                      setTimeout(() => handleExportPnLCard('weekly'), 100);
                      setShowShareDropdown(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: '#e4e4e7',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Download size={11} /> Export Weekly PNG
                  </button>
                  
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  
                  <button
                    onClick={() => {
                      setQuoteIndex(prev => prev + 1);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--colors-stone)',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--colors-stone)'}
                  >
                    <RotateCw size={10} /> Cycle Card Quote
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Empty State */}
      {accountTrades.length === 0 ? (
        <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center', gap: '12px', borderStyle: 'dashed' }}>
          <div style={{
            background: 'var(--colors-primary-dim)',
            padding: '16px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--colors-hairline-strong)'
          }}>
            <Calendar size={28} color="var(--colors-primary)" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>No Trades Found</h2>
          <p style={{ color: 'var(--colors-on-dark-mute)', maxWidth: '360px', fontSize: '13px', lineHeight: '1.5' }}>
            There are no trades logged for this account yet. Record execution logs in your Journal to activate quantitative analytics.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* KPI Cards Ribbon */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                
                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid ${overviewStats.totalNetPnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)'}`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>NET PNL</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    {overviewStats.totalNetPnL >= 0 ? '+' : ''}${Math.round(overviewStats.totalNetPnL).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    Commissions: -${Math.round(overviewStats.totalCommissions).toLocaleString()}
                  </div>
                </div>

                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid var(--colors-primary)`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>WIN RATE</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    {overviewStats.activeWinRate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    {overviewStats.winCount} W • {overviewStats.lossCount} L • {overviewStats.beCount} BE
                  </div>
                </div>

                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid ${overviewStats.profitFactor >= 1.5 ? 'var(--colors-gain)' : 'var(--colors-loss)'}`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>PROFIT FACTOR</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    {overviewStats.profitFactor.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    Ratio of gross win to gross loss
                  </div>
                </div>

                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid ${overviewStats.expectancy >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)'}`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>EXPECTANCY</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    {overviewStats.expectancy >= 0 ? '+' : ''}${Math.round(overviewStats.expectancy).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    Avg return per taken trade
                  </div>
                </div>

              </div>

              {/* Equity Curve Area Chart */}
              <div className="hollow-card" style={{ height: '360px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} color="var(--colors-primary)" /> Cumulative Account Performance
                  </h3>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
                    {overviewStats.totalTrades} trades logged
                  </div>
                </div>
                
                <div style={{ flex: 1, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveAndDrawdown.curve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--colors-primary)" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="var(--colors-primary)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.01)" vertical={false} />
                      <XAxis dataKey="index" stroke="var(--colors-stone)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--colors-stone)" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomEquityTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="pnl" stroke="var(--colors-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorPnL)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

        {/* Removed duplicate tab switcher and old share button section */}

              {/* Detailed Quantitative Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                
                {/* Hold Times & Ratios */}
                <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--colors-primary)" /> Position Hold Time Analytics
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline-dark)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Avg Winner Hold Time</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: 'var(--colors-gain)' }}>{formatHoldTime(overviewStats.avgWinHoldTimeMs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline-dark)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Avg Loser Hold Time</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: 'var(--colors-loss)' }}>{formatHoldTime(overviewStats.avgLossHoldTimeMs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline-dark)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Overall Average Hold Time</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px' }}>{formatHoldTime(overviewStats.avgHoldTimeMs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Hold Time Efficiency</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: overviewStats.avgWinHoldTimeMs > overviewStats.avgLossHoldTimeMs ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                        {overviewStats.avgLossHoldTimeMs > 0 ? (overviewStats.avgWinHoldTimeMs / overviewStats.avgLossHoldTimeMs).toFixed(2) : '0.00'}x (Win/Loss)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Sizing & Drawdown */}
                <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} color="var(--colors-primary)" /> Risk & Capital Metrics
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline-dark)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Average Win Size</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: 'var(--colors-gain)' }}>+${Math.round(overviewStats.avgWin).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline-dark)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Average Loss Size</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: 'var(--colors-loss)' }}>-${Math.round(overviewStats.avgLoss).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-hairline-dark)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Max Peak Drawdown</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: 'var(--colors-loss)' }}>-${Math.round(equityCurveAndDrawdown.maxDrawdown).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px' }}>Profit to Drawdown Ratio</span>
                      <span className="mono" style={{ fontWeight: '600', fontSize: '13px', color: overviewStats.totalNetPnL > equityCurveAndDrawdown.maxDrawdown ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                        {equityCurveAndDrawdown.maxDrawdown > 0 ? (overviewStats.totalNetPnL / equityCurveAndDrawdown.maxDrawdown).toFixed(2) : '9.99'}x
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* TAB 2: PLAYBOOK EDGE */}
          {activeTab === 'playbook' && (
            <>
              {/* Playbook Strategies Table */}
              <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={14} color="var(--colors-primary)" /> Playbook Strategy Performance
                </h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--colors-hairline-dark)', color: 'var(--colors-stone)', fontSize: '10px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '8px 12px' }}>Strategy Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Trades</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Win Rate</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Profit Factor</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Expectancy</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Avg Hold Time</th>
                        <th style={{ padding: '8px 12px', width: '130px' }}>Equity Sparkline</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Net PnL</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '12px' }}>
                      {playbookEdgeStats.map(play => (
                        <tr key={play.name} style={{ borderBottom: '1px solid var(--colors-hairline-dark)' }}>
                          <td style={{ padding: '12px 10px', fontWeight: '600', color: '#fff' }}>{play.name}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>{play.totalTrades}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }} className="mono">{play.activeWinRate.toFixed(0)}%</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }} className="mono">{play.profitFactor.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }} className="mono">${Math.round(play.expectancy).toLocaleString()}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }} className="mono">{formatHoldTime(play.avgHoldTimeMs)}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <div style={{ height: '24px', width: '110px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={play.curveData}>
                                  <Line type="monotone" dataKey="value" stroke="var(--colors-primary)" strokeWidth={1.2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '600', color: play.totalPnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }} className="mono">
                            {play.totalPnL >= 0 ? '+' : ''}${Math.round(play.totalPnL).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Setup Quality Ratings and Session Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '20px' }}>
                
                {/* Ratings Audit */}
                <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--colors-primary)" /> Bionic Setup Rating Audit
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                    {setupRatingStats.map(stat => (
                      <div key={stat.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ fontWeight: '700', color: stat.name.startsWith('A+') ? 'var(--colors-primary-bright)' : stat.name.startsWith('A') ? '#fff' : 'var(--colors-stone)' }}>
                            {stat.name}
                          </span>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="mono" style={{ color: stat.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)', fontWeight: '600' }}>
                              {stat.pnl >= 0 ? '+' : ''}${Math.round(stat.pnl).toLocaleString()}
                            </span>
                            <span className="mono" style={{ color: 'var(--colors-stone)', fontSize: '10px' }}>
                              {stat.winRate.toFixed(0)}% WR ({stat.count} trades)
                            </span>
                          </div>
                        </div>
                        
                        {/* Horizontal Progress Bar */}
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--colors-hairline-dark)' }}>
                          <div style={{
                            height: '100%',
                            width: `${stat.winRate}%`,
                            background: stat.winRate >= 70 
                              ? 'var(--colors-gain)' 
                              : stat.winRate >= 50 
                              ? 'var(--colors-primary)' 
                              : 'var(--colors-loss)',
                            borderRadius: '9999px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Playbook Session Matrix Heatmap */}
                <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="var(--colors-primary)" /> Playbook Session Win Matrix
                  </h3>
                  
                  <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--colors-hairline-dark)', color: 'var(--colors-stone)', fontSize: '9px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '6px 8px' }}>Strategy</th>
                          {sessionMatrix.sessions.map(sess => (
                            <th key={sess} style={{ padding: '6px 8px', textAlign: 'center' }}>
                              {sess.replace(' Session', '').replace('NY ', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '11px' }}>
                        {sessionMatrix.models.map(model => (
                          <tr key={model} style={{ borderBottom: '1px solid var(--colors-hairline-dark)' }}>
                            <td style={{ padding: '8px 4px', fontWeight: '600', color: '#fff', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model}</td>
                            {sessionMatrix.sessions.map(session => {
                              const cell = sessionMatrix.grid[model][session];
                              const wr = cell.winRate;
                              return (
                                <td key={session} style={{ padding: '6px', textAlign: 'center' }}>
                                  <div style={{
                                    background: getHeatColor(wr),
                                    padding: '4px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'inline-flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: '58px',
                                    border: wr !== null ? '1px solid rgba(255, 255, 255, 0.03)' : '1px dashed rgba(255,255,255,0.04)'
                                  }}>
                                    {wr !== null ? (
                                      <>
                                        <span className="mono" style={{ fontSize: '10px', fontWeight: '600', color: wr >= 50 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                                          {wr}%
                                        </span>
                                        <span style={{ fontSize: '7px', color: 'var(--colors-stone)', marginTop: '1px' }}>
                                          {cell.tradesCount} Trd
                                        </span>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: '8px', color: 'var(--colors-stone)' }}>-</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* TAB 3: DISCIPLINE & LEAKAGE */}
          {activeTab === 'discipline' && (
            <>
              {/* Leakage Ribbon Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                
                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid ${disciplineLeakageStats.disciplineRate >= 80 ? 'var(--colors-gain)' : 'var(--colors-loss)'}`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>DISCIPLINE RATE</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    {disciplineLeakageStats.disciplineRate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    {disciplineLeakageStats.cleanTradesCount} clean of {overviewStats.totalTrades} positions
                  </div>
                </div>

                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid var(--colors-loss)`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>CAPITAL LEAKAGE</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    ${Math.abs(Math.round(disciplineLeakageStats.leakageAmount)).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    Profits lost due to trading mistakes
                  </div>
                </div>

                <div className="hollow-card" style={{ 
                  padding: '16px 20px', 
                  borderLeft: `3px solid var(--colors-gain)`,
                  background: 'var(--colors-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.8px', textTransform: 'uppercase' }}>MISTAKE-FREE PNL</div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: '600', margin: '4px 0 2px 0', color: '#fff' }}>
                    ${Math.round(disciplineLeakageStats.mistakeFreePnL).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                    Simulated return with rules adhered to
                  </div>
                </div>

              </div>

              {/* Actual vs Potential PnL Comparison Chart */}
              <div className="hollow-card" style={{ height: '340px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="var(--colors-gain)" /> Rule Adherence Growth Benefit (Actual vs. Potential)
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--colors-primary)' }} />
                      <span style={{ color: 'var(--colors-on-dark-mute)' }}>Actual PnL</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--colors-gain)' }} />
                      <span style={{ color: 'var(--colors-on-dark-mute)' }}>Mistake-Free PnL</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ flex: 1, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={disciplineLeakageStats.mistakeCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.01)" vertical={false} />
                      <XAxis dataKey="index" stroke="var(--colors-stone)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--colors-stone)" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomLeakageTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="actual" stroke="var(--colors-primary)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="potential" stroke="var(--colors-gain)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mistakes Breakdown Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '20px' }}>
                
                {/* Mistakes Impact Bar Chart */}
                <div className="hollow-card" style={{ height: '280px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                    <ShieldAlert size={14} color="var(--colors-loss)" /> PnL Impact per Mistake Type
                  </h3>
                  <div style={{ flex: 1, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={disciplineLeakageStats.mistakesBreakdown} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.01)" horizontal={false} />
                        <XAxis type="number" stroke="var(--colors-stone)" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <YAxis dataKey="name" type="category" stroke="var(--colors-stone)" fontSize={9} tickLine={false} />
                        <Tooltip content={<CustomMistakesTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.015)' }} />
                        <Bar dataKey="pnl" fill="var(--colors-loss)" barSize={12} radius={3}>
                          {disciplineLeakageStats.mistakesBreakdown.map((entry, index) => {
                            const isLeak = entry.pnl < 0;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isLeak ? 'var(--colors-loss-dim)' : 'var(--colors-gain-dim)'}
                                stroke={isLeak ? 'var(--colors-loss)' : 'var(--colors-gain)'}
                                strokeWidth={1.2}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabular List of behavioral errors */}
                <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} color="var(--colors-loss)" /> behavioral Leakage Audit
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                    {disciplineLeakageStats.mistakesBreakdown.length === 0 ? (
                      <div style={{ color: 'var(--colors-gain)', fontSize: '12px', textAlign: 'center', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={20} color="var(--colors-gain)" />
                        Perfect discipline score! No behavioral mistakes logged.
                      </div>
                    ) : (
                      disciplineLeakageStats.mistakesBreakdown.map(m => (
                        <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--colors-surface-deep)', border: '1px solid var(--colors-hairline-dark)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{m.name}</div>
                            <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{m.count} trigger{m.count > 1 ? 's' : ''} logged</span>
                          </div>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: '600', color: m.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                            {m.pnl >= 0 ? '+' : ''}${Math.round(m.pnl).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* TAB 4: TIME & SESSION */}
          {activeTab === 'time' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Day of Week PnL */}
              <div className="hollow-card" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '16px' : '24px', minHeight: '340px', gap: '24px' }}>
                {/* Left: Chart */}
                <div style={{ flex: 1, minWidth: isMobile ? '0' : '320px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                    <Calendar size={14} color="var(--colors-primary)" /> Day of the Week PnL Performance
                  </h3>
                  <div style={{ flex: 1, width: '100%', minHeight: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dayOfWeekStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gainGradientDay" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--colors-gain)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--colors-gain)" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="lossGradientDay" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--colors-loss)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--colors-loss)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--colors-stone)" fontSize={9} tickLine={false} />
                        <YAxis stroke="var(--colors-stone)" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.015)' }} />
                        <Bar dataKey="pnl" barSize={16} radius={4}>
                          {dayOfWeekStats.map((entry, index) => {
                            const isGain = entry.pnl >= 0;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isGain ? 'url(#gainGradientDay)' : 'url(#lossGradientDay)'}
                                stroke={isGain ? 'var(--colors-gain)' : 'var(--colors-loss)'}
                                strokeWidth={1.2}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right: Insights Sidebar */}
                <div style={{
                  width: isMobile ? '100%' : '300px',
                  borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                  paddingLeft: isMobile ? '0' : '24px',
                  paddingTop: isMobile ? '24px' : '0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? 'none' : '260px'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
                      Performance Insights
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Peak Performance */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                          <TrendingUp size={12} color="var(--colors-gain)" /> Peak Performance
                        </div>
                        {dayOfWeekInsights.best ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{dayOfWeekInsights.best.name}</span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--colors-gain)' }}>
                                +${Math.round(dayOfWeekInsights.best.pnl).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                              <span>{dayOfWeekInsights.best.trades} trades</span>
                              <span>{dayOfWeekInsights.best.winRate}% Win Rate</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--colors-stone)', fontStyle: 'italic', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            No positive days logged
                          </div>
                        )}
                      </div>

                      {/* Leakage Source */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                          <TrendingDown size={12} color="var(--colors-loss)" /> Leakage Source
                        </div>
                        {dayOfWeekInsights.worst ? (
                          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{dayOfWeekInsights.worst.name}</span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--colors-loss)' }}>
                                -${Math.abs(Math.round(dayOfWeekInsights.worst.pnl)).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                              <span>{dayOfWeekInsights.worst.trades} trades</span>
                              <span>{dayOfWeekInsights.worst.winRate}% Win Rate</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--colors-stone)', fontStyle: 'italic', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            No negative days logged
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '16px'
                  }}>
                    <Sparkles size={13} color="var(--colors-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)', lineHeight: '1.4' }}>
                      {dayOfWeekInsights.best && dayOfWeekInsights.worst ? (
                        <>Focus on trading <strong>{dayOfWeekInsights.best.name}</strong> where profitability peaks. Tighten risk on <strong>{dayOfWeekInsights.worst.name}</strong>.</>
                      ) : dayOfWeekInsights.best ? (
                        <>Your weekday profile is solid. Tuesday and Wednesday remain your core profitability drivers.</>
                      ) : dayOfWeekInsights.worst ? (
                        <>Weekday execution underperforming on <strong>{dayOfWeekInsights.worst.name}</strong>. Review these trade setups.</>
                      ) : (
                        <>Gather more weekday trading data to unlock schedules and performance recommendations.</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hour of Day PnL */}
              <div className="hollow-card" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '16px' : '24px', minHeight: '340px', gap: '24px' }}>
                {/* Left: Chart */}
                <div style={{ flex: 1, minWidth: isMobile ? '0' : '320px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                    <Zap size={14} color="var(--colors-primary)" /> Hour of Day PnL Performance
                  </h3>
                  <div style={{ flex: 1, width: '100%', minHeight: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyStats.filter(h => h.tradesCount > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gainGradientHour" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--colors-gain)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--colors-gain)" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="lossGradientHour" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--colors-loss)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--colors-loss)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="hour" stroke="var(--colors-stone)" fontSize={9} tickLine={false} />
                        <YAxis stroke="var(--colors-stone)" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<CustomHourTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.015)' }} />
                        <Bar dataKey="pnl" barSize={14} radius={4}>
                          {hourlyStats.filter(h => h.tradesCount > 0).map((entry, index) => {
                            const isGain = entry.pnl >= 0;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isGain ? 'url(#gainGradientHour)' : 'url(#lossGradientHour)'}
                                stroke={isGain ? 'var(--colors-gain)' : 'var(--colors-loss)'}
                                strokeWidth={1.2}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right: Insights Sidebar */}
                <div style={{
                  width: isMobile ? '100%' : '300px',
                  borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                  paddingLeft: isMobile ? '0' : '24px',
                  paddingTop: isMobile ? '24px' : '0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? 'none' : '260px'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
                      Performance Insights
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Peak Performance */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                          <TrendingUp size={12} color="var(--colors-gain)" /> Peak Performance
                        </div>
                        {hourlyInsights.best ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{hourlyInsights.best.hour}</span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--colors-gain)' }}>
                                +${Math.round(hourlyInsights.best.pnl).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                              <span>{hourlyInsights.best.tradesCount} trades</span>
                              <span>{Math.round((hourlyInsights.best.wins / hourlyInsights.best.tradesCount) * 100)}% Win Rate</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--colors-stone)', fontStyle: 'italic', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            No positive hours logged
                          </div>
                        )}
                      </div>

                      {/* Leakage Source */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                          <TrendingDown size={12} color="var(--colors-loss)" /> Leakage Source
                        </div>
                        {hourlyInsights.worst ? (
                          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{hourlyInsights.worst.hour}</span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--colors-loss)' }}>
                                -${Math.abs(Math.round(hourlyInsights.worst.pnl)).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                              <span>{hourlyInsights.worst.tradesCount} trades</span>
                              <span>{Math.round((hourlyInsights.worst.wins / hourlyInsights.worst.tradesCount) * 100)}% Win Rate</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--colors-stone)', fontStyle: 'italic', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            No negative hours logged
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '16px'
                  }}>
                    <Sparkles size={13} color="var(--colors-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)', lineHeight: '1.4' }}>
                      {hourlyInsights.best && hourlyInsights.worst ? (
                        <>Peak performance occurs around <strong>{hourlyInsights.best.hour}</strong>. Review discipline or fatigue levels at <strong>{hourlyInsights.worst.hour}</strong>.</>
                      ) : hourlyInsights.best ? (
                        <>Trading executions are highly optimal at <strong>{hourlyInsights.best.hour}</strong>. Keep running this session routine.</>
                      ) : hourlyInsights.worst ? (
                        <>Execution leakage concentrated at <strong>{hourlyInsights.worst.hour}</strong>. Consider sitting out or reducing risk during this period.</>
                      ) : (
                        <>Awaiting execution timestamp logs to isolate hourly execution efficiency.</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hold Time outcome analysis */}
              <div className="hollow-card" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '16px' : '24px', minHeight: '340px', gap: '24px' }}>
                {/* Left: Chart */}
                <div style={{ flex: 1, minWidth: isMobile ? '0' : '320px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                    <Clock size={14} color="var(--colors-primary)" /> Hold Time Bucket Performance (PnL vs Duration)
                  </h3>
                  <div style={{ flex: 1, width: '100%', minHeight: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={holdTimeBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gainGradientHold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--colors-gain)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--colors-gain)" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="lossGradientHold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--colors-loss)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--colors-loss)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--colors-stone)" fontSize={9} tickLine={false} />
                        <YAxis stroke="var(--colors-stone)" fontSize={9} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<CustomHoldTimeTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.015)' }} />
                        <Bar dataKey="pnl" barSize={24} radius={4}>
                          {holdTimeBuckets.map((entry, index) => {
                            const isGain = entry.pnl >= 0;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isGain ? 'url(#gainGradientHold)' : 'url(#lossGradientHold)'}
                                stroke={isGain ? 'var(--colors-gain)' : 'var(--colors-loss)'}
                                strokeWidth={1.2}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right: Insights Sidebar */}
                <div style={{
                  width: isMobile ? '100%' : '300px',
                  borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                  paddingLeft: isMobile ? '0' : '24px',
                  paddingTop: isMobile ? '24px' : '0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? 'none' : '260px'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
                      Performance Insights
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Peak Performance */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                          <TrendingUp size={12} color="var(--colors-gain)" /> Peak Performance
                        </div>
                        {holdTimeInsights.best ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{holdTimeInsights.best.name.split(' (')[0]}</span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--colors-gain)' }}>
                                +${Math.round(holdTimeInsights.best.pnl).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                              <span>{holdTimeInsights.best.count} trades</span>
                              <span>{holdTimeInsights.best.winRate}% Win Rate</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--colors-stone)', fontStyle: 'italic', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            No positive durations logged
                          </div>
                        )}
                      </div>

                      {/* Leakage Source */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                          <TrendingDown size={12} color="var(--colors-loss)" /> Leakage Source
                        </div>
                        {holdTimeInsights.worst ? (
                          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{holdTimeInsights.worst.name.split(' (')[0]}</span>
                              <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--colors-loss)' }}>
                                -${Math.abs(Math.round(holdTimeInsights.worst.pnl)).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--colors-on-dark-mute)' }}>
                              <span>{holdTimeInsights.worst.count} trades</span>
                              <span>{holdTimeInsights.worst.winRate}% Win Rate</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--colors-stone)', fontStyle: 'italic', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                            No negative durations logged
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '16px'
                  }}>
                    <Sparkles size={13} color="var(--colors-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)', lineHeight: '1.4' }}>
                      {holdTimeInsights.best && holdTimeInsights.worst ? (
                        <>Your absolute edge lies in <strong>{holdTimeInsights.best.name.split(' (')[0]}</strong>. Avoid letting trades morph into costly <strong>{holdTimeInsights.worst.name.split(' (')[0]}</strong> hold durations.</>
                      ) : holdTimeInsights.best ? (
                        <>Hold duration strategy is working well in <strong>{holdTimeInsights.best.name.split(' (')[0]}</strong>. Excellent patience profile.</>
                      ) : holdTimeInsights.worst ? (
                        <>Holding times underperforming in the <strong>{holdTimeInsights.worst.name.split(' (')[0]}</strong> bucket. Tighten target constraints.</>
                      ) : (
                        <>Awaiting trade durations to isolate optimal position hold time targets.</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Off-screen elements for html2canvas exports */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        {/* Render Daily Card Preview */}
        {dailyPnLRecords.length > 0 && (() => {
          const record = dailyPnLRecords[0];
          const isWin = record.netPnL >= 0;
          const accentColor = isWin ? '#30d158' : '#ff453a';
          
          return (
            <div 
              id="stoic-pnl-card-preview" 
              style={{ 
                width: '320px', 
                height: '320px', 
                background: isWin 
                  ? 'radial-gradient(circle at 100% 0%, rgba(48, 209, 88, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(10, 132, 255, 0.08) 0%, transparent 60%), #09090b'
                  : 'radial-gradient(circle at 100% 0%, rgba(255, 69, 58, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                padding: '24px 22px 20px 22px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: '#ffffff',
                boxSizing: 'border-box',
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden'
              }}
            >
              {/* Glow overlay */}
              <div style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: isWin ? '#30d158' : '#ff453a',
                opacity: 0.12,
                filter: 'blur(35px)',
                pointerEvents: 'none'
              }} />

              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
                paddingBottom: '12px' 
              }}>
                <div>
                  <div style={{ fontSize: '7.5px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                    daily performance
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', marginTop: '3px', letterSpacing: '-0.2px' }}>
                    {record.date}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#ffffff', 
                  letterSpacing: '2px', 
                  textTransform: 'lowercase', 
                  fontWeight: '800',
                  opacity: 0.8
                }}>
                  hollow.
                </div>
              </div>

              {/* Net Return Block */}
              <div style={{ margin: '14px 0 10px 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '7.5px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                  net pnl
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '34px', 
                    fontWeight: '900', 
                    color: accentColor,
                    letterSpacing: '-1.5px',
                    textShadow: `0 0 20px ${isWin ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 69, 58, 0.25)'}`
                  }}>
                    {record.netPnL >= 0 ? '+' : ''}${Math.round(record.netPnL).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Inner Metrics Box */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px 14px'
              }}>
                <div>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    trades / winrate
                  </span>
                  <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                    {record.tradesCount} pos / {record.winRate}%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    best trade
                  </span>
                  <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                    {record.bestReturn > 0 ? '+' : ''}${Math.round(record.bestReturn).toLocaleString()}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    symbols traded
                  </span>
                  <span style={{ 
                    fontSize: '10px', 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontWeight: '600',
                    wordBreak: 'break-all', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    display: 'block' 
                  }}>
                    {record.tickersList || 'none'}
                  </span>
                </div>
              </div>

              {/* Quote Blockquote */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                borderLeft: `2.5px solid ${accentColor}`,
                background: 'rgba(255, 255, 255, 0.015)',
                padding: '6px 12px',
                borderRadius: '0 8px 8px 0',
                marginTop: '10px'
              }}>
                <div style={{ 
                  fontSize: '9.5px', 
                  fontStyle: 'italic', 
                  color: '#e4e4e7', 
                  lineHeight: '1.4',
                  fontWeight: '400' 
                }}>
                  "{record.netPnL >= 0 ? STOIC_QUOTES.win[quoteIndex % STOIC_QUOTES.win.length].text : STOIC_QUOTES.loss[quoteIndex % STOIC_QUOTES.loss.length].text}"
                </div>
                <div style={{ 
                  fontSize: '7.5px', 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textAlign: 'right', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '600'
                }}>
                  — {record.netPnL >= 0 ? STOIC_QUOTES.win[quoteIndex % STOIC_QUOTES.win.length].author : STOIC_QUOTES.loss[quoteIndex % STOIC_QUOTES.loss.length].author}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Render Weekly Card Preview */}
        {weeklyPnLRecords.length > 0 && (() => {
          const record = weeklyPnLRecords[0];
          const isWin = record.netPnL >= 0;
          const accentColor = isWin ? '#30d158' : '#ff453a';
          
          return (
            <div 
              id="stoic-weekly-card-preview" 
              style={{ 
                width: '320px', 
                height: '320px', 
                background: isWin 
                  ? 'radial-gradient(circle at 100% 0%, rgba(48, 209, 88, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(10, 132, 255, 0.08) 0%, transparent 60%), #09090b'
                  : 'radial-gradient(circle at 100% 0%, rgba(255, 69, 58, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                padding: '24px 22px 20px 22px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: '#ffffff',
                boxSizing: 'border-box',
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden'
              }}
            >
              {/* Glow overlay */}
              <div style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: isWin ? '#30d158' : '#ff453a',
                opacity: 0.12,
                filter: 'blur(35px)',
                pointerEvents: 'none'
              }} />

              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
                paddingBottom: '12px' 
              }}>
                <div>
                  <div style={{ fontSize: '7.5px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                    weekly performance
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', marginTop: '3px', letterSpacing: '-0.2px' }}>
                    {record.rangeLabel}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#ffffff', 
                  letterSpacing: '2px', 
                  textTransform: 'lowercase', 
                  fontWeight: '800',
                  opacity: 0.8
                }}>
                  hollow.
                </div>
              </div>

              {/* Net Return Block */}
              <div style={{ margin: '14px 0 10px 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '7.5px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                  weekly return
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '34px', 
                    fontWeight: '900', 
                    color: accentColor,
                    letterSpacing: '-1.5px',
                    textShadow: `0 0 20px ${isWin ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 69, 58, 0.25)'}`
                  }}>
                    {record.netPnL >= 0 ? '+' : ''}${Math.round(record.netPnL).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Inner Metrics Box */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px 14px'
              }}>
                <div>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    trades / winrate
                  </span>
                  <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                    {record.tradesCount} pos / {record.winRate}%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    best trade
                  </span>
                  <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                    {record.bestReturn > 0 ? '+' : ''}${Math.round(record.bestReturn).toLocaleString()}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    symbols traded
                  </span>
                  <span style={{ 
                    fontSize: '10px', 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontWeight: '600',
                    wordBreak: 'break-all', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    display: 'block' 
                  }}>
                    {record.tickersList || 'none'}
                  </span>
                </div>
              </div>

              {/* Quote Blockquote */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                borderLeft: `2.5px solid ${accentColor}`,
                background: 'rgba(255, 255, 255, 0.015)',
                padding: '6px 12px',
                borderRadius: '0 8px 8px 0',
                marginTop: '10px'
              }}>
                <div style={{ 
                  fontSize: '9.5px', 
                  fontStyle: 'italic', 
                  color: '#e4e4e7', 
                  lineHeight: '1.4',
                  fontWeight: '400' 
                }}>
                  "{record.netPnL >= 0 ? STOIC_QUOTES.win[quoteIndex % STOIC_QUOTES.win.length].text : STOIC_QUOTES.loss[quoteIndex % STOIC_QUOTES.loss.length].text}"
                </div>
                <div style={{ 
                  fontSize: '7.5px', 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textAlign: 'right', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '600'
                }}>
                  — {record.netPnL >= 0 ? STOIC_QUOTES.win[quoteIndex % STOIC_QUOTES.win.length].author : STOIC_QUOTES.loss[quoteIndex % STOIC_QUOTES.loss.length].author}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
