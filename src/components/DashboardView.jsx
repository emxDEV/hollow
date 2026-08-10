import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { useUIStore } from '../store/useUIStore';
import { calculateTradePnL } from '../utils/tradeMath';
import { 
  BookOpen, 
  ClipboardCheck, 
  Calendar,
  ArrowRight,
  Plus,
  Zap,
  Activity,
  Trash2,
  TrendingUp,
  BarChart2,
  Target,
  Radio
} from 'lucide-react';

export default function DashboardView() {
  const isMobile = useUIStore(state => state.isMobile);
  const setView = useUIStore(state => state.setView);
  const setIsAddExecutionOpen = useUIStore(state => state.setIsAddExecutionOpen);
  const openEditExecution = useUIStore(state => state.openEditExecution);
  const addToast = useUIStore(state => state.addToast);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch all trades and executions for dynamic dashboard calculations
  const trades = useLiveQuery(() => (db && db.trades ? db.trades.toArray() : []), []) || [];
  const executions = useLiveQuery(() => (db && db.executions ? db.executions.toArray() : []), []) || [];

  const todayJournal = useLiveQuery(async () => {
    if (!db || !db.dailyJournals) return null;
    return await db.dailyJournals.get(todayStr);
  }, [todayStr]);

  const displayName = localStorage.getItem('hollowDisplayName') || 'Trader';

  // Compute real-time dashboard analytics combining trades and executions
  const dashboardStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let be = 0;
    let totalR = 0;
    let totalWinR = 0;
    let totalLossR = 0;

    const processedExecIds = new Set();

    trades.forEach(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      tradeExecs.forEach(e => processedExecIds.add(e.id));
      const math = calculateTradePnL(trade, tradeExecs);
      const risk = trade.riskAmount || 200;
      const rVal = math.netPnL / risk;
      totalR += rVal;

      if (math.netPnL > 0) {
        wins++;
        totalWinR += rVal;
      } else if (math.netPnL < 0) {
        losses++;
        totalLossR += Math.abs(rVal);
      } else {
        be++;
      }
    });

    executions.forEach(exec => {
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

      if (isWin) {
        wins++;
        totalWinR += rVal;
      } else if (isLoss) {
        losses++;
        totalLossR += Math.abs(rVal);
      } else {
        be++;
      }
    });

    const totalCount = wins + losses + be;
    const totalClosed = wins + losses;
    const winRate = totalClosed > 0 ? ((wins / totalClosed) * 100).toFixed(1) : '0.0';
    const profitFactor = totalLossR > 0 ? (totalWinR / totalLossR).toFixed(2) : (totalWinR > 0 ? '9.99' : '0.00');
    const avgR = totalCount > 0 ? (totalR / totalCount).toFixed(2) : '0.00';

    return {
      totalR: totalR.toFixed(2),
      wins,
      losses,
      be,
      totalCount,
      winRate,
      profitFactor,
      avgR
    };
  }, [trades, executions]);

  // Recent executions list
  const recentExecutions = useMemo(() => {
    return [...executions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 6);
  }, [executions]);

  // Top setups distribution
  const topSetups = useMemo(() => {
    const setupCounts = {};
    executions.forEach(e => {
      const name = e.model || 'Standard Setup';
      setupCounts[name] = (setupCounts[name] || 0) + 1;
    });
    return Object.entries(setupCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [executions]);

  // Handle execution deletion
  const handleDeleteExecution = async (id) => {
    try {
      await db.executions.delete(id);
      addToast('Execution deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete execution.', 'error');
    }
  };

  return (
    <div 
      className="hollow-menu-scrollbar"
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        background: '#070709',
        color: '#ffffff',
        padding: isMobile ? '16px' : '32px 36px',
        boxSizing: 'border-box'
      }}
    >
      {/* 2. COMMAND PERFORMANCE STRIP (4 WIDGET CARDS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '28px',
        marginTop: isMobile ? '0' : '16px'
      }}>
        {/* Card 1: Total R Return */}
        <div className="hollow-card hollow-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
            <span>Net R Return</span>
            <TrendingUp size={16} color="#30d158" />
          </div>
          <div className="mono" style={{ 
            fontSize: '26px', 
            fontWeight: '800', 
            color: parseFloat(dashboardStats.totalR) >= 0 ? '#30d158' : '#ff453a', 
            marginTop: '10px',
            textShadow: parseFloat(dashboardStats.totalR) >= 0 ? '0 0 20px rgba(48, 209, 88, 0.2)' : '0 0 20px rgba(255, 69, 58, 0.2)'
          }}>
            {parseFloat(dashboardStats.totalR) >= 0 ? '+' : ''}{dashboardStats.totalR}R
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
            Accumulated trade expectancy
          </div>
        </div>

        {/* Card 2: Win Rate */}
        <div className="hollow-card hollow-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
            <span>Win Rate</span>
            <Activity size={16} color="#b86eff" />
          </div>
          <div className="mono" style={{ 
            fontSize: '26px', 
            fontWeight: '800', 
            color: parseFloat(dashboardStats.winRate) >= 50 ? '#30d158' : '#ff453a', 
            marginTop: '10px',
            textShadow: parseFloat(dashboardStats.winRate) >= 50 ? '0 0 20px rgba(48, 209, 88, 0.2)' : '0 0 20px rgba(255, 69, 58, 0.2)'
          }}>
            {dashboardStats.winRate}%
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
            {dashboardStats.wins}W / {dashboardStats.losses}L {dashboardStats.be > 0 ? `/ ${dashboardStats.be}BE` : ''} ({dashboardStats.totalCount} total)
          </div>
        </div>

        {/* Card 3: Profit Factor */}
        <div className="hollow-card hollow-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
            <span>Profit Factor</span>
            <Zap size={16} color="#64d2ff" />
          </div>
          <div className="mono" style={{ 
            fontSize: '26px', 
            fontWeight: '800', 
            color: parseFloat(dashboardStats.profitFactor) >= 1.0 ? '#30d158' : '#ff453a', 
            marginTop: '10px',
            textShadow: parseFloat(dashboardStats.profitFactor) >= 1.0 ? '0 0 20px rgba(48, 209, 88, 0.2)' : '0 0 20px rgba(255, 69, 58, 0.2)'
          }}>
            {dashboardStats.profitFactor}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
            Avg R: {dashboardStats.avgR}R per trade
          </div>
        </div>

        {/* Card 4: Daily Journal Check-in */}
        <div className="hollow-card hollow-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
            <span>Daily Journal</span>
            <BookOpen size={16} color="#30d158" />
          </div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: '800', color: todayJournal ? '#30d158' : '#ffd60a', marginTop: '10px' }}>
            {todayJournal ? 'Completed' : 'Pending'}
          </div>
          <div style={{ fontSize: '11px', color: todayJournal ? '#30d158' : 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
            {todayJournal ? '✓ Checked in today' : '• Reflections needed'}
          </div>
        </div>
      </div>

      {/* 3. MAIN ASYMMETRIC GRID (REMAINING REARRANGED LAYOUT) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '7.5fr 4.5fr',
        gap: '24px',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: RECENT EXECUTIONS LEDGER TABLE */}
        <div className="hollow-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#b86eff" />
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recent Execution Ledger
              </h2>
            </div>
            <button
              onClick={() => setView('journal')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#b86eff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View Journal Trades <ArrowRight size={14} />
            </button>
          </div>

          {recentExecutions.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              No executions logged yet. Click "+ Add Execution" above to log your first setup!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentExecutions.map(exec => {
                const isWin = exec.wl === 'Win';
                const isLoss = exec.wl === 'Loss';
                return (
                  <div
                    key={exec.id}
                    onClick={() => openEditExecution(exec)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(184, 110, 255, 0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div className={isWin ? 'hollow-badge-gain' : (isLoss ? 'hollow-badge-loss' : 'hollow-glass-input')} style={{ padding: '5px 10px', borderRadius: '8px', minWidth: '46px', textAlign: 'center', justifyContent: 'center' }}>
                        {exec.wl || 'BE'}
                      </div>

                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{exec.symbol || 'SYMBOL'}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>({exec.bias})</span>
                          {exec.model && (
                            <span style={{ fontSize: '10px', background: 'rgba(184, 110, 255, 0.12)', color: '#b86eff', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                              {exec.model}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                          PO3: {(Array.isArray(exec.po3Times) && exec.po3Times.length > 0 ? exec.po3Times.join(', ') : (exec.po3 && exec.po3 !== 'N/A' ? exec.po3 : 'Standard PO3'))} • DoL: {(Array.isArray(exec.dols) && exec.dols.length > 0 ? exec.dols.join(', ') : (exec.dol || 'N/A'))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>Outcome: {exec.rr ? (String(exec.rr).endsWith('R') ? exec.rr : `${exec.rr}R`) : 'N/A'}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{exec.date} ({exec.executionTime || '09:00'})</div>
                      </div>

                      <button
                        onClick={() => handleDeleteExecution(exec.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.25)',
                          cursor: 'pointer',
                          padding: '4px',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff453a'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.25)'}
                        title="Delete execution"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SETUP DISTRIBUTION & CORE WORKSPACE PANELS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. TOP PLAYBOOK SETUPS WIDGET */}
          <div className="hollow-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Target size={16} color="#64d2ff" />
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Top Setup Models
              </h2>
            </div>

            {topSetups.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                No setup models recorded yet. Log setups during trade execution!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {topSetups.map(item => {
                  const percentage = Math.round((item.count / (executions.length || 1)) * 100);
                  return (
                    <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: '600', color: '#ffffff' }}>{item.name}</span>
                        <span className="mono" style={{ fontSize: '11px', color: '#b86eff', fontWeight: '700' }}>
                          {item.count} trades ({percentage}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${percentage}%`,
                          background: 'linear-gradient(90deg, #b86eff 0%, #64d2ff 100%)',
                          borderRadius: '99px'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. CORE WORKSPACES STACKED CARDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div 
              onClick={() => setView('analytics')}
              className="hollow-card hollow-card-interactive"
              style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(184, 110, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b86eff' }}>
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>Analytics & Edge</h3>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0 0' }}>
                    Dynamic win rates & edge breakdown
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="rgba(255,255,255,0.4)" />
            </div>

            <div 
              onClick={() => setView('journal')}
              className="hollow-card hollow-card-interactive"
              style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(100, 210, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64d2ff' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>Daily Journal</h3>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0 0' }}>
                    Clean execution ledger & reflections
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="rgba(255,255,255,0.4)" />
            </div>

            <div 
              onClick={() => setView('weeklyReview')}
              className="hollow-card hollow-card-interactive"
              style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(48, 209, 88, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#30d158' }}>
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>Weekly Review</h3>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0 0' }}>
                    EOW rollup station & news calendar
                  </p>
                </div>
              </div>
              <ArrowRight size={16} color="rgba(255,255,255,0.4)" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
