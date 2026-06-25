import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { 
  Plus, Trash2, ChevronLeft, ChevronRight, X, 
  ChevronDown, ChevronUp, Save, Edit3, Share2, Download, Heart, Search, Zap, Clock, TrendingUp, Activity, Flame, Target, Dumbbell
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ComposedChart, Line, CartesianGrid } from 'recharts';

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

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatPace = (durationMinutes, distanceKm) => {
  if (!durationMinutes || !distanceKm) return '—';
  const totalSeconds = Math.round((durationMinutes / distanceKm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
};

const generateUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const isDraftEmpty = (draft) => {
  if (!draft) return true;
  const hasNotes = !!(draft.workoutNotes && draft.workoutNotes.trim());
  const hasMultipleEx = draft.exercisesList && draft.exercisesList.length > 1;
  const hasExName = draft.exercisesList && draft.exercisesList.some(ex => ex.name && ex.name.trim());
  const hasSetData = draft.exercisesList && draft.exercisesList.some(ex => 
    ex.sets && ex.sets.some(s => s.weight || s.reps)
  );
  return !draft.editingWorkoutId && !hasNotes && !hasMultipleEx && !hasExName && !hasSetData;
};

export default function MobileTrainingJournalView({ addToast, onBack }) {
  const rawWorkouts = useLiveQuery(() => db.workouts.toArray());
  const workouts = useMemo(() => rawWorkouts || [], [rawWorkouts]);

  const getLastSessionSets = (exerciseName) => {
    if (!exerciseName || !exerciseName.trim()) return null;
    const nameLower = exerciseName.trim().toLowerCase();
    const sortedWorkouts = [...workouts]
      .filter(w => w.date < workoutDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    for (const w of sortedWorkouts) {
      const matchingEx = (w.exercises || []).find(ex => ex.name.trim().toLowerCase() === nameLower);
      if (matchingEx && matchingEx.sets && matchingEx.sets.length > 0) {
        return matchingEx.sets;
      }
    }
    return null;
  };

  // Selected Date for the main training journal view (null means "show all logs")
  const [selectedJournalDate, setSelectedJournalDate] = useState(() => getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [sharingWorkout, setSharingWorkout] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Calendar navigation states
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

  const workoutsByDate = useMemo(() => {
    const map = {};
    workouts.forEach(w => {
      if (!map[w.date]) map[w.date] = [];
      map[w.date].push(w);
    });
    return map;
  }, [workouts]);

  const shiftJournalDate = (dir) => {
    if (!selectedJournalDate) return;
    const [y, m, d] = selectedJournalDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + dir);
    setSelectedJournalDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );
  };

  // Workout Plans States
  const rawWorkoutPlans = useLiveQuery(() => db.workoutPlans ? db.workoutPlans.toArray() : []);
  const workoutPlans = useMemo(() => rawWorkoutPlans || [], [rawWorkoutPlans]);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'plans'

  // Plan Creator Bottom Sheet States
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planExercises, setPlanExercises] = useState([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);

  const handleAddPlanExercise = () => {
    setPlanExercises(prev => [
      ...prev,
      { id: generateUniqueId('ex'), name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }
    ]);
  };

  const handleRemovePlanExercise = (id) => {
    setPlanExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handlePlanExerciseNameChange = (id, name) => {
    setPlanExercises(prev => prev.map(ex => ex.id === id ? { ...ex, name } : ex));
  };

  const handlePlanExerciseMuscleChange = (id, muscleGroup) => {
    setPlanExercises(prev => prev.map(ex => ex.id === id ? { ...ex, muscleGroup } : ex));
  };

  const handlePlanExerciseTargetChange = (id, field, value) => {
    setPlanExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      addToast('Plan name is required.', 'error');
      return;
    }
    const valid = planExercises.filter(ex => ex.name.trim());
    if (valid.length === 0) {
      addToast('Add at least one exercise.', 'error');
      return;
    }

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
        await db.workoutPlans.put({
          ...planData,
          id: editingPlanId
        });
        addToast('Plan updated.', 'success');
      } else {
        await db.workoutPlans.add({
          ...planData,
          id: generateUniqueId('plan')
        });
        addToast('Plan created.', 'success');
      }
      setShowAddPlan(false);
      setEditingPlanId(null);
      setPlanName('');
      setPlanExercises([{ id: 1, name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);
    } catch {
      addToast('Failed to save plan.', 'error');
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanExercises((plan.exercises || []).map((ex) => ({
      id: generateUniqueId('ex-plan'),
      name: ex.name,
      muscleGroup: ex.muscleGroup || 'Other',
      targetSets: ex.targetSets || '',
      targetReps: ex.targetReps || ''
    })));
    setShowAddPlan(true);
  };

  const handleDeletePlan = async (id) => {
    if (confirm('Are you sure you want to delete this workout plan?')) {
      try {
        await db.workoutPlans.delete(id);
        addToast('Plan deleted.', 'success');
      } catch {
        addToast('Failed to delete plan.', 'error');
      }
    }
  };

  const handleLogUsingPlan = (plan) => {
    setEditingWorkoutId(null);
    setWorkoutDate(selectedJournalDate || getTodayDateString());
    setWorkoutType(plan.name);
    setWorkoutDuration(60);
    setWorkoutFocus(3);
    setWorkoutNotes('');
    setExercisesList(plan.exercises.map((ex, idx) => ({
      id: `ex-plan-log-${Date.now()}-${idx}-${Math.random()}`,
      name: ex.name,
      muscleGroup: ex.muscleGroup || 'Other',
      sets: Array.from({ length: ex.targetSets || 1 }, (_, si) => ({
        id: `set-plan-log-${Date.now()}-${idx}-${si}-${Math.random()}`,
        weight: '',
        reps: ex.targetReps ? String(ex.targetReps) : ''
      }))
    })));
    setShowAddWorkout(true);
  };

  // Local state for logging/editing workout
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.editingWorkoutId) return parsed.editingWorkoutId;
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [workoutDate, setWorkoutDate] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutDate) return parsed.workoutDate;
      } catch {
        // ignore
      }
    }
    return getTodayDateString();
  });
  const [workoutType, setWorkoutType] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutType) return parsed.workoutType;
      } catch {
        // ignore
      }
    }
    return 'Push';
  });
  const [workoutDuration, setWorkoutDuration] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutDuration !== undefined) return parsed.workoutDuration;
      } catch {
        // ignore
      }
    }
    return 60;
  });
  const [workoutFocus, setWorkoutFocus] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutFocus !== undefined) return parsed.workoutFocus;
      } catch {
        // ignore
      }
    }
    return 3;
  });
  const [workoutNotes, setWorkoutNotes] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutNotes !== undefined) return parsed.workoutNotes;
      } catch {
        // ignore
      }
    }
    return '';
  });
  const [exercisesList, setExercisesList] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.exercisesList) return parsed.exercisesList;
      } catch {
        // ignore
      }
    }
    return [
      { id: 1, name: '', muscleGroup: 'Chest', sets: [{ id: 101, weight: '', reps: '' }] }
    ];
  });

  useEffect(() => {
    const draft = {
      editingWorkoutId,
      workoutDate,
      workoutType,
      workoutDuration,
      workoutFocus,
      workoutNotes,
      exercisesList
    };
    localStorage.setItem('hollow_workout_draft', JSON.stringify(draft));
  }, [editingWorkoutId, workoutDate, workoutType, workoutDuration, workoutFocus, workoutNotes, exercisesList]);

  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  // Compute workout stats
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;
    let totalFocus = 0;
    
    workouts.forEach(w => {
      totalFocus += w.focusRating || 0;
      if (w.exercises) {
        w.exercises.forEach(ex => {
          if (ex.muscleGroup !== 'Cardio') {
            totalSets += (ex.sets || []).length;
            (ex.sets || []).forEach(s => {
              totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            });
          }
        });
      }
    });

    const avgFocus = workouts.length > 0 ? (totalFocus / workouts.length).toFixed(1) : '0';

    return {
      count: workouts.length,
      sets: totalSets,
      volume: totalVolume,
      focus: avgFocus
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

  // Volume trend data (last 8 workouts)
  const trendData = useMemo(() => {
    const sorted = [...workouts]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-8);

    return sorted.map(w => {
      let vol = 0;
      if (w.exercises) {
        w.exercises.forEach(ex => {
          (ex.sets || []).forEach(s => {
            vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
          });
        });
      }
      return {
        date: w.date.slice(5).replace('-', '/'),
        volume: vol
      };
    });
  }, [workouts]);

  const cardioTrendData = useMemo(() => {
    const list = [...workouts]
      .filter(w => w.type === 'Cardio' || w.exercises?.some(ex => ex.muscleGroup === 'Cardio'))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-8);
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
        date: w.date.slice(5).replace('-', '/'),
        distance: totalDist,
        pace: paceVal,
        duration: totalTime
      };
    });
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    let result = sorted;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.type?.toLowerCase().includes(q) || w.notes?.toLowerCase().includes(q) ||
        w.date?.includes(q) || w.exercises?.some(ex => ex.name?.toLowerCase().includes(q))
      );
    } else if (selectedJournalDate) {
      result = result.filter(w => w.date === selectedJournalDate);
    }
    return result;
  }, [workouts, searchQuery, selectedJournalDate]);

  const filteredCardioWorkouts = useMemo(() => {
    const sorted = [...workouts]
      .filter(w => w.type === 'Cardio' || w.exercises?.some(ex => ex.muscleGroup === 'Cardio'))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(w =>
      w.type?.toLowerCase().includes(q) || w.notes?.toLowerCase().includes(q) ||
      w.date?.includes(q) || w.exercises?.some(ex => ex.name?.toLowerCase().includes(q))
    );
  }, [workouts, searchQuery]);

  // Add exercise to builder
  const handleAddExercise = () => {
    setExercisesList(prev => [
      ...prev,
      { id: generateUniqueId('ex'), name: '', muscleGroup: 'Chest', sets: [{ id: generateUniqueId('set'), weight: '', reps: '' }] }
    ]);
  };

  const handleExerciseMuscleGroupChange = (id, muscleGroup) => {
    setExercisesList(prev => prev.map(ex => ex.id === id ? { ...ex, muscleGroup } : ex));
  };

  // Add set to builder exercise
  const handleAddSet = (exerciseId) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: [...ex.sets, { id: generateUniqueId('set'), weight: '', reps: '' }]
        };
      }
      return ex;
    }));
  };

  // Remove set from builder exercise
  const handleRemoveSet = (exerciseId, setId) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.length > 1 ? ex.sets.filter(s => s.id !== setId) : ex.sets
        };
      }
      return ex;
    }));
  };

  // Remove exercise from builder
  const handleRemoveExercise = (id) => {
    setExercisesList(prev => prev.filter(ex => ex.id !== id));
  };

  // Handle exercise builder changes
  const handleExerciseNameChange = (id, name) => {
    setExercisesList(prev => prev.map(ex => ex.id === id ? { ...ex, name } : ex));
  };

  const handleSetChange = (exerciseId, setId, field, val) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s)
        };
      }
      return ex;
    }));
  };

  // Save workout log to db
  const handleSaveWorkout = async () => {
    const valid = exercisesList.filter(ex => ex.name.trim());
    if (valid.length === 0) {
      addToast('Add at least one exercise.', 'error');
      return;
    }

    const workoutData = {
      date: workoutDate,
      type: workoutType,
      duration: workoutDuration,
      focusRating: workoutFocus,
      notes: workoutNotes.trim(),
      exercises: valid.map(ex => {
        const isCardio = ex.muscleGroup === 'Cardio';
        return {
          name: ex.name.trim(),
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
      })
    };

    try {
      if (editingWorkoutId) {
        await db.workouts.put({
          ...workoutData,
          id: editingWorkoutId
        });
        addToast('Workout updated.', 'success');
      } else {
        await db.workouts.add({
          ...workoutData,
          id: generateUniqueId('wo')
        });
        addToast('Workout logged.', 'success');
      }
      
      setShowAddWorkout(false);
      setEditingWorkoutId(null);
      
      // Clear draft & Reset form
      localStorage.removeItem('hollow_workout_draft');
      setWorkoutNotes('');
      setWorkoutDuration(60);
      setWorkoutFocus(3);
      setExercisesList([{ id: 1, name: '', muscleGroup: 'Chest', sets: [{ id: 101, weight: '', reps: '' }] }]);
    } catch {
      addToast('Failed to save workout.', 'error');
    }
  };

  const handleResetWorkoutForm = () => {
    if (confirm('Are you sure you want to clear the active workout draft?')) {
      localStorage.removeItem('hollow_workout_draft');
      setEditingWorkoutId(null);
      setWorkoutNotes('');
      setWorkoutFocus(3);
      setWorkoutDuration(60);
      setWorkoutType('Push');
      setWorkoutDate(selectedJournalDate || getTodayDateString());
      setExercisesList([
        {
          id: 1,
          name: '',
          muscleGroup: 'Chest',
          sets: [{ id: 101, weight: '', reps: '' }]
        }
      ]);
    }
  };

  const handleEditWorkout = (workout) => {
    setEditingWorkoutId(workout.id);
    setWorkoutDate(workout.date);
    setWorkoutType(workout.type);
    setWorkoutDuration(workout.duration);
    setWorkoutFocus(workout.focusRating);
    setWorkoutNotes(workout.notes || '');
    
    // Map exercises with unique React IDs for the builder
    const mappedEx = (workout.exercises || []).map((ex, exIdx) => {
      const isCardio = ex.muscleGroup === 'Cardio';
      return {
        id: `ex-${Date.now()}-${exIdx}-${Math.random()}`,
        name: ex.name,
        muscleGroup: ex.muscleGroup || 'Other',
        sets: (ex.sets || []).map((s, sIdx) => {
          if (isCardio) {
            return {
              id: `set-${Date.now()}-${exIdx}-${sIdx}-${Math.random()}`,
              distance: s.distance !== undefined ? s.distance : '',
              duration: s.duration !== undefined ? s.duration : '',
              heartRate: s.heartRate !== undefined ? s.heartRate : '',
              calories: s.calories !== undefined ? s.calories : ''
            };
          } else {
            return {
              id: `set-${Date.now()}-${exIdx}-${sIdx}-${Math.random()}`,
              weight: s.weight !== undefined ? s.weight : '',
              reps: s.reps !== undefined ? s.reps : ''
            };
          }
        })
      };
    });
    
    setExercisesList(mappedEx);
    setShowAddWorkout(true);
  };

  // Delete workout log
  const handleDeleteWorkout = async (id) => {
    try {
      await db.workouts.delete(id);
      addToast('Workout deleted.', 'success');
    } catch {
      addToast('Delete failed.', 'error');
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{ paddingTop: 'calc(var(--safe-top) + 8px)', paddingLeft: '16px', paddingRight: '16px', paddingBottom: 10, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>training journal.</h1>
          </div>
          {activeTab === 'logs' || activeTab === 'cardio' ? (
            <button
              onClick={() => {
                let draftObj = null;
                try {
                  const raw = localStorage.getItem('hollow_workout_draft');
                  if (raw) draftObj = JSON.parse(raw);
                } catch {
                  // ignore
                }

                if (isDraftEmpty(draftObj) || activeTab === 'cardio') {
                  setEditingWorkoutId(null);
                  setWorkoutDate(selectedJournalDate || getTodayDateString());
                  setWorkoutType(activeTab === 'cardio' ? 'Cardio' : 'Push');
                  setWorkoutDuration(60);
                  setWorkoutFocus(3);
                  setWorkoutNotes('');
                  setExercisesList([{
                    id: generateUniqueId('ex'),
                    name: '',
                    muscleGroup: activeTab === 'cardio' ? 'Cardio' : 'Chest',
                    sets: activeTab === 'cardio' 
                      ? [{ id: generateUniqueId('set'), distance: '', duration: '', heartRate: '', calories: '' }]
                      : [{ id: generateUniqueId('set'), weight: '', reps: '' }]
                  }]);
                }
                setShowAddWorkout(true);
              }}
              style={{
                background: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 700,
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Plus size={14} />
              Log
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingPlanId(null);
                setPlanName('');
                setPlanExercises([{ id: generateUniqueId('ex-plan'), name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);
                setShowAddPlan(true);
              }}
              style={{
                background: '#bf5af2',
                border: 'none',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Plus size={14} />
              New Plan
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
          {[['logs', 'Logs'], ['cardio', 'Cardio'], ['plans', 'Plans']].map(([id, label]) => (
            <button 
              key={id}
              onClick={() => {
                setActiveTab(id);
                setSearchQuery('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 14,
                fontWeight: 700,
                padding: '6px 0',
                borderBottom: activeTab === id ? '2.5px solid #bf5af2' : 'none'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Bar (Logs & Cardio tabs) */}
        {(activeTab === 'logs' || activeTab === 'cardio') && (
          <div style={{ position: 'relative', marginTop: 10, flexShrink: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              placeholder="Search workouts, exercises..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#0f0f11',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '8px 12px 8px 30px',
                fontSize: 13,
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable contents */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px 16px 100px' }}>
        
        {activeTab === 'logs' ? (
          <>
            {/* Collapsible Month Calendar Block */}
            <div style={{
              background: '#0f0f11',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 12,
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div 
                onClick={() => setShowCalendar(!showCalendar)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  {selectedJournalDate 
                    ? `Logs: ${new Date(selectedJournalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : 'Showing All Logs'
                  }
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedJournalDate && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedJournalDate(null); }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#bf5af2', fontWeight: 600 }}
                    >
                      Show All
                    </button>
                  )}
                  {showCalendar ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                </div>
              </div>

              {showCalendar && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', padding: 4, display: 'flex', alignItems: 'center' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{monthLabel}</span>
                    <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', padding: 4, display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginTop: 4 }}>
                    {WEEK_DAYS.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{d}</div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={`e-${idx}`} />;
                      const ds = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayWorkouts = workoutsByDate[ds] || [];
                      const hasWorkout = dayWorkouts.length > 0;
                      const isToday = ds === getTodayDateString();
                      const isSelected = ds === selectedJournalDate;

                      return (
                        <div 
                          key={ds}
                          onClick={() => { setSelectedJournalDate(ds); }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            aspectRatio: '1',
                            borderRadius: 8,
                            background: isSelected 
                              ? '#bf5af2' 
                              : hasWorkout 
                                ? 'rgba(255,255,255,0.04)' 
                                : 'transparent',
                            border: isToday && !isSelected ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{
                            fontSize: 11,
                            fontWeight: isToday || isSelected ? '800' : '400',
                            color: isSelected ? '#000' : 'rgba(255,255,255,0.75)',
                          }}>{day}</span>
                          {hasWorkout && !isSelected && (
                            <div style={{ display: 'flex', gap: 1.5, justifyContent: 'center', marginTop: 1 }}>
                              {dayWorkouts.slice(0, 3).map((w, i) => (
                                <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: TYPE_DOT_COLOR[w.type] || 'rgba(255,255,255,0.5)' }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* KPI Summary Rows */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Workouts</span>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{stats.count}</div>
              </div>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Volume</span>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(1)}k` : stats.volume} kg</div>
              </div>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Avg Focus</span>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{stats.focus}/5</div>
              </div>
            </div>

            {/* Volume Trend Chart */}
            {trendData.length > 0 && (
              <div style={{
                background: '#0f0f11',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                height: 180,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Volume Trend</span>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#bf5af2" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#bf5af2" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                      <Tooltip contentStyle={{ background: '#1c1c1e', borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Area type="monotone" dataKey="volume" stroke="#bf5af2" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Workouts History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {selectedJournalDate 
                  ? `Workout Logs for ${selectedJournalDate}` 
                  : searchQuery 
                    ? `Search Results (${filteredWorkouts.length})`
                    : `Session History (${filteredWorkouts.length})`
                }
              </span>
              {filteredWorkouts.length > 0 ? (
                filteredWorkouts.map(w => {
                  const expanded = !!expandedWorkouts[w.id];
                  let vol = 0;
                  let setsCount = 0;
                  let cardioDist = 0;
                  let hasCardio = false;

                  (w.exercises || []).forEach(ex => {
                    if (ex.muscleGroup === 'Cardio') {
                      hasCardio = true;
                      (ex.sets || []).forEach(s => {
                        cardioDist += parseFloat(s.distance) || 0;
                      });
                    } else {
                      setsCount += (ex.sets || []).length;
                      (ex.sets || []).forEach(s => vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0));
                    }
                  });

                  return (
                    <div 
                      key={w.id}
                      style={{
                        background: '#0f0f11',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        onClick={() => setExpandedWorkouts(p => ({ ...p, [w.id]: !expanded }))}
                        style={{
                          padding: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.type} Session</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>· {w.duration}m</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            {hasCardio 
                              ? `${cardioDist.toFixed(1)} km distance`
                              : `${vol.toLocaleString()} kg volume (${setsCount} sets)`
                            }
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: '#bf5af2', fontWeight: 600 }}>Focus: {w.focusRating}/5</span>
                          {expanded ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}
                          >
                            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {(() => {
                                const groups = {};
                                (w.exercises || []).forEach(ex => {
                                  const mg = ex.muscleGroup || 'Other';
                                  if (!groups[mg]) groups[mg] = [];
                                  groups[mg].push(ex);
                                });
                                
                                const sortedGroups = Object.keys(groups).sort();
                                return sortedGroups.map(mg => (
                                  <div key={mg} style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{mg}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 6 }}>
                                      {groups[mg].map((ex, exIdx) => (
                                        <div key={exIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{ex.name}</span>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {ex.sets.map((s, sIdx) => (
                                              <div 
                                                key={sIdx}
                                                style={{
                                                  background: 'rgba(255,255,255,0.04)',
                                                  borderRadius: 6,
                                                  padding: '4px 8px',
                                                  fontSize: 11,
                                                  color: 'rgba(255,255,255,0.7)',
                                                  border: '1px solid rgba(255,255,255,0.03)'
                                                }}
                                              >
                                                {ex.muscleGroup === 'Cardio'
                                                  ? `Set ${sIdx + 1}: ${s.distance} km in ${s.duration} min (${formatPace(s.duration, s.distance)})`
                                                  : `Set ${sIdx + 1}: ${s.weight} kg × ${s.reps}`
                                                }
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ));
                              })()}
                              
                              {w.notes && (
                                <div style={{ marginTop: 4, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                  {w.notes}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                                <button
                                  onClick={() => setSharingWorkout(w)}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Share2 size={12} />
                                  Share
                                </button>
                                <button
                                  onClick={() => handleEditWorkout(w)}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit3 size={12} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkout(w.id)}
                                  style={{
                                    background: 'rgba(255,69,58,0.1)',
                                    border: 'none',
                                    color: '#ff453a',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '30px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                  No workouts logged for this day.
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'cardio' ? (
          <>
            {/* Cardio Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Total Distance</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{cardioStats.totalDistance.toLocaleString()} km</span>
              </div>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Total Time</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{cardioStats.totalDuration} min</span>
              </div>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Avg Pace</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{cardioStats.avgPace > 0 ? formatPace(cardioStats.avgPace, 1) : '—'}</span>
              </div>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Avg Heart Rate</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{cardioStats.avgHeartRate > 0 ? `${cardioStats.avgHeartRate} bpm` : '—'}</span>
              </div>
              <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, gridColumn: 'span 2' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Calories Burned</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{cardioStats.totalCalories.toLocaleString()} kcal</span>
              </div>
            </div>

            {/* Cardio Trend Chart */}
            {cardioTrendData.length > 0 && (
              <div style={{
                background: '#0f0f11',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                height: 180,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cardio Volume & Pace</span>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cardioTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCardioDist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00d2d3" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#00d2d3" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                      <Tooltip contentStyle={{ background: '#1c1c1e', borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Area type="monotone" dataKey="distance" stroke="#00d2d3" strokeWidth={2} fillOpacity={1} fill="url(#colorCardioDist)" name="Distance (km)" />
                      <Line type="monotone" dataKey="pace" stroke="#bf5af2" strokeWidth={2.5} dot={{ r: 3 }} name="Pace (min/km)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Cardio Sessions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cardio History ({filteredCardioWorkouts.length})
              </span>
              {filteredCardioWorkouts.length > 0 ? (
                filteredCardioWorkouts.map(w => {
                  const expanded = !!expandedWorkouts[w.id];
                  let totalDist = 0;
                  (w.exercises || []).forEach(ex => {
                    if (ex.muscleGroup === 'Cardio') {
                      (ex.sets || []).forEach(s => {
                        totalDist += parseFloat(s.distance) || 0;
                      });
                    }
                  });

                  return (
                    <div 
                      key={w.id}
                      style={{
                        background: '#0f0f11',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        onClick={() => setExpandedWorkouts(p => ({ ...p, [w.id]: !expanded }))}
                        style={{
                          padding: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.type} Session</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>· {w.duration}m</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                            {totalDist.toFixed(1)} km distance
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: '#00d2d3', fontWeight: 600 }}>Focus: {w.focusRating}/5</span>
                          {expanded ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}
                          >
                            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {(w.exercises || []).map((ex, exIdx) => (
                                <div key={exIdx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{ex.name}</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {(ex.sets || []).map((s, sIdx) => (
                                      <div 
                                        key={sIdx}
                                        style={{
                                          background: 'rgba(255,255,255,0.04)',
                                          borderRadius: 8,
                                          padding: '8px 10px',
                                          fontSize: 11,
                                          color: 'rgba(255,255,255,0.85)',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          border: '1px solid rgba(255,255,255,0.03)'
                                        }}
                                      >
                                        <span>
                                          <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>#{sIdx + 1}</span>
                                          <b>{s.distance}</b> km in <b>{s.duration}</b> min
                                        </span>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                                          pace: <b style={{ color: '#00d2d3' }}>{formatPace(s.duration, s.distance)}</b>
                                          {s.heartRate > 0 && ` | HR: ${s.heartRate} bpm`}
                                          {s.calories > 0 && ` | ${s.calories} kcal`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              {w.notes && (
                                <div style={{ padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                  {w.notes}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                                <button
                                  onClick={() => setSharingWorkout(w)}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Share2 size={12} />
                                  Share
                                </button>
                                <button
                                  onClick={() => handleEditWorkout(w)}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit3 size={12} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkout(w.id)}
                                  style={{
                                    background: 'rgba(255,69,58,0.1)',
                                    border: 'none',
                                    color: '#ff453a',
                                    borderRadius: 8,
                                    padding: '6px 12px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '30px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                  No cardio sessions logged.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Workout Plans list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Your Workout Plans ({workoutPlans.length})
            </span>
            {workoutPlans.length > 0 ? (
              workoutPlans.map(plan => (
                <div 
                  key={plan.id}
                  style={{
                    background: '#0f0f11',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{plan.name}</h3>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {plan.exercises ? plan.exercises.length : 0} exercises
                      </span>
                    </div>
                    <button
                      onClick={() => handleLogUsingPlan(plan)}
                      style={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} /> Log Session
                    </button>
                  </div>

                  {/* Exercises grouped by muscle group */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.01)', borderRadius: 10, padding: 10 }}>
                    {(() => {
                      const groups = {};
                      (plan.exercises || []).forEach(ex => {
                        const mg = ex.muscleGroup || 'Other';
                        if (!groups[mg]) groups[mg] = [];
                        groups[mg].push(ex);
                      });
                      return Object.keys(groups).sort().map(mg => (
                        <div key={mg} style={{ fontSize: 12 }}>
                          <span style={{ color: '#bf5af2', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, marginRight: 6 }}>{mg}:</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                            {groups[mg].map(ex => {
                              if (ex.targetSets && ex.targetReps) {
                                return `${ex.name} (${ex.targetSets}×${ex.targetReps})`;
                              }
                              return ex.name;
                            }).join(', ')}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={() => handleEditPlan(plan)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer'
                      }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      style={{
                        background: 'rgba(255,69,58,0.1)',
                        border: 'none',
                        color: '#ff453a',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}>
                You haven't created any workout plans yet. Create one to easily pre-fill your logs!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Workout Bottom Sheet */}
      <AnimatePresence>
        {showAddWorkout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddWorkout(false)}
            className="bottom-sheet-overlay"
            style={{ zIndex: 1200 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={e => e.stopPropagation()}
              className="bottom-sheet"
              style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '85vh', overflow: 'hidden' }}
            >
              <div className="sheet-handle" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative', height: 28, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleResetWorkoutForm}
                  style={{ background: 'none', border: 'none', color: '#ff453a', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Reset
                </button>
                <span style={{ fontSize: 17, fontWeight: 700, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>{editingWorkoutId ? 'Edit Workout' : 'Log Workout'}</span>
                <button type="button" onClick={() => setShowAddWorkout(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Form Scroll Area */}
              <div className="scroll-area" style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Date</label>
                  <input type="date" value={workoutDate} onChange={e => setWorkoutDate(e.target.value)} className="ios-input" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Split</label>
                    <select value={workoutType} onChange={e => setWorkoutType(e.target.value)} className="ios-input">
                      {['Push', 'Pull', 'Legs', 'Cardio', 'Full Body', 'Other'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Duration (mins)</label>
                    <input type="number" inputMode="numeric" value={workoutDuration} onChange={e => setWorkoutDuration(parseInt(e.target.value) || 0)} className="ios-input" />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Focus Rating ({workoutFocus}/5)</label>
                  <input type="range" min="1" max="5" value={workoutFocus} onChange={e => setWorkoutFocus(parseInt(e.target.value))} className="ios-slider" />
                </div>

                {/* Exercises Builder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Exercises</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {workoutPlans.length > 0 && (
                        <select
                          onChange={e => {
                            const planId = e.target.value;
                            if (!planId) return;
                            const plan = workoutPlans.find(p => p.id === planId);
                            if (plan && confirm(`Load plan "${plan.name}"? This will overwrite the current exercise builder.`)) {
                              setExercisesList(plan.exercises.map((ex, idx) => ({
                                id: `ex-plan-${Date.now()}-${idx}-${Math.random()}`,
                                name: ex.name,
                                muscleGroup: ex.muscleGroup || 'Other',
                                sets: Array.from({ length: ex.targetSets || 1 }, (_, si) => ({
                                  id: `set-plan-${Date.now()}-${idx}-${si}-${Math.random()}`,
                                  weight: '',
                                  reps: ex.targetReps ? String(ex.targetReps) : ''
                                }))
                              })));
                              setWorkoutType(plan.name);
                            }
                            e.target.value = '';
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: 'none',
                            color: '#bf5af2',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 6,
                            padding: '2px 6px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">Load Plan...</option>
                          {workoutPlans.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                      <button 
                        onClick={handleAddExercise}
                        style={{ background: 'none', border: 'none', color: '#bf5af2', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                      >
                        <Plus size={14} /> Add Ex
                      </button>
                    </div>
                  </div>

                  {exercisesList.map((ex) => {
                    const isCardio = ex.muscleGroup === 'Cardio';
                    return (
                      <div 
                        key={ex.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={ex.name}
                            onChange={e => handleExerciseNameChange(ex.id, e.target.value)}
                            placeholder="Exercise name (e.g. Run)"
                            className="ios-input"
                            style={{ flex: 1, padding: '8px 10px' }}
                          />
                          <select
                            value={ex.muscleGroup || 'Chest'}
                            onChange={e => handleExerciseMuscleGroupChange(ex.id, e.target.value)}
                            className="ios-input"
                            style={{ width: 90, padding: '8px 4px', fontSize: 12, flexShrink: 0 }}
                          >
                            {MUSCLE_GROUPS.map(mg => (
                              <option key={mg} value={mg}>{mg}</option>
                            ))}
                          </select>
                          {exercisesList.length > 1 && (
                            <button onClick={() => handleRemoveExercise(ex.id)} style={{ background: 'none', border: 'none', color: '#ff453a', padding: 4, flexShrink: 0 }}>
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {/* Sets list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const prevSets = getLastSessionSets(ex.name);
                            return ex.sets.map((set, setIdx) => {
                              const prevSet = prevSets && prevSets[setIdx];
                              if (isCardio) {
                                const distVal = parseFloat(set.distance) || 0;
                                const durVal = parseFloat(set.duration) || 0;
                                const paceStr = formatPace(durVal, distVal);
                                return (
                                  <div key={set.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Set {setIdx + 1}</span>
                                      {ex.sets.length > 1 && (
                                        <button onClick={() => handleRemoveSet(ex.id, set.id)} style={{ background: 'none', border: 'none', color: '#ff453a', fontSize: 11 }}>
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          placeholder="Distance"
                                          value={set.distance || ''}
                                          onChange={e => handleSetChange(ex.id, set.id, 'distance', e.target.value)}
                                          className="ios-input"
                                          style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                                        />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>km</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          placeholder="Duration"
                                          value={set.duration || ''}
                                          onChange={e => handleSetChange(ex.id, set.id, 'duration', e.target.value)}
                                          className="ios-input"
                                          style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                                        />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>min</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          placeholder="Heart Rate"
                                          value={set.heartRate || ''}
                                          onChange={e => handleSetChange(ex.id, set.id, 'heartRate', e.target.value)}
                                          className="ios-input"
                                          style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                                        />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>bpm</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          placeholder="Calories"
                                          value={set.calories || ''}
                                          onChange={e => handleSetChange(ex.id, set.id, 'calories', e.target.value)}
                                          className="ios-input"
                                          style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                                        />
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>kcal</span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>pace: <b style={{ color: '#00d2d3' }}>{paceStr}</b></span>
                                      {prevSet && (
                                        <span style={{ color: '#bf5af2', opacity: 0.85 }}>
                                          last: {prevSet.distance}km in {prevSet.duration}m
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={set.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', width: 42, flexShrink: 0 }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Set {setIdx + 1}</span>
                                    {prevSet && (
                                      <span style={{ fontSize: 8, color: '#bf5af2', whiteSpace: 'nowrap' }}>
                                        Last: {prevSet.weight}×{prevSet.reps}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={set.weight}
                                    onChange={e => handleSetChange(ex.id, set.id, 'weight', e.target.value)}
                                    placeholder={prevSet ? String(prevSet.weight) : "kg"}
                                    className="ios-input"
                                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                                  />
                                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>×</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={set.reps}
                                    onChange={e => handleSetChange(ex.id, set.id, 'reps', e.target.value)}
                                    placeholder={prevSet ? String(prevSet.reps) : "reps"}
                                    className="ios-input"
                                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                                  />
                                  {ex.sets.length > 1 && (
                                    <button onClick={() => handleRemoveSet(ex.id, set.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)' }}>
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            });
                          })()}
                          <button
                            onClick={() => handleAddSet(ex.id)}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 6,
                              padding: '4px 0',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              marginTop: 4
                            }}
                          >
                            + Add Set
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Notes</label>
                  <textarea
                    value={workoutNotes}
                    onChange={e => setWorkoutNotes(e.target.value)}
                    placeholder="Describe how the workout felt..."
                    className="ios-input ios-textarea"
                    style={{ minHeight: 60 }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div style={{ padding: '0 20px 20px' }}>
                <button
                  onClick={handleSaveWorkout}
                  style={{
                    width: '100%',
                    background: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    padding: 15,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Save size={16} />
                  {editingWorkoutId ? 'Save Changes' : 'Save Workout Log'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Workout Plan Bottom Sheet */}
      <AnimatePresence>
        {showAddPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddPlan(false)}
            className="bottom-sheet-overlay"
            style={{ zIndex: 1200 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={e => e.stopPropagation()}
              className="bottom-sheet"
              style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '80vh', overflow: 'hidden' }}
            >
              <div className="sheet-handle" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative', height: 28, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear this plan template?')) {
                      setPlanName('');
                      setPlanExercises([{ id: generateUniqueId('ex-plan'), name: '', muscleGroup: 'Chest', targetSets: '', targetReps: '' }]);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: '#ff453a', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Clear
                </button>
                <span style={{ fontSize: 17, fontWeight: 700, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                  {editingPlanId ? 'Edit Plan Template' : 'New Plan Template'}
                </span>
                <button type="button" onClick={() => setShowAddPlan(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Form Scroll Area */}
              <div className="scroll-area" style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Plan Name</label>
                  <input 
                    type="text" 
                    value={planName} 
                    onChange={e => setPlanName(e.target.value)} 
                    placeholder="e.g. Push Day, Upper Power" 
                    className="ios-input" 
                  />
                </div>

                {/* Exercises list builder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Exercises</span>
                    <button 
                      onClick={handleAddPlanExercise}
                      style={{ background: 'none', border: 'none', color: '#bf5af2', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                      <Plus size={14} /> Add Ex
                    </button>
                  </div>

                  {planExercises.map((ex) => (
                    <div 
                      key={ex.id}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 12,
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={ex.name}
                          onChange={e => handlePlanExerciseNameChange(ex.id, e.target.value)}
                          placeholder="Exercise name (e.g. Bench Press)"
                          className="ios-input"
                          style={{ flex: 1, padding: '8px 10px' }}
                        />
                        <select
                          value={ex.muscleGroup || 'Chest'}
                          onChange={e => handlePlanExerciseMuscleChange(ex.id, e.target.value)}
                          className="ios-input"
                          style={{ width: 90, padding: '8px 4px', fontSize: 12, flexShrink: 0 }}
                        >
                          {MUSCLE_GROUPS.map(mg => (
                            <option key={mg} value={mg}>{mg}</option>
                          ))}
                        </select>
                        {planExercises.length > 1 && (
                          <button onClick={() => handleRemovePlanExercise(ex.id)} style={{ background: 'none', border: 'none', color: '#ff453a', padding: 4, flexShrink: 0 }}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>sets:</span>
                          <input
                            type="number"
                            placeholder="e.g. 4"
                            value={ex.targetSets || ''}
                            onChange={e => handlePlanExerciseTargetChange(ex.id, 'targetSets', e.target.value)}
                            className="ios-input"
                            style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                          />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>reps:</span>
                          <input
                            type="number"
                            placeholder="e.g. 10"
                            value={ex.targetReps || ''}
                            onChange={e => handlePlanExerciseTargetChange(ex.id, 'targetReps', e.target.value)}
                            className="ios-input"
                            style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div style={{ padding: '0 20px 20px' }}>
                <button
                  onClick={handleSavePlan}
                  style={{
                    width: '100%',
                    background: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    padding: 15,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Save size={16} />
                  {editingPlanId ? 'Save Plan Template' : 'Create Plan Template'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showcase Share Bottom Sheet */}
      <AnimatePresence>
        {sharingWorkout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSharingWorkout(null)}
            className="bottom-sheet-overlay"
            style={{ zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#09090b',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                padding: '20px',
                width: '100%',
                maxWidth: '380px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#fff', textTransform: 'lowercase' }}>share workout.</h3>
                <button onClick={() => setSharingWorkout(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  id="workout-showcase-card"
                  style={{
                    width: '340px',
                    minHeight: '340px',
                    background: sharingWorkout.type === 'Cardio'
                      ? 'radial-gradient(circle at 100% 0%, rgba(0, 210, 211, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b'
                      : 'radial-gradient(circle at 100% 0%, rgba(84, 160, 255, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>training session</span>
                      <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: '2px 0 0 0', textTransform: 'lowercase' }}>{sharingWorkout.type} day.</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>{sharingWorkout.date}</span>
                      <div style={{ fontSize: '8.5px', color: 'var(--colors-stone)', marginTop: '2px' }}>{sharingWorkout.duration} mins</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                    {(sharingWorkout.exercises || []).map((ex, idx) => {
                      const isCardioEx = ex.muscleGroup === 'Cardio';
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{ex.name.toLowerCase()}</span>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>
                              {isCardioEx ? 'cardio' : `${ex.sets.length} set${ex.sets.length > 1 ? 's' : ''}`}
                            </span>
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(ex.sets || []).map((s, si) => (
                              <span key={si} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '5px', padding: '2px 5px', fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>
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

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: '800' }}>hollow.</span>
                    </div>
                    {sharingWorkout.focusRating && (
                      <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

