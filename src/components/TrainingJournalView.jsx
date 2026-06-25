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
  Target,
  Share2,
  Download,
  Heart
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

const generateUniqueId = (prefix = 'id') =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const todayStr = () => new Date().toISOString().split('T')[0];

const formatPace = (durationMinutes, distanceKm) => {
  if (!durationMinutes || !distanceKm) return '—';
  const totalSeconds = Math.round((durationMinutes / distanceKm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
};

export default function TrainingJournalView() {
  const isMobile = useUIStore(state => state.isMobile);

  // ─── Live queries ─────────────────────────────────────────────────────────
  const rawWorkouts = useLiveQuery(() => db.workouts.toArray());
  const workouts = useMemo(() => rawWorkouts || [], [rawWorkouts]);

  const rawWorkoutPlans = useLiveQuery(() => db.workoutPlans ? db.workoutPlans.toArray() : []);
  const workoutPlans = useMemo(() => rawWorkoutPlans || [], [rawWorkoutPlans]);

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('logs');
  const [sharingWorkout, setSharingWorkout] = useState(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);

  // ─── Logger drawer ────────────────────────────────────────────────────────
  const [loggerOpen, setLoggerOpen] = useState(false);

  const openLogger = (date) => {
    if (date) setWorkoutDate(date);
    setLoggerOpen(true);
  };
  const closeLogger = () => {
    setLoggerOpen(false);
    setEditingWorkoutId(null);
  };

  // ─── Calendar state ───────────────────────────────────────────────────────
  const now = new Date();
  const [calViewYear, setCalViewYear] = useState(now.getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(now.getMonth());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calViewYear, calViewMonth, 1);
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
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

  // Workouts by date
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
    readDraft('exercisesList', [])
  );
  const [saveStatus, setSaveStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  // Persist draft
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

  // ─── Stats ────────────────────────────────────────────────────────────────
  const workoutStats = useMemo(() => {
    let totalWorkouts = workouts.length;
    let totalSets = 0;
    let totalVolume = 0;
    let totalFocus = 0;
    let focusCount = 0;
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          totalSets++;
          totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
        });
      });
      if (w.focusRating > 0) { totalFocus += w.focusRating; focusCount++; }
    });
    return {
      totalWorkouts, totalSets, totalVolume,
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
    if (!dates.has(fmt(cur))) cur.setDate(cur.getDate() - 1);
    while (dates.has(fmt(cur))) { count++; cur.setDate(cur.getDate() - 1); }
    return count;
  }, [workouts]);

  const trendData = useMemo(() =>
    [...workouts]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-12)
      .map(w => {
        let volume = 0;
        (w.exercises || []).forEach(ex =>
          (ex.sets || []).forEach(s => { volume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0); })
        );
        return { date: w.date.split('-').slice(1).join('/'), volume, focus: w.focusRating || 3 };
      }),
    [workouts]
  );

  const cardioStats = useMemo(() => {
    let totalDistance = 0;
    let totalDuration = 0;
    let hrSum = 0;
    let hrCount = 0;
    let totalCalories = 0;
    workouts.forEach(w => {
      let hasCardio = false;
      (w.exercises || []).forEach(ex => {
        if (ex.muscleGroup === 'Cardio') {
          hasCardio = true;
          (ex.sets || []).forEach(s => {
            totalDistance += parseFloat(s.distance) || 0;
            totalDuration += parseFloat(s.duration) || 0;
            if (s.heartRate > 0) {
              hrSum += parseInt(s.heartRate);
              hrCount++;
            }
            totalCalories += parseInt(s.calories) || 0;
          });
        }
      });
      if (w.type === 'Cardio' && !hasCardio) {
        totalDuration += w.duration || 0;
      }
    });
    const avgPace = totalDistance > 0 ? (totalDuration / totalDistance) : 0;
    return {
      totalDistance: parseFloat(totalDistance.toFixed(1)),
      totalDuration: Math.round(totalDuration),
      avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : 0,
      totalCalories,
      avgPace
    };
  }, [workouts]);

  const filteredCardioWorkouts = useMemo(() => {
    const sorted = [...workouts]
      .filter(w => w.type === 'Cardio' || w.exercises?.some(ex => ex.muscleGroup === 'Cardio'))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(w =>
      w.type?.toLowerCase().includes(q) || w.notes?.toLowerCase().includes(q) ||
      w.date?.includes(q) || w.exercises?.some(ex => ex.name?.toLowerCase().includes(q))
    );
  }, [workouts, searchQuery]);

  const cardioTrendData = useMemo(() => {
    const list = [...workouts]
      .filter(w => w.type === 'Cardio' || w.exercises?.some(ex => ex.muscleGroup === 'Cardio'))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10);
    return list.map(w => {
      let totalDist = 0;
      let totalTime = 0;
      (w.exercises || []).forEach(ex => {
        if (ex.muscleGroup === 'Cardio') {
          (ex.sets || []).forEach(s => {
            totalDist += parseFloat(s.distance) || 0;
            totalTime += parseFloat(s.duration) || 0;
          });
        }
      });
      if (totalTime === 0 && w.type === 'Cardio') {
        totalTime = w.duration || 0;
      }
      const paceVal = totalDist > 0 ? parseFloat((totalTime / totalDist).toFixed(2)) : 0;
      return {
        date: w.date.split('-').slice(1).join('/'),
        distance: totalDist,
        pace: paceVal,
        duration: totalTime
      };
    });
  }, [workouts]);

  // ─── Last-session lookup ──────────────────────────────────────────────────
  const getLastSessionSets = (exerciseName) => {
    if (!exerciseName?.trim()) return null;
    const n = exerciseName.trim().toLowerCase();
    for (const w of [...workouts].filter(w => w.date < workoutDate).sort((a, b) => b.date.localeCompare(a.date))) {
      const m = (w.exercises || []).find(ex => ex.name.trim().toLowerCase() === n);
      if (m?.sets?.length) return m.sets;
    }
    return null;
  };

  // ─── Logger handlers ──────────────────────────────────────────────────────
  const handleAddExercise = () =>
    setExercisesList(prev => [...prev, { id: generateUniqueId('ex'), name: '', muscleGroup: 'Chest', sets: [{ id: generateUniqueId('set'), weight: '', reps: '' }] }]);

  const handleRemoveExercise = exId =>
    setExercisesList(prev => prev.filter(ex => ex.id !== exId));

  const handleExerciseNameChange = (exId, name) =>
    setExercisesList(prev => prev.map(ex => ex.id === exId ? { ...ex, name } : ex));

  const handleExerciseMuscleGroupChange = (exId, muscleGroup) =>
    setExercisesList(prev => prev.map(ex => ex.id === exId ? { ...ex, muscleGroup } : ex));

  const handleAddSet = exId =>
    setExercisesList(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, sets: [...ex.sets, { id: generateUniqueId('set'), weight: '', reps: '' }] } : ex
    ));

  const handleRemoveSet = (exId, setId) =>
    setExercisesList(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) } : ex
    ));

  const handleSetChange = (exId, setId, field, val) =>
    setExercisesList(prev => prev.map(ex =>
      ex.id === exId ? { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s) } : ex
    ));

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    const validExercises = exercisesList
      .filter(ex => ex.name.trim())
      .map(ex => {
        const isCardio = ex.muscleGroup === 'Cardio';
        return {
          name: ex.name,
          muscleGroup: ex.muscleGroup || 'Other',
          sets: ex.sets.map(s => {
            if (isCardio) {
              return {
                distance: parseFloat(s.distance) || 0,
                duration: parseFloat(s.duration) || 0,
                heartRate: parseInt(s.heartRate) || 0,
                calories: parseInt(s.calories) || 0
              };
            } else {
              return {
                weight: parseFloat(s.weight) || 0,
                reps: parseInt(s.reps) || 0
              };
            }
          })
        };
      });
    if (!validExercises.length) {
      setSaveStatus('add at least one exercise.');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    setSaveStatus('saving...');
    try {
      const workoutData = {
        date: workoutDate, type: workoutType,
        duration: parseInt(workoutDuration) || 0, notes: workoutNotes,
        exercises: validExercises, focusRating: parseInt(workoutFocus) || 3
      };
      if (editingWorkoutId) {
        await db.workouts.put({ ...workoutData, id: editingWorkoutId });
      } else {
        await db.workouts.add({ ...workoutData, id: generateUniqueId('wo') });
      }
      setSaveStatus(editingWorkoutId ? 'updated!' : 'logged!');
      localStorage.removeItem('hollow_workout_draft');
      setWorkoutNotes('');
      setWorkoutFocus(3);
      setExercisesList([]);
      setEditingWorkoutId(null);
      setTimeout(() => { setSaveStatus(''); closeLogger(); }, 1200);
    } catch (err) {
      console.error(err);
      setSaveStatus('save failed.');
    }
  };

  const handleEditWorkout = (workout) => {
    setEditingWorkoutId(workout.id);
    setWorkoutDate(workout.date);
    setWorkoutType(workout.type);
    setWorkoutDuration(workout.duration);
    setWorkoutFocus(workout.focusRating || 3);
    setWorkoutNotes(workout.notes || '');
    setExercisesList(
      (workout.exercises || []).map((ex, idx) => ({
        id: `ex-edit-${Date.now()}-${idx}-${Math.random()}`,
        name: ex.name,
        muscleGroup: ex.muscleGroup || 'Other',
        sets: (ex.sets || []).map((s, si) => {
          if (ex.muscleGroup === 'Cardio') {
            return {
              id: `set-edit-${Date.now()}-${idx}-${si}-${Math.random()}`,
              distance: String(s.distance || ''),
              duration: String(s.duration || ''),
              heartRate: String(s.heartRate || ''),
              calories: String(s.calories || '')
            };
          } else {
            return {
              id: `set-edit-${Date.now()}-${idx}-${si}-${Math.random()}`,
              weight: String(s.weight || ''),
              reps: String(s.reps || '')
            };
          }
        })
      }))
    );
    setLoggerOpen(true);
  };

  const handleDeleteWorkout = async (id) => {
    if (confirm('Delete this workout entry?')) {
      try { await db.workouts.delete(id); } catch (err) { console.error(err); }
    }
  };

  const toggleExpand = id =>
    setExpandedWorkouts(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Plan handlers ────────────────────────────────────────────────────────
  const handleAddPlanExercise = () =>
    setPlanExercises(prev => [...prev, { id: generateUniqueId('ex'), name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);

  const handleRemovePlanExercise = id =>
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
        name: ex.name.trim(), muscleGroup: ex.muscleGroup || 'Other',
        targetSets: parseInt(ex.targetSets) || null, targetReps: parseInt(ex.targetReps) || null
      }))
    };
    try {
      if (editingPlanId) { await db.workoutPlans.put({ ...planData, id: editingPlanId }); }
      else { await db.workoutPlans.add({ ...planData, id: generateUniqueId('plan') }); }
      setShowAddPlan(false); setEditingPlanId(null);
      setPlanName(''); setPlanExercises([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);
    } catch (e) { console.error(e); alert('Failed to save plan.'); }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id); setPlanName(plan.name);
    setPlanExercises((plan.exercises || []).map(ex => ({
      id: generateUniqueId('ex-plan'), name: ex.name, muscleGroup: ex.muscleGroup || 'Other',
      targetSets: ex.targetSets || '', targetReps: ex.targetReps || ''
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
    setWorkoutDuration(60); setWorkoutFocus(3); setWorkoutNotes('');
    setExercisesList(plan.exercises.map(ex => ({
      id: generateUniqueId('ex-plan-log'), name: ex.name, muscleGroup: ex.muscleGroup || 'Other',
      sets: Array.from({ length: ex.targetSets || 1 }, () => ({
        id: generateUniqueId('set-plan-log'), weight: '', reps: ex.targetReps ? String(ex.targetReps) : ''
      }))
    })));
    setActiveTab('logs');
    setLoggerOpen(true);
  };

  // ─── Filtered workouts ────────────────────────────────────────────────────
  const filteredWorkouts = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(w =>
      w.type?.toLowerCase().includes(q) || w.notes?.toLowerCase().includes(q) ||
      w.date?.includes(q) || w.exercises?.some(ex => ex.name?.toLowerCase().includes(q))
    );
  }, [workouts, searchQuery]);

  const commonPresets = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull Up', 'Barbell Row', 'Dumbbell Curl', 'Leg Press'];

  // ─── Shared styles ────────────────────────────────────────────────────────
  const cardStyle = {
    background: '#0f0f11', border: '1px solid #1c1c1e', borderRadius: '16px',
    padding: '20px', display: 'flex', flexDirection: 'column'
  };

  const statIconStyle = {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Logger Drawer ── */}
      {loggerOpen && (
        <div className="hollow-drawer-backdrop" onClick={closeLogger}>
          <div
            className="hollow-drawer-container"
            onClick={e => e.stopPropagation()}
            style={{ width: '520px', display: 'flex', flexDirection: 'column' }}
          >
            {/* Drawer header */}
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', textTransform: 'lowercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {editingWorkoutId ? <Edit3 size={18} /> : <Plus size={18} />}
                  {editingWorkoutId ? 'edit workout.' : 'log workout.'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--colors-stone)' }}>
                  {editingWorkoutId ? 'modify your session details.' : 'track your session — exercises, sets & weights.'}
                </p>
              </div>
              <button onClick={closeLogger} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer body — scrollable */}
            <form onSubmit={handleSaveWorkout} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Date / Type / Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: '12px' }}>
                {[
                  { label: 'date', content: <input type="date" className="hollow-glass-input" style={{ padding: '9px 10px', fontSize: '13px' }} value={workoutDate} onChange={e => setWorkoutDate(e.target.value)} required /> },
                  { label: 'split / type', content: (
                    <select
                      className="hollow-glass-input"
                      style={{ padding: '9px 8px', fontSize: '13px', background: 'var(--colors-surface-deep)' }}
                      value={workoutType}
                      onChange={e => {
                        const val = e.target.value;
                        // Check if it matches a plan id
                        const plan = workoutPlans.find(p => p.id === val);
                        if (plan) {
                          setWorkoutType(plan.name);
                          setExercisesList(plan.exercises.map((ex, idx) => ({
                            id: `ex-plan-${Date.now()}-${idx}`,
                            name: ex.name,
                            muscleGroup: ex.muscleGroup || 'Other',
                            sets: Array.from({ length: ex.targetSets || 1 }, (_, si) => ({
                              id: `set-plan-${Date.now()}-${idx}-${si}`,
                              weight: '',
                              reps: ex.targetReps ? String(ex.targetReps) : ''
                            }))
                          })));
                        } else {
                          setWorkoutType(val);
                        }
                      }}
                    >
                      <optgroup label="Standard" style={{ background: '#0f0f11', color: 'rgba(255,255,255,0.4)' }}>
                        {['Push', 'Pull', 'Legs', 'Cardio', 'Full Body', 'Other'].map(t => (
                          <option key={t} value={t} style={{ background: '#0f0f11', color: '#fff' }}>{t.toLowerCase()}</option>
                        ))}
                      </optgroup>
                      {workoutPlans.length > 0 && (
                        <optgroup label="My Plans" style={{ background: '#0f0f11', color: 'rgba(255,255,255,0.4)' }}>
                          {workoutPlans.map(p => (
                            <option key={p.id} value={p.id} style={{ background: '#0f0f11', color: '#fff' }}>{p.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )},
                  { label: 'duration (min)', content: <input type="number" placeholder="60" className="hollow-glass-input" style={{ padding: '9px 10px', fontSize: '13px' }} value={workoutDuration} onChange={e => setWorkoutDuration(e.target.value)} min="1" /> }
                ].map(({ label, content }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</label>
                    {content}
                  </div>
                ))}
              </div>

              {/* Focus */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>mental focus &amp; energy</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                  {[1,2,3,4,5].map(val => {
                    const labels = ['fatigued', 'sluggish', 'normal', 'sharp', '⚡ peak'];
                    const sel = workoutFocus === val;
                    return (
                      <button key={val} type="button" onClick={() => setWorkoutFocus(val)} style={{
                        background: sel ? '#fff' : 'rgba(255,255,255,0.03)',
                        border: sel ? '1px solid #fff' : '1px solid rgba(255,255,255,0.07)',
                        color: sel ? '#000' : '#fff', borderRadius: '10px', padding: '8px 2px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'all 0.13s'
                      }}>
                        <span>{val}</span>
                        <span style={{ fontSize: '8px', opacity: sel ? 0.85 : 0.4, fontWeight: 'normal' }}>{labels[val-1]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* Exercises */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>exercises &amp; sets</label>
                  <button type="button" onClick={handleAddExercise} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                    color: '#fff', borderRadius: '8px', padding: '4px 11px', fontSize: '11px',
                    fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    <Plus size={11} /> add exercise
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {exercisesList.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '28px 16px', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', textAlign: 'center' }}>
                      <Dumbbell size={22} style={{ opacity: 0.2 }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>no exercises yet — add one manually or select a plan from the split dropdown above.</span>
                      <button type="button" onClick={handleAddExercise} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '9px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        <Plus size={12} /> add first exercise
                      </button>
                    </div>
                  ) : exercisesList.map(ex => (
                    <div key={ex.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Name + muscle + remove */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="text" placeholder="exercise name (e.g. bench press)" className="hollow-glass-input"
                          style={{ padding: '7px 10px', fontSize: '13px', flex: 1 }}
                          value={ex.name} onChange={e => handleExerciseNameChange(ex.id, e.target.value)}
                        />
                        <select value={ex.muscleGroup || 'Chest'} onChange={e => handleExerciseMuscleGroupChange(ex.id, e.target.value)}
                          className="hollow-glass-input"
                          style={{ width: '104px', padding: '7px 4px', fontSize: '11px', flexShrink: 0, background: '#0f0f11', color: '#fff' }}
                        >
                          {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                        </select>
                        {(
                          <button type="button" onClick={() => handleRemoveExercise(ex.id)}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,69,58,0.7)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          ><Trash2 size={13} /></button>
                        )}
                      </div>

                      {/* Quick presets */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {commonPresets.map(p => (
                          <button key={p} type="button" onClick={() => handleExerciseNameChange(ex.id, p)}
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderRadius: '6px', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', transition: 'all 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                          >+ {p.toLowerCase()}</button>
                        ))}
                      </div>

                      {/* Sets */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          const prevSets = getLastSessionSets(ex.name);
                          const isCardio = ex.muscleGroup === 'Cardio';
                          return ex.sets.map((set, setIdx) => {
                            const prev = prevSets?.[setIdx];
                            if (isCardio) {
                              const distVal = parseFloat(set.distance) || 0;
                              const durVal = parseFloat(set.duration) || 0;
                              const paceStr = formatPace(durVal, distVal);
                              return (
                                <div key={set.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', width: '24px', flexShrink: 0 }}>S{setIdx + 1}</span>
                                    <input type="number" placeholder="dist" className="hollow-glass-input"
                                      style={{ padding: '6px 6px', fontSize: '12px', textAlign: 'center', flex: 1 }}
                                      value={set.distance || ''} onChange={e => handleSetChange(ex.id, set.id, 'distance', e.target.value)}
                                      min="0" step="0.1"
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', flexShrink: 0 }}>km</span>
                                    <input type="number" placeholder="time" className="hollow-glass-input"
                                      style={{ padding: '6px 6px', fontSize: '12px', textAlign: 'center', flex: 1 }}
                                      value={set.duration || ''} onChange={e => handleSetChange(ex.id, set.id, 'duration', e.target.value)}
                                      min="0" step="0.5"
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', flexShrink: 0 }}>min</span>
                                    <input type="number" placeholder="hr" className="hollow-glass-input"
                                      style={{ padding: '6px 6px', fontSize: '12px', textAlign: 'center', flex: 0.8 }}
                                      value={set.heartRate || ''} onChange={e => handleSetChange(ex.id, set.id, 'heartRate', e.target.value)}
                                      min="0"
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', flexShrink: 0 }}>bpm</span>
                                    <input type="number" placeholder="kcal" className="hollow-glass-input"
                                      style={{ padding: '6px 6px', fontSize: '12px', textAlign: 'center', flex: 0.8 }}
                                      value={set.calories || ''} onChange={e => handleSetChange(ex.id, set.id, 'calories', e.target.value)}
                                      min="0"
                                    />
                                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)', flexShrink: 0 }}>kcal</span>
                                    {ex.sets.length > 1 && (
                                      <button type="button" onClick={() => handleRemoveSet(ex.id, set.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '2px', fontSize: '14px', flexShrink: 0 }}
                                      >×</button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '30px', fontSize: '9px' }}>
                                    <span style={{ color: 'var(--colors-stone)' }}>pace: <b style={{ color: '#00d2d3' }}>{paceStr}</b></span>
                                    {prev && (
                                      <span style={{ color: '#bf5af2', opacity: 0.85 }}>
                                        last: {prev.distance}km in {prev.duration}m ({formatPace(prev.duration, prev.distance)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div key={set.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', width: '28px', flexShrink: 0 }}>S{setIdx + 1}</span>
                                  <input type="number" placeholder={prev ? String(prev.weight) : 'weight'} className="hollow-glass-input"
                                    style={{ padding: '6px 8px', fontSize: '12px', textAlign: 'center', flex: 1 }}
                                    value={set.weight || ''} onChange={e => handleSetChange(ex.id, set.id, 'weight', e.target.value)}
                                    min="0" step="0.5"
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)', flexShrink: 0 }}>kg</span>
                                  <input type="number" placeholder={prev ? String(prev.reps) : 'reps'} className="hollow-glass-input"
                                    style={{ padding: '6px 8px', fontSize: '12px', textAlign: 'center', flex: 1 }}
                                    value={set.reps || ''} onChange={e => handleSetChange(ex.id, set.id, 'reps', e.target.value)} min="1"
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)', flexShrink: 0 }}>r</span>
                                  {ex.sets.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveSet(ex.id, set.id)}
                                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: '2px', fontSize: '14px', flexShrink: 0 }}
                                    >×</button>
                                  )}
                                </div>
                                {prev && (
                                  <div style={{ fontSize: '9px', color: '#bf5af2', paddingLeft: '36px', opacity: 0.85 }}>
                                    last: {prev.weight}kg × {prev.reps}r
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                        <button type="button" onClick={() => handleAddSet(ex.id)}
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 0', transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                        >+ add set</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>session notes</label>
                <textarea placeholder="performance details, sleep status, mental state..."
                  className="hollow-glass-input"
                  style={{ minHeight: '72px', padding: '10px 12px', fontSize: '12px', resize: 'vertical' }}
                  value={workoutNotes} onChange={e => setWorkoutNotes(e.target.value)}
                />
              </div>

            </form>

            {/* Drawer footer */}
            <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button form="workout-logger-form" type="submit" onClick={handleSaveWorkout}
                style={{ flex: 1, background: '#fff', border: 'none', color: '#000', padding: '12px 20px', fontWeight: '700', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <Check size={15} /> {editingWorkoutId ? 'Save Changes' : 'Log Workout'}
                {saveStatus && <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.7 }}>({saveStatus})</span>}
              </button>
              <button type="button" onClick={closeLogger}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '12px 16px', fontWeight: '600', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main scroll container ── */}
      <div style={{
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px',
        overflowY: 'auto', overflowX: 'hidden',
        padding: isMobile ? '0 16px 80px 16px' : '0 40px 36px 40px',
        boxSizing: 'border-box'
      }}>
        <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />

        {/* Header */}
        <div className="hollow-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="hollow-view-header-title-block">
            <h1 style={{ textTransform: 'lowercase' }}>
              <Dumbbell size={28} color="#ffffff" /> training journal.
            </h1>
            <p>correlate weight lifting volume, physical training consistency and mental ready-state.</p>
          </div>
          {/* Global + FAB (desktop header) */}
          {!isMobile && (
            <button
              onClick={() => openLogger(todayStr())}
              style={{ background: '#fff', border: 'none', color: '#000', borderRadius: '12px', padding: '10px 20px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, marginTop: '4px', transition: 'background 0.15s', boxShadow: '0 2px 16px rgba(255,255,255,0.08)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <Plus size={15} /> log workout
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginTop: '-8px', flexShrink: 0 }}>
          {[['logs', 'logs'], ['cardio', 'cardio'], ['plans', 'workout templates']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              background: 'none', border: 'none', color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer', padding: '6px 0', position: 'relative', transition: 'color 0.15s'
            }}>
              {label}
              {activeTab === id && <div style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, height: '2px', background: '#fff', borderRadius: '2px' }} />}
            </button>
          ))}
        </div>

        {/* ══════════ LOGS TAB ══════════ */}
        {activeTab === 'logs' ? (
          <>
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '12px' }}>
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

            {/* 2-Column: Calendar + History */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 280px) 1fr', gap: '20px', alignItems: 'stretch' }}>

              {/* ── Calendar ── */}
              {!isMobile && (
                <div style={{ ...cardStyle, gap: '14px', padding: '18px' }}>
                  {/* Month nav */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {[prevMonth, nextMonth].map((fn, i) => (
                      <button key={i} onClick={fn} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '6px', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                      >
                        {i === 0 ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', textAlign: 'center', margin: '-24px 0 0', letterSpacing: '0.3px' }}>{monthLabel}</span>

                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginTop: '4px' }}>
                    {WEEK_DAYS.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.3px', paddingBottom: '4px' }}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`e-${idx}`} />;
                      const ds = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayWorkouts = workoutsByDate[ds] || [];
                      const hasWorkout = dayWorkouts.length > 0;
                      const isToday = ds === todayStr();
                      return (
                        <div key={ds}
                          onClick={() => openLogger(ds)}
                          title={hasWorkout ? dayWorkouts.map(w => w.type).join(', ') : 'Log workout for this day'}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '2px', aspectRatio: '1', borderRadius: '8px', cursor: 'pointer',
                            background: hasWorkout ? 'rgba(255,255,255,0.03)' : 'transparent',
                            border: '1px solid transparent', transition: 'all 0.12s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = hasWorkout ? 'rgba(255,255,255,0.03)' : 'transparent'; e.currentTarget.style.border = '1px solid transparent'; }}
                        >
                          <span style={{
                            fontSize: '11px', fontWeight: isToday ? '800' : '400',
                            color: isToday ? '#000' : 'rgba(255,255,255,0.75)',
                            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '50%', background: isToday ? '#fff' : 'transparent', lineHeight: 1
                          }}>{day}</span>
                          {hasWorkout && (
                            <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {dayWorkouts.slice(0, 3).map((w, i) => (
                                <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: TYPE_DOT_COLOR[w.type] || 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Type legend */}
                  {Object.entries(TYPE_DOT_COLOR).filter(([k]) => workouts.some(w => w.type === k)).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      {Object.entries(TYPE_DOT_COLOR).filter(([k]) => workouts.some(w => w.type === k)).map(([type, color]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── History ── */}
              <div style={{ ...cardStyle, gap: '14px', padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                    <Clock size={15} /> session history.
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{filteredWorkouts.length} logged</span>
                    {/* Plus button in history header too */}
                    <button onClick={() => openLogger(todayStr())}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      <Plus size={12} /> new
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--colors-stone)' }} />
                  <input type="text" placeholder="search by split, exercise, date..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="hollow-glass-input"
                    style={{ padding: '7px 10px 7px 30px', fontSize: '11px', width: '100%', boxSizing: 'border-box' }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '11px' }}>clear</button>
                  )}
                </div>

                {/* Workout cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: isMobile ? 'none' : '560px', paddingRight: '4px', flex: 1 }}>
                  {filteredWorkouts.length === 0 ? (
                    <div style={{ color: 'var(--colors-stone)', fontSize: '12px', textAlign: 'center', padding: '48px 12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px', background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                      <Dumbbell size={28} style={{ opacity: 0.2 }} />
                      {searchQuery ? 'no workouts match your search.' : 'no workouts logged yet.'}
                      {!searchQuery && (
                        <button onClick={() => openLogger(todayStr())}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        >
                          <Plus size={13} /> log your first workout
                        </button>
                      )}
                    </div>
                  ) : filteredWorkouts.map(w => {
                    const isExpanded = !!expandedWorkouts[w.id];
                    let vol = 0;
                    (w.exercises || []).forEach(ex => (ex.sets || []).forEach(s => { vol += (s.weight || 0) * (s.reps || 0); }));
                    const dotColor = TYPE_DOT_COLOR[w.type] || 'rgba(255,255,255,0.4)';
                    return (
                      <div key={w.id} style={{ background: 'rgba(0,0,0,0.14)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'border-color 0.15s' }}>
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
                            <button onClick={() => setSharingWorkout(w)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Share2 size={12} />
                            </button>
                            <button onClick={() => handleEditWorkout(w)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => toggleExpand(w.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <button onClick={() => handleDeleteWorkout(w.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,69,58,0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {w.notes && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '7px', borderLeft: '2px solid rgba(255,255,255,0.07)' }}>{w.notes}</div>
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
                                            mg === 'Cardio' ? (
                                              <div key={si} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '3px 7px', fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '3px' }}>#{si + 1}</span>
                                                <b>{s.distance}</b>km in <b>{s.duration}</b>m ({formatPace(s.duration, s.distance)})
                                              </div>
                                            ) : (
                                              <div key={si} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '3px 7px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.75)' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '3px' }}>#{si + 1}</span>
                                                <b>{s.weight}</b>kg×<b>{s.reps}</b>r
                                              </div>
                                            )
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

            {/* Chart — full width */}
            <div style={{ ...cardStyle, padding: '20px 24px', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                  <TrendingUp size={15} /> volume &amp; focus correlation.
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
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgba(255,255,255,0.08)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="rgba(255,255,255,0.08)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}kg`} />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} domain={[1,5]} ticks={[1,2,3,4,5]} tickFormatter={v => `F:${v}`} />
                      <Tooltip contentStyle={{ background: 'rgba(15,15,17,0.96)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                      <Area yAxisId="left" type="monotone" dataKey="volume" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVol)" name="Volume" />
                      <Line yAxisId="right" type="monotone" dataKey="focus" stroke="#ffffff" strokeWidth={2} dot={{ r: 2.5, fill: '#0f0f11', strokeWidth: 1.5 }} activeDot={{ r: 4 }} name="Focus" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'cardio' ? (
          <>
            {/* Cardio Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '12px' }}>
              {[
                { icon: <Activity size={18} />, label: 'Total Distance', value: `${cardioStats.totalDistance.toLocaleString()} km` },
                { icon: <Clock size={18} />, label: 'Total Time', value: `${cardioStats.totalDuration} min` },
                { icon: <TrendingUp size={18} />, label: 'Avg Pace', value: cardioStats.avgPace > 0 ? formatPace(cardioStats.avgPace, 1) : '—' },
                { icon: <Heart size={18} />, label: 'Avg Heart Rate', value: cardioStats.avgHeartRate > 0 ? `${cardioStats.avgHeartRate} bpm` : '—' },
                { icon: <Flame size={18} />, label: 'Calories Burned', value: `${cardioStats.totalCalories.toLocaleString()} kcal` }
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

            {/* 2-Column: Trend Chart + History */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '20px', alignItems: 'stretch' }}>
              {/* Left Column: Cardio Trend Chart */}
              <div style={{ ...cardStyle, padding: '20px 24px', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                    <TrendingUp size={15} /> cardio volume &amp; pace trend.
                  </h3>
                  <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>last 10 sessions</span>
                </div>
                <div style={{ height: '240px', width: '100%', marginTop: '12px' }}>
                  {cardioTrendData.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-stone)', fontSize: '11px' }}>
                      log cardio sessions to see the trend.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={cardioTrendData} margin={{ top: 8, right: -10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d2d3" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#00d2d3" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}km`} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.25)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${v}m/k`} />
                        <Tooltip contentStyle={{ background: 'rgba(15,15,17,0.96)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff', fontSize: '11px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                        <Area yAxisId="left" type="monotone" dataKey="distance" stroke="#00d2d3" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDist)" name="Distance" />
                        <Line yAxisId="right" type="monotone" dataKey="pace" stroke="#bf5af2" strokeWidth={2} dot={{ r: 2.5, fill: '#0f0f11', strokeWidth: 1.5 }} activeDot={{ r: 4 }} name="Pace" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Right Column: Cardio Sessions list */}
              <div style={{ ...cardStyle, gap: '14px', padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase', margin: 0 }}>
                    <Activity size={15} /> cardio history.
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{filteredCardioWorkouts.length} logged</span>
                    <button onClick={() => {
                      setWorkoutType('Cardio');
                      setWorkoutDuration(30);
                      setWorkoutFocus(3);
                      setWorkoutNotes('');
                      setExercisesList([{ id: generateUniqueId('ex'), name: '', muscleGroup: 'Cardio', sets: [{ id: generateUniqueId('set'), distance: '', duration: '', heartRate: '', calories: '' }] }]);
                      setLoggerOpen(true);
                    }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600' }}
                    >
                      <Plus size={12} /> new
                    </button>
                  </div>
                </div>

                {/* Cardio list cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '560px', paddingRight: '4px', flex: 1 }}>
                  {filteredCardioWorkouts.length === 0 ? (
                    <div style={{ color: 'var(--colors-stone)', fontSize: '12px', textAlign: 'center', padding: '48px 12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px', background: 'rgba(0,0,0,0.1)' }}>
                      no cardio workouts logged yet.
                    </div>
                  ) : filteredCardioWorkouts.map(w => {
                    const isExpanded = !!expandedWorkouts[w.id];
                    let totalDist = 0;
                    (w.exercises || []).forEach(ex => {
                      if (ex.muscleGroup === 'Cardio') {
                        (ex.sets || []).forEach(s => { totalDist += parseFloat(s.distance) || 0; });
                      }
                    });
                    return (
                      <div key={w.id} style={{ background: 'rgba(0,0,0,0.14)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }} onClick={() => toggleExpand(w.id)}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d2d3', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#fff', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{w.date}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '1px 7px', borderRadius: '5px', textTransform: 'lowercase' }}>{w.type}</span>
                            <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{w.duration}m</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span className="mono" style={{ fontSize: '10px', color: '#00d2d3', fontWeight: '700' }}>{totalDist.toFixed(1)}km</span>
                            <button onClick={() => setSharingWorkout(w)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Share2 size={12} />
                            </button>
                            <button onClick={() => handleEditWorkout(w)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => toggleExpand(w.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <button onClick={() => handleDeleteWorkout(w.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,69,58,0.6)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {w.notes && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '7px', borderLeft: '2px solid rgba(255,255,255,0.07)' }}>{w.notes}</div>
                        )}
                        {isExpanded && w.exercises?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            {w.exercises.map((ex, idx) => (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{ex.name.toLowerCase()}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  {(ex.sets || []).map((s, si) => (
                                    <div key={si} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>
                                        <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '6px' }}>#{si + 1}</span>
                                        <b>{s.distance}</b> km in <b>{s.duration}</b> min
                                      </span>
                                      <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>
                                        pace: <b style={{ color: '#00d2d3' }}>{formatPace(s.duration, s.distance)}</b>
                                        {s.heartRate > 0 && ` | HR: ${s.heartRate} bpm`}
                                        {s.calories > 0 && ` | ${s.calories} kcal`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>plan name</label>
                      <input type="text" placeholder="e.g. Push Day, Upper Power" className="hollow-glass-input"
                        style={{ padding: '9px 10px', fontSize: '13px' }} value={planName} onChange={e => setPlanName(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>exercises</label>
                        <button type="button" onClick={handleAddPlanExercise}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                        ><Plus size={10} /> add exercise</button>
                      </div>

                      {/* Column headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 44px 44px 24px', gap: '6px' }}>
                        {['exercise name', 'muscle', 'sets', 'reps', ''].map((h, i) => (
                          <span key={i} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
                        {planExercises.map(ex => (
                          <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 44px 44px 24px', gap: '6px', alignItems: 'center' }}>
                            <input type="text" value={ex.name} onChange={e => handlePlanExChange(ex.id, 'name', e.target.value)}
                              placeholder="Exercise name" className="hollow-glass-input" style={{ padding: '7px 9px', fontSize: '12px' }} />
                            <select value={ex.muscleGroup || 'Chest'} onChange={e => handlePlanExChange(ex.id, 'muscleGroup', e.target.value)}
                              className="hollow-glass-input" style={{ padding: '7px 4px', fontSize: '10px', background: '#0f0f11', color: '#fff' }}>
                              {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                            </select>
                            <input type="number" value={ex.targetSets} onChange={e => handlePlanExChange(ex.id, 'targetSets', e.target.value)}
                              placeholder="—" className="hollow-glass-input" style={{ padding: '7px 4px', fontSize: '11px', textAlign: 'center' }} min="1" max="20" />
                            <input type="number" value={ex.targetReps} onChange={e => handlePlanExChange(ex.id, 'targetReps', e.target.value)}
                              placeholder="—" className="hollow-glass-input" style={{ padding: '7px 4px', fontSize: '11px', textAlign: 'center' }} min="1" max="100" />
                            {planExercises.length > 1
                              ? <button onClick={() => handleRemovePlanExercise(ex.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,69,58,0.7)', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                              : <div />
                            }
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                        Sets &amp; reps are optional targets. Pre-populates set rows when you log from this plan.
                      </p>
                    </div>

                    <button onClick={handleSavePlan} style={{ background: '#fff', border: 'none', color: '#000', padding: '10px 16px', fontWeight: '700', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13px', marginTop: '4px', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    ><Save size={14} /> {editingPlanId ? 'Save Changes' : 'Save Template'}</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '48px 12px', textAlign: 'center', flex: 1 }}>
                  <Dumbbell size={32} style={{ opacity: 0.2 }} />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>workout plan builder.</h4>
                    <p style={{ fontSize: '11px', color: 'var(--colors-stone)', maxWidth: '240px', margin: '0 auto', lineHeight: '1.5' }}>
                      create structured templates with optional sets × reps targets. log sessions in one click.
                    </p>
                  </div>
                  <button onClick={() => { setEditingPlanId(null); setPlanName(''); setPlanExercises([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]); setShowAddPlan(true); }}
                    style={{ background: '#fff', border: 'none', color: '#000', padding: '9px 18px', fontWeight: '700', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  ><Plus size={13} /> Create Plan Template</button>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: isMobile ? 'none' : '640px', paddingRight: '4px', flex: 1 }}>
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
                      <button onClick={() => handleLogUsingPlan(plan)} style={{ background: '#fff', border: 'none', borderRadius: '8px', padding: '6px 13px', fontSize: '11px', fontWeight: '700', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      ><Plus size={12} /> Log Session</button>
                    </div>

                    {/* Exercises grouped */}
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
                      ><Edit3 size={10} /> edit</button>
                      <button onClick={() => handleDeletePlan(plan.id)} style={{ background: 'rgba(255,69,58,0.08)', border: 'none', color: '#ff453a', borderRadius: '8px', padding: '5px 10px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,58,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,69,58,0.08)'}
                      ><Trash2 size={10} /> delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {sharingWorkout && (
        <div className="hollow-drawer-backdrop" onClick={() => setSharingWorkout(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="hollow-drawer-container" onClick={e => e.stopPropagation()} style={{ width: '420px', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff', textTransform: 'lowercase' }}>share workout.</h3>
              <button onClick={() => setSharingWorkout(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div
                id="workout-showcase-card"
                style={{
                  width: '360px',
                  minHeight: '360px',
                  background: sharingWorkout.type === 'Cardio'
                    ? 'radial-gradient(circle at 100% 0%, rgba(0, 210, 211, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b'
                    : 'radial-gradient(circle at 100% 0%, rgba(84, 160, 255, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  color: '#fff',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                <div style={{
                  position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%',
                  background: sharingWorkout.type === 'Cardio' ? '#00d2d3' : '#bf5af2',
                  opacity: 0.15, filter: 'blur(30px)', pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>training session</span>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '2px 0 0 0', textTransform: 'lowercase' }}>{sharingWorkout.type} day.</h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>{sharingWorkout.date}</span>
                    <div style={{ fontSize: '9px', color: 'var(--colors-stone)', marginTop: '2px' }}>{sharingWorkout.duration} mins</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                  {(sharingWorkout.exercises || []).map((ex, idx) => {
                    const isCardioEx = ex.muscleGroup === 'Cardio';
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{ex.name.toLowerCase()}</span>
                          <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>
                            {isCardioEx ? 'cardio' : `${ex.sets.length} set${ex.sets.length > 1 ? 's' : ''}`}
                          </span>
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(ex.sets || []).map((s, si) => (
                            <span key={si} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '5px', padding: '2px 5px', fontSize: '9.5px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>
                              {isCardioEx 
                                ? `${s.distance}km in ${s.duration}m`
                                : `${s.weight}kg × ${s.reps}`
                              }
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: '800' }}>hollow.</span>
                  </div>
                  {sharingWorkout.focusRating && (
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Zap size={8} style={{ fill: '#fff' }} /> Focus: {sharingWorkout.focusRating}/5
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                const cardEl = document.getElementById('workout-showcase-card');
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
                  link.download = `hollow_workout_${sharingWorkout.date}_${sharingWorkout.type.toLowerCase()}.png`;
                  link.href = imgData;
                  link.click();
                  setSharingWorkout(null);
                });
              }}
              style={{ background: '#fff', border: 'none', color: '#000', borderRadius: '12px', padding: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={16} /> export showcase image
            </button>
          </div>
        </div>
      )}
    </>
  );
}
