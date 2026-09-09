/**
 * Account management facade over Codex app-server account JSON-RPC methods.
 * Runtime provider readiness remains owned by CodexStatusService; this service
 * only enriches account state with safe provider display metadata.
 */
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import {
  CodexStatusService,
  type CodexProviderStatus,
} from '../codex/codex-status.service';
import { CodexService } from '../codex/codex.service';
import type { v2 } from '../codex/codex-schema';
import type { LoginAccountDto } from './dto/account.dto';

export interface AccountReadResponse extends v2.GetAccountResponse {
  provider: CodexProviderStatus;
}

@Injectable()
export class AccountService {
  constructor(
    private readonly codex: CodexService,
    private readonly codexStatusService: CodexStatusService,
  ) {}

  /** Reads current Codex auth state and safe provider display metadata. */
  async readAccount(): Promise<AccountReadResponse> {
    const [account, provider] = await Promise.all([
      this.codex.request<v2.GetAccountResponse>('account/read', {
        refreshToken: false,
      } satisfies v2.GetAccountParams),
      this.codexStatusService.getProviderStatus(),
    ]);

    return { ...account, provider };
  }

  /** Starts API-key, ChatGPT browser, device-code, or external-token login. */
  async login(body: LoginAccountDto): Promise<v2.LoginAccountResponse> {
    const params = this.normalizeLoginParams(body);
    const response = await this.codex.request<v2.LoginAccountResponse>(
      'account/login/start',
      params,
    );
    this.codexStatusService.invalidateCache();
    return response;
  }

  /** Cancels an in-progress browser/device login by login id. */
  async cancelLogin(loginId: unknown): Promise<void> {
    const value = typeof loginId === 'string' ? loginId.trim() : '';
    if (!value) {
      throw BusinessException.badRequest(
        ErrorCode.account.loginIdRequired,
        'loginId is required',
      );
    }
    await this.codex.request<v2.CancelLoginAccountResponse>(
      'account/login/cancel',
      { loginId: value } satisfies v2.CancelLoginAccountParams,
    );
  }

  /** Logs out the Codex account tracked by app-server. */
  async logout(): Promise<void> {
    await this.codex.request<v2.LogoutAccountResponse>('account/logout');
    this.codexStatusService.invalidateCache();
  }

  /** Reads ChatGPT account quota/credits. API-key proxy mode may reject this. */
  async readRateLimits(): Promise<v2.GetAccountRateLimitsResponse> {
    return this.codex.request<v2.GetAccountRateLimitsResponse>(
      'account/rateLimits/read',
    );
  }

  private normalizeLoginParams(body: LoginAccountDto): v2.LoginAccountParams {
    switch (body?.type) {
      case 'apiKey': {
        const apiKey =
          typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
        if (!apiKey) {
          throw BusinessException.badRequest(
            ErrorCode.account.apiKeyRequired,
            'apiKey is required',
          );
        }
        return { type: 'apiKey', apiKey };
      }
      case 'chatgpt':
        return { type: 'chatgpt' };
      case 'chatgptDeviceCode':
        return { type: 'chatgptDeviceCode' };
      case 'chatgptAuthTokens': {
        const accessToken =
          typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
        const chatgptAccountId =
          typeof body.chatgptAccountId === 'string'
            ? body.chatgptAccountId.trim()
            : '';
        if (!accessToken) {
          throw BusinessException.badRequest(
            ErrorCode.account.accessTokenRequired,
            'accessToken is required',
          );
        }
        if (!chatgptAccountId) {
          throw BusinessException.badRequest(
            ErrorCode.account.chatgptAccountIdRequired,
            'chatgptAccountId is required',
          );
        }
        return {
          type: 'chatgptAuthTokens',
          accessToken,
          chatgptAccountId,
          chatgptPlanType: body.chatgptPlanType ?? null,
        };
      }
      default:
        throw BusinessException.badRequest(
          ErrorCode.account.invalidLoginType,
          'Invalid login type',
        );
    }
  }
}
