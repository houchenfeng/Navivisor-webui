/** DOCX viewer rendered with docx-preview into an isolated scroll container. */
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { FileText, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchPreviewBytes, type PreviewSource } from './preview-source';

interface Props {
  source: PreviewSource;
}

export function DocxViewer({ source }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    setLoading(true);
    setError(null);

    void fetchPreviewBytes(source)
      .then(({ buffer }) =>
        renderAsync(buffer, container, container, {
          className: 'docx',
          inWrapper: true,
          renderComments: false,
          renderChanges: false,
          renderAltChunks: false,
        }),
      )
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(t('Failed to load document'));
        }
      });

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [source, t]);

  return (
    <div className="relative h-full overflow-auto bg-muted/20 p-4">
      {loading && <DocxMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />}
      {error && <DocxMessage message={error} />}
      <div ref={containerRef} className="mx-auto max-w-5xl bg-background text-foreground" />
    </div>
  );
}

function DocxMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/80 text-sm text-muted-foreground">
      {icon ?? <FileText className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}
