import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearDatabase, subscribeToRealtimeSync } from '../db/hollowDb';
import { supabase } from '../db/supabaseClient';
import { useUIStore } from '../store/useUIStore';
import MobileAuthView from './views/MobileAuthView';
import LoadingScreen from '../components/LoadingScreen';
import WelcomeUpdateModal from '../components/WelcomeUpdateModal';
import AddExecutionModal from '../components/AddExecutionModal';
import HomeView from './views/HomeView';
import MobileStatsView from './views/MobileStatsView';
import PayoutsView from './views/PayoutsView';
import AddPlanView from './views/AddPlanView';
import SupportView from './views/SupportView';
import ProfileView from './views/ProfileView';
import MobileJournalView from './views/MobileJournalView';
import MobileWeeklyReviewView from './views/MobileWeeklyReviewView';
import MobileBottomNav from './components/MobileBottomNav';
import SharePnLSheet from './components/SharePnLSheet';
import IPhoneFrame from './components/IPhoneFrame';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prevTab, setPrevTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const [subView, setSubView] = useState(null); // null | 'weeklyReview' | 'journal'
  const [showSharePnL, setShowSharePnL] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);

  const [session, setSession] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

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

    const getMockSession = () => ({
      user: {
        id: 'offline-local-user',
        email: 'offline@hollow.local',
        user_metadata: {
          displayName: localStorage.getItem('hollowDisplayName') || 'Local Trader',
          traderTitle: 'Local Trader · Hollow'
        }
      }
    });

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          syncProfileFromMetadata(session.user);
          localStorage.setItem('hollow_last_user_id', session.user.id);
        } else {
          setSession(getMockSession());
          setAppInitialized(true);
        }
      } catch (err) {
        console.error('Supabase session retrieval error:', err);
        setSession(getMockSession());
        setAppInitialized(true);
      } finally {
        setAuthLoaded(true);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      try {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }

        if (event === 'SIGNED_IN') {
          const lastUserId = localStorage.getItem('hollow_last_user_id');
          const isSameUser = lastUserId && currentSession && currentSession.user && (lastUserId === currentSession.user.id);
          
          if (!isSameUser) {
            await clearDatabase();
            if (currentSession && currentSession.user) {
              localStorage.setItem('hollow_last_user_id', currentSession.user.id);
            }
            setSession(currentSession);
            if (currentSession) {
              syncProfileFromMetadata(currentSession.user);
            }
            setAppInitialized(false);
          } else {
            setSession(currentSession);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('hollow_last_user_id');
          setSession(getMockSession());
          setAppInitialized(true);
        } else {
          if (currentSession) {
            setSession(currentSession);
            syncProfileFromMetadata(currentSession.user);
          } else {
            setSession(getMockSession());
            setAppInitialized(true);
          }
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

  // Real-time cross-device sync: subscribe whenever a session is active
  useEffect(() => {
    let unsubscribe = () => {};
    if (session) {
      subscribeToRealtimeSync().then(fn => { unsubscribe = fn; });
    }
    return () => { unsubscribe(); };
  }, [session]);

  const handleTabChange = (tab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
    setShowBottomNav(true);
  };

  const trades = useLiveQuery(() => (db && db.trades ? db.trades.toArray() : []), []) || [];
  const executions = useLiveQuery(() => (db && db.executions ? db.executions.toArray() : []), []) || [];
  const accounts = useLiveQuery(() => (db && db.accounts ? db.accounts.toArray() : []), []) || [];

  const viewProps = {
    addToast,
    trades,
    executions,
    accounts,
    onScrollChange: (scrollTop) => setShowBottomNav(scrollTop <= 5)
  };

  const setIsAddExecutionOpen = useUIStore(s => s.setIsAddExecutionOpen);

  const renderActiveScreen = () => {
    if (subView === 'weeklyReview') {
      return (
        <MobileWeeklyReviewView
          {...viewProps}
          onBack={() => setSubView(null)}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
      case 'home':
        return (
          <HomeView
            {...viewProps}
            onOpenWeeklyReview={() => setSubView('weeklyReview')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'analytics':
        return (
          <MobileStatsView
            {...viewProps}
            onSharePnL={() => setShowSharePnL(true)}
          />
        );
      case 'journal':
        return (
          <MobileJournalView
            {...viewProps}
          />
        );
      case 'settings':
      case 'profile':
        return (
          <ProfileView
            {...viewProps}
            onOpenWeeklyReview={() => setSubView('weeklyReview')}
          />
        );
      case 'payouts':
        return <PayoutsView {...viewProps} />;
      case 'plans':
        return <AddPlanView {...viewProps} />;
      case 'support':
        return <SupportView {...viewProps} />;
      default:
        return (
          <HomeView
            {...viewProps}
            onOpenWeeklyReview={() => setSubView('weeklyReview')}
          />
        );
    }
  };

  if (!authLoaded) {
    return (
      <IPhoneFrame>
        <div style={{ height: '100%', width: '100%', background: '#000' }} />
      </IPhoneFrame>
    );
  }

  if (isRecoveryMode) {
    return (
      <IPhoneFrame>
        <MobileAuthView
          initialMode="reset"
          onResetComplete={() => {
            setIsRecoveryMode(false);
            window.location.hash = '';
          }}
        />
      </IPhoneFrame>
    );
  }

  if (session && !appInitialized) {
    return (
      <IPhoneFrame>
        <LoadingScreen session={session} onComplete={handleLoadingComplete} />
      </IPhoneFrame>
    );
  }

  if (!session) {
    return (
      <IPhoneFrame>
        <MobileAuthView />
      </IPhoneFrame>
    );
  }

  return (
    <IPhoneFrame>
      <div style={{
        height: '100%',
        width: '100%',
        background: '#09090b',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <WelcomeUpdateModal isMobile={true} />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={subView || activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ height: '100%', width: '100%' }}
            >
              {renderActiveScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {!subView && (
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAddClick={() => setIsAddExecutionOpen(true)}
          />
        )}

        <AddExecutionModal />

        {showSharePnL && (
          <SharePnLSheet
            trades={trades}
            executions={executions}
            selectedAccountId="all"
            onClose={() => setShowSharePnL(false)}
          />
        )}

        {/* Mobile Toast Overlay */}
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 12px)',
          left: '16px',
          right: '16px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }}>
          <AnimatePresence>
            {toasts.map(toast => {
              let icon = <CheckCircle size={16} color="#30d158" />;
              if (toast.type === 'error') {
                icon = <AlertCircle size={16} color="#ff453a" />;
              } else if (toast.type === 'info') {
                icon = <Info size={16} color="#ffffff" />;
              }
              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  style={{
                    background: 'rgba(20, 20, 22, 0.92)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#fff',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    pointerEvents: 'auto'
                  }}
                >
                  <div>{icon}</div>
                  <div style={{ flex: 1 }}>{toast.message}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </IPhoneFrame>
  );
}
