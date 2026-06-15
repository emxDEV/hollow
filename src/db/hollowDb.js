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

        for (const table of tables) {
          const { data, error: selectError } = await supabase.from(table.name).select(table.pk);
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
