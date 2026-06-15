import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabaseIfEmpty, syncWithSupabase, clearDatabase } from './db/hollowDb';
import { supabase } from './db/supabaseClient';
import AuthView from './components/AuthView';
import LoadingScreen from './components/LoadingScreen';
import WelcomeUpdateModal from './components/WelcomeUpdateModal';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import JournalView from './components/JournalView';
import StatisticsView from './components/StatisticsView';
import WeeklyReviewView from './components/WeeklyReviewView';
import TradeDetailDrawer from './components/TradeDetailDrawer';
import CognitiveAgentPanel from './components/CognitiveAgentPanel';
import PortfolioView from './components/PortfolioView';
import SettingsView from './components/SettingsView';
import GroupsView from './components/GroupsView';
import TrainingJournalView from './components/TrainingJournalView';
import './App.css';
import AddTradeModal from './components/AddTradeModal';
import NoAccountsModal from './components/NoAccountsModal';
import { CheckCircle, AlertCircle, Info, Menu } from 'lucide-react';
import { useUIStore } from './store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const {
    view,
    setView,
    selectedAccountId,
    setSelectedAccountId,
    activeTradeId,
    setActiveTradeId,
    sidebarCollapsed,
    setSidebarCollapsed,
    isAddTradeOpen,
    setIsAddTradeOpen,
    isMobile,
    setIsMobile,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    toasts,
    removeToast,
    addToast
  } = useUIStore();

  const [session, setSession] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const handleLoadingComplete = useCallback(() => {
    setAppInitialized(true);
  }, []);

  const [uiOptions, setUiOptions] = useState({
    enableClouds: true
  });

  // Handle auth session state reactively
  useEffect(() => {
    if (!supabase) return;

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
          await clearDatabase();
          setSession(currentSession);
          setAppInitialized(false);
        } else if (event === 'SIGNED_OUT') {
          await clearDatabase();
          setSession(null);
          setAppInitialized(true);
        } else {
          setSession(currentSession);
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

  useEffect(() => {
    const loadUIOptions = () => {
      const enableClouds = localStorage.getItem('hollowEnableClouds') !== 'false';
      setUiOptions({ enableClouds });
    };

    loadUIOptions();
    window.addEventListener('hollowSettingsUpdated', loadUIOptions);
    return () => window.removeEventListener('hollowSettingsUpdated', loadUIOptions);
  }, []);

  // Detect mobile screen width on mount/resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

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
        const { checkAndRunWeeklyBackup } = await import('./utils/pdfExport');
        await checkAndRunWeeklyBackup(addToast);
      } catch (err) {
        console.error('Failed to run weekly auto-backup:', err);
      }
    };

    checkBackup();
  }, [appInitialized, session, addToast]);

  // Fetch accounts, trades, and executions reactively from IndexedDB (Dexie)
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const trades = useLiveQuery(() => db.trades.toArray()) || [];
  const executions = useLiveQuery(() => db.executions.toArray()) || [];

  // Database persistence handlers
  const handleSaveTrade = async (updatedTrade) => {
    try {
      await db.trades.put(updatedTrade);
      // Re-evaluate account balance if it was a closed trade
      if (updatedTrade.status === 'CLOSED') {
        const tradeExecs = await db.executions.where({ tradeId: updatedTrade.id }).toArray();
        // Compute total Net PnL and update account balance
        // (For simulation, we compute on the fly, but we can also write the balance field)
      }
      console.log('Trade saved successfully:', updatedTrade.id);
    } catch (err) {
      console.error('Failed to save trade:', err);
    }
  };

  const handleDeleteTrade = async (id) => {
    try {
      await db.trades.delete(id);
      await db.executions.where({ tradeId: id }).delete();
      setActiveTradeId(null);
      console.log('Trade deleted:', id);
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  const handleAddExecution = async (newExec) => {
    try {
      await db.executions.add(newExec);
      console.log('Execution fill added:', newExec.id);
    } catch (err) {
      console.error('Failed to add execution:', err);
    }
  };

  const handleDeleteExecution = async (id) => {
    try {
      await db.executions.delete(id);
      console.log('Execution fill deleted:', id);
    } catch (err) {
      console.error('Failed to delete execution:', err);
    }
  };

  const handleCreateManualTrade = async () => {
    const newTradeId = `trade-${Date.now()}`;
    const newTrade = {
      id: newTradeId,
      accountId: selectedAccountId,
      date: new Date().toISOString().split('T')[0],
      symbol: 'NQ',
      model: 'Opening Range Breakout',
      bias: 'LONG',
      status: 'CLOSED',
      confluences: [],
      mistakes: [],
      commentBias: '',
      commentExecution: '',
      commentProblems: '',
      commentFazit: '',
      sentimentPre: 3,
      sentimentPost: 3,
      images: [],
      imageAnnotations: {}
    };

    try {
      await db.trades.add(newTrade);
      // Add a default entry execution to bootstrap calculations
      const defaultExec = {
        id: `exec-${Date.now()}`,
        tradeId: newTradeId,
        timestamp: new Date().toISOString(),
        side: 'BUY',
        price: 18500,
        contracts: 1,
        commissions: 2.40,
        type: 'ENTRY'
      };
      await db.executions.add(defaultExec);
      setActiveTradeId(newTradeId);
    } catch (err) {
      console.error('Failed to create manual trade:', err);
    }
  };

  if (!supabase) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#0a0a0c',
        color: '#ff453a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-body, sans-serif)',
        padding: 24,
        textAlign: 'center'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>Supabase Configuration Missing</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 440, fontSize: 13, lineHeight: 1.6 }}>
          Your Supabase environment variables (<code style={{ color: '#fff', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> & <code style={{ color: '#fff', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code>) are not configured. 
          Please configure them in your Vercel project settings, then trigger a new deployment.
        </p>
      </div>
    );
  }

  if (!authLoaded) {
    return <div style={{ height: '100vh', width: '100vw', background: '#000' }} />;
  }

  if (isRecoveryMode) {
    return (
      <AuthView
        initialMode="reset"
        onResetComplete={() => {
          setIsRecoveryMode(false);
          window.location.hash = '';
        }}
      />
    );
  }

  if (session && !appInitialized) {
    return <LoadingScreen session={session} onComplete={handleLoadingComplete} />;
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {uiOptions.enableClouds && (
        <div className="cloudy-backdrop">
          <div className="cloud-blur cloud-1" />
          <div className="cloud-blur cloud-2" />
          <div className="cloud-blur cloud-3" />
          <div className="cloud-blur cloud-4" />
        </div>
      )}

      <WelcomeUpdateModal isMobile={isMobile} />

      {isMobile && (
        <div style={{
          height: '56px',
          width: '100%',
          background: '#0f0f11',
          borderBottom: '1px solid #1c1c1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100,
          flexShrink: 0
        }}>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              marginLeft: '-8px'
            }}
          >
            <Menu size={22} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2.5" />
            </svg>
            <span style={{ fontFamily: 'var(--font-logo)', fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px', color: '#fff' }}>hollow.</span>
          </div>

          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#ffffff',
            background: '#1c1c1e',
            padding: '4px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {accounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
        
        {/* Global Sidebar Nav */}
        {!isMobile && (
          <Sidebar
            activeView={view}
            setActiveView={setView}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            setSelectedAccountId={setSelectedAccountId}
            onAddTradeClick={() => setIsAddTradeOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            onExitApp={() => console.log('Mock exit')}
          />
        )}

        {/* Main Content Arena */}
        <div style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
          padding: 0,
          position: 'relative',
          zIndex: 1
        }}>
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <DashboardView
                  selectedAccountId={selectedAccountId}
                  accounts={accounts}
                  trades={trades}
                  executions={executions}
                  onSelectTrade={setActiveTradeId}
                  setSelectedAccountId={setSelectedAccountId}
                  sidebarCollapsed={sidebarCollapsed}
                />
              </motion.div>
            )}

            {view === 'journal' && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <JournalView />
              </motion.div>
            )}

            {view === 'trainingJournal' && (
              <motion.div
                key="trainingJournal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <TrainingJournalView />
              </motion.div>
            )}

            {view === 'weeklyReview' && (
              <motion.div
                key="weeklyReview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <WeeklyReviewView
                  trades={trades}
                  executions={executions}
                  selectedAccountId={selectedAccountId}
                  onSelectTrade={setActiveTradeId}
                />
              </motion.div>
            )}

            {view === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <StatisticsView
                  trades={trades}
                  executions={executions}
                  selectedAccountId={selectedAccountId}
                />
              </motion.div>
            )}

            {view === 'portfolio-stocks' && (
              <motion.div
                key="portfolio-stocks"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <PortfolioView activeTab="stocks" />
              </motion.div>
            )}

            {view === 'portfolio-bonds' && (
              <motion.div
                key="portfolio-bonds"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <PortfolioView activeTab="bonds" />
              </motion.div>
            )}

            {view === 'portfolio-funds' && (
              <motion.div
                key="portfolio-funds"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <PortfolioView activeTab="funds" />
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <SettingsView
                  selectedAccountId={selectedAccountId}
                  setSelectedAccountId={setSelectedAccountId}
                />
              </motion.div>
            )}

            {view === 'groups' && (
              <motion.div
                key="groups"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="view-transition-wrapper"
                style={{ height: '100%', width: '100%' }}
              >
                <GroupsView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating AI Panel Overlay */}
        <CognitiveAgentPanel
          trades={trades}
          executions={executions}
          selectedAccountId={selectedAccountId}
          accounts={accounts}
        />



        {/* Slide-over Detail drawer */}
        <AnimatePresence>
          {activeTradeId && (
            <TradeDetailDrawer
              tradeId={activeTradeId}
              onClose={() => setActiveTradeId(null)}
              onSaveTrade={handleSaveTrade}
              onDeleteTrade={handleDeleteTrade}
              db={db}
            />
          )}
        </AnimatePresence>

        {/* Add Trade Wizard Modal */}
        <AnimatePresence>
          {isAddTradeOpen && (
            <AddTradeModal
              isOpen={isAddTradeOpen}
              onClose={() => setIsAddTradeOpen(false)}
              selectedAccountId={selectedAccountId}
            />
          )}
        </AnimatePresence>

        {/* Mobile Slide-over Sidebar Drawer */}
        <AnimatePresence>
          {isMobile && mobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 1000
              }}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  width: '260px',
                  height: '100%',
                  background: '#000000',
                  borderRight: '1px solid #1c1c1e',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Sidebar
                  activeView={view}
                  setActiveView={(v) => { setView(v); setMobileSidebarOpen(false); }}
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  setSelectedAccountId={setSelectedAccountId}
                  onAddTradeClick={() => { setIsAddTradeOpen(true); setMobileSidebarOpen(false); }}
                  sidebarCollapsed={false}
                  setSidebarCollapsed={() => {}}
                  isMobile={true}
                  onClose={() => setMobileSidebarOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <NoAccountsModal
          isOpen={accounts.length === 0 && appInitialized && session}
          isMobile={isMobile}
          addToast={addToast}
        />

        {/* Sleek Custom Toast Container */}
        <div className="hollow-toast-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AnimatePresence>
            {toasts.map(toast => {
              let icon = <CheckCircle size={16} color="var(--colors-gain)" />;
              if (toast.type === 'error') {
                icon = <AlertCircle size={16} color="var(--colors-loss)" />;
              } else if (toast.type === 'info') {
                icon = <Info size={16} color="#ffffff" />;
              }
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
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
    </div>
  );
}
