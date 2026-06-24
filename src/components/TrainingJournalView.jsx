import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import useUIStore from '../store/useUIStore';
import {
  Plus,
  Trash2,
  Dumbbell,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Check,
  Search,
  Edit3,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Cardio', 'Other'];

const TYPE_DOT_COLOR = {
  Push: '#ff9f43',
  Pull: '#54a0ff',
  Legs: '#a29bfe',
  Cardio: '#00d2d3',
  'Full Body': '#fd79a8',
  Other: 'rgba(255,255,255,0.5)'
};

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const generateUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const todayStr = () => new Date().toISOString().split('T')[0];

export default function TrainingJournalView() {
  const isMobile = useUIStore(state => state.isMobile);
  const loggerRef = useRef(null);

  // ─── Live queries ─────────────────────────────────────────────────────────
  const rawWorkouts = useLiveQuery(() => db.workouts.toArray());
  const workouts = useMemo(() => rawWorkouts || [], [rawWorkouts]);

  const rawWorkoutPlans = useLiveQuery(() => db.workoutPlans ? db.workoutPlans.toArray() : []);
  const workoutPlans = useMemo(() => rawWorkoutPlans || [], [rawWorkoutPlans]);

  // ─── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'plans'

  // ─── Calendar state ───────────────────────────────────────────────────────
  const now = new Date();
  const [calViewYear, setCalViewYear] = useState(now.getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(now.getMonth()); // 0-indexed

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calViewYear, calViewMonth, 1);
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    // Monday-first offset
    const startDow = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calViewYear, calViewMonth]);

  const monthLabel = useMemo(() =>
    new Date(calViewYear, calViewMonth, 1)
      .toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [calViewYear, calViewMonth]
  );

  const prevMonth = () => {
    if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear(y => y - 1); }
    else setCalViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear(y => y + 1); }
    else setCalViewMonth(m => m + 1);
  };

  // Map date string → workouts
  const workoutsByDate = useMemo(() => {
    const map = {};
    workouts.forEach(w => {
      if (!map[w.date]) map[w.date] = [];
      map[w.date].push(w);
    });
    return map;
  }, [workouts]);

  // ─── Logger state (with draft persistence) ────────────────────────────────
  const readDraft = (key, fallback) => {
    try {
      const d = localStorage.getItem('hollow_workout_draft');
      if (d) { const p = JSON.parse(d); if (p[key] !== undefined) return p[key]; }
    } catch { /* ignore */ }
    return fallback;
  };

  const [workoutDate, setWorkoutDate] = useState(() => readDraft('workoutDate', todayStr()));
  const [workoutType, setWorkoutType] = useState(() => readDraft('workoutType', 'Push'));
  const [workoutDuration, setWorkoutDuration] = useState(() => readDraft('workoutDuration', 60));
  const [workoutFocus, setWorkoutFocus] = useState(() => readDraft('workoutFocus', 3));
  const [workoutNotes, setWorkoutNotes] = useState(() => readDraft('workoutNotes', ''));
  const [exercisesList, setExercisesList] = useState(() =>
    readDraft('exercisesList', [{ id: 1, name: '', muscleGroup: 'Chest', sets: [{ id: 101, weight: '', reps: '' }] }])
  );
  const [saveStatus, setSaveStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  // Persist draft to localStorage on any change
  useEffect(() => {
    localStorage.setItem('hollow_workout_draft', JSON.stringify({
      workoutDate, workoutType, workoutDuration, workoutFocus, workoutNotes, exercisesList
    }));
  }, [workoutDate, workoutType, workoutDuration, workoutFocus, workoutNotes, exercisesList]);

  // ─── Plan state ───────────────────────────────────────────────────────────
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planExercises, setPlanExercises] = useState([
    { id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }
  ]);

  // ─── Stats & computed ─────────────────────────────────────────────────────
  const workoutStats = useMemo(() => {
    let totalWorkouts = workouts.length;
    let totalSets = 0;
    let totalVolume = 0;
    let totalFocus = 0;
    let focusCount = 0;

    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
          totalSets++;
          totalVolume += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
        });
      });
      if (w.focusRating && w.focusRating > 0) { totalFocus += w.focusRating; focusCount++; }
    });

    return {
      totalWorkouts,
      totalSets,
      totalVolume,
      avgFocus: focusCount > 0 ? parseFloat((totalFocus / focusCount).toFixed(1)) : 0
    };
  }, [workouts]);

  const streak = useMemo(() => {
    if (!workouts.length) return 0;
    const dates = new Set(workouts.map(w => w.date));
    let count = 0;
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    const fmt = d => d.toISOString().split('T')[0];
    // If today has no workout, start from yesterday
    if (!dates.has(fmt(cur))) cur.setDate(cur.getDate() - 1);
    while (dates.has(fmt(cur))) {
      count++;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  }, [workouts]);

  const trendData = useMemo(() => {
    return [...workouts]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-12)
      .map(w => {
        let volume = 0;
        (w.exercises || []).forEach(ex =>
          (ex.sets || []).forEach(s => { volume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0); })
        );
        return {
          date: w.date.split('-').slice(1).join('/'),
          volume,
          focus: w.focusRating || 3,
          type: w.type
        };
      });
  }, [workouts]);

  // ─── Calendar handler ─────────────────────────────────────────────────────
  const handleCalendarDayClick = (day) => {
    if (!day) return;
    const ds = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setWorkoutDate(ds);
    if (loggerRef.current) {
      loggerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ─── Last-session lookup ──────────────────────────────────────────────────
  const getLastSessionSets = (exerciseName) => {
    if (!exerciseName?.trim()) return null;
    const n = exerciseName.trim().toLowerCase();
    const sorted = [...workouts]
      .filter(w => w.date < workoutDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const w of sorted) {
      const m = (w.exercises || []).find(ex => ex.name.trim().toLowerCase() === n);
      if (m?.sets?.length) return m.sets;
    }
    return null;
  };

  // ─── Logger handlers ──────────────────────────────────────────────────────
  const handleAddExercise = () =>
    setExercisesList(prev => [...prev, {
      id: generateUniqueId('ex'),
      name: '',
      muscleGroup: 'Chest',
      sets: [{ id: generateUniqueId('set'), weight: '', reps: '' }]
    }]);

  const handleRemoveExercise = (exId) =>
    setExercisesList(prev => prev.filter(ex => ex.id !== exId));

  const handleExerciseNameChange = (exId, name) =>
    setExercisesList(prev => prev.map(ex => ex.id === exId ? { ...ex, name } : ex));

  const handleExerciseMuscleGroupChange = (exId, muscleGroup) =>
    setExercisesList(prev => prev.map(ex => ex.id === exId ? { ...ex, muscleGroup } : ex));

  const handleAddSet = (exId) =>
    setExercisesList(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, sets: [...ex.sets, { id: generateUniqueId('set'), weight: '', reps: '' }] } : ex
    ));

  const handleRemoveSet = (exId, setId) =>
    setExercisesList(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) } : ex
    ));

  const handleSetChange = (exId, setId, field, val) =>
    setExercisesList(prev => prev.map(ex =>
      ex.id === exId
        ? { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s) }
        : ex
    ));

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    const validExercises = exercisesList
      .filter(ex => ex.name.trim() !== '')
      .map(ex => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup || 'Other',
        sets: ex.sets.map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0 }))
      }));

    if (!validExercises.length) {
      setSaveStatus('add at least one exercise.');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setSaveStatus('saving...');
    try {
      await db.workouts.add({
        id: generateUniqueId('wo'),
        date: workoutDate,
        type: workoutType,
        duration: parseInt(workoutDuration) || 0,
        notes: workoutNotes,
        exercises: validExercises,
        focusRating: parseInt(workoutFocus) || 3
      });
      setSaveStatus('logged!');
      localStorage.removeItem('hollow_workout_draft');
      setWorkoutNotes('');
      setWorkoutFocus(3);
      setExercisesList([{ id: 1, name: '', muscleGroup: 'Chest', sets: [{ id: 101, weight: '', reps: '' }] }]);
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      console.error(err);
      setSaveStatus('save failed.');
    }
  };

  const handleDeleteWorkout = async (id) => {
    if (confirm('Delete this workout entry?')) {
      try { await db.workouts.delete(id); } catch (err) { console.error(err); }
    }
  };

  const toggleExpand = (id) =>
    setExpandedWorkouts(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Plan handlers ────────────────────────────────────────────────────────
  const handleAddPlanExercise = () =>
    setPlanExercises(prev => [...prev, { id: generateUniqueId('ex'), name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);

  const handleRemovePlanExercise = (id) =>
    setPlanExercises(prev => prev.filter(ex => ex.id !== id));

  const handlePlanExChange = (id, field, value) =>
    setPlanExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));

  const handleSavePlan = async () => {
    if (!planName.trim()) { alert('Plan name is required.'); return; }
    const valid = planExercises.filter(ex => ex.name.trim());
    if (!valid.length) { alert('Add at least one exercise.'); return; }

    const planData = {
      name: planName.trim(),
      exercises: valid.map(ex => ({
        name: ex.name.trim(),
        muscleGroup: ex.muscleGroup || 'Other',
        targetSets: parseInt(ex.targetSets) || null,
        targetReps: parseInt(ex.targetReps) || null
      }))
    };

    try {
      if (editingPlanId) {
        await db.workoutPlans.put({ ...planData, id: editingPlanId });
      } else {
        await db.workoutPlans.add({ ...planData, id: generateUniqueId('plan') });
      }
      setShowAddPlan(false);
      setEditingPlanId(null);
      setPlanName('');
      setPlanExercises([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);
    } catch (e) {
      console.error(e);
      alert('Failed to save plan.');
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanExercises((plan.exercises || []).map(ex => ({
      id: generateUniqueId('ex-plan'),
      name: ex.name,
      muscleGroup: ex.muscleGroup || 'Other',
      targetSets: ex.targetSets || '',
      targetReps: ex.targetReps || ''
    })));
    setShowAddPlan(true);
  };

  const handleDeletePlan = async (id) => {
    if (confirm('Delete this plan template?')) {
      try { await db.workoutPlans.delete(id); } catch (e) { console.error(e); }
    }
  };

  const handleLogUsingPlan = (plan) => {
    setWorkoutType(plan.name);
    setWorkoutDuration(60);
    setWorkoutFocus(3);
    setWorkoutNotes('');
    setExercisesList(plan.exercises.map(ex => {
      const numSets = ex.targetSets || 1;
      return {
        id: generateUniqueId('ex-plan-log'),
        name: ex.name,
        muscleGroup: ex.muscleGroup || 'Other',
        sets: Array.from({ length: numSets }, (_, i) => ({
          id: generateUniqueId('set-plan-log'),
          weight: '',
          reps: ex.targetReps ? String(ex.targetReps) : ''
        }))
      };
    }));
    setActiveTab('logs');
    setTimeout(() => {
      if (loggerRef.current) loggerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ─── Filtered workouts ────────────────────────────────────────────────────
  const filteredWorkouts = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(w =>
      w.type?.toLowerCase().includes(q) ||
      w.notes?.toLowerCase().includes(q) ||
      w.date?.includes(q) ||
      w.exercises?.some(ex => ex.name?.toLowerCase().includes(q))
    );
  }, [workouts, searchQuery]);

  const commonPresets = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull Up', 'Barbell Row', 'Dumbbell Curl', 'Leg Press'];

  // ─── Shared styles ────────────────────────────────────────────────────────
  const cardStyle = {
    background: '#0f0f11',
    border: '1px solid #1c1c1e',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column'
  };

  const statIconStyle = {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', flexShrink: 0
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column', gap: '20px',
      overflowY: 'auto', overflowX: 'hidden',
      padding: isMobile ? '0 16px 80px 16px' : '0 40px 36px 40px',
      boxSizing: 'border-box'
    }}>
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />

      {/* ── Header ── */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1 style={{ textTransform: 'lowercase' }}>
            <Dumbbell size={28} color="#ffffff" /> training journal.
          </h1>
          <p>correlate weight lifting volume, physical training consistency and mental ready-state.</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginTop: '-8px', flexShrink: 0 }}>
        {[['logs', 'logs'], ['plans', 'workout templates']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            background: 'none', border: 'none',
            color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.35)',
            fontSize: '15px', fontWeight: '700', cursor: 'pointer',
            padding: '6px 0', position: 'relative', transition: 'color 0.15s'
          }}>
            {label}
            {activeTab === id && (
              <div style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, height: '2px', background: '#fff', borderRadius: '2px' }} />
            )}
          </button>
        ))}
      </div>

      {/* ══════════ LOGS TAB ══════════ */}
      {activeTab === 'logs' ? (
        <>
          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
            gap: '12px'
          }}>
            {[
              { icon: <Dumbbell size={18} />, label: 'Total Workouts', value: workoutStats.totalWorkouts },
              { icon: <Activity size={18} />, label: 'Sets Completed', value: workoutStats.totalSets },
              { icon: <TrendingUp size={18} />, label: 'Volume Lifted', value: `${workoutStats.totalVolume.toLocaleString()} kg` },
              { icon: <Zap size={18} />, label: 'Avg Focus', value: workoutStats.avgFocus > 0 ? `${workoutStats.avgFocus}/5` : '—' },
              { icon: <Flame size={18} />, label: 'Current Streak', value: streak > 0 ? `${streak}d 🔥` : '0d' }
            ].map((stat, i) => (
              <div key={i} style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
                <div style={statIconStyle}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{stat.label}</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 3-Column Main Area */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(230px, 260px) 1fr 1fr',
            gap: '20px',
            alignItems: 'start'
          }}>

            {/* ── LEFT: Calendar ── */}
            {!isMobile && (
              <div style={{ ...cardStyle, gap: '14px', padding: '18px' }}>
                {/* Month nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '6px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', letterSpacing: '0.3px' }}>{monthLabel}</span>
                  <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '6px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {WEEK_DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3px', paddingBottom: '4px' }}>{d}</div>
                  ))}
                </div>

                {/* Day grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;

                    const ds = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayWorkouts = workoutsByDate[ds] || [];
                    const hasWorkout = dayWorkouts.length > 0;
                    const isToday = ds === todayStr();
                    const isSelected = ds === workoutDate;
                    const dotColor = hasWorkout ? (TYPE_DOT_COLOR[dayWorkouts[0].type] || 'rgba(255,255,255,0.5)') : null;

                    return (
                      <div
                        key={ds}
                        onClick={() => handleCalendarDayClick(day)}
                        title={hasWorkout ? dayWorkouts.map(w => w.type).join(', ') : 'Click to add workout'}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          aspectRatio: '1',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'rgba(255,255,255,0.1)'
                            : hasWorkout
                            ? 'rgba(255,255,255,0.025)'
                            : 'transparent',
                          border: isSelected
                            ? '1px solid rgba(255,255,255,0.25)'
                            : '1px solid transparent',
                          transition: 'all 0.12s'
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = hasWorkout ? 'rgba(255,255,255,0.025)' : 'transparent'; }}
                      >
                        <span style={{
                          fontSize: '11px',
                          fontWeight: isToday ? '800' : '400',
                          color: isToday ? '#000' : isSelected ? '#fff' : 'rgba(255,255,255,0.75)',
                          width: '20px', height: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          background: isToday ? '#fff' : 'transparent',
                          lineHeight: 1
                        }}>
                          {day}
                        </span>
                        {hasWorkout && (
                          <div style={{
                            display: 'flex', gap: '2px', alignItems: 'center',
                            flexWrap: 'wrap', justifyContent: 'center'
                          }}>
                            {dayWorkouts.slice(0, 3).map((w, i) => (
                              <div key={i} style={{
                                width: '4px', height: '4px', borderRadius: '50%',
                                background: TYPE_DOT_COLOR[w.type] || 'rgba(255,255,255,0.5)',
                                flexShrink: 0
                              }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {Object.entries(TYPE_DOT_COLOR).filter(([k]) => workouts.some(w => w.type === k)).map(([type, color]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>{type}</span>
                    </div>
                  ))}
                  {!workouts.length && (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>no workouts yet</span>
                  )}
                </div>
              </div>
            )}

            {/* ── CENTER: Logger ── */}
            <div ref={loggerRef} style={{ ...cardStyle, gap: '18px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                  <Plus size={15} /> log workout.
                </h3>
                {saveStatus && (
                  <span style={{
                    fontSize: '10px', color: '#fff',
                    fontFamily: 'var(--font-mono)', fontWeight: '600',
                    background: saveStatus === 'logged!' ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${saveStatus === 'logged!' ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.15)'}`,
                    padding: '3px 8px', borderRadius: '6px'
                  }}>
                    {saveStatus}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Date / Type / Duration row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>date</label>
                    <input type="date" className="hollow-glass-input"
                      style={{ padding: '7px 9px', fontSize: '12px' }}
                      value={workoutDate}
                      onChange={e => setWorkoutDate(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>split</label>
                    <select className="hollow-glass-input"
                      style={{ padding: '7px 8px', fontSize: '12px', background: 'var(--colors-surface-deep)' }}
                      value={workoutType}
                      onChange={e => setWorkoutType(e.target.value)}
                    >
                      {['Push', 'Pull', 'Legs', 'Cardio', 'Full Body', 'Other'].map(t => (
                        <option key={t} value={t}>{t.toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>mins</label>
                    <input type="number" placeholder="60" className="hollow-glass-input"
                      style={{ padding: '7px 9px', fontSize: '12px' }}
                      value={workoutDuration}
                      onChange={e => setWorkoutDuration(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>

                {/* Focus buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>mental focus & energy</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
                    {[1, 2, 3, 4, 5].map(val => {
                      const labels = ['fatigued', 'sluggish', 'normal', 'sharp', '⚡ peak'];
                      const sel = workoutFocus === val;
                      return (
                        <button key={val} type="button" onClick={() => setWorkoutFocus(val)} style={{
                          background: sel ? '#fff' : 'rgba(255,255,255,0.02)',
                          border: sel ? '1px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                          color: sel ? '#000' : '#fff', borderRadius: '8px',
                          padding: '6px 2px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                          transition: 'all 0.13s'
                        }}>
                          <span>{val}</span>
                          <span style={{ fontSize: '7px', opacity: sel ? 0.85 : 0.4, fontWeight: 'normal' }}>{labels[val - 1]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Exercises builder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>exercises & sets</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {workoutPlans.length > 0 && (
                        <select
                          onChange={e => {
                            const planId = e.target.value;
                            if (!planId) return;
                            const plan = workoutPlans.find(p => p.id === planId);
                            if (plan && confirm(`Load plan "${plan.name}"? This will replace current exercises.`)) {
                              setExercisesList(plan.exercises.map((ex, idx) => {
                                const numSets = ex.targetSets || 1;
                                return {
                                  id: `ex-plan-${Date.now()}-${idx}`,
                                  name: ex.name,
                                  muscleGroup: ex.muscleGroup || 'Other',
                                  sets: Array.from({ length: numSets }, (_, si) => ({
                                    id: `set-plan-${Date.now()}-${idx}-${si}`,
                                    weight: '',
                                    reps: ex.targetReps ? String(ex.targetReps) : ''
                                  }))
                                };
                              }));
                              setWorkoutType(plan.name);
                            }
                            e.target.value = '';
                          }}
                          className="hollow-glass-input"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#bf5af2', fontSize: '10px', fontWeight: '600', borderRadius: '8px', padding: '3px 8px', cursor: 'pointer', outline: 'none', height: 'auto' }}
                        >
                          <option value="" style={{ background: '#0f0f11', color: '#fff' }}>Load Plan...</option>
                          {workoutPlans.map(p => (
                            <option key={p.id} value={p.id} style={{ background: '#0f0f11', color: '#fff' }}>{p.name}</option>
                          ))}
                        </select>
                      )}
                      <button type="button" onClick={handleAddExercise} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#fff', borderRadius: '8px', padding: '3px 9px', fontSize: '10px',
                        fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', transition: 'background 0.15s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      >
                        <Plus size={10} /> add exercise
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                    {exercisesList.map(ex => (
                      <div key={ex.id} style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Exercise name row */}
                        <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                          <input type="text" placeholder="exercise name" className="hollow-glass-input"
                            style={{ padding: '5px 9px', fontSize: '12px', flex: 1 }}
                            value={ex.name}
                            onChange={e => handleExerciseNameChange(ex.id, e.target.value)}
                          />
                          <select value={ex.muscleGroup || 'Chest'} onChange={e => handleExerciseMuscleGroupChange(ex.id, e.target.value)}
                            className="hollow-glass-input"
                            style={{ width: '96px', padding: '5px 4px', fontSize: '10px', flexShrink: 0, background: '#0f0f11', color: '#fff' }}
                          >
                            {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                          </select>
                          {exercisesList.length > 1 && (
                            <button type="button" onClick={() => handleRemoveExercise(ex.id)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,69,58,0.7)', cursor: 'pointer', padding: '3px', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        {/* Quick presets */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {commonPresets.map(p => (
                            <button key={p} type="button" onClick={() => handleExerciseNameChange(ex.id, p)}
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderRadius: '5px', padding: '1px 5px', fontSize: '9px', cursor: 'pointer', transition: 'all 0.1s' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            >+ {p.toLowerCase()}</button>
                          ))}
                        </div>

                        {/* Sets */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(() => {
                            const prevSets = getLastSessionSets(ex.name);
                            return ex.sets.map((set, setIdx) => {
                              const prev = prevSets?.[setIdx];
                              return (
                                <div key={set.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', width: '26px', flexShrink: 0 }}>S{setIdx + 1}</span>
                                    <input type="number" placeholder={prev ? String(prev.weight) : 'kg'} className="hollow-glass-input"
                                      style={{ padding: '4px 7px', fontSize: '11px', textAlign: 'center', flex: 1, minWidth: '38px' }}
                                      value={set.weight}
                                      onChange={e => handleSetChange(ex.id, set.id, 'weight', e.target.value)}
                                      min="0" step="0.5"
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', flexShrink: 0 }}>kg</span>
                                    <input type="number" placeholder={prev ? String(prev.reps) : 'reps'} className="hollow-glass-input"
                                      style={{ padding: '4px 7px', fontSize: '11px', textAlign: 'center', flex: 1, minWidth: '38px' }}
                                      value={set.reps}
                                      onChange={e => handleSetChange(ex.id, set.id, 'reps', e.target.value)}
                                      min="1"
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', flexShrink: 0 }}>r</span>
                                    {ex.sets.length > 1 && (
                                      <button type="button" onClick={() => handleRemoveSet(ex.id, set.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '2px', fontSize: '13px', flexShrink: 0 }}
                                      >×</button>
                                    )}
                                  </div>
                                  {prev && (
                                    <div style={{ fontSize: '9px', color: '#bf5af2', paddingLeft: '33px', opacity: 0.8 }}>
                                      last: {prev.weight}kg × {prev.reps}r
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        <button type="button" onClick={() => handleAddSet(ex.id)}
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 3px', transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                        >
                          + add set
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>session notes</label>
                  <textarea placeholder="performance details, sleep status, mental state..."
                    className="hollow-glass-input"
                    style={{ minHeight: '52px', padding: '9px', fontSize: '11px', resize: 'vertical' }}
                    value={workoutNotes}
                    onChange={e => setWorkoutNotes(e.target.value)}
                  />
                </div>

                <button type="submit" style={{
                  background: '#fff', border: 'none', color: '#000',
                  padding: '10px 16px', fontWeight: '700', borderRadius: '12px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '7px', fontSize: '13px',
                  transition: 'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <Check size={14} /> Log Workout
                </button>
              </form>
            </div>

            {/* ── RIGHT: History ── */}
            <div style={{ ...cardStyle, gap: '14px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                  <Clock size={15} /> session history.
                </h3>
                <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{filteredWorkouts.length} logged</span>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--colors-stone)' }} />
                <input type="text" placeholder="search by split, exercise, date..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="hollow-glass-input"
                  style={{ padding: '7px 10px 7px 30px', fontSize: '11px', width: '100%', boxSizing: 'border-box' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '11px' }}>clear</button>
                )}
              </div>

              {/* Workout cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: isMobile ? 'none' : '600px', paddingRight: '4px', flex: 1 }}>
                {filteredWorkouts.length === 0 ? (
                  <div style={{ color: 'var(--colors-stone)', fontSize: '12px', textAlign: 'center', padding: '40px 12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px', background: 'rgba(0,0,0,0.1)' }}>
                    {searchQuery ? 'no workouts match your search.' : 'no workouts logged yet. start tracking!'}
                  </div>
                ) : filteredWorkouts.map(w => {
                  const isExpanded = !!expandedWorkouts[w.id];
                  let vol = 0;
                  (w.exercises || []).forEach(ex => (ex.sets || []).forEach(s => { vol += (s.weight || 0) * (s.reps || 0); }));
                  const dotColor = TYPE_DOT_COLOR[w.type] || 'rgba(255,255,255,0.4)';

                  return (
                    <div key={w.id} style={{ background: 'rgba(0,0,0,0.14)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'all 0.15s' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }} onClick={() => toggleExpand(w.id)}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: '#fff', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{w.date}</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '1px 7px', borderRadius: '5px', textTransform: 'lowercase' }}>{w.type}</span>
                          <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{w.duration}m</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{vol.toLocaleString()}kg</span>
                          {w.focusRating && (
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Zap size={8} style={{ fill: '#fff' }} /> {w.focusRating}
                            </span>
                          )}
                          <button onClick={() => toggleExpand(w.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <button onClick={() => handleDeleteWorkout(w.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,69,58,0.65)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {w.notes && (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '7px', borderLeft: '2px solid rgba(255,255,255,0.07)' }}>
                          {w.notes}
                        </div>
                      )}

                      {isExpanded && w.exercises?.length > 0 && (() => {
                        const groups = {};
                        w.exercises.forEach(ex => {
                          const mg = ex.muscleGroup || 'Other';
                          if (!groups[mg]) groups[mg] = [];
                          groups[mg].push(ex);
                        });
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            {Object.keys(groups).sort().map(mg => (
                              <div key={mg} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '9px', fontWeight: '800', color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{mg}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', paddingLeft: '6px' }}>
                                  {groups[mg].map((ex, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{ex.name.toLowerCase()}</span>
                                        <span style={{ fontSize: '9px', color: 'var(--colors-stone)' }}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {ex.sets.map((s, si) => (
                                          <div key={si} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '3px 7px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.75)' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '3px' }}>#{si + 1}</span>
                                            <b>{s.weight}</b>kg×<b>{s.reps}</b>r
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart — full width below 3 columns */}
          <div style={{ ...cardStyle, padding: '20px 24px', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                <TrendingUp size={15} /> volume & focus correlation.
              </h3>
              <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>last 12 workouts</span>
            </div>
            <div style={{ height: '160px', width: '100%' }}>
              {trendData.length === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-stone)', fontSize: '11px' }}>
                  log workouts to see the trend.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: -10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(255,255,255,0.08)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="rgba(255,255,255,0.08)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}kg`} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={v => `F:${v}`} />
                    <Tooltip contentStyle={{ background: 'rgba(15,15,17,0.96)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                    <Area yAxisId="left" type="monotone" dataKey="volume" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVolume2)" name="Volume" />
                    <Line yAxisId="right" type="monotone" dataKey="focus" stroke="#ffffff" strokeWidth={2} dot={{ r: 2.5, fill: '#0f0f11', strokeWidth: 1.5 }} activeDot={{ r: 4 }} name="Focus" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ══════════ PLANS TAB ══════════ */
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* LEFT: Builder */}
          <div style={{ ...cardStyle, gap: '18px', padding: '22px' }}>
            {showAddPlan ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                    <Target size={15} /> {editingPlanId ? 'edit template.' : 'new template.'}
                  </h3>
                  <button onClick={() => { setShowAddPlan(false); setEditingPlanId(null); setPlanName(''); setPlanExercises([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]); }}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '12px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                  >cancel</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Plan name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>plan name</label>
                    <input type="text" placeholder="e.g. Push Day, Upper Power"
                      className="hollow-glass-input"
                      style={{ padding: '8px 10px', fontSize: '13px' }}
                      value={planName}
                      onChange={e => setPlanName(e.target.value)}
                    />
                  </div>

                  {/* Exercises */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>exercises</label>
                      <button type="button" onClick={handleAddPlanExercise}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '8px', padding: '3px 9px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Plus size={10} /> add exercise
                      </button>
                    </div>

                    {/* Column header hint */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 44px 44px 24px', gap: '6px', padding: '0 0 2px 0' }}>
                      {['exercise name', 'muscle', 'sets', 'reps', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                      {planExercises.map(ex => (
                        <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 44px 44px 24px', gap: '6px', alignItems: 'center' }}>
                          <input type="text" value={ex.name}
                            onChange={e => handlePlanExChange(ex.id, 'name', e.target.value)}
                            placeholder="Exercise name"
                            className="hollow-glass-input"
                            style={{ padding: '6px 9px', fontSize: '12px' }}
                          />
                          <select value={ex.muscleGroup || 'Chest'}
                            onChange={e => handlePlanExChange(ex.id, 'muscleGroup', e.target.value)}
                            className="hollow-glass-input"
                            style={{ padding: '6px 4px', fontSize: '10px', background: '#0f0f11', color: '#fff' }}
                          >
                            {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                          </select>
                          <input type="number" value={ex.targetSets}
                            onChange={e => handlePlanExChange(ex.id, 'targetSets', e.target.value)}
                            placeholder="—"
                            className="hollow-glass-input"
                            style={{ padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}
                            min="1" max="20"
                          />
                          <input type="number" value={ex.targetReps}
                            onChange={e => handlePlanExChange(ex.id, 'targetReps', e.target.value)}
                            placeholder="—"
                            className="hollow-glass-input"
                            style={{ padding: '6px 4px', fontSize: '11px', textAlign: 'center' }}
                            min="1" max="100"
                          />
                          {planExercises.length > 1 ? (
                            <button onClick={() => handleRemovePlanExercise(ex.id)}
                              style={{ background: 'none', border: 'none', color: 'rgba(255,69,58,0.7)', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={13} />
                            </button>
                          ) : <div />}
                        </div>
                      ))}
                    </div>

                    <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                      Sets &amp; reps are optional targets. When you log a session from this plan, sets will be pre-populated automatically.
                    </p>
                  </div>

                  <button onClick={handleSavePlan} style={{ background: '#fff', border: 'none', color: '#000', padding: '10px 16px', fontWeight: '700', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13px', marginTop: '4px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <Save size={14} /> {editingPlanId ? 'Save Changes' : 'Save Template'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '48px 12px', textAlign: 'center', flex: 1 }}>
                <Dumbbell size={32} style={{ opacity: 0.25 }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>workout plan builder.</h4>
                  <p style={{ fontSize: '11px', color: 'var(--colors-stone)', maxWidth: '240px', margin: '0 auto', lineHeight: '1.5' }}>
                    create structured templates with optional sets × reps targets per exercise. log sessions in one click.
                  </p>
                </div>
                <button onClick={() => { setEditingPlanId(null); setPlanName(''); setPlanExercises([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]); setShowAddPlan(true); }}
                  style={{ background: '#fff', border: 'none', color: '#000', padding: '9px 18px', fontWeight: '700', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <Plus size={13} /> Create Plan Template
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Plans list */}
          <div style={{ ...cardStyle, gap: '14px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                <Clock size={15} /> your plans.
              </h3>
              <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{workoutPlans.length} templates</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: isMobile ? 'none' : '600px', paddingRight: '4px', flex: 1 }}>
              {workoutPlans.length === 0 ? (
                <div style={{ color: 'var(--colors-stone)', fontSize: '12px', textAlign: 'center', padding: '48px 12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px', background: 'rgba(0,0,0,0.1)' }}>
                  no plans yet. create one to speed up logging.
                </div>
              ) : workoutPlans.map(plan => (
                <div key={plan.id} style={{ background: 'rgba(0,0,0,0.14)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 3px 0' }}>{plan.name}</h4>
                      <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{(plan.exercises || []).length} exercises</span>
                    </div>
                    <button onClick={() => handleLogUsingPlan(plan)} style={{
                      background: '#fff', border: 'none', borderRadius: '8px',
                      padding: '6px 13px', fontSize: '11px', fontWeight: '700', color: '#000',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, transition: 'background 0.15s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <Plus size={12} /> Log Session
                    </button>
                  </div>

                  {/* Exercises grouped by muscle, with targets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    {(() => {
                      const groups = {};
                      (plan.exercises || []).forEach(ex => {
                        const mg = ex.muscleGroup || 'Other';
                        if (!groups[mg]) groups[mg] = [];
                        groups[mg].push(ex);
                      });
                      return Object.keys(groups).sort().map(mg => (
                        <div key={mg} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: '#bf5af2', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>{mg}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '8px' }}>
                            {groups[mg].map((ex, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.75)' }}>{ex.name}</span>
                                {(ex.targetSets || ex.targetReps) && (
                                  <span style={{ fontSize: '9px', color: '#54a0ff', background: 'rgba(84,160,255,0.08)', border: '1px solid rgba(84,160,255,0.15)', borderRadius: '5px', padding: '1px 6px', fontWeight: '700', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                                    {ex.targetSets || '?'}×{ex.targetReps || '?'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => handleEditPlan(plan)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '8px', padding: '5px 10px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      <Edit3 size={10} /> edit
                    </button>
                    <button onClick={() => handleDeletePlan(plan.id)} style={{ background: 'rgba(255,69,58,0.08)', border: 'none', color: '#ff453a', borderRadius: '8px', padding: '5px 10px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,58,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,69,58,0.08)'}
                    >
                      <Trash2 size={10} /> delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
