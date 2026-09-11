export const apiConfig = {
  /**
   * Remote submission API is opt-in via VITE_SUBMISSION_API_BASE_URL.
   * Default client uses local Demo mocks (see services/apiClient.ts).
   */
  baseUrl: (import.meta.env.VITE_SUBMISSION_API_BASE_URL as string | undefined)?.trim() || '',
  timeout: 30000,
} as const;

export type ApiConfig = typeof apiConfig;
