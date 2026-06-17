import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { showToast } from '../utils/toast';
import { 
  X, Trash2, Plus, Check, Calendar, DollarSign, Award, 
  PenTool, Eraser, RefreshCw, FileText, Activity, 
  Image as ImageIcon, Sparkles, Smile, ShieldAlert
} from 'lucide-react';
import { calculateTradePnL, isTradeBE } from '../utils/tradeMath';
import HollowSelect from './HollowSelect';
import useUIStore from '../store/useUIStore';

export default function TradeDetailDrawer({
  tradeId,
  onClose,
  onSaveTrade,
  onDeleteTrade,
  db
}) {
  const isMobile = useUIStore(state => state.isMobile);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'narrative', 'executions', 'snapshots'

  // Reactive DB Queries
  const trade = useLiveQuery(() => db.trades.get(tradeId), [tradeId]);
  const tradeExecs = useLiveQuery(() => db.executions.where({ tradeId }).toArray(), [tradeId]) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];

  // Local Form state matching the "Add Trade" system parameters
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [symbol, setSymbol] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [bias, setBias] = useState('LONG');
  const [rating, setRating] = useState('B');
  const [model, setModel] = useState('');
  const [playbookTags, setPlaybookTags] = useState([]);
  const [wl, setWl] = useState('Win');
  const [manualPnL, setManualPnL] = useState('');
  const [accountId, setAccountId] = useState('');
  const [po3, setPo3] = useState('');
  const [entryTf, setEntryTf] = useState('');
  const [session, setSession] = useState('NY AM');
  const [dol, setDol] = useState('');

  // Narrative inputs
  const [commentExecution, setCommentExecution] = useState('');
  const [commentFazit, setCommentFazit] = useState('');
  const [mistakes, setMistakes] = useState([]);
  const [mistakeInput, setMistakeInput] = useState('');

  // Annotation Canvas State
  const [activeSnapshotType, setActiveSnapshotType] = useState('HTF'); // 'HTF', 'MTF', 'LTF'
  const [canvasDrawingMode, setCanvasDrawingMode] = useState('pen'); // 'pen', 'eraser'
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  // Pill lists matching Add Trade system (populated from localStorage)
  const [ratings, setRatings] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_ratings');
    return saved ? JSON.parse(saved) : ['F', 'C', 'B', 'A', 'A+'];
  });

  const [symbols, setSymbols] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_symbols');
    return saved ? JSON.parse(saved) : ['NQ', 'ES', 'CL', 'GC', 'EURUSD', 'CUSTOM'];
  });

  const [wlStatuses, setWlStatuses] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_wl_statuses');
    return saved ? JSON.parse(saved) : ['Win', 'BE -> Win', 'Loss', 'BE -> Loss', 'Tape'];
  });

  const [pillGradients, setPillGradients] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_gradients');
    return saved ? JSON.parse(saved) : {};
  });

  // Load trade details into local state when trade record loads
  useEffect(() => {
    if (trade) {
      setName(trade.commentBias || ''); // commentBias holds name inside Add Trade system
      setDate(trade.date || '');
      
      const loadedSymbol = trade.symbol || '';
      if (symbols.includes(loadedSymbol) && loadedSymbol !== 'CUSTOM') {
        setSymbol(loadedSymbol);
        setCustomSymbol('');
      } else {
        setSymbol('CUSTOM');
        setCustomSymbol(loadedSymbol);
      }

      setRating(trade.setupRating || 'A');
      setBias(trade.bias || 'LONG');
      setModel(trade.model || '');
      setWl(trade.wl || 'Win');
      setManualPnL(trade.manualPnL || '');
      setPo3(trade.po3Time || '');
      setEntryTf(trade.entryTf || '');
      setSession(trade.session || 'NY AM');
      
      try {
        setPlaybookTags(JSON.parse(localStorage.getItem('playbookTags') || 'null') || []);
      } catch {
        setPlaybookTags([]);
      }
      setEntryTf(trade.entryTf || '');
      setDol(trade.dol || '');
      setCommentExecution(trade.commentExecution || '');
      setCommentFazit(trade.commentFazit || '');
      setMistakes(trade.mistakes || []);
    }
  }, [trade, symbols]);

  // Pill gradient helpers (consistent with AddTradeModal)
  const getRatingGradient = (r) => {
    switch (r.toUpperCase()) {
      case 'F': return '#ff453a';
      case 'C': return '#ff9f0a';
      case 'B': return '#ffd60a';
      case 'A': return '#30d158';
      case 'A+': return '#1b8a3e';
      default: return '#cccccc';
    }
  };

  const getPillTextColor = (bgColor) => {
    if (!bgColor) return '#ffffff';
    let bg = bgColor.trim().toLowerCase();
    if (bg === '#ffffff' || bg === '#fff' || bg === 'white' || 
        bg === '#e5e5e5' || bg === '#cccccc' || bg === '#ccc' || 
        bg === '#b3b3b3' || bg === '#a3a3a3' || bg === '#999999') {
      return '#000000';
    }
    if (bg.startsWith('#')) {
      let hex = bg.replace('#', '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 125 ? '#000000' : '#ffffff';
      }
    }
    if (bg.startsWith('rgb')) {
      const match = bg.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 125 ? '#000000' : '#ffffff';
      }
    }
    return '#ffffff';
  };

  const getWlGradient = (s) => {
    if (pillGradients[s]) return pillGradients[s];
    switch (s) {
      case 'Win': return 'rgba(48, 209, 88, 0.08)';
      case 'BE -> Win': return 'linear-gradient(90deg, rgba(255, 159, 10, 0.08) 0%, rgba(48, 209, 88, 0.08) 100%)';
      case 'Loss': return 'rgba(255, 69, 58, 0.08)';
      case 'BE -> Loss': return 'linear-gradient(90deg, rgba(255, 159, 10, 0.08) 0%, rgba(255, 69, 58, 0.08) 100%)';
      case 'Tape': return 'rgba(153, 153, 153, 0.08)';
      case 'BE': return 'rgba(255, 159, 10, 0.08)';
      default: return 'rgba(255, 255, 255, 0.04)';
    }
  };

  const getWlBorder = (s) => {
    switch (s) {
      case 'Win': return '1px solid rgba(48, 209, 88, 0.25)';
      case 'BE -> Win': return '1px solid rgba(48, 209, 88, 0.25)';
      case 'Loss': return '1px solid rgba(255, 69, 58, 0.25)';
      case 'BE -> Loss': return '1px solid rgba(255, 69, 58, 0.25)';
      case 'Tape': return '1px solid rgba(153, 153, 153, 0.25)';
      case 'BE': return '1px solid rgba(255, 159, 10, 0.25)';
      default: return '1px solid rgba(255, 255, 255, 0.08)';
    }
  };

  const getWlColor = (s) => {
    switch (s) {
      case 'Win':
      case 'BE -> Win':
        return '#30d158';
      case 'Loss':
      case 'BE -> Loss':
        return '#ff453a';
      case 'Tape':
        return '#999999';
      case 'BE':
        return '#ff9f0a';
      default:
        return '#ffffff';
    }
  };

  const getTickerColor = (sym) => {
    if (pillGradients[sym]) return pillGradients[sym];
    switch (sym) {
      case 'NQ': return '#ffffff';
      case 'ES': return '#e5e5e5';
      case 'CL': return '#cccccc';
      case 'GC': return '#b3b3b3';
      case 'EURUSD': return '#999999';
      default: return '#cccccc';
    }
  };

  // Pre-load saved drawings on canvas
  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const drawSavedAnnotations = () => {
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (!trade) return;
    const annotations = trade.imageAnnotations || {};
    const strokes = annotations[activeSnapshotType] || [];
    
    strokes.forEach(stroke => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points && stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
  };

  // Sync canvas size and draw when snapshot view changes
  useEffect(() => {
    if (activeTab === 'snapshots') {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const container = canvas.parentElement;
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight || 300;
          drawSavedAnnotations();
        }
      }, 100);
    }
  }, [activeTab, activeSnapshotType, trade?.imageAnnotations]);

  if (!trade) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="hollow-drawer-backdrop"
        style={{ animation: 'none' }}
      >
        <motion.div 
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="hollow-drawer-container"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'none' }}
        >
          <RefreshCw className="animate-spin" size={32} color="#ffffff" />
          <div style={{ marginTop: '16px', color: '#fff', fontSize: '14px', fontWeight: '600' }}>Loading Trade Workspace...</div>
        </motion.div>
      </motion.div>
    );
  }

  // Mathematics derived from live executions
  const stats = calculateTradePnL(trade, tradeExecs);
  const isBETrade = isTradeBE({ wl, netPnL: stats.netPnL });
  const isGain = !isBETrade && stats.netPnL > 0;
  const isLoss = !isBETrade && stats.netPnL < 0;

  // Add behavioral mistake tag
  const handleAddMistake = () => {
    if (mistakeInput.trim() && !mistakes.includes(mistakeInput.trim())) {
      setMistakes([...mistakes, mistakeInput.trim()]);
      setMistakeInput('');
    }
  };

  const handleRemoveMistake = (idxToRemove) => {
    setMistakes(mistakes.filter((_, idx) => idx !== idxToRemove));
  };



  // Save Trade details back to IndexedDB
  const handleSaveChanges = () => {
    const finalSymbol = symbol === 'CUSTOM' ? (customSymbol.toUpperCase() || 'CUSTOM') : symbol;
    const isBEOutcome = wl.toLowerCase().includes('be') || wl.toLowerCase() === 'tape';
    const finalManualPnL = isBEOutcome && (manualPnL === '' || manualPnL === undefined || manualPnL === null) ? '0' : manualPnL;

    const updatedTrade = {
      ...trade,
      accountId,
      symbol: finalSymbol,
      date,
      setupRating: rating,
      rating,
      bias,
      model,
      wl,
      rr: 0,
      manualPnL: finalManualPnL,
      session: session || 'NY AM',
      po3,
      entryTf,
      dol,
      commentBias: name || `${finalSymbol} Breakout Setup`, // name is stored in commentBias
      commentExecution,
      commentProblems: mistakes.join(', ') || '',
      commentFazit,
      mistakes
    };
    onSaveTrade(updatedTrade);
    showToast('Changes saved successfully!');
  };

  // Handle Canvas Drawing Mouse Events
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Save starting point
    const annotations = trade.imageAnnotations || {};
    const strokes = annotations[activeSnapshotType] || [];
    const newStroke = {
      tool: canvasDrawingMode,
      color: canvasDrawingMode === 'eraser' ? '#0f0f11' : brushColor,
      size: brushSize,
      points: [{ x, y }]
    };
    strokes.push(newStroke);
    annotations[activeSnapshotType] = strokes;
    trade.imageAnnotations = annotations;
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = canvasDrawingMode === 'eraser' ? '#0f0f11' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };

    // Append point to active stroke
    const annotations = trade.imageAnnotations || {};
    const strokes = annotations[activeSnapshotType] || [];
    if (strokes.length > 0) {
      strokes[strokes.length - 1].points.push({ x, y });
    }
    annotations[activeSnapshotType] = strokes;
    trade.imageAnnotations = annotations;
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    db.trades.update(trade.id, { imageAnnotations: trade.imageAnnotations });
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const annotations = trade.imageAnnotations || {};
    annotations[activeSnapshotType] = [];
    trade.imageAnnotations = annotations;
    db.trades.update(trade.id, { imageAnnotations: annotations });
  };

  // Image Upload Helper for specific snapshot
  const handleSnapshotUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result;
        const updatedImages = trade.images ? [...trade.images] : [];
        const indexMap = { HTF: 0, MTF: 1, LTF: 2 };
        updatedImages[indexMap[type]] = base64Str;
        await db.trades.update(trade.id, { images: updatedImages });
      };
      reader.readAsDataURL(file);
    }
  };

  const getSnapshotImage = (type) => {
    const indexMap = { HTF: 0, MTF: 1, LTF: 2 };
    return trade.images ? trade.images[indexMap[type]] : null;
  };

  const finalSymbolDisplay = symbol === 'CUSTOM' ? (customSymbol || 'CUSTOM') : symbol;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="hollow-drawer-backdrop" 
      style={{ animation: 'none' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="hollow-drawer-container"
        style={{ animation: 'none', width: isMobile ? '100%' : '560px' }}
      >
        
        {/* HEADER AREA */}
        <div style={{ ...styles.header, padding: isMobile ? '16px' : '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: bias === 'LONG' ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.12)',
                color: bias === 'LONG' ? '#30d158' : '#ff453a',
                border: bias === 'LONG' ? '1px solid rgba(48, 209, 88, 0.2)' : '1px solid rgba(255, 69, 58, 0.2)',
                padding: '2px 9px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                {bias}
              </span>
              <h2 style={styles.headerTitle}>{finalSymbolDisplay}</h2>
            </div>
            <p style={styles.headerSubtitle}>{model || 'No playbook model specified'}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete this trade? This will remove all associated executions.')) {
                  onDeleteTrade(trade.id);
                  onClose();
                }
              }}
              style={styles.deleteButton}
              title="Delete Trade"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} style={styles.closeButton}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* HERO P&L DISPLAY CARD WITH STATS */}
        <div style={{ padding: isMobile ? '0 16px' : '0 24px', marginBottom: '20px' }}>
          <div style={{
            ...styles.pnlCard,
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '12px' : '0',
            boxShadow: 'none',
            background: getWlGradient(wl),
            border: getWlBorder(wl)
          }}>
            <div>
              <div style={styles.pnlLabel}>Net Realized PnL</div>
              <h1 style={{
                ...styles.pnlVal,
                color: getWlColor(wl),
                textShadow: 'none'
              }}>
                {stats.netPnL > 0 ? '+' : (stats.netPnL < 0 ? '-' : '')}${Math.abs(stats.netPnL).toFixed(2)}
              </h1>
            </div>
            
            <div style={{
              ...styles.pnlStatsGrid,
              textAlign: isMobile ? 'left' : 'right',
              flexDirection: isMobile ? 'row' : 'column',
              gap: isMobile ? '24px' : '8px'
            }}>
              <div style={styles.pnlStatItem}>
                <span style={styles.pnlStatLabel}>Manual PNL</span>
                <span style={styles.pnlStatValue}>{manualPnL || '—'}</span>
              </div>
              <div style={styles.pnlStatItem}>
                <span style={styles.pnlStatLabel}>Account</span>
                <span style={{ ...styles.pnlStatValue, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {accounts.find(a => a.id === accountId)?.name || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABS SELECT NAVIGATION */}
        <div style={{
          ...styles.tabBar,
          padding: isMobile ? '0 16px' : '0 24px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
            { id: 'narrative', label: 'Narratives & Tags', icon: <FileText size={14} /> },
            { id: 'snapshots', label: 'Chart Snaps', icon: <ImageIcon size={14} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tabItem,
                 color: activeTab === t.id ? '#ffffff' : 'rgba(255,255,255,0.45)',
                 borderBottom: activeTab === t.id ? '2px solid #ffffff' : '2px solid transparent',
                padding: isMobile ? '8px' : '12px 0',
                fontSize: isMobile ? '11px' : '12px'
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* SCROLLABLE WORKSPACE */}
        <div style={{
          ...styles.workspaceBody,
          padding: isMobile ? '16px' : '24px'
        }}>
          
          {/* TAB 1: OVERVIEW & PARAMETERS */}
          {activeTab === 'overview' && (
            <div style={styles.tabContent}>
              
              {/* Row 1: Name and Date */}
              <div style={{
                ...styles.formRowGrid,
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
              }}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Trade Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={styles.textInput}
                    placeholder="e.g. Opening Range Sweep Bounce"
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Execution Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    style={styles.textInput}
                  />
                </div>
              </div>

              {/* Row 2: Symbol Ticker pills selection */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Symbol (Ticker)</label>
                <div style={styles.pillContainer}>
                  {symbols.map(sym => {
                    const isSelected = symbol === sym;
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setSymbol(sym)}
                        style={{
                          ...styles.pillBtn,
                          background: isSelected ? getTickerColor(sym) : 'rgba(255,255,255,0.04)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                          color: isSelected ? getPillTextColor(getTickerColor(sym)) : 'rgba(255,255,255,0.8)',
                          fontWeight: isSelected ? '700' : '500',
                          padding: '6px 14px'
                        }}
                      >
                        {sym === 'CUSTOM' ? 'Custom' : sym}
                      </button>
                    );
                  })}
                </div>
                {symbol === 'CUSTOM' && (
                  <input 
                    type="text" 
                    placeholder="Enter custom ticker (e.g. BTC)..." 
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    style={{ ...styles.textInput, marginTop: '6px', width: '220px' }}
                  />
                )}
              </div>

              {/* Row 3: Setup Rating pills selection */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Setup Rating</label>
                <div style={styles.pillContainer}>
                  {ratings.map(r => {
                    const isSelected = rating === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRating(r)}
                        style={{
                          ...styles.pillBtn,
                          background: isSelected ? getRatingGradient(r) : 'rgba(255,255,255,0.04)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                          color: isSelected ? getPillTextColor(getRatingGradient(r)) : 'rgba(255,255,255,0.8)',
                          width: '50px',
                          fontWeight: isSelected ? '700' : '500'
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Direction L/S & Setup Model */}
              <div style={{
                ...styles.formRowGrid,
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
              }}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Direction (L/S)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['LONG', 'SHORT'].map(dir => {
                      const isSelected = bias === dir;
                      const activeBg = dir === 'LONG' ? 'rgba(48, 209, 88, 0.08)' : 'rgba(255, 69, 58, 0.08)';
                      const activeBorder = dir === 'LONG' ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid rgba(255, 69, 58, 0.25)';
                      const activeColor = dir === 'LONG' ? '#30d158' : '#ff453a';
                      return (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => setBias(dir)}
                          style={{
                            ...styles.pillBtn,
                            flex: 1,
                            background: isSelected ? activeBg : 'rgba(255,255,255,0.04)',
                            border: isSelected ? activeBorder : '1px solid rgba(255,255,255,0.06)',
                            color: isSelected ? activeColor : '#fff',
                            fontWeight: isSelected ? '700' : '500',
                            padding: '8px'
                          }}
                        >
                          {dir}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Playbook Model</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: playbookTags.length > 0 ? '12px' : '0' }}>
                    {playbookTags.map(tag => {
                      const isSelected = model === tag;
                      const modelData = JSON.parse(localStorage.getItem('hollowPlaybookModels') || '{}')[tag];
                      const tagColor = modelData?.color || '#30d158';
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setModel(isSelected ? '' : tag)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            background: isSelected ? '#fff' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                            color: isSelected ? '#000' : tagColor,
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                    {playbookTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setModel('');
                          document.getElementById('custom-model-input')?.focus();
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px dashed rgba(255,255,255,0.2)',
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        custom
                      </button>
                    )}
                  </div>
                  {(!playbookTags.length || !playbookTags.includes(model)) && (
                    <input 
                      id="custom-model-input"
                      type="text" 
                      value={model} 
                      onChange={e => setModel(e.target.value)} 
                      style={styles.textInput}
                      placeholder="e.g. Fair Value Gap"
                    />
                  )}
                </div>
              </div>

              {/* Row 5: Outcome W/L */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Outcome (W/L)</label>
                <div style={styles.pillContainer}>
                  {wlStatuses.map(status => {
                    const isSelected = wl === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setWl(status)}
                        style={{
                          ...styles.pillBtn,
                          background: isSelected ? getWlGradient(status) : 'rgba(255,255,255,0.04)',
                          border: isSelected ? getWlBorder(status) : '1px solid rgba(255,255,255,0.06)',
                          color: isSelected ? getWlColor(status) : '#fff',
                          fontWeight: isSelected ? '700' : '500',
                          padding: '6px 14px'
                        }}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 6: Account Selector & PNL Override */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
                alignItems: 'center'
              }}>
                <div style={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.inputLabel}>PNL</label>
                  </div>
                  <input 
                    type="number" 
                    placeholder="optional override"
                    value={manualPnL} 
                    onChange={e => setManualPnL(e.target.value)} 
                    style={{ 
                      ...styles.textInput, 
                      color: (wl || '').toLowerCase().includes('be') || (manualPnL !== '' && parseFloat(manualPnL) === 0) ? '#ff9f0a' : (manualPnL === '' ? '#fff' : (parseFloat(manualPnL) > 0 ? '#30d158' : '#ff453a'))
                    }}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Account Workspace</label>
                  <HollowSelect
                    value={accountId}
                    onChange={setAccountId}
                    options={accounts.map(acc => ({
                      value: acc.id,
                      label: `${acc.name} (${acc.propFirm || 'Live'})`
                    }))}
                    placeholder="Select Account"
                  />
                </div>
              </div>

              {/* Row 7: PO3 Time, Entry TF, and DOL */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                gap: '16px'
              }}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>PO3 Time (HH:MM)</label>
                  <input 
                    type="time" 
                    value={po3} 
                    onChange={e => setPo3(e.target.value)} 
                    style={styles.textInput}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Entry Time Frame</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 5 minute"
                    value={entryTf} 
                    onChange={e => setEntryTf(e.target.value)} 
                    style={styles.textInput}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>Draw On Liquidity</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Daily High"
                    value={dol} 
                    onChange={e => setDol(e.target.value)} 
                    style={styles.textInput}
                  />
                </div>
              </div>

              {/* Row 8: Session Selection */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Session</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {['Asia', 'London', 'NY AM', 'NY PM'].map(s => {
                    const isSelected = session === s;
                    let color = '#fff';
                    let bg = 'rgba(255,255,255,0.04)';
                    let border = '1px solid rgba(255,255,255,0.06)';
                    
                    if (s === 'Asia') {
                      color = '#ff453a';
                      if (isSelected) {
                        bg = 'rgba(255, 69, 58, 0.15)';
                        border = '1px solid rgba(255, 69, 58, 0.4)';
                      }
                    } else if (s === 'London') {
                      color = '#0a84ff';
                      if (isSelected) {
                        bg = 'rgba(10, 132, 255, 0.15)';
                        border = '1px solid rgba(10, 132, 255, 0.4)';
                      }
                    } else if (s === 'NY AM') {
                      color = '#ff2d55';
                      if (isSelected) {
                        bg = 'rgba(255, 45, 85, 0.15)';
                        border = '1px solid rgba(255, 45, 85, 0.4)';
                      }
                    } else if (s === 'NY PM') {
                      color = '#af52de';
                      if (isSelected) {
                        bg = 'rgba(175, 82, 222, 0.15)';
                        border = '1px solid rgba(175, 82, 222, 0.4)';
                      }
                    }

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSession(s)}
                        style={{
                          ...styles.pillBtn,
                          background: bg,
                          border: border,
                          color: isSelected ? color : 'rgba(255,255,255,0.5)',
                          fontWeight: isSelected ? '700' : '500',
                          padding: '6px 14px'
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NARRATIVES & PROBLEMS / MISTAKES */}
          {activeTab === 'narrative' && (
            <div style={styles.tabContent}>
              
              {/* Leaks & Problems tagging */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Behavioral Mistakes / Problems Tagging</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add behavioral leak (e.g. FOMO, early exit)..."
                    value={mistakeInput}
                    onChange={e => setMistakeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMistake())}
                    style={{ ...styles.textInput, flex: 1 }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddMistake}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      width: '40px',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Mistakes Red Pills List */}
                <div style={styles.pillContainer}>
                  {mistakes.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                      No problems tagged. Type a leak and click '+' to record.
                    </span>
                  ) : (
                    mistakes.map((m, idx) => (
                      <button
                        key={`${m}-${idx}`}
                        type="button"
                        onClick={() => handleRemoveMistake(idx)}
                        style={{
                          ...styles.pillBtn,
                           background: 'rgba(255, 69, 58, 0.08)',
                           border: '1px solid rgba(255, 69, 58, 0.25)',
                           color: '#ff453a',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '20px'
                        }}
                        title="Click to remove tag"
                      >
                        <span>{m}</span>
                        <X size={10} />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Narratives Commentary */}
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Execution & Trade Story</label>
                <textarea
                  value={commentExecution}
                  onChange={e => setCommentExecution(e.target.value)}
                  style={styles.textareaInput}
                  rows={4}
                  placeholder="Tell the story of how the fills were completed and managed..."
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Lessons Learned & Conclusion</label>
                <textarea
                  value={commentFazit}
                  onChange={e => setCommentFazit(e.target.value)}
                  style={styles.textareaInput}
                  rows={4}
                  placeholder="What is the key takeaway from this audit review?..."
                />
              </div>

            </div>
          )}


          {/* TAB 4: SNAPSHOTS & CANVAS ANNOTATOR */}
          {activeTab === 'snapshots' && (
            <div style={styles.tabContent}>
              
              {/* Snapshot Category selector */}
              <div style={styles.snapshotTypeTabs}>
                {['HTF', 'MTF', 'LTF'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveSnapshotType(t)}
                    style={{
                      ...styles.snapshotTabItem,
                      background: activeSnapshotType === t ? '#2c2c2e' : 'rgba(255,255,255,0.02)',
                      color: activeSnapshotType === t ? '#fff' : 'rgba(255,255,255,0.45)',
                      borderColor: activeSnapshotType === t ? '#4a4a4d' : 'rgba(255,255,255,0.08)'
                    }}
                  >
                    {isMobile ? t : `${t} Chart Frame`}
                  </button>
                ))}
              </div>

              {/* Drawing Toolbar Overlay */}
              {getSnapshotImage(activeSnapshotType) && (
                <div style={styles.canvasToolbar}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setCanvasDrawingMode('pen')}
                      style={{
                        ...styles.toolBtn,
                        background: canvasDrawingMode === 'pen' ? '#4a4a4d' : 'transparent',
                        borderColor: canvasDrawingMode === 'pen' ? '#fff' : 'transparent'
                      }}
                      title="Brush Tool"
                    >
                      <PenTool size={14} color={canvasDrawingMode === 'pen' ? '#fff' : '#fff'} />
                    </button>
                    
                    <button
                      onClick={() => setCanvasDrawingMode('eraser')}
                      style={{
                        ...styles.toolBtn,
                        background: canvasDrawingMode === 'eraser' ? '#4a4a4d' : 'transparent',
                        borderColor: canvasDrawingMode === 'eraser' ? '#fff' : 'transparent'
                      }}
                      title="Eraser"
                    >
                      <Eraser size={14} color={canvasDrawingMode === 'eraser' ? '#fff' : '#fff'} />
                    </button>
                  </div>

                  {canvasDrawingMode === 'pen' && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {['#ffffff', '#a1a1aa', '#71717a', '#52525b'].map(c => (
                        <button
                          key={c}
                          onClick={() => setBrushColor(c)}
                          style={{
                            ...styles.colorCircle,
                            backgroundColor: c,
                            border: brushColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>Size</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="15" 
                      value={brushSize} 
                      onChange={e => setBrushSize(parseInt(e.target.value))} 
                      style={{ width: '60px', height: '3px' }}
                    />
                  </div>

                  <button onClick={handleClearCanvas} style={styles.clearBtn}>
                    Clear Drawing
                  </button>
                </div>
              )}

              {/* Main Snapshot Frame Box */}
              <div style={styles.canvasContainer}>
                {getSnapshotImage(activeSnapshotType) ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img 
                      src={getSnapshotImage(activeSnapshotType)} 
                      alt={`${activeSnapshotType} snapshot`} 
                      style={styles.canvasImage}
                    />
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={styles.drawingCanvas}
                      onMouseEnter={() => {
                        if (canvasDrawingMode === 'eraser') {
                           const ctx = canvasRef.current.getContext('2d');
                           ctx.globalCompositeOperation = 'destination-out';
                        } else {
                           const ctx = canvasRef.current.getContext('2d');
                           ctx.globalCompositeOperation = 'source-over';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <ImageIcon size={32} color="rgba(255,255,255,0.2)" />
                    <span style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                      No {activeSnapshotType} snapshot uploaded.
                    </span>
                    <label style={styles.uploadBtnLabel}>
                      Upload Snap
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleSnapshotUpload(e, activeSnapshotType)} 
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* BOTTOM GLOBAL ACTION BUTTONS BAR */}
        <div style={{
          ...styles.footer,
          padding: isMobile ? '12px 16px' : '16px 24px',
          justifyContent: isMobile ? 'space-between' : 'flex-end'
        }}>
          <button onClick={onClose} style={{
            ...styles.cancelGlobalBtn,
            flex: isMobile ? 1 : 'none',
            textAlign: 'center'
          }}>
            Cancel
          </button>
          
          <button onClick={handleSaveChanges} style={{
            ...styles.saveGlobalBtn,
            flex: isMobile ? 1 : 'none',
            textAlign: 'center'
          }}>
            {isMobile ? 'Save' : 'Save Audit Workspace'}
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}

const styles = {
  header: {
    padding: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#fff',
    margin: 0,
    fontFamily: 'var(--font-heading)'
  },
  headerSubtitle: {
    fontSize: '11px',
    color: 'var(--colors-stone)',
    margin: '4px 0 0 0',
    fontWeight: '500'
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s'
  },
  deleteButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 69, 58, 0.08)',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    color: '#ff453a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s'
  },
  pnlCard: {
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pnlLabel: {
    fontSize: '11px',
    color: 'var(--colors-stone)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  pnlVal: {
    fontSize: '32px',
    fontWeight: '900',
    margin: '4px 0 0 0',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-1px'
  },
  pnlStatsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'right'
  },
  pnlStatItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  pnlStatLabel: {
    fontSize: '9px',
    color: 'var(--colors-stone)',
    textTransform: 'uppercase',
    fontWeight: '500'
  },
  pnlStatValue: {
    fontSize: '12px',
    color: '#fff',
    fontWeight: '700'
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '0 24px'
  },
  tabItem: {
    flex: 1,
    padding: '12px 0',
    background: 'transparent',
    border: 'none',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    outline: 'none',
    transition: 'all 0.2s'
  },
  workspaceBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formRowGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  inputLabel: {
    fontSize: '11px',
    color: 'var(--colors-stone)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap'
  },
  textInput: {
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box'
  },
  textareaInput: {
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  pillContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px'
  },
  pillBtn: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s'
  },
  execForm: {
    background: 'rgba(255,255,255,0.015)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  execFormTitle: {
    fontSize: '12px',
    color: '#fff',
    fontWeight: '700',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
   submitExecBtn: {
     background: '#ffffff',
     color: '#000000',
     border: 'none',
     borderRadius: '10px',
    padding: '10px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none'
  },
  execList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '6px'
  },
  execRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '8px 12px'
  },
  noExecs: {
    textAlign: 'center',
    padding: '16px',
    color: 'var(--colors-stone)',
    fontSize: '12px'
  },
  delExecBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.25)',
    cursor: 'pointer',
    outline: 'none',
    padding: '4px'
  },
  snapshotTypeTabs: {
    display: 'flex',
    gap: '8px'
  },
  snapshotTabItem: {
    flex: 1,
    padding: '8px 0',
    border: '1px solid',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
    textAlign: 'center'
  },
   canvasContainer: {
     marginTop: '12px',
     background: '#0f0f11',
     border: '1px solid #1c1c1e',
     borderRadius: '14px',
     height: '320px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  canvasImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none'
  },
  drawingCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
    zIndex: 10
  },
  canvasToolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    marginTop: '12px'
  },
  toolBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none'
  },
  colorCircle: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    cursor: 'pointer',
    outline: 'none',
    padding: 0
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ff5b5c',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    cursor: 'pointer',
    outline: 'none'
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px'
  },
  uploadBtnLabel: {
    marginTop: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '6px 12px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    background: '#0f0f11'
  },
  cancelGlobalBtn: {
    background: 'rgba(255,255,255,0.02)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '10px 18px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none'
  },
   saveGlobalBtn: {
     background: '#ffffff',
     color: '#000000',
     border: 'none',
     borderRadius: '10px',
     padding: '10px 20px',
     fontSize: '12px',
     fontWeight: '600',
     cursor: 'pointer',
     outline: 'none',
     boxShadow: 'none'
   }
};
