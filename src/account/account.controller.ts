/** REST controller for Codex account state, login, logout, and quota reads. */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import { AccountService, type AccountReadResponse } from './account.service';
import {
  AccountReadResponseDto,
  CancelLoginAccountDto,
  LoginAccountDto,
  LoginAccountResponseDto,
  AccountRateLimitsResponseDto,
} from './dto/account.dto';
import type { v2 } from '../codex/codex-schema';

@ApiTags('account')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@ApiBadRequestResponse({ type: ApiErrorResponseDto })
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /** Returns account/read plus safe provider metadata for custom API proxy mode. */
  @Get()
  @ApiOperation({ summary: 'Read Codex account state and provider metadata' })
  @ApiOkResponse({ type: AccountReadResponseDto })
  readAccount(): Promise<AccountReadResponse> {
    return this.accountService.readAccount();
  }

  /** Starts a Codex account login flow. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start Codex account login' })
  @ApiBody({ type: LoginAccountDto })
  @ApiOkResponse({ type: LoginAccountResponseDto })
  login(@Body() body: LoginAccountDto): Promise<v2.LoginAccountResponse> {
    return this.accountService.login(body);
  }

  /** Cancels a pending ChatGPT browser/device-code login flow. */
  @Post('login/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending Codex account login' })
  @ApiBody({ type: CancelLoginAccountDto })
  @ApiNoContentResponse()
  cancelLogin(@Body() body: CancelLoginAccountDto | undefined): Promise<void> {
    return this.accountService.cancelLogin(body?.loginId);
  }

  /** Logs out the Codex account tracked by app-server. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout Codex account' })
  @ApiNoContentResponse()
  logout(): Promise<void> {
    return this.accountService.logout();
  }

  /** Reads ChatGPT rate-limit and credit snapshots. */
  @Get('rate-limits')
  @ApiOperation({ summary: 'Read Codex account rate limits' })
  @ApiOkResponse({ type: AccountRateLimitsResponseDto })
  readRateLimits(): Promise<v2.GetAccountRateLimitsResponse> {
    return this.accountService.readRateLimits();
  }
}
