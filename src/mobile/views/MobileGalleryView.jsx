import React, { useState, useMemo } from 'react';
import { ChevronLeft, Image as ImageIcon, Search, Calendar } from 'lucide-react';
import { calculateTradePnL } from '../../utils/tradeMath';

export default function MobileGalleryView({ trades = [], executions = [], selectedAccountId = 'all', onSelectTrade, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to extract LTF image robustly
  const getLTFImage = (trade) => {
    if (!trade || !Array.isArray(trade.images) || trade.images.length === 0) return null;
    const getFirst = (val) => {
      if (!val) return null;
      return Array.isArray(val) ? (val[0] || null) : val;
    };
    return getFirst(trade.images[0]) || getFirst(trade.images[1]) || getFirst(trade.images[2]) || null;
  };

  // Filtered gallery trades
  const galleryItems = useMemo(() => {
    // 1. Get trades with images
    let items = trades.filter(t => {
      const img = getLTFImage(t);
      return !!img;
    });

    // 2. Filter by Account
    if (selectedAccountId !== 'all') {
      items = items.filter(t => t.accountId === selectedAccountId);
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t => 
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.model || '').toLowerCase().includes(q) ||
        (t.commentBias || '').toLowerCase().includes(q) ||
        (t.commentExecution || '').toLowerCase().includes(q)
      );
    }

    // 4. Map PnL and sort by date descending
    const itemsWithPnL = items.map(t => {
      const tradeExecs = executions.filter(e => e.tradeId === t.id);
      const pnlData = calculateTradePnL(t, tradeExecs);
      return {
        trade: t,
        pnl: pnlData.netPnL || 0,
        dateStr: t.date || ''
      };
    });

    itemsWithPnL.sort((a, b) => b.dateStr.localeCompare(a.dateStr) || b.trade.id.localeCompare(a.trade.id));

    return itemsWithPnL;
  }, [trades, executions, selectedAccountId, searchQuery]);

  // Format currency
  const formatCurrency = (val) => {
    const isNeg = val < 0;
    const abs = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(abs);
    return isNeg ? `-$${formatted.substring(1)}` : `+$${formatted.substring(1)}`;
  };

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center', outline: 'none' }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>trade gallery.</h1>
        </div>
      </div>

      {/* Search Bar Subheader */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search symbol, setup model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#0f0f11',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '8px 12px 8px 30px',
              fontSize: '13px',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Grid Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px'
      }}>
        {galleryItems.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            color: 'rgba(255,255,255,0.35)',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#0f0f11',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px'
            }}>
              <ImageIcon size={20} color="rgba(255,255,255,0.2)" />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>No charts found.</h3>
            <p style={{ fontSize: '12px', maxWidth: '280px', margin: 0, lineHeight: '1.5' }}>
              {searchQuery 
                ? "No matching execution charts found."
                : "Trades with lower time frame (LTF) execution charts will appear here automatically."}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            paddingBottom: 'calc(64px + var(--safe-bottom))'
          }}>
            {galleryItems.map(({ trade, pnl }) => {
              const img = getLTFImage(trade);
              const isGain = pnl > 0;
              const isLoss = pnl < 0;
              const pnlColor = isGain ? '#30d158' : (isLoss ? '#ff453a' : '#ff9f0a');

              return (
                <div
                  key={trade.id}
                  onClick={() => onSelectTrade && onSelectTrade(trade.id)}
                  style={{
                    background: '#0f0f11',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '100%',
                    paddingBottom: '60%',
                    position: 'relative',
                    background: '#070709',
                    overflow: 'hidden'
                  }}>
                    {img ? (
                      <img
                        src={img}
                        alt={`${trade.symbol} chart`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={20} color="rgba(255,255,255,0.1)" />
                      </div>
                    )}

                    {/* Floating Info Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      display: 'flex',
                      gap: '4px',
                      zIndex: 2
                    }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        color: '#fff',
                        background: 'rgba(0,0,0,0.7)',
                        padding: '2px 5px',
                        borderRadius: '4px'
                      }}>
                        {trade.symbol === 'CUSTOM' ? (trade.customSymbol || 'CUSTOM') : trade.symbol}
                      </span>
                    </div>

                    <div style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      zIndex: 2
                    }}>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: '800',
                        color: trade.bias === 'LONG' ? '#30d158' : '#ff453a',
                        background: trade.bias === 'LONG' ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)',
                        border: trade.bias === 'LONG' ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,69,58,0.3)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        textTransform: 'uppercase'
                      }}>
                        {trade.bias}
                      </span>
                    </div>
                  </div>

                  {/* Text details */}
                  <div style={{
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, rgba(15,15,17,0.8) 0%, rgba(10,10,12,0.95) 100%)'
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        margin: '0 0 4px 0',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {trade.commentBias || 'Unnamed Setup'}
                      </h4>
                      
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color: pnlColor,
                        marginBottom: '4px'
                      }}>
                        {pnl === 0 && trade.status === 'BE' ? 'BE' : formatCurrency(pnl)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      <Calendar size={9} />
                      <span>{trade.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
