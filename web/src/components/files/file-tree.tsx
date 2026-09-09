/**
 * Flat file browser (Windows Explorer style): shows one directory level at a time.
 * Click directory → navigate into it. Breadcrumb → go back up.
 * Supports drag-and-drop move via @dnd-kit/react and right-click context menu.
 */
import { useState, useRef, useCallback } from 'react';
import {
  ChevronRight,
  File,
  Folder,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { Feedback } from '@dnd-kit/dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { filesReadTreeOptions } from '@/generated/api/@tanstack/react-query.gen';
import { useFilesStore } from '@/stores/files-store';
import { cn } from '@/lib/utils';
import { useFileOperations } from '@/hooks/use-file-operations';
import { FileContextMenu } from './file-context-menu';
import { FileToolbar } from './file-toolbar';
import {
  FileNameDialog,
  FilePathDialog,
  DeleteConfirmDialog,
} from './file-dialogs';

/* ── Dialog state ───────────────────────────────── */

interface DialogState {
  type: 'newFile' | 'newFolder' | 'rename' | 'copy' | 'move' | 'delete' | null;
  entryPath: string;
  entryName: string;
  entryType: 'file' | 'directory';
}

const CLOSED: DialogState = { type: null, entryPath: '', entryName: '', entryType: 'file' };

interface FileTreeProps {
  onFileClick?: (filePath: string) => void;
}

export function FileTree({ onFileClick }: FileTreeProps = {}) {
  const { t } = useTranslation();
  const rootDir = useFilesStore((s) => s.rootDir);
  const setRootDir = useFilesStore((s) => s.setRootDir);
  const selectedFile = useFilesStore((s) => s.selectedFile);
  const selectFile = useFilesStore((s) => s.selectFile);
  const ops = useFileOperations();
  const [dialog, setDialog] = useState<DialogState>(CLOSED);

  /** dnd-kit drag end: move source into target directory. */
  const handleDragEnd = useCallback(
    (event: { canceled: boolean; operation: { source: { data?: Record<string, unknown> } | null; target: { data?: Record<string, unknown> } | null } }) => {
      if (event.canceled) return;
      const { source, target } = event.operation;
      if (!source || !target) return;
      const sourcePath = source.data?.path as string | undefined;
      const targetDir = target.data?.path as string | undefined;
      if (!sourcePath || !targetDir) return;
      if (sourcePath === targetDir || targetDir.startsWith(`${sourcePath}/`)) return;
      const fileName = sourcePath.split('/').pop() ?? '';
      const dest = `${targetDir}/${fileName}`;
      if (sourcePath === dest) return;
      ops.movePath.mutate({ body: { sourcePath, destinationPath: dest } });
    },
    [ops],
  );

  if (!rootDir) {
    return (
      <div className="px-3 py-8 text-center text-xs text-muted-foreground">
        {t('No workspace directory')}
      </div>
    );
  }

  const openDialog = (type: DialogState['type'], entryPath: string, entryName: string, entryType: 'file' | 'directory') =>
    setDialog({ type, entryPath, entryName, entryType });
  const closeDialog = () => setDialog(CLOSED);

  const handleUpload = (files: FileList, destinationPath: string) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      formData.append('files', file, relativePath);
    }
    ops.uploadFiles.mutate({ destinationPath, formData });
  };

  const handleClick = onFileClick ?? ((p: string) => selectFile(p));

  return (
    <>
      <FileToolbar onUpload={handleUpload} />

      <ScrollArea className="min-h-0 flex-1">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <FlatDirectory
            dirPath={rootDir}
            selectedFile={selectedFile}
            onFileClick={handleClick}
            onDirClick={setRootDir}
            openDialog={openDialog}
            ops={ops}
            onUpload={handleUpload}
          />
        </DragDropProvider>
      </ScrollArea>

      {/* ── Dialogs ─────────────────────────────── */}

      <FileNameDialog
        open={dialog.type === 'newFile'}
        onOpenChange={(o) => !o && closeDialog()}
        title={t('New File')}
        description={t('Create a new file in this directory')}
        onConfirm={(name) => ops.createFile.mutate({ body: { path: `${dialog.entryPath}/${name}` } })}
      />
      <FileNameDialog
        open={dialog.type === 'newFolder'}
        onOpenChange={(o) => !o && closeDialog()}
        title={t('New Folder')}
        description={t('Create a new folder in this directory')}
        onConfirm={(name) => ops.createDirectory.mutate({ body: { path: `${dialog.entryPath}/${name}` } })}
      />
      <FileNameDialog
        open={dialog.type === 'rename'}
        onOpenChange={(o) => !o && closeDialog()}
        title={t('Rename')}
        defaultValue={dialog.entryName}
        onConfirm={(newName) => ops.renamePath.mutate({ body: { path: dialog.entryPath, newName } })}
      />
      <FilePathDialog
        open={dialog.type === 'copy'}
        onOpenChange={(o) => !o && closeDialog()}
        title={t('Copy to...')}
        description={t('Select destination directory')}
        onConfirm={(dest) => ops.copyPath.mutate({ body: { sourcePath: dialog.entryPath, destinationPath: `${dest}/${dialog.entryName}` } })}
      />
      <FilePathDialog
        open={dialog.type === 'move'}
        onOpenChange={(o) => !o && closeDialog()}
        title={t('Move to...')}
        description={t('Select destination directory')}
        onConfirm={(dest) => ops.movePath.mutate({ body: { sourcePath: dialog.entryPath, destinationPath: `${dest}/${dialog.entryName}` } })}
      />
      <DeleteConfirmDialog
        open={dialog.type === 'delete'}
        onOpenChange={(o) => !o && closeDialog()}
        entryName={dialog.entryName}
        isDirectory={dialog.entryType === 'directory'}
        onConfirm={(recursive) => {
          ops.deletePath.mutate({ query: { path: dialog.entryPath, recursive: recursive || undefined } });
          closeDialog();
        }}
      />
    </>
  );
}

/* ── FlatDirectory: single-level listing ────────── */

interface FlatDirectoryProps {
  dirPath: string;
  selectedFile: string | null;
  onFileClick: (path: string) => void;
  onDirClick: (path: string) => void;
  openDialog: (type: DialogState['type'], path: string, name: string, entryType: 'file' | 'directory') => void;
  ops: ReturnType<typeof useFileOperations>;
  onUpload: (files: FileList, destinationPath: string) => void;
}

function FlatDirectory({ dirPath, selectedFile, onFileClick, onDirClick, openDialog, ops, onUpload }: FlatDirectoryProps) {
  const { t } = useTranslation();

  const { data: entries, isLoading } = useQuery({
    ...filesReadTreeOptions({ query: { root: dirPath } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-3 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('Loading...')}
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <div className="px-3 py-8 text-center text-xs italic text-muted-foreground">
        {t('Empty directory')}
      </div>
    );
  }

  return (
    <div className="py-1">
      {entries.map((entry) => (
        <TreeRow
          key={entry.path}
          icon={entry.type === 'directory' ? 'directory' : 'file'}
          name={entry.name}
          path={entry.path}
          selected={entry.path === selectedFile}
          onClick={() => entry.type === 'file' ? onFileClick(entry.path) : undefined}
          onDoubleClick={() => entry.type === 'directory' ? onDirClick(entry.path) : undefined}
          openDialog={openDialog}
          ops={ops}
          onUpload={onUpload}
        />
      ))}
    </div>
  );
}

/* ── TreeRow (draggable + droppable for dirs) ───── */

interface TreeRowProps {
  icon: 'file' | 'directory';
  name: string;
  path: string;
  selected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  openDialog: (type: DialogState['type'], path: string, name: string, entryType: 'file' | 'directory') => void;
  ops: ReturnType<typeof useFileOperations>;
  onUpload: (files: FileList, destinationPath: string) => void;
}

function TreeRow({ icon, name, path: entryPath, selected, onClick, onDoubleClick, openDialog, ops, onUpload }: TreeRowProps) {
  const isDir = icon === 'directory';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { ref: dragRef, isDragging } = useDraggable({
    id: `drag-${entryPath}`,
    data: { path: entryPath, name, type: icon },
    plugins: [Feedback.configure({ feedback: 'clone' })],
  });

  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `drop-${entryPath}`,
    disabled: !isDir,
    data: { path: entryPath },
  });

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      dragRef(el);
      if (isDir) dropRef(el);
    },
    [dragRef, dropRef, isDir],
  );

  const actions = {
    onNewFile: () => openDialog('newFile', entryPath, name, icon),
    onNewFolder: () => openDialog('newFolder', entryPath, name, icon),
    onRename: () => openDialog('rename', entryPath, name, icon),
    onCopy: () => openDialog('copy', entryPath, name, icon),
    onMove: () => openDialog('move', entryPath, name, icon),
    onDelete: () => openDialog('delete', entryPath, name, icon),
    onRefresh: () => ops.refresh(entryPath, icon),
    onDownload: () => { if (!isDir) void ops.downloadFile(entryPath); },
    onUploadFiles: () => fileInputRef.current?.click(),
    onUploadFolder: () => folderInputRef.current?.click(),
    onAttachToChat: () => {
      window.dispatchEvent(
        new CustomEvent('codex-webui:attach-file', { detail: { name, path: entryPath } }),
      );
    },
  };

  const handleNativeDragOver = useCallback((e: React.DragEvent) => {
    if (!isDir) return;
    if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.stopPropagation(); }
  }, [isDir]);

  const handleNativeDrop = useCallback((e: React.DragEvent) => {
    if (!isDir || e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    onUpload(e.dataTransfer.files, entryPath);
  }, [isDir, entryPath, onUpload]);

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onUpload(e.target.files, entryPath);
    e.target.value = '';
  };

  return (
    <div
      ref={mergedRef}
      className={cn(
        'flex w-full items-center gap-1.5 px-3 py-1 text-xs transition-colors hover:bg-accent/50',
        selected && 'bg-accent text-accent-foreground',
        isMenuOpen && !selected && 'bg-accent/60 text-accent-foreground',
        isDropTarget && isDir && 'bg-primary/15 ring-1 ring-primary/40',
        isDragging && 'opacity-40',
      )}
      onDragOver={handleNativeDragOver}
      onDrop={handleNativeDrop}
    >
      <FileContextMenu type={icon} actions={actions} onOpenChange={setIsMenuOpen}>
        {/* Use div instead of button — buttons capture pointer events and block dnd-kit drag */}
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={(e) => { if (e.key === 'Enter') { if (onDoubleClick) onDoubleClick(); else onClick(); } }}
          className="flex min-w-0 flex-1 cursor-default items-center gap-1.5 text-left"
        >
          {isDir ? (
            <>
              <Folder className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span className="min-w-0 truncate">{name}</span>
              <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
            </>
          ) : (
            <>
              <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{name}</span>
            </>
          )}
        </div>
      </FileContextMenu>

      {isDir && (
        <>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUploadChange} />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is not in React's InputHTMLAttributes
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleUploadChange}
          />
        </>
      )}
    </div>
  );
}
