/** REST endpoint for persisted turn error hydration. */
import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-responses.dto';
import { ThreadTurnErrorsResponseDto } from './dto/turn-error.dto';
import { TurnErrorsService } from './turn-errors.service';

@ApiTags('threads')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@Controller('threads')
export class TurnErrorsController {
  constructor(private readonly turnErrorsService: TurnErrorsService) {}

  @Get(':threadId/turn-errors')
  @ApiOperation({ summary: 'Read persisted turn errors for a thread' })
  @ApiOkResponse({ type: ThreadTurnErrorsResponseDto })
  readThreadTurnErrors(
    @Param('threadId') threadId: string,
  ): ThreadTurnErrorsResponseDto {
    return this.turnErrorsService.readThreadErrors(threadId);
  }
}
