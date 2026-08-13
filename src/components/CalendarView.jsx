import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL } from '../utils/tradeMath';
import { 
  ChevronLeft, ChevronRight, X, AlertCircle, Info, Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../store/useUIStore';

// High/Medium impact economic events generator based on standard US schedule
function getEventsForDate(dateStr) {
  if (!dateStr) return [];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return [];
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayOfMonth = d.getDate();
  const events = [];

  // 1st Friday of the month: NFP
  if (dayOfWeek === 5 && dayOfMonth <= 7) {
    events.push({ name: 'NFP', impact: 'high' });
  }
  // 2nd Tuesday of the month: CPI
  if (dayOfWeek === 2 && dayOfMonth >= 8 && dayOfMonth <= 14) {
    events.push({ name: 'CPI', impact: 'high' });
  }
  // 2nd Wednesday of the month: PPI
  if (dayOfWeek === 3 && dayOfMonth >= 8 && dayOfMonth <= 14) {
    events.push({ name: 'PPI', impact: 'high' });
  }
  // 3rd Wednesday: FOMC Decision
  if (dayOfWeek === 3 && dayOfMonth >= 15 && dayOfMonth <= 21) {
    events.push({ name: 'FOMC Decision', impact: 'high' });
  }
  // Every Thursday: Jobless Claims
  if (dayOfWeek === 4) {
    events.push({ name: 'Jobless Claims', impact: 'medium' });
  }
  // 1st of the month: ISM Manufacturing PMI
  if (dayOfMonth === 1) {
    events.push({ name: 'ISM Mfg PMI', impact: 'medium' });
  }
  // 3rd of the month: ISM Services PMI
  if (dayOfMonth === 3) {
    events.push({ name: 'ISM Serv PMI', impact: 'medium' });
  }
  // 15th of the month: Retail Sales
  if (dayOfMonth === 15) {
    events.push({ name: 'Retail Sales', impact: 'high' });
  }

  return events;
}

export default function CalendarView() {
  const isMobile = useUIStore(state => state.isMobile);
  
  // Current active calendar month view
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // Mode switcher: 'PNL' ($) vs 'EVENTS'
  const [calendarMode, setCalendarMode] = useState('PNL'); 
  
  // Selected date popover
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Month display label (e.g. "August 2026")
  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Query trades & executions reactively from IndexedDB
  const trades = useLiveQuery(() => (db && db.trades ? db.trades.toArray() : []), []) || [];
  const executions = useLiveQuery(() => (db && db.executions ? db.executions.toArray() : []), []) || [];

  // Group trades & executions by date string YYYY-MM-DD
  const tradesByDate = useMemo(() => {
    const map = {};
    const processedExecIds = new Set();

    trades.forEach(trade => {
      const dateStr = trade.date;
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];

      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      tradeExecs.forEach(e => processedExecIds.add(e.id));
      const math = calculateTradePnL(trade, tradeExecs);
      
      map[dateStr].push({
        ...trade,
        netPnL: math.netPnL,
        wl: math.netPnL > 0 ? 'Win' : (math.netPnL < 0 ? 'Loss' : 'Breakeven')
      });
    });

    executions.forEach(exec => {
      if (processedExecIds.has(exec.id)) return;
      const dateStr = exec.date || new Date(exec.timestamp || Date.now()).toISOString().split('T')[0];
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];

      let rVal = 0;
      if (exec.rr !== undefined && exec.rr !== null && exec.rr !== '') {
        const num = parseFloat(String(exec.rr).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) rVal = num;
      } else if ((exec.wl || '').toUpperCase().includes('WIN')) {
        rVal = 2.0;
      } else if ((exec.wl || '').toUpperCase().includes('LOSS')) {
        rVal = -1.0;
      }

      // If manualPnL is provided, use it, else calculate from risk (default $200 per R)
      const netPnL = exec.manualPnL !== undefined ? parseFloat(exec.manualPnL) : rVal * 200;

      map[dateStr].push({
        id: exec.id,
        symbol: exec.symbol || 'NQ',
        bias: exec.bias || 'Long',
        model: exec.model || 'Standard Setup',
        netPnL,
        wl: exec.wl
      });
    });

    return map;
  }, [trades, executions]);

  // Build Calendar Matrix Grid (Weeks & Days)
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Previous month overflow days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevOverflowCount = startDayOfWeek;

    const days = [];

    // Fill previous month days
    for (let i = prevOverflowCount - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        trades: tradesByDate[dateStr] || [],
        events: getEventsForDate(dateStr)
      });
    }

    // Fill current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        trades: tradesByDate[dateStr] || [],
        events: getEventsForDate(dateStr)
      });
    }

    // Fill next month overflow days to complete 6 rows (42 cells total)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingCells = (totalCells < 35 ? 35 : totalCells) - days.length;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        trades: tradesByDate[dateStr] || [],
        events: getEventsForDate(dateStr)
      });
    }

    // Group into 7-day rows (weeks)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push({
        weekNum: Math.floor(i / 7) + 1,
        weekDays: days.slice(i, i + 7)
      });
    }

    return weeks;
  }, [currentDate, tradesByDate]);

  return (
    <div style={{
      height: '100%',
      width: '100%',
      overflowY: 'auto',
      background: '#09090b',
      color: '#ffffff',
      padding: isMobile ? '16px' : '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      boxSizing: 'border-box',
      fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)"
    }} className="hollow-menu-scrollbar">

      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '20px',
        padding: '16px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Trading Calendar
          </h1>

          {/* Selector Switcher: PNL vs Events */}
          <div style={{
            display: 'flex',
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
            padding: '3px'
          }}>
            <button
              onClick={() => setCalendarMode('PNL')}
              style={{
                background: calendarMode === 'PNL' ? '#30d158' : 'transparent',
                color: calendarMode === 'PNL' ? '#000000' : 'rgba(255, 255, 255, 0.45)',
                fontWeight: '700',
                fontSize: '11px',
                padding: '6px 16px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              PNL
            </button>
            <button
              onClick={() => setCalendarMode('EVENTS')}
              style={{
                background: calendarMode === 'EVENTS' ? '#30d158' : 'transparent',
                color: calendarMode === 'EVENTS' ? '#000000' : 'rgba(255, 255, 255, 0.45)',
                fontWeight: '700',
                fontSize: '11px',
                padding: '6px 16px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              Events
            </button>
          </div>
        </div>

        {/* Month Navigator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={handlePrevMonth}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff', minWidth: '110px', textAlign: 'center', letterSpacing: '-0.01em' }}>
            {monthYearLabel}
          </span>

          <button
            onClick={handleNextMonth}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* CALENDAR GRID TABLE */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        overflowX: 'auto',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '24px',
        padding: '24px'
      }}>
        {/* DAY HEADERS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.04)'
        }}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '800',
                color: 'rgba(255, 255, 255, 0.35)',
                letterSpacing: '0.06em'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* CALENDAR ROWS (WEEKS) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
          {calendarGrid.map((week, wIdx) => (
            <div
              key={wIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px'
              }}
            >
              {/* 7 DAYS CELLS */}
              {week.weekDays.map((dayCell, dIdx) => {
                const dayTradesList = dayCell.trades;
                const hasTrades = dayTradesList.length > 0;

                // Calculate daily P&L and metrics
                let dayPnL = 0;
                dayTradesList.forEach(t => {
                  dayPnL += t.netPnL || 0;
                });

                const finishedTrades = dayTradesList.filter(t => t.wl === 'Win' || t.wl === 'Loss');
                const winCount = dayTradesList.filter(t => t.wl === 'Win').length;
                const winRate = finishedTrades.length > 0 ? Math.round((winCount / finishedTrades.length) * 100) : 0;

                const isWin = dayPnL > 0;
                const isLoss = dayPnL < 0;

                // Determine Cell Styles
                let cellBg = 'rgba(255, 255, 255, 0.02)';
                let borderStyle = '1px solid rgba(255, 255, 255, 0.04)';
                let textCol = '#ffffff';

                if (dayCell.isCurrentMonth) {
                  if (calendarMode === 'PNL' && hasTrades) {
                    if (isWin) {
                      cellBg = 'rgba(48, 209, 88, 0.06)';
                      borderStyle = '1px solid rgba(48, 209, 88, 0.18)';
                      textCol = '#30d158';
                    } else if (isLoss) {
                      cellBg = 'rgba(255, 69, 58, 0.06)';
                      borderStyle = '1px solid rgba(255, 69, 58, 0.18)';
                      textCol = '#ff453a';
                    } else {
                      cellBg = 'rgba(255, 255, 255, 0.04)';
                      borderStyle = '1px solid rgba(255, 255, 255, 0.1)';
                    }
                  } else {
                    cellBg = '#141416';
                  }
                } else {
                  cellBg = 'transparent';
                  borderStyle = '1px solid rgba(255, 255, 255, 0.01)';
                }

                return (
                  <div
                    key={dIdx}
                    onClick={() => (hasTrades || dayCell.events.length > 0) && setSelectedDayDetails(dayCell)}
                    style={{
                      height: '92px',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: (hasTrades || dayCell.events.length > 0) ? 'pointer' : 'default',
                      position: 'relative',
                      background: cellBg,
                      border: borderStyle,
                      opacity: dayCell.isCurrentMonth ? 1 : 0.2,
                      transition: 'transform 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (dayCell.isCurrentMonth && (hasTrades || dayCell.events.length > 0)) {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {/* Day Number in Top Right */}
                    <div style={{
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '800',
                      color: dayCell.isCurrentMonth ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)'
                    }}>
                      {dayCell.dayNum}
                    </div>

                    {/* Cell Content Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '2px' }}>
                      {calendarMode === 'PNL' ? (
                        hasTrades && (
                          <>
                            {/* PNL Value */}
                            <span style={{
                              fontSize: '15px',
                              fontWeight: '800',
                              color: textCol,
                              letterSpacing: '-0.02em',
                              lineHeight: 1
                            }}>
                              {dayPnL >= 0 
                                ? `$${dayPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                                : `-$${Math.abs(dayPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            </span>
                            
                            {/* Win Rate Percentage */}
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              color: textCol,
                              opacity: 0.8,
                              marginTop: '4px'
                            }}>
                              {winRate}%
                            </span>
                          </>
                        )
                      ) : (
                        /* Events Mode */
                        dayCell.events.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                            {dayCell.events.map((ev, evIdx) => (
                              <div
                                key={evIdx}
                                style={{
                                  background: ev.impact === 'high' ? 'rgba(255,69,58,0.12)' : 'rgba(255,214,10,0.12)',
                                  border: ev.impact === 'high' ? '1px solid rgba(255,69,58,0.2)' : '1px solid rgba(255,214,10,0.2)',
                                  borderRadius: '6px',
                                  padding: '2px 4px',
                                  fontSize: '9px',
                                  fontWeight: '800',
                                  color: ev.impact === 'high' ? '#ff453a' : '#ffd60a',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px'
                                }}
                              >
                                <span>{ev.impact === 'high' ? '🔴' : '🟡'}</span>
                                <span>{ev.name}</span>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* DAY DETAILS POPOVER LIGHTBOX */}
      <AnimatePresence>
        {selectedDayDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDayDetails(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '850', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                    Activity on {new Date(selectedDayDetails.dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'block' }}>
                    {selectedDayDetails.trades.length} executions recorded
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Economic Events for clicked day */}
              {selectedDayDetails.events.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Macro Events</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDayDetails.events.map((ev, evIdx) => (
                      <div
                        key={evIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{ev.impact === 'high' ? '🔴' : '🟡'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 750, color: '#fff' }}>{ev.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                            {ev.impact === 'high' ? 'High Impact Event' : 'Medium Impact Event'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trades for clicked day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trades & Executions</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedDayDetails.trades.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      No trades logged on this day.
                    </div>
                  ) : (
                    selectedDayDetails.trades.map(trade => {
                      const isWin = trade.netPnL > 0;
                      const isLoss = trade.netPnL < 0;
                      return (
                        <div
                          key={trade.id}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '14px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                              {trade.symbol || 'NQ'} • {(trade.bias || trade.direction || 'Long').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                              Model: {trade.model || 'Standard Setup'}
                            </div>
                          </div>
                          <div style={{ textCol: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#fff'), textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '850', color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#fff') }}>
                              {trade.netPnL >= 0 ? '+' : ''}${Math.round(trade.netPnL).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
