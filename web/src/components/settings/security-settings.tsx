/** Security category runtime settings. */
import { useTranslation } from 'react-i18next';
import { SettingEditor } from './setting-editor';
import { useCategorySettings } from './use-category-settings';

export function SecuritySettings() {
  const { t } = useTranslation();
  const ctx = useCategorySettings('security');

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('Security')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(
            'Workspace root changes take effect immediately for new file operations.',
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
          onSave={ctx.handleSave}
          onReset={ctx.handleReset}
        />
      ))}
    </section>
  );
}
