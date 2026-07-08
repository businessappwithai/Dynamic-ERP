import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ErpConfirmationRequiredError } from "@erdwithai/erpclaw-client";
import { erpClient } from "@/lib/erp";
import { entityKeys } from "@/lib/query-keys";
import { inferFieldKind } from "@/lib/field-heuristics";
import { buildActionArgs, findListAction, findRowActions } from "@/lib/catalog-actions";

export interface DynamicTableProps {
  entity: string;
}

type Row = Record<string, unknown>;

/**
 * Server-driven table: columns come from `client.schema(entity)`, rows and
 * row actions come from whatever the live catalog (`client.catalog()`)
 * happens to expose for this entity today — no generation-time knowledge of
 * either baked in.
 */
export function DynamicTable({ entity }: DynamicTableProps) {
  const queryClient = useQueryClient();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const schemaQuery = useQuery({
    queryKey: entityKeys.schema(entity),
    queryFn: () => erpClient.schema(entity),
  });
  const catalogQuery = useQuery({
    queryKey: ["erp-catalog"],
    queryFn: () => erpClient.catalog(),
    staleTime: 5 * 60 * 1000,
  });

  const listAction = catalogQuery.data ? findListAction(catalogQuery.data, entity) : undefined;
  const rowActions = catalogQuery.data ? findRowActions(catalogQuery.data, entity) : [];

  const rowsQuery = useQuery({
    queryKey: entityKeys.list(entity),
    queryFn: async () => {
      if (!listAction) return [] as Row[];
      const result = await erpClient.execute<Record<string, unknown>>(listAction.domain, listAction.name, {});
      const rows = Array.isArray(result) ? result : (result?.items ?? result?.rows ?? result?.results ?? []);
      return Array.isArray(rows) ? (rows as Row[]) : [];
    },
    enabled: Boolean(listAction),
  });

  const runRowAction = useMutation({
    mutationFn: async (input: { actionName: string; domain: string; args: Record<string, unknown>; userConfirmed?: boolean }) =>
      erpClient.execute(input.domain, input.actionName, input.args, { userConfirmed: input.userConfirmed }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: entityKeys.list(entity) });
    },
  });

  const columns = useMemo(() => schemaQuery.data?.columns ?? [], [schemaQuery.data]);

  if (schemaQuery.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading schema…</div>;
  }
  if (schemaQuery.isError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load schema for "{entity}": {(schemaQuery.error as Error).message}
      </div>
    );
  }
  if (!listAction) {
    const kebab = entity.replace(/_/g, "-");
    return (
      <div className="p-4 text-sm text-gray-500">
        No list/search action found in the catalog for "{entity}" (looked for names like "list-{kebab}"). Rows
        can't be listed generically without one — see src/lib/catalog-actions.ts.
      </div>
    );
  }

  async function handleRowAction(actionName: string, domain: string, row: Row) {
    const action = rowActions.find((a) => a.name === actionName);
    if (!action) return;
    const args = buildActionArgs(action, row);
    setBusyAction(`${actionName}:${JSON.stringify(args)}`);
    try {
      await runRowAction.mutateAsync({ actionName, domain, args });
    } catch (err) {
      if (err instanceof ErpConfirmationRequiredError) {
        const confirmed = typeof window !== "undefined" && window.confirm(err.message);
        if (confirmed) {
          await runRowAction.mutateAsync({ actionName, domain, args, userConfirmed: true });
        }
      } else {
        console.error(`[DynamicTable] action "${actionName}" failed:`, err);
      }
    } finally {
      setBusyAction(null);
    }
  }

  const rows = rowsQuery.data ?? [];
  const primaryKey = schemaQuery.data?.primary_key[0];
  const colSpan = columns.length + (rowActions.length > 0 ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
        <thead>
          <tr>
            {columns.map((column) => {
              const kind = inferFieldKind(column, false);
              const alignClass = kind === "money" || kind === "number" ? "text-right" : "text-left";
              return (
                <th
                  key={column.column_name}
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${alignClass}`}
                >
                  {column.column_name}
                </th>
              );
            })}
            {rowActions.length > 0 ? <th className="px-3 py-2" /> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-6 text-center text-gray-400">
                No rows.
              </td>
            </tr>
          ) : null}
          {rows.map((row, i) => {
            const id = primaryKey ? String(row[primaryKey] ?? i) : String(i);
            const detailParams = { entity, id };
            return (
              <tr key={id}>
                {columns.map((column, columnIndex) => {
                  const kind = inferFieldKind(column, false);
                  const raw = row[column.column_name];
                  const alignClass = kind === "money" || kind === "number" ? "text-right tabular-nums" : "text-left";
                  const cellContent =
                    kind === "boolean" ? (raw ? "Yes" : "No") : String(raw ?? "");
                  return (
                    <td key={column.column_name} className={`px-3 py-2 ${alignClass}`}>
                      {columnIndex === 0 && primaryKey ? (
                        <Link to="/$entity/$id" params={detailParams} className="text-blue-600 hover:underline dark:text-blue-400">
                          {cellContent}
                        </Link>
                      ) : (
                        cellContent
                      )}
                    </td>
                  );
                })}
                {rowActions.length > 0 ? (
                  <td className="px-3 py-2 text-right space-x-2">
                    {rowActions.map((action) => (
                      <button
                        key={action.name}
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => void handleRowAction(action.name, action.domain, row)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium disabled:opacity-50 dark:border-gray-700"
                      >
                        {action.name}
                      </button>
                    ))}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
