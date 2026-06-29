import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { calculateTradePnL } from '../utils/tradeMath';
import { useUIStore } from '../store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Search, ArrowUpDown, Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function GalleryView() {
  const { selectedAccountId, setActiveTradeId } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dateDesc'); // 'dateDesc', 'dateAsc', 'pnlDesc', 'pnlAsc'

  // DB queries
  const trades = useLiveQuery(() => db.trades.toArray()) || [];
  const executions = useLiveQuery(() => db.executions.toArray()) || [];

  // Helper to extract LTF image robustly (with fallback for legacy formats)
  const getLTFImage = (trade) => {
    if (!trade || !Array.isArray(trade.images) || trade.images.length === 0) return null;
    const getFirst = (val) => {
      if (!val) return null;
      return Array.isArray(val) ? (val[0] || null) : val;
    };
    return getFirst(trade.images[0]) || getFirst(trade.images[1]) || getFirst(trade.images[2]) || null;
  };

  // Filtered and sorted gallery trades
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

    // 3. Search query filter (by symbol, model, comments)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t => 
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.model || '').toLowerCase().includes(q) ||
        (t.commentBias || '').toLowerCase().includes(q) ||
        (t.commentExecution || '').toLowerCase().includes(q)
      );
    }

    // 4. Map PnL for sorting
    const itemsWithPnL = items.map(t => {
      const tradeExecs = executions.filter(e => e.tradeId === t.id);
      const pnlData = calculateTradePnL(t, tradeExecs);
      return {
        trade: t,
        pnl: pnlData.netPnL || 0,
        dateStr: t.date || ''
      };
    });

    // 5. Sort
    itemsWithPnL.sort((a, b) => {
      if (sortBy === 'dateDesc') {
        return b.dateStr.localeCompare(a.dateStr) || b.trade.id.localeCompare(a.trade.id);
      } else if (sortBy === 'dateAsc') {
        return a.dateStr.localeCompare(b.dateStr) || a.trade.id.localeCompare(b.trade.id);
      } else if (sortBy === 'pnlDesc') {
        return b.pnl - a.pnl;
      } else if (sortBy === 'pnlAsc') {
        return a.pnl - b.pnl;
      }
      return 0;
    });

    return itemsWithPnL;
  }, [trades, executions, selectedAccountId, searchQuery, sortBy]);

  // Format currency
  const formatCurrency = (val) => {
    const isNeg = val < 0;
    const abs = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(abs);
    return isNeg ? `-$${formatted.substring(1)}` : `+$${formatted.substring(1)}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Title Header */}
      <div style={{
        padding: '30px 40px 10px',
        borderBottom: '1px solid #1c1c1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            margin: 0
          }}>
            trade gallery.
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '4px',
            marginBottom: 0
          }}>
            visual ledger of your execution charts and snap logs.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search symbol, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#0f0f11',
                border: '1px solid #1c1c1e',
                borderRadius: '8px',
                padding: '8px 12px 8px 32px',
                fontSize: '13px',
                color: '#fff',
                outline: 'none',
                width: '200px',
                transition: 'border var(--transition-fast)'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4a4a4d'}
              onBlur={(e) => e.target.style.borderColor = '#1c1c1e'}
            />
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f0f11', border: '1px solid #1c1c1e', borderRadius: '8px', padding: '4px 8px' }}>
            <ArrowUpDown size={13} color="rgba(255,255,255,0.4)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                paddingRight: '6px'
              }}
            >
              <option value="dateDesc" style={{ background: '#0f0f11' }}>Date: Newest First</option>
              <option value="dateAsc" style={{ background: '#0f0f11' }}>Date: Oldest First</option>
              <option value="pnlDesc" style={{ background: '#0f0f11' }}>PnL: Highest Profit</option>
              <option value="pnlAsc" style={{ background: '#0f0f11' }}>PnL: Lowest Profit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Scroll Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '30px 40px 40px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {galleryItems.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: 'rgba(255,255,255,0.35)',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <ImageIcon size={24} color="rgba(255,255,255,0.2)" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 }}>No charts found.</h3>
            <p style={{ fontSize: '13px', maxWidth: '340px', margin: 0, lineHeight: '1.5' }}>
              {searchQuery 
                ? "No matching execution charts found for your search term."
                : "Trades with lower time frame (LTF) execution charts will be cataloged here automatically."}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '24px'
          }}>
            <AnimatePresence>
              {galleryItems.map(({ trade, pnl }) => {
                const img = getLTFImage(trade);
                const isGain = pnl > 0;
                const isLoss = pnl < 0;
                const pnlColor = isGain ? '#30d158' : (isLoss ? '#ff453a' : '#ff9f0a');

                return (
                  <motion.div
                    key={trade.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.22 }}
                    onClick={() => setActiveTradeId(trade.id)}
                    style={{
                      background: '#0f0f11',
                      border: '1px solid #1c1c1e',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      transition: 'border-color var(--transition-fast)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#1c1c1e';
                    }}
                  >
                    {/* Thumbnail Frame */}
                    <div style={{
                      width: '100%',
                      paddingBottom: '56.25%', // 16:9 Aspect Ratio
                      position: 'relative',
                      background: '#070709',
                      overflow: 'hidden'
                    }}>
                      {img ? (
                        <motion.img
                          src={img}
                          alt={`${trade.symbol} chart`}
                          whileHover={{ scale: 1.04 }}
                          transition={{ duration: 0.24, ease: 'easeOut' }}
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
                          <ImageIcon size={28} color="rgba(255,255,255,0.1)" />
                        </div>
                      )}

                      {/* Floating Badges */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 2
                      }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#fff',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(4px)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {trade.symbol === 'CUSTOM' ? (trade.customSymbol || 'CUSTOM') : trade.symbol}
                        </span>
                        {trade.model && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'rgba(255,255,255,0.7)',
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(4px)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}>
                            {trade.model}
                          </span>
                        )}
                      </div>

                      {/* Bias Overlay Tag */}
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        zIndex: 2
                      }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.5px',
                          color: trade.bias === 'LONG' ? '#30d158' : '#ff453a',
                          background: trade.bias === 'LONG' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                          border: trade.bias === 'LONG' ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,69,58,0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {trade.bias}
                        </span>
                      </div>
                    </div>

                    {/* Meta Card Details */}
                    <div style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'space-between',
                      background: 'linear-gradient(180deg, rgba(15,15,17,0.8) 0%, rgba(10,10,12,0.95) 100%)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <h4 style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          margin: 0,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '160px'
                        }}>
                          {trade.commentBias || 'Unnamed Setup'}
                        </h4>
                        
                        {/* PnL display */}
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '800',
                          color: pnlColor
                        }}>
                          {pnl === 0 && trade.status === 'BE' ? 'BE' : formatCurrency(pnl)}
                        </span>
                      </div>

                      {/* Footer Details */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} />
                          <span>{trade.date}</span>
                        </div>
                        {trade.session && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                            <span>{trade.session}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
