import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Save, Moon, Dumbbell, Brain, Salad, Monitor
} from 'lucide-react';

const TABS = ['daily', 'weekly'];

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
    if (isNaN(d.getTime())) return '2024-W25';
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
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
    postMarketNotes: ''
  });

  // Local state for weekly goals list (checklist format)
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newPrepText, setNewPrepText] = useState('');
  const [isEditingPrep, setIsEditingPrep] = useState(false);

  const [weeklyForm, setWeeklyForm] = useState({ priorities: '', reviewNotes: '' });

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
        postMarketNotes: dailyLog.postMarketNotes ?? ''
      });
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
        postMarketNotes: ''
      });
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
    setDailyForm(f => ({
      ...f,
      checkedPrepIds: f.checkedPrepIds.includes(id)
        ? f.checkedPrepIds.filter(x => x !== id)
        : [...f.checkedPrepIds, id]
    }));
  };

  const toggleLifestyle = (id) => {
    setDailyForm(f => ({ ...f, [id]: !f[id] }));
  };

  const saveDailyLog = async () => {
    setSaving(true);
    const data = {
      date: selectedDate,
      status: 'COMPLETED',
      mentalFocus: dailyForm.mentalFocus,
      patienceLevel: dailyForm.patienceLevel,
      riskAdherence: dailyForm.riskAdherence,
      sleepHours: dailyForm.sleepHours,
      sleepQuality: dailyForm.sleepQuality,
      workoutDone: dailyForm.workoutDone,
      dietClean: dailyForm.dietClean,
      meditationDone: dailyForm.meditationDone,
      homeworkDone: dailyForm.homeworkDone,
      preMarketNotes: dailyForm.preMarketNotes,
      postMarketNotes: dailyForm.postMarketNotes,
      checkedPrepIds: dailyForm.checkedPrepIds
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
          ? 'rgba(15, 15, 17, 0.55)'
          : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
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
            onClick={activeTab === 'daily' ? saveDailyLog : saveWeeklyLog}
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
          {activeTab === 'daily' ? (
            <motion.div key="daily" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
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
                            onClick={() => setDailyForm(f => ({ ...f, [field]: s.value }))}
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
                    onChange={e => setDailyForm(f => ({ ...f, sleepHours: parseFloat(e.target.value) }))}
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

              {/* Notes */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Pre-Market Notes</div>
                <textarea
                  value={dailyForm.preMarketNotes}
                  onChange={e => setDailyForm(f => ({ ...f, preMarketNotes: e.target.value }))}
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
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Post-Market Notes</div>
                <textarea
                  value={dailyForm.postMarketNotes}
                  onChange={e => setDailyForm(f => ({ ...f, postMarketNotes: e.target.value }))}
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
              </div>
            </motion.div>
          ) : (
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
        </AnimatePresence>
      </div>
    </div>
  );
}
