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
      checkedPrepIds,
      checkedDailyGoalIds,
      customDailyGoalsList,
      ...rest
    } = obj;

    const meta = {};
    if (obj.structure !== undefined) meta.structure = obj.structure;
    if (obj.preMarketNotesFormat !== undefined) meta.preMarketNotesFormat = obj.preMarketNotesFormat;
    if (obj.preMarketNotesList !== undefined) meta.preMarketNotesList = obj.preMarketNotesList;
    if (obj.postMarketNotesFormat !== undefined) meta.postMarketNotesFormat = obj.postMarketNotesFormat;
    if (obj.postMarketNotesList !== undefined) meta.postMarketNotesList = obj.postMarketNotesList;
    if (obj.overallBias !== undefined) meta.overallBias = obj.overallBias;
    if (obj.checkedPrepIds !== undefined) meta.checkedPrepIds = obj.checkedPrepIds;
    if (obj.checkedDailyGoalIds !== undefined) meta.checkedDailyGoalIds = obj.checkedDailyGoalIds;
    if (obj.customDailyGoalsList !== undefined) meta.customDailyGoalsList = obj.customDailyGoalsList;

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
  if (tableName === 'workouts') {
    const allowed = ['id', 'date', 'type', 'duration', 'notes', 'exercises', 'user_id', 'focusrating'];
    const cleaned = {};
    allowed.forEach(k => {
      if (obj[k] !== undefined) cleaned[k] = obj[k];
    });
    if (obj.focusRating !== undefined) {
      cleaned.focusrating = obj.focusRating;
    }
    // exercises is a complex nested object — serialize to JSON string for Supabase TEXT column
    if (cleaned.exercises !== undefined && typeof cleaned.exercises !== 'string') {
      cleaned.exercises = JSON.stringify(cleaned.exercises);
    }
    return cleaned;
  }
  if (tableName === 'workoutPlans') {
    const allowed = ['id', 'name', 'exercises', 'user_id'];
    const cleaned = {};
    allowed.forEach(k => {
      if (obj[k] !== undefined) cleaned[k] = obj[k];
    });
    if (cleaned.exercises !== undefined && typeof cleaned.exercises !== 'string') {
      cleaned.exercises = JSON.stringify(cleaned.exercises);
    }
    return cleaned;
  }
  if (tableName === 'executions') {
    const allowed = [
      'id', 'tradeId', 'timestamp', 'side', 'price', 'contracts', 'commissions', 'type', 'user_id', 'created_at'
    ];

    let isoTs = new Date().toISOString();
    if (obj.timestamp) {
      const d = new Date(Number(obj.timestamp) || obj.timestamp);
      if (!isNaN(d.getTime())) isoTs = d.toISOString();
    } else if (obj.date) {
      const d = new Date(obj.date);
      if (!isNaN(d.getTime())) isoTs = d.toISOString();
    }

    const sideVal = (obj.bias || '').toUpperCase() === 'SHORT' ? 'SELL' : 'BUY';

    // Pack all other local-only properties into id using __HOLLOW_META__
    const meta = {};
    const metaKeys = [
      'rr', 'wl', 'rating', 'model', 'dol', 'entryTf', 'session', 'bias', 'symbol', 'date',
      'po3Times', 'notes', 'executionTime', 'outcomeTimeStart', 'outcomeTimeEnd', 'emotion',
      'psychTags', 'ltfImages', 'mtfImages', 'htfImages', 'outcomeImages', 'day', 'month', 'sl', 'tp'
    ];
    metaKeys.forEach(k => {
      if (obj[k] !== undefined) meta[k] = obj[k];
    });

    const serializedMeta = JSON.stringify(meta);
    const suffix = `\n\n__HOLLOW_META__:${serializedMeta}`;

    const cleaned = {
      ...obj,
      id: obj.id ? (obj.id.split('\n\n__HOLLOW_META__:')[0] + suffix) : obj.id,
      timestamp: isoTs,
      side: sideVal,
      type: 'ENTRY', // Strictly 'ENTRY' to satisfy check constraint executions_type_check!
      price: parseFloat(obj.tp) || 0,
      contracts: 1,
      commissions: 0
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
    { name: 'dailyJournals', store: db.dailyJournals, pk: 'date' },
    { name: 'weeklyPlanners', store: db.weeklyPlanners, pk: 'weekId' },
    { name: 'workouts', store: db.workouts, pk: 'id' },
    { name: 'workoutPlans', store: db.workoutPlans, pk: 'id' },
    { name: 'executions', store: db.executions, pk: 'id' }
  ];

  tables.forEach(table => {
    table.store.hook('creating', (primKey, obj, transaction) => {
      if (isSyncingFromCloud) return;
      obj.syncedToCloud = false;
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
      mods.syncedToCloud = false;
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
      if (isSyncingFromCloud) return;

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

db.version(6).stores({
  accounts: 'id, name, type',
  trades: 'id, accountId, symbol, model, bias, status, date',
  executions: 'id, tradeId, timestamp, side',
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status',
  groups: 'id, name, leaderAccountId',
  workouts: 'id, date, type',
  workoutPlans: 'id, name'
});

// Version 7: Drop accounts, trades, executions, groups for fresh application reboot
db.version(7).stores({
  accounts: null,
  trades: null,
  executions: null,
  groups: null,
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status',
  workouts: 'id, date, type',
  workoutPlans: 'id, name'
});

// Version 8: Multi-step Execution tracking table
db.version(8).stores({
  dailyJournals: 'date, status',
  weeklyPlanners: 'weekId, status',
  workouts: 'id, date, type',
  workoutPlans: 'id, name',
  executions: 'id, date, symbol, model, bias, wl, rating, timestamp'
});

// Activate hooks
registerSyncHooks();

// Clean orphaned records locally before sync
export async function cleanOrphanedRecordsLocal() {
  // No-op for current schema
}

// Helper to prefix IDs and foreign keys with user_id
export function prefixRecord(obj, userId, tableName) {
  if (!obj || !userId) return obj;
  const prefixed = { ...obj };
  
  if (tableName === 'dailyJournals') {
    if (prefixed.date && !prefixed.date.startsWith(userId + ':')) {
      prefixed.date = `${userId}:${prefixed.date}`;
    }
  } else if (tableName === 'weeklyPlanners') {
    if (prefixed.weekId && !prefixed.weekId.startsWith(userId + ':')) {
      prefixed.weekId = `${userId}:${prefixed.weekId}`;
    }
  } else if (tableName === 'workouts' || tableName === 'workoutPlans' || tableName === 'executions') {
    if (prefixed.id && !prefixed.id.startsWith(userId + ':')) {
      prefixed.id = `${userId}:${prefixed.id}`;
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

  if (tableName === 'dailyJournals') {
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
  } else if (tableName === 'trades') {
    clean.id = strip(clean.id);
    if (clean.accountId) clean.accountId = strip(clean.accountId);

    // Unpack metadata from commentFazit if present
    if (clean.commentFazit && typeof clean.commentFazit === 'string') {
      const parts = clean.commentFazit.split('\n\n__HOLLOW_META__:');
      if (parts.length > 1) {
        const originalFazit = parts[0];
        const serializedMeta = parts[parts.length - 1];
        try {
          const meta = JSON.parse(serializedMeta);
          Object.assign(clean, meta);
        } catch (e) {
          console.error("Failed to parse hollow trades metadata:", e);
        }
        clean.commentFazit = originalFazit;
      }
    }
  } else if (tableName === 'executions') {
    if (clean.tradeId) clean.tradeId = strip(clean.tradeId);

    // Unpack metadata from id column if present
    if (clean.id && typeof clean.id === 'string') {
      const parts = clean.id.split('\n\n__HOLLOW_META__:');
      if (parts.length > 1) {
        const prefixedOriginalId = parts[0];
        const serializedMeta = parts[parts.length - 1];
        try {
          const meta = JSON.parse(serializedMeta);
          Object.assign(clean, meta);
        } catch (e) {
          console.error("Failed to parse hollow executions metadata from ID:", e);
        }
        clean.id = strip(prefixedOriginalId);
      } else {
        clean.id = strip(clean.id);
      }
    }
  } else if (tableName === 'workouts' || tableName === 'workoutPlans') {
    clean.id = strip(clean.id);
    if (tableName === 'workouts' && clean.focusrating !== undefined) {
      clean.focusRating = clean.focusrating;
      delete clean.focusrating;
    }
    // exercises is stored as JSON string in Supabase — parse back to object
    if (clean.exercises && typeof clean.exercises === 'string') {
      try {
        clean.exercises = JSON.parse(clean.exercises);
      } catch (e) {
        console.error(`Failed to parse exercises JSON for ${tableName}:`, e);
      }
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
    console.log('Starting Supabase parallel sync check with user isolation...');
    
    // Disable hooks during initial synchronization to prevent cycles
    isSyncingFromCloud = true;
    
    const tables = [
      { name: 'dailyJournals', store: db.dailyJournals, pk: 'date' },
      { name: 'weeklyPlanners', store: db.weeklyPlanners, pk: 'weekId' },
      { name: 'workouts', store: db.workouts, pk: 'id' },
      { name: 'workoutPlans', store: db.workoutPlans, pk: 'id' },
      { name: 'executions', store: db.executions, pk: 'id' }
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
        
        let query = supabase.from(item.tableName).delete();
        if (item.tableName === 'executions') {
          query = query.like(pkName, `${prefixedKey}%`);
        } else {
          query = query.eq(pkName, prefixedKey);
        }
        
        const { error } = await query;
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
      const cleanRemoteData = remoteData.map(item => unprefixRecord(item, userId, table.name));

      if (remoteData.length > 0 && localData.length === 0) {
        const toPut = cleanRemoteData.map(item => ({ ...item, syncedToCloud: true }));
        await table.store.bulkPut(toPut);
        pulledCount++;
      } else if (localData.length > 0 && remoteData.length === 0) {
        const toDelete = localData.filter(item => item.syncedToCloud === true);
        if (toDelete.length > 0) {
          const idsToDelete = toDelete.map(item => item[table.pk]);
          await table.store.bulkDelete(idsToDelete);
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
        const remoteKeys = new Set(cleanRemoteData.map(r => r[table.pk]));
        const deletedOnRemote = localData.filter(item => item.syncedToCloud === true && !remoteKeys.has(item[table.pk]));
        if (deletedOnRemote.length > 0) {
          const idsToDelete = deletedOnRemote.map(item => item[table.pk]);
          await table.store.bulkDelete(idsToDelete);
        }

        for (const remoteItem of remoteData) {
          const cleanItem = unprefixRecord(remoteItem, userId, table.name);
          const localItem = await table.store.get(cleanItem[table.pk]);

          const pendingStr = localStorage.getItem('hollow_pending_deletions') || '[]';
          let isPendingDelete = false;
          try {
            const pending = JSON.parse(pendingStr);
            isPendingDelete = pending.some(p => p.tableName === table.name && p.id === cleanItem[table.pk]);
          } catch (e) {}
          
          if (isPendingDelete) continue;

          if (localItem) {
            const merged = { ...localItem, ...cleanItem, syncedToCloud: true };
            await table.store.put(merged);
          } else {
            await table.store.put({ ...cleanItem, syncedToCloud: true });
          }
        }

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

// Seed helper function
export async function seedDatabaseIfEmpty() {
  console.log('Seeding check: database seeding is disabled for a clean fresh start.');
}

// Wipes local Dexie database and remote Supabase tables for the current session user
export async function clearDatabaseAndCloud() {
  try {
    isSyncingFromCloud = true;

    // 1. Clear local IndexedDB tables
    if (db.dailyJournals) await db.dailyJournals.clear();
    if (db.weeklyPlanners) await db.weeklyPlanners.clear();
    if (db.workouts) await db.workouts.clear();
    if (db.workoutPlans) await db.workoutPlans.clear();

    // Clear local localStorage settings starting with 'hollow' or 'playbook' to ensure fresh stats
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('hollow') || key.startsWith('playbook')) {
        localStorage.removeItem(key);
      }
    });

    // 2. Clear remote Supabase tables (including legacy trading tables if they exist in Supabase)
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const tables = [
          { name: 'executions', pk: 'id' },
          { name: 'trades', pk: 'id' },
          { name: 'groups', pk: 'id' },
          { name: 'accounts', pk: 'id' },
          { name: 'dailyJournals', pk: 'date' },
          { name: 'weeklyPlanners', pk: 'weekId' },
          { name: 'workouts', pk: 'id' },
          { name: 'workoutPlans', pk: 'id' }
        ];

        const userId = session.user.id;
        for (const table of tables) {
          try {
            const { data } = await supabase
              .from(table.name)
              .select(table.pk)
              .like(table.pk, `${userId}:%`);
            if (data && data.length > 0) {
              const ids = data.map(row => row[table.pk]);
              await supabase.from(table.name).delete().in(table.pk, ids);
            }
          } catch (e) {
            console.error(`Error deleting remote data for ${table.name}:`, e);
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
    if (db.dailyJournals) await db.dailyJournals.clear();
    if (db.weeklyPlanners) await db.weeklyPlanners.clear();
    if (db.workouts) await db.workouts.clear();
    if (db.workoutPlans) await db.workoutPlans.clear();
    return true;
  } catch (err) {
    console.error('Failed to clear local database:', err);
    throw err;
  } finally {
    isSyncingFromCloud = false;
  }
}

// Real-time cross-device sync via Supabase Postgres changes
export async function subscribeToRealtimeSync() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return () => {};

  const userId = session.user.id;

  const tableMap = [
    { name: 'dailyJournals', store: db.dailyJournals, pk: 'date' },
    { name: 'weeklyPlanners',store: db.weeklyPlanners,pk: 'weekId' },
    { name: 'workouts',      store: db.workouts,      pk: 'id' },
    { name: 'workoutPlans',  store: db.workoutPlans,  pk: 'id' },
    { name: 'executions',    store: db.executions,    pk: 'id' }
  ];

  console.log(`Subscribing to realtime sync channel for user: ${userId}`);

  const channel = supabase
    .channel(`hollow-realtime-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
      const tableMeta = tableMap.find(t => t.name.toLowerCase() === payload.table.toLowerCase());
      if (!tableMeta) return;

      const record = payload.new || payload.old;
      if (!record) return;
      const pkValue = record[tableMeta.pk];
      if (!pkValue || !String(pkValue).startsWith(userId + ':')) return;

      const prev = isSyncingFromCloud;
      isSyncingFromCloud = true;

      try {
        if (payload.eventType === 'DELETE') {
          const cleanPk = String(pkValue).substring(userId.length + 1);
          await tableMeta.store.delete(cleanPk);
        } else {
          const cleanRecord = unprefixRecord(record, userId, tableMeta.name);
          cleanRecord.syncedToCloud = true;
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

// Payouts DB Helpers
export async function getPayouts() {
  const row = await db.dailyJournals.get('payouts-data');
  if (!row || !row.postMarketNotes) return [];
  try {
    return JSON.parse(row.postMarketNotes);
  } catch (e) {
    console.error("Failed to parse payouts:", e);
    return [];
  }
}

export async function savePayouts(payouts) {
  await db.dailyJournals.put({
    date: 'payouts-data',
    status: 'COMPLETED',
    postMarketNotes: JSON.stringify(payouts)
  });
}

