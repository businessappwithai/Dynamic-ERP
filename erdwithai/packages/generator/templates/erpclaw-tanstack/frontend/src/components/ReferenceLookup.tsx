import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { erpClient } from "@/lib/erp";
import { findListAction } from "@/lib/catalog-actions";

export interface ReferenceLookupProps {
  foreignTable: string;
  value: string;
  onChange: (value: string) => void;
}

type OptionRow = Record<string, unknown>;

/**
 * FK search-select. Looks for a `list-*`/`search-*` catalog action on the
 * referenced table (same heuristic as DynamicTable's list lookup); falls
 * back to a plain text FK-id input when the catalog doesn't expose one —
 * reasonable given erpclaw's catalog carries no explicit "this lists that
 * table" relationship to rely on instead.
 */
export function ReferenceLookup({ foreignTable, value, onChange }: ReferenceLookupProps) {
  const [query, setQuery] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["erp-catalog"],
    queryFn: () => erpClient.catalog(),
    staleTime: 5 * 60 * 1000,
  });
  const listAction = catalogQuery.data ? findListAction(catalogQuery.data, foreignTable) : undefined;

  const optionsQuery = useQuery({
    queryKey: ["erp-reference-options", foreignTable],
    queryFn: async () => {
      if (!listAction) return [] as OptionRow[];
      const result = await erpClient.execute<Record<string, unknown>>(listAction.domain, listAction.name, {});
      const rows = Array.isArray(result) ? result : (result?.items ?? result?.rows ?? result?.results ?? []);
      return Array.isArray(rows) ? (rows as OptionRow[]) : [];
    },
    enabled: Boolean(listAction),
  });

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900";

  if (!catalogQuery.data || !listAction) {
    return (
      <input
        type="text"
        placeholder={`${foreignTable} id`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }

  const options = optionsQuery.data ?? [];
  const firstOption = options[0] ?? {};
  const idKey = Object.keys(firstOption).find((k) => k === "id" || k.endsWith("_id")) ?? "id";
  const labelKey = Object.keys(firstOption).find((k) => ["name", "title", "label", "code"].includes(k)) ?? idKey;
  const listId = `ref-${foreignTable}`;

  return (
    <div>
      <input
        type="text"
        list={listId}
        placeholder={`Search ${foreignTable}…`}
        value={query || value}
        onChange={(e) => {
          setQuery(e.target.value);
          const match = options.find((o) => String(o[labelKey]) === e.target.value);
          onChange(match ? String(match[idKey]) : e.target.value);
        }}
        className={inputClass}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={String(o[idKey])} value={String(o[labelKey])} />
        ))}
      </datalist>
    </div>
  );
}
