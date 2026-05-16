/**
 * SyncStatusBar — Shows TanStack DB sync state in the app header
 */

import React from 'react';
import { useSyncStatus } from '../../hooks/useSyncStatus';

export function SyncStatusBar() {
  const { isOnline, isSyncing, error } = useSyncStatus();

  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive" title={error}>
        <span className="w-2 h-2 rounded-full bg-destructive" />
        <span>Sync error</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>Syncing…</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      <span>Live</span>
    </div>
  );
}
