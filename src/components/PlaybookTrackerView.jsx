import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Compass, Award } from 'lucide-react';
import { calculateTradePnL } from '../utils/tradeMath';

export default function PlaybookTrackerView({ trades, executions, selectedAccountId }) {
  
  // Filter trades to this account
  const accountTrades = useMemo(() => {
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  // Group trades by playbook model
  const playbookStats = useMemo(() => {
    const groups = {};

    accountTrades.forEach(trade => {
      const modelName = trade.model || 'Unmapped Setups';
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const { netPnL } = calculateTradePnL(trade, tradeExecs);

      if (!groups[modelName]) {
        groups[modelName] = {
          name: modelName,
          trades: [],
          wins: 0,
          losses: 0,
          totalPnL: 0,
          equityCurve: [0]
        };
      }

      groups[modelName].trades.push({
        ...trade,
        netPnL
      });
      groups[modelName].totalPnL += netPnL;
      
      if (netPnL > 0) {
        groups[modelName].wins++;
      } else if (netPnL < 0) {
        groups[modelName].losses++;
      }
    });

    return Object.values(groups).map(group => {
      const sorted = [...group.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      let runningSum = 0;
      const curve = [{ value: 0 }];
      
      sorted.forEach(t => {
        runningSum += t.netPnL;
        curve.push({ value: Math.round(runningSum) });
      });

      const total = group.wins + group.losses;
      const winRate = total > 0 ? (group.wins / total) * 100 : 0;

      return {
        name: group.name,
        totalTrades: total,
        wins: group.wins,
        losses: group.losses,
        winRate,
        totalPnL: group.totalPnL,
        curveData: curve
      };
    });
  }, [accountTrades, executions]);

  // Find the top performing strategy by Win Rate to featured highlight it (Sapphire Inversion card)
  const topStrategyName = useMemo(() => {
    if (playbookStats.length === 0) return null;
    const sorted = [...playbookStats].sort((a, b) => b.winRate - a.winRate);
    return sorted[0].name;
  }, [playbookStats]);

  // Session heat mapping data (Strategy vs Session slots)
  const sessionMatrix = useMemo(() => {
    const sessions = ['London Session', 'NY Open Morning', 'NY Close Session', 'Asia Session'];
    const models = playbookStats.map(p => p.name);

    if (models.length === 0) {
      return { sessions, models: [], grid: {} };
    }

    const grid = {};
    models.forEach(model => {
      grid[model] = {};
      sessions.forEach(session => {
        const relatedTrades = accountTrades.filter(t => {
          const isModel = (t.model || 'Unmapped Setups') === model;
          if (!isModel) return false;
          
          const text = (t.commentBias + t.confluences.join(' ')).toLowerCase();
          if (session === 'London Session') return text.includes('london') || text.includes('lnd');
          if (session === 'NY Open Morning') return text.includes('9:30') || text.includes('morning') || text.includes('open') || text.includes('silver bullet') || text.includes('ny');
          if (session === 'NY Close Session') return text.includes('afternoon') || text.includes('close');
          if (session === 'Asia Session') return text.includes('asia') || text.includes('tokyo');
          return false;
        });

        let wins = 0;
        relatedTrades.forEach(t => {
          const tExecs = executions.filter(e => e.tradeId === t.id);
          const { netPnL } = calculateTradePnL(t, tExecs);
          if (netPnL > 0) wins++;
        });

        grid[model][session] = {
          tradesCount: relatedTrades.length,
          winRate: relatedTrades.length > 0 ? Math.round((wins / relatedTrades.length) * 100) : null
        };
      });
    });

    return { sessions, models, grid };
  }, [playbookStats, accountTrades, executions]);

  const getHeatColor = (wr) => {
    if (wr === null) return 'rgba(255, 255, 255, 0.02)';
    if (wr >= 70) return 'rgba(0, 168, 126, 0.3)'; 
    if (wr >= 50) return 'rgba(123, 160, 192, 0.2)'; 
    return 'rgba(226, 59, 74, 0.2)'; 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Info Panel */}
      <div className="hollow-view-header" style={{ marginBottom: '4px' }}>
        <div className="hollow-view-header-title-block">
          <h1>
            <Compass size={28} color="var(--colors-primary)" /> Playbook Tracker
          </h1>
          <p>
            Strategy performance auditing and session distribution heatmap
          </p>
        </div>
      </div>

      {/* Grid of Strategy Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {playbookStats.length === 0 ? (
          <div className="hollow-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--colors-stone)' }}>
            <Compass size={40} style={{ marginBottom: '12px', color: 'var(--colors-primary)' }} />
            <p>No mapped playbook strategies found under this account.</p>
            <p style={{ fontSize: '12px', color: 'var(--colors-stone)', marginTop: '4px' }}>Label trades with a playbook strategy name in the Detail Drawer.</p>
          </div>
        ) : (
          playbookStats.map(play => {
            const isTopFeatured = play.name === topStrategyName;
            return (
              <div 
                className={`hollow-card ${isTopFeatured ? 'active' : ''}`} 
                key={play.name} 
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {isTopFeatured && (
                      <span style={{ 
                        fontSize: '9px', 
                        background: 'rgba(255,255,255,0.15)', 
                        color: '#fff', 
                        padding: '2px 8px', 
                        borderRadius: 'var(--radius-full)',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        display: 'inline-block',
                        marginBottom: '6px'
                      }}>
                        Featured Model
                      </span>
                    )}
                    <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#fff' }}>{play.name}</h3>
                    <span style={{ fontSize: '12px', color: isTopFeatured ? 'rgba(255,255,255,0.8)' : 'var(--colors-stone)', marginTop: '4px', display: 'block' }}>
                      {play.totalTrades} Trade(s) • WR: <strong style={{ color: isTopFeatured ? '#fff' : 'var(--colors-gain)' }}>{play.winRate.toFixed(0)}%</strong>
                    </span>
                  </div>
                  <div style={{
                    background: isTopFeatured ? 'rgba(255, 255, 255, 0.15)' : (play.totalPnL >= 0 ? 'var(--colors-gain-dim)' : 'var(--colors-loss-dim)'),
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: isTopFeatured ? '#fff' : (play.totalPnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)') }}>
                      {play.totalPnL >= 0 ? '+' : ''}${Math.round(play.totalPnL).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Mini Sparkline Chart */}
                <div style={{ height: '50px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', padding: '6px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={play.curveData}>
                      <Line type="monotone" dataKey="value" stroke={isTopFeatured ? '#fff' : 'var(--colors-primary)'} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: isTopFeatured ? 'rgba(255,255,255,0.8)' : 'var(--colors-stone)' }}>
                  <span>Wins: <strong style={{ color: isTopFeatured ? '#fff' : 'var(--colors-gain)' }}>{play.wins}</strong></span>
                  <span>Losses: <strong style={{ color: isTopFeatured ? '#fff' : 'var(--colors-loss)' }}>{play.losses}</strong></span>
                  <span>Avg Return: <strong style={{ color: '#fff' }}>${Math.round(play.totalPnL / play.totalTrades).toLocaleString()}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PLAYBOOK HEATMAP MATRIX */}
      {sessionMatrix.models.length > 0 && (
        <div className="hollow-card">
          <h3 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--colors-on-dark)' }}>
            <Award size={16} color="var(--colors-primary)" /> Playbook Session Win Matrix
          </h3>
          <p style={{ color: 'var(--colors-on-dark-mute)', fontSize: '12px', marginBottom: '20px' }}>
            Analyzes how strategies perform across active global market session timings.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--colors-hairline-dark)', color: 'var(--colors-stone)', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Playbook Strategy</th>
                  {sessionMatrix.sessions.map(sess => (
                    <th key={sess} style={{ padding: '12px 16px', textAlign: 'center' }}>{sess}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px' }}>
                {sessionMatrix.models.map(model => (
                  <tr key={model} style={{ borderBottom: '1px solid var(--colors-hairline-dark)' }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#fff' }}>{model}</td>
                    
                    {sessionMatrix.sessions.map(session => {
                      const cell = sessionMatrix.grid[model][session];
                      const wr = cell.winRate;

                      return (
                        <td key={session} style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{
                            background: getHeatColor(wr),
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-full)',
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minWidth: '80px',
                            border: wr !== null ? '1px solid rgba(255, 255, 255, 0.05)' : '1px dashed rgba(255,255,255,0.08)'
                          }}>
                            {wr !== null ? (
                              <>
                                <span className="mono" style={{ fontSize: '13px', fontWeight: '700', color: wr >= 50 ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                                  {wr}%
                                </span>
                                <span style={{ fontSize: '9px', color: 'var(--colors-stone)', marginTop: '2px' }}>
                                  {cell.tradesCount} Trade(s)
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>No Trades</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px', color: 'var(--colors-stone)', borderTop: '1px solid var(--colors-hairline-dark)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(226, 59, 74, 0.2)' }} /> Underperforming (&lt;50% Winrate)
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(123, 160, 192, 0.2)' }} /> Moderate (50%-70% Winrate)
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(0, 168, 126, 0.3)' }} /> Highly Profitable (&gt;70% Winrate)
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
