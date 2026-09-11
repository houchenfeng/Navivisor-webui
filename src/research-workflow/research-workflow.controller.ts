import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { isResearchRunMode, isResearchStage } from './research-contracts';
import { ResearchCodexBridgeService } from './research-codex-bridge.service';
import { ResearchWorkflowService } from './research-workflow.service';

class CreateResearchProjectDto {
  @ApiProperty() name!: string;
}

class CreateResearchRunDto {
  @ApiProperty() stage!: string;
  @ApiProperty({ enum: ['simulated', 'real'] }) mode!: string;
  @ApiPropertyOptional({ type: [String] }) inputArtifactIds?: string[];
}

class StartResearchAgentRunDto extends CreateResearchRunDto {
  @ApiProperty() instructions!: string;
  @ApiPropertyOptional() model?: string;
  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'xhigh'] })
  effort?: 'low' | 'medium' | 'high' | 'xhigh';
}

class RetryResearchAgentRunDto {
  @ApiProperty() instructions!: string;
  @ApiPropertyOptional() model?: string;
  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'xhigh'] })
  effort?: 'low' | 'medium' | 'high' | 'xhigh';
}

@ApiTags('research-workflow')
@ApiBearerAuth()
@Controller('research/projects')
export class ResearchWorkflowController {
  constructor(
    private readonly workflow: ResearchWorkflowService,
    private readonly codexBridge: ResearchCodexBridgeService,
  ) {}

  @Post() createProject(@Body() body: CreateResearchProjectDto) {
    const name = body?.name?.trim();
    if (!name || name.length > 200)
      throw new BadRequestException(
        'Project name is required and must not exceed 200 characters',
      );
    return this.workflow.createProject(name);
  }

  @Get() listProjects() {
    return this.workflow.listProjects();
  }
  @Get(':projectId') getProject(@Param('projectId') projectId: string) {
    return this.workflow.getProject(projectId);
  }
  @Get(':projectId/runs') listRuns(@Param('projectId') projectId: string) {
    return this.workflow.listRuns(projectId);
  }
  @Get(':projectId/runs/:runId') getRun(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ) {
    const run = this.workflow.getRun(runId);
    if (run.projectId !== projectId)
      throw new BadRequestException('Run does not belong to project');
    return run;
  }
  @Get(':projectId/artifacts') listArtifacts(
    @Param('projectId') projectId: string,
  ) {
    return this.workflow.listArtifacts(projectId);
  }
  @Get(':projectId/artifacts/:artifactId') getArtifact(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
  ) {
    return this.workflow.getArtifact(projectId, artifactId);
  }
  @Get(':projectId/artifacts/:artifactId/content') getArtifactContent(
    @Param('projectId') projectId: string,
    @Param('artifactId') artifactId: string,
  ) {
    const artifact = this.workflow.getArtifact(projectId, artifactId);
    return new StreamableFile(
      createReadStream(
        this.workflow.artifactAbsolutePath(projectId, artifactId),
      ),
      {
        type: artifact.mediaType,
        disposition: `attachment; filename="${encodeURIComponent(artifact.name)}"`,
        length: artifact.size,
      },
    );
  }

  @Post(':projectId/runs') createRun(
    @Param('projectId') projectId: string,
    @Body() body: CreateResearchRunDto,
  ) {
    if (!isResearchStage(body?.stage) || !isResearchRunMode(body?.mode))
      throw new BadRequestException('Invalid research stage or mode');
    if (
      body.inputArtifactIds !== undefined &&
      !Array.isArray(body.inputArtifactIds)
    )
      throw new BadRequestException('inputArtifactIds must be an array');
    return this.workflow.createRun(
      projectId,
      body.stage,
      body.mode,
      body.inputArtifactIds ?? [],
    );
  }

  @Post(':projectId/agent-runs') startAgentRun(
    @Param('projectId') projectId: string,
    @Body() body: StartResearchAgentRunDto,
  ) {
    if (!isResearchStage(body?.stage) || !isResearchRunMode(body?.mode))
      throw new BadRequestException('Invalid research stage or mode');
    const instructions = body.instructions?.trim();
    if (!instructions || instructions.length > 20_000)
      throw new BadRequestException(
        'Instructions are required and must not exceed 20000 characters',
      );
    return this.codexBridge.start({
      projectId,
      stage: body.stage,
      mode: body.mode,
      inputArtifactIds: body.inputArtifactIds ?? [],
      instructions,
      model: body.model,
      effort: body.effort,
    });
  }

  @Post(':projectId/runs/:runId/cancel') async cancelRun(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ) {
    this.assertRunProject(projectId, runId);
    await this.codexBridge.cancel(runId);
    return { ok: true };
  }

  @Post(':projectId/runs/:runId/retry') retryRun(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Body() body: RetryResearchAgentRunDto,
  ) {
    this.assertRunProject(projectId, runId);
    const instructions = body.instructions?.trim();
    if (!instructions || instructions.length > 20_000)
      throw new BadRequestException(
        'Instructions are required and must not exceed 20000 characters',
      );
    return this.codexBridge.retry(runId, instructions, {
      model: body.model,
      effort: body.effort,
    });
  }

  private assertRunProject(projectId: string, runId: string): void {
    const run = this.workflow.getRun(runId);
    if (run.projectId !== projectId)
      throw new BadRequestException('Run does not belong to project');
  }
}
