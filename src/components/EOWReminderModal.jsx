import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, ChevronRight, X, BookOpen, ShieldAlert } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { getISOWeekId } from '../utils/dateUtils';

export default function EOWReminderModal() {
  const { setView } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentWeekId, setCurrentWeekId] = useState('');

  useEffect(() => {
    const today = new Date();
    const isSunday = today.getDay() === 0;
    const weekId = getISOWeekId(today);
    setCurrentWeekId(weekId);

    // Show popup on Sundays if not already dismissed for this week
    const dismissed = localStorage.getItem(`eowReminderDismissed_${weekId}`);
    if (isSunday && !dismissed) {
      // Delay slightly for smooth app load entrance
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    if (currentWeekId) {
      localStorage.setItem(`eowReminderDismissed_${currentWeekId}`, 'true');
    }
    setIsOpen(false);
  };

  const handleGoToWeeklyReview = () => {
    handleDismiss();
    setView('weeklyReview');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#0f0f11',
            border: '1px solid rgba(184, 110, 255, 0.3)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 20px 60px rgba(184, 110, 255, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Glow Backdrop */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'var(--colors-primary)',
            opacity: 0.12,
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }} />

          {/* Close Icon Button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>

          {/* Header Badge & Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(184, 110, 255, 0.12)',
              border: '1px solid rgba(184, 110, 255, 0.3)',
              padding: '4px 12px',
              borderRadius: '20px',
              width: 'fit-content',
              fontSize: '11px',
              fontWeight: '700',
              color: '#b86eff',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Sparkles size={12} color="#b86eff" /> Sunday Routine • {currentWeekId}
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              End of Week (EOW) Review
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--colors-stone)', margin: 0, lineHeight: '1.5' }}>
              Sunday is here — time to audit your execution, complete your psychological reflex notes, and lock in your key takeaways for the week!
            </p>
          </div>

          {/* Highlights checklist cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={16} color="var(--colors-primary)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Execution Log</span>
                <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>Mon–Fri trades</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '12px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={16} color="#30d158" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>Behavioral Audit</span>
                <span style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>A+ Setup Quality</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Remind Me Later
            </button>
            <button
              onClick={handleGoToWeeklyReview}
              style={{
                background: 'var(--colors-primary)',
                border: 'none',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(184, 110, 255, 0.4)'
              }}
            >
              Start EOW Review <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
