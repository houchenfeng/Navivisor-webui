import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { isResearchArtifactRole, isResearchStage } from './research-contracts';
import { ResearchWorkspaceService } from './research-workspace.service';

class RegisterWorkspaceDto {
  @ApiProperty({ description: 'Absolute server-side directory path' })
  absolutePath!: string;

  @ApiPropertyOptional() title?: string;

  @ApiPropertyOptional({
    description: 'Relative module directory names within the paper root',
  })
  directories?: {
    topic?: string;
    experiment?: string;
    writing?: string;
    submission?: string;
  };

  @ApiPropertyOptional({ default: true })
  createIfMissing?: boolean;
}

class WorkspacePathDto {
  @ApiProperty({ description: 'Absolute server-side destination directory' })
  absolutePath!: string;

  @ApiPropertyOptional() title?: string;
}

class RebuildWorkspaceDto {
  @ApiProperty({ description: 'Absolute server-side workspace directory' })
  absolutePath!: string;
}

class ActivateDemoDto {
  @ApiProperty({ description: 'Absolute path of the registered Demo package' })
  absolutePath!: string;
}

class SaveVersionDto {
  @ApiProperty() relativePath!: string;
  @ApiProperty() role!: string;
  @ApiProperty() stage!: string;
  @ApiPropertyOptional({ enum: ['simulated', 'real'] }) mode?: string;
  @ApiPropertyOptional() simulated?: boolean;
}

@ApiTags('research-workspace')
@ApiBearerAuth()
@Controller('research')
export class ResearchWorkspaceController {
  constructor(private readonly workspaces: ResearchWorkspaceService) {}

  @Get('demos')
  listDemos() {
    return this.workspaces.listDemoDefinitions();
  }

  @Post('demos/:demoId/activate')
  activateDemo(@Param('demoId') demoId: string, @Body() body: ActivateDemoDto) {
    const absolutePath = body?.absolutePath?.trim();
    if (!absolutePath) throw new BadRequestException('absolutePath is required');
    return this.workspaces.activateDemo(demoId, absolutePath);
  }

  @Post('workspaces/register')
  register(@Body() body: RegisterWorkspaceDto) {
    const absolutePath = body?.absolutePath?.trim();
    if (!absolutePath) {
      throw new BadRequestException('absolutePath is required');
    }
    return this.workspaces.registerWorkspace({
      absolutePath,
      title: body.title,
      directories: body.directories as
        | Partial<
            Record<'topic' | 'experiment' | 'writing' | 'submission', string>
          >
        | undefined,
      createIfMissing: body.createIfMissing ?? true,
    });
  }

  @Post('workspaces/rebuild')
  rebuild(@Body() body: RebuildWorkspaceDto) {
    const absolutePath = body?.absolutePath?.trim();
    if (!absolutePath) {
      throw new BadRequestException('absolutePath is required');
    }
    return this.workspaces.rebuildDatabaseFromWorkspace(absolutePath);
  }

  @Get('projects/:projectId/workspace')
  getWorkspace(@Param('projectId') projectId: string) {
    return this.workspaces.getWorkspace(projectId);
  }

  @Get('projects/:projectId/conversations/ui-events')
  listUiEvents(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const parsedLimit =
      limit === undefined || limit === '' ? undefined : Number(limit);
    if (
      parsedLimit !== undefined &&
      (!Number.isFinite(parsedLimit) || parsedLimit < 1)
    ) {
      throw new BadRequestException('limit must be a positive number');
    }
    return this.workspaces.listUiEvents(projectId, {
      limit: parsedLimit,
      before: before?.trim() || undefined,
    });
  }

  @Post('projects/:projectId/workspace/scan')
  scan(@Param('projectId') projectId: string) {
    return this.workspaces.scanWorkspace(projectId);
  }

  @Post('projects/:projectId/workspace/move')
  move(@Param('projectId') projectId: string, @Body() body: WorkspacePathDto) {
    const absolutePath = body?.absolutePath?.trim();
    if (!absolutePath) {
      throw new BadRequestException('absolutePath is required');
    }
    return this.workspaces.moveWorkspace(projectId, absolutePath);
  }

  @Post('projects/:projectId/workspace/copy')
  copy(@Param('projectId') projectId: string, @Body() body: WorkspacePathDto) {
    const absolutePath = body?.absolutePath?.trim();
    if (!absolutePath) {
      throw new BadRequestException('absolutePath is required');
    }
    return this.workspaces.copyWorkspaceAsNew(
      projectId,
      absolutePath,
      body.title,
    );
  }

  @Post('projects/:projectId/demo/load')
  loadDemo(@Param('projectId') projectId: string) {
    return this.workspaces.loadDemoFromWorkspace(projectId);
  }

  @Post('projects/:projectId/artifacts/save-version')
  saveVersion(
    @Param('projectId') projectId: string,
    @Body() body: SaveVersionDto,
  ) {
    const relativePath = body?.relativePath?.trim();
    if (!relativePath) {
      throw new BadRequestException('relativePath is required');
    }
    if (!isResearchArtifactRole(body.role) || !isResearchStage(body.stage)) {
      throw new BadRequestException('Invalid role or stage');
    }
    return this.workspaces.saveVersion(projectId, relativePath, body.role, {
      stage: body.stage,
      mode: body.mode === 'real' ? 'real' : 'simulated',
      simulated: body.simulated,
    });
  }
}
