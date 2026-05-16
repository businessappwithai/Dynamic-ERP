import { useState, useEffect, useCallback } from 'react'
import { useFormFields, type FieldMetadata } from '@/hooks/use-entities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save } from 'lucide-react'

interface DynamicFormProps {
  tableName: string
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  isSaving: boolean
  mode: 'create' | 'edit' | 'view'
  readOnly?: boolean
  serverErrors?: Record<string, string>
}

function getInputType(field: FieldMetadata): string {
  switch (field.sys_reference_id) {
    case 11: return 'number'   // Integer
    case 12: return 'number'   // Amount
    case 15: return 'date'     // Date
    case 16: return 'datetime-local' // DateTime
    case 17: return 'time'     // Time
    case 22: return 'number'   // Number
    case 29: return 'number'   // Quantity
    default: return 'text'
  }
}

function isTextArea(field: FieldMetadata): boolean {
  // Long text / memo types: 14 = Text Long, 24 = Memo, 25 = Memo Long
  return [14, 24, 25].includes(field.sys_reference_id)
}

function isBoolean(field: FieldMetadata): boolean {
  return field.sys_reference_id === 20
}

function formatInputValue(value: unknown, field: FieldMetadata): string {
  if (value === null || value === undefined) return ''
  if (field.sys_reference_id === 15 || field.sys_reference_id === 16) {
    try {
      const d = new Date(value as string)
      if (isNaN(d.getTime())) return ''
      if (field.sys_reference_id === 15) return d.toISOString().split('T')[0]
      return d.toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }
  return String(value)
}

interface FieldGroup {
  name: string
  fields: FieldMetadata[]
}

function groupFields(fields: FieldMetadata[]): FieldGroup[] {
  const grouped: Map<string, FieldMetadata[]> = new Map()
  for (const field of fields) {
    const key = field.group_name || ''
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(field)
  }
  const result: FieldGroup[] = []
  for (const [name, grpFields] of grouped) {
    result.push({ name, fields: grpFields.sort((a, b) => a.seq_no - b.seq_no) })
  }
  return result
}

export function DynamicForm({
  tableName,
  initialData,
  onSubmit,
  isSaving,
  mode,
  readOnly,
  serverErrors = {},
}: DynamicFormProps) {
  const { data: formFields, isLoading } = useFormFields(tableName)
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {})
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) setFormData(initialData)
  }, [initialData])

  const isReadOnly = readOnly || mode === 'view'

  const setValue = useCallback((column: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [column]: value }))
    setLocalErrors((prev) => {
      const next = { ...prev }
      delete next[column]
      return next
    })
  }, [])

  const SYSTEM_COLUMNS = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'version'])

  const validate = (): boolean => {
    if (!formFields) return true
    const errors: Record<string, string> = {}
    for (const field of formFields) {
      if (SYSTEM_COLUMNS.has(field.column_name)) continue
      if (
        field.is_mandatory &&
        field.is_displayed &&
        !field.is_read_only &&
        (formData[field.column_name] === undefined ||
          formData[field.column_name] === null ||
          formData[field.column_name] === '')
      ) {
        errors[field.column_name] = `${field.name || field.column_name} is required`
      }
    }
    setLocalErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const allErrors = { ...localErrors, ...serverErrors }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    )
  }

  if (!formFields || formFields.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No form fields configured for this entity.</p>
      </div>
    )
  }

  const SYSTEM_COLUMNS_SET = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'version'])
  const displayedFields = formFields
    .filter((f) => f.is_displayed && (mode !== 'create' || !SYSTEM_COLUMNS_SET.has(f.column_name)))
    .sort((a, b) => a.seq_no - b.seq_no)

  const groups = groupFields(displayedFields)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {groups.map((group, groupIdx) => (
        <div key={group.name || `group-${groupIdx}`} className="space-y-4">
          {group.name && (
            <div className="pb-2 border-b border-border/60">
              <h3 className="text-sm font-semibold text-foreground/80">{group.name}</h3>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map((field) => {
              const fieldError = allErrors[field.column_name]
              const isSystemCol = SYSTEM_COLUMNS.has(field.column_name)
              const isDisabled = isReadOnly || field.is_read_only || (mode === 'edit' && isSystemCol)
              const colSpan = field.col_span === 2 ? 'md:col-span-2' : ''

              if (isBoolean(field)) {
                return (
                  <div key={field.sys_field_id || field.column_name} className={`flex items-center gap-3 ${colSpan}`}>
                    <Checkbox
                      id={field.column_name}
                      checked={Boolean(formData[field.column_name])}
                      onCheckedChange={(checked) => setValue(field.column_name, checked)}
                      disabled={isDisabled}
                    />
                    <Label
                      htmlFor={field.column_name}
                      className={`text-sm cursor-pointer ${isDisabled ? 'text-muted-foreground' : ''}`}
                    >
                      {field.name || field.column_name}
                      {field.is_mandatory && !isReadOnly && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {fieldError && (
                      <p className="text-xs text-destructive">{fieldError}</p>
                    )}
                  </div>
                )
              }

              if (isTextArea(field)) {
                return (
                  <div key={field.sys_field_id || field.column_name} className={`space-y-1.5 ${colSpan || 'md:col-span-2'}`}>
                    <Label htmlFor={field.column_name} className="text-sm font-medium">
                      {field.name || field.column_name}
                      {field.is_mandatory && !isReadOnly && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {isReadOnly ? (
                      <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-sm min-h-[80px] whitespace-pre-wrap">
                        {String(formData[field.column_name] ?? '—')}
                      </div>
                    ) : (
                      <textarea
                        id={field.column_name}
                        value={formatInputValue(formData[field.column_name], field)}
                        onChange={(e) => setValue(field.column_name, e.target.value)}
                        disabled={isDisabled}
                        rows={3}
                        className={`w-full rounded-md border px-3 py-2 text-sm resize-y bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          fieldError
                            ? 'border-destructive focus:ring-destructive'
                            : 'border-input'
                        }`}
                      />
                    )}
                    {fieldError && (
                      <p className="text-xs text-destructive">{fieldError}</p>
                    )}
                  </div>
                )
              }

              return (
                <div key={field.sys_field_id || field.column_name} className={`space-y-1.5 ${colSpan}`}>
                  <Label htmlFor={field.column_name} className="text-sm font-medium">
                    {field.name || field.column_name}
                    {field.is_mandatory && !isReadOnly && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {isReadOnly ? (
                    <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-sm min-h-[38px]">
                      {String(formData[field.column_name] ?? '—')}
                    </div>
                  ) : (
                    <Input
                      id={field.column_name}
                      type={getInputType(field)}
                      value={formatInputValue(formData[field.column_name], field)}
                      onChange={(e) => setValue(field.column_name, e.target.value)}
                      disabled={isDisabled}
                      maxLength={field.field_length}
                      placeholder={field.default_value ?? undefined}
                      className={fieldError ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                  )}
                  {fieldError && (
                    <p className="text-xs text-destructive">{fieldError}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {!isReadOnly && (
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button
            type="submit"
            disabled={isSaving}
            className="shadow-md shadow-primary/20 min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
