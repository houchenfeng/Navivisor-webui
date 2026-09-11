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
  async get(@Param('runId') runId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    const task = await this.service.get(runId);
    if (!task) throw new NotFoundException('检索任务不存在或已过期。');
    return task;
  }

  @Post('tasks/:runId/candidates')
  async generateCandidates(@Param('runId') runId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    try {
      return await this.service.generateCandidates(runId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'TASK_NOT_FOUND') throw new NotFoundException('检索任务不存在或已过期。');
      if (message === 'SEARCH_NOT_COMPLETED') throw new BadRequestException('请先完成第一环节的文献检索。');
      if (message === 'NO_SEARCH_RESULTS') throw new BadRequestException('没有可用于生成候选课题的文献。');
      throw new BadRequestException('无法创建候选课题任务。');
    }
  }

  @Delete('tasks/:runId')
  async cancel(@Param('runId') runId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    if (!await this.service.cancel(runId)) throw new NotFoundException('任务已结束或不存在。');
    return { runId, status: 'cancelled' as const };
  }

  @Post('tasks/:runId/core-literature')
  async generateCoreLiterature(@Param('runId') runId: string, @Req() request: FastifyRequest) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    const body = (request.body ?? {}) as { label?: string };
    try {
      return await this.service.generateCoreLiterature(runId, body.label ?? '');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'TASK_NOT_FOUND') throw new NotFoundException('检索任务不存在或已过期。');
      if (message === 'TOPIC_NOT_CONFIRMED') throw new BadRequestException('请先完成候选课题生成。');
      if (message === 'CANDIDATE_NOT_FOUND') throw new BadRequestException('请选择有效的候选课题。');
      throw new BadRequestException('无法创建核心文献检索任务。');
    }
  }
}
