/**
 * TanStack DB Collections for sys_* Application Dictionary
 *
 * SECURITY: These collections ONLY contain definitions the authenticated user
 * is authorized to view. Shapes are fetched from /api/sys/shapes which
 * filters by the user's session roles server-side.
 *
 * User A CANNOT see User B's custom fields, rules, or validation schemas.
 */

import { createCollection } from '@tanstack/db';

// ============================================================================
// sys_table — Table Metadata
// SECURITY: Only rows where role_accessible contains user's role OR is_public
// ============================================================================
export interface SysTable {
  sys_table_id: string;
  table_name: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  access_level: string;
  is_active: boolean;
  role_accessible: string[];
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export const sysTableCollection = createCollection<SysTable, string>({
  id: 'sys-table',
  getKey: (row) => row.sys_table_id,
  sync: { sync: () => {} }, // Populated externally by SysSync
});

// ============================================================================
// sys_column — Column Metadata
// SECURITY: Only columns belonging to authorized sys_table rows
// ============================================================================
export interface SysColumn {
  sys_column_id: string;
  sys_table_id: string;
  column_name: string;
  name: string;
  description?: string | null;
  is_mandatory: boolean;
  is_updateable: boolean;
  is_key: boolean;
  seq_no: number;
  is_active: boolean;
  role_accessible: string[];
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export const sysColumnCollection = createCollection<SysColumn, string>({
  id: 'sys-column',
  getKey: (row) => row.sys_column_id,
  sync: { sync: () => {} },
});

// ============================================================================
// sys_field — Field Metadata (drives form layout & validation)
// SECURITY: This is the MOST sensitive collection — it controls what fields
// users see and what validation applies. User A cannot see User B's fields.
// ============================================================================
export interface SysField {
  sys_field_id: string;
  sys_tab_id: string;
  sys_column_id: string;
  sys_field_group_id?: string | null;
  name: string;
  description?: string | null;
  seq_no: number;
  seq_no_grid: number;
  is_displayed: boolean;
  is_displayed_grid: boolean;
  is_read_only: boolean;
  is_active: boolean;
  // RBAC fields — critical for security
  role_accessible: string[];
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export const sysFieldCollection = createCollection<SysField, string>({
  id: 'sys-field',
  getKey: (row) => row.sys_field_id,
  sync: { sync: () => {} },
});

// ============================================================================
// sys_role — Role Definitions (public — all users see role names)
// ============================================================================
export interface SysRole {
  sys_role_id: string;
  name: string;
  description?: string | null;
  is_master_role: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const sysRoleCollection = createCollection<SysRole, string>({
  id: 'sys-role',
  getKey: (row) => row.sys_role_id,
  sync: { sync: () => {} },
});
