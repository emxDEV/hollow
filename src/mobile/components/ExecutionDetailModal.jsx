import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Edit3, Trash2, Calendar, Clock, Target, Shield, BookOpen, Smile, 
  Layers, Sparkles, TrendingUp, TrendingDown, Eye, Maximize2 
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { db } from '../../db/hollowDb';

const getPsychTagStyle = (tag) => {
  const cleanTag = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
  const positive = ['focused', 'patient', 'disciplined', 'calm', 'relaxed', 'confident', 'happy', 'good', 'satisfied', 'prepared', 'neutral'];
  const negative = ['fomo', 'greedy', 'fearful', 'impatient', 'aggressive', 'overtrading', 'revenge', 'angry', 'sad', 'stressed', 'frustrated', 'chasing', 'anxious', 'hesitant', 'unsure', 'tired', 'distracted', 'bored'];

  if (positive.some(p => cleanTag.includes(p))) {
    return {
      background: 'rgba(48, 209, 88, 0.12)',
      border: '1px solid rgba(48, 209, 88, 0.25)',
      color: '#30d158'
    };
  }
  if (negative.some(n => cleanTag.includes(n))) {
    return {
      background: 'rgba(255, 69, 58, 0.12)',
      border: '1px solid rgba(255, 69, 58, 0.25)',
      color: '#ff453a'
    };
  }

  // Default color (Vibrant Blue/Purple)
  return {
    background: 'rgba(10, 132, 255, 0.12)',
    border: '1px solid rgba(10, 132, 255, 0.25)',
    color: '#0a84ff'
  };
};

const getValueColor = (label, val) => {
  if (!val || val === 'N/A') return 'rgba(255, 255, 255, 0.45)';
  
  if (label === 'Rating') {
    if (val.includes('A')) return '#30d158'; // Green
    if (val.includes('B')) return '#64d2ff'; // Blue
    if (val.includes('C')) return '#ff9f0a'; // Orange
    if (val.includes('D') || val.includes('F')) return '#ff453a'; // Red
  }
  if (label === 'Stop Loss') {
    return '#ff453a'; // Red
  }
  if (label === 'Take Profit') {
    return '#30d158'; // Green
  }
  if (label === 'Model') {
    return '#bf5af2'; // Purple/Violet
  }
  if (label === 'DOL Target') {
    return '#ffd60a'; // Amber/Yellow
  }
  if (label === 'Timeframe') {
    return '#ff9f0a'; // Orange
  }
  
  return '#ffffff';
};

export default function ExecutionDetailModal() {
  const isMobile = useUIStore(s => s.isMobile);
  const selectedExecution = useUIStore(s => s.selectedExecutionDetail);
  const setSelectedExecution = useUIStore(s => s.setSelectedExecutionDetail);
  const openEditExecution = useUIStore(s => s.openEditExecution);
  const addToast = useUIStore(s => s.addToast);

  const [zoomImage, setZoomImage] = useState(null);
  const [tradeExecs, setTradeExecs] = useState([]);

  useEffect(() => {
    if (selectedExecution && (selectedExecution.accountId || !selectedExecution.timestamp)) {
      db.executions.where('tradeId').equals(selectedExecution.id).toArray()
        .then(execs => setTradeExecs(execs))
        .catch(err => console.error(err));
    } else {
      setTradeExecs([]);
    }
  }, [selectedExecution]);

  if (!selectedExecution) return null;

  const exec = selectedExecution;
  const isTradeType = exec.accountId || !exec.timestamp;

  // Resolve values
  const rawRR = exec.rr !== undefined ? exec.rr : (isTradeType ? tradeExecs.reduce((sum, e) => sum + (parseFloat(e.rr) || 0), 0) : 0);
  const isGain = parseFloat(rawRR) > 0.05 || (exec.manualPnL && parseFloat(exec.manualPnL) > 0);
  const isLoss = parseFloat(rawRR) < -0.05 || (exec.manualPnL && parseFloat(exec.manualPnL) < 0);
  
  let outcomeColor = '#ffffff';
  if (isGain) outcomeColor = '#30d158';
  else if (isLoss) outcomeColor = '#ff453a';
  else if ((exec.wl || '').toUpperCase().startsWith('BE')) outcomeColor = '#ffd60a';

  // Gather all photos
  const allPhotos = [];
  const itemsToScan = [exec, ...tradeExecs];
  itemsToScan.forEach(item => {
    ['ltfImages', 'mtfImages', 'htfImages', 'outcomeImages', 'images'].forEach(key => {
      if (Array.isArray(item[key])) {
        item[key].forEach(img => {
          if (typeof img === 'string') allPhotos.push({ url: img, type: key.replace('Images', '').toUpperCase() });
          else if (Array.isArray(img) && typeof img[0] === 'string') allPhotos.push({ url: img[0], type: key.replace('Images', '').toUpperCase() });
        });
      }
    });
  });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        if (isTradeType) {
          await db.trades.delete(exec.id);
          const related = await db.executions.where('tradeId').equals(exec.id).toArray();
          for (const r of related) {
            await db.executions.delete(r.id);
          }
          addToast('Trade and related executions deleted', 'info');
        } else {
          await db.executions.delete(exec.id);
          addToast('Execution deleted successfully', 'info');
        }
        setSelectedExecution(null);
      } catch (err) {
        console.error(err);
        addToast('Failed to delete trade', 'error');
      }
    }
  };

  const handleEdit = () => {
    openEditExecution(exec);
    setSelectedExecution(null);
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
        onClick={() => setSelectedExecution(null)}
      >
        <motion.div
          initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
          animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
          exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          style={{
            width: '100%',
            maxWidth: '560px',
            background: '#09090b',
            border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderRadius: isMobile ? '24px 24px 0 0' : '20px',
            maxHeight: isMobile ? '90vh' : '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header Actions */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trade Details</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleEdit}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={15} />
              </button>
              
              <button
                onClick={handleDelete}
                style={{
                  background: 'rgba(255,69,58,0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff453a',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} />
              </button>
              
              <button
                onClick={() => setSelectedExecution(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Content Scrollable Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            WebkitOverflowScrolling: 'touch'
          }}>

            {/* Core Outcome Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px 18px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{
                    background: 'rgba(100, 210, 255, 0.15)',
                    color: '#64d2ff',
                    fontWeight: 800,
                    fontSize: '13px',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>{exec.symbol || 'NQ'}</span>
                  
                  <span style={{
                    background: exec.bias === 'Short' ? 'rgba(255,69,58,0.15)' : 'rgba(48,209,88,0.15)',
                    color: exec.bias === 'Short' ? '#ff453a' : '#30d158',
                    fontWeight: 800,
                    fontSize: '13px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {exec.bias === 'Short' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {exec.bias || 'Long'}
                  </span>
                </div>
                
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {exec.date} · {exec.session || 'New York'} Session
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: outcomeColor }}>
                  {isGain ? '+' : ''}{parseFloat(rawRR || 0).toFixed(2)}R
                </div>
                {exec.manualPnL !== undefined && (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    ${parseFloat(exec.manualPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })} Net
                  </span>
                )}
              </div>
            </div>

            {/* Technical Parameters Table */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Technical Details</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Rating', val: exec.rating ? `Grade ${exec.rating}` : 'N/A' },
                  { label: 'Model', val: exec.model || 'N/A' },
                  { label: 'DOL Target', val: exec.dol || 'N/A' },
                  { label: 'PO3 Timing', val: exec.po3 || 'N/A' },
                  { label: 'Timeframe', val: exec.entryTf || 'N/A' },
                  { label: 'Execution Time', val: exec.executionTime ? `${exec.executionTime} EST` : 'N/A' },
                  { label: 'Stop Loss', val: exec.sl ? `${exec.sl} pts` : 'N/A' },
                  { label: 'Take Profit', val: exec.tp ? `${exec.tp} pts` : 'N/A' }
                ].map(param => (
                  <div key={param.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{param.label}</span>
                    <span style={{ fontSize: '13px', color: getValueColor(param.label, param.val), fontWeight: 700 }}>{param.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mindset & Emotion Section */}
            {(exec.emotion || (Array.isArray(exec.psychTags) && exec.psychTags.length > 0)) && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mindset &amp; Emotion</span>
                
                {exec.emotion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smile size={16} color="#b86eff" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{exec.emotion}</span>
                  </div>
                )}

                 {Array.isArray(exec.psychTags) && exec.psychTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    {exec.psychTags.map(tag => {
                      const tagStyle = getPsychTagStyle(tag);
                      return (
                        <span
                          key={tag}
                          style={{
                            background: tagStyle.background,
                            color: tagStyle.color,
                            border: tagStyle.border,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            {exec.notes && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trade Notes</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  {exec.notes}
                </p>
              </div>
            )}

            {/* Images Showcase */}
            {allPhotos.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Screenshots ({allPhotos.length})</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {allPhotos.map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => setZoomImage(photo.url)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1.5',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.12)',
                        cursor: 'pointer'
                      }}
                    >
                      <img src={photo.url} alt="Trade chart" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        {photo.type}
                      </div>

                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        ':hover': { opacity: 1 }
                      }} className="zoom-hover">
                        <Eye size={16} color="#fff" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>

      {/* Image zoom popup */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <button
              onClick={() => setZoomImage(null)}
              style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top) + 16px)',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={zoomImage}
              alt="Zoomed execution chart"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.9)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </AnimatePresence>
  );
}
