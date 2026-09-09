/**
 * File tree toolbar: breadcrumb (up + dir name), refresh all, upload buttons.
 */
import { useRef } from 'react';
import { ChevronUp, FolderUp, RefreshCw, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useFilesStore } from '@/stores/files-store';

interface FileToolbarProps {
  /** Called when user selects files or folder to upload into current root. */
  onUpload: (files: FileList, destinationPath: string) => void;
}

export function FileToolbar({ onUpload }: FileToolbarProps) {
  const { t } = useTranslation();
  const rootDir = useFilesStore((s) => s.rootDir);
  const navigateUp = useFilesStore((s) => s.navigateUp);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!rootDir) return null;

  const dirName = rootDir.split('/').pop() || rootDir;

  const refreshAll = () => {
    void queryClient.invalidateQueries({
      predicate: ({ queryKey }) => {
        const key = queryKey[0] as { _id?: string } | undefined;
        return key?._id === 'filesReadTree';
      },
    });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length && rootDir) {
      onUpload(files, rootDir);
    }
    e.target.value = '';
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length && rootDir) {
      onUpload(files, rootDir);
    }
    e.target.value = '';
  };

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
      <button
        type="button"
        onClick={() => navigateUp()}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        title={t('Go up')}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <span className="truncate text-xs text-muted-foreground" title={rootDir}>
        {dirName}
      </span>

      <div className="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleFileUpload}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title={t('Upload files')}
        >
          <Upload className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title={t('Upload folder')}
        >
          <FolderUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={refreshAll}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          title={t('Refresh')}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is not in React's InputHTMLAttributes
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderChange}
      />
    </div>
  );
}
