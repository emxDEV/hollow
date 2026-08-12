import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUIStore } from '../../store/useUIStore';
import {
  Bell,
  X,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  Activity,
  Plus
} from 'lucide-react';

export default function HomeView({
  addToast,
  onScrollChange,
  onNavigate,
  onOpenWeeklyReview,
  trades = [],
  executions = []
}) {
  const setSelectedDate = useUIStore(s => s.setSelectedDate);
  const lastTapRef = React.useRef(0);

  const [activeModal, setActiveModal] = useState(null); // null | 'notifications'
  const [selectedDayInfo, setSelectedDayInfo] = useState(null); // { dateStr, pnlR, status, count }
  const [zoomImage, setZoomImage] = useState(null);

  const displayName = localStorage.getItem('hollowDisplayName') || 'mXm';

  // 1. Calculate overall Winrate metrics from executions
  const winRateMetrics = useMemo(() => {
    const finished = executions.filter(e => e.wl === 'Win' || e.wl === 'Loss');
    const total = finished.length;
    if (total === 0) return { pct: 0, wins: 0, losses: 0 };
    const wins = finished.filter(e => e.wl === 'Win').length;
    const losses = total - wins;
    return {
      pct: Math.round((wins / total) * 100),
      wins,
      losses
    };
  }, [executions]);

  // 2. Calculate today's P&L in R
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const dailyPnLinR = useMemo(() => {
    const todayExecs = executions.filter(e => {
      const dateStr = e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0];
      return dateStr === todayStr;
    });

    let totalR = 0;
    todayExecs.forEach(e => {
      if (e.rr !== undefined && e.rr !== null && e.rr !== '') {
        const num = parseFloat(String(e.rr).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) totalR += num;
      } else if (e.wl === 'Win') {
        totalR += 2.0;
      } else if (e.wl === 'Loss') {
        totalR -= 1.0;
      }
    });
    return totalR;
  }, [executions, todayStr]);

  // 3. Get 5 most recent executions
  const recentExecutions = useMemo(() => {
    const sorted = [...executions].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    return sorted.slice(0, 5);
  }, [executions]);

  // 4. Generate Mobile P&L Calendar optimized grid
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  
  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Day of the week for 1st day (0 = Sunday, 1 = Monday, etc.) - Sunday first!
    const startDayOfWeek = firstDay.getDay(); 
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    
    // Fill padding cells
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ padding: true, id: `pad-${i}` });
    }
    
    // Fill day cells with PNL lookup
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dayExecs = executions.filter(e => {
        const dStr = e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0];
        return dStr === dateStr;
      });
      
      let pnlR = 0;
      let count = dayExecs.length;
      let traded = count > 0;
      
      dayExecs.forEach(e => {
        if (e.rr !== undefined && e.rr !== null && e.rr !== '') {
          const num = parseFloat(String(e.rr).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) pnlR += num;
        } else if (e.wl === 'Win') {
          pnlR += 2.0;
        } else if (e.wl === 'Loss') {
          pnlR -= 1.0;
        }
      });
      
      let status = 'none'; // 'win', 'loss', 'breakeven', 'none'
      if (traded) {
        if (pnlR > 0.05) status = 'win';
        else if (pnlR < -0.05) status = 'loss';
        else status = 'breakeven';
      }
      
      cells.push({
        padding: false,
        id: dateStr,
        day,
        dateStr,
        pnlR,
        status,
        count
      });
    }
    
    return cells;
  }, [executions, currentCalendarDate]);

  const calendarRows = useMemo(() => {
    const rows = [];
    const tempCells = [...calendarData];
    
    let weekIndex = 1;
    while (tempCells.length > 0) {
      const weekCells = tempCells.splice(0, 7);
      
      // Pad end of month
      while (weekCells.length < 7) {
        weekCells.push({ padding: true, id: `pad-end-${weekCells.length}` });
      }
      
      // Calculate weekly metrics
      let weeklyPnL = 0;
      let weeklyTradedDays = 0;
      weekCells.forEach(d => {
        if (!d.padding && d.traded) {
          weeklyPnL += d.pnlR;
          weeklyTradedDays++;
        }
      });
      
      let weeklyStatus = 'none';
      if (weeklyTradedDays > 0) {
        if (weeklyPnL > 0.05) weeklyStatus = 'win';
        else if (weeklyPnL < -0.05) weeklyStatus = 'loss';
        else weeklyStatus = 'breakeven';
      }
      
      rows.push({
        weekIndex,
        cells: weekCells,
        weeklyPnL,
        weeklyTradedDays,
        weeklyStatus
      });
      weekIndex++;
    }
    return rows;
  }, [calendarData]);

  const selectedDayExecutions = useMemo(() => {
    if (!selectedDayInfo || !selectedDayInfo.dateStr) return [];
    return executions.filter(e => {
      const dateStr = e.date || new Date(e.timestamp || Date.now()).toISOString().split('T')[0];
      return dateStr === selectedDayInfo.dateStr;
    });
  }, [executions, selectedDayInfo]);

  const handleMonthShift = (direction) => {
    const nextDate = new Date(currentCalendarDate);
    nextDate.setMonth(nextDate.getMonth() + direction);
    setCurrentCalendarDate(nextDate);
    setSelectedDayInfo(null);
  };

  const handleScroll = (e) => {
    if (onScrollChange) onScrollChange(e.target.scrollTop);
  };

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
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '14px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: '0 0 2px 0',
            color: '#ffffff',
          }}>
            Hi, {displayName}
          </h1>
          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400 }}>
            Here's your trading overview
          </div>
        </div>

        {/* Notifications Icon (top right) */}
        <button
          onClick={() => setActiveModal('notifications')}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255, 255, 255, 0.8)',
            position: 'relative',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Bell size={19} />
          <span style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ff453a',
            boxShadow: '0 0 6px rgba(255, 69, 58, 0.8)',
          }} />
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        onScroll={handleScroll}
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
          gap: '20px',
        }}
      >
        
        {/* ── STATS ROW (Winrate + Daily PNL in R) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          
          {/* Winrate Card */}
          <div style={{
            background: '#09090b',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Win Rate
            </span>
            <div style={{ margin: '12px 0 6px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#b86eff', letterSpacing: '-0.02em' }}>
                {winRateMetrics.pct}%
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
              {winRateMetrics.wins}W — {winRateMetrics.losses}L
            </span>
          </div>

          {/* Daily PNL in R Card */}
          <div style={{
            background: '#09090b',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Daily P&amp;L (R)
            </span>
            <div style={{ margin: '12px 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 800,
                color: dailyPnLinR > 0.05 ? '#30d158' : (dailyPnLinR < -0.05 ? '#ff453a' : '#ffffff'),
                letterSpacing: '-0.02em'
              }}>
                {dailyPnLinR >= 0 ? `+${dailyPnLinR.toFixed(2)}R` : `${dailyPnLinR.toFixed(2)}R`}
              </span>
              {dailyPnLinR !== 0 && (
                <div style={{
                  color: dailyPnLinR > 0 ? '#30d158' : '#ff453a',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {dailyPnLinR > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Today's Net Outcome
            </span>
          </div>

        </div>

        {/* ── RECENT TRADING EXECUTIONS ── */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingLeft: '2px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recent Executions
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              Last 5 logs
            </span>
          </div>

          {recentExecutions.length === 0 ? (
            <div style={{
              background: '#09090b',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '24px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.35)',
              fontSize: '13px'
            }}>
              No executions logged yet. Tap "+" below to add your first execution.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentExecutions.map((exec) => {
                const isWin = exec.wl === 'Win';
                const isLoss = exec.wl === 'Loss';
                const hasImage = Array.isArray(exec.images) && exec.images.length > 0;
                const imgData = hasImage ? (Array.isArray(exec.images[0]) ? exec.images[0][0] : exec.images[0]) : null;

                // Format PNL / R for execution
                let rValueStr = '0.00R';
                if (exec.rr !== undefined && exec.rr !== null && exec.rr !== '') {
                  const num = parseFloat(String(exec.rr).replace(/[^0-9.-]/g, ''));
                  if (!isNaN(num)) {
                    rValueStr = num >= 0 ? `+${num.toFixed(2)}R` : `${num.toFixed(2)}R`;
                  }
                } else if (isWin) {
                  rValueStr = '+2.00R';
                } else if (isLoss) {
                  rValueStr = '-1.00R';
                }

                return (
                  <div
                    key={exec.id}
                    style={{
                      background: '#09090b',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '18px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    {/* Symbol / Direction bubble */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: exec.bias === 'Long' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                      border: exec.bias === 'Long' ? '1px solid rgba(48, 209, 88, 0.2)' : '1px solid rgba(255, 69, 58, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                        {exec.symbol || 'NQ'}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: exec.bias === 'Long' ? '#30d158' : '#ff453a',
                        textTransform: 'uppercase',
                        lineHeight: 1
                      }}>
                        {exec.bias === 'Long' ? 'Buy' : 'Sell'}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                          {exec.model || 'Standard Setup'}
                        </span>
                        {exec.rating && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            background: 'rgba(184, 110, 255, 0.15)',
                            color: '#b86eff',
                            padding: '2px 5px',
                            borderRadius: '4px',
                          }}>
                            {exec.rating}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {exec.date || new Date(exec.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Chart Thumbnail */}
                    {imgData && (
                      <div
                        onClick={() => setZoomImage(imgData)}
                        style={{
                          width: '46px',
                          height: '32px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.15)',
                          position: 'relative',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <img src={imgData} alt="setup" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Eye size={11} color="#fff" />
                        </div>
                      </div>
                    )}

                    {/* Result */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#ffd60a')
                      }}>
                        {rValueStr}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {exec.wl || 'Breakeven'}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── P&L CALENDAR OPTIMIZED FOR MOBILE ── */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingLeft: '2px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              P&amp;L Calendar
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleMonthShift(-1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', minWidth: '95px', textAlign: 'center' }}>
                {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => handleMonthShift(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div style={{
            background: '#09090b',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            
            {/* Weekdays Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', textAlign: 'center', columnGap: '4px' }}>
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'WEEKLY'].map((wd) => (
                <span key={wd} style={{ fontSize: '7.5px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {wd}
                </span>
              ))}
            </div>

            {/* Calendar Rows Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {calendarRows.map((row) => (
                <div key={row.weekIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', columnGap: '5px' }}>
                  {/* Render 7 Days of the Week */}
                  {row.cells.map((cell) => {
                    if (cell.padding) {
                      return (
                        <div key={cell.id} style={{
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.02)',
                          borderRadius: '6px',
                          minHeight: '52px'
                        }} />
                      );
                    }

                    const isCellToday = cell.dateStr === todayStr;
                    
                    let pnlColor = 'rgba(255, 255, 255, 0.4)';
                    let borderStyle = '1px solid rgba(255, 255, 255, 0.08)';
                    let cellBg = '#09090b';

                    if (cell.status === 'win') {
                      pnlColor = '#30d158'; // Green
                      borderStyle = '1px solid rgba(48, 209, 88, 0.35)';
                    } else if (cell.status === 'loss') {
                      pnlColor = '#ff453a'; // Red
                      borderStyle = '1px solid rgba(255, 69, 58, 0.35)';
                    } else if (cell.status === 'breakeven') {
                      pnlColor = '#ffd60a'; // Yellow
                      borderStyle = '1px solid rgba(255, 214, 10, 0.35)';
                    }

                    if (isCellToday) {
                      borderStyle = '1px solid #b86eff';
                    }

                    const handleDayClick = () => {
                      const now = Date.now();
                      if (selectedDayInfo && selectedDayInfo.dateStr === cell.dateStr && now - lastTapRef.current < 350) {
                        // Double click/tap detected!
                        setSelectedDate(cell.dateStr);
                        onNavigate('journal');
                      } else {
                        setSelectedDayInfo(cell);
                      }
                      lastTapRef.current = now;
                    };

                    return (
                      <div
                        key={cell.id}
                        onClick={handleDayClick}
                        style={{
                          background: cellBg,
                          border: borderStyle,
                          borderRadius: '6px',
                          padding: '4px 2px',
                          minHeight: '52px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          position: 'relative',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {/* Day Number in top-right */}
                        <span style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.35)', alignSelf: 'flex-end', paddingRight: '2px', lineHeight: 1 }}>
                          {cell.day}
                        </span>

                        {/* P&L outcome in center */}
                        {cell.traded ? (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            color: pnlColor,
                            textAlign: 'center',
                            lineHeight: 1.1,
                            letterSpacing: '-0.02em',
                            margin: '2px 0'
                          }}>
                            {cell.pnlR >= 0 ? `+${cell.pnlR.toFixed(1)}R` : `${cell.pnlR.toFixed(1)}R`}
                          </span>
                        ) : <div style={{ flex: 1 }} />}

                        {/* Trade count at bottom */}
                        {cell.traded ? (
                          <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', lineHeight: 1 }}>
                            {cell.count} {cell.count === 1 ? 'trade' : 'trades'}
                          </span>
                        ) : <div style={{ height: '7px' }} />}
                      </div>
                    );
                  })}

                  {/* WEEKLY Outcome Column */}
                  {(() => {
                    const isWeeklyPos = row.weeklyPnL > 0.05;
                    const isWeeklyNeg = row.weeklyPnL < -0.05;
                    const isWeeklyTraded = row.weeklyTradedDays > 0;
                    
                    let weeklyColor = 'rgba(255, 255, 255, 0.4)';
                    let weeklyBorder = '1px solid rgba(255, 255, 255, 0.04)';

                    if (isWeeklyTraded) {
                      if (isWeeklyPos) {
                        weeklyColor = '#30d158';
                        weeklyBorder = '1px solid rgba(48, 209, 88, 0.2)';
                      } else if (isWeeklyNeg) {
                        weeklyColor = '#ff453a';
                        weeklyBorder = '1px solid rgba(255, 69, 58, 0.2)';
                      } else {
                        weeklyColor = '#ffd60a';
                        weeklyBorder = '1px solid rgba(255, 214, 10, 0.2)';
                      }
                    }

                    return (
                      <div
                        key={`weekly-${row.weekIndex}`}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: weeklyBorder,
                          borderRadius: '6px',
                          padding: '4px 2px',
                          minHeight: '52px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          opacity: 0.85
                        }}
                      >
                        {/* Weekly Label */}
                        <span style={{ fontSize: '7px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1 }}>
                          Week {row.weekIndex}
                        </span>

                        {/* Weekly PNL */}
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          color: weeklyColor,
                          textAlign: 'center',
                          lineHeight: 1.1,
                          letterSpacing: '-0.02em',
                          margin: '2px 0'
                        }}>
                          {row.weeklyPnL >= 0 ? `+${row.weeklyPnL.toFixed(1)}R` : `${row.weeklyPnL.toFixed(1)}R`}
                        </span>

                        {/* Weekly active days */}
                        <span style={{ fontSize: '7px', color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', lineHeight: 1 }}>
                          {row.weeklyTradedDays} {row.weeklyTradedDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Selected day inline detail card */}
            {selectedDayInfo && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '14px',
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Header of selected day detail */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} color="#b86eff" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {new Date(selectedDayInfo.dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: selectedDayInfo.status === 'win' ? '#30d158' : (selectedDayInfo.status === 'loss' ? '#ff453a' : (selectedDayInfo.status === 'breakeven' ? '#ffd60a' : 'rgba(255,255,255,0.4)'))
                  }}>
                    {selectedDayInfo.traded
                      ? `Outcome: ${selectedDayInfo.pnlR >= 0 ? '+' : ''}${selectedDayInfo.pnlR.toFixed(2)}R`
                      : 'No Trades'
                    }
                  </span>
                </div>

                {/* Executions for selected day */}
                {selectedDayExecutions.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', padding: '8px 0' }}>
                    No executions recorded for this day.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDayExecutions.map(exec => {
                      const isWin = exec.wl === 'Win';
                      const isLoss = exec.wl === 'Loss';
                      const hasImage = Array.isArray(exec.images) && exec.images.length > 0;
                      const imgData = hasImage ? (Array.isArray(exec.images[0]) ? exec.images[0][0] : exec.images[0]) : null;

                      let rValueStr = '0.00R';
                      if (exec.rr !== undefined && exec.rr !== null && exec.rr !== '') {
                        const num = parseFloat(String(exec.rr).replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) {
                          rValueStr = num >= 0 ? `+${num.toFixed(2)}R` : `${num.toFixed(2)}R`;
                        }
                      } else if (isWin) {
                        rValueStr = '+2.00R';
                      } else if (isLoss) {
                        rValueStr = '-1.00R';
                      }

                      return (
                        <div
                          key={exec.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '12px',
                            padding: '8px 10px',
                          }}
                        >
                          {/* Mini Direction/Symbol bubble */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: exec.bias === 'Long' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                            border: exec.bias === 'Long' ? '1px solid rgba(48, 209, 88, 0.2)' : '1px solid rgba(255, 69, 58, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{exec.symbol || 'NQ'}</span>
                            <span style={{ fontSize: '7px', fontWeight: 700, color: exec.bias === 'Long' ? '#30d158' : '#ff453a', textTransform: 'uppercase', lineHeight: 1 }}>
                              {exec.bias === 'Long' ? 'Buy' : 'Sell'}
                            </span>
                          </div>

                          {/* Model & Rating */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {exec.model || 'Standard Setup'}
                              </span>
                              {exec.rating && (
                                <span style={{
                                  fontSize: '8px',
                                  fontWeight: 800,
                                  background: 'rgba(184, 110, 255, 0.15)',
                                  color: '#b86eff',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                }}>
                                  {exec.rating}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image zoom link */}
                          {imgData && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomImage(imgData);
                              }}
                              style={{
                                width: '38px',
                                height: '26px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.12)',
                                position: 'relative',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              <img src={imgData} alt="setup" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}

                          {/* Outcome R */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#ffd60a')
                            }}>
                              {rValueStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </div>

      </div>

      {/* ── MODALS / BOTTOM SHEETS ── */}
      <AnimatePresence>
        {activeModal === 'notifications' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '500px',
                background: '#0f0f11',
                borderRadius: '24px 24px 0 0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderBottom: 'none',
                paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
              }}
            >
              {/* Handle */}
              <div style={{
                width: '36px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '2px',
                margin: '12px auto 14px',
                flexShrink: 0,
              }} />

              {/* Modal Header */}
              <div style={{
                padding: '0 20px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  Notifications
                </span>
                <button
                  onClick={() => setActiveModal(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { title: 'Risk Buffer Alert', text: 'Apex 50K account is at 82% profit target threshold.', time: '10m ago', unread: true },
                    { title: 'Weekly Review Ready', text: 'Synthesize your trading performance for the week.', time: '1h ago', unread: true },
                    { title: 'Backup Saved', text: 'Automated portable PDF database backup generated.', time: '1d ago', unread: false }
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: item.unread ? 'rgba(184, 110, 255, 0.08)' : '#16161a',
                      border: item.unread ? '1px solid rgba(184, 110, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{item.title}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>{item.time}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FULL SCREEN ZOOM IMAGE OVERLAY ── */}
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
