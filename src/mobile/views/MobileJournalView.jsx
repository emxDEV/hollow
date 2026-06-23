import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Save, Moon, Dumbbell, Brain, Salad, Monitor,
  Clock, Copy, Plus, Trash2, Edit3, Check, RotateCcw, Sparkles
} from 'lucide-react';

const TABS = ['daily', 'weekly', 'structure'];

const SENTIMENT_LABELS = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '😊' },
  { value: 5, emoji: '🔥' }
];

const DEFAULT_CHECKS = [
  { id: 'newsChecked', label: 'High-Impact News Checked' },
  { id: 'htfAnalysisDone', label: 'HTF Ranges & OBs Plotted' },
  { id: 'liquidityDrawn', label: 'DOL Logged' },
  { id: 'dailyOpenMapped', label: 'Midnight Open Lines Marked' }
];

const LIFESTYLE_ITEMS = [
  { id: 'workoutDone', label: 'Workout', icon: Dumbbell },
  { id: 'dietClean', label: 'Clean Diet', icon: Salad },
  { id: 'meditationDone', label: 'Meditation', icon: Brain },
  { id: 'homeworkDone', label: 'Homework', icon: CheckCircle2 },
];

export default function MobileJournalView({ addToast, onScrollChange }) {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setIsScrolled(scrollTop > 10);
    if (onScrollChange) {
      onScrollChange(scrollTop);
    }
  };

  // Compute week ID from selectedDate
  const selectedWeekId = useMemo(() => {
    const d = new Date(selectedDate);
    const dateToUse = isNaN(d.getTime()) ? new Date() : d;
    dateToUse.setHours(0, 0, 0, 0);
    dateToUse.setDate(dateToUse.getDate() + 4 - (dateToUse.getDay() || 7));
    const yearStart = new Date(dateToUse.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((dateToUse - yearStart) / 86400000) + 1) / 7);
    return `${dateToUse.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }, [selectedDate]);

  const dailyLog = useLiveQuery(() => db.dailyJournals.get(selectedDate), [selectedDate]);
  const weeklyLog = useLiveQuery(() => db.weeklyPlanners.get(selectedWeekId), [selectedWeekId]);

  // Load custom checklist items or fall back to default bionic checks for daily
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
      { id: 'liquidityDrawn', label: 'DOL Logged' },
      { id: 'dailyOpenMapped', label: 'Midnight Open Lines Marked' }
    ];
  });

  const [dailyForm, setDailyForm] = useState({
    checkedPrepIds: [],
    mentalFocus: 3,
    patienceLevel: 3,
    riskAdherence: 3,
    sleepHours: 7,
    sleepQuality: 3,
    workoutDone: false,
    dietClean: false,
    meditationDone: false,
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
      const data = {
        ...formState,
        date: selectedDate,
        status: 'COMPLETED',
        structure: dayStructure
      };
      checklistItems.forEach(c => { data[c.id] = (formState.checkedPrepIds || []).includes(c.id); });
      await db.dailyJournals.put(data);
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
  }, [selectedDate, dayStructure, checklistItems]);

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

  // Local state for weekly goals list (checklist format)
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newPrepText, setNewPrepText] = useState('');
  const [isEditingPrep, setIsEditingPrep] = useState(false);

  const [weeklyForm, setWeeklyForm] = useState({ priorities: '', reviewNotes: '' });

  // Daily Structure State Hooks (Mobile Parity)
  const [dayStructure, setDayStructure] = useState([]);
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

  useEffect(() => {
    setBatchStartDate(selectedDate);
    setBatchEndDate(selectedDate);
  }, [selectedDate]);

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

  // Daily Structure Handlers (Mobile Parity)
  const saveStructure = async (newStructure) => {
    setDayStructure(newStructure);
    try {
      const checkedPrepIds = dailyForm.checkedPrepIds || [];
      const currentLog = await db.dailyJournals.get(selectedDate) || {};
      const data = {
        ...currentLog,
        ...dailyForm,
        date: selectedDate,
        status: currentLog.status || 'COMPLETED',
        structure: newStructure
      };
      checklistItems.forEach(c => { data[c.id] = checkedPrepIds.includes(c.id); });
      await db.dailyJournals.put(data);
      addToast('Schedule saved.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save schedule.', 'error');
    }
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

    setSaving(true);
    try {
      const start = new Date(batchStartDate);
      const end = new Date(batchEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        addToast('Invalid date range selected', 'error');
        setSaving(false);
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
    } catch (err) {
      console.error(err);
      addToast('Failed to batch apply template', 'error');
    }
    setSaving(false);
  };

  // Sync daily form with DB data
  useEffect(() => {
    if (dailyLog) {
      const checked = [];
      checklistItems.forEach(c => { if (dailyLog[c.id]) checked.push(c.id); });
      // Support checkedPrepIds array compatibility
      const loadedCheckedIds = dailyLog.checkedPrepIds || checked;
      setDailyForm({
        checkedPrepIds: loadedCheckedIds,
        mentalFocus: dailyLog.mentalFocus ?? 3,
        patienceLevel: dailyLog.patienceLevel ?? 3,
        riskAdherence: dailyLog.riskAdherence ?? 3,
        sleepHours: dailyLog.sleepHours ?? 7,
        sleepQuality: dailyLog.sleepQuality ?? 3,
        workoutDone: dailyLog.workoutDone ?? false,
        dietClean: dailyLog.dietClean ?? false,
        meditationDone: dailyLog.meditationDone ?? false,
        homeworkDone: dailyLog.homeworkDone ?? false,
        preMarketNotes: dailyLog.preMarketNotes ?? '',
        postMarketNotes: dailyLog.postMarketNotes ?? '',
        preMarketNotesFormat: dailyLog.preMarketNotesFormat ?? 'traditional',
        preMarketNotesList: dailyLog.preMarketNotesList ?? [],
        postMarketNotesFormat: dailyLog.postMarketNotesFormat ?? 'traditional',
        postMarketNotesList: dailyLog.postMarketNotesList ?? [],
        overallBias: dailyLog.overallBias ?? null
      });
      setDayStructure(dailyLog.structure || []);
    } else {
      setDailyForm({
        checkedPrepIds: [],
        mentalFocus: 3,
        patienceLevel: 3,
        riskAdherence: 3,
        sleepHours: 7,
        sleepQuality: 3,
        workoutDone: false,
        dietClean: false,
        meditationDone: false,
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
  }, [dailyLog, selectedDate, checklistItems]);

  useEffect(() => {
    if (weeklyLog) {
      setWeeklyForm({
        priorities: weeklyLog.priorities ?? '',
        reviewNotes: weeklyLog.reviewNotes ?? ''
      });
      // Parse goals array if it is saved as JSON string or array
      try {
        let parsedGoals = [];
        if (Array.isArray(weeklyLog.goals)) {
          parsedGoals = weeklyLog.goals;
        } else if (typeof weeklyLog.goals === 'string') {
          parsedGoals = JSON.parse(weeklyLog.goals);
        }
        setWeeklyGoals(parsedGoals);
      } catch (e) {
        // Fallback if goals is plain text
        if (weeklyLog.goals) {
          setWeeklyGoals([{ id: 'g1', label: weeklyLog.goals, checked: false }]);
        } else {
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

  const shiftDate = (dir) => {
    const d = new Date(selectedDate);
    const amount = activeTab === 'weekly' ? 7 : 1;
    d.setDate(d.getDate() + (dir * amount));
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const toggleCheck = (id) => {
    updateDailyFormFn(f => ({
      ...f,
      checkedPrepIds: f.checkedPrepIds.includes(id)
        ? f.checkedPrepIds.filter(x => x !== id)
        : [...f.checkedPrepIds, id]
    }));
  };

  const toggleLifestyle = (id) => {
    updateDailyFormFn(f => ({ ...f, [id]: !f[id] }));
  };

  // Structured Notes helpers (Mobile)
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
    const bullets = dailyForm[listKey] || [];
    
    const categories = [
      { type: 'bullish', label: 'Bullish', color: '#30d158', bg: 'rgba(48,209,88,0.02)', border: 'rgba(48,209,88,0.08)' },
      { type: 'neutral', label: 'Neutral', color: '#a1a1aa', bg: 'rgba(161,161,170,0.02)', border: 'rgba(161,161,170,0.08)' },
      { type: 'bearish', label: 'Bearish', color: '#ff453a', bg: 'rgba(255,69,58,0.02)', border: 'rgba(255,69,58,0.08)' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {categories.map(cat => {
          const catBullets = bullets.filter(b => b.type === cat.type);
          return (
            <div
              key={cat.type}
              style={{
                background: cat.bg,
                border: `1px solid ${cat.border}`,
                borderRadius: 14,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: cat.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
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
                    padding: 4,
                    borderRadius: 4
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catBullets.length === 0 ? (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', paddingLeft: 12 }}>
                    No {cat.label.toLowerCase()} points.
                  </span>
                ) : (
                  catBullets.map(b => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '6px 10px',
                        minHeight: 38
                      }}
                    >
                      {/* Left dot cycler */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextType = cat.type === 'bullish' ? 'neutral' : cat.type === 'neutral' ? 'bearish' : 'bullish';
                          handleChangeBulletType(isPre, b.id, nextType);
                        }}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: cat.color,
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0
                        }}
                      />
                      
                      {/* Text Input */}
                      <input
                        type="text"
                        value={b.text}
                        onChange={(e) => handleUpdateBullet(isPre, b.id, e.target.value)}
                        placeholder={`Add ${cat.label.toLowerCase()} point...`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: 13,
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
                          padding: 4
                        }}
                      >
                        <Trash2 size={13} />
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

  const saveDailyLog = async () => {
    setSaving(true);
    const data = {
      ...dailyForm,
      date: selectedDate,
      status: 'COMPLETED',
      structure: dayStructure
    };
    checklistItems.forEach(c => { data[c.id] = dailyForm.checkedPrepIds.includes(c.id); });
    try {
      await db.dailyJournals.put(data);
      addToast('Journal entry saved.', 'success');
    } catch (e) {
      addToast('Save failed.', 'error');
    }
    setSaving(false);
  };

  const saveWeeklyLog = async () => {
    setSaving(true);
    try {
      await db.weeklyPlanners.put({
        weekId: selectedWeekId,
        priorities: weeklyForm.priorities,
        reviewNotes: weeklyForm.reviewNotes,
        goals: JSON.stringify(weeklyGoals),
        status: 'ACTIVE'
      });
      addToast('Weekly planner saved.', 'success');
    } catch (e) {
      addToast('Save failed.', 'error');
    }
    setSaving(false);
  };

  const displayDate = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        background: isScrolled
          ? 'linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.98) 40%, rgba(0, 0, 0, 0.85) 70%, rgba(0, 0, 0, 0) 100%)'
          : 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#fff',
            margin: 0,
            opacity: isScrolled ? 0 : 1,
            transform: isScrolled ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: isScrolled ? 'none' : 'auto'
          }}>
            journal.
          </h1>
          <button
            onClick={activeTab === 'weekly' ? saveWeeklyLog : saveDailyLog}
            disabled={saving}
            style={{
              background: '#fff',
              border: 'none',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: saving ? 0.6 : 1,
              transition: 'transform 0.15s'
            }}
          >
            <Save size={13} />
            <span>Save</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: '#1c1c1e',
          borderRadius: 12,
          padding: 3
        }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                background: activeTab === tab ? '#2c2c2e' : 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '8px',
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Date navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => shiftDate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} />
          </button>
          <span 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: '#fff', 
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(255, 255, 255, 0.25)',
              textUnderlineOffset: '3px'
            }}
            title={activeTab === 'weekly' ? "Go to this week" : "Go to today"}
          >
            {activeTab === 'weekly' ? `Week ${selectedWeekId}` : displayDate}
          </span>
          <button onClick={() => shiftDate(1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div 
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          WebkitOverflowScrolling: 'touch', 
          padding: '0 16px', 
          paddingTop: 'calc(var(--safe-top) + 188px)',
          paddingBottom: 'calc(64px + var(--safe-bottom) + 24px)'
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'daily' && (
            <motion.div key="daily" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              {/* Overall Bias Selector Card */}
              <div style={{
                marginBottom: 20,
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
                          WebkitTapHighlightColor: 'transparent',
                          outline: 'none'
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Prep Checklist */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prep Checklist</div>
                  <button 
                    onClick={() => setIsEditingPrep(!isEditingPrep)}
                    style={{ background: 'transparent', border: 'none', color: '#0a84ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isEditingPrep ? 'Done' : 'Edit List'}
                  </button>
                </div>
                
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {checklistItems.length === 0 ? (
                    <div style={{ padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Hurry up, add a checklist point to keep focused!</div>
                  ) : (
                    checklistItems.map((c, i) => {
                      const checked = dailyForm.checkedPrepIds.includes(c.id);
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
                            onClick={() => toggleCheck(c.id)}
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
                            {checked
                              ? <CheckCircle2 size={20} color="#30d158" fill="rgba(48,209,88,0.15)" />
                              : <Circle size={20} color="rgba(255,255,255,0.2)" />
                            }
                            
                            {isEditingPrep ? (
                              <input
                                type="text"
                                value={c.label}
                                onChange={(e) => {
                                  const copy = [...checklistItems];
                                  copy[i].label = e.target.value;
                                  setChecklistItems(copy);
                                  localStorage.setItem('hollowJournalChecks', JSON.stringify(copy));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', width: '100%' }}
                              />
                            ) : (
                              <span style={{ fontSize: 14, fontWeight: 500, color: checked ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                                {c.label}
                              </span>
                            )}
                          </button>

                          {isEditingPrep && (
                            <button
                              onClick={() => {
                                const filtered = checklistItems.filter(x => x.id !== c.id);
                                setChecklistItems(filtered);
                                localStorage.setItem('hollowJournalChecks', JSON.stringify(filtered));
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

                {isEditingPrep && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Add custom checklist task..."
                      value={newPrepText}
                      onChange={(e) => setNewPrepText(e.target.value)}
                      style={{ flex: 1, background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        if (newPrepText.trim()) {
                          const newItem = { id: `chk_${Date.now()}`, label: newPrepText.trim() };
                          const updated = [...checklistItems, newItem];
                          setChecklistItems(updated);
                          localStorage.setItem('hollowJournalChecks', JSON.stringify(updated));
                          setNewPrepText('');
                        }
                      }}
                      style={{ background: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Lifestyle Toggles */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Lifestyle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {LIFESTYLE_ITEMS.map(item => {
                    const active = dailyForm[item.id];
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleLifestyle(item.id)}
                        style={{
                          background: active ? 'rgba(48,209,88,0.1)' : '#0f0f11',
                          border: `1px solid ${active ? 'rgba(48,209,88,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: 14,
                          padding: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Icon size={18} color={active ? '#30d158' : 'rgba(255,255,255,0.3)'} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#30d158' : 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sentiment Scores */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Mental State</div>
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {[
                    { field: 'mentalFocus', label: 'Mental Focus' },
                    { field: 'patienceLevel', label: 'Patience' },
                    { field: 'riskAdherence', label: 'Risk Discipline' },
                  ].map(({ field, label }, i, arr) => (
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
                        {SENTIMENT_LABELS.map(s => (
                          <button
                            key={s.value}
                            onClick={() => updateDailyForm({ [field]: s.value })}
                            style={{
                              flex: 1,
                              height: 32,
                              borderRadius: 8,
                              border: `1px solid ${dailyForm[field] === s.value ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                              background: dailyForm[field] === s.value ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                              fontSize: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'all 0.15s'
                            }}
                          >
                            {s.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sleep */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Sleep</div>
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Moon size={16} color="#bf5af2" />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Sleep Hours: <strong style={{ color: '#fff' }}>{dailyForm.sleepHours}h</strong></span>
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
              </div>

              {/* Pre-Market Notes */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
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
                          outline: 'none',
                          WebkitTapHighlightColor: 'transparent'
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
                    value={dailyForm.preMarketNotes}
                    onChange={e => updateDailyForm({ preMarketNotes: e.target.value }, true)}
                    placeholder="Market analysis, key levels, bias…"
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#0f0f11',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: 14,
                      padding: '14px 16px',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5
                    }}
                  />
                )}
              </div>

              {/* Post-Market Notes */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
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
                          outline: 'none',
                          WebkitTapHighlightColor: 'transparent'
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
                    value={dailyForm.postMarketNotes}
                    onChange={e => updateDailyForm({ postMarketNotes: e.target.value }, true)}
                    placeholder="Review, lessons learned, what worked…"
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#0f0f11',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: 14,
                      padding: '14px 16px',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'weekly' && (
            <motion.div key="weekly" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              <div style={{ height: 4 }} />

              {/* Weekly Goals Checklist Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weekly Goals</div>
                  <button 
                    onClick={() => setIsEditingPrep(!isEditingPrep)}
                    style={{ background: 'transparent', border: 'none', color: '#0a84ff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isEditingPrep ? 'Done' : 'Edit List'}
                  </button>
                </div>
                
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
                  {weeklyGoals.length === 0 ? (
                    <div style={{ padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>No goals defined for this week.</div>
                  ) : (
                    weeklyGoals.map((goal, i) => (
                      <div 
                        key={goal.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '12px 16px',
                          borderBottom: i < weeklyGoals.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                        }}
                      >
                        <button
                          onClick={() => {
                            const updated = weeklyGoals.map(g => g.id === goal.id ? { ...g, checked: !g.checked } : g);
                            setWeeklyGoals(updated);
                          }}
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
                          {goal.checked 
                            ? <CheckCircle2 size={20} color="#30d158" fill="rgba(48,209,88,0.15)" />
                            : <Circle size={20} color="rgba(255,255,255,0.2)" />
                          }
                          
                          {isEditingPrep ? (
                            <input
                              type="text"
                              value={goal.label}
                              onChange={(e) => {
                                const copy = [...weeklyGoals];
                                copy[i].label = e.target.value;
                                setWeeklyGoals(copy);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', width: '100%' }}
                            />
                          ) : (
                            <span style={{ fontSize: 14, fontWeight: 500, color: goal.checked ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                              {goal.label}
                            </span>
                          )}
                        </button>
                        
                        {isEditingPrep && (
                          <button
                            onClick={() => {
                              const filtered = weeklyGoals.filter(g => g.id !== goal.id);
                              setWeeklyGoals(filtered);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#ff453a', fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isEditingPrep && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Add weekly target/objective..."
                      value={newGoalText}
                      onChange={(e) => setNewGoalText(e.target.value)}
                      style={{ flex: 1, background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        if (newGoalText.trim()) {
                           const newGoal = { id: `goal_${Date.now()}`, label: newGoalText.trim(), checked: false };
                           setWeeklyGoals([...weeklyGoals, newGoal]);
                           setNewGoalText('');
                        }
                      }}
                      style={{ background: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>


              {/* priorities and reviewNotes */}
              {[
                { field: 'priorities', label: 'Priorities', placeholder: 'Trading priorities and focus areas…', rows: 3 },
                { field: 'reviewNotes', label: 'End of Week Review', placeholder: 'Reflection on the week, key takeaways…', rows: 5 }
              ].map(({ field, label, placeholder, rows }) => (
                <div key={field} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{label}</div>
                  <textarea
                    value={weeklyForm[field]}
                    onChange={e => setWeeklyForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    rows={rows}
                    style={{
                      width: '100%',
                      background: '#0f0f11',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: 14,
                      padding: '14px 16px',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: 1.5
                    }}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'structure' && (
            <motion.div key="structure" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              
              {/* BIONIC LIVE TRACKER HUD (Only for Today) */}
              {isSelectedDateToday && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 20,
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: activeBlockProgress ? '#30d158' : 'rgba(255,255,255,0.2)',
                        boxShadow: activeBlockProgress ? '0 0 10px #30d158' : 'none'
                      }} />
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.06em' }}>
                        {activeBlockProgress ? 'LIVE SESSION ACTIVE' : 'NO ACTIVE TIME BLOCK'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {activeBlockProgress ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                          {activeBlockProgress.block.label}
                        </h2>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>
                          {activeBlockProgress.block.startTime} - {activeBlockProgress.block.endTime}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ height: 6, width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 3, overflow: 'hidden', position: 'relative', marginBottom: 8 }}>
                        <div style={{
                          height: '100%',
                          width: `${activeBlockProgress.pct}%`,
                          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.9) 100%)',
                          borderRadius: 3,
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                          {activeBlockProgress.remaining} min remaining • {activeBlockProgress.pct}% elapsed
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleBlockCheck(activeBlockProgress.block.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: activeBlockProgress.block.completed ? '#30d158' : 'rgba(255,255,255,0.6)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: activeBlockProgress.block.completed ? '#30d158' : 'rgba(255,255,255,0.03)',
                            border: activeBlockProgress.block.completed ? '1px solid #30d158' : '1px solid rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {activeBlockProgress.block.completed && <Check size={7} color="#000000" strokeWidth={3.5} />}
                          </div>
                          {activeBlockProgress.block.completed ? 'Done' : 'Complete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                        {nextBlock ? `Next scheduled block: "${nextBlock.label}" at ${nextBlock.startTime}.` : 'No more scheduled activities for today.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AGENDA ITEMS LIST */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Daily Agenda</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayStructure.length === 0 ? (
                    <div style={{
                      padding: '30px 16px',
                      textAlign: 'center',
                      background: '#0f0f11',
                      border: '1px dashed rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 13,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <Clock size={20} color="rgba(255,255,255,0.2)" />
                      <div>No time blocks scheduled for today.</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                        Add blocks below or apply a template from the Library.
                      </div>
                    </div>
                  ) : (
                    dayStructure.map(block => {
                      const isEditing = editingBlockId === block.id;
                      const categoryColors = {
                        routine: '#a855f7',
                        prep: '#06b6d4',
                        trading: '#30d158',
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
                            gap: 10,
                            padding: 14,
                            borderRadius: 16,
                            background: '#1c1c1e',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 2 }}>START</label>
                                <input
                                  type="time"
                                  value={editBlockStart}
                                  onChange={(e) => setEditBlockStart(e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: '#0f0f11',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    color: '#fff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 2 }}>END</label>
                                <input
                                  type="time"
                                  value={editBlockEnd}
                                  onChange={(e) => setEditBlockEnd(e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: '#0f0f11',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    color: '#fff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 8 }}>
                              <div>
                                <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 2 }}>CATEGORY</label>
                                <select
                                  value={editBlockCategory}
                                  onChange={(e) => setEditBlockCategory(e.target.value)}
                                  style={{
                                    width: '100%',
                                    background: '#0f0f11',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    padding: '5px 6px',
                                    fontSize: 12,
                                    color: '#fff',
                                    outline: 'none',
                                    height: 29,
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <option value="routine">Routine</option>
                                  <option value="prep">Prep</option>
                                  <option value="trading">Trading</option>
                                  <option value="review">Review</option>
                                  <option value="break">Break</option>
                                  <option value="health">Health</option>
                                  <option value="personal">Personal</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 2 }}>LABEL</label>
                                <input
                                  type="text"
                                  value={editBlockLabel}
                                  onChange={(e) => setEditBlockLabel(e.target.value)}
                                  placeholder="Activity"
                                  style={{
                                    width: '100%',
                                    background: '#0f0f11',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    color: '#fff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                              <button
                                type="button"
                                onClick={() => setEditingBlockId(null)}
                                style={{
                                  padding: '5px 10px',
                                  background: 'transparent',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 8,
                                  color: 'rgba(255,255,255,0.6)',
                                  fontSize: 11,
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
                                  padding: '5px 10px',
                                  background: '#ffffff',
                                  border: 'none',
                                  borderRadius: 8,
                                  color: '#000000',
                                  fontSize: 11,
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
                            padding: '12px 14px',
                            background: '#0f0f11',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderLeft: `4px solid ${color}`,
                            borderRadius: 14,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            {/* Time Badges */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: 68, flexShrink: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                                {block.startTime}
                              </span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                to {block.endTime}
                              </span>
                            </div>

                            {/* Label & Tag */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                              <span style={{
                                fontSize: 13,
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
                                fontSize: 8,
                                color,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em'
                              }}>
                                {block.category}
                              </span>
                            </div>
                          </div>

                          {/* Right Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <button
                                type="button"
                                onClick={() => handleStartEditBlock(block)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'rgba(255,255,255,0.3)',
                                  cursor: 'pointer',
                                  padding: 4,
                                  borderRadius: 6
                                }}
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
                                  padding: 4,
                                  borderRadius: 6
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div
                              onClick={() => handleToggleBlockCheck(block.id)}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: block.completed ? '#30d158' : 'rgba(255, 255, 255, 0.03)',
                                border: block.completed ? '1px solid #30d158' : '1px solid rgba(255, 255, 255, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
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
              </div>

              {/* INLINE ADD BLOCK FORM */}
              <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '16px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Add Time Block</div>
                
                <form onSubmit={handleAddBlock} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 4 }}>START</label>
                      <input
                        type="time"
                        value={newBlockStart}
                        onChange={(e) => setNewBlockStart(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1c1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '8px 10px',
                          fontSize: 13,
                          color: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 4 }}>END</label>
                      <input
                        type="time"
                        value={newBlockEnd}
                        onChange={(e) => setNewBlockEnd(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1c1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '8px 10px',
                          fontSize: 13,
                          color: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 4 }}>CATEGORY</label>
                      <select
                        value={newBlockCategory}
                        onChange={(e) => setNewBlockCategory(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1c1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '7px 8px',
                          fontSize: 13,
                          color: '#fff',
                          outline: 'none',
                          height: 33,
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="routine">Routine</option>
                        <option value="prep">Prep</option>
                        <option value="trading">Trading</option>
                        <option value="review">Review</option>
                        <option value="break">Break</option>
                        <option value="health">Health</option>
                        <option value="personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 4 }}>ACTIVITY</label>
                      <input
                        type="text"
                        value={newBlockLabel}
                        onChange={(e) => setNewBlockLabel(e.target.value)}
                        placeholder="e.g. AM Trading Session"
                        style={{
                          width: '100%',
                          background: '#1c1c1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontSize: 13,
                          color: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontSize: 12,
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      marginTop: 4
                    }}
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>Add Agenda Item</span>
                  </button>
                </form>
              </div>

              {/* TEMPLATES LIBRARY */}
              <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Templates Library</div>
                  <Sparkles size={13} color="rgba(255,255,255,0.3)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#1c1c1e',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        fontSize: 13,
                        color: '#fff',
                        outline: 'none',
                        height: 36
                      }}
                    >
                      <option value="">-- Choose Template --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
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
                          borderRadius: 10,
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ff453a',
                          cursor: 'pointer'
                        }}
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
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontSize: 12,
                      fontWeight: '700',
                      color: selectedTemplateId ? '#ffffff' : 'rgba(255,255,255,0.25)',
                      cursor: selectedTemplateId ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Apply Selected Template</span>
                  </button>
                </div>

                {/* Save Current as Template Form */}
                <form onSubmit={handleSaveAsTemplate} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: 14,
                  marginTop: 14
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.06em' }}>SAVE TODAY AS TEMPLATE</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Template Name e.g. Half-Day"
                      style={{
                        flex: 1,
                        background: '#1c1c1e',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 13,
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
                        borderRadius: 10,
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        opacity: (!newTemplateName.trim() || dayStructure.length === 0) ? 0.35 : 1
                      }}
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>

              {/* BATCH SCHEDULER */}
              <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Batch Scheduler</div>
                  <Copy size={13} color="rgba(255,255,255,0.3)" />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Copy the active template schedule to a range of future days.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 4 }}>START DATE</label>
                      <input
                        type="date"
                        value={batchStartDate}
                        onChange={(e) => setBatchStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1c1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '6px 8px',
                          fontSize: 12,
                          color: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 4 }}>END DATE</label>
                      <input
                        type="date"
                        value={batchEndDate}
                        onChange={(e) => setBatchEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1c1e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '6px 8px',
                          fontSize: 12,
                          color: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontWeight: 800, display: 'block', marginBottom: 6 }}>WEEKDAYS FILTER</label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
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
                              flex: 1,
                              height: 26,
                              borderRadius: 6,
                              border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.08)',
                              background: active ? '#ffffff' : 'transparent',
                              color: active ? '#000000' : 'rgba(255,255,255,0.4)',
                              fontSize: 10,
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedTemplateId}
                    onClick={() => handleBatchApplyTemplate(selectedTemplateId)}
                    style={{
                      background: selectedTemplateId ? '#ffffff' : 'rgba(255,255,255,0.02)',
                      color: selectedTemplateId ? '#000000' : 'rgba(255,255,255,0.25)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontSize: 12,
                      fontWeight: '700',
                      cursor: selectedTemplateId ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Copy size={13} />
                    <span>Batch Apply Schedule</span>
                  </button>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
