import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { syncWithSupabase, seedDatabaseIfEmpty } from '../db/hollowDb';
import HollowLogo from './HollowLogo';

export default function LoadingScreen({ session, onComplete }) {
  const [progress, setProgress] = useState(15);
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

        setProgress(40);
        await new Promise(r => setTimeout(r, 180));

        try {
          await syncWithSupabase();
        } catch (err) {
          console.error('Sync error:', err);
        }

        if (active) setProgress(80);
        await new Promise(r => setTimeout(r, 180));

        try {
          await seedDatabaseIfEmpty();
        } catch (err) {
          console.error('Seeding error:', err);
        }

        if (active) setProgress(100);
        await new Promise(r => setTimeout(r, 180));

        if (active) onCompleteRef.current();
      } catch (e) {
        console.error('Loading error:', e);
        if (active) onCompleteRef.current();
      }
    }

    runInitialization();

    return () => { active = false; };
  }, [session]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Dynamic Purple Ambient Glow Aura */}
      <motion.div
        animate={{
          scale: [0.95, 1.25, 0.95],
          opacity: [0.45, 0.8, 0.45]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184, 110, 255, 0.55) 0%, rgba(138, 48, 246, 0.22) 50%, rgba(0, 0, 0, 0) 80%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      {/* Centered Large Glowing Logo Hero */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          zIndex: 10
        }}
      >
        <HollowLogo size={96} showText={true} textSize={52} color="#ffffff" animated={true} />
      </motion.div>

      {/* Minimalist Glowing Purple Progress Line */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        width: 160,
        height: 3,
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 10
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #c27eff, #8a30f6)',
            boxShadow: '0 0 16px rgba(194, 126, 255, 0.9)'
          }}
        />
      </div>
    </div>
  );
}
