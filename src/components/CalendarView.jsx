import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL } from '../utils/tradeMath';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, 
  RotateCcw, DollarSign, Activity, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../store/useUIStore';

export default function CalendarView() {
  const isMobile = useUIStore(state => state.isMobile);
  
  // Current active calendar month view
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // Mode switcher: 'RR' (default, tracks Risk:Reward) vs 'PNL' ($)
  const [metricMode, setMetricMode] = useState('RR'); // 'RR' | 'PNL'
  // View mode switcher: 'calendar' vs 'trades'
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'trades'

  // Selected date popover
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Month display label
  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
      const risk = trade.riskAmount || 200;
      const rReturn = math.netPnL / risk;

      map[dateStr].push({
        ...trade,
        netPnL: math.netPnL,
        rReturn
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

      const netPnL = rVal * 200;

      map[dateStr].push({
        id: exec.id,
        symbol: exec.symbol || 'NQ',
        bias: exec.bias || 'Long',
        model: exec.model || 'Standard Setup',
        netPnL,
        rReturn: rVal,
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
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        trades: tradesByDate[dateStr] || []
      });
    }

    // Fill current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: true,
        trades: tradesByDate[dateStr] || []
      });
    }

    // Fill next month overflow days to complete 6 rows (42 cells total)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingCells = (totalCells < 35 ? 35 : totalCells) - days.length;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        trades: tradesByDate[dateStr] || []
      });
    }

    // Group into 7-day rows (weeks)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      
      // Calculate weekly rollup metrics
      let weekPnL = 0;
      let weekR = 0;
      let activeDaysCount = 0;

      weekDays.forEach(day => {
        if (day.trades.length > 0) {
          activeDaysCount++;
          day.trades.forEach(t => {
            weekPnL += t.netPnL;
            weekR += t.rReturn;
          });
        }
      });

      weeks.push({
        weekNum: Math.floor(i / 7) + 1,
        weekDays,
        weekPnL,
        weekR,
        activeDaysCount
      });
    }

    return weeks;
  }, [currentDate, tradesByDate]);

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
      gap: '20px'
    }} className="hollow-menu-scrollbar">

      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Calendar
          </h1>

          {/* Month Navigator Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handlePrevMonth}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff', minWidth: '84px', textAlign: 'center' }}>
              {monthYearLabel}
            </span>

            <button
              onClick={handleNextMonth}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={handleCurrentMonth}
              style={{
                background: 'rgba(184, 110, 255, 0.12)',
                border: '1px solid #b86eff',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              Current Month
            </button>
          </div>
        </div>

        {/* Top Right Mode Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Tracking Metric Mode Switcher: RR (Default) vs PNL */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
            padding: '3px'
          }}>
            <button
              onClick={() => setMetricMode('RR')}
              style={{
                background: metricMode === 'RR' ? '#b86eff' : 'transparent',
                color: metricMode === 'RR' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                fontWeight: metricMode === 'RR' ? '800' : '600',
                fontSize: '11px',
                padding: '5px 14px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Track RR
            </button>
            <button
              onClick={() => setMetricMode('PNL')}
              style={{
                background: metricMode === 'PNL' ? '#b86eff' : 'transparent',
                color: metricMode === 'PNL' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                fontWeight: metricMode === 'PNL' ? '800' : '600',
                fontSize: '11px',
                padding: '5px 14px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Track PnL ($)
            </button>
          </div>

          {/* Calendar vs Trades View Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '100px',
            padding: '3px'
          }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                background: viewMode === 'calendar' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'calendar' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                fontWeight: viewMode === 'calendar' ? '700' : '500',
                fontSize: '11px',
                padding: '5px 14px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('trades')}
              style={{
                background: viewMode === 'trades' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'trades' ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                fontWeight: viewMode === 'trades' ? '700' : '500',
                fontSize: '11px',
                padding: '5px 14px',
                borderRadius: '100px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Trades
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR GRID TABLE */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        overflowX: 'auto'
      }}>
        {/* DAY HEADERS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr) 180px',
          gap: '6px',
          paddingBottom: '4px'
        }}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '800',
                color: 'rgba(255, 255, 255, 0.45)',
                letterSpacing: '0.05em'
              }}
            >
              {day}
            </div>
          ))}
          <div style={{
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: '800',
            color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: '0.05em'
          }}>
            WEEKLY
          </div>
        </div>

        {/* CALENDAR ROWS (WEEKS) */}
        {calendarGrid.map((week, wIdx) => (
          <div
            key={wIdx}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr) 180px',
              gap: '6px'
            }}
          >
            {/* 7 DAYS CELLS */}
            {week.weekDays.map((dayCell, dIdx) => {
              const dayTradesList = dayCell.trades;
              const hasTrades = dayTradesList.length > 0;

              let dayPnL = 0;
              let dayR = 0;
              dayTradesList.forEach(t => {
                dayPnL += t.netPnL;
                dayR += t.rReturn;
              });

              const isWin = metricMode === 'RR' ? dayR > 0 : dayPnL > 0;
              const isLoss = metricMode === 'RR' ? dayR < 0 : dayPnL < 0;

              return (
                <div
                  key={dIdx}
                  onClick={() => hasTrades && setSelectedDayDetails(dayCell)}
                  style={{
                    height: isMobile ? '70px' : '96px',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: hasTrades ? 'pointer' : 'default',
                    position: 'relative',
                    background: dayCell.isCurrentMonth
                      ? (hasTrades
                        ? (isWin ? 'rgba(48, 209, 88, 0.08)' : (isLoss ? 'rgba(255, 69, 58, 0.08)' : 'rgba(255,255,255,0.03)'))
                        : '#141416')
                      : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.015), rgba(255,255,255,0.015) 8px, transparent 8px, transparent 16px)',
                    border: hasTrades
                      ? (isWin ? '1px solid rgba(48, 209, 88, 0.3)' : (isLoss ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid rgba(255,255,255,0.1)'))
                      : '1px solid rgba(255,255,255,0.04)',
                    opacity: dayCell.isCurrentMonth ? 1 : 0.35,
                    transition: 'all 0.15s'
                  }}
                >
                  {/* Day Number Top Right */}
                  <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>
                    {dayCell.dayNum}
                  </div>

                  {/* R Return / PnL Value Center */}
                  {hasTrades && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{
                        fontSize: isMobile ? '13px' : '15px',
                        fontWeight: '800',
                        color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff'),
                        letterSpacing: '-0.02em'
                      }}>
                        {metricMode === 'RR' ? (
                          `${dayR >= 0 ? '+' : ''}${dayR.toFixed(2)}R`
                        ) : (
                          `${dayPnL >= 0 ? '+' : ''}$${Math.abs(dayPnL).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                        )}
                      </div>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {dayTradesList.length} {dayTradesList.length === 1 ? 'trade' : 'trades'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* WEEKLY SUMMARY CARD (RIGHTMOST COLUMN) */}
            <div style={{
              height: isMobile ? '70px' : '96px',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              background: '#0f0f11',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.4)' }}>
                Week {week.weekNum}
              </span>
              <div style={{
                fontSize: '15px',
                fontWeight: '800',
                color: metricMode === 'RR'
                  ? (week.weekR >= 0 ? '#30d158' : '#ff453a')
                  : (week.weekPnL >= 0 ? '#30d158' : '#ff453a'),
                marginTop: '2px'
              }}>
                {metricMode === 'RR' ? (
                  `${week.weekR >= 0 ? '+' : ''}${week.weekR.toFixed(2)}R`
                ) : (
                  `${week.weekPnL >= 0 ? '+' : ''}$${Math.abs(week.weekPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                )}
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)', marginTop: '2px' }}>
                {week.activeDaysCount} {week.activeDaysCount === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        ))}
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
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0f0f11',
                border: '1px solid rgba(184, 110, 255, 0.3)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '480px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    Trades on {selectedDayDetails.dateStr}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {selectedDayDetails.trades.length} executions recorded
                  </span>
                </div>
                <button onClick={() => setSelectedDayDetails(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
                {selectedDayDetails.trades.map(trade => (
                  <div key={trade.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                        {trade.symbol || 'NQ'} • {trade.direction || 'LONG'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        Grade {trade.rating || 'A+'} • {trade.session || 'New York'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: trade.rReturn >= 0 ? '#30d158' : '#ff453a' }}>
                        {trade.rReturn >= 0 ? '+' : ''}{trade.rReturn.toFixed(2)}R
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {trade.netPnL >= 0 ? '+' : ''}${Math.abs(trade.netPnL).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
