import React from 'react';
import { motion } from 'framer-motion';

/**
 * HollowLogo — Animated Translucent Purple Ghost Brand Symbol & Glowing Wordmark
 */
export default function HollowLogo({
  size = 40,
  showText = true,
  textSize,
  color = '#ffffff',
  animated = true,
  style = {}
}) {
  const derivedTextSize = textSize || Math.round(size * 0.7);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'visible', ...style }}>
      {/* Animated Glowing Purple Ghost Icon Container */}
      <motion.div
        animate={animated ? {
          y: [0, -3.5, 0]
        } : {}}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: 'easeInOut'
        }}
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'visible'
        }}
      >
        {/* Pulsing Outer Purple Soft Feathered Glow Halo */}
        <motion.div
          animate={animated ? {
            scale: [0.9, 1.1, 0.9],
            opacity: [0.45, 0.8, 0.45]
          } : {}}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut'
          }}
          style={{
            position: 'absolute',
            inset: '-10%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(184, 110, 255, 0.55) 0%, rgba(138, 48, 246, 0.18) 45%, rgba(0, 0, 0, 0) 70%)',
            filter: 'blur(8px)',
            pointerEvents: 'none'
          }}
        />

        {/* High-Resolution Translucent Purple Ghost Image */}
        <img
          src="/ghost-logo.png"
          alt="Hollow Ghost Symbol"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 1,
            display: 'block',
            filter: 'drop-shadow(0 0 8px rgba(184, 110, 255, 0.65))'
          }}
        />
      </motion.div>

      {showText && (
        <span
          style={{
            fontFamily: "var(--font-logo, 'Inter', sans-serif)",
            fontWeight: 800,
            fontSize: `${derivedTextSize}px`,
            letterSpacing: '-0.03em',
            color,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textShadow: '0 0 16px rgba(184, 110, 255, 0.35)'
          }}
        >
          Hollow.
        </span>
      )}
    </div>
  );
}
