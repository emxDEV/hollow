import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { calculateTradePnL, isTradeWinRateEligible } from '../../utils/tradeMath';
import { getISOWeekId, getWeekDates } from '../../utils/dateUtils';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Save, Camera, Target, 
  ClipboardCheck, TrendingUp, AlertCircle, BookOpen, Clock, Activity, Zap, ShieldAlert,
  CheckCircle2, Circle, Check, Newspaper, Radio, Award
} from 'lucide-react';

const WEEKLY_MINDSET_QUOTES = {
  win: [
    { text: "Consistency is not about perfection. It is about relentless alignment with your system.", author: "Hollow Analytics" },
    { text: "Execution without emotion is the ultimate trading edge.", author: "Hollow Mindset" },
    { text: "Protect your capital, control your risk, and let probability work.", author: "Hollow Edge" }
  ],
  loss: [
    { text: "Drawdowns are data, not defeat. Refine the process and execute clean.", author: "Hollow Mindset" },
    { text: "Mastering your risk parameters turns adversity into market intelligence.", author: "Hollow Analytics" },
    { text: "Stay disciplined under pressure. Every execution is an iteration.", author: "Hollow Ledger" }
  ]
};

export default function MobileWeeklyReviewView({ trades, executions, accounts, selectedAccountId, onSharePnL, addToast, onBack }) {
  const safeTrades = trades || [];
  const safeExecutions = executions || [];
  const safeAccountId = selectedAccountId || 'all';

  // Default to the current week ID
  const [selectedWeekId, setSelectedWeekId] = useState(() => getISOWeekId(new Date()));
  const [activeTab, setActiveTab] = useState('playbook'); // 'playbook', 'audit', 'objectives', 'news'
  const [selectedDayFilter, setSelectedDayFilter] = useState(null); // null or date string
  const [saving, setSaving] = useState(false);

  // Day Review Modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState(null);
  const [dayModalForm, setDayModalForm] = useState({
    tradeOfDayPhoto: null,
    tradeTakenPhoto: null,
    reviewText: '',
    reviewExtraPhoto: null
  });

  // Fetch weekly planner entry reactively from IndexedDB
  const weeklyLog = useLiveQuery(async () => {
    return await db.weeklyPlanners.get(selectedWeekId);
  }, [selectedWeekId]);

  // Compute start/end dates of selectedWeekId
  const weekDates = useMemo(() => {
    return getWeekDates(selectedWeekId);
  }, [selectedWeekId]);

  // Fetch daily journals for this week reactively
  const weekJournals = useLiveQuery(async () => {
    if (!db.dailyJournals) return [];
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

  // Sync DB log to local state
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
  const isInitialMount = useRef(true);
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

  // Scan and fetch week IDs in database for navigator selector
  const weekOptions = useMemo(() => {
    const weeksSet = new Set([getISOWeekId(new Date())]);
    safeTrades.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          weeksSet.add(getISOWeekId(d));
        }
      }
    });
    return Array.from(weeksSet).sort((a, b) => b.localeCompare(a));
  }, [safeTrades]);

  // Shift selected week ID
  const handleWeekShift = (dir) => {
    const idx = weekOptions.indexOf(selectedWeekId);
    if (idx === -1) return;
    const nextIdx = idx - dir;
    if (nextIdx >= 0 && nextIdx < weekOptions.length) {
      setSelectedWeekId(weekOptions[nextIdx]);
    }
  };

  // Compile trades and metrics for this week (in details)
  const weeklyTradesList = useMemo(() => {
    const processedExecIds = new Set();
    const tradeItems = safeTrades
      .filter(t => {
        const isAccountMatch = safeAccountId === 'all' || t.accountId === safeAccountId;
        return isAccountMatch && t.date >= weekDates.start && t.date <= weekDates.end;
      })
      .map(trade => {
        const tradeExecs = safeExecutions.filter(e => e.tradeId === trade.id);
        tradeExecs.forEach(e => processedExecIds.add(e.id));
        const pnlDetails = calculateTradePnL(trade, tradeExecs);
        return {
          ...trade,
          ...pnlDetails,
          rawExec: tradeExecs[0] || trade
        };
      });

    const standaloneExecs = safeExecutions
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
  }, [safeTrades, safeExecutions, safeAccountId, weekDates]);

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

  // Compute Friday date string
  const selectedWeekFridayStr = useMemo(() => {
    const parts = (weekDates.start || '').split('-').map(Number);
    if (parts.length !== 3) return weekDates.end;
    const friD = new Date(parts[0], parts[1] - 1, parts[2] + 4);
    const y = friD.getFullYear();
    const m = String(friD.getMonth() + 1).padStart(2, '0');
    const d = String(friD.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [weekDates]);

  // Aggregate daily metrics (trades, RR, journal status) for each Mon-Fri day
  const daysData = useMemo(() => {
    return weekDaysList.map(day => {
      const journal = weekJournals.find(j => j.date === day.date);
      const dayTrades = safeTrades.filter(t => {
        const isAccountMatch = safeAccountId === 'all' || t.accountId === safeAccountId;
        return isAccountMatch && t.date === day.date;
      });

      const processedExecIds = new Set();
      let wins = 0;
      let eligibleTrades = 0;
      let totalR = 0;
      let netPnL = 0;

      dayTrades.forEach(t => {
        const tExecs = safeExecutions.filter(e => e.tradeId === t.id);
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

      const dayExecutions = safeExecutions.filter(e => e.date === day.date || e.id?.includes(day.date));
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
  }, [weekDaysList, weekJournals, safeTrades, safeExecutions, safeAccountId]);

  // Handle day click in horizontal strip
  const handleDayClick = (dateStr) => {
    if (selectedDayFilter === dateStr) {
      setSelectedDayFilter(null);
    } else {
      setSelectedDayFilter(dateStr);
    }
  };

  // Filtered trades list inside week review
  const filteredTradesList = useMemo(() => {
    if (!selectedDayFilter) return weeklyTradesList;
    return weeklyTradesList.filter(t => t.date === selectedDayFilter);
  }, [weeklyTradesList, selectedDayFilter]);

  // Playbook stats breakdown
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

  // Compute Health & Behavior correlations
  const healthCorrelations = useMemo(() => {
    let totalFocus = 0;
    let totalPatience = 0;
    let totalRiskAdherence = 0;
    let journalCount = 0;

    daysData.forEach(day => {
      const j = day.journal;
      if (!j) return;
      journalCount++;
      if (j.mentalFocus !== undefined) totalFocus += j.mentalFocus;
      if (j.patienceLevel !== undefined) totalPatience += j.patienceLevel;
      if (j.riskAdherence !== undefined) totalRiskAdherence += j.riskAdherence;
    });

    const avgFocus = journalCount > 0 ? (totalFocus / journalCount) : 0;
    const avgPatience = journalCount > 0 ? (totalPatience / journalCount) : 0;
    const avgRiskAdherence = journalCount > 0 ? (totalRiskAdherence / journalCount) : 0;

    return {
      avgFocus,
      avgPatience,
      avgRiskAdherence,
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

  // Open day review modal
  const handleDayModalOpen = (dateStr, e) => {
    e.stopPropagation();
    const journal = weekJournals.find(j => j.date === dateStr);
    setDayModalDate(dateStr);
    setDayModalForm({
      tradeOfDayPhoto: journal?.tradeOfDayPhoto || null,
      tradeTakenPhoto: journal?.tradeTakenPhoto || null,
      reviewText: journal?.weeklyReviewText || journal?.reviewText || '',
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
      addToast('Daily review saved.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save daily review.', 'error');
    }
  };

  const handlePhotoUpload = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDayModalForm(prev => ({ ...prev, [field]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await db.weeklyPlanners.put({
        weekId: selectedWeekId,
        startDate: weekDates.start,
        endDate: weekDates.end,
        status: 'COMPLETED',
        ...weeklyForm
      });
      addToast('Weekly Review saved.', 'success');
    } catch (err) {
      addToast('Failed to save.', 'error');
    }
    setSaving(false);
  };

  const handleExportPDF = async () => {
    try {
      const { exportWeeklyReportPDF } = await import('../../utils/pdfExport');
      const account = safeAccountId === 'all' ? null : (accounts || []).find(a => a.id === safeAccountId);
      exportWeeklyReportPDF(selectedWeekId, account, safeTrades, safeExecutions);
      addToast('PDF exported successfully.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to export PDF.', 'error');
    }
  };

  const isWin = weeklyTradeMetrics.totalR >= 0;
  const accentColor = isWin ? '#30d158' : '#ff453a';
  const quotesList = isWin ? WEEKLY_MINDSET_QUOTES.win : WEEKLY_MINDSET_QUOTES.loss;
  const quote = quotesList[0];

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        zIndex: 100,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '14px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '4px 0', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                Weekly Review
              </h1>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                Consolidated EOW Trading Station
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleExportPDF}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Camera size={13} />
              <span>PDF</span>
            </button>
            <button
              onClick={handleSaveReview}
              disabled={saving}
              style={{
                background: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                opacity: saving ? 0.6 : 1,
                cursor: 'pointer'
              }}
            >
              <Save size={13} />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable View Area */}
      <div className="scroll-area" style={{ flex: 1, padding: '0 16px 100px', overflowY: 'auto' }}>
        
        {/* Week Navigator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 16,
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '12px',
          marginTop: '16px',
        }}>
          <button 
            onClick={() => handleWeekShift(-1)} 
            disabled={weekOptions.indexOf(selectedWeekId) === weekOptions.length - 1}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: 6,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              opacity: weekOptions.indexOf(selectedWeekId) === weekOptions.length - 1 ? 0.3 : 1
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.01em' }}>
            Week {selectedWeekId} ({weekDates.start} to {selectedWeekFridayStr})
          </span>
          <button 
            onClick={() => handleWeekShift(1)} 
            disabled={weekOptions.indexOf(selectedWeekId) === 0}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: 6,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              opacity: weekOptions.indexOf(selectedWeekId) === 0 ? 0.3 : 1
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        {/* Mindset Quote Banner */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 16
        }}>
          <span style={{ fontSize: 9, color: accentColor, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>MINDSET AUDIT</span>
          <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, margin: 0 }}>"{quote.text}"</p>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>— {quote.author}</span>
        </div>

        {/* Weekly Stats Summary (R metrics) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total R</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: weeklyTradeMetrics.totalR >= 0 ? '#30d158' : '#ff453a', marginTop: 4 }}>
              {weeklyTradeMetrics.totalR >= 0 ? '+' : ''}{weeklyTradeMetrics.totalR}R
            </div>
          </div>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Win Rate</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: weeklyTradeMetrics.totalTrades === 0 ? '#fff' : (weeklyTradeMetrics.activeWinRate >= 50 ? '#30d158' : '#ff453a'), marginTop: 4 }}>
              {weeklyTradeMetrics.activeWinRate.toFixed(0)}%
            </div>
          </div>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profit Factor</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: weeklyTradeMetrics.totalTrades === 0 ? '#fff' : (weeklyTradeMetrics.profitFactor >= 1.0 ? '#30d158' : '#ff453a'), marginTop: 4 }}>
              {weeklyTradeMetrics.profitFactor.toFixed(2)}
            </div>
          </div>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expectancy</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: weeklyTradeMetrics.totalTrades === 0 ? '#fff' : (weeklyTradeMetrics.expectancyR >= 0 ? '#30d158' : '#ff453a'), marginTop: 4 }}>
              {weeklyTradeMetrics.expectancyR >= 0 ? '+' : ''}{weeklyTradeMetrics.expectancyR}R
            </div>
          </div>
        </div>

        {/* Discipline Score Progress Ring */}
        <div style={{ 
          background: '#0f0f11', 
          border: '1px solid rgba(255,255,255,0.06)', 
          borderRadius: '14px', 
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Weekly Discipline Score</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.3' }}>
              Averaged journal focus, patience, and risk controls.
            </div>
          </div>

          <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="44" height="44" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#b86eff"
                strokeDasharray={`${disciplineScore}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(184, 110, 255, 0.4))' }}
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
              fontSize: '10px',
              fontWeight: '700',
              color: '#fff',
              fontFamily: 'monospace'
            }}>
              {healthCorrelations.journalCount > 0 ? `${disciplineScore}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Interactive Calendar Ribbon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Ribbon (Mon-Fri)</span>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="hollow-menu-scrollbar">
            {daysData.map(day => {
              const isWinningDay = day.netPnL > 0;
              const isLosingDay = day.netPnL < 0;
              const isFiltered = selectedDayFilter === day.date;
              
              return (
                <div 
                  key={day.date} 
                  onClick={() => handleDayClick(day.date)}
                  style={{ 
                    padding: '10px 12px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    borderRadius: '12px',
                    border: isFiltered 
                      ? '1px solid #ffffff' 
                      : isWinningDay ? '1px solid rgba(48, 209, 88, 0.35)'
                      : isLosingDay ? '1px solid rgba(255, 69, 58, 0.35)'
                      : '1px solid #1c1c1e',
                    background: isFiltered 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : isWinningDay ? 'rgba(48, 209, 88, 0.04)'
                      : isLosingDay ? 'rgba(255, 69, 58, 0.04)'
                      : '#0f0f11',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    minWidth: '95px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: isFiltered ? '#fff' : 'rgba(255,255,255,0.9)' }}>
                      {day.displayLabel}
                    </span>
                    <button
                      onClick={(e) => handleDayModalOpen(day.date, e)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.6)',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: 0,
                        flexShrink: 0
                      }}
                    >
                      +
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      fontFamily: 'monospace',
                      color: isWinningDay ? '#30d158' : isLosingDay ? '#ff453a' : 'rgba(255,255,255,0.4)'
                    }}>
                      {day.tradesCount > 0 ? `${day.totalR >= 0 ? '+' : ''}${day.totalR.toFixed(2)}R` : '-'}
                    </div>
                    <div style={{ 
                      fontSize: '9px', 
                      color: 'rgba(255,255,255,0.4)',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <Activity size={8} color="rgba(255,255,255,0.4)" />
                      {day.tradesCount} trd{day.tradesCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Strip */}
        <div style={{
          display: 'flex',
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: 3,
          marginTop: 20,
          marginBottom: 16,
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }} className="hollow-menu-scrollbar">
          {[
            { id: 'playbook', label: 'Executions', icon: BookOpen },
            { id: 'audit', label: 'Audit', icon: ClipboardCheck },
            { id: 'objectives', label: 'Objectives', icon: Target },
            { id: 'news', label: 'News', icon: Newspaper }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '75px',
                background: activeTab === tab.id ? '#b86eff' : 'transparent',
                border: 'none',
                borderRadius: 11,
                padding: '10px 4px',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Execution History */}
        {activeTab === 'playbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Playbook setups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Traded Playbook setups</span>
              {weeklyPlaybookEdge.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', padding: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)' }}>
                  No setups closed this week.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {weeklyPlaybookEdge.map(p => (
                    <div 
                      key={p.name} 
                      style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        padding: '10px 12px', 
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{p.name}</span>
                        <span style={{ fontSize: '12px', color: p.pnl >= 0 ? '#30d158' : '#ff453a', fontWeight: '700', fontFamily: 'monospace' }}>
                          {p.pnl >= 0 ? '+' : ''}${Math.round(p.pnl).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                          <span>{p.count} trade{p.count > 1 ? 's' : ''}</span>
                          <span>{p.winRate.toFixed(0)}% Win Rate</span>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${p.winRate}%`,
                            background: p.winRate >= 60 ? '#30d158' : p.winRate >= 40 ? '#b86eff' : '#ff453a',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Weekly Trade Ledger {selectedDayFilter && `(${selectedDayFilter})`}
                </span>
                {selectedDayFilter && (
                  <button 
                    onClick={() => setSelectedDayFilter(null)}
                    style={{ background: 'transparent', border: 'none', color: '#b86eff', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTradesList.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                    No trades closed.
                  </div>
                ) : (
                  filteredTradesList.map(t => {
                    const isWin = t.netPnL > 0;
                    return (
                      <div 
                        key={t.id} 
                        style={{
                          background: '#0f0f11',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{t.symbol}</span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              color: t.bias === 'LONG' || (t.bias || '').toUpperCase() === 'BUY' || (t.bias || '').toUpperCase() === 'CALL' ? '#30d158' : '#ff453a',
                              background: t.bias === 'LONG' || (t.bias || '').toUpperCase() === 'BUY' || (t.bias || '').toUpperCase() === 'CALL' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>{t.bias}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                            {t.date} · {t.model || 'No model'}
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: isWin ? '#30d158' : '#ff453a', fontFamily: 'monospace' }}>
                          {isWin ? '+' : ''}${Math.round(t.netPnL).toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Behavioral Audit */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Setup Quality Breakdown */}
            {(() => {
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

              const aPlusOnly = totalTrades > 0 && weeklyTradesList.every(t => {
                const r = t.setupRating || t.rating || '';
                return r === 'A+' || r === 'A';
              });

              const tradesByDay = {};
              weeklyTradesList.forEach(t => {
                if (!t.date) return;
                tradesByDay[t.date] = (tradesByDay[t.date] || 0) + 1;
              });
              const maxTradesInDay = Math.max(0, ...Object.values(tradesByDay));
              const withinTradeLimit = totalTrades > 0 && maxTradesInDay <= 2;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Performance Audit</span>

                  {/* Ratings Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[
                      { label: 'A+', color: '#b86eff', count: ratingCounts['A+'] },
                      { label: 'A', color: '#30d158', count: ratingCounts['A'] },
                      { label: 'B', color: '#ffd60a', count: ratingCounts['B'] },
                      { label: 'F', color: '#ff453a', count: ratingCounts['F'] }
                    ].map(r => (
                      <div key={r.label} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: `${r.color}12`, border: `1px solid ${r.color}30`,
                        padding: '8px 4px', borderRadius: '10px'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: r.color }}>{r.label}</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginTop: '2px', fontFamily: 'monospace' }}>{r.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Auto Checks List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* W/L Week */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>W/L Week</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {isWinWeek ? 'Winning Week' : isLosingWeek ? 'Losing Week' : 'Break Even'}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: isWinWeek ? '#30d158' : isLosingWeek ? '#ff453a' : 'rgba(255,255,255,0.4)' }}>
                        {weeklyTradeMetrics.wins}W / {weeklyTradeMetrics.losses}L
                      </span>
                    </div>

                    {/* A+ setups only check */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>A+ Setups Only</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {totalTrades === 0 ? 'No trades' : aPlusOnly ? 'All trades A/A+' : 'Lower quality trades present'}
                        </div>
                      </div>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '6px',
                        background: aPlusOnly ? '#30d158' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {aPlusOnly && <Check size={11} color="#000" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* <= 2 trades per day check */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>≤2 Trades/Day</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {totalTrades === 0 ? 'No trades' : withinTradeLimit ? `Max ${maxTradesInDay}/day` : `${maxTradesInDay} trades on peak day`}
                        </div>
                      </div>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '6px',
                        background: withinTradeLimit ? '#30d158' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {withinTradeLimit && <Check size={11} color="#000" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* EOW Checklist Audit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EOW Checklist Audit</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'screenshotsReviewed', label: 'Review Charts', desc: 'Reviewed setup charts & screenshots in playbook.' },
                  { key: 'playbookUpdated', label: 'Update Playbook', desc: 'Updated strategy stats, metrics, and trade tags.' },
                  { key: 'sleepCorrelationsChecked', label: 'Audit Sleep Debt', desc: 'Checked sleep quality/drawdown correlations.' },
                  { key: 'mistakesLogged', label: 'Log Mistakes', desc: 'Flagged emotional, revenge, or sizing mistakes.' }
                ].map(item => {
                  const isChecked = !!weeklyForm[item.key];
                  return (
                    <div 
                      key={item.key} 
                      onClick={() => setWeeklyForm(prev => ({ ...prev, [item.key]: !isChecked }))}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '5px', 
                        border: isChecked ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                        background: isChecked ? '#b86eff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        {isChecked && <Check size={10} color="#000" strokeWidth={3} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: isChecked ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.3' }}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Psychological reflex notes */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Psychological Reflex Notes</span>
              <textarea
                value={weeklyForm.reviewNotes}
                onChange={e => setWeeklyForm(prev => ({ ...prev, reviewNotes: e.target.value }))}
                placeholder="Review your psychological trading performance this week..."
                style={{
                  width: '100%',
                  height: '100px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Objectives */}
        {activeTab === 'objectives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Core Objectives</span>
              <textarea
                value={weeklyForm.goals}
                onChange={e => setWeeklyForm(f => ({ ...f, goals: e.target.value }))}
                placeholder="e.g. Sleep > 7h nightly, no averaging down..."
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical Priorities & Tasks</span>
              <textarea
                value={weeklyForm.priorities}
                onChange={e => setWeeklyForm(f => ({ ...f, priorities: e.target.value }))}
                placeholder="e.g. Prop firm validation targets, trailing drawdown limits..."
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Takeaways</span>
              <textarea
                value={weeklyForm.adjustments}
                onChange={e => setWeeklyForm(f => ({ ...f, adjustments: e.target.value }))}
                placeholder="What did you learn this week? What will you carry forward?"
                style={{
                  width: '100%',
                  height: '90px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

        {/* Tab 4: News */}
        {activeTab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Photo upload field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                News Calendar Photo / Screenshot
              </label>

              {weeklyForm.newsPhoto ? (
                <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={weeklyForm.newsPhoto} alt="Weekly News Calendar" style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain', background: '#000' }} />
                  <button
                    onClick={() => setWeeklyForm(prev => ({ ...prev, newsPhoto: null }))}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(255, 69, 58, 0.85)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <label style={{
                  border: '1.5px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '24px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <Camera size={24} color="rgba(255,255,255,0.3)" />
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', display: 'block' }}>
                      Upload Economic News Screenshot
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'block' }}>
                      Tap to upload (PNG, JPG, WebP)
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

            {/* News catalyst notes */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Macro Events & Catalyst Notes</span>
              <textarea
                value={weeklyForm.newsNotes}
                onChange={e => setWeeklyForm(prev => ({ ...prev, newsNotes: e.target.value }))}
                placeholder="e.g. Wednesday 14:00 EST - FOMC Statement & Powell Presser..."
                style={{
                  width: '100%',
                  height: '100px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        )}

      </div>

      {/* DAY REVIEW POPUP MODAL */}
      {dayModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }} onClick={() => setDayModalOpen(false)}>
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Day Review — {dayModalDate}
                </h3>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Log daily setup photos & notes</span>
              </div>
              <button 
                onClick={() => setDayModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Photos Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Trade of the Day Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Trade of the Day Photo
                </label>
                <div style={{
                  border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  minHeight: '120px',
                  background: 'rgba(255,255,255,0.02)',
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
                      <img src={dayModalForm.tradeOfDayPhoto} alt="Trade of the Day" style={{ width: '100%', height: '110px', objectFit: 'contain', borderRadius: '8px' }} />
                      <button
                        onClick={() => setDayModalForm(prev => ({ ...prev, tradeOfDayPhoto: null }))}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff453a', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <label style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', padding: '16px 0' }}>
                      <Camera size={20} color="rgba(255,255,255,0.3)" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Upload Chart Photo</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload('tradeOfDayPhoto', e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>

              {/* Trade Taken Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Trade Taken Photo
                </label>
                <div style={{
                  border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  minHeight: '120px',
                  background: 'rgba(255,255,255,0.02)',
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
                      <img src={dayModalForm.tradeTakenPhoto} alt="Trade Taken" style={{ width: '100%', height: '110px', objectFit: 'contain', borderRadius: '8px' }} />
                      <button
                        onClick={() => setDayModalForm(prev => ({ ...prev, tradeTakenPhoto: null }))}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff453a', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <label style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', padding: '16px 0' }}>
                      <Camera size={20} color="rgba(255,255,255,0.3)" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Upload Execution Photo</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload('tradeTakenPhoto', e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Review Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Daily Review Notes
              </label>
              <textarea
                style={{
                  minHeight: '80px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '10px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none'
                }}
                value={dayModalForm.reviewText}
                onChange={e => setDayModalForm(prev => ({ ...prev, reviewText: e.target.value }))}
                placeholder="What went well today? What mistakes or emotional triggers did you notice?"
              />
            </div>

            {/* Extra Review Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Optional Extra Photo
              </label>
              {dayModalForm.reviewExtraPhoto ? (
                <div style={{ position: 'relative', width: 'fit-content' }}>
                  <img src={dayModalForm.reviewExtraPhoto} alt="Extra Review" style={{ maxHeight: '80px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button
                    onClick={() => setDayModalForm(prev => ({ ...prev, reviewExtraPhoto: null }))}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff453a', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', width: 'fit-content' }}>
                  <Camera size={12} color="rgba(255,255,255,0.4)" /> Add Extra Photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload('reviewExtraPhoto', e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
              <button
                onClick={() => setDayModalOpen(false)}
                style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDayModalSave}
                style={{ flex: 1, background: '#fff', border: 'none', color: '#000', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
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
