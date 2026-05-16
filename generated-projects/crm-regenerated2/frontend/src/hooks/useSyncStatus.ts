/**
 * useSyncStatus — React hook for TanStack DB sync state
 */

import { useEffect, useState } from 'react';
import { getSyncStatus, onSyncStatusChange, type SyncStatus } from '../lib/tanstack-db/sync';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => {
    const unsubscribe = onSyncStatusChange(setStatus);
    return () => { unsubscribe(); };
  }, []);

  return status;
}
