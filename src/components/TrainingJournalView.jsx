import React, { useState, useMemo, useEffect } from 'react';
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
  Search
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

export default function TrainingJournalView() {
  const isMobile = useUIStore(state => state.isMobile);

  // 1. Reactive query to fetch workouts from Dexie
  const workouts = useLiveQuery(async () => {
    return await db.workouts.toArray();
  }, []) || [];

  // Local state for logging a new workout
  const [workoutDate, setWorkoutDate] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutDate) return parsed.workoutDate;
      } catch (e) {}
    }
    return new Date().toISOString().split('T')[0];
  });
  const [workoutType, setWorkoutType] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutType) return parsed.workoutType;
      } catch (e) {}
    }
    return 'Push';
  });
  const [workoutDuration, setWorkoutDuration] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutDuration !== undefined) return parsed.workoutDuration;
      } catch (e) {}
    }
    return 60;
  });
  const [workoutFocus, setWorkoutFocus] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutFocus !== undefined) return parsed.workoutFocus;
      } catch (e) {}
    }
    return 3;
  });
  const [workoutNotes, setWorkoutNotes] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.workoutNotes !== undefined) return parsed.workoutNotes;
      } catch (e) {}
    }
    return '';
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Exercises list structure: [{ id: Date.now(), name: '', sets: [{ id: Date.now()+1, weight: '', reps: '' }] }]
  const [exercisesList, setExercisesList] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.exercisesList) return parsed.exercisesList;
      } catch (e) {}
    }
    return [
      {
        id: 1,
        name: '',
        sets: [{ id: 101, weight: '', reps: '' }]
      }
    ];
  });

  useEffect(() => {
    const draft = {
      workoutDate,
      workoutType,
      workoutDuration,
      workoutFocus,
      workoutNotes,
      exercisesList
    };
    localStorage.setItem('hollow_workout_draft', JSON.stringify(draft));
  }, [workoutDate, workoutType, workoutDuration, workoutFocus, workoutNotes, exercisesList]);

  // Expanded workouts states in history
  const [expandedWorkouts, setExpandedWorkouts] = useState({});

  // 2. Compute stats from workout logs
  const workoutStats = useMemo(() => {
    let totalWorkouts = workouts.length;
    let totalSets = 0;
    let totalVolume = 0; // sum of (weight * reps) for all sets
    let totalFocus = 0;
    let focusCount = 0;

    workouts.forEach(w => {
      if (w.exercises && Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
          if (ex.sets && Array.isArray(ex.sets)) {
            totalSets += ex.sets.length;
            ex.sets.forEach(set => {
              const weightVal = parseFloat(set.weight) || 0;
              const repsVal = parseInt(set.reps) || 0;
              totalVolume += weightVal * repsVal;
            });
          }
        });
      }
      if (w.focusRating !== undefined && w.focusRating > 0) {
        totalFocus += w.focusRating;
        focusCount++;
      }
    });

    const avgFocus = focusCount > 0 ? parseFloat((totalFocus / focusCount).toFixed(1)) : 0;

    return {
      totalWorkouts,
      totalSets,
      totalVolume,
      avgFocus
    };
  }, [workouts]);

  // 3. Prepare data for Volume & Focus Correlation Trend Chart (last 10 workouts)
  const trendData = useMemo(() => {
    const sorted = [...workouts]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10);
    return sorted.map(w => {
      let volume = 0;
      if (w.exercises) {
        w.exercises.forEach(ex => {
          if (ex.sets) {
            ex.sets.forEach(s => {
              volume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            });
          }
        });
      }
      return {
        date: w.date.split('-').slice(1).join('/'), // format date as MM/DD
        volume,
        focus: w.focusRating || 3, // default to 3 if not present
        type: w.type
      };
    });
  }, [workouts]);

  // Expand/collapse a workout in history
  const toggleExpand = (id) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Add a new exercise row
  const handleAddExercise = () => {
    setExercisesList(prev => [
      ...prev,
      {
        id: Date.now(),
        name: '',
        sets: [{ id: Date.now() + 10, weight: '', reps: '' }]
      }
    ]);
  };

  // Remove an exercise row
  const handleRemoveExercise = (exId) => {
    setExercisesList(prev => prev.filter(ex => ex.id !== exId));
  };

  // Update exercise name
  const handleExerciseNameChange = (exId, name) => {
    setExercisesList(prev => prev.map(ex => ex.id === exId ? { ...ex, name } : ex));
  };

  // Add a set to a specific exercise
  const handleAddSet = (exId) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: [...ex.sets, { id: Date.now(), weight: '', reps: '' }]
        };
      }
      return ex;
    }));
  };

  // Remove a set from an exercise
  const handleRemoveSet = (exId, setId) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId)
        };
      }
      return ex;
    }));
  };

  // Update set details
  const handleSetChange = (exId, setId, field, val) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s)
        };
      }
      return ex;
    }));
  };

  // Save workout to DB
  const handleSaveWorkout = async (e) => {
    e.preventDefault();

    // Validation: filter empty exercise names
    const validExercises = exercisesList
      .filter(ex => ex.name.trim() !== '')
      .map(ex => ({
        name: ex.name,
        sets: ex.sets.map(s => ({
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0
        }))
      }));

    if (validExercises.length === 0) {
      setSaveStatus('add at least one exercise name.');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setSaveStatus('saving...');
    try {
      await db.workouts.add({
        id: 'w-' + Date.now(),
        date: workoutDate,
        type: workoutType,
        duration: parseInt(workoutDuration) || 0,
        notes: workoutNotes,
        exercises: validExercises,
        focusRating: parseInt(workoutFocus) || 3
      });

      setSaveStatus('workout logged!');
      
      // Clear draft
      localStorage.removeItem('hollow_workout_draft');

      // Reset form
      setWorkoutNotes('');
      setWorkoutFocus(3);
      setExercisesList([
        {
          id: 1,
          name: '',
          sets: [{ id: 101, weight: '', reps: '' }]
        }
      ]);
      
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      console.error(err);
      setSaveStatus('save failed.');
    }
  };

  // Delete a workout from DB
  const handleDeleteWorkout = async (id) => {
    if (confirm('Are you sure you want to delete this workout entry?')) {
      try {
        await db.workouts.delete(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filtered and sorted workouts
  const filteredWorkouts = useMemo(() => {
    const sorted = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(w => {
      const typeMatch = w.type?.toLowerCase().includes(q);
      const notesMatch = w.notes?.toLowerCase().includes(q);
      const dateMatch = w.date?.toLowerCase().includes(q);
      const exerciseMatch = w.exercises?.some(ex => ex.name?.toLowerCase().includes(q));
      return typeMatch || notesMatch || dateMatch || exerciseMatch;
    });
  }, [workouts, searchQuery]);

  const commonExercisePresets = [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Overhead Press',
    'Pull Up',
    'Barbell Row',
    'Dumbbell Curl',
    'Leg Press'
  ];

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
      
      {/* Header Info */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1 style={{ textTransform: 'lowercase' }}>
            <Dumbbell size={28} color="#ffffff" /> training journal.
          </h1>
          <p>
            correlate weight lifting volume, physical training consistency and mental ready-state.
          </p>
        </div>
      </div>

      {/* 1. Quick Stats Rollups */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        <div className="hollow-card" style={{ 
          background: '#0f0f11',
          border: '1px solid #1c1c1e',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Dumbbell size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
              Total Workouts
            </div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {workoutStats.totalWorkouts}
            </div>
          </div>
        </div>

        <div className="hollow-card" style={{ 
          background: '#0f0f11',
          border: '1px solid #1c1c1e',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
              Sets Completed
            </div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {workoutStats.totalSets}
            </div>
          </div>
        </div>

        <div className="hollow-card" style={{ 
          background: '#0f0f11',
          border: '1px solid #1c1c1e',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
              Volume Lifted
            </div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {workoutStats.totalVolume.toLocaleString()} kg
            </div>
          </div>
        </div>

        <div className="hollow-card" style={{ 
          background: '#0f0f11',
          border: '1px solid #1c1c1e',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
              Avg Mental Focus
            </div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {workoutStats.avgFocus > 0 ? `${workoutStats.avgFocus} / 5` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Volume & Focus Correlation Trend Chart */}
      <div className="hollow-card" style={{ 
        padding: '20px 24px', 
        background: '#0f0f11', 
        border: '1px solid #1c1c1e', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase' }}>
            <TrendingUp size={16} /> volume & focus correlation.
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>last 10 workouts</span>
        </div>
        <div style={{ height: '180px', width: '100%' }}>
          {trendData.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--colors-stone)', fontSize: '12px' }}>
              log workouts to populate the correlation trend chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: -10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(255, 255, 255, 0.08)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="rgba(255, 255, 255, 0.08)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}kg`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(v) => `F:${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 15, 17, 0.96)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                  cursor={{ stroke: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="volume" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVolume)" name="Volume" />
                <Line yAxisId="right" type="monotone" dataKey="focus" stroke="#ffffff" strokeWidth={2} dot={{ r: 3, fill: '#0f0f11', strokeWidth: 1.5 }} activeDot={{ r: 5 }} name="Focus Score" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Main content split panel */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5.5fr 6.5fr', gap: '24px', alignItems: 'stretch' }}>
        
        {/* LEFT COLUMN: Log a new session */}
        <div className="hollow-card" style={{
          padding: '24px',
          background: '#0f0f11',
          border: '1px solid #1c1c1e',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase' }}>
              <Plus size={16} color="#ffffff" /> log workout session.
            </h3>
            {saveStatus && (
              <span style={{ 
                fontSize: '11px', 
                color: '#fff', 
                fontFamily: 'var(--font-mono)',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                {saveStatus}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'lowercase' }}>date</label>
                <input 
                  type="date" 
                  className="hollow-glass-input" 
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'lowercase' }}>split / type</label>
                <select 
                  className="hollow-glass-input" 
                  style={{ padding: '8px 10px', fontSize: '13px', background: 'var(--colors-surface-deep)' }}
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                >
                  <option value="Push">push</option>
                  <option value="Pull">pull</option>
                  <option value="Legs">legs</option>
                  <option value="Cardio">cardio</option>
                  <option value="Full Body">full body</option>
                  <option value="Other">other</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'lowercase' }}>minutes</label>
                <input 
                  type="number" 
                  placeholder="e.g., 60"
                  className="hollow-glass-input" 
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            {/* NEW: Mental Focus slider buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'lowercase' }}>
                mental focus & energy (trading readiness)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((val) => {
                  const labels = ['fatigued', 'sluggish', 'normal', 'sharp', 'unstoppable'];
                  const isSelected = workoutFocus === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWorkoutFocus(val)}
                      style={{
                        background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#000000' : '#ffffff',
                        borderRadius: '8px',
                        padding: '8px 2px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{val}</span>
                      <span style={{ fontSize: '8px', opacity: isSelected ? 0.9 : 0.45, fontWeight: 'normal' }}>
                        {labels[val - 1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercises Builder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
                  Exercises & Sets
                </label>
                <button
                  type="button"
                  onClick={handleAddExercise}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                >
                  <Plus size={11} /> add exercise
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {exercisesList.map((ex, exIndex) => (
                  <div 
                    key={ex.id} 
                    style={{ 
                      background: 'rgba(0,0,0,0.15)', 
                      border: '1px solid rgba(255, 255, 255, 0.04)', 
                      padding: '14px', 
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="exercise name (e.g. bench press)" 
                          className="hollow-glass-input" 
                          style={{ padding: '6px 10px', fontSize: '12px', flex: 1 }}
                          value={ex.name}
                          onChange={(e) => handleExerciseNameChange(ex.id, e.target.value)}
                          required
                        />
                        {exercisesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(ex.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255,69,58,0.8)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* NEW: Clickable Presets Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {commonExercisePresets.map(presetName => (
                          <button
                            key={presetName}
                            type="button"
                            onClick={() => handleExerciseNameChange(ex.id, presetName)}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.45)',
                              borderRadius: '6px',
                              padding: '2px 6px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              transition: 'all 0.1s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                            }}
                          >
                            + {presetName.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sets List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ex.sets.map((set, setIndex) => (
                        <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                          <span style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', width: '32px', flexShrink: 0 }}>
                            S{setIndex + 1}
                          </span>
                          <input 
                            type="number" 
                            placeholder="weight" 
                            className="hollow-glass-input" 
                            style={{ padding: '5px 8px', fontSize: '11px', textAlign: 'center', flex: 1, minWidth: '40px' }}
                            value={set.weight}
                            onChange={(e) => handleSetChange(ex.id, set.id, 'weight', e.target.value)}
                            min="0"
                            step="0.5"
                            required
                          />
                          <span style={{ fontSize: '11px', color: 'var(--colors-stone)', flexShrink: 0 }}>kg</span>
                          <input 
                            type="number" 
                            placeholder="reps" 
                            className="hollow-glass-input" 
                            style={{ padding: '5px 8px', fontSize: '11px', textAlign: 'center', flex: 1, minWidth: '40px' }}
                            value={set.reps}
                            onChange={(e) => handleSetChange(ex.id, set.id, 'reps', e.target.value)}
                            min="1"
                            required
                          />
                          <span style={{ fontSize: '11px', color: 'var(--colors-stone)', flexShrink: 0 }}>reps</span>
                          
                          {ex.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(ex.id, set.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.35)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '4px',
                                flexShrink: 0
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSet(ex.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '2px 4px',
                        marginTop: '2px'
                      }}
                    >
                      + Add Set
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'lowercase' }}>session notes</label>
              <textarea 
                placeholder="performance details, sleep status, mental state..."
                className="hollow-glass-input"
                style={{ minHeight: '60px', padding: '10px', fontSize: '12px' }}
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              style={{
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                padding: '10px 16px',
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
                marginTop: '4px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e5e5e5';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <Check size={14} /> Log Workout
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: History logs list */}
        <div className="hollow-card" style={{
          padding: '24px',
          background: '#0f0f11',
          border: '1px solid #1c1c1e',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'lowercase' }}>
              <Clock size={16} color="#ffffff" /> gym session history.
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>{filteredWorkouts.length} logged</span>
          </div>

          {/* NEW: Filter Searchbar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--colors-stone)' }} />
            <input
              type="text"
              placeholder="search workouts, exercises, notes, split type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="hollow-glass-input"
              style={{
                padding: '8px 12px 8px 34px',
                fontSize: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                clear
              </button>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            overflowY: 'auto', 
            maxHeight: '680px', 
            paddingRight: '4px',
            flex: 1
          }}>
            {filteredWorkouts.length === 0 ? (
              <div style={{ 
                color: 'var(--colors-stone)', 
                fontSize: '13px', 
                textAlign: 'center', 
                padding: '48px 12px',
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: '16px',
                background: 'rgba(0,0,0,0.1)'
              }}>
                No workouts match your current filter query.
              </div>
            ) : (
              filteredWorkouts.map(w => {
                const isExpanded = !!expandedWorkouts[w.id];
                
                // Calculate volume for this workout
                let workoutVolume = 0;
                w.exercises.forEach(ex => {
                  ex.sets.forEach(s => {
                    workoutVolume += (s.weight || 0) * (s.reps || 0);
                  });
                });

                return (
                  <div 
                    key={w.id} 
                    style={{ 
                      background: 'rgba(0, 0, 0, 0.15)', 
                      border: '1px solid rgba(255, 255, 255, 0.04)', 
                      borderRadius: '16px', 
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div 
                        onClick={() => toggleExpand(w.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      >
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'lowercase'
                        }}>
                          {w.type}
                        </span>
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                          {w.date}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
                          ({w.duration} mins)
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600' }} className="mono">
                          vol: {workoutVolume.toLocaleString()} kg
                        </span>

                        {w.focusRating !== undefined && (
                          <span style={{
                            fontSize: '10px',
                            color: 'rgba(255, 255, 255, 0.8)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Zap size={9} style={{ fill: '#fff' }} /> f:{w.focusRating}
                          </span>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => toggleExpand(w.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--colors-stone)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteWorkout(w.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255, 69, 58, 0.8)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {w.notes && (
                      <div style={{ fontSize: '11.5px', color: 'var(--colors-on-dark-mute)', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '8px', borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
                        {w.notes}
                      </div>
                    )}

                    {/* Expandable Exercise Details */}
                    {isExpanded && w.exercises && (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                        paddingTop: '12px',
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}>
                        {w.exercises.map((ex, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                                {ex.name.toLowerCase()}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>
                                {ex.sets.length} set{ex.sets.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            
                            {/* Render sets in an inline grid */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {ex.sets.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '10px',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'rgba(255,255,255,0.8)'
                                  }}
                                >
                                  <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: '4px' }}>#{sIdx + 1}</span>
                                  <span style={{ fontWeight: '600' }}>{s.weight}</span>kg × <span style={{ fontWeight: '600' }}>{s.reps}</span>r
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
