import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { 
  Plus, Trash2, Dumbbell, Clock, Activity, Zap, 
  ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function MobileTrainingJournalView({ addToast, onBack }) {
  const workouts = useLiveQuery(() => db.workouts.toArray()) || [];

  // Local state for logging workout
  const [showAddWorkout, setShowAddWorkout] = useState(false);
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
  const [exercisesList, setExercisesList] = useState(() => {
    const draft = localStorage.getItem('hollow_workout_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.exercisesList) return parsed.exercisesList;
      } catch (e) {}
    }
    return [
      { id: 1, name: '', sets: [{ id: 101, weight: '', reps: '' }] }
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
          totalSets += (ex.sets || []).length;
          (ex.sets || []).forEach(s => {
            totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
          });
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
        date: w.date.slice(5),
        volume: vol
      };
    });
  }, [workouts]);

  // Add exercise to builder
  const handleAddExercise = () => {
    setExercisesList(prev => [
      ...prev,
      { id: Date.now(), name: '', sets: [{ id: Date.now() + 1, weight: '', reps: '' }] }
    ]);
  };

  // Add set to builder exercise
  const handleAddSet = (exerciseId) => {
    setExercisesList(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: [...ex.sets, { id: Date.now(), weight: '', reps: '' }]
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

    const newWorkout = {
      id: `wo-${Date.now()}`,
      date: workoutDate,
      type: workoutType,
      duration: workoutDuration,
      focusRating: workoutFocus,
      notes: workoutNotes.trim(),
      exercises: valid.map(ex => ({
        name: ex.name.trim(),
        sets: ex.sets.map(s => ({
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0
        }))
      }))
    };

    try {
      await db.workouts.add(newWorkout);
      addToast('Workout logged.', 'success');
      setShowAddWorkout(false);
      // Reset form
      setWorkoutNotes('');
      setWorkoutDuration(60);
      setWorkoutFocus(3);
      setExercisesList([{ id: 1, name: '', sets: [{ id: 101, weight: '', reps: '' }] }]);
    } catch (err) {
      addToast('Failed to save workout.', 'error');
    }
  };

  const handleResetWorkoutForm = () => {
    if (confirm('Are you sure you want to clear the active workout draft?')) {
      localStorage.removeItem('hollow_workout_draft');
      setWorkoutNotes('');
      setWorkoutFocus(3);
      setWorkoutDuration(60);
      setWorkoutType('Push');
      setWorkoutDate(new Date().toISOString().split('T')[0]);
      setExercisesList([
        {
          id: 1,
          name: '',
          sets: [{ id: 101, weight: '', reps: '' }]
        }
      ]);
    }
  };

  // Delete workout log
  const handleDeleteWorkout = async (id) => {
    try {
      await db.workouts.delete(id);
      addToast('Workout deleted.', 'success');
    } catch (err) {
      addToast('Delete failed.', 'error');
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{ paddingTop: 'calc(var(--safe-top) + 8px)', paddingLeft: '16px', paddingRight: '16px', paddingBottom: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>training journal.</h1>
          </div>
          <button
            onClick={() => setShowAddWorkout(true)}
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
        </div>
      </div>

      {/* Scrollable contents */}
      <div className="scroll-area" style={{ flex: 1, padding: '0 16px 100px' }}>
        
        {/* KPI Summary Rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Workouts</span>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{stats.count}</div>
          </div>
          <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Volume</span>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(1)}k` : stats.volume}</div>
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
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workout Logs</span>
          {workouts.length > 0 ? (
            [...workouts].sort((a,b) => b.date.localeCompare(a.date)).map(w => {
              const expanded = !!expandedWorkouts[w.id];
              let vol = 0;
              let setsCount = 0;
              w.exercises.forEach(ex => {
                setsCount += ex.sets.length;
                ex.sets.forEach(s => vol += s.weight * s.reps);
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
                        {w.date} · {vol.toLocaleString()} lbs volume ({setsCount} sets)
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
                          {w.exercises.map((ex, exIdx) => (
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
                                    Set {sIdx + 1}: {s.weight} lbs × {s.reps}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          
                          {w.notes && (
                            <div style={{ marginTop: 4, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                              {w.notes}
                            </div>
                          )}

                          <button
                            onClick={() => handleDeleteWorkout(w.id)}
                            style={{
                              alignSelf: 'flex-end',
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
                              cursor: 'pointer',
                              marginTop: 4
                            }}
                          >
                            <Trash2 size={12} />
                            Delete Workout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '40px 0', textCenter: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
              No workouts logged yet.
            </div>
          )}
        </div>
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
                <span style={{ fontSize: 17, fontWeight: 700, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>Log Workout</span>
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
                    <button 
                      onClick={handleAddExercise}
                      style={{ background: 'none', border: 'none', color: '#bf5af2', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                      <Plus size={14} /> Add Ex
                    </button>
                  </div>

                  {exercisesList.map((ex, exIdx) => (
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
                          placeholder="Exercise name (e.g. Bench Press)"
                          className="ios-input"
                          style={{ flex: 1, padding: '8px 10px' }}
                        />
                        {exercisesList.length > 1 && (
                          <button onClick={() => handleRemoveExercise(ex.id)} style={{ background: 'none', border: 'none', color: '#ff453a', padding: 4 }}>
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {/* Sets list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ex.sets.map((set, setIdx) => (
                          <div key={set.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 36 }}>Set {setIdx + 1}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={set.weight}
                              onChange={e => handleSetChange(ex.id, set.id, 'weight', e.target.value)}
                              placeholder="Lbs"
                              className="ios-input"
                              style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                            />
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>×</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.reps}
                              onChange={e => handleSetChange(ex.id, set.id, 'reps', e.target.value)}
                              placeholder="Reps"
                              className="ios-input"
                              style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                            />
                            {ex.sets.length > 1 && (
                              <button onClick={() => handleRemoveSet(ex.id, set.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)' }}>
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
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
                  ))}
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
                  Save Workout Log
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
