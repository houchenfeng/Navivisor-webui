/**
 * Re-exports Codex notification types from the generated SDK.
 * Provides convenience aliases so downstream code doesn't change.
 */
import type {
  ThreadTokenUsageDto,
  TokenUsageBreakdownDto,
  ThreadStatusNotLoadedDto,
  ThreadStatusIdleDto,
  ThreadStatusSystemErrorDto,
  ThreadStatusActiveDto,
} from '@/generated/api';

export type TokenUsageBreakdown = TokenUsageBreakdownDto;
export type ThreadTokenUsage = ThreadTokenUsageDto;

export type ThreadStatusType =
  | ThreadStatusNotLoadedDto
  | ThreadStatusIdleDto
  | ThreadStatusSystemErrorDto
  | ThreadStatusActiveDto;
