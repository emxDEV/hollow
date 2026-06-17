import React, { useState, useEffect } from 'react';
import { db } from '../db/hollowDb';
import { supabase } from '../db/supabaseClient';
import { useLiveQuery } from 'dexie-react-hooks';
import { showToast } from '../utils/toast';
import HollowSelect from './HollowSelect';
import HollowGroupedSelect from './HollowGroupedSelect';
import { calculateTradePnL, isTradeWinRateEligible } from '../utils/tradeMath';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../store/useUIStore';

const PROP_FIRM_PRESETS = [
  { id: 'apex-50', name: 'Apex 50K Plan', propFirm: 'Apex Trader Funding', balance: 50000, target: 3000, drawdownType: 'Trailing', drawdownLimit: 2500, maxDailyLoss: 0, minDays: 7, type: 'Evaluation' },
  { id: 'apex-100', name: 'Apex 100K Plan', propFirm: 'Apex Trader Funding', balance: 100000, target: 6000, drawdownType: 'Trailing', drawdownLimit: 3000, maxDailyLoss: 0, minDays: 7, type: 'Evaluation' },
  { id: 'apex-150', name: 'Apex 150K Plan', propFirm: 'Apex Trader Funding', balance: 150000, target: 9000, drawdownType: 'Trailing', drawdownLimit: 4500, maxDailyLoss: 0, minDays: 7, type: 'Evaluation' },
  { id: 'topstep-50', name: 'Topstep 50K Plan', propFirm: 'Topstep', balance: 50000, target: 3000, drawdownType: 'Trailing', drawdownLimit: 2000, maxDailyLoss: 1000, minDays: 5, type: 'Evaluation' },
  { id: 'topstep-100', name: 'Topstep 100K Plan', propFirm: 'Topstep', balance: 100000, target: 6000, drawdownType: 'Trailing', drawdownLimit: 3000, maxDailyLoss: 2000, minDays: 5, type: 'Evaluation' },
  { id: 'topstep-150', name: 'Topstep 150K Plan', propFirm: 'Topstep', balance: 150000, target: 9000, drawdownType: 'Trailing', drawdownLimit: 4500, maxDailyLoss: 3000, minDays: 5, type: 'Evaluation' },
  { id: 'mffu-50', name: 'MFFU 50K Plan', propFirm: 'MyFundedFutures', balance: 50000, target: 3000, drawdownType: 'Daily', drawdownLimit: 2000, maxDailyLoss: 1250, minDays: 5, type: 'Evaluation' },
  { id: 'mffu-100', name: 'MFFU 100K Plan', propFirm: 'MyFundedFutures', balance: 100000, target: 6000, drawdownType: 'Daily', drawdownLimit: 3000, maxDailyLoss: 2500, minDays: 5, type: 'Evaluation' },
  { id: 'mffu-150', name: 'MFFU 150K Plan', propFirm: 'MyFundedFutures', balance: 150000, target: 9000, drawdownType: 'Daily', drawdownLimit: 4500, maxDailyLoss: 3000, minDays: 5, type: 'Evaluation' },
  { id: 'bulenox-50', name: 'Bulenox 50K Plan', propFirm: 'Bulenox', balance: 50000, target: 3000, drawdownType: 'Trailing', drawdownLimit: 2500, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'bulenox-100', name: 'Bulenox 100K Plan', propFirm: 'Bulenox', balance: 100000, target: 6000, drawdownType: 'Trailing', drawdownLimit: 3000, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'bulenox-150', name: 'Bulenox 150K Plan', propFirm: 'Bulenox', balance: 150000, target: 9000, drawdownType: 'Trailing', drawdownLimit: 4500, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'tpt-50', name: 'TPT 50K Plan', propFirm: 'Take Profit Trader', balance: 50000, target: 3000, drawdownType: 'Trailing', drawdownLimit: 2000, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'tpt-100', name: 'TPT 100K Plan', propFirm: 'Take Profit Trader', balance: 100000, target: 6000, drawdownType: 'Trailing', drawdownLimit: 4000, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'tpt-150', name: 'TPT 150K Plan', propFirm: 'Take Profit Trader', balance: 150000, target: 9000, drawdownType: 'Trailing', drawdownLimit: 4500, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'tradeify-50', name: 'Tradeify 50K Plan', propFirm: 'Tradeify', balance: 50000, target: 3000, drawdownType: 'Trailing', drawdownLimit: 2000, maxDailyLoss: 0, minDays: 3, type: 'Evaluation' },
  { id: 'tradeify-100', name: 'Tradeify 100K Plan', propFirm: 'Tradeify', balance: 100000, target: 6000, drawdownType: 'Trailing', drawdownLimit: 3000, maxDailyLoss: 0, minDays: 3, type: 'Evaluation' },
  { id: 'tradeify-150', name: 'Tradeify 150K Plan', propFirm: 'Tradeify', balance: 150000, target: 9000, drawdownType: 'Trailing', drawdownLimit: 4500, maxDailyLoss: 0, minDays: 3, type: 'Evaluation' },
  { id: 'lucid-50', name: 'Lucid 50K Plan', propFirm: 'Lucid Trading', balance: 50000, target: 3000, drawdownType: 'Trailing', drawdownLimit: 2000, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'lucid-100', name: 'Lucid 100K Plan', propFirm: 'Lucid Trading', balance: 100000, target: 6000, drawdownType: 'Trailing', drawdownLimit: 3000, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' },
  { id: 'lucid-150', name: 'Lucid 150K Plan', propFirm: 'Lucid Trading', balance: 150000, target: 9000, drawdownType: 'Trailing', drawdownLimit: 4500, maxDailyLoss: 0, minDays: 5, type: 'Evaluation' }
];

const getTypeStyles = (type) => {
  switch (type) {
    case 'Funded':
      return {
        color: '#30d158', // Emerald Green
        bg: 'rgba(48, 209, 88, 0.08)',
        bgActive: 'rgba(48, 209, 88, 0.16)',
        gradient: 'linear-gradient(135deg, rgba(48, 209, 88, 0.25) 0%, rgba(48, 209, 88, 0.05) 100%)',
        border: 'rgba(48, 209, 88, 0.25)',
        rgb: '48, 209, 88'
      };
    case 'Evaluation':
      return {
        color: '#0a84ff', // Blue
        bg: 'rgba(10, 132, 255, 0.08)',
        bgActive: 'rgba(10, 132, 255, 0.16)',
        gradient: 'linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(10, 132, 255, 0.05) 100%)',
        border: 'rgba(10, 132, 255, 0.25)',
        rgb: '10, 132, 255'
      };
    case 'Personal':
    case 'Live':
      return {
        color: '#bf5af2', // Purple
        bg: 'rgba(191, 90, 242, 0.08)',
        bgActive: 'rgba(191, 90, 242, 0.16)',
        gradient: 'linear-gradient(135deg, rgba(191, 90, 242, 0.25) 0%, rgba(191, 90, 242, 0.05) 100%)',
        border: 'rgba(191, 90, 242, 0.25)',
        rgb: '191, 90, 242'
      };
    default:
      return {
        color: '#ff9f0a', // Orange
        bg: 'rgba(255, 159, 10, 0.08)',
        bgActive: 'rgba(255, 159, 10, 0.16)',
        gradient: 'linear-gradient(135deg, rgba(255, 159, 10, 0.25) 0%, rgba(255, 159, 10, 0.05) 100%)',
        border: 'rgba(255, 159, 10, 0.25)',
        rgb: '255, 159, 10'
      };
  }
};

const getCardTheme = (propFirm, type) => {
  const styles = getTypeStyles(type || 'Funded');
  return {
    background: 'rgba(15, 15, 17, 0.65)',
    borderColor: `rgba(${styles.rgb}, 0.25)`,
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 0 15px rgba(${styles.rgb}, 0.04)`,
    hoverBoxShadow: `0 12px 36px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 25px rgba(${styles.rgb}, 0.12)`,
    hoverBorderColor: `rgba(${styles.rgb}, 0.55)`,
    accentColor: styles.color,
    textColorPrimary: '#fff',
    textColorSecondary: 'rgba(255, 255, 255, 0.45)'
  };
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'Passed':
      return {
        bg: 'var(--colors-gain-dim)',
        border: 'rgba(48, 209, 88, 0.2)',
        color: 'var(--colors-gain)',
        shadow: 'none'
      };
    case 'Failed':
      return {
        bg: 'var(--colors-loss-dim)',
        border: 'rgba(255, 69, 58, 0.2)',
        color: 'var(--colors-loss)',
        shadow: 'none'
      };
    case 'Payout':
      return {
        bg: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
        shadow: 'none'
      };
    case 'Active':
    default:
      return {
        bg: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.15)',
        color: 'rgba(255, 255, 255, 0.85)',
        shadow: 'none'
      };
  }
};

import { 
  Settings, 
  User, 
  Trash2, 
  Plus, 
  Save, 
  CreditCard,
  Target,
  Sparkles,
  EyeOff,
  X,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Edit2,
  ChevronRight,
  TrendingUp,
  ClipboardCheck,
  Dumbbell,
  Users,
  LogOut
} from 'lucide-react';

// Playbook Model Card row component
function ModelCard({ tag, meta, stats, onDelete, onInspect }) {
  const color = meta.color || '#9d85f5';
  const description = meta.description || '';
  const rules = meta.rules || [];
  const [hovered, setHovered] = React.useState(false);
  
  const pnlColor = stats.netPnL > 0 ? 'var(--colors-gain)' : (stats.netPnL < 0 ? 'var(--colors-loss)' : 'var(--colors-stone)');
  const pnlSign = stats.netPnL > 0 ? '+' : '';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onInspect(tag)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        background: hovered ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.015)',
        border: `1px solid ${hovered ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)'}`,
        borderRadius: '16px',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '160px',
        boxShadow: hovered ? '0 12px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none'
      }}
    >
      {/* Visual Accent Bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: color,
        boxShadow: `0 0 12px ${color}`
      }} />

      {/* Top section: Title and Category */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: '800', 
            color: '#fff', 
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.5px'
          }}>
            {tag}
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            padding: '3px 8px',
            borderRadius: '100px',
            background: `${color}15`,
            border: `1px solid ${color}35`,
            color: color
          }}>
            {meta.category || 'Custom'}
          </span>
        </div>

        {/* Description */}
        <p style={{
          fontSize: '12px',
          color: 'var(--colors-stone)',
          marginTop: '8px',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {description || 'No description provided.'}
        </p>

        {/* Rules Count */}
        {rules.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.03)',
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
              fontWeight: '500'
            }}>
              {rules.length} setup {rules.length === 1 ? 'rule' : 'rules'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom section: Performance Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '12px',
        marginTop: '16px'
      }}>
        {/* Trades / PnL */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trades</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {stats.tradesCount}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net PnL</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: pnlColor, fontFamily: 'var(--font-mono)' }}>
              {pnlSign}${stats.netPnL.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Win Rate & Trash Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Win Rate</span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: stats.winRate >= 50 ? '#3adb81' : (stats.tradesCount > 0 ? '#ff6b6b' : 'rgba(255,255,255,0.4)') }}>
              {stats.winRate}%
            </span>
          </div>

          {/* Delete Action button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tag);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ff6b6b',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s',
              outline: 'none',
              opacity: hovered ? 0.7 : 0,
              background: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.15)'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
            title="Delete setup"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = ['Reversal', 'Continuation', 'Breakout', 'Range', 'Scalp', 'Custom'];
const COLOR_SWATCHES = [
  '#ffffff', '#f2f2f7', '#e5e5ea', '#d1d1d6', '#c7c7cc', '#aeaeb2',
  '#8e8e93', '#636366', '#48484a', '#3a3a3c', '#2c2c2e', '#1c1c1e'
];

export default function SettingsView({ selectedAccountId, setSelectedAccountId }) {
  const isMobile = useUIStore(state => state.isMobile);
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'playbook', 'profile'
  
  // 1. Accounts Settings State
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const trades = useLiveQuery(() => db.trades.toArray()) || [];
  const executions = useLiveQuery(() => db.executions.toArray()) || [];
  const [editingAccountId, setEditingAccountId] = useState('new');
  const [settingsPresetId, setSettingsPresetId] = useState('custom');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [accForm, setAccForm] = useState({
    name: '',
    type: 'Funded',
    propFirm: '',
    capital: 50000,
    balance: 50000,
    profitTarget: 53000,
    maxLoss: 47500,
    payoutGoal: 52500,
    drawdownType: 'None',
    drawdownLimit: 0,
    maxDailyLoss: 0,
    minTradingDays: 0,
    evaluationStatus: 'Active'
  });

  // Sync edit form with selected account
  useEffect(() => {
    setSettingsPresetId('custom');
    if (editingAccountId === 'new') {
      setAccForm({
        name: '',
        type: 'Funded',
        propFirm: '',
        capital: 50000,
        balance: 50000,
        profitTarget: 53000,
        maxLoss: 47500,
        payoutGoal: 52500,
        drawdownType: 'None',
        drawdownLimit: 0,
        maxDailyLoss: 0,
        minTradingDays: 0,
        evaluationStatus: 'Active'
      });
    } else {
      const match = accounts.find(a => a.id === editingAccountId);
      if (match) {
        setAccForm({
          name: match.name || '',
          type: match.type || 'Funded',
          propFirm: match.propFirm || '',
          capital: match.capital || 0,
          balance: match.balance || 0,
          profitTarget: match.profitTarget || 0,
          maxLoss: match.maxLoss || 0,
          payoutGoal: match.payoutGoal || 0,
          drawdownType: match.drawdownType || 'None',
          drawdownLimit: match.drawdownLimit || 0,
          maxDailyLoss: match.maxDailyLoss || 0,
          minTradingDays: match.minTradingDays || 0,
          evaluationStatus: match.evaluationStatus || 'Active'
        });
      }
    }
  }, [editingAccountId, accounts]);

  // 2. Playbook Strategy Quick Tags Settings
  const [playbookTags, setPlaybookTags] = useState([]);
  const [newTagText, setNewTagText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('playbookTags');
    if (saved) {
      setPlaybookTags(JSON.parse(saved));
    } else {
      const defaults = ['MSS', 'IFVG', 'SMT', 'PO3'];
      setPlaybookTags(defaults);
      localStorage.setItem('playbookTags', JSON.stringify(defaults));
    }
  }, []);

  // 3. Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    displayName: '',
    traderTitle: '',
    timezone: 'America/New_York',
    tradingStyle: 'Day Trader',
    bio: '',
    primaryMarket: 'Futures'
  });

  const [autoBackupEnabled, setAutoBackupEnabled] = useState(localStorage.getItem('hollowEnableAutoBackup') !== 'false');
  const [backupDirName, setBackupDirName] = useState('Downloads Folder (Default)');

  const [userEmail, setUserEmail] = useState('');
  const [enableClouds, setEnableClouds] = useState(localStorage.getItem('hollowEnableClouds') !== 'false');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editMarket, setEditMarket] = useState('Futures');
  const [editStyle, setEditStyle] = useState('Day Trader');
  const [editTimezone, setEditTimezone] = useState('Europe/London');
  const [editBio, setEditBio] = useState('');

  const toggleClouds = async () => {
    const next = !enableClouds;
    setEnableClouds(next);
    localStorage.setItem('hollowEnableClouds', String(next));
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
    try {
      await supabase.auth.updateUser({
        data: { enableClouds: next }
      });
    } catch (err) {
      console.error('Failed to sync cloud backdrop preference:', err);
    }
  };

  const setView = useUIStore(state => state.setView);

  useEffect(() => {
    async function loadBackupSettings() {
      try {
        const { getBackupDirectoryHandle } = await import('../utils/pdfExport');
        const handle = await getBackupDirectoryHandle();
        if (handle) {
          setBackupDirName(`Custom Folder: ${handle.name}`);
        }
      } catch (err) {
        console.error('Failed to load backup handle:', err);
      }
    }
    loadBackupSettings();
  }, []);

  const handleSelectDirectory = async () => {
    if (!window.showDirectoryPicker) {
      showToast('Custom folders are only supported in desktop Chrome, Edge, or Opera.', 'info');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker();
      const { saveBackupDirectoryHandle } = await import('../utils/pdfExport');
      await saveBackupDirectoryHandle(handle);
      setBackupDirName(`Custom Folder: ${handle.name}`);
      showToast('Backup directory selected successfully!', 'success');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Directory selection failed:', err);
        showToast('Failed to select directory.', 'error');
      }
    }
  };

  const handleResetDirectory = async () => {
    try {
      const { saveBackupDirectoryHandle } = await import('../utils/pdfExport');
      await saveBackupDirectoryHandle(null);
      setBackupDirName('Downloads Folder (Default)');
      showToast('Reset to default downloads folder.', 'success');
    } catch (err) {
      showToast('Reset failed.', 'error');
    }
  };

  const handleToggleAutoBackup = async (enabled) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('hollowEnableAutoBackup', enabled ? 'true' : 'false');
    try {
      await supabase.auth.updateUser({
        data: { enableAutoBackup: enabled }
      });
    } catch (err) {
      console.error('Failed to sync auto-backup setting:', err);
    }
    showToast(enabled ? 'Auto-backup enabled.' : 'Auto-backup disabled.');
  };

  const handleManualBackup = async () => {
    showToast('Generating manual system backup...', 'info');
    try {
      const [accs, trds, execs, jrns, plns, grps, wrkts] = await Promise.all([
        db.accounts.toArray(),
        db.trades.toArray(),
        db.executions.toArray(),
        db.dailyJournals.toArray(),
        db.weeklyPlanners.toArray(),
        db.groups.toArray(),
        db.workouts ? db.workouts.toArray() : []
      ]);
      const { exportAllDataBackupPDF, getBackupDirectoryHandle } = await import('../utils/pdfExport');
      const doc = exportAllDataBackupPDF(accs, trds, execs, jrns, plns, grps, wrkts);
      const filename = `hollow_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`;

      let savedToCustom = false;
      if (window.showDirectoryPicker) {
        const dirHandle = await getBackupDirectoryHandle();
        if (dirHandle) {
          try {
            const options = { mode: 'readwrite' };
            if ((await dirHandle.queryPermission(options)) === 'granted' || (await dirHandle.requestPermission(options)) === 'granted') {
              const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(doc.output('blob'));
              await writable.close();
              savedToCustom = true;
              showToast(`Backup saved to custom folder: ${filename}`, 'success');
            }
          } catch (e) {
            console.error('Custom save failed, falling back to download:', e);
          }
        }
      }

      if (!savedToCustom) {
        doc.save(filename);
        showToast('Backup PDF downloaded successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Backup generation failed.', 'error');
    }
  };

  const loadProfileSettings = () => {
    setProfileSettings({
      displayName: localStorage.getItem('hollowDisplayName') || 'Unnamed Trader',
      traderTitle: localStorage.getItem('hollowTraderTitle') || 'Trader · Hollow',
      timezone: localStorage.getItem('hollowTimezone') || 'Europe/London',
      tradingStyle: localStorage.getItem('hollowTradingStyle') || 'Day Trader',
      bio: localStorage.getItem('hollowBio') || '',
      primaryMarket: localStorage.getItem('hollowPrimaryMarket') || 'Futures'
    });
  };

  useEffect(() => {
    loadProfileSettings();
    window.addEventListener('hollowSettingsUpdated', loadProfileSettings);

    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email);
        }
      } catch (err) {
        console.error('Failed to fetch user email:', err);
      }
    }
    fetchUser();

    return () => {
      window.removeEventListener('hollowSettingsUpdated', loadProfileSettings);
    };
  }, []);

  const handleSaveProfile = async () => {
    localStorage.setItem('hollowDisplayName', editName.trim() || 'Unnamed Trader');
    localStorage.setItem('hollowUsername', editName.trim() || 'Unnamed Trader');
    localStorage.setItem('hollowTraderTitle', editTitle.trim() || 'Trader · Hollow');
    localStorage.setItem('hollowPrimaryMarket', editMarket);
    localStorage.setItem('hollowTradingStyle', editStyle);
    localStorage.setItem('hollowTimezone', editTimezone);
    localStorage.setItem('hollowBio', editBio.trim());
    
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
    
    try {
      await supabase.auth.updateUser({
        data: {
          displayName: editName.trim() || 'Unnamed Trader',
          traderTitle: editTitle.trim() || 'Trader · Hollow',
          primaryMarket: editMarket,
          tradingStyle: editStyle,
          timezone: editTimezone,
          bio: editBio.trim()
        }
      });
    } catch (err) {
      console.error('Failed to sync profile changes to Supabase Auth:', err);
    }
    
    showToast('Profile updated successfully!', 'success');
    setShowEditProfile(false);
  };

  // 4. Playbook Models State
  const [editingTag, setEditingTag] = useState(null); // { tag, color, category }
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', category: 'Reversal', color: '#9d85f5', description: '', rules: [] });
  const [modelData, setModelData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hollowPlaybookModels') || 'null') || {};
    } catch { return {}; }
  });

  const [pbSearchQuery, setPbSearchQuery] = useState('');
  const [pbFilterCategory, setPbFilterCategory] = useState('All');
  const [pbSortBy, setPbSortBy] = useState('name'); // 'name', 'trades', 'winrate', 'pnl'
  const [pbInspectModel, setPbInspectModel] = useState(null); // tag
  const [newModelRules, setNewModelRules] = useState([]);
  const [tempRuleInput, setTempRuleInput] = useState('');

  const saveModelData = (updated) => {
    setModelData(updated);
    localStorage.setItem('hollowPlaybookModels', JSON.stringify(updated));
  };

  const handleAddNewModelRule = () => {
    if (!tempRuleInput.trim()) return;
    setNewModelRules(prev => [...prev, tempRuleInput.trim()]);
    setTempRuleInput('');
  };

  const handleRemoveNewModelRule = (idx) => {
    setNewModelRules(prev => prev.filter((_, i) => i !== idx));
  };

  const getModelStats = (tag) => {
    const modelTrades = trades.filter(t => t.model === tag);
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let eligibleCount = 0;
    
    modelTrades.forEach(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const math = calculateTradePnL(trade, tradeExecs);
      totalPnL += math.netPnL;
      
      const virtualTrade = { ...trade, netPnL: math.netPnL };
      if (isTradeWinRateEligible(virtualTrade)) {
        eligibleCount++;
        if (math.netPnL > 0) wins++;
        else if (math.netPnL < 0) losses++;
      }
    });
    
    const winRate = eligibleCount > 0 ? Math.round((wins / eligibleCount) * 100) : 0;
    
    return {
      tradesCount: modelTrades.length,
      netPnL: Math.round(totalPnL),
      winRate,
      wins,
      losses
    };
  };

  const getRecentTradesForModel = (tag, limit = 5) => {
    return trades
      .filter(t => t.model === tag)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  };

  const handleAddModel = () => {
    if (!newModel.name.trim()) return;
    const clean = newModel.name.trim().toUpperCase();
    if (playbookTags.includes(clean)) { showToast('Model already exists.', 'error'); return; }
    const updatedTags = [...playbookTags, clean];
    setPlaybookTags(updatedTags);
    localStorage.setItem('playbookTags', JSON.stringify(updatedTags));
    const updatedMeta = { 
      ...modelData, 
      [clean]: { 
        color: newModel.color, 
        category: newModel.category, 
        description: newModel.description,
        rules: newModelRules
      } 
    };
    saveModelData(updatedMeta);
    setNewModel({ name: '', category: 'Reversal', color: '#9d85f5', description: '', rules: [] });
    setNewModelRules([]);
    setShowAddForm(false);
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
    showToast(`Model "${clean}" added.`);
  };

  const handleDeleteModel = (tag) => {
    const updated = playbookTags.filter(t => t !== tag);
    setPlaybookTags(updated);
    localStorage.setItem('playbookTags', JSON.stringify(updated));
    const updatedMeta = { ...modelData };
    delete updatedMeta[tag];
    saveModelData(updatedMeta);
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
  };

  const playbookStats = playbookTags.reduce((acc, tag) => {
    acc[tag] = getModelStats(tag);
    return acc;
  }, {});

  const totalPlaybookPnL = Object.values(playbookStats).reduce((sum, stat) => sum + stat.netPnL, 0);
  
  // Find most traded model
  let mostTradedModel = null;
  let maxTrades = -1;
  playbookTags.forEach(tag => {
    const count = playbookStats[tag]?.tradesCount || 0;
    if (count > maxTrades && count > 0) {
      maxTrades = count;
      mostTradedModel = tag;
    }
  });

  // Find best performing model
  let bestPerformingModel = null;
  let maxPnL = -Infinity;
  playbookTags.forEach(tag => {
    const pnl = playbookStats[tag]?.netPnL || 0;
    if (pnl > maxPnL && pnl > 0) {
      maxPnL = pnl;
      bestPerformingModel = tag;
    }
  });

  const groupedModels = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = playbookTags.filter(tag => (modelData[tag]?.category || 'Custom') === cat);
    return acc;
  }, {});

  const nonEmptyCategories = CATEGORIES.filter(cat => groupedModels[cat].length > 0);

  const filteredModels = playbookTags
    .filter(tag => {
      // 1. Filter by category
      if (pbFilterCategory !== 'All') {
        const cat = modelData[tag]?.category || 'Custom';
        if (cat !== pbFilterCategory) return false;
      }
      // 2. Filter by search query
      if (pbSearchQuery.trim()) {
        const query = pbSearchQuery.toLowerCase().trim();
        const desc = (modelData[tag]?.description || '').toLowerCase();
        if (!tag.toLowerCase().includes(query) && !desc.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort
      if (pbSortBy === 'name') {
        return a.localeCompare(b);
      }
      if (pbSortBy === 'trades') {
        return (playbookStats[b]?.tradesCount || 0) - (playbookStats[a]?.tradesCount || 0);
      }
      if (pbSortBy === 'winrate') {
        return (playbookStats[b]?.winRate || 0) - (playbookStats[a]?.winRate || 0);
      }
      if (pbSortBy === 'pnl') {
        return (playbookStats[b]?.netPnL || 0) - (playbookStats[a]?.netPnL || 0);
      }
      return 0;
    });

  // Action Handlers
  const handleApplyPresetSettings = (e) => {
    const val = e.target.value;
    setSettingsPresetId(val);
    const preset = PROP_FIRM_PRESETS.find(p => p.id === val);
    if (preset) {
      setAccForm(prev => ({
        ...prev,
        name: preset.name,
        propFirm: preset.propFirm,
        type: preset.type,
        balance: preset.balance,
        capital: preset.balance,
        profitTarget: preset.balance + preset.target,
        maxLoss: preset.balance - preset.drawdownLimit,
        payoutGoal: preset.balance + preset.target,
        drawdownType: preset.drawdownType,
        drawdownLimit: preset.drawdownLimit,
        maxDailyLoss: preset.maxDailyLoss,
        minTradingDays: preset.minDays
      }));
    }
  };

  const handleSaveAccount = async () => {
    if (!accForm.name) {
      showToast('Please provide an Account Name.', 'error');
      return;
    }

    const accountPayload = {
      name: accForm.name,
      type: accForm.type,
      propFirm: accForm.propFirm,
      capital: Number(accForm.capital),
      balance: Number(accForm.balance),
      profitTarget: Number(accForm.profitTarget),
      maxLoss: Number(accForm.maxLoss),
      payoutGoal: Number(accForm.payoutGoal),
      drawdownType: accForm.drawdownType,
      drawdownLimit: Number(accForm.drawdownLimit),
      maxDailyLoss: Number(accForm.maxDailyLoss),
      minTradingDays: Number(accForm.minTradingDays),
      evaluationStatus: accForm.evaluationStatus
    };

    try {
      if (editingAccountId === 'new') {
        const generatedId = `acc-${Date.now()}`;
        await db.accounts.add({
          id: generatedId,
          ...accountPayload
        });
        setEditingAccountId(generatedId);
        if (setSelectedAccountId) setSelectedAccountId(generatedId);
        showToast('Account created successfully!');
      } else {
        await db.accounts.update(editingAccountId, accountPayload);
        showToast('Account updated successfully!');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save account.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (editingAccountId === 'new') return;
    
    if (window.confirm(`Are you sure you want to delete account "${accForm.name}"? This will delete all referenced trades.`)) {
      try {
        // Cascade delete referenced trades and executions in dependency order
        const referencedTrades = await db.trades.where('accountId').equals(editingAccountId).toArray();
        const tradeIds = referencedTrades.map(t => t.id);
        
        for (const tid of tradeIds) {
          await db.executions.where('tradeId').equals(tid).delete();
        }
        await db.trades.where('accountId').equals(editingAccountId).delete();
        await db.accounts.delete(editingAccountId);

        // Set active account to the first available one
        const remaining = accounts.filter(a => a.id !== editingAccountId);
        if (remaining.length > 0) {
          setEditingAccountId(remaining[0].id);
          if (setSelectedAccountId) setSelectedAccountId(remaining[0].id);
        }
        showToast('Account and all associated records deleted.');
      } catch (err) {
        console.error(err);
        showToast('Delete failed.', 'error');
      }
    }
  };

  const handleAddTag = () => {
    if (!newTagText.trim()) return;
    const clean = newTagText.trim().toUpperCase();
    if (playbookTags.includes(clean)) {
      showToast('Strategy Tag already exists.', 'error');
      return;
    }
    const updated = [...playbookTags, clean];
    setPlaybookTags(updated);
    localStorage.setItem('playbookTags', JSON.stringify(updated));
    setNewTagText('');
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
  };

  const handleRemoveTag = (tag) => {
    const updated = playbookTags.filter(t => t !== tag);
    setPlaybookTags(updated);
    localStorage.setItem('playbookTags', JSON.stringify(updated));
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
  };

  const handleSaveInterface = () => {
    localStorage.setItem('hollowUsername', profileSettings.displayName.trim() || 'User');
    window.dispatchEvent(new Event('hollowSettingsUpdated'));
  };

  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      overflow: 'hidden',
      padding: isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px',
      boxSizing: 'border-box'
    }}>
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
      
      {/* Title Header */}
      <div className="hollow-view-header" style={{ marginBottom: '4px' }}>
        <div className="hollow-view-header-title-block">
          <h1>
            <Settings size={28} color="var(--colors-primary)" /> Control Center Settings
          </h1>
          <p>
            Configure prop firm account parameters, playbook setups, and interface visual overlays.
          </p>
        </div>
      </div>

      {/* Settings Panel Shell */}
      <div className="hollow-card" style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: '0', 
        padding: '0', 
        flex: 1, 
        overflow: isMobile ? 'auto' : 'hidden',
        border: '1px solid var(--colors-hairline-dark)'
      }}>
        
        {/* Left Sub-Tab selector */}
        <div style={{ 
          background: 'var(--colors-surface-deep)', 
          borderRight: isMobile ? 'none' : '1px solid var(--colors-hairline-dark)',
          borderBottom: isMobile ? '1px solid var(--colors-hairline-dark)' : 'none',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          padding: isMobile ? '8px 16px' : '24px 0',
          gap: isMobile ? '8px' : '6px',
          overflowX: isMobile ? 'auto' : 'visible',
          scrollbarWidth: 'none'
        }} className="hollow-menu-scrollbar">
          {[
                      { id: 'accounts', label: 'Accounts Manager', icon: <CreditCard size={16} /> },
            { id: 'playbook', label: 'Playbook Models', icon: <Target size={16} /> },
            { id: 'profile', label: 'Profile', icon: <User size={16} /> }
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: isMobile ? 'auto' : '100%',
                  padding: isMobile ? '8px 16px' : '12px 24px',
                  background: isSelected ? 'var(--colors-surface-card)' : 'transparent',
                  border: 'none',
                  borderRadius: isMobile ? '10px' : '0',
                  color: isSelected ? '#fff' : 'var(--colors-on-dark-mute)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: isSelected ? '600' : '500',
                  textAlign: 'left',
                  outline: 'none',
                  borderRight: !isMobile && isSelected ? '3px solid var(--colors-primary)' : 'none',
                  borderBottom: isMobile && isSelected ? '2px solid var(--colors-primary)' : 'none',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ color: isSelected ? 'var(--colors-primary)' : 'inherit' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Form Container */}
        <div style={{ padding: isMobile ? '20px 16px' : '36px', overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* TAB 1: Accounts Manager */}
          {activeTab === 'accounts' && (() => {
            const getAccountBalance = (acc) => {
              if (!acc) return 0;
              const accTrades = trades.filter(t => t.accountId === acc.id);
              let totalPnL = 0;
              accTrades.forEach(trade => {
                const tradeExecs = executions.filter(e => e.tradeId === trade.id);
                const math = calculateTradePnL(trade, tradeExecs);
                totalPnL += math.netPnL;
              });
              return Math.round(acc.balance + totalPnL);
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: '600' }}>Accounts Manager</h3>
                    <p style={{ fontSize: '12px', color: 'var(--colors-stone)', marginTop: '2px' }}>
                      Create and manage your trading account profiles. Click any card to edit details.
                    </p>
                  </div>
                  <button 
                    className="btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}
                    onClick={() => {
                      setEditingAccountId('new');
                      setSettingsPresetId('custom');
                      setIsDrawerOpen(true);
                    }}
                  >
                    <Plus size={14} /> New Account
                  </button>
                </div>

                {/* Visual Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
                  gap: '20px',
                  marginTop: '10px'
                }}>
                  {accounts.map(acc => {
                    const balance = getAccountBalance(acc);
                    const profitTargetProgress = acc.profitTarget && acc.profitTarget > acc.capital
                      ? Math.max(0, Math.min(100, ((balance - acc.capital) / (acc.profitTarget - acc.capital)) * 100))
                      : null;
                      
                    const drawdownDistance = balance - acc.maxLoss;
                    const drawdownLimit = acc.drawdownLimit || (acc.capital - acc.maxLoss) || 1;
                    const drawdownBuffer = acc.maxLoss
                      ? Math.max(0, Math.min(100, (drawdownDistance / drawdownLimit) * 100))
                      : null;

                    const theme = getCardTheme(acc.propFirm, acc.type);
                    
                    return (
                      <div 
                        key={acc.id}
                        onClick={() => {
                          setEditingAccountId(acc.id);
                          setIsDrawerOpen(true);
                        }}
                        style={{
                          background: theme.background,
                          border: `1px solid ${theme.borderColor}`,
                          boxShadow: theme.boxShadow,
                          borderRadius: '20px',
                          padding: '20px',
                          height: '190px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = theme.hoverBoxShadow || '0 15px 30px rgba(0,0,0,0.4)';
                          e.currentTarget.style.borderColor = theme.hoverBorderColor || 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = theme.boxShadow;
                          e.currentTarget.style.borderColor = theme.borderColor;
                        }}
                      >
                        {/* Glow decoration */}
                        <div style={{
                          position: 'absolute',
                          top: '-40px',
                          right: '-40px',
                          width: '110px',
                          height: '110px',
                          borderRadius: '50%',
                          background: theme.accentColor,
                          filter: 'blur(30px)',
                          opacity: 0.12,
                          pointerEvents: 'none'
                        }} />

                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: '700', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.8px', 
                              color: theme.textColorSecondary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {acc.propFirm || 'Private Broker'}
                            </span>
                            <span style={{ 
                              fontSize: '14px', 
                              fontWeight: '800', 
                              color: theme.textColorPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {acc.name}
                            </span>
                          </div>
                          
                          {/* Status Pill */}
                          <span style={{
                            fontSize: '8px',
                            fontWeight: '800',
                            letterSpacing: '0.8px',
                            padding: '3px 8px',
                            borderRadius: '100px',
                            background: getStatusStyle(acc.evaluationStatus).bg,
                            border: `1px solid ${getStatusStyle(acc.evaluationStatus).border}`,
                            color: getStatusStyle(acc.evaluationStatus).color,
                            boxShadow: getStatusStyle(acc.evaluationStatus).shadow,
                            textTransform: 'uppercase',
                            zIndex: 1,
                            flexShrink: 0
                          }}>
                            {acc.evaluationStatus}
                          </span>
                        </div>

                        {/* Card Body (Balance) */}
                        <div style={{ margin: '8px 0', zIndex: 1 }}>
                          <span style={{ fontSize: '9px', color: theme.textColorSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance</span>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: theme.textColorPrimary, fontFamily: 'var(--font-heading)', marginTop: '1px' }}>
                            ${balance.toLocaleString()}
                          </div>
                        </div>

                        {/* Card Footer (Progress Indicators) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1 }}>
                          {/* Profit Target Progress */}
                          {profitTargetProgress !== null && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: theme.textColorSecondary }}>
                                <span>PROFIT TARGET PROGRESS</span>
                                <span style={{ fontWeight: '700', color: theme.textColorPrimary }}>{Math.round(profitTargetProgress)}%</span>
                              </div>
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${profitTargetProgress}%`, 
                                  height: '100%', 
                                  background: '#ffffff',
                                  borderRadius: '10px',
                                  boxShadow: 'none'
                                }} />
                              </div>
                            </div>
                          )}

                          {/* Drawdown Buffer Progress */}
                          {drawdownBuffer !== null && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: theme.textColorSecondary }}>
                                <span>DRAWDOWN BUFFER</span>
                                <span style={{ 
                                  fontWeight: '700', 
                                  color: drawdownBuffer > 50 ? '#ffffff' : (drawdownBuffer > 30 ? '#8e8e93' : '#3a3a3c')
                                }}>
                                  {Math.round(drawdownBuffer)}%
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${drawdownBuffer}%`, 
                                  height: '100%', 
                                  background: drawdownBuffer > 50 
                                    ? '#ffffff' 
                                    : (drawdownBuffer > 30 
                                        ? '#8e8e93' 
                                        : '#3a3a3c'),
                                  borderRadius: '10px',
                                  boxShadow: 'none'
                                }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Add Account Card */}
                  <div 
                    onClick={() => {
                      setEditingAccountId('new');
                      setSettingsPresetId('custom');
                      setIsDrawerOpen(true);
                    }}
                    style={{
                      border: '2px dashed rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      height: '190px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      const icon = e.currentTarget.querySelector('.plus-icon-container');
                      if (icon) {
                        icon.style.transform = 'scale(1.1)';
                        icon.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.1)';
                        icon.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                      const icon = e.currentTarget.querySelector('.plus-icon-container');
                      if (icon) {
                        icon.style.transform = 'scale(1)';
                        icon.style.boxShadow = 'none';
                        icon.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                  >
                    <div 
                      className="plus-icon-container"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Plus size={18} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.4)' }}>Add Account Profile</span>
                  </div>
                </div>

                {/* Slide-over Workspace Portal Drawer */}
                {createPortal(
                  <AnimatePresence>
                    {isDrawerOpen && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="hollow-drawer-backdrop" 
                        style={{ animation: 'none' }}
                        onClick={() => setIsDrawerOpen(false)}
                      >
                        <motion.div 
                          initial={{ x: "100%" }}
                          animate={{ x: 0 }}
                          exit={{ x: "100%" }}
                          transition={{ type: "spring", stiffness: 350, damping: 28 }}
                          className="hollow-drawer-container" 
                          style={{ animation: 'none', width: isMobile ? '100%' : '560px' }}
                          onClick={e => e.stopPropagation()}
                        >
                      
                      {/* Drawer Header */}
                      <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>
                            {editingAccountId === 'new' ? 'New Account Profile' : 'Edit Account Details'}
                          </h3>
                          <p style={{ fontSize: '11px', color: 'var(--colors-stone)', marginTop: '2px' }}>
                            Configure prop firm guidelines, starting balances, and target validation metrics.
                          </p>
                        </div>
                        <button 
                          onClick={() => setIsDrawerOpen(false)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255, 255, 255, 0.6)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none',
                            fontSize: '18px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                        >
                          ×
                        </button>
                      </div>

                      {/* Drawer Body (Scrollable content) */}
                      <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }} className="hollow-menu-scrollbar">
                        
                        {/* Live Card Preview */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                            Live Preview
                          </span>
                          {(() => {
                            const previewBalance = Number(accForm.balance) || 0;
                            const previewCapital = Number(accForm.capital) || 0;
                            const previewTarget = Number(accForm.profitTarget) || 0;
                            const previewMaxLoss = Number(accForm.maxLoss) || 0;
                            
                            const profitTargetProgress = previewTarget && previewTarget > previewCapital
                              ? Math.max(0, Math.min(100, ((previewBalance - previewCapital) / (previewTarget - previewCapital)) * 100))
                              : null;
                              
                            const drawdownDistance = previewBalance - previewMaxLoss;
                            const drawdownLimit = Number(accForm.drawdownLimit) || (previewCapital - previewMaxLoss) || 1;
                            const drawdownBuffer = previewMaxLoss
                              ? Math.max(0, Math.min(100, (drawdownDistance / drawdownLimit) * 100))
                              : null;

                            const theme = getCardTheme(accForm.propFirm, accForm.type);
                            
                            return (
                              <div style={{
                                background: theme.background,
                                border: `1px solid ${theme.borderColor}`,
                                boxShadow: theme.boxShadow,
                                borderRadius: '20px',
                                padding: '20px',
                                height: '190px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-40px',
                                  right: '-40px',
                                  width: '110px',
                                  height: '110px',
                                  borderRadius: '50%',
                                  background: theme.accentColor,
                                  filter: 'blur(30px)',
                                  opacity: 0.12,
                                  pointerEvents: 'none'
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: theme.textColorSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {accForm.propFirm || 'Private Broker'}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: theme.textColorPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {accForm.name || 'Untitled Account'}
                                    </span>
                                  </div>
                                  
                                  <span style={{
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    letterSpacing: '0.8px',
                                    padding: '3px 8px',
                                    borderRadius: '100px',
                                    background: getStatusStyle(accForm.evaluationStatus).bg,
                                    border: `1px solid ${getStatusStyle(accForm.evaluationStatus).border}`,
                                    color: getStatusStyle(accForm.evaluationStatus).color,
                                    boxShadow: getStatusStyle(accForm.evaluationStatus).shadow,
                                    textTransform: 'uppercase',
                                    flexShrink: 0
                                  }}>
                                    {accForm.evaluationStatus}
                                  </span>
                                </div>

                                <div style={{ margin: '8px 0', zIndex: 1 }}>
                                  <span style={{ fontSize: '9px', color: theme.textColorSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance</span>
                                  <div style={{ fontSize: '24px', fontWeight: '800', color: theme.textColorPrimary, fontFamily: 'var(--font-heading)', marginTop: '1px' }}>
                                    ${previewBalance.toLocaleString()}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1 }}>
                                  {profitTargetProgress !== null && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: theme.textColorSecondary }}>
                                        <span>PROFIT TARGET PROGRESS</span>
                                        <span style={{ fontWeight: '700', color: theme.textColorPrimary }}>{Math.round(profitTargetProgress)}%</span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${profitTargetProgress}%`, 
                                          height: '100%', 
                                          background: '#ffffff',
                                          borderRadius: '10px',
                                          boxShadow: 'none'
                                        }} />
                                      </div>
                                    </div>
                                  )}

                                  {drawdownBuffer !== null && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: theme.textColorSecondary }}>
                                        <span>DRAWDOWN BUFFER</span>
                                        <span style={{ 
                                          fontWeight: '700', 
                                          color: drawdownBuffer > 50 ? '#ffffff' : (drawdownBuffer > 30 ? '#8e8e93' : '#3a3a3c')
                                        }}>
                                          {Math.round(drawdownBuffer)}%
                                        </span>
                                      </div>
                                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${drawdownBuffer}%`, 
                                          height: '100%', 
                                          background: drawdownBuffer > 50 
                                            ? '#ffffff' 
                                            : (drawdownBuffer > 30 
                                                ? '#8e8e93' 
                                                : '#3a3a3c'),
                                          borderRadius: '10px',
                                          boxShadow: 'none'
                                        }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Presets Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                            Autofill Plan Preset
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '6px' }}>
                            {[
                              { id: 'apex-50', name: 'Apex 50K' },
                              { id: 'apex-100', name: 'Apex 100K' },
                              { id: 'topstep-50', name: 'Topstep 50K' },
                              { id: 'topstep-100', name: 'Topstep 100K' },
                              { id: 'mffu-50', name: 'MFFU 50K' },
                              { id: 'mffu-100', name: 'MFFU 100K' }
                            ].map(preset => {
                              const isSelected = settingsPresetId === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  style={{
                                    background: isSelected ? 'var(--colors-primary-dim)' : 'rgba(255, 255, 255, 0.02)',
                                    border: `1px solid ${isSelected ? 'var(--colors-primary)' : 'rgba(255, 255, 255, 0.05)'}`,
                                    color: isSelected ? '#fff' : 'var(--colors-stone)',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    textAlign: 'center'
                                  }}
                                  onClick={() => {
                                    setSettingsPresetId(preset.id);
                                    const match = PROP_FIRM_PRESETS.find(p => p.id === preset.id);
                                    if (match) {
                                      setAccForm(prev => ({
                                        ...prev,
                                        name: match.name,
                                        propFirm: match.propFirm,
                                        type: match.type,
                                        balance: match.balance,
                                        capital: match.balance,
                                        profitTarget: match.balance + match.target,
                                        maxLoss: match.balance - match.drawdownLimit,
                                        payoutGoal: match.balance + match.target,
                                        drawdownType: match.drawdownType,
                                        drawdownLimit: match.drawdownLimit,
                                        maxDailyLoss: match.maxDailyLoss,
                                        minTradingDays: match.minDays
                                      }));
                                    }
                                  }}
                                >
                                  {preset.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Input form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          
                          {/* Section 1: Identity */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-primary)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                              1. Account Identity
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>ACCOUNT DISPLAY NAME</label>
                                <input 
                                  className="hollow-input"
                                  value={accForm.name}
                                  onChange={e => setAccForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="e.g. Apex Funded #1 (50K)"
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>PROP FIRM / BROKER NAME</label>
                                <input 
                                  className="hollow-input"
                                  value={accForm.propFirm}
                                  onChange={e => setAccForm(prev => ({ ...prev, propFirm: e.target.value }))}
                                  placeholder="e.g. Apex Trader Funding"
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', marginBottom: '4px' }}>ACCOUNT TYPE</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {['Funded', 'Evaluation', 'Live', 'Other'].map(t => {
                                    const tStyles = getTypeStyles(t);
                                    const isActive = accForm.type === t || (t === 'Live' && accForm.type === 'Personal');
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setAccForm(prev => ({ ...prev, type: t }))}
                                        style={{
                                          background: isActive ? tStyles.bg : 'rgba(255,255,255,0.02)',
                                          border: isActive ? `1px solid ${tStyles.color}` : '1px solid rgba(255,255,255,0.06)',
                                          borderRadius: '20px',
                                          padding: '8px 14px',
                                          color: isActive ? tStyles.color : 'rgba(255,255,255,0.5)',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          outline: 'none',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px'
                                        }}
                                      >
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tStyles.color }} />
                                        {t === 'Live' ? 'Live / Personal' : t}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Ledger Targets */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-primary)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                              2. Capitalization & Targets
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>STARTING BASE CAPITAL ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.capital}
                                  onChange={e => setAccForm(prev => ({ ...prev, capital: Number(e.target.value) }))}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>CURRENT STARTING BALANCE ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.balance}
                                  onChange={e => setAccForm(prev => ({ ...prev, balance: Number(e.target.value) }))}
                                />
                              </div>
                              {/* Starting Balance Presets */}
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', gridColumn: isMobile ? 'span 1' : 'span 2', marginTop: '2px' }}>
                                {[25000, 50000, 100000, 150000, 250000, 300000].map(amt => {
                                  const isSelected = accForm.balance === amt && accForm.capital === amt;
                                  return (
                                    <button
                                      key={amt}
                                      type="button"
                                      onClick={() => setAccForm(prev => ({ ...prev, balance: amt, capital: amt }))}
                                      style={{
                                        background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                        border: isSelected ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.04)',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        color: isSelected ? '#fff' : 'var(--colors-stone)',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        outline: 'none'
                                      }}
                                    >
                                      ${amt.toLocaleString()}
                                    </button>
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>PROFIT VALIDATION TARGET ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.profitTarget}
                                  onChange={e => setAccForm(prev => ({ ...prev, profitTarget: Number(e.target.value) }))}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>PAYOUT ELIGIBILITY GOAL ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.payoutGoal}
                                  onChange={e => setAccForm(prev => ({ ...prev, payoutGoal: Number(e.target.value) }))}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section 3: Drawdown Risk Bounds */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-primary)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                              3. Drawdown & Risk Bounds
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>DRAWDOWN LIMIT TYPE</label>
                                <HollowSelect
                                  value={accForm.drawdownType}
                                  onChange={val => setAccForm(prev => ({ ...prev, drawdownType: val }))}
                                  options={[
                                    { value: 'None', label: 'None / Unlimited' },
                                    { value: 'Static', label: 'Static / Fixed Stop' },
                                    { value: 'Trailing', label: 'Trailing Drawdown' },
                                    { value: 'Daily', label: 'Daily Drawdown only' }
                                  ]}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>DRAWDOWN LIMIT ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.drawdownLimit}
                                  onChange={e => setAccForm(prev => ({ ...prev, drawdownLimit: Number(e.target.value) }))}
                                  placeholder="e.g. 2500"
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>MAX LOSS BOUNDARY ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.maxLoss}
                                  onChange={e => setAccForm(prev => ({ ...prev, maxLoss: Number(e.target.value) }))}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>MAX DAILY LOSS LIMIT ($)</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.maxDailyLoss}
                                  onChange={e => setAccForm(prev => ({ ...prev, maxDailyLoss: Number(e.target.value) }))}
                                  placeholder="e.g. 1000"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section 4: Rules Status */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-primary)', letterSpacing: '0.8px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                              4. Rules Compliance & Status
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>MIN REQUIRED TRADING DAYS</label>
                                <input 
                                  className="hollow-input"
                                  type="number"
                                  value={accForm.minTradingDays}
                                  onChange={e => setAccForm(prev => ({ ...prev, minTradingDays: Number(e.target.value) }))}
                                  placeholder="e.g. 5"
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700' }}>EVALUATION STATUS</label>
                                <HollowSelect
                                  value={accForm.evaluationStatus}
                                  onChange={val => setAccForm(prev => ({ ...prev, evaluationStatus: val }))}
                                  options={[
                                    { value: 'Active', label: 'Active (Trading)' },
                                    { value: 'Passed', label: 'Passed (Target Met)' },
                                    { value: 'Failed', label: 'Failed (Breached)' },
                                    { value: 'Payout', label: 'Payout Eligible' }
                                  ]}
                                />
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Drawer Footer Actions */}
                      <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        background: 'rgba(12, 10, 26, 0.4)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          {editingAccountId !== 'new' && (
                            <button 
                              type="button"
                              onClick={() => {
                                handleDeleteAccount();
                                setIsDrawerOpen(false);
                              }}
                              style={{
                                background: 'rgba(234, 84, 85, 0.12)',
                                border: '1px solid var(--colors-loss)',
                                color: 'var(--colors-loss)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                outline: 'none'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(234, 84, 85, 0.2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(234, 84, 85, 0.12)'}
                            >
                              <Trash2 size={12} /> Delete Profile
                            </button>
                          )}
                        </div>

                        {(() => {
                          const typeStyles = getTypeStyles(accForm.type || 'Funded');
                          const hasName = (accForm.name || '').trim().length > 0;
                          return (
                            <button 
                              type="button"
                              disabled={!hasName}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '8px 20px',
                                background: hasName
                                  ? `linear-gradient(135deg, ${typeStyles.color} 0%, ${typeStyles.color}cc 100%)`
                                  : 'rgba(255, 255, 255, 0.04)',
                                border: hasName ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: 'var(--radius-md)',
                                color: hasName ? ((accForm.type === 'Live' || accForm.type === 'Evaluation' || accForm.type === 'Personal') ? '#fff' : '#000') : 'rgba(255, 255, 255, 0.25)',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: hasName ? 'pointer' : 'default',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: hasName ? `0 4px 16px rgba(${typeStyles.rgb}, 0.25)` : 'none',
                                outline: 'none'
                              }}
                              onClick={async () => {
                                if (!hasName) return;
                                await handleSaveAccount();
                                setIsDrawerOpen(false);
                              }}
                            >
                              <Save size={12} /> {editingAccountId === 'new' ? 'Create Account' : 'Save Details'}
                            </button>
                          );
                        })()}
                      </div>

                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}

              </div>
            );
          })()}

          {/* TAB 2: Playbook Models — Full Redesign */}
          {activeTab === 'playbook' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: '700' }}>Playbook Models</h3>
                  <p style={{ fontSize: '12px', color: 'var(--colors-stone)', marginTop: '4px', lineHeight: 1.5 }}>
                    Define your personal trading setups. Track stats, confluences, and validation checklists for each pattern.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewModelRules([]);
                    setTempRuleInput('');
                    setShowAddForm(!showAddForm);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: showAddForm ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px', padding: '8px 14px',
                    color: '#ffffff', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', outline: 'none', transition: 'all 0.2s', flexShrink: 0
                  }}
                >
                  <Plus size={13} /> New Model
                </button>
              </div>

              {/* Stats Summary Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '8px' }}>
                {/* Total Setup Types Card */}
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', borderRadius: '14px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Setup Models</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', fontFamily: 'var(--font-heading)' }}>
                    {playbookTags.length} <span style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '500' }}>Active</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Across {nonEmptyCategories.length} Categories</span>
                </div>

                {/* Overall Playbook PnL Card */}
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', borderRadius: '14px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Combined Playbook Return</span>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '800', 
                    color: totalPlaybookPnL > 0 ? 'var(--colors-gain)' : (totalPlaybookPnL < 0 ? 'var(--colors-loss)' : '#fff'), 
                    fontFamily: 'var(--font-heading)' 
                  }}>
                    {totalPlaybookPnL > 0 ? '+' : ''}${totalPlaybookPnL.toLocaleString()}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>From mapped trades</span>
                </div>

                {/* Most Traded Model Card */}
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', borderRadius: '14px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Most Logged Setup</span>
                  {mostTradedModel ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                        {mostTradedModel}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                        {playbookStats[mostTradedModel]?.tradesCount} trades · {playbookStats[mostTradedModel]?.winRate}% WR
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>No trades logged</div>
                  )}
                </div>

                {/* Best Performing Model Card */}
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '6px', borderRadius: '14px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Best Profit Setup</span>
                  {bestPerformingModel ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--colors-gain)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                        {bestPerformingModel}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                        +${playbookStats[bestPerformingModel]?.netPnL.toLocaleString()} net profit
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>No profitable setup</div>
                  )}
                </div>
              </div>

              {/* Add Model Form */}
              {showAddForm && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--colors-hairline-dark)',
                  borderRadius: '16px', padding: '20px',
                  display: 'flex', flexDirection: 'column', gap: '16px',
                  animation: 'menuScaleIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards',
                  transformOrigin: 'top'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.8px' }}>New Playbook Model</span>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase' }}>Model Name</label>
                      <input
                        className="hollow-input"
                        placeholder="e.g. MSS, BREAKER, IFVG"
                        value={newModel.name}
                        onChange={e => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddModel(); }}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase' }}>Category</label>
                      <HollowSelect
                        value={newModel.category}
                        onChange={val => setNewModel(prev => ({ ...prev, category: val }))}
                        options={CATEGORIES.map(c => ({ value: c, label: c }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase' }}>Description (optional)</label>
                    <input
                      className="hollow-input"
                      placeholder="Briefly describe the setup conditions..."
                      value={newModel.description}
                      onChange={e => setNewModel(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Setup Rules Checklist Creator */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase' }}>Setup Verification Checklist</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="hollow-input"
                        placeholder="e.g. Sweep of weekly liquidity high"
                        value={tempRuleInput}
                        onChange={e => setTempRuleInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewModelRule(); } }}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddNewModelRule} 
                        className="btn-ghost" 
                        style={{ padding: '0 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={12} /> Add Rule
                      </button>
                    </div>

                    {/* Rules list */}
                    {newModelRules.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        background: 'rgba(0,0,0,0.15)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        {newModelRules.map((rule, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)' }}>
                              <span style={{ color: 'var(--colors-primary)', fontWeight: '700', marginRight: '6px' }}>✓</span> {rule}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveNewModelRule(idx)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,107,107,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '700', textTransform: 'uppercase' }}>Colour Label</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {COLOR_SWATCHES.map(c => (
                        <div
                          key={c}
                          onClick={() => setNewModel(prev => ({ ...prev, color: c }))}
                          style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: c, cursor: 'pointer',
                            border: newModel.color === c ? '2px solid #fff' : '2px solid transparent',
                            boxShadow: newModel.color === c ? `0 0 8px ${c}` : 'none',
                            transition: 'all 0.15s'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>Cancel</button>
                    <button onClick={handleAddModel} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '12px' }}><Plus size={12} /> Add Model</button>
                  </div>
                </div>
              )}

              {/* Filters & Sorting Toolbar */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '8px 16px',
                marginBottom: '4px'
              }}>
                {/* Left: Category pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }} className="hollow-hide-scrollbar">
                  {['All', ...CATEGORIES].map(cat => {
                    const isSelected = pbFilterCategory === cat;
                    const count = cat === 'All' 
                      ? playbookTags.length
                      : playbookTags.filter(tag => (modelData[tag]?.category || 'Custom') === cat).length;
                      
                    return (
                      <button
                        key={cat}
                        onClick={() => setPbFilterCategory(cat)}
                        style={{
                          background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(255, 255, 255, 0.25)' : 'transparent'}`,
                          color: isSelected ? '#ffffff' : 'var(--colors-stone)',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          outline: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat}
                        <span style={{
                          fontSize: '9px',
                          background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isSelected ? '#fff' : 'var(--colors-stone)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: '700'
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Search + Sort */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                  <div style={{ position: 'relative', width: isMobile ? '100%' : '180px', flex: isMobile ? 1 : 'none' }}>
                    <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                    <input
                      className="hollow-input"
                      placeholder="Search setups..."
                      value={pbSearchQuery}
                      onChange={e => setPbSearchQuery(e.target.value)}
                      style={{
                        paddingLeft: '28px',
                        paddingTop: '6px',
                        paddingBottom: '6px',
                        fontSize: '11px',
                        height: '28px',
                        width: '100%',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    />
                    {pbSearchQuery && (
                      <button 
                        onClick={() => setPbSearchQuery('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowUpDown size={11} style={{ color: 'var(--colors-stone)' }} />
                    <HollowSelect
                      value={pbSortBy}
                      onChange={val => setPbSortBy(val)}
                      options={[
                        { value: 'name', label: 'Name' },
                        { value: 'trades', label: 'Trades' },
                        { value: 'winrate', label: 'Win Rate' },
                        { value: 'pnl', label: 'PnL' }
                      ]}
                      style={{
                        height: '28px',
                        fontSize: '11px',
                        padding: '0 8px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Models Grid */}
              {filteredModels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--colors-stone)', background: 'rgba(255,255,255,0.005)', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '16px' }}>
                  <Sparkles size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.3)' }}>No playbook setups found</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Try clearing filters or click "New Model" to define a setup.</div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {filteredModels.map(tag => {
                    const meta = modelData[tag] || {};
                    const stats = playbookStats[tag] || { tradesCount: 0, netPnL: 0, winRate: 0, wins: 0, losses: 0 };
                    return (
                      <ModelCard 
                        key={tag} 
                        tag={tag} 
                        meta={meta} 
                        stats={stats} 
                        onDelete={handleDeleteModel}
                        onInspect={setPbInspectModel}
                      />
                    );
                  })}
                </div>
              )}

              {/* Inspect Model Drawer portal */}
              {createPortal(
                <AnimatePresence>
                  {pbInspectModel && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="hollow-drawer-backdrop" 
                      style={{ animation: 'none' }}
                      onClick={() => setPbInspectModel(null)}
                    >
                      <motion.div 
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        className="hollow-drawer-container" 
                        style={{ width: isMobile ? '100%' : '460px', animation: 'none' }}
                        onClick={e => e.stopPropagation()}
                      >
                    
                    {/* Drawer Header */}
                    {(() => {
                      const tag = pbInspectModel;
                      const meta = modelData[tag] || {};
                      const stats = playbookStats[tag] || { tradesCount: 0, netPnL: 0, winRate: 0, wins: 0, losses: 0 };
                      const color = meta.color || '#9d85f5';
                      const recentTrades = getRecentTradesForModel(tag, 5);

                      return (
                        <>
                          <div style={{
                            padding: '24px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'relative'
                          }}>
                            {/* Colored top edge glow */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              background: color,
                              boxShadow: `0 0 10px ${color}`
                            }} />

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ 
                                  fontSize: '18px', 
                                  fontWeight: '800', 
                                  color: '#fff', 
                                  fontFamily: 'var(--font-heading)' 
                                }}>
                                  {tag}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.8px',
                                  padding: '3px 8px',
                                  borderRadius: '100px',
                                  background: `${color}15`,
                                  border: `1px solid ${color}35`,
                                  color: color
                                }}>
                                  {meta.category || 'Custom'}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', color: 'var(--colors-stone)', marginTop: '4px' }}>
                                Playbook Model Details & Historical Analytics
                              </p>
                            </div>
                            <button 
                              onClick={() => setPbInspectModel(null)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                outline: 'none',
                                fontSize: '18px'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                            >
                              ×
                            </button>
                          </div>

                          {/* Drawer Body (Scrollable) */}
                          <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px'
                          }} className="hollow-menu-scrollbar">
                            
                            {/* Description Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                Model Description
                              </span>
                              <div style={{
                                background: 'rgba(255, 255, 255, 0.015)',
                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                padding: '14px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.8)',
                                lineHeight: 1.5
                              }}>
                                {meta.description || 'No description provided for this setup model.'}
                              </div>
                            </div>

                            {/* Performance Stats Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                Performance Analytics
                              </span>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px'
                              }}>
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                  <div style={{ fontSize: '8px', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Win Rate</div>
                                  <div style={{ fontSize: '18px', fontWeight: '800', color: stats.winRate >= 50 ? '#3adb81' : (stats.tradesCount > 0 ? '#ff6b6b' : '#fff'), marginTop: '2px' }}>
                                    {stats.winRate}%
                                  </div>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                  <div style={{ fontSize: '8px', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Net Return</div>
                                  <div style={{ fontSize: '18px', fontWeight: '800', color: stats.netPnL > 0 ? 'var(--colors-gain)' : (stats.netPnL < 0 ? 'var(--colors-loss)' : '#fff'), marginTop: '2px' }}>
                                    {stats.netPnL > 0 ? '+' : ''}${stats.netPnL.toLocaleString()}
                                  </div>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                  <div style={{ fontSize: '8px', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Total Trades</div>
                                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                                    {stats.tradesCount}
                                  </div>
                                </div>
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                  <div style={{ fontSize: '8px', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Wins / Losses</div>
                                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginTop: '6px' }}>
                                    <span style={{ color: '#3adb81' }}>{stats.wins} W</span> · <span style={{ color: '#ff6b6b' }}>{stats.losses} L</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Rules Checklist Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                Setup Validation Rules
                              </span>
                              {meta.rules && meta.rules.length > 0 ? (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                  background: 'rgba(255,255,255,0.01)',
                                  border: '1px solid rgba(255,255,255,0.04)',
                                  padding: '14px',
                                  borderRadius: '12px'
                                }}>
                                  {meta.rules.map((rule, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                      <CheckCircle2 size={13} style={{ color: color, marginTop: '2px', flexShrink: 0 }} />
                                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                        {rule}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', padding: '12px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                                  No specific validation rules defined for this setup.
                                </div>
                              )}
                            </div>

                            {/* Recent Trades Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                Recent Mapped Trades
                              </span>
                              {recentTrades.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {recentTrades.map(trade => {
                                    const tradeExecs = executions.filter(e => e.tradeId === trade.id);
                                    const math = calculateTradePnL(trade, tradeExecs);
                                    const tColor = math.netPnL > 0 ? 'var(--colors-gain)' : (math.netPnL < 0 ? 'var(--colors-loss)' : '#fff');
                                    const tSign = math.netPnL > 0 ? '+' : '';
                                    const formattedDate = new Date(trade.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                                    return (
                                      <div key={trade.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        background: 'rgba(255,255,255,0.015)',
                                        border: '1px solid rgba(255,255,255,0.03)',
                                        borderRadius: '10px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-mono)' }}>{trade.symbol}</span>
                                            <span style={{ fontSize: '9px', color: 'var(--colors-stone)' }}>{formattedDate}</span>
                                          </div>
                                          <span style={{
                                            fontSize: '8px',
                                            fontWeight: '800',
                                            letterSpacing: '0.5px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: trade.bias === 'LONG' ? 'rgba(58,219,129,0.1)' : 'rgba(255,107,107,0.1)',
                                            border: `1px solid ${trade.bias === 'LONG' ? 'rgba(58,219,129,0.2)' : 'rgba(255,107,107,0.2)'}`,
                                            color: trade.bias === 'LONG' ? '#3adb81' : '#ff6b6b'
                                          }}>
                                            {trade.bias}
                                          </span>
                                        </div>

                                        <span style={{ fontSize: '12px', fontWeight: '700', color: tColor, fontFamily: 'var(--font-mono)' }}>
                                          {tSign}${Math.round(math.netPnL).toLocaleString()}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', padding: '12px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                                  No trades mapped to this setup model yet.
                                </div>
                              )}
                            </div>

                          </div>

                          {/* Drawer Footer Actions */}
                          <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            background: 'rgba(12, 10, 26, 0.4)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center'
                          }}>
                            <button 
                              type="button" 
                              className="btn-primary" 
                              style={{ padding: '8px 20px', fontSize: '12px' }}
                              onClick={() => setPbInspectModel(null)}
                            >
                              Close View
                            </button>
                          </div>
                        </>
                      );
                    })()}
                    
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>,
                document.body
              )}

            </div>
          )}

          {/* TAB 3: Profile */}
          {activeTab === 'profile' && (() => {
            const SectionHeader = ({ title }) => (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '20px 0 8px' }}>
                {title}
              </div>
            );

            const Toggle = ({ value, onToggle }) => (
              <div
                onClick={onToggle}
                style={{
                  width: 51,
                  height: 31,
                  borderRadius: 100,
                  background: value ? '#30d158' : '#3a3a3c',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.25s',
                  flexShrink: 0
                }}
              >
                <div style={{
                  position: 'absolute',
                  width: 27,
                  height: 27,
                  top: 2,
                  left: value ? 22 : 2,
                  background: 'white',
                  borderRadius: '50%',
                  transition: 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                }} />
              </div>
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>

                {/* User card */}
                <div style={{
                  background: '#0f0f11',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20,
                  padding: '20px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0a84ff, #bf5af2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#fff',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                      fontFamily: 'var(--font-heading)'
                    }}>
                      {(profileSettings.displayName ? profileSettings.displayName.trim().charAt(0) : 'H').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                        {profileSettings.displayName || 'Unnamed Trader'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                        {profileSettings.traderTitle || 'Trader · Hollow'}
                      </div>
                      {userEmail && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                          {userEmail}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', gap: 6 }}>
                        <span>{profileSettings.tradingStyle}</span>
                        <span>·</span>
                        <span>{profileSettings.primaryMarket}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(profileSettings.displayName);
                      setEditTitle(profileSettings.traderTitle);
                      setEditMarket(profileSettings.primaryMarket);
                      setEditStyle(profileSettings.tradingStyle);
                      setEditTimezone(profileSettings.timezone);
                      setEditBio(profileSettings.bio);
                      setShowEditProfile(true);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      outline: 'none',
                      flexShrink: 0
                    }}
                  >
                    <Edit2 size={16} />
                  </button>
                </div>


                {/* App Settings */}
                <SectionHeader title="Appearance" />
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {[
                    { label: 'Cloud Backdrop', sub: 'Ambient blur clouds', value: enableClouds, onToggle: toggleClouds },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      gap: 12
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.sub}</div>
                      </div>
                      <Toggle value={item.value} onToggle={item.onToggle} />
                    </div>
                  ))}
                </div>

                {/* About */}
                <SectionHeader title="About" />
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  {[
                    { label: 'Version', value: '1.0.0' },
                    { label: 'Database', value: 'IndexedDB + Supabase' },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Sunday Backup */}
                <SectionHeader title="Automated Sunday Backup" />
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    gap: 12
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Enable Weekly Auto-Backup</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>Triggers automatically when you open the app on Sunday. Saves complete PDF ledger to device.</div>
                    </div>
                    <Toggle value={autoBackupEnabled} onToggle={() => handleToggleAutoBackup(!autoBackupEnabled)} />
                  </div>
                  
                  {/* Pick Folder Option */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>Backup Storage Directory</span>
                    <p style={{ fontSize: '11px', color: 'var(--colors-stone)', margin: '2px 0 10px 0' }}>
                      Select a folder on your local device to save backups automatically. If unsupported or unconfigured, backups fall back to browser downloads.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '11px', color: '#9d76fa', background: 'rgba(157, 118, 250, 0.08)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(157, 118, 250, 0.15)' }}>
                        Destination: <strong>{backupDirName}</strong>
                      </div>
                      {window.showDirectoryPicker && (
                        <>
                          <button type="button" onClick={handleSelectDirectory} className="btn-dark" style={{ padding: '6px 12px', fontSize: '11px', color: '#fff' }}>
                            Choose Folder
                          </button>
                          {backupDirName !== 'Downloads Folder (Default)' && (
                            <button type="button" onClick={handleResetDirectory} className="btn-dark" style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--colors-stone)' }}>
                              Reset to Default
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                      Manually download a complete portable data document (PDF) representing all accounts, journals, trades, and workouts instantly.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleManualBackup}
                        style={{
                          flex: 1,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10,
                          padding: '10px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        Generate Backup Now
                      </button>
                      <button
                        type="button"
                        disabled={!localStorage.getItem('hollow_previous_week_backup_pdf')}
                        onClick={() => {
                          const pdfBase64 = localStorage.getItem('hollow_previous_week_backup_pdf');
                          if (!pdfBase64) {
                            showToast('No backup PDF found in local storage.', 'error');
                            return;
                          }
                          try {
                            const dateRange = localStorage.getItem('hollow_previous_week_backup_range') || 'previous_week';
                            const cleanedRange = dateRange.replace(/\s+/g, '_');
                            const link = document.createElement('a');
                            link.href = pdfBase64;
                            link.download = `hollow_weekly_backup_${cleanedRange}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            showToast("Weekly backup PDF downloaded from local storage!", "success");
                          } catch (err) {
                            console.error("Failed to download PDF from localStorage", err);
                            showToast("Failed to download backup.", "error");
                          }
                        }}
                        style={{
                          flex: 1,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10,
                          padding: '10px',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#fff',
                          cursor: localStorage.getItem('hollow_previous_week_backup_pdf') ? 'pointer' : 'not-allowed',
                          opacity: localStorage.getItem('hollow_previous_week_backup_pdf') ? 1 : 0.5
                        }}
                      >
                        Download Local Backup
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Operations */}
                <SectionHeader title="Account" />
                <div style={{ background: '#0f0f11', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Sign out of your Hollow account? Offline cache will be cleared.')) {
                        const { supabase } = await import('../db/supabaseClient');
                        await supabase.auth.signOut();
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '14px 16px',
                      color: '#ff453a',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none'
                    }}
                  >
                    <span>Sign Out</span>
                    <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('WARNING: Are you sure you want to delete your profile account and permanently wipe all data? This will erase all local and cloud data. This action cannot be undone.')) {
                        const { clearDatabaseAndCloud } = await import('../db/hollowDb');
                        const { supabase } = await import('../db/supabaseClient');
                        await clearDatabaseAndCloud();
                        await supabase.auth.signOut();
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '14px 16px',
                      color: '#ff453a',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none',
                      borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <span>Delete Account & Data</span>
                    <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                  </button>
                </div>

                {/* Brand footer */}
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.02em' }}>hollow.</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>stoic trading journal</div>
                </div>

                {/* Edit Profile Modal */}
                <AnimatePresence>
                  {showEditProfile && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 1500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                      }}
                      onClick={() => setShowEditProfile(false)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%',
                          maxWidth: '520px',
                          background: '#0f0f11',
                          borderRadius: '24px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '24px',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                          maxHeight: '90vh',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Edit Profile</span>
                          <button 
                            type="button"
                            onClick={() => setShowEditProfile(false)} 
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
                          >
                            <X size={20} />
                          </button>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }} className="hollow-menu-scrollbar">
                          
                          {/* Display Name */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Display Name</div>
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              placeholder="e.g. Max Trader"
                              style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                color: '#fff',
                                fontSize: 15,
                                padding: '12px 14px',
                                outline: 'none',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                              }}
                            />
                          </div>

                          {/* Trader Title */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trader Title</div>
                            <input
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              placeholder="e.g. Prop Trader · Futures Specialist"
                              style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                color: '#fff',
                                fontSize: 15,
                                padding: '12px 14px',
                                outline: 'none',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                              }}
                            />
                          </div>

                          {/* Primary Market */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Market</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {['Futures', 'Forex', 'Equities', 'Crypto', 'Options'].map(market => {
                                const isActive = editMarket === market;
                                return (
                                  <button
                                    type="button"
                                    key={market}
                                    onClick={() => setEditMarket(market)}
                                    style={{
                                      background: isActive ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                                      border: isActive ? '1px solid #0a84ff' : '1px solid rgba(255,255,255,0.06)',
                                      borderRadius: 20,
                                      padding: '8px 14px',
                                      color: isActive ? '#0a84ff' : 'rgba(255,255,255,0.5)',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      outline: 'none'
                                    }}
                                  >
                                    {market}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Trading Style */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trading Style</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {['Scalper', 'Day Trader', 'Swing Trader', 'Position Trader'].map(style => {
                                const isActive = editStyle === style;
                                return (
                                  <button
                                    type="button"
                                    key={style}
                                    onClick={() => setEditStyle(style)}
                                    style={{
                                      background: isActive ? 'rgba(191, 90, 242, 0.15)' : 'rgba(255,255,255,0.02)',
                                      border: isActive ? '1px solid #bf5af2' : '1px solid rgba(255,255,255,0.06)',
                                      borderRadius: 20,
                                      padding: '8px 14px',
                                      color: isActive ? '#bf5af2' : 'rgba(255,255,255,0.5)',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      outline: 'none'
                                    }}
                                  >
                                    {style}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Timezone */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timezone</div>
                            <div style={{ position: 'relative' }}>
                              <select
                                value={editTimezone}
                                onChange={e => setEditTimezone(e.target.value)}
                                style={{
                                  width: '100%',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 12,
                                  color: '#fff',
                                  fontSize: 15,
                                  padding: '12px 14px',
                                  outline: 'none',
                                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                                  appearance: 'none',
                                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'right 14px center',
                                  backgroundSize: '16px'
                                }}
                              >
                                {[
                                  { value: 'America/New_York', label: 'Eastern Time (ET)' },
                                  { value: 'America/Chicago', label: 'Central Time (CT)' },
                                  { value: 'America/Denver', label: 'Mountain Time (MT)' },
                                  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                                  { value: 'Europe/London', label: 'London (GMT/BST)' },
                                  { value: 'Europe/Berlin', label: 'Central Europe (CET)' },
                                  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                                  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
                                  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' }
                                ].map(tz => (
                                  <option key={tz.value} value={tz.value} style={{ background: '#1c1c1e', color: '#fff' }}>
                                    {tz.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Short Bio */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Short Bio</div>
                            <textarea
                              value={editBio}
                              onChange={e => setEditBio(e.target.value)}
                              placeholder="A few words about your trading approach..."
                              rows={3}
                              style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                color: '#fff',
                                fontSize: 15,
                                padding: '12px 14px',
                                outline: 'none',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                                resize: 'none',
                                lineHeight: 1.5
                              }}
                            />
                          </div>
                        </div>

                        {/* Save Button Container */}
                        <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
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
                              transition: 'all 0.25s',
                              boxShadow: '0 4px 20px rgba(10, 132, 255, 0.25)',
                              outline: 'none'
                            }}
                          >
                            Save Profile
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
