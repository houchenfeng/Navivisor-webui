/** Font preview with dynamic @font-face loading and opentype.js metadata extraction. */
import { useEffect, useId, useState } from 'react';
import opentype from 'opentype.js';
import { Loader2, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { fetchPreviewBlob, previewSourceLabel, type PreviewSource } from './preview-source';

interface Props {
  source: PreviewSource;
}

interface FontMetadata {
  family: string;
  subfamily: string;
  version: string;
  weight: string;
  glyphCount: number;
}

const DEFAULT_SAMPLE = 'The quick brown fox jumps over the lazy dog 0123456789\n敏捷的棕色狐狸跃过懒狗';

export function FontViewer({ source }: Props) {
  const { t } = useTranslation();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fontFamily = `codex-font-preview-${id}`;
  const [metadata, setMetadata] = useState<FontMetadata | null>(null);
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when source changes (adjusting state during render)
  const [prevSource, setPrevSource] = useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setMetadata(null);
    setBlobUrl(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    void fetchPreviewBlob(source)
      .then(async (blob) => {
        const buffer = await blob.arrayBuffer();
        if (cancelled) return;
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
        const font = opentype.parse(buffer);
        setMetadata({
          family: englishName(font.names.fontFamily) ?? previewSourceLabel(source),
          subfamily: englishName(font.names.fontSubfamily) ?? t('Unknown'),
          version: englishName(font.names.version) ?? t('Unknown'),
          weight: String(font.tables.os2?.usWeightClass ?? t('Unknown')),
          glyphCount: font.glyphs.length,
        });
      })
      .catch(() => { if (!cancelled) setError(t('Failed to load font')); });

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [source, t]);

  if (error) return <FontMessage message={error} />;
  if (!blobUrl || !metadata) {
    return <FontMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />;
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <style>{`@font-face { font-family: '${fontFamily}'; src: url('${blobUrl}'); }`}</style>
      <div className="mb-4 grid gap-2 rounded-lg border border-border bg-card/50 p-4 text-sm md:grid-cols-2">
        <Metadata label={t('Family')} value={metadata.family} />
        <Metadata label={t('Style')} value={metadata.subfamily} />
        <Metadata label={t('Weight')} value={metadata.weight} />
        <Metadata label={t('Glyphs')} value={String(metadata.glyphCount)} />
        <Metadata label={t('Version')} value={metadata.version} />
      </div>
      <Textarea value={sample} onChange={(event) => setSample(event.target.value)} className="mb-4 min-h-24" />
      <div className="rounded-lg border border-border bg-background p-6 text-4xl leading-relaxed" style={{ fontFamily }}>
        {sample}
      </div>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-words font-medium">{value}</div>
    </div>
  );
}

function FontMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      {icon ?? <Type className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}

function englishName(value: { en?: string } | undefined): string | null {
  return value?.en?.trim() || null;
}
