import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL } from '../utils/tradeMath';
import { 
  ClipboardList, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Clock, 
  Tag, 
  Target, 
  Smile, 
  Award,
  Image as ImageIcon,
  X,
  Brain,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JournalView() {
  const isMobile = useUIStore(state => state.isMobile);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const setIsAddExecutionOpen = useUIStore(state => state.setIsAddExecutionOpen);
  const setSelectedExecutionDetail = useUIStore(state => state.setSelectedExecutionDetail);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState(null);

  // Daily Journal entry state variables
  const [newsChecked, setNewsChecked] = useState(false);
  const [htfAnalysisDone, setHtfAnalysisDone] = useState(false);
  const [liquidityDrawn, setLiquidityDrawn] = useState(false);
  const [dailyOpenMapped, setDailyOpenMapped] = useState(false);

  const [mentalFocus, setMentalFocus] = useState(5);
  const [patienceLevel, setPatienceLevel] = useState(5);
  const [riskAdherence, setRiskAdherence] = useState(5);

  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState('Good');
  const [workoutDone, setWorkoutDone] = useState(false);
  const [dietClean, setDietClean] = useState(false);
  const [meditationDone, setMeditationDone] = useState(false);
  const [homeworkDone, setHomeworkDone] = useState(false);

  const [preMarketNotes, setPreMarketNotes] = useState('');
  const [postMarketNotes, setPostMarketNotes] = useState('');

  // Query dailyJournal for the selected date
  const dailyJournal = useLiveQuery(async () => {
    if (!selectedDate || !db || !db.dailyJournals) return null;
    return await db.dailyJournals.get(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (dailyJournal) {
      setNewsChecked(!!dailyJournal.newsChecked);
      setHtfAnalysisDone(!!dailyJournal.htfAnalysisDone);
      setLiquidityDrawn(!!dailyJournal.liquidityDrawn);
      setDailyOpenMapped(!!dailyJournal.dailyOpenMapped);

      setMentalFocus(dailyJournal.mentalFocus || 5);
      setPatienceLevel(dailyJournal.patienceLevel || 5);
      setRiskAdherence(dailyJournal.riskAdherence || 5);

      setSleepHours(dailyJournal.sleepHours || 8);
      setSleepQuality(dailyJournal.sleepQuality || 'Good');
      setWorkoutDone(!!dailyJournal.workoutDone);
      setDietClean(!!dailyJournal.dietClean);
      setMeditationDone(!!dailyJournal.meditationDone);
      setHomeworkDone(!!dailyJournal.homeworkDone);

      setPreMarketNotes(dailyJournal.preMarketNotes || '');
      setPostMarketNotes(dailyJournal.postMarketNotes || '');
    } else {
      setNewsChecked(false);
      setHtfAnalysisDone(false);
      setLiquidityDrawn(false);
      setDailyOpenMapped(false);

      setMentalFocus(5);
      setPatienceLevel(5);
      setRiskAdherence(5);

      setSleepHours(8);
      setSleepQuality('Good');
      setWorkoutDone(false);
      setDietClean(false);
      setMeditationDone(false);
      setHomeworkDone(false);

      setPreMarketNotes('');
      setPostMarketNotes('');
    }
  }, [dailyJournal, selectedDate]);

  const saveJournal = async (updates = {}) => {
    if (!db || !db.dailyJournals) return;
    const existing = await db.dailyJournals.get(selectedDate) || {};
    const payload = {
      ...existing,
      date: selectedDate,
      newsChecked: updates.newsChecked !== undefined ? updates.newsChecked : newsChecked,
      htfAnalysisDone: updates.htfAnalysisDone !== undefined ? updates.htfAnalysisDone : htfAnalysisDone,
      liquidityDrawn: updates.liquidityDrawn !== undefined ? updates.liquidityDrawn : liquidityDrawn,
      dailyOpenMapped: updates.dailyOpenMapped !== undefined ? updates.dailyOpenMapped : dailyOpenMapped,

      mentalFocus: updates.mentalFocus !== undefined ? updates.mentalFocus : mentalFocus,
      patienceLevel: updates.patienceLevel !== undefined ? updates.patienceLevel : patienceLevel,
      riskAdherence: updates.riskAdherence !== undefined ? updates.riskAdherence : riskAdherence,

      sleepHours: updates.sleepHours !== undefined ? updates.sleepHours : sleepHours,
      sleepQuality: updates.sleepQuality !== undefined ? updates.sleepQuality : sleepQuality,
      workoutDone: updates.workoutDone !== undefined ? updates.workoutDone : workoutDone,
      dietClean: updates.dietClean !== undefined ? updates.dietClean : dietClean,
      meditationDone: updates.meditationDone !== undefined ? updates.meditationDone : meditationDone,
      homeworkDone: updates.homeworkDone !== undefined ? updates.homeworkDone : homeworkDone,

      preMarketNotes: updates.preMarketNotes !== undefined ? updates.preMarketNotes : preMarketNotes,
      postMarketNotes: updates.postMarketNotes !== undefined ? updates.postMarketNotes : postMarketNotes,
      updatedAt: new Date().toISOString()
    };
    await db.dailyJournals.put(payload);
  };

  // Date Shift Helper
  const handleDateShift = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Query trades & executions for selected date
  const dayTrades = useLiveQuery(async () => {
    if (!selectedDate || !db || !db.trades) return [];
    return await db.trades.where('date').equals(selectedDate).toArray();
  }, [selectedDate]) || [];

  const allExecutions = useLiveQuery(async () => {
    if (!db || !db.executions) return [];
    return await db.executions.toArray();
  }, []) || [];

  // Calculate day total PnL and trade count
  const daySummary = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let be = 0;
    let totalR = 0;

    const processedExecIds = new Set();

    dayTrades.forEach(trade => {
      const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
      tradeExecs.forEach(e => processedExecIds.add(e.id));
      const math = calculateTradePnL(trade, tradeExecs);
      totalPnL += math.netPnL;
      if (math.netPnL > 0) wins++;
      else if (math.netPnL < 0) losses++;
      else be++;

      const risk = trade.riskAmount || 200;
      totalR += math.netPnL / risk;
    });

    const dayExecutions = allExecutions.filter(e => e.date === selectedDate || e.id?.includes(selectedDate));
    dayExecutions.forEach(exec => {
      if (processedExecIds.has(exec.id)) return;

      let rVal = 0;
      if (exec.rr !== undefined && exec.rr !== null && exec.rr !== '') {
        const num = parseFloat(String(exec.rr).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) rVal = num;
      } else if ((exec.wl || '').toUpperCase().includes('WIN')) {
        rVal = 2.0;
      } else if ((exec.wl || '').toUpperCase().includes('LOSS')) {
        rVal = -1.0;
      }

      const wlUpper = (exec.wl || '').toUpperCase();
      const isWin = wlUpper.includes('WIN') || rVal > 0;
      const isLoss = wlUpper.includes('LOSS') || rVal < 0;

      totalR += rVal;
      totalPnL += rVal * 200;

      if (isWin) wins++;
      else if (isLoss) losses++;
      else be++;
    });

    const totalCount = wins + losses + be;
    const eligibleCount = wins + losses;
    const winRate = eligibleCount > 0 ? ((wins / eligibleCount) * 100) : 0;

    return {
      totalPnL,
      wins,
      losses,
      be,
      winRate,
      totalCount,
      totalR: totalR.toFixed(2)
    };
  }, [dayTrades, allExecutions, selectedDate]);

  const allDayExecutionsList = useMemo(() => {
    const processedExecIds = new Set();
    const tradeItems = dayTrades.map(trade => {
      const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
      tradeExecs.forEach(e => processedExecIds.add(e.id));
      const pnlDetails = calculateTradePnL(trade, tradeExecs);
      return {
        ...trade,
        ...pnlDetails,
        rawExec: tradeExecs[0] || trade
      };
    });

    const standaloneExecs = allExecutions
      .filter(e => {
        if (processedExecIds.has(e.id)) return false;
        const dateStr = e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0];
        return dateStr === selectedDate;
      })
      .map(e => {
        let rVal = 0;
        if (e.rr !== undefined && e.rr !== null && e.rr !== '') {
          const num = parseFloat(String(e.rr).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) rVal = num;
        } else if ((e.wl || '').toUpperCase().includes('WIN')) {
          rVal = 2.0;
        } else if ((e.wl || '').toUpperCase().includes('LOSS')) {
          rVal = -1.0;
        }
        const netPnL = e.manualPnL !== undefined ? parseFloat(e.manualPnL) : rVal * 200;
        return {
          id: e.id,
          date: e.date || selectedDate,
          symbol: e.symbol || 'NQ',
          direction: (e.bias || 'Long').toUpperCase(),
          bias: e.bias || 'Long',
          model: e.model || 'Standard Setup',
          rating: e.rating || 'A+',
          po3: e.po3 || 'N/A',
          dol: e.dol || 'N/A',
          wl: e.wl || (rVal > 0 ? 'Win' : (rVal < 0 ? 'Loss' : 'BE')),
          rr: e.rr || `${rVal >= 0 ? '+' : ''}${rVal}R`,
          netPnL,
          rawExec: e
        };
      });

    return [...tradeItems, ...standaloneExecs];
  }, [dayTrades, allExecutions, selectedDate]);

  return (
    <div style={{
      height: '100%',
      width: '100%',
      overflowY: 'auto',
      background: '#000000',
      color: '#ffffff',
      padding: isMobile ? '16px' : '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }} className="hollow-menu-scrollbar">

      {/* HEADER & DATE SELECTOR */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Daily Journal
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '4px' }}>
            Clean execution ledger and trade reflections
          </p>
        </div>

        {/* Date Navigation Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDateShift(-1)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '6px 14px'
          }}>
            <Calendar size={14} color="#b86eff" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            style={{
              background: 'rgba(184, 110, 255, 0.15)',
              border: '1px solid #b86eff',
              color: '#fff',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Today
          </button>

          <button
            onClick={() => handleDateShift(1)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* TWO-COLUMN GRID LAYOUT (Optimized for PC split view) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Summary + Journal Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Daily Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            {/* Card 1: R Return */}
            <div style={{
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '80px'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>R Return</span>
              <div style={{ fontSize: '22px', fontWeight: '800', color: parseFloat(daySummary.totalR) > 0.05 ? '#30d158' : (parseFloat(daySummary.totalR) < -0.05 ? '#ff453a' : '#ffffff'), marginTop: '4px' }}>
                {parseFloat(daySummary.totalR) >= 0 ? `+${daySummary.totalR}R` : `${daySummary.totalR}R`}
              </div>
            </div>

            {/* Card 2: Day Win Rate */}
            <div style={{
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '80px'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Day Win Rate</span>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
                {daySummary.winRate.toFixed(1)}%
              </div>
            </div>

            {/* Card 3: Trades Executed */}
            <div style={{
              background: 'var(--colors-surface-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '80px'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Trades Executed</span>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
                {daySummary.totalCount} ({daySummary.wins}W / {daySummary.losses}L)
              </div>
            </div>
          </div>

          {/* Cognitive Mindset & Habits container */}
          <div style={{
            background: 'var(--colors-surface-card)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={20} color="#b86eff" />
                <span style={{ fontSize: '16px', fontWeight: 850, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Daily Journal Details
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} color="#b86eff" /> Auto-saved
              </span>
            </div>

            {/* Sub-section 1: Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Performance Ratings</span>
              
              {[
                { label: 'Mental Focus', val: mentalFocus, set: setMentalFocus, key: 'mentalFocus', icon: '🧠', color: '#b86eff' },
                { label: 'Discipline & Patience', val: patienceLevel, set: setPatienceLevel, key: 'patienceLevel', icon: '🧘', color: '#64d2ff' },
                { label: 'Risk Adherence', val: riskAdherence, set: setRiskAdherence, key: 'riskAdherence', icon: '🛡️', color: '#30d158' }
              ].map(slider => (
                <div key={slider.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                      {slider.icon} {slider.label}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: slider.color }}>
                      {slider.val} / 10
                    </span>
                  </div>
                  <input
                    type="range"
                    className="ios-slider"
                    min="1"
                    max="10"
                    value={slider.val}
                    onChange={e => {
                      slider.set(parseInt(e.target.value));
                    }}
                    onMouseUp={() => saveJournal()}
                    style={{
                      width: '100%',
                      accentColor: slider.color,
                      height: '6px',
                      borderRadius: '3px',
                      background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${((slider.val - 1) / 9) * 100}%, rgba(255, 255, 255, 0.1) ${((slider.val - 1) / 9) * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                      cursor: 'pointer',
                      outline: 'none',
                      border: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Sub-section 2: Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Execution Checklist</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { label: 'News Checked', val: newsChecked, set: setNewsChecked, key: 'newsChecked' },
                  { label: 'HTF Analysis Done', val: htfAnalysisDone, set: setHtfAnalysisDone, key: 'htfAnalysisDone' },
                  { label: 'Liquidity Drawn', val: liquidityDrawn, set: setLiquidityDrawn, key: 'liquidityDrawn' },
                  { label: 'Daily Open Mapped', val: dailyOpenMapped, set: setDailyOpenMapped, key: 'dailyOpenMapped' }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      const updated = !item.val;
                      item.set(updated);
                      saveJournal({ [item.key]: updated });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: item.val ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: item.val ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: item.val ? '#30d158' : 'rgba(255,255,255,0.65)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{item.label}</span>
                    <span>{item.val ? '✓' : '○'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-section 3: Health metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Habits &amp; Health</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Sleep Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={sleepHours}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setSleepHours(val);
                        saveJournal({ sleepHours: val });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 800,
                        outline: 'none',
                        width: '100%',
                        padding: 0
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Sleep Quality</label>
                    <select
                      value={sleepQuality}
                      onChange={e => {
                        const val = e.target.value;
                        setSleepQuality(val);
                        saveJournal({ sleepQuality: val });
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 800,
                        outline: 'none',
                        width: '100%',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Good" style={{ background: '#09090b' }}>Good</option>
                      <option value="Fair" style={{ background: '#09090b' }}>Fair</option>
                      <option value="Poor" style={{ background: '#09090b' }}>Poor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Workout', val: workoutDone, set: setWorkoutDone, key: 'workoutDone', icon: '🏋️' },
                  { label: 'Clean Diet', val: dietClean, set: setDietClean, key: 'dietClean', icon: '🥗' },
                  { label: 'Meditation', val: meditationDone, set: setMeditationDone, key: 'meditationDone', icon: '🧘' }
                ].map(habit => (
                  <button
                    key={habit.key}
                    type="button"
                    onClick={() => {
                      const updated = !habit.val;
                      habit.set(updated);
                      saveJournal({ [habit.key]: updated });
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      background: habit.val ? 'rgba(90, 200, 250, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: habit.val ? '1px solid rgba(90, 200, 250, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '10px',
                      color: habit.val ? '#5ac8fa' : 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{habit.icon}</span>
                    <span>{habit.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-section 4: Text reflection notes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pre-Market Strategy</span>
                <textarea
                  value={preMarketNotes}
                  onChange={e => setPreMarketNotes(e.target.value)}
                  onBlur={() => saveJournal({ preMarketNotes })}
                  placeholder="Focus setups, news triggers, daily bias strategy..."
                  style={{
                    width: '100%',
                    height: '110px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: '1.5'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Post-Market Reflection</span>
                <textarea
                  value={postMarketNotes}
                  onChange={e => setPostMarketNotes(e.target.value)}
                  onBlur={() => saveJournal({ postMarketNotes })}
                  placeholder="Setups execution, discipline check, lessons..."
                  style={{
                    width: '100%',
                    height: '110px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: '1.5'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Executions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '850', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Executions Logged ({allDayExecutionsList.length})
            </h2>
            <button
              onClick={() => setIsAddExecutionOpen(true)}
              style={{
                background: 'rgba(184, 110, 255, 0.15)',
                border: '1px solid #b86eff',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '750',
                cursor: 'pointer'
              }}
            >
              + Add Execution
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }} className="hollow-menu-scrollbar">
            {allDayExecutionsList.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <ClipboardList size={36} color="rgba(255,255,255,0.15)" />
                <div style={{ fontSize: '13px', fontWeight: '750', color: 'rgba(255,255,255,0.5)' }}>No trades recorded on this day.</div>
              </div>
            ) : (
              allDayExecutionsList.map(trade => {
                const isWin = trade.netPnL > 0;
                const isLoss = trade.netPnL < 0;

                return (
                  <div
                    key={trade.id}
                    onClick={() => setSelectedExecutionDetail(trade.rawExec || trade)}
                    style={{
                      background: 'var(--colors-surface-card)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(184, 110, 255, 0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                  >
                    {/* Trade Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: trade.symbol === 'ES' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(100, 210, 255, 0.15)',
                          color: trade.symbol === 'ES' ? '#ff453a' : '#64d2ff',
                          fontWeight: '800',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>{trade.symbol || 'NQ'}</span>

                        <span style={{
                          background: trade.direction === 'SHORT' ? 'rgba(255, 69, 58, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                          color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158',
                          fontWeight: '800',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>{trade.direction || 'LONG'}</span>

                        {trade.rating && (
                          <span style={{
                            background: 'rgba(184, 110, 255, 0.15)',
                            color: '#b86eff',
                            fontWeight: '800',
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>Grade {trade.rating}</span>
                        )}
                      </div>

                      <div style={{ fontSize: '16px', fontWeight: '800', color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff') }}>
                        {isWin ? '+' : ''}${Math.abs(trade.netPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Custom Pills Row (DOL, PO3, Entry TF) */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {trade.dol && (
                        <span style={{ background: 'rgba(255,255,255,0.04)', color: '#ffd60a', fontSize: '10.5px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Target size={11} /> DOL: {trade.dol}
                        </span>
                      )}
                      {trade.po3Time && (
                        <span style={{ background: 'rgba(255,255,255,0.04)', color: '#64d2ff', fontSize: '10.5px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> PO3: {trade.po3Time}
                        </span>
                      )}
                      {trade.entryTf && (
                        <span style={{ background: 'rgba(255,255,255,0.04)', color: '#ff9f0a', fontSize: '10.5px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={11} /> TF: {trade.entryTf}
                        </span>
                      )}
                    </div>

                    {/* Chart Screenshots Gallery */}
                    {trade.images && trade.images.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                        {trade.images.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLightboxImage(img.url || img);
                            }}
                            style={{
                              height: '70px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#000',
                              border: '1px solid rgba(255,255,255,0.08)',
                              cursor: 'pointer'
                            }}
                          >
                            <img src={img.url || img} alt="Chart Screenshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reflection Notes */}
                    {(trade.commentExecution || trade.commentFazit) && (
                      <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.015)', padding: '10px 12px', borderRadius: '8px', lineHeight: '1.4' }}>
                        {trade.commentExecution || trade.commentFazit}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Lightbox Modal */}
      <AnimatePresence>
        {selectedLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLightboxImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <button
              onClick={() => setSelectedLightboxImage(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
            <img src={selectedLightboxImage} alt="Chart Lightbox" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
