import { useFieldGroups, useCreateFieldGroup, useUpdateFieldGroup, useDeleteFieldGroup } from '@/hooks/use-entities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useState } from 'react'

interface FieldGroupManagerProps {
  entityName: string
}

export function FieldGroupManager({ entityName }: FieldGroupManagerProps) {
  const { data: groups, isLoading } = useFieldGroups(entityName)
  const createGroup = useCreateFieldGroup(entityName)
  const updateGroup = useUpdateFieldGroup(entityName)
  const deleteGroup = useDeleteFieldGroup(entityName)

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  if (!entityName) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Select an entity to manage field groups.
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

  const handleCreate = () => {
    if (!newName.trim()) return
    createGroup.mutate({ name: newName.trim(), columns: 2, layout_type: 'grid', is_collapsed_by_default: false, seq_no: ((groups?.length || 0) + 1) * 10 })
    setNewName('')
  }

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return
    updateGroup.mutate({ id, data: { name: editName.trim() } })
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Create new group */}
      <div className="flex gap-2">
        <Input
          placeholder="New group name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={createGroup.isPending || !newName.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Group
        </Button>
      </div>

      {/* Group list */}
      {!groups || groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No field groups defined. Create one to organize form fields.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.sys_field_group_id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-background"
            >
              {editingId === group.sys_field_group_id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(group.sys_field_group_id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleUpdate(group.sys_field_group_id)}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{group.name}</p>
                    {group.field_count !== undefined && (
                      <p className="text-xs text-muted-foreground">{group.field_count} fields</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setEditingId(group.sys_field_group_id); setEditName(group.name) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => deleteGroup.mutate(group.sys_field_group_id)}
                    disabled={deleteGroup.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
