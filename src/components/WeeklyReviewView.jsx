import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL } from '../utils/tradeMath';
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
  } from 'lucide-react';

const WEEKLY_STOIC_QUOTES = {
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

export default function WeeklyReviewView({ trades, executions, selectedAccountId, onSelectTrade }) {
  const isMobile = useUIStore(state => state.isMobile);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);

  // Compute Week ID e.g. "2024-W25" from selectedDate
  const selectedWeekId = useMemo(() => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return getISOWeekId(new Date());
    return getISOWeekId(d);
  }, [selectedDate]);

  const setSelectedWeekId = (weekId) => {
    // Parse weekId (e.g. "2024-W25") to set the date back into Zustand to the monday of that week
    const parts = weekId.split('-W');
    if (parts.length === 2) {
      const year = parseInt(parts[0]);
      const week = parseInt(parts[1]);
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) {
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      } else {
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      }
      setSelectedDate(ISOweekStart.toISOString().split('T')[0]);
    }
  };
  const [activeTab, setActiveTab] = useState('playbook'); // 'playbook', 'audit', 'objectives'
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState(null); // null or date string
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [exportMode, setExportMode] = useState('weekly'); // 'daily' | 'weekly'

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
    if (selectedAccountId === 'all') return null;
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
        screenshotsReviewed: false,
        playbookUpdated: false,
        sleepCorrelationsChecked: false,
        mistakesLogged: false
      });
    }
  }, [weeklyLog, selectedWeekId]);

  // Compile a dropdown list of all available weeks in the DB
  const weekOptions = useLiveQuery(async () => {
    const weeksSet = new Set();
    
    // Scan weeklyPlanners
    const planners = await db.weeklyPlanners.toArray();
    planners.forEach(p => { if (p.weekId) weeksSet.add(p.weekId); });

    // Scan trades (use date to compute week)
    const allTrades = await db.trades.toArray();
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

    // Fallback/Ensure active mock weeks are present
    weeksSet.add('2024-W23');
    weeksSet.add('2024-W24');
    weeksSet.add('2024-W25');
    weeksSet.add('2024-W26');

    // Convert to list, sort descending
    const sorted = Array.from(weeksSet).sort().reverse();
    
    return sorted.map(w => {
      const dates = getWeekDates(w);
      return {
        value: w,
        label: `Week ${w} (${dates.start} to ${dates.end})`
      };
    });
  }, []);

  const selectOptions = useMemo(() => {
    return weekOptions || [];
  }, [weekOptions]);

  // Generate the 7 days of the selected week (Mon to Sun)
  const weekDaysList = useMemo(() => {
    const list = [];
    const start = new Date(weekDates.start);
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      list.push({
        date: dateStr,
        dayName: dayNames[d.getDay()],
        shortDayName: shortDayNames[d.getDay()],
        displayLabel: `${shortDayNames[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
      });
    }
    return list;
  }, [weekDates]);

  // Aggregate daily metrics (trades, PnL, journal status) for each of the 7 days
  const daysData = useMemo(() => {
    return weekDaysList.map(day => {
      const journal = weekJournals.find(j => j.date === day.date);
      const dayTrades = trades.filter(t => {
        const isAccountMatch = selectedAccountId === 'all' || t.accountId === selectedAccountId;
        return isAccountMatch && t.date === day.date;
      });

      let netPnL = 0;
      let wins = 0;
      let losses = 0;

      dayTrades.forEach(t => {
        const execs = executions.filter(e => e.tradeId === t.id);
        const pnlDetails = calculateTradePnL(t, execs);
        netPnL += pnlDetails.netPnL;
        if (pnlDetails.netPnL > 0) wins++;
        else if (pnlDetails.netPnL < 0) losses++;
      });

      return {
        ...day,
        journal,
        tradesCount: dayTrades.length,
        netPnL,
        wins,
        losses,
        hasJournal: !!journal
      };
    });
  }, [weekDaysList, weekJournals, trades, executions, selectedAccountId]);

  // Calculate actual trade metrics for this week reactively
  const weeklyTradeMetrics = useMemo(() => {
    const weekTrades = trades.filter(t => {
      const isAccountMatch = selectedAccountId === 'all' || t.accountId === selectedAccountId;
      return isAccountMatch && t.date >= weekDates.start && t.date <= weekDates.end;
    });

    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let be = 0;
    let grossGains = 0;
    let grossLosses = 0;
    let totalMistakes = 0;
    let totalContracts = 0;

    weekTrades.forEach(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const { netPnL, contracts } = calculateTradePnL(trade, tradeExecs);
      
      totalPnL += netPnL;
      totalContracts += contracts;
      totalMistakes += (trade.mistakes || []).length;

      if (netPnL > 0) {
        wins++;
        grossGains += netPnL;
      } else if (netPnL < 0) {
        losses++;
        grossLosses += Math.abs(netPnL);
      } else {
        be++;
      }
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const activeWinRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
    const profitFactor = grossLosses > 0 ? (grossGains / grossLosses) : grossGains > 0 ? 9.99 : 0;
    const expectancy = weekTrades.length > 0 ? (totalPnL / weekTrades.length) : 0;

    return {
      totalTrades: weekTrades.length,
      wins,
      losses,
      be,
      winRate,
      activeWinRate,
      profitFactor,
      expectancy,
      totalPnL,
      totalMistakes,
      totalContracts
    };
  }, [trades, executions, selectedAccountId, weekDates]);

  // Compile detailed list of trades closed this week
  const weeklyTradesList = useMemo(() => {
    return trades.filter(t => {
      const isAccountMatch = selectedAccountId === 'all' || t.accountId === selectedAccountId;
      return isAccountMatch && t.date >= weekDates.start && t.date <= weekDates.end;
    }).map(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const pnlDetails = calculateTradePnL(trade, tradeExecs);
      return {
        ...trade,
        ...pnlDetails
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades, executions, selectedAccountId, weekDates]);

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
      if (t.netPnL > 0) g.wins++;
      else if (t.netPnL < 0) g.losses++;
    });

    return Object.values(groups).map(g => ({
      ...g,
      winRate: g.count > 0 ? (g.wins / g.count) * 100 : 0
    })).sort((a, b) => b.pnl - a.pnl);
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

  const handleWeekShift = (direction) => {
    const currentIndex = selectOptions.findIndex(o => o.value === selectedWeekId);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex - direction; // because we sorted descending, shifting +1 moves to newer, which is smaller index
    if (nextIndex >= 0 && nextIndex < selectOptions.length) {
      setSelectedWeekId(selectOptions[nextIndex].value);
    }
  };

  // Toggle active day filter in the calendar ribbon
  const handleDayClick = (dateStr) => {
    if (selectedDayFilter === dateStr) {
      setSelectedDayFilter(null);
    } else {
      setSelectedDayFilter(dateStr);
    }
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
      padding: isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px',
      boxSizing: 'border-box'
    }}>
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
      
      {/* Top Navigator & Control Row */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1>
            <Award size={28} color="var(--colors-primary)" /> Weekly Review
          </h1>
          <p>
            Consolidated EOW Trading Station. Auditing playbook setups, sleep metrics, and psychology.
          </p>
        </div>

        {/* Navigator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '12px' : '0' }}>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            background: 'rgba(0, 0, 0, 0.2)', 
            border: '1px solid var(--colors-hairline-dark)', 
            padding: '4px', 
            borderRadius: '12px' 
          }}>
            <button 
              onClick={() => handleWeekShift(-1)}
              disabled={selectOptions.findIndex(o => o.value === selectedWeekId) === selectOptions.length - 1}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
                opacity: selectOptions.findIndex(o => o.value === selectedWeekId) === selectOptions.length - 1 ? 0.3 : 1
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronLeft size={16} />
            </button>
 
            {/* Premium Selector Dropdown */}
            <div style={{ width: isMobile ? '180px' : '260px' }}>
              <HollowSelect
                value={selectedWeekId}
                onChange={setSelectedWeekId}
                options={selectOptions}
                placeholder="Select Review Week"
                style={{ 
                  background: 'transparent', 
                  border: 'none'
                }}
              />
            </div>

            <button 
              onClick={() => handleWeekShift(1)}
              disabled={selectOptions.findIndex(o => o.value === selectedWeekId) === 0}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
                opacity: selectOptions.findIndex(o => o.value === selectedWeekId) === 0 ? 0.3 : 1
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Simple Share Button in Header */}
          {weeklyTradeMetrics && (
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



          {saveStatus && (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--colors-primary)', 
              fontFamily: 'var(--font-mono)',
              fontWeight: '600',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '6px 12px',
              borderRadius: '8px'
            }}>
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* 1. Interactive Weekly Calendar Ribbon */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--colors-stone)', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
            Interactive Calendar Ribbon
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
              Click any day to filter weekly trades list
            </span>
            <button
              onClick={() => {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const weekId = getISOWeekId(today);
                setSelectedWeekId(weekId);
                setSelectedDayFilter(todayStr);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              Today
            </button>
          </div>
        </div>
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'row' : 'none',
          gridTemplateColumns: isMobile ? 'none' : 'repeat(7, 1fr)',
          gap: '12px',
          background: '#0f0f11',
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
                    : '1px solid #1c1c1e',
                  background: isFiltered 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : '#0f0f11',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'none',
                  flexShrink: isMobile ? 0 : 1,
                  minWidth: isMobile ? '120px' : 'auto'
                }}
                onMouseEnter={e => {
                  if (!isFiltered) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                onMouseLeave={e => {
                  if (!isFiltered) {
                    e.currentTarget.style.borderColor = '#1c1c1e';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Header Date & Journal Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: isFiltered ? '#fff' : 'rgba(255,255,255,0.9)' }}>
                    {day.displayLabel}
                  </span>
                  <div style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: day.hasJournal ? 'var(--colors-primary)' : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: 'none'
                  }} title={day.hasJournal ? 'Daily Journal Logged' : 'No Daily Journal Logged'} />
                </div>
                
                {/* PnL and Trades Count */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    fontFamily: 'var(--font-mono)',
                    color: isWinningDay ? 'var(--colors-gain)' : isLosingDay ? 'var(--colors-loss)' : 'var(--colors-stone)'
                  }}>
                    {day.netPnL !== 0 ? `${day.netPnL >= 0 ? '+' : ''}${Math.round(day.netPnL)}` : '$0'}
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
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
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
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>NET PNL</div>
                <div className="mono" style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: weeklyTradeMetrics.totalPnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)', 
                  marginTop: '4px',
                  textShadow: weeklyTradeMetrics.totalPnL >= 0 ? '0 0 15px rgba(58, 219, 129, 0.15)' : '0 0 15px rgba(255, 107, 107, 0.15)'
                }}>
                  {weeklyTradeMetrics.totalPnL >= 0 ? '+' : ''}${Math.round(weeklyTradeMetrics.totalPnL).toLocaleString()}
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>WIN RATE</div>
                <div className="mono" style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                  {weeklyTradeMetrics.activeWinRate.toFixed(0)}%
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>PROFIT FACTOR</div>
                <div className="mono" style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                  {weeklyTradeMetrics.profitFactor.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--colors-hairline-dark)', padding: '14px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px' }}>EXPECTANCY</div>
                <div className="mono" style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                  {weeklyTradeMetrics.expectancy >= 0 ? '+' : ''}${Math.round(weeklyTradeMetrics.expectancy).toLocaleString()}
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

          {/* Sleep & Focus Correlation Card */}
          <div className="hollow-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px', 
            padding: '24px',
            background: '#0f0f11',
            border: '1px solid #1c1c1e'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--colors-primary)" /> Sleep & Focus Correlations
            </h3>
            
            {healthCorrelations.journalCount === 0 ? (
              <div style={{ color: 'var(--colors-stone)', fontSize: '12px', textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
                No daily journals logged this week. Fill out Daily Journals in the Journal view to generate correlations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Sleep Comparison Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Win days sleep */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Moon size={13} color="var(--colors-gain)" /> Avg Sleep (Winning Days)
                      </span>
                      <span className="mono" style={{ fontWeight: '700', color: 'var(--colors-gain)' }}>
                        {healthCorrelations.avgSleepWinDays > 0 ? `${healthCorrelations.avgSleepWinDays.toFixed(1)} hrs` : 'N/A'}
                      </span>
                    </div>
                    {healthCorrelations.avgSleepWinDays > 0 && (
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((healthCorrelations.avgSleepWinDays / 10) * 100, 100)}%`,
                          background: 'var(--colors-gain)',
                          borderRadius: '99px',
                          boxShadow: 'none'
                        }} />
                      </div>
                    )}
                    {/* Sleep quality win days */}
                    {healthCorrelations.avgSleepQualityWinDays > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--colors-stone)', marginTop: '-2px' }}>
                        <Smile size={10} color="var(--colors-gain)" /> Quality: <span style={{ color: '#fff', fontWeight: '600' }}>{healthCorrelations.avgSleepQualityWinDays.toFixed(1)} / 5</span>
                      </div>
                    )}
                  </div>

                  {/* Loss days sleep */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--colors-hairline-dark)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Moon size={13} color="var(--colors-loss)" /> Avg Sleep (Losing Days)
                      </span>
                      <span className="mono" style={{ fontWeight: '700', color: 'var(--colors-loss)' }}>
                        {healthCorrelations.avgSleepLossDays > 0 ? `${healthCorrelations.avgSleepLossDays.toFixed(1)} hrs` : 'N/A'}
                      </span>
                    </div>
                    {healthCorrelations.avgSleepLossDays > 0 && (
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((healthCorrelations.avgSleepLossDays / 10) * 100, 100)}%`,
                          background: 'var(--colors-loss)',
                          borderRadius: '99px',
                          boxShadow: 'none'
                        }} />
                      </div>
                    )}
                    {/* Sleep quality loss days */}
                    {healthCorrelations.avgSleepQualityLossDays > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--colors-stone)', marginTop: '-2px' }}>
                        <Smile size={10} color="var(--colors-loss)" /> Quality: <span style={{ color: '#fff', fontWeight: '600' }}>{healthCorrelations.avgSleepQualityLossDays.toFixed(1)} / 5</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Focus scores */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px', 
                  borderTop: '1px solid var(--colors-hairline-dark)', 
                  paddingTop: '14px',
                  background: 'rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  padding: '10px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: 'var(--colors-on-dark-mute)' }}>Avg Mental Focus</span>
                    <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{healthCorrelations.avgFocus.toFixed(1)} / 5.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: 'var(--colors-on-dark-mute)' }}>Avg Patience Level</span>
                    <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{healthCorrelations.avgPatience.toFixed(1)} / 5.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: 'var(--colors-on-dark-mute)' }}>Avg Risk Adherence</span>
                    <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{healthCorrelations.avgRiskAdherence.toFixed(1)} / 5.0</span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Habit Completion Card */}
          <div className="hollow-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px', 
            padding: '24px',
            background: '#0f0f11',
            border: '1px solid #1c1c1e'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--colors-primary)" /> Weekly Habit Consistency
            </h3>
            
            {healthCorrelations.journalCount === 0 ? (
              <div style={{ color: 'var(--colors-stone)', fontSize: '12px', textAlign: 'center', padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
                No daily journals logged this week.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                 {[
                  { name: 'Workout Completed', rate: healthCorrelations.workoutRate, color: '#e5e5e5' },
                  { name: 'Clean Diet Maintained', rate: healthCorrelations.dietRate, color: '#a3a3a3' },
                  { name: 'Meditation Completed', rate: healthCorrelations.meditationRate, color: '#737373' }
                ].map(h => (
                  <div key={h.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--colors-on-dark-mute)' }}>{h.name}</span>
                      <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{h.rate.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${h.rate}%`,
                        background: h.color,
                        borderRadius: '99px',
                        boxShadow: 'none'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Tabs for Reflections & Trade Ledgers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tab Button Switcher */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '4px',
            background: '#0f0f11',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid #1c1c1e',
            width: isMobile ? '100%' : 'fit-content'
          }}>
            {[
              { id: 'playbook', name: 'Playbook & Trades', icon: BookOpen },
              { id: 'audit', name: 'Behavioral Audit', icon: ShieldAlert },
              { id: 'objectives', name: 'Objectives & Adjustments', icon: ClipboardList }
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
                    background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--colors-on-dark-mute)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    boxShadow: 'none',
                    width: isMobile ? '100%' : 'auto'
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
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
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
                              onClick={() => onSelectTrade && onSelectTrade(t.id)}
                              style={{ 
                                borderBottom: '1px solid var(--colors-hairline-dark)',
                                cursor: onSelectTrade ? 'pointer' : 'default',
                                transition: 'background 0.2s'
                              }}
                              className="ledger-row"
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
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
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
              flex: 1 
            }}>
              
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
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
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
                  <Zap size={12} color="var(--colors-primary)" /> Strategy Adjustments for Next Week
                </label>
                <textarea 
                  className="hollow-glass-input"
                  style={{ minHeight: '140px', resize: 'vertical', fontSize: '12px', flex: 1, padding: '12px', lineHeight: '1.5' }}
                  value={weeklyForm.adjustments}
                  onChange={(e) => setWeeklyForm(prev => ({ ...prev, adjustments: e.target.value }))}
                  placeholder="Define concrete playbook setups, sizing configurations, or mental adjustments you will enforce in the upcoming trading session."
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
                background: '#0f0f11',
                border: '1px solid var(--colors-hairline-dark)',
                color: '#fff',
                padding: '10px 20px',
                fontWeight: '600',
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
                e.currentTarget.style.background = '#1c1c1e';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#0f0f11';
                e.currentTarget.style.borderColor = 'var(--colors-hairline-dark)';
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
                  "{record.netPnL >= 0 ? WEEKLY_STOIC_QUOTES.win[quoteIndex % WEEKLY_STOIC_QUOTES.win.length].text : WEEKLY_STOIC_QUOTES.loss[quoteIndex % WEEKLY_STOIC_QUOTES.loss.length].text}"
                </div>
                <div style={{ 
                  fontSize: '7.5px', 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textAlign: 'right', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '800'
                }}>
                  — {record.netPnL >= 0 ? WEEKLY_STOIC_QUOTES.win[quoteIndex % WEEKLY_STOIC_QUOTES.win.length].author : WEEKLY_STOIC_QUOTES.loss[quoteIndex % WEEKLY_STOIC_QUOTES.loss.length].author}
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
                  "{weeklyTradeMetrics.totalPnL >= 0 ? WEEKLY_STOIC_QUOTES.win[quoteIndex % WEEKLY_STOIC_QUOTES.win.length].text : WEEKLY_STOIC_QUOTES.loss[quoteIndex % WEEKLY_STOIC_QUOTES.loss.length].text}"
                </div>
                <div style={{ 
                  fontSize: '7.5px', 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  textAlign: 'right', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '800'
                }}>
                  — {weeklyTradeMetrics.totalPnL >= 0 ? WEEKLY_STOIC_QUOTES.win[quoteIndex % WEEKLY_STOIC_QUOTES.win.length].author : WEEKLY_STOIC_QUOTES.loss[quoteIndex % WEEKLY_STOIC_QUOTES.loss.length].author}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
