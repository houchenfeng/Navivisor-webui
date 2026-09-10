export const apiConfig = {
  baseUrl: 'https://6e20ae7d.r12.vip.cpolar.cn/api',
  timeout: 30000,
} as const;

export type ApiConfig = typeof apiConfig;
