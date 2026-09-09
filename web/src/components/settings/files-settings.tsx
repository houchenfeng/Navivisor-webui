/** Files category runtime settings. */
import { useTranslation } from 'react-i18next';
import { SettingEditor } from './setting-editor';
import { useCategorySettings } from './use-category-settings';

export function FilesSettings() {
  const { t } = useTranslation();
  const ctx = useCategorySettings('files');

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('Files')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('File upload limits take effect after server restart.')}
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
          onSave={ctx.handleSave}
          onReset={ctx.handleReset}
        />
      ))}
    </section>
  );
}
