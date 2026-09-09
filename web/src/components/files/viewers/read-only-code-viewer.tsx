/** Read-only Monaco viewer for archive entry text/code previews. */
import Editor from '@monaco-editor/react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchPreviewText, previewSourceLabel, type PreviewSource } from './preview-source';

interface Props {
  source: PreviewSource;
}

export function ReadOnlyCodeViewer({ source }: Props) {
  const { t } = useTranslation();
  const label = previewSourceLabel(source);
  const { data, isLoading, error } = useQuery({
    queryKey: ['preview-text', source],
    queryFn: () => fetchPreviewText(source),
  });

  if (isLoading) {
    return <CenteredMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />;
  }
  if (error) return <CenteredMessage message={t('Failed to load file')} />;

  return (
    <Editor
      path={label}
      value={data ?? ''}
      language={guessLanguage(label)}
      theme="vs-dark"
      height="100%"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 8 },
      }}
    />
  );
}

function CenteredMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      {icon}
      {message}
    </div>
  );
}

/** Maps file extension to Monaco language identifier. */
function guessLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    py: 'python',
    rs: 'rust',
    go: 'go',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    dockerfile: 'dockerfile',
    toml: 'ini',
    env: 'ini',
  };
  return map[ext] ?? 'plaintext';
}
