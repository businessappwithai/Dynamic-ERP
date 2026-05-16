/**
 * useLiveCollection — React hook for TanStack DB reactive queries
 *
 * Subscribes to a collection and re-renders when data changes.
 * Works with sysTableCollection, sysFieldCollection, etc.
 */

import { useEffect, useRef, useState } from 'react';

type AnyCollection = {
  toArray: object[];
  subscribeChanges: (fn: (changes: any[]) => void) => { unsubscribe: () => void };
};

/**
 * Returns all rows in a collection, re-rendering on every change.
 */
export function useLiveCollection<T extends object>(collection: AnyCollection): T[] {
  const [data, setData] = useState<T[]>(() => (collection.toArray as T[]));
  const collectionRef = useRef(collection);
  collectionRef.current = collection;

  useEffect(() => {
    // Get latest snapshot
    setData(collectionRef.current.toArray as T[]);

    // Subscribe to future changes
    const subscription = collectionRef.current.subscribeChanges(() => {
      setData([...collectionRef.current.toArray] as T[]);
    });

    return () => subscription.unsubscribe();
  }, []);

  return data;
}

/**
 * Returns filtered rows from a collection, re-rendering on every change.
 * filter is re-evaluated on every change so keep it stable (useMemo if needed).
 */
export function useLiveQuery<T extends object>(
  collection: AnyCollection,
  filter: (row: T) => boolean
): T[] {
  const [data, setData] = useState<T[]>(() =>
    (collection.toArray as T[]).filter(filter)
  );
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const collectionRef = useRef(collection);
  collectionRef.current = collection;

  useEffect(() => {
    setData((collectionRef.current.toArray as T[]).filter(filterRef.current));

    const subscription = collectionRef.current.subscribeChanges(() => {
      setData([...(collectionRef.current.toArray as T[]).filter(filterRef.current)]);
    });

    return () => subscription.unsubscribe();
  }, []);

  return data;
}
