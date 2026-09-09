/** Shared helpers for runtime settings UI. */
import type { SettingDto } from '@/generated/api/types.gen';

export type SettingValue = SettingDto['value'];
export type RuntimeSetting = SettingDto;

export function parseDraftValue(
  setting: RuntimeSetting,
  draft: string,
): { ok: true; value: SettingValue } | { ok: false; error: string } {
  if (setting.type === 'number') {
    if (!draft.trim()) return { ok: false, error: 'Value is required' };
    const value = Number(draft);
    if (!Number.isFinite(value))
      return { ok: false, error: 'Value must be a number' };
    if (setting.constraints.integer && !Number.isInteger(value)) {
      return { ok: false, error: 'Value must be an integer' };
    }
    if (
      setting.constraints.min !== undefined &&
      value < setting.constraints.min
    ) {
      return { ok: false, error: 'Value is below the minimum' };
    }
    if (
      setting.constraints.max !== undefined &&
      value > setting.constraints.max
    ) {
      return { ok: false, error: 'Value is above the maximum' };
    }
    return { ok: true, value };
  }

  if (setting.type === 'boolean') {
    return { ok: true, value: draft === 'true' };
  }

  if (setting.type === 'json') {
    try {
      return { ok: true, value: JSON.parse(draft) as SettingValue };
    } catch {
      return { ok: false, error: 'Value must be valid JSON' };
    }
  }

  return { ok: true, value: draft };
}

export function formatSettingValue(value: SettingValue): string {
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function sectionLabel(section: string): string {
  const labels: Record<string, string> = {
    general: 'General',
    account: 'Account',
    codex: 'Codex',
    terminal: 'Terminal',
    files: 'Files',
    security: 'Security',
  };
  return labels[section] ?? section;
}

export function settingLabel(key: string): string {
  const label = key.split('.').at(-1) ?? key;
  return label
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase());
}

export function sourceLabel(source: RuntimeSetting['source']): string {
  if (source === 'db') return 'runtime override';
  if (source === 'env') return 'environment';
  return 'default';
}

export function sourceVariant(
  source: RuntimeSetting['source'],
): 'default' | 'secondary' | 'outline' {
  if (source === 'db') return 'default';
  if (source === 'env') return 'secondary';
  return 'outline';
}
