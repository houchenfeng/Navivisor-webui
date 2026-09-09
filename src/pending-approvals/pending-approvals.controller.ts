/** REST controller for persisted app-server approval requests. */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BusinessException } from '../common/business.exception';
import { ErrorCode } from '../common/error-codes';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  PendingServerRequestDto,
  PendingServerRequestsResponseDto,
  RespondPendingServerRequestDto,
} from './dto/pending-approvals.dto';
import { PendingApprovalsService } from './pending-approvals.service';

@ApiTags('pending-approvals')
@ApiBearerAuth()
@Controller('pending-approvals')
export class PendingApprovalsController {
  constructor(private readonly approvals: PendingApprovalsService) {}

  @Get()
  @ApiOperation({ summary: 'List pending approval requests' })
  @ApiQuery({ name: 'threadIds', required: false })
  @ApiOkResponse({ type: PendingServerRequestsResponseDto })
  listPending(
    @Query('threadIds') threadIds?: string,
  ): PendingServerRequestsResponseDto {
    const ids = threadIds
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return { requests: this.approvals.listPending(ids) };
  }

  @Post(':requestId/respond')
  @ApiOperation({ summary: 'Respond to a pending approval request' })
  @ApiOkResponse({ type: PendingServerRequestDto })
  respond(
    @Param('requestId') requestId: string,
    @Body() body: RespondPendingServerRequestDto,
  ): PendingServerRequestDto {
    if (!body || !Object.prototype.hasOwnProperty.call(body, 'result')) {
      throw BusinessException.badRequest(
        ErrorCode.approvals.resultRequired,
        'result is required',
      );
    }
    return this.approvals.respondToRequest(
      requestId,
      body.result,
      body.clientId,
    );
  }
}
