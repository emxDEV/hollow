import React, { useState, useMemo } from 'react';
import { Users, ShieldCheck, Zap, RefreshCw, AlertTriangle, ArrowRight, Play } from 'lucide-react';
import HollowSelect from './HollowSelect';
import useUIStore from '../store/useUIStore';

export default function CopyCockpitView({ accounts, selectedAccountId }) {
  const isMobile = useUIStore(state => state.isMobile);
  const [leaderId, setLeaderId] = useState('acc-funded-1');
  const [activeSync, setActiveSync] = useState(true);
  
  // Follower configurations
  const [followers, setFollowers] = useState([
    { id: 'acc-eval-2', ratioType: 'Multiplier', ratioVal: 2, status: 'Synced' },
    { id: 'acc-live-3', ratioType: 'Fixed Sizing', ratioVal: 1, status: 'Synced' }
  ]);

  const [replicationLogs, setReplicationLogs] = useState([
    { id: 'log-1', time: '2026-05-30 15:02:10', type: 'INFO', msg: 'Copy engine listening on Leader account...' }
  ]);

  const leaderAccount = accounts.find(a => a.id === leaderId);

  const availableFollowers = useMemo(() => {
    return accounts.filter(a => a.id !== leaderId);
  }, [accounts, leaderId]);

  const handleSimulateCopyTrade = () => {
    if (!activeSync) {
      setReplicationLogs(prev => [
        { id: `log-${Date.now()}`, time: new Date().toLocaleTimeString(), type: 'WARN', msg: 'Replication failed: Sync engine is disabled.' },
        ...prev
      ]);
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    
    // Step 1: Leader executes
    const leaderMsg = `[LEADER EXEC] Bought 2 Contracts NQ @ 18,540.00`;
    
    setReplicationLogs(prev => [
      { id: `log-${Date.now()}-L`, time: timestamp, type: 'LEADER', msg: leaderMsg },
      ...prev
    ]);

    // Step 2: Replicate across followers
    followers.forEach((f, index) => {
      const followerAcc = accounts.find(a => a.id === f.id);
      if (!followerAcc) return;

      setTimeout(() => {
        let size = 2;
        if (f.ratioType === 'Multiplier') {
          size = 2 * f.ratioVal;
        } else if (f.ratioType === 'Fixed Sizing') {
          size = f.ratioVal;
        }

        const folMsg = `[FOLLOWER SYNC] Replicated to ${followerAcc.name}: Bought ${size} Contracts NQ @ 18,540.05 (Slippage: +0.05 pts)`;
        
        setReplicationLogs(prev => [
          { id: `log-${Date.now()}-F-${index}`, time: new Date().toLocaleTimeString(), type: 'FOLLOWER', msg: folMsg },
          ...prev
        ]);
      }, 300 * (index + 1));
    });
  };

  const updateFollowerVal = (fId, val) => {
    setFollowers(prev => prev.map(f => f.id === fId ? { ...f, ratioVal: Number(val) } : f));
  };

  const updateFollowerType = (fId, type) => {
    setFollowers(prev => prev.map(f => f.id === fId ? { ...f, ratioType: type } : f));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Info Panel */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1>
            <Users size={28} color="var(--colors-primary)" /> Copy-Trading Cockpit
          </h1>
          <p>
            Synchronize orders and copy risk allocations between accounts in real-time
          </p>
        </div>
        
        {/* Toggle Sync Button */}
        <button
          className={activeSync ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveSync(!activeSync)}
          style={{ width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '12px' : '0' }}
        >
          <RefreshCw className={activeSync ? 'spin' : ''} size={16} />
          {activeSync ? 'Sync Engine Active' : 'Sync Engine Paused'}
        </button>
      </div>

      {/* Grid of config sections */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '24px' }}>
        
        {/* Connection Setup Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Leader account assignment */}
          <div className="hollow-card">
            <h3 style={{ fontSize: '15px', marginBottom: '14px', color: '#fff' }}>Leader Configuration</h3>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: isMobile ? 'stretch' : 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>SELECT LEADER ACCOUNT</label>
                <HollowSelect
                  value={leaderId}
                  onChange={(val) => setLeaderId(val)}
                  options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>LEADER TYPE</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--colors-hairline-dark)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--colors-on-dark-mute)' }}>
                  {leaderAccount?.type || 'N/A'} Source Terminal
                </div>
              </div>
            </div>
          </div>

          {/* Followers configuration list */}
          <div className="hollow-card">
            <h3 style={{ fontSize: '15px', marginBottom: '16px', color: '#fff' }}>Linked Follower Accounts</h3>
            
            {followers.length === 0 ? (
              <p style={{ color: 'var(--colors-stone)', fontSize: '12px' }}>No follower accounts linked to this group.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {followers.map(f => {
                  const followerAcc = accounts.find(a => a.id === f.id);
                  if (!followerAcc) return null;

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr 0.5fr',
                        gap: '12px',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--colors-hairline-dark)',
                        padding: '14px',
                        borderRadius: '8px'
                      }}
                    >
                      {/* Name & status indicator */}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{followerAcc.name}</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: activeSync ? 'var(--colors-gain)' : 'var(--colors-stone)',
                            boxShadow: activeSync ? '0 0 8px var(--colors-gain)' : 'none',
                            display: 'inline-block'
                          }} />
                          <span style={{ color: 'var(--colors-on-dark-mute)' }}>
                            {activeSync ? 'Replication Active' : 'Link Paused'}
                          </span>
                        </div>
                      </div>

                      {/* Allocation Mode */}
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--colors-stone)', display: 'block', marginBottom: '4px' }}>ALLOCATION MODEL</label>
                        <HollowSelect
                          value={f.ratioType}
                          onChange={(val) => updateFollowerType(f.id, val)}
                          options={[
                            { value: 'Multiplier', label: 'Multiplier ratio' },
                            { value: 'Fixed Sizing', label: 'Fixed Sizing' }
                          ]}
                        />
                      </div>

                      {/* Mult Value */}
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--colors-stone)', display: 'block', marginBottom: '4px' }}>VALUE</label>
                        <input
                          type="number"
                          className="hollow-input"
                          style={{ padding: '6px 8px', fontSize: '11px', width: isMobile ? '100%' : '80%' }}
                          value={f.ratioVal}
                          onChange={(e) => updateFollowerVal(f.id, e.target.value)}
                        />
                      </div>

                      {/* Details */}
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
                          Slippage cap: <strong style={{ color: 'var(--colors-primary)' }}>0.5p</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Live replication activity logs */}
        <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', height: '430px' }}>
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="var(--colors-primary)" /> Live Sync Simulation
            </h3>
            
            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handleSimulateCopyTrade}
            >
              <Play size={10} fill="currentColor" /> Simulate Order
            </button>
          </div>
          
          <p style={{ color: 'var(--colors-on-dark-mute)', fontSize: '11px', marginBottom: '12px' }}>
            Trigger a test buy order on the leader account to confirm follower execution speeds.
          </p>

          <div style={{
            flex: 1,
            background: '#04080e',
            borderRadius: '6px',
            border: '1px solid var(--colors-hairline-dark)',
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {replicationLogs.map((log) => {
              let color = 'var(--colors-on-dark-mute)';
              if (log.type === 'LEADER') color = 'var(--colors-primary)';
              if (log.type === 'FOLLOWER') color = 'var(--colors-gain)';
              if (log.type === 'WARN') color = 'var(--colors-loss)';

              return (
                <div key={log.id} style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--colors-stone)', flexShrink: 0 }}>[{log.time}]</span>
                  <span style={{ color }}>{log.msg}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
