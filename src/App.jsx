import { useState, useEffect, useCallback } from 'react';
import { db, clearDatabase, subscribeToRealtimeSync } from './db/hollowDb';
import { supabase } from './db/supabaseClient';
import AuthView from './components/AuthView';
import LoadingScreen from './components/LoadingScreen';
import WelcomeUpdateModal from './components/WelcomeUpdateModal';
import EOWReminderModal from './components/EOWReminderModal';
import Sidebar from './components/Sidebar';
import AppBottomNav from './components/AppBottomNav';
import HollowLogo from './components/HollowLogo';
import DashboardView from './components/DashboardView';
import AnalyticsView from './components/AnalyticsView';
import CalendarView from './components/CalendarView';
import JournalView from './components/JournalView';
import WeeklyReviewView from './components/WeeklyReviewView';
import CognitiveAgentPanel from './components/CognitiveAgentPanel';
import SettingsView from './components/SettingsView';
import AddExecutionModal from './components/AddExecutionModal';
import './App.css';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from './store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const {
    view,
    setView,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile,
    setIsMobile,
    toasts,
    removeToast,
    addToast
  } = useUIStore();

  const [session, setSession] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [uiOptions, setUiOptions] = useState({ enableClouds: true });

  const handleLoadingComplete = useCallback(() => {
    setAppInitialized(true);
  }, []);

  // Handle auth session state reactively
  useEffect(() => {
    if (!supabase) return;

    const syncProfileFromMetadata = (user) => {
      if (!user || !user.user_metadata) return;
      const meta = user.user_metadata;
      let updated = false;

      const keys = [
        { metaKey: 'displayName', localKey: 'hollowDisplayName' },
        { metaKey: 'displayName', localKey: 'hollowUsername' },
        { metaKey: 'traderTitle', localKey: 'hollowTraderTitle' },
        { metaKey: 'timezone', localKey: 'hollowTimezone' },
        { metaKey: 'tradingStyle', localKey: 'hollowTradingStyle' },
        { metaKey: 'bio', localKey: 'hollowBio' },
        { metaKey: 'primaryMarket', localKey: 'hollowPrimaryMarket' },
        { metaKey: 'enableClouds', localKey: 'hollowEnableClouds', stringify: true },
        { metaKey: 'enableAutoBackup', localKey: 'hollowEnableAutoBackup', stringify: true }
      ];

      keys.forEach(({ metaKey, localKey, stringify }) => {
        if (meta[metaKey] !== undefined) {
          const val = stringify ? String(meta[metaKey]) : meta[metaKey];
          if (localStorage.getItem(localKey) !== val) {
            localStorage.setItem(localKey, val);
            updated = true;
          }
        }
      });

      if (updated) {
        window.dispatchEvent(new Event('hollowSettingsUpdated'));
      }
    };

    const checkHashForRecovery = () => {
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('recovery_token') || hash.includes('recovery'))) {
        setIsRecoveryMode(true);
      }
    };
    checkHashForRecovery();
    window.addEventListener('hashchange', checkHashForRecovery);

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
          syncProfileFromMetadata(session.user);
          localStorage.setItem('hollow_last_user_id', session.user.id);
        }
        if (!session) setAppInitialized(true);
      } catch (err) {
        console.error('Supabase session retrieval error:', err);
        setSession(null);
        setAppInitialized(true);
      } finally {
        setAuthLoaded(true);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      try {
        if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);

        if (event === 'SIGNED_IN') {
          const lastUserId = localStorage.getItem('hollow_last_user_id');
          const isSameUser = lastUserId && currentSession?.user && (lastUserId === currentSession.user.id);
          if (!isSameUser) {
            await clearDatabase();
            if (currentSession?.user) localStorage.setItem('hollow_last_user_id', currentSession.user.id);
            setSession(currentSession);
            if (currentSession) syncProfileFromMetadata(currentSession.user);
            setAppInitialized(false);
          } else {
            setSession(currentSession);
          }
        } else if (event === 'SIGNED_OUT') {
          await clearDatabase();
          localStorage.removeItem('hollow_last_user_id');
          setSession(null);
          setAppInitialized(true);
        } else {
          setSession(currentSession);
          if (currentSession) syncProfileFromMetadata(currentSession.user);
          if (!currentSession) setAppInitialized(true);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      }
      setAuthLoaded(true);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('hashchange', checkHashForRecovery);
    };
  }, []);

  // Real-time cross-device sync
  useEffect(() => {
    let unsubscribe = () => {};
    if (session) subscribeToRealtimeSync().then(fn => { unsubscribe = fn; });
    return () => { unsubscribe(); };
  }, [session]);

  useEffect(() => {
    const loadUIOptions = () => {
      const enableClouds = localStorage.getItem('hollowEnableClouds') !== 'false';
      setUiOptions({ enableClouds });
    };
    loadUIOptions();
    window.addEventListener('hollowSettingsUpdated', loadUIOptions);
    return () => window.removeEventListener('hollowSettingsUpdated', loadUIOptions);
  }, []);

  // Detect mobile screen width
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // ── EARLY RETURNS ────────────────────────────────────────────────
  if (!supabase) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0a0a0c', color: '#ff453a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', padding: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Supabase Configuration Missing</h2>
      </div>
    );
  }

  if (!authLoaded) {
    return <div style={{ minHeight: '100dvh', background: 'var(--colors-canvas-dark)' }} />;
  }

  if (isRecoveryMode) {
    return <AuthView initialMode="reset" onResetComplete={() => { setIsRecoveryMode(false); window.location.hash = ''; }} />;
  }

  if (session && !appInitialized) {
    return <LoadingScreen session={session} onComplete={handleLoadingComplete} />;
  }

  if (!session) {
    return <AuthView />;
  }

  // ── MAIN AUTHENTICATED APP ────────────────────────────────────────
  // Layout: column flex from root → row flex for sidebar+content
  // Each view manages its own scroll internally.
  // AppBottomNav is position:fixed so it sits above the layout without affecting it.
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--colors-canvas-dark)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient glow background */}
      {uiOptions.enableClouds && (
        <div className="cloudy-backdrop">
          <div className="cloud-blur cloud-1" />
          <div className="cloud-blur cloud-2" />
          <div className="cloud-blur cloud-3" />
          <div className="cloud-blur cloud-4" />
        </div>
      )}

      <WelcomeUpdateModal isMobile={isMobile} />
      <EOWReminderModal />
      <AddExecutionModal />

      {/* Redesigned Premium Mobile Top Bar with Notch Support */}
      {isMobile && (
        <div style={{
          paddingTop: 'env(safe-area-inset-top)',
          background: 'rgba(10, 8, 16, 0.82)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          borderBottom: '1px solid rgba(184, 110, 255, 0.12)',
          zIndex: 100,
          flexShrink: 0,
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            height: '56px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            {/* Left brand signature */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HollowLogo size={22} showText={false} />
              <span style={{
                fontSize: '15px',
                fontWeight: '900',
                letterSpacing: '-0.03em',
                color: '#ffffff',
                fontFamily: "var(--font-logo, 'Inter', sans-serif)",
                textShadow: '0 0 12px rgba(184, 110, 255, 0.3)'
              }}>
                hollow.
              </span>
            </div>

            {/* Absolute Centered View Name */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '12px',
              fontWeight: 800,
              color: '#d8b4ff',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textShadow: '0 0 16px rgba(184, 110, 255, 0.4)',
              fontFamily: 'var(--font-heading)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}>
              {view === 'dashboard' && 'Dashboard'}
              {view === 'analytics' && 'Analytics'}
              {view === 'calendar' && 'Calendar'}
              {view === 'journal' && 'Journal'}
              {view === 'weeklyReview' && 'Weekly Review'}
              {view === 'settings' && 'Settings'}
            </div>

            {/* Right Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(48, 209, 88, 0.08)',
              border: '1px solid rgba(48, 209, 88, 0.2)',
              padding: '4px 8px',
              borderRadius: '20px',
              fontSize: '9px',
              fontWeight: '800',
              color: '#30d158',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#30d158',
                boxShadow: '0 0 6px #30d158',
                display: 'inline-block'
              }} />
              Live
            </div>
          </div>
        </div>
      )}

      {/* Sidebar + Content row */}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'row', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Desktop sidebar only */}
        {!isMobile && (
          <Sidebar
            activeView={view}
            setActiveView={setView}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        )}

        {/* Main content: views manage their OWN scroll */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div key="dashboard"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <DashboardView sidebarCollapsed={sidebarCollapsed} />
              </motion.div>
            )}
            {view === 'analytics' && (
              <motion.div key="analytics"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <AnalyticsView />
              </motion.div>
            )}
            {view === 'calendar' && (
              <motion.div key="calendar"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <CalendarView />
              </motion.div>
            )}
            {view === 'journal' && (
              <motion.div key="journal"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <JournalView />
              </motion.div>
            )}
            {view === 'weeklyReview' && (
              <motion.div key="weeklyReview"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <WeeklyReviewView />
              </motion.div>
            )}
            {view === 'settings' && (
              <motion.div key="settings"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <SettingsView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CognitiveAgentPanel />
      </div>

      {/* Mobile fixed bottom nav */}
      {isMobile && <AppBottomNav />}

      {/* Toasts */}
      <div className="hollow-toast-container">
        <AnimatePresence>
          {toasts.map(toast => {
            let icon = <CheckCircle size={16} color="var(--colors-gain)" />;
            if (toast.type === 'error') icon = <AlertCircle size={16} color="var(--colors-loss)" />;
            else if (toast.type === 'info') icon = <Info size={16} color="#ffffff" />;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="hollow-toast"
                onClick={() => removeToast(toast.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="hollow-toast-icon">{icon}</div>
                <div style={{ flex: 1 }}>{toast.message}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
