import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ResearchWritingService } from './research-writing.service';

interface CompileBody {
  tex?: string;
  bib?: string;
  figures?: Record<string, string>;
}

@Controller('research/writing')
export class ResearchWritingController {
  constructor(private readonly service: ResearchWritingService) {}

  @Post('compile')
  @HttpCode(HttpStatus.OK)
  async compile(@Body() body: CompileBody, @Res() reply: FastifyReply) {
    try {
      const pdf = await this.service.compile(body);
      return reply
        .type('application/pdf')
        .header('Content-Disposition', 'attachment; filename="paper.pdf"')
        .send(pdf);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const message = error instanceof Error ? error.message : 'LaTeX 编译失败';
      throw new ServiceUnavailableException(message);
    }
  }
}
