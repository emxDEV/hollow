import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Save, Calendar, Clock,
  TrendingUp, TrendingDown, Target, Zap, Shield, Image as ImageIcon,
  CheckCircle, Sparkles, AlertCircle, Plus, Trash2, Check, Palette,
  ZoomIn, ZoomOut, Upload, ArrowLeft, ArrowRight
} from 'lucide-react';
import { db } from '../db/hollowDb';
import { useUIStore } from '../store/useUIStore';

// STRICT HH:MM FORMAT HELPER
const sanitizeHHMM = (val) => {
  if (!val) return '';
  // Remove non-numeric and non-colon characters
  let clean = val.replace(/[^0-9:]/g, '');
  // Auto-format "0945" -> "09:45"
  if (!clean.includes(':') && clean.length >= 3) {
    clean = `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
  }
  // Truncate to 5 chars (hh:mm)
  if (clean.length > 5) {
    clean = clean.slice(0, 5);
  }
  return clean;
};

// PRESET COLOR SWATCHES FOR DOL COLOR PICKER
const COLOR_SWATCHES = [
  '#30d158', // Emerald Green
  '#ff453a', // Crimson Red
  '#ffd60a', // Gold Yellow
  '#64d2ff', // Cyan Blue
  '#b86eff', // Purple
  '#ff9f0a', // Orange
  '#ff375f'  // Pink
];

// ASSETS (NQ Blue, ES Red)
const ASSET_OPTS = [
  { value: 'NQ', label: 'NQ', color: '#64d2ff', bg: 'rgba(100, 210, 255, 0.22)' },
  { value: 'ES', label: 'ES', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.22)' }
];

// RATINGS (A+ Green, A Green, B Yellow, F Red)
const RATING_OPTS = [
  { value: 'A+', label: 'A+', color: '#30d158', bg: 'rgba(48, 209, 88, 0.24)' },
  { value: 'A', label: 'A', color: '#34c759', bg: 'rgba(52, 199, 89, 0.22)' },
  { value: 'B', label: 'B', color: '#ffd60a', bg: 'rgba(255, 214, 10, 0.22)' },
  { value: 'F', label: 'F', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.24)' }
];

// SIDES (Long Green, Short Red)
const SIDE_OPTS = [
  { value: 'Long', label: 'Long', color: '#30d158', bg: 'rgba(48, 209, 88, 0.22)', icon: TrendingUp },
  { value: 'Short', label: 'Short', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.22)', icon: TrendingDown }
];

// WIN / LOSS / BE
const WL_OPTS = [
  { value: 'Win', label: 'Win', color: '#30d158', bg: 'rgba(48, 209, 88, 0.22)' },
  { value: 'Loss', label: 'Loss', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.22)' },
  { value: 'BE', label: 'BE', color: '#ffd60a', bg: 'rgba(255, 214, 10, 0.22)' }
];

// EMOTION EMOJIS
const EMOTIONS = [
  { value: '😫 Stressed', emoji: '😫', label: 'Stressed', color: '#ff453a' },
  { value: '😰 Anxious', emoji: '😰', label: 'Anxious', color: '#ff9f0a' },
  { value: '😐 Neutral', emoji: '😐', label: 'Neutral', color: '#8e8e93' },
  { value: '🎯 Focused', emoji: '🎯', label: 'Focused', color: '#b86eff' },
  { value: '😊 Happy', emoji: '😊', label: 'Happy', color: '#64d2ff' },
  { value: '🔥 Confident', emoji: '🔥', label: 'Confident', color: '#30d158' }
];

export default function AddExecutionModal() {
  const isMobile = useUIStore(state => state.isMobile);
  const isAddExecutionOpen = useUIStore(state => state.isAddExecutionOpen);
  const setIsAddExecutionOpen = useUIStore(state => state.setIsAddExecutionOpen);
  const addToast = useUIStore(state => state.addToast);

  const [currentStep, setCurrentStep] = useState(1);
  const [activeViewerImage, setActiveViewerImage] = useState(null); // { key, index }
  const [zoomScale, setZoomScale] = useState(1);

  // Persistent Custom Lists (User Created Only)
  const [customModels, setCustomModels] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowCustomModels');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newModelInput, setNewModelInput] = useState('');

  const [customDOLs, setCustomDOLs] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowCustomDOLs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newDOLLabel, setNewDOLLabel] = useState('');
  const [newDOLColor, setNewDOLColor] = useState('#30d158');

  const [customPO3Times, setCustomPO3Times] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowCustomPO3Times');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newPO3TimeInput, setNewPO3TimeInput] = useState('');

  const [customEntryTFs, setCustomEntryTFs] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowCustomEntryTFs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newEntryTFInput, setNewEntryTFInput] = useState('');

  const [customPsychTags, setCustomPsychTags] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowCustomPsychTags');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newPsychInput, setNewPsychInput] = useState('');
  const [showBeMenu, setShowBeMenu] = useState(false);

  // Form State covering all 17 fields + multi-images
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('hollowExecutionDraft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const today = new Date();
    return {
      id: `exec-${Date.now()}`,
      date: today.toISOString().split('T')[0],
      symbol: 'NQ',
      rating: 'A+',
      wl: 'Win',
      bias: 'Long',
      model: '',
      dol: '',
      entryTf: '',
      session: 'New York',
      po3Times: [],
      sl: '15.00',
      tp: '37.50',
      rr: '2.5',
      executionTime: '09:48',
      outcomeTimeStart: '09:45',
      outcomeTimeEnd: '10:15',
      emotion: '🎯 Focused',
      psychTags: [],
      notes: '',
      ltfImages: [],
      mtfImages: [],
      htfImages: [],
      outcomeImages: [],
      day: today.toLocaleDateString('en-US', { weekday: 'long' }),
      month: today.toLocaleDateString('en-US', { month: 'long' }),
      timestamp: Date.now()
    };
  });

  // Auto-update Day & Month when date changes
  useEffect(() => {
    if (form.date) {
      const d = new Date(form.date);
      if (!isNaN(d.getTime())) {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = d.toLocaleDateString('en-US', { month: 'long' });
        setForm(prev => ({ ...prev, day: dayName, month: monthName }));
      }
    }
  }, [form.date]);

  // Save persistent lists to local storage
  useEffect(() => {
    const serialized = JSON.stringify(customModels);
    if (localStorage.getItem('hollowCustomModels') !== serialized) {
      localStorage.setItem('hollowCustomModels', serialized);
      window.dispatchEvent(new Event('hollowCustomPillsUpdated'));
    }
  }, [customModels]);

  useEffect(() => {
    const serialized = JSON.stringify(customDOLs);
    if (localStorage.getItem('hollowCustomDOLs') !== serialized) {
      localStorage.setItem('hollowCustomDOLs', serialized);
      window.dispatchEvent(new Event('hollowCustomPillsUpdated'));
    }
  }, [customDOLs]);

  useEffect(() => {
    const serialized = JSON.stringify(customPO3Times);
    if (localStorage.getItem('hollowCustomPO3Times') !== serialized) {
      localStorage.setItem('hollowCustomPO3Times', serialized);
      window.dispatchEvent(new Event('hollowCustomPillsUpdated'));
    }
  }, [customPO3Times]);

  useEffect(() => {
    const serialized = JSON.stringify(customEntryTFs);
    if (localStorage.getItem('hollowCustomEntryTFs') !== serialized) {
      localStorage.setItem('hollowCustomEntryTFs', serialized);
      window.dispatchEvent(new Event('hollowCustomPillsUpdated'));
    }
  }, [customEntryTFs]);

  useEffect(() => {
    const serialized = JSON.stringify(customPsychTags);
    if (localStorage.getItem('hollowCustomPsychTags') !== serialized) {
      localStorage.setItem('hollowCustomPsychTags', serialized);
      window.dispatchEvent(new Event('hollowCustomPillsUpdated'));
    }
  }, [customPsychTags]);

  // Sync custom pill order from LocalStorage whenever settings updates or modal opens
  useEffect(() => {
    const syncPills = () => {
      try {
        const m = localStorage.getItem('hollowCustomModels');
        if (m) {
          const parsed = JSON.parse(m);
          setCustomModels(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
        const d = localStorage.getItem('hollowCustomDOLs');
        if (d) {
          const parsed = JSON.parse(d);
          setCustomDOLs(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
        const p = localStorage.getItem('hollowCustomPO3Times');
        if (p) {
          const parsed = JSON.parse(p);
          setCustomPO3Times(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
        const e = localStorage.getItem('hollowCustomEntryTFs');
        if (e) {
          const parsed = JSON.parse(e);
          setCustomEntryTFs(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
        const ps = localStorage.getItem('hollowCustomPsychTags');
        if (ps) {
          const parsed = JSON.parse(ps);
          setCustomPsychTags(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
      } catch (err) {
        console.error('Failed to sync settings pills:', err);
      }
    };

    syncPills();
    window.addEventListener('hollowCustomPillsUpdated', syncPills);
    return () => window.removeEventListener('hollowCustomPillsUpdated', syncPills);
  }, [isAddExecutionOpen]);

  // Auto-Save Draft to LocalStorage whenever form changes
  useEffect(() => {
    if (isAddExecutionOpen) {
      localStorage.setItem('hollowExecutionDraft', JSON.stringify(form));
    }
  }, [form, isAddExecutionOpen]);

  const activeExecutionDraft = useUIStore(state => state.activeExecutionDraft);
  const setActiveExecutionDraft = useUIStore(state => state.setActiveExecutionDraft);

  // Sync custom pill order & populate edit draft when modal opens
  useEffect(() => {
    if (isAddExecutionOpen) {
      if (activeExecutionDraft) {
        setForm({
          ...createBlankForm(),
          ...activeExecutionDraft
        });
      }
    }
  }, [isAddExecutionOpen, activeExecutionDraft]);

  const handleClose = () => {
    localStorage.removeItem('hollowExecutionDraft');
    setActiveExecutionDraft(null);
    setForm(createBlankForm());
    setCurrentStep(1);
    setIsAddExecutionOpen(false);
  };

  // Add Custom Items Handlers
  const handleAddCustomModel = () => {
    if (!newModelInput.trim()) return;
    const clean = newModelInput.trim();
    if (!customModels.includes(clean)) {
      setCustomModels(prev => [...prev, clean]);
    }
    setForm(prev => ({ ...prev, model: clean }));
    setNewModelInput('');
  };

  const handleAddCustomDOL = () => {
    if (!newDOLLabel.trim()) return;
    const clean = newDOLLabel.trim();
    if (!customDOLs.some(d => d.label === clean)) {
      setCustomDOLs(prev => [...prev, { label: clean, color: newDOLColor }]);
    }
    setForm(prev => ({ ...prev, dol: clean }));
    setNewDOLLabel('');
  };

  const handleAddCustomPO3Time = () => {
    const formatted = sanitizeHHMM(newPO3TimeInput);
    if (!formatted || formatted.length < 5) {
      addToast('Please enter time in hh:mm format (e.g. 09:45).', 'error');
      return;
    }
    if (!customPO3Times.includes(formatted)) {
      setCustomPO3Times(prev => [...prev, formatted]);
    }
    // Toggle in form.po3Times
    setForm(prev => {
      const current = prev.po3Times || [];
      const updated = current.includes(formatted) ? current : [...current, formatted];
      return { ...prev, po3Times: updated };
    });
    setNewPO3TimeInput('');
  };

  const handleAddCustomEntryTF = () => {
    if (!newEntryTFInput.trim()) return;
    const clean = newEntryTFInput.trim();
    if (!customEntryTFs.includes(clean)) {
      setCustomEntryTFs(prev => [...prev, clean]);
    }
    setForm(prev => ({ ...prev, entryTf: clean }));
    setNewEntryTFInput('');
  };

  const handleAddCustomPsychTag = () => {
    if (!newPsychInput.trim()) return;
    const clean = newPsychInput.trim();
    if (!customPsychTags.includes(clean)) {
      setCustomPsychTags(prev => [...prev, clean]);
    }
    setForm(prev => {
      const current = prev.psychTags || [];
      const updated = current.includes(clean) ? current : [...current, clean];
      return { ...prev, psychTags: updated };
    });
    setNewPsychInput('');
  };

  // Image Upload Handlers for Multi-Images
  const handleMultiImageUpload = (category, files) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm(prev => ({
          ...prev,
          [category]: [...(prev[category] || []), e.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
    addToast(`Added images to ${category.replace('Images', '').toUpperCase()}.`, 'info');
  };

  const handleRemoveImage = (category, index) => {
    setForm(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter((_, i) => i !== index)
    }));
  };

  const createBlankForm = () => {
    const today = new Date();
    return {
      id: `exec-${Date.now()}`,
      date: today.toISOString().split('T')[0],
      symbol: 'NQ',
      rating: 'A+',
      wl: 'Win',
      bias: 'Long',
      model: '',
      dol: '',
      entryTf: '',
      session: 'New York',
      po3Times: [],
      sl: '15.00',
      tp: '37.50',
      rr: '+2.5',
      executionTime: '09:48',
      outcomeTimeStart: '09:45',
      outcomeTimeEnd: '10:15',
      emotion: '🎯 Focused',
      psychTags: [],
      notes: '',
      ltfImages: [],
      mtfImages: [],
      htfImages: [],
      outcomeImages: [],
      day: today.toLocaleDateString('en-US', { weekday: 'long' }),
      month: today.toLocaleDateString('en-US', { month: 'long' }),
      timestamp: Date.now()
    };
  };

  const handleSaveExecution = async () => {
    try {
      const po3Val = (Array.isArray(form.po3Times) && form.po3Times.length > 0)
        ? form.po3Times.join(', ')
        : (form.po3 && form.po3 !== 'N/A' ? form.po3 : 'Standard PO3');

      const record = {
        ...form,
        po3: po3Val,
        outcomeTime: `${form.outcomeTimeStart || '09:45'} - ${form.outcomeTimeEnd || '10:15'}`,
        timestamp: Date.now()
      };
      await db.executions.put(record);
      localStorage.removeItem('hollowExecutionDraft');
      setForm(createBlankForm());
      setCurrentStep(1);
      addToast('Execution saved successfully!', 'success');
      setIsAddExecutionOpen(false);
    } catch (err) {
      console.error('Failed to save execution:', err);
      addToast('Failed to save execution.', 'error');
    }
  };

  const totalSteps = 4;

  const stepsHeader = [
    { num: 1, title: 'Session & Setup', desc: 'Date, NQ/ES, Long/Short, W/L & Rating' },
    { num: 2, title: 'Model & Framework', desc: 'Models, DOL color, PO3 times, SL/TP' },
    { num: 3, title: 'Timings & Multi-Charts', desc: 'Execution time, outcome & multi-images' },
    { num: 4, title: 'Mindset & Reflections', desc: 'Emoji emotions, psych pills & notes' }
  ];

  // Escape key handler to close modal effortlessly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAddExecutionOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddExecutionOpen]);

  if (!isAddExecutionOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '0' : '16px',
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          cursor: 'pointer'
        }}
      >
        {/* Ambient Halo */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            width: '540px',
            height: '540px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(184, 110, 255, 0.15) 0%, rgba(184, 110, 255, 0.03) 60%, rgba(0,0,0,0) 80%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }} />
        )}

        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
          transition={isMobile ? { type: 'spring', damping: 28, stiffness: 240 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '680px',
            background: '#09090b',
            border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: isMobile ? '24px 24px 0 0' : '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            maxHeight: isMobile ? '92vh' : 'auto',
            cursor: 'default'
          }}
        >
          {/* MODAL HEADER WITH STEP COUNTER & BACK/NEXT ARROWS */}
          <div style={{
            padding: isMobile ? '12px 14px' : '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                style={{
                  background: currentStep > 1 ? 'rgba(184, 110, 255, 0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${currentStep > 1 ? 'rgba(184, 110, 255, 0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: currentStep > 1 ? '#d8b4ff' : 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentStep > 1 ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}
                title="Previous step"
              >
                <ChevronLeft size={20} />
              </button>

              <div>
                <div style={{ fontSize: isMobile ? '10px' : '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#b86eff', fontWeight: '700' }}>
                  Step {currentStep} of {totalSteps} — {stepsHeader[currentStep - 1].title}
                </div>
                {!isMobile && (
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {stepsHeader[currentStep - 1].desc}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                disabled={currentStep === totalSteps}
                style={{
                  background: currentStep < totalSteps ? 'rgba(184, 110, 255, 0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${currentStep < totalSteps ? 'rgba(184, 110, 255, 0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: currentStep < totalSteps ? '#d8b4ff' : 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentStep < totalSteps ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}
                title="Next step"
              >
                <ChevronRight size={20} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* STEP PROGRESS INDICATOR */}
          <div style={{ display: 'flex', gap: '4px', padding: isMobile ? '0 14px' : '0 24px', marginTop: '12px' }}>
            {stepsHeader.map((s) => (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: currentStep >= s.num
                    ? 'linear-gradient(90deg, #b86eff, #8a30f6)'
                    : 'rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>

          <div style={{
            padding: isMobile ? '16px' : '24px',
            maxHeight: isMobile ? '72vh' : '68vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            touchAction: 'pan-y',
            background: isMobile ? '#000000' : '#09090b'
          }} className="hollow-menu-scrollbar">

            <AnimatePresence mode="wait">
              {/* STEP 1: SESSION & CORE SETUP */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#0e0e12',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* 1. ASSETS: NQ (Blue) & ES (Red) */}
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset</label>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        {ASSET_OPTS.map(a => {
                          const isSel = form.symbol === a.value;
                          return (
                            <button
                              key={a.value}
                              type="button"
                              onClick={() => setForm({ ...form, symbol: a.value })}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                border: isSel ? `1.5px solid ${a.color}` : '1px solid rgba(255,255,255,0.08)',
                                background: isSel ? a.bg : 'rgba(255,255,255,0.03)',
                                color: isSel ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                fontSize: '13px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: isSel ? `0 0 14px ${a.color}40` : 'none'
                              }}
                            >
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color }} />
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Side (Long/Short) & W/L Outcome */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Side (Long / Short)</label>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        {SIDE_OPTS.map(s => {
                          const isSel = form.bias === s.value;
                          const IconComp = s.icon;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => setForm({ ...form, bias: s.value })}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                border: isSel ? `1.5px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)',
                                background: isSel ? s.bg : 'rgba(255,255,255,0.03)',
                                color: isSel ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <IconComp size={15} color={isSel ? s.color : 'inherit'} />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>W/L Outcome</label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {WL_OPTS.map(w => {
                          if (w.value === 'BE') {
                            const isBeSel = (form.wl || '').toUpperCase().startsWith('BE');
                            return (
                              <div
                                key="BE"
                                style={{ flex: 1, position: 'relative' }}
                                onMouseEnter={() => setShowBeMenu(true)}
                                onMouseLeave={() => setShowBeMenu(false)}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isBeSel) {
                                      setForm({ ...form, wl: 'BE -> WIN' });
                                    }
                                    setShowBeMenu(prev => !prev);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 4px',
                                    borderRadius: '12px',
                                    border: isBeSel ? `1.5px solid ${w.color}` : '1px solid rgba(255,255,255,0.08)',
                                    background: isBeSel ? w.bg : 'rgba(255,255,255,0.03)',
                                    color: isBeSel ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {isBeSel ? form.wl : 'BE ▾'}
                                </button>
                                {/* Hover Popover for BE sub-options */}
                                <AnimatePresence>
                                  {showBeMenu && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        zIndex: 9999,
                                        background: '#12101e',
                                        border: '1px solid rgba(255, 214, 10, 0.4)',
                                        borderRadius: '12px',
                                        padding: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
                                        minWidth: '125px'
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setForm({ ...form, wl: 'BE -> WIN' });
                                          setShowBeMenu(false);
                                        }}
                                        style={{
                                          padding: '7px 10px',
                                          borderRadius: '8px',
                                          border: form.wl === 'BE -> WIN' ? '1px solid #30d158' : '1px solid rgba(48, 209, 88, 0.25)',
                                          background: form.wl === 'BE -> WIN' ? 'rgba(48, 209, 88, 0.25)' : 'rgba(48, 209, 88, 0.08)',
                                          color: '#30d158',
                                          fontSize: '11px',
                                          fontWeight: '800',
                                          cursor: 'pointer',
                                          textAlign: 'center',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        BE → WIN
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setForm({ ...form, wl: 'BE -> LOSS' });
                                          setShowBeMenu(false);
                                        }}
                                        style={{
                                          padding: '7px 10px',
                                          borderRadius: '8px',
                                          border: form.wl === 'BE -> LOSS' ? '1px solid #ff453a' : '1px solid rgba(255, 69, 58, 0.25)',
                                          background: form.wl === 'BE -> LOSS' ? 'rgba(255, 69, 58, 0.25)' : 'rgba(255, 69, 58, 0.08)',
                                          color: '#ff453a',
                                          fontSize: '11px',
                                          fontWeight: '800',
                                          cursor: 'pointer',
                                          textAlign: 'center',
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        BE → LOSS
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }

                          const isSel = form.wl === w.value;
                          return (
                            <button
                              key={w.value}
                              type="button"
                              onClick={() => setForm({ ...form, wl: w.value })}
                              style={{
                                flex: 1,
                                padding: '10px 6px',
                                borderRadius: '12px',
                                border: isSel ? `1.5px solid ${w.color}` : '1px solid rgba(255,255,255,0.08)',
                                background: isSel ? w.bg : 'rgba(255,255,255,0.03)',
                                color: isSel ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                fontSize: '12px',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              {w.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 2. RATINGS: A+, A, B, F */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Setup Rating (A+ / A / B / F)</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      {RATING_OPTS.map(r => {
                        const isSel = form.rating === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setForm({ ...form, rating: r.value })}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '12px',
                              border: isSel ? `1.5px solid ${r.color}` : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? r.bg : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.5)',
                              fontSize: '14px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              boxShadow: isSel ? `0 0 14px ${r.color}40` : 'none'
                            }}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Session Selection */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      {[
                        { value: 'Asian', label: 'Asia', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.16)' },
                        { value: 'London', label: 'London', color: '#64d2ff', bg: 'rgba(100, 210, 255, 0.16)' },
                        { value: 'New York', label: 'NY', color: '#b86eff', bg: 'rgba(184, 110, 255, 0.16)' }
                      ].map(s => {
                        const isSel = form.session === s.value || (s.value === 'New York' && !form.session);
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setForm({ ...form, session: s.value })}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '12px',
                              border: isSel ? `1.5px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? s.bg : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.5)',
                              fontSize: '13px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: isSel ? `0 0 14px ${s.color}25` : 'none',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day & Month Auto Display */}
                  <div style={{ display: 'flex', gap: '12px', background: '#0e0e12', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ flex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                      Day: <strong style={{ color: '#fff' }}>{form.day}</strong>
                    </div>
                    <div style={{ flex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                      Month: <strong style={{ color: '#fff' }}>{form.month}</strong>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: MODEL & TECHNICAL FRAMEWORK */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
                >
                  {/* 3. DYNAMIC CUSTOM MODELS */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Model</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {customModels.map(m => {
                        const isSel = form.model === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setForm({ ...form, model: m })}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '100px',
                              border: isSel ? '1.5px solid #b86eff' : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? 'rgba(184, 110, 255, 0.22)' : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              fontSize: '12px',
                              fontWeight: isSel ? '700' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Type custom model..."
                        value={newModelInput}
                        onChange={e => setNewModelInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustomModel(); }}
                        style={{
                          flex: 1,
                          background: '#14121d',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomModel}
                        style={{
                          background: '#b86eff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#000',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        + Add Model
                      </button>
                    </div>
                  </div>

                  {/* 4. CUSTOM DOL WITH COLOR PICKER (MULTI-SELECT) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draw on Liquidity (DOL - Multi-Select)</label>
                      {form.dol && (
                        <span style={{ fontSize: '11px', color: '#b86eff', fontWeight: '700' }}>Selected: {form.dol}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {customDOLs.map(d => {
                        const currentDols = form.dols || (form.dol ? form.dol.split(', ').map(s => s.trim()).filter(Boolean) : []);
                        const isSel = currentDols.includes(d.label);
                        return (
                          <button
                            key={d.label}
                            type="button"
                            onClick={() => {
                              const updatedDols = isSel 
                                ? currentDols.filter(x => x !== d.label) 
                                : [...currentDols, d.label];
                              setForm({ ...form, dols: updatedDols, dol: updatedDols.join(', ') });
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '100px',
                              border: isSel ? `1.5px solid ${d.color}` : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? `${d.color}25` : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              fontSize: '12px',
                              fontWeight: isSel ? '700' : '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '10px',
                      marginTop: '10px',
                      alignItems: isMobile ? 'stretch' : 'center'
                    }}>
                      <input
                        type="text"
                        placeholder="New DOL target..."
                        value={newDOLLabel}
                        onChange={e => setNewDOLLabel(e.target.value)}
                        style={{
                          flex: 1,
                          background: '#14121d',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        {/* Color Palette Swatches */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {COLOR_SWATCHES.map(c => (
                            <div
                              key={c}
                              onClick={() => setNewDOLColor(c)}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: c,
                                cursor: 'pointer',
                                border: newDOLColor === c ? '2px solid #fff' : 'none'
                              }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomDOL}
                          style={{
                            background: newDOLColor,
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#000',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          + Add DOL
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* 5. PO3 TIMES (hh:mm format, multi-select) */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PO3 Times (hh:mm, Multi-Select)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {customPO3Times.map(t => {
                        const isSel = (form.po3Times || []).includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setForm(prev => {
                                const curr = prev.po3Times || [];
                                const updated = curr.includes(t) ? curr.filter(x => x !== t) : [...curr, t];
                                return { ...prev, po3Times: updated };
                              });
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '100px',
                              border: isSel ? '1.5px solid #ff9f0a' : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? 'rgba(255, 159, 10, 0.22)' : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              fontSize: '12px',
                              fontWeight: isSel ? '700' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            {t} {isSel && '✓'}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Add time (hh:mm, e.g. 09:45)..."
                        value={newPO3TimeInput}
                        onChange={e => setNewPO3TimeInput(sanitizeHHMM(e.target.value))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustomPO3Time(); }}
                        style={{
                          flex: 1,
                          background: '#14121d',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPO3Time}
                        style={{
                          background: '#ff9f0a',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#000',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        + Add Time
                      </button>
                    </div>
                  </div>

                  {/* 6. ENTRY TIMEFRAME */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entry Timeframe</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {customEntryTFs.map(tf => {
                        const isSel = form.entryTf === tf;
                        return (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setForm({ ...form, entryTf: tf })}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '100px',
                              border: isSel ? '1.5px solid #64d2ff' : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? 'rgba(100, 210, 255, 0.22)' : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              fontSize: '12px',
                              fontWeight: isSel ? '700' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            {tf}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Type entry TF (e.g. 2m)..."
                        value={newEntryTFInput}
                        onChange={e => setNewEntryTFInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustomEntryTF(); }}
                        style={{
                          flex: 1,
                          background: '#14121d',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomEntryTF}
                        style={{
                          background: '#64d2ff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#000',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        + Add TF
                      </button>
                    </div>
                  </div>

                  {/* SL / TP / R:R */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SL (Stop Loss)</label>
                      <input
                        type="text"
                        placeholder="15.00"
                        value={form.sl}
                        onChange={e => setForm({ ...form, sl: e.target.value })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#14121d',
                          border: '1px solid rgba(255,69,58,0.3)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TP (Take Profit)</label>
                      <input
                        type="text"
                        placeholder="37.50"
                        value={form.tp}
                        onChange={e => setForm({ ...form, tp: e.target.value })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#14121d',
                          border: '1px solid rgba(48,209,88,0.3)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outcome (RR)</label>
                      <input
                        type="text"
                        placeholder="+2.5"
                        value={form.rr}
                        onChange={e => setForm({ ...form, rr: e.target.value })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#14121d',
                          border: '1px solid rgba(255,214,10,0.3)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: TIMINGS & MULTI-TIMEFRAME CHARTS */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
                >
                  {/* 7. STRICT HH:MM TIME VALIDATION */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Execution (hh:mm)</label>
                      <input
                        type="text"
                        placeholder="09:48"
                        value={form.executionTime}
                        onChange={e => setForm({ ...form, executionTime: sanitizeHHMM(e.target.value) })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#14121d',
                          border: '1px solid rgba(184,110,255,0.3)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outcome Start (hh:mm)</label>
                      <input
                        type="text"
                        placeholder="09:45"
                        value={form.outcomeTimeStart}
                        onChange={e => setForm({ ...form, outcomeTimeStart: sanitizeHHMM(e.target.value) })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#14121d',
                          border: '1px solid rgba(100,210,255,0.3)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outcome End (hh:mm)</label>
                      <input
                        type="text"
                        placeholder="10:15"
                        value={form.outcomeTimeEnd}
                        onChange={e => setForm({ ...form, outcomeTimeEnd: sanitizeHHMM(e.target.value) })}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: '#14121d',
                          border: '1px solid rgba(100,210,255,0.3)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* 8. MULTI-IMAGE CATEGORY UPLOADS (LTF / MTF / HTF / OUTCOME) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { key: 'htfImages', label: 'HTF Charts', color: '#bf5af2' },
                      { key: 'mtfImages', label: 'MTF Charts', color: '#64d2ff' },
                      { key: 'ltfImages', label: 'LTF Charts', color: '#30d158' },
                      { key: 'outcomeImages', label: 'OUTCOME Photos', color: '#ffd60a' }
                    ].map(({ key, label, color }) => {
                      const imgList = form[key] || [];
                      return (
                        <div key={key} style={{ background: '#14121d', borderRadius: '16px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ImageIcon size={15} /> {label} ({imgList.length})
                            </div>
                            <label style={{
                              background: `${color}25`,
                              border: `1px solid ${color}55`,
                              borderRadius: '8px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#fff',
                              cursor: 'pointer'
                            }}>
                              + Add Photo
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={e => handleMultiImageUpload(key, e.target.files)}
                                style={{ display: 'none' }}
                              />
                            </label>
                          </div>

                          {imgList.length === 0 ? (
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                              No photos added yet. Click "+ Add Photo" to attach screenshots.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }} className="hollow-menu-scrollbar">
                              {imgList.map((src, idx) => (
                                <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                                  <img 
                                    src={src} 
                                    alt={`${label}-${idx}`} 
                                    onClick={() => {
                                      setActiveViewerImage({ key, index: idx });
                                      setZoomScale(1);
                                    }}
                                    style={{ 
                                      width: '100px', 
                                      height: '70px', 
                                      objectFit: 'cover', 
                                      borderRadius: '8px', 
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      cursor: 'pointer'
                                    }} 
                                  />
                                  <button
                                    onClick={() => handleRemoveImage(key, idx)}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      background: 'rgba(0,0,0,0.7)',
                                      border: 'none',
                                      borderRadius: '50%',
                                      color: '#ff453a',
                                      width: '20px',
                                      height: '20px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 4: PSYCHOLOGY & REFLECTIONS */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
                >
                  {/* 10. EMOTION SYMBOLS */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emotion / Mood Symbol</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
                      gap: '8px',
                      marginTop: '6px'
                    }}>
                      {EMOTIONS.map(e => {
                        const isSel = form.emotion === e.value;
                        return (
                          <button
                            key={e.value}
                            type="button"
                            onClick={() => setForm({ ...form, emotion: e.value })}
                            style={{
                              padding: '10px 4px',
                              borderRadius: '14px',
                              border: isSel ? `1.5px solid ${e.color}` : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? `${e.color}25` : 'rgba(255,255,255,0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{e.emoji}</span>
                            <span style={{ fontSize: '10px', color: isSel ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: isSel ? '700' : '500' }}>
                              {e.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 10.1 CUSTOM PSYCHOLOGY PILLS */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Psychology & Execution Tags (Multi-Select)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {customPsychTags.map(tag => {
                        const isSel = (form.psychTags || []).includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setForm(prev => {
                                const curr = prev.psychTags || [];
                                const updated = curr.includes(tag) ? curr.filter(x => x !== tag) : [...curr, tag];
                                return { ...prev, psychTags: updated };
                              });
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '100px',
                              border: isSel ? '1.5px solid #30d158' : '1px solid rgba(255,255,255,0.08)',
                              background: isSel ? 'rgba(48, 209, 88, 0.22)' : 'rgba(255,255,255,0.03)',
                              color: isSel ? '#ffffff' : 'rgba(255,255,255,0.6)',
                              fontSize: '12px',
                              fontWeight: isSel ? '700' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            {tag} {isSel && '✓'}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Add custom mindset tag..."
                        value={newPsychInput}
                        onChange={e => setNewPsychInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustomPsychTag(); }}
                        style={{
                          flex: 1,
                          background: '#14121d',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          color: '#fff',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPsychTag}
                        style={{
                          background: '#30d158',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#000',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        + Add Tag
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Execution Notes & Takeaways</label>
                    <textarea
                      rows={4}
                      placeholder="Detail your execution entry trigger, liquidity sweep, and management thoughts..."
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      style={{
                        width: '100%',
                        marginTop: '6px',
                        background: '#14121d',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="#b86eff" /> Auto-saved as draft on change
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  style={{
                    background: 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 20px rgba(138, 48, 246, 0.4)'
                  }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveExecution}
                  style={{
                    background: 'linear-gradient(135deg, #30d158 0%, #24b045 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 22px',
                    color: '#000',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 20px rgba(48, 209, 88, 0.3)'
                  }}
                >
                  <Save size={16} /> Save Execution
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeViewerImage && (() => {
          const { key, index } = activeViewerImage;
          const imgList = form[key] || [];
          const currentSrc = imgList[index];

          const handleViewerClose = () => {
            setActiveViewerImage(null);
          };

          const handleViewerPrev = () => {
            if (index > 0) {
              setActiveViewerImage({ key, index: index - 1 });
              setZoomScale(1);
            }
          };

          const handleViewerNext = () => {
            if (index < imgList.length - 1) {
              setActiveViewerImage({ key, index: index + 1 });
              setZoomScale(1);
            }
          };

          const handleViewerDelete = () => {
            handleRemoveImage(key, index);
            if (imgList.length <= 1) {
              setActiveViewerImage(null);
            } else {
              const nextIndex = index === imgList.length - 1 ? index - 1 : index;
              setActiveViewerImage({ key, index: nextIndex });
              setZoomScale(1);
            }
          };

          const handleViewerReplace = (files) => {
            if (!files || files.length === 0) return;
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
              setForm(prev => {
                const updatedList = [...(prev[key] || [])];
                updatedList[index] = e.target.result;
                return { ...prev, [key]: updatedList };
              });
              addToast('Photo replaced successfully.', 'success');
            };
            reader.readAsDataURL(file);
          };

          const handleSwapLeft = () => {
            if (index > 0) {
              setForm(prev => {
                const updatedList = [...(prev[key] || [])];
                const temp = updatedList[index];
                updatedList[index] = updatedList[index - 1];
                updatedList[index - 1] = temp;
                return { ...prev, [key]: updatedList };
              });
              setActiveViewerImage({ key, index: index - 1 });
            }
          };

          const handleSwapRight = () => {
            if (index < imgList.length - 1) {
              setForm(prev => {
                const updatedList = [...(prev[key] || [])];
                const temp = updatedList[index];
                updatedList[index] = updatedList[index + 1];
                updatedList[index + 1] = temp;
                return { ...prev, [key]: updatedList };
              });
              setActiveViewerImage({ key, index: index + 1 });
            }
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(5, 5, 8, 0.95)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                boxSizing: 'border-box',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {/* Close Button Top Right */}
              <button
                onClick={handleViewerClose}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  color: '#fff',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20
                }}
              >
                <X size={20} />
              </button>

              {/* Main Image Frame */}
              <div style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                width: '100%',
                maxHeight: 'calc(100% - 100px)'
              }}>
                <motion.img
                  key={currentSrc}
                  src={currentSrc}
                  alt={`viewer-${index}`}
                  animate={{ scale: zoomScale }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 24px 70px rgba(0,0,0,0.8)',
                    cursor: zoomScale > 1 ? 'grab' : 'default'
                  }}
                />
              </div>

              {/* Control Panel Floating bar */}
              <div style={{
                background: 'rgba(18, 18, 24, 0.75)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '24px',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginTop: '20px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                zIndex: 10
              }}>
                {/* Prev Photo Arrow */}
                <button
                  disabled={index === 0}
                  onClick={handleViewerPrev}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: index === 0 ? 'rgba(255,255,255,0.15)' : '#fff',
                    cursor: index === 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Previous Photo"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Swap / Reorder Left */}
                <button
                  disabled={index === 0}
                  onClick={handleSwapLeft}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: index === 0 ? 'rgba(255,255,255,0.15)' : '#64d2ff',
                    cursor: index === 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Reorder Left"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* Zoom Out Button */}
                <button
                  disabled={zoomScale <= 1}
                  onClick={() => setZoomScale(prev => Math.max(1, prev - 0.25))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: zoomScale <= 1 ? 'rgba(255,255,255,0.15)' : '#fff',
                    cursor: zoomScale <= 1 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>

                {/* Current Photo Index Capsule */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  userSelect: 'none'
                }}>
                  {index + 1} / {imgList.length}
                </div>

                {/* Zoom In Button */}
                <button
                  disabled={zoomScale >= 3}
                  onClick={() => setZoomScale(prev => Math.min(3, prev + 0.25))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: zoomScale >= 3 ? 'rgba(255,255,255,0.15)' : '#fff',
                    cursor: zoomScale >= 3 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>

                {/* Swap / Reorder Right */}
                <button
                  disabled={index === imgList.length - 1}
                  onClick={handleSwapRight}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: index === imgList.length - 1 ? 'rgba(255,255,255,0.15)' : '#64d2ff',
                    cursor: index === imgList.length - 1 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Reorder Right"
                >
                  <ArrowRight size={18} />
                </button>

                {/* Next Photo Arrow */}
                <button
                  disabled={index === imgList.length - 1}
                  onClick={handleViewerNext}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: index === imgList.length - 1 ? 'rgba(255,255,255,0.15)' : '#fff',
                    cursor: index === imgList.length - 1 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Next Photo"
                >
                  <ChevronRight size={20} />
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

                {/* Change / Replace Photo Button */}
                <label style={{
                  color: '#30d158',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px'
                }} title="Replace Photo">
                  <Upload size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleViewerReplace(e.target.files)}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Delete Photo Button */}
                <button
                  onClick={handleViewerDelete}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff453a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px'
                  }}
                  title="Delete Photo"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </AnimatePresence>
  );
}
