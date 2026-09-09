/** Archive browser: lists entries and dispatches selected entry to read-only viewers. */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, ChevronRight, File, Folder, Loader2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { archiveListArchiveOptions } from '@/generated/api/@tanstack/react-query.gen';
import type { ArchiveEntryDto } from '@/generated/api/types.gen';
import { getFileCategory } from '@/lib/file-category';
import { FileContentViewer } from '.';
import type { PreviewSource } from './preview-source';

interface Props {
  filePath: string;
}

export function ArchiveViewer({ filePath }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ArchiveEntryDto | null>(null);

  // Reset selection when archive file changes (adjusting state during render)
  const [prevFilePath, setPrevFilePath] = useState(filePath);
  if (filePath !== prevFilePath) {
    setPrevFilePath(filePath);
    if (selected) setSelected(null);
  }

  const query = useQuery(archiveListArchiveOptions({ query: { path: filePath } }));

  const firstFile = useMemo(() => findFirstFile(query.data?.entries ?? []), [query.data]);
  const active = selected ?? firstFile;

  if (query.isLoading) {
    return <ArchiveMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />;
  }
  if (query.error) return <ArchiveMessage message={t('Failed to load archive')} />;

  return (
    <div className="grid h-full grid-cols-[minmax(14rem,20rem)_1fr]">
      <div className="min-h-0 overflow-auto border-r border-border bg-card/30 p-2">
        {(query.data?.entries ?? []).length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">{t('Empty archive')}</div>
        ) : (
          query.data?.entries.map((entry) => (
            <ArchiveTreeNode key={entry.path} entry={entry} selectedPath={active?.path ?? null} onSelect={setSelected} />
          ))
        )}
      </div>
      <div className="min-h-0">
        {active ? (
          <ArchiveEntryPreview archivePath={filePath} entry={active} />
        ) : (
          <ArchiveMessage icon={<Archive className="h-5 w-5 opacity-50" />} message={t('Select an archive entry to preview')} />
        )}
      </div>
    </div>
  );
}

function ArchiveTreeNode({
  entry,
  selectedPath,
  onSelect,
}: {
  entry: ArchiveEntryDto;
  selectedPath: string | null;
  onSelect: (entry: ArchiveEntryDto) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isDirectory = entry.type === 'directory';
  const isSelected = selectedPath === entry.path;

  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs hover:bg-accent/50 ${isSelected ? 'bg-accent text-accent-foreground' : ''}`}
        onClick={() => (isDirectory ? setExpanded((value) => !value) : onSelect(entry))}
      >
        {isDirectory ? (
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        ) : (
          <span className="h-3 w-3" />
        )}
        {isDirectory ? <Folder className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5" />}
        <span className="truncate">{entry.name}</span>
        {entry.encrypted && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
      </button>
      {isDirectory && expanded && (
        <div className="ml-4">
          {(entry.children ?? []).map((child) => (
            <ArchiveTreeNode key={child.path} entry={child} selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveEntryPreview({ archivePath, entry }: { archivePath: string; entry: ArchiveEntryDto }) {
  const { t } = useTranslation();
  const source = useMemo<PreviewSource>(() => ({
    kind: 'archive',
    archivePath,
    entryPath: entry.path,
    label: entry.path,
    size: entry.size,
  }), [archivePath, entry.path, entry.size]);
  const category = getFileCategory(entry.path);

  if (entry.encrypted) return <ArchiveMessage message={t('Encrypted files are not supported')} />;
  if (entry.unsupported) return <ArchiveMessage message={t('Archive entry type is not supported')} />;
  if (entry.size !== undefined && entry.size > 50 * 1024 * 1024) {
    return <ArchiveMessage message={t('Archive entry exceeds the preview size limit')} />;
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span className="truncate">{entry.path}</span>
        <span className="ml-auto">{category}</span>
      </div>
      <div className="min-h-0 flex-1">
        <FileContentViewer filePath={entry.path} source={source} />
      </div>
    </div>
  );
}

function findFirstFile(entries: ArchiveEntryDto[]): ArchiveEntryDto | null {
  for (const entry of entries) {
    if (entry.type === 'file') return entry;
    const child = findFirstFile(entry.children ?? []);
    if (child) return child;
  }
  return null;
}

function ArchiveMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
      {icon ?? <Archive className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}
