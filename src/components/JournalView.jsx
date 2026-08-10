import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JournalView() {
  const isMobile = useUIStore(state => state.isMobile);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const setIsAddExecutionOpen = useUIStore(state => state.setIsAddExecutionOpen);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState(null);

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
    const winRate = eligibleCount > 0 ? ((wins / eligibleCount) * 100).toFixed(1) : '0.0';

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

  const openEditExecution = useUIStore(state => state.openEditExecution);

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

      {/* DAILY PERFORMANCE SUMMARY ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '14px'
      }}>
        {/* Card 1: R Return */}
        <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700' }}>R Return</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: daySummary.totalPnL >= 0 ? '#30d158' : '#ff453a', marginTop: '4px' }}>
            {daySummary.totalR >= 0 ? '+' : ''}{daySummary.totalR}R
          </div>
        </div>

        {/* Card 2: Day Win Rate */}
        <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700' }}>Day Win Rate</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
            {daySummary.winRate}%
          </div>
        </div>

        {/* Card 3: Trades Executed */}
        <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700' }}>Trades Executed</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
            {daySummary.totalCount} ({daySummary.wins}W / {daySummary.losses}L{daySummary.be > 0 ? ` / ${daySummary.be}BE` : ''})
          </div>
        </div>
      </div>

      {/* EXECUTIONS LIST SECTION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>
            Executions Logged for {selectedDate}
          </h2>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{dayTrades.length} trades recorded</span>
        </div>

        {allDayExecutionsList.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px border-dashed rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ClipboardList size={36} color="rgba(255,255,255,0.2)" />
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>No Executions Logged for This Date</div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', maxWidth: '360px' }}>
              Click below to record your trade execution, chart screenshots, PO3 timings, and target liquidities.
            </p>
            <button
              onClick={() => setIsAddExecutionOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #b86eff, #8a30f6)',
                color: '#fff',
                border: 'none',
                borderRadius: '100px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              + Add Execution
            </button>
          </div>
        ) : (
          allDayExecutionsList.map(trade => {
            const isWin = trade.netPnL > 0;
            const isLoss = trade.netPnL < 0;

            return (
              <div
                key={trade.id}
                onClick={() => openEditExecution(trade.rawExec || trade)}
                style={{
                  background: '#0f0f11',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(184, 110, 255, 0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              >
                {/* Trade Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      background: trade.symbol === 'ES' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(100, 210, 255, 0.15)',
                      color: trade.symbol === 'ES' ? '#ff453a' : '#64d2ff',
                      fontWeight: '800',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {trade.symbol || 'NQ'}
                    </span>

                    <span style={{
                      background: trade.direction === 'SHORT' ? 'rgba(255, 69, 58, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                      color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158',
                      fontWeight: '800',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {trade.direction || 'LONG'}
                    </span>

                    {trade.rating && (
                      <span style={{
                        background: 'rgba(184, 110, 255, 0.15)',
                        color: '#b86eff',
                        fontWeight: '800',
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}>
                        Grade {trade.rating}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '18px', fontWeight: '800', color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#ffffff') }}>
                    {isWin ? '+' : ''}${Math.abs(trade.netPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Custom Pills Row (DOL, PO3, Entry TF, Mindset) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {trade.dol && (
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={12} color="#b86eff" /> DOL: {trade.dol}
                    </span>
                  )}
                  {trade.po3Time && (
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#64d2ff" /> PO3: {trade.po3Time}
                    </span>
                  )}
                  {trade.entryTf && (
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={12} color="#ffd60a" /> TF: {trade.entryTf}
                    </span>
                  )}
                  {trade.mindsetTag && (
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Smile size={12} color="#30d158" /> {trade.mindsetTag}
                    </span>
                  )}
                </div>

                {/* Chart Screenshots Gallery */}
                {trade.images && trade.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginTop: '4px' }}>
                    {trade.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedLightboxImage(img.url || img)}
                        style={{
                          height: '90px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#000',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <img src={img.url || img} alt="Chart Screenshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Reflection Notes */}
                {(trade.commentExecution || trade.commentFazit) && (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', lineHeight: '1.5' }}>
                    {trade.commentExecution || trade.commentFazit}
                  </div>
                )}
              </div>
            );
          })
        )}
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
