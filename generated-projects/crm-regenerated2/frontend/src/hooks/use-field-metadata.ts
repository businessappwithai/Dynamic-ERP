/**
 * Field Metadata Hooks
 *
 * Phase 4: Uses TanStack DB reactive collections (sysFieldCollection,
 * sysColumnCollection, sysTableCollection) for live, offline-capable
 * field metadata queries. Mutations still go to the API.
 *
 * Generated: 2026-05-16T05:41:34.296Z
 * Project: CRM Regenerated 2
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useLiveCollection, useLiveQuery } from './useLiveCollection';
import {
  sysTableCollection,
  sysColumnCollection,
  sysFieldCollection,
  type SysTable as SysTableRow,
  type SysColumn as SysColumnRow,
  type SysField as SysFieldRow,
} from '@/lib/tanstack-db/collections';

export interface FieldMetadata {
  sys_field_id: string;
  sys_column_id: string;
  name: string;
  seq_no: number;
  seq_no_grid: number;
  is_displayed: boolean;
  is_displayed_grid: boolean;
  is_read_only: boolean;
  is_mandatory: boolean;
  column_name: string;
  reference_id: number;
}

export interface ColumnMetadata {
  sys_column_id: string;
  sys_table_id: string;
  column_name: string;
  name: string;
  sys_reference_id: number;
  is_key: boolean;
  is_mandatory: boolean;
  seq_no: number;
}

export interface SysTable {
  sys_table_id: string;
  table_name: string;
  name: string;
}

export interface SysReference {
  sys_reference_id: number;
  name: string;
  description: string;
}

/**
 * Returns all sys_tables from TanStack DB collection (live, reactive).
 */
export function useAllSysTables() {
  return useLiveCollection<SysTableRow>(sysTableCollection as any);
}

/**
 * Returns all sys_columns from TanStack DB collection (live, reactive).
 */
export function useAllSysColumns() {
  return useLiveCollection<SysColumnRow>(sysColumnCollection as any);
}

/**
 * Returns all sys_fields from TanStack DB collection (live, reactive).
 */
export function useAllSysFields() {
  return useLiveCollection<SysFieldRow>(sysFieldCollection as any);
}

/**
 * Returns columns for a specific table from the local TanStack DB collection.
 * Reactive — updates immediately when the collection changes.
 */
export function useTableColumns(tableId: string) {
  const columns = useLiveQuery<SysColumnRow>(
    sysColumnCollection as any,
    (col) => col.sys_table_id === tableId
  );
  return { data: columns, isLoading: false };
}

/**
 * Returns all active fields for a given table name using TanStack DB collections.
 * Reactive — updates immediately without refetch.
 */
export function useFieldMetadata(tableName: string) {
  const allTables = useLiveCollection<SysTableRow>(sysTableCollection as any);
  const allColumns = useLiveCollection<SysColumnRow>(sysColumnCollection as any);
  const allFields = useLiveCollection<SysFieldRow>(sysFieldCollection as any);

  const table = allTables.find((t) => t.table_name === tableName);
  if (!table) return { data: [], isLoading: allTables.length === 0 };

  const columnIds = new Set(
    allColumns.filter((c) => c.sys_table_id === table.sys_table_id).map((c) => c.sys_column_id)
  );

  const fields = allFields
    .filter((f) => columnIds.has(f.sys_column_id) && f.is_active)
    .sort((a, b) => a.seq_no - b.seq_no);

  return { data: fields, isLoading: false };
}

/**
 * Update field sequence order (for drag-and-drop reordering).
 * Mutation goes to the API; SSE push will update TanStack DB collection.
 */
export function useUpdateFieldOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, newSeqNo }: { fieldId: string; newSeqNo: number }) => {
      return apiClient.patch<FieldMetadata>(`/api/sys/fields/${fieldId}`, {
        seq_no: newSeqNo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sys', 'fields'] });
    },
  });
}

/**
 * Toggle field visibility.
 * Mutation goes to the API; SSE push will update TanStack DB collection.
 */
export function useToggleFieldVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, isDisplayed }: { fieldId: string; isDisplayed: boolean }) => {
      return apiClient.patch<FieldMetadata>(`/api/sys/fields/${fieldId}`, {
        is_displayed: isDisplayed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sys', 'fields'] });
    },
  });
}
