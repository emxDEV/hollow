import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, clearDatabase, subscribeToRealtimeSync } from '../db/hollowDb';
import { supabase } from '../db/supabaseClient';
import MobileAuthView from './views/MobileAuthView';
import LoadingScreen from '../components/LoadingScreen';
import WelcomeUpdateModal from '../components/WelcomeUpdateModal';
import HomeView from './views/HomeView';
import TradesView from './views/TradesView';
import MobileJournalView from './views/MobileJournalView';
import MobileStatsView from './views/MobileStatsView';
import ProfileView from './views/ProfileView';
import MobileWeeklyReviewView from './views/MobileWeeklyReviewView';
import MobileTrainingJournalView from './views/MobileTrainingJournalView';
import MobileGroupsView from './views/MobileGroupsView';
import MobileAccountsView from './views/MobileAccountsView';
import MobilePayoutsView from './views/MobilePayoutsView';
import MobileGalleryView from './views/MobileGalleryView';
import MobileBottomNav from './components/MobileBottomNav';
import AddTradeSheet from './components/AddTradeSheet';
import TradeDetailSheet from './components/TradeDetailSheet';
import SharePnLSheet from './components/SharePnLSheet';
import IPhoneFrame from './components/IPhoneFrame';
import NoAccountsModal from '../components/NoAccountsModal';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [prevTab, setPrevTab] = useState('home');
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [activeTradeId, setActiveTradeId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const [subView, setSubView] = useState(null); // null | 'weeklyReview' | 'trainingJournal' | 'groups'
  const [showSharePnL, setShowSharePnL] = useState(false);
  const [sharePnLMode, setSharePnLMode] = useState('daily');
  const [showBottomNav, setShowBottomNav] = useState(true);

  const [session, setSession] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isNoAccountsModalDismissed, setIsNoAccountsModalDismissed] = useState(false);

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
        if (!session) {
          setAppInitialized(true);
        }
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
          await clearDatabase();
          localStorage.removeItem('hollow_last_user_id');
          setSession(null);
          setAppInitialized(true);
        } else {
          setSession(currentSession);
          if (currentSession) {
            syncProfileFromMetadata(currentSession.user);
          }
          if (!currentSession) {
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

  // Weekly Auto-Backup Check on Sunday
  useEffect(() => {
    if (!appInitialized || !session) return;

    const checkBackup = async () => {
      const today = new Date();
      const isSunday = today.getDay() === 0;
      if (!isSunday) return;

      const todayStr = today.toISOString().split('T')[0];
      const lastBackupDate = localStorage.getItem('hollowLastWeeklyBackupDate');
      if (lastBackupDate === todayStr) return;

      try {
        const { checkAndRunWeeklyBackup } = await import('../utils/pdfExport');
        await checkAndRunWeeklyBackup(addToast);
      } catch (err) {
        console.error('Failed to run weekly auto-backup:', err);
      }
    };

    checkBackup();
  }, [appInitialized, session, addToast]);

  const rawAccounts = useLiveQuery(() => db.accounts.toArray());
  const accounts = rawAccounts || [];
  const accountsLoaded = rawAccounts !== undefined;
  const trades = useLiveQuery(() => db.trades.toArray()) || [];
  const executions = useLiveQuery(() => db.executions.toArray()) || [];

  const handleTabChange = (tab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
    setShowBottomNav(true);
  };

  const handleSaveTrade = async (updatedTrade) => {
    try {
      await db.trades.put(updatedTrade);
      addToast('Trade saved.', 'success');
    } catch {
      addToast('Failed to save trade.', 'error');
    }
  };

  const handleDeleteTrade = async (id) => {
    try {
      await db.trades.delete(id);
      await db.executions.where({ tradeId: id }).delete();
      setActiveTradeId(null);
      addToast('Trade deleted.', 'success');
    } catch {
      addToast('Failed to delete.', 'error');
    }
  };

  const viewProps = {
    trades,
    executions,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    onSelectTrade: setActiveTradeId,
    addToast,
    onScrollChange: (scrollTop) => setShowBottomNav(scrollTop <= 5)
  };

  const tabOrder = ['home', 'trades', 'journal', 'profile'];
  const direction = tabOrder.indexOf(activeTab) > tabOrder.indexOf(prevTab) ? 1 : -1;

  const renderView = () => {
    switch (activeTab) {
      case 'home': return <HomeView key="home" {...viewProps} />;
      case 'trades': return <TradesView key="trades" {...viewProps} />;
      case 'journal': return <MobileJournalView key="journal" {...viewProps} />;
      case 'profile': return <ProfileView key="profile" {...viewProps} onNavigate={setSubView} />;
      default: return <HomeView key="home" {...viewProps} />;
    }
  };

  if (!supabase) {
    return (
      <IPhoneFrame>
        <div style={{
          height: '100%',
          width: '100%',
          background: '#0a0a0c',
          color: '#ff453a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font, sans-serif)',
          padding: 24,
          textAlign: 'center'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 14 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>Keys Missing</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 280, fontSize: 12, lineHeight: 1.5 }}>
            Supabase keys (<code style={{ color: '#fff' }}>VITE_SUPABASE_URL</code> & <code style={{ color: '#fff' }}>VITE_SUPABASE_ANON_KEY</code>) are not configured. Configure them in Vercel settings and re-deploy.
          </p>
        </div>
      </IPhoneFrame>
    );
  }

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
          addToast={addToast} 
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
        <MobileAuthView addToast={addToast} />
      </IPhoneFrame>
    );
  }

  return (
    <IPhoneFrame>
      <WelcomeUpdateModal isMobile={true} />
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: '#000',
        overflow: 'hidden'
      }}>
      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        paddingBottom: 0
      }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', width: '100%' }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddTrade={() => setShowAddTrade(true)}
        visible={showBottomNav}
      />

      {/* Add Trade Sheet */}
      <AnimatePresence>
        {showAddTrade && (
          <AddTradeSheet
            onClose={() => setShowAddTrade(false)}
            selectedAccountId={selectedAccountId}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* Share PnL Sheet */}
      <AnimatePresence>
        {showSharePnL && (
          <SharePnLSheet
            onClose={() => setShowSharePnL(false)}
            trades={trades}
            executions={executions}
            selectedAccountId={selectedAccountId}
            initialMode={sharePnLMode}
          />
        )}
      </AnimatePresence>

      {/* Trade Detail Sheet */}
      <AnimatePresence>
        {activeTradeId && (
          <TradeDetailSheet
            tradeId={activeTradeId}
            trades={trades}
            executions={executions}
            onClose={() => setActiveTradeId(null)}
            onSaveTrade={handleSaveTrade}
            onDeleteTrade={handleDeleteTrade}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* Sub-view Overlays */}
      <AnimatePresence>
        {subView === 'accounts' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobileAccountsView
              {...viewProps}
              onBack={() => setSubView(null)}
            />
          </motion.div>
        )}
        {subView === 'stats' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobileStatsView
              {...viewProps}
              onBack={() => setSubView(null)}
              onSharePnL={(mode) => { setSharePnLMode(mode); setShowSharePnL(true); }}
            />
          </motion.div>
        )}
        {subView === 'weeklyReview' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobileWeeklyReviewView
              {...viewProps}
              onBack={() => setSubView(null)}
              onSharePnL={(mode) => { setSharePnLMode(mode); setShowSharePnL(true); }}
            />
          </motion.div>
        )}
        {subView === 'trainingJournal' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobileTrainingJournalView
              {...viewProps}
              onBack={() => setSubView(null)}
            />
          </motion.div>
        )}
        {subView === 'groups' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobileGroupsView
              {...viewProps}
              onBack={() => setSubView(null)}
            />
          </motion.div>
        )}
        {subView === 'payouts' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobilePayoutsView
              {...viewProps}
              onBack={() => setSubView(null)}
            />
          </motion.div>
        )}
        {subView === 'gallery' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1100 }}
          >
            <MobileGalleryView
              {...viewProps}
              onBack={() => setSubView(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <NoAccountsModal
        isOpen={accountsLoaded && accounts.length === 0 && appInitialized && session && !isNoAccountsModalDismissed}
        onClose={() => setIsNoAccountsModalDismissed(true)}
        isMobile={true}
        addToast={addToast}
      />

      {/* Toasts */}
      <div style={{
        position: 'fixed',
        top: 'calc(var(--safe-top) + 60px)',
        left: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                background: 'rgba(28,28,30,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}
            >
              {toast.type === 'success' && <CheckCircle size={16} color="#30d158" />}
              {toast.type === 'error' && <AlertCircle size={16} color="#ff453a" />}
              {toast.type === 'info' && <Info size={16} color="#0a84ff" />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
    </IPhoneFrame>
  );
}
