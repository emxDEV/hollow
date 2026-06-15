import Dexie from 'dexie';
import { supabase } from './supabaseClient';
import { showToast } from '../utils/toast';

export const db = new Dexie('HollowDatabase');

let isSyncingFromCloud = false;

// Sanitizes objects to prevent Supabase sync errors due to local-only properties
function sanitizeForSupabase(tableName, obj) {
  if (!obj) return obj;
  if (tableName === 'weeklyPlanners') {
    const allowed = ['weekId', 'startDate', 'endDate', 'status', 'goals', 'priorities', 'reviewNotes'];
    const cleaned = {};
    allowed.forEach(k => {
      if (obj[k] !== undefined) cleaned[k] = obj[k];
    });
    return cleaned;
  }
  if (tableName === 'trades') {
    // Exclude local-only properties not in Supabase schema
    const { dol, po3, po3Time, entryTf, rr, sl, tp, manualPnL, wl, rating, problems, problemInput, commentExecution, commentFazit, ...rest } = obj;
    return rest;
  }
  return obj;
}

let syncQueue = Promise.resolve();

const enqueueSync = (taskFn) => {
  syncQueue = syncQueue.then(async () => {
    try {
      await taskFn();
    } catch (err) {
      console.error("Error executing queued sync task:", err);
    }
  });
  return syncQueue;
};

// Register Dexie hooks for Supabase background sync
const registerSyncHooks = () => {
  const tables = [
    { name: 'accounts', store: db.accounts, pk: 'id' },
    { name: 'trades', store: db.trades, pk: 'id' },
    { name: 'executions', store: db.executions, pk: 'id' },
    { name: 'dailyJournals', store: db.dailyJournals, pk: 'date' },
    { name: 'weeklyPlanners', store: db.weeklyPlanners, pk: 'weekId' },
    { name: 'groups', store: db.groups, pk: 'id' }
  ];

  tables.forEach(table => {
    table.store.hook('creating', (primKey, obj, transaction) => {
      if (isSyncingFromCloud) return;
      const sanitized = sanitizeForSupabase(table.name, obj);
      enqueueSync(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { error } = await supabase.from(table.name).upsert(sanitized);
        if (error) {
          console.error(`Supabase sync error on creating in ${table.name}:`, error);
          showToast(`Supabase sync fail: ${error.message}`, 'error');
        }
      });
    });

    table.store.hook('updating', (mods, primKey, obj, transaction) => {
      if (isSyncingFromCloud) return;
      const updatedObj = { ...obj, ...mods };
      const sanitized = sanitizeForSupabase(table.name, updatedObj);
      enqueueSync(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { error } = await supabase.from(table.name).upsert(sanitized);
        if (error) {
          console.error(`Supabase sync error on updating in ${table.name}:`, error);
          showToast(`Supabase sync fail: ${error.message}`, 'error');
        }
      });
    });

    table.store.hook('deleting', (primKey, obj, transaction) => {
      if (isSyncingFromCloud) return;
      enqueueSync(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { error } = await supabase.from(table.name).delete().eq(table.pk, primKey);
        if (error) {
          console.error(`Supabase sync error on deleting in ${table.name}:`, error);
          showToast(`Supabase sync fail: ${error.message}`, 'error');
        }
      });
    });
  });
};

// Define database tables and index keys (versioned for upgrades)
db.version(1).stores({
  accounts: 'id, name, type',
  trades: 'id, accountId, symbol, model, bias, status',
  executions: 'id, tradeId, timestamp, side'
});

db.version(2).stores({
  accounts: 'id, name, type',
  trades: 'id, accountId, symbol, model, bias, status',
  executions: 'id, tradeId, timestamp, side',
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status'
});

db.version(3).stores({
  accounts: 'id, name, type',
  trades: 'id, accountId, symbol, model, bias, status',
  executions: 'id, tradeId, timestamp, side',
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status',
  groups: 'id, name, leaderAccountId'
});

db.version(4).stores({
  accounts: 'id, name, type',
  trades: 'id, accountId, symbol, model, bias, status',
  executions: 'id, tradeId, timestamp, side',
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status',
  groups: 'id, name, leaderAccountId',
  workouts: 'id, date, type'
});

db.version(5).stores({
  accounts: 'id, name, type',
  trades: 'id, accountId, symbol, model, bias, status, date',
  executions: 'id, tradeId, timestamp, side',
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status',
  groups: 'id, name, leaderAccountId',
  workouts: 'id, date, type'
});

// Activate hooks
registerSyncHooks();

// Clean orphaned records locally before sync
export async function cleanOrphanedRecordsLocal() {
  try {
    const prevSyncing = isSyncingFromCloud;
    isSyncingFromCloud = true;

    const accounts = await db.accounts.toArray();
    const accountIds = new Set(accounts.map(a => a.id));

    // Find trades with non-existent accountId
    const trades = await db.trades.toArray();
    const orphanedTrades = trades.filter(t => !accountIds.has(t.accountId));
    if (orphanedTrades.length > 0) {
      console.warn(`Cleaning up ${orphanedTrades.length} orphaned trades from local DB...`);
      const orphanedTradeIds = orphanedTrades.map(t => t.id);
      await db.trades.bulkDelete(orphanedTradeIds);
    }

    // Find executions with non-existent tradeId
    const remainingTrades = await db.trades.toArray();
    const tradeIds = new Set(remainingTrades.map(t => t.id));
    const executions = await db.executions.toArray();
    const orphanedExecutions = executions.filter(e => !tradeIds.has(e.tradeId));
    if (orphanedExecutions.length > 0) {
      console.warn(`Cleaning up ${orphanedExecutions.length} orphaned executions from local DB...`);
      const orphanedExecutionIds = orphanedExecutions.map(e => e.id);
      await db.executions.bulkDelete(orphanedExecutionIds);
    }

    isSyncingFromCloud = prevSyncing;
  } catch (err) {
    console.error("Failed to clean orphaned records locally:", err);
  }
}

// Synchronization function
export async function syncWithSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("Supabase sync skipped: No active user session.");
      return;
    }
    await cleanOrphanedRecordsLocal();
    console.log('Starting Supabase parallel sync check...');
    
    // Disable hooks during initial synchronization to prevent cycles
    isSyncingFromCloud = true;
    
    const tables = [
      { name: 'accounts', store: db.accounts, pk: 'id' },
      { name: 'trades', store: db.trades, pk: 'id' },
      { name: 'executions', store: db.executions, pk: 'id' },
      { name: 'dailyJournals', store: db.dailyJournals, pk: 'date' },
      { name: 'weeklyPlanners', store: db.weeklyPlanners, pk: 'weekId' },
      { name: 'groups', store: db.groups, pk: 'id' }
    ];

    let pulledCount = 0;
    let pushedCount = 0;

    for (const table of tables) {
      const { data: remoteData, error } = await supabase.from(table.name).select('*');
      
      if (error) {
        console.error(`Failed to query table ${table.name} from Supabase:`, error);
        showToast(`Supabase Connect Error on ${table.name}: ${error.message}`, 'error');
        continue;
      }

      const localData = await table.store.toArray();

      if (remoteData.length > 0 && localData.length === 0) {
        // Pull data from Supabase to empty local database
        const cleanedData = remoteData.map(item => {
          const { created_at, ...rest } = item;
          return rest;
        });
        await table.store.bulkPut(cleanedData);
        pulledCount++;
      } else if (localData.length > 0 && remoteData.length === 0) {
        // Push local database to empty Supabase database
        const sanitizedLocalData = localData.map(item => sanitizeForSupabase(table.name, item));
        const { error: pushError } = await supabase.from(table.name).upsert(sanitizedLocalData);
        if (pushError) {
          console.error(`Failed to push table ${table.name} to Supabase:`, pushError);
          showToast(`Failed to upload ${table.name}: ${pushError.message}`, 'error');
        } else {
          pushedCount++;
        }
      } else if (localData.length > 0 && remoteData.length > 0) {
        // Bidirectional merge: sync local changes to cloud and pull cloud changes
        const sanitizedLocalData = localData.map(item => sanitizeForSupabase(table.name, item));
        const { error: pushError } = await supabase.from(table.name).upsert(sanitizedLocalData);
        if (pushError) {
          console.error(`Failed to merge push table ${table.name}:`, pushError);
        }
        
        const cleanedData = remoteData.map(item => {
          const { created_at, ...rest } = item;
          return rest;
        });
        
        // Merge remote data into local database, keeping local-only fields
        for (const remoteItem of cleanedData) {
          const localItem = await table.store.get(remoteItem[table.pk]);
          if (localItem) {
            await table.store.put({ ...localItem, ...remoteItem });
          } else {
            await table.store.put(remoteItem);
          }
        }
      }
    }
    
    isSyncingFromCloud = false;
    console.log('Supabase sync check complete!');
    if (pulledCount > 0 || pushedCount > 0) {
      showToast('Cloud database synchronized successfully!', 'success');
    }
  } catch (err) {
    console.error('Unexpected error during Supabase sync:', err);
    showToast(`Unexpected sync error: ${err.message}`, 'error');
    isSyncingFromCloud = false;
  }
}


// Seed helper function to populate the journal if empty
export async function seedDatabaseIfEmpty() {
  const accountCount = await db.accounts.count();
  const currentJournalCount = await db.dailyJournals.count();

  try {
    isSyncingFromCloud = true;
    if (currentJournalCount === 0) {
    console.log('Daily Journals table is empty. Seeding daily journal and habits records...');
    const mockDailyJournals = [
      {
        date: '2024-06-05',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 4,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 7.0,
        sleepQuality: 4,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 3.5,
        homeworkDone: true,
        preMarketNotes: 'June 5 premarket: Mapped NQ daily key support levels. Expecting trend expansion.',
        postMarketNotes: 'June 5 postmarket: Executed clean Opening Range Breakout setup for a solid profit.'
      },
      {
        date: '2024-06-10',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 3,
        patienceLevel: 4,
        riskAdherence: 5,
        sleepHours: 6.5,
        sleepQuality: 3,
        workoutDone: false,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 4.8,
        homeworkDone: true,
        preMarketNotes: 'June 10 premarket: premkt consolidation. Waiting for London liquidity sweep.',
        postMarketNotes: 'June 10 postmarket: Bounced on ES Fair Value Gap. Covered half on targets, closed green.'
      },
      {
        date: '2024-06-11',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 5,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 8.0,
        sleepQuality: 5,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 3.0,
        homeworkDone: true,
        preMarketNotes: 'June 11 premarket: CPI Release day. Volatility is very high. Keeping position size small.',
        postMarketNotes: 'June 11 postmarket: Scalped NQ on range breakouts. 1 big win, 1 minor loss. Clean risk management.'
      },
      {
        date: '2024-06-13',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: false,
        dailyOpenMapped: true,
        mentalFocus: 2,
        patienceLevel: 2,
        riskAdherence: 3,
        sleepHours: 5.8,
        sleepQuality: 2,
        workoutDone: false,
        dietClean: false,
        meditationDone: false,
        screenTimeHours: 6.2,
        homeworkDone: false,
        preMarketNotes: 'June 13 premarket: Slept poorly last night, feeling fatigued. FOMO risk is elevated.',
        postMarketNotes: 'June 13 postmarket: Bad trading day. Traded against the trend on Gold (GC). Stopped out twice.'
      },
      {
        date: '2024-06-14',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 4,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 7.5,
        sleepQuality: 4,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 4.2,
        homeworkDone: true,
        preMarketNotes: 'June 14 premarket: Bullish setup forming on ES. Scanning FVG boundary entries.',
        postMarketNotes: 'June 14 postmarket: Executed rules. 1 win, 2 small losses. Kept overall day in green.'
      },
      {
        date: '2024-06-17',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 4,
        patienceLevel: 4,
        riskAdherence: 4,
        sleepHours: 7.2,
        sleepQuality: 3,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 5.0,
        homeworkDone: true,
        preMarketNotes: 'June 17 premarket: Quiet Monday open. Scanning NQ support ranges.',
        postMarketNotes: 'June 17 postmarket: NQ chopped heavily in the afternoon. Took 3 losses on stops. Frustrating day.'
      },
      {
        date: '2024-06-18',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 5,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 7.8,
        sleepQuality: 4,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 3.8,
        homeworkDone: true,
        preMarketNotes: 'June 18 premarket: Mapped Volume Profile POC on ES. Waiting for clear retests.',
        postMarketNotes: 'June 18 postmarket: Bounced POC twice with high accuracy. 2 wins. Followed playbook rules.'
      },
      {
        date: '2024-06-19',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 4,
        patienceLevel: 4,
        riskAdherence: 5,
        sleepHours: 7.5,
        sleepQuality: 4,
        workoutDone: true,
        dietClean: true,
        meditationDone: false,
        screenTimeHours: 2.9,
        homeworkDone: true,
        preMarketNotes: 'June 19 premarket: Mapped ICT Silver Bullet zones on Gold (GC).',
        postMarketNotes: 'June 19 postmarket: Single entry on Silver Bullet long, target reached quickly. Closed terminal.'
      },
      {
        date: '2024-06-20',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 5,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 7.4,
        sleepQuality: 4,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 5.5,
        homeworkDone: true,
        preMarketNotes: 'June 20 premarket: Heavy trend day expected. Scanning NQ for opening ranges.',
        postMarketNotes: 'June 20 postmarket: Active session. 2 big wins, 3 small losses on NQ. Profit cushion is solid.'
      },
      {
        date: '2024-06-21',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 3,
        patienceLevel: 4,
        riskAdherence: 4,
        sleepHours: 6.8,
        sleepQuality: 3,
        workoutDone: false,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 4.0,
        homeworkDone: true,
        preMarketNotes: 'June 21 premarket: Friday open. Scanning Crude Oil (CL) support channels.',
        postMarketNotes: 'June 21 postmarket: Bounced CL FVG for 1 win. Stopped out on second attempt. Consistent risk.'
      },
      {
        date: '2024-06-24',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 5,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 8.2,
        sleepQuality: 5,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 3.2,
        homeworkDone: true,
        preMarketNotes: 'June 24 premarket: Premarket support swept on NQ. Waiting for opening range setups.',
        postMarketNotes: 'June 24 postmarket: 1 win, 2 losses on NQ. Kept drawdown minimal via tight stop levels.'
      },
      {
        date: '2024-06-25',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 4,
        patienceLevel: 5,
        riskAdherence: 5,
        sleepHours: 7.6,
        sleepQuality: 4,
        workoutDone: true,
        dietClean: true,
        meditationDone: true,
        screenTimeHours: 4.1,
        homeworkDone: true,
        preMarketNotes: 'June 25 premarket: Volume Profile POC sweep on ES. Expecting clean support bounce.',
        postMarketNotes: 'June 25 postmarket: 1 win, 2 small losses. POC bounce hit target. Overall green day.'
      },
      {
        date: '2024-06-26',
        status: 'COMPLETED',
        newsChecked: true,
        htfAnalysisDone: true,
        liquidityDrawn: true,
        dailyOpenMapped: true,
        mentalFocus: 3,
        patienceLevel: 4,
        riskAdherence: 4,
        sleepHours: 7.0,
        sleepQuality: 3,
        workoutDone: true,
        dietClean: true,
        meditationDone: false,
        screenTimeHours: 3.9,
        homeworkDone: true,
        preMarketNotes: 'June 26 premarket: Scanning NQ for silver bullet short entries.',
        postMarketNotes: 'June 26 postmarket: Took single SHORT trade on NQ. Stopped out for a small loss. Closed desk.'
      }
    ];

    const mockWeeklyPlanners = [
      {
        weekId: '2024-W23',
        startDate: '2024-06-03',
        endDate: '2024-06-09',
        status: 'COMPLETED',
        goals: 'Follow risk limits',
        priorities: 'Funded account consistency',
        reviewNotes: 'Great start to June. Hit all daily goals.'
      },
      {
        weekId: '2024-W24',
        startDate: '2024-06-10',
        endDate: '2024-06-16',
        status: 'COMPLETED',
        goals: 'Do not chase CPI news volatility',
        priorities: 'Verify HTF bias on ES and NQ',
        reviewNotes: 'CPI day was volatile but kept position sizes small. Managed drawdown on GC well.'
      },
      {
        weekId: '2024-W25',
        startDate: '2024-06-17',
        endDate: '2024-06-23',
        status: 'COMPLETED',
        goals: 'Cut losses quickly, avoid averaging down',
        priorities: 'Trade only after 9:45 AM NY time',
        reviewNotes: 'Very positive week. Volume Profile POC bounces were highly accurate and clean.'
      },
      {
        weekId: '2024-W26',
        startDate: '2024-06-24',
        endDate: '2024-06-30',
        status: 'COMPLETED',
        goals: 'Maintain discipline on prop firm account',
        priorities: 'Ensure bionic checklist alignment',
        reviewNotes: 'Completed the month strong. Maintained funded account cushion and hit target profit.'
      }
    ];

    await db.dailyJournals.bulkAdd(mockDailyJournals);
    await db.weeklyPlanners.bulkAdd(mockWeeklyPlanners);
    console.log('Seeded dailyJournals and weeklyPlanners stores.');

    // Seed workouts
    const workoutsCount = await db.workouts.count();
    if (workoutsCount === 0) {
      const mockWorkouts = [
        { id: 'w-1', date: '2024-06-17', type: 'Push', duration: 45, notes: 'Chest, Shoulders & Triceps focus. Felt strong.', exercises: [{ name: 'Bench Press', sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 7 }] }, { name: 'Overhead Press', sets: [{ weight: 40, reps: 10 }, { weight: 40, reps: 8 }] }] },
        { id: 'w-2', date: '2024-06-19', type: 'Pull', duration: 50, notes: 'Back & Biceps. Pull-ups and rows.', exercises: [{ name: 'Pull-ups', sets: [{ weight: 0, reps: 10 }, { weight: 0, reps: 10 }, { weight: 0, reps: 8 }] }, { name: 'Barbell Row', sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }] }] },
        { id: 'w-3', date: '2024-06-21', type: 'Legs', duration: 60, notes: 'Heavy Leg Day. Squats and extensions.', exercises: [{ name: 'Squats', sets: [{ weight: 100, reps: 6 }, { weight: 100, reps: 6 }, { weight: 100, reps: 5 }] }] }
      ];
      await db.workouts.bulkAdd(mockWorkouts);
      console.log('Seeded workouts store.');
    }
  }

  if (accountCount === 0) {
    console.log('Hollow Database accounts are empty. Seeding accounts and trades logs...');
    const mockAccounts = [
      {
        id: 'acc-funded-1',
        name: 'Apex Funded #1 (50K)',
        type: 'Funded',
        balance: 50000,
        capital: 50000,
        profitTarget: 53000,
        maxLoss: 47500,
        propFirm: 'Apex Trader Funding',
        payoutGoal: 52500,
        drawdownType: 'Trailing',
        drawdownLimit: 2500,
        maxDailyLoss: 1000,
        minTradingDays: 7,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-eval-2',
        name: 'MyForexFunds Eval (100K)',
        type: 'Evaluation',
        balance: 98800,
        capital: 100000,
        profitTarget: 108000,
        maxLoss: 95000,
        propFirm: 'MFF',
        payoutGoal: 0,
        drawdownType: 'Daily',
        drawdownLimit: 5000,
        maxDailyLoss: 5000,
        minTradingDays: 5,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-live-3',
        name: 'Interactive Brokers (Live)',
        type: 'Live',
        balance: 14500,
        capital: 10000,
        profitTarget: 20000,
        maxLoss: 8000,
        propFirm: '',
        payoutGoal: 15000,
        drawdownType: 'Static',
        drawdownLimit: 2000,
        maxDailyLoss: 500,
        minTradingDays: 0,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-mock-1',
        name: 'FTDFYG100887297115',
        type: 'Funded',
        balance: 101729.58,
        capital: 100000,
        profitTarget: 106000,
        maxLoss: 97000,
        propFirm: 'Tradeify',
        payoutGoal: 105000,
        drawdownType: 'Trailing',
        drawdownLimit: 3000,
        maxDailyLoss: 0,
        minTradingDays: 3,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-mock-2',
        name: 'LFE0506251177001',
        type: 'Evaluation',
        balance: 50000.00,
        capital: 50000,
        profitTarget: 53000,
        maxLoss: 47500,
        propFirm: 'Lucid Trading',
        payoutGoal: 0,
        drawdownType: 'Trailing',
        drawdownLimit: 2500,
        maxDailyLoss: 0,
        minTradingDays: 5,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-mock-3',
        name: 'LFE0506251177002',
        type: 'Evaluation',
        balance: 50000.00,
        capital: 50000,
        profitTarget: 53000,
        maxLoss: 47500,
        propFirm: 'Lucid Trading',
        payoutGoal: 0,
        drawdownType: 'Trailing',
        drawdownLimit: 2500,
        maxDailyLoss: 0,
        minTradingDays: 5,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-mock-4',
        name: 'LFF1506251177001',
        type: 'Funded',
        balance: 151463.00,
        capital: 150000,
        profitTarget: 159000,
        maxLoss: 145500,
        propFirm: 'Lucid Trading',
        payoutGoal: 155000,
        drawdownType: 'Trailing',
        drawdownLimit: 4500,
        maxDailyLoss: 0,
        minTradingDays: 5,
        evaluationStatus: 'Active'
      },
      {
        id: 'acc-mock-5',
        name: 'LTF1506251177001',
        type: 'Funded',
        balance: 152293.50,
        capital: 150000,
        profitTarget: 159000,
        maxLoss: 145500,
        propFirm: 'Lucid Trading',
        payoutGoal: 155000,
        drawdownType: 'Trailing',
        drawdownLimit: 4500,
        maxDailyLoss: 0,
        minTradingDays: 5,
        evaluationStatus: 'Active'
      }
    ];

    // Seeded trades structured to calculate mathematically exact metrics:
    // Wins count: 14, Losses count: 19, Break-even count: 2. Total Trades = 35.
    // Sum of Wins = 13314, Sum of Losses = 6130.25, Net P&L = $7183.75
    // Win Rate = 14/33 = 42.42%, Profit Factor = 13314 / 6130.25 = 2.17
    // Average Win = $951, Average Loss = $322, Avg Win/Loss Ratio = 2.95
    const mockTrades = [
      // Historical Trades (6 trades: 2 wins, 2 losses, 2 break-evens)
      { id: 'trade-h1', accountId: 'acc-funded-1', date: '2023-03-19', symbol: 'ES', model: 'Fair Value Gap', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest', 'HTF Level'], setupRating: 'A', newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: true, mistakes: [], commentBias: 'Historical setup' },
      { id: 'trade-h2', accountId: 'acc-funded-1', date: '2023-03-20', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'SHORT', status: 'CLOSED', confluences: ['VWAP Hold'], setupRating: 'B', newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'], commentBias: 'Historical setup' },
      { id: 'trade-h3', accountId: 'acc-funded-1', date: '2024-01-10', symbol: 'ES', model: 'Volume Profile POC', bias: 'LONG', status: 'CLOSED', confluences: ['Volume Profile POC', 'HTF Level'], setupRating: 'A', newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [], commentBias: 'Historical setup' },
      { id: 'trade-h4', accountId: 'acc-funded-1', date: '2024-01-11', symbol: 'NQ', model: 'ICT Silver Bullet', bias: 'SHORT', status: 'CLOSED', confluences: ['Liquidity Sweep'], setupRating: 'B', newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['FOMO'], commentBias: 'Historical setup' },
      { id: 'trade-h5', accountId: 'acc-funded-1', date: '2024-02-15', symbol: 'GC', model: 'Fair Value Gap', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest'], setupRating: 'B', mistakes: [], commentBias: 'Historical setup' },
      { id: 'trade-h6', accountId: 'acc-funded-1', date: '2024-02-16', symbol: 'CL', model: 'Opening Range Breakout', bias: 'SHORT', status: 'CLOSED', confluences: ['VWAP Hold'], setupRating: 'C', mistakes: [], commentBias: 'Historical setup' },

      // June 2024 Trades (29 trades: 12 wins, 17 losses)
      // June 5 (+1,050)
      { id: 'trade-j1', accountId: 'acc-funded-1', date: '2024-06-05', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['VWAP Hold', 'HTF Level'], setupRating: 'A+', sentimentPre: 4, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [] },
      // June 10 (+600)
      { id: 'trade-j2', accountId: 'acc-funded-1', date: '2024-06-10', symbol: 'ES', model: 'Fair Value Gap', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest', 'Liquidity Sweep'], setupRating: 'A', sentimentPre: 4, sentimentPost: 4, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: true, mistakes: [] },
      // June 11 (+1,090 from 1 win of +1,690, 1 loss of -600)
      { id: 'trade-j3', accountId: 'acc-funded-1', date: '2024-06-11', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['VWAP Hold', 'Market Shift'], setupRating: 'A+', sentimentPre: 5, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [] },
      { id: 'trade-j4', accountId: 'acc-funded-1', date: '2024-06-11', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['Market Shift'], setupRating: 'B', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['FOMO'] },
      // June 13 (-638 from 2 losses of -319 each)
      { id: 'trade-j5', accountId: 'acc-funded-1', date: '2024-06-13', symbol: 'GC', model: 'ICT Silver Bullet', bias: 'SHORT', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 2, sentimentPost: 1, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Averaging Down', 'Overtrading'] },
      { id: 'trade-j6', accountId: 'acc-funded-1', date: '2024-06-13', symbol: 'GC', model: 'ICT Silver Bullet', bias: 'SHORT', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 2, sentimentPost: 1, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Holding Losers', 'Overtrading'] },
      // June 14 (+556 from 1 win of +1,459, 2 losses of -450 and -453) - NOTES ATTACHED
      { id: 'trade-j7', accountId: 'acc-funded-1', date: '2024-06-14', symbol: 'ES', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['HTF Level', 'Liquidity Sweep', 'VWAP Hold'], setupRating: 'A+', sentimentPre: 5, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [], commentBias: 'Trade notes attached.' },
      { id: 'trade-j8', accountId: 'acc-funded-1', date: '2024-06-14', symbol: 'ES', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest'], setupRating: 'B', sentimentPre: 4, sentimentPost: 3, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'] },
      { id: 'trade-j9', accountId: 'acc-funded-1', date: '2024-06-14', symbol: 'ES', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['FOMO', 'Sizing Up'] },
      // June 17 (-788 from 3 losses of -288, -250, -250)
      { id: 'trade-j10', accountId: 'acc-funded-1', date: '2024-06-17', symbol: 'NQ', model: 'Fair Value Gap', bias: 'SHORT', status: 'CLOSED', confluences: ['HTF Level'], setupRating: 'B', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'] },
      { id: 'trade-j11', accountId: 'acc-funded-1', date: '2024-06-17', symbol: 'NQ', model: 'Fair Value Gap', bias: 'SHORT', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 2, sentimentPost: 1, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Averaging Down'] },
      { id: 'trade-j12', accountId: 'acc-funded-1', date: '2024-06-17', symbol: 'NQ', model: 'Fair Value Gap', bias: 'SHORT', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 1, sentimentPost: 1, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Overtrading'] },
      // June 18 (+875 from 2 wins of +500 and +375) - NOTES ATTACHED
      { id: 'trade-j13', accountId: 'acc-funded-1', date: '2024-06-18', symbol: 'ES', model: 'Volume Profile POC', bias: 'LONG', status: 'CLOSED', confluences: ['Volume Profile POC', 'HTF Level'], setupRating: 'A', sentimentPre: 4, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [], commentBias: 'Trade notes attached.' },
      { id: 'trade-j14', accountId: 'acc-funded-1', date: '2024-06-18', symbol: 'ES', model: 'Volume Profile POC', bias: 'LONG', status: 'CLOSED', confluences: ['Volume Profile POC', 'VWAP Hold'], setupRating: 'A', sentimentPre: 4, sentimentPost: 4, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: true, mistakes: [] },
      // June 19 (+608 from 1 win) - NOTES ATTACHED
      { id: 'trade-j15', accountId: 'acc-funded-1', date: '2024-06-19', symbol: 'GC', model: 'ICT Silver Bullet', bias: 'LONG', status: 'CLOSED', confluences: ['Liquidity Sweep', 'Market Shift'], setupRating: 'A+', sentimentPre: 5, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [], commentBias: 'Trade notes attached.' },
      // June 20 (+1,180 from 2 wins of +1,000 and +780, 3 losses of -200 each)
      { id: 'trade-j16', accountId: 'acc-funded-1', date: '2024-06-20', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['HTF Level', 'Market Shift', 'VWAP Hold'], setupRating: 'A+', sentimentPre: 5, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [] },
      { id: 'trade-j17', accountId: 'acc-funded-1', date: '2024-06-20', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest', 'VWAP Hold'], setupRating: 'A', sentimentPre: 4, sentimentPost: 4, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: true, mistakes: [] },
      { id: 'trade-j18', accountId: 'acc-funded-1', date: '2024-06-20', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['HTF Level'], setupRating: 'B', sentimentPre: 3, sentimentPost: 3, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'] },
      { id: 'trade-j19', accountId: 'acc-funded-1', date: '2024-06-20', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: [], setupRating: 'B', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['FOMO'] },
      { id: 'trade-j20', accountId: 'acc-funded-1', date: '2024-06-20', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 2, sentimentPost: 1, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Overtrading'] },
      // June 21 (+113 from 1 win of +413, 1 loss of -300)
      { id: 'trade-j21', accountId: 'acc-funded-1', date: '2024-06-21', symbol: 'CL', model: 'Fair Value Gap', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest', 'HTF Level'], setupRating: 'A', sentimentPre: 4, sentimentPost: 4, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [] },
      { id: 'trade-j22', accountId: 'acc-funded-1', date: '2024-06-21', symbol: 'CL', model: 'Fair Value Gap', bias: 'LONG', status: 'CLOSED', confluences: ['HTF Level'], setupRating: 'B', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Sizing Up'] },
      // June 24 (+225 from 1 win of +825, 2 losses of -300 each)
      { id: 'trade-j23', accountId: 'acc-funded-1', date: '2024-06-24', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['VWAP Hold', 'Liquidity Sweep'], setupRating: 'A', sentimentPre: 4, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [] },
      { id: 'trade-j24', accountId: 'acc-funded-1', date: '2024-06-24', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: ['FVG Retest'], setupRating: 'B', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'] },
      { id: 'trade-j25', accountId: 'acc-funded-1', date: '2024-06-24', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'LONG', status: 'CLOSED', confluences: [], setupRating: 'B', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['FOMO'] },
      // June 25 (+300 from 1 win of +900, 2 losses of -300 each) - NOTES ATTACHED
      { id: 'trade-j26', accountId: 'acc-funded-1', date: '2024-06-25', symbol: 'ES', model: 'Volume Profile POC', bias: 'LONG', status: 'CLOSED', confluences: ['Volume Profile POC', 'HTF Level', 'VWAP Hold'], setupRating: 'A+', sentimentPre: 5, sentimentPost: 5, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: true, displacementConfirmed: true, mistakes: [] },
      { id: 'trade-j27', accountId: 'acc-funded-1', date: '2024-06-25', symbol: 'ES', model: 'Volume Profile POC', bias: 'LONG', status: 'CLOSED', confluences: ['Volume Profile POC'], setupRating: 'B', sentimentPre: 4, sentimentPost: 3, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'] },
      { id: 'trade-j28', accountId: 'acc-funded-1', date: '2024-06-25', symbol: 'ES', model: 'Volume Profile POC', bias: 'LONG', status: 'CLOSED', confluences: [], setupRating: 'C', sentimentPre: 3, sentimentPost: 2, newsChecked: true, htfBiasAligned: false, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Holding Losers'] },
      // June 26 (-37.5 from 1 loss of -37.5) - NOTES ATTACHED
      { id: 'trade-j29', accountId: 'acc-funded-1', date: '2024-06-26', symbol: 'NQ', model: 'Opening Range Breakout', bias: 'SHORT', status: 'CLOSED', confluences: ['Market Shift'], setupRating: 'B', sentimentPre: 4, sentimentPost: 3, newsChecked: true, htfBiasAligned: true, stopHuntIdentified: false, displacementConfirmed: false, mistakes: ['Early Exit'], commentBias: 'Trade notes attached.' }
    ];

    const mockExecutions = [
      // Historical Executions
      { id: 'exec-h1-1', tradeId: 'trade-h1', timestamp: '2023-03-19T10:00:00Z', side: 'BUY', price: 3950.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-h1-2', tradeId: 'trade-h1', timestamp: '2023-03-19T10:20:00Z', side: 'SELL', price: 3990.10, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-h2-1', tradeId: 'trade-h2', timestamp: '2023-03-20T09:35:00Z', side: 'SELL', price: 12100.00, contracts: 2, commissions: 4.80, type: 'ENTRY' },
      { id: 'exec-h2-2', tradeId: 'trade-h2', timestamp: '2023-03-20T09:42:00Z', side: 'BUY', price: 12118.835, contracts: 2, commissions: 4.80, type: 'EXIT' },

      { id: 'exec-h3-1', tradeId: 'trade-h3', timestamp: '2024-01-10T14:15:00Z', side: 'BUY', price: 4750.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-h3-2', tradeId: 'trade-h3', timestamp: '2024-01-10T14:40:00Z', side: 'SELL', price: 4780.38, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-h4-1', tradeId: 'trade-h4', timestamp: '2024-01-11T10:05:00Z', side: 'SELL', price: 16800.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-h4-2', tradeId: 'trade-h4', timestamp: '2024-01-11T10:15:00Z', side: 'BUY', price: 16834.7975, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-h5-1', tradeId: 'trade-h5', timestamp: '2024-02-15T11:00:00Z', side: 'BUY', price: 2020.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-h5-2', tradeId: 'trade-h5', timestamp: '2024-02-15T11:05:00Z', side: 'SELL', price: 2020.05, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-h6-1', tradeId: 'trade-h6', timestamp: '2024-02-16T15:30:00Z', side: 'SELL', price: 78.50, contracts: 1, commissions: 5.00, type: 'ENTRY' },
      { id: 'exec-h6-2', tradeId: 'trade-h6', timestamp: '2024-02-16T15:45:00Z', side: 'BUY', price: 78.49, contracts: 1, commissions: 5.00, type: 'EXIT' },

      // June 5
      { id: 'exec-j1-1', tradeId: 'trade-j1', timestamp: '2024-06-05T09:35:00Z', side: 'BUY', price: 18500.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j1-2', tradeId: 'trade-j1', timestamp: '2024-06-05T09:42:00Z', side: 'SELL', price: 18552.74, contracts: 1, commissions: 2.40, type: 'EXIT' },

      // June 10
      { id: 'exec-j2-1', tradeId: 'trade-j2', timestamp: '2024-06-10T10:15:00Z', side: 'BUY', price: 5200.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j2-2', tradeId: 'trade-j2', timestamp: '2024-06-10T10:35:00Z', side: 'SELL', price: 5212.10, contracts: 1, commissions: 2.50, type: 'EXIT' },

      // June 11
      { id: 'exec-j3-1', tradeId: 'trade-j3', timestamp: '2024-06-11T09:36:00Z', side: 'BUY', price: 18500.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j3-2', tradeId: 'trade-j3', timestamp: '2024-06-11T09:50:00Z', side: 'SELL', price: 18584.74, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j4-1', tradeId: 'trade-j4', timestamp: '2024-06-11T13:40:00Z', side: 'BUY', price: 18500.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j4-2', tradeId: 'trade-j4', timestamp: '2024-06-11T13:45:00Z', side: 'SELL', price: 18470.26, contracts: 1, commissions: 2.40, type: 'EXIT' },

      // June 13
      { id: 'exec-j5-1', tradeId: 'trade-j5', timestamp: '2024-06-13T10:02:00Z', side: 'SELL', price: 2350.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j5-2', tradeId: 'trade-j5', timestamp: '2024-06-13T10:15:00Z', side: 'BUY', price: 2353.14, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-j6-1', tradeId: 'trade-j6', timestamp: '2024-06-13T10:25:00Z', side: 'SELL', price: 2350.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j6-2', tradeId: 'trade-j6', timestamp: '2024-06-13T10:30:00Z', side: 'BUY', price: 2353.14, contracts: 1, commissions: 2.50, type: 'EXIT' },

      // June 14
      { id: 'exec-j7-1', tradeId: 'trade-j7', timestamp: '2024-06-14T09:40:00Z', side: 'BUY', price: 5250.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j7-2', tradeId: 'trade-j7', timestamp: '2024-06-14T10:05:00Z', side: 'SELL', price: 5279.28, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-j8-1', tradeId: 'trade-j8', timestamp: '2024-06-14T13:50:00Z', side: 'BUY', price: 5250.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j8-2', tradeId: 'trade-j8', timestamp: '2024-06-14T13:55:00Z', side: 'SELL', price: 5241.10, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-j9-1', tradeId: 'trade-j9', timestamp: '2024-06-14T14:10:00Z', side: 'BUY', price: 5250.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j9-2', tradeId: 'trade-j9', timestamp: '2024-06-14T14:15:00Z', side: 'SELL', price: 5241.04, contracts: 1, commissions: 2.50, type: 'EXIT' },

      // June 17
      { id: 'exec-j10-1', tradeId: 'trade-j10', timestamp: '2024-06-17T09:35:00Z', side: 'SELL', price: 18600.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j10-2', tradeId: 'trade-j10', timestamp: '2024-06-17T09:40:00Z', side: 'BUY', price: 18614.16, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j11-1', tradeId: 'trade-j11', timestamp: '2024-06-17T13:42:00Z', side: 'SELL', price: 18600.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j11-2', tradeId: 'trade-j11', timestamp: '2024-06-17T13:46:00Z', side: 'BUY', price: 18612.26, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j12-1', tradeId: 'trade-j12', timestamp: '2024-06-17T14:20:00Z', side: 'SELL', price: 18600.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j12-2', tradeId: 'trade-j12', timestamp: '2024-06-17T14:24:00Z', side: 'BUY', price: 18612.26, contracts: 1, commissions: 2.40, type: 'EXIT' },

      // June 18
      { id: 'exec-j13-1', tradeId: 'trade-j13', timestamp: '2024-06-18T10:15:00Z', side: 'BUY', price: 5300.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j13-2', tradeId: 'trade-j13', timestamp: '2024-06-18T10:35:00Z', side: 'SELL', price: 5310.10, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-j14-1', tradeId: 'trade-j14', timestamp: '2024-06-18T14:02:00Z', side: 'BUY', price: 5300.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j14-2', tradeId: 'trade-j14', timestamp: '2024-06-18T14:15:00Z', side: 'SELL', price: 5307.60, contracts: 1, commissions: 2.50, type: 'EXIT' },

      // June 19
      { id: 'exec-j15-1', tradeId: 'trade-j15', timestamp: '2024-06-19T10:05:00Z', side: 'BUY', price: 2360.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j15-2', tradeId: 'trade-j15', timestamp: '2024-06-19T10:30:00Z', side: 'SELL', price: 2366.13, contracts: 1, commissions: 2.50, type: 'EXIT' },

      // June 20
      { id: 'exec-j16-1', tradeId: 'trade-j16', timestamp: '2024-06-20T09:35:00Z', side: 'BUY', price: 18700.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j16-2', tradeId: 'trade-j16', timestamp: '2024-06-20T09:42:00Z', side: 'SELL', price: 18750.24, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j17-1', tradeId: 'trade-j17', timestamp: '2024-06-20T10:15:00Z', side: 'BUY', price: 18700.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j17-2', tradeId: 'trade-j17', timestamp: '2024-06-20T10:25:00Z', side: 'SELL', price: 18739.24, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j18-1', tradeId: 'trade-j18', timestamp: '2024-06-20T13:40:00Z', side: 'BUY', price: 18700.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j18-2', tradeId: 'trade-j18', timestamp: '2024-06-20T13:45:00Z', side: 'SELL', price: 18689.76, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j19-1', tradeId: 'trade-j19', timestamp: '2024-06-20T14:05:00Z', side: 'BUY', price: 18700.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j19-2', tradeId: 'trade-j19', timestamp: '2024-06-20T14:10:00Z', side: 'SELL', price: 18689.76, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j20-1', tradeId: 'trade-j20', timestamp: '2024-06-20T14:30:00Z', side: 'BUY', price: 18700.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j20-2', tradeId: 'trade-j20', timestamp: '2024-06-20T14:35:00Z', side: 'SELL', price: 18689.76, contracts: 1, commissions: 2.40, type: 'EXIT' },

      // June 21
      { id: 'exec-j21-1', tradeId: 'trade-j21', timestamp: '2024-06-21T14:10:00Z', side: 'BUY', price: 80.00, contracts: 1, commissions: 5.00, type: 'ENTRY' },
      { id: 'exec-j21-2', tradeId: 'trade-j21', timestamp: '2024-06-21T14:25:00Z', side: 'SELL', price: 80.423, contracts: 1, commissions: 5.00, type: 'EXIT' },

      { id: 'exec-j22-1', tradeId: 'trade-j22', timestamp: '2024-06-21T15:02:00Z', side: 'BUY', price: 80.00, contracts: 1, commissions: 5.00, type: 'ENTRY' },
      { id: 'exec-j22-2', tradeId: 'trade-j22', timestamp: '2024-06-21T15:15:00Z', side: 'SELL', price: 79.71, contracts: 1, commissions: 5.00, type: 'EXIT' },

      // June 24
      { id: 'exec-j23-1', tradeId: 'trade-j23', timestamp: '2024-06-24T09:35:00Z', side: 'BUY', price: 18800.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j23-2', tradeId: 'trade-j23', timestamp: '2024-06-24T09:50:00Z', side: 'SELL', price: 18841.49, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j24-1', tradeId: 'trade-j24', timestamp: '2024-06-24T13:42:00Z', side: 'BUY', price: 18800.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j24-2', tradeId: 'trade-j24', timestamp: '2024-06-24T13:47:00Z', side: 'SELL', price: 18784.76, contracts: 1, commissions: 2.40, type: 'EXIT' },

      { id: 'exec-j25-1', tradeId: 'trade-j25', timestamp: '2024-06-24T14:15:00Z', side: 'BUY', price: 18800.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j25-2', tradeId: 'trade-j25', timestamp: '2024-06-24T14:20:00Z', side: 'SELL', price: 18784.76, contracts: 1, commissions: 2.40, type: 'EXIT' },

      // June 25
      { id: 'exec-j26-1', tradeId: 'trade-j26', timestamp: '2024-06-25T10:15:00Z', side: 'BUY', price: 5350.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j26-2', tradeId: 'trade-j26', timestamp: '2024-06-25T10:35:00Z', side: 'SELL', price: 5368.10, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-j27-1', tradeId: 'trade-j27', timestamp: '2024-06-25T13:50:00Z', side: 'BUY', price: 5350.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j27-2', tradeId: 'trade-j27', timestamp: '2024-06-25T13:55:00Z', side: 'SELL', price: 5343.90, contracts: 1, commissions: 2.50, type: 'EXIT' },

      { id: 'exec-j28-1', tradeId: 'trade-j28', timestamp: '2024-06-25T14:10:00Z', side: 'BUY', price: 5350.00, contracts: 1, commissions: 2.50, type: 'ENTRY' },
      { id: 'exec-j28-2', tradeId: 'trade-j28', timestamp: '2024-06-25T14:15:00Z', side: 'SELL', price: 5343.90, contracts: 1, commissions: 2.50, type: 'EXIT' },

      // June 26
      { id: 'exec-j29-1', tradeId: 'trade-j29', timestamp: '2024-06-26T10:30:00Z', side: 'SELL', price: 18900.00, contracts: 1, commissions: 2.40, type: 'ENTRY' },
      { id: 'exec-j29-2', tradeId: 'trade-j29', timestamp: '2024-06-26T10:45:00Z', side: 'BUY', price: 18901.635, contracts: 1, commissions: 2.40, type: 'EXIT' }
    ];

    await db.accounts.bulkAdd(mockAccounts);
    await db.trades.bulkAdd(mockTrades);
    await db.executions.bulkAdd(mockExecutions);

    // Seed initial copy trading groups
    const mockGroups = [
      {
        id: 'group-fundeds',
        name: 'Fundeds',
        leaderAccountId: 'acc-mock-5',
        followerAccountIds: ['acc-mock-1', 'acc-mock-4']
      },
      {
        id: 'group-evals',
        name: 'Evals',
        leaderAccountId: 'acc-mock-2',
        followerAccountIds: ['acc-mock-3']
      }
    ];
    await db.groups.bulkAdd(mockGroups);

    console.log('Seeded accounts, trades, executions, and groups.');
  }
  } finally {
    isSyncingFromCloud = false;
  }

  console.log('Seed check complete.');
}

// Force re-seed database with clean example trades and accounts
export async function forceSeedDatabase() {
  try {
    isSyncingFromCloud = true;
    await db.accounts.clear();
    await db.trades.clear();
    await db.executions.clear();
    await db.dailyJournals.clear();
    await db.weeklyPlanners.clear();
    await db.groups.clear();
    
    // Pass true to force seeding even though counts are 0
    await seedDatabaseIfEmpty();
    return true;
  } catch (err) {
    console.error('Failed to force seed database:', err);
    throw err;
  } finally {
    isSyncingFromCloud = false;
  }
}

// Completely clear IndexedDB tables on logout
export async function clearDatabase() {
  try {
    isSyncingFromCloud = true;
    await db.accounts.clear();
    await db.trades.clear();
    await db.executions.clear();
    await db.dailyJournals.clear();
    await db.weeklyPlanners.clear();
    await db.groups.clear();
    if (db.workouts) await db.workouts.clear();
    return true;
  } catch (err) {
    console.error('Failed to clear local database:', err);
    throw err;
  } finally {
    isSyncingFromCloud = false;
  }
}
