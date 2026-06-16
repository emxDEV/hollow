import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, ChevronRight, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { calculateTradePnL } from '../../utils/tradeMath';

const fmt = (n) => {
  if (!n && n !== 0) return '$0.00';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${abs.toFixed(2)}`;
};

const FILTER_BIASES = ['All', 'LONG', 'SHORT'];
const FILTER_OUTCOMES = ['All', 'Win', 'Loss', 'Breakeven'];

export default function TradesView({ trades, executions, accounts, selectedAccountId, onSelectTrade, onScrollChange }) {
  const [query, setQuery] = useState('');
  const [biasFil, setBiasFil] = useState('All');
  const [outcomeFil, setOutcomeFil] = useState('All');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'pnl'
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setIsScrolled(scrollTop > 10);
    if (onScrollChange) {
      onScrollChange(scrollTop);
    }
  };

  const acctTrades = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return trades;
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  const enriched = useMemo(() => acctTrades.map(t => {
    const execs = executions.filter(e => e.tradeId === t.id);
    const { netPnL } = calculateTradePnL(t, execs);
    return { ...t, netPnL };
  }), [acctTrades, executions]);

  const filtered = useMemo(() => {
    let r = enriched;

    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(t =>
        t.symbol?.toLowerCase().includes(q) ||
        t.model?.toLowerCase().includes(q) ||
        t.date?.includes(q)
      );
    }

    if (biasFil !== 'All') r = r.filter(t => t.bias === biasFil);

    if (outcomeFil === 'Win') r = r.filter(t => t.netPnL > 0);
    else if (outcomeFil === 'Loss') r = r.filter(t => t.netPnL < 0);
    else if (outcomeFil === 'Breakeven') r = r.filter(t => t.netPnL === 0);

    return [...r].sort((a, b) => {
      if (sortBy === 'date') {
        return sortDir === 'desc'
          ? b.date?.localeCompare(a.date)
          : a.date?.localeCompare(b.date);
      }
      if (sortBy === 'pnl') {
        return sortDir === 'desc' ? b.netPnL - a.netPnL : a.netPnL - b.netPnL;
      }
      return 0;
    });
  }, [enriched, query, biasFil, outcomeFil, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const totalPnL = filtered.reduce((s, t) => s + t.netPnL, 0);
  const hasFilters = biasFil !== 'All' || outcomeFil !== 'All' || query.trim();

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        background: isScrolled
          ? 'rgba(15, 15, 17, 0.55)'
          : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        boxShadow: 'none',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#fff',
          textTransform: 'lowercase',
          margin: 0,
          opacity: isScrolled ? 0 : 1,
          transform: isScrolled ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isScrolled ? 'none' : 'auto'
        }}>
          trades.
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: totalPnL >= 0 ? '#30d158' : '#ff453a',
            letterSpacing: '-0.01em'
          }}>
            {fmt(totalPnL)}
          </span>
          <button
            onClick={() => setShowFilters(true)}
            style={{
              background: hasFilters ? 'rgba(10,132,255,0.12)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${hasFilters ? 'rgba(10,132,255,0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 20,
              padding: '6px 12px',
              color: hasFilters ? '#0a84ff' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Filter</span>
            <ChevronDown size={12} color={hasFilters ? '#0a84ff' : 'rgba(255, 255, 255, 0.5)'} />
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div 
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(var(--safe-top) + 80px)',
          paddingBottom: 'calc(64px + var(--safe-bottom) + 24px)'
        }}
      >
        {/* Search & Sort inside Scroll Area */}
        <div style={{ padding: '0 16px' }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#1c1c1e',
            borderRadius: 12,
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 14
          }}>
            <Search size={16} color="rgba(255,255,255,0.3)" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search symbol, model, date…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 15,
                fontFamily: 'var(--font)'
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { field: 'date', label: 'Date' },
              { field: 'pnl', label: 'P&L' },
            ].map(({ field, label }) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                style={{
                  background: sortBy === field ? '#fff' : '#1c1c1e',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '5px 12px',
                  color: sortBy === field ? '#000' : 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {label}
                {sortBy === field && (
                  <span style={{ fontSize: 10 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.35)', alignSelf: 'center' }}>
              {filtered.length} trades
            </span>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>No trades found</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {hasFilters ? 'Try adjusting filters' : 'Add your first trade using +'}
            </div>
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            {filtered.map((t, i) => {
              const isWin = t.netPnL > 0;
              const isLoss = t.netPnL < 0;
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                  onClick={() => onSelectTrade(t.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: 'pointer',
                    gap: 12,
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: isWin ? 'rgba(48,209,88,0.12)' : isLoss ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isWin
                      ? <TrendingUp size={18} color="#30d158" />
                      : isLoss
                        ? <TrendingDown size={18} color="#ff453a" />
                        : <div style={{ width: 8, height: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t.symbol}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: t.bias === 'LONG' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
                        color: t.bias === 'LONG' ? '#30d158' : '#ff453a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {t.bias}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.date} · {t.model || '—'}
                    </div>
                  </div>

                  {/* PnL */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isWin ? '#30d158' : isLoss ? '#ff453a' : 'rgba(255,255,255,0.5)' }}>
                      {fmt(t.netPnL)}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>net</div>
                  </div>

                  <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFilters(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 500,
              display: 'flex',
              alignItems: 'flex-end'
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
                background: '#1c1c1e',
                borderRadius: '20px 20px 0 0',
                border: '1px solid rgba(255,255,255,0.1)',
                borderBottom: 'none',
                paddingBottom: 'calc(var(--safe-bottom) + 16px)'
              }}
            >
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 20px' }} />
              <div style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Filters</span>
                  <button
                    onClick={() => { setBiasFil('All'); setOutcomeFil('All'); }}
                    style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reset
                  </button>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Bias
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {FILTER_BIASES.map(b => (
                      <button
                        key={b}
                        onClick={() => setBiasFil(b)}
                        style={{
                          background: biasFil === b ? '#fff' : '#2c2c2e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 20,
                          padding: '8px 16px',
                          color: biasFil === b ? '#000' : 'rgba(255,255,255,0.7)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Outcome
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {FILTER_OUTCOMES.map(o => (
                      <button
                        key={o}
                        onClick={() => setOutcomeFil(o)}
                        style={{
                          background: outcomeFil === o ? '#fff' : '#2c2c2e',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 20,
                          padding: '8px 16px',
                          color: outcomeFil === o ? '#000' : 'rgba(255,255,255,0.7)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowFilters(false)}
                  style={{
                    width: '100%',
                    background: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#000',
                    cursor: 'pointer'
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
