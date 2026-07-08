import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ErpConfirmationRequiredError } from "@erdwithai/erpclaw-client";
import { DynamicForm } from "@/components/DynamicForm";
import { entityKeys } from "@/lib/query-keys";
import { erpClient } from "@/lib/erp";
import { findSaveAction } from "@/lib/catalog-actions";

/**
 * Generic detail/edit route for ANY erpclaw entity, same "runtime mode"
 * rationale as $entity/index.tsx. `id === "new"` renders a blank create
 * form; anything else pre-seeds the form with just `{ id }` — erpclaw's
 * catalog has no generic "get one row by id" action to discover, so this
 * intentionally does not attempt to fetch-and-prefill the rest of the
 * record. Wire that up per-entity if/when you need it.
 */
export const Route = createFileRoute("/$entity/$id")({
  component: EntityDetailPage,
});

function EntityDetailPage() {
  const { entity, id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const isNew = id === "new";

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const catalog = await erpClient.catalog();
      const action = findSaveAction(catalog, entity, isNew);
      if (!action) {
        const kebab = entity.replace(/_/g, "-");
        throw new Error(
          `No create-${kebab}/update-${kebab} action found in the catalog for "${entity}" — see src/lib/catalog-actions.ts.`,
        );
      }
      try {
        return await erpClient.execute(action.domain, action.name, values);
      } catch (err) {
        if (err instanceof ErpConfirmationRequiredError && typeof window !== "undefined" && window.confirm(err.message)) {
          return erpClient.execute(action.domain, action.name, values, { userConfirmed: true });
        }
        throw err;
      }
    },
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: entityKeys.list(entity) });
    },
  });

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void navigate({ to: "/$entity", params: { entity } })}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to {entity}
      </button>
      <h1 className="text-lg font-semibold">{isNew ? `New ${entity}` : `${entity} / ${id}`}</h1>
      {saved ? <p className="text-sm text-green-600">Saved.</p> : null}
      {save.isError ? <p className="text-sm text-red-600">{(save.error as Error).message}</p> : null}
      <DynamicForm
        entity={entity}
        initialValues={isNew ? {} : { id }}
        onSubmit={(values) => save.mutate(values)}
        disabled={save.isPending}
        submitLabel={isNew ? "Create" : "Save"}
      />
    </div>
  );
}
