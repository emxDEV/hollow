import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Upload, Trash2, Check } from 'lucide-react';
import { db } from '../../db/hollowDb';
import { useLiveQuery } from 'dexie-react-hooks';

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

export default function AddTradeSheet({ onClose, selectedAccountId, addToast }) {
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

  // Reset form states on mount / open
  React.useEffect(() => {
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
    setTargetType(defaultId && defaultId.startsWith('group-') ? 'group' : 'account');
  }, [selectedAccountId, accounts]);

  // Default Account Selection Sync
  React.useEffect(() => {
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
  const [session, setSession] = useState('NY AM');
  const [model, setModel] = useState('');
  const [playbookTags, setPlaybookTags] = useState([]);
  const [dol, setDol] = useState('');
  const [outcome, setOutcome] = useState('Win');
  const [bias, setBias] = useState('LONG');
  const [manualPnL, setManualPnL] = useState('');

  // Form State Page 2: Reflections & Mistakes
  const [reflections, setReflections] = useState('');
  const [mistakesList, setMistakesList] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_mistakes');
    return saved ? JSON.parse(saved) : ['FOMO', 'Early Exit', 'Late Entry', 'Overtrading', 'Averaging Down', 'Holding Losers', 'Sizing Up'];
  });
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
  const lastTapRef = React.useRef({ time: 0, label: null, type: null });
  const renameInputRef = React.useRef(null);

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
      if (symbol.toUpperCase() === oldLabel.toUpperCase()) setSymbol(cleanLabel);
    } else if (type === 'confluence') {
      const updated = confluences.map(c => c.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : c);
      setConfluences(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      if (selectedConfluences.includes(oldLabel)) {
        setSelectedConfluences(selectedConfluences.map(c => c.toUpperCase() === oldLabel.toUpperCase() ? cleanLabel : c));
      }
    } else if (type === 'mistake') {
      const cleanLabelCase = newLabel.trim();
      const updated = mistakesList.map(m => m.toLowerCase() === oldLabel.toLowerCase() ? cleanLabelCase : m);
      setMistakesList(updated);
      localStorage.setItem('hollow_pill_mistakes', JSON.stringify(updated));
      if (selectedMistakes.includes(oldLabel)) {
        setSelectedMistakes(selectedMistakes.map(m => m.toLowerCase() === oldLabel.toLowerCase() ? cleanLabelCase : m));
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
    } else if (type === 'mistake') {
      const updated = mistakesList.filter(m => m.toLowerCase() !== oldLabel.toLowerCase());
      setMistakesList(updated);
      localStorage.setItem('hollow_pill_mistakes', JSON.stringify(updated));
      setSelectedMistakes(selectedMistakes.filter(m => m.toLowerCase() !== oldLabel.toLowerCase()));
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
      case 'BE -> Win': return '#30d158';
      case 'Loss':
      case 'BE -> Loss': return '#ff453a';
      case 'Tape': return '#999999';
      case 'BE': return '#ff9f0a';
      default: return '#ffffff';
    }
  };

  const toggleMistake = (tag) => {
    if (selectedMistakes.includes(tag)) {
      setSelectedMistakes(selectedMistakes.filter(t => t !== tag));
    } else {
      setSelectedMistakes([...selectedMistakes, tag]);
    }
  };

  const handleAddCustomMistake = () => {
    if (!customMistake || !customMistake.trim()) return;
    const cleanMistake = customMistake.trim();
    if (!mistakesList.map(m => m.toLowerCase()).includes(cleanMistake.toLowerCase())) {
      const updated = [...mistakesList, cleanMistake];
      setMistakesList(updated);
      localStorage.setItem('hollow_pill_mistakes', JSON.stringify(updated));
    }
    if (!selectedMistakes.includes(cleanMistake)) {
      setSelectedMistakes([...selectedMistakes, cleanMistake]);
    }
    setCustomMistake('');
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
      const tradeId = `trade-${Date.now()}`;
      const finalSymbol = showCustomSymbolInput ? (customSymbol.toUpperCase() || 'CUSTOM') : symbol.toUpperCase();
      
      // Calculate simulated execution prices for math correctness
      let entryPrice = 100;
      if (finalSymbol === 'NQ') entryPrice = 18500;
      else if (finalSymbol === 'ES') entryPrice = 5300;
      else if (finalSymbol === 'GC') entryPrice = 2300;
      else if (finalSymbol === 'CL') entryPrice = 80;

      let pnlVal = parseFloat(manualPnL);
      const isBEOutcome = outcome.toLowerCase().includes('be') || outcome.toLowerCase() === 'tape';
      if (isNaN(pnlVal)) {
        if (isBEOutcome) {
          pnlVal = 0;
        } else {
          // Calculate based on outcome
          const baseRisk = 300;
          const lowOutcome = outcome.toLowerCase();
          if (lowOutcome.includes('win')) {
            pnlVal = baseRisk * 2;
          } else if (lowOutcome.includes('loss')) {
            pnlVal = -baseRisk;
          } else {
            pnlVal = 0;
          }
        }
      }

      const savedManualPnL = manualPnL;


      // Determine target accounts and their multipliers
      let targets = [];
      if (targetType === 'group') {
        const selectedGroup = groups.find(g => g.id === targetAccountId);
        if (selectedGroup) {
          if (selectedGroup.leaderAccountId) {
            targets.push({ id: selectedGroup.leaderAccountId, multiplier: 1 });
          }
          if (selectedGroup.followerAccountIds) {
            selectedGroup.followerAccountIds.forEach(fStr => {
              if (fStr) {
                const parts = fStr.split(':');
                const accId = parts[0];
                const mult = parts[1] ? parseFloat(parts[1]) : 1;
                targets.push({ id: accId, multiplier: isNaN(mult) ? 1 : mult });
              }
            });
          }
        }
      } else {
        targets = [{ id: targetAccountId, multiplier: 1 }];
      }

      if (targets.length === 0) {
        addToast('No valid accounts found for this target.', 'error');
        setSaving(false);
        return;
      }

      await db.transaction('rw', db.trades, db.executions, async () => {
        for (let i = 0; i < targets.length; i++) {
          const { id: accId, multiplier } = targets[i];
          const finalTradeId = `trade-${Date.now()}-${accId}-${i}`;

          const followerPnL = pnlVal * multiplier;
          const followerContracts = 1 * multiplier;
          const followerCommissions = 2.40 * multiplier;
          const exitPrice = entryPrice + ((followerPnL + (followerCommissions * 2)) / (followerContracts * mult * biasFactor));

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
            wl: outcome.toLowerCase(),
            rr: 0,
            manualPnL: savedManualPnL && !isNaN(parseFloat(savedManualPnL)) 
              ? (parseFloat(savedManualPnL) * multiplier).toString() 
              : savedManualPnL,
            session: session || 'NY AM',
            tp: null,
            sl: null,
            po3: po3Time || '',
            entryTf: entryTf || '',
            dol: '',
            mistakes: selectedMistakes,
            commentBias: name || `${finalSymbol} Breakout Setup`,
            commentExecution: reflections || '',
            commentProblems: selectedMistakes.join(', ') || '',
            commentFazit: `Logged via mobile.`,
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
            contracts: followerContracts,
            commissions: followerCommissions,
            type: 'ENTRY'
          };

          const exitExec = {
            id: `exec-exit-${Date.now() + 1}-${accId}-${i}`,
            tradeId: finalTradeId,
            timestamp: new Date(`${date}T10:15:00`).toISOString(),
            side: bias === 'LONG' ? 'SELL' : 'BUY',
            price: exitPrice,
            contracts: followerContracts,
            commissions: followerCommissions,
            type: 'EXIT'
          };

          await db.trades.add(tradeObj);
          await db.executions.add(entryExec);
          await db.executions.add(exitExec);
        }
      });

      addToast('Trade execution saved.', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      addToast('Failed to save execution.', 'error');
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

  return (
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
        alignItems: 'flex-end',
        overflowX: 'hidden'
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
          background: 'rgba(20, 20, 24, 0.85)',
          backdropFilter: 'blur(30px) saturate(210%)',
          WebkitBackdropFilter: 'blur(30px) saturate(210%)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          paddingBottom: 'calc(var(--safe-bottom) + 12px)',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
          overflowX: 'hidden'
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 850, color: '#fff', letterSpacing: '-0.02em', textTransform: 'lowercase' }}>add new execution.</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1, textTransform: 'lowercase' }}>log details for analytics</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
                <motion.div layoutId="activeAddTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#fff' }} />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 14px', WebkitOverflowScrolling: 'touch' }}>
          <AnimatePresence mode="wait">
            
            {/* TAB 1: EXECUTION DETAILS */}
            {activeTab === 'execution' && (
              <motion.div
                key="execution"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {/* SECTION 1: LEDGER & TIMING */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>ledger & timing</div>
                  
                  {/* Account Selection */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>account</div>
                    
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
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: activeColor,
                        fontWeight: '600',
                        fontSize: 12.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeColor }} />
                        <span style={{ textTransform: 'lowercase' }}>{selectedName}</span>
                        <span style={{ fontSize: 9.5, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginLeft: 4 }}>
                          {selectedAccountType.toLowerCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', transform: showAccDropdown ? 'rotate(180deg)' : 'rotate(0)' , transition: 'transform 0.2s' }}>▼</span>
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
                              <div style={{ fontSize: 8.5, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '6px 8px 4px' }}>
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
                                    <span style={{ fontSize: 12.5, color: accColor, fontWeight: isCurrent ? '700' : '500', textTransform: 'lowercase', flex: 1 }}>
                                      {acc.name}
                                    </span>
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>
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
                              <div style={{ fontSize: 8.5, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '6px 8px 4px' }}>
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
                                    <span style={{ fontSize: 12.5, color: grpColor, fontWeight: isCurrent ? '700' : '500', textTransform: 'lowercase', flex: 1 }}>
                                      {g.name}
                                    </span>
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase' }}>
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
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>date</div>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        color: '#fff',
                        fontFamily: 'var(--font)',
                        fontSize: 12,
                        padding: '8px 10px',
                        outline: 'none',
                        colorScheme: 'dark',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* SECTION 2: TRADE SETUP */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>trade setup</div>
                  
                  {/* Trade Name */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>trade name</div>
                    <input
                      type="text"
                      placeholder="e.g. range bounce"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        color: '#fff',
                        fontFamily: 'var(--font)',
                        fontSize: 12,
                        padding: '8px 10px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Symbol */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>symbol</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
                          placeholder="ENTER TICKER (e.g. MMNQ)"
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
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>direction</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => setBias('LONG')}
                          style={{
                            flex: 1,
                            background: bias === 'LONG' ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.02)',
                            border: bias === 'LONG' ? '1px solid rgba(48,209,88,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8,
                            padding: '6px',
                            color: bias === 'LONG' ? '#30d158' : 'rgba(255,255,255,0.4)',
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
                          onClick={() => setBias('SHORT')}
                          style={{
                            flex: 1,
                            background: bias === 'SHORT' ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.02)',
                            border: bias === 'SHORT' ? '1px solid rgba(255,69,58,0.4)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8,
                            padding: '6px',
                            color: bias === 'SHORT' ? '#ff453a' : 'rgba(255,255,255,0.4)',
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
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>outcome (w/l)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {OUTCOMES.map(o => {
                          const isSelected = outcome === o;
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setOutcome(o)}
                              style={{
                                background: isSelected ? getWlGradient(o) : 'rgba(255,255,255,0.04)',
                                border: isSelected ? getWlBorder(o) : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 20,
                                padding: '6px 14px',
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
                </div>

                {/* SECTION 3: STRATEGY & METRICS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>strategy & metrics</div>
                  
                  {/* Setup Rating */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>setup rating</div>
                    <div style={{ display: 'flex', gap: 6 }}>
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
                              padding: '5px 0',
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

                  {/* Confluences */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 4 }}>confluences</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
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

                  {/* Model — playbook pill selector */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 6 }}>model</div>
                    {playbookTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: (!playbookTags.includes(model) && model) ? 6 : 0 }}>
                        {playbookTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setModel(model === tag ? '' : tag)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 20,
                              border: model === tag ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.1)',
                              background: model === tag ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                              color: model === tag ? '#fff' : 'rgba(255,255,255,0.45)',
                              fontSize: 11,
                              fontWeight: model === tag ? 700 : 500,
                              cursor: 'pointer',
                              letterSpacing: '-0.01em',
                              transition: 'all 0.15s ease',
                              fontFamily: 'var(--font)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                        <button
                          type="button"
                          style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            border: '1px solid rgba(255,255,255,0.07)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.28)',
                            fontSize: 11,
                            cursor: 'text',
                            fontFamily: 'var(--font)',
                          }}
                        >custom</button>
                      </div>
                    )}
                    {(!playbookTags.includes(model) || playbookTags.length === 0) && (
                      <input
                        type="text"
                        placeholder={playbookTags.length > 0 ? 'or type a custom model…' : 'e.g. fvg retest'}
                        value={playbookTags.includes(model) ? '' : model}
                        onChange={e => setModel(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          color: '#fff',
                          fontFamily: 'var(--font)',
                          fontSize: 12,
                          padding: '8px 10px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    )}
                  </div>

                  {/* PO3 Time & Entry TF */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>po3 time</div>
                      <input
                        type="text"
                        placeholder="e.g. 12:30"
                        value={po3Time}
                        onChange={e => setPo3Time(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          color: '#fff',
                          fontFamily: 'var(--font)',
                          fontSize: 12,
                          padding: '8px 10px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>entry time frame</div>
                      <input
                        type="text"
                        placeholder="e.g. 5 min"
                        value={entryTf}
                        onChange={e => setEntryTf(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          color: '#fff',
                          fontFamily: 'var(--font)',
                          fontSize: 12,
                          padding: '8px 10px',
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

                  {/* PNL */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>PNL</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        placeholder="optional override"
                        value={manualPnL}
                        onChange={e => setManualPnL(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          color: (outcome || '').toLowerCase().includes('be') || (manualPnL !== '' && parseFloat(manualPnL) === 0) ? '#ff9f0a' : (manualPnL === '' ? '#fff' : (parseFloat(manualPnL) > 0 ? '#30d158' : '#ff453a')),
                          fontFamily: 'var(--font)',
                          fontSize: 12,
                          padding: '8px 10px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
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
                style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}
              >
                {/* Notes Textarea */}
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'lowercase', letterSpacing: '0.04em', marginBottom: 3 }}>notes / reflections</div>
                  <textarea
                    rows={3}
                    placeholder="describe the execution, context, emotions..."
                    value={reflections}
                    onChange={e => setReflections(e.target.value)}
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
                    {mistakesList.map(opt => {
                      const isSelected = selectedMistakes.includes(opt);
                      const customColor = pillGradients[opt];
                      const bgColor = isSelected ? (customColor || 'rgba(255,69,58,0.12)') : 'rgba(255,255,255,0.04)';
                      const textColor = isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)';
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={(e) => {
                            handlePillClick(e, 'mistake', opt, () => {
                              toggleMistake(opt);
                            });
                          }}
                          onContextMenu={(e) => handlePillContextMenu(e, 'mistake', opt)}
                          style={{
                            background: bgColor,
                            border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 20,
                            padding: '4px 8px',
                            color: textColor,
                            fontSize: 11,
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'context-menu',
                            fontFamily: 'var(--font)'
                          }}
                        >
                          {opt.toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Custom mistake adding */}
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

            {/* TAB 3: CHARTS UPLOADS */}
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
                  { label: 'lower time frame (ltf)', val: imageLTF, setter: setImageLTF },
                  { label: 'medium time frame (mtf)', val: imageMTF, setter: setImageMTF },
                  { label: 'higher time frame (htf)', val: imageHTF, setter: setImageHTF }
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
                          onClick={() => imgField.setter(null)}
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
        <div style={{ padding: '0 16px 8px 16px', flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: '100%',
              background: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px',
              fontSize: 13,
              fontWeight: 700,
              color: '#000',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'opacity 0.15s'
            }}
          >
            <Plus size={13} strokeWidth={3} />
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
            }}>
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
