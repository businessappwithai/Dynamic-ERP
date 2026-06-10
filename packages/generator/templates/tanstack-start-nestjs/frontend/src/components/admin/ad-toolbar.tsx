import {
  Plus,
  Save,
  Trash2,
  RotateCcw,
  RefreshCw,
  Copy,
  SlidersHorizontal,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ADToolbarProps {
  onNew?: () => void;
  onCopy?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRefresh?: () => void;
  onEdit?: () => void;
  onCancelEdit?: () => void;
  onAdvancedSearchToggle?: () => void;
  advancedFilterCount?: number;
  isSaving?: boolean;
  isDeleting?: boolean;
  hasChanges?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  isEditing?: boolean;
  isDetailView?: boolean;
  isAdvancedSearchOpen?: boolean;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = 'ghost',
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'ghost' | 'destructive';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={`h-8 w-8 p-0 ${variant === 'destructive' ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-primary/10 hover:text-primary'}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ADToolbar({
  onNew,
  onCopy,
  onSave,
  onDelete,
  onUndo,
  onRefresh,
  onEdit,
  onCancelEdit,
  onAdvancedSearchToggle,
  advancedFilterCount = 0,
  isSaving,
  isDeleting,
  hasChanges,
  canDelete = true,
  canCreate = true,
  isEditing = false,
  isDetailView = false,
  isAdvancedSearchOpen = false,
}: ADToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
        {/* Advanced Search trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAdvancedSearchOpen ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onAdvancedSearchToggle}
              className="h-8 gap-1.5 px-2.5 text-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              {advancedFilterCount > 0 && (
                <Badge variant="default" className="h-4 px-1 text-[10px] min-w-[16px]">
                  {advancedFilterCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Advanced Search (server-side, field filters)</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {canCreate && (
          <ToolbarButton icon={Plus} label="New Record" onClick={onNew} />
        )}
        <ToolbarButton icon={Copy} label="Copy Record" onClick={onCopy} disabled={!onCopy} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {isDetailView && !isEditing && (
          <ToolbarButton icon={Pencil} label="Edit Record" onClick={onEdit} />
        )}
        {isEditing && (
          <ToolbarButton icon={X} label="Cancel Edit" onClick={onCancelEdit} />
        )}
        <ToolbarButton
          icon={Save}
          label={isSaving ? 'Saving...' : 'Save'}
          onClick={onSave}
          disabled={isSaving || !hasChanges}
        />
        {canDelete && (
          <ToolbarButton
            icon={Trash2}
            label="Delete"
            onClick={onDelete}
            disabled={isDeleting}
            variant="destructive"
          />
        )}
        <ToolbarButton icon={RotateCcw} label="Undo Changes" onClick={onUndo} disabled={!hasChanges} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={onRefresh} />
      </div>
    </TooltipProvider>
  );
}
