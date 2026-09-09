/** Binary fallback viewer showing metadata and a hex dump of the first 256 bytes. */
import { useEffect, useMemo, useState } from 'react';
import { Binary, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { filesGetMetadata } from '@/generated/api/sdk.gen';
import { fetchPreviewBytes, type PreviewSource } from './preview-source';

interface Props {
  source: PreviewSource;
}

interface Metadata {
  size?: number;
  mimeType?: string;
}

export function BinaryViewer({ source }: Props) {
  const { t } = useTranslation();
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [metadata, setMetadata] = useState<Metadata>({ size: source.kind === 'archive' ? source.size : undefined });
  const [error, setError] = useState<string | null>(null);

  // Reset state when source changes (adjusting state during render)
  const [prevSource, setPrevSource] = useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setBytes(null);
    setError(null);
    setMetadata({ size: source.kind === 'archive' ? source.size : undefined });
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadMetadata(source), fetchPreviewBytes(source, 'bytes=0-255')])
      .then(([meta, result]) => {
        if (cancelled) return;
        setMetadata({
          size: meta.size ?? (source.kind === 'archive' ? source.size : undefined),
          mimeType: result.response.headers.get('content-type') ?? meta.mimeType,
        });
        setBytes(new Uint8Array(result.buffer));
      })
      .catch(() => { if (!cancelled) setError(t('Failed to load binary preview')); });
    return () => { cancelled = true; };
  }, [source, t]);

  const rows = useMemo(() => (bytes ? toHexRows(bytes) : []), [bytes]);

  if (error) return <BinaryMessage message={error} />;
  if (!bytes) return <BinaryMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />;

  return (
    <div className="h-full overflow-auto p-4 text-sm">
      <div className="mb-4 grid gap-2 rounded-lg border border-border bg-card/50 p-4 md:grid-cols-2">
        <div><span className="text-muted-foreground">{t('Size')}:</span> {metadata.size ?? t('Unknown')}</div>
        <div><span className="text-muted-foreground">{t('MIME type')}:</span> {metadata.mimeType ?? t('Unknown')}</div>
      </div>
      <pre className="overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-5">
        {rows.join('\n')}
      </pre>
    </div>
  );
}

async function loadMetadata(source: PreviewSource): Promise<Metadata> {
  if (source.kind === 'archive') return { size: source.size };
  try {
    const { data } = await filesGetMetadata({ query: { path: source.filePath }, throwOnError: true });
    return { size: data.size };
  } catch {
    return {};
  }
}

function toHexRows(bytes: Uint8Array): string[] {
  const rows: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const slice = bytes.slice(offset, offset + 16);
    const hex = Array.from(slice).map((value) => value.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(slice).map((value) => (value >= 32 && value <= 126 ? String.fromCharCode(value) : '.')).join('');
    rows.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(47, ' ')}  ${ascii}`);
  }
  return rows;
}

function BinaryMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      {icon ?? <Binary className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}
