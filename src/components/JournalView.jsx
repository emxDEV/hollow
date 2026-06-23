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
  Circle,
  Salad,
  Calendar,
  AlertCircle,
  Check,
  Plus,
  Minus,
  Activity,
  Heart,
  X,
  Trash2,
  Edit3,
  Clock,
  Copy,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function JournalView() {
  const isMobile = useUIStore(state => state.isMobile);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const journalTab = useUIStore(state => state.journalTab);
  const setJournalTab = useUIStore(state => state.setJournalTab);
  const setActiveTradeId = useUIStore(state => state.setActiveTradeId);
  const addToast = useUIStore(state => state.addToast);

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
    postMarketNotes: '',
    preMarketNotesFormat: 'traditional',
    preMarketNotesList: [],
    postMarketNotesFormat: 'traditional',
    postMarketNotesList: [],
    overallBias: null
  });

  const saveDailyLogDirect = async (formState) => {
    try {
      const checkedPrepIds = formState.checkedPrepIds || [];
      const currentLog = await db.dailyJournals.get(selectedDate) || {};
      await db.dailyJournals.put({
        ...currentLog,
        date: selectedDate,
        status: currentLog.status || 'COMPLETED',
        ...formState,
        newsChecked: checkedPrepIds.includes('newsChecked'),
        htfAnalysisDone: checkedPrepIds.includes('htfAnalysisDone'),
        liquidityDrawn: checkedPrepIds.includes('liquidityDrawn'),
        dailyOpenMapped: checkedPrepIds.includes('dailyOpenMapped')
      });
    } catch (err) {
      console.error("Autosave failed:", err);
    }
  };

  const debouncedSaveDailyLog = useMemo(() => {
    let timer;
    return (formState) => {
      clearTimeout(timer);
      timer = setTimeout(() => saveDailyLogDirect(formState), 500);
    };
  }, [selectedDate]);

  const updateDailyForm = (mods, isTyping = false) => {
    setDailyForm(prev => {
      const next = { ...prev, ...mods };
      if (isTyping) {
        debouncedSaveDailyLog(next);
      } else {
        saveDailyLogDirect(next);
      }
      return next;
    });
  };

  const updateDailyFormFn = (fn, isTyping = false) => {
    setDailyForm(prev => {
      const next = fn(prev);
      if (isTyping) {
        debouncedSaveDailyLog(next);
      } else {
        saveDailyLogDirect(next);
      }
      return next;
    });
  };

  // 4. Local editor state for Weekly Planner
  const [weeklyForm, setWeeklyForm] = useState({
    priorities: '',
    reviewNotes: ''
  });

  // Weekly goals checklist (array of {id, label, checked})
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [isEditingWeeklyGoals, setIsEditingWeeklyGoals] = useState(false);

  const saveWeeklyLogDirect = async (formState, goalsState) => {
    try {
      const d = new Date(selectedDate);
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      const sunday = new Date(d);
      sunday.setDate(d.getDate() - day + 7);

      const currentLog = await db.weeklyPlanners.get(selectedWeekId) || {};
      await db.weeklyPlanners.put({
        ...currentLog,
        weekId: selectedWeekId,
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0],
        status: currentLog.status || 'COMPLETED',
        goals: JSON.stringify(goalsState !== undefined ? goalsState : weeklyGoals),
        ...formState
      });
    } catch (err) {
      console.error("Weekly autosave failed:", err);
    }
  };

  const debouncedSaveWeeklyLog = useMemo(() => {
    let timer;
    return (formState, goalsState) => {
      clearTimeout(timer);
      timer = setTimeout(() => saveWeeklyLogDirect(formState, goalsState), 500);
    };
  }, [selectedWeekId]);

  const updateWeeklyForm = (mods, isTyping = false) => {
    setWeeklyForm(prev => {
      const next = { ...prev, ...mods };
      if (isTyping) {
        debouncedSaveWeeklyLog(next, weeklyGoals);
      } else {
        saveWeeklyLogDirect(next, weeklyGoals);
      }
      return next;
    });
  };

  const updateWeeklyGoals = (newGoals) => {
    setWeeklyGoals(newGoals);
    saveWeeklyLogDirect(weeklyForm, newGoals);
  };

  // 3b. Local state for Daily Structure
  const [dayStructure, setDayStructure] = useState([]);
  
  // Local state for templates (loaded from localStorage)
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('hollowDailyStructureTemplates');
    return saved ? JSON.parse(saved) : [
      {
        id: 't-default-weekday',
        name: 'Standard Trading Day',
        structure: [
          { id: 'b1', startTime: '08:00', endTime: '09:00', label: 'Pre-Market Prep & News Check', category: 'prep', completed: false },
          { id: 'b2', startTime: '09:00', endTime: '11:30', label: 'AM Trading Session', category: 'trading', completed: false },
          { id: 'b3', startTime: '11:30', endTime: '13:00', label: 'Lunch, Gym & Rest', category: 'health', completed: false },
          { id: 'b4', startTime: '13:00', endTime: '14:30', label: 'Post-Market Review & Journaling', category: 'review', completed: false },
          { id: 'b5', startTime: '14:30', endTime: '17:00', label: 'Backtesting & Playbook Studies', category: 'prep', completed: false },
          { id: 'b6', startTime: '22:00', endTime: '22:30', label: 'Evening Routine & Sleep Prep', category: 'routine', completed: false }
        ]
      }
    ];
  });

  const [newBlockStart, setNewBlockStart] = useState('08:00');
  const [newBlockEnd, setNewBlockEnd] = useState('09:00');
  const [newBlockLabel, setNewBlockLabel] = useState('');
  const [newBlockCategory, setNewBlockCategory] = useState('trading');

  // Inline edit state
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editBlockStart, setEditBlockStart] = useState('');
  const [editBlockEnd, setEditBlockEnd] = useState('');
  const [editBlockLabel, setEditBlockLabel] = useState('');
  const [editBlockCategory, setEditBlockCategory] = useState('trading');

  // Template creation & batch apply state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Set default batch range to the current date
  const [batchStartDate, setBatchStartDate] = useState(selectedDate);
  const [batchEndDate, setBatchEndDate] = useState(selectedDate);
  const [batchDays, setBatchDays] = useState({
    1: true, // Mon
    2: true, // Tue
    3: true, // Wed
    4: true, // Thu
    5: true, // Fri
    6: false, // Sat
    0: false  // Sun
  });

  const isSelectedDateToday = useMemo(() => {
    return selectedDate === new Date().toISOString().split('T')[0];
  }, [selectedDate]);

  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (!isSelectedDateToday) return;
    
    const now = new Date();
    setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());

    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [isSelectedDateToday, selectedDate]);

  const activeBlockProgress = useMemo(() => {
    if (!isSelectedDateToday || dayStructure.length === 0) return null;
    
    for (const block of dayStructure) {
      const [sh, sm] = block.startTime.split(':').map(Number);
      const [eh, em] = block.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      
      if (currentTimeMinutes >= startMin && currentTimeMinutes < endMin) {
        const total = endMin - startMin;
        const elapsed = currentTimeMinutes - startMin;
        const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
        return {
          block,
          pct,
          remaining: endMin - currentTimeMinutes
        };
      }
    }
    return null;
  }, [dayStructure, isSelectedDateToday, currentTimeMinutes]);

  const nextBlock = useMemo(() => {
    if (dayStructure.length === 0) return null;
    
    for (const block of dayStructure) {
      const [sh, sm] = block.startTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      if (startMin > currentTimeMinutes) {
        return block;
      }
    }
    return null;
  }, [dayStructure, currentTimeMinutes]);

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

      const activeEl = document.activeElement;
      const isPreMarketNotesFocused = activeEl && activeEl.id === 'preMarketNotes';
      const isPostMarketNotesFocused = activeEl && activeEl.id === 'postMarketNotes';
      const isPreBulletFocused = activeEl && activeEl.id && activeEl.id.startsWith('bullet-pre-');
      const isPostBulletFocused = activeEl && activeEl.id && activeEl.id.startsWith('bullet-post-');

      setDailyForm(prev => {
        const preMarketNotes = isPreMarketNotesFocused ? prev.preMarketNotes : (dailyLog.preMarketNotes ?? '');
        const postMarketNotes = isPostMarketNotesFocused ? prev.postMarketNotes : (dailyLog.postMarketNotes ?? '');
        const preMarketNotesList = isPreBulletFocused ? prev.preMarketNotesList : (dailyLog.preMarketNotesList ?? []);
        const postMarketNotesList = isPostBulletFocused ? prev.postMarketNotesList : (dailyLog.postMarketNotesList ?? []);

        return {
          checkedPrepIds: loadedIds,
          mentalFocus: dailyLog.mentalFocus ?? 3,
          patienceLevel: dailyLog.patienceLevel ?? 3,
          riskAdherence: dailyLog.riskAdherence ?? 3,
          sleepHours: dailyLog.sleepHours ?? 7,
          sleepQuality: dailyLog.sleepQuality ?? 3,
          workoutDone: !!dailyLog.workoutDone,
          dietClean: !!dailyLog.dietClean,
          meditationDone: !!dailyLog.meditationDone,
          homeworkDone: !!dailyLog.homeworkDone,
          screenTimeHours: dailyLog.screenTimeHours ?? 4,
          preMarketNotesFormat: dailyLog.preMarketNotesFormat ?? 'traditional',
          postMarketNotesFormat: dailyLog.postMarketNotesFormat ?? 'traditional',
          overallBias: dailyLog.overallBias ?? null,
          preMarketNotes,
          postMarketNotes,
          preMarketNotesList,
          postMarketNotesList
        };
      });
      setDayStructure(dailyLog.structure || []);
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
        postMarketNotes: '',
        preMarketNotesFormat: 'traditional',
        preMarketNotesList: [],
        postMarketNotesFormat: 'traditional',
        postMarketNotesList: [],
        overallBias: null
      });
      setDayStructure([]);
    }
  }, [dailyLog, selectedDate]);

  useEffect(() => {
    if (weeklyLog) {
      const activeEl = document.activeElement;
      const isPrioritiesFocused = activeEl && activeEl.id === 'weeklyPriorities';
      const isReviewNotesFocused = activeEl && activeEl.id === 'weeklyReviewNotes';
      const isWeeklyGoalInputFocused = activeEl && activeEl.tagName === 'INPUT' && activeEl.value && weeklyGoals.some(g => g.label === activeEl.value);

      setWeeklyForm(prev => {
        const priorities = isPrioritiesFocused ? prev.priorities : (weeklyLog.priorities || '');
        const reviewNotes = isReviewNotesFocused ? prev.reviewNotes : (weeklyLog.reviewNotes || '');
        return { priorities, reviewNotes };
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
        
        if (!isWeeklyGoalInputFocused) {
          setWeeklyGoals(parsed);
        }
      } catch (e) {
        if (!isWeeklyGoalInputFocused) {
          setWeeklyGoals([]);
        }
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
    updateDailyFormFn(prev => ({
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

  const saveStructure = async (newStructure) => {
    setDayStructure(newStructure);
    setSaveStatus('Saving...');
    try {
      const checkedPrepIds = dailyForm.checkedPrepIds || [];
      const currentLog = await db.dailyJournals.get(selectedDate) || {};
      await db.dailyJournals.put({
        ...currentLog,
        date: selectedDate,
        status: currentLog.status || 'COMPLETED',
        ...dailyForm,
        structure: newStructure,
        newsChecked: checkedPrepIds.includes('newsChecked'),
        htfAnalysisDone: checkedPrepIds.includes('htfAnalysisDone'),
        liquidityDrawn: checkedPrepIds.includes('liquidityDrawn'),
        dailyOpenMapped: checkedPrepIds.includes('dailyOpenMapped')
      });
      setSaveStatus('Structure Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Save Failed');
    }
  };

  // Structured Notes helpers (Desktop)
  const handleAddBullet = (isPre, type) => {
    const listKey = isPre ? 'preMarketNotesList' : 'postMarketNotesList';
    const newBullet = {
      id: `bullet-${Date.now()}-${Math.random()}`,
      text: '',
      type // 'bullish' | 'neutral' | 'bearish'
    };
    updateDailyFormFn(prev => ({
      ...prev,
      [listKey]: [...(prev[listKey] || []), newBullet]
    }));
  };

  const handleUpdateBullet = (isPre, id, text) => {
    const listKey = isPre ? 'preMarketNotesList' : 'postMarketNotesList';
    updateDailyFormFn(prev => ({
      ...prev,
      [listKey]: (prev[listKey] || []).map(b => b.id === id ? { ...b, text } : b)
    }), true);
  };

  const handleDeleteBullet = (isPre, id) => {
    const listKey = isPre ? 'preMarketNotesList' : 'postMarketNotesList';
    updateDailyFormFn(prev => ({
      ...prev,
      [listKey]: (prev[listKey] || []).filter(b => b.id !== id)
    }));
  };

  const handleChangeBulletType = (isPre, id, newType) => {
    const listKey = isPre ? 'preMarketNotesList' : 'postMarketNotesList';
    updateDailyFormFn(prev => ({
      ...prev,
      [listKey]: (prev[listKey] || []).map(b => b.id === id ? { ...b, type: newType } : b)
    }));
  };

  const renderStructuredNotes = (isPre) => {
    const listKey = isPre ? 'preMarketNotesList' : 'postMarketNotesList';
    const formatKey = isPre ? 'preMarketNotesFormat' : 'postMarketNotesFormat';
    const bullets = dailyForm[listKey] || [];
    
    const categories = [
      { type: 'bullish', label: 'Bullish', color: '#30d158', bg: 'rgba(48,209,88,0.02)', border: 'rgba(48,209,88,0.08)' },
      { type: 'neutral', label: 'Neutral', color: '#a1a1aa', bg: 'rgba(161,161,170,0.02)', border: 'rgba(161,161,170,0.08)' },
      { type: 'bearish', label: 'Bearish', color: '#ff453a', bg: 'rgba(255,69,58,0.02)', border: 'rgba(255,69,58,0.08)' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
        {categories.map(cat => {
          const catBullets = bullets.filter(b => b.type === cat.type);
          return (
            <div
              key={cat.type}
              style={{
                background: cat.bg,
                border: `1px solid ${cat.border}`,
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: cat.color, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: '600' }}>
                    ({catBullets.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddBullet(isPre, cat.type)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                    borderRadius: '4px',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  <Plus size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {catBullets.length === 0 ? (
                  <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', paddingLeft: '12px' }}>
                    No {cat.label.toLowerCase()} points.
                  </span>
                ) : (
                  catBullets.map(b => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        padding: '4px 8px'
                      }}
                    >
                      {/* Left dot cycler */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextType = cat.type === 'bullish' ? 'neutral' : cat.type === 'neutral' ? 'bearish' : 'bullish';
                          handleChangeBulletType(isPre, b.id, nextType);
                        }}
                        title="Click to cycle type"
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: cat.color,
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0
                        }}
                      />
                      
                      <input
                        type="text"
                        id={isPre ? `bullet-pre-${b.id}` : `bullet-post-${b.id}`}
                        value={b.text}
                        onChange={(e) => handleUpdateBullet(isPre, b.id, e.target.value)}
                        placeholder={`Type a ${cat.label.toLowerCase()} point...`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '12px',
                          outline: 'none',
                          flex: 1,
                          padding: 0,
                          minWidth: 0
                        }}
                      />

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBullet(isPre, b.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255,255,255,0.25)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff453a'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const handleAddBlock = async (e) => {
    if (e) e.preventDefault();
    if (!newBlockLabel.trim()) return;

    const newBlock = {
      id: `block-${Date.now()}`,
      startTime: newBlockStart,
      endTime: newBlockEnd,
      label: newBlockLabel.trim(),
      category: newBlockCategory,
      completed: false
    };

    const updated = [...dayStructure, newBlock].sort((a, b) => a.startTime.localeCompare(b.startTime));
    await saveStructure(updated);
    
    setNewBlockLabel('');
    addToast('Time block added!', 'success');
  };

  const handleStartEditBlock = (block) => {
    setEditingBlockId(block.id);
    setEditBlockStart(block.startTime);
    setEditBlockEnd(block.endTime);
    setEditBlockLabel(block.label);
    setEditBlockCategory(block.category);
  };

  const handleSaveEditBlock = async (id) => {
    if (!editBlockLabel.trim()) return;

    const updated = dayStructure.map(b => {
      if (b.id === id) {
        return {
          ...b,
          startTime: editBlockStart,
          endTime: editBlockEnd,
          label: editBlockLabel.trim(),
          category: editBlockCategory
        };
      }
      return b;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    await saveStructure(updated);
    setEditingBlockId(null);
    addToast('Time block updated!', 'success');
  };

  const handleDeleteBlock = async (id) => {
    const updated = dayStructure.filter(b => b.id !== id);
    await saveStructure(updated);
    addToast('Time block deleted', 'success');
  };

  const handleToggleBlockCheck = async (id) => {
    const updated = dayStructure.map(b => 
      b.id === id ? { ...b, completed: !b.completed } : b
    );
    await saveStructure(updated);
  };

  const handleSaveAsTemplate = (e) => {
    if (e) e.preventDefault();
    if (!newTemplateName.trim()) return;
    if (dayStructure.length === 0) {
      addToast('Cannot save an empty structure as template', 'error');
      return;
    }

    const newTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      structure: dayStructure.map(b => ({ ...b, completed: false }))
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('hollowDailyStructureTemplates', JSON.stringify(updatedTemplates));
    setNewTemplateName('');
    addToast(`Template "${newTemplate.name}" saved!`, 'success');
  };

  const handleDeleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('hollowDailyStructureTemplates', JSON.stringify(updated));
    addToast('Template deleted', 'success');
  };

  const handleApplyTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const appliedStructure = template.structure.map(b => ({ ...b, id: `block-${Math.random()}-${Date.now()}` }));
    await saveStructure(appliedStructure);
    addToast(`Applied "${template.name}" template`, 'success');
  };

  const handleBatchApplyTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      addToast('Please select a template to batch apply', 'error');
      return;
    }

    setSaveStatus('Applying batch...');
    try {
      const start = new Date(batchStartDate);
      const end = new Date(batchEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        addToast('Invalid date range selected', 'error');
        setSaveStatus('Failed');
        return;
      }

      let count = 0;
      const currentDateLoop = new Date(start);
      while (currentDateLoop <= end) {
        const dateStr = currentDateLoop.toISOString().split('T')[0];
        const dayIdx = currentDateLoop.getDay();
        const shouldApply = batchDays[dayIdx];

        if (shouldApply) {
          const existing = await db.dailyJournals.get(dateStr) || {};
          const cleanStructure = template.structure.map(b => ({
            ...b,
            id: `block-${Math.random()}-${Date.now()}`,
            completed: false
          }));

          await db.dailyJournals.put({
            ...existing,
            date: dateStr,
            status: existing.status || 'COMPLETED',
            structure: cleanStructure
          });
          count++;
        }
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }

      addToast(`Successfully applied template to ${count} days!`, 'success');
      setSaveStatus('Batch Complete');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error(err);
      addToast('Failed to batch apply template', 'error');
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
          <button
            type="button"
            onClick={() => setJournalTab('structure')}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: journalTab === 'structure' ? '#ffffff' : 'transparent',
              color: journalTab === 'structure' ? '#000000' : 'rgba(255, 255, 255, 0.45)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: 'none',
              marginLeft: '4px'
            }}
          >
            Daily Structure
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
      {journalTab === 'daily' && (
        /* TAB 1: DAILY CHECK-IN & HABITS HUD */
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? '1fr' 
            : !hideTradeDetails
            ? '4.2fr 3.8fr 4.5fr' 
            : '6fr 6fr',
          gap: '20px',
          alignItems: 'stretch'
        }}>
          
          {/* Column 1: Check-in Metrics HUD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Overall Bias Selector Card */}
            <div style={{
              background: '#0f0f11',
              borderRadius: 16,
              padding: '14px 16px',
              border: dailyForm.overallBias === 'bullish'
                ? '1px solid rgba(48, 209, 88, 0.35)'
                : dailyForm.overallBias === 'bearish'
                ? '1px solid rgba(255, 69, 58, 0.35)'
                : dailyForm.overallBias === 'neutral'
                ? '1px solid rgba(161, 161, 170, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: dailyForm.overallBias === 'bullish'
                ? '0 4px 16px rgba(48, 209, 88, 0.06)'
                : dailyForm.overallBias === 'bearish'
                ? '0 4px 16px rgba(255, 69, 58, 0.06)'
                : dailyForm.overallBias === 'neutral'
                ? '0 4px 16px rgba(161, 161, 170, 0.04)'
                : 'none',
              transition: 'all 0.25s ease'
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Overall Bias</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'bullish', label: 'Bullish', color: '#30d158', bg: 'rgba(48,209,88,0.1)' },
                  { value: 'neutral', label: 'Neutral', color: '#a1a1aa', bg: 'rgba(58,58,60,0.6)' },
                  { value: 'bearish', label: 'Bearish', color: '#ff453a', bg: 'rgba(255,69,58,0.1)' }
                ].map(item => {
                  const isSelected = dailyForm.overallBias === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => updateDailyForm({ overallBias: isSelected ? null : item.value })}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isSelected ? item.bg : 'rgba(255,255,255,0.02)',
                        border: isSelected ? `1px solid ${item.color}` : '1px solid rgba(255,255,255,0.06)',
                        color: isSelected ? item.color : 'rgba(255,255,255,0.35)',
                        outline: 'none'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prep Checklist Card */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prep Checklist</div>
                <button 
                  type="button"
                  onClick={() => setIsEditingChecklist(!isEditingChecklist)}
                  style={{ background: 'transparent', border: 'none', color: '#0a84ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {isEditingChecklist ? 'Done' : 'Edit List'}
                </button>
              </div>
              
              <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {checklistItems.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Hurry up, add a checklist point to keep focused!</div>
                ) : (
                  checklistItems.map((c, i) => {
                    const checked = (dailyForm.checkedPrepIds || []).includes(c.id);
                    return (
                      <div
                        key={c.id}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderBottom: i < checklistItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingChecklist) return;
                            const currentlyChecked = dailyForm.checkedPrepIds || [];
                            const updated = checked 
                              ? currentlyChecked.filter(id => id !== c.id)
                              : [...currentlyChecked, c.id];
                            updateDailyForm({ checkedPrepIds: updated });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'none',
                            border: 'none',
                            cursor: isEditingChecklist ? 'default' : 'pointer',
                            gap: 12,
                            flex: 1,
                            textAlign: 'left',
                            outline: 'none'
                          }}
                        >
                          {checked
                            ? <CheckCircle2 size={20} color="#30d158" fill="rgba(48,209,88,0.15)" />
                            : <Circle size={20} color="rgba(255,255,255,0.2)" />
                          }
                          
                          {isEditingChecklist ? (
                            <input
                              type="text"
                              value={c.label}
                              onChange={(e) => handleUpdateChecklistItem(c.id, e.target.value)}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', width: '100%' }}
                            />
                          ) : (
                            <span style={{ fontSize: 14, fontWeight: 500, color: checked ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                              {c.label}
                            </span>
                          )}
                        </button>

                        {isEditingChecklist && (
                          <button
                            type="button"
                            onClick={() => handleDeleteChecklistItem(c.id)}
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

              {isEditingChecklist && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Add custom checklist task..."
                    value={newCheckLabel}
                    onChange={(e) => setNewCheckLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddChecklistItem();
                      }
                    }}
                    style={{ flex: 1, background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    style={{ background: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Lifestyle Card */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Lifestyle</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { id: 'workoutDone', label: 'Workout', icon: Dumbbell },
                  { id: 'dietClean', label: 'Clean Diet', icon: Salad },
                  { id: 'meditationDone', label: 'Meditation', icon: Brain },
                  { id: 'homeworkDone', label: 'Homework', icon: CheckCircle2 },
                ].map(item => {
                  const active = dailyForm[item.id];
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateDailyForm({ [item.id]: !active })}
                      style={{
                        background: active ? 'rgba(48,209,88,0.1)' : '#0f0f11',
                        border: `1px solid ${active ? 'rgba(48,209,88,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 14,
                        padding: '12px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                        outline: 'none'
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.background = '#0f0f11';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }
                      }}
                    >
                      <Icon size={20} color={active ? '#30d158' : 'rgba(255,255,255,0.3)'} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#30d158' : 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mental State Card */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Mental State</div>
              <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {[
                  { field: 'mentalFocus', label: 'Mental Focus' },
                  { field: 'patienceLevel', label: 'Patience' },
                  { field: 'riskAdherence', label: 'Risk Discipline' },
                ].map(({ field, label }, i, arr) => {
                  const SENTIMENT_LABELS = [
                    { value: 1, emoji: '😞' },
                    { value: 2, emoji: '😕' },
                    { value: 3, emoji: '😐' },
                    { value: 4, emoji: '😊' },
                    { value: 5, emoji: '🔥' }
                  ];
                  return (
                    <div
                      key={field}
                      style={{
                        padding: '14px 16px',
                        borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
                        <span style={{ fontSize: 18 }}>{SENTIMENT_LABELS.find(s => s.value === dailyForm[field])?.emoji || '😐'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {SENTIMENT_LABELS.map(s => {
                          const isSelected = dailyForm[field] === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => updateDailyForm({ [field]: s.value })}
                              style={{
                                flex: 1,
                                height: 32,
                                borderRadius: 8,
                                border: `1px solid ${isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                                cursor: 'pointer',
                                fontSize: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                outline: 'none'
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                }
                              }}
                            >
                              {s.emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sleep Card */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Sleep</div>
              <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Moon size={16} color="#bf5af2" />
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Sleep Hours: <strong style={{ color: '#fff' }}>{dailyForm.sleepHours}h</strong></span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: sleepScoreDetails.color, background: `${sleepScoreDetails.color}15`, border: `1px solid ${sleepScoreDetails.color}35`, padding: '2px 6px', borderRadius: '6px' }}>
                      {sleepScoreDetails.pct}% {sleepScoreDetails.label}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={10}
                    step={0.5}
                    value={dailyForm.sleepHours}
                    onChange={e => updateDailyForm({ sleepHours: parseFloat(e.target.value) })}
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

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Sleep Quality</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { value: 1, label: 'Poor' },
                      { value: 2, label: 'Weak' },
                      { value: 3, label: 'Avg' },
                      { value: 4, label: 'Good' },
                      { value: 5, label: 'Best' }
                    ].map(q => {
                      const isSelected = dailyForm.sleepQuality === q.value;
                      return (
                        <button
                          key={q.value}
                          type="button"
                          onClick={() => updateDailyForm({ sleepQuality: q.value })}
                          style={{
                            flex: 1,
                            height: 28,
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            border: `1px solid ${isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.02)',
                            color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            outline: 'none'
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                            }
                          }}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Cognitive Readiness Card */}
            <div>
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
            </div>

          </div>

          {/* Column 2: Session Journal Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Pre-Market Notes Card */}
            <div style={{
              background: '#0f0f11',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pre-Market Notes</div>
                
                {/* Format Toggle Selector */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { value: 'traditional', label: 'Traditional' },
                    { value: 'list', label: 'List' }
                  ].map(fmt => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => updateDailyForm({ preMarketNotesFormat: fmt.value })}
                      style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: dailyForm.preMarketNotesFormat === fmt.value ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: dailyForm.preMarketNotesFormat === fmt.value ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.15s ease',
                        outline: 'none'
                      }}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {dailyForm.preMarketNotesFormat === 'list' ? (
                renderStructuredNotes(true)
              ) : (
                <textarea
                  id="preMarketNotes"
                  value={dailyForm.preMarketNotes}
                  onChange={e => updateDailyForm({ preMarketNotes: e.target.value }, true)}
                  placeholder="Market analysis, key levels, bias…"
                  rows={6}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    color: '#fff',
                    fontFamily: 'var(--font)',
                    fontSize: 14,
                    padding: '14px 16px',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5
                  }}
                />
              )}
            </div>

            {/* Post-Market Notes Card */}
            <div style={{
              background: '#0f0f11',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Post-Market Notes</div>
                
                {/* Format Toggle Selector */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { value: 'traditional', label: 'Traditional' },
                    { value: 'list', label: 'List' }
                  ].map(fmt => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => updateDailyForm({ postMarketNotesFormat: fmt.value })}
                      style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: dailyForm.postMarketNotesFormat === fmt.value ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: dailyForm.postMarketNotesFormat === fmt.value ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.15s ease',
                        outline: 'none'
                      }}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {dailyForm.postMarketNotesFormat === 'list' ? (
                renderStructuredNotes(false)
              ) : (
                <textarea
                  id="postMarketNotes"
                  value={dailyForm.postMarketNotes}
                  onChange={e => updateDailyForm({ postMarketNotes: e.target.value }, true)}
                  placeholder="Review, lessons learned, what worked…"
                  rows={6}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    color: '#fff',
                    fontFamily: 'var(--font)',
                    fontSize: 14,
                    padding: '14px 16px',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5
                  }}
                />
              )}
            </div>

            {/* Save Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div>
                {saveStatus && (
                  <span style={{
                    fontSize: '11px',
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {saveStatus}
                  </span>
                )}
              </div>
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
      )}

      {journalTab === 'weekly' && (
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
                            updateWeeklyGoals(updated);
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
                                updateWeeklyGoals(copy);
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
                            onClick={() => updateWeeklyGoals(weeklyGoals.filter(g => g.id !== goal.id))}
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
                      updateWeeklyGoals([...weeklyGoals, { id: `goal_${Date.now()}`, label: newGoalText.trim(), checked: false }]);
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
                      updateWeeklyGoals([...weeklyGoals, { id: `goal_${Date.now()}`, label: newGoalText.trim(), checked: false }]);
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
                onChange={(e) => updateWeeklyForm({ priorities: e.target.value }, true)}
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
                onChange={(e) => updateWeeklyForm({ reviewNotes: e.target.value }, true)}
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

      {journalTab === 'structure' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '7.5fr 4.5fr', gap: '20px', alignItems: 'stretch' }}>
          {/* LEFT: Agenda Timeline & Live HUD */}
          <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.3px' }}>
                <Clock size={16} color="var(--colors-primary)" /> Daily Agenda & Schedule
              </h3>
              <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>DAILY STRUCTURE</span>
            </div>

            {/* BIONIC LIVE TRACKER HUD (Only for Today) */}
            {isSelectedDateToday && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: activeBlockProgress ? '#22c55e' : 'rgba(255,255,255,0.2)',
                      boxShadow: activeBlockProgress ? '0 0 10px #22c55e' : 'none',
                      animation: activeBlockProgress ? 'pulse 2s infinite' : 'none'
                    }} />
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>
                      {activeBlockProgress ? 'LIVE SESSION ACTIVE' : 'NO ACTIVE TIME BLOCK'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                    Current Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {activeBlockProgress ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                        {activeBlockProgress.block.label}
                      </h2>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>
                        {activeBlockProgress.block.startTime} - {activeBlockProgress.block.endTime}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                      <div style={{
                        height: '100%',
                        width: `${activeBlockProgress.pct}%`,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.9) 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out'
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                        {activeBlockProgress.remaining} min remaining • {activeBlockProgress.pct}% elapsed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleBlockCheck(activeBlockProgress.block.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: activeBlockProgress.block.completed ? '#22c55e' : 'rgba(255,255,255,0.6)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: activeBlockProgress.block.completed ? '#22c55e' : 'rgba(255,255,255,0.03)',
                          border: activeBlockProgress.block.completed ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {activeBlockProgress.block.completed && <Check size={7} color="#000000" strokeWidth={3.5} />}
                        </div>
                        {activeBlockProgress.block.completed ? 'Completed' : 'Mark Completed'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }}>
                      {nextBlock ? `Next scheduled block: "${nextBlock.label}" at ${nextBlock.startTime}.` : 'No more scheduled activities for the rest of today.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AGENDA ITEMS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px' }}>
              {dayStructure.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock size={24} color="rgba(255,255,255,0.2)" />
                  <div>No agenda blocks configured for this day yet.</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                    Add time blocks below or apply a template from the right panel.
                  </div>
                </div>
              ) : (
                dayStructure.map(block => {
                  const isEditing = editingBlockId === block.id;
                  const categoryColors = {
                    routine: '#a855f7',
                    prep: '#06b6d4',
                    trading: '#22c55e',
                    review: '#6366f1',
                    break: '#6b7280',
                    health: '#ec4899',
                    personal: '#3b82f6'
                  };
                  const color = categoryColors[block.category] || '#ffffff';

                  if (isEditing) {
                    return (
                      <div key={block.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>START</label>
                            <input
                              type="time"
                              value={editBlockStart}
                              onChange={(e) => setEditBlockStart(e.target.value)}
                              style={{
                                width: '100%',
                                background: '#1c1c1e',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                color: '#fff',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>END</label>
                            <input
                              type="time"
                              value={editBlockEnd}
                              onChange={(e) => setEditBlockEnd(e.target.value)}
                              style={{
                                width: '100%',
                                background: '#1c1c1e',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                color: '#fff',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                            <select
                              value={editBlockCategory}
                              onChange={(e) => setEditBlockCategory(e.target.value)}
                              style={{
                                width: '100%',
                                background: '#1c1c1e',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                color: '#fff',
                                outline: 'none',
                                height: '31px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <option value="routine">Routine</option>
                              <option value="prep">Preparation</option>
                              <option value="trading">Trading Session</option>
                              <option value="review">Review / Study</option>
                              <option value="break">Break / Rest</option>
                              <option value="health">Health / Gym</option>
                              <option value="personal">Personal</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>ACTIVITY LABEL</label>
                          <input
                            type="text"
                            value={editBlockLabel}
                            onChange={(e) => setEditBlockLabel(e.target.value)}
                            placeholder="Activity description"
                            style={{
                              width: '100%',
                              background: '#1c1c1e',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '12px',
                              color: '#fff',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingBlockId(null)}
                            style={{
                              padding: '6px 12px',
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditBlock(block.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#000000',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={block.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderLeft: `4px solid ${color}`,
                        borderRadius: '12px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        {/* Time Badges */}
                        <div style={{ display: 'flex', flexDirection: 'column', width: '85px', flexShrink: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                            {block.startTime}
                          </span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                            to {block.endTime}
                          </span>
                        </div>

                        {/* Label and Category badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontSize: '12.5px',
                            fontWeight: '600',
                            color: block.completed ? 'rgba(255,255,255,0.35)' : '#ffffff',
                            textDecoration: block.completed ? 'line-through' : 'none',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }}>
                            {block.label}
                          </span>
                          <span style={{
                            fontSize: '8.5px',
                            color,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px'
                          }}>
                            {block.category}
                          </span>
                        </div>
                      </div>

                      {/* Right Edge Checkbox and Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        {/* Inline Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditBlock(block)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,255,255,0.3)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,255,255,0.3)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255, 69, 58, 0.85)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Circular Check Circle */}
                        <div
                          onClick={() => handleToggleBlockCheck(block.id)}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: block.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                            border: block.completed ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {block.completed && <Check size={8} color="#000000" strokeWidth={3.5} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ADD BLOCK INLINE FORM */}
            <form onSubmit={handleAddBlock} style={{
              marginTop: '10px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>ADD NEW AGENDA ITEM</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.5fr 3.5fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>START</label>
                  <input
                    type="time"
                    value={newBlockStart}
                    onChange={(e) => setNewBlockStart(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '7px 8px',
                      fontSize: '11px',
                      color: '#fff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>END</label>
                  <input
                    type="time"
                    value={newBlockEnd}
                    onChange={(e) => setNewBlockEnd(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '7px 8px',
                      fontSize: '11px',
                      color: '#fff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                  <select
                    value={newBlockCategory}
                    onChange={(e) => setNewBlockCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1c1c1e',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      color: '#fff',
                      outline: 'none',
                      height: '31px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="routine">Routine</option>
                    <option value="prep">Preparation</option>
                    <option value="trading">Trading Session</option>
                    <option value="review">Review / Study</option>
                    <option value="break">Break / Rest</option>
                    <option value="health">Health / Gym</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>ACTIVITY DESCRIPTION</label>
                  <input
                    type="text"
                    value={newBlockLabel}
                    onChange={(e) => setNewBlockLabel(e.target.value)}
                    placeholder="e.g. Pre-Market Preparation"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '11px',
                      color: '#fff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#ffffff',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    height: '31px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={11} strokeWidth={2.5} /> Add Block
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT PANEL: Quick Actions, Templates, and Batch Apply */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CARD 1: TEMPLATE ACTIONS */}
            <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '12px', color: '#fff', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="var(--colors-primary)" /> Template Library
                </h4>
                <span style={{ fontSize: '8px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>TEMPLATES</span>
              </div>

              {/* Load Template form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>LOAD SAVED TEMPLATE</label>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#1c1c1e',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#fff',
                      outline: 'none',
                      height: '36px'
                    }}
                  >
                    <option value="">-- Select Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.structure.length} blocks)</option>
                    ))}
                  </select>

                  {selectedTemplateId && selectedTemplateId !== 't-default-weekday' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteTemplate(selectedTemplateId);
                        setSelectedTemplateId('');
                      }}
                      style={{
                        background: 'rgba(255, 69, 58, 0.1)',
                        border: '1px solid rgba(255, 69, 58, 0.2)',
                        borderRadius: '8px',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'rgba(255, 69, 58, 0.85)',
                        transition: 'all 0.15s'
                      }}
                      title="Delete template"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!selectedTemplateId}
                  onClick={() => handleApplyTemplate(selectedTemplateId)}
                  style={{
                    background: selectedTemplateId ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: selectedTemplateId ? '#ffffff' : 'rgba(255,255,255,0.25)',
                    cursor: selectedTemplateId ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={13} /> Apply Selected Template
                </button>
              </div>

              {/* Save Current as Template form */}
              <form onSubmit={handleSaveAsTemplate} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '16px',
                marginTop: '4px'
              }}>
                <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>SAVE CURRENT DAY AS TEMPLATE</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Busy Trading Day"
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newTemplateName.trim() || dayStructure.length === 0}
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: (!newTemplateName.trim() || dayStructure.length === 0) ? 'default' : 'pointer',
                      opacity: (!newTemplateName.trim() || dayStructure.length === 0) ? 0.35 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: BATCH APPLICATION COPIER */}
            <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '12px', color: '#fff', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Copy size={14} color="var(--colors-primary)" /> Batch Scheduler / Copier
                </h4>
                <span style={{ fontSize: '8px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.5px' }}>SCHEDULER</span>
              </div>

              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: '1.4' }}>
                Schedule the selected template structure to repeat across a range of days, filtering by specific weekdays.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                {/* Date range pickers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>START DATE</label>
                    <input
                      type="date"
                      value={batchStartDate}
                      onChange={(e) => setBatchStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1c1e',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        color: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>END DATE</label>
                    <input
                      type="date"
                      value={batchEndDate}
                      onChange={(e) => setBatchEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1c1e',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        color: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Weekday Selection Buttons */}
                <div>
                  <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>APPLY TO WEEKDAYS</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '3px' }}>
                    {[
                      { idx: 1, label: 'M' },
                      { idx: 2, label: 'T' },
                      { idx: 3, label: 'W' },
                      { idx: 4, label: 'T' },
                      { idx: 5, label: 'F' },
                      { idx: 6, label: 'S' },
                      { idx: 0, label: 'S' }
                    ].map(day => {
                      const active = batchDays[day.idx];
                      return (
                        <button
                          key={day.idx}
                          type="button"
                          onClick={() => setBatchDays(prev => ({ ...prev, [day.idx]: !prev[day.idx] }))}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.08)',
                            background: active ? '#ffffff' : 'transparent',
                            color: active ? '#000000' : 'rgba(255,255,255,0.4)',
                            fontSize: '10px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={`Toggle ${day.label}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  disabled={!selectedTemplateId}
                  onClick={() => handleBatchApplyTemplate(selectedTemplateId)}
                  style={{
                    background: selectedTemplateId ? '#ffffff' : 'rgba(255,255,255,0.02)',
                    color: selectedTemplateId ? '#000000' : 'rgba(255,255,255,0.25)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: selectedTemplateId ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Copy size={13} /> Batch Schedule Template
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
