/** OnlyOffice Docs integration for DOCX/XLSX/PPTX editing and preview. */
import { useEffect, useId, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { onlyOfficeGetConfig } from '@/generated/api/sdk.gen';

interface Props {
  filePath: string;
}

interface OnlyOfficeEditor {
  destroyEditor?: () => void;
}

interface OnlyOfficeApi {
  DocEditor: new (elementId: string, config: Record<string, unknown>) => OnlyOfficeEditor;
}

declare global {
  interface Window {
    DocsAPI?: OnlyOfficeApi;
  }
}

export function OnlyOfficeViewer({ filePath }: Props) {
  const { t } = useTranslation();
  const elementId = `onlyoffice-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const editorRef = useRef<OnlyOfficeEditor | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Reset status when filePath changes (adjusting state during render)
  const [prevFilePath, setPrevFilePath] = useState(filePath);
  if (filePath !== prevFilePath) {
    setPrevFilePath(filePath);
    setStatus('loading');
  }

  useEffect(() => {
    let cancelled = false;

    void onlyOfficeGetConfig({ query: { path: filePath }, throwOnError: true })
      .then(async ({ data }) => {
        await loadOnlyOfficeScript(data.scriptUrl);
        if (cancelled || !window.DocsAPI) return;
        editorRef.current?.destroyEditor?.();
        editorRef.current = new window.DocsAPI.DocEditor(elementId, data.config);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
  }, [elementId, filePath]);

  return (
    <div className="relative h-full">
      {status === 'loading' && (
        <OnlyOfficeMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />
      )}
      {status === 'error' && <OnlyOfficeMessage message={t('Failed to load OnlyOffice editor')} />}
      <div id={elementId} className="h-full w-full" />
    </div>
  );
}

/** Loads the OnlyOffice DocsAPI script, deduplicating concurrent requests. */
async function loadOnlyOfficeScript(scriptUrl: string): Promise<void> {
  if (window.DocsAPI) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-onlyoffice-url="${scriptUrl}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('OnlyOffice script failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.onlyofficeUrl = scriptUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('OnlyOffice script failed'));
    document.head.appendChild(script);
  });
}

function OnlyOfficeMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
      {icon ?? <FileText className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}
