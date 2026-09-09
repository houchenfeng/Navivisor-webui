/**
 * Right-click context menu for file tree entries.
 * Actions vary based on whether the target is a file or directory.
 */
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Download,
  FilePlus,
  FolderPlus,
  FolderUp,
  MessageSquarePlus,
  Move,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export interface FileContextMenuActions {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onDownload: () => void;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  onAttachToChat?: () => void;
}

interface FileContextMenuProps {
  type: 'file' | 'directory';
  actions: FileContextMenuActions;
  /** Called when context menu open state changes — for highlighting the target row. */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function FileContextMenu({ type, actions, onOpenChange, children }: FileContextMenuProps) {
  const { t } = useTranslation();
  const isDir = type === 'directory';

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isDir && (
          <>
            <ContextMenuItem onClick={actions.onNewFile}>
              <FilePlus className="h-3.5 w-3.5" />
              {t('New File')}
            </ContextMenuItem>
            <ContextMenuItem onClick={actions.onNewFolder}>
              <FolderPlus className="h-3.5 w-3.5" />
              {t('New Folder')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={actions.onRename}>
          <Pencil className="h-3.5 w-3.5" />
          {t('Rename')}
        </ContextMenuItem>
        <ContextMenuItem onClick={actions.onCopy}>
          <Copy className="h-3.5 w-3.5" />
          {t('Copy to...')}
        </ContextMenuItem>
        <ContextMenuItem onClick={actions.onMove}>
          <Move className="h-3.5 w-3.5" />
          {t('Move to...')}
        </ContextMenuItem>
        {!isDir && (
          <ContextMenuItem onClick={actions.onDownload}>
            <Download className="h-3.5 w-3.5" />
            {t('Download')}
          </ContextMenuItem>
        )}
        {isDir && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onUploadFiles}>
              <Upload className="h-3.5 w-3.5" />
              {t('Upload files here...')}
            </ContextMenuItem>
            <ContextMenuItem onClick={actions.onUploadFolder}>
              <FolderUp className="h-3.5 w-3.5" />
              {t('Upload folder here...')}
            </ContextMenuItem>
          </>
        )}
        {actions.onAttachToChat && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onAttachToChat}>
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {t('Attach to chat')}
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={actions.onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t('Refresh')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={actions.onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('Delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
