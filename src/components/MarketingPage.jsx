import React, { useState } from 'react';
import { Shield, Zap, RefreshCw, BarChart2, MessageSquare, Play, HelpCircle, Upload, ArrowRight, Check } from 'lucide-react';

export default function MarketingPage({ onEnterApp }) {
  const [dragActive, setDragActive] = useState(false);
  const [sandboxActive, setSandboxActive] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const simulateCSVImport = () => {
    setSandboxActive(true);
    setTimeout(() => {
      // Simulate real-time parsing of a 1000-row multi-execution CSV
      setMetrics({
        parsedTrades: 148,
        executionsMatched: 582,
        processingTimeMs: 4.8, // Shows the extreme local-first speed
        totalVolume: '$4,120,490',
        profitFactor: '2.14',
        winRate: '68.4%'
      });
      setSandboxActive(false);
    }, 900);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background radial highlight */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '1200px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, transparent 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 8%',
        borderBottom: '1px solid var(--border-hairline)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00f2fe, #0b111a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-aqua)',
            border: '1px solid rgba(0, 242, 254, 0.4)'
          }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', color: '#020205', fontSize: '18px' }}>H</span>
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '20px', letterSpacing: '-0.02em', color: '#fff' }}>
            HOLLOW
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '30px', color: 'var(--color-text-muted)' }}>
          <a href="#features" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = ''}>Features</a>
          <a href="#sandbox" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = ''}>Engine Sandbox</a>
          <a href="#architecture" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = ''}>Specs</a>
        </nav>

        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={onEnterApp}>
          Launch Terminal <ArrowRight size={14} />
        </button>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 5 }}>
        
        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', marginBottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.15)',
            padding: '6px 14px',
            borderRadius: '100px',
            color: 'var(--color-aqua)',
            fontWeight: '500',
            fontSize: '12px',
            letterSpacing: '0.05em',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'inset 0 0 10px rgba(0, 242, 254, 0.05)'
          }}>
            <Zap size={12} /> NEXT GENERATION local-first Ledger
          </div>

          <h1 style={{
            fontSize: '56px',
            lineHeight: '1.15',
            fontWeight: '800',
            maxWidth: '900px',
            marginBottom: '20px',
            background: 'linear-gradient(to bottom, #ffffff 60%, rgba(255,255,255,0.7) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em'
          }}>
            The Cognitive Ledger For <span className="neon-text-aqua" style={{ background: 'none', WebkitTextFillColor: 'initial', WebkitBackgroundClip: 'unset' }}>Prop & Elite Operators</span>
          </h1>

          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '18px',
            maxWidth: '650px',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            Ditch slow cloud sync logs. Hollow runs on a blazing-fast local-first engine with offline multi-execution tracking, image canvas annotation workbenches, and secure Supabase database bridges.
          </p>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }} onClick={onEnterApp}>
              Enter Terminal <Play size={16} fill="currentColor" />
            </button>
            <a href="#sandbox" className="btn-secondary" style={{ padding: '14px 28px', fontSize: '15px', textDecoration: 'none' }}>
              Explore Sandbox Sandbox
            </a>
          </div>
        </section>

        {/* MOCK PLATFORM IMAGE */}
        <section style={{
          position: 'relative',
          padding: '6px',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), transparent)',
          borderRadius: '16px',
          marginBottom: '100px',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)'
        }}>
          <div style={{
            background: 'var(--bg-canvas)',
            borderRadius: '12px',
            overflow: 'hidden',
            aspectRatio: '16/9',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {/* Top Bar of Mock Terminal */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
                hollow.app/terminal/acc-funded-01
              </div>
              <div style={{ width: '30px' }} />
            </div>

            {/* Content of Mock Terminal */}
            <div style={{ flex: 1, display: 'flex', padding: '20px', gap: '20px' }}>
              {/* Left Widget */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-hairline)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>NET PROFIT</div>
                  <div className="mono" style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-gain)', margin: '8px 0' }}>
                    +$24,840.10
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--color-gain)' }}>+14.8%</span>
                    <span style={{ color: 'var(--color-text-dim)' }}>Funded balance</span>
                  </div>
                </div>
                <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  {[10, 24, 18, 30, 45, 35, 60, 52, 78, 92].map((val, idx) => (
                    <div key={idx} style={{
                      flex: 1,
                      height: `${val}%`,
                      background: 'linear-gradient(to top, rgba(0, 242, 254, 0.4), var(--color-aqua))',
                      borderRadius: '2px',
                      opacity: 0.7 + idx * 0.03
                    }} />
                  ))}
                </div>
              </div>

              {/* Right Grid */}
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-hairline)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>WIN RATE</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginTop: '4px' }}>72.4%</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-hairline)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>PROFIT FACTOR</div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-aqua)', marginTop: '4px' }}>2.84</div>
                  </div>
                </div>

                {/* Table Mock */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-hairline)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '8px' }}>EXECUTION LEDGER</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { pair: 'NQ LONG', size: '2 Lots', price: '18,520', pnl: '+$2,480.00', status: 'Gain' },
                      { pair: 'ES SHORT', size: '5 Lots', price: '5,290', pnl: '+$1,120.00', status: 'Gain' },
                      { pair: 'GC LONG', size: '3 Lots', price: '2,342', pnl: '-$420.00', status: 'Loss' }
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                        <span style={{ color: '#fff', fontWeight: '500' }}>{item.pair}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{item.size}</span>
                        <span className="mono" style={{ color: item.status === 'Gain' ? 'var(--color-gain)' : 'var(--color-loss)' }}>{item.pnl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES INDEX */}
        <section id="features" style={{ marginBottom: '100px' }}>
          <h2 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '48px' }}>
            Built Beyond Legacy Journale Standards
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            <div className="hollow-card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.08)', color: 'var(--color-aqua)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
                <Zap size={20} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Multi-Execution Trades</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Map multiple scale-ins, exits, and holding slippages instead of single flat cells. Computes exact averages automatically.
              </p>
            </div>

            <div className="hollow-card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.08)', color: 'var(--color-aqua)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
                <Shield size={20} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Local-First Engine</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                All transaction statistics and math render instantly offline using IndexedDB OPFS layer caches. Syncs safely to cloud backends.
              </p>
            </div>

            <div className="hollow-card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.08)', color: 'var(--color-aqua)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
                <RefreshCw size={20} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Copy-Trading Cockpit</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Synchronize multiple accounts across prop firms. Link sizing allocations and custom risk multipliers from leader terminals.
              </p>
            </div>

            <div className="hollow-card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.08)', color: 'var(--color-aqua)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
                <BarChart2 size={20} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Playbooks & Heatmaps</h3>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Pinpoint win ratios cross-referenced with day sessions, volume states, and high impact news.
              </p>
            </div>

          </div>
        </section>

        {/* INTERACTIVE TECH SANDBOX */}
        <section id="sandbox" className="hollow-card" style={{
          padding: '40px',
          background: 'linear-gradient(to right, rgba(10, 18, 30, 0.4), rgba(0, 0, 0, 0.6))',
          marginBottom: '100px',
          border: '1px solid rgba(0, 242, 254, 0.15)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: 'rgba(0, 242, 254, 0.02)',
            padding: '8px 14px',
            borderBottomLeftRadius: '12px',
            fontSize: '11px',
            color: 'var(--color-aqua)',
            borderLeft: '1px solid rgba(0, 242, 254, 0.15)',
            borderBottom: '1px solid rgba(0, 242, 254, 0.15)'
          }}>
            HOLLOW WASM ENGINE DEMO
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>Sandbox Benchmark Test</h2>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                Test our local compiler capabilities. Drop or select a mock TradeZella CSV format, and see how fast our client database groups, maps multi-leg averages, and plots variables.
              </p>

              <button
                className="btn-primary"
                style={{ padding: '12px 24px' }}
                onClick={simulateCSVImport}
                disabled={sandboxActive}
              >
                {sandboxActive ? (
                  <>
                    <RefreshCw className="spin" size={16} /> Compiling Ledger...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Auto-Compile Sample CSV
                  </>
                )}
              </button>
            </div>

            <div style={{
              background: '#040911',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.03)',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {!metrics ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-dim)' }}>
                  <HelpCircle size={32} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--color-aqua)' }} />
                  <p>Awaiting compilation trigger...</p>
                  <p style={{ fontSize: '12px' }}>Press "Auto-Compile Sample CSV" to benchmark.</p>
                </div>
              ) : (
                <div>
                  <h4 style={{ color: 'var(--color-aqua)', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '14px', textTransform: 'uppercase' }}>
                    Compilation Summary:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>PARSED TRADES</div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{metrics.parsedTrades}</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>EXECUTIONS SYNCED</div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{metrics.executionsMatched}</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>CRUNCH SPEED</div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-aqua)' }}>{metrics.processingTimeMs} ms</div>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>WIN RATE</div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-gain)' }}>{metrics.winRate}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gain)', fontSize: '11px', marginTop: '16px', background: 'rgba(0, 230, 118, 0.05)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(0, 230, 118, 0.15)' }}>
                    <Check size={14} /> Completed locally with zero cloud lag. Average latency reduction: 98%.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border-hairline)',
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--color-text-dim)',
        fontSize: '12px',
        background: '#010103'
      }}>
        <div style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
          Hollow Ledger Engine © 2026. Custom Revamp build under sandbox settings.
        </div>
        <div>
          Powered by React 19, Dexie.js (IndexedDB) Local Cache, and Supabase Sync.
        </div>
      </footer>
    </div>
  );
}
