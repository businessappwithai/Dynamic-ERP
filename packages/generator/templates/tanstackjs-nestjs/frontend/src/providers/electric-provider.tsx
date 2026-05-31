'use client';

/**
 * ElectricSQL Provider
 *
 * Initialises PGlite + ElectricSQL sync on mount and makes the
 * database available to the whole React tree. sys_ metadata tables
 * are synced once per session (filtered by the current user's role)
 * so all dictionary/metadata queries run locally at memory speed.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getDb, syncSysTables, type SyncConfig, type UnsubscribeFn } from '@/lib/electric';
import { reloadSysCollections } from '@/lib/sys-collections';
import type { PGlite } from '@electric-sql/pglite';

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface ElectricContextValue {
  db: PGlite | null;
  isSyncing: boolean;
  isSynced: boolean;
  error: Error | null;
}

const ElectricContext = createContext<ElectricContextValue>({
  db: null,
  isSyncing: false,
  isSynced: false,
  error: null,
});

export function useElectric(): ElectricContextValue {
  return useContext(ElectricContext);
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export interface ElectricProviderProps {
  children: ReactNode;
  /** Role string used to filter Electric shapes (per-role sync). */
  role?: string;
  /** User ID forwarded to the Electric proxy for row-level auth. */
  userId?: string;
}

export function ElectricProvider({ children, role, userId }: ElectricProviderProps) {
  const [db, setDb] = useState<PGlite | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<UnsubscribeFn | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setIsSyncing(true);
        setError(null);

        const database = await getDb();
        if (cancelled) return;
        setDb(database);

        const config: SyncConfig = { role, userId };
        const unsub = await syncSysTables(config);
        if (cancelled) {
          unsub();
          return;
        }

        unsubRef.current = unsub;

        // Populate TanStack DB collections from the now-synced PGlite data
        await reloadSysCollections();
        if (cancelled) return;

        setIsSynced(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[ElectricProvider] sync error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [role, userId]);

  return (
    <ElectricContext.Provider value={{ db, isSyncing, isSynced, error }}>
      {children}
    </ElectricContext.Provider>
  );
}
