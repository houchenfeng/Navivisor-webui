import { BadRequestException, Controller, Delete, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ResearchTopicService, validateFirstSearchInput } from './research-topic.service';

@Controller('research/topic')
export class ResearchTopicController {
  constructor(private readonly service: ResearchTopicService) {}

  @Post('first-search')
  start(@Req() request: FastifyRequest) {
    try {
      return this.service.start(validateFirstSearchInput(request.body));
    } catch (error) {
      throw new BadRequestException(error instanceof Error && error.message.startsWith('INVALID_') ? '输入格式或范围不符合要求。' : '无法创建检索任务。');
    }
  }

  @Get('tasks/:runId')
  get(@Param('runId') runId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    const task = this.service.get(runId);
    if (!task) throw new NotFoundException('检索任务不存在或已过期。');
    return task;
  }

  @Delete('tasks/:runId')
  cancel(@Param('runId') runId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    if (!this.service.cancel(runId)) throw new NotFoundException('任务已结束或不存在。');
    return { runId, status: 'cancelled' as const };
  }
}
