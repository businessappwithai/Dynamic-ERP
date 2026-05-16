/**
 * OfflineIndicator — Full-width banner shown when user is offline
 */

import React from 'react';
import { useSyncStatus } from '../../hooks/useSyncStatus';

export function OfflineIndicator() {
  const { isOnline } = useSyncStatus();

  if (isOnline) return null;

  return (
    <div className="w-full bg-amber-500 text-amber-950 text-center text-sm py-1.5 font-medium z-50">
      You're offline — your dictionary definitions are cached locally and will sync when reconnected.
    </div>
  );
}
