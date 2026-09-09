/** REST controller for MCP server status and reload operations. */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import { McpServersService } from './mcp-servers.service';
import {
  MCP_SERVER_STATUS_DETAIL_VALUES,
  McpServerOauthLoginRequestDto,
  McpServerOauthLoginResponseDto,
  McpServersListResponseDto,
} from './dto/mcp-servers.dto';
import type { v2 } from '../codex/codex-schema';

@ApiTags('mcp-servers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@ApiBadRequestResponse({ type: ApiErrorResponseDto })
@Controller('mcp-servers')
export class McpServersController {
  constructor(private readonly mcpServersService: McpServersService) {}

  /** Lists MCP server status from app-server. */
  @Get()
  @ApiOperation({ summary: 'List MCP server status' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'detail',
    required: false,
    enum: MCP_SERVER_STATUS_DETAIL_VALUES,
  })
  @ApiOkResponse({ type: McpServersListResponseDto })
  listServers(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('detail') detail?: string,
  ): Promise<v2.ListMcpServerStatusResponse> {
    return this.mcpServersService.listServers({
      cursor: cursor?.trim() || undefined,
      limit: this.parseLimit(limit),
      detail: this.parseDetail(detail),
    });
  }

  /** Reloads all configured MCP servers. */
  @Post('reload')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reload all MCP servers' })
  @ApiNoContentResponse()
  reloadAll(): Promise<void> {
    return this.mcpServersService.reloadAll();
  }

  /** Starts an OAuth login flow for one MCP server. */
  @Post('oauth/login')
  @ApiOperation({ summary: 'Start MCP server OAuth login' })
  @ApiBody({ type: McpServerOauthLoginRequestDto })
  @ApiOkResponse({ type: McpServerOauthLoginResponseDto })
  startOauthLogin(
    @Body() body: McpServerOauthLoginRequestDto | undefined,
  ): Promise<v2.McpServerOauthLoginResponse> {
    return this.mcpServersService.startOauthLogin(
      this.parseOauthLoginBody(body),
    );
  }

  private parseLimit(value?: string): number | undefined {
    if (!value) return undefined;
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw BusinessException.badRequest(
        ErrorCode.validation.fieldInvalid,
        'limit must be an integer between 1 and 100',
        { field: 'limit' },
      );
    }
    return limit;
  }

  private parseDetail(value?: string): v2.McpServerStatusDetail | undefined {
    if (!value) return undefined;
    if (
      !(MCP_SERVER_STATUS_DETAIL_VALUES as readonly string[]).includes(value)
    ) {
      throw BusinessException.badRequest(
        ErrorCode.mcp.invalidServerDetail,
        'Invalid MCP server detail',
      );
    }
    return value as v2.McpServerStatusDetail;
  }

  private parseOauthLoginBody(
    body: McpServerOauthLoginRequestDto | undefined,
  ): v2.McpServerOauthLoginParams {
    if (!body) {
      throw BusinessException.badRequest(
        ErrorCode.validation.bodyRequired,
        'Request body is required',
      );
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      throw BusinessException.badRequest(
        ErrorCode.validation.fieldRequired,
        'name is required',
        { field: 'name' },
      );
    }

    return {
      name,
      scopes: this.parseScopes(body.scopes),
      timeoutSecs: this.parseTimeoutSecs(body.timeoutSecs),
    };
  }

  private parseScopes(value: unknown): string[] | undefined {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) {
      throw BusinessException.badRequest(
        ErrorCode.mcp.scopesInvalid,
        'scopes must be an array of strings',
      );
    }

    const scopes = value.map((scope) => {
      if (typeof scope !== 'string' || !scope.trim()) {
        throw BusinessException.badRequest(
          ErrorCode.mcp.scopesEmpty,
          'scopes must contain non-empty strings',
        );
      }
      return scope.trim();
    });
    return scopes.length > 0 ? scopes : undefined;
  }

  private parseTimeoutSecs(value: unknown): bigint | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw BusinessException.badRequest(
        ErrorCode.mcp.timeoutInvalid,
        'timeoutSecs must be an integer',
      );
    }
    if (value < 1 || value > 600) {
      throw BusinessException.badRequest(
        ErrorCode.mcp.timeoutTooLarge,
        'timeoutSecs must be an integer between 1 and 600',
        { max: 600 },
      );
    }
    return BigInt(value);
  }
}
