import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { syncWithSupabase, seedDatabaseIfEmpty } from '../db/hollowDb';

export default function LoadingScreen({ session, onComplete }) {
  const [status, setStatus] = useState('initializing hollow...');
  const [progress, setProgress] = useState(10);

  // Keep a stable ref of onComplete so that it never re-runs the useEffect hook
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let active = true;

    async function runInitialization() {
      try {
        if (!session) {
          if (active) onCompleteRef.current();
          return;
        }

        // Step 1: Authenticating
        if (active) {
          setStatus('authorizing session...');
          setProgress(25);
        }
        await new Promise(r => setTimeout(r, 450)); // organic breathing room

        // Step 2: Syncing
        if (active) {
          setStatus('synchronizing cloud data...');
          setProgress(65);
        }
        try {
          await syncWithSupabase();
        } catch (err) {
          console.error('Initial sync failed:', err);
        }
        await new Promise(r => setTimeout(r, 350));

        // Step 3: Seeding
        if (active) {
          setStatus('preparing workspace...');
          setProgress(90);
        }
        try {
          await seedDatabaseIfEmpty();
        } catch (err) {
          console.error('Initial seeding failed:', err);
        }
        await new Promise(r => setTimeout(r, 400));

        // Step 4: Ready
        if (active) {
          setStatus('ready.');
          setProgress(100);
        }
        await new Promise(r => setTimeout(r, 300));

        if (active) {
          onCompleteRef.current();
        }
      } catch (err) {
        console.error('Initialization sequence failed:', err);
        if (active) onCompleteRef.current();
      }
    }

    runInitialization();

    return () => {
      active = false;
    };
  }, [session]); // Only depend on session

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'var(--font, -apple-system, BlinkMacSystemFont, sans-serif)'
      }}
    >
      {/* Subtle cloud backdrop for aesthetic depth */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(10, 132, 255, 0.15) 0%, rgba(191, 90, 242, 0.05) 50%, rgba(0, 0, 0, 0) 100%)',
        filter: 'blur(60px)',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      {/* Pulsing Brand Logo */}
      <motion.div
        animate={{ 
          scale: [1, 1.03, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 2, 
          ease: "easeInOut" 
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32,
          zIndex: 10
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2.5" />
        </svg>
        <span style={{ 
          fontSize: 22, 
          fontWeight: 800, 
          color: '#ffffff', 
          letterSpacing: '-0.03em' 
        }}>
          hollow.
        </span>
      </motion.div>

      {/* Progress Bar Container */}
      <div style={{
        width: 140,
        height: 2,
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
        zIndex: 10
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #0a84ff, #bf5af2)',
            boxShadow: '0 0 8px rgba(10, 132, 255, 0.4)'
          }}
        />
      </div>

      {/* Status text */}
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'lowercase',
          letterSpacing: '0.04em',
          zIndex: 10,
          height: 16
        }}
      >
        {status}
      </motion.div>
    </motion.div>
  );
}
