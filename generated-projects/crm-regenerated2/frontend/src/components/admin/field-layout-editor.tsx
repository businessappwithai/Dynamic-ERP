import { useAllFormFields, useAllGridFields, useUpdateFieldStyle, type FieldMetadata } from '@/hooks/use-entities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface FieldLayoutEditorProps {
  entityName: string
}

function FieldRow({
  field,
  onToggle,
}: {
  field: FieldMetadata
  onToggle: (fieldId: string, visible: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{field.name || field.column_name}</p>
        <p className="text-xs text-muted-foreground">{field.column_name} · seq: {field.seq_no}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onToggle(field.sys_field_id, !field.is_displayed)}
        title={field.is_displayed ? 'Hide field' : 'Show field'}
      >
        {field.is_displayed ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  )
}

export function FieldLayoutEditor({ entityName }: FieldLayoutEditorProps) {
  const [view, setView] = useState<'form' | 'grid'>('form')
  const formQuery = useAllFormFields(entityName)
  const gridQuery = useAllGridFields(entityName)
  const updateStyle = useUpdateFieldStyle(entityName)

  const { data, isLoading } = view === 'form' ? formQuery : gridQuery

  if (!entityName) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Select an entity to edit field layout.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    )
  }

  const fields = data || []

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={view === 'form' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('form')}
        >
          Form Layout
        </Button>
        <Button
          variant={view === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('grid')}
        >
          Grid Layout
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No fields found.</p>
      ) : (
        <div className="space-y-2">
          {fields
            .slice()
            .sort((a, b) => a.seq_no - b.seq_no)
            .map((field) => (
              <FieldRow
                key={field.sys_field_id}
                field={field}
                onToggle={(fieldId, visible) =>
                  updateStyle.mutate({ fieldId, style: { is_displayed: visible } })
                }
              />
            ))}
        </div>
      )}
    </div>
  )
}
