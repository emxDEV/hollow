import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, TrendingDown, Award, Target, Zap, Clock, Shield, BookOpen, Camera, ChevronDown, ChevronLeft } from 'lucide-react';
import { calculateTradePnL } from '../../utils/tradeMath';

const fmt = (n) => {
  if (!n && n !== 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};

const STAT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'playbook', label: 'Playbook' },
  { id: 'discipline', label: 'Discipline' },
];

export default function MobileStatsView({ trades, executions, selectedAccountId, onSharePnL, onBack, onScrollChange }) {
  const [activeTab, setActiveTab] = useState('overview');

  const acctTrades = useMemo(() => {
    if (!selectedAccountId || selectedAccountId === 'all') return trades;
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  const enriched = useMemo(() => acctTrades.map(t => {
    const execs = executions.filter(e => e.tradeId === t.id);
    const { netPnL, grossPnL, commissions } = calculateTradePnL(t, execs);
    return { ...t, netPnL, grossPnL, commissions };
  }), [acctTrades, executions]);

  const stats = useMemo(() => {
    if (!enriched.length) return { total: 0, winRate: 0, pf: 0, avgWin: 0, avgLoss: 0, count: 0, bigWin: 0, bigLoss: 0 };
    const wins = enriched.filter(t => t.netPnL > 0);
    const losses = enriched.filter(t => t.netPnL < 0);
    const totalWin = wins.reduce((s, t) => s + t.netPnL, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));
    return {
      total: enriched.reduce((s, t) => s + t.netPnL, 0),
      winRate: (wins.length / enriched.length) * 100,
      pf: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 9.99 : 0,
      avgWin: wins.length ? totalWin / wins.length : 0,
      avgLoss: losses.length ? totalLoss / losses.length : 0,
      count: enriched.length,
      bigWin: wins.length ? Math.max(...wins.map(t => t.netPnL)) : 0,
      bigLoss: losses.length ? Math.max(...losses.map(t => Math.abs(t.netPnL))) : 0,
      winCount: wins.length,
      lossCount: losses.length
    };
  }, [enriched]);

  // Equity curve
  const equityCurve = useMemo(() => {
    const byDate = {};
    enriched.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = 0;
      byDate[t.date] += t.netPnL;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    let cum = 0;
    return sorted.map(([date, pnl]) => {
      cum += pnl;
      return { date: date.slice(5), value: Math.round(cum * 100) / 100 };
    });
  }, [enriched]);

  // By model for playbook
  const byModel = useMemo(() => {
    const groups = {};
    enriched.forEach(t => {
      const m = t.model || 'Unknown';
      if (!groups[m]) groups[m] = { model: m, trades: 0, wins: 0, pnl: 0 };
      groups[m].trades++;
      if (t.netPnL > 0) groups[m].wins++;
      groups[m].pnl += t.netPnL;
    });
    return Object.values(groups).sort((a, b) => b.pnl - a.pnl);
  }, [enriched]);

  // By symbol
  const bySymbol = useMemo(() => {
    const groups = {};
    enriched.forEach(t => {
      const s = t.symbol || 'Unknown';
      if (!groups[s]) groups[s] = { symbol: s, trades: 0, wins: 0, pnl: 0 };
      groups[s].trades++;
      if (t.netPnL > 0) groups[s].wins++;
      groups[s].pnl += t.netPnL;
    });
    return Object.values(groups).sort((a, b) => b.pnl - a.pnl);
  }, [enriched]);

  // Mistake freq
  const mistakeFreq = useMemo(() => {
    const freq = {};
    enriched.forEach(t => {
      (t.mistakes || []).forEach(m => {
        freq[m] = (freq[m] || 0) + 1;
      });
    });
    return Object.entries(freq).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [enriched]);

  const isPositive = stats.total >= 0;
  const [isScrolled, setIsScrolled] = useState(false);
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setIsScrolled(scrollTop > 10);
    if (onScrollChange) {
      onScrollChange(scrollTop);
    }
  };

  const OVERVIEW_KPIS = [
    { label: 'Net P&L', value: fmt(stats.total), color: isPositive ? '#30d158' : '#ff453a', icon: TrendingUp },
    { label: 'Win Rate', value: `${stats.winRate.toFixed(0)}%`, color: '#0a84ff', icon: Target },
    { label: 'Profit Factor', value: stats.pf.toFixed(2), color: '#ff9f0a', icon: Zap },
    { label: 'Total Trades', value: stats.count, color: '#bf5af2', icon: BookOpen },
    { label: 'Avg Win', value: `$${stats.avgWin.toFixed(0)}`, color: '#30d158', icon: Award },
    { label: 'Avg Loss', value: `$${stats.avgLoss.toFixed(0)}`, color: '#ff453a', icon: Shield },
  ];

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: '#000' }}>
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
          ? 'linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.98) 40%, rgba(0, 0, 0, 0.85) 70%, rgba(0, 0, 0, 0) 100%)'
          : 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginRight: 4
                }}
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div style={{
              opacity: isScrolled ? 0 : 1,
              transform: isScrolled ? 'translateY(-4px)' : 'translateY(0)',
              transition: 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isScrolled ? 'none' : 'auto'
            }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0, marginBottom: 2 }}>
                performance.
              </h1>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {stats.count} trades · {stats.winRate.toFixed(0)}% win rate
              </span>
            </div>
          </div>
          {stats.count > 0 && (
            <button
              onClick={() => onSharePnL && onSharePnL('daily')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <Camera size={13} />
              <span>Share</span>
              <ChevronDown size={12} color="rgba(255, 255, 255, 0.5)" />
            </button>
          )}
        </div>

        {/* Tab Strip */}
        <div style={{
          display: 'flex',
          background: '#1c1c1e',
          borderRadius: 12,
          padding: 3
        }}>
          {STAT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: activeTab === tab.id ? '#2c2c2e' : 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '8px 4px',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
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
          paddingTop: 'calc(var(--safe-top) + 144px)',
          paddingBottom: 'calc(64px + var(--safe-bottom) + 24px)'
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Equity Chart */}
              {equityCurve.length > 1 && (
                <div style={{ padding: '0 16px', marginBottom: 16 }}>
                  <div style={{
                    background: '#0f0f11',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '16px 0 8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '0 16px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Equity Curve</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: isPositive ? '#30d158' : '#ff453a', letterSpacing: '-0.02em' }}>
                        {fmt(stats.total)}
                      </div>
                    </div>
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityCurve} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="statsCurveGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isPositive ? '#30d158' : '#ff453a'} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={isPositive ? '#30d158' : '#ff453a'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Area type="monotone" dataKey="value" stroke={isPositive ? '#30d158' : '#ff453a'} strokeWidth={2} fill="url(#statsCurveGrad)" dot={false} />
                          <Tooltip
                            contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                            formatter={(v) => [`$${v.toFixed(2)}`, 'Equity']}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Grid */}
              <div style={{ padding: '0 16px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {OVERVIEW_KPIS.map((k, i) => {
                    const Icon = k.icon;
                    return (
                      <div
                        key={k.label}
                        style={{
                          background: '#0f0f11',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 16,
                          padding: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Icon size={14} color={k.color} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {k.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: k.color }}>
                          {k.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Win/Loss breakdown */}
              <div style={{ padding: '0 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Win / Loss Breakdown
                </div>
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ height: 6, borderRadius: 3, background: '#30d158', flex: stats.winCount, transition: 'flex 0.4s' }} />
                    <div style={{ height: 6, borderRadius: 3, background: '#ff453a', flex: stats.lossCount, transition: 'flex 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#30d158' }}>{stats.winCount}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>wins</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#ff453a' }}>{stats.lossCount}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>losses</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* By Symbol */}
              {bySymbol.length > 0 && (
                <div style={{ padding: '0 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    By Symbol
                  </div>
                  <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    {bySymbol.slice(0, 5).map((s, i) => {
                      const wr = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
                      return (
                        <div key={s.symbol} style={{
                          padding: '12px 16px',
                          borderBottom: i < Math.min(bySymbol.length, 5) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: s.pnl >= 0 ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            color: s.pnl >= 0 ? '#30d158' : '#ff453a'
                          }}>
                            {s.symbol.slice(0, 2)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{s.symbol}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.trades} trades · {wr.toFixed(0)}% wr</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: s.pnl >= 0 ? '#30d158' : '#ff453a' }}>
                            {fmt(s.pnl)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'playbook' && (
            <motion.div key="playbook" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ padding: '0 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Strategy Performance
                </div>
                {byModel.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                    No model data yet
                  </div>
                ) : (
                  <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    {byModel.map((m, i) => {
                      const wr = m.trades > 0 ? (m.wins / m.trades) * 100 : 0;
                      const isPos = m.pnl >= 0;
                      return (
                        <div key={m.model} style={{
                          padding: '14px 16px',
                          borderBottom: i < byModel.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.model}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                {m.trades} trades · {wr.toFixed(0)}% wr
                              </div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: isPos ? '#30d158' : '#ff453a', marginLeft: 12 }}>
                              {fmt(m.pnl)}
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${wr}%`,
                              background: isPos ? '#30d158' : '#ff453a',
                              borderRadius: 2,
                              transition: 'width 0.4s'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'discipline' && (
            <motion.div key="discipline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ padding: '0 16px' }}>
                {/* Key discipline metrics */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Risk Metrics
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Best Trade</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#30d158' }}>{fmt(stats.bigWin)}</div>
                    </div>
                    <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Worst Trade</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#ff453a' }}>-{fmt(stats.bigLoss)}</div>
                    </div>
                    <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Avg Win</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#30d158' }}>${stats.avgWin.toFixed(0)}</div>
                    </div>
                    <div style={{ background: '#0f0f11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Avg Loss</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#ff453a' }}>${stats.avgLoss.toFixed(0)}</div>
                    </div>
                  </div>
                </div>

                {/* Mistakes */}
                {mistakeFreq.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Top Mistakes
                    </div>
                    <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      {mistakeFreq.map((m, i) => (
                        <div key={m.name} style={{
                          padding: '12px 16px',
                          borderBottom: i < mistakeFreq.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'rgba(255,69,58,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 800,
                            color: '#ff453a',
                            flexShrink: 0
                          }}>
                            {m.count}
                          </div>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{m.name}</span>
                          <div style={{ height: 4, width: 60, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, (m.count / mistakeFreq[0].count) * 100)}%`,
                              background: '#ff453a',
                              borderRadius: 2
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mistakeFreq.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                    No mistakes logged yet — great discipline!
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
