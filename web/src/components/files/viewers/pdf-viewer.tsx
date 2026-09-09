/** PDF viewer using react-pdf with a locally bundled pdf.js worker. */
import { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, FileText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { buildPreviewUrl, fetchPreviewBlob, type PreviewSource } from './preview-source';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  source: PreviewSource;
}

export function PdfViewer({ source }: Props) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Reset state when source changes (adjusting state during render, same pattern as ImageViewer)
  const [prevSource, setPrevSource] = useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setNumPages(0);
    setPageNumber(1);
    setZoom(1);
    setError(null);
    setBlobUrl(null);
  }

  const file = useMemo(() => blobUrl ?? (source.kind === 'file' ? buildPreviewUrl(source) : null), [blobUrl, source]);

  // Fetch blob URL for archive sources
  useEffect(() => {
    if (source.kind === 'file') return;
    let cancelled = false;
    let revokedUrl: string | null = null;
    void fetchPreviewBlob(source)
      .then((blob) => {
        if (cancelled) return;
        revokedUrl = URL.createObjectURL(blob);
        setBlobUrl(revokedUrl);
      })
      .catch(() => { if (!cancelled) setError(t('Failed to load PDF')); });
    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [source, t]);

  if (error) return <PdfMessage message={error} />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))} title={t('Previous page')}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs text-muted-foreground">
          {numPages ? t('Page {{page}} of {{total}}', { page: pageNumber, total: numPages }) : t('Loading...')}
        </span>
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={!numPages || pageNumber >= numPages} onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))} title={t('Next page')}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} title={t('Zoom out')}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setZoom((z) => Math.min(3, z + 0.1))} title={t('Zoom in')}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4">
        {file ? (
          <Document
            file={file}
            loading={<PdfMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />}
            onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
            onLoadError={() => setError(t('Failed to load PDF'))}
            onPassword={() => setError(t('Encrypted files are not supported'))}
          >
            <Page pageNumber={pageNumber} scale={zoom} />
          </Document>
        ) : (
          <PdfMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />
        )}
      </div>
    </div>
  );
}

function PdfMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      {icon ?? <FileText className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}
