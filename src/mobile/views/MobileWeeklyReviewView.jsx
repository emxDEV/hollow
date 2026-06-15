import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { calculateTradePnL } from '../../utils/tradeMath';
import { getISOWeekId, getWeekDates } from '../../utils/dateUtils';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Save, Camera, Target, 
  ClipboardCheck, TrendingUp, AlertCircle, BookOpen, Clock, Activity, Zap, ShieldAlert,
  CheckCircle2, Circle
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

export default function MobileWeeklyReviewView({ trades, executions, selectedAccountId, onSharePnL, addToast, onBack }) {
  // Default to the current week ID
  const [selectedWeekId, setSelectedWeekId] = useState(() => getISOWeekId(new Date()));
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'playbook', 'objectives'
  const [selectedDayFilter, setSelectedDayFilter] = useState(null); // null or date string
  const [saving, setSaving] = useState(false);

  const [milestoneItems, setMilestoneItems] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowWeeklyMilestones');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: 'screenshotsReviewed', label: 'Review Charts', desc: 'Checked execution charts & screenshots' },
      { id: 'playbookUpdated', label: 'Update Playbook', desc: 'Updated strategy edge tags' },
      { id: 'sleepCorrelationsChecked', label: 'Sleep Audit', desc: 'Analyzed rest vs patience metrics' },
      { id: 'mistakesLogged', label: 'Behavioral Audit', desc: 'Checked mistake frequencies' },
    ];
  });
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Fetch weekly planner entry reactively from IndexedDB
  const weeklyLog = useLiveQuery(async () => {
    return await db.weeklyPlanners.get(selectedWeekId);
  }, [selectedWeekId]);

  // Compute start/end dates of selectedWeekId
  const weekDates = useMemo(() => {
    return getWeekDates(selectedWeekId);
  }, [selectedWeekId]);

  // Local state for Weekly Review Form
  const [weeklyForm, setWeeklyForm] = useState({
    goals: '',
    priorities: '',
    reviewNotes: '',
    adjustments: '',
    checkedMilestoneIds: []
  });

  // Sync DB log to local state
  useEffect(() => {
    if (weeklyLog) {
      const checked = [];
      milestoneItems.forEach(c => { if (weeklyLog[c.id]) checked.push(c.id); });
      const loadedCheckedIds = weeklyLog.checkedMilestoneIds || checked;

      setWeeklyForm({
        goals: weeklyLog.goals || '',
        priorities: weeklyLog.priorities || '',
        reviewNotes: weeklyLog.reviewNotes || '',
        adjustments: weeklyLog.adjustments || '',
        checkedMilestoneIds: loadedCheckedIds
      });
    } else {
      setWeeklyForm({
        goals: '',
        priorities: '',
        reviewNotes: '',
        adjustments: '',
        checkedMilestoneIds: []
      });
    }
  }, [weeklyLog, selectedWeekId, milestoneItems]);

  // Scan and fetch week IDs in database for navigator selector
  const weekOptions = useMemo(() => {
    const weeksSet = new Set([getISOWeekId(new Date())]);
    trades.forEach(t => {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          weeksSet.add(getISOWeekId(d));
        }
      }
    });
    return Array.from(weeksSet).sort((a, b) => b.localeCompare(a));
  }, [trades]);

  // Shift selected week ID
  const handleWeekShift = (dir) => {
    const idx = weekOptions.indexOf(selectedWeekId);
    if (idx === -1) return;
    const nextIdx = idx - dir;
    if (nextIdx >= 0 && nextIdx < weekOptions.length) {
      setSelectedWeekId(weekOptions[nextIdx]);
    }
  };

  // Compile trades and metrics for this week
  const weeklyTradeMetrics = useMemo(() => {
    const isAll = selectedAccountId === 'all';
    const weekTrades = trades.filter(t => {
      const accMatch = isAll || t.accountId === selectedAccountId;
      return accMatch && t.date >= weekDates.start && t.date <= weekDates.end;
    });

    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let grossGains = 0;
    let grossLosses = 0;
    let bestReturn = 0;
    const tickers = new Set();

    const tradeList = weekTrades.map(trade => {
      const execs = executions.filter(e => e.tradeId === trade.id);
      const { netPnL } = calculateTradePnL(trade, execs);
      totalPnL += netPnL;
      if (netPnL > bestReturn) bestReturn = netPnL;
      if (netPnL > 0) {
        wins++;
        grossGains += netPnL;
      } else if (netPnL < 0) {
        losses++;
        grossLosses += Math.abs(netPnL);
      }
      if (trade.symbol) tickers.add(trade.symbol);
      return { ...trade, netPnL };
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const pf = grossLosses > 0 ? grossGains / grossLosses : grossGains > 0 ? 9.99 : 0;

    return {
      totalPnL,
      winRate,
      pf,
      totalTrades,
      bestReturn,
      tradeList,
      tickersList: Array.from(tickers).join(', ')
    };
  }, [trades, executions, selectedAccountId, weekDates]);

  // Group trades by day for interactive ribbon
  const daysData = useMemo(() => {
    const days = [];
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const start = new Date(weekDates.start);

    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];

      // Calculate P&L for this day
      const dayTrades = weeklyTradeMetrics.tradeList.filter(t => t.date === dateStr);
      const dayPnL = dayTrades.reduce((s, t) => s + t.netPnL, 0);

      days.push({
        date: dateStr,
        dayName: weekdays[i].slice(0, 3),
        dayNum: current.getDate(),
        netPnL: dayPnL,
        tradesCount: dayTrades.length
      });
    }
    return days;
  }, [weekDates, weeklyTradeMetrics]);

  // Handle day click in horizontal strip
  const handleDayClick = (dateStr) => {
    if (selectedDayFilter === dateStr) {
      setSelectedDayFilter(null);
    } else {
      setSelectedDayFilter(dateStr);
    }
  };

  // Filtered trades list inside week review
  const filteredTrades = useMemo(() => {
    if (!selectedDayFilter) return weeklyTradeMetrics.tradeList;
    return weeklyTradeMetrics.tradeList.filter(t => t.date === selectedDayFilter);
  }, [weeklyTradeMetrics, selectedDayFilter]);

  // Playbook stats
  const playbookStats = useMemo(() => {
    const stats = {};
    weeklyTradeMetrics.tradeList.forEach(t => {
      const m = t.model || 'Unmapped';
      if (!stats[m]) stats[m] = { name: m, trades: 0, wins: 0, pnl: 0 };
      stats[m].trades++;
      if (t.netPnL > 0) stats[m].wins++;
      stats[m].pnl += t.netPnL;
    });
    return Object.values(stats).sort((a, b) => b.pnl - a.pnl);
  }, [weeklyTradeMetrics]);

  // Save weekly review notes/checklist to Dexie
  const handleSaveReview = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        weekId: selectedWeekId,
        goals: weeklyForm.goals,
        priorities: weeklyForm.priorities,
        reviewNotes: weeklyForm.reviewNotes,
        adjustments: weeklyForm.adjustments,
        checkedMilestoneIds: weeklyForm.checkedMilestoneIds,
        status: 'COMPLETED'
      };
      milestoneItems.forEach(c => { dataToSave[c.id] = weeklyForm.checkedMilestoneIds.includes(c.id); });
      
      await db.weeklyPlanners.put(dataToSave);
      addToast('Weekly Review saved.', 'success');
    } catch (err) {
      addToast('Failed to save.', 'error');
    }
    setSaving(false);
  };

  const toggleMilestone = (id) => {
    setWeeklyForm(prev => {
      const isChecked = prev.checkedMilestoneIds.includes(id);
      const newIds = isChecked 
        ? prev.checkedMilestoneIds.filter(x => x !== id)
        : [...prev.checkedMilestoneIds, id];
      return { ...prev, checkedMilestoneIds: newIds };
    });
  };

  const isWin = weeklyTradeMetrics.totalPnL >= 0;
  const accentColor = isWin ? '#30d158' : '#ff453a';
  const quotesList = isWin ? WEEKLY_STOIC_QUOTES.win : WEEKLY_STOIC_QUOTES.loss;
  const quote = quotesList[0];

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{ paddingTop: 'calc(var(--safe-top) + 8px)', paddingLeft: '16px', paddingRight: '16px', paddingBottom: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>weekly review.</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onSharePnL('weekly')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <Camera size={13} />
              <span>Share</span>
              <ChevronDown size={12} color="rgba(255, 255, 255, 0.5)" />
            </button>
            <button
              onClick={handleSaveReview}
              disabled={saving}
              style={{
                background: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                opacity: saving ? 0.6 : 1
              }}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>

        {/* Week Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <button 
            onClick={() => handleWeekShift(-1)} 
            disabled={weekOptions.indexOf(selectedWeekId) === weekOptions.length - 1}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', opacity: weekOptions.indexOf(selectedWeekId) === weekOptions.length - 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedWeekId}</span>
          <button 
            onClick={() => handleWeekShift(1)} 
            disabled={weekOptions.indexOf(selectedWeekId) === 0}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, color: '#fff', opacity: weekOptions.indexOf(selectedWeekId) === 0 ? 0.3 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Tab Strip */}
        <div style={{ display: 'flex', background: '#1c1c1e', borderRadius: 12, padding: 3, marginBottom: 14 }}>
          {[
            { id: 'audit', label: 'Audit', icon: ClipboardCheck },
            { id: 'playbook', label: 'Playbook', icon: BookOpen },
            { id: 'objectives', label: 'Objectives', icon: Target }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: activeTab === tab.id ? '#2c2c2e' : 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '8px 0',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable View Area */}
      <div className="scroll-area" style={{ flex: 1, padding: '0 16px 100px' }}>
        
        {/* Stoic Quote Banner */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 16
        }}>
          <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>STOIC AUDIT</span>
          <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>"{quote.text}"</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>— {quote.author}</span>
        </div>

        {/* Weekly Stats Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Net PnL</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: accentColor, marginTop: 4 }}>
              {weeklyTradeMetrics.totalPnL >= 0 ? '+' : ''}${Math.round(weeklyTradeMetrics.totalPnL).toLocaleString()}
            </div>
          </div>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Win Rate / PF</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 4 }}>
              {weeklyTradeMetrics.winRate.toFixed(0)}% / {weeklyTradeMetrics.pf.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tab 1: Audit */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Milestones</span>
                <button 
                  onClick={() => setIsEditingMilestones(!isEditingMilestones)}
                  style={{ background: 'transparent', border: 'none', color: '#0a84ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {isEditingMilestones ? 'Done' : 'Edit List'}
                </button>
              </div>

              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                {milestoneItems.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Hurry up, add a goal to keep focused!</div>
                ) : (
                  milestoneItems.map((item, idx, arr) => {
                    const isChecked = weeklyForm.checkedMilestoneIds.includes(item.id);
                    return (
                      <div 
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          gap: 12,
                          justifyContent: 'space-between'
                        }}
                      >
                        <button
                          onClick={() => toggleMilestone(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            gap: 12,
                            flex: 1,
                            textAlign: 'left',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          {isChecked
                            ? <CheckCircle2 size={20} color="#30d158" fill="rgba(48,209,88,0.15)" />
                            : <Circle size={20} color="rgba(255,255,255,0.2)" />
                          }

                          {isEditingMilestones ? (
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => {
                                const copy = [...milestoneItems];
                                copy[idx].label = e.target.value;
                                setMilestoneItems(copy);
                                localStorage.setItem('hollowWeeklyMilestones', JSON.stringify(copy));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', width: '100%' }}
                            />
                          ) : (
                            <span style={{ fontSize: 14, fontWeight: 500, color: isChecked ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                              {item.label}
                            </span>
                          )}
                        </button>

                        {isEditingMilestones && (
                          <button
                            onClick={() => {
                              const filtered = milestoneItems.filter(x => x.id !== item.id);
                              setMilestoneItems(filtered);
                              localStorage.setItem('hollowWeeklyMilestones', JSON.stringify(filtered));
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#ff453a', fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {isEditingMilestones && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Add custom milestone..."
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    style={{ flex: 1, background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}
                  />
                  <button
                    onClick={() => {
                      if (newMilestoneText.trim()) {
                        const newItem = { id: `chk_${Date.now()}`, label: newMilestoneText.trim() };
                        const updated = [...milestoneItems, newItem];
                        setMilestoneItems(updated);
                        localStorage.setItem('hollowWeeklyMilestones', JSON.stringify(updated));
                        setNewMilestoneText('');
                      }
                    }}
                    style={{ background: '#0a84ff', color: '#fff', border: 'none', borderRadius: 10, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Calendar Ribbon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Ribbon</span>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {daysData.map(day => {
                  const isWinning = day.netPnL > 0;
                  const isLosing = day.netPnL < 0;
                  const active = selectedDayFilter === day.date;
                  return (
                    <div
                      key={day.date}
                      onClick={() => handleDayClick(day.date)}
                      style={{
                        flex: '0 0 52px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 4px',
                        background: active ? '#fff' : '#0f0f11',
                        border: '1px solid',
                        borderColor: active ? '#fff' : 'rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: 10, color: active ? '#000' : 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{day.dayName}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: active ? '#000' : '#fff' }}>{day.dayNum}</span>
                      <div style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: isWinning ? '#30d158' : isLosing ? '#ff453a' : 'transparent',
                        marginTop: 4
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Week Trades list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Trades {selectedDayFilter ? `(${selectedDayFilter})` : `(${weeklyTradeMetrics.totalTrades})`}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredTrades.length > 0 ? (
                  filteredTrades.map(t => {
                    const isWin = t.netPnL > 0;
                    return (
                      <div 
                        key={t.id} 
                        style={{
                          background: '#0f0f11',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 16,
                          padding: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.symbol}</span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: t.bias === 'LONG' ? '#30d158' : '#ff453a',
                              background: t.bias === 'LONG' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}>{t.bias}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            {t.date} · {t.model || 'No model'}
                          </span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: isWin ? '#30d158' : '#ff453a' }}>
                          {isWin ? '+' : ''}${Math.round(t.netPnL).toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '20px 0', textCenter: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
                    No trades logged.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Playbook */}
        {activeTab === 'playbook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Traded Playbook edge</span>
            {playbookStats.length > 0 ? (
              playbookStats.map(play => {
                const playWinRate = play.trades > 0 ? (play.wins / play.trades) * 100 : 0;
                return (
                  <div 
                    key={play.name}
                    style={{
                      background: '#0f0f11',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 16,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{play.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: play.pnl >= 0 ? '#30d158' : '#ff453a' }}>
                        {play.pnl >= 0 ? '+' : ''}${Math.round(play.pnl).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      <span>{play.trades} trades</span>
                      <span>Win Rate: {playWinRate.toFixed(0)}%</span>
                    </div>
                    {/* Win rate bar */}
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${playWinRate}%`, height: '100%', background: play.pnl >= 0 ? '#30d158' : '#ff453a' }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '40px 0', textCenter: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
                No playbook models traded.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Objectives */}
        {activeTab === 'objectives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Goals</span>
              <textarea
                value={weeklyForm.goals}
                onChange={e => setWeeklyForm(f => ({ ...f, goals: e.target.value }))}
                placeholder="What were the quantitative and behavioral goals?"
                className="ios-input ios-textarea"
              />
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key Priorities</span>
              <textarea
                value={weeklyForm.priorities}
                onChange={e => setWeeklyForm(f => ({ ...f, priorities: e.target.value }))}
                placeholder="List major setups and risk priorities"
                className="ios-input ios-textarea"
              />
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EOW Adjustments</span>
              <textarea
                value={weeklyForm.adjustments}
                onChange={e => setWeeklyForm(f => ({ ...f, adjustments: e.target.value }))}
                placeholder="Behavioral lessons and sizing adjustments"
                className="ios-input ios-textarea"
              />
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Notes</span>
              <textarea
                value={weeklyForm.reviewNotes}
                onChange={e => setWeeklyForm(f => ({ ...f, reviewNotes: e.target.value }))}
                placeholder="General final notes about execution quality"
                className="ios-input ios-textarea"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
