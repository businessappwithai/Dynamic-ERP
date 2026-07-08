import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EntityColumn } from "@erdwithai/erpclaw-client";
import { erpClient } from "@/lib/erp";
import { entityKeys } from "@/lib/query-keys";
import { inferFieldKind } from "@/lib/field-heuristics";
import { ReferenceLookup } from "./ReferenceLookup";

export interface DynamicFormProps {
  entity: string;
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}

type FormValues = Record<string, unknown>;

/**
 * Renders a form purely from erpclaw's live `information_schema` shape
 * (`client.schema(entity)`), fetched at RUNTIME — not at generation time.
 * A newly-provisioned erpclaw entity is usable here the moment its schema
 * is queryable, with no rebuild of this app.
 */
export function DynamicForm({ entity, initialValues, onSubmit, submitLabel = "Save", disabled }: DynamicFormProps) {
  const schemaQuery = useQuery({
    queryKey: entityKeys.schema(entity),
    queryFn: () => erpClient.schema(entity),
  });

  const [values, setValues] = useState<FormValues>(initialValues ?? {});

  const fkByColumn = useMemo(() => {
    const map = new Map<string, string>();
    for (const fk of schemaQuery.data?.foreign_keys ?? []) map.set(fk.column_name, fk.foreign_table);
    return map;
  }, [schemaQuery.data]);

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
  const schema = schemaQuery.data;
  if (!schema) return null;

  const editableColumns = schema.columns.filter(
    (c) => !schema.primary_key.includes(c.column_name) && c.column_name !== "created_at" && c.column_name !== "updated_at",
  );

  function setField(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <form
      className="space-y-4 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(values);
      }}
    >
      {editableColumns.map((column) => (
        <FormField
          key={column.column_name}
          column={column}
          foreignTable={fkByColumn.get(column.column_name)}
          value={values[column.column_name]}
          onChange={(v) => setField(column.column_name, v)}
        />
      ))}
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function FormField({
  column,
  foreignTable,
  value,
  onChange,
}: {
  column: EntityColumn;
  foreignTable: string | undefined;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const kind = inferFieldKind(column, Boolean(foreignTable));
  const label = column.column_name;
  const required = column.is_nullable === "NO" && column.column_default === null;

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900";

  const wrap = (input: React.ReactNode) => (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {input}
    </label>
  );

  if (kind === "reference" && foreignTable) {
    return wrap(
      <ReferenceLookup foreignTable={foreignTable} value={typeof value === "string" ? value : ""} onChange={onChange} />,
    );
  }

  if (kind === "boolean") {
    return wrap(
      <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />,
    );
  }

  if (kind === "number") {
    return wrap(
      <input
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={inputClass}
      />,
    );
  }

  if (kind === "money") {
    // Money is ALWAYS a string end-to-end — never Number()/parseFloat this.
    // erpclaw stores money as Decimal-as-TEXT specifically to avoid float
    // drift; coercing here would silently reintroduce it on the client.
    return wrap(
      <input
        type="text"
        inputMode="decimal"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} text-right tabular-nums`}
      />,
    );
  }

  if (kind === "date") {
    return wrap(
      <input
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />,
    );
  }

  if (kind === "datetime") {
    return wrap(
      <input
        type="datetime-local"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />,
    );
  }

  if (kind === "textarea") {
    return wrap(
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={inputClass}
      />,
    );
  }

  if (kind === "json") {
    const asText = typeof value === "string" ? value : value ? JSON.stringify(value, null, 2) : "";
    return wrap(
      <textarea
        value={asText}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        spellCheck={false}
        className={`${inputClass} font-mono text-xs`}
      />,
    );
  }

  // "text" and the reference-without-a-known-foreign-table fallback.
  return wrap(
    <input
      type="text"
      maxLength={column.character_maximum_length ?? undefined}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />,
  );
}
