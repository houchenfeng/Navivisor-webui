import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  isResearchRunMode,
  isResearchStage,
  RESEARCH_ARTIFACT_ROLES,
  type ResearchArtifactRole,
} from './research-contracts';
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

class CreateTextArtifactDto {
  @ApiProperty({ enum: RESEARCH_ARTIFACT_ROLES }) role!: ResearchArtifactRole;
  @ApiProperty() name!: string;
  @ApiProperty() mediaType!: string;
  @ApiProperty() content!: string;
  @ApiProperty() simulated!: boolean;
}

class StartResearchAgentRunDto extends CreateResearchRunDto {
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

  @Post(':projectId/runs/:runId/artifacts/text') createTextArtifact(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Body() body: CreateTextArtifactDto,
  ) {
    const run = this.workflow.getRun(runId);
    if (run.projectId !== projectId)
      throw new BadRequestException('Run does not belong to project');
    if (
      !(RESEARCH_ARTIFACT_ROLES as readonly string[]).includes(body.role) ||
      typeof body.content !== 'string' ||
      typeof body.simulated !== 'boolean'
    )
      throw new BadRequestException('Invalid artifact');
    return this.workflow.createArtifact(
      runId,
      body.role,
      body.name,
      body.mediaType,
      body.content,
      body.simulated,
    );
  }
}
