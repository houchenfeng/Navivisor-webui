/** Native audio preview using the authenticated preview URL. */
import { Music } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildPreviewUrl, type PreviewSource } from './preview-source';

interface Props {
  source: PreviewSource;
}

/** Stable key for render-phase state reset when source changes. */
function sourceKey(source: PreviewSource): string {
  return source.kind === 'file' ? source.filePath : `${source.archivePath}:${source.entryPath}`;
}

export function AudioViewer({ source }: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const key = sourceKey(source);

  // Reset error when source changes (adjusting state during render)
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setError(false);
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Music className="h-8 w-8 opacity-40" />
        <span className="text-sm">{t('Failed to load audio')}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
      <Music className="h-10 w-10 text-muted-foreground opacity-50" />
      <audio
        key={key}
        src={buildPreviewUrl(source)}
        controls
        className="w-full max-w-xl"
        onError={() => setError(true)}
      />
    </div>
  );
}
