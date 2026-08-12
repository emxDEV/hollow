import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL, isTradeWinRateEligible } from '../utils/tradeMath';
import { getISOWeekId, getWeekDates } from '../utils/dateUtils';
import HollowSelect from './HollowSelect';
import useUIStore from '../store/useUIStore';
import { 
  ClipboardList, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Award, 
  Calendar,
  AlertCircle,
  Sparkles,
  CheckCircle,
  Clock,
  Zap,
  ShieldAlert,
  BookOpen,
  Moon,
  Smile,
  Activity,
  Filter,
  RotateCcw,
  Target,
  Check,
  Camera,
  RotateCw,
  Newspaper,
  Radio
  } from 'lucide-react';

const WEEKLY_MINDSET_QUOTES = {
  win: [
    { text: "No random actions, none not based on underlying principles.", author: "Marcus Aurelius" },
    { text: "If you want steady, choose discipline. If you want fleeting, choose motivation.", author: "Hollow Mindset" },
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

export default function WeeklyReviewView({ trades: propsTrades = [], executions: propsExecutions = [], selectedAccountId = 'all', onSelectTrade, isSubpage = false } = {}) {
  const isMobile = useUIStore(state => state.isMobile);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const openEditExecution = useUIStore(state => state.openEditExecution);

  const dbTrades = useLiveQuery(() => (db && db.trades ? db.trades.toArray() : []), []) || [];
  const dbExecutions = useLiveQuery(() => (db && db.executions ? db.executions.toArray() : []), []) || [];

  const trades = propsTrades.length > 0 ? propsTrades : dbTrades;
  const executions = propsExecutions.length > 0 ? propsExecutions : dbExecutions;

  // Compute Week ID e.g. "2024-W25" from selectedDate
  const selectedWeekId = useMemo(() => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return getISOWeekId(new Date());
    return getISOWeekId(d);
  }, [selectedDate]);

  const setSelectedWeekId = (weekId) => {
    const dates = getWeekDates(weekId);
    if (dates && dates.start) {
      setSelectedDate(dates.start);
    }
  };
  const [activeTab, setActiveTab] = useState('playbook'); // 'playbook', 'audit', 'objectives'
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState(null); // null or date string
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [exportMode, setExportMode] = useState('weekly'); // 'daily' | 'weekly'
  // Day Review Modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState(null);
  const [dayModalForm, setDayModalForm] = useState({ tradeOfDayPhoto: null, tradeTakenPhoto: null, reviewText: '', reviewExtraPhoto: null });

  // Reset quote index on export mode change
  useEffect(() => {
    setQuoteIndex(0);
  }, [exportMode]);

  // Reset the daily ribbon filter when switching weeks
  useEffect(() => {
    setSelectedDayFilter(null);
  }, [selectedWeekId]);

  // Fetch weekly planner entry reactively from IndexedDB
  const weeklyLog = useLiveQuery(async () => {
    return await db.weeklyPlanners.get(selectedWeekId);
  }, [selectedWeekId]);

  const account = useLiveQuery(async () => {
    if (selectedAccountId === 'all' || !db.accounts) return null;
    return await db.accounts.get(selectedAccountId);
  }, [selectedAccountId]);

  // Compute start/end dates of selectedWeekId
  const weekDates = useMemo(() => {
    return getWeekDates(selectedWeekId);
  }, [selectedWeekId]);

  // Fetch daily journals for this week reactively
  const weekJournals = useLiveQuery(async () => {
    return await db.dailyJournals
      .where('date')
      .between(weekDates.start, weekDates.end, true, true)
      .toArray();
  }, [weekDates]) || [];

  // Local state for Weekly Review Form
  const [weeklyForm, setWeeklyForm] = useState({
    goals: '',
    priorities: '',
    reviewNotes: '',
    adjustments: '',
    newsPhoto: null,
    newsNotes: '',
    screenshotsReviewed: false,
    playbookUpdated: false,
    sleepCorrelationsChecked: false,
    mistakesLogged: false
  });

  // Sync DB log to local state when db query updates
  useEffect(() => {
    if (weeklyLog) {
      setWeeklyForm({
        goals: weeklyLog.goals || '',
        priorities: weeklyLog.priorities || '',
        reviewNotes: weeklyLog.reviewNotes || '',
        adjustments: weeklyLog.adjustments || '',
        newsPhoto: weeklyLog.newsPhoto || null,
        newsNotes: weeklyLog.newsNotes || '',
        screenshotsReviewed: !!weeklyLog.screenshotsReviewed,
        playbookUpdated: !!weeklyLog.playbookUpdated,
        sleepCorrelationsChecked: !!weeklyLog.sleepCorrelationsChecked,
        mistakesLogged: !!weeklyLog.mistakesLogged
      });
    } else {
      setWeeklyForm({
        goals: '',
        priorities: '',
        reviewNotes: '',
        adjustments: '',
        newsPhoto: null,
        newsNotes: '',
        screenshotsReviewed: false,
        playbookUpdated: false,
        sleepCorrelationsChecked: false,
        mistakesLogged: false
      });
    }
  }, [weeklyLog, selectedWeekId]);

  // Auto-save weekly form changes to IndexedDB whenever fields update
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await db.weeklyPlanners.put({
          weekId: selectedWeekId,
          startDate: weekDates.start,
          endDate: weekDates.end,
          status: 'COMPLETED',
          ...weeklyForm
        });
      } catch (err) {
        console.error("Auto-save weekly planner failed:", err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [weeklyForm, selectedWeekId, weekDates]);

  // Compile a dropdown list of all available weeks in the DB, always including current week
  const weekOptions = useLiveQuery(async () => {
    const weeksSet = new Set();
    
    // Always include current week
    weeksSet.add(getISOWeekId(new Date()));

    // Scan weeklyPlanners
    const planners = await db.weeklyPlanners.toArray();
    planners.forEach(p => { if (p.weekId) weeksSet.add(p.weekId); });

    // Scan trades if present
    const allTrades = db.trades ? await db.trades.toArray() : [];
    allTrades.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          weeksSet.add(getISOWeekId(d));
        }
      }
    });

    // Scan dailyJournals
    const allJournals = await db.dailyJournals.toArray();
    allJournals.forEach(j => {
      if (j.date) {
        const d = new Date(j.date);
        if (!isNaN(d.getTime())) {
          weeksSet.add(getISOWeekId(d));
        }
      }
    });

    // Convert to list, sort descending
    const sorted = Array.from(weeksSet).sort().reverse();
    
    return sorted.map(w => {
      const dates = getWeekDates(w);
      const startD = new Date(dates.start);
      const friD = new Date(startD);
      friD.setDate(startD.getDate() + 4);
      const friStr = friD.toISOString().split('T')[0];
      return {
        value: w,
        label: `Week ${w} (${dates.start} to ${friStr})`
      };
    });
  }, []);

  const selectOptions = useMemo(() => {
    return weekOptions || [];
  }, [weekOptions]);

  // Generate Mon-Fri days of the selected week only
  const weekDaysList = useMemo(() => {
    const list = [];
    const start = new Date(weekDates.start);
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dayOfWeek = d.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const dateStr = d.toISOString().split('T')[0];
      list.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        shortDayName: shortDayNames[dayOfWeek],
        displayLabel: `${shortDayNames[dayOfWeek]} ${d.getMonth() + 1}/${d.getDate()}`
      });
    }
    return list;
  }, [weekDates]);

  // Aggregate daily metrics (trades, RR, journal status) for each Mon-Fri day
  const daysData = useMemo(() => {
    return weekDaysList.map(day => {
      const journal = weekJournals.find(j => j.date === day.date);
      const dayTrades = trades.filter(t => {
        const isAccountMatch = selectedAccountId === 'all' || t.accountId === selectedAccountId;
        return isAccountMatch && t.date === day.date;
      });

      const processedExecIds = new Set();
      let wins = 0;
      let eligibleTrades = 0;
      let totalR = 0;
      let netPnL = 0;

      dayTrades.forEach(t => {
        const tExecs = executions.filter(e => e.tradeId === t.id);
        tExecs.forEach(e => processedExecIds.add(e.id));
        const pnlDetails = calculateTradePnL(t, tExecs);
        netPnL += pnlDetails.netPnL;
        const risk = t.riskAmount || 200;
        totalR += pnlDetails.netPnL / risk;
        const virtualTrade = { ...t, netPnL: pnlDetails.netPnL };
        if (isTradeWinRateEligible(virtualTrade)) {
          eligibleTrades++;
          if (pnlDetails.netPnL > 0) wins++;
        }
      });

      const dayExecutions = executions.filter(e => e.date === day.date || e.id?.includes(day.date));
      dayExecutions.forEach(exec => {
        if (processedExecIds.has(exec.id)) return;
        let rVal = 0;
        if (exec.rr !== undefined && exec.rr !== null && exec.rr !== '') {
          const num = parseFloat(String(exec.rr).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) rVal = num;
        } else if ((exec.wl || '').toUpperCase().includes('WIN')) {
          rVal = 2.0;
        } else if ((exec.wl || '').toUpperCase().includes('LOSS')) {
          rVal = -1.0;
        }
        const pnl = rVal * 200;
        netPnL += pnl;
        totalR += rVal;
        const wlUpper = (exec.wl || '').toUpperCase();
        if (wlUpper.includes('WIN') || rVal > 0) {
          wins++;
          eligibleTrades++;
        } else if (wlUpper.includes('LOSS') || rVal < 0) {
          eligibleTrades++;
        }
      });
      
      const winRate = eligibleTrades > 0 ? (wins / eligibleTrades) * 100 : 0;
      const tradesCount = dayTrades.length + dayExecutions.filter(e => !processedExecIds.has(e.id)).length;

      return {
        ...day,
        journal,
        tradesCount,
        wins,
        winRate,
        hasJournal: !!journal,
        netPnL,
        totalR: parseFloat(totalR.toFixed(2))
      };
    });
  }, [weekDaysList, weekJournals, trades, executions, selectedAccountId]);

  // Compile detailed list of trades & executions closed this week
  const weeklyTradesList = useMemo(() => {
    const processedExecIds = new Set();
    const tradeItems = trades
      .filter(t => {
        const isAccountMatch = selectedAccountId === 'all' || t.accountId === selectedAccountId;
        return isAccountMatch && t.date >= weekDates.start && t.date <= weekDates.end;
      })
      .map(trade => {
        const tradeExecs = executions.filter(e => e.tradeId === trade.id);
        tradeExecs.forEach(e => processedExecIds.add(e.id));
        const pnlDetails = calculateTradePnL(trade, tradeExecs);
        return {
          ...trade,
          ...pnlDetails,
          rawExec: tradeExecs[0] || trade
        };
      });

    const standaloneExecs = executions
      .filter(e => {
        if (processedExecIds.has(e.id)) return false;
        const dateStr = e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0];
        return dateStr >= weekDates.start && dateStr <= weekDates.end;
      })
      .map(e => {
        let rVal = 0;
        if (e.rr !== undefined && e.rr !== null && e.rr !== '') {
          const num = parseFloat(String(e.rr).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) rVal = num;
        } else if ((e.wl || '').toUpperCase().includes('WIN')) {
          rVal = 2.0;
        } else if ((e.wl || '').toUpperCase().includes('LOSS')) {
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
          po3: e.po3 || 'N/A',
          dol: e.dol || 'N/A',
          wl: e.wl || (rVal > 0 ? 'Win' : (rVal < 0 ? 'Loss' : 'BE')),
          rr: e.rr || `${rVal >= 0 ? '+' : ''}${rVal}R`,
          netPnL,
          grossPnL: netPnL,
          commissions: 0,
          rawExec: e
        };
      });

    return [...tradeItems, ...standaloneExecs].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades, executions, selectedAccountId, weekDates]);

  // Calculate actual trade metrics for this week reactively
  const weeklyTradeMetrics = useMemo(() => {
    let totalPnL = 0;
    let totalContracts = 0;
    let totalMistakes = 0;
    let totalNetPnL = 0;
    let totalCommissions = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let wins = 0;
    let losses = 0;
    let bestTrade = 0;
    
    weeklyTradesList.forEach(t => {
      totalNetPnL += t.netPnL;
      totalCommissions += (t.commissions || 0);
      totalContracts += (t.contracts || 0);
      totalMistakes += (t.mistakes || []).length;
      
      const isWin = t.netPnL > 0;
      const isLoss = t.netPnL < 0;

      if (isWin) {
        wins++;
        grossWins += t.netPnL;
      } else if (isLoss) {
        losses++;
        grossLosses += Math.abs(t.netPnL);
      }
      
      if (t.netPnL > bestTrade) bestTrade = t.netPnL;
    });

    const eligibleTrades = wins + losses;
    const winRate = eligibleTrades > 0 ? (wins / eligibleTrades) * 100 : 0;
    const activeWinRate = winRate;
    const profitFactor = grossLosses > 0 ? (grossWins / grossLosses) : grossWins > 0 ? 9.99 : 0;
    const expectancy = weeklyTradesList.length > 0 ? (totalNetPnL / weeklyTradesList.length) : 0;

    // R-based metrics
    let totalR = 0;
    weeklyTradesList.forEach(t => {
      if (t.rReturn !== undefined) {
        totalR += t.rReturn;
      } else if (t.rr !== undefined) {
        const num = parseFloat(String(t.rr).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) totalR += num;
      }
    });
    const expectancyR = weeklyTradesList.length > 0 ? totalR / weeklyTradesList.length : 0;

    return {
      totalTrades: weeklyTradesList.length,
      wins,
      losses,
      winRate,
      activeWinRate,
      profitFactor,
      expectancy,
      expectancyR: parseFloat(expectancyR.toFixed(2)),
      totalR: parseFloat(totalR.toFixed(2)),
      totalPnL: totalNetPnL,
      totalMistakes,
      totalContracts
    };
  }, [weeklyTradesList]);

  const weeklyBestReturn = useMemo(() => {
    let best = -Infinity;
    weeklyTradesList.forEach(t => {
      if (t.netPnL > best) best = t.netPnL;
    });
    return best === -Infinity ? 0 : best;
  }, [weeklyTradesList]);

  const weeklyTickersList = useMemo(() => {
    const tickers = new Set();
    weeklyTradesList.forEach(t => {
      if (t.symbol) tickers.add(t.symbol);
    });
    return Array.from(tickers).join(', ');
  }, [weeklyTradesList]);

  // Group trades by date to compute daily P&L records for export inside selected week
  const dailyPnLRecords = useMemo(() => {
    const dailyMap = {};
    weeklyTradesList.forEach(t => {
      if (!t.date) return;
      const dateKey = t.date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          netPnL: 0,
          tradesCount: 0,
          winCount: 0,
          bestReturn: -Infinity,
          tickers: new Set()
        };
      }
      const record = dailyMap[dateKey];
      record.netPnL += t.netPnL;
      record.tradesCount += 1;
      if (t.netPnL > 0) {
        record.winCount += 1;
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
  }, [weeklyTradesList]);

  const activeDailyRecord = useMemo(() => {
    if (dailyPnLRecords.length === 0) return null;
    if (selectedDayFilter) {
      const found = dailyPnLRecords.find(r => r.date === selectedDayFilter);
      if (found) return found;
    }
    return dailyPnLRecords[0];
  }, [dailyPnLRecords, selectedDayFilter]);

  const handleExportPnLCard = async (mode = exportMode) => {
    const cardId = mode === 'daily' ? 'stoic-pnl-card-preview' : 'weekly-review-card-preview';
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
      const filenameSuffix = mode === 'daily'
        ? (activeDailyRecord?.date || 'daily')
        : (selectedWeekId || 'weekly');
      link.download = `hollow_pnl_${mode}_${filenameSuffix}.png`;
      link.href = imgData;
      link.click();
    });
  };

  // Compile playbook strategies performance breakdown for this week
  const weeklyPlaybookEdge = useMemo(() => {
    const groups = {};
    weeklyTradesList.forEach(t => {
      const model = t.model || 'Unmapped Setups';
      if (!groups[model]) {
        groups[model] = { name: model, count: 0, wins: 0, losses: 0, pnl: 0 };
      }
      const g = groups[model];
      g.count++;
      g.pnl += t.netPnL;
      const virtualTrade = { ...t, netPnL: t.netPnL };
      if (isTradeWinRateEligible(virtualTrade)) {
        if (t.netPnL > 0) g.wins++;
        else if (t.netPnL < 0) g.losses++;
      }
    });

    return Object.values(groups).map(g => {
      const eligibleCount = g.wins + g.losses;
      return {
        ...g,
        winRate: eligibleCount > 0 ? (g.wins / eligibleCount) * 100 : 0
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [weeklyTradesList]);

  // Compute Health & Behavior correlations (sleep, focus, habits vs PnL)
  const healthCorrelations = useMemo(() => {
    let totalSleepWinDays = 0;
    let countSleepWinDays = 0;
    let totalSleepLossDays = 0;
    let countSleepLossDays = 0;

    let totalSleepQualityWinDays = 0;
    let countSleepQualityWinDays = 0;
    let totalSleepQualityLossDays = 0;
    let countSleepQualityLossDays = 0;
    
    let totalFocus = 0;
    let totalPatience = 0;
    let totalRiskAdherence = 0;
    let journalCount = 0;
    
    let workoutCount = 0;
    let meditationCount = 0;
    let dietCount = 0;

    daysData.forEach(day => {
      const j = day.journal;
      if (!j) return;

      journalCount++;
      if (j.sleepHours !== undefined) {
        if (day.netPnL > 0) {
          totalSleepWinDays += j.sleepHours;
          countSleepWinDays++;
        } else if (day.netPnL < 0) {
          totalSleepLossDays += j.sleepHours;
          countSleepLossDays++;
        }
      }

      if (j.sleepQuality !== undefined) {
        if (day.netPnL > 0) {
          totalSleepQualityWinDays += j.sleepQuality;
          countSleepQualityWinDays++;
        } else if (day.netPnL < 0) {
          totalSleepQualityLossDays += j.sleepQuality;
          countSleepQualityLossDays++;
        }
      }

      if (j.mentalFocus !== undefined) totalFocus += j.mentalFocus;
      if (j.patienceLevel !== undefined) totalPatience += j.patienceLevel;
      if (j.riskAdherence !== undefined) totalRiskAdherence += j.riskAdherence;

      if (j.workoutDone) workoutCount++;
      if (j.meditationDone) meditationCount++;
      if (j.dietClean) dietCount++;
    });

    const avgSleepWinDays = countSleepWinDays > 0 ? (totalSleepWinDays / countSleepWinDays) : 0;
    const avgSleepLossDays = countSleepLossDays > 0 ? (totalSleepLossDays / countSleepLossDays) : 0;

    const avgSleepQualityWinDays = countSleepQualityWinDays > 0 ? (totalSleepQualityWinDays / countSleepQualityWinDays) : 0;
    const avgSleepQualityLossDays = countSleepQualityLossDays > 0 ? (totalSleepQualityLossDays / countSleepQualityLossDays) : 0;

    const avgFocus = journalCount > 0 ? (totalFocus / journalCount) : 0;
    const avgPatience = journalCount > 0 ? (totalPatience / journalCount) : 0;
    const avgRiskAdherence = journalCount > 0 ? (totalRiskAdherence / journalCount) : 0;

    const workoutRate = journalCount > 0 ? (workoutCount / journalCount) * 100 : 0;
    const meditationRate = journalCount > 0 ? (meditationCount / journalCount) * 100 : 0;
    const dietRate = journalCount > 0 ? (dietCount / journalCount) * 100 : 0;

    return {
      avgSleepWinDays,
      avgSleepLossDays,
      avgSleepQualityWinDays,
      avgSleepQualityLossDays,
      avgFocus,
      avgPatience,
      avgRiskAdherence,
      workoutRate,
      meditationRate,
      dietRate,
      journalCount
    };
  }, [daysData]);

  // Discipline Score calculation (0 to 100)
  const disciplineScore = useMemo(() => {
    if (healthCorrelations.journalCount === 0) return 0;
    const totalPossible = 15; // Focus(5) + Patience(5) + RiskAdherence(5)
    const totalEarned = healthCorrelations.avgFocus + healthCorrelations.avgPatience + healthCorrelations.avgRiskAdherence;
    return Math.round((totalEarned / totalPossible) * 100);
  }, [healthCorrelations]);

  // Save changes to DB
  const handleSaveWeekly = async () => {
    setSaveStatus('Saving...');
    try {
      await db.weeklyPlanners.put({
        weekId: selectedWeekId,
        startDate: weekDates.start,
        endDate: weekDates.end,
        status: 'COMPLETED',
        ...weeklyForm
      });
      setSaveStatus('Review Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Save Failed');
    }
  };

  const handleExportPDF = async () => {
    const { exportWeeklyReportPDF } = await import('../utils/pdfExport');
    exportWeeklyReportPDF(selectedWeekId, account, trades, executions);
  };

  const currentISOWeekId = useMemo(() => getISOWeekId(new Date()), []);
  const isCurrentOrFutureWeek = useMemo(() => selectedWeekId >= currentISOWeekId, [selectedWeekId, currentISOWeekId]);

  const handleWeekShift = (direction) => {
    // Prevent going forward into future weeks past current week
    if (direction === 1 && isCurrentOrFutureWeek) return;

    const parts = (weekDates.start || '').split('-').map(Number);
    if (parts.length !== 3) return;
    const currentMonday = new Date(parts[0], parts[1] - 1, parts[2]);
    currentMonday.setDate(currentMonday.getDate() + (direction * 7));
    
    const targetWeekId = getISOWeekId(currentMonday);
    if (direction === 1 && targetWeekId > currentISOWeekId) return;

    const y = currentMonday.getFullYear();
    const m = String(currentMonday.getMonth() + 1).padStart(2, '0');
    const d = String(currentMonday.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const selectedWeekFridayStr = useMemo(() => {
    const parts = (weekDates.start || '').split('-').map(Number);
    if (parts.length !== 3) return weekDates.end;
    const friD = new Date(parts[0], parts[1] - 1, parts[2] + 4);
    const y = friD.getFullYear();
    const m = String(friD.getMonth() + 1).padStart(2, '0');
    const d = String(friD.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [weekDates]);

  // Toggle active day filter in the calendar ribbon
  const handleDayClick = (dateStr) => {
    if (selectedDayFilter === dateStr) {
      setSelectedDayFilter(null);
    } else {
      setSelectedDayFilter(dateStr);
    }
  };

  // Open day review modal
  const handleDayModalOpen = (dateStr, e) => {
    e.stopPropagation();
    const journal = weekJournals.find(j => j.date === dateStr);
    setDayModalDate(dateStr);
    setDayModalForm({
      tradeOfDayPhoto: journal?.tradeOfDayPhoto || null,
      tradeTakenPhoto: journal?.tradeTakenPhoto || null,
      reviewText: journal?.weeklyReviewText || '',
      reviewExtraPhoto: journal?.reviewExtraPhoto || null
    });
    setDayModalOpen(true);
  };

  const handleDayModalSave = async () => {
    if (!dayModalDate) return;
    try {
      const existing = await db.dailyJournals.get(dayModalDate) || { date: dayModalDate };
      await db.dailyJournals.put({
        ...existing,
        tradeOfDayPhoto: dayModalForm.tradeOfDayPhoto,
        tradeTakenPhoto: dayModalForm.tradeTakenPhoto,
        weeklyReviewText: dayModalForm.reviewText,
        reviewExtraPhoto: dayModalForm.reviewExtraPhoto
      });
      setDayModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handlePhotoUpload = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDayModalForm(prev => ({ ...prev, [field]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // Filtered trades list inside the ledger table
  const filteredTradesList = useMemo(() => {
    if (!selectedDayFilter) return weeklyTradesList;
    return weeklyTradesList.filter(t => t.date === selectedDayFilter);
  }, [weeklyTradesList, selectedDayFilter]);

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: isSubpage
        ? (isMobile ? '12px 12px 80px 12px' : '24px')
        : (isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px'),
      boxSizing: 'border-box'
    }}>
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      {!isSubpage && <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />}
      
      {/* Top Navigator & Control Row */}
      <div style={{
        display: 'flex',
        justifyContent: isSubpage ? 'flex-end' : 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        marginBottom: '4px',
        width: '100%'
      }}>
        {!isSubpage && (
          <div className="hollow-view-header-title-block">
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Award size={26} color="#b86eff" /> Weekly Review
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', margin: '4px 0 0 0' }}>
              Consolidated EOW Trading Station. Auditing playbook setups, sleep metrics, and psychology.
            </p>
          </div>
        )}

        {/* Rearranged Action Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          
          {/* Week Shift Navigator Pill */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            background: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            padding: '4px 8px', 
            borderRadius: '12px' 
          }}>
            <button 
              onClick={() => handleWeekShift(-1)}
              title="Previous Week"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronLeft size={16} />
            </button>
 
            {/* Clean Week Range Label Badge */}
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              padding: '6px 10px',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap'
            }}>
              Week {selectedWeekId} ({weekDates.start} to {selectedWeekFridayStr})
            </div>

            <button 
              onClick={() => handleWeekShift(1)}
              disabled={isCurrentOrFutureWeek}
              title={isCurrentOrFutureWeek ? "Current week is the most recent week" : "Next Week"}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: isCurrentOrFutureWeek ? 'not-allowed' : 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
                opacity: isCurrentOrFutureWeek ? 0.3 : 1
              }}
              onMouseEnter={e => { if (!isCurrentOrFutureWeek) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={() => {
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0];
              const weekId = getISOWeekId(today);
              setSelectedWeekId(weekId);
              setSelectedDayFilter(todayStr);
            }}
            style={{
              background: 'rgba(184, 110, 255, 0.15)',
              border: '1px solid #b86eff',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(184, 110, 255, 0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(184, 110, 255, 0.15)'}
          >
            Today
          </button>

          {/* Share PnL Button */}
          {weeklyTradeMetrics && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                <Camera size={14} color="#b86eff" /> Share PnL
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
                  minWidth: '160px',
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
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Daily PnL Card
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
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Weekly Summary Card
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Interactive Calendar Ribbon Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
          Interactive Calendar Ribbon
        </span>
        <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
          Click any day to filter weekly trades list
        </span>
      </div>

        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'row' : 'none',
          gridTemplateColumns: isMobile ? 'none' : 'repeat(5, 1fr)',
          gap: '12px',
          background: 'var(--colors-surface-card)',
          border: '1px solid var(--colors-hairline-dark)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px',
          backdropFilter: 'none',
          overflowX: isMobile ? 'auto' : 'hidden',
          scrollbarWidth: 'none'
        }} className="hollow-menu-scrollbar">
          {daysData.map(day => {
            const isWinningDay = day.netPnL > 0;
            const isLosingDay = day.netPnL < 0;
            const isFiltered = selectedDayFilter === day.date;
            
            return (
              <div 
                key={day.date} 
                onClick={() => handleDayClick(day.date)}
                style={{ 
                  padding: '14px 16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderRadius: '16px',
                  border: isFiltered 
                    ? '1px solid #ffffff' 
                    : isWinningDay ? '1px solid rgba(48, 209, 88, 0.35)'
                    : isLosingDay ? '1px solid rgba(255, 69, 58, 0.35)'
                    : '1px solid #1c1c1e',
                  background: isFiltered 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : isWinningDay ? 'rgba(48, 209, 88, 0.04)'
                    : isLosingDay ? 'rgba(255, 69, 58, 0.04)'
                    : 'var(--colors-surface-card)',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'none',
                  flexShrink: isMobile ? 0 : 1,
                  minWidth: isMobile ? '140px' : 'auto'
                }}
                onMouseEnter={e => {
                  if (!isFiltered) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isFiltered) {
                    e.currentTarget.style.borderColor = isWinningDay ? 'rgba(48, 209, 88, 0.35)' : isLosingDay ? 'rgba(255, 69, 58, 0.35)' : '#1c1c1e';
                  }
                }}
              >
                {/* Header Date & Review Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: isFiltered ? '#fff' : 'rgba(255,255,255,0.9)' }}>
                    {day.displayLabel}
                  </span>
                  <button
                    onClick={(e) => handleDayModalOpen(day.date, e)}
                    title="Add Day Review"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: 'rgba(255,255,255,0.6)',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: 0,
                      flexShrink: 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,110,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  >
                    +
                  </button>
                </div>
                
                {/* RR and Trades Count */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    fontFamily: 'var(--font-mono)',
                    color: isWinningDay ? 'var(--colors-gain)' : isLosingDay ? 'var(--colors-loss)' : 'var(--colors-stone)'
                  }}>
                    {day.tradesCount > 0 ? `${day.totalR >= 0 ? '+' : ''}${day.totalR.toFixed(2)}R` : '-'}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--colors-stone)',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Activity size={10} color="var(--colors-stone)" />
                    {day.tradesCount} trd{day.tradesCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {/* 2. Main EOW Review Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '4.5fr 7.5fr', gap: '24px', alignItems: 'stretch' }}>
        
        {/* LEFT COLUMN: EOW Rollup Stats & Sleep/Habit Correlations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Rollup Stats Card */}
          <div className="hollow-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px', 
            padding: '24px', 
            background: 'var(--colors-surface-card)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: `4px solid ${weeklyTradeMetrics.totalPnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)'}` 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--colors-primary)" /> Weekly Ledger Rollup
              </h3>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600' }}>
                {weeklyTradeMetrics.totalTrades} TRADES
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: '14px' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>TOTAL R</div>
                <div className="mono" style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: weeklyTradeMetrics.totalR >= 0 ? '#30d158' : '#ff453a', 
                  marginTop: '4px',
                  textShadow: weeklyTradeMetrics.totalR >= 0 ? '0 0 15px rgba(48, 209, 88, 0.15)' : '0 0 15px rgba(255, 69, 58, 0.15)'
                }}>
                  {weeklyTradeMetrics.totalR >= 0 ? '+' : ''}{weeklyTradeMetrics.totalR}R
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>WIN RATE</div>
                <div className="mono" style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: weeklyTradeMetrics.totalTrades === 0 ? '#fff' : (weeklyTradeMetrics.activeWinRate >= 50 ? '#30d158' : '#ff453a'), 
                  marginTop: '4px' 
                }}>
                  {weeklyTradeMetrics.activeWinRate.toFixed(0)}%
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>PROFIT FACTOR</div>
                <div className="mono" style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: weeklyTradeMetrics.totalTrades === 0 ? '#fff' : (weeklyTradeMetrics.profitFactor >= 1.0 ? 'var(--colors-gain)' : 'var(--colors-loss)'), 
                  marginTop: '4px' 
                }}>
                  {weeklyTradeMetrics.profitFactor.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>EXPECTANCY</div>
                <div className="mono" style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: weeklyTradeMetrics.totalTrades === 0 ? '#fff' : (weeklyTradeMetrics.expectancyR >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)'), 
                  marginTop: '4px' 
                }}>
                  {weeklyTradeMetrics.expectancyR >= 0 ? '+' : ''}{weeklyTradeMetrics.expectancyR}R
                </div>
              </div>
            </div>

            {/* Discipline Ring Metric */}
            <div style={{ 
              borderTop: '1px solid var(--colors-hairline-dark)', 
              paddingTop: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Weekly Discipline Score</div>
                <div style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
                  Averaged journal focus, patience, and risk controls.
                </div>
              </div>

              {/* Styled SVG Progress Ring */}
              <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
                <svg width="56" height="56" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--colors-primary)"
                    strokeDasharray={`${disciplineScore}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 5px var(--colors-primary))' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {healthCorrelations.journalCount > 0 ? `${disciplineScore}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Tabs for Reflections & Trade Ledgers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tab Button Switcher */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%',
            overflowX: isMobile ? 'auto' : 'visible',
            scrollbarWidth: 'none'
          }} className="hollow-menu-scrollbar">
            {[
              { id: 'playbook', name: 'Execution History', icon: BookOpen },
              { id: 'audit', name: 'Behavioral Audit', icon: ShieldAlert },
              { id: 'objectives', name: 'Objectives & Adjustments', icon: ClipboardList },
              { id: 'news', name: 'News', icon: Newspaper }
            ].map(t => {
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
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'var(--colors-primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--colors-on-dark-mute)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: 'none',
                    width: 'auto',
                    flexShrink: isMobile ? 0 : 1,
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--colors-on-dark-mute)';
                  }}
                >
                  <Icon size={14} color={isActive ? '#ffffff' : 'var(--colors-stone)'} />
                  {t.name}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT: Playbook & Trades */}
          {activeTab === 'playbook' && (
            <div className="hollow-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px', 
              padding: '24px', 
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flex: 1 
            }}>
              
              {/* Playbook Setups grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ 
                  fontSize: '11px', 
                  fontWeight: '800', 
                  color: 'var(--colors-stone)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.75px' 
                }}>
                  Traded Playbook setups
                </h4>
                {weeklyPlaybookEdge.length === 0 ? (
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--colors-stone)', 
                    padding: '20px', 
                    textAlign: 'center', 
                    border: '1px dashed rgba(255,255,255,0.06)', 
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.1)'
                  }}>
                    No trades mapped to playbook setups this week.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {weeklyPlaybookEdge.map(p => (
                      <div 
                        key={p.name} 
                        style={{ 
                          background: 'rgba(0,0,0,0.25)', 
                          border: '1px solid var(--colors-hairline-dark)', 
                          padding: '14px 16px', 
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{p.name}</span>
                          <span className="mono" style={{ 
                            fontSize: '12px', 
                            color: p.pnl >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)', 
                            fontWeight: '700' 
                          }}>
                            {p.pnl >= 0 ? '+' : ''}${Math.round(p.pnl).toLocaleString()}
                          </span>
                        </div>
                        {/* Win Rate Progress Bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--colors-stone)' }}>
                            <span>{p.count} trade{p.count > 1 ? 's' : ''}</span>
                            <span>{p.winRate.toFixed(0)}% Win Rate</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${p.winRate}%`,
                              background: p.winRate >= 60 ? 'var(--colors-gain)' : p.winRate >= 40 ? 'var(--colors-primary)' : 'var(--colors-loss)',
                              borderRadius: '99px'
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly Trade Ledger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ 
                    fontSize: '11px', 
                    fontWeight: '800', 
                    color: 'var(--colors-stone)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.75px' 
                  }}>
                    Weekly Trade Ledger
                  </h4>

                  {/* Active Filter Bar Indicator */}
                  {selectedDayFilter && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      background: 'rgba(0, 0, 0, 0.2)', 
                      border: '1px solid var(--colors-hairline-dark)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}>
                      <Filter size={11} color="var(--colors-primary)" />
                      <span style={{ color: '#fff', fontWeight: '600' }}>Day: {selectedDayFilter}</span>
                      <button 
                        onClick={() => setSelectedDayFilter(null)}
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: 'var(--colors-primary-bright)', 
                          cursor: 'pointer', 
                          padding: '0 2px',
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: '700'
                        }}
                        title="Clear filter"
                      >
                        <RotateCcw size={10} style={{ marginLeft: '4px' }} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ 
                  overflowX: 'auto', 
                  flex: 1, 
                  border: '1px solid var(--colors-hairline-dark)', 
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.15)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '580px' }}>
                    <thead>
                      <tr style={{ 
                        borderBottom: '1px solid var(--colors-hairline-dark)', 
                        background: 'rgba(255,255,255,0.015)', 
                        color: 'var(--colors-stone)', 
                        fontSize: '11px', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <th style={{ padding: '12px 16px' }}>Date</th>
                        <th style={{ padding: '12px 16px' }}>Symbol</th>
                        <th style={{ padding: '12px 16px' }}>Setup / Model</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Bias</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rating</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Return</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '12px' }}>
                      {filteredTradesList.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--colors-stone)' }}>
                            {selectedDayFilter ? 'No trades closed on this filtered day.' : 'No trades closed this week.'}
                          </td>
                        </tr>
                      ) : (
                        filteredTradesList.map(t => {
                          const isWin = t.netPnL > 0;
                          const isLoss = t.netPnL < 0;
                          
                          return (
                            <tr 
                              key={t.id} 
                              onClick={() => openEditExecution(t.rawExec || t)}
                              style={{ 
                                borderBottom: '1px solid var(--colors-hairline-dark)',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              className="ledger-row"
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(184, 110, 255, 0.06)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '12px 16px', color: 'var(--colors-stone)' }}>{t.date}</td>
                              <td style={{ padding: '12px 16px', fontWeight: '700', color: '#fff' }}>{t.symbol}</td>
                              <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.85)' }}>{t.model || 'Unmapped'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  background: 'transparent',
                                  color: t.bias === 'LONG' ? 'var(--colors-primary-bright)' : 'var(--colors-stone)',
                                  border: '1px solid var(--colors-hairline-dark)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontWeight: '700'
                                }}>
                                  {t.bias}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  color: '#fff',
                                  fontWeight: '700',
                                  background: 'transparent',
                                  border: '1px solid var(--colors-hairline-dark)',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '10px'
                                }}>
                                  {t.setupRating || 'A'}
                                </span>
                              </td>
                              <td style={{ 
                                padding: '12px 16px', 
                                textAlign: 'right', 
                                fontWeight: '700', 
                                color: isWin ? 'var(--colors-gain)' : isLoss ? 'var(--colors-loss)' : 'var(--colors-stone)' 
                              }} className="mono">
                                <span style={{
                                  background: 'transparent',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--colors-hairline-dark)'
                                }}>
                                  {t.netPnL >= 0 ? '+' : ''}${Math.round(t.netPnL).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {onSelectTrade && filteredTradesList.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--colors-stone)', textAlign: 'right', paddingRight: '4px', marginTop: '4px' }}>
                    * Click on any trade row to audit detailed execution metrics & charts.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: Behavioral Audit */}
          {activeTab === 'audit' && (
            <div className="hollow-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px', 
              padding: '24px', 
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flex: 1 
            }}>
              
              {/* Live Auto-Calculated Performance Stats */}
              {(() => {
                // Calculate from actual week trades
                const ratingCounts = { 'A+': 0, 'A': 0, 'B': 0, 'F': 0, 'Other': 0 };
                weeklyTradesList.forEach(t => {
                  const r = t.setupRating || t.rating || '';
                  if (r === 'A+') ratingCounts['A+']++;
                  else if (r === 'A') ratingCounts['A']++;
                  else if (r === 'B') ratingCounts['B']++;
                  else if (r === 'F') ratingCounts['F']++;
                  else ratingCounts['Other']++;
                });
                const totalTrades = weeklyTradesList.length;
                const isWinWeek = weeklyTradeMetrics.wins > weeklyTradeMetrics.losses;
                const isLosingWeek = weeklyTradeMetrics.losses > weeklyTradeMetrics.wins;

                // A+ only check: all trades are rated A+
                const aPlusOnly = totalTrades > 0 && weeklyTradesList.every(t => {
                  const r = t.setupRating || t.rating || '';
                  return r === 'A+' || r === 'A';
                });

                // 1-2 trades per day check: group by date, none exceeds 2
                const tradesByDay = {};
                weeklyTradesList.forEach(t => {
                  if (!t.date) return;
                  tradesByDay[t.date] = (tradesByDay[t.date] || 0) + 1;
                });
                const maxTradesInDay = Math.max(0, ...Object.values(tradesByDay));
                const withinTradeLimit = totalTrades > 0 && maxTradesInDay <= 2;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--colors-stone)', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
                      Performance Audit
                    </h4>

                    {/* Rating Breakdown */}
                    <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '16px', borderRadius: '14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                        Setup Quality Breakdown
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'A+', color: '#b86eff', count: ratingCounts['A+'] },
                          { label: 'A', color: '#30d158', count: ratingCounts['A'] },
                          { label: 'B', color: '#ffd60a', count: ratingCounts['B'] },
                          { label: 'F', color: '#ff453a', count: ratingCounts['F'] }
                        ].map(r => (
                          <div key={r.label} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: `${r.color}12`, border: `1px solid ${r.color}40`,
                            padding: '8px 14px', borderRadius: '10px', flex: 1, minWidth: '70px'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: r.color }}>{r.label}</span>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>{r.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* W/L Week + Auto-checks row */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                      {/* W/L Week */}
                      <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px', marginBottom: '6px' }}>W/L WEEK</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '18px', color: isWinWeek ? 'var(--colors-gain)' : isLosingWeek ? 'var(--colors-loss)' : 'var(--colors-stone)' }}>
                            {weeklyTradeMetrics.wins}W / {weeklyTradeMetrics.losses}L
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: isWinWeek ? 'var(--colors-gain)' : isLosingWeek ? 'var(--colors-loss)' : 'var(--colors-stone)', marginTop: '4px', fontWeight: '600' }}>
                          {isWinWeek ? '✓ Winning Week' : isLosingWeek ? '✗ Losing Week' : '— Break Even'}
                        </div>
                      </div>

                      {/* A+ Only Auto-check */}
                      <div style={{
                        background: aPlusOnly ? 'rgba(48,209,88,0.06)' : 'rgba(0,0,0,0.25)',
                        border: `1px solid ${aPlusOnly ? 'rgba(48,209,88,0.3)' : 'var(--colors-hairline-dark)'}`,
                        padding: '14px 16px', borderRadius: '12px',
                        display: 'flex', alignItems: 'flex-start', gap: '10px'
                      }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '6px', marginTop: '2px', flexShrink: 0,
                          background: aPlusOnly ? 'var(--colors-gain)' : 'rgba(255,255,255,0.08)',
                          border: aPlusOnly ? 'none' : '2px solid rgba(255,255,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {aPlusOnly && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: aPlusOnly ? 'var(--colors-gain)' : 'rgba(255,255,255,0.7)' }}>A+ Setups Only</div>
                          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', marginTop: '2px' }}>
                            {totalTrades === 0 ? 'No trades' : aPlusOnly ? 'All trades A/A+' : 'Lower quality trades present'}
                          </div>
                        </div>
                      </div>

                      {/* 1-2 Trades/Day Auto-check */}
                      <div style={{
                        background: withinTradeLimit ? 'rgba(48,209,88,0.06)' : 'rgba(0,0,0,0.25)',
                        border: `1px solid ${withinTradeLimit ? 'rgba(48,209,88,0.3)' : 'var(--colors-hairline-dark)'}`,
                        padding: '14px 16px', borderRadius: '12px',
                        display: 'flex', alignItems: 'flex-start', gap: '10px'
                      }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '6px', marginTop: '2px', flexShrink: 0,
                          background: withinTradeLimit ? 'var(--colors-gain)' : 'rgba(255,255,255,0.08)',
                          border: withinTradeLimit ? 'none' : '2px solid rgba(255,255,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {withinTradeLimit && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: withinTradeLimit ? 'var(--colors-gain)' : 'rgba(255,255,255,0.7)' }}>≤2 Trades/Day</div>
                          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', marginTop: '2px' }}>
                            {totalTrades === 0 ? 'No trades' : withinTradeLimit ? `Max ${maxTradesInDay}/day ✓` : `${maxTradesInDay} trades on peak day`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ 
                  fontSize: '11px', 
                  fontWeight: '800', 
                  color: 'var(--colors-stone)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.75px' 
                }}>
                  EOW Checklist Audit
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                  gap: '14px'
                }}>
                  {[
                    { key: 'screenshotsReviewed', label: 'Review Charts', desc: 'Reviewed setup charts & screenshots in the playbook.' },
                    { key: 'playbookUpdated', label: 'Update Playbook', desc: 'Updated strategy stats, metrics, and trade tags.' },
                    { key: 'sleepCorrelationsChecked', label: 'Audit Sleep Debt', desc: 'Checked sleep quality/drawdown correlations.' },
                    { key: 'mistakesLogged', label: 'Log Mistakes', desc: 'Flagged emotional, revenge, or sizing mistakes.' }
                  ].map(item => {
                    const isChecked = weeklyForm[item.key];
                    return (
                      <div 
                        key={item.key} 
                        onClick={() => setWeeklyForm(prev => ({ ...prev, [item.key]: !isChecked }))}
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid var(--colors-hairline-dark)',
                          padding: '16px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: 'none'
                        }}
                        onMouseEnter={e => {
                          if (!isChecked) {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isChecked) {
                            e.currentTarget.style.borderColor = 'var(--colors-hairline-dark)';
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                          }
                        }}
                      >
                        <div style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '6px', 
                          border: isChecked ? 'none' : '2px solid rgba(255,255,255,0.2)',
                          background: isChecked ? 'var(--colors-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          boxShadow: 'none'
                        }}>
                          {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: isChecked ? '#fff' : 'rgba(255,255,255,0.9)' }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
                    Weekly Psychological Reflex Notes
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>Reflect on emotions & FOMO</span>
                </div>
                <textarea 
                  className="hollow-glass-input"
                  style={{ 
                    minHeight: '180px', 
                    resize: 'vertical', 
                    fontSize: '13px', 
                    flex: 1,
                    padding: '16px',
                    lineHeight: '1.6'
                  }}
                  value={weeklyForm.reviewNotes}
                  onChange={(e) => setWeeklyForm(prev => ({ ...prev, reviewNotes: e.target.value }))}
                  placeholder="Review your psychological trading performance this week. What went wrong? Did drawdown trigger because of fatigue, impatience, or FOMO? What triggers did you handle well? What rules did you break?"
                />
              </div>

            </div>
          )}

          {/* TAB CONTENT: Objectives & Adjustments */}
          {activeTab === 'objectives' && (
            <div className="hollow-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px', 
              padding: '24px', 
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flex: 1 
            }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ 
                    fontSize: '11px', 
                    color: 'var(--colors-stone)', 
                    fontWeight: '800', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.75px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Target size={12} color="var(--colors-primary)" /> Weekly Core Objectives
                  </label>
                  <textarea 
                    className="hollow-glass-input"
                    style={{ minHeight: '120px', resize: 'vertical', fontSize: '12px', padding: '12px', lineHeight: '1.5' }}
                    value={weeklyForm.goals}
                    onChange={(e) => setWeeklyForm(prev => ({ ...prev, goals: e.target.value }))}
                    placeholder="e.g., Sleep > 7h nightly, no averaging down, execute 3x weekly workout sessions, keep stop losses tight..."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ 
                    fontSize: '11px', 
                    color: 'var(--colors-stone)', 
                    fontWeight: '800', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.75px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertCircle size={12} color="var(--colors-primary)" /> Critical Priorities & Tasks
                  </label>
                  <textarea 
                    className="hollow-glass-input"
                    style={{ minHeight: '120px', resize: 'vertical', fontSize: '12px', padding: '12px', lineHeight: '1.5' }}
                    value={weeklyForm.priorities}
                    onChange={(e) => setWeeklyForm(prev => ({ ...prev, priorities: e.target.value }))}
                    placeholder="e.g., Prop firm validation targets, lock trailing drawdown limits, study Tuesday trade setup mistake..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ 
                  fontSize: '11px', 
                  color: 'var(--colors-stone)', 
                  fontWeight: '800', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.75px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Zap size={12} color="var(--colors-primary)" /> Key Takeaways
                </label>
                <textarea 
                  className="hollow-glass-input"
                  style={{ minHeight: '140px', resize: 'vertical', fontSize: '12px', flex: 1, padding: '12px', lineHeight: '1.5' }}
                  value={weeklyForm.adjustments}
                  onChange={(e) => setWeeklyForm(prev => ({ ...prev, adjustments: e.target.value }))}
                  placeholder="What did you learn this week? What patterns emerged in your execution? What will you carry forward into next week's sessions?"
                />
              </div>

            </div>
          )}

          {/* TAB CONTENT: News */}
          {activeTab === 'news' && (
            <div className="hollow-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px', 
              padding: '24px', 
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flex: 1 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Radio size={16} color="var(--colors-primary)" /> Weekly Economic News & Macro Calendar
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--colors-stone)', margin: '4px 0 0' }}>
                    Upload high-impact news calendar screenshots (FOMC, CPI, NFP) and note key catalyst times for this week.
                  </p>
                </div>
              </div>

              {/* Photo Upload Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '11px', 
                  color: 'var(--colors-stone)', 
                  fontWeight: '800', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.75px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Camera size={12} color="var(--colors-primary)" /> News Calendar Photo / Screenshot
                </label>

                {weeklyForm.newsPhoto ? (
                  <div style={{ position: 'relative', width: '100%', maxHeight: '420px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={weeklyForm.newsPhoto} alt="Weekly News Calendar" style={{ width: '100%', height: 'auto', maxHeight: '420px', objectFit: 'contain', background: '#000' }} />
                    <button
                      onClick={() => setWeeklyForm(prev => ({ ...prev, newsPhoto: null }))}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255, 69, 58, 0.85)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <label style={{
                    border: '2px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '40px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--colors-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                  >
                    <Camera size={32} color="var(--colors-primary)" />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'block' }}>
                        Upload Economic News Screenshot
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--colors-stone)', marginTop: '4px', display: 'block' }}>
                        Drag & drop or click to upload (PNG, JPG, WebP)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setWeeklyForm(prev => ({ ...prev, newsPhoto: ev.target.result }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Key News Events & Notes Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <label style={{ 
                  fontSize: '11px', 
                  color: 'var(--colors-stone)', 
                  fontWeight: '800', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.75px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Newspaper size={12} color="var(--colors-primary)" /> Key Macro Events & Catalyst Notes
                </label>
                <textarea 
                  className="hollow-glass-input"
                  style={{ minHeight: '120px', resize: 'vertical', fontSize: '12px', flex: 1, padding: '12px', lineHeight: '1.5' }}
                  value={weeklyForm.newsNotes}
                  onChange={(e) => setWeeklyForm(prev => ({ ...prev, newsNotes: e.target.value }))}
                  placeholder="e.g., Wednesday 14:00 EST - FOMC Statement & Powell Presser (high volatility expected). Thursday 08:30 EST - Initial Jobless Claims..."
                />
              </div>

            </div>
          )}

          {/* Action Row */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'flex-end', 
            gap: '14px', 
            marginTop: '4px',
            width: isMobile ? '100%' : 'auto'
          }}>
             <button 
              onClick={handleExportPDF}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#fff',
                padding: '10px 20px',
                fontWeight: '700',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                transition: 'all var(--transition-fast)',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              Export PDF Report
            </button>
             <button 
              onClick={handleSaveWeekly}
              style={{
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                padding: '10px 22px',
                fontWeight: '600',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                transition: 'all var(--transition-fast)',
                boxShadow: 'none',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e5e5e5';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Save size={14} /> Save EOW Review
            </button>
          </div>

        </div>

      </div>

      {/* Off-screen elements for html2canvas exports */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        {/* Render Daily Card Preview */}
        {activeDailyRecord && (() => {
          const record = activeDailyRecord;
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
                  "{record.netPnL >= 0 ? WEEKLY_MINDSET_QUOTES.win[quoteIndex % WEEKLY_MINDSET_QUOTES.win.length].text : WEEKLY_MINDSET_QUOTES.loss[quoteIndex % WEEKLY_MINDSET_QUOTES.loss.length].text}"
                </div>
                <div style={{ 
                  fontSize: '7.5px', 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textAlign: 'right', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '800'
                }}>
                  — {record.netPnL >= 0 ? WEEKLY_MINDSET_QUOTES.win[quoteIndex % WEEKLY_MINDSET_QUOTES.win.length].author : WEEKLY_MINDSET_QUOTES.loss[quoteIndex % WEEKLY_MINDSET_QUOTES.loss.length].author}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Render Weekly Card Preview */}
        {weeklyTradeMetrics && (() => {
          const isWin = weeklyTradeMetrics.totalPnL >= 0;
          const accentColor = isWin ? '#30d158' : '#ff453a';
          
          return (
            <div 
              id="weekly-review-card-preview" 
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
                    weekly review
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', marginTop: '3px', letterSpacing: '-0.2px' }}>
                    {selectedWeekId}
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
                    {weeklyTradeMetrics.totalPnL >= 0 ? '+' : ''}${Math.round(weeklyTradeMetrics.totalPnL).toLocaleString()}
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
                    {weeklyTradeMetrics.totalTrades} pos / {weeklyTradeMetrics.winRate.toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    best return
                  </span>
                  <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                    {weeklyBestReturn > 0 ? '+' : ''}${Math.round(weeklyBestReturn).toLocaleString()}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1px', fontWeight: '800', marginBottom: '1px' }}>
                    assets traded
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
                    {weeklyTickersList || 'none'}
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
                  "{weeklyTradeMetrics.totalPnL >= 0 ? WEEKLY_MINDSET_QUOTES.win[quoteIndex % WEEKLY_MINDSET_QUOTES.win.length].text : WEEKLY_MINDSET_QUOTES.loss[quoteIndex % WEEKLY_MINDSET_QUOTES.loss.length].text}"
                </div>
                <div style={{ 
                  fontSize: '7.5px', 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textAlign: 'right', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '800'
                }}>
                  — {weeklyTradeMetrics.totalPnL >= 0 ? WEEKLY_MINDSET_QUOTES.win[quoteIndex % WEEKLY_MINDSET_QUOTES.win.length].author : WEEKLY_MINDSET_QUOTES.loss[quoteIndex % WEEKLY_MINDSET_QUOTES.loss.length].author}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* DAY REVIEW POPUP MODAL */}
      {dayModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setDayModalOpen(false)}>
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Day Review — {dayModalDate}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>Log daily setup photos & notes</span>
              </div>
              <button 
                onClick={() => setDayModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            {/* Photos Grid: Trade of the Day & Trade Taken */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Trade of the Day Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Trade of the Day Photo
                </label>
                <div style={{
                  border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  minHeight: '130px',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '8px'
                }}>
                  {dayModalForm.tradeOfDayPhoto ? (
                    <>
                      <img src={dayModalForm.tradeOfDayPhoto} alt="Trade of the Day" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                      <button
                        onClick={() => setDayModalForm(prev => ({ ...prev, tradeOfDayPhoto: null }))}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff453a', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <label style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Camera size={22} color="var(--colors-stone)" />
                      <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>Upload Chart Photo</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload('tradeOfDayPhoto', e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>

              {/* Trade Taken Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Trade Taken Photo
                </label>
                <div style={{
                  border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  minHeight: '130px',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '8px'
                }}>
                  {dayModalForm.tradeTakenPhoto ? (
                    <>
                      <img src={dayModalForm.tradeTakenPhoto} alt="Trade Taken" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                      <button
                        onClick={() => setDayModalForm(prev => ({ ...prev, tradeTakenPhoto: null }))}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff453a', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <label style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Camera size={22} color="var(--colors-stone)" />
                      <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>Upload Execution Photo</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload('tradeTakenPhoto', e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Review Section: Text + Optional Extra Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Daily Review
              </label>
              <textarea
                className="hollow-glass-input"
                style={{ minHeight: '100px', resize: 'vertical', fontSize: '12px', padding: '12px', lineHeight: '1.5' }}
                value={dayModalForm.reviewText}
                onChange={e => setDayModalForm(prev => ({ ...prev, reviewText: e.target.value }))}
                placeholder="What went well today? What mistakes or emotional triggers did you notice?"
              />

              {/* Extra Review Photo */}
              <div style={{ marginTop: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  Optional Extra Photo
                </label>
                {dayModalForm.reviewExtraPhoto ? (
                  <div style={{ position: 'relative', width: 'fit-content' }}>
                    <img src={dayModalForm.reviewExtraPhoto} alt="Extra Review" style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button
                      onClick={() => setDayModalForm(prev => ({ ...prev, reviewExtraPhoto: null }))}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff453a', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                    <Camera size={14} color="var(--colors-stone)" /> Add Extra Photo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload('reviewExtraPhoto', e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setDayModalOpen(false)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDayModalSave}
                style={{ background: 'var(--colors-primary)', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
              >
                Save Review
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
