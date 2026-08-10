import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { calculateTradePnL } from '../../utils/tradeMath';
import { 
  ChevronLeft, ChevronRight, Calendar, ClipboardList, Plus, Target, Clock, Tag, Smile
} from 'lucide-react';

export default function MobileJournalView({ addToast, onScrollChange }) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // Shift Date Helper
  const handleDateShift = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Fetch trades and executions for selected date
  const dayTrades = useLiveQuery(async () => {
    if (!selectedDate || !db || !db.trades) return [];
    return await db.trades.where('date').equals(selectedDate).toArray();
  }, [selectedDate]) || [];

  const allExecutions = useLiveQuery(async () => {
    if (!db || !db.executions) return [];
    return await db.executions.toArray();
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

    return {
      totalPnL,
      wins,
      losses,
      totalCount: dayTrades.length,
      totalR: totalR.toFixed(2)
    };
  }, [dayTrades, allExecutions]);

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: '#000000',
      color: '#ffffff',
      padding: '16px 16px 80px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header & Date Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>Daily Journal</h1>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Execution ledger</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => handleDateShift(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}>
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '6px 8px', borderRadius: '8px' }}
          />
          <button onClick={() => handleDateShift(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Daily Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Daily P&L</span>
          <div style={{ fontSize: '16px', fontWeight: '800', color: daySummary.totalPnL >= 0 ? '#30d158' : '#ff453a', marginTop: '2px' }}>
            {daySummary.totalPnL >= 0 ? '+' : ''}${Math.abs(daySummary.totalPnL).toLocaleString()}
          </div>
        </div>

        <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Executions</span>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
            {daySummary.totalCount} ({daySummary.wins}W / {daySummary.losses}L)
          </div>
        </div>
      </div>

      {/* Trade Log Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {dayTrades.length === 0 ? (
          <div style={{ background: '#0f0f11', border: '1px border-dashed rgba(255,255,255,0.1)', borderRadius: '14px', padding: '28px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
            No trades logged for this date
          </div>
        ) : (
          dayTrades.map(trade => {
            const tradeExecs = allExecutions.filter(e => e.tradeId === trade.id);
            const math = calculateTradePnL(trade, tradeExecs);
            const isWin = math.netPnL > 0;
            const isLoss = math.netPnL < 0;

            return (
              <div key={trade.id} style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '800', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                      {trade.symbol || 'NQ'}
                    </span>
                    <span style={{ background: trade.direction === 'SHORT' ? 'rgba(255,69,58,0.15)' : 'rgba(48,209,88,0.15)', color: trade.direction === 'SHORT' ? '#ff453a' : '#30d158', fontWeight: '800', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                      {trade.direction || 'LONG'}
                    </span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: isWin ? '#30d158' : (isLoss ? '#ff453a' : '#fff') }}>
                    {isWin ? '+' : ''}${Math.abs(math.netPnL).toLocaleString()}
                  </span>
                </div>

                {trade.commentExecution && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{trade.commentExecution}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
