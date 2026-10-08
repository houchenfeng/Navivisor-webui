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
    const body = (request.body ?? {}) as { label?: string; projectId?: string };
    try {
      return await this.service.generateCoreLiterature(runId, body.label ?? '', body.projectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'TASK_NOT_FOUND') throw new NotFoundException('检索任务不存在或已过期。');
      if (message === 'TOPIC_NOT_CONFIRMED') throw new BadRequestException('请先完成候选课题生成。');
      if (message === 'CANDIDATE_NOT_FOUND') throw new BadRequestException('请选择有效的候选课题。');
      throw new BadRequestException('无法创建核心文献检索任务。');
    }
  }

  // ---------------------------------------------------------------------------
  // First-search analysis stages (T28). The UI polls `stages` and reads the
  // rendered Markdown through `artifacts/:name`.
  // ---------------------------------------------------------------------------

  @Get('tasks/:runId/stages')
  async getStages(@Param('runId') runId: string) {
    this.assertRunId(runId);
    try {
      return await this.service.getStages(runId);
    } catch {
      throw new NotFoundException('检索任务不存在或已过期。');
    }
  }

  @Post('tasks/:runId/relevance-check')
  async runRelevanceCheck(@Param('runId') runId: string) {
    this.assertRunId(runId);
    try {
      return await this.service.runRelevanceCheckStage(runId);
    } catch (error) {
      throw this.toStageError(error, {
        RELEVANCE_ROUNDS_EXCEEDED: '相关度自检最多进行 3 轮。',
        QUERY_PLAN_MISSING: '缺少检索式规划结果，无法自检。',
        RUN_NOT_COMPLETED: '请先完成第一环节的文献检索。',
        AI_PROVIDER_UNAVAILABLE: '当前没有可用的 AI 服务，无法执行相关度自检。',
      });
    }
  }

  @Post('tasks/:runId/venue-tiering')
  async runVenueTiering(@Param('runId') runId: string) {
    this.assertRunId(runId);
    try {
      return await this.service.runVenueTieringStage(runId);
    } catch (error) {
      throw this.toStageError(error, {
        RUN_NOT_COMPLETED: '请先完成第一环节的文献检索。',
        AI_PROVIDER_UNAVAILABLE: '当前没有可用的 AI 服务，无法执行期刊分层。',
      });
    }
  }

  @Post('tasks/:runId/landscape')
  async runLandscape(@Param('runId') runId: string) {
    this.assertRunId(runId);
    try {
      return await this.service.runLandscapeStage(runId);
    } catch (error) {
      throw this.toStageError(error, {
        RUN_NOT_COMPLETED: '请先完成第一环节的文献检索。',
        AI_PROVIDER_UNAVAILABLE: '当前没有可用的 AI 服务，无法执行态势分析。',
      });
    }
  }

  @Post('tasks/:runId/research-gaps')
  async runResearchGaps(@Param('runId') runId: string) {
    this.assertRunId(runId);
    try {
      return await this.service.runResearchGapsStage(runId);
    } catch (error) {
      throw this.toStageError(error, {
        LANDSCAPE_MISSING: '请先完成研究态势分析。',
        RUN_NOT_COMPLETED: '请先完成第一环节的文献检索。',
        AI_PROVIDER_UNAVAILABLE: '当前没有可用的 AI 服务，无法识别研究空白。',
      });
    }
  }

  @Get('tasks/:runId/artifacts/:name')
  async readArtifact(@Param('runId') runId: string, @Param('name') name: string) {
    this.assertRunId(runId);
    try {
      const content = await this.service.readArtifact(runId, name);
      return { name, content };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'INVALID_ARTIFACT_NAME') throw new BadRequestException('产物名称无效。');
      if (message === 'RUN_NOT_FOUND') throw new NotFoundException('检索任务不存在或已过期。');
      throw new NotFoundException('产物不存在或尚未生成。');
    }
  }

  private assertRunId(runId: string): void {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
  }

  /** Maps a stage failure message onto a 4xx with an operator-readable reason. */
  private toStageError(error: unknown, messages: Record<string, string>): Error {
    const message = error instanceof Error ? error.message : '';
    if (message === 'RUN_NOT_FOUND') return new NotFoundException('检索任务不存在或已过期。');
    const known = messages[message];
    if (known) return new BadRequestException(known);
    return new BadRequestException('分析阶段执行失败，请稍后重试。');
  }

  @Post('tasks/:runId/import')
  async importCoreLiterature(@Param('runId') runId: string, @Req() request: FastifyRequest) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('任务标识无效。');
    const body = (request.body ?? {}) as { projectId?: string };
    if (typeof body.projectId !== 'string' || !body.projectId.trim()) throw new BadRequestException('研究项目无效。');
    try {
      return await this.service.importCoreLiterature(runId, body.projectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'TASK_NOT_FOUND') throw new NotFoundException('检索任务不存在或已过期。');
      if (message === 'CORE_NOT_COMPLETED') throw new BadRequestException('核心文献任务尚未完成，暂时无法导入。');
      throw new BadRequestException('核心文献导入实验工作区失败。');
    }
  }
}
