/** Account-related notification payload types (server-push, not in generated SDK). */
import type { AccountDto } from '@/generated/api/types.gen';

export type PlanType = NonNullable<AccountDto['planType']>;
export type AuthMode = 'apikey' | 'chatgpt' | 'chatgptAuthTokens';

export interface AccountLoginCompletedNotification {
  loginId: string | null;
  success: boolean;
  error: string | null;
}

export interface AccountUpdatedNotification {
  authMode: AuthMode | null;
  planType: PlanType | null;
}
