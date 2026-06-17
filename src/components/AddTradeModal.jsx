import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { showToast } from '../utils/toast';
import { X, Plus, Upload, Trash2, Check } from 'lucide-react';
import { db } from '../db/hollowDb';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_SYMBOLS = ['nq', 'es', 'cl', 'gc'];
const BIASES = ['LONG', 'SHORT'];
const RATINGS = ['F', 'C', 'B', 'A', 'A+'];
const OUTCOMES = ['Win', 'BE -> Win', 'Loss', 'BE -> Loss', 'Tape'];

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

const SENTIMENT_EMOJIS = ['😭', '😟', '😐', '😊', '🔥', '🧘', '😤', '😴', '😰', '🤑'];

export default function AddTradeModal({ isOpen, onClose, selectedAccountId }) {
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const groups = useLiveQuery(() => db.groups.toArray()) || [];
  
  // Tab control: 'execution' | 'reflections' | 'charts'
  const [activeTab, setActiveTab] = useState('execution');
  
  // Form State Page 1: Execution Details
  const isGroupInit = selectedAccountId && selectedAccountId.startsWith('group-');
  const [targetType, setTargetType] = useState(isGroupInit ? 'group' : 'account');
  const [targetAccountId, setTargetAccountId] = useState(selectedAccountId || 'acc-funded-1');
  const [showAccDropdown, setShowAccDropdown] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Default Account Selection Sync
  useEffect(() => {
    if (targetType === 'group' && groups.length > 0) {
      const exists = groups.some(g => g.id === targetAccountId);
      if (!exists) {
        setTargetAccountId(groups[0].id);
      }
    } else if (targetType === 'account' && accounts.length > 0) {
      const exists = accounts.some(acc => acc.id === targetAccountId);
      if (!exists) {
        setTargetAccountId(accounts[0].id);
      }
    }
  }, [accounts, groups, targetAccountId, targetType]);

  const getAccountColor = (type = '') => {
    const t = type.toUpperCase();
    if (t === 'FUNDED' || t === 'LIVE') return '#30d158'; // Emerald Green
    if (t === 'EVALUATION') return '#0a84ff'; // Blue
    if (t === 'PERSONAL') return '#bf5af2'; // Purple
    if (t === 'GROUP') return '#ff9f0a'; // Orange
    return 'rgba(255, 255, 255, 0.7)';
  };
  
  // Dynamic Symbols & Customization
  const [symbols, setSymbols] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_symbols');
    return saved ? JSON.parse(saved) : ['NQ', 'ES', 'CL', 'GC', 'EURUSD', 'CUSTOM'];
  });
  const [pillGradients, setPillGradients] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_gradients');
    return saved ? JSON.parse(saved) : {};
  });
  const [contextMenu, setContextMenu] = useState(null);

  const [symbol, setSymbol] = useState('NQ');
  const [customSymbol, setCustomSymbol] = useState('');
  const [showCustomSymbolInput, setShowCustomSymbolInput] = useState(false);
  const [rating, setRating] = useState('A');
  const [confluences, setConfluences] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_confluences');
    return saved ? JSON.parse(saved) : ['VWAP HOLD', 'HTF LEVEL', 'LIQUIDITY SWEEP', 'FVG RETEST', 'MARKET SHIFT', 'CUSTOM'];
  });
  const [selectedConfluences, setSelectedConfluences] = useState([]);
  const [customConfluence, setCustomConfluence] = useState('');
  const [showCustomConfluenceInput, setShowCustomConfluenceInput] = useState(false);
  const [po3Time, setPo3Time] = useState('');
  const [entryTf, setEntryTf] = useState('');
  const [model, setModel] = useState('');
  const [playbookTags, setPlaybookTags] = useState([]);
  const [outcome, setOutcome] = useState('Win');
  const [bias, setBias] = useState('LONG');
  const [manualPnL, setManualPnL] = useState('');
  const [isBE, setIsBE] = useState(false);

  // Form State Page 2: Reflections & Mistakes
  const [reflections, setReflections] = useState('');
  const [selectedMistakes, setSelectedMistakes] = useState([]);
  const [customMistake, setCustomMistake] = useState('');

  const [sentimentPre, setSentimentPre] = useState(3);
  const [sentimentPost, setSentimentPost] = useState(3);

  // Form State Page 3: Snapshot uploads
  const [imageLTF, setImageLTF] = useState(null);
  const [imageMTF, setImageMTF] = useState(null);
  const [imageHTF, setImageHTF] = useState(null);
  
  const [saving, setSaving] = useState(false);

  // Double-tap/click detection state
  const lastTapRef = useRef({ time: 0, label: null, type: null });
  const renameInputRef = useRef(null);

  // Reset form states on modal open
  useEffect(() => {
    if (isOpen) {
      try {
        setPlaybookTags(JSON.parse(localStorage.getItem('playbookTags') || 'null') || []);
      } catch {
        setPlaybookTags([]);
      }
      setActiveTab('execution');
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      
      const defaultId = selectedAccountId === 'all' 
        ? (accounts[0]?.id || '') 
        : (selectedAccountId || '');
      setTargetAccountId(defaultId);
      const isGroupInit = defaultId && defaultId.startsWith('group-');
      setTargetType(isGroupInit ? 'group' : 'account');
      setShowAccDropdown(false);
      
      const savedSymbols = localStorage.getItem('hollow_pill_symbols');
      const loadedSymbols = savedSymbols ? JSON.parse(savedSymbols) : ['NQ', 'ES', 'CL', 'GC', 'EURUSD', 'CUSTOM'];
      setSymbols(loadedSymbols);
      setSymbol(loadedSymbols.includes('NQ') ? 'NQ' : (loadedSymbols[0] || 'CUSTOM'));

      const savedGrads = localStorage.getItem('hollow_pill_gradients');
      setPillGradients(savedGrads ? JSON.parse(savedGrads) : {});

      const savedConfluences = localStorage.getItem('hollow_pill_confluences');
      setConfluences(savedConfluences ? JSON.parse(savedConfluences) : ['VWAP HOLD', 'HTF LEVEL', 'LIQUIDITY SWEEP', 'FVG RETEST', 'MARKET SHIFT', 'CUSTOM']);
      
      setSelectedConfluences([]);
      setCustomConfluence('');
      setShowCustomConfluenceInput(false);
      setCustomSymbol('');
      setShowCustomSymbolInput(false);
      setPo3Time('');
      setEntryTf('');
      setModel('');
      setOutcome('Win');
      setBias('LONG');
      setManualPnL('');
      setIsBE(false);
      setReflections('');
      setSelectedMistakes([]);
      setCustomMistake('');
      setSentimentPre(3);
      setSentimentPost(3);
      setImageLTF(null);
      setImageMTF(null);
      setImageHTF(null);
      setContextMenu(null);
    }
  }, [isOpen]);

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
      if (symbol.toUpperCase() === oldLabel.toUpperCase()) setSymbol(cleanLabel);
    } else if (type === 'confluence') {
      const updated = confluences.map(c => c.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : c);
      setConfluences(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      if (selectedConfluences.includes(oldLabel)) {
        setSelectedConfluences(selectedConfluences.map(c => c.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : c));
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
      if (symbol.toUpperCase() === oldLabel.toUpperCase()) {
        setSymbol(updated.length > 0 ? updated[0] : 'CUSTOM');
      }
    } else if (type === 'confluence') {
      const updated = confluences.filter(c => c.toUpperCase() !== oldLabel.toUpperCase());
      setConfluences(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      setSelectedConfluences(selectedConfluences.filter(c => c.toUpperCase() !== oldLabel.toUpperCase()));
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
    if (confluences.map(c => c.toUpperCase()).includes(cleanConf)) {
      if (!selectedConfluences.includes(cleanConf)) {
        setSelectedConfluences([...selectedConfluences, cleanConf]);
      }
      setShowCustomConfluenceInput(false);
      setCustomConfluence('');
      return;
    }
    const customIndex = confluences.findIndex(c => c.toUpperCase() === 'CUSTOM');
    const updatedConfluences = [...confluences];
    if (customIndex !== -1) {
      updatedConfluences.splice(customIndex, 0, cleanConf);
    } else {
      updatedConfluences.push(cleanConf, 'CUSTOM');
    }
    setConfluences(updatedConfluences);
    localStorage.setItem('hollow_pill_confluences', JSON.stringify(updatedConfluences));
    setSelectedConfluences([...selectedConfluences, cleanConf]);
    setShowCustomConfluenceInput(false);
    setCustomConfluence('');
  };

  const handleAddCustomSymbolTicker = () => {
    if (!customSymbol || !customSymbol.trim()) return;
    const cleanSym = customSymbol.trim().toUpperCase();
    if (symbols.map(s => s.toUpperCase()).includes(cleanSym)) {
      setSymbol(cleanSym);
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
    setSymbol(cleanSym);
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

  const toggleMistake = (tag) => {
    if (selectedMistakes.includes(tag)) {
      setSelectedMistakes(selectedMistakes.filter(t => t !== tag));
    } else {
      setSelectedMistakes([...selectedMistakes, tag]);
    }
  };

  const handleAddCustomMistake = () => {
    if (customMistake.trim() && !selectedMistakes.includes(customMistake.trim())) {
      setSelectedMistakes([...selectedMistakes, customMistake.trim()]);
      setCustomMistake('');
    }
  };

  const handleImageUpload = (e, targetSetter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        targetSetter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const finalSymbol = showCustomSymbolInput ? (customSymbol.toUpperCase() || 'CUSTOM') : symbol.toUpperCase();
      
      // Calculate simulated execution prices for math correctness
      let entryPrice = 100;
      if (finalSymbol === 'NQ') entryPrice = 18500;
      else if (finalSymbol === 'ES') entryPrice = 5300;
      else if (finalSymbol === 'GC') entryPrice = 2300;
      else if (finalSymbol === 'CL') entryPrice = 80;
      else if (finalSymbol === 'EURUSD') entryPrice = 1.08;

      let pnlVal = isBE ? 0 : parseFloat(manualPnL);
      if (isNaN(pnlVal) && !isBE) {
        // Calculate based on outcome
        const baseRisk = 300;
        const lowOutcome = outcome.toLowerCase();
        if (lowOutcome.includes('win')) {
          pnlVal = baseRisk * 2; // Default 2R since rr is removed
        } else if (lowOutcome.includes('loss')) {
          pnlVal = -baseRisk;
        } else {
          pnlVal = 0;
        }
      }


      // Determine target account IDs
      let targetAccountIds = [];
      if (targetType === 'group') {
        const selectedGroup = groups.find(g => g.id === targetAccountId);
        if (selectedGroup) {
          targetAccountIds = [
            selectedGroup.leaderAccountId,
            ...(selectedGroup.followerAccountIds || [])
          ].filter(Boolean);
        }
      } else {
        targetAccountIds = [targetAccountId];
      }

      if (targetAccountIds.length === 0) {
        showToast('No valid accounts found for this target.', 'error');
        setSaving(false);
        return;
      }

      await db.transaction('rw', db.trades, db.executions, async () => {
        for (let i = 0; i < targetAccountIds.length; i++) {
          const accId = targetAccountIds[i];
          const finalTradeId = `trade-${Date.now()}-${accId}-${i}`;

          const tradeObj = {
            id: finalTradeId,
            accountId: accId,
            date,
            symbol: finalSymbol,
            model: model || 'Unmapped',
            bias,
            status: 'CLOSED',
            confluences: selectedConfluences,
            setupRating: rating.toUpperCase(),
            wl: isBE ? 'BE' : outcome,
            rr: 0,
            tp: null,
            sl: null,
            po3: po3Time || '',
            entryTf: entryTf || '',
            dol: '',
            mistakes: selectedMistakes,
            commentBias: name || `${finalSymbol} Breakout Setup`,
            commentExecution: reflections || '',
            commentProblems: selectedMistakes.join(', ') || '',
            commentFazit: `Logged via PC.`,
            sentimentPre,
            sentimentPost,
            images: [imageLTF, imageMTF, imageHTF].filter(Boolean),
            imageAnnotations: {}
          };

          // Executions
          const mockExecTime = new Date(`${date}T09:30:00`).toISOString();
          const entryExec = {
            id: `exec-entry-${Date.now()}-${accId}-${i}`,
            tradeId: finalTradeId,
            timestamp: mockExecTime,
            side: bias === 'LONG' ? 'BUY' : 'SELL',
            price: entryPrice,
            contracts: 1,
            commissions: 2.40,
            type: 'ENTRY'
          };

          const mult = finalSymbol === 'NQ' ? 20 : finalSymbol === 'ES' ? 50 : finalSymbol === 'GC' ? 100 : finalSymbol === 'CL' ? 1000 : finalSymbol === 'EURUSD' ? 100000 : 100;
          const biasFactor = bias === 'LONG' ? 1 : -1;
          const exitPrice = entryPrice + ((pnlVal + 4.80) / (1 * mult * biasFactor));

          const exitExec = {
            id: `exec-exit-${Date.now() + 1}-${accId}-${i}`,
            tradeId: finalTradeId,
            timestamp: new Date(`${date}T10:15:00`).toISOString(),
            side: bias === 'LONG' ? 'SELL' : 'BUY',
            price: exitPrice,
            contracts: 1,
            commissions: 2.40,
            type: 'EXIT'
          };

          await db.trades.add(tradeObj);
          await db.executions.add(entryExec);
          await db.executions.add(exitExec);
        }
      });

      showToast('Trade execution saved successfully.', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Failed to save execution.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Selected Account/Group details for dropdown header
  let selectedName = 'select account';
  let selectedAccountType = '';
  let activeColor = 'rgba(255, 255, 255, 0.7)';

  if (targetType === 'group') {
    const currentGroup = groups.find(g => g.id === targetAccountId);
    if (currentGroup) {
      selectedName = currentGroup.name;
      selectedAccountType = 'group';
      activeColor = getAccountColor('group');
    }
  } else {
    const currentAcc = accounts.find(acc => acc.id === targetAccountId);
    if (currentAcc) {
      selectedName = currentAcc.name;
      selectedAccountType = currentAcc.type;
      activeColor = getAccountColor(currentAcc.type);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowX: 'hidden',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'rgba(20, 20, 24, 0.85)',
          backdropFilter: 'blur(30px) saturate(210%)',
          WebkitBackdropFilter: 'blur(30px) saturate(210%)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          fontFamily: 'var(--font-body)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 0 28px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 850, color: '#fff', letterSpacing: '-0.02em', textTransform: 'lowercase' }}>add new execution.</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'lowercase' }}>log details for analytics</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 28px 0 28px', gap: '24px', flexShrink: 0 }}>
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
                fontSize: 13,
                fontWeight: 700,
                paddingBottom: 10,
                position: 'relative',
                cursor: 'pointer',
                fontFamily: 'var(--font)'
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeAddTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#fff' }} />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px', WebkitOverflowScrolling: 'touch' }}>
          <AnimatePresence mode="wait">
            
            {/* TAB 1: EXECUTION DETAILS */}
            {activeTab === 'execution' && (
              <motion.div
                key="execution"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {/* SECTION 1: LEDGER & TIMING */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 20 }}>
                  <div style={styles.sectionTitle}>ledger & timing</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 12 }}>
                    {/* Account Selection */}
                    <div style={{ position: 'relative' }}>
                      <label style={styles.label}>account</label>
                      
                      {showAccDropdown && (
                        <div
                          onClick={() => setShowAccDropdown(false)}
                          style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 999,
                            background: 'transparent'
                          }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setShowAccDropdown(!showAccDropdown)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          color: activeColor,
                          fontWeight: '600',
                          fontSize: 13,
                          outline: 'none',
                          boxSizing: 'border-box',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeColor }} />
                          <span style={{ textTransform: 'lowercase' }}>{selectedName}</span>
                          <span style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginLeft: 4 }}>
                            {selectedAccountType.toLowerCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', transform: showAccDropdown ? 'rotate(180deg)' : 'rotate(0)' , transition: 'transform 0.2s' }}>▼</span>
                      </button>

                      <AnimatePresence>
                        {showAccDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: 4,
                              background: '#141416',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 10,
                              zIndex: 1000,
                              maxHeight: 200,
                              overflowY: 'auto',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              padding: 4
                            }}
                          >
                            {/* Accounts Group */}
                            {accounts.length > 0 && (
                              <div>
                                <div style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '6px 8px 4px' }}>
                                  accounts
                                </div>
                                {accounts.map(acc => {
                                  const isCurrent = targetType === 'account' && targetAccountId === acc.id;
                                  const accColor = getAccountColor(acc.type);
                                  return (
                                    <button
                                      key={acc.id}
                                      type="button"
                                      onClick={() => {
                                        setTargetType('account');
                                        setTargetAccountId(acc.id);
                                        setShowAccDropdown(false);
                                      }}
                                      style={{
                                        width: '100%',
                                        background: isCurrent ? 'rgba(255,255,255,0.04)' : 'transparent',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '8px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        outline: 'none',
                                        transition: 'background 0.15s'
                                      }}
                                    >
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: accColor }} />
                                      <span style={{ fontSize: 13, color: accColor, fontWeight: isCurrent ? '700' : '500', textTransform: 'lowercase', flex: 1 }}>
                                        {acc.name}
                                      </span>
                                      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>
                                        {acc.type.toLowerCase()}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Copy Groups Group */}
                            {groups.length > 0 && (
                              <div style={{ marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 4 }}>
                                <div style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '6px 8px 4px' }}>
                                  copy groups
                                </div>
                                {groups.map(g => {
                                  const isCurrent = targetType === 'group' && targetAccountId === g.id;
                                  const grpColor = getAccountColor('group');
                                  return (
                                    <button
                                      key={g.id}
                                      type="button"
                                      onClick={() => {
                                        setTargetType('group');
                                        setTargetAccountId(g.id);
                                        setShowAccDropdown(false);
                                      }}
                                      style={{
                                        width: '100%',
                                        background: isCurrent ? 'rgba(255,255,255,0.04)' : 'transparent',
                                        border: 'none',
                                        borderRadius: 6,
                                        padding: '8px 10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        outline: 'none',
                                        transition: 'background 0.15s'
                                      }}
                                    >
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: grpColor }} />
                                      <span style={{ fontSize: 13, color: grpColor, fontWeight: isCurrent ? '700' : '500', textTransform: 'lowercase', flex: 1 }}>
                                        {g.name}
                                      </span>
                                      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>
                                        copy group
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <label style={styles.label}>date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: TRADE SETUP */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 20 }}>
                  <div style={styles.sectionTitle}>trade setup</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Trade Name */}
                    <div>
                      <label style={styles.label}>trade name</label>
                      <input
                        type="text"
                        placeholder="e.g. range bounce"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    {/* Symbol */}
                    <div>
                      <label style={styles.label}>symbol</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {symbols.map(s => {
                          const isSelected = symbol.toUpperCase() === s.toUpperCase() && !showCustomSymbolInput;
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
                                    setSymbol(s);
                                    setShowCustomSymbolInput(false);
                                  }
                                });
                              }}
                              onContextMenu={(e) => handlePillContextMenu(e, 'symbol', s)}
                              style={{
                                background: bgColor,
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12,
                                padding: '6px 12px',
                                color: textColor,
                                fontSize: 11.5,
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
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                          <input
                            type="text"
                            placeholder="ENTER TICKER (e.g. MMNQ)"
                            value={customSymbol}
                            onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleAddCustomSymbolTicker();
                              }
                            }}
                            style={{ ...styles.input, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSymbolTicker}
                            style={{
                              background: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              width: 34,
                              height: 34,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#000',
                              flexShrink: 0
                            }}
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Direction & Outcome */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={styles.label}>direction</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setBias('LONG')}
                            style={{
                              flex: 1,
                              background: bias === 'LONG' ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.02)',
                              border: bias === 'LONG' ? '1px solid rgba(48,209,88,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                              padding: '8px',
                              color: bias === 'LONG' ? '#30d158' : 'rgba(255,255,255,0.4)',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: 'var(--font)'
                            }}
                          >
                            long
                          </button>
                          <button
                            type="button"
                            onClick={() => setBias('SHORT')}
                            style={{
                              flex: 1,
                              background: bias === 'SHORT' ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.02)',
                              border: bias === 'SHORT' ? '1px solid rgba(255,69,58,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                              padding: '8px',
                              color: bias === 'SHORT' ? '#ff453a' : 'rgba(255,255,255,0.4)',
                              fontSize: 12.5,
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
                        <label style={styles.label}>outcome (w/l)</label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={outcome}
                            onChange={e => setOutcome(e.target.value)}
                            style={{
                              ...styles.input,
                              appearance: 'none',
                              paddingRight: '30px'
                            }}
                          >
                            {OUTCOMES.map(o => (
                              <option key={o} value={o} style={{ background: '#1c1c1e' }}>{o.toLowerCase()}</option>
                            ))}
                          </select>
                          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>▼</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: STRATEGY & METRICS */}
                <div>
                  <div style={styles.sectionTitle}>strategy & metrics</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 12 }}>
                    {/* Setup Rating */}
                    <div>
                      <label style={styles.label}>setup rating</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {RATINGS.map(r => {
                          const isSelected = rating.toUpperCase() === r.toUpperCase();
                          const ratingColor = getRatingColor(r);
                          const bgColor = isSelected ? ratingColor : 'rgba(255,255,255,0.04)';
                          const textColor = isSelected ? getPillTextColor(ratingColor) : 'rgba(255,255,255,0.7)';
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={(e) => {
                                handlePillClick(e, 'rating', r, () => {
                                  setRating(r);
                                });
                              }}
                              onContextMenu={(e) => handlePillContextMenu(e, 'rating', r)}
                              style={{
                                flex: 1,
                                background: bgColor,
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 12,
                                padding: '8px 0',
                                color: textColor,
                                fontSize: 12,
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

                    {/* Confluences */}
                    <div>
                      <label style={styles.label}>confluences</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {confluences.map(c => {
                          const isSelected = selectedConfluences.includes(c) && !showCustomConfluenceInput;
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
                                    if (selectedConfluences.includes(c)) {
                                      setSelectedConfluences(selectedConfluences.filter(item => item !== c));
                                    } else {
                                      setSelectedConfluences([...selectedConfluences, c]);
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
                                padding: '6px 12px',
                                color: textColor,
                                fontSize: 11.5,
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
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
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
                            style={{ ...styles.input, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomConfluence}
                            style={{
                              background: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              width: 34,
                              height: 34,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#000',
                              flexShrink: 0
                            }}
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Model — playbook pill selector */}
                    <div>
                      <label style={styles.label}>model</label>
                      {playbookTags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: model && !playbookTags.includes(model) ? '8px' : 0 }}>
                          {playbookTags.map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setModel(model === tag ? '' : tag)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                border: model === tag ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.12)',
                                background: model === tag ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                                color: model === tag ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: '11px',
                                fontWeight: model === tag ? 700 : 500,
                                cursor: 'pointer',
                                letterSpacing: '-0.01em',
                                transition: 'all 0.15s ease',
                                fontFamily: 'var(--font-body)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setModel(playbookTags.includes(model) ? '' : model)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              border: !playbookTags.includes(model) && model ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                              background: !playbookTags.includes(model) && model ? 'rgba(255,255,255,0.08)' : 'transparent',
                              color: 'rgba(255,255,255,0.35)',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'text',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            custom
                          </button>
                        </div>
                      ) : null}
                      {(!playbookTags.includes(model) || playbookTags.length === 0) && (
                        <input
                          type="text"
                          placeholder={playbookTags.length > 0 ? 'or type a custom model…' : 'e.g. fvg retest'}
                          value={playbookTags.includes(model) ? '' : model}
                          onChange={e => setModel(e.target.value)}
                          style={{ ...styles.input, marginTop: playbookTags.length > 0 ? '6px' : 0 }}
                        />
                      )}
                    </div>

                    {/* PO3 Time & Entry TF */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={styles.label}>po3 time</label>
                        <input
                          type="text"
                          placeholder="e.g. 12:30"
                          value={po3Time}
                          onChange={e => setPo3Time(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>entry time frame</label>
                        <input
                          type="text"
                          placeholder="e.g. 5 min"
                          value={entryTf}
                          onChange={e => setEntryTf(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                    </div>

                    {/* PNL & BE */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div>
                        <label style={styles.label}>PNL</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="number"
                            placeholder="optional override"
                            value={manualPnL}
                            onChange={e => {
                              setManualPnL(e.target.value);
                              if (e.target.value !== '' && parseFloat(e.target.value) !== 0) setIsBE(false);
                              if (parseFloat(e.target.value) === 0) setIsBE(true);
                            }}
                            style={{ 
                              ...styles.input, 
                              flex: 1, 
                              color: isBE ? '#ff9f0a' : (manualPnL === '' ? '#fff' : (parseFloat(manualPnL) > 0 ? '#30d158' : (parseFloat(manualPnL) < 0 ? '#ff453a' : '#ff9f0a')))
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsBE(!isBE);
                              if (!isBE) setManualPnL('0');
                              else setManualPnL('');
                            }}
                            style={{
                              padding: '0 16px',
                              borderRadius: '8px',
                              border: isBE ? '1px solid rgba(255,159,10,0.4)' : '1px solid rgba(255,255,255,0.08)',
                              background: isBE ? 'rgba(255,159,10,0.1)' : 'rgba(255,255,255,0.04)',
                              color: isBE ? '#ff9f0a' : '#fff',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            BE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}


            {/* TAB 2: REFLECTIONS & MISTAKES */}
            {activeTab === 'reflections' && (
              <motion.div
                key="reflections"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {/* Notes Textarea */}
                <div>
                  <label style={styles.label}>notes / reflections</label>
                  <textarea
                    rows={4}
                    placeholder="describe the execution, context, emotions..."
                    value={reflections}
                    onChange={e => setReflections(e.target.value)}
                    style={styles.textarea}
                  />
                </div>

                {/* Mistakes options */}
                <div>
                  <label style={styles.label}>behavioral mistakes / errors</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {MISTAKES_OPTIONS.map(opt => {
                      const isSelected = selectedMistakes.includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => toggleMistake(opt)}
                          style={{
                            background: isSelected ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isSelected ? 'rgba(255,69,58,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 20,
                            padding: '6px 12px',
                            color: isSelected ? '#ff453a' : 'rgba(255,255,255,0.6)',
                            fontSize: 12,
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
                  
                  {/* Custom mistake adding */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      placeholder="Add custom mistake..."
                      value={customMistake}
                      onChange={e => setCustomMistake(e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <button
                      onClick={handleAddCustomMistake}
                      style={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '0 16px',
                        color: '#000',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Pre & Post Trade Sentiment */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={styles.label}>pre-trade sentiment</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {SENTIMENT_EMOJIS.map((emoji, idx) => {
                        const val = idx + 1;
                        const isSelected = sentimentPre === val;
                        return (
                          <button
                            key={`pre-${idx}`}
                            type="button"
                            onClick={() => setSentimentPre(val)}
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                              border: isSelected ? '1px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                              width: 42,
                              height: 42,
                              fontSize: 22,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={styles.label}>post-trade sentiment</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {SENTIMENT_EMOJIS.map((emoji, idx) => {
                        const val = idx + 1;
                        const isSelected = sentimentPost === val;
                        return (
                          <button
                            key={`post-${idx}`}
                            type="button"
                            onClick={() => setSentimentPost(val)}
                            style={{
                              background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                              border: isSelected ? '1px solid #fff' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                              width: 42,
                              height: 42,
                              fontSize: 22,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
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

            {/* TAB 3: CHARTS UPLOADS */}
            {activeTab === 'charts' && (
              <motion.div
                key="charts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}
              >
                {[
                  { label: 'lower time frame (ltf)', val: imageLTF, setter: setImageLTF },
                  { label: 'medium time frame (mtf)', val: imageMTF, setter: setImageMTF },
                  { label: 'higher time frame (htf)', val: imageHTF, setter: setImageHTF }
                ].map(imgField => (
                  <div key={imgField.label} style={{
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: '16px',
                    textAlign: 'center',
                    background: imgField.val ? 'rgba(255,255,255,0.02)' : 'transparent',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '160px'
                  }}>
                    {imgField.val ? (
                      <div>
                        <img src={imgField.val} alt={imgField.label} style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8 }} />
                        <button
                          onClick={() => imgField.setter(null)}
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(255,69,58,0.85)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={11} color="#fff" />
                        </button>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <Upload size={20} color="rgba(255,255,255,0.4)" style={{ margin: '0 auto 8px' }} />
                        <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, display: 'block', textTransform: 'lowercase' }}>upload {imgField.label}</span>
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, imgField.setter)} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Action Bottom Row */}
        <div style={{ padding: '16px 28px 24px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              fontFamily: 'var(--font)'
            }}
          >
            cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              background: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 700,
              color: '#000',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'opacity 0.15s',
              fontFamily: 'var(--font)'
            }}
          >
            <Plus size={14} strokeWidth={3} />
            {saving ? 'saving...' : 'save trade'}
          </button>
        </div>

        {/* Pill Context Menu Overlay */}
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
                      setContextMenu(null);
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
    </motion.div>,
    document.body
  );
}

const styles = {
  label: {
    fontSize: 9.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'lowercase',
    letterSpacing: '0.04em',
    marginBottom: 5,
    display: 'block'
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#fff',
    fontFamily: 'var(--font)',
    fontSize: 13,
    padding: '10px 14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  textarea: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    color: '#fff',
    fontFamily: 'var(--font)',
    fontSize: 13,
    padding: '10px 14px',
    outline: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.5,
    resize: 'none'
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: 12
  }
};
