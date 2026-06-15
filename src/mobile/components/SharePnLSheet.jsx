import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, RotateCw } from 'lucide-react';
import { calculateTradePnL } from '../../utils/tradeMath';
import { getWeekDates } from '../../utils/dateUtils';

const STOIC_QUOTES = {
  win: [
    { text: "No random actions, none not based on underlying principles.", author: "Marcus Aurelius" },
    { text: "If you want steady, choose discipline. If you want fleeting, choose motivation.", author: "Stoic Maxim" },
    { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
    { text: "Keep constant guard over your perceptions, for they are the source of all your actions.", author: "Epictetus" }
  ],
  loss: [
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Difficulty is what wakes up the genius.", author: "Seneca" }
  ]
};

function getMondayOfDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

export default function SharePnLSheet({ onClose, trades, executions, selectedAccountId, initialMode = 'daily' }) {
  const [exportMode, setExportMode] = useState(initialMode); // 'daily' | 'weekly'
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Filter trades to this account
  const accountTrades = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return trades;
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  // Compute trade metrics
  const tradeMetrics = useMemo(() => {
    return accountTrades.map(trade => {
      const execs = executions.filter(e => e.tradeId === trade.id);
      const { netPnL } = calculateTradePnL(trade, execs);
      return {
        ...trade,
        netPnL
      };
    });
  }, [accountTrades, executions]);

  // Group daily P&L records
  const dailyRecords = useMemo(() => {
    const dailyMap = {};
    tradeMetrics.forEach(t => {
      if (!t.date) return;
      const dateKey = t.date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          netPnL: 0,
          tradesCount: 0,
          winCount: 0,
          bestReturn: -Infinity,
          tickers: new Set()
        };
      }
      const record = dailyMap[dateKey];
      record.netPnL += t.netPnL;
      record.tradesCount += 1;
      if (t.netPnL > 0) record.winCount += 1;
      if (t.netPnL > record.bestReturn) record.bestReturn = t.netPnL;
      if (t.symbol) record.tickers.add(t.symbol);
    });

    return Object.values(dailyMap)
      .map(record => ({
        ...record,
        bestReturn: record.bestReturn === -Infinity ? 0 : record.bestReturn,
        winRate: record.tradesCount > 0 ? Math.round((record.winCount / record.tradesCount) * 100) : 0,
        tickersList: Array.from(record.tickers).join(', ')
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [tradeMetrics]);

  // Group weekly P&L records
  const weeklyRecords = useMemo(() => {
    const weeklyMap = {};
    tradeMetrics.forEach(t => {
      if (!t.date) return;
      const mondayKey = getMondayOfDate(t.date);
      if (!weeklyMap[mondayKey]) {
        weeklyMap[mondayKey] = {
          monday: mondayKey,
          netPnL: 0,
          tradesCount: 0,
          winCount: 0,
          bestReturn: -Infinity,
          tickers: new Set()
        };
      }
      const record = weeklyMap[mondayKey];
      record.netPnL += t.netPnL;
      record.tradesCount += 1;
      if (t.netPnL > 0) record.winCount += 1;
      if (t.netPnL > record.bestReturn) record.bestReturn = t.netPnL;
      if (t.symbol) record.tickers.add(t.symbol);
    });

    return Object.values(weeklyMap)
      .map(record => {
        const monDate = new Date(record.monday);
        const friDate = new Date(monDate);
        friDate.setDate(monDate.getDate() + 4);
        const rangeStr = `${record.monday} — ${friDate.toISOString().split('T')[0]}`;
        return {
          ...record,
          rangeLabel: rangeStr,
          bestReturn: record.bestReturn === -Infinity ? 0 : record.bestReturn,
          winRate: record.tradesCount > 0 ? Math.round((record.winCount / record.tradesCount) * 100) : 0,
          tickersList: Array.from(record.tickers).join(', ')
        };
      })
      .sort((a, b) => new Date(b.monday) - new Date(a.monday));
  }, [tradeMetrics]);

  useEffect(() => {
    setQuoteIndex(0);
  }, [exportMode]);

  const activeRecord = useMemo(() => {
    if (exportMode === 'daily') {
      return dailyRecords.length > 0 ? dailyRecords[0] : null;
    } else {
      return weeklyRecords.length > 0 ? weeklyRecords[0] : null;
    }
  }, [exportMode, dailyRecords, weeklyRecords]);

  const handleExport = async () => {
    const cardEl = document.getElementById('mobile-stoic-share-card');
    if (!cardEl) return;
    setExporting(true);

    const html2canvas = (await import('html2canvas')).default;

    html2canvas(cardEl, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#000000',
      logging: false
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const filenameSuffix = exportMode === 'daily' 
        ? (activeRecord?.date || 'daily') 
        : (activeRecord?.monday || 'weekly');
      link.download = `hollow_pnl_${exportMode}_${filenameSuffix}.png`;
      link.href = imgData;
      link.click();
      setExporting(false);
    }).catch(err => {
      console.error(err);
      setExporting(false);
    });
  };

  const isWin = activeRecord ? activeRecord.netPnL >= 0 : true;
  const accentColor = isWin ? '#30d158' : '#ff453a';
  const quotesList = isWin ? STOIC_QUOTES.win : STOIC_QUOTES.loss;
  const currentQuote = quotesList[quoteIndex % quotesList.length] || quotesList[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="bottom-sheet-overlay"
      style={{ zIndex: 2000 }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        onClick={e => e.stopPropagation()}
        className="bottom-sheet"
        style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '95vh', overflow: 'hidden' }}
      >
        <div className="sheet-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Share Performance</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#1c1c1e', borderRadius: 12, padding: 3, margin: '0 20px' }}>
          {['daily', 'weekly'].map(mode => (
            <button
              key={mode}
              onClick={() => setExportMode(mode)}
              style={{
                flex: 1,
                background: exportMode === mode ? '#2c2c2e' : 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '8px 0',
                color: exportMode === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {mode} Card
            </button>
          ))}
        </div>

        {/* Preview block */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 20px', overflowY: 'auto' }}>
          {activeRecord ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              {/* Scaled Preview Wrapper */}
              <div style={{
                width: 320,
                height: 320,
                transform: 'scale(0.85)',
                transformOrigin: 'center center',
                margin: '-20px 0',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div 
                  id="mobile-stoic-share-card"
                  style={{
                    width: '320px',
                    height: '320px',
                    background: isWin 
                      ? 'radial-gradient(circle at 100% 0%, rgba(48, 209, 88, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(10, 132, 255, 0.08) 0%, transparent 60%), #09090b'
                      : 'radial-gradient(circle at 100% 0%, rgba(255, 69, 58, 0.15) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(191, 90, 242, 0.08) 0%, transparent 60%), #09090b',
                    padding: '24px 22px 20px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                    position: 'relative',
                    fontFamily: 'var(--font)'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: accentColor,
                    opacity: 0.12,
                    filter: 'blur(35px)',
                    pointerEvents: 'none'
                  }} />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                        {exportMode === 'daily' ? 'daily performance' : 'weekly performance'}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', marginTop: 3 }}>
                        {exportMode === 'daily' ? activeRecord.date : activeRecord.rangeLabel}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#fff', letterSpacing: '2px', fontWeight: '800', opacity: 0.8 }}>
                      hollow.
                    </div>
                  </div>

                  {/* Net return */}
                  <div style={{ margin: '14px 0 10px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                      {exportMode === 'daily' ? 'net pnl' : 'weekly return'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '34px',
                        fontWeight: '900',
                        color: accentColor,
                        letterSpacing: '-1.5px',
                        textShadow: `0 0 20px ${isWin ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 69, 58, 0.25)'}`
                      }}>
                        {activeRecord.netPnL >= 0 ? '+' : ''}${Math.round(activeRecord.netPnL).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 14px'
                  }}>
                    <div>
                      <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1.5px', fontWeight: '800' }}>
                        trades / winrate
                      </span>
                      <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                        {activeRecord.tradesCount} pos / {activeRecord.winRate}%
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1.5px', fontWeight: '800' }}>
                        best return
                      </span>
                      <span style={{ fontSize: '11px', color: '#f4f4f5', fontWeight: '700' }}>
                        {activeRecord.bestReturn > 0 ? '+' : ''}${Math.round(activeRecord.bestReturn).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', display: 'block', letterSpacing: '1.5px', fontWeight: '800' }}>
                        symbols traded
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {activeRecord.tickersList || 'none'}
                      </span>
                    </div>
                  </div>

                  {/* Quote */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    borderLeft: `2.5px solid ${accentColor}`,
                    background: 'rgba(255,255,255,0.015)',
                    padding: '6px 12px',
                    borderRadius: '0 8px 8px 0',
                    marginTop: 10
                  }}>
                    <div style={{ fontSize: '9.5px', fontStyle: 'italic', color: '#e4e4e7', lineHeight: '1.4', fontWeight: '400' }}>
                      "{currentQuote.text}"
                    </div>
                    <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.4)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                      — {currentQuote.author}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cycle Quote Controls */}
              <button
                onClick={() => setQuoteIndex(prev => prev + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '8px 12px'
                }}
              >
                <RotateCw size={13} />
                Cycle Quote
              </button>
            </div>
          ) : (
            <div style={{ padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              No trading records found to share.
            </div>
          )}
        </div>

        {/* Action button */}
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={handleExport}
            disabled={!activeRecord || exporting}
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
              gap: 8,
              opacity: (!activeRecord || exporting) ? 0.6 : 1
            }}
          >
            <Download size={18} />
            {exporting ? 'Generating PNG...' : 'Export PNG to Device'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
