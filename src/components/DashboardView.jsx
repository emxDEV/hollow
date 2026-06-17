import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '../store/useUIStore';
import HollowSelect from './HollowSelect';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar
} from 'recharts';
import { 
  Search, 
  Bell,
  ChevronLeft,
  ChevronRight,
  Info,
  Settings,
  Calendar,
  AlertCircle,
  DollarSign,
  Award,
  Target,
  BarChart2,
  Check,
  X,
  Edit2,
  CreditCard,
  Trash2,
  Plus,
  ChevronDown,
  Layers,
  LayoutDashboard,
  SlidersHorizontal
} from 'lucide-react';
import { PropFirmBadge, PropFirmLogo } from './PropFirmBadge';
import { calculateTradePnL, calculateAccountStatistics } from '../utils/tradeMath';
import { showToast } from '../utils/toast';
import { getISOWeekId } from '../utils/dateUtils';
import { db } from '../db/hollowDb';
import HollowGroupedSelect from './HollowGroupedSelect';

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



export default function DashboardView({
  selectedAccountId,
  accounts,
  trades,
  executions,
  onSelectTrade,
  setSelectedAccountId,
  sidebarCollapsed = false
}) {
  const isMobile = useUIStore(state => state.isMobile);
  const setView = useUIStore(state => state.setView);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const setJournalTab = useUIStore(state => state.setJournalTab);
  const setHideTradeDetails = useUIStore(state => state.setHideTradeDetails);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterBias, setFilterBias] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [filterDatePreset, setFilterDatePreset] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [filterMistake, setFilterMistake] = useState('all');
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const filtersPopoverRef = React.useRef(null);
  const filtersButtonRef = React.useRef(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showLedgerTable, setShowLedgerTable] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredKpi, setHoveredKpi] = useState(null);
  const [username, setUsername] = useState('User');

  const [cardContextMenu, setCardContextMenu] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editPresetId, setEditPresetId] = useState('custom');
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPropFirm, setEditPropFirm] = useState('');
  const [editType, setEditType] = useState('Funded');
  const [editBalance, setEditBalance] = useState(0);
  const [editCapital, setEditCapital] = useState(0);
  const [editProfitTarget, setEditProfitTarget] = useState(0);
  const [editMaxLoss, setEditMaxLoss] = useState(0);
  const [editPayoutGoal, setEditPayoutGoal] = useState(0);
  const [editDrawdownType, setEditDrawdownType] = useState('None');
  const [editDrawdownLimit, setEditDrawdownLimit] = useState(0);
  const [editMaxDailyLoss, setEditMaxDailyLoss] = useState(0);
  const [editMinTradingDays, setEditMinTradingDays] = useState(0);
  const [editEvaluationStatus, setEditEvaluationStatus] = useState('Active');
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState(null);
  const [switcherSearchQuery, setSwitcherSearchQuery] = useState('');
  const [switcherStatusFilter, setSwitcherStatusFilter] = useState('all');

  // Close context menu and edit modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setCardContextMenu(null);
        setIsEditModalOpen(false);
        setAccountToDelete(null);
        setDeleteErrorMsg(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Escape key closes filters popover
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowFiltersPopover(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);


  const todayStr = new Date().toISOString().split('T')[0];
  const isSunday = new Date().getDay() === 0 || window.location.hash === '#test-sunday';
  const [isSundayBannerDismissed, setIsSundayBannerDismissed] = useState(() => {
    return localStorage.getItem('hollowDismissedSundayExport-' + todayStr) === 'true';
  });

  const handleSundayExport = async () => {
    if (!selectedAccount) return;
    const currentWeekId = getISOWeekId(new Date());
    const { exportWeeklyReportPDF } = await import('../utils/pdfExport');
    exportWeeklyReportPDF(currentWeekId, selectedAccount, trades, executions);
    localStorage.setItem('hollowDismissedSundayExport-' + todayStr, 'true');
    setIsSundayBannerDismissed(true);
  };

  const handleDismissSunday = () => {
    localStorage.setItem('hollowDismissedSundayExport-' + todayStr, 'true');
    setIsSundayBannerDismissed(true);
  };

  useEffect(() => {
    const loadUsername = () => {
      const saved = localStorage.getItem('hollowUsername') || 'User';
      setUsername(saved);
    };
    loadUsername();
    window.addEventListener('hollowSettingsUpdated', loadUsername);
    return () => window.removeEventListener('hollowSettingsUpdated', loadUsername);
  }, []);

  const navigateMonth = (dir) => {
    setCalendarMonth(prev => {
      const next = prev + dir;
      if (next < 0) { setCalendarYear(y => y - 1); return 11; }
      if (next > 11) { setCalendarYear(y => y + 1); return 0; }
      return next;
    });
  };

  const jumpToToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const calendarLabel = `${MONTH_NAMES[calendarMonth]} ${calendarYear}`;
  const calendarPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;


  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const openCreateModal = () => {
    setIsCreateMode(true);
    setEditPresetId('custom');
    setEditName('Apex Funded #2');
    setEditPropFirm('Apex Trader Funding');
    setEditType('Funded');
    setEditBalance(50000);
    setEditCapital(50000);
    setEditProfitTarget(53000);
    setEditMaxLoss(47500);
    setEditPayoutGoal(0);
    setEditDrawdownType('Trailing');
    setEditDrawdownLimit(2500);
    setEditMaxDailyLoss(1000);
    setEditMinTradingDays(7);
    setEditEvaluationStatus('Active');
    setIsEditModalOpen(true);
  };

  const handleApplyPreset = (e) => {
    const val = e.target.value;
    setEditPresetId(val);
    const preset = PROP_FIRM_PRESETS.find(p => p.id === val);
    if (preset) {
      setEditName(preset.name);
      setEditPropFirm(preset.propFirm);
      setEditType(preset.type);
      setEditBalance(preset.balance);
      setEditCapital(preset.balance);
      setEditProfitTarget(preset.balance + preset.target);
      setEditMaxLoss(preset.balance - preset.drawdownLimit);
      setEditPayoutGoal(preset.balance + preset.target);
      setEditDrawdownType(preset.drawdownType);
      setEditDrawdownLimit(preset.drawdownLimit);
      setEditMaxDailyLoss(preset.maxDailyLoss);
      setEditMinTradingDays(preset.minDays);
    }
  };

  const openEditModal = () => {
    if (selectedAccount) {
      setIsCreateMode(false);
      setEditPresetId('custom');
      setEditName(selectedAccount.name || '');
      setEditPropFirm(selectedAccount.propFirm || '');
      setEditType(selectedAccount.type || 'Funded');
      setEditBalance(selectedAccount.balance || 0);
      setEditCapital(selectedAccount.capital || selectedAccount.balance || 0);
      setEditProfitTarget(selectedAccount.profitTarget || 0);
      setEditMaxLoss(selectedAccount.maxLoss || 0);
      setEditPayoutGoal(selectedAccount.payoutGoal || 0);
      setEditDrawdownType(selectedAccount.drawdownType || 'None');
      setEditDrawdownLimit(selectedAccount.drawdownLimit || 0);
      setEditMaxDailyLoss(selectedAccount.maxDailyLoss || 0);
      setEditMinTradingDays(selectedAccount.minTradingDays || 0);
      setEditEvaluationStatus(selectedAccount.evaluationStatus || 'Active');
      setIsEditModalOpen(true);
    }
  };

  const handleSaveAccountDetails = async (e) => {
    e.preventDefault();
    
    const accountPayload = {
      name: editName,
      type: editType,
      propFirm: editPropFirm,
      balance: Number(editBalance),
      capital: Number(editCapital),
      profitTarget: Number(editProfitTarget),
      maxLoss: Number(editMaxLoss),
      payoutGoal: Number(editPayoutGoal),
      drawdownType: editDrawdownType,
      drawdownLimit: Number(editDrawdownLimit),
      maxDailyLoss: Number(editMaxDailyLoss),
      minTradingDays: Number(editMinTradingDays),
      evaluationStatus: editEvaluationStatus
    };

    try {
      if (isCreateMode) {
        const newId = `acc-funded-${Date.now()}`;
        await db.accounts.add({
          id: newId,
          ...accountPayload
        });
        if (setSelectedAccountId) setSelectedAccountId(newId);
      } else {
        if (!selectedAccount) return;
        await db.accounts.update(selectedAccount.id, accountPayload);
      }
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to save account:', err);
      showToast('Failed to save account details.', 'error');
    }
  };

  const handleDeleteAccountFromContextMenu = (acc) => {
    if (!acc) return;
    setAccountToDelete(acc);
  };

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

  // Filter trades for current account
  const accountTrades = useMemo(() => {
    if (selectedAccountId === 'all') return trades;
    return trades.filter(t => t.accountId === selectedAccountId);
  }, [trades, selectedAccountId]);

  const totalBalance = useMemo(() => {
    if (selectedAccountId === 'all') {
      return accounts.reduce((sum, acc) => sum + getAccountBalance(acc), 0);
    }
    return selectedAccount ? getAccountBalance(selectedAccount) : 0;
  }, [accounts, selectedAccount, selectedAccountId, trades, executions]);

  // Compute calculated values for each trade
  const tradesWithCalculations = useMemo(() => {
    return accountTrades.map(trade => {
      const tradeExecs = executions.filter(e => e.tradeId === trade.id);
      const math = calculateTradePnL(trade, tradeExecs);
      return {
        ...trade,
        ...math
      };
    });
  }, [accountTrades, executions]);

  // Compute dynamic playbook models & mistakes available in database
  const availableModels = useMemo(() => {
    const models = new Set();
    trades.forEach(t => {
      if (t.model) models.add(t.model);
    });
    return Array.from(models).sort();
  }, [trades]);

  const availableMistakes = useMemo(() => {
    const mistakes = new Set();
    trades.forEach(t => {
      if (Array.isArray(t.mistakes)) {
        t.mistakes.forEach(m => mistakes.add(m));
      } else if (t.mistake) {
        mistakes.add(t.mistake);
      }
    });
    return Array.from(mistakes).sort();
  }, [trades]);

  // Apply all topbar dashboard filters to calculate the filtered trades subset
  const filteredAccountTrades = useMemo(() => {
    return tradesWithCalculations.filter(t => {
      // 1. Symbol Filter
      if (filterSymbol) {
        const query = filterSymbol.trim().toUpperCase();
        if (!t.symbol || !t.symbol.toUpperCase().includes(query)) return false;
      }

      // 2. Bias Filter
      if (filterBias && t.bias !== filterBias) return false;

      // 3. Outcome Filter
      if (filterOutcome && filterOutcome !== 'all') {
        if (filterOutcome === 'wins' && t.netPnL <= 0) return false;
        if (filterOutcome === 'losses' && t.netPnL >= 0) return false;
        if (filterOutcome === 'breakeven' && t.netPnL !== 0) return false;
      }

      // 4. Playbook Model Filter
      if (filterModel && filterModel !== 'all') {
        if (t.model !== filterModel) return false;
      }

      // 5. Mistake Filter
      if (filterMistake && filterMistake !== 'all') {
        const hasMistake = Array.isArray(t.mistakes) 
          ? t.mistakes.includes(filterMistake)
          : (t.mistake === filterMistake);
        if (!hasMistake) return false;
      }

      // 6. Date Preset Filter
      if (filterDatePreset && filterDatePreset !== 'all') {
        const tradeDate = new Date(t.date);
        tradeDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterDatePreset === 'today') {
          if (t.date !== today.toISOString().split('T')[0]) return false;
        } else if (filterDatePreset === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          if (t.date !== yesterday.toISOString().split('T')[0]) return false;
        } else if (filterDatePreset === 'thisWeek') {
          const startOfWeek = new Date(today);
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);
          if (tradeDate < startOfWeek || tradeDate > today) return false;
        } else if (filterDatePreset === 'thisMonth') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          if (tradeDate < startOfMonth || tradeDate > today) return false;
        } else if (filterDatePreset === 'last7Days') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (tradeDate < sevenDaysAgo || tradeDate > today) return false;
        } else if (filterDatePreset === 'last30Days') {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          if (tradeDate < thirtyDaysAgo || tradeDate > today) return false;
        } else if (filterDatePreset === 'custom') {
          if (filterStartDate) {
            const startLimit = new Date(filterStartDate);
            startLimit.setHours(0, 0, 0, 0);
            if (tradeDate < startLimit) return false;
          }
          if (filterEndDate) {
            const endLimit = new Date(filterEndDate);
            endLimit.setHours(23, 59, 59, 999);
            if (tradeDate > endLimit) return false;
          }
        }
      }

      return true;
    });
  }, [
    tradesWithCalculations,
    filterSymbol,
    filterBias,
    filterOutcome,
    filterModel,
    filterMistake,
    filterDatePreset,
    filterStartDate,
    filterEndDate
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterBias) count++;
    if (filterOutcome && filterOutcome !== 'all') count++;
    if (filterDatePreset && filterDatePreset !== 'all') count++;
    if (filterModel && filterModel !== 'all') count++;
    if (filterMistake && filterMistake !== 'all') count++;
    return count;
  }, [filterBias, filterOutcome, filterDatePreset, filterModel, filterMistake]);

  // Compute account statistics
  const stats = useMemo(() => {
    return calculateAccountStatistics(filteredAccountTrades, executions);
  }, [filteredAccountTrades, executions]);

  const rulesCompliance = useMemo(() => {
    if (!selectedAccount) {
      return {
        evalStatus: 'Active',
        profitProgress: 0,
        currentProfit: 0,
        profitTargetGoal: 0,
        activeDays: 0,
        requiredTradingDays: 0,
        dailyPnL: 0,
        dailyLossLimit: 0,
        dailyLossBudgetPct: 100,
        trailingLimit: 0,
        distanceToBreach: 0,
        breachLimit: 0,
        runningPeak: 0
      };
    }

    const currentBalance = Math.round(selectedAccount.balance + stats.totalNetPnL);
    const capital = selectedAccount.capital || selectedAccount.balance;
    const profitTargetGoal = selectedAccount.profitTarget || 0;
    const currentProfit = currentBalance - capital;

    let profitProgress = 0;
    if (profitTargetGoal > capital) {
      const targetDifference = profitTargetGoal - capital;
      profitProgress = Math.max(0, Math.min(100, (currentProfit / targetDifference) * 100));
    }

    // 1. Unique Trading Days
    const uniqueDates = new Set(filteredAccountTrades.map(t => t.date));
    const activeDays = uniqueDates.size;
    const requiredTradingDays = selectedAccount.minTradingDays || 0;

    // 2. Daily Loss Tracker
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrades = filteredAccountTrades.filter(t => t.date === todayStr);
    let dailyDateLabel = 'Today';
    let dailyTrades = todayTrades;

    if (todayTrades.length === 0 && filteredAccountTrades.length > 0) {
      // Find the latest trading date in the database
      const sortedDates = [...new Set(filteredAccountTrades.map(t => t.date))].sort((a, b) => b.localeCompare(a));
      if (sortedDates.length > 0) {
        const latestDate = sortedDates[0];
        dailyTrades = filteredAccountTrades.filter(t => t.date === latestDate);
        dailyDateLabel = latestDate;
      }
    }

    const dailyPnL = dailyTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
    const dailyLossLimit = selectedAccount.maxDailyLoss || 0;
    let dailyLossBudgetPct = 100;
    if (dailyLossLimit > 0) {
      const remainingBudget = Math.max(0, dailyLossLimit + dailyPnL);
      dailyLossBudgetPct = (remainingBudget / dailyLossLimit) * 100;
    }

    // 3. Trailing Drawdown calculation
    const chronologicalTrades = [...filteredAccountTrades].sort((a, b) => a.date.localeCompare(b.date));
    let runningBalance = selectedAccount.balance || 0;
    let runningPeak = runningBalance;

    chronologicalTrades.forEach(t => {
      runningBalance += (t.netPnL || 0);
      if (runningBalance > runningPeak) {
        runningPeak = runningBalance;
      }
    });

    const drawdownLimit = selectedAccount.drawdownLimit || 0;
    let trailingLimit = runningPeak - drawdownLimit;
    if (selectedAccount.drawdownType === 'Trailing' && trailingLimit > capital) {
      trailingLimit = capital;
    }

    let breachLimit = 0;
    if (selectedAccount.drawdownType === 'Trailing') {
      breachLimit = trailingLimit;
    } else if (selectedAccount.drawdownType === 'Static') {
      breachLimit = selectedAccount.maxLoss || (capital - drawdownLimit);
    } else if (selectedAccount.drawdownType === 'Daily') {
      breachLimit = selectedAccount.maxLoss || (capital - drawdownLimit);
    } else {
      breachLimit = selectedAccount.maxLoss || 0;
    }

    const distanceToBreach = breachLimit > 0 ? (currentBalance - breachLimit) : 0;

    return {
      evalStatus: selectedAccount.evaluationStatus || 'Active',
      profitProgress,
      currentProfit,
      profitTargetGoal,
      activeDays,
      requiredTradingDays,
      dailyPnL,
      dailyLossLimit,
      dailyLossBudgetPct,
      trailingLimit,
      distanceToBreach,
      breachLimit,
      runningPeak,
      dailyDateLabel,
      drawdownType: selectedAccount.drawdownType || 'None'
    };
  }, [selectedAccount, filteredAccountTrades, stats.totalNetPnL]);

  // Dynamic gradient styling for account card based on current balance vs base balance/goals
  const accountCardStyle = useMemo(() => {
    return {
      background: '#0f0f11',
      border: '1px solid #1c1c1e',
      boxShadow: 'none'
    };
  }, []);

  // Win/Loss metrics
  const winsCount = useMemo(() => filteredAccountTrades.filter(t => t.netPnL > 0).length, [filteredAccountTrades]);
  const lossesCount = useMemo(() => filteredAccountTrades.filter(t => t.netPnL < 0).length, [filteredAccountTrades]);
  const breakEvenCount = useMemo(() => filteredAccountTrades.filter(t => t.netPnL === 0).length, [filteredAccountTrades]);

  // Average Win and Average Loss calculators
  const avgWin = useMemo(() => {
    const wins = filteredAccountTrades.filter(t => t.netPnL > 0);
    if (wins.length === 0) return 0; 
    return Math.round(wins.reduce((sum, t) => sum + t.netPnL, 0) / wins.length);
  }, [filteredAccountTrades]);

  const avgLoss = useMemo(() => {
    const losses = filteredAccountTrades.filter(t => t.netPnL < 0);
    if (losses.length === 0) return 0; 
    return Math.round(Math.abs(losses.reduce((sum, t) => sum + t.netPnL, 0) / losses.length));
  }, [filteredAccountTrades]);

  const avgWinLossRatio = useMemo(() => {
    if (filteredAccountTrades.length === 0) return '0.00';
    if (avgLoss === 0) return avgWin > 0 ? avgWin.toFixed(2) : '0.00';
    return (avgWin / avgLoss).toFixed(2);
  }, [avgWin, avgLoss, filteredAccountTrades]);

  // Discipline Rate (clean trades without mistakes)
  const cleanTradesCount = useMemo(() => {
    return filteredAccountTrades.filter(t => !t.mistakes || t.mistakes.length === 0).length;
  }, [filteredAccountTrades]);

  const disciplineRate = useMemo(() => {
    if (filteredAccountTrades.length === 0) return 0; 
    return Math.round((cleanTradesCount / filteredAccountTrades.length) * 100);
  }, [filteredAccountTrades, cleanTradesCount]);

  // Hollow Score calculation
  const hollowScore = useMemo(() => {
    const wrWeight = stats.winRate * 0.4;
    const pfWeight = Math.min(stats.profitFactor / 3, 1) * 30; 
    const dispWeight = disciplineRate * 0.3;
    const score = wrWeight + pfWeight + dispWeight;
    
    if (filteredAccountTrades.length === 0) return 0; 
    return Math.min(Number(score.toFixed(2)), 100);
  }, [stats, disciplineRate, filteredAccountTrades]);

  // Hollow Score Radar Chart Data
  const radarData = useMemo(() => {
    const hasTrades = filteredAccountTrades.length > 0;
    return [
      { subject: 'Consistency', A: hasTrades ? disciplineRate : 0, fullMark: 100 },
      { subject: 'Win %', A: hasTrades ? Math.round(stats.winRate) : 0, fullMark: 100 },
      { subject: 'Profit factor', A: hasTrades ? Math.round(Math.min(stats.profitFactor * 35, 100)) : 0, fullMark: 100 },
      { subject: 'Avg win/loss', A: hasTrades ? Math.round(Math.min((avgWin / (avgLoss || 1)) * 25, 100)) : 0, fullMark: 100 },
      { subject: 'Recovery factor', A: hasTrades ? Math.round(Math.min(stats.profitFactor * 30, 100)) : 0, fullMark: 100 },
      { subject: 'Max drawdown', A: hasTrades ? 85 : 0, fullMark: 100 }
    ];
  }, [stats, disciplineRate, avgWin, avgLoss, filteredAccountTrades]);

  // Calendar daily calculations — dynamic month/year (Mon-Sat, Sunday skipped)
  const calendarDays = useMemo(() => {
    const days = [];
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    // Find all non-Sunday days
    const activeDays = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const dObj = new Date(calendarYear, calendarMonth, dayNum);
      const wDay = dObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      if (wDay === 0) continue; // Skip Sundays

      const monSatIndex = wDay - 1; // 0 = Mon, 1 = Tue, ..., 5 = Sat
      activeDays.push({ dayNum, dateStr, monSatIndex });
    }

    if (activeDays.length === 0) return [];

    // The first active day's monSatIndex tells us how many padding days we need at the start
    const startOffset = activeDays[0].monSatIndex;
    for (let i = 0; i < startOffset; i++) {
      days.push({ isPadding: true, key: `pad-${i}` });
    }

    // Now push all the active days
    activeDays.forEach(day => {
      const dayTrades = filteredAccountTrades.filter(t => t.date === day.dateStr);
      const dayNetPnL = dayTrades.reduce((sum, t) => sum + t.netPnL, 0);
      let winCount = 0;
      dayTrades.forEach(t => { if (t.netPnL > 0) winCount++; });
      const winPct = dayTrades.length > 0 ? Math.round((winCount / dayTrades.length) * 100) : 0;
      const hasNotes = dayTrades.some(t => t.commentBias && t.commentBias.length > 0);
      days.push({
        isPadding: false,
        dayNum: day.dayNum,
        dateString: day.dateStr,
        tradesCount: dayTrades.length,
        netPnL: dayNetPnL,
        winRate: winPct,
        hasNotes,
        firstTradeId: dayTrades[0]?.id || null,
        key: `day-${day.dayNum}`
      });
    });

    return days;
  }, [filteredAccountTrades, calendarYear, calendarMonth]);

  // Weekly rollups — dynamic for visible month
  const weeklyRollups = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    // Find first day's monSatIndex
    let startOffset = 0;
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dObj = new Date(calendarYear, calendarMonth, dayNum);
      const wDay = dObj.getDay();
      if (wDay !== 0) {
        startOffset = wDay - 1;
        break;
      }
    }

    // Build 6 week rows like the calendar grid
    const weeks = [];
    let day = 1 - startOffset;
    for (let row = 0; row < 6; row++) {
      const weekStart = day;
      const weekEnd = day + 5; // 6 days in a row (Mon-Sat)
      let pnlSum = 0;
      let activeDays = 0;
      let hasTrades = false;
      for (let d = Math.max(1, weekStart); d <= Math.min(daysInMonth, weekEnd); d++) {
        const dObj = new Date(calendarYear, calendarMonth, d);
        if (dObj.getDay() === 0) continue; // skip Sunday

        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTrades = filteredAccountTrades.filter(t => t.date === dateStr);
        if (dayTrades.length > 0) {
          hasTrades = true;
          activeDays++;
          pnlSum += dayTrades.reduce((sum, t) => sum + t.netPnL, 0);
        }
      }
      weeks.push({
        name: `Week ${row + 1}`,
        pnl: hasTrades ? pnlSum : 0,
        daysCount: hasTrades ? activeDays : 0
      });
      day += 6;
    }
    return weeks;
  }, [filteredAccountTrades, calendarYear, calendarMonth]);

  // Dynamic monthly statistics for calendar header pill
  const calendarMonthlyStats = useMemo(() => {
    const monthTrades = filteredAccountTrades.filter(t => t.date.startsWith(calendarPrefix));
    const totalPnL = monthTrades.reduce((sum, t) => sum + t.netPnL, 0);
    const activeDaysCount = new Set(monthTrades.map(t => t.date)).size;
    return { pnl: totalPnL, days: activeDaysCount };
  }, [filteredAccountTrades, calendarPrefix]);

  // Notifications — data-driven alerts derived from trade data
  const notifications = useMemo(() => {
    const items = [];
    const sorted = [...filteredAccountTrades].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Payout goal reached
    if (selectedAccount && selectedAccount.payoutGoal > 0) {
      const balance = selectedAccount.balance + (stats.totalNetPnL || 0);
      if (balance >= selectedAccount.payoutGoal) {
        items.push({ id: 'payout', icon: '🎯', color: 'var(--colors-gain)', title: 'Payout goal reached', body: `Balance $${Math.round(balance).toLocaleString()} ≥ target $${selectedAccount.payoutGoal.toLocaleString()}`, time: 'Now' });
      }
    }

    // Win streak (last 3+ trades all wins)
    if (sorted.length >= 3 && sorted.slice(0, 3).every(t => t.netPnL > 0)) {
      items.push({ id: 'streak', icon: '🔥', color: 'var(--colors-stone)', title: 'Win streak active', body: `Last ${Math.min(sorted.filter(t => t.netPnL > 0).length, 5)} trades all profitable`, time: sorted[0]?.date || '' });
    }

    // Daily drawdown warning — any day with loss > $500
    const dayLosses = {};
    filteredAccountTrades.forEach(t => {
      if (!dayLosses[t.date]) dayLosses[t.date] = 0;
      dayLosses[t.date] += t.netPnL;
    });
    const worstDay = Object.entries(dayLosses).sort((a, b) => a[1] - b[1])[0];
    if (worstDay && worstDay[1] < -500) {
      items.push({ id: 'drawdown', icon: '⚠️', color: 'var(--colors-loss)', title: 'Daily drawdown alert', body: `${worstDay[0]}: $${Math.round(worstDay[1]).toLocaleString()} loss`, time: worstDay[0] });
    }

    // Missing journal entries — trade days without notes
    const tradeDaysWithoutNotes = sorted
      .filter(t => !t.commentBias || t.commentBias.trim() === '')
      .map(t => t.date)
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .slice(0, 2);
    if (tradeDaysWithoutNotes.length > 0) {
      items.push({ id: 'journal', icon: '📝', color: 'var(--colors-stone)', title: 'Journal entries missing', body: `${tradeDaysWithoutNotes.length} trade day(s) without notes`, time: tradeDaysWithoutNotes[0] || '' });
    }

    // Fallback static notifications
    if (items.length === 0) {
      items.push(
        { id: 'f1', icon: '📊', color: 'var(--colors-stone)', title: 'Weekly review ready', body: 'Your Week 3 performance is ready to review', time: 'Jun 15' },
        { id: 'f2', icon: '🔔', color: 'var(--colors-stone)', title: 'New trade session', body: 'Markets open in 2 hours — plan your bias', time: 'Today' },
        { id: 'f3', icon: '✅', color: 'var(--colors-stone)', title: 'Habit streak: 5 days', body: 'Meditation + workout logged consistently', time: 'Jun 18' }
      );
    }

    return items.slice(0, 5);
  }, [filteredAccountTrades, selectedAccount, stats]);

  // Double Area Chart Data calculated from actual trade wins/losses by weekday
  const pnlTrendData = useMemo(() => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const data = daysOfWeek.map(day => ({ day, wins: 0, losses: 0 }));
    
    filteredAccountTrades.forEach(t => {
      if (!t.date) return;
      const dObj = new Date(t.date);
      const wDay = dObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (t.netPnL > 0) {
        data[wDay].wins += t.netPnL;
      } else if (t.netPnL < 0) {
        data[wDay].losses += Math.abs(t.netPnL);
      }
    });
    
    // Shift so Monday is the first index, Sunday is the last
    const mondayFirst = [...data.slice(1), data[0]];
    return mondayFirst;
  }, [filteredAccountTrades]);

  // Recent closed trades
  const recentClosedTrades = useMemo(() => {
    return [...filteredAccountTrades]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }, [filteredAccountTrades]);

  const filteredTrades = useMemo(() => {
    return [...filteredAccountTrades]
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (sortField === 'date') {
          valA = new Date(valA);
          valB = new Date(valB);
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [filteredAccountTrades, sortField, sortDirection]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const hasTrades = tradesWithCalculations.length > 0;
  const profitFactorRingData = hasTrades 
    ? [
        { name: 'Wins', value: winsCount, fill: 'var(--colors-gain)' },
        { name: 'Losses', value: lossesCount, fill: 'var(--colors-loss)' }
      ]
    : [{ name: 'Empty', value: 1, fill: 'rgba(255, 255, 255, 0.05)' }];

  const winRateGaugeData = hasTrades
    ? [
        { name: 'Wins', value: winsCount, fill: 'var(--colors-gain)' },
        { name: 'Break-evens', value: breakEvenCount, fill: 'var(--colors-stone)' },
        { name: 'Losses', value: lossesCount, fill: 'var(--colors-loss)' }
      ]
    : [{ name: 'Empty', value: 1, fill: 'rgba(255, 255, 255, 0.05)' }];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', 
      gap: '0px', 
      height: '100%',
      background: 'transparent',
      overflow: isMobile ? 'auto' : 'hidden'
    }}>
      
      {/* 1. CENTRAL DASHBOARD REGION — flex:1 + min-width:0 so it NEVER overflows */}
      <div style={{
        flex: isMobile ? 'none' : '1 1 0',
        minWidth: 0,
        padding: isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px',
        borderRight: 'none',
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflowY: isMobile ? 'visible' : 'auto',
        overflowX: 'hidden',
        height: isMobile ? 'auto' : '100%'
      }}>
        
        {/* Top spacer to ensure flush sticky header on scroll */}
        <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
        
        {/* Automated Sunday PDF Backup Banner */}
        {isSunday && !isSundayBannerDismissed && (
          <div style={{
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: 'none',
            marginBottom: '-8px',
            animation: 'view-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#1c1c1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Calendar size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>
                  Weekly Ledger PDF Backup Ready
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--colors-stone)', margin: '2px 0 0 0' }}>
                  Today is Sunday! Backup your executions and statistics for the week ({getISOWeekId(new Date())}) to a local folder.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleSundayExport}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'none',
                  fontFamily: 'inherit'
                }}
              >
                Export PDF Ledger
              </button>
              <button
                onClick={handleDismissSunday}
                style={{
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  padding: '8px 12px'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* TOP HEADER ROW */}
        <div className="hollow-view-header" style={{ marginBottom: '16px' }}>
          <div className="hollow-view-header-title-block">
            <h1>
              <LayoutDashboard size={28} color="var(--colors-primary)" /> Overview
            </h1>
            <p>
              Real-time trading analytics, performance metrics, and playbook execution.
            </p>
          </div>
          
          {/* Header Controls (Switcher, Search, Filters, Notifications, Profile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
            {(() => {
              const selectedAccount = accounts.find(a => a.id === selectedAccountId);
              const typeStyles = selectedAccount ? getTypeStyles(selectedAccount.type || 'Funded') : null;
              return (
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCardContextMenu({ x: Math.max(12, rect.right - 340), y: rect.bottom + 6 });
                    setSwitcherSearchQuery('');
                    setSwitcherStatusFilter('all');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: typeStyles ? typeStyles.bg : 'rgba(255,255,255,0.03)',
                    border: typeStyles ? `1px solid ${typeStyles.border}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: typeStyles ? typeStyles.color : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: typeStyles ? `0 0 10px rgba(${typeStyles.rgb}, 0.05)` : 'none',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = typeStyles ? typeStyles.bgActive : 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.borderColor = typeStyles ? typeStyles.color : 'rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = typeStyles ? typeStyles.bg : 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = typeStyles ? typeStyles.border : 'rgba(255,255,255,0.08)';
                  }}
                >
                  {selectedAccountId === 'all' ? (
                    <>
                      <Layers size={14} />
                      <span>everything</span>
                    </>
                  ) : (
                    <>
                      {selectedAccount && <PropFirmLogo firm={selectedAccount.propFirm} type={selectedAccount.type} size={14} color={typeStyles ? typeStyles.color : '#fff'} />}
                      <span>{selectedAccount ? selectedAccount.name : 'select account.'}</span>
                    </>
                  )}
                  <ChevronDown size={12} style={{ opacity: 0.7 }} />
                </button>
              );
            })()}

            {/* Search Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '24px',
              padding: '8px 18px',
              width: isMobile ? '100%' : '200px',
              flex: isMobile ? 1 : 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
              transition: 'border-color 0.2s'
            }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
            >
              <input 
                type="text"
                placeholder='Search trade symbol...'
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  width: '100%',
                  fontFamily: 'var(--font-body)'
                }}
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
              />
              <Search size={15} color="rgba(255,255,255,0.3)" />
            </div>

            {/* Advanced Filters Popover Trigger */}
            <div ref={filtersPopoverRef}>
              <div
                ref={filtersButtonRef}
                onClick={() => setShowFiltersPopover(!showFiltersPopover)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: showFiltersPopover || activeFiltersCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: showFiltersPopover || activeFiltersCount > 0 ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '24px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'none'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = showFiltersPopover || activeFiltersCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = showFiltersPopover || activeFiltersCount > 0 ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255,255,255,0.08)';
                }}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span style={{
                    background: 'var(--colors-primary)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(127, 86, 218, 0.5)'
                  }}>
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown 
                  size={12} 
                  style={{ 
                    transform: showFiltersPopover ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    opacity: 0.6
                  }} 
                />
              </div>
            </div>

            {/* Notification Bell with Dropdown */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', position: 'relative',
                transition: 'all 0.2s ease'
              }} 
                onClick={() => setShowNotifications(prev => !prev)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <Bell size={18} />
                <div style={{
                  position: 'absolute', top: '11px', right: '13px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#ffffff'
                }} />
              </div>

              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  width: '320px',
                  background: 'rgba(15, 15, 17, 0.98)',
                  border: '1px solid var(--colors-hairline-dark)',
                  borderRadius: '16px',
                  padding: '16px',
                  zIndex: 200,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Notifications</span>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map(notif => (
                      <div key={notif.id} onClick={() => setShowNotifications(false)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${notif.color}22`, border: `1px solid ${notif.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{notif.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#fff', marginBottom: '1px' }}>{notif.title}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.body}</div>
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: '1px' }}>{notif.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{username}</span>
              <div style={{
                width: '36px', height: '36px', borderRadius: '18px',
                background: '#1c1c1e',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="white" />
                  <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" fill="white" />
                </svg>
              </div>
            </div>

            {/* Filters Popover — rendered via portal to escape overflow:auto container */}
            {showFiltersPopover && createPortal(
              (() => {
                const rect = filtersButtonRef.current?.getBoundingClientRect();
                if (!rect) return null;
                return (
                  <>
                    {/* Transparent backdrop — clicking it closes the popover */}
                    <div
                      onClick={() => setShowFiltersPopover(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                    />
                  <div
                    data-filters-popover="true"
                    style={{
                    position: 'fixed',
                    top: `${rect.bottom + 8}px`,
                    left: `${Math.min(rect.right - 320, window.innerWidth - 336)}px`,
                    background: 'rgba(15, 15, 17, 0.98)',
                    border: '1px solid var(--colors-hairline-dark)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                    zIndex: 99999,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxSizing: 'border-box',
                    animation: 'menuScaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    transformOrigin: 'top right'
                  }}>
                    {/* Popover Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#ffffff', textTransform: 'lowercase', letterSpacing: '0.8px' }}>advanced filters.</span>
                      {activeFiltersCount > 0 && (
                        <span 
                          onClick={() => {
                            setFilterBias('');
                            setFilterOutcome('all');
                            setFilterDatePreset('all');
                            setFilterStartDate('');
                            setFilterEndDate('');
                            setFilterModel('all');
                            setFilterMistake('all');
                          }}
                          style={{ fontSize: '10px', fontWeight: '600', color: '#ff6b6b', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          Clear All
                        </span>
                      )}
                    </div>

                    {/* List of Selectors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      {/* Date Preset Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Timeframe</label>
                        <HollowSelect
                          value={filterDatePreset}
                          onChange={(val) => setFilterDatePreset(val)}
                          options={[
                            { value: 'all', label: 'All Time' },
                            { value: 'today', label: 'Today' },
                            { value: 'yesterday', label: 'Yesterday' },
                            { value: 'thisWeek', label: 'This Week' },
                            { value: 'thisMonth', label: 'This Month' },
                            { value: 'last7Days', label: 'Last 7 Days' },
                            { value: 'last30Days', label: 'Last 30 Days' },
                            { value: 'custom', label: 'Custom Range...' }
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Custom Date Inputs */}
                      {filterDatePreset === 'custom' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '9px', fontWeight: '600', color: 'rgba(255,255,255,0.35)' }}>Start Date</label>
                            <input
                              type="date"
                              value={filterStartDate}
                              onChange={(e) => setFilterStartDate(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.25)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                                padding: '6px 8px',
                                outline: 'none',
                                fontFamily: 'var(--font-mono)'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '9px', fontWeight: '600', color: 'rgba(255,255,255,0.35)' }}>End Date</label>
                            <input
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => setFilterEndDate(e.target.value)}
                              style={{
                                background: 'rgba(0,0,0,0.25)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '11px',
                                padding: '6px 8px',
                                outline: 'none',
                                fontFamily: 'var(--font-mono)'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bias Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Directional Bias</label>
                        <HollowSelect
                          value={filterBias}
                          onChange={(val) => setFilterBias(val)}
                          options={[
                            { value: '', label: 'All Biases' },
                            { value: 'LONG', label: 'LONG' },
                            { value: 'SHORT', label: 'SHORT' }
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Outcome Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Outcome</label>
                        <HollowSelect
                          value={filterOutcome}
                          onChange={(val) => setFilterOutcome(val)}
                          options={[
                            { value: 'all', label: 'All Outcomes' },
                            { value: 'wins', label: 'Wins Only' },
                            { value: 'losses', label: 'Losses Only' },
                            { value: 'breakeven', label: 'Break Evens Only' }
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Playbook Model Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Playbook Model</label>
                        <HollowSelect
                          value={filterModel}
                          onChange={(val) => setFilterModel(val)}
                          options={[
                            { value: 'all', label: 'All Models' },
                            ...availableModels.map(m => ({ value: m, label: m }))
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Mistake Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Behavioral Mistake</label>
                        <HollowSelect
                          value={filterMistake}
                          onChange={(val) => setFilterMistake(val)}
                          options={[
                            { value: 'all', label: 'All Mistakes' },
                            ...availableMistakes.map(m => ({ value: m, label: m }))
                          ]}
                          style={{ width: '100%' }}
                        />
                      </div>

                    </div>
                    </div>
                  </>
                );
              })()
            , document.body)}
          </div>
        </div>

        {/* 4 HIGH-FIDELITY TOP METRIC WIDGETS - SMALL WIDGETS (Height: 110px) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
          gap: isMobile ? '12px' : '16px' 
        }}>
          
          {/* Widget 1: Net P&L */}
          <div className="hollow-card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '110px',
            padding: '16px 20px',
            boxSizing: 'border-box',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#1c1c1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <DollarSign size={22} strokeWidth={2.5} />
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Net P&L</span>
                  <span style={{ 
                    background: '#1c1c1e', 
                    color: '#fff', 
                    borderRadius: '10px', 
                    padding: '1px 6px', 
                    fontSize: '9px',
                    fontWeight: 'bold',
                    marginLeft: '2px'
                  }}>
                    {accountTrades.length}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: '800', 
                  color: stats.totalNetPnL >= 0 ? 'var(--colors-gain)' : 'var(--colors-loss)', 
                  marginTop: '2px',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {`$${Math.round(stats.totalNetPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: Profit Factor */}
          <div className="hollow-card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '110px',
            padding: '16px 20px',
            boxSizing: 'border-box',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#1c1c1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Award size={22} strokeWidth={2.5} />
              </div>
              
              <div>
                <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Profit factor</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginTop: '2px', fontFamily: 'var(--font-heading)' }}>
                  {stats.profitFactor.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ width: '40px', height: '40px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profitFactorRingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={13}
                    outerRadius={18}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {profitFactorRingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Widget 3: Trade Win % */}
          <div className="hollow-card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '110px',
            padding: '16px 20px',
            boxSizing: 'border-box',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#1c1c1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Target size={22} strokeWidth={2.5} />
              </div>
              
              <div>
                <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Trade win %</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginTop: '2px', fontFamily: 'var(--font-heading)' }}>
                  {tradesWithCalculations.length > 0 ? `${stats.winRate.toFixed(2)}%` : '0.00%'}
                </div>
              </div>
            </div>
 
            <div style={{ width: '66px', height: '40px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '44px', height: '24px', marginTop: '-6px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winRateGaugeData}
                      cx="50%"
                      cy="100%"
                      innerRadius={13}
                      outerRadius={18}
                      startAngle={180}
                      endAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {winRateGaugeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: '4px', position: 'absolute', bottom: '-8px', fontWeight: 'bold' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--colors-gain)',
                  color: '#fff',
                  fontSize: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} title="Wins">
                  {winsCount}
                </div>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#8e8e93',
                  color: '#fff',
                  fontSize: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} title="Break-Evens">
                  {breakEvenCount}
                </div>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--colors-loss)',
                  color: '#fff',
                  fontSize: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} title="Losses">
                  {lossesCount}
                </div>
              </div>
            </div>
          </div>
 
          {/* Widget 4: Avg Win/Loss */}
          <div className="hollow-card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '110px',
            padding: '16px 20px',
            boxSizing: 'border-box',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#1c1c1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <BarChart2 size={22} strokeWidth={2.5} />
              </div>
              
              <div>
                <div style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Avg win/loss</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginTop: '2px', fontFamily: 'var(--font-heading)' }}>
                  {avgWinLossRatio}
                </div>
              </div>
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '70px' }}>
              <div style={{ display: 'flex', width: '100%', height: '5px', borderRadius: '3px', overflow: 'hidden', background: '#ea5455', position: 'relative' }}>
                <div style={{ width: `${tradesWithCalculations.length > 0 ? (avgWin / (avgWin + avgLoss || 1)) * 100 : 50}%`, background: '#28c76f', height: '100%' }} />
                <div style={{
                  position: 'absolute',
                  left: `${tradesWithCalculations.length > 0 ? (avgWin / (avgWin + avgLoss || 1)) * 100 : 50}%`,
                  top: '0',
                  width: '2px',
                  height: '5px',
                  background: '#fff'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: '800' }}>
                <span style={{ color: '#28c76f' }}>${avgWin}</span>
                <span style={{ color: '#ea5455' }}>-${avgLoss}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Active Account Overview / Rules Banner */}
        {selectedAccount && (
          <div className="hollow-card" style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'none',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            {/* Top row: Account information */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PropFirmLogo firm={selectedAccount.propFirm} type={selectedAccount.type} size={18} color="#fff" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                    {selectedAccount.propFirm || 'hollow active'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>
                    {selectedAccount.name} ({selectedAccount.type.toLowerCase()} account)
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--colors-stone)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>account balance</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', fontFamily: 'var(--font-heading)' }}>
                    ${Math.round(totalBalance).toLocaleString()}
                  </div>
                </div>

                {/* Status Badge */}
                {(() => {
                  let badgeBg = 'rgba(255, 255, 255, 0.05)';
                  let badgeBorder = 'rgba(255, 255, 255, 0.15)';
                  let badgeColor = 'rgba(255, 255, 255, 0.85)';
                  let statusLabel = 'ACTIVE';

                  if (rulesCompliance.evalStatus === 'Passed') {
                    badgeBg = 'var(--colors-gain-dim)';
                    badgeBorder = 'rgba(48, 209, 88, 0.2)';
                    badgeColor = 'var(--colors-gain)';
                    statusLabel = 'PASSED';
                  } else if (rulesCompliance.evalStatus === 'Failed') {
                    badgeBg = 'var(--colors-loss-dim)';
                    badgeBorder = 'rgba(255, 69, 58, 0.2)';
                    badgeColor = 'var(--colors-loss)';
                    statusLabel = 'FAILED';
                  } else if (rulesCompliance.evalStatus === 'Payout') {
                    badgeBg = 'rgba(255, 255, 255, 0.1)';
                    badgeBorder = 'rgba(255, 255, 255, 0.2)';
                    badgeColor = '#ffffff';
                    statusLabel = 'PAYOUT';
                  }

                  return (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      color: badgeColor,
                      letterSpacing: '0.5px',
                    }}>
                      {statusLabel.toLowerCase()}.
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

            {/* Rules metrics grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '24px'
            }}>
              {/* Profit Target Rule */}
              {rulesCompliance.profitTargetGoal > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)' }}>
                      <Target size={12} color="#ffffff" />
                      <span>profit target</span>
                    </div>
                    <span style={{ fontWeight: '600' }}>
                      ${Math.round(rulesCompliance.currentProfit).toLocaleString()} / ${(rulesCompliance.profitTargetGoal - (selectedAccount.capital || selectedAccount.balance)).toLocaleString()}
                    </span>
                  </div>
                  {/* Progress Bar Container */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${rulesCompliance.profitProgress}%`,
                      height: '100%',
                      background: 'var(--colors-gain)',
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>profit target</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.45)' }}>no target set.</span>
                </div>
              )}

              {/* Drawdown Rule Display */}
              {rulesCompliance.drawdownType !== 'None' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rulesCompliance.drawdownType === 'Daily' ? (
                    // Daily Drawdown display
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)' }}>
                          <AlertCircle size={12} color="#ffffff" />
                          <span>daily loss limit</span>
                        </div>
                        <span style={{ fontWeight: '600', color: rulesCompliance.dailyPnL < 0 ? 'var(--colors-loss)' : 'var(--colors-gain)' }}>
                          {rulesCompliance.dailyPnL >= 0 ? '+' : ''}${Math.round(rulesCompliance.dailyPnL).toLocaleString()} / -${rulesCompliance.dailyLossLimit.toLocaleString()}
                        </span>
                      </div>
                      {/* Budget Bar */}
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${rulesCompliance.dailyLossBudgetPct}%`,
                          height: '100%',
                          background: rulesCompliance.dailyLossBudgetPct > 50 
                            ? 'var(--colors-gain)' 
                            : (rulesCompliance.dailyLossBudgetPct > 20 ? '#ff9f0a' : 'var(--colors-loss)'),
                          borderRadius: '3px',
                        }} />
                      </div>
                    </>
                  ) : (
                    // Trailing / Static Drawdown display
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)' }}>
                          <AlertCircle size={12} color="#ffffff" />
                          <span>{rulesCompliance.drawdownType.toLowerCase()} limit</span>
                        </div>
                        <span style={{ fontWeight: '600' }}>
                          limit: ${Math.round(rulesCompliance.breachLimit).toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Detail parameters under the limit */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', textTransform: 'uppercase' }}>
                            {rulesCompliance.drawdownType === 'Trailing' ? 'peak balance' : 'starting bal'}
                          </span>
                          <span style={{ fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
                            ${Math.round(rulesCompliance.drawdownType === 'Trailing' ? rulesCompliance.runningPeak : (selectedAccount.capital || selectedAccount.balance)).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', textTransform: 'uppercase' }}>breach distance</span>
                          <span style={{ 
                            fontWeight: '700', 
                            color: rulesCompliance.distanceToBreach > 1000 ? '#30d158' : (rulesCompliance.distanceToBreach > 0 ? '#ff9f0a' : '#ff453a') 
                          }}>
                            ${Math.round(rulesCompliance.distanceToBreach).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>drawdown limit</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.45)' }}>no drawdown limit.</span>
                </div>
              )}

              {/* Active Trading Days */}
              {rulesCompliance.requiredTradingDays > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)' }}>
                      <Calendar size={12} color="#ffffff" />
                      <span>active trading days</span>
                    </div>
                    <span style={{ fontWeight: '600' }}>
                      {rulesCompliance.activeDays} / {rulesCompliance.requiredTradingDays} days
                    </span>
                  </div>

                  {/* Progress Dots */}
                  <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '2px' }}>
                    {Array.from({ length: rulesCompliance.requiredTradingDays }).map((_, dIdx) => {
                      const isDayFilled = dIdx < rulesCompliance.activeDays;
                      return (
                        <div 
                          key={dIdx}
                          style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background: isDayFilled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--colors-stone)' }}>trading days</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.45)' }}>no minimum days.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: SPLIT IN TWO COLUMNS — min-width:0 on both children */}
        {/* BOTTOM SECTION: SPLIT IN TWO COLUMNS with wrapping support */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '24px',
          alignItems: 'flex-start',
          minWidth: 0
        }}>
          
          {/* LEFT COLUMN: Calendar Heatmap & Weekly Summaries */}
          <div style={{ flex: isMobile ? '1 1 100%' : '1 1 650px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            
            <div className="hollow-card" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: isMobile ? 'auto' : '620px',
              padding: isMobile ? '16px' : '24px',
              boxSizing: 'border-box',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
              overflow: 'hidden' // Force content containment to prevent poking out
            }}>
              {/* Calendar Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', height: isMobile ? 'auto' : '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--colors-canvas-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '4px 8px' }}>
                    <button className="btn-ghost" style={{ padding: '2px', minHeight: 'auto' }} onClick={() => navigateMonth(-1)}><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', padding: '0 4px', fontFamily: 'var(--font-heading)', minWidth: '110px', textAlign: 'center' }}>{calendarLabel}</span>
                    <button className="btn-ghost" style={{ padding: '2px', minHeight: 'auto' }} onClick={() => navigateMonth(1)}><ChevronRight size={14} /></button>
                  </div>
                  <button 
                    onClick={jumpToToday}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    This month
                  </button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Monthly stats summaries pill — live-calculated */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', background: 'var(--colors-canvas-dark)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', fontWeight: '600' }}>
                    <span style={{ color: 'var(--colors-stone)' }}>{filterSymbol || filterBias ? 'Filtered:' : 'Monthly stats:'}</span>
                    <span style={{ color: calendarMonthlyStats.pnl >= 0 ? 'var(--colors-gain)' : '#ea5455' }}>
                      {calendarMonthlyStats.pnl >= 0 ? '+' : ''}${Math.abs(calendarMonthlyStats.pnl) >= 1000 ? (calendarMonthlyStats.pnl / 1000).toFixed(2) + 'K' : Math.round(calendarMonthlyStats.pnl).toLocaleString()}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                    <span style={{ color: 'var(--colors-primary-bright)' }}>
                      {calendarMonthlyStats.days} {calendarMonthlyStats.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  {(filterSymbol || filterBias) && (
                    <button
                      onClick={() => { setFilterSymbol(''); setFilterBias(''); }}
                      style={{ fontSize: '10px', color: '#ea5455', background: 'rgba(234,84,85,0.1)', border: '1px solid rgba(234,84,85,0.3)', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Heatmap Grid & Weekly Stack */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 120px', gap: '20px', height: isMobile ? 'auto' : '520px', boxSizing: 'border-box' }}>
                
                {/* 1. Heatmap Calendar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: isMobile ? '460px' : '100%', minWidth: 0 }}>
                  {/* Weekdays Row header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '700', height: '20px' }}>
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(d => <div key={d} style={{ textTransform: 'lowercase' }}>{d}</div>)}
                  </div>
                  
                  {/* Monthly Grid Blocks - Fits 6 rows using css grids */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '8px', flex: 1, height: 'calc(100% - 28px)', position: 'relative', minWidth: 0 }}>
                    {calendarDays.map((day) => {
                      if (day.isPadding) {
                        return <div key={day.key} style={{ background: 'transparent' }} />;
                      }

                      const hasTrades = day.tradesCount > 0;
                      const isGain = day.netPnL >= 0;
                      const isHovered = hoveredDay === day.key;

                      let bg = 'rgba(255, 255, 255, 0.015)';
                      let border = '1px solid rgba(255, 255, 255, 0.03)';
                      
                      if (hasTrades) {
                        if (day.netPnL === 0) {
                          bg = isHovered ? 'rgba(255, 159, 10, 0.22)' : 'rgba(255, 159, 10, 0.12)';
                          border = '1px solid rgba(255, 159, 10, 0.25)';
                        } else if (isGain) {
                          bg = isHovered ? 'rgba(40, 199, 111, 0.22)' : 'rgba(40, 199, 111, 0.12)';
                          border = '1px solid rgba(40, 199, 111, 0.25)';
                        } else {
                          bg = isHovered ? 'rgba(234, 84, 85, 0.22)' : 'rgba(234, 84, 85, 0.12)';
                          border = '1px solid rgba(234, 84, 85, 0.25)';
                        }
                      }


                      return (
                        <div
                          key={day.key}
                          onClick={() => {
                            setSelectedDate(day.dateString);
                            setJournalTab('daily');
                            setHideTradeDetails(false);
                            setView('journal');
                          }}
                          onMouseEnter={() => hasTrades && setHoveredDay(day.key)}
                          onMouseLeave={() => setHoveredDay(null)}
                          style={{
                            background: bg,
                            border: border,
                            borderRadius: '12px',
                            padding: '6px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            cursor: hasTrades ? 'pointer' : 'default',
                            boxSizing: 'border-box',
                            transition: 'background 0.15s, transform 0.15s',
                            transform: isHovered && hasTrades ? 'scale(1.04)' : 'scale(1)',
                            zIndex: isHovered ? 2 : 1
                          }}
                          className={hasTrades ? 'calendar-day active-month' : 'calendar-day'}
                        >
                          {/* Custom hover tooltip */}
                          {isHovered && hasTrades && (
                            <div style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 8px)',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: 'rgba(15, 15, 17, 0.96)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '10px',
                              padding: '8px 12px',
                              zIndex: 100,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                              pointerEvents: 'none',
                              minWidth: '130px',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)'
                            }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{day.dateString}</div>
                              <div style={{ fontSize: '10px', color: 'var(--colors-stone)' }}>{day.tradesCount} trade{day.tradesCount !== 1 ? 's' : ''}</div>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: isGain ? '#30d158' : '#ff453a', marginTop: '2px' }}>
                                {isGain ? '+' : ''}${Math.round(day.netPnL).toLocaleString()}
                              </div>
                              {day.winRate > 0 && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>win rate: {day.winRate}%</div>}
                            </div>
                          )}

                          {/* Notepad Icon */}
                          {day.hasNotes && (
                            <div style={{ position: 'absolute', top: '6px', left: '6px', color: 'rgba(255,255,255,0.45)' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                            </div>
                          )}

                          {/* Day Number */}
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: hasTrades ? '#fff' : 'rgba(255,255,255,0.2)', alignSelf: 'flex-end' }}>
                            {day.dayNum}
                          </span>
                          
                          {/* Stats details */}
                          {hasTrades && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%' }}>
                              <span className="mono" style={{
                                fontSize: '11px',
                                fontWeight: '800',
                                color: isGain ? '#28c76f' : '#ea5455',
                                lineHeight: '1.2'
                              }}>
                                {isGain ? '+' : ''}${Math.round(day.netPnL).toLocaleString()}
                              </span>
                              <span style={{ fontSize: '8px', color: 'var(--colors-stone)', display: 'flex', justifyContent: 'space-between', lineHeight: '1.1', width: '100%' }}>
                                <span>{day.tradesCount}t</span>
                                <span style={{ color: day.winRate >= 50 ? '#28c76f' : '#ea5455' }}>{day.winRate}%</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Side Weekly Blocks Summary - Aligned with the 6 calendar rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: isMobile ? 'auto' : '100%', marginTop: isMobile ? '12px' : '0' }}>
                  {/* Empty spacer corresponding to weekdays row height (20px) + gap (8px) = 28px */}
                  {!isMobile && <div style={{ height: '20px' }} />}
                  {/* Weekly cards container in identical grid division repeat(6, 1fr) */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateRows: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', 
                    gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'none',
                    gap: '8px', 
                    height: isMobile ? '120px' : 'calc(100% - 28px)', 
                    minWidth: 0 
                  }}>
                    {weeklyRollups.map((w) => {
                      const isGain = w.pnl >= 0;
                      
                      return (
                        <div key={w.name} style={{
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          borderRadius: '12px',
                          padding: '4px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '600' }}>
                            {w.name}
                          </div>
                          <div className="mono" style={{ 
                            fontSize: '12px', 
                            fontWeight: '800', 
                            color: w.daysCount > 0 ? (isGain ? '#28c76f' : '#ea5455') : '#fff',
                            marginTop: '2px' 
                          }}>
                            {w.pnl !== 0 ? `${isGain ? '+' : ''}$${Math.round(w.pnl).toLocaleString()}` : '$0'}
                          </div>
                          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
                            {w.daysCount} {w.daysCount === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Hollow Score & Cumulative P&L — clamp() width adapts naturally */}
          <div style={{ flex: isMobile ? '1 1 100%' : '1 1 240px', maxWidth: isMobile ? 'none' : '340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Hollow Score Card - MEDIUM WIDGET (Height: 260px) */}
            <div className="hollow-card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '260px',
              padding: '16px 20px',
              boxSizing: 'border-box',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                <span>Hollow score</span>
                <Info size={14} color="rgba(255,255,255,0.3)" />
              </div>

              <div style={{ width: '100%', height: '140px', display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject" stroke="var(--colors-stone)" fontSize={8} />
                    <Radar name="Score" dataKey="A" stroke="#ffffff" fill="#ffffff" fillOpacity={0.15} filter="none" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--colors-stone)', fontWeight: '600' }}>Your Hollow Score</span>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>{hollowScore}</strong>
                </div>
                
                {/* Bar slider */}
                <div style={{ position: 'relative', width: '100%', height: '4px', borderRadius: '2px', background: '#1c1c1e', marginTop: '2px' }}>
                  <div style={{
                    position: 'absolute',
                    left: `${hollowScore}%`,
                    top: '-3px',
                    width: '2px',
                    height: '10px',
                    background: '#fff',
                    borderRadius: '1px',
                    boxShadow: 'none',
                    transform: 'translateX(-50%)'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: 'var(--colors-stone)', marginTop: '2px', fontWeight: 'bold' }}>
                  <span>0</span>
                  <span>20</span>
                  <span>40</span>
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* Net & Gross P&L Trend Card - MEDIUM WIDGET (Height: 260px) */}
            <div className="hollow-card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '260px',
              padding: '16px 20px',
              boxSizing: 'border-box',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
            }}>
              <div style={{ display: 'flex', justifyStyle: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                  <span>P&L In & Out</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>7 Days</span>
                  <span>▼</span>
                </div>
              </div>

              {/* Exact Double Area Chart matching mockup */}
              <div style={{ width: '100%', height: '150px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pnlTrendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#28c76f" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#28c76f" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea5455" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ea5455" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="rgba(255,255,255,0.2)" 
                      fontSize={8} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={[0, 1000]} 
                      ticks={[0, 100, 500, 800, 1000]} 
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 15, 17, 0.96)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '11px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                      }}
                    />
                    <Area type="monotone" dataKey="wins" stroke="#28c76f" strokeWidth={2} fillOpacity={1} fill="url(#colorWins)" />
                    <Area type="monotone" dataKey="losses" stroke="#ea5455" strokeWidth={2} fillOpacity={1} fill="url(#colorLosses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LAST EXECUTIONS LIST */}
            <div className="hollow-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 20px', minHeight: '260px', maxHeight: '320px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>last executions</h3>
                <button
                  onClick={() => setShowLedgerTable(!showLedgerTable)}
                  style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                >
                  see all
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }} className="hollow-menu-scrollbar">
                {recentClosedTrades.map((trade, idx) => {
                  const isGain = trade.netPnL >= 0;
                  return (
                    <div
                      key={trade.id}
                      onClick={() => {
                        setSelectedDate(trade.date);
                        setJournalTab('daily');
                        setHideTradeDetails(false);
                        setView('journal');
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '12px', padding: '10px 12px', cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {isGain ? (
                              <><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></>
                            ) : (
                              <><line x1="17" y1="7" x2="7" y2="17" /><polyline points="17 17 7 17 7 7" /></>
                            )}
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{trade.symbol} {trade.bias.toLowerCase()}</div>
                          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden' }}>{trade.model || 'no model'}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: isGain ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                          {isGain ? '+' : ''}${Math.round(trade.netPnL).toLocaleString()}
                        </div>
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{formatDate(trade.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. FLOATING DETAIL LEDGER TABLE (Collapsible at very bottom of central area) */}
      {showLedgerTable && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          background: 'rgba(15, 15, 17, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px 40px',
          zIndex: 40,
          maxHeight: '400px',
          overflowY: 'auto',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', color: '#fff', fontWeight: '600' }}>Active Execution Ledger</h3>
            <button 
              onClick={() => setShowLedgerTable(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Close Table
            </button>
          </div>

          <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--colors-stone)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => toggleSort('date')}>Date</th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => toggleSort('symbol')}>Symbol</th>
                  <th style={{ padding: '12px 10px' }}>Model</th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => toggleSort('bias')}>Bias</th>
                  <th style={{ padding: '12px 10px' }}>Contracts</th>
                  <th style={{ padding: '12px 10px' }}>Entry Price</th>
                  <th style={{ padding: '12px 10px' }}>Exit Price</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Net PnL</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px', color: 'var(--colors-on-dark-mute)' }}>
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--colors-stone)' }}>
                      No execution trades found.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const isGain = trade.netPnL >= 0;
                    return (
                      <tr
                        key={trade.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedDate(trade.date);
                          setJournalTab('daily');
                          setHideTradeDetails(false);
                          setView('journal');
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td style={{ padding: '12px 10px', color: '#fff', fontWeight: '600' }}>{trade.date}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            {trade.symbol}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.45)' }}>{trade.model || 'Unmapped'}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            color: trade.bias === 'LONG' ? 'var(--colors-gain)' : 'var(--colors-loss)',
                            fontWeight: '700'
                          }}>
                            {trade.bias}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>{trade.contracts}</td>
                        <td style={{ padding: '12px 10px' }}>${trade.avgEntry.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px 10px' }}>${trade.avgExit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: isGain ? 'var(--colors-gain)' : 'var(--colors-loss)' }}>
                          {isGain ? '+' : ''}${trade.netPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Context Menu Overlay */}
      {cardContextMenu && createPortal(
        <>
          <div 
            onClick={() => { setCardContextMenu(null); setHoveredRowId(null); }}
            onContextMenu={(e) => { e.preventDefault(); setCardContextMenu(null); setHoveredRowId(null); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'transparent'
            }}
          />
          <div style={{
            position: 'fixed',
            left: `${cardContextMenu.x + 340 > window.innerWidth ? cardContextMenu.x - 340 : cardContextMenu.x}px`,
            top: `${cardContextMenu.y + 400 > window.innerHeight ? cardContextMenu.y - 400 : cardContextMenu.y}px`,
            zIndex: 10000,
            width: '340px',
            background: 'rgba(15, 15, 17, 0.98)',
            border: '1px solid var(--colors-hairline-dark)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--colors-hairline-dark)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontFamily: 'inherit',
            animation: 'menuScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            transformOrigin: `${cardContextMenu.x + 340 > window.innerWidth ? 'right' : 'left'} ${cardContextMenu.y + 400 > window.innerHeight ? 'bottom' : 'top'}`,
            boxSizing: 'border-box'
          }}>
            
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--colors-primary)', textTransform: 'lowercase', letterSpacing: '1px' }}>
                  workspace selector.
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                  Switch active account or filter
                </span>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={switcherSearchQuery}
                onChange={e => setSwitcherSearchQuery(e.target.value)}
                placeholder="Search accounts..."
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Status Category Tabs */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              padding: '3px',
              display: 'flex',
              gap: '2px',
              boxSizing: 'border-box'
            }}>
              {['all', 'active', 'passed', 'failed', 'payout'].map(filterStatus => {
                const isSelected = switcherStatusFilter.toLowerCase() === filterStatus;
                return (
                  <button
                    key={filterStatus}
                    type="button"
                    onClick={() => {
                      const capitalMap = {
                        all: 'all',
                        active: 'Active',
                        passed: 'Passed',
                        failed: 'Failed',
                        payout: 'Payout'
                      };
                      setSwitcherStatusFilter(capitalMap[filterStatus]);
                    }}
                    style={{
                      flex: 1,
                      background: isSelected ? 'var(--colors-primary-dim)' : 'transparent',
                      border: `1px solid ${isSelected ? 'var(--colors-primary)' : 'transparent'}`,
                      borderRadius: '6px',
                      color: isSelected ? '#fff' : 'var(--colors-stone)',
                      padding: '5px 0',
                      fontSize: '9.5px',
                      fontWeight: '700',
                      textTransform: 'lowercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {filterStatus}
                  </button>
                );
              })}
            </div>

            {/* Account Rows List */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '2px'
              }}
              className="hollow-menu-scrollbar"
            >
              {/* "Everything" Row (Show only when no search query and status is 'all') */}
              {switcherSearchQuery === '' && switcherStatusFilter === 'all' && (() => {
                const isAllActive = selectedAccountId === 'all';
                const allAccountsBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc), 0);
                const isHovered = hoveredRowId === 'all';
                return (
                  <div
                    title="Click to view stats for all accounts combined"
                    onClick={() => {
                      if (setSelectedAccountId) setSelectedAccountId('all');
                      setCardContextMenu(null);
                      setHoveredRowId(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isAllActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: isAllActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxSizing: 'border-box',
                      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)'
                    }}
                    onMouseEnter={() => setHoveredRowId('all')}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: isAllActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isAllActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Layers size={14} color={isAllActive ? '#fff' : 'rgba(255,255,255,0.6)'} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '1px' }}>
                        <span style={{ fontSize: '11px', fontWeight: isAllActive ? '700' : '600', color: isAllActive ? '#fff' : '#fff' }}>
                          everything
                        </span>
                        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>
                          all accounts combined
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: isAllActive ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                        ${allAccountsBalance.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '8px', fontWeight: '700', color: 'rgba(255,255,255,0.45)' }}>ALL</span>
                    </div>
                  </div>
                );
              })()}

              {switcherSearchQuery === '' && switcherStatusFilter === 'all' && (
                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '2px 0' }} />
              )}

              {/* Render Filtered Account List */}
              {(() => {
                const filteredAccounts = accounts.filter(acc => {
                  const matchesSearch = acc.name.toLowerCase().includes(switcherSearchQuery.toLowerCase()) ||
                    (acc.propFirm || '').toLowerCase().includes(switcherSearchQuery.toLowerCase());
                  const matchesStatus = switcherStatusFilter === 'all' || acc.evaluationStatus === switcherStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                if (filteredAccounts.length === 0) {
                  return (
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>
                      No accounts match your filters
                    </div>
                  );
                }

                return filteredAccounts.map(acc => {
                  const isActive = acc.id === selectedAccountId;
                  const accountBalance = getAccountBalance(acc);
                  const isHovered = hoveredRowId === acc.id;
                  const typeStyles = getTypeStyles(acc.type || 'Funded');
                  
                  let statusColor = '#ffffff';
                  if (acc.evaluationStatus === 'Passed') statusColor = 'var(--colors-gain)';
                  else if (acc.evaluationStatus === 'Failed') statusColor = 'var(--colors-loss)';
                  else if (acc.evaluationStatus === 'Payout') statusColor = '#ffffff';

                  const profitTargetProgress = acc.profitTarget && acc.profitTarget > acc.capital
                  ? Math.max(0, Math.min(100, ((accountBalance - acc.capital) / (acc.profitTarget - acc.capital)) * 100))
                  : null;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        if (setSelectedAccountId) setSelectedAccountId(acc.id);
                        setCardContextMenu(null);
                        setHoveredRowId(null);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: isActive 
                          ? typeStyles.bgActive 
                          : (isHovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent'),
                        border: isActive 
                          ? `1px solid ${typeStyles.color}` 
                          : (isHovered ? `1px solid rgba(${typeStyles.rgb}, 0.15)` : '1px solid transparent'),
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxSizing: 'border-box',
                        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                        gap: '6px',
                        boxShadow: isActive ? `0 0 10px rgba(${typeStyles.rgb}, 0.1)` : 'none'
                      }}
                      onMouseEnter={() => setHoveredRowId(acc.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          {/* Firm Badge */}
                          <PropFirmBadge firm={acc.propFirm} type={acc.type} size={26} logoSize={12} />

                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: '1px' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: isActive ? '700' : '600', 
                              color: isActive ? '#fff' : '#fff',
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap'
                            }}>
                              {acc.name}
                            </span>
                            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {acc.propFirm || 'Live Account'} • <span style={{ color: typeStyles.color, fontWeight: '600' }}>{acc.type || 'Funded'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Balance & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: isActive ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                              ${accountBalance.toLocaleString()}
                            </span>
                            <span style={{ 
                              fontSize: '7px', 
                              fontWeight: '800', 
                              color: statusColor, 
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px'
                            }}>
                              {acc.evaluationStatus}
                            </span>
                          </div>
                          
                          {/* Trash delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccountFromContextMenu(acc);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.25)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: '6px',
                              transition: 'all 0.15s',
                              opacity: isHovered ? 1 : 0,
                              pointerEvents: isHovered ? 'auto' : 'none'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#ff6b6b';
                              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.25)';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Trash2 size={10} />
                          </button>

                        </div>

                      </div>

                      {/* Mini Profit Progress Bar */}
                      {profitTargetProgress !== null && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: 'rgba(255,255,255,0.3)' }}>
                            <span>PROFIT TARGET PROGRESS</span>
                            <span>{Math.round(profitTargetProgress)}%</span>
                          </div>
                          <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${profitTargetProgress}%`, 
                              height: '100%', 
                              background: 'var(--colors-gain)',
                              borderRadius: '10px'
                            }} />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                });
              })()}
            </div>

            {/* Separator */}
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '2px 0' }} />

            {/* Quick Actions Row */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedAccountId !== 'all' ? '1fr 1fr' : '1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setCardContextMenu(null);
                  setHoveredRowId(null);
                  openCreateModal();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(40, 199, 111, 0.08)',
                  border: '1px solid rgba(40, 199, 111, 0.15)',
                  color: '#28c76f',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  fontSize: '11px',
                  fontWeight: '700'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(40, 199, 111, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(40, 199, 111, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(40, 199, 111, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(40, 199, 111, 0.15)';
                }}
              >
                <Plus size={12} />
                <span>Add Account</span>
              </button>

              {selectedAccountId !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setCardContextMenu(null);
                    setHoveredRowId(null);
                    openEditModal();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <Edit2 size={12} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

          </div>
        </>,
        document.body
      )}

      {/* Edit/Create Account Modal Overlay */}
      {isEditModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Modal Backdrop */}
          <div 
            onClick={() => setIsEditModalOpen(false)}
            className="hollow-modal-overlay-backdrop"
          />
          
          {/* Modal Content */}
          <form 
            onSubmit={handleSaveAccountDetails}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              background: '#0f0f11',
              border: '1px solid #1c1c1e',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              color: '#fff',
              zIndex: 2001,
              animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: 'none'
                }}>
                  {isCreateMode ? <Plus size={18} /> : <CreditCard size={18} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, letterSpacing: '-0.3px' }}>
                    {isCreateMode ? 'Create Trading Account' : 'Modify Account Parameters'}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                    {isCreateMode ? 'Configure validation limits and targets for your new ledger' : `Adjust verification thresholds for ${selectedAccount?.name}`}
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Category 1: Core Settings */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderLeft: '4px solid #ffffff',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: 'none'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '4px', height: '10px', background: '#ffffff', borderRadius: '2px' }} />
                Account Core Settings
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Prop Firm Presets Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'lowercase', letterSpacing: '0.5px' }}>autofill plan preset</label>
                  <HollowGroupedSelect 
                    value={editPresetId}
                    onChange={handleApplyPreset}
                    presets={PROP_FIRM_PRESETS}
                  />
                </div>

                {/* Account Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Name</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CreditCard size={12} />
                    </div>
                    <input 
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="e.g. My Primary Funded"
                    />
                  </div>
                </div>

                {/* Prop Firm / Broker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prop Firm / Broker</label>
                  <input 
                    type="text"
                    value={editPropFirm}
                    onChange={e => setEditPropFirm(e.target.value)}
                    className="hollow-glass-input"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                    placeholder="e.g. Apex, Topstep, Live"
                  />
                </div>

                {/* Account Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Type</label>
                  <select 
                    value={editType}
                    onChange={e => setEditType(e.target.value)}
                    className="hollow-glass-input"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="Funded" style={{ background: '#0f0f11' }}>funded</option>
                    <option value="Evaluation" style={{ background: '#0f0f11' }}>evaluation</option>
                    <option value="Live" style={{ background: '#0f0f11' }}>live</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category 2: Financial Objectives */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderLeft: '4px solid #ffffff',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.8px', textTransform: 'lowercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '4px', height: '10px', background: '#ffffff', borderRadius: '2px' }} />
                capital & target goals.
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Starting Balance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Starting Balance ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      required
                      value={editBalance}
                      onChange={e => setEditBalance(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                {/* Base Capital */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Base Capital / Size ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      required
                      value={editCapital}
                      onChange={e => setEditCapital(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                {/* Profit Target */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profit Target ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      value={editProfitTarget}
                      onChange={e => setEditProfitTarget(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="0 (Disabled)"
                    />
                  </div>
                </div>

                {/* Payout Goal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payout Goal ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      value={editPayoutGoal}
                      onChange={e => setEditPayoutGoal(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="0 (Disabled)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category 3: Risk & Rules */}
            <div style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderLeft: '4px solid #ffffff',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.8px', textTransform: 'lowercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '4px', height: '10px', background: '#ffffff', borderRadius: '2px' }} />
                drawdown rules & account status.
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Drawdown Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drawdown Type</label>
                  <select 
                    value={editDrawdownType}
                    onChange={e => setEditDrawdownType(e.target.value)}
                    className="hollow-glass-input"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="None" style={{ background: '#0f0f11' }}>none / unlimited</option>
                    <option value="Static" style={{ background: '#0f0f11' }}>static / fixed stop</option>
                    <option value="Trailing" style={{ background: '#0f0f11' }}>trailing drawdown</option>
                    <option value="Daily" style={{ background: '#0f0f11' }}>daily drawdown only</option>
                  </select>
                </div>

                {/* Max Loss Threshold */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Loss Threshold ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      value={editMaxLoss}
                      onChange={e => setEditMaxLoss(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="e.g. 47500"
                    />
                  </div>
                </div>

                {/* Drawdown Limit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drawdown Limit ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      value={editDrawdownLimit}
                      onChange={e => setEditDrawdownLimit(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="e.g. 2500"
                    />
                  </div>
                </div>

                {/* Max Daily Loss Limit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Daily Loss ($)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>$</div>
                    <input 
                      type="number"
                      value={editMaxDailyLoss}
                      onChange={e => setEditMaxDailyLoss(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>

                {/* Min Required Trading Days */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Min Trading Days</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '8px', 
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: 'rgba(255, 255, 255, 0.45)', 
                      pointerEvents: 'none', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Calendar size={12} />
                    </div>
                    <input 
                      type="number"
                      value={editMinTradingDays}
                      onChange={e => setEditMinTradingDays(e.target.value)}
                      className="hollow-glass-input"
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#fff',
                        padding: '12px 14px 12px 38px',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                {/* Evaluation Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Status</label>
                  <select 
                    value={editEvaluationStatus}
                    onChange={e => setEditEvaluationStatus(e.target.value)}
                    className="hollow-glass-input"
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px 14px',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="Active" style={{ background: '#0f0f11' }}>active (trading)</option>
                    <option value="Passed" style={{ background: '#0f0f11' }}>passed (target met)</option>
                    <option value="Failed" style={{ background: '#0f0f11' }}>failed (breached)</option>
                    <option value="Payout" style={{ background: '#0f0f11' }}>payout eligible</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                Cancel
              </button>
              
              <button 
                type="submit"
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#000000',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f2f2f7';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                {isCreateMode ? 'Create Account' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Custom Delete Confirmation Modal */}
      {accountToDelete && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Backdrop */}
          <div 
            onClick={() => setAccountToDelete(null)}
            className="hollow-modal-overlay-backdrop"
          />
          
          {/* Modal Box */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '420px',
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: '#fff',
            zIndex: 100000,
            animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Warning Icon & Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid rgba(255, 69, 58, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--colors-loss)'
              }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>Delete Account Profile?</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.5' }}>
                  Are you sure you want to remove <strong>{accountToDelete.name}</strong>? This action is permanent and will delete all associated trades and execution logs.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                type="button"
                onClick={() => setAccountToDelete(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    // Cascade delete in dependency order (Executions -> Trades -> Account)
                    const referencedTrades = await db.trades.where('accountId').equals(accountToDelete.id).toArray();
                    const tradeIds = referencedTrades.map(t => t.id);
                    for (const tid of tradeIds) {
                      await db.executions.where('tradeId').equals(tid).delete();
                    }
                    await db.trades.where('accountId').equals(accountToDelete.id).delete();
                    await db.accounts.delete(accountToDelete.id);
 
                    if (accountToDelete.id === selectedAccountId) {
                      const remaining = accounts.filter(a => a.id !== accountToDelete.id);
                      if (remaining.length > 0) {
                        if (setSelectedAccountId) setSelectedAccountId(remaining[0].id);
                      }
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setAccountToDelete(null);
                  }
                }}
                style={{
                  flex: 1,
                  background: 'var(--colors-loss)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#d32f2f';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--colors-loss)';
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Error Notice Modal */}
      {deleteErrorMsg && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Backdrop */}
          <div 
            onClick={() => setDeleteErrorMsg(null)}
            className="hollow-modal-overlay-backdrop"
          />
          
          {/* Modal Box */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '380px',
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: '#fff',
            zIndex: 100000,
            animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>Action Prohibited</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', margin: 0, lineHeight: '1.5' }}>
                {deleteErrorMsg}
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setDeleteErrorMsg(null)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              Acknowledge
            </button>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes menuScaleIn {
          from {
            opacity: 0;
            transform: scale(0.93) translateY(2px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes warningPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 84, 85, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(234, 84, 85, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 84, 85, 0); }
        }
        .hollow-glass-input:focus {
          border-color: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
          background: rgba(0, 0, 0, 0.3) !important;
        }
        .hollow-menu-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .hollow-menu-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .hollow-menu-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .hollow-menu-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
