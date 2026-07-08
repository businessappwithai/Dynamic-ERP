import { createFileRoute } from "@tanstack/react-router";
import { DynamicTable } from "@/components/DynamicTable";

/**
 * Generic list route for ANY erpclaw entity — the table name comes from the
 * URL param, not from a generation-time list of known entities. This is
 * what makes "runtime mode" work: a newly-provisioned erpclaw table is
 * browsable at /<table_name> the moment its schema is queryable, with no
 * regeneration of this app.
 */
export const Route = createFileRoute("/$entity/")({
  component: EntityListPage,
});

function EntityListPage() {
  const { entity } = Route.useParams();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{entity}</h1>
        <a
          href={`/${entity}/new`}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900"
        >
          New
        </a>
      </div>
      <DynamicTable entity={entity} />
    </div>
  );
}
