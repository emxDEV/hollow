import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../store/useUIStore';
import HollowSelect from './HollowSelect';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL, isTradeBE } from '../utils/tradeMath';
import { getISOWeekId } from '../utils/dateUtils';
import { 
  ClipboardList, 
  Smile, 
  Moon, 
  Dumbbell, 
  BookOpen, 
  Brain, 
  TrendingUp, 
  Award,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Check,
  Plus,
  Minus,
  Activity,
  Heart,
  X,
  Trash2,
  Edit3
} from 'lucide-react';

export default function JournalView() {
  const isMobile = useUIStore(state => state.isMobile);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const journalTab = useUIStore(state => state.journalTab);
  const setJournalTab = useUIStore(state => state.setJournalTab);
  const setActiveTradeId = useUIStore(state => state.setActiveTradeId);

  const [saveStatus, setSaveStatus] = useState('');

  const hideTradeDetails = useUIStore(state => state.hideTradeDetails);
  const setHideTradeDetails = useUIStore(state => state.setHideTradeDetails);

  // Reset hide details state when shifting dates
  useEffect(() => {
    setHideTradeDetails(false);
  }, [selectedDate]);

  // Default to June 18, 2024 if it's the current date on first mount and not selected by user
  useEffect(() => {
    const isSelectedByUser = useUIStore.getState().dateSelectedByUser;
    if (!isSelectedByUser && selectedDate === new Date().toISOString().split('T')[0]) {
      setSelectedDate('2024-06-18', false);
    }
  }, []);

  // Load custom checklist items or fall back to default bionic checks
  const [checklistItems, setChecklistItems] = useState(() => {
    const saved = localStorage.getItem('hollowJournalChecks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'newsChecked', label: 'High-Impact News Checked' },
      { id: 'htfAnalysisDone', label: 'HTF Ranges & OBs Plotted' },
      { id: 'liquidityDrawn', label: 'DOL (Draw on Liquidity) Logged' },
      { id: 'dailyOpenMapped', label: 'Midnight Open Price Lines Marked' }
    ];
  });

  const [isEditingChecklist, setIsEditingChecklist] = useState(false);
  const [newCheckLabel, setNewCheckLabel] = useState('');

  // 1. Fetch daily journal entry reactively
  const dailyLog = useLiveQuery(async () => {
    return await db.dailyJournals.get(selectedDate);
  }, [selectedDate]);

  // Fetch trades reactively and filter by selectedDate in memory to avoid index schema requirements
  const dayTrades = useLiveQuery(async () => {
    const allTrades = await db.trades.toArray();
    return allTrades.filter(t => t.date === selectedDate);
  }, [selectedDate]) || [];

  const accounts = useLiveQuery(async () => {
    return await db.accounts.toArray();
  }, []) || [];

  // Fetch ALL executions so we can compute PnL per trade in the journal
  const allExecutions = useLiveQuery(async () => {
    return await db.executions.toArray();
  }, []) || [];

  // Compute Week ID e.g. "2024-W25"
  const selectedWeekId = useMemo(() => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return getISOWeekId(new Date());
    return getISOWeekId(d);
  }, [selectedDate]);

  // 2. Fetch weekly planner entry reactively
  const weeklyLog = useLiveQuery(async () => {
    return await db.weeklyPlanners.get(selectedWeekId);
  }, [selectedWeekId]);

  // 3. Local editor state for Daily Checkin
  const [dailyForm, setDailyForm] = useState({
    checkedPrepIds: [],
    mentalFocus: 3,
    patienceLevel: 3,
    riskAdherence: 3,
    sleepHours: 7.0,
    sleepQuality: 3,
    workoutDone: false,
    dietClean: false,
    meditationDone: false,
    screenTimeHours: 4.0,
    homeworkDone: false,
    preMarketNotes: '',
    postMarketNotes: ''
  });

  // 4. Local editor state for Weekly Planner
  const [weeklyForm, setWeeklyForm] = useState({
    priorities: '',
    reviewNotes: ''
  });

  // Weekly goals checklist (array of {id, label, checked})
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [isEditingWeeklyGoals, setIsEditingWeeklyGoals] = useState(false);

  // Generate week timeline days based on selectedDate
  const weekDays = useMemo(() => {
    const dateObj = new Date(selectedDate);
    if (isNaN(dateObj.getTime())) return [];
    
    // Find the Monday of the current week
    const currentDay = dateObj.getDay() || 7; // 1 = Mon, 7 = Sun
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - currentDay + 1);
    
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        name: dayNames[i],
        dayNum: d.getDate(),
        dateStr: dateStr,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isSelected: dateStr === selectedDate
      });
    }
    return days;
  }, [selectedDate]);

  // Sync DB log to local state when db query updates
  useEffect(() => {
    if (dailyLog) {
      // Reconstruct checkedPrepIds dynamically for backward compatibility if not present
      let loadedIds = dailyLog.checkedPrepIds;
      if (!loadedIds) {
        loadedIds = [];
        if (dailyLog.newsChecked) loadedIds.push('newsChecked');
        if (dailyLog.htfAnalysisDone) loadedIds.push('htfAnalysisDone');
        if (dailyLog.liquidityDrawn) loadedIds.push('liquidityDrawn');
        if (dailyLog.dailyOpenMapped) loadedIds.push('dailyOpenMapped');
      }

      setDailyForm({
        checkedPrepIds: loadedIds,
        mentalFocus: dailyLog.mentalFocus || 3,
        patienceLevel: dailyLog.patienceLevel || 3,
        riskAdherence: dailyLog.riskAdherence || 3,
        sleepHours: dailyLog.sleepHours || 7.0,
        sleepQuality: dailyLog.sleepQuality || 3,
        workoutDone: !!dailyLog.workoutDone,
        dietClean: !!dailyLog.dietClean,
        meditationDone: !!dailyLog.meditationDone,
        screenTimeHours: dailyLog.screenTimeHours || 4.0,
        homeworkDone: !!dailyLog.homeworkDone,
        preMarketNotes: dailyLog.preMarketNotes || '',
        postMarketNotes: dailyLog.postMarketNotes || ''
      });
    } else {
      // Clean slate defaults for new dates
      setDailyForm({
        checkedPrepIds: [],
        mentalFocus: 3,
        patienceLevel: 3,
        riskAdherence: 3,
        sleepHours: 7.0,
        sleepQuality: 3,
        workoutDone: false,
        dietClean: false,
        meditationDone: false,
        screenTimeHours: 4.0,
        homeworkDone: false,
        preMarketNotes: '',
        postMarketNotes: ''
      });
    }
  }, [dailyLog, selectedDate]);

  useEffect(() => {
    if (weeklyLog) {
      setWeeklyForm({
        priorities: weeklyLog.priorities || '',
        reviewNotes: weeklyLog.reviewNotes || ''
      });
      // Parse goals array from JSON string or array
      try {
        let parsed = [];
        if (Array.isArray(weeklyLog.goals)) {
          parsed = weeklyLog.goals;
        } else if (typeof weeklyLog.goals === 'string' && weeklyLog.goals.trim().startsWith('[')) {
          parsed = JSON.parse(weeklyLog.goals);
        } else if (typeof weeklyLog.goals === 'string' && weeklyLog.goals.trim()) {
          // Legacy plain text fallback
          parsed = [{ id: 'g1', label: weeklyLog.goals, checked: false }];
        }
        setWeeklyGoals(parsed);
      } catch (e) {
        setWeeklyGoals([]);
      }
    } else {
      setWeeklyForm({
        priorities: '',
        reviewNotes: ''
      });
      setWeeklyGoals([]);
    }
  }, [weeklyLog, selectedWeekId]);

  // Dynamic calculations for Sleep Score and Cognitive Readiness
  const sleepScoreDetails = useMemo(() => {
    const sleepHrs = dailyForm.sleepHours || 7.0;
    const sleepQual = dailyForm.sleepQuality || 3;
    const pct = Math.min(100, Math.round(((Math.min(sleepHrs, 8.5) / 8.5) * 60) + ((sleepQual / 5) * 40)));
    
    let label = 'Fair';
    let color = 'var(--colors-stone)';
    if (pct >= 85) { label = 'Optimal'; color = 'var(--colors-gain)'; }
    else if (pct >= 70) { label = 'Good'; color = '#ffffff'; }
    else if (pct < 50) { label = 'Poor'; color = 'var(--colors-loss)'; }
    
    return { pct, label, color };
  }, [dailyForm.sleepHours, dailyForm.sleepQuality]);

  const cognitiveReadiness = useMemo(() => {
    // 1. Pre-market Checklist Score (25%)
    const checkedCount = dailyForm.checkedPrepIds ? dailyForm.checkedPrepIds.length : 0;
    const totalChecks = checklistItems.length;
    const checklistScore = totalChecks > 0 ? (checkedCount / totalChecks) * 25 : 25;

    // 2. Emotional Indicators Score (50%)
    const focus = dailyForm.mentalFocus || 3;
    const patience = dailyForm.patienceLevel || 3;
    const discipline = dailyForm.riskAdherence || 3;
    const emotionalScore = ((focus + patience + discipline) / 15) * 50;

    // 3. Sleep Health Score (25%)
    const sleepScoreWeight = (sleepScoreDetails.pct / 100) * 25;

    const totalScore = Math.round(checklistScore + emotionalScore + sleepScoreWeight);

    let advice = 'STABLE TRADING CONDITIONS: General alignment present. Stay cautious on risk sizes.';
    let color = '#ffffff';
    let bg = 'rgba(255, 255, 255, 0.04)';
    let border = 'rgba(255, 255, 255, 0.1)';

    if (totalScore >= 85) {
      advice = 'OPTIMAL READY STATE: High cognitive alignment. Favorable trading execution conditions.';
      color = 'var(--colors-gain)';
      bg = 'var(--colors-gain-dim)';
      border = 'rgba(48, 209, 88, 0.2)';
    } else if (totalScore < 70 && totalScore >= 50) {
      advice = 'ELEVATED COGNITIVE GAP: Low focus or sleep detected. Reduce contract size and trade only A+ setups.';
      color = 'var(--colors-stone)';
      bg = 'rgba(255, 255, 255, 0.02)';
      border = 'rgba(255, 255, 255, 0.06)';
    } else if (totalScore < 50) {
      advice = 'HIGH BRAIN DRAIN ALERT: Extreme risk of tilt/impulse trading. Consider paper trading or step away.';
      color = 'var(--colors-loss)';
      bg = 'var(--colors-loss-dim)';
      border = 'rgba(255, 69, 58, 0.2)';
    }

    return { score: totalScore, advice, color, bg, border };
  }, [dailyForm, sleepScoreDetails, checklistItems]);

  // Helper actions to manage custom checklist items
  const saveChecklistItems = (items) => {
    setChecklistItems(items);
    localStorage.setItem('hollowJournalChecks', JSON.stringify(items));
  };

  const handleAddChecklistItem = () => {
    if (!newCheckLabel.trim()) return;
    const newItem = {
      id: `prep-${Date.now()}`,
      label: newCheckLabel.trim()
    };
    const updated = [...checklistItems, newItem];
    saveChecklistItems(updated);
    setNewCheckLabel('');
  };

  const handleUpdateChecklistItem = (id, newText) => {
    const updated = checklistItems.map(item => 
      item.id === id ? { ...item, label: newText } : item
    );
    saveChecklistItems(updated);
  };

  const handleDeleteChecklistItem = (id) => {
    const updated = checklistItems.filter(item => item.id !== id);
    saveChecklistItems(updated);
    // Also remove from checkedPrepIds list if active
    setDailyForm(prev => ({
      ...prev,
      checkedPrepIds: (prev.checkedPrepIds || []).filter(checkedId => checkedId !== id)
    }));
  };

  // Save changes to DB
  const handleSaveDaily = async () => {
    setSaveStatus('Saving...');
    try {
      const checkedPrepIds = dailyForm.checkedPrepIds || [];
      await db.dailyJournals.put({
        date: selectedDate,
        status: 'COMPLETED',
        ...dailyForm,
        // Populate historical boolean keys for compatibility/backward integration
        newsChecked: checkedPrepIds.includes('newsChecked'),
        htfAnalysisDone: checkedPrepIds.includes('htfAnalysisDone'),
        liquidityDrawn: checkedPrepIds.includes('liquidityDrawn'),
        dailyOpenMapped: checkedPrepIds.includes('dailyOpenMapped')
      });
      setSaveStatus('Daily Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Save Failed');
    }
  };

  const handleSaveWeekly = async () => {
    setSaveStatus('Saving...');
    try {
      // Calculate start and end date of active week
      const d = new Date(selectedDate);
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      const sunday = new Date(d);
      sunday.setDate(d.getDate() - day + 7);

      await db.weeklyPlanners.put({
        weekId: selectedWeekId,
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0],
        status: 'COMPLETED',
        goals: JSON.stringify(weeklyGoals),
        ...weeklyForm
      });
      setSaveStatus('Weekly Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Save Failed');
    }
  };

  const handleDateShift = (direction) => {
    const current = new Date(selectedDate);
    const amount = journalTab === 'weekly' ? 7 : 1;
    current.setDate(current.getDate() + (direction * amount));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Compute calculated weekly rollup average focus scores if weekly logs are loaded
  const weeklyAverages = useLiveQuery(async () => {
    if (!weeklyLog || !weeklyLog.startDate || !weeklyLog.endDate) return null;
    const weekStart = weeklyLog.startDate;
    const weekEnd = weeklyLog.endDate;
    const weekJournals = await db.dailyJournals
      .where('date')
      .between(weekStart, weekEnd, true, true)
      .toArray();

    if (weekJournals.length === 0) return null;
    
    const sumFocus = weekJournals.reduce((acc, curr) => acc + (curr.mentalFocus || 0), 0);
    const sumPatience = weekJournals.reduce((acc, curr) => acc + (curr.patienceLevel || 0), 0);
    const sumRisk = weekJournals.reduce((acc, curr) => acc + (curr.riskAdherence || 0), 0);
    const sumSleep = weekJournals.reduce((acc, curr) => acc + (curr.sleepHours || 0), 0);
    const habitsCount = weekJournals.reduce((acc, curr) => {
      let count = 0;
      if (curr.workoutDone) count++;
      if (curr.dietClean) count++;
      if (curr.meditationDone) count++;
      if (curr.homeworkDone) count++;
      return acc + count;
    }, 0);

    return {
      avgFocus: (sumFocus / weekJournals.length).toFixed(1),
      avgPatience: (sumPatience / weekJournals.length).toFixed(1),
      avgRisk: (sumRisk / weekJournals.length).toFixed(1),
      avgSleep: (sumSleep / weekJournals.length).toFixed(1),
      totalHabits: habitsCount,
      daysLogged: weekJournals.length
    };
  }, [weeklyLog, selectedDate]);

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
    }} className="hollow-menu-scrollbar">
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
      
      {/* Top Header Navigator */}
      {/* Top Header Navigator */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1>
            <ClipboardList size={28} color="var(--colors-primary)" /> Discipline & Habits Journal
          </h1>
          <p>
            Bionic Essentials: Synchronizing cognitive preparation and lifestyle habits with performance tracking.
          </p>
        </div>

        {/* Sliding Segmented Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '4px' }}>
          <button
            type="button"
            onClick={() => setJournalTab('daily')}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: journalTab === 'daily' ? '#ffffff' : 'transparent',
              color: journalTab === 'daily' ? '#000000' : 'rgba(255, 255, 255, 0.45)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'none'
            }}
          >
            Daily Check-In & Habits
          </button>
          <button
            type="button"
            onClick={() => setJournalTab('weekly')}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: journalTab === 'weekly' ? '#ffffff' : 'transparent',
              color: journalTab === 'weekly' ? '#000000' : 'rgba(255, 255, 255, 0.45)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'none'
            }}
          >
            Weekly Planner & Snapshot
          </button>
        </div>
      </div>

      {/* Timeline Day/Week Strip Selector */}
      {isMobile ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--colors-hairline-dark)',
          borderRadius: '16px',
          padding: '12px',
          gap: '12px'
        }}>
          {/* Top row with Date Select and Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
            {/* Date Input Calendar Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '10px', flex: 1, minWidth: 0 }}>
              <Calendar size={13} color="#ffffff" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  width: '100%'
                }}
              />
            </div>

            {/* Action Indicators */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => handleDateShift(-1)}
                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => handleDateShift(1)}
                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}
              >
                <ChevronRight size={16} />
              </button>
              {saveStatus && (
                <span style={{ fontSize: '10px', color: '#ffffff', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '4px 8px', borderRadius: '8px', fontFamily: 'var(--font-mono)' }}>
                  {saveStatus}
                </span>
              )}
            </div>
          </div>

          {/* Day timeline (scrollable) - only for daily tab */}
          {journalTab === 'daily' ? (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              width: '100%', 
              overflowX: 'auto', 
              paddingBottom: '6px',
              scrollbarWidth: 'none'
            }} className="hollow-menu-scrollbar">
              {weekDays.map((day) => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '50px',
                    height: '42px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    border: day.isSelected 
                      ? '1px solid #ffffff' 
                      : day.isToday 
                      ? '1px solid rgba(255, 255, 255, 0.3)' 
                      : '1px solid rgba(255,255,255,0.04)',
                    background: day.isSelected 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : day.isToday 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(255, 255, 255, 0.01)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: day.isSelected ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                    {day.name}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', marginTop: '1px', fontFamily: 'var(--font-mono)' }}>
                    {day.dayNum}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 0',
              fontSize: '13px',
              fontWeight: '700',
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '10px'
            }}>
              Week <span style={{ color: 'var(--colors-stone)', marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>{selectedWeekId}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '10px 16px',
          gap: '12px'
        }}>
          {/* Date Input Calendar Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: '10px' }}>
            <Calendar size={13} color="#ffffff" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* timeline */}
          {journalTab === 'daily' ? (
            <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'center' }}>
              {weekDays.map((day) => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '46px',
                    borderRadius: '12px',
                    border: day.isSelected 
                      ? '1px solid #ffffff' 
                      : day.isToday 
                      ? '1px solid rgba(255, 255, 255, 0.3)' 
                      : '1px solid rgba(255,255,255,0.04)',
                    background: day.isSelected 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : day.isToday 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(255, 255, 255, 0.01)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!day.isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!day.isSelected) {
                      e.currentTarget.style.borderColor = day.isToday ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.background = day.isToday ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)';
                    }
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: day.isSelected ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                    {day.name}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {day.dayNum}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '15px', fontWeight: '700', color: '#fff' }}>
              Week <span style={{ color: 'var(--colors-stone)', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>{selectedWeekId}</span>
            </div>
          )}

          {/* Action Indicators */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleDateShift(-1)}
              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleDateShift(1)}
              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}
            >
              <ChevronRight size={16} />
            </button>
            {saveStatus && (
              <span style={{ fontSize: '11px', color: '#ffffff', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '8px', fontFamily: 'var(--font-mono)' }}>
                {saveStatus}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Area based on Selected Tab */}
      {journalTab === 'daily' ? (
        /* TAB 1: DAILY CHECK-IN & HABITS HUD */
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? '1fr' 
            : !hideTradeDetails
            ? '4fr 3.2fr 4.8fr' 
            : '7.5fr 4.5fr',
          gap: '20px',
          alignItems: 'stretch'
        }}>
          
          {/* LEFT: Pre-Session Prep Card */}
          <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.3px' }}>
                <Brain size={16} color="#ffffff" /> Pre-Session Cognitive Prep
              </h3>
              
              <button
                type="button"
                onClick={() => setIsEditingChecklist(!isEditingChecklist)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: isEditingChecklist ? '#ffffff' : 'var(--colors-stone)',
                  padding: '2px 8px',
                  fontSize: '9px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {isEditingChecklist ? 'Done' : 'Configure Checklist'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '20px' }}>
              {/* Checklist list or custom configurations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isEditingChecklist ? (
                  /* CONFIGURATION WRAPPER */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', marginBottom: '4px', letterSpacing: '0.5px' }}>EDIT PREP ITEMS</span>
                    
                    {/* Item list inside editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', paddingRight: '2px' }} className="hollow-menu-scrollbar">
                      {checklistItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: '#fff',
                              outline: 'none',
                              flex: 1
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            style={{
                              background: 'rgba(255, 107, 107, 0.1)',
                              border: '1px solid rgba(255, 107, 107, 0.2)',
                              borderRadius: '6px',
                              color: '#ff7b7b',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Minus size={10} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new check input row */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Add new task..."
                        value={newCheckLabel}
                        onChange={(e) => setNewCheckLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddChecklistItem();
                          }
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: '#fff',
                          outline: 'none',
                          flex: 1
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddChecklistItem}
                        style={{
                          background: 'rgba(40, 199, 111, 0.1)',
                          border: '1px solid rgba(40, 199, 111, 0.2)',
                          borderRadius: '6px',
                          color: '#28c76f',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* RUNTIME LIST VIEW */
                  checklistItems.map(item => {
                    const isChecked = (dailyForm.checkedPrepIds || []).includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          const currentlyChecked = dailyForm.checkedPrepIds || [];
                          const updated = isChecked 
                            ? currentlyChecked.filter(id => id !== item.id)
                            : [...currentlyChecked, item.id];
                          setDailyForm(prev => ({ ...prev, checkedPrepIds: updated }));
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: isChecked ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                          border: isChecked ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = isChecked ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.background = isChecked ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = isChecked ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.background = isChecked ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)';
                        }}
                      >
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: isChecked ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
                          transition: 'color 0.2s',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginRight: '8px'
                        }}>
                          {item.label}
                        </span>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: isChecked ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                          border: isChecked ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: 'none',
                          flexShrink: 0
                        }}>
                          {isChecked && <Check size={8} color="#000000" strokeWidth={3.5} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Emotional Indicators Step rating pills with emojis */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                background: 'rgba(0, 0, 0, 0.15)', 
                padding: '16px', 
                borderRadius: '16px', 
                border: '1px solid rgba(255, 255, 255, 0.05)' 
              }}>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '800', letterSpacing: '0.8px' }}>EMOTIONAL INDICATORS</span>
                
                {[
                  { key: 'mentalFocus', label: 'Mental Focus / Alertness' },
                  { key: 'patienceLevel', label: 'Patience (A+ Entry Filter)' },
                  { key: 'riskAdherence', label: 'Discipline / Risk Adherence' }
                ].map(slider => {
                  const currentValue = dailyForm[slider.key] || 3;
                  const EMOJIS = ['😞', '😕', '😐', '😊', '🔥'];
                  return (
                    <div key={slider.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '500', color: 'rgba(255, 255, 255, 0.65)' }}>{slider.label}</span>
                        <span style={{ fontSize: '18px' }}>{EMOJIS[currentValue - 1]}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {[1, 2, 3, 4, 5].map(step => {
                          const isSelected = currentValue === step;
                          return (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setDailyForm(prev => ({ ...prev, [slider.key]: step }))}
                              style={{
                                flex: 1,
                                height: '38px',
                                borderRadius: '8px',
                                border: isSelected ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                                background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255, 255, 255, 0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px'
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                }
                              }}
                            >
                              {EMOJIS[step - 1]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bias Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>PRE-MARKET BIAS & GAMEPLAN</label>
              <textarea 
                className="hollow-input"
                style={{ 
                  minHeight: '64px', 
                  resize: 'vertical', 
                  fontSize: '13px',
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                value={dailyForm.preMarketNotes}
                onChange={(e) => setDailyForm(prev => ({ ...prev, preMarketNotes: e.target.value }))}
                placeholder="What is your bias? Draw on liquidity, sweeping sessions lows..."
              />
            </div>
          </div>
          
          {/* RIGHT: Cognitive Readiness Indicator & Habits HUD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Automated Cognitive Readiness Indicator Card */}
            <div style={{
              background: cognitiveReadiness.bg,
              border: `1px solid ${cognitiveReadiness.border}`,
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: `0 4px 20px rgba(0,0,0,0.15), 0 0 15px ${cognitiveReadiness.color}15`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-40%',
                right: '-40%',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: cognitiveReadiness.color,
                filter: 'blur(45px)',
                opacity: 0.15,
                pointerEvents: 'none'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color={cognitiveReadiness.color} />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    Readiness Index
                  </span>
                </div>
                <span style={{
                  fontSize: '22px',
                  fontWeight: '900',
                  color: cognitiveReadiness.color,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {cognitiveReadiness.score}%
                </span>
              </div>

              <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${cognitiveReadiness.score}%`,
                  background: cognitiveReadiness.color,
                  boxShadow: `0 0 6px ${cognitiveReadiness.color}`,
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <p style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: '1.4',
                margin: 0
              }}>
                {cognitiveReadiness.advice}
              </p>
            </div>

            {/* Habits tracker & health HUD */}
            <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '13px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={14} color="#ffffff" /> Discipline HUD & Habits
                </h3>
              </div>

              {/* Habit grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { key: 'workoutDone', label: 'Gym', emoji: '🏋️' },
                  { key: 'dietClean', label: 'Diet', emoji: '🥗' },
                  { key: 'meditationDone', label: 'Zen', emoji: '🧘' },
                  { key: 'homeworkDone', label: 'Charts', emoji: '📊' }
                ].map(habit => {
                  const isActive = dailyForm[habit.key];
                  return (
                    <button
                      key={habit.key}
                      type="button"
                      onClick={() => setDailyForm(prev => ({ ...prev, [habit.key]: !prev[habit.key] }))}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 4px',
                        borderRadius: '10px',
                        border: isActive ? '1px solid rgba(48,209,88,0.35)' : '1px solid rgba(255,255,255,0.05)',
                        background: isActive ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.01)',
                        color: isActive ? '#30d158' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                        }
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{habit.emoji}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700' }}>{habit.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sleep slider (like mobile) */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Moon size={12} color="#bf5af2" />
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>SLEEP HUD</span>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: sleepScoreDetails.color, background: `${sleepScoreDetails.color}15`, border: `1px solid ${sleepScoreDetails.color}35`, padding: '1px 5px', borderRadius: '4px' }}>
                    {sleepScoreDetails.pct}% {sleepScoreDetails.label}
                  </span>
                </div>

                {/* Sleep Hours slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Sleep Hours: <strong style={{ color: '#fff' }}>{dailyForm.sleepHours}h</strong></span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={10}
                    step={0.5}
                    value={dailyForm.sleepHours}
                    onChange={e => setDailyForm(prev => ({ ...prev, sleepHours: parseFloat(e.target.value) }))}
                    style={{
                      WebkitAppearance: 'none',
                      width: '100%',
                      height: 4,
                      borderRadius: 2,
                      background: `linear-gradient(to right, #bf5af2 ${((dailyForm.sleepHours - 4) / 6) * 100}%, rgba(255,255,255,0.1) ${((dailyForm.sleepHours - 4) / 6) * 100}%)`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* Sleep Quality */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>QUALITY TIER</span>
                  <HollowSelect
                    value={dailyForm.sleepQuality}
                    onChange={(val) => setDailyForm(prev => ({ ...prev, sleepQuality: Number(val) }))}
                    options={[1, 2, 3, 4, 5].map(q => ({
                      value: q,
                      label: `${q} - ${q === 5 ? 'Excellent' : q === 1 ? 'Poor' : q === 4 ? 'Good' : q === 3 ? 'Average' : 'Weak'}`
                    }))}
                    style={{ height: '28px', padding: '0 8px', borderRadius: '8px' }}
                    dropdownStyle={{ minWidth: '110px' }}
                  />
                </div>
              </div>

              {/* Notes Review */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>POST-SESSION REVIEW notes</span>
                <textarea 
                  className="hollow-input"
                  style={{ 
                    minHeight: '60px', 
                    resize: 'vertical', 
                    fontSize: '12px',
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '8px 12px'
                  }}
                  value={dailyForm.postMarketNotes}
                  onChange={(e) => setDailyForm(prev => ({ ...prev, postMarketNotes: e.target.value }))}
                  placeholder="Record tilt alerts, discipline warnings, mistakes correlation..."
                />
              </div>

              {/* Save Daily Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px', marginTop: '4px' }}>
                <button 
                  type="button"
                  className="btn-primary" 
                  onClick={handleSaveDaily}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#000000',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '8px 14px',
                    boxShadow: 'none'
                  }}
                >
                  <Save size={12} /> Save Daily Entry
                </button>
              </div>

            </div>

          </div>

          {/* RIGHT COL: Active Trades Details Preview Panel (Matches Mockup Card design) */}
          {!isMobile && !hideTradeDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Day Executions Details</div>
                <button
                  type="button"
                  onClick={() => setHideTradeDetails(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '50%',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }} className="hollow-menu-scrollbar">
                {dayTrades.length === 0 ? (
                  <div style={{
                    background: '#0f0f11',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '24px',
                    padding: '24px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '13px'
                  }}>
                    No trades logged for this day.
                  </div>
                ) : (
                  dayTrades.map(trade => {
                  const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
                  const pnlData = calculateTradePnL(trade, tradeExecs);
                  const realPnL = pnlData.netPnL || 0;
                  const virtualTrade = { ...trade, netPnL: realPnL };
                  const isBE = isTradeBE(virtualTrade);
                  const isGain = !isBE && realPnL > 0;
                  const isLoss = !isBE && realPnL < 0;
                  const accName = accounts.find(a => a.id === trade.accountId)?.name || 'Apex Funded #1 (50K)';
                  
                  // Map pre/post values to labels
                  const getSentimentEmoji = (val) => {
                    const idx = Number(val) - 1;
                    const SENTIMENT_EMOJIS = ['😞', '😟', '😐', '😊', '🔥'];
                    return SENTIMENT_EMOJIS[idx] || '😐';
                  };

                  return (
                    <div 
                      key={trade.id} 
                      style={{ 
                        background: '#0f0f11', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '24px', 
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                      }}
                    >
                      {/* Header with Title and Type */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>{trade.symbol}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '700', 
                            background: trade.bias === 'LONG' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', 
                            color: trade.bias === 'LONG' ? '#30d158' : '#ff453a', 
                            padding: '3px 8px', 
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            {trade.bias}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTradeId(trade.id);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '10px',
                              padding: '6px 12px',
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Green/Red Box */}
                      <div style={{
                        background: isGain 
                          ? 'linear-gradient(135deg, rgba(48, 209, 88, 0.12) 0%, rgba(48, 209, 88, 0.03) 100%)' 
                          : isLoss ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.12) 0%, rgba(255, 69, 58, 0.03) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 159, 10, 0.12) 0%, rgba(255, 159, 10, 0.03) 100%)',
                        border: isGain ? '1px solid rgba(48, 209, 88, 0.2)' : isLoss ? '1px solid rgba(255, 69, 58, 0.2)' : '1px solid rgba(255, 159, 10, 0.2)',
                        borderRadius: '20px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                      }}>
                        <div style={{ 
                          fontSize: '38px', 
                          fontWeight: '800', 
                          color: isGain ? '#30d158' : isLoss ? '#ff453a' : '#ff9f0a',
                          letterSpacing: '-0.02em',
                          lineHeight: 1
                        }}>
                          {!isBE && isGain ? '+' : ''}${Math.abs(realPnL).toFixed(2)}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Account / Group</span>
                            <span style={{ color: '#fff', fontWeight: '500' }}>{accName}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Date</span>
                            <span style={{ color: '#fff', fontWeight: '500' }}>{trade.date}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Ticker</span>
                            <span style={{ color: '#fff', fontWeight: '500' }}>{trade.symbol}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Gross PnL</span>
                            <span style={{ color: isGain ? '#30d158' : isLoss ? '#ff453a' : '#ff9f0a', fontWeight: '600' }}>
                              {!isBE && pnlData.grossPnL > 0 ? '+' : ''}${Math.abs(pnlData.grossPnL || 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Session</span>
                            <span style={{ 
                              color: trade.session === 'Asia' ? '#ff453a' : trade.session === 'London' ? '#0a84ff' : trade.session === 'NY AM' ? '#ff2d55' : trade.session === 'NY PM' ? '#af52de' : '#fff', 
                              fontWeight: '600' 
                            }}>
                              {trade.session || '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Setup Rating</span>
                            <span style={{ color: isGain ? '#30d158' : isLoss ? '#ff453a' : '#ff9f0a', fontWeight: '700' }}>{trade.setupRating || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Model Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>model</div>
                        <div style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 16px', fontSize: '14px', color: '#fff', fontWeight: '500' }}>
                          {trade.model || 'No playbook model specified'}
                        </div>
                      </div>

                      {/* Sentiment Grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>sentiment</div>
                        <div style={{ display: 'flex', gap: '48px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Pre-Trade</div>
                            <div style={{ fontSize: '28px', marginTop: '6px' }}>{getSentimentEmoji(trade.sentimentPre)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Post-Trade</div>
                            <div style={{ fontSize: '28px', marginTop: '6px' }}>{getSentimentEmoji(trade.sentimentPost)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Confluences pills section */}
                      {trade.confluences && trade.confluences.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>confluences</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {trade.confluences.map(c => (
                              <span 
                                key={c} 
                                style={{ 
                                  background: '#0a84ff', 
                                  border: '1px solid #0a84ff',
                                  color: '#ffffff', 
                                  padding: '4px 12px', 
                                  borderRadius: '20px', 
                                  fontSize: '11px', 
                                  fontWeight: '600' 
                                }}
                              >
                                {c.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Delete Trade button */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this trade record?')) {
                            await db.trades.delete(trade.id);
                            await db.executions.where({ tradeId: trade.id }).delete();
                          }
                        }}
                        style={{
                          background: 'rgba(255,69,58,0.04)',
                          border: '1px solid rgba(255,69,58,0.12)',
                          borderRadius: '16px',
                          color: '#ff453a',
                          fontSize: '13px',
                          fontWeight: '700',
                          padding: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(255,69,58,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255,69,58,0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255,69,58,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,69,58,0.12)';
                        }}
                      >
                        <Trash2 size={14} /> Delete Trade Record
                      </button>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* TAB 2: WEEKLY PLANNER & SNAPSHOT */
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '7fr 5fr', gap: '20px', alignItems: 'stretch' }}>
          
          {/* LEFT: Weekly Goals & Objectives */}
          <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.3px' }}>
                <ClipboardList size={16} color="#ffffff" /> Weekly Goals & Objectives
              </h3>
              <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>WEEKLY PLANNER</span>
            </div>

            {/* Weekly Goals Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>WEEKLY CORE OBJECTIVES</label>
                <button
                  type="button"
                  onClick={() => setIsEditingWeeklyGoals(v => !v)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    color: isEditingWeeklyGoals ? '#ffffff' : 'var(--colors-stone)',
                    padding: '2px 8px',
                    fontSize: '9px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  {isEditingWeeklyGoals ? 'Done' : 'Edit List'}
                </button>
              </div>

              {/* Goals list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {weeklyGoals.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                    No goals yet — add your first weekly objective! 🎯
                  </div>
                ) : (
                  weeklyGoals.map((goal, i) => {
                    const isChecked = goal.checked;
                    return (
                      <div
                        key={goal.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: isChecked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          border: isChecked ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxSizing: 'border-box',
                          gap: '10px'
                        }}
                      >
                        {/* Checkbox toggle + label */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = weeklyGoals.map(g => g.id === goal.id ? { ...g, checked: !g.checked } : g);
                            setWeeklyGoals(updated);
                          }}
                          style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', gap: '10px', flex: 1, textAlign: 'left' }}
                        >
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                            background: isChecked ? '#ffffff' : 'rgba(255,255,255,0.03)',
                            border: isChecked ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}>
                            {isChecked && <Check size={8} color="#000000" strokeWidth={3.5} />}
                          </div>
                          {isEditingWeeklyGoals ? (
                            <input
                              type="text"
                              value={goal.label}
                              onChange={(e) => {
                                const copy = weeklyGoals.map(g => g.id === goal.id ? { ...g, label: e.target.value } : g);
                                setWeeklyGoals(copy);
                              }}
                              onClick={e => e.stopPropagation()}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', outline: 'none', width: '100%', fontFamily: 'var(--font)' }}
                            />
                          ) : (
                            <span style={{ fontSize: '12px', fontWeight: '600', color: isChecked ? '#ffffff' : 'rgba(255,255,255,0.55)', transition: 'color 0.2s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {goal.label}
                            </span>
                          )}
                        </button>

                        {isEditingWeeklyGoals && (
                          <button
                            type="button"
                            onClick={() => setWeeklyGoals(weeklyGoals.filter(g => g.id !== goal.id))}
                            style={{
                              background: 'rgba(255,107,107,0.1)',
                              border: '1px solid rgba(255,107,107,0.2)',
                              borderRadius: '6px',
                              color: '#ff7b7b',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <Minus size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add new goal row */}
              <div style={{ display: 'flex', gap: '6px', paddingTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Add new weekly goal..."
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGoalText.trim()) {
                      setWeeklyGoals(prev => [...prev, { id: `goal_${Date.now()}`, label: newGoalText.trim(), checked: false }]);
                      setNewGoalText('');
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#fff',
                    outline: 'none',
                    flex: 1,
                    fontFamily: 'var(--font)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newGoalText.trim()) {
                      setWeeklyGoals(prev => [...prev, { id: `goal_${Date.now()}`, label: newGoalText.trim(), checked: false }]);
                      setNewGoalText('');
                    }
                  }}
                  style={{
                    background: 'rgba(40,199,111,0.1)',
                    border: '1px solid rgba(40,199,111,0.2)',
                    borderRadius: '8px',
                    color: '#28c76f',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Priorities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>CRITICAL PRIORITIES & TASKS</label>
              <textarea 
                className="hollow-input"
                style={{ 
                  minHeight: '70px', 
                  resize: 'vertical', 
                  fontSize: '13px',
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                value={weeklyForm.priorities}
                onChange={(e) => setWeeklyForm(prev => ({ ...prev, priorities: e.target.value }))}
                placeholder="e.g. Validate Apex accounts, restrict trading to silver bullet window."
              />
            </div>

            {/* Weekly Review Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>WEEKLY REFLEX & PSYCH AUDIT</label>
              <textarea 
                className="hollow-input"
                style={{ 
                  minHeight: '120px', 
                  resize: 'vertical', 
                  fontSize: '13px', 
                  flex: 1,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  color: '#fff'
                }}
                value={weeklyForm.reviewNotes}
                onChange={(e) => setWeeklyForm(prev => ({ ...prev, reviewNotes: e.target.value }))}
                placeholder="Reflect on the week: How did emotional prep affect trades? Did drawdowns occur? What changes will you make for next week?"
              />
            </div>

            {/* Save Buttons Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
              <button 
                type="button"
                className="btn-primary" 
                onClick={handleSaveWeekly}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000000',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  boxShadow: 'none'
                }}
              >
                <Save size={14} /> Save Weekly Objectives
              </button>
            </div>
          </div>

          {/* RIGHT: Weekly Snapshot Rollup */}
          <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.3px' }}>
              <Award size={16} color="#ffffff" /> Weekly Snapshot Rollup
            </h3>
            <p style={{ color: 'var(--colors-on-dark-mute)', fontSize: '11px' }}>
              Automated averages calculated from daily journal ratings in week: <strong style={{ color: '#ffffff' }}>{selectedWeekId}</strong>
            </p>

            {weeklyAverages ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Visual Progress Meters */}
                {[
                  { 
                    label: 'AVG RISK ADHERENCE', 
                    value: weeklyAverages.avgRisk, 
                    max: 5,
                    color: Number(weeklyAverages.avgRisk) >= 4 ? 'var(--colors-gain)' : Number(weeklyAverages.avgRisk) <= 2.5 ? 'var(--colors-loss)' : '#ffffff',
                    bg: 'rgba(255, 255, 255, 0.05)',
                    gradient: Number(weeklyAverages.avgRisk) >= 4 ? 'var(--colors-gain)' : Number(weeklyAverages.avgRisk) <= 2.5 ? 'var(--colors-loss)' : '#ffffff'
                  },
                  { 
                    label: 'AVG PATIENCE LEVEL', 
                    value: weeklyAverages.avgPatience, 
                    max: 5,
                    color: Number(weeklyAverages.avgPatience) >= 4 ? 'var(--colors-gain)' : Number(weeklyAverages.avgPatience) <= 2.5 ? 'var(--colors-loss)' : '#ffffff',
                    bg: 'rgba(255, 255, 255, 0.05)',
                    gradient: Number(weeklyAverages.avgPatience) >= 4 ? 'var(--colors-gain)' : Number(weeklyAverages.avgPatience) <= 2.5 ? 'var(--colors-loss)' : '#ffffff'
                  },
                  { 
                    label: 'AVG SLEEP HOURS', 
                    value: weeklyAverages.avgSleep, 
                    max: 10,
                    suffix: 'h',
                    color: '#ffffff',
                    bg: 'rgba(255, 255, 255, 0.05)',
                    gradient: '#ffffff'
                  },
                  { 
                    label: 'HABITS COMPLETENESS', 
                    value: weeklyAverages.totalHabits, 
                    max: weeklyAverages.daysLogged * 4,
                    suffix: ' completed',
                    color: 'var(--colors-gain)',
                    bg: 'rgba(255, 255, 255, 0.05)',
                    gradient: 'var(--colors-gain)'
                  }
                ].map((item, idx) => {
                  const pct = Math.min(100, Math.max(0, (Number(item.value) / item.max) * 100));
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '700', letterSpacing: '0.5px' }}>{item.label}</span>
                        <span style={{ fontSize: '11px', color: item.color, fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                          {item.value}{item.suffix || ` / ${item.max}`}
                        </span>
                      </div>
                      
                      {/* Bar container */}
                      <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: item.gradient,
                          borderRadius: '3px',
                          boxShadow: 'none',
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                    </div>
                  );
                })}
                
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)', marginTop: '4px' }}>
                  Based on {weeklyAverages.daysLogged} days logged this week.
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--colors-stone)', fontSize: '12px' }}>
                No daily logs recorded for this week yet to compute average rollups.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
