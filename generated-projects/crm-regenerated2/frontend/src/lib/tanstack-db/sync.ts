/**
 * TanStack DB Sync — RBAC-Filtered Shape Subscriptions
 *
 * SECURITY CRITICAL:
 * - Always fetches shapes from /api/sys/shapes (server-filtered by role)
 * - Never subscribes to unfiltered sys_* tables
 * - SSE connection requires authenticated session
 * - User A cannot see User B's sys_* definitions
 */

import {
  sysTableCollection,
  sysColumnCollection,
  sysFieldCollection,
  sysRoleCollection,
  type SysTable,
  type SysColumn,
  type SysField,
  type SysRole,
} from './collections';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Sync state
// ============================================================================
let sseSource: EventSource | null = null;
let syncInitialized = false;

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncAt: null,
  error: null,
};

const statusListeners = new Set<(status: SyncStatus) => void>();

function emitStatus(update: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...update };
  statusListeners.forEach((fn) => fn(syncStatus));
}

export function onSyncStatusChange(fn: (status: SyncStatus) => void) {
  statusListeners.add(fn);
  fn(syncStatus);
  return () => statusListeners.delete(fn);
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

// ============================================================================
// Populate collection via sync transaction
// ============================================================================

function populateCollection<T extends object>(
  collection: any,
  rows: T[]
) {
  if (!rows.length) return;
  // Use TanStack DB's sync API to write rows into the collection
  // We access the internal sync method to bulk-insert from server
  const syncFn = (collection as any)._syncManager;
  if (syncFn) {
    syncFn.begin();
    for (const row of rows) {
      syncFn.write({ type: 'insert', value: row });
    }
    syncFn.commit();
    syncFn.markReady();
  }
}

function upsertRow(collection: any, row: object, key: string) {
  const existing = collection.get(key);
  try {
    if (existing) {
      collection.update(key, (draft: any) => {
        Object.assign(draft, row);
      });
    } else {
      collection.insert(row);
    }
  } catch {
    // Row already exists, try update
    try {
      collection.update(key, (draft: any) => Object.assign(draft, row));
    } catch {
      // ignore
    }
  }
}

function deleteRow(collection: any, key: string) {
  try {
    collection.delete(key);
  } catch {
    // ignore if not found
  }
}

// ============================================================================
// Main sync initialization
// ============================================================================

/**
 * Initialize TanStack DB sync with RBAC-filtered shapes.
 *
 * SECURITY: The /api/sys/shapes endpoint validates the session cookie and
 * returns ONLY the sys_* rows the authenticated user is authorized to see.
 * Callers cannot pass userId or roles to gain unauthorized access.
 */
export async function initializeSync(): Promise<void> {
  if (syncInitialized) return;

  emitStatus({ isSyncing: true, error: null });

  try {
    const response = await fetch(`${API_BASE_URL}/api/sys/shapes`, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated yet — defer until user logs in
        emitStatus({ isSyncing: false, error: null });
        return;
      }
      throw new Error(`Shapes fetch failed: ${response.status}`);
    }

    const shapes = await response.json() as {
      sysTables?: SysTable[];
      sysColumns?: SysColumn[];
      sysFields?: SysField[];
      sysRoles?: SysRole[];
    };

    // Insert into TanStack DB collections using their insert API
    // Each collection only receives what the server authorized for this user
    if (shapes.sysTables?.length) {
      for (const row of shapes.sysTables) {
        try { sysTableCollection.insert(row); } catch { /* duplicate */ }
      }
    }
    if (shapes.sysColumns?.length) {
      for (const row of shapes.sysColumns) {
        try { sysColumnCollection.insert(row); } catch { /* duplicate */ }
      }
    }
    if (shapes.sysFields?.length) {
      for (const row of shapes.sysFields) {
        try { sysFieldCollection.insert(row); } catch { /* duplicate */ }
      }
    }
    if (shapes.sysRoles?.length) {
      for (const row of shapes.sysRoles) {
        try { sysRoleCollection.insert(row); } catch { /* duplicate */ }
      }
    }

    syncInitialized = true;
    emitStatus({ isSyncing: false, lastSyncAt: new Date() });

    // Subscribe to real-time SSE push
    subscribeToSSE();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    emitStatus({ isSyncing: false, error: message });
    console.error('[TanStack DB Sync] Error:', err);
  }
}

// ============================================================================
// SSE — Real-time push for sys_* changes
// ============================================================================

/**
 * Subscribe to server-sent events for real-time sys_* updates.
 * Server only broadcasts events to users authorized to see that definition.
 */
function subscribeToSSE() {
  sseSource?.close();

  try {
    sseSource = new EventSource(`${API_BASE_URL}/api/sys/events`, {
      withCredentials: true,
    } as EventSourceInit);

    sseSource.addEventListener('sys-change', (e: MessageEvent) => {
      const event = JSON.parse(e.data) as { type: string; action: string; id: string; data: any };
      if (event.action === 'delete') {
        if (event.type === 'table') deleteRow(sysTableCollection, event.id);
        else if (event.type === 'column') deleteRow(sysColumnCollection, event.id);
        else if (event.type === 'field') deleteRow(sysFieldCollection, event.id);
        else if (event.type === 'role') deleteRow(sysRoleCollection, event.id);
      } else {
        if (event.type === 'table') upsertRow(sysTableCollection, event.data as SysTable, event.id);
        else if (event.type === 'column') upsertRow(sysColumnCollection, event.data as SysColumn, event.id);
        else if (event.type === 'field') upsertRow(sysFieldCollection, event.data as SysField, event.id);
        else if (event.type === 'role') upsertRow(sysRoleCollection, event.data as SysRole, event.id);
      }
    });

    sseSource.onerror = () => {
      emitStatus({ isOnline: false });
      setTimeout(() => subscribeToSSE(), 5000);
    };

    sseSource.onopen = () => {
      emitStatus({ isOnline: true, error: null });
    };
  } catch {
    // SSE not supported or blocked — fall back to polling
    startPolling();
  }
}

// ============================================================================
// Polling fallback (for environments where SSE is blocked)
// ============================================================================

let pollInterval: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sys/shapes`, {
        credentials: 'include',
      });
      if (response.ok) {
        const shapes = await response.json();
        if (shapes.sysFields?.length) {
          for (const row of shapes.sysFields as SysField[]) {
            upsertRow(sysFieldCollection, row, row.sys_field_id);
          }
        }
      }
    } catch { /* ignore */ }
  }, 30_000); // Poll every 30s
}

// ============================================================================
// Reset on logout
// ============================================================================

export function resetSync() {
  syncInitialized = false;
  sseSource?.close();
  sseSource = null;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  // Clear all collections
  for (const key of [...sysTableCollection.toArray].map(r => r.sys_table_id)) {
    try { sysTableCollection.delete(key); } catch { /* ignore */ }
  }
  for (const key of [...sysColumnCollection.toArray].map(r => r.sys_column_id)) {
    try { sysColumnCollection.delete(key); } catch { /* ignore */ }
  }
  for (const key of [...sysFieldCollection.toArray].map(r => r.sys_field_id)) {
    try { sysFieldCollection.delete(key); } catch { /* ignore */ }
  }
  for (const key of [...sysRoleCollection.toArray].map(r => r.sys_role_id)) {
    try { sysRoleCollection.delete(key); } catch { /* ignore */ }
  }
  emitStatus({ isSyncing: false, lastSyncAt: null, error: null });
}

// ============================================================================
// Online / offline tracking
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    emitStatus({ isOnline: true });
    if (syncInitialized) subscribeToSSE();
  });
  window.addEventListener('offline', () => {
    emitStatus({ isOnline: false });
  });
}
