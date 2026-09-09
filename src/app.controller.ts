import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { StatusResponseDto } from './app.dto';

@ApiBearerAuth()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Basic health check endpoint. */
  @Get('status')
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: StatusResponseDto })
  getStatus(): { status: string } {
    return this.appService.getStatus();
  }
}
