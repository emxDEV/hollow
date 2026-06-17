import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  X, TrendingUp, TrendingDown, Edit2, Save, Trash2,
  Clock, Target, Activity, ChevronLeft, ChevronRight,
  Plus, Minus, Check, Upload
} from 'lucide-react';
import { db } from '../../db/hollowDb';
import { calculateTradePnL } from '../../utils/tradeMath';

const DEFAULT_SYMBOLS = ['nq', 'es', 'cl', 'gc'];
const BIASES = ['LONG', 'SHORT'];
const RATINGS = ['f', 'c', 'b', 'a', 'a+'];
const OUTCOMES = ['win', 'be -> win', 'loss', 'be -> loss', 'tape'];

const MISTAKES_OPTIONS = [
  'FOMO',
  'Early Exit',
  'Late Entry',
  'Overtrading',
  'Averaging Down',
  'Holding Losers',
  'Sizing Up'
];

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #ffb3ba 0%, #ffc8cb 100%)',
  'linear-gradient(135deg, #ffdfba 0%, #ffe9d1 100%)',
  'linear-gradient(135deg, #ffffba 0%, #fffff0 100%)',
  'linear-gradient(135deg, #baffc9 0%, #d6ffe2 100%)',
  'linear-gradient(135deg, #bae1ff 0%, #d1ecff 100%)',
  'linear-gradient(135deg, #e8c4ff 0%, #f3e5ff 100%)',
  'linear-gradient(135deg, #ffd3b6 0%, #ffaaa5 100%)',
  'linear-gradient(135deg, #d3d3d3 0%, #e2e8f0 100%)'
];

export default function TradeDetailSheet({
  tradeId, trades, executions, onClose, onSaveTrade, onDeleteTrade, addToast
}) {
  const trade = useMemo(() => trades.find(t => t.id === tradeId), [trades, tradeId]);
  const tradeExecs = useMemo(() =>
    executions.filter(e => e.tradeId === tradeId),
    [executions, tradeId]
  );

  const pnlData = useMemo(() => {
    if (!trade) return { netPnL: 0, grossPnL: 0, commissions: 0, avgEntry: 0, avgExit: 0, contracts: 0 };
    return calculateTradePnL(trade, tradeExecs);
  }, [trade, tradeExecs]);

  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const groups = useLiveQuery(() => db.groups.toArray()) || [];

  const accountOrGroupName = useMemo(() => {
    if (!trade) return '—';
    const acc = accounts.find(a => a.id === trade.accountId);
    if (!acc) return '—';
    const grp = groups.find(g => g.id === trade.accountId || g.leaderAccountId === acc.id || g.followerAccountIds?.includes(acc.id));
    if (grp) return `${acc.name} (${grp.name})`;
    return acc.name;
  }, [trade, accounts, groups]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Tab Control when editing
  const [activeTab, setActiveTab] = useState('execution');
  const [activeSnapshotType, setActiveSnapshotType] = useState('HTF');
  const [playbookTags, setPlaybookTags] = useState([]);

  // Pill customization states
  const [symbols, setSymbols] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_symbols');
    return saved ? JSON.parse(saved) : ['NQ', 'ES', 'CL', 'GC', 'EURUSD', 'CUSTOM'];
  });
  const [pillGradients, setPillGradients] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_gradients');
    return saved ? JSON.parse(saved) : {};
  });
  const [showCustomSymbolInput, setShowCustomSymbolInput] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const [confluencesList, setConfluencesList] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_confluences');
    return saved ? JSON.parse(saved) : ['VWAP HOLD', 'HTF LEVEL', 'LIQUIDITY SWEEP', 'FVG RETEST', 'MARKET SHIFT', 'CUSTOM'];
  });
  const [showCustomConfluenceInput, setShowCustomConfluenceInput] = useState(false);
  const [customConfluence, setCustomConfluence] = useState('');
  const [customMistake, setCustomMistake] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  // Double-tap/click detection state
  const lastTapRef = React.useRef({ time: 0, label: null, type: null });
  const renameInputRef = React.useRef(null);

  useEffect(() => {
    if (trade) {
      setForm({
        symbol: trade.symbol || 'NQ',
        bias: trade.bias || 'LONG',
        model: trade.model || '',
        date: trade.date || '',
        mistakes: trade.mistakes || [],
        confluences: trade.confluences || [],
        sentimentPre: trade.sentimentPre || 3,
        sentimentPost: trade.sentimentPost || 3,
        commentBias: trade.commentBias || '', // trade name
        commentExecution: trade.commentExecution || '', // reflections
        commentProblems: trade.commentProblems || '',
        commentFazit: trade.commentFazit || '',
        setupRating: (trade.setupRating || 'A').toLowerCase(),
        outcome: trade.wl || 'win',
        manualPnL: trade.manualPnL || '',
        po3Time: trade.po3Time || '',
        entryTf: trade.entryTf || '',
        dol: trade.dol || '',
        session: trade.session || 'NY AM',
        imageLTF: trade.images?.[0] || null,
        imageMTF: trade.images?.[1] || null,
        imageHTF: trade.images?.[2] || null,
      });

      try {
        setPlaybookTags(JSON.parse(localStorage.getItem('playbookTags') || 'null') || []);
      } catch {
        setPlaybookTags([]);
      }
    }
  }, [trade]);

  if (!trade || !form) return null;

  const isWin = pnlData.netPnL > 0;
  const isLoss = pnlData.netPnL < 0;

  const fmt = (n) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '+';
    return `${sign}$${abs.toFixed(2)}`;
  };

  const handlePillClick = (e, type, label, onSingleClick) => {
    if (label === 'CUSTOM') {
      onSingleClick();
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const lastTap = lastTapRef.current;

    if (lastTap.type === type && lastTap.label === label && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.changedTouches && e.changedTouches[0]) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      if (!clientX || !clientY) {
        const rect = e.currentTarget.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }

      setContextMenu({
        x: Math.min(clientX, window.innerWidth - 250),
        y: Math.min(clientY, window.innerHeight - 320),
        type,
        label
      });
      lastTapRef.current = { time: 0, label: null, type: null };
    } else {
      lastTapRef.current = { time: now, label, type };
      onSingleClick();
    }
  };

  const handlePillContextMenu = (e, type, label) => {
    e.preventDefault();
    if (label === 'CUSTOM') return;
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 250),
      y: Math.min(e.clientY, window.innerHeight - 320),
      type,
      label
    });
  };

  const handleRenamePill = (type, oldLabel, newLabel) => {
    if (!newLabel || !newLabel.trim()) return;
    const cleanLabel = newLabel.trim().toUpperCase();
    if (cleanLabel === oldLabel.toUpperCase()) return;

    if (type === 'symbol') {
      const updated = symbols.map(s => s.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : s);
      setSymbols(updated);
      localStorage.setItem('hollow_pill_symbols', JSON.stringify(updated));
      if (form.symbol.toUpperCase() === oldLabel.toUpperCase()) setForm(f => ({ ...f, symbol: cleanLabel }));
    } else if (type === 'confluence') {
      const updated = confluencesList.map(c => c.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : c);
      setConfluencesList(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      if (form.confluences.includes(oldLabel)) {
        setForm(f => ({ ...f, confluences: f.confluences.map(c => c.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : c) }));
      }
    }

    const updatedGradients = { ...pillGradients };
    if (updatedGradients[oldLabel]) {
      updatedGradients[cleanLabel] = updatedGradients[oldLabel];
      delete updatedGradients[oldLabel];
      setPillGradients(updatedGradients);
      localStorage.setItem('hollow_pill_gradients', JSON.stringify(updatedGradients));
    }
    setContextMenu(prev => prev ? { ...prev, label: cleanLabel } : null);
  };

  const handleChangePillColor = (label, gradient) => {
    const updatedGradients = {
      ...pillGradients,
      [label]: gradient
    };
    setPillGradients(updatedGradients);
    localStorage.setItem('hollow_pill_gradients', JSON.stringify(updatedGradients));
  };

  const handleDeletePill = (type, oldLabel) => {
    if (type === 'symbol') {
      const updated = symbols.filter(s => s.toUpperCase() !== oldLabel.toUpperCase());
      setSymbols(updated);
      localStorage.setItem('hollow_pill_symbols', JSON.stringify(updated));
      if (form.symbol.toUpperCase() === oldLabel.toUpperCase()) {
        setForm(f => ({ ...f, symbol: updated.length > 0 ? updated[0] : 'CUSTOM' }));
      }
    } else if (type === 'confluence') {
      const updated = confluencesList.filter(c => c.toUpperCase() !== oldLabel.toUpperCase());
      setConfluencesList(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      setForm(f => ({ ...f, confluences: f.confluences.filter(c => c.toUpperCase() !== oldLabel.toUpperCase()) }));
    }

    if (pillGradients[oldLabel]) {
      const updatedGradients = { ...pillGradients };
      delete updatedGradients[oldLabel];
      setPillGradients(updatedGradients);
      localStorage.setItem('hollow_pill_gradients', JSON.stringify(updatedGradients));
    }
  };

  const handleAddCustomConfluence = () => {
    if (!customConfluence || !customConfluence.trim()) return;
    const cleanConf = customConfluence.trim().toUpperCase();
    if (confluencesList.map(c => c.toUpperCase()).includes(cleanConf)) {
      setForm(f => {
        if (!f.confluences.includes(cleanConf)) {
          return { ...f, confluences: [...f.confluences, cleanConf] };
        }
        return f;
      });
      setShowCustomConfluenceInput(false);
      setCustomConfluence('');
      return;
    }
    const customIndex = confluencesList.findIndex(c => c.toUpperCase() === 'CUSTOM');
    const updatedConfluences = [...confluencesList];
    if (customIndex !== -1) {
      updatedConfluences.splice(customIndex, 0, cleanConf);
    } else {
      updatedConfluences.push(cleanConf, 'CUSTOM');
    }
    setConfluencesList(updatedConfluences);
    localStorage.setItem('hollow_pill_confluences', JSON.stringify(updatedConfluences));
    setForm(f => ({ ...f, confluences: [...f.confluences, cleanConf] }));
    setShowCustomConfluenceInput(false);
    setCustomConfluence('');
  };

  const handleAddCustomSymbolTicker = () => {
    if (!customSymbol || !customSymbol.trim()) return;
    const cleanSym = customSymbol.trim().toUpperCase();
    if (symbols.map(s => s.toUpperCase()).includes(cleanSym)) {
      setForm(f => ({ ...f, symbol: cleanSym }));
      setShowCustomSymbolInput(false);
      setCustomSymbol('');
      return;
    }
    const customIndex = symbols.findIndex(s => s.toUpperCase() === 'CUSTOM');
    const updatedSymbols = [...symbols];
    if (customIndex !== -1) {
      updatedSymbols.splice(customIndex, 0, cleanSym);
    } else {
      updatedSymbols.push(cleanSym, 'CUSTOM');
    }
    setSymbols(updatedSymbols);
    localStorage.setItem('hollow_pill_symbols', JSON.stringify(updatedSymbols));
    setForm(f => ({ ...f, symbol: cleanSym }));
    setShowCustomSymbolInput(false);
    setCustomSymbol('');
  };

  const getTickerColor = (sym) => {
    if (pillGradients[sym]) return pillGradients[sym];
    switch (sym.toUpperCase()) {
      case 'NQ': return '#ffffff';
      case 'ES': return '#e5e5e5';
      case 'CL': return '#cccccc';
      case 'GC': return '#b3b3b3';
      case 'EURUSD': return '#999999';
      default: return '#cccccc';
    }
  };

  const getRatingColor = (r) => {
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
    return '#ffffff';
  };

  const getWlGradient = (s) => {
    if (!s) return 'rgba(255, 255, 255, 0.04)';
    if (pillGradients[s]) return pillGradients[s];
    const norm = s.toLowerCase();
    switch (norm) {
      case 'win': return 'rgba(48, 209, 88, 0.08)';
      case 'be -> win': return 'linear-gradient(90deg, rgba(255, 159, 10, 0.08) 0%, rgba(48, 209, 88, 0.08) 100%)';
      case 'loss': return 'rgba(255, 69, 58, 0.08)';
      case 'be -> loss': return 'linear-gradient(90deg, rgba(255, 159, 10, 0.08) 0%, rgba(255, 69, 58, 0.08) 100%)';
      case 'tape': return 'rgba(153, 153, 153, 0.08)';
      case 'be': return 'rgba(255, 159, 10, 0.08)';
      default: return 'rgba(255, 255, 255, 0.04)';
    }
  };

  const getWlBorder = (s) => {
    if (!s) return '1px solid rgba(255, 255, 255, 0.08)';
    const norm = s.toLowerCase();
    switch (norm) {
      case 'win': return '1px solid rgba(48, 209, 88, 0.25)';
      case 'be -> win': return '1px solid rgba(48, 209, 88, 0.25)';
      case 'loss': return '1px solid rgba(255, 69, 58, 0.25)';
      case 'be -> loss': return '1px solid rgba(255, 69, 58, 0.25)';
      case 'tape': return '1px solid rgba(153, 153, 153, 0.25)';
      case 'be': return '1px solid rgba(255, 159, 10, 0.25)';
      default: return '1px solid rgba(255, 255, 255, 0.08)';
    }
  };

  const getWlColor = (s) => {
    if (!s) return '#ffffff';
    const norm = s.toLowerCase();
    switch (norm) {
      case 'win':
      case 'be -> win':
        return '#30d158';
      case 'loss':
      case 'be -> loss':
        return '#ff453a';
      case 'tape':
        return '#999999';
      case 'be':
        return '#ff9f0a';
      default:
        return '#ffffff';
    }
  };
  const getWlCardBackground = (s) => {
    if (!s) return 'linear-gradient(135deg, #1c1c1e, #2c2c2e)';
    const norm = s.toLowerCase();
    switch (norm) {
      case 'win':
        return 'linear-gradient(135deg, #0d2b1a 0%, #0f3320 100%)';
      case 'loss':
        return 'linear-gradient(135deg, #2b0d0d 0%, #331010 100%)';
      case 'be -> win':
        return 'linear-gradient(135deg, #2b230d 0%, #0d2b1a 100%)';
      case 'be -> loss':
        return 'linear-gradient(135deg, #2b230d 0%, #2b0d0d 100%)';
      case 'tape':
      case 'be':
      default:
        return 'linear-gradient(135deg, #1c1c1e, #2c2c2e)';
    }
  };

  const getWlCardBorder = (s) => {
    if (!s) return '1px solid rgba(255, 255, 255, 0.1)';
    const norm = s.toLowerCase();
    switch (norm) {
      case 'win':
      case 'be -> win':
        return '1px solid rgba(48, 209, 88, 0.2)';
      case 'loss':
      case 'be -> loss':
        return '1px solid rgba(255, 69, 58, 0.2)';
      case 'be':
        return '1px solid rgba(255, 159, 10, 0.2)';
      case 'tape':
      default:
        return '1px solid rgba(255, 255, 255, 0.1)';
    }
  };

  const getSessionColor = (s) => {
    if (!s) return '#fff';
    switch (s) {
      case 'Asia': return '#ff453a';
      case 'London': return '#0a84ff';
      case 'NY AM': return '#ff2d55';
      case 'NY PM': return '#af52de';
      default: return '#fff';
    }
  };

  const toggleMistake = (tag) => {
    setForm(f => {
      const isSelected = f.mistakes.includes(tag);
      return {
        ...f,
        mistakes: isSelected ? f.mistakes.filter(t => t !== tag) : [...f.mistakes, tag]
      };
    });
  };

  const handleAddCustomMistake = () => {
    if (customMistake.trim()) {
      const clean = customMistake.trim();
      setForm(f => {
        if (!f.mistakes.includes(clean)) {
          return { ...f, mistakes: [...f.mistakes, clean] };
        }
        return f;
      });
      setCustomMistake('');
    }
  };

  const handleImageUpload = (e, targetSetter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, [targetSetter]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const isBEOutcome = form.outcome.toLowerCase().includes('be') || form.outcome.toLowerCase() === 'tape';
    const finalManualPnL = isBEOutcome && (form.manualPnL === '' || form.manualPnL === undefined || form.manualPnL === null) ? '0' : form.manualPnL;

    const updatedTrade = {
      ...trade,
      symbol: form.symbol,
      bias: form.bias,
      model: form.model || 'Opening Range Breakout',
      date: form.date,
      setupRating: form.setupRating.toUpperCase(),
      wl: form.outcome,
      rr: 0,
      manualPnL: finalManualPnL,
      session: form.session || 'NY AM',
      po3Time: form.po3Time,
      entryTf: form.entryTf,
      dol: form.dol,
      mistakes: form.mistakes,
      confluences: form.confluences,
      sentimentPre: form.sentimentPre,
      sentimentPost: form.sentimentPost,
      commentBias: form.commentBias, // trade name
      commentExecution: form.commentExecution, // reflections
      images: [form.imageLTF, form.imageMTF, form.imageHTF].filter(Boolean),
    };
    await onSaveTrade(updatedTrade);
    setEditing(false);
    addToast('Trade updated.', 'success');
  };

  const handleDelete = async () => {
    await onDeleteTrade(tradeId);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-end'
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: editing ? 'rgba(20, 20, 24, 0.85)' : '#0f0f11',
          backdropFilter: editing ? 'blur(30px) saturate(210%)' : 'none',
          WebkitBackdropFilter: editing ? 'blur(30px) saturate(210%)' : 'none',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          paddingBottom: editing ? 'calc(var(--safe-bottom) + 12px)' : 'calc(var(--safe-bottom) + 20px)',
          maxHeight: editing ? '94vh' : '92vh',
          display: editing ? 'flex' : 'block',
          flexDirection: editing ? 'column' : 'initial',
          overflowY: editing ? 'initial' : 'auto',
          WebkitOverflowScrolling: editing ? 'initial' : 'touch',
          boxShadow: editing ? '0 -10px 40px rgba(0,0,0,0.6)' : 'none'
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {editing ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 850, color: '#fff', letterSpacing: '-0.02em', textTransform: 'lowercase' }}>edit trade.</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1, textTransform: 'lowercase' }}>modify logged parameters</div>
              </div>
              <button onClick={() => setEditing(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={13} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            {/* Tab Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px 16px 0', gap: '16px', flexShrink: 0 }}>
              {[
                { id: 'execution', label: '1. execution' },
                { id: 'reflections', label: '2. reflections' },
                { id: 'charts', label: '3. charts' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    fontWeight: 600,
                    paddingBottom: 6,
                    position: 'relative',
                    cursor: 'pointer',
                    fontFamily: 'var(--font)'
                  }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="activeEditTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#fff' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable Form Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', WebkitOverflowScrolling: 'touch' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'execution' && (
                  <motion.div
                    key="execution"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    {/* Date */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>date</div>
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          color: '#fff',
                          fontFamily: 'var(--font)',
                          fontSize: 12,
                          padding: '6px 8px',
                          outline: 'none',
                          colorScheme: 'dark',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Trade Name */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>trade name</div>
                      <input
                        type="text"
                        placeholder="e.g. range bounce"
                        value={form.commentBias}
                        onChange={e => setForm(f => ({ ...f, commentBias: e.target.value }))}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          color: '#fff',
                          fontFamily: 'var(--font)',
                          fontSize: 12,
                          padding: '6px 8px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Symbol Ticker Pills */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>symbol</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {symbols.map(s => {
                          const isSelected = form.symbol.toUpperCase() === s.toUpperCase() && !showCustomSymbolInput;
                          const bgColor = isSelected ? getTickerColor(s) : 'rgba(255,255,255,0.04)';
                          const textColor = isSelected ? getPillTextColor(getTickerColor(s)) : 'rgba(255,255,255,0.7)';
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={(e) => {
                                handlePillClick(e, 'symbol', s, () => {
                                  if (s === 'CUSTOM') {
                                    setShowCustomSymbolInput(true);
                                  } else {
                                    setForm(f => ({ ...f, symbol: s }));
                                    setShowCustomSymbolInput(false);
                                  }
                                });
                              }}
                              onContextMenu={(e) => handlePillContextMenu(e, 'symbol', s)}
                              style={{
                                background: bgColor,
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12,
                                padding: '4px 9px',
                                color: textColor,
                                fontSize: 10,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: s === 'CUSTOM' ? 'pointer' : 'context-menu',
                                fontFamily: 'var(--font)',
                                transition: 'all 0.15s'
                              }}
                            >
                              {s === 'CUSTOM' ? '+ custom' : s.toLowerCase()}
                            </button>
                          );
                        })}
                      </div>
                      {showCustomSymbolInput && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                          <input
                            type="text"
                            placeholder="ENTER TICKER"
                            value={customSymbol}
                            onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleAddCustomSymbolTicker();
                              }
                            }}
                            style={{
                              flex: 1,
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              color: '#fff',
                              fontFamily: 'var(--font)',
                              fontSize: 12,
                              padding: '6px 8px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSymbolTicker}
                            style={{
                              background: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#000',
                              flexShrink: 0
                            }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Direction & Outcome */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>direction</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, bias: 'LONG' }))}
                            style={{
                              flex: 1,
                              background: form.bias === 'LONG' ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.02)',
                              border: form.bias === 'LONG' ? '1px solid rgba(48,209,88,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                              padding: '5px',
                              color: form.bias === 'LONG' ? '#30d158' : 'rgba(255,255,255,0.4)',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: 'var(--font)'
                            }}
                          >
                            long
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, bias: 'SHORT' }))}
                            style={{
                              flex: 1,
                              background: form.bias === 'SHORT' ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.02)',
                              border: form.bias === 'SHORT' ? '1px solid rgba(255,69,58,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                              padding: '5px',
                              color: form.bias === 'SHORT' ? '#ff453a' : 'rgba(255,255,255,0.4)',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: 'var(--font)'
                            }}
                          >
                            short
                          </button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>outcome (w/l)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {OUTCOMES.map(o => {
                            const isSelected = form.outcome === o;
                            return (
                              <button
                                key={o}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, outcome: o }))}
                                style={{
                                  background: isSelected ? getWlGradient(o) : 'rgba(255,255,255,0.04)',
                                  border: isSelected ? getWlBorder(o) : '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 20,
                                  padding: '5px 12px',
                                  color: isSelected ? getWlColor(o) : '#fff',
                                  fontSize: 11,
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font)'
                                }}
                              >
                                {o.toLowerCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Setup Rating Pills */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>setup rating</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {RATINGS.map(r => {
                          const isSelected = form.setupRating.toUpperCase() === r.toUpperCase();
                          const ratingColor = getRatingColor(r);
                          const bgColor = isSelected ? ratingColor : 'rgba(255,255,255,0.04)';
                          const textColor = isSelected ? getPillTextColor(ratingColor) : 'rgba(255,255,255,0.7)';
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={(e) => {
                                handlePillClick(e, 'rating', r, () => {
                                  setForm(f => ({ ...f, setupRating: r }));
                                });
                              }}
                              onContextMenu={(e) => handlePillContextMenu(e, 'rating', r)}
                              style={{
                                flex: 1,
                                background: bgColor,
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12,
                                padding: '4px 0',
                                color: textColor,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'var(--font)',
                                transition: 'all 0.15s'
                              }}
                            >
                              {r.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Confluences pills */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>confluences</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {confluencesList.map(c => {
                          const isSelected = form.confluences?.includes(c) && !showCustomConfluenceInput;
                          const bgColor = isSelected ? '#0a84ff' : 'rgba(255,255,255,0.04)';
                          const textColor = isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)';
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={(e) => {
                                handlePillClick(e, 'confluence', c, () => {
                                  if (c === 'CUSTOM') {
                                    setShowCustomConfluenceInput(true);
                                  } else {
                                    if (form.confluences?.includes(c)) {
                                      setForm(f => ({ ...f, confluences: f.confluences.filter(item => item !== c) }));
                                    } else {
                                      setForm(f => ({ ...f, confluences: [...(f.confluences || []), c] }));
                                    }
                                    setShowCustomConfluenceInput(false);
                                  }
                                });
                              }}
                              onContextMenu={(e) => handlePillContextMenu(e, 'confluence', c)}
                              style={{
                                background: bgColor,
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12,
                                padding: '4px 9px',
                                color: textColor,
                                fontSize: 10,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: c === 'CUSTOM' ? 'pointer' : 'context-menu',
                                fontFamily: 'var(--font)',
                                transition: 'all 0.15s'
                              }}
                            >
                              {c === 'CUSTOM' ? '+ custom' : c.toLowerCase()}
                            </button>
                          );
                        })}
                      </div>
                      {showCustomConfluenceInput && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                          <input
                            type="text"
                            placeholder="ENTER CONFLUENCE"
                            value={customConfluence}
                            onChange={e => setCustomConfluence(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleAddCustomConfluence();
                              }
                            }}
                            style={{
                              flex: 1,
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              color: '#fff',
                              fontFamily: 'var(--font)',
                              fontSize: 12,
                              padding: '6px 8px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomConfluence}
                            style={{
                              background: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#000',
                              flexShrink: 0
                            }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Model */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>model</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: playbookTags.length > 0 ? 10 : 0 }}>
                        {playbookTags.map(tag => {
                          const isSelected = form.model === tag;
                          const modelData = JSON.parse(localStorage.getItem('hollowPlaybookModels') || '{}')[tag];
                          const tagColor = modelData?.color || '#30d158';
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, model: isSelected ? '' : tag }))}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 16,
                                background: isSelected ? '#fff' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                                color: isSelected ? '#000' : tagColor,
                                fontSize: 11,
                                fontWeight: 700,
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
                              setForm(f => ({ ...f, model: '' }));
                              document.getElementById('edit-custom-model-input')?.focus();
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 16,
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px dashed rgba(255,255,255,0.2)',
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            custom
                          </button>
                        )}
                      </div>
                      {(!playbookTags.length || !playbookTags.includes(form.model)) && (
                        <input
                          id="edit-custom-model-input"
                          type="text"
                          placeholder="e.g. FVG"
                          value={form.model}
                          onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#fff',
                            fontFamily: 'var(--font)',
                            fontSize: 12,
                            padding: '6px 8px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      )}
                    </div>

                    {/* PO3 Time & Entry TF */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>po3 time (hh:mm)</div>
                        <input
                          type="text"
                          placeholder="e.g. 09:30"
                          value={form.po3Time}
                          onChange={e => setForm(f => ({ ...f, po3Time: e.target.value }))}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#fff',
                            fontFamily: 'var(--font)',
                            fontSize: 12,
                            padding: '6px 8px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>entry time frame</div>
                        <input
                          type="text"
                          placeholder="e.g. 5 min"
                          value={form.entryTf}
                          onChange={e => setForm(f => ({ ...f, entryTf: e.target.value }))}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#fff',
                            fontFamily: 'var(--font)',
                            fontSize: 12,
                            padding: '6px 8px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* Session Option Selector */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>session</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {['Asia', 'London', 'NY AM', 'NY PM'].map(s => {
                          const isSelected = form.session === s;
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
                              onClick={() => setForm(f => ({ ...f, session: s }))}
                              style={{
                                background: bg,
                                border: border,
                                borderRadius: 20,
                                padding: '5px 12px',
                                color: isSelected ? color : 'rgba(255,255,255,0.5)',
                                fontSize: 11,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                fontFamily: 'var(--font)'
                              }}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* R-Multiple & Manual P&L Override */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>r-multiple</div>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          placeholder="e.g. 2.5"
                          value={form.rr}
                          onChange={e => setForm(f => ({ ...f, rr: parseFloat(e.target.value) || 0 }))}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#fff',
                            fontFamily: 'var(--font)',
                            fontSize: 12,
                            padding: '6px 8px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 2 }}>manual p&l ($)</div>
                        <input
                          type="number"
                          placeholder="optional override"
                          value={form.manualPnL}
                          onChange={e => setForm(f => ({ ...f, manualPnL: e.target.value }))}
                          style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: (form.wl || '').toLowerCase().includes('be') || (form.manualPnL !== '' && parseFloat(form.manualPnL) === 0) ? '#ff9f0a' : (form.manualPnL === '' ? '#fff' : (parseFloat(form.manualPnL) > 0 ? '#30d158' : '#ff453a')),
                            fontFamily: 'var(--font)',
                            fontSize: 12,
                            padding: '6px 8px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'reflections' && (
                  <motion.div
                    key="reflections"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}
                  >
                    {/* Notes */}
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>notes / reflections</div>
                      <textarea
                        rows={3}
                        placeholder="describe the execution, context, emotions..."
                        value={form.commentExecution}
                        onChange={e => setForm(f => ({ ...f, commentExecution: e.target.value }))}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          color: '#fff',
                          fontFamily: 'var(--font)',
                          fontSize: 12.5,
                          padding: '8px 10px',
                          outline: 'none',
                          lineHeight: 1.5,
                          resize: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Mistakes options */}
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 5 }}>behavioral mistakes / errors</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {MISTAKES_OPTIONS.map(opt => {
                          const isSelected = form.mistakes.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleMistake(opt)}
                              style={{
                                background: isSelected ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isSelected ? 'rgba(255,69,58,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 20,
                                padding: '4px 8px',
                                color: isSelected ? '#ff453a' : 'rgba(255,255,255,0.6)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font)'
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Custom mistake */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Add custom mistake..."
                          value={customMistake}
                          onChange={e => setCustomMistake(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            color: '#fff',
                            fontFamily: 'var(--font)',
                            fontSize: 12,
                            padding: '7px 9px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomMistake}
                          style={{
                            background: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '0 10px',
                            color: '#000',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Pre & Post Trade Sentiment */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 6 }}>pre-trade sentiment</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {SENTIMENT_EMOJIS.map((emoji, idx) => {
                            const val = idx + 1;
                            const isSelected = form.sentimentPre === val;
                            return (
                              <button
                                key={`pre-${idx}`}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, sentimentPre: val }))}
                                style={{
                                  background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                                  border: isSelected ? '1px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 8,
                                  width: 34,
                                  height: 34,
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 6 }}>post-trade sentiment</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {SENTIMENT_EMOJIS.map((emoji, idx) => {
                            const val = idx + 1;
                            const isSelected = form.sentimentPost === val;
                            return (
                              <button
                                key={`post-${idx}`}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, sentimentPost: val }))}
                                style={{
                                  background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                                  border: isSelected ? '1px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 8,
                                  width: 34,
                                  height: 34,
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'charts' && (
                  <motion.div
                    key="charts"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    {[
                      { label: 'lower time frame (ltf)', val: form.imageLTF, key: 'imageLTF' },
                      { label: 'medium time frame (mtf)', val: form.imageMTF, key: 'imageMTF' },
                      { label: 'higher time frame (htf)', val: form.imageHTF, key: 'imageHTF' }
                    ].map(imgField => (
                      <div key={imgField.label} style={{
                        border: '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: 10,
                        padding: '10px',
                        textAlign: 'center',
                        background: imgField.val ? 'rgba(255,255,255,0.02)' : 'transparent',
                        position: 'relative'
                      }}>
                        {imgField.val ? (
                          <div>
                            <img src={imgField.val} alt={imgField.label} style={{ width: '100%', maxHeight: 90, objectFit: 'contain', borderRadius: 5 }} />
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, [imgField.key]: null }))}
                              style={{
                                position: 'absolute',
                                top: 5,
                                right: 5,
                                background: 'rgba(255,69,58,0.85)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={9} color="#fff" />
                            </button>
                          </div>
                        ) : (
                          <label style={{ cursor: 'pointer', display: 'block' }}>
                            <Upload size={14} color="rgba(255,255,255,0.4)" style={{ margin: '0 auto 4px' }} />
                            <span style={{ fontSize: 11.5, color: '#fff', fontWeight: 600, display: 'block', textTransform: 'lowercase' }}>upload {imgField.label}</span>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, imgField.key)} style={{ display: 'none' }} />
                          </label>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Row */}
            <div style={{ display: 'flex', gap: 8, padding: '0 14px 8px 14px', flexShrink: 0 }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '10px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  background: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5
                }}
              >
                <Check size={13} strokeWidth={3} />
                save changes
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{trade.symbol}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: trade.bias === 'LONG' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                  color: trade.bias === 'LONG' ? '#30d158' : '#ff453a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {trade.bias}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  <Edit2 size={12} />
                  Edit
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} color="rgba(255,255,255,0.7)" />
                </button>
              </div>
            </div>

            {/* Hero Card / Details */}
            <div style={{
              margin: '0 16px',
              padding: '20px',
              borderRadius: 20,
              background: getWlCardBackground(trade.wl),
              border: getWlCardBorder(trade.wl),
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: (trade.wl || '').toLowerCase().includes('win')
                  ? 'rgba(48,209,88,0.07)'
                  : (trade.wl || '').toLowerCase().includes('loss')
                    ? 'rgba(255,69,58,0.07)'
                    : 'transparent',
                filter: 'blur(20px)'
              }} />

              <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', color: getWlColor(trade.wl), marginBottom: 8, lineHeight: 1, position: 'relative', zIndex: 1 }}>
                {fmt(pnlData.netPnL)}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                {[
                  { label: 'Account / Group', value: accountOrGroupName },
                  { label: 'Date', value: trade.date },
                  { label: 'Ticker', value: trade.symbol.toUpperCase() },
                  { label: 'Setup Rating', value: (trade.setupRating || '—').toUpperCase(), color: getRatingColor(trade.setupRating || '') },
                  { label: 'Session', value: trade.session || '—', color: getSessionColor(trade.session || '') }
                ].map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{row.label}</span>
                    <span style={{ color: row.color || '#fff', fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Read-Only Details Area */}
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Model</div>
                <div style={{ background: '#1c1c1e', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#fff', fontWeight: 500 }}>
                  {trade.model || '—'}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Sentiment</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Pre-Trade</div>
                    <div style={{ fontSize: 24 }}>{SENTIMENT_EMOJIS[(trade.sentimentPre || 3) - 1]}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Post-Trade</div>
                    <div style={{ fontSize: 24 }}>{SENTIMENT_EMOJIS[(trade.sentimentPost || 3) - 1]}</div>
                  </div>
                </div>
              </div>

              {trade.confluences?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Confluences</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {trade.confluences.map(c => (
                      <span key={c} style={{
                        background: 'rgba(10,132,255,0.12)',
                        border: '1px solid rgba(10,132,255,0.25)',
                        borderRadius: 20,
                        padding: '5px 12px',
                        color: '#0a84ff',
                        fontSize: 12,
                        fontWeight: 600
                      }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {trade.mistakes?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Mistakes</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {trade.mistakes.map(m => (
                      <span key={m} style={{
                        background: 'rgba(255,69,58,0.12)',
                        border: '1px solid rgba(255,69,58,0.25)',
                        borderRadius: 20,
                        padding: '5px 12px',
                        color: '#ff453a',
                        fontSize: 12,
                        fontWeight: 600
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}


              {trade.commentExecution && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reflection / Notes</div>
                  <div style={{ background: '#1c1c1e', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    {trade.commentExecution}
                  </div>
                </div>
              )}

              {/* Delete Area */}
              {confirmDelete ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={handleDelete}
                    style={{
                      flex: 1,
                      background: '#ff453a',
                      border: 'none',
                      borderRadius: 12,
                      padding: '13px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1,
                      background: '#1c1c1e',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '13px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,69,58,0.08)',
                    border: '1px solid rgba(255,69,58,0.2)',
                    borderRadius: 12,
                    padding: '13px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#ff453a',
                    cursor: 'pointer',
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Trash2 size={14} />
                  Delete Trade Record
                </button>
              )}
            </div>
          </>
        )}

        {/* Context Menu Overlay */}
        {contextMenu && (
          <>
            <div 
              onClick={() => setContextMenu(null)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1300,
                background: 'rgba(0,0,0,0.3)'
              }}
            />
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
                zIndex: 1301,
                width: '220px',
                background: 'rgba(15, 15, 17, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontFamily: 'var(--font)'
              }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                   edit pill: {contextMenu.label.toLowerCase()}
                 </div>
                 <button
                   type="button"
                   onClick={() => {
                     const newValue = renameInputRef.current?.value;
                     if (newValue && newValue.trim()) {
                       handleRenamePill(contextMenu.type, contextMenu.label, newValue);
                     }
                     setContextMenu(null);
                   }}
                   style={{
                     background: 'rgba(255,255,255,0.06)',
                     border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: '6px',
                     width: '22px',
                     height: '22px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     cursor: 'pointer',
                     color: '#fff',
                     outline: 'none'
                   }}
                 >
                   <Check size={11} strokeWidth={2.5} />
                 </button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>rename</span>
                 <input 
                   ref={renameInputRef}
                   type="text"
                   defaultValue={contextMenu.label}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       handleRenamePill(contextMenu.type, contextMenu.label, e.target.value);
                     }
                   }}
                   placeholder="new name..."
                   style={{
                     background: 'rgba(0, 0, 0, 0.25)',
                     border: '1px solid rgba(255, 255, 255, 0.08)',
                     borderRadius: '6px',
                     color: '#fff',
                     padding: '5px 8px',
                     fontSize: '11px',
                     outline: 'none',
                     width: '100%',
                     boxSizing: 'border-box'
                   }}
                   autoFocus
                 />
                 <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>press enter to save</span>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>color gradient</span>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                   {PRESET_GRADIENTS.map((grad, i) => (
                     <button
                       key={i}
                       type="button"
                       onClick={() => {
                         handleChangePillColor(contextMenu.label, grad);
                       }}
                       style={{
                         background: grad,
                         border: '1px solid rgba(255,255,255,0.2)',
                         borderRadius: '6px',
                         height: '20px',
                         cursor: 'pointer',
                         outline: 'none'
                       }}
                     />
                   ))}
                 </div>
               </div>

               <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2px 0' }} />

               {contextMenu.label !== 'CUSTOM' && (
                 <button
                   type="button"
                   onClick={() => {
                     handleDeletePill(contextMenu.type, contextMenu.label);
                     setContextMenu(null);
                   }}
                   style={{
                     background: 'rgba(234, 84, 85, 0.1)',
                     color: '#ff5b5c',
                     border: '1px solid rgba(234, 84, 85, 0.2)',
                     borderRadius: '6px',
                     padding: '6px',
                     fontSize: '11px',
                     fontWeight: '600',
                     cursor: 'pointer',
                     width: '100%',
                     fontFamily: 'var(--font)'
                   }}
                 >
                   delete pill
                 </button>
               )}
            </div>
          </>
        )}

      </motion.div>
    </motion.div>
  );
}

const SENTIMENT_EMOJIS = ['😭', '😟', '😐', '😊', '🔥', '🧘', '😤', '😴', '😰', '🤑'];
