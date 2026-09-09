/** Shared hook for category-based runtime settings: query, drafts, mutations. */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  settingsListSettings,
  settingsUpdateSetting,
  settingsResetSetting,
} from '@/generated/api/sdk.gen';
import { settingsListSettingsQueryKey } from '@/generated/api/@tanstack/react-query.gen';
import type { SettingDto } from '@/generated/api/types.gen';
import { showSnackbar } from '@/stores/snackbar-store';
import { formatSettingValue, parseDraftValue } from './setting-helpers';

type SettingCategory = SettingDto['category'];

export function useCategorySettings(category: SettingCategory) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>(
    {},
  );

  const settingsQuery = useQuery({
    queryKey: settingsListSettingsQueryKey({ query: { category } }),
    queryFn: async () => {
      const { data } = await settingsListSettings({
        query: { category },
        throwOnError: true,
      });
      return data;
    },
  });

  const settings = useMemo(
    () => settingsQuery.data?.settings ?? [],
    [settingsQuery.data],
  );

  const drafts = useMemo(() => {
    const base = Object.fromEntries(
      settings.map((s) => [s.key, formatSettingValue(s.value)]),
    );
    return { ...base, ...draftOverrides };
  }, [settings, draftOverrides]);

  const onMutationSuccess = () => {
    setDraftOverrides({});
    void queryClient.invalidateQueries({
      queryKey: settingsListSettingsQueryKey({ query: { category } }),
    });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: SettingDto['value'] | null }) => {
      const { data } = await settingsUpdateSetting({
        path: { key },
        body: { value },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: () => {
      onMutationSuccess();
      showSnackbar(t('Setting saved'), 'success');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (key: string) => {
      const { data } = await settingsResetSetting({
        path: { key },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: () => {
      onMutationSuccess();
      showSnackbar(t('Setting reset'), 'success');
    },
  });

  const handleDraftChange = (key: string, value: string) => {
    setDraftOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (setting: SettingDto) => {
    const parsed = parseDraftValue(setting, drafts[setting.key] ?? '');
    if (parsed.ok) {
      updateMutation.mutate({ key: setting.key, value: parsed.value });
    } else {
      showSnackbar(t(parsed.error), 'error');
    }
  };

  const handleReset = (key: string) => {
    resetMutation.mutate(key);
  };

  return {
    settings,
    drafts,
    isLoading: settingsQuery.isLoading,
    isSaving: updateMutation.isPending || resetMutation.isPending,
    handleDraftChange,
    handleSave,
    handleReset,
  };
}
