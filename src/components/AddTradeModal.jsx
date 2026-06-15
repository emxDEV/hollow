import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { showToast } from '../utils/toast';
import { X, Plus, Upload, Check, ChevronRight, ChevronLeft, ChevronDown, Calendar, ShieldAlert, Users } from 'lucide-react';
import { db } from '../db/hollowDb';
import { getSymbolMultiplier, calculateTradePnL } from '../utils/tradeMath';
import { PropFirmBadge, PropFirmLogo } from './PropFirmBadge';
import { motion } from 'framer-motion';
import useUIStore from '../store/useUIStore';

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

export default function AddTradeModal({ isOpen, onClose, selectedAccountId }) {
  const isMobile = useUIStore(state => state.isMobile);
  const [step, setStep] = useState(1);

  // Form Fields State
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState('A');
  const [symbol, setSymbol] = useState('NQ');
  const [customSymbol, setCustomSymbol] = useState('');
  const [po3, setPo3] = useState('');
  const [model, setModel] = useState('');
  const [entryTf, setEntryTf] = useState('');
  const [dol, setDol] = useState('');
  const [wl, setWl] = useState('Win');
  const [bias, setBias] = useState('LONG');
  const [rr, setRr] = useState(2);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [manualPnL, setManualPnL] = useState('');

  // Page 2: Narrative & Tagging
  const [commentExecution, setCommentExecution] = useState('');
  const [problems, setProblems] = useState([]);
  const [problemInput, setProblemInput] = useState('');
  const [commentFazit, setCommentFazit] = useState('');

  // Page 3: Snapshot uploads
  const [imageLTF, setImageLTF] = useState(null);
  const [imageMTF, setImageMTF] = useState(null);
  const [imageHTF, setImageHTF] = useState(null);

  // Dynamic Lists for Pills (initialized from localStorage or default lists)
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

  const [confluencesList, setConfluencesList] = useState(() => {
    const saved = localStorage.getItem('hollow_pill_confluences');
    return saved ? JSON.parse(saved) : ['VWAP HOLD', 'HTF LEVEL', 'LIQUIDITY SWEEP', 'FVG RETEST', 'MARKET SHIFT', 'CUSTOM'];
  });
  const [selectedConfluences, setSelectedConfluences] = useState([]);
  const [customConfluence, setCustomConfluence] = useState('');
  const [showCustomConfluenceInput, setShowCustomConfluenceInput] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  // Reset form states on modal open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      const defaultId = selectedAccountId === 'all' 
        ? (dbAccounts[0]?.id || '') 
        : (selectedAccountId || '');
      setTargetId(defaultId);
      setTargetType('account');
      setIsDropdownOpen(false);
      
      // Load current lists from localStorage on modal open
      const savedRatings = localStorage.getItem('hollow_pill_ratings');
      const loadedRatings = savedRatings ? JSON.parse(savedRatings) : ['F', 'C', 'B', 'A', 'A+'];
      setRatings(loadedRatings);
      setRating(loadedRatings.includes('A') ? 'A' : (loadedRatings[0] || ''));

      const savedSymbols = localStorage.getItem('hollow_pill_symbols');
      const loadedSymbols = savedSymbols ? JSON.parse(savedSymbols) : ['NQ', 'ES', 'CL', 'GC', 'EURUSD', 'CUSTOM'];
      setSymbols(loadedSymbols);
      setSymbol(loadedSymbols.includes('NQ') ? 'NQ' : (loadedSymbols[0] || 'CUSTOM'));

      const savedWl = localStorage.getItem('hollow_pill_wl_statuses');
      const loadedWl = savedWl ? JSON.parse(savedWl) : ['Win', 'BE -> Win', 'Loss', 'BE -> Loss', 'Tape'];
      setWlStatuses(loadedWl);
      setWl(loadedWl.includes('Win') ? 'Win' : (loadedWl[0] || ''));

      const savedGrads = localStorage.getItem('hollow_pill_gradients');
      setPillGradients(savedGrads ? JSON.parse(savedGrads) : {});

      const savedConfluences = localStorage.getItem('hollow_pill_confluences');
      setConfluencesList(savedConfluences ? JSON.parse(savedConfluences) : ['VWAP HOLD', 'HTF LEVEL', 'LIQUIDITY SWEEP', 'FVG RETEST', 'MARKET SHIFT', 'CUSTOM']);
      setSelectedConfluences([]);
      setCustomConfluence('');
      setShowCustomConfluenceInput(false);

      setCustomSymbol('');
      setPo3('');
      setModel('');
      setEntryTf('');
      setDol('');
      setBias('LONG');
      setRr(2);
      setTp('');
      setSl('');
      setManualPnL('');
      setCommentExecution('');
      setProblems([]);
      setProblemInput('');
      setCommentFazit('');
      setImageLTF(null);
      setImageMTF(null);
      setImageHTF(null);
      setContextMenu(null);
    }
  }, [isOpen]);


  // Handle problem tag addition
  const handleAddProblem = () => {
    if (problemInput.trim() && !problems.includes(problemInput.trim())) {
      setProblems([...problems, problemInput.trim()]);
      setProblemInput('');
    }
  };

  const handleRemoveProblem = (indexToRemove) => {
    setProblems(problems.filter((_, idx) => idx !== indexToRemove));
  };

  // Convert File to Base64 helper
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

  // Save Trade transaction to IndexedDB
  const handleSaveTrade = async () => {
    const finalSymbol = symbol === 'CUSTOM' ? (customSymbol.toUpperCase() || 'CUSTOM') : symbol;

    // 1. Calculate Entry/Exit Prices mathematically to balance stats correctly
    let entryPrice = 100;
    if (finalSymbol === 'NQ') entryPrice = 18500;
    else if (finalSymbol === 'ES') entryPrice = 5300;
    else if (finalSymbol === 'GC') entryPrice = 2300;
    else if (finalSymbol === 'CL') entryPrice = 80;
    else if (finalSymbol === 'EURUSD') entryPrice = 1.08;

    // Sensible SL spacing
    let slDistance = 10;
    if (finalSymbol === 'NQ') slDistance = 15;
    else if (finalSymbol === 'ES') slDistance = 4;
    else if (finalSymbol === 'GC') slDistance = 3;
    else if (finalSymbol === 'CL') slDistance = 0.3;
    else if (finalSymbol === 'EURUSD') slDistance = 0.001;

    let stopLossPrice = parseFloat(sl);
    if (isNaN(stopLossPrice)) {
      stopLossPrice = bias === 'LONG' ? (entryPrice - slDistance) : (entryPrice + slDistance);
    }

    const actualSlDistance = Math.abs(entryPrice - stopLossPrice);

    let takeProfitPrice = parseFloat(tp);
    if (isNaN(takeProfitPrice)) {
      const tpDistance = actualSlDistance * parseFloat(rr);
      takeProfitPrice = bias === 'LONG' ? (entryPrice + tpDistance) : (entryPrice - tpDistance);
    }

    let exitPrice = entryPrice;
    const netPnLVal = parseFloat(manualPnL);

    if (!isNaN(netPnLVal)) {
      // Manual P&L Override is active! Solve for exitPrice.
      const contracts = 1;
      const totalCommissions = 4.80; // 2.40 entry + 2.40 exit
      const biasFactor = bias === 'LONG' ? 1 : -1;
      const calcMultiplier = finalSymbol === 'EURUSD' ? 1 : getSymbolMultiplier(finalSymbol);
      
      exitPrice = entryPrice + ((netPnLVal + totalCommissions) / (contracts * calcMultiplier * biasFactor));
    } else {
      // Existing automatic calculation logic based on W/L status and RR
      if (wl === 'Win') {
        exitPrice = takeProfitPrice;
      } else if (wl === 'Loss') {
        exitPrice = stopLossPrice;
      } else if (wl === 'BE -> Win') {
        const stepVal = finalSymbol === 'EURUSD' ? 0.0001 : 1;
        exitPrice = bias === 'LONG' ? (entryPrice + stepVal * 5) : (entryPrice - stepVal * 5);
      } else if (wl === 'BE -> Loss') {
        const stepVal = finalSymbol === 'EURUSD' ? 0.0001 : 1;
        exitPrice = bias === 'LONG' ? (entryPrice - stepVal * 5) : (entryPrice + stepVal * 5);
      } else {
        exitPrice = entryPrice;
      }
    }

    // Determine target account IDs
    let targetAccountIds = [];
    if (targetType === 'group') {
      const selectedGroup = dbGroups.find(g => g.id === targetId);
      if (selectedGroup) {
        targetAccountIds = [
          selectedGroup.leaderAccountId,
          ...(selectedGroup.followerAccountIds || [])
        ].filter(Boolean);
      }
    } else {
      targetAccountIds = [targetId];
    }

    if (targetAccountIds.length === 0) {
      showToast('No valid accounts found for this target.', 'error');
      return;
    }

    const timestampDate = date ? new Date(date) : new Date();
    const timestampISO = timestampDate.toISOString();

    try {
      await db.transaction('rw', db.trades, db.executions, async () => {
        for (let i = 0; i < targetAccountIds.length; i++) {
          const accId = targetAccountIds[i];
          const finalTradeId = `trade-${Date.now()}-${accId}-${i}`;

          const entryExec = {
            id: `exec-${Date.now()}-1-${accId}-${i}`,
            tradeId: finalTradeId,
            timestamp: timestampISO,
            side: bias === 'LONG' ? 'BUY' : 'SELL',
            price: entryPrice,
            contracts: 1,
            commissions: 2.40,
            type: 'ENTRY'
          };

          const exitExec = {
            id: `exec-${Date.now()}-2-${accId}-${i}`,
            tradeId: finalTradeId,
            timestamp: new Date(timestampDate.getTime() + 15 * 60000).toISOString(),
            side: bias === 'LONG' ? 'SELL' : 'BUY',
            price: exitPrice,
            contracts: 1,
            commissions: 2.40,
            type: 'EXIT'
          };

          const newTradeObj = {
            id: finalTradeId,
            accountId: accId,
            date: date,
            symbol: finalSymbol,
            model: model || 'Unmapped',
            bias: bias,
            status: 'CLOSED',
            confluences: [],
            setupRating: rating,
            wl: wl,
            rr: parseFloat(rr),
            tp: tp ? parseFloat(tp) : null,
            sl: sl ? parseFloat(sl) : null,
            po3: po3 || '',
            entryTf: entryTf || '',
            dol: dol || '',
            mistakes: problems,
            commentBias: name || `${finalSymbol} Breakout Setup`,
            commentExecution: commentExecution || '',
            commentProblems: problems.join(', ') || '',
            commentFazit: commentFazit || '',
            images: [imageLTF, imageMTF, imageHTF].filter(img => !!img),
            imageAnnotations: {}
          };

          await db.trades.add(newTradeObj);
          await db.executions.add(entryExec);
          await db.executions.add(exitExec);
        }
      });
      console.log('Wizard Trade(s) Saved Successfully!');
      onClose();
    } catch (err) {
      console.error('Wizard fail to write database:', err);
      showToast('Failed to save trade execution.', 'error');
    }
  };

  // Right-Click Context Menu Handlers
  const handlePillContextMenu = (e, type, label, index) => {
    e.preventDefault();
    if (label === 'CUSTOM') return; // Protect special options
    
    // Position menu at cursor but prevent off-screen overflow
    const left = Math.min(e.clientX, window.innerWidth - 260);
    const top = Math.min(e.clientY, window.innerHeight - 300);

    setContextMenu({
      x: left,
      y: top,
      type,
      label,
      index
    });
  };

  const handleRenamePill = (type, oldLabel, newLabel, index) => {
    if (!newLabel || !newLabel.trim()) return;
    const cleanLabel = newLabel.trim();
    if (cleanLabel === oldLabel) return;

    // 1. Update dynamic lists
    if (type === 'rating') {
      const updated = ratings.map(r => r === oldLabel ? cleanLabel : r);
      setRatings(updated);
      localStorage.setItem('hollow_pill_ratings', JSON.stringify(updated));
      if (rating === oldLabel) setRating(cleanLabel);
    } else if (type === 'symbol') {
      const updated = symbols.map(s => s === oldLabel ? cleanLabel : s);
      setSymbols(updated);
      localStorage.setItem('hollow_pill_symbols', JSON.stringify(updated));
      if (symbol === oldLabel) setSymbol(cleanLabel);
    } else if (type === 'wl') {
      const updated = wlStatuses.map(w => w === oldLabel ? cleanLabel : w);
      setWlStatuses(updated);
      localStorage.setItem('hollow_pill_wl_statuses', JSON.stringify(updated));
      if (wl === oldLabel) setWl(cleanLabel);
    } else if (type === 'problem') {
      const updated = [...problems];
      if (index !== undefined && index >= 0 && index < updated.length) {
        updated[index] = cleanLabel;
        setProblems(updated);
      }
    } else if (type === 'confluence') {
      const updated = confluencesList.map(c => c === oldLabel ? cleanLabel : c);
      setConfluencesList(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      if (selectedConfluences.includes(oldLabel)) {
        setSelectedConfluences(selectedConfluences.map(c => c === oldLabel ? cleanLabel : c));
      }
    }

    // 2. Keep custom gradients mapped
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

  const handleDeletePill = (type, oldLabel, index) => {
    if (type === 'rating') {
      const updated = ratings.filter(r => r !== oldLabel);
      setRatings(updated);
      localStorage.setItem('hollow_pill_ratings', JSON.stringify(updated));
      if (rating === oldLabel) {
        setRating(updated.length > 0 ? updated[0] : '');
      }
    } else if (type === 'symbol') {
      const updated = symbols.filter(s => s !== oldLabel);
      setSymbols(updated);
      localStorage.setItem('hollow_pill_symbols', JSON.stringify(updated));
      if (symbol === oldLabel) {
        setSymbol(updated.length > 0 ? updated[0] : 'CUSTOM');
      }
    } else if (type === 'wl') {
      const updated = wlStatuses.filter(w => w !== oldLabel);
      setWlStatuses(updated);
      localStorage.setItem('hollow_pill_wl_statuses', JSON.stringify(updated));
      if (wl === oldLabel) {
        setWl(updated.length > 0 ? updated[0] : '');
      }
    } else if (type === 'problem') {
      if (index !== undefined && index >= 0 && index < problems.length) {
        setProblems(problems.filter((_, idx) => idx !== index));
      }
    } else if (type === 'confluence') {
      const updated = confluencesList.filter(c => c !== oldLabel);
      setConfluencesList(updated);
      localStorage.setItem('hollow_pill_confluences', JSON.stringify(updated));
      setSelectedConfluences(selectedConfluences.filter(c => c !== oldLabel));
    }

    if (pillGradients[oldLabel]) {
      const updatedGradients = { ...pillGradients };
      delete updatedGradients[oldLabel];
      setPillGradients(updatedGradients);
      localStorage.setItem('hollow_pill_gradients', JSON.stringify(updatedGradients));
    }
  };

  const handleAddCustomSymbolTicker = () => {
    if (!customSymbol || !customSymbol.trim()) return;
    const cleanSym = customSymbol.trim().toUpperCase();
    if (symbols.includes(cleanSym)) {
      setSymbol(cleanSym);
      setCustomSymbol('');
      return;
    }
    const customIndex = symbols.indexOf('CUSTOM');
    const updatedSymbols = [...symbols];
    if (customIndex !== -1) {
      updatedSymbols.splice(customIndex, 0, cleanSym);
    } else {
      updatedSymbols.push(cleanSym, 'CUSTOM');
    }
    setSymbols(updatedSymbols);
    localStorage.setItem('hollow_pill_symbols', JSON.stringify(updatedSymbols));
    setSymbol(cleanSym);
    setCustomSymbol('');
  };

  // Gradient helper mapping (Softer pastel-ish theme)
  // Gradient helper mapping (Softer pastel-ish theme)
  // Gradient helper mapping (Softer pastel-ish theme)
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
      case 'BE -> Win': return 'rgba(48, 209, 88, 0.04)';
      case 'Loss': return 'rgba(255, 69, 58, 0.08)';
      case 'BE -> Loss': return 'rgba(255, 69, 58, 0.04)';
      case 'Tape': return 'rgba(255, 255, 255, 0.04)';
      default: return 'rgba(255, 255, 255, 0.04)';
    }
  };

  const getWlBorder = (s) => {
    switch (s) {
      case 'Win': return '1px solid rgba(48, 209, 88, 0.25)';
      case 'BE -> Win': return '1px solid rgba(48, 209, 88, 0.15)';
      case 'Loss': return '1px solid rgba(255, 69, 58, 0.25)';
      case 'BE -> Loss': return '1px solid rgba(255, 69, 58, 0.15)';
      case 'Tape': return '1px solid rgba(255, 255, 255, 0.15)';
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

  const getProblemGradient = (p) => {
    if (pillGradients[p]) return pillGradients[p];
    return 'rgba(255, 69, 58, 0.08)';
  };

  const dbAccounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const dbGroups = useLiveQuery(() => db.groups.toArray()) || [];
  const dbTrades = useLiveQuery(() => db.trades.toArray()) || [];
  const dbExecutions = useLiveQuery(() => db.executions.toArray()) || [];

  const [targetId, setTargetId] = useState(selectedAccountId || '');
  const [targetType, setTargetType] = useState('account');

  const getAccountBalance = (acc) => {
    if (!acc) return 0;
    const accTrades = dbTrades.filter(t => t.accountId === acc.id);
    let totalPnL = 0;
    accTrades.forEach(trade => {
      const tradeExecs = dbExecutions.filter(e => e.tradeId === trade.id);
      const math = calculateTradePnL(trade, tradeExecs);
      totalPnL += math.netPnL;
    });
    return Math.round(acc.balance + totalPnL);
  };

  const dropdownRef = useRef(null);
  const renameInputRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="hollow-modal-overlay open"
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        padding: isMobile ? '0' : '20px',
        fontFamily: "var(--font-body)"
      }}
      onClick={onClose}
    >
      
      {/* Modal Container Card */}
      <motion.div 
        initial={{ scale: 0.93, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="hollow-modal-content"
        style={{
          background: '#0f0f11',
          border: isMobile ? 'none' : '1px solid #1c1c1e',
          borderRadius: isMobile ? '0' : '20px',
          width: '100%',
          maxWidth: isMobile ? '100vw' : '750px',
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : '90vh',
          overflowY: 'auto',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Section - mobile style */}
        <div style={{
          padding: '24px 28px 0 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>add new execution.</h2>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>log details for analytics</span>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Wizard Steps indicator - inline tabs like mobile */}
        <div style={{
          padding: '16px 28px 0 28px',
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          {[{ n: 1, label: '1. execution' }, { n: 2, label: '2. reflections' }, { n: 3, label: '3. charts' }].map(({ n, label }) => {
            const isActive = step === n;
            const isDone = step > n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setStep(n)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
                  paddingBottom: '12px',
                  color: isActive ? '#fff' : (isDone ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'),
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.01em'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Body content scrollable */}
        <div style={{ padding: '28px', flex: 1 }}>

          {/* PAGE 1: Execution Parameters */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Row A: Account + Date (2 cols) */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '14px', alignItems: 'end' }}>
                {/* Account dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }} ref={dropdownRef}>
                  <label style={styles.label}>account</label>
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.04)',
                      border: isDropdownOpen ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {(() => {
                        const selectedAccount = targetType === 'account' ? dbAccounts.find(a => a.id === targetId) : null;
                        const selectedGroup = targetType === 'group' ? dbGroups.find(g => g.id === targetId) : null;
                        if (selectedAccount) return `${selectedAccount.name} (${selectedAccount.propFirm || 'Custom'})`;
                        if (selectedGroup) return `${selectedGroup.name} (${1 + (selectedGroup.followerAccountIds || []).length} accs)`;
                        return '-- choose account --';
                      })()}
                    </span>
                    <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: '8px' }} />
                  </div>

                  {isDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '100%',
                      maxHeight: '260px', overflowY: 'auto',
                      background: '#0f0f11', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                      zIndex: 10001, padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px'
                    }} className="hollow-menu-scrollbar">
                      <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 12px 2px' }}>Accounts</div>
                      {dbAccounts.map(acc => {
                        const isCurrent = targetType === 'account' && targetId === acc.id;
                        return (
                          <div key={acc.id} onClick={() => { setTargetId(acc.id); setTargetType('account'); setIsDropdownOpen(false); }}
                            style={{ padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', background: isCurrent ? 'rgba(255,255,255,0.08)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = isCurrent ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = isCurrent ? 'rgba(255,255,255,0.08)' : 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <PropFirmBadge firm={acc.propFirm} type={acc.type} size={24} logoSize={11} />
                              <span style={{ fontSize: '12px', fontWeight: isCurrent ? '700' : '500', color: '#fff' }}>{acc.name}</span>
                            </div>
                            {isCurrent && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                        );
                      })}
                      {dbGroups.length > 0 && (
                        <>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 12px 2px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px' }}>Groups</div>
                          {dbGroups.map(g => {
                            const isCurrent = targetType === 'group' && targetId === g.id;
                            return (
                              <div key={g.id} onClick={() => { setTargetId(g.id); setTargetType('group'); setIsDropdownOpen(false); }}
                                style={{ padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', background: isCurrent ? 'rgba(255,255,255,0.08)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = isCurrent ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
                                onMouseLeave={e => e.currentTarget.style.background = isCurrent ? 'rgba(255,255,255,0.08)' : 'transparent'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Users size={14} color="rgba(255,255,255,0.6)" />
                                  <span style={{ fontSize: '12px', fontWeight: isCurrent ? '700' : '500', color: '#fff' }}>{g.name}</span>
                                </div>
                                {isCurrent && <Check size={12} color="#fff" strokeWidth={3} />}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.label}>date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.textInput} />
                </div>
              </div>

              {/* Trade Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={styles.label}>trade name</label>
                <input type="text" placeholder="e.g. range bounce" value={name} onChange={(e) => setName(e.target.value)} style={styles.textInput} />
              </div>

              {/* Symbol pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={styles.label}>symbol</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {symbols.map(sym => {
                    const isSelected = symbol === sym;
                    return (
                      <button key={sym} type="button"
                        onClick={() => setSymbol(sym)}
                        onContextMenu={(e) => handlePillContextMenu(e, 'symbol', sym)}
                        style={{
                          ...styles.pillBtn,
                          background: isSelected ? getTickerColor(sym) : 'rgba(255,255,255,0.05)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          color: isSelected ? getPillTextColor(getTickerColor(sym)) : 'rgba(255,255,255,0.75)',
                          fontWeight: isSelected ? '700' : '500',
                          padding: '7px 16px',
                          borderRadius: '999px',
                          fontSize: '13px'
                        }}
                      >
                        {sym === 'CUSTOM' ? '+ custom' : sym.toLowerCase()}
                      </button>
                    );
                  })}
                </div>
                {symbol === 'CUSTOM' && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="text" placeholder="Enter custom ticker..." value={customSymbol} onChange={(e) => setCustomSymbol(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomSymbolTicker(); }}
                      style={{ ...styles.textInput, flex: 1 }} />
                    <button type="button" onClick={handleAddCustomSymbolTicker}
                      style={{ background: '#fff', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#000', flexShrink: 0 }}>
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>

              {/* Direction + Outcome (2-col) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={styles.label}>direction</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['LONG', 'SHORT'].map(dir => {
                      const isSelected = bias === dir;
                      const activeStyle = dir === 'LONG'
                        ? { background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', color: '#30d158' }
                        : { background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', color: '#ff453a' };
                      return (
                        <button key={dir} type="button" onClick={() => setBias(dir)}
                          style={{
                            ...styles.pillBtn,
                            flex: 1,
                            padding: '10px',
                            borderRadius: '14px',
                            ...(isSelected ? activeStyle : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }),
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: '13px'
                          }}
                        >
                          {dir.toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={styles.label}>outcome (w/l)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {wlStatuses.map(status => {
                      const isSelected = wl === status;
                      return (
                        <button key={status} type="button" onClick={() => setWl(status)}
                          onContextMenu={(e) => handlePillContextMenu(e, 'wl', status)}
                          style={{
                            ...styles.pillBtn,
                            fontSize: '12px',
                            padding: '7px 12px',
                            borderRadius: '999px',
                            background: isSelected ? getWlGradient(status) : 'rgba(255,255,255,0.04)',
                            border: isSelected ? getWlBorder(status) : '1px solid rgba(255,255,255,0.06)',
                            color: isSelected ? getWlColor(status) : 'rgba(255,255,255,0.7)',
                            fontWeight: isSelected ? '700' : '500'
                          }}
                        >
                          {status.toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Setup Rating */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={styles.label}>setup rating</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {ratings.map(r => {
                    const isSelected = rating === r;
                    return (
                      <button key={r} type="button" onClick={() => setRating(r)}
                        onContextMenu={(e) => handlePillContextMenu(e, 'rating', r)}
                        style={{
                          ...styles.pillBtn,
                          flex: 1,
                          padding: '10px',
                          borderRadius: '14px',
                          background: isSelected ? getRatingGradient(r) : 'rgba(255,255,255,0.04)',
                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.07)',
                          color: isSelected ? getPillTextColor(getRatingGradient(r)) : 'rgba(255,255,255,0.6)',
                          fontWeight: isSelected ? '800' : '500',
                          fontSize: '13px'
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confluences */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={styles.label}>confluences</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {confluencesList.filter(c => c !== 'CUSTOM').map(c => {
                    const isSelected = selectedConfluences.includes(c);
                    return (
                      <button key={c} type="button"
                        onClick={() => setSelectedConfluences(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                        onContextMenu={(e) => handlePillContextMenu(e, 'confluence', c)}
                        style={{
                          ...styles.pillBtn,
                          padding: '7px 14px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          background: isSelected ? '#0a84ff' : 'rgba(255,255,255,0.04)',
                          border: isSelected ? '1px solid #0a84ff' : '1px solid rgba(255,255,255,0.07)',
                          color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
                          fontWeight: isSelected ? '700' : '400'
                        }}
                      >
                        {c.toLowerCase()}
                      </button>
                    );
                  })}
                  <button type="button"
                    onClick={() => setShowCustomConfluenceInput(v => !v)}
                    style={{ ...styles.pillBtn, padding: '7px 14px', borderRadius: '999px', fontSize: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontWeight: '400' }}
                  >
                    + custom
                  </button>
                </div>
                {showCustomConfluenceInput && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="text" placeholder="Type confluence..." value={customConfluence} onChange={e => setCustomConfluence(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customConfluence.trim()) {
                          const val = customConfluence.trim().toUpperCase();
                          if (!confluencesList.includes(val)) setConfluencesList(prev => [...prev.filter(x => x !== 'CUSTOM'), val, 'CUSTOM']);
                          setSelectedConfluences(prev => [...prev, val]);
                          setCustomConfluence('');
                          setShowCustomConfluenceInput(false);
                        }
                      }}
                      style={{ ...styles.textInput, flex: 1 }} />
                    <button type="button"
                      onClick={() => {
                        if (customConfluence.trim()) {
                          const val = customConfluence.trim().toUpperCase();
                          if (!confluencesList.includes(val)) setConfluencesList(prev => [...prev.filter(x => x !== 'CUSTOM'), val, 'CUSTOM']);
                          setSelectedConfluences(prev => [...prev, val]);
                          setCustomConfluence('');
                          setShowCustomConfluenceInput(false);
                        }
                      }}
                      style={{ background: '#fff', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#000', flexShrink: 0 }}>
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>

              {/* Model */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={styles.label}>model</label>
                <input type="text" placeholder="e.g. fvg retest" value={model} onChange={(e) => setModel(e.target.value)} style={styles.textInput} />
              </div>

              {/* PO3 + Entry TF (2-col) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.label}>po3 time</label>
                  <input type="time" value={po3} onChange={(e) => setPo3(e.target.value)} style={styles.textInput} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.label}>entry time frame</label>
                  <input type="text" placeholder="e.g. 5 min" value={entryTf} onChange={(e) => setEntryTf(e.target.value)} style={styles.textInput} />
                </div>
              </div>

              {/* R-Multiple + Manual PnL (2-col) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={styles.label}>r-multiple</label>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>1 : {rr}</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.5" value={rr} onChange={(e) => setRr(parseFloat(e.target.value))} className="hollow-slider" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.label}>manual p&l ($)</label>
                  <input type="number" placeholder="optional override" value={manualPnL} onChange={(e) => setManualPnL(e.target.value)} style={styles.textInput} />
                </div>
              </div>

            </div>
          )}


          {/* PAGE 2: Narrative & Problems */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Execution Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Execution Notes</label>
                <textarea
                  rows="3"
                  placeholder="Explain entry trigger details, session conditions, etc."
                  value={commentExecution}
                  onChange={(e) => setCommentExecution(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              {/* Problems Tags (Custom all Red pills) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Behavioral Problems / Leaks</label>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Type problem tag (e.g. FOMO, Sizing Up) & click Add..." 
                    value={problemInput}
                    onChange={(e) => setProblemInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProblem(); } }}
                    style={{ ...styles.textInput, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddProblem}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      padding: '0 16px',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                 {problems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '12px' }}>
                    {problems.map((p, idx) => (
                      <span 
                        key={idx} 
                        onContextMenu={(e) => handlePillContextMenu(e, 'problem', p, idx)}
                        style={{
                          background: getProblemGradient(p),
                          border: '1px solid rgba(255, 69, 58, 0.25)',
                          color: '#ff453a',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'context-menu'
                        }}
                      >
                        <ShieldAlert size={10} />
                        {p}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveProblem(idx)}
                          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '9px', cursor: 'pointer', padding: 0 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Personal Conclusion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Personal Conclusion / Reflex Notes</label>
                <textarea
                  rows="3"
                  placeholder="Summarize key lessons learned from this execution fill..."
                  value={commentFazit}
                  onChange={(e) => setCommentFazit(e.target.value)}
                  style={styles.textarea}
                />
              </div>

            </div>
          )}

          {/* PAGE 3: Visual snapshots */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--colors-stone)' }}>Upload snapshots for different context levels (LTF, MTF, HTF). Max file size 2MB each.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                {/* LTF Upload */}
                <div style={styles.uploadBox}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--colors-stone)' }}>LTF Chart (Low)</span>
                  {imageLTF ? (
                    <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={imageLTF} alt="LTF Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setImageLTF(null)} style={styles.removeImageBtn}>✕</button>
                    </div>
                  ) : (
                    <label style={styles.uploadLabel}>
                      <Upload size={20} color="var(--colors-stone)" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImageLTF)} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                {/* MTF Upload */}
                <div style={styles.uploadBox}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--colors-stone)' }}>MTF Chart (Mid)</span>
                  {imageMTF ? (
                    <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={imageMTF} alt="MTF Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setImageMTF(null)} style={styles.removeImageBtn}>✕</button>
                    </div>
                  ) : (
                    <label style={styles.uploadLabel}>
                      <Upload size={20} color="var(--colors-stone)" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImageMTF)} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                {/* HTF Upload */}
                <div style={styles.uploadBox}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--colors-stone)' }}>HTF Chart (High)</span>
                  {imageHTF ? (
                    <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={imageHTF} alt="HTF Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setImageHTF(null)} style={styles.removeImageBtn}>✕</button>
                    </div>
                  ) : (
                    <label style={styles.uploadLabel}>
                      <Upload size={20} color="var(--colors-stone)" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImageHTF)} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Bar */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button 
            type="button"
            onClick={step > 1 ? () => setStep(step - 1) : onClose}
            style={styles.navBtnSecondary}
          >
            {step > 1 ? (<><ChevronLeft size={16} /> back</>) : 'cancel'}
          </button>

          {step < 3 ? (
            <button type="button" onClick={() => setStep(step + 1)} style={styles.navBtnPrimary}>
              next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSaveTrade}
              style={{ ...styles.navBtnPrimary, background: '#fff', color: '#000', flex: 1, maxWidth: '260px', gap: '8px', justifyContent: 'center' }}>
              <Plus size={16} /> save trade
            </button>
          )}
        </div>

      </motion.div>

      {contextMenu && (
        <>
          {/* Backdrop overlay to close context menu on click outside */}
          <div 
            onClick={() => setContextMenu(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1100,
              background: 'transparent'
            }}
          />
          
          {/* Custom Context Menu */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              zIndex: 1101,
              width: '240px',
            background: 'rgba(15, 15, 17, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontFamily: 'inherit'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--colors-stone)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Edit Pill: {contextMenu.label}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newValue = renameInputRef.current?.value;
                  if (newValue && newValue.trim()) {
                    handleRenamePill(contextMenu.type, contextMenu.label, newValue, contextMenu.index);
                  }
                  setContextMenu(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(48,209,88,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(48,209,88,0.4)';
                  e.currentTarget.style.color = '#30d158';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
              >
                <Check size={12} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Rename input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Rename</span>
              <input 
                ref={renameInputRef}
                type="text"
                defaultValue={contextMenu.label}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenamePill(contextMenu.type, contextMenu.label, e.target.value, contextMenu.index);
                  }
                }}
                placeholder="New name..."
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '6px 10px',
                  fontSize: '12px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Press Enter to save</span>
            </div>

            {/* Color grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Change Gradient Color</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
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
                      borderRadius: '8px',
                      height: '24px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Delete button */}
            {contextMenu.label !== 'CUSTOM' && (
              <button
                type="button"
                onClick={() => {
                  handleDeletePill(contextMenu.type, contextMenu.label, contextMenu.index);
                  setContextMenu(null);
                }}
                style={{
                  background: 'rgba(234, 84, 85, 0.1)',
                  color: '#ff5b5c',
                  border: '1px solid rgba(234, 84, 85, 0.2)',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(234, 84, 85, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(234, 84, 85, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(234, 84, 85, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(234, 84, 85, 0.2)';
                }}
              >
                Delete Option
              </button>
            )}
          </div>
        </>
      )}

  </motion.div>,
  document.body
);
}

// Interactive styles
const styles = {
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'lowercase',
    letterSpacing: '0.02em'
  },
  textInput: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#fff',
    padding: '10px 14px',
    outline: 'none',
    fontSize: '13px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  textarea: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#fff',
    padding: '12px 14px',
    outline: 'none',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  pillBtn: {
    padding: '8px 14px',
    borderRadius: '999px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '12px',
    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
    outline: 'none'
  },
  grayPillPreview: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '999px',
    fontFamily: 'var(--font-mono)'
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.15)',
    border: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px'
  },
  uploadLabel: {
    width: '100%',
    height: '120px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  removeImageBtn: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: 'rgba(234, 84, 85, 0.8)',
    color: '#fff',
    border: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    cursor: 'pointer'
  },
  navBtnPrimary: {
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 18px',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  navBtnSecondary: {
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '10px 18px',
    fontWeight: '500',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};
