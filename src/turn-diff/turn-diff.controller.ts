/** REST endpoint for persisted per-turn cumulative diffs. */
import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import { ThreadTurnDiffsResponseDto } from './dto/turn-diff.dto';
import { TurnDiffService } from './turn-diff.service';

@ApiTags('threads')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@Controller('threads')
export class TurnDiffController {
  constructor(private readonly turnDiffService: TurnDiffService) {}

  @Get(':threadId/turn-diffs')
  @ApiOperation({ summary: 'Read persisted turn-level diffs for a thread' })
  @ApiOkResponse({ type: ThreadTurnDiffsResponseDto })
  readThreadTurnDiffs(
    @Param('threadId') threadId: string,
  ): ThreadTurnDiffsResponseDto {
    return this.turnDiffService.readThreadDiffs(threadId);
  }
}
