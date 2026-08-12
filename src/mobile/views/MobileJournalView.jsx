import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { calculateTradePnL } from '../../utils/tradeMath';
import { useUIStore } from '../../store/useUIStore';
import { 
  ChevronLeft, ChevronRight, Calendar, Plus, Target, Clock, Tag, Smile,
  TrendingUp, TrendingDown, BookOpen, CheckSquare, Brain, Edit3, Image as ImageIcon,
  CheckCircle, AlertTriangle, Eye, X, ZoomIn
} from 'lucide-react';

export default function MobileJournalView({ addToast, onScrollChange }) {
  const selectedDate = useUIStore(s => s.selectedDate);
  const setSelectedDate = useUIStore(s => s.setSelectedDate);
  const setIsAddExecutionOpen = useUIStore(s => s.setIsAddExecutionOpen);
  const setSelectedExecutionDetail = useUIStore(s => s.setSelectedExecutionDetail);
  const [activeTab, setActiveTab] = useState('daily');
  const [zoomImage, setZoomImage] = useState(null);

  // Shift Date Helper
  const handleDateShift = (delta) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Fetch daily journal reflections reactively
  const dailyJournal = useLiveQuery(async () => {
    if (!selectedDate || !db || !db.dailyJournals) return null;
    return await db.dailyJournals.get(selectedDate);
  }, [selectedDate]);

  // Form state for journal reflections
  const [notes, setNotes] = useState('');
  const [focusRating, setFocusRating] = useState(5);
  const [disciplineRating, setDisciplineRating] = useState(5);

  useEffect(() => {
    if (dailyJournal) {
      setNotes(dailyJournal.notes || dailyJournal.generalNotes || '');
      setFocusRating(dailyJournal.focusRating || dailyJournal.focus || 5);
      setDisciplineRating(dailyJournal.disciplineRating || dailyJournal.discipline || 5);
    } else {
      setNotes('');
      setFocusRating(5);
      setDisciplineRating(5);
    }
  }, [dailyJournal, selectedDate]);

  // Auto-save reflections
  const saveReflections = async () => {
    if (!db || !db.dailyJournals) return;
    const existing = await db.dailyJournals.get(selectedDate) || {};
    await db.dailyJournals.put({
      ...existing,
      date: selectedDate,
      notes,
      generalNotes: notes,
      focusRating,
      disciplineRating,
      updatedAt: new Date().toISOString()
    });
    if (addToast) addToast('Journal reflections saved', 'success');
  };

  // Fetch trades and executions for selected date
  const dayTrades = useLiveQuery(async () => {
    if (!selectedDate || !db || !db.trades) return [];
    return await db.trades.where('date').equals(selectedDate).toArray();
  }, [selectedDate]) || [];

  const dayExecutions = useLiveQuery(async () => {
    if (!selectedDate || !db || !db.executions) return [];
    return await db.executions.where('date').equals(selectedDate).toArray();
  }, [selectedDate]) || [];

  const allExecutions = useLiveQuery(async () => {
    if (!db || !db.executions) return [];
    return await db.executions.toArray();
  }, []) || [];

  const allTrades = useLiveQuery(async () => {
    if (!db || !db.trades) return [];
    return await db.trades.toArray();
  }, []) || [];

  // Compute daily totals
  const daySummary = useMemo(() => {
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalR = 0;

    dayTrades.forEach(trade => {
      const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
      const math = calculateTradePnL(trade, tradeExecs);
      totalPnL += math.netPnL;
      if (math.netPnL > 0) wins++;
      else if (math.netPnL < 0) losses++;

      const risk = trade.riskAmount || 200;
      totalR += math.netPnL / risk;
    });

    // Standalone executions
    dayExecutions.filter(e => !e.tradeId).forEach(exec => {
      const r = parseFloat(exec.rr) || (exec.wl === 'Win' ? 2 : exec.wl === 'Loss' ? -1 : 0);
      const pnl = exec.manualPnL !== undefined ? parseFloat(exec.manualPnL) : r * 200;
      totalPnL += pnl;
      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;
      totalR += r;
    });

    const totalCount = dayTrades.length + dayExecutions.filter(e => !e.tradeId).length;

    return {
      totalPnL,
      wins,
      losses,
      totalCount,
      totalR: totalR.toFixed(2),
      winRate: totalCount > 0 ? Math.round((wins / totalCount) * 100) : 0
    };
  }, [dayTrades, dayExecutions, allExecutions]);

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#000000',
      color: '#ffffff',
      fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
      overflow: 'hidden',
    }}>

      {/* ── STICKY BLURRY HEADER ── */}
      <div style={{
        flexShrink: 0,
        zIndex: 100,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '12px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>

        {/* ── TOP HEADER & DATE PICKER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              Daily Journal
            </h1>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
              Clean execution ledger and trade reflections
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              onClick={() => handleDateShift(-1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Date picker trigger */}
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Calendar size={12} color="#b86eff" />
                {(() => {
                  const parts = selectedDate.split('-');
                  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
                  return selectedDate;
                })()}
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>

            {/* Today button */}
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={{
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(184, 110, 255, 0.12)',
                border: '1px solid rgba(184, 110, 255, 0.25)',
                color: '#d8b4fe',
                fontSize: '11px',
                fontWeight: 700,
                padding: '0 10px',
                cursor: 'pointer'
              }}
            >
              Today
            </button>

            <button
              onClick={() => handleDateShift(1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── SEGMENT TABS: Daily Log vs All Trades ── */}
        <div style={{
          display: 'flex',
          background: '#121216',
          borderRadius: '12px',
          padding: '3px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            onClick={() => setActiveTab('daily')}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'daily' ? '#b86eff' : 'transparent',
              color: activeTab === 'daily' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Daily Log
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'trades' ? '#b86eff' : 'transparent',
              color: activeTab === 'trades' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            All Executions ({allTrades.length})
          </button>
        </div>

      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        onScroll={(e) => onScrollChange && onScrollChange(e.target.scrollTop)}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >

      {activeTab === 'daily' ? (
        <>
          {/* ── DAILY SUMMARY CARDS (Redesigned matching screenshot 2) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            
            {/* R Return Card */}
            <div style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '65px'
            }}>
              <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                R Return
              </span>
              <div style={{
                fontSize: '16px',
                fontWeight: 800,
                color: parseFloat(daySummary.totalR) > 0.05 ? '#30d158' : (parseFloat(daySummary.totalR) < -0.05 ? '#ff453a' : '#ffffff'),
                marginTop: '4px'
              }}>
                {parseFloat(daySummary.totalR) >= 0 ? `+${daySummary.totalR}R` : `${daySummary.totalR}R`}
              </div>
            </div>

            {/* Day Win Rate Card */}
            <div style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '65px'
            }}>
              <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Day Win Rate
              </span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {daySummary.winRate.toFixed(1)}%
              </div>
            </div>

            {/* Trades Executed Card */}
            <div style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '65px'
            }}>
              <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Trades Executed
              </span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginTop: '4px', whiteSpace: 'nowrap' }}>
                {daySummary.totalCount} ({daySummary.wins}W / {daySummary.losses}L)
              </div>
            </div>

          </div>

          {/* ── COGNITIVE MINDSET & DAILY NOTES ── */}
          <div style={{
            background: '#0e0e12',
            border: '1px solid rgba(184, 110, 255, 0.2)',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} color="#b86eff" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#d8b4fe' }}>
                  Daily Psychology &amp; Reflections
                </span>
              </div>
              <button
                onClick={saveReflections}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b86eff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Save
              </button>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reflect on today's discipline, emotional state, adherence to rules..."
              style={{
                width: '100%',
                height: '70px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '10px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* ── LOGGED EXECUTIONS HEADER ── */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              paddingLeft: '2px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Executions Logged for {selectedDate}
              </span>
              <button
                onClick={() => setIsAddExecutionOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b86eff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Log Execution
              </button>
            </div>

            {(dayTrades.length === 0 && dayExecutions.filter(e => !e.tradeId).length === 0) ? (
              <div style={{
                background: '#0e0e12',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '36px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <BookOpen size={28} color="rgba(255, 255, 255, 0.2)" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>
                  No executions logged for {selectedDate}
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)' }}>
                  Tap the + button to log a trade or reflection.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayTrades.map(trade => {
                  const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
                  const math = calculateTradePnL(trade, tradeExecs);
                  const isGain = math.netPnL > 0;
                  const isLoss = math.netPnL < 0;

                  // Extract image
                  const tradeImg = Array.isArray(trade.images) && trade.images.length > 0
                    ? (Array.isArray(trade.images[0]) ? trade.images[0][0] : trade.images[0])
                    : null;

                  return (
                    <div
                      key={trade.id}
                      onClick={() => setSelectedExecutionDetail(trade)}
                      style={{
                        background: '#0e0e12',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Top Row: Info Pills + Outcome P&L */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            background: 'rgba(100, 210, 255, 0.15)',
                            color: '#64d2ff',
                            fontWeight: 800,
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>
                            {trade.symbol || 'NQ'}
                          </span>
                          
                          <span style={{
                            background: trade.direction === 'SHORT' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                            color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158',
                            fontWeight: 800,
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>
                            {trade.direction || 'LONG'}
                          </span>
                          
                          {trade.rating && (
                            <span style={{
                              background: 'rgba(184, 110, 255, 0.12)',
                              color: '#d8b4fe',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              Grade {trade.rating}
                            </span>
                          )}
                        </div>

                        {/* Outcome P&L (right side) */}
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: isGain ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff')
                        }}>
                          {isGain ? '+' : ''}${Math.abs(math.netPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Bottom Row: Draw on Liquidity details & reflections */}
                      {trade.dol && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Target size={12} color="#b86eff" />
                          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                            DOL: {trade.dol}
                          </span>
                        </div>
                      )}

                      {trade.commentExecution && (
                        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.4 }}>
                          {trade.commentExecution}
                        </p>
                      )}

                      {/* Chart Screenshot Thumbnail */}
                      {tradeImg && (
                        <div
                          onClick={() => setZoomImage(tradeImg)}
                          style={{
                            alignSelf: 'flex-start',
                            width: '80px',
                            height: '50px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.15)',
                            position: 'relative',
                            cursor: 'pointer',
                            marginTop: '4px'
                          }}
                        >
                          <img src={tradeImg} alt="setup" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Eye size={12} color="#fff" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Standalone Executions */}
                {dayExecutions.filter(e => !e.tradeId).map(exec => {
                  const isGain = parseFloat(exec.rr) > 0.05 || (exec.manualPnL && parseFloat(exec.manualPnL) > 0);
                  const isLoss = parseFloat(exec.rr) < -0.05 || (exec.manualPnL && parseFloat(exec.manualPnL) < 0);
                  const execImg = Array.isArray(exec.ltfImages) && exec.ltfImages.length > 0 ? exec.ltfImages[0] : (
                    Array.isArray(exec.images) && exec.images.length > 0 ? exec.images[0] : null
                  );
                  
                  let outcomeColor = '#ffffff';
                  if (isGain) outcomeColor = '#30d158';
                  else if (isLoss) outcomeColor = '#ff453a';
                  else if ((exec.wl || '').toUpperCase().startsWith('BE')) outcomeColor = '#ffd60a';

                  return (
                    <div
                      key={exec.id}
                      onClick={() => setSelectedExecutionDetail(exec)}
                      style={{
                        background: '#0e0e12',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            background: 'rgba(100, 210, 255, 0.15)',
                            color: '#64d2ff',
                            fontWeight: 800,
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>{exec.symbol || 'NQ'}</span>
                          <span style={{
                            background: exec.bias === 'Short' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                            color: exec.bias === 'Short' ? '#ff453a' : '#30d158',
                            fontWeight: 800,
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase'
                          }}>{exec.bias || 'LONG'}</span>
                          {exec.rating && (
                            <span style={{
                              background: 'rgba(184, 110, 255, 0.12)',
                              color: '#d8b4fe',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>Grade {exec.rating}</span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: outcomeColor }}>
                            {isGain ? '+' : ''}{parseFloat(exec.rr || 0).toFixed(2)}R
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{exec.model || 'Standard Setup'} · {exec.session || 'New York'}</span>
                        <span>{exec.executionTime ? `${exec.executionTime} EST` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── ALL TRADES / EXECUTIONS LIST TAB ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {allTrades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
              No executions logged yet.
            </div>
          ) : (
            allTrades.map(trade => {
              const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
              const math = calculateTradePnL(trade, tradeExecs);
              const isGain = math.netPnL > 0;
              const isLoss = math.netPnL < 0;

              return (
                <div
                  key={trade.id}
                  onClick={() => setSelectedDate(trade.date)}
                  style={{
                    background: '#09090b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{trade.symbol}</span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158',
                        textTransform: 'uppercase'
                      }}>
                        {trade.direction}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{trade.date}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: isGain ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff')
                    }}>
                      {isGain ? '+' : ''}${Math.abs(math.netPnL).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      </div>

      {/* ── IMAGE ZOOM OVERLAY ── */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.95)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <button
              onClick={() => setZoomImage(null)}
              style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top) + 16px)',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={zoomImage}
              alt="Zoomed execution chart"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.9)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
