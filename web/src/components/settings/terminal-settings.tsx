/** Terminal category runtime settings. */
import { useTranslation } from 'react-i18next';
import { SettingEditor } from './setting-editor';
import { useCategorySettings } from './use-category-settings';
import { useTerminalStore } from '@/stores/terminal-store';

export function TerminalSettings() {
  const { t } = useTranslation();
  const refreshTerminalConfig = useTerminalStore((s) => s.refreshConfig);
  const ctx = useCategorySettings('terminal');

  const handleSave = (setting: Parameters<typeof ctx.handleSave>[0]) => {
    ctx.handleSave(setting);
    void refreshTerminalConfig();
  };

  const handleReset = (key: string) => {
    ctx.handleReset(key);
    void refreshTerminalConfig();
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('Terminal')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(
            'Runtime changes apply only to new terminals and future detach timers.',
          )}
        </p>
      </div>

      {ctx.isLoading && (
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
          {t('Loading...')}
        </div>
      )}

      {ctx.settings.map((setting) => (
        <SettingEditor
          key={setting.key}
          setting={setting}
          draft={ctx.drafts[setting.key] ?? ''}
          disabled={ctx.isSaving}
          onDraftChange={ctx.handleDraftChange}
          onSave={handleSave}
          onReset={handleReset}
        />
      ))}
    </section>
  );
}
