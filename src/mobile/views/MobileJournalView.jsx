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
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'trades'
  const [zoomImage, setZoomImage] = useState(null);
  const setIsAddExecutionOpen = useUIStore(s => s.setIsAddExecutionOpen);

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
        paddingTop: 'calc(var(--safe-top) + 16px)',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Daily Journal
          </h1>
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
            Execution ledger & mindset
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '4px',
        }}>
          <button
            onClick={() => handleDateShift(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b86eff',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 6px',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          />

          <button
            onClick={() => handleDateShift(1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
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
        borderRadius: '14px',
        padding: '4px',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <button
          onClick={() => setActiveTab('daily')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'daily' ? '#b86eff' : 'transparent',
            color: activeTab === 'daily' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Daily Log ({selectedDate})
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'trades' ? '#b86eff' : 'transparent',
            color: activeTab === 'trades' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          All Executions ({allTrades.length})
        </button>
      </div>{/* tab strip */}

      </div>{/* end sticky header */}

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        onScroll={(e) => onScrollChange && onScrollChange(e.target.scrollTop)}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '16px',
          paddingBottom: 'calc(var(--safe-bottom) + 96px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >

      {activeTab === 'daily' ? (
        <>
          {/* ── DAILY SUMMARY CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{
              background: '#0e0e12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                Day Net P&L
              </span>
              <div style={{
                fontSize: '20px',
                fontWeight: 800,
                color: daySummary.totalPnL > 0 ? '#30d158' : (daySummary.totalPnL < 0 ? '#ff453a' : '#ffffff'),
                marginTop: '4px'
              }}>
                {daySummary.totalPnL > 0 ? '+' : ''}${Math.abs(daySummary.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                {daySummary.totalR >= 0 ? '+' : ''}{daySummary.totalR}R Multiple
              </span>
            </div>

            <div style={{
              background: '#0e0e12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                Performance
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {daySummary.winRate}% Win Rate
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                {daySummary.wins}W / {daySummary.losses}L · {daySummary.totalCount} Trades
              </span>
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
                  Daily Psychology & Reflections
                </span>
              </div>
              <button
                onClick={saveReflections}
                style={{
                  background: 'rgba(184, 110, 255, 0.15)',
                  border: '1px solid rgba(184, 110, 255, 0.35)',
                  borderRadius: '8px',
                  color: '#d8b4fe',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  cursor: 'pointer'
                }}
              >
                Save Note
              </button>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What went well today? Any psychological mistakes or lessons learned from the session?"
              rows={3}
              style={{
                width: '100%',
                background: '#16161c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '10px 12px',
                color: '#ffffff',
                fontSize: '13px',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* ── EXECUTIONS LIST ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Session Executions ({dayTrades.length})
              </span>
              <button
                onClick={() => setIsAddExecutionOpen(true)}
                style={{
                  background: '#b86eff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
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

            {dayTrades.length === 0 ? (
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
              dayTrades.map(trade => {
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
                    style={{
                      background: '#0e0e12',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {trade.symbol || 'NQ'}
                        </span>
                        <span style={{
                          background: trade.direction === 'SHORT' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                          color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158',
                          fontWeight: 800,
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          {trade.direction === 'SHORT' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {trade.direction || 'LONG'}
                        </span>
                        {trade.model && (
                          <span style={{
                            background: 'rgba(184, 110, 255, 0.12)',
                            color: '#d8b4fe',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {trade.model}
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: isGain ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff')
                      }}>
                        {isGain ? '+' : ''}${Math.abs(math.netPnL).toFixed(2)}
                      </div>
                    </div>

                    {/* Confluences & Details */}
                    {trade.commentExecution && (
                      <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', margin: 0, lineHeight: 1.4 }}>
                        {trade.commentExecution}
                      </p>
                    )}

                    {/* Chart Screenshot Thumbnail */}
                    {tradeImg && (
                      <div
                        onClick={() => setZoomImage(tradeImg)}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '140px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#000000',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={tradeImg}
                          alt="Execution chart"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#ffffff',
                          fontWeight: 600
                        }}>
                          <ZoomIn size={12} /> Tap to zoom
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* ── ALL TRADES HISTORICAL LIST ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allTrades.length === 0 ? (
            <div style={{
              background: '#0e0e12',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.4)'
            }}>
              No historical trades recorded yet.
            </div>
          ) : (
            allTrades.slice(0, 50).map(trade => {
              const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
              const math = calculateTradePnL(trade, tradeExecs);
              const isGain = math.netPnL > 0;
              const isLoss = math.netPnL < 0;

              return (
                <div
                  key={trade.id}
                  onClick={() => {
                    if (trade.date) setSelectedDate(trade.date);
                    setActiveTab('daily');
                  }}
                  style={{
                    background: '#0e0e12',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                        {trade.symbol || 'NQ'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: trade.direction === 'SHORT' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                        color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158'
                      }}>
                        {trade.direction || 'LONG'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {trade.date} · {trade.model || 'Standard Setup'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: isGain ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff')
                  }}>
                    {isGain ? '+' : ''}${Math.abs(math.netPnL).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── FULLSCREEN IMAGE ZOOM MODAL ── */}
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
              background: 'rgba(0, 0, 0, 0.95)',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '16px',
            }}
          >
            <button
              onClick={() => setZoomImage(null)}
              style={{
                position: 'absolute',
                top: 'calc(var(--safe-top, 47px) + 12px)',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <img
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
      </div>{/* end scrollable content */}
    </div>
  );
}
