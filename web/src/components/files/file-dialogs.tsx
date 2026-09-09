/**
 * Dialog components for file management operations:
 * FileNameDialog (create file/folder), FilePathDialog (tree-based dir picker), DeleteConfirmDialog.
 */
import { useState, useRef, useCallback } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  filesGetRootsOptions,
  filesReadTreeOptions,
} from '@/generated/api/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

/* ── FileNameDialog ─────────────────────────────── */

interface FileNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  onConfirm: (name: string) => void;
}

export function FileNameDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultValue = '',
  onConfirm,
}: FileNameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <NameForm
            title={title}
            description={description}
            defaultValue={defaultValue}
            placeholder="Enter name..."
            onConfirm={(v) => {
              onConfirm(v);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Shared NameForm ───────────────────────────── */

interface NameFormProps {
  title: string;
  description?: string;
  defaultValue: string;
  placeholder: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function NameForm({
  title,
  description,
  defaultValue,
  placeholder,
  onConfirm,
  onCancel,
}: NameFormProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }, [value, onConfirm]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder={t(placeholder)}
        autoFocus
      />
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={!value.trim()}>
          {t('Confirm')}
        </Button>
      </DialogFooter>
    </>
  );
}

/* ── FilePathDialog (tree-based directory picker) ── */

interface FilePathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Not used by tree picker, kept for API compat. */
  defaultValue?: string;
  onConfirm: (path: string) => void;
}

export function FilePathDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: FilePathDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <DirPickerForm
            title={title}
            description={description}
            onConfirm={(v) => {
              onConfirm(v);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Internal: directory tree picker form rendered fresh on each dialog open. */
function DirPickerForm({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  onConfirm: (path: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const rootsQuery = useQuery(filesGetRootsOptions());
  const rootDirs = rootsQuery.data
    ? Array.from(new Set([rootsQuery.data.homeDir, ...rootsQuery.data.roots]))
        .filter((d): d is string => Boolean(d))
    : [];

  const toggleDir = useCallback((dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }, []);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>

      <ScrollArea className="h-64 rounded-md border">
        <div className="py-1">
          {rootsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('Loading...')}
            </div>
          ) : rootsQuery.isError || rootDirs.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t('Cannot load directories')}
            </div>
          ) : (
            rootDirs.map((root) => (
              <PickerDirNode
                key={root}
                path={root}
                name={root.split('/').pop() || root}
                depth={0}
                selectedDir={selectedDir}
                expandedDirs={expandedDirs}
                onSelect={setSelectedDir}
                onToggle={toggleDir}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {selectedDir && (
        <div className="truncate rounded bg-muted/50 px-2 py-1 font-mono text-xs text-muted-foreground">
          {selectedDir}
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button disabled={!selectedDir} onClick={() => selectedDir && onConfirm(selectedDir)}>
          {t('Confirm')}
        </Button>
      </DialogFooter>
    </>
  );
}

/* ── Dir tree nodes for picker ──────────────────── */

interface PickerDirNodeProps {
  path: string;
  name: string;
  depth: number;
  selectedDir: string | null;
  expandedDirs: Set<string>;
  onSelect: (dir: string) => void;
  onToggle: (dir: string) => void;
}

function PickerDirNode({
  path,
  name,
  depth,
  selectedDir,
  expandedDirs,
  onSelect,
  onToggle,
}: PickerDirNodeProps) {
  const isExpanded = expandedDirs.has(path);
  const isSelected = selectedDir === path;

  return (
    <div>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 py-1 text-xs transition-colors hover:bg-accent/50',
          isSelected && 'bg-primary/10 text-primary',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(path)}
        onDoubleClick={() => onToggle(path)}
      >
        <button
          type="button"
          className="shrink-0 p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(path);
          }}
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform',
              isExpanded && 'rotate-90',
            )}
          />
        </button>
        {isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        )}
        <span className="min-w-0 truncate">{name}</span>
      </div>
      {isExpanded && (
        <PickerDirChildren
          parentPath={path}
          depth={depth + 1}
          selectedDir={selectedDir}
          expandedDirs={expandedDirs}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

function PickerDirChildren({
  parentPath,
  depth,
  selectedDir,
  expandedDirs,
  onSelect,
  onToggle,
}: Omit<PickerDirNodeProps, 'path' | 'name'> & { parentPath: string }) {
  const { t } = useTranslation();
  const { data: entries, isLoading, isError } = useQuery({
    ...filesReadTreeOptions({ query: { root: parentPath } }),
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-1 py-1 text-xs text-muted-foreground"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('Loading...')}
      </div>
    );
  }

  if (isError) return null;

  const dirs = (entries ?? []).filter((e) => e.type === 'directory');

  if (dirs.length === 0) {
    return (
      <div
        className="py-1 text-xs italic text-muted-foreground"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {t('No subdirectories')}
      </div>
    );
  }

  return (
    <>
      {dirs.map((dir) => (
        <PickerDirNode
          key={dir.path}
          path={dir.path}
          name={dir.name}
          depth={depth}
          selectedDir={selectedDir}
          expandedDirs={expandedDirs}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

/* ── DeleteConfirmDialog ────────────────────────── */

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryName: string;
  isDirectory: boolean;
  onConfirm: (recursive: boolean) => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  entryName,
  isDirectory,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Delete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirectory
              ? t('Are you sure you want to delete the directory "{{name}}" and all its contents?', { name: entryName })
              : t('Are you sure you want to delete "{{name}}"?', { name: entryName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onConfirm(isDirectory)}
          >
            {t('Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
