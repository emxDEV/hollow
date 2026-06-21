import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, BookOpen, Layers, ArrowRight, Check } from 'lucide-react';
import { APP_VERSION as CURRENT_VERSION } from '../utils/version';

export default function WelcomeUpdateModal({ isMobile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'welcome' | 'update'
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hollowHasSeenIntro') === 'true';
    const lastSeenVersion = localStorage.getItem('hollowLastSeenVersion');

    if (!hasSeenIntro) {
      setMode('welcome');
      setIsOpen(true);
    } else if (lastSeenVersion !== CURRENT_VERSION) {
      setMode('update');
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('hollowHasSeenIntro', 'true');
    localStorage.setItem('hollowLastSeenVersion', CURRENT_VERSION);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const welcomeSlides = [
    {
      title: "welcome to hollow.",
      subtitle: "Your stoic trading companion.",
      icon: (
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0a84ff, #bf5af2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(10, 132, 255, 0.3)'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2.5" />
          </svg>
        </div>
      ),
      bullets: [
        { title: "Cloud-Synced Journaling", desc: "Log trades with custom confluences, entry execution fills, and cognitive tags.", icon: BookOpen },
        { title: "Stoic Analytics & Edge", desc: "Calculate playbook win rates, session performance, and mistake tracking.", icon: Sparkles },
        { title: "Training & Routine Logs", desc: "Stay disciplined by reviewing daily habits, mental scores, and workout logs.", icon: Layers }
      ]
    },
    {
      title: "dual ecosystem.",
      subtitle: "Desktop depth meets mobile speed.",
      icon: (
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff9f0a, #ff453a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(255, 159, 10, 0.3)'
        }}>
          <Layers size={28} color="#fff" />
        </div>
      ),
      description: "Hollow replicates your workspace perfectly across devices. Dive deep into stats on the web, or quickly edit playbooks and fill execution logs on your phone. Backed up by secure cloud sync, your journal is always with you.",
      bullets: []
    },
    {
      title: "ready to trade.",
      subtitle: "Set up your parameters and begin.",
      icon: (
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #30d158, #0a84ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(48, 209, 88, 0.3)'
        }}>
          <Check size={28} color="#fff" />
        </div>
      ),
      description: "Start by selecting or adding your prop firm/personal trading account in the profile settings, creating your playbook models, and recording your first trade.",
      bullets: []
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 20
        }}
      >
        <motion.div
          initial={{ scale: 0.96, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          style={{
            width: '100%',
            maxWidth: 440,
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100vh' : '85vh',
            background: '#0f0f11',
            borderRadius: isMobile ? 0 : 24,
            border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: isMobile ? 'env(safe-area-inset-top, 44px)' : 0,
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 34px)' : 0
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px 12px',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}>
            <button
              onClick={handleDismiss}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Content Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {mode === 'welcome' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {/* Icon */}
                <div style={{ marginBottom: 20 }}>
                  {welcomeSlides[currentSlide].icon}
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                  textAlign: 'center',
                  marginBottom: 6,
                  letterSpacing: '-0.02em'
                }}>
                  {welcomeSlides[currentSlide].title}
                </h2>

                {/* Subtitle */}
                <p style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.4)',
                  textAlign: 'center',
                  marginBottom: 24
                }}>
                  {welcomeSlides[currentSlide].subtitle}
                </p>

                {/* Description or Bullets */}
                {welcomeSlides[currentSlide].description ? (
                  <p style={{
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    lineHeight: 1.6,
                    padding: '0 12px'
                  }}>
                    {welcomeSlides[currentSlide].description}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                    {welcomeSlides[currentSlide].bullets.map((b, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <b.icon size={18} color="rgba(255, 255, 255, 0.7)" />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{b.title}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.4 }}>{b.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Changelog Update Screen
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {/* Icon */}
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #bf5af2, #ff453a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  boxShadow: '0 0 24px rgba(191, 90, 242, 0.3)'
                }}>
                  <Sparkles size={28} color="#fff" />
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                  textAlign: 'center',
                  marginBottom: 6,
                  letterSpacing: '-0.02em'
                }}>
                  what's new in v{CURRENT_VERSION}
                </h2>

                {/* Subtitle */}
                <p style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.4)',
                  textAlign: 'center',
                  marginBottom: 24
                }}>
                  Latest updates to your Hollow workspace.
                </p>

                {/* Updates list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                  {[
                    { title: "Mobile Profile Editing", desc: "Directly modify Display Name, Trader Title, Timezone, Style, and Bio from the mobile profile tab." },
                    { title: "High-Fidelity Loading Screen", desc: "A beautiful, pulsing sync animation prevents layout shifts and ensures offline/online data consistency on boot." },
                    { title: "Monday-Start Calendar", desc: "Refactored calendar grids to a clean 6-day week format, skipping Sundays to match standard market sessions." }
                  ].map((upd, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#0a84ff',
                        marginTop: 6,
                        flexShrink: 0
                      }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{upd.title}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.4 }}>{upd.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flexShrink: 0
          }}>
            {mode === 'welcome' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                {welcomeSlides.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    style={{
                      width: currentSlide === idx ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: currentSlide === idx ? '#0a84ff' : 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            )}

            {mode === 'welcome' && currentSlide < welcomeSlides.length - 1 ? (
              <button
                onClick={() => setCurrentSlide(prev => prev + 1)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 14,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  outline: 'none'
                }}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0a84ff 0%, #0a84ffd0 100%)',
                  border: 'none',
                  borderRadius: 14,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(10, 132, 255, 0.2)',
                  outline: 'none'
                }}
              >
                {mode === 'welcome' ? "Enter Workspace" : "Got it, thanks!"}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
