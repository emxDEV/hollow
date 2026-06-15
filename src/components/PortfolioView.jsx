import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Briefcase, TrendingUp, DollarSign, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export default function PortfolioView({ activeTab = 'stocks' }) {
  const isMobile = useUIStore(state => state.isMobile);
  // Mock data for separate long-term portfolios
  const portfolioSummary = useMemo(() => {
    return {
      stocks: {
        title: 'Equity Portfolio (Stocks)',
        value: 84300,
        change: '+12.4%',
        allocation: '57%',
        assets: [
          { name: 'Apple Inc. (AAPL)', shares: 120, avgCost: 172.50, currentPrice: 191.20, totalValue: 22944 },
          { name: 'Microsoft Corp. (MSFT)', shares: 50, avgCost: 340.20, currentPrice: 415.60, totalValue: 20780 },
          { name: 'NVIDIA Corp. (NVDA)', shares: 25, avgCost: 450.00, currentPrice: 920.00, totalValue: 23000 },
          { name: 'Alphabet Inc. (GOOGL)', shares: 110, avgCost: 125.40, currentPrice: 160.10, totalValue: 17611 }
        ]
      },
      bonds: {
        title: 'Fixed Income Portfolio (Bonds)',
        value: 42500,
        change: '+4.1%',
        allocation: '29%',
        assets: [
          { name: 'US 10-Year Treasury Bond', shares: 20, avgCost: 1000.00, currentPrice: 1015.00, totalValue: 20300 },
          { name: 'Vanguard Total Bond Market ETF', shares: 220, avgCost: 95.80, currentPrice: 100.90, totalValue: 22200 }
        ]
      },
      funds: {
        title: 'Mutual Funds / Indices',
        value: 21400,
        change: '+8.7%',
        allocation: '14%',
        assets: [
          { name: 'SPDR S&P 500 ETF Trust (SPY)', shares: 30, avgCost: 420.50, currentPrice: 520.10, totalValue: 15603 },
          { name: 'Invesco QQQ Trust (QQQ)', shares: 13, avgCost: 350.20, currentPrice: 445.90, totalValue: 5797 }
        ]
      }
    };
  }, []);

  const activeData = portfolioSummary[activeTab] || portfolioSummary.stocks;

  // Pie chart data for aggregate allocation
  const allocationData = [
    { name: 'Stocks', value: 84300, color: '#ffffff' },
    { name: 'Bonds', value: 42500, color: '#8e8e93' },
    { name: 'Mutual Funds', value: 21400, color: '#4d4d4d' }
  ];

  // Growth curve data for long term portfolio
  const growthCurveData = [
    { month: 'Jan', value: 132000 },
    { month: 'Feb', value: 135400 },
    { month: 'Mar', value: 139100 },
    { month: 'Apr', value: 142800 },
    { month: 'May', value: 148200 }
  ];

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px',
      boxSizing: 'border-box'
    }}>
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
      
      {/* Top Header Section */}
      <div className="hollow-view-header" style={{ marginBottom: '4px' }}>
        <div className="hollow-view-header-title-block">
          <h1>
            <Briefcase size={28} color="var(--colors-primary)" /> Investment Portfolios
          </h1>
          <p>
            Long-term structural asset allocation (Managed separately from daytrading executions ledger)
          </p>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        <div className="hollow-card">
          <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.24px' }}>
            PORTFOLIO VALUE
          </div>
          <div className="mono" style={{ fontSize: '28px', fontWeight: '500', margin: '8px 0', color: '#fff' }}>
            ${(84300 + 42500 + 21400).toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--colors-gain)', fontWeight: '600' }}>
              +8.9%
            </span>
            <span style={{ color: 'var(--colors-on-dark-mute)' }}>Year to Date</span>
          </div>
        </div>

        <div className="hollow-card">
          <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', letterSpacing: '0.24px' }}>
            ACTIVE TAB VALUE ({activeData.allocation} Allocation)
          </div>
          <div className="mono" style={{ fontSize: '28px', fontWeight: '500', margin: '8px 0', color: 'var(--colors-primary-bright)' }}>
            ${activeData.value.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--colors-gain)', fontWeight: '600' }}>
              {activeData.change}
            </span>
            <span style={{ color: 'var(--colors-on-dark-mute)' }}>Growth rate</span>
          </div>
        </div>

      </div>

      {/* Charts HUD: Allocation and Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
        
        {/* Growth Curve */}
        <div className="hollow-card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--colors-on-dark)' }}>
            <LineIcon size={16} color="var(--colors-primary)" /> Long-Term Valuation Curve
          </h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--colors-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--colors-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="var(--colors-stone)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--colors-stone)" fontSize={10} domain={[100000, 160000]} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 15, 17, 0.96)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--colors-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation breakdown */}
        <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--colors-on-dark)' }}>
            <PieIcon size={16} color="var(--colors-primary)" /> Asset Class Allocations
          </h3>

          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', height: '140px' }}>
            <div style={{ width: '50%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allocationData.map(entry => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
                  <span style={{ color: 'var(--colors-on-dark-mute)' }}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Asset Allocation Ledger Table */}
      <div className="hollow-card">
        <h3 style={{ fontSize: '15px', marginBottom: '16px', color: '#fff' }}>
          {activeData.title}
        </h3>

        <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--colors-stone)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 10px' }}>Asset / Instrument</th>
                <th style={{ padding: '12px 10px' }}>Quantity / Units</th>
                <th style={{ padding: '12px 10px' }}>Avg Cost</th>
                <th style={{ padding: '12px 10px' }}>Current Price</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Total Value</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '13px', color: 'var(--colors-on-dark-mute)' }}>
              {activeData.assets.map((asset) => (
                <tr key={asset.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 10px', color: '#fff', fontWeight: '600' }}>{asset.name}</td>
                  <td style={{ padding: '12px 10px' }}>{asset.shares}</td>
                  <td style={{ padding: '12px 10px' }}>${asset.avgCost.toFixed(2)}</td>
                  <td style={{ padding: '12px 10px' }}>${asset.currentPrice.toFixed(2)}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#fff' }}>
                    ${asset.totalValue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
