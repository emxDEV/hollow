import Dexie from 'dexie';
import { supabase } from './supabaseClient';
import { showToast } from '../utils/toast';

export const db = new Dexie('HollowDatabase');

let isSyncingFromCloud = false;

// Sanitizes objects to prevent Supabase sync errors due to local-only properties
function sanitizeForSupabase(tableName, obj) {
  if (!obj) return obj;
  const { syncedToCloud, ...cleanObj } = obj;
  return sanitizeForSupabaseRaw(tableName, cleanObj);
}

function sanitizeForSupabaseRaw(tableName, obj) {
  if (!obj) return obj;
  if (tableName === 'accounts') {
    const allowed = [
      'id', 'name', 'type', 'balance', 'capital', 'profitTarget', 'maxLoss', 
      'propFirm', 'payoutGoal', 'drawdownType', 'drawdownLimit', 'maxDailyLoss', 
      'minTradingDays', 'evaluationStatus', 'user_id'
    ];
    const cleaned = {};
    allowed.forEach(k => {
      if (obj[k] !== undefined) cleaned[k] = obj[k];
    });
    return cleaned;
  }
  if (tableName === 'weeklyPlanners') {
    const allowed = ['weekId', 'startDate', 'endDate', 'status', 'goals', 'priorities', 'reviewNotes', 'user_id'];
    const cleaned = {};
    allowed.forEach(k => {
      if (obj[k] !== undefined) cleaned[k] = obj[k];
    });
    return cleaned;
  }
  if (tableName === 'trades') {
    // Exclude local-only properties not in Supabase schema, but pack them into commentFazit
    const {
      dol, po3, po3Time, entryTf, rr, sl, tp, manualPnL, wl, rating, problems, problemInput, session,
      commentExecution, commentFazit,
      ...rest
    } = obj;

    const meta = {};
    const metaKeys = ['dol', 'po3', 'po3Time', 'entryTf', 'rr', 'sl', 'tp', 'manualPnL', 'wl', 'rating', 'problems', 'problemInput', 'session'];
    metaKeys.forEach(k => {
      if (obj[k] !== undefined) meta[k] = obj[k];
    });

    // Strip any pre-existing __HOLLOW_META__ section from commentFazit before appending
    // This prevents stale meta from accumulating after each edit/sync cycle
    const rawFazit = commentFazit || '';
    const cleanFazit = rawFazit.split('\n\n__HOLLOW_META__:')[0];
    const serializedMeta = JSON.stringify(meta);
    const updatedFazit = `${cleanFazit}\n\n__HOLLOW_META__:${serializedMeta}`;

    return {
      ...rest,
      commentExecution: commentExecution || '',
      commentFazit: updatedFazit
    };
  }
  if (tableName === 'dailyJournals') {
    const allowed = [
      'date', 'status', 'newsChecked', 'htfAnalysisDone', 'liquidityDrawn', 
      'dailyOpenMapped', 'mentalFocus', 'patienceLevel', 'riskAdherence', 
      'sleepHours', 'sleepQuality', 'workoutDone', 'dietClean', 'meditationDone', 
      'screenTimeHours', 'homeworkDone', 'preMarketNotes', 'postMarketNotes', 'user_id'
    ];
    
    // Exclude local-only properties, pack them into postMarketNotes
    const {
      structure,
      preMarketNotesFormat,
      preMarketNotesList,
      postMarketNotesFormat,
      postMarketNotesList,
      overallBias,
      ...rest
    } = obj;

    const meta = {};
    if (obj.structure !== undefined) meta.structure = obj.structure;
    if (obj.preMarketNotesFormat !== undefined) meta.preMarketNotesFormat = obj.preMarketNotesFormat;
    if (obj.preMarketNotesList !== undefined) meta.preMarketNotesList = obj.preMarketNotesList;
    if (obj.postMarketNotesFormat !== undefined) meta.postMarketNotesFormat = obj.postMarketNotesFormat;
    if (obj.postMarketNotesList !== undefined) meta.postMarketNotesList = obj.postMarketNotesList;
    if (obj.overallBias !== undefined) meta.overallBias = obj.overallBias;

    const rawNotes = obj.postMarketNotes || '';
    const cleanNotes = rawNotes.split('\n\n__HOLLOW_META__:')[0];
    let updatedNotes = cleanNotes;
    
    if (Object.keys(meta).length > 0) {
      const serializedMeta = JSON.stringify(meta);
      updatedNotes = `${cleanNotes}\n\n__HOLLOW_META__:${serializedMeta}`;
    }

    const cleaned = {
      ...rest,
      postMarketNotes: updatedNotes
    };

    const finalObj = {};
    allowed.forEach(k => {
      if (cleaned[k] !== undefined) finalObj[k] = cleaned[k];
    });
    return finalObj;
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
        const prefixed = prefixRecord(sanitized, session.user.id, table.name);
        const { error } = await supabase.from(table.name).upsert(prefixed);
        if (error) {
          console.error(`Supabase sync error on creating in ${table.name}:`, error);
          showToast(`Supabase sync fail: ${error.message}`, 'error');
        } else {
          // Success! Mark synced locally
          const current = await table.store.get(primKey);
          if (current && !current.syncedToCloud) {
            const prev = isSyncingFromCloud;
            isSyncingFromCloud = true;
            await table.store.put({ ...current, syncedToCloud: true });
            isSyncingFromCloud = prev;
          }
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
        const prefixed = prefixRecord(sanitized, session.user.id, table.name);
        const { error } = await supabase.from(table.name).upsert(prefixed);
        if (error) {
          console.error(`Supabase sync error on updating in ${table.name}:`, error);
          showToast(`Supabase sync fail: ${error.message}`, 'error');
        } else {
          // Success! Mark synced locally
          const current = await table.store.get(primKey);
          if (current && !current.syncedToCloud) {
            const prev = isSyncingFromCloud;
            isSyncingFromCloud = true;
            await table.store.put({ ...current, syncedToCloud: true });
            isSyncingFromCloud = prev;
          }
        }
      });
    });

    table.store.hook('deleting', (primKey, obj, transaction) => {
      // Track deletion in pending deletions list
      const pendingStr = localStorage.getItem('hollow_pending_deletions') || '[]';
      try {
        const pending = JSON.parse(pendingStr);
        if (!pending.some(p => p.tableName === table.name && p.id === primKey)) {
          pending.push({ tableName: table.name, id: primKey });
          localStorage.setItem('hollow_pending_deletions', JSON.stringify(pending));
        }
      } catch (e) {
        console.error(e);
      }

      if (isSyncingFromCloud) return;
      enqueueSync(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const prefixedKey = `${session.user.id}:${primKey}`;
        const { error } = await supabase.from(table.name).delete().eq(table.pk, prefixedKey);
        if (error) {
          console.error(`Supabase sync error on deleting in ${table.name}:`, error);
          showToast(`Supabase sync fail: ${error.message}`, 'error');
        } else {
          // Remove from pending deletions
          const pendingStr2 = localStorage.getItem('hollow_pending_deletions') || '[]';
          try {
            const pending2 = JSON.parse(pendingStr2);
            const filtered = pending2.filter(p => !(p.tableName === table.name && p.id === primKey));
            localStorage.setItem('hollow_pending_deletions', JSON.stringify(filtered));
          } catch (e) {}
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

// Helper to prefix IDs and foreign keys with user_id
export function prefixRecord(obj, userId, tableName) {
  if (!obj || !userId) return obj;
  const prefixed = { ...obj };
  
  if (tableName === 'accounts') {
    if (prefixed.id && !prefixed.id.startsWith(userId + ':')) {
      prefixed.id = `${userId}:${prefixed.id}`;
    }
  } else if (tableName === 'trades') {
    if (prefixed.id && !prefixed.id.startsWith(userId + ':')) {
      prefixed.id = `${userId}:${prefixed.id}`;
    }
    if (prefixed.accountId && !prefixed.accountId.startsWith(userId + ':')) {
      prefixed.accountId = `${userId}:${prefixed.accountId}`;
    }
  } else if (tableName === 'executions') {
    if (prefixed.id && !prefixed.id.startsWith(userId + ':')) {
      prefixed.id = `${userId}:${prefixed.id}`;
    }
    if (prefixed.tradeId && !prefixed.tradeId.startsWith(userId + ':')) {
      prefixed.tradeId = `${userId}:${prefixed.tradeId}`;
    }
  } else if (tableName === 'dailyJournals') {
    if (prefixed.date && !prefixed.date.startsWith(userId + ':')) {
      prefixed.date = `${userId}:${prefixed.date}`;
    }
  } else if (tableName === 'weeklyPlanners') {
    if (prefixed.weekId && !prefixed.weekId.startsWith(userId + ':')) {
      prefixed.weekId = `${userId}:${prefixed.weekId}`;
    }
  } else if (tableName === 'groups') {
    if (prefixed.id && !prefixed.id.startsWith(userId + ':')) {
      prefixed.id = `${userId}:${prefixed.id}`;
    }
    if (prefixed.leaderAccountId && !prefixed.leaderAccountId.startsWith(userId + ':')) {
      prefixed.leaderAccountId = `${userId}:${prefixed.leaderAccountId}`;
    }
    if (Array.isArray(prefixed.followerAccountIds)) {
      prefixed.followerAccountIds = prefixed.followerAccountIds.map(id => 
        id && !id.startsWith(userId + ':') ? `${userId}:${id}` : id
      );
    } else if (typeof prefixed.followerAccountIds === 'string') {
      try {
        const parsed = JSON.parse(prefixed.followerAccountIds);
        if (Array.isArray(parsed)) {
          prefixed.followerAccountIds = JSON.stringify(parsed.map(id => 
            id && !id.startsWith(userId + ':') ? `${userId}:${id}` : id
          ));
        }
      } catch (e) {}
    }
  }
  
  return prefixed;
}

// Helper to remove user_id prefix from IDs and foreign keys
export function unprefixRecord(obj, userId, tableName) {
  if (!obj || !userId) return obj;
  const clean = { ...obj };
  const prefix = userId + ':';
  
  const strip = (str) => {
    if (str && typeof str === 'string' && str.startsWith(prefix)) {
      return str.substring(prefix.length);
    }
    return str;
  };

  if (tableName === 'accounts') {
    clean.id = strip(clean.id);
  } else if (tableName === 'trades') {
    clean.id = strip(clean.id);
    clean.accountId = strip(clean.accountId);
    
    // Unpack metadata from commentFazit if present
    if (clean.commentFazit && typeof clean.commentFazit === 'string') {
      const parts = clean.commentFazit.split('\n\n__HOLLOW_META__:');
      if (parts.length > 1) {
        const originalFazit = parts[0];
        // Use the LAST part — it is the most recently written meta (guards against legacy accumulation)
        const serializedMeta = parts[parts.length - 1];
        try {
          const meta = JSON.parse(serializedMeta);
          Object.assign(clean, meta);
        } catch (e) {
          console.error("Failed to parse hollow metadata:", e);
        }
        clean.commentFazit = originalFazit;
      }
    }
  } else if (tableName === 'executions') {
    clean.id = strip(clean.id);
    clean.tradeId = strip(clean.tradeId);
  } else if (tableName === 'dailyJournals') {
    clean.date = strip(clean.date);
    
    // Unpack metadata from postMarketNotes if present
    if (clean.postMarketNotes && typeof clean.postMarketNotes === 'string') {
      const parts = clean.postMarketNotes.split('\n\n__HOLLOW_META__:');
      if (parts.length > 1) {
        const originalNotes = parts[0];
        const serializedMeta = parts[parts.length - 1];
        try {
          const meta = JSON.parse(serializedMeta);
          Object.assign(clean, meta);
        } catch (e) {
          console.error("Failed to parse hollow dailyJournal metadata:", e);
        }
        clean.postMarketNotes = originalNotes;
      }
    }
  } else if (tableName === 'weeklyPlanners') {
    clean.weekId = strip(clean.weekId);
  } else if (tableName === 'groups') {
    clean.id = strip(clean.id);
    clean.leaderAccountId = strip(clean.leaderAccountId);
    if (Array.isArray(clean.followerAccountIds)) {
      clean.followerAccountIds = clean.followerAccountIds.map(strip);
    } else if (typeof clean.followerAccountIds === 'string') {
      try {
        const parsed = JSON.parse(clean.followerAccountIds);
        if (Array.isArray(parsed)) {
          clean.followerAccountIds = JSON.stringify(parsed.map(strip));
        }
      } catch (e) {}
    }
  }
  
  return clean;
}

// Helper to get PK key name for pending deletions
function getTablePk(tableName) {
  if (tableName === 'dailyJournals') return 'date';
  if (tableName === 'weeklyPlanners') return 'weekId';
  return 'id';
}

// Synchronization function
export async function syncWithSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("Supabase sync skipped: No active user session.");
      return;
    }
    const userId = session.user.id;
    await cleanOrphanedRecordsLocal();
    console.log('Starting Supabase parallel sync check with user isolation...');
    
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

    // 1. Process pending deletions from localStorage first
    const pendingStr = localStorage.getItem('hollow_pending_deletions') || '[]';
    let pendingDeletions = [];
    try {
      pendingDeletions = JSON.parse(pendingStr);
    } catch (e) {}

    if (pendingDeletions.length > 0) {
      const remainingDeletions = [];
      for (const item of pendingDeletions) {
        const prefixedKey = `${userId}:${item.id}`;
        const pkName = getTablePk(item.tableName);
        const { error } = await supabase.from(item.tableName).delete().eq(pkName, prefixedKey);
        if (error) {
          console.error(`Failed to sync pending deletion for ${item.tableName}:${item.id}`, error);
          remainingDeletions.push(item);
        }
      }
      localStorage.setItem('hollow_pending_deletions', JSON.stringify(remainingDeletions));
    }

    let pulledCount = 0;
    let pushedCount = 0;

    for (const table of tables) {
      const { data: remoteData, error } = await supabase
        .from(table.name)
        .select('*')
        .like(table.pk, `${userId}:%`);
      
      if (error) {
        console.error(`Failed to query table ${table.name} from Supabase:`, error);
        showToast(`Supabase Connect Error on ${table.name}: ${error.message}`, 'error');
        continue;
      }

      const localData = await table.store.toArray();
      const prefixedLocalData = localData.map(item => prefixRecord(sanitizeForSupabase(table.name, item), userId, table.name));
      const cleanRemoteData = remoteData.map(item => unprefixRecord(item, userId, table.name));

      if (remoteData.length > 0 && localData.length === 0) {
        // Pull data from Supabase to empty local database
        const toPut = cleanRemoteData.map(item => ({ ...item, syncedToCloud: true }));
        await table.store.bulkPut(toPut);
        pulledCount++;
      } else if (localData.length > 0 && remoteData.length === 0) {
        // If remote is empty, check if local records were previously synced.
        // If they were synced, it means they were deleted on remote.
        const toDelete = localData.filter(item => item.syncedToCloud === true);
        if (toDelete.length > 0) {
          const idsToDelete = toDelete.map(item => item[table.pk]);
          await table.store.bulkDelete(idsToDelete);
          console.log(`Cleaned up locally deleted records in empty remote for ${table.name}:`, idsToDelete);
        }

        const remainingLocal = await table.store.toArray();
        if (remainingLocal.length > 0) {
          const prefixedLocal = remainingLocal.map(item => prefixRecord(sanitizeForSupabase(table.name, item), userId, table.name));
          const { error: pushError } = await supabase.from(table.name).upsert(prefixedLocal);
          if (pushError) {
            console.error(`Failed to push table ${table.name} to empty Supabase:`, pushError);
            showToast(`Failed to upload ${table.name}: ${pushError.message}`, 'error');
          } else {
            const toUpdate = remainingLocal.map(item => ({ ...item, syncedToCloud: true }));
            await table.store.bulkPut(toUpdate);
            pushedCount++;
          }
        }
      } else if (localData.length > 0 && remoteData.length > 0) {
        // Bidirectional merge:
        
        // Step A: Detect and process records deleted on remote (missing in remote but marked synced locally)
        const remoteKeys = new Set(cleanRemoteData.map(r => r[table.pk]));
        const deletedOnRemote = localData.filter(item => item.syncedToCloud === true && !remoteKeys.has(item[table.pk]));
        if (deletedOnRemote.length > 0) {
          const idsToDelete = deletedOnRemote.map(item => item[table.pk]);
          await table.store.bulkDelete(idsToDelete);
          console.log(`Sync deleted locally (since removed from remote) in ${table.name}:`, idsToDelete);
        }

        // Step B: Pull/merge remote data into local
        for (const remoteItem of remoteData) {
          const cleanItem = unprefixRecord(remoteItem, userId, table.name);
          const localItem = await table.store.get(cleanItem[table.pk]);

          // Skip if this item was locally deleted and we haven't synced the delete yet
          const pendingStr = localStorage.getItem('hollow_pending_deletions') || '[]';
          let isPendingDelete = false;
          try {
            const pending = JSON.parse(pendingStr);
            isPendingDelete = pending.some(p => p.tableName === table.name && p.id === cleanItem[table.pk]);
          } catch (e) {}
          
          if (isPendingDelete) continue;

          if (localItem) {
            const merged = { ...localItem, ...cleanItem, syncedToCloud: true };
            // For trades: prefer whichever side has a non-empty manualPnL.
            // Remote wins if it has a value; local wins only if remote is empty.
            if (table.name === 'trades') {
              const localPnL = localItem.manualPnL;
              const remotePnL = cleanItem.manualPnL;
              const hasLocal = localPnL !== undefined && localPnL !== null && localPnL !== '';
              const hasRemote = remotePnL !== undefined && remotePnL !== null && remotePnL !== '';
              if (hasRemote) {
                merged.manualPnL = remotePnL;  // cloud wins when it has a real value
              } else if (hasLocal) {
                merged.manualPnL = localPnL;   // local wins when cloud has nothing
              }
            }
            await table.store.put(merged);
          } else {
            await table.store.put({ ...cleanItem, syncedToCloud: true });
          }
        }

        // Step C: Push local unsynced records to remote
        const currentLocal = await table.store.toArray();
        const unsyncedLocal = currentLocal.filter(item => !item.syncedToCloud);
        if (unsyncedLocal.length > 0) {
          const prefixedUnsynced = unsyncedLocal.map(item => prefixRecord(sanitizeForSupabase(table.name, item), userId, table.name));
          const { error: pushError } = await supabase.from(table.name).upsert(prefixedUnsynced);
          if (pushError) {
            console.error(`Failed to push unsynced items for ${table.name}:`, pushError);
          } else {
            const toUpdate = unsyncedLocal.map(item => ({ ...item, syncedToCloud: true }));
            await table.store.bulkPut(toUpdate);
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
  // Disabled to ensure a completely clean fresh start
  console.log('Seeding check: database seeding is disabled for a clean fresh start.');
}

// Wipes both local Dexie database and remote Supabase tables for the current session user
export async function clearDatabaseAndCloud() {
  try {
    isSyncingFromCloud = true;

    // 1. Clear local IndexedDB tables
    await db.accounts.clear();
    await db.trades.clear();
    await db.executions.clear();
    await db.dailyJournals.clear();
    await db.weeklyPlanners.clear();
    await db.groups.clear();
    if (db.workouts) await db.workouts.clear();

    // Clear local localStorage settings starting with 'hollow' or 'playbook' to ensure fresh stats
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('hollow') || key.startsWith('playbook')) {
        localStorage.removeItem(key);
      }
    });

    // 2. Clear remote Supabase tables if session exists
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Table deletion order respecting potential foreign key constraints:
        // executions -> trades -> groups -> accounts -> dailyJournals -> weeklyPlanners
        const tables = [
          { name: 'executions', pk: 'id' },
          { name: 'trades', pk: 'id' },
          { name: 'groups', pk: 'id' },
          { name: 'accounts', pk: 'id' },
          { name: 'dailyJournals', pk: 'date' },
          { name: 'weeklyPlanners', pk: 'weekId' }
        ];

        const userId = session.user.id;
        for (const table of tables) {
          const { data, error: selectError } = await supabase
            .from(table.name)
            .select(table.pk)
            .like(table.pk, `${userId}:%`);
          if (selectError) {
            console.error(`Failed to select from Supabase table ${table.name}:`, selectError);
            continue;
          }
          if (data && data.length > 0) {
            const ids = data.map(row => row[table.pk]);
            const { error: deleteError } = await supabase.from(table.name).delete().in(table.pk, ids);
            if (deleteError) {
              console.error(`Failed to delete from Supabase table ${table.name}:`, deleteError);
            }
          }
        }
      }
    }
    return true;
  } catch (err) {
    console.error('Failed to clear local and cloud database:', err);
    throw err;
  } finally {
    isSyncingFromCloud = false;
  }
}

// Force database reset
export async function forceSeedDatabase() {
  return await clearDatabaseAndCloud();
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

// Real-time cross-device sync via Supabase Postgres changes
// Returns an unsubscribe function to clean up when the session ends.
export async function subscribeToRealtimeSync() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return () => {};

  const userId = session.user.id;

  const tableMap = [
    { name: 'accounts',      store: db.accounts,      pk: 'id' },
    { name: 'trades',        store: db.trades,        pk: 'id' },
    { name: 'executions',    store: db.executions,    pk: 'id' },
    { name: 'dailyJournals', store: db.dailyJournals, pk: 'date' },
    { name: 'weeklyPlanners',store: db.weeklyPlanners,pk: 'weekId' },
    { name: 'groups',        store: db.groups,        pk: 'id' },
  ];

  const channel = supabase
    .channel(`hollow-realtime-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
      const tableMeta = tableMap.find(t => t.name === payload.table);
      if (!tableMeta) return;

      // Only process changes that belong to the current user
      const record = payload.new || payload.old;
      if (!record) return;
      const pkValue = record[tableMeta.pk];
      if (!pkValue || !String(pkValue).startsWith(userId + ':')) return;

      // Prevent sync hooks from pushing these local writes back to Supabase
      const prev = isSyncingFromCloud;
      isSyncingFromCloud = true;

      try {
        if (payload.eventType === 'DELETE') {
          const cleanPk = String(pkValue).substring(userId.length + 1);
          await tableMeta.store.delete(cleanPk);
        } else {
          // INSERT or UPDATE — unprefix and write locally
          const cleanRecord = unprefixRecord(record, userId, tableMeta.name);
          cleanRecord.syncedToCloud = true; // Mark as synced!
          // For trades: preserve non-empty manualPnL — never overwrite a real value with empty string from cloud
          if (tableMeta.name === 'trades') {
            const localItem = await tableMeta.store.get(cleanRecord[tableMeta.pk]);
            if (localItem) {
              const localPnL = localItem.manualPnL;
              const remotePnL = cleanRecord.manualPnL;
              const hasLocal = localPnL !== undefined && localPnL !== null && localPnL !== '';
              const hasRemote = remotePnL !== undefined && remotePnL !== null && remotePnL !== '';
              if (hasLocal && !hasRemote) {
                cleanRecord.manualPnL = localPnL;
              }
            }
          }
          await tableMeta.store.put(cleanRecord);
        }
      } catch (err) {
        console.error(`Realtime sync error on ${tableMeta.name}:`, err);
      } finally {
        isSyncingFromCloud = prev;
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
